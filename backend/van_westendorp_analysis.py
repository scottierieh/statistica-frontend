
import sys
import json
import pandas as pd
import numpy as np
import warnings
import VanWestendorp_Price_Sensitivity_Meter as vwpsm
import plotly.graph_objects as go
import plotly.io as pio

warnings.filterwarnings('ignore')

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

def plot_van_westendorp_plotly(plot_data):
    fig = go.Figure()

    fig.add_trace(go.Scatter(x=plot_data['prices'], y=[100 - y for y in plot_data['too_cheap_pct']], mode='lines', name='Not "Too Cheap"'))
    fig.add_trace(go.Scatter(x=plot_data['prices'], y=[100 - y for y in plot_data['cheap_pct']], mode='lines', name='Not "Cheap"'))
    fig.add_trace(go.Scatter(x=plot_data['prices'], y=plot_data['expensive_pct'], mode='lines', name='Expensive'))
    fig.add_trace(go.Scatter(x=plot_data['prices'], y=plot_data['too_expensive_pct'], mode='lines', name='Too Expensive'))

    intersections = plot_data.get('intersections', {})
    shapes = []
    annotations = []

    if intersections.get('opp'):
        shapes.append({'type': 'line', 'x0': intersections['opp'], 'x1': intersections['opp'], 'y0': 0, 'y1': 100, 'line': {'color': 'green', 'dash': 'dot'}})
        annotations.append({'x': intersections['opp'], 'y': 1.05, 'xref': 'x', 'yref': 'paper', 'text': f"OPP: {intersections['opp']:.2f}", 'showarrow': False})
    if intersections.get('ipp'):
        shapes.append({'type': 'line', 'x0': intersections['ipp'], 'x1': intersections['ipp'], 'y0': 0, 'y1': 100, 'line': {'color': 'blue', 'dash': 'dot'}})
        annotations.append({'x': intersections['ipp'], 'y': 1.0, 'xref': 'x', 'yref': 'paper', 'text': f"IPP: {intersections['ipp']:.2f}", 'showarrow': False})
    if intersections.get('pme'):
        shapes.append({'type': 'line', 'x0': intersections['pme'], 'x1': intersections['pme'], 'y0': 0, 'y1': 100, 'line': {'color': 'red', 'dash': 'dot'}})
    if intersections.get('mdp'):
        shapes.append({'type': 'line', 'x0': intersections['mdp'], 'x1': intersections['mdp'], 'y0': 0, 'y1': 100, 'line': {'color': 'purple', 'dash': 'dot'}})

    fig.update_layout(
        title='Van Westendorp Price Sensitivity Meter',
        xaxis_title='Price',
        yaxis_title='Cumulative Percentage of Respondents (%)',
        shapes=shapes,
        annotations=annotations,
        legend=dict(x=0.5, y=-0.2, xanchor='center', orientation='h')
    )
    return pio.to_json(fig)


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
        
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna(subset=price_cols)

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis.")

        too_cheap_prices = df[too_cheap_col].tolist()
        cheap_prices = df[cheap_col].tolist()
        expensive_prices = df[expensive_col].tolist()
        too_expensive_prices = df[too_expensive_col].tolist()
        
        results = vwpsm.analysis(too_cheap_prices, cheap_prices, expensive_prices, too_expensive_prices)
        
        plot_data = vwpsm.get_plot_data(too_cheap_prices, cheap_prices, expensive_prices, too_expensive_prices)
        plot_data['intersections'] = results
        
        plot_json = plot_van_westendorp_plotly(plot_data)

        final_response = {
            'results': results,
            'plot_json': plot_json,
        }

        print(json.dumps(final_response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
