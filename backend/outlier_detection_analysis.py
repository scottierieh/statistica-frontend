
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def detect_outliers(series):
    # Z-score method
    z_scores = np.abs(stats.zscore(series, nan_policy='omit'))
    z_outliers = series[z_scores > 3]
    z_outlier_details = [{'index': int(idx), 'value': series[idx], 'z_score': z_scores[i]} for i, idx in enumerate(z_outliers.index)]

    # IQR method
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    iqr_outliers = series[(series < lower_bound) | (series > upper_bound)]
    iqr_outlier_details = [{'index': int(idx), 'value': series[idx]} for idx in iqr_outliers.index]
    
    return z_outlier_details, iqr_outlier_details

def create_plot(series, variable_name):
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.boxplot(y=series, ax=ax, width=0.4, palette="pastel")
    sns.stripplot(y=series, ax=ax, color=".25", size=4, jitter=True)
    ax.set_title(f'Box Plot of {variable_name}', fontsize=14)
    ax.set_ylabel(variable_name)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        variables = payload.get('variables')

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        results = {}

        for var in variables:
            if var not in df.columns:
                results[var] = {"error": f"Variable '{var}' not found."}
                continue

            series = pd.to_numeric(df[var], errors='coerce').dropna()
            
            if series.empty or len(series) < 5:
                results[var] = {"error": f"Not enough valid numeric data for '{var}'."}
                continue

            z_outliers, iqr_outliers = detect_outliers(series)
            
            plot_image = create_plot(series, var)

            results[var] = {
                'z_score_outliers': z_outliers,
                'iqr_outliers': iqr_outliers,
                'summary': {
                    'total_count': len(series),
                    'z_score_count': len(z_outliers),
                    'iqr_count': len(iqr_outliers)
                },
                'plot': plot_image
            }

        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
