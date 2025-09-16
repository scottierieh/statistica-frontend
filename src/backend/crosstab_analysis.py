
import sys
import json
import pandas as pd
import numpy as np
from scipy.stats import chi2_contingency
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        row_var = payload.get('rowVar')
        col_var = payload.get('colVar')

        if not all([data, row_var, col_var]):
            raise ValueError("Missing 'data', 'rowVar', or 'colVar'")

        df = pd.DataFrame(data)
        
        # Create contingency table
        contingency_table = pd.crosstab(df[row_var], df[col_var])
        
        # --- Chi-squared test ---
        chi2, p, dof, expected = chi2_contingency(contingency_table)
        
        # Calculate percentages
        total = contingency_table.sum().sum()
        row_totals = contingency_table.sum(axis=1)
        col_totals = contingency_table.sum(axis=0)

        # Cramer's V
        phi2 = chi2 / total if total > 0 else 0
        n_rows, n_cols = contingency_table.shape
        min_dim = min(n_rows - 1, n_cols - 1)
        cramers_v = np.sqrt(phi2 / min_dim) if min_dim > 0 else 0

        # --- Plotting ---
        plt.figure(figsize=(10, 6))
        sns.countplot(data=df, x=row_var, hue=col_var, palette='viridis')
        plt.title(f'Grouped Bar Chart: {row_var} vs {col_var}')
        plt.xlabel(row_var)
        plt.ylabel('Count')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'contingency_table': contingency_table.to_dict(),
                'chi_squared': {
                    'statistic': chi2,
                    'p_value': p,
                    'degrees_of_freedom': dof
                },
                'cramers_v': cramers_v,
                'row_var': row_var,
                'col_var': col_var,
                'row_levels': contingency_table.index.tolist(),
                'col_levels': contingency_table.columns.tolist()
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
