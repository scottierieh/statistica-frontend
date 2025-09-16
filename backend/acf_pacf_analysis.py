
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import statsmodels.api as sm
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
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
        value_col = payload.get('valueCol')
        lags = int(payload.get('lags', 40))

        if not all([data, value_col]):
            raise ValueError("Missing required parameters: data or valueCol")

        df = pd.DataFrame(data)
        
        # --- Data Preparation ---
        if value_col not in df.columns:
            raise ValueError(f"Column '{value_col}' not found.")
            
        series = pd.to_numeric(df[value_col], errors='coerce').dropna()

        if len(series) < lags * 2:
            raise ValueError(f"Not enough data for the given number of lags. Need at least {lags*2} data points, but have {len(series)}.")

        # --- ACF and PACF Calculation ---
        acf_values = sm.tsa.acf(series, nlags=lags, fft=True)
        pacf_values = sm.tsa.pacf(series, nlags=lags, method='ywm')

        # --- Plotting ---
        fig, axes = plt.subplots(2, 1, figsize=(10, 8))
        
        # ACF Plot
        sm.graphics.tsa.plot_acf(series, lags=lags, ax=axes[0], fft=True)
        axes[0].set_title('Autocorrelation Function (ACF)')
        axes[0].grid(True, linestyle='--', alpha=0.6)
        
        # PACF Plot
        sm.graphics.tsa.plot_pacf(series, lags=lags, ax=axes[1], method='ywm')
        axes[1].set_title('Partial Autocorrelation Function (PACF)')
        axes[1].grid(True, linestyle='--', alpha=0.6)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Results ---
        results = {
            'acf': acf_values.tolist(),
            'pacf': pacf_values.tolist(),
            'lags': lags
        }

        response = {
            'results': results,
            'plot': f"data:image/png;base64,{plot_image}",
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        # Send error as JSON to stderr
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
