
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

def get_interpretations(chi2_stat, p_val, df, cramers_v, phi, contingency_coeff, n_rows, n_cols):
    """
    Generates detailed interpretations for each crosstab statistic.
    """
    interpretations = {
        'chi_squared': {
            "title": "Chi-Squared (χ²)",
            "description": f"The Chi-squared statistic ({chi2_stat:.3f}) measures the discrepancy between the observed frequencies in your data and the frequencies that would be expected if there were no association between the variables. A larger value indicates a greater difference."
        },
        'p_value': {
            "title": "p-value",
            "description": f"The p-value ({p_val:.4f}) indicates the probability of observing a relationship as strong as (or stronger than) the one in your data if the variables were actually independent. A p-value less than 0.05 is typically considered statistically significant, suggesting the association is not due to random chance."
        },
        'df': {
            "title": "Degrees of Freedom (df)",
            "description": f"The degrees of freedom ({df}) are calculated as (rows - 1) * (columns - 1). It represents the number of independent values that can vary in the analysis without breaking any constraints."
        },
        'cramers_v': {
            "title": "Cramér's V",
            "description": f"Cramér's V ({cramers_v:.3f}) is a measure of the strength of association, ranging from 0 (no association) to 1 (perfect association). It is useful for tables of any size. A value around 0.1 suggests a weak association, 0.3 a moderate one, and 0.5 or higher a strong one."
        },
    }
    
    if n_rows == 2 and n_cols == 2:
        interpretations['phi'] = {
            "title": "Phi (φ) Coefficient",
            "description": f"For a 2x2 table, the Phi coefficient ({phi:.3f}) is equivalent to Cramér's V and measures the strength of association. It ranges from -1 to 1 for 2x2 tables, but is often presented as its absolute value (0 to 1)."
        }
    else:
        interpretations['phi'] = {
            "title": "Phi (φ) Coefficient",
            "description": "This metric is primarily interpreted for 2x2 tables. For larger tables, Cramér's V is the preferred measure of association strength."
        }

    interpretations['contingency_coeff'] = {
        "title": "Contingency Coefficient",
        "description": f"The Contingency Coefficient ({contingency_coeff:.3f}) is another measure of association. Its upper limit depends on the table size, making it harder to compare across different tables. Cramér's V is generally preferred."
    }
    
    return interpretations

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
        chi2_stat, p_val, dof, expected = chi2_contingency(contingency_table)
        
        total = contingency_table.sum().sum()

        phi2 = chi2_stat / total if total > 0 else 0
        phi = np.sqrt(phi2)
        contingency_coeff = np.sqrt(chi2_stat / (chi2_stat + total)) if (chi2_stat + total) > 0 else 0

        # Cramer's V
        n_rows, n_cols = contingency_table.shape
        min_dim = min(n_rows - 1, n_cols - 1)
        cramers_v = np.sqrt(phi2 / min_dim) if min_dim > 0 else 0
        
        interpretations = get_interpretations(chi2_stat, p_val, dof, cramers_v, phi, contingency_coeff, n_rows, n_cols)

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
                    'statistic': chi2_stat,
                    'p_value': p_val,
                    'degrees_of_freedom': dof
                },
                'phi_coefficient': phi,
                'contingency_coefficient': contingency_coeff,
                'cramers_v': cramers_v,
                'interpretations': interpretations,
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
