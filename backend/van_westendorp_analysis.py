
import sys
import json
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.io as pio
from vanwestendorp import vanwestendorp

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        too_cheap_col = payload.get('too_cheap_col')
        cheap_col = payload.get('cheap_col')
        expensive_col = payload.get('expensive_col')
        too_expensive_col = payload.get('too_expensive_col')

        if not all([data, too_cheap_col, cheap_col, expensive_col, too_expensive_col]):
            raise ValueError("Missing required parameters.")

        df = pd.DataFrame(data)
        
        # Ensure correct columns are selected and that they are numeric
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df_clean = df[price_cols].dropna()

        if len(df_clean) < 1:
            raise ValueError("Not enough valid data for analysis.")

        # Perform Van Westendorp analysis
        vw = vanwestendorp.VanWestendorp(
            df_clean, 
            too_cheap_col, 
            cheap_col, 
            expensive_col, 
            too_expensive_col
        )
        
        # Get intersection points
        opp, pme, mdp, ipp = vw.get_price_points()

        # Get data for plotting
        plot_data = vw.get_plot_data()

        # Create Plotly figure
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=plot_data['prices'], y=plot_data['too_cheap'], mode='lines', name='Too Cheap'))
        fig.add_trace(go.Scatter(x=plot_data['prices'], y=plot_data['cheap'], mode='lines', name='Cheap'))
        fig.add_trace(go.Scatter(x=plot_data['prices'], y=plot_data['expensive'], mode='lines', name='Expensive'))
        fig.add_trace(go.Scatter(x=plot_data['prices'], y=plot_data['too_expensive'], mode='lines', name='Too Expensive'))

        fig.update_layout(
            title='Van Westendorp Price Sensitivity Meter',
            xaxis_title='Price',
            yaxis_title='Percentage of Respondents',
            legend_title='Price Perception'
        )

        # Add annotations for price points
        if opp: fig.add_vline(x=opp, line_dash="dash", line_color="green", annotation_text="OPP", annotation_position="top left")
        if pme: fig.add_vline(x=pme, line_dash="dash", line_color="red", annotation_text="PME", annotation_position="top left")
        if mdp: fig.add_vline(x=mdp, line_dash="dash", line_color="purple", annotation_text="MDP", annotation_position="bottom left")
        if ipp: fig.add_vline(x=ipp, line_dash="dash", line_color="blue", annotation_text="IPP", annotation_position="bottom left")

        plot_json = pio.to_json(fig)

        response = {
            'results': {
                'opp': opp,
                'pme': pme,
                'mdp': mdp,
                'ipp': ipp,
            },
            'plot_json': plot_json
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
