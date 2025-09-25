
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

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        time_col = payload.get('timeCol')
        value_col = payload.get('valueCol')

        if not all([data, time_col, value_col]):
            raise ValueError("Missing required parameters: data, timeCol, or valueCol")

        df = pd.DataFrame(data)
        
        # --- Data Preparation ---
        df[time_col] = pd.to_datetime(df[time_col])
        series = df[value_col].copy()
        series.index = df[time_col]

        # --- Original Series Plot ---
        plt.figure(figsize=(10,4))
        plt.plot(series, marker='o', color='blue', label="Original Series")
        plt.title("Original Time Series")
        plt.xlabel("Date")
        plt.ylabel("Value")
        plt.legend()
        
        original_plot_buf = io.BytesIO()
        plt.savefig(original_plot_buf, format='png')
        plt.close()
        original_plot_base64 = base64.b64encode(original_plot_buf.getvalue()).decode('utf-8')

        # --- Original Series ADF Test ---
        result = adfuller(series)
        original_test = {
            'adf_statistic': result[0],
            'p_value': result[1],
            'critical_values': result[4],
            'is_stationary': result[1] <= 0.05
        }
        
        response = {
            'original': {
                'test_results': original_test,
                'plot': f"data:image/png;base64,{original_plot_base64}"
            },
            # Remove differenced part as per user request
            'differenced': None 
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
