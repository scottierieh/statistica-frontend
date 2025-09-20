
import sys
import json
import pandas as pd
import numpy as np
from scipy.stats import chi2_contingency, norm
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

def get_cramers_v_interpretation(v):
    if v < 0.1: return "negligible"
    if v < 0.3: return "small"
    if v < 0.5: return "medium"
    return "large"

def get_full_interpretation(chi2_stat, p_val, df, cramers_v, n_total, row_var, col_var, standardized_residuals):
    """
    Generates a full APA-style interpretation of the crosstab analysis.
    """
    p_text = "p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
    sig_text = "significant" if p_val < 0.05 else "not significant"
    effect_size_text = get_cramers_v_interpretation(cramers_v)

    interpretation = (
        f"A chi-square test of independence was performed to examine the relation between {row_var} and {col_var}. "
        f"The relation between these variables was {sig_text}, χ²({df}, N = {n_total}) = {chi2_stat:.2f}, {p_text}. "
        f"Cramer's V = {cramers_v:.2f}, indicating a {effect_size_text} effect size."
    )

    if p_val < 0.05:
        residual_interp_parts = []
        for r_idx, r_name in enumerate(standardized_residuals.index):
            for c_idx, c_name in enumerate(standardized_residuals.columns):
                z = standardized_residuals.iat[r_idx, c_idx]
                if abs(z) > 1.96: # Corresponds to p < 0.05
                    p_z = 2 * (1 - norm.cdf(abs(z)))
                    direction = "significantly more likely" if z > 0 else "significantly less likely"
                    residual_interp_parts.append(
                        f"respondents in the '{r_name}' group were {direction} to be in the '{c_name}' group (z = {z:.2f}, p < {p_z:.3f if p_z > 0.001 else '.001'})"
                    )
        
        if residual_interp_parts:
            interpretation += "\nExamination of the standardized residuals revealed that " + ", and ".join(residual_interp_parts) + "."

    return interpretation


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
        
        # Standardized residuals
        residuals = contingency_table - expected
        standardized_residuals = residuals / np.sqrt(expected)

        total = contingency_table.sum().sum()

        phi2 = chi2_stat / total if total > 0 else 0
        phi = np.sqrt(phi2)
        contingency_coeff = np.sqrt(chi2_stat / (chi2_stat + total)) if (chi2_stat + total) > 0 else 0

        # Cramer's V
        n_rows, n_cols = contingency_table.shape
        min_dim = min(n_rows - 1, n_cols - 1)
        cramers_v = np.sqrt(phi2 / min_dim) if min_dim > 0 else 0
        
        interpretation = get_full_interpretation(chi2_stat, p_val, dof, cramers_v, total, row_var, col_var, standardized_residuals)

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
                'interpretation': interpretation,
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
