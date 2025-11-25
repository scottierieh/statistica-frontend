import sys
import json
import numpy as np
import pandas as pd
from sklearn.decomposition import FactorAnalysis, PCA
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from scipy.stats import chi2
from scipy.linalg import inv
import warnings

warnings.filterwarnings('ignore')

sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)


def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def _interpret_kmo(kmo):
    if kmo >= 0.9: return 'Excellent'
    if kmo >= 0.8: return 'Good'
    if kmo >= 0.7: return 'Acceptable'
    if kmo >= 0.6: return 'Questionable'
    if kmo >= 0.5: return 'Poor'
    return 'Unacceptable'

def _calculate_kmo(X):
    try:
        corr_matrix = np.corrcoef(X, rowvar=False)
        inv_corr = inv(corr_matrix)
        partial_corr = -inv_corr / np.sqrt(np.outer(np.diag(inv_corr), np.diag(inv_corr)))
        np.fill_diagonal(partial_corr, 0)

        sum_r2 = np.sum(np.triu(corr_matrix, 1)**2)
        sum_a2 = np.sum(np.triu(partial_corr, 1)**2)

        if sum_r2 + sum_a2 == 0:
            return 0.0

        return sum_r2 / (sum_r2 + sum_a2)
    except np.linalg.LinAlgError:
        return 0.0

def _bartlett_sphericity(X):
    n, p = X.shape
    if p < 2: return None, None, False
    try:
        corr_matrix = np.corrcoef(X, rowvar=False)
        det_corr = np.linalg.det(corr_matrix)
        
        if det_corr <= 0: return None, None, False

        statistic = - (n - 1 - (2 * p + 5) / 6) * np.log(det_corr)
        dof = p * (p - 1) // 2
        p_value = chi2.sf(statistic, dof)
        return statistic, p_value, p_value < 0.05
    except Exception:
        return None, None, False


