
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

def get_numeric_insights(stats):
    insights = []
    
    # Skewness interpretation
    skewness_val = stats.get('skewness', 0)
    if abs(skewness_val) < 0.5:
        insights.append(f"The data appears to be roughly symmetrical (skewness = {skewness_val:.2f}).")
    elif abs(skewness_val) < 1:
        insights.append(f"The data is moderately skewed (skewness = {skewness_val:.2f}).")
    else:
        insights.append(f"The data is highly skewed (skewness = {skewness_val:.2f}).")
        
    # Coefficient of Variation (CV)
    mean_val = stats.get('mean', 0)
    std_dev = stats.get('stdDev', 0)
    if mean_val != 0:
        cv = (std_dev / mean_val) * 100
        if cv < 15:
            insights.append(f"The standard deviation ({std_dev:.2f}) is low relative to the mean, indicating low variability (CV = {cv:.1f}%).")
        elif cv < 30:
            insights.append(f"The standard deviation ({std_dev:.2f}) indicates moderate variability relative to the mean (CV = {cv:.1f}%).")
        else:
            insights.append(f"The standard deviation ({std_dev:.2f}) is high relative to the mean, indicating high variability (CV = {cv:.1f}%).")
    
    return insights


def get_numeric_stats(series):
    if series.empty: return None, []
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
    insights = get_numeric_insights(stats)
    return stats, insights

def get_categorical_stats(series):
    if series.empty: return None, []
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

    insights = []
    if not freq_table.empty:
        top_category_pct = freq_table['Percentage'].iloc[0]
        if top_category_pct > 50:
            insights.append(f"The category '{freq_table['Value'].iloc[0]}' is dominant, making up {top_category_pct:.1f}% of the data.")
    
    return {'table': freq_table.to_dict('records'), 'summary': summary}, insights

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
                    stats, insights = get_numeric_stats(numeric_series)
                    plot_img = create_plot(numeric_series, True, var)
                    all_results[var] = {'type': 'numeric', 'stats': stats, 'plot': plot_img, 'insights': insights}
                else:
                    all_results[var] = {'error': 'No numeric data to analyze.'}
            else:
                if not series.empty:
                    stats, insights = get_categorical_stats(series)
                    plot_img = create_plot(series, False, var)
                    all_results[var] = {'type': 'categorical', **stats, 'plot': plot_img, 'insights': insights}
                else:
                    all_results[var] = {'error': 'No categorical data to analyze.'}

        print(json.dumps({'results': all_results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
