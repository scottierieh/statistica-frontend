
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
    # Ensure series is not empty and has enough data
    if len(series) < 4:
        return {
            'adf_statistic': None,
            'p_value': None,
            'critical_values': {},
            'is_stationary': None,
            'error': 'Not enough data points to perform test.'
        }
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
        
        if time_col not in df.columns or value_col not in df.columns:
            raise ValueError(f"Columns '{time_col}' or '{value_col}' not found in data.")

        # --- Improved Data Handling ---
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        
        df = df.dropna(subset=[time_col, value_col])
        df = df.set_index(time_col).sort_index()

        series = df[value_col]


        if len(series) < 4:
            raise ValueError("Not enough valid data points to perform stationarity test after cleaning.")

        # --- Original Series ---
        original_test = perform_adf_test(series)
        
        plt.figure(figsize=(10, 4))
        plt.plot(series.index, series.values, marker='o', linestyle='-', color="blue", label=f"Original: {value_col}")
        plt.title("Original Time Series")
        plt.xlabel("Date")
        plt.ylabel("Value")
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
        plt.plot(diff_series.index, diff_series.values, marker='o', linestyle='-', color="green", label=f"1st Difference")
        plt.title("1st Differenced Time Series")
        plt.xlabel("Date")
        plt.ylabel("Differenced Value")
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
