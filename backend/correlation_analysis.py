
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import pearsonr, spearmanr, kendalltau

def _interpret_correlation_magnitude(r):
    abs_r = abs(r)
    if abs_r >= 0.5: return 'large'
    if abs_r >= 0.3: return 'medium'
    if abs_r >= 0.1: return 'small'
    return 'negligible'

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
        
        # Ensure only specified variables are used and they are numeric
        df_clean = df[variables].copy()
        for col in df_clean.columns:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
        
        df_clean.dropna(inplace=True)
        
        if df_clean.shape[0] < 2:
            raise ValueError("Not enough valid data points for analysis.")

        n_vars = len(df_clean.columns)
        current_vars = df_clean.columns.tolist()

        corr_matrix = pd.DataFrame(np.eye(n_vars), index=current_vars, columns=current_vars)
        p_value_matrix = pd.DataFrame(np.zeros((n_vars, n_vars)), index=current_vars, columns=current_vars)
        
        all_correlations = []

        for i in range(n_vars):
            for j in range(i + 1, n_vars):
                var1 = current_vars[i]
                var2 = current_vars[j]
                
                col1 = df_clean[var1]
                col2 = df_clean[var2]
                
                corr, p_value = np.nan, np.nan
                if method == 'pearson':
                    corr, p_value = pearsonr(col1, col2)
                elif method == 'spearman':
                    corr, p_value = spearmanr(col1, col2)
                elif method == 'kendall':
                    corr, p_value = kendalltau(col1, col2)
                
                corr_matrix.iloc[i, j] = corr_matrix.iloc[j, i] = corr
                p_value_matrix.iloc[i, j] = p_value_matrix.iloc[j, i] = p_value
                
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

        response = {
            "correlation_matrix": corr_matrix.to_dict(),
            "p_value_matrix": p_value_matrix.to_dict(),
            "summary_statistics": summary_stats,
            "effect_sizes": effect_sizes_summary,
            "strongest_correlations": strongest_correlations
        }

        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
