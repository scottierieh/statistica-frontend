
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from scipy.stats import skew, kurtosis, mode

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def get_numeric_stats(series):
    if series.empty: return None
    stats = {
        'count': int(series.count()),
        'missing': int(series.isnull().sum()),
        'mean': float(series.mean()),
        'stdDev': float(series.std()),
        'min': float(series.min()),
        'q1': float(series.quantile(0.25)),
        'median': float(series.median()),
        'q3': float(series.quantile(0.75)),
        'max': float(series.max()),
        'skewness': float(skew(series)),
        'kurtosis': float(kurtosis(series)),
    }
    return stats

def get_categorical_stats(series):
    if series.empty: return None
    freq_table = series.value_counts().reset_index()
    freq_table.columns = ['Value', 'Frequency']
    total = freq_table['Frequency'].sum()
    freq_table['Percentage'] = (freq_table['Frequency'] / total) * 100
    
    summary = {
        'count': int(total),
        'missing': int(series.isnull().sum()),
        'unique': int(series.nunique()),
        'mode': series.mode().iloc[0] if not series.mode().empty else None,
    }
    return {'table': freq_table.to_dict('records'), 'summary': summary}

def create_plot(series, is_numeric, var_name):
    fig, ax = plt.subplots(figsize=(10, 6))
    if is_numeric:
        sns.histplot(series, kde=True, ax=ax)
        ax.set_title(f'Distribution of {var_name}')
    else:
        top_n = series.value_counts().nlargest(20)
        sns.barplot(x=top_n.values, y=top_n.index, ax=ax, orient='h')
        ax.set_title(f'Frequency of {var_name}')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        selected_vars = payload.get('variables')

        df = pd.DataFrame(data)
        all_results = {}

        for var in selected_vars:
            if var not in df.columns:
                all_results[var] = {"error": f"Variable '{var}' not found"}
                continue
            
            series = df[var].dropna()
            is_numeric = pd.api.types.is_numeric_dtype(df[var])

            if is_numeric:
                numeric_series = pd.to_numeric(series, errors='coerce').dropna()
                if not numeric_series.empty:
                    stats = get_numeric_stats(numeric_series)
                    plot_img = create_plot(numeric_series, True, var)
                    all_results[var] = {'type': 'numeric', 'stats': stats, 'plot': plot_img}
                else:
                    all_results[var] = {'error': 'No numeric data to analyze.'}
            else:
                if not series.empty:
                    stats = get_categorical_stats(series)
                    plot_img = create_plot(series, False, var)
                    all_results[var] = {'type': 'categorical', **stats, 'plot': plot_img}
                else:
                    all_results[var] = {'error': 'No categorical data to analyze.'}

        print(json.dumps({'results': all_results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
