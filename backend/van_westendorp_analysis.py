
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import VanWestendorp_PriceSensitivityMeter as VWPSM

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
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
        
        # Ensure all columns are numeric
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna(subset=price_cols)

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis.")

        # --- Analysis using the library ---
        results_vw = VWPSM.analyse(
            df[too_cheap_col].tolist(),
            df[cheap_col].tolist(),
            df[expensive_col].tolist(),
            df[too_expensive_col].tolist()
        )

        # --- Plotting ---
        fig, ax = plt.subplots(figsize=(10, 7))
        VWPSM.plot(results_vw, ax)
        ax.set_title('Van Westendorp Price Sensitivity Meter', fontsize=16, fontweight='bold')
        ax.set_xlabel('Price', fontsize=12)
        ax.set_ylabel('Percentage of Respondents (%)', fontsize=12)
        ax.grid(True, linestyle='--')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Format results for frontend ---
        # The library returns a nested dictionary. We'll flatten it for easier use.
        response = {
            'results': {
                'prices': {
                    'too_cheap': results_vw.get('mdp'), # Marginal Cheapness Point
                    'cheap': None, # Library does not provide this directly
                    'expensive': results_vw.get('pme'), # Marginal Expensiveness Point
                    'too_expensive': None, # Library does not provide this directly
                    'optimal': results_vw.get('opp'), # Optimal Price Point
                    'indifference': results_vw.get('ipp'), # Indifference Price Point
                },
                'acceptable_range': [results_vw.get('mdp'), results_vw.get('pme')]
            },
            'plot': f"data:image/png;base64,{plot_image}",
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