def _generate_interpretation(results):
    """Generate detailed interpretation for EFA results in APA format."""
    
    interpretation_parts = []
    
    adequacy = results['adequacy']
    eigenvalues = results['eigenvalues']
    variance_explained = results['variance_explained']
    n_factors = results['n_factors']
    n_items = len(results['variables'])
    communalities = results.get('communalities', [])
    
    kmo = adequacy.get('kmo', 0)
    kmo_level = adequacy.get('kmo_interpretation', 'N/A')
    bartlett_sig = adequacy.get('bartlett_significant', False)
    bartlett_p = adequacy.get('bartlett_p_value')
    bartlett_stat = adequacy.get('bartlett_statistic')
    
    total_variance = variance_explained['cumulative'][-1] if variance_explained['cumulative'] else 0
    avg_communality = np.mean(communalities) if len(communalities) > 0 else 0
    
    # --- Overall Assessment ---
    interpretation_parts.append("**Overall Assessment**")
    
    interpretation_parts.append(
        f"→ Exploratory Factor Analysis (EFA) was conducted on **{n_items} variables** to identify underlying latent constructs."
    )
    
    interpretation_parts.append(
        f"→ Kaiser-Meyer-Olkin (KMO) measure of sampling adequacy: **{kmo:.3f}** ({kmo_level})."
    )
    
    if bartlett_stat is not None:
        p_text = "p < .001" if bartlett_p < 0.001 else f"p = {bartlett_p:.3f}"
        interpretation_parts.append(
            f"→ Bartlett's test of sphericity: χ² = {bartlett_stat:.2f}, {p_text} ({'significant' if bartlett_sig else 'not significant'})."
        )
    
    if kmo >= 0.6 and bartlett_sig:
        interpretation_parts.append(
            "→ Data is **suitable for factor analysis** based on adequacy tests."
        )
    elif kmo >= 0.5 and bartlett_sig:
        interpretation_parts.append(
            "→ Data shows **marginal suitability** for factor analysis; interpret with caution."
        )
    else:
        interpretation_parts.append(
            "→ ⚠ Data may **not be suitable** for factor analysis; consider alternative approaches."
        )
    
    interpretation_parts.append(
        f"→ **{n_factors} factor(s)** extracted, explaining **{total_variance:.1f}%** of total variance."
    )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    if total_variance >= 60:
        var_desc = "good"
    elif total_variance >= 50:
        var_desc = "adequate"
    else:
        var_desc = "limited"
    
    interpretation_parts.append(
        f"→ Cumulative variance explained ({total_variance:.1f}%) is **{var_desc}** (≥60% recommended)."
    )
    
    interpretation_parts.append("→ **Variance by factor:**")
    for i in range(min(n_factors, 5)):
        interpretation_parts.append(
            f"  • Factor {i+1}: {variance_explained['per_factor'][i]:.1f}% (eigenvalue = {eigenvalues[i]:.3f})"
        )
    
    if len(communalities) > 0:
        low_comm_items = sum(1 for c in communalities if c < 0.4)
        if avg_communality >= 0.6:
            interpretation_parts.append(
                f"→ Average communality ({avg_communality:.3f}) indicates **strong** factor extraction."
            )
        elif avg_communality >= 0.4:
            interpretation_parts.append(
                f"→ Average communality ({avg_communality:.3f}) indicates **moderate** factor extraction."
            )
        else:
            interpretation_parts.append(
                f"→ Average communality ({avg_communality:.3f}) is **low**; factors may not capture item variance well."
            )
        
        if low_comm_items > 0:
            interpretation_parts.append(
                f"→ {low_comm_items} item(s) have low communality (< .40); consider removal or revision."
            )
    
    factor_interpretation = results.get('interpretation', {})
    interpretation_parts.append("→ **Factor composition** (loadings ≥ .40):")
    for i in range(n_factors):
        factor_name = f"Factor {i+1}"
        factor_info = factor_interpretation.get(factor_name, {})
        high_vars = factor_info.get('variables', [])
        
        if high_vars:
            interpretation_parts.append(
                f"  • {factor_name}: {', '.join(high_vars[:4])}{'...' if len(high_vars) > 4 else ''} ({len(high_vars)} items)"
            )
        else:
            interpretation_parts.append(
                f"  • {factor_name}: No items with strong loadings (≥ .40)"
            )
    
    loadings = results.get('factor_loadings', [])
    if len(loadings) > 0:
        loadings_array = np.array(loadings)
        cross_loaded = 0
        for row in loadings_array:
            strong_loadings = np.sum(np.abs(row) >= 0.4)
            if strong_loadings > 1:
                cross_loaded += 1
        
        if cross_loaded > 0:
            interpretation_parts.append(
                f"→ ⚠ {cross_loaded} item(s) show **cross-loadings** (≥ .40 on multiple factors); may require revision."
            )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if kmo < 0.6:
        interpretation_parts.append(
            "→ Low KMO suggests: (1) increase sample size, (2) remove items with low correlations, "
            "(3) reconsider whether factor analysis is appropriate."
        )
    
    if total_variance < 50:
        interpretation_parts.append(
            "→ Low variance explained suggests: (1) extract more factors, (2) revise poorly-performing items, "
            "(3) consider alternative measurement approaches."
        )
    elif total_variance < 60:
        interpretation_parts.append(
            "→ Consider extracting additional factors or refining items to improve variance explained."
        )
    
    if avg_communality < 0.4:
        interpretation_parts.append(
            "→ Low communalities suggest some items may not belong to the factor structure; consider removal."
        )
    
    if kmo >= 0.7 and total_variance >= 60:
        interpretation_parts.append(
            "→ Good factor solution achieved. Next steps: (1) Calculate Cronbach's α for each factor, "
            "(2) Validate with Confirmatory Factor Analysis (CFA)."
        )
    else:
        interpretation_parts.append(
            "→ Before finalizing: (1) examine scree plot for optimal factor count, "
            "(2) try different rotation methods (varimax vs. promax)."
        )
    
    interpretation_parts.append(
        "→ Report factor loadings, communalities, and variance explained in publications."
    )
    
    interpretation_parts.append(
        "→ Consider theoretical justification when naming and interpreting factors."
    )
    
    return "\n".join(interpretation_parts)


