import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import pearsonr, spearmanr, kendalltau
import math
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64


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

def _generate_interpretation(all_correlations, n, method):
    """Generates a detailed interpretation for all variable pairs."""
    if not all_correlations:
        return { "title": "No Correlations Found", "body": "No correlations could be calculated among the selected variables."}
    
    variables = sorted(list(set([c['variable_1'] for c in all_correlations] + [c['variable_2'] for c in all_correlations])))
    n_vars = len(variables)
    n_pairs = len(all_correlations)
    
    method_map = {
        'pearson': "Pearson product-moment correlation",
        'spearman': "Spearman rank-order correlation",
        'kendall': "Kendall's tau correlation"
    }
    method_name = method_map.get(method, 'correlation')
    
    # Calculate summary statistics
    sig_correlations = [c for c in all_correlations if c['significant']]
    n_sig = len(sig_correlations)
    sig_percent = (n_sig / n_pairs * 100) if n_pairs > 0 else 0
    
    correlations_only = [c['correlation'] for c in all_correlations]
    mean_abs_r = np.mean([abs(r) for r in correlations_only]) if correlations_only else 0
    
    # Count by strength
    strong_count = sum(1 for c in all_correlations if abs(c['correlation']) >= 0.7)
    moderate_count = sum(1 for c in all_correlations if 0.4 <= abs(c['correlation']) < 0.7)
    weak_count = sum(1 for c in all_correlations if abs(c['correlation']) < 0.4)
    
    # Construct structured interpretation
    sections = []
    
    # Overall Analysis Section
    sections.append("**Overall Analysis**")
    sections.append(f"A {method_name} analysis was conducted to examine relationships among {n_vars} variables using {n} observations. The analysis calculated {n_pairs} correlation coefficients between all variable pairs.")
    
    # Summary statistics in Overall Analysis
    mean_strength = _interpret_correlation_magnitude(mean_abs_r)
    sections.append(f"Mean absolute correlation: {mean_abs_r:.3f}, indicating {mean_strength} relationships overall.")
    
    if n_sig > 0:
        sections.append(f"{n_sig} out of {n_pairs} correlations ({sig_percent:.1f}%) were statistically significant (p < 0.05).")
    else:
        sections.append(f"No statistically significant correlations were found (all p ≥ 0.05).")
    
    sections.append("")
    
    # Statistical Insights Section with detailed pair-by-pair analysis
    sections.append("**Statistical Insights**")
    
    # Add detailed interpretation for each pair (sorted by strength)
    sorted_correlations = sorted(all_correlations, key=lambda x: abs(x.get('correlation', 0)), reverse=True)
    
    for corr in sorted_correlations:
        r = corr['correlation']
        p = corr['p_value']
        var1 = corr['variable_1']
        var2 = corr['variable_2']
        
        strength = _interpret_correlation_magnitude(r)
        direction = "positive" if r > 0 else "negative"
        significance = "statistically significant" if p < 0.05 else "not statistically significant"
        
        sections.append(f"→ **{var1} & {var2}**: A {strength}, {direction} correlation (r = {r:.3f}, p = {p:.3f}), which was {significance}")
    
    # Distribution by strength at end of Statistical Insights
    if strong_count > 0 or moderate_count > 0:
        strength_parts = []
        if strong_count > 0:
            strength_parts.append(f"{strong_count} strong (|r| ≥ 0.7)")
        if moderate_count > 0:
            strength_parts.append(f"{moderate_count} moderate (|r| 0.4-0.7)")
        if weak_count > 0:
            strength_parts.append(f"{weak_count} weak (|r| < 0.4)")
        sections.append(f"→ Correlation strength distribution: {', '.join(strength_parts)}")
    
    sections.append("")
    
    # Recommendations Section
    sections.append("**Recommendations**")
    
    # Multicollinearity warning
    if strong_count > 0:
        sections.append(f"→ {strong_count} correlation(s) exceed |r| = 0.7, suggesting potential multicollinearity - consider removing redundant predictors in regression models")
    
    # Method-specific recommendations
    if method == 'pearson':
        sections.append("→ Pearson correlation assumes linear relationships - review scatterplots to verify linearity and check for outliers")
        if n < 30:
            sections.append("→ Small sample size may affect reliability - consider using Spearman's correlation or collecting more data")
    elif method == 'spearman':
        sections.append("→ Spearman correlation captures monotonic (not just linear) relationships - appropriate for ordinal data or non-linear patterns")
    elif method == 'kendall':
        sections.append("→ Kendall's tau is robust to outliers and appropriate for small samples with many tied ranks")
    
    # Feature selection recommendation
    if sig_percent > 50:
        sections.append("→ Many significant correlations found - use these relationships to inform feature selection and hypothesis generation")
    elif sig_percent > 0:
        sections.append("→ Some relationships detected - investigate significant pairs further to understand underlying mechanisms")
    else:
        sections.append("→ Limited correlation structure - variables may be largely independent or relationships may be non-linear")
    
    # Next steps
    sections.append("→ Consider follow-up analyses: partial correlations to control for confounders, time-lagged correlations for temporal data, or regression for prediction")
    
    summary_title = f"Correlation Analysis: {n_vars} Variables, {n_pairs} Pairs Examined"
    summary_body = "\n".join(sections)
    
    return {"title": summary_title, "body": summary_body}

