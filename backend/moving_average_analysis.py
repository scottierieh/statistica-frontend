
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
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
        window = int(payload.get('window', 7))

        if not all([data, time_col, value_col]):
            raise ValueError("Missing 'data', 'timeCol', or 'valueCol'")

        df = pd.DataFrame(data)
        
        # --- Data Preparation ---
        if time_col not in df.columns or value_col not in df.columns:
            raise ValueError(f"Columns '{time_col}' or '{value_col}' not found.")
            
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        df = df.dropna(subset=[time_col, value_col]).set_index(time_col).sort_index()

        if len(df) < window:
            raise ValueError(f"Not enough data for the given window size. Need at least {window} data points, but have {len(df)}.")

        # --- Moving Average Calculation ---
        ma_col_name = f'MA_{window}'
        df[ma_col_name] = df[value_col].rolling(window=window).mean()
        
        result_df = df.reset_index()

        # --- Plotting ---
        plt.figure(figsize=(12, 6))
        sns.lineplot(x=time_col, y=value_col, data=result_df, label='Original Series', color='skyblue')
        sns.lineplot(x=time_col, y=ma_col_name, data=result_df, label=f'{window}-Period Moving Average', color='orange', linewidth=2.5)
        
        plt.title(f'{value_col} with {window}-Period Moving Average')
        plt.xlabel(time_col)
        plt.ylabel(value_col)
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Results ---
        results_data = result_df.dropna(subset=[ma_col_name]).to_dict('records')
        
        response = {
            'results': results_data,
            'plot': f"data:image/png;base64,{plot_image}",
            'ma_col_name': ma_col_name
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        # Send error as JSON to stderr
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
