

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
import plotly.graph_objects as go
import plotly.io as pio


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
    
    method_map = {
        'pearson': "Pearson product-moment correlation",
        'spearman': "Spearman rank-order correlation",
        'kendall': "Kendall's tau correlation"
    }
    
    # Introduction
    intro = f"A {method_map.get(method, 'correlation')} analysis was conducted to examine the relationships between the variables: {', '.join(variables)}.\n\n"
    
    # Detailed report for each pair
    details = []
    for corr in all_correlations:
        r = corr['correlation']
        p = corr['p_value']
        var1 = corr['variable_1']
        var2 = corr['variable_2']
        
        strength = _interpret_correlation_magnitude(r)
        direction = "positive" if r > 0 else "negative"
        significance = "significant" if p < 0.05 else "not significant"
        
        detail = (
            f"- **{var1} & {var2}**: A {strength}, {direction} correlation was found, which was statistically {significance} "
            f"(r = {r:.3f}, p = {p:.3f})."
        )
        details.append(detail)
    
    # Summary of strongest and weakest
    strongest_corr = sorted(all_correlations, key=lambda x: abs(x.get('correlation', 0)), reverse=True)[0]
    
    summary_title = f"Overall Finding: Strongest relationship between '{strongest_corr['variable_1']}' and '{strongest_corr['variable_2']}'"
    summary_body = intro + "\n".join(details)
    
    return {"title": summary_title, "body": summary_body}

def generate_pairs_plot_plotly(df, group_var=None):
    """Generates an interactive pairs plot (scatter matrix) using Plotly."""
    import plotly.express as px

    fig = px.scatter_matrix(
        df,
        dimensions=[col for col in df.columns if col != group_var],
        color=group_var,
        symbol=group_var,
        title='Pairs Plot (Scatter Matrix)',
        labels={col: col.replace('_', ' ').title() for col in df.columns}
    )
    
    fig.update_traces(diagonal_visible=False, showupperhalf=False)

    for i in range(len(fig.data)):
        # You can customize traces here if needed
        pass

    fig.update_layout(
        dragmode='select',
        width=800,
        height=800,
        autosize=False,
        hovermode='closest',
    )
    
    return pio.to_json(fig)


def generate_heatmap_plotly(df, title='Correlation Matrix'):
    """Generates an interactive heatmap using Plotly."""
    colorscale = [
        [0.0, '#a67b70'],  # Min value color (Rosebrown)
        [0.5, '#d4c4a8'],  # Mid value color (Cream Beige)
        [1.0, '#7a9471']   # Max value color (Olive Green)
    ]
    fig = go.Figure(data=go.Heatmap(
        z=df.values,
        x=df.columns,
        y=df.columns,
        colorscale=colorscale,
        zmin=-1,
        zmax=1,
        text=np.around(df.values, decimals=2),
        texttemplate="%{text}",
        hoverongaps=False
    ))
    fig.update_layout(
        title=title,
        xaxis_tickangle=-45
    )
    return pio.to_json(fig)


def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        variables = payload.get('variables')
        group_var = payload.get('groupVar') # New parameter for hue
        method = payload.get('method', 'pearson')
        alpha = payload.get('alpha', 0.05)

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        
        # Prepare columns for analysis
        analysis_cols = variables + ([group_var] if group_var else [])
        df_clean = df[list(set(analysis_cols))].copy()

        for col in variables: # Only convert main variables to numeric
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
        
        df_clean.dropna(subset=variables, inplace=True)
        
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
                'mean_correlation': np.mean(correlations_only) if correlations_only else 0,
                'median_correlation': np.median(correlations_only) if correlations_only else 0,
                'std_dev': np.std(correlations_only) if correlations_only else 0,
                'range': [np.min(correlations_only), np.max(correlations_only)] if correlations_only else [0,0],
                'significant_correlations': sum(1 for c in all_correlations if c['significant']),
                'total_pairs': len(all_correlations)
            }
        else:
            summary_stats = { 'mean_correlation': 0,'median_correlation': 0,'std_dev': 0,'range': [0, 0],'significant_correlations': 0,'total_pairs': 0}
        
        strongest_correlations = sorted(all_correlations, key=lambda x: abs(x.get('correlation', 0)), reverse=True)
        
        interpretation = _generate_interpretation(all_correlations, len(df_clean), method)

        # Generate plots
        pairs_plot_json = generate_pairs_plot_plotly(df_clean[variables + ([group_var] if group_var else [])], group_var=group_var)
        heatmap_plot_json = generate_heatmap_plotly(corr_matrix, title=f'{method.capitalize()} Correlation Matrix')

        response = {
            "correlation_matrix": corr_matrix.to_dict(),
            "p_value_matrix": p_value_matrix.to_dict(),
            "summary_statistics": summary_stats,
            "strongest_correlations": strongest_correlations[:10],
            "interpretation": interpretation,
            "pairs_plot": pairs_plot_json,
            "heatmap_plot": heatmap_plot_json,
        }

        print(json.dumps(response, default=_to_native_type, ensure_ascii=False))

    except Exception as e:
        error_response = { "error": str(e), "error_type": type(e).__name__ }
        print(json.dumps(error_response, default=_to_native_type), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()












