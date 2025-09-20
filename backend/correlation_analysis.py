

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

def _generate_interpretation(strongest_corr, n, method):
    if not strongest_corr:
        return { "title": "No Significant Correlations", "body": "No significant correlations were found among the selected variables."}
        
    r = strongest_corr['correlation']
    p = strongest_corr['p_value']
    var1 = strongest_corr['variable_1']
    var2 = strongest_corr['variable_2']
    
    method_map = {
        'pearson': "A Pearson product-moment correlation",
        'spearman': "A Spearman rank-order correlation",
        'kendall': "A Kendall's tau correlation"
    }
    
    direction = "positive" if r > 0 else "negative"
    strength = _interpret_correlation_magnitude(r)
    significance = "significant" if p < 0.05 else "not significant"
    df = n - 2 # for pearson and spearman
    
    title = f"Strongest Finding: {var1} & {var2}"
    body = (
        f"{method_map.get(method, 'A correlation')} was run to assess the relationship between '{var1}' and '{var2}'.\n"
        f"A {strength}, {direction} correlation was found, which was statistically {significance} "
        f"(r({df}) = {r:.3f}, p = {p:.3f})."
    )
    
    return {"title": title, "body": body}

def generate_pairs_plot(df, method='pearson'):
    """Generates a pairs plot (scatter matrix) for the dataframe."""
    
    def corr_func(x, y, **kwargs):
        if method == 'pearson':
            r, p = pearsonr(x, y)
        elif method == 'spearman':
            r, p = spearmanr(x, y)
        elif method == 'kendall':
            r, p = kendalltau(x, y)
        else:
            r, p = np.nan, np.nan
        
        ax = plt.gca()
        ax.annotate(f"{r:.2f}", xy=(.5, .6), xycoords=ax.transAxes, ha='center', va='center', fontsize=14)
        
        stars = ''
        if p < 0.001: stars = '***'
        elif p < 0.01: stars = '**'
        elif p < 0.05: stars = '*'
        ax.annotate(stars, xy=(.5, .4), xycoords=ax.transAxes, ha='center', va='center', fontsize=16, color='red')

    g = sns.PairGrid(df)
    g.map_upper(corr_func)
    g.map_lower(sns.scatterplot, s=30, color='rebeccapurple', alpha=0.6)
    g.map_diag(sns.histplot, kde=True, color='skyblue')
    
    for ax in g.axes.flatten():
        ax.set_ylabel(ax.get_ylabel(), rotation=0, horizontalalignment='right')
        ax.set_xlabel(ax.get_xlabel(), rotation=90, horizontalalignment='right')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    
    return base64.b64encode(buf.read()).decode('utf-8')

def generate_heatmap_plotly(df, title='Correlation Matrix'):
    """Generates an interactive heatmap using Plotly."""
    fig = go.Figure(data=go.Heatmap(
        z=df.values,
        x=df.columns,
        y=df.columns,
        colorscale='RdBu',
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

        n_vars = len(df_clean.columns)
        current_vars = df_clean.columns.tolist()

        corr_matrix = pd.DataFrame(np.eye(n_vars), index=current_vars, columns=current_vars)
        p_value_matrix = pd.DataFrame(np.zeros((n_vars, n_vars)), index=current_vars, columns=current_vars)
        
        all_correlations = []

        for i in range(n_vars):
            for j in range(i + 1, n_vars):
                var1 = current_vars[i]
                var2 = current_vars[j]
                
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
        
        strongest_correlations = sorted(all_correlations, key=lambda x: abs(x['correlation']), reverse=True)
        
        interpretation = _generate_interpretation(strongest_correlations[0] if strongest_correlations else None, len(df_clean), method)

        # Generate plots
        pairs_plot_img = generate_pairs_plot(df_clean[current_vars], method)
        heatmap_plot_json = generate_heatmap_plotly(corr_matrix, title=f'{method.capitalize()} Correlation Matrix')

        response = {
            "correlation_matrix": corr_matrix.to_dict(),
            "p_value_matrix": p_value_matrix.to_dict(),
            "summary_statistics": summary_stats,
            "strongest_correlations": strongest_correlations[:10],
            "interpretation": interpretation,
            "pairs_plot": f"data:image/png;base64,{pairs_plot_img}",
            "heatmap_plot": heatmap_plot_json,
        }

        print(json.dumps(response, default=_to_native_type, ensure_ascii=False))

    except Exception as e:
        error_response = { "error": str(e), "error_type": type(e).__name__ }
        print(json.dumps(error_response, default=_to_native_type), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()