def plot_efa_results(eigenvalues, loadings, variables):
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    fig.suptitle('Exploratory Factor Analysis Results', fontsize=16, fontweight='bold')

    n_comps = len(eigenvalues)
    ax = axes[0]
    
    colors = sns.color_palette('crest', n_colors=n_comps)
    
    ax.bar(range(1, n_comps + 1), eigenvalues, alpha=0.7, align='center', 
           color=colors, edgecolor='black', label='Eigenvalues')
    ax.axhline(y=1, color='red', linestyle='--', alpha=0.7, label='Eigenvalue = 1 (Kaiser rule)')
    ax.set_xlabel('Factors', fontsize=12)
    ax.set_ylabel('Eigenvalues', fontsize=12)
    ax.set_title('Scree Plot', fontsize=12, fontweight='bold')
    ax.set_xticks(range(1, n_comps + 1))
    ax.legend()
    ax.grid(True, alpha=0.3)

    ax = axes[1]
    if loadings.shape[1] >= 2:
        ax.scatter(loadings[:, 0], loadings[:, 1], alpha=0.6, s=80, color='#5B9BD5', edgecolors='black', linewidths=0.5)
        ax.axhline(0, color='red', linestyle='--', alpha=0.7, lw=1)
        ax.axvline(0, color='red', linestyle='--', alpha=0.7, lw=1)
        ax.set_xlabel('Factor 1 Loadings', fontsize=12)
        ax.set_ylabel('Factor 2 Loadings', fontsize=12)
        ax.set_title('Factor Loadings (F1 vs F2)', fontsize=12, fontweight='bold')
        ax.grid(True, alpha=0.3)
        for i, var in enumerate(variables):
            ax.annotate(var, (loadings[i, 0], loadings[i, 1]), 
                       textcoords="offset points", xytext=(0,5), 
                       ha='center', fontsize=9)
    else:
        ax.text(0.5, 0.5, 'Not enough factors to plot.', 
               ha='center', va='center', fontsize=12)
        ax.set_axis_off()

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"


def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        items = payload.get('items')
        n_factors = payload.get('nFactors')
        rotation = payload.get('rotation', 'varimax')
        method = payload.get('method', 'principal')

        if not all([data, items, n_factors]):
            raise ValueError("Missing 'data', 'items', or 'nFactors'")

        df = pd.DataFrame(data)
        
        df_items = df[items].copy().dropna()
        
        if df_items.shape[0] < df_items.shape[1]:
            raise ValueError("The number of observations must be greater than the number of variables.")

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df_items)

        kmo_overall = _calculate_kmo(X_scaled)
        kmo_interpretation = _interpret_kmo(kmo_overall)
        
        bartlett_stat, bartlett_p, bartlett_significant = _bartlett_sphericity(X_scaled)

        if method == 'pca':
            model = PCA(n_components=n_factors, random_state=42) if n_factors else PCA(random_state=42)
            model.fit(X_scaled)
            loadings = model.components_.T * np.sqrt(model.explained_variance_)
            eigenvalues_full = model.explained_variance_
            variance_explained = model.explained_variance_ratio_ * 100
        else:
            fa_rotation = rotation if rotation in ['varimax', 'quartimax', 'promax', 'oblimin'] and rotation != 'none' else None
            model = FactorAnalysis(n_components=n_factors, rotation=fa_rotation, random_state=42)
            model.fit(X_scaled)
            loadings = model.components_.T
            
            corr_matrix = np.corrcoef(X_scaled, rowvar=False)
            eigenvalues_full, _ = np.linalg.eigh(corr_matrix)
            eigenvalues_full = sorted(eigenvalues_full, reverse=True)
            
            ss_loadings_sklearn = np.sum(loadings**2, axis=0)
            variance_explained = (ss_loadings_sklearn / len(items)) * 100

        communalities = np.sum(loadings**2, axis=1)
        
        cumulative_variance = np.cumsum(variance_explained)

        interpretation_data = {}
        for i in range(n_factors):
            factor_loadings = loadings[:, i]
            high_loadings_indices = np.where(np.abs(factor_loadings) >= 0.4)[0]
            
            interpretation_data[f'Factor {i+1}'] = {
                'variables': [items[j] for j in high_loadings_indices],
                'loadings': [factor_loadings[j] for j in high_loadings_indices]
            }
        
        plot_image = plot_efa_results(eigenvalues_full[:len(items)], loadings, items)

        response = {
            "adequacy": {
                "kmo": kmo_overall,
                "kmo_interpretation": kmo_interpretation,
                "bartlett_statistic": bartlett_stat,
                "bartlett_p_value": bartlett_p,
                "bartlett_significant": bartlett_significant
            },
            "eigenvalues": eigenvalues_full,
            "factor_loadings": loadings,
            "variance_explained": {
                "per_factor": variance_explained,
                "cumulative": cumulative_variance
            },
            "communalities": communalities,
            "interpretation": interpretation_data,
            "variables": items,
            "n_factors": n_factors,
            "plot": plot_image
        }
        
        response['full_interpretation'] = _generate_interpretation(response)
        
        cleaned_response = json.loads(json.dumps(response, default=_to_native_type))
        print(json.dumps(cleaned_response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    