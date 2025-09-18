
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import pearsonr, spearmanr, kendalltau
import math

def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization"""
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
    elif isinstance(obj, str):
        return str(obj)
    return obj

def _interpret_correlation_magnitude(r):
    """Interpret the magnitude of correlation coefficient"""
    abs_r = abs(r)
    if abs_r >= 0.7: return 'very strong'
    if abs_r >= 0.5: return 'strong'
    if abs_r >= 0.3: return 'moderate'
    if abs_r >= 0.1: return 'weak'
    return 'negligible'

def generate_interpretation(all_correlations, method, alpha=0.05):
    """
    Generates a comprehensive textual interpretation of the correlation results.
    """
    interpretation_parts = []
    
    if not all_correlations:
        return "No valid correlation pairs were found for analysis."

    significant_correlations = [c for c in all_correlations if c['significant']]
    
    # 1. Overall Summary
    total_pairs = len(all_correlations)
    significant_count = len(significant_correlations)
    mean_corr = np.mean([c['correlation'] for c in all_correlations])
    
    interpretation_parts.append(
        f"A {method.title()} correlation analysis was conducted on {total_pairs} variable pairs. "
        f"Of these, {significant_count} pairs ({significant_count/total_pairs:.1%}) showed a statistically significant relationship (p < {alpha}). "
        f"The average correlation coefficient was {mean_corr:.3f}, indicating a generally weak overall relationship strength."
    )

    # 2. Detailed Significant Findings
    if significant_correlations:
        details = ["The following significant relationships were identified:"]
        # Sort by absolute correlation value to present the most important ones first
        for corr in sorted(significant_correlations, key=lambda x: abs(x['correlation']), reverse=True):
            var1 = corr['variable_1']
            var2 = corr['variable_2']
            r = corr['correlation']
            p = corr['p_value']
            
            magnitude = _interpret_correlation_magnitude(r)
            direction = "positive" if r > 0 else "negative"
            direction_desc = "increases" if r > 0 else "decreases"
            
            details.append(
                f"- A **{magnitude} {direction}** correlation was found between **{var1}** and **{var2}** "
                f"(r = {r:.3f}, p = {p:.4f}). This suggests that as '{var1}' increases, '{var2}' tends to {direction_desc}."
            )
        interpretation_parts.append("\n".join(details))
    else:
        interpretation_parts.append("No statistically significant correlations were found among the analyzed variables.")

    # 3. Conclusion/Recommendations
    if significant_correlations:
        strongest_corr = max(significant_correlations, key=lambda x: abs(x['correlation']))
        recommendations = [
            "**Conclusion**: The analysis reveals several key relationships, with the strongest being between "
            f"'{strongest_corr['variable_1']}' and '{strongest_corr['variable_2']}'. These findings can guide further investigation, such as regression analysis, to explore causality.",
            "**Recommendation**: Focus on the variables with strong and moderate correlations for predictive modeling. For pairs with weak correlations, their practical significance may be limited, even if statistically significant."
        ]
        interpretation_parts.append("\n".join(recommendations))
    else:
         interpretation_parts.append("**Conclusion**: The variables appear to be largely independent of one another. Further analysis may require different statistical approaches or data transformations.")


    return "\n\n".join(interpretation_parts)

def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        variables = payload.get('variables')
        method = payload.get('method', 'pearson')
        alpha = payload.get('alpha', 0.05)

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        
        df_clean = df[variables].copy()
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

                try:
                    col1 = df_clean[var1]
                    col2 = df_clean[var2]
                    if method == 'pearson':
                        corr, p_value = pearsonr(col1, col2)
                    elif method == 'spearman':
                        corr, p_value = spearmanr(col1, col2)
                    elif method == 'kendall':
                        corr, p_value = kendalltau(col1, col2)
                    else:
                        raise ValueError(f"Unknown correlation method: {method}")
                    
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
                except Exception:
                    continue

        if len(all_correlations) > 0:
            correlations_only = [c['correlation'] for c in all_correlations]
            summary_stats = {
                'mean_correlation': np.mean(correlations_only),
                'median_correlation': np.median(correlations_only),
                'std_dev': np.std(correlations_only),
                'range': [np.min(correlations_only), np.max(correlations_only)],
                'significant_correlations': sum(1 for c in all_correlations if c['significant']),
                'total_pairs': len(all_correlations)
            }
        else:
            summary_stats = { 'mean_correlation': 0,'median_correlation': 0,'std_dev': 0,'range': [0, 0],'significant_correlations': 0,'total_pairs': 0}
        
        effect_sizes_list = [_interpret_correlation_magnitude(c['correlation']) for c in all_correlations]
        effect_size_counts = { 'large': effect_sizes_list.count('large'), 'medium': effect_sizes_list.count('medium'), 'small': effect_sizes_list.count('small'), 'negligible': effect_sizes_list.count('negligible')}

        strongest_effect = 'negligible'
        if effect_size_counts.get('large', 0) > 0: strongest_effect = 'large'
        elif effect_size_counts.get('medium', 0) > 0: strongest_effect = 'medium'
        elif effect_size_counts.get('small', 0) > 0: strongest_effect = 'small'
        
        effect_sizes_summary = {'distribution': effect_size_counts, 'strongest_effect': strongest_effect}
        strongest_correlations = sorted(all_correlations, key=lambda x: abs(x['correlation']), reverse=True)[:10]

        interpretation = generate_interpretation(all_correlations, method, alpha)

        response = {
            "correlation_matrix": corr_matrix.to_dict(),
            "p_value_matrix": p_value_matrix.to_dict(),
            "summary_statistics": summary_stats,
            "effect_sizes": effect_sizes_summary,
            "strongest_correlations": strongest_correlations,
            "interpretation": interpretation,
        }

        print(json.dumps(response, default=_to_native_type, ensure_ascii=False))

    except Exception as e:
        error_response = { "error": str(e), "error_type": type(e).__name__ }
        print(json.dumps(error_response, default=_to_native_type), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    
