
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.stattools import adfuller, kpss
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

def run_stationarity_tests(series):
    """Runs ADF and KPSS tests on a given series."""
    # ADF Test: Null hypothesis is that the series has a unit root (is non-stationary).
    # We want to see a p-value < 0.05 to reject the null and conclude it's stationary.
    adf_result = adfuller(series.dropna())
    
    # KPSS Test: Null hypothesis is that the series is stationary around a constant (or trend).
    # We want to see a p-value > 0.05 to fail to reject the null.
    # regression='c' means testing for stationarity around a constant (level stationarity).
    kpss_result = kpss(series.dropna(), regression='c', nlags="auto")

    return {
        'adf_statistic': adf_result[0],
        'adf_p_value': adf_result[1],
        'kpss_statistic': kpss_result[0],
        'kpss_p_value': kpss_result[1]
    }

def create_plot(series, title):
    """Creates a plot for a given series and returns it as a base64 string."""
    plt.figure(figsize=(10, 4))
    plt.plot(series, marker='o', linestyle='-', markersize=4)
    plt.title(title)
    plt.xlabel("Time")
    plt.ylabel("Value")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        time_col = payload.get('timeCol')
        value_col = payload.get('valueCol')
        period = int(payload.get('period', 1))

        if not all([data, time_col, value_col]):
            raise ValueError("Missing required parameters: data, timeCol, or valueCol")

        df = pd.DataFrame(data)
        
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        df = df.dropna(subset=[time_col, value_col]).set_index(time_col).sort_index()

        series = df[value_col]
        
        if len(series) < 4:
            raise ValueError("Series must have at least 4 observations for the tests.")

        # --- Analysis for Original, First Difference, and Seasonal Difference ---
        series_diff1 = series.diff().dropna()
        series_seasonal_diff = series.diff(periods=period).dropna()
        
        original_results = run_stationarity_tests(series)
        diff1_results = run_stationarity_tests(series_diff1) if len(series_diff1) >= 4 else None
        seasonal_diff_results = run_stationarity_tests(series_seasonal_diff) if len(series_seasonal_diff) >= 4 and period > 1 else None

        # --- Plotting ---
        original_plot = create_plot(series, "Original Time Series")
        diff1_plot = create_plot(series_diff1, "First-Differenced Series") if diff1_results else None
        seasonal_diff_plot = create_plot(series_seasonal_diff, f"Seasonally-Differenced Series (Period={period})") if seasonal_diff_results else None
        
        response = {
            'original': {
                'test_results': original_results,
                'plot': original_plot
            },
            'first_difference': {
                'test_results': diff1_results,
                'plot': diff1_plot
            } if diff1_results else None,
            'seasonal_difference': {
                'test_results': seasonal_diff_results,
                'plot': seasonal_diff_plot
            } if seasonal_diff_results else None,
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
