import sys
import json
import pandas as pd
import numpy as np
from scipy.stats import chi2_contingency, norm
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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

def get_full_interpretation(chi2_stat, p_val, df, cramers_v, n_total, row_var, col_var, standardized_residuals, contingency_table):
    """
    Generates a structured interpretation with 3 sections: Overall Analysis, Statistical Insights, Recommendations
    """
    p_text = "p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
    sig_text = "significant" if p_val < 0.05 else "not significant"
    effect_size_text = get_cramers_v_interpretation(cramers_v)
    
    sections = []
    
    # Overall Analysis Section
    sections.append("**Overall Analysis**")
    sections.append(f"A chi-square test of independence was performed to examine the relationship between {row_var} and {col_var} using {n_total} observations.")
    sections.append(f"The test revealed a {sig_text} relationship, χ²({df}) = {chi2_stat:.2f}, {p_text}.")
    sections.append(f"Cramer's V = {cramers_v:.3f}, indicating a {effect_size_text} effect size.")
    sections.append("")
    
    # Statistical Insights Section
    sections.append("**Statistical Insights**")
    
    if p_val < 0.05:
        sections.append(f"→ The variables {row_var} and {col_var} are statistically dependent - they do not vary independently")
        
        # Cell-by-cell analysis using standardized residuals
        residual_findings = []
        for r_idx, r_name in enumerate(standardized_residuals.index):
            for c_idx, c_name in enumerate(standardized_residuals.columns):
                z = standardized_residuals.iat[r_idx, c_idx]
                if abs(z) > 1.96:  # Significant at p < 0.05
                    obs_count = contingency_table.iat[r_idx, c_idx]
                    direction = "more frequent" if z > 0 else "less frequent"
                    residual_findings.append(
                        f"→ **{r_name} × {c_name}**: Observed count ({obs_count}) was {direction} than expected (z = {z:.2f})"
                    )
        
        if residual_findings:
            for finding in residual_findings:
                sections.append(finding)
        else:
            sections.append("→ While significant overall, no individual cells showed strong deviations from expected frequencies")
    else:
        sections.append(f"→ The variables {row_var} and {col_var} appear to be statistically independent")
        sections.append("→ No evidence of association between the variables at the 0.05 significance level")
        sections.append("→ The observed frequencies do not differ significantly from what would be expected by chance")
    
    # Additional statistical insights
    n_rows, n_cols = contingency_table.shape
    sections.append(f"→ Contingency table dimensions: {n_rows} rows × {n_cols} columns ({n_rows * n_cols} cells total)")
    
    # Check for small expected frequencies
    expected_min = None
    if hasattr(standardized_residuals, 'values'):
        chi2_stat_temp, _, _, expected = chi2_contingency(contingency_table)
        expected_min = np.min(expected)
        if expected_min < 5:
            low_freq_count = np.sum(expected < 5)
            total_cells = expected.size
            sections.append(f"→ ⚠ Warning: {low_freq_count} of {total_cells} cells have expected frequency < 5 (minimum: {expected_min:.2f})")
    
    sections.append("")
    
    # Recommendations Section
    sections.append("**Recommendations**")
    
    if p_val < 0.05:
        sections.append(f"→ The significant association suggests {row_var} and {col_var} are related - examine the contingency table to understand patterns")
        sections.append("→ Review standardized residuals to identify which specific category combinations drive the association")
        if cramers_v >= 0.3:
            sections.append(f"→ The {effect_size_text} effect size indicates a meaningful practical relationship worth investigating further")
        sections.append("→ Consider follow-up analyses: logistic regression for prediction, or stratified analysis by other variables")
    else:
        sections.append(f"→ No evidence of association found - {row_var} and {col_var} can be treated as independent")
        sections.append("→ If association was expected, consider: larger sample size, different categorization, or alternative analysis methods")
        sections.append("→ The lack of association may be scientifically meaningful - independence can be an important finding")
    
    # Sample size and power recommendations
    if n_total < 50:
        sections.append("→ Small sample size may limit statistical power - consider Fisher's exact test for 2×2 tables")
    elif expected_min is not None and expected_min < 5:
        sections.append("→ Low expected frequencies detected - consider combining categories or using Fisher's exact test")
    
    sections.append("→ Examine row and column percentages in the contingency table to understand the distribution patterns")
    
    return "\n".join(sections)


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        row_var = payload.get('rowVar')
        col_var = payload.get('colVar')

        if not all([data, row_var, col_var]):
            raise ValueError("Missing 'data', 'rowVar', or 'colVar'")

        df = pd.DataFrame(data)
        
        # Track original indices before any operations
        original_length = len(df)
        df['__original_index__'] = range(original_length)
        
        # Select relevant columns
        df_subset = df[[row_var, col_var, '__original_index__']].copy()
        
        # Track missing data
        missing_mask = df_subset[[row_var, col_var]].isnull().any(axis=1)
        dropped_indices = df_subset.loc[missing_mask, '__original_index__'].tolist()
        
        # Drop missing values
        df_clean = df_subset.dropna(subset=[row_var, col_var])
        
        # Store dropped row information
        n_dropped = len(dropped_indices)
        dropped_rows = sorted(dropped_indices)
        
        # Remove tracking column
        df_clean = df_clean.drop(columns=['__original_index__'])
        
        if len(df_clean) < 2:
            raise ValueError("Not enough valid data points for analysis after removing missing values")
        
        # Create contingency table
        contingency_table = pd.crosstab(df_clean[row_var], df_clean[col_var])
        
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
        
        interpretation = get_full_interpretation(chi2_stat, p_val, dof, cramers_v, total, row_var, col_var, standardized_residuals, contingency_table)

        # --- Plotting with updated style ---
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Use crest palette to match other scripts
        sns.countplot(data=df_clean, x=row_var, hue=col_var, palette='crest', ax=ax)
        
        ax.set_title('Grouped Bar Chart', fontsize=12, fontweight='bold')
        ax.set_xlabel(row_var, fontsize=12)
        ax.set_ylabel('Count', fontsize=12)
        ax.tick_params(axis='x', rotation=45)
        ax.legend(title=col_var)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
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
                'col_levels': contingency_table.columns.tolist(),
                'n_dropped': n_dropped,
                'dropped_rows': dropped_rows
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()