def generate_pairs_plot_seaborn(df, group_var=None):
    """Generates a pairs plot (scatter matrix) using Seaborn."""
    # Set seaborn style
    sns.set_theme(style="darkgrid")
    sns.set_context("notebook", font_scale=1.1)
    
    # Determine variables for pairs plot
    plot_vars = [col for col in df.columns if col != group_var]
    
    # Create pairplot
    if group_var and group_var in df.columns:
        g = sns.pairplot(
            df, 
            vars=plot_vars,
            hue=group_var,
            diag_kind='kde',
            plot_kws={'alpha': 0.6, 's': 30},
            diag_kws={'alpha': 0.7}
        )
    else:
        g = sns.pairplot(
            df[plot_vars],
            diag_kind='kde',
            plot_kws={'alpha': 0.6, 's': 30},
            diag_kws={'alpha': 0.7}
        )
    
    g.fig.suptitle('Pairs Plot (Scatter Matrix)', y=1.02, fontsize=16, fontweight='bold')
    
    # Convert to base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(g.fig)
    buf.seek(0)
    image_base64 = base64.b64encode(buf.read()).decode('utf-8')
    return f"data:image/png;base64,{image_base64}"


def generate_heatmap_seaborn(corr_matrix, title='Correlation Matrix'):
    """Generates a heatmap using Seaborn."""
    # Set seaborn style
    sns.set_theme(style="darkgrid")
    sns.set_context("notebook", font_scale=1.1)
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Create heatmap
    sns.heatmap(
        corr_matrix,
        annot=True,
        fmt='.2f',
        cmap='vlag',
        center=0,
        vmin=-1,
        vmax=1,
        square=True,
        linewidths=1,
        cbar_kws={'label': 'Correlation Coefficient'},
        ax=ax
    )
    
    ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
    plt.tight_layout()
    
    # Convert to base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    image_base64 = base64.b64encode(buf.read()).decode('utf-8')
    return f"data:image/png;base64,{image_base64}"


def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        variables = payload.get('variables')
        group_var = payload.get('groupVar')
        method = payload.get('method', 'pearson')
        alpha = payload.get('alpha', 0.05)

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        
        # Track original indices before any operations
        original_length = len(df)
        df['__original_index__'] = range(original_length)
        
        # Prepare columns for analysis
        analysis_cols = variables + ([group_var] if group_var else [])
        df_clean = df[list(set(analysis_cols)) + ['__original_index__']].copy()

        for col in variables:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
        
        # Track which rows will be dropped
        missing_mask = df_clean[variables].isnull().any(axis=1)
        dropped_indices = df_clean.loc[missing_mask, '__original_index__'].tolist()
        
        # Drop missing values
        df_clean.dropna(subset=variables, inplace=True)
        
        # Store dropped row information
        n_dropped = len(dropped_indices)
        dropped_rows = sorted(dropped_indices)
        
        # Remove tracking column
        if '__original_index__' in df_clean.columns:
            df_clean = df_clean.drop(columns=['__original_index__'])
        
        if df_clean.shape[0] < 2:
            raise ValueError("Not enough valid data points for analysis.")

        # Correlation matrix on numeric variables only
        numeric_df = df_clean[variables]
        n_vars = len(numeric_df.columns)
        current_vars = numeric_df.columns.tolist()

        corr_matrix = pd.DataFrame(np.eye(n_vars), index=current_vars, columns=current_vars)
        p_value_matrix = pd.DataFrame(np.zeros((n_vars, n_vars)), index=current_vars, columns=current_vars)
        
        all_correlations = []

        for i in range(n_vars):
            for j in range(i + 1, n_vars):
                var1 = current_vars[i]
                var2 = current_vars[j]
                
                corr, p_value = np.nan, np.nan

                try:
                    col1 = numeric_df[var1]
                    col2 = numeric_df[var2]
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
                    
                    if not np.isnan(corr) and not np.isnan(p_value):
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
            correlations_only = [c['correlation'] for c in all_correlations if c.get('correlation') is not None]
            summary_stats = {
                'mean_correlation': np.mean([abs(c) for c in correlations_only]) if correlations_only else 0,
                'median_correlation': np.median([abs(c) for c in correlations_only]) if correlations_only else 0,
                'std_dev': np.std([abs(c) for c in correlations_only]) if correlations_only else 0,
                'range': [np.min(correlations_only), np.max(correlations_only)] if correlations_only else [0,0],
                'significant_correlations': sum(1 for c in all_correlations if c['significant']),
                'total_pairs': len(all_correlations)
            }
        else:
            summary_stats = { 'mean_correlation': 0,'median_correlation': 0,'std_dev': 0,'range': [0, 0],'significant_correlations': 0,'total_pairs': 0}
        
        strongest_correlations = sorted(all_correlations, key=lambda x: abs(x.get('correlation', 0)), reverse=True)
        
        interpretation = _generate_interpretation(all_correlations, len(df_clean), method)

        # Generate plots using Seaborn
        pairs_plot_base64 = generate_pairs_plot_seaborn(df_clean[variables + ([group_var] if group_var else [])], group_var=group_var)
        heatmap_plot_base64 = generate_heatmap_seaborn(corr_matrix, title=f'{method.capitalize()} Correlation Matrix')

        response = {
            "correlation_matrix": corr_matrix.to_dict(),
            "p_value_matrix": p_value_matrix.to_dict(),
            "summary_statistics": summary_stats,
            "strongest_correlations": strongest_correlations[:10],
            "interpretation": interpretation,
            "pairs_plot": pairs_plot_base64,
            "heatmap_plot": heatmap_plot_base64,
            "n_dropped": n_dropped,
            "dropped_rows": dropped_rows
        }

        print(json.dumps(response, default=_to_native_type, ensure_ascii=False))

    except Exception as e:
        error_response = { "error": str(e), "error_type": type(e).__name__ }
        print(json.dumps(error_response, default=_to_native_type), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()