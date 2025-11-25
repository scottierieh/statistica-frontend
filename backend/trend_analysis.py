import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.seasonal import seasonal_decompose
import io
import base64
import warnings

warnings.filterwarnings('ignore')

# Set seaborn style globally (consistent with other analyses)
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        time_col = payload.get('timeCol')
        value_col = payload.get('valueCol')
        model = payload.get('model', 'additive')
        period = int(payload.get('period', 7))

        if not all([data, time_col, value_col]):
            raise ValueError("Missing 'data', 'timeCol', or 'valueCol'")

        df = pd.DataFrame(data)
        
        # --- Data Preparation ---
        if time_col not in df.columns or value_col not in df.columns:
            raise ValueError(f"Columns '{time_col}' or '{value_col}' not found.")
            
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        df = df.dropna(subset=[time_col, value_col]).set_index(time_col).sort_index()

        if len(df) < period * 2:
            raise ValueError(f"Not enough data for the given period. Need at least {period*2} data points, but have {len(df)}.")

        # --- Decomposition ---
        decomposition = seasonal_decompose(df[value_col], model=model, period=period)
        
        trend = decomposition.trend.dropna()
        seasonal = decomposition.seasonal.dropna()
        resid = decomposition.resid.dropna()

        # --- Plotting with consistent style ---
        fig, (ax1, ax2, ax3, ax4) = plt.subplots(4, 1, figsize=(12, 10), sharex=True)
        
        # Original Series
        ax1.plot(df.index, df[value_col], color='#1f77b4', linewidth=2, alpha=0.8)
        ax1.set_ylabel('Value', fontsize=12)
        ax1.grid(True)

        # Trend
        ax2.plot(trend.index, trend.values, color='#ff7f0e', linewidth=2, alpha=0.8)
        ax2.set_ylabel('Trend', fontsize=12)
        ax2.grid(True)
        
        # Seasonality
        ax3.plot(seasonal.index, seasonal.values, color='#2ca02c', linewidth=2, alpha=0.8)
        ax3.set_ylabel('Seasonal', fontsize=12)
        ax3.grid(True)
        
        # Residuals
        ax4.scatter(resid.index, resid.values, alpha=0.5, color='#d62728', s=20)
        ax4.set_ylabel('Residual', fontsize=12)
        ax4.set_xlabel(time_col, fontsize=12)
        ax4.grid(True)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Results ---
        results = {
            'trend': trend.reset_index().rename(columns={'index': time_col}).to_dict('records'),
            'seasonal': seasonal.reset_index().rename(columns={'index': time_col}).to_dict('records'),
            'resid': resid.reset_index().rename(columns={'index': time_col}).to_dict('records'),
        }

        response = {
            'results': results,
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        # Send error as JSON to stderr
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()