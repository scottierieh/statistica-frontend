import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.stattools import adfuller, kpss
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
    adf_result = adfuller(series.dropna())
    # For KPSS, the default 'c' regression is for level stationarity.
    kpss_result = kpss(series.dropna(), regression='c', nlags="auto")

    return {
        'adf_statistic': adf_result[0],
        'adf_p_value': adf_result[1],
        'kpss_statistic': kpss_result[0],
        'kpss_p_value': kpss_result[1]
    }

def create_plot(series, title, color='#1f77b4'):
    """Creates a plot for a given series with consistent styling."""
    fig, ax = plt.subplots(figsize=(10, 4))
    
    ax.plot(series.index, series.values, color=color, linewidth=2, alpha=0.8, marker='o', markersize=3)
    ax.set_xlabel("Time", fontsize=12)
    ax.set_ylabel("Value", fontsize=12)
    ax.grid(True)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
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
        diff1_results = run_stationarity_tests(series_diff1) if len(series_diff1) > 3 else None
        seasonal_diff_results = run_stationarity_tests(series_seasonal_diff) if len(series_seasonal_diff) > 3 else None

        # --- Plotting with consistent colors ---
        original_plot = create_plot(series, "Original Time Series", color='#1f77b4')  # Blue
        diff1_plot = create_plot(series_diff1, "First-Differenced Series", color='#ff7f0e') if diff1_results else None  # Orange
        seasonal_diff_plot = create_plot(series_seasonal_diff, "Seasonally-Differenced Series", color='#2ca02c') if seasonal_diff_results else None  # Green
        
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