
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
    if abs_r >= 0.5: return 'large'
    if abs_r >= 0.3: return 'medium'
    if abs_r >= 0.1: return 'small'
    return 'negligible'

def generate_interpretation(summary_stats, effect_sizes, strongest_correlations, method):
    """
    Generates a comprehensive textual interpretation of the correlation results.
    """
    interpretation_parts = []
    
    try:
        mean_corr = summary_stats.get('mean_correlation', 0)
        total_pairs = summary_stats.get('total_pairs', 0)
        
        if total_pairs == 0:
            return "No valid correlation pairs found for analysis.", []

        mean_desc = "generally negligible"
        if abs(mean_corr) >= 0.5:
            mean_desc = "generally strong"
        elif abs(mean_corr) >= 0.3:
            mean_desc = "generally moderate"
        elif abs(mean_corr) >= 0.1:
            mean_desc = "generally weak"
            
        interpretation_parts.append(
            f"📊 **Correlation Analysis Summary**\n"
            f"This report details the {method.title()} correlation analysis. A total of **{total_pairs}** variable pairs were analyzed. "
            f"The average correlation coefficient was **{mean_corr:.3f}**, suggesting a {mean_desc} overall relationship strength across the variables."
        )
        
        significant_count = summary_stats.get('significant_correlations', 0)
        significant_pct = (significant_count / total_pairs * 100) if total_pairs > 0 else 0
        effect_dist = effect_sizes.get('distribution', {})
        strongest_effect = effect_sizes.get('strongest_effect', 'negligible')
        
        interpretation_parts.append(
            f"📈 **Significance and Effect Size**\n"
            f"**{significant_count}** pairs ({significant_pct:.1f}%) showed a statistically significant correlation (p < 0.05). "
            f"The dominant effect size was **{strongest_effect}**, with {effect_dist.get(strongest_effect, 0)} pairs falling into this category. This indicates the practical importance of the observed relationships."
        )
        
        if strongest_correlations and len(strongest_correlations) > 0:
            strongest_pos = next((c for c in strongest_correlations if c['correlation'] > 0), None)
            strongest_neg = next((c for c in strongest_correlations if c['correlation'] < 0), None)
            
            correlation_details = []
            
            if strongest_pos:
                correlation_details.append(
                    f"The strongest positive correlation was between **{strongest_pos['variable_1']}** and **{strongest_pos['variable_2']}** (r = {strongest_pos['correlation']:.3f}, p = {strongest_pos['p_value']:.4f}). This indicates that as one variable increases, the other tends to significantly increase."
                )
                
            if strongest_neg:
                correlation_details.append(
                    f"The strongest negative correlation was between **{strongest_neg['variable_1']}** and **{strongest_neg['variable_2']}** (r = {strongest_neg['correlation']:.3f}, p = {strongest_neg['p_value']:.4f}). This implies that as one variable increases, the other tends to significantly decrease."
                )
            
            if correlation_details:
                interpretation_parts.append(f"🔍 **Key Findings**\n" + "\n".join(correlation_details))
        
        return "\n\n".join(interpretation_parts)
        
    except Exception as e:
        return f"Error generating interpretation: {str(e)}"

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
        if effect_size_counts['large'] > 0: strongest_effect = 'large'
        elif effect_size_counts['medium'] > 0: strongest_effect = 'medium'
        elif effect_size_counts['small'] > 0: strongest_effect = 'small'
        
        effect_sizes_summary = {'distribution': effect_size_counts, 'strongest_effect': strongest_effect}
        strongest_correlations = sorted(all_correlations, key=lambda x: abs(x['correlation']), reverse=True)[:10]

        interpretation = generate_interpretation(summary_stats, effect_sizes_summary, strongest_correlations, method)

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

    