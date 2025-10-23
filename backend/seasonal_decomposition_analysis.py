
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
from calendar import month_name

warnings.filterwarnings('ignore')

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
        
        trend = decomposition.trend
        seasonal = decomposition.seasonal
        resid = decomposition.resid

        # Align series to common index to prevent calculation errors on different lengths
        common_index = resid.dropna().index.intersection(trend.dropna().index).intersection(seasonal.dropna().index)
        resid_aligned = resid[common_index]
        trend_aligned = trend[common_index]
        seasonal_aligned = seasonal[common_index]

        # --- Strength & Variance Calculation ---
        var_resid = np.var(resid_aligned)
        
        var_trend_resid = np.var(trend_aligned + resid_aligned) if len(trend_aligned) > 0 else 0
        var_seasonal_resid = np.var(seasonal_aligned + resid_aligned) if len(seasonal_aligned) > 0 else 0
        
        strength_trend = 1 - (var_resid / var_trend_resid) if var_trend_resid > 0 else 0
        strength_seasonal = 1 - (var_resid / var_seasonal_resid) if var_seasonal_resid > 0 else 0
        
        total_var = np.var(df[value_col])
        var_explained = {
            'trend': (np.var(trend.dropna()) / total_var) * 100 if total_var > 0 else 0,
            'seasonal': (np.var(seasonal.dropna()) / total_var) * 100 if total_var > 0 else 0,
            'irregular': (np.var(resid.dropna()) / total_var) * 100 if total_var > 0 else 0,
        }

        decomposition_summary = [
            {'component': 'Trend', 'strength': strength_trend, 'variance_explained': var_explained['trend']},
            {'component': 'Seasonal', 'strength': strength_seasonal, 'variance_explained': var_explained['seasonal']},
            {'component': 'Irregular', 'strength': None, 'variance_explained': var_explained['irregular']}
        ]

        # --- Seasonal Pattern Analysis ---
        seasonal_pattern = []
        if period == 12 and not seasonal.dropna().empty: # Monthly data
            monthly_seasonal = seasonal.groupby(seasonal.index.month).mean()
            for i in range(1, 13):
                month = month_name[i]
                index_val = monthly_seasonal.get(i, 1 if model == 'multiplicative' else 0)
                deviation = (index_val - 1) * 100 if model == 'multiplicative' else index_val
                
                seasonal_pattern.append({
                    'month': month,
                    'seasonal_index': index_val,
                    'deviation': deviation
                })


        # --- Plotting ---
        fig, (ax1, ax2, ax3, ax4) = plt.subplots(4, 1, figsize=(12, 10), sharex=True)
        
        df[value_col].plot(ax=ax1, title='Original Series')
        ax1.set_ylabel('Value')

        trend.plot(ax=ax2, title='Trend')
        ax2.set_ylabel('Trend')
        
        seasonal.plot(ax=ax3, title='Seasonality')
        ax3.set_ylabel('Seasonal')
        
        resid.plot(ax=ax4, title='Residuals', marker='o', linestyle='None', alpha=0.5)
        ax4.set_ylabel('Residual')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Results ---
        results = {
            'decomposition_summary': decomposition_summary,
            'seasonal_pattern': seasonal_pattern,
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
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
