
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.stattools import adfuller
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def perform_adf_test(series):
    result = adfuller(series)
    return {
        'adf_statistic': result[0],
        'p_value': result[1],
        'critical_values': result[4],
        'is_stationary': result[1] <= 0.05
    }

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        time_col = payload.get('timeCol')
        value_col = payload.get('valueCol')

        if not all([data, time_col, value_col]):
            raise ValueError("Missing required parameters: data, timeCol, or valueCol")

        df = pd.DataFrame(data)
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df = df.dropna(subset=[time_col, value_col]).set_index(time_col).sort_index()

        if len(df) < 4:
            raise ValueError("Not enough data to perform stationarity test.")

        series = df[value_col]

        # --- Original Series ---
        original_test = perform_adf_test(series)
        
        plt.figure(figsize=(10, 4))
        plt.plot(series, label=f"Original: {value_col}", color="blue")
        plt.title("Original Time Series")
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.6)
        original_plot_buf = io.BytesIO()
        plt.savefig(original_plot_buf, format='png')
        plt.close()
        original_plot_base64 = base64.b64encode(original_plot_buf.getvalue()).decode('utf-8')

        # --- Differenced Series ---
        diff_series = series.diff().dropna()
        diff_test = perform_adf_test(diff_series)

        plt.figure(figsize=(10, 4))
        plt.plot(diff_series, label=f"1st Difference", color="green")
        plt.title("1st Differenced Time Series")
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.6)
        diff_plot_buf = io.BytesIO()
        plt.savefig(diff_plot_buf, format='png')
        plt.close()
        diff_plot_base64 = base64.b64encode(diff_plot_buf.getvalue()).decode('utf-8')
        
        response = {
            'original': {
                'test_results': original_test,
                'plot': f"data:image/png;base64,{original_plot_base64}"
            },
            'differenced': {
                'test_results': diff_test,
                'plot': f"data:image/png;base64,{diff_plot_base64}"
            }
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
