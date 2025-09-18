
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import pearsonr, spearmanr, kendalltau
import math
import pingouin as pg

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def _interpret_correlation_magnitude(r):
    abs_r = abs(r)
    if abs_r >= 0.5: return 'large'
    if abs_r >= 0.3: return 'medium'
    if abs_r >= 0.1: return 'small'
    return 'negligible'

def generate_interpretation(summary_stats, effect_sizes, strongest_correlations, method):
    """
    Generates a textual interpretation of the correlation results.
    """
    
    # Interpretation
    interpretation_parts = []
    
    # 1. Overall Pattern
    mean_corr = summary_stats['mean_correlation']
    mean_desc = "generally weak"
    if abs(mean_corr) > 0.5:
        mean_desc = "generally strong"
    elif abs(mean_corr) > 0.3:
        mean_desc = "generally moderate"
    interpretation_parts.append(
        f"The analysis, using the {method} method, reveals a total of {summary_stats['total_pairs']} variable pairs. "
        f"The average correlation is {mean_corr:.3f}, suggesting the relationships are {mean_desc} on average."
    )
    
    # 2. Key Findings
    significant_pct = (summary_stats['significant_correlations'] / summary_stats['total_pairs'] * 100) if summary_stats['total_pairs'] > 0 else 0
    strongest_pos = next((c for c in strongest_correlations if c['correlation'] > 0), None)
    strongest_neg = next((c for c in strongest_correlations if c['correlation'] < 0), None)
    
    findings_str = (
        f"Out of these, {summary_stats['significant_correlations']} pairs ({significant_pct:.1f}%) show a statistically significant relationship (p < 0.05). "
        f"The dominant effect size is '{effect_sizes['strongest_effect']}', found in {effect_sizes['distribution'][effect_sizes['strongest_effect']]} pairs. "
    )
    
    if strongest_pos:
        findings_str += (
            f"The strongest positive correlation is between '{strongest_pos['variable_1']}' and '{strongest_pos['variable_2']}' (r = {strongest_pos['correlation']:.3f}, p = {strongest_pos['p_value']:.4f}). "
            f"This indicates that as '{strongest_pos['variable_1']}' increases, '{strongest_pos['variable_2']}' also tends to increase. "
        )
        
    if strongest_neg:
        findings_str += (
            f"The strongest negative correlation is between '{strongest_neg['variable_1']}' and '{strongest_neg['variable_2']}' (r = {strongest_neg['correlation']:.3f}, p = {strongest_neg['p_value']:.4f}). "
            f"This suggests that as '{strongest_neg['variable_1']}' increases, '{strongest_neg['variable_2']}' tends to decrease."
        )
    interpretation_parts.append(findings_str)
    
    return "\n\n".join(interpretation_parts)


def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        variables = payload.get('variables')
        method = payload.get('method', 'pearson')
        alpha = payload.get('alpha', 0.05)
        control_vars = payload.get('controlVars')

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        
        all_analysis_vars = list(set(variables + (control_vars or [])))
        df_clean = df[all_analysis_vars].copy()
        for col in df_clean.columns:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
        
        df_clean.dropna(inplace=True)
        
        if df_clean.shape[0] < 2:
            raise ValueError("Not enough valid data points for analysis.")

        n_vars = len(variables)

        corr_matrix = pd.DataFrame(np.eye(n_vars), index=variables, columns=variables)
        p_value_matrix = pd.DataFrame(np.zeros((n_vars, n_vars)), index=variables, columns=variables)
        
        all_correlations = []

        for i in range(n_vars):
            for j in range(i + 1, n_vars):
                var1 = variables[i]
                var2 = variables[j]
                
                corr, p_value = np.nan, np.nan

                if control_vars and len(control_vars) > 0:
                    # Partial Correlation
                    partial_corr_result = pg.partial_corr(data=df_clean, x=var1, y=var2, covar=control_vars, method=method)
                    corr = partial_corr_result['r'].iloc[0]
                    p_value = partial_corr_result['p-val'].iloc[0]
                else:
                    # Regular Correlation
                    col1 = df_clean[var1]
                    col2 = df_clean[var2]
                    if method == 'pearson':
                        corr, p_value = pearsonr(col1, col2)
                    elif method == 'spearman':
                        corr, p_value = spearmanr(col1, col2)
                    elif method == 'kendall':
                        corr, p_value = kendalltau(col1, col2)
                
                corr_matrix.loc[var1, var2] = corr_matrix.loc[var2, var1] = corr
                p_value_matrix.loc[var1, var2] = p_value_matrix.loc[var2, var1] = p_value
                
                if not np.isnan(corr):
                    all_correlations.append({
                        'variable_1': var1,
                        'variable_2': var2,
                        'correlation': corr,
                        'p_value': p_value,
                        'significant': bool(p_value < alpha)
                    })

        # Summary statistics
        upper_triangle = corr_matrix.values[np.triu_indices_from(corr_matrix.values, k=1)]
        upper_triangle_clean = upper_triangle[~np.isnan(upper_triangle)]

        summary_stats = {
            'mean_correlation': float(np.mean(upper_triangle_clean)) if len(upper_triangle_clean) > 0 else 0,
            'median_correlation': float(np.median(upper_triangle_clean)) if len(upper_triangle_clean) > 0 else 0,
            'std_dev': float(np.std(upper_triangle_clean)) if len(upper_triangle_clean) > 0 else 0,
            'range': [float(np.min(upper_triangle_clean)), float(np.max(upper_triangle_clean))] if len(upper_triangle_clean) > 0 else [0, 0],
            'significant_correlations': int(sum(1 for c in all_correlations if c['significant'])),
            'total_pairs': int(len(all_correlations))
        }
        
        # Effect Sizes
        effect_sizes_list = [_interpret_correlation_magnitude(c['correlation']) for c in all_correlations]
        effect_size_counts = {
            'large': effect_sizes_list.count('large'),
            'medium': effect_sizes_list.count('medium'),
            'small': effect_sizes_list.count('small'),
            'negligible': effect_sizes_list.count('negligible')
        }

        strongest_effect = 'negligible'
        if effect_size_counts['large'] > 0: strongest_effect = 'large'
        elif effect_size_counts['medium'] > 0: strongest_effect = 'medium'
        elif effect_size_counts['small'] > 0: strongest_effect = 'small'
        
        effect_sizes_summary = {
            'distribution': effect_size_counts,
            'strongest_effect': strongest_effect
        }

        # Strongest correlations
        strongest_correlations = sorted(all_correlations, key=lambda x: abs(x['correlation']), reverse=True)[:10]

        interpretation = generate_interpretation(summary_stats, effect_sizes_summary, strongest_correlations, method)

        response = {
            "correlation_matrix": corr_matrix.to_dict(),
            "p_value_matrix": p_value_matrix.to_dict(),
            "summary_statistics": summary_stats,
            "effect_sizes": effect_sizes_summary,
            "strongest_correlations": strongest_correlations,
            "interpretation": interpretation
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
