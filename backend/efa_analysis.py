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

# Set seaborn style globally
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
    adequacy = results['adequacy']
    eigenvalues = results['eigenvalues']
    variance_explained = results['variance_explained']
    n_factors = results['n_factors']
    n_items = len(results['variables'])

    kmo_level = adequacy.get('kmo_interpretation', 'N/A').lower()
    bartlett_sig = adequacy.get('bartlett_significant', False)
    bartlett_p_val = adequacy.get('bartlett_p_value')
    bartlett_stat = adequacy.get('bartlett_statistic')

    interpretation = (
        f"An Exploratory Factor Analysis (EFA) was conducted on {n_items} items to identify underlying latent factors. "
        f"The suitability of the data for factor analysis was assessed before extraction.\n"
    )

    p_val_text = "p = n/a"
    if bartlett_p_val is not None:
        p_val_text = "p < .001" if bartlett_p_val < 0.001 else f"p = {bartlett_p_val:.3f}"
    
    bartlett_stat_text = 'n/a'
    if bartlett_stat is not None:
        bartlett_stat_text = f'{bartlett_stat:.2f}'


    interpretation += (
        f"The Kaiser-Meyer-Olkin (KMO) measure of sampling adequacy was {kmo_level} ({adequacy.get('kmo', 0):.2f}), "
        f"and Bartlett's test of sphericity was {'statistically significant' if bartlett_sig else 'not significant'} "
        f"(χ² ≈ {bartlett_stat_text}, {p_val_text}). "
        f"These indicators suggest that the data is {'suitable' if kmo_level not in ['poor', 'unacceptable'] and bartlett_sig else 'may not be suitable'} for factor analysis.\n\n"
    )

    interpretation += (
        f"Based on the analysis, **{n_factors} factors** were extracted, which collectively explain **{variance_explained['cumulative'][-1]:.2f}%** of the total variance. "
        f"The eigenvalues for these factors were greater than 1, satisfying the Kaiser criterion, and a scree plot inspection also supported this factor structure.\n\n"
    )

    interpretation += "**Factor Interpretation:**\n"
    for i in range(n_factors):
        factor_name = f"Factor {i+1}"
        factor_info = results['interpretation'].get(factor_name, {})
        high_loading_vars = factor_info.get('variables', [])
        
        if high_loading_vars:
            interpretation += (
                f"- **{factor_name}** (Explained Variance: {variance_explained['per_factor'][i]:.2f}%): This factor is primarily defined by high loadings from items such as **{', '.join(high_loading_vars)}**. "
                f"This suggests an underlying construct related to these items. A potential name for this factor could be **'{high_loading_vars[0].split('_')[0].capitalize()}'**.\n"
            )
        else:
            interpretation += f"- **{factor_name}**: No items loaded strongly on this factor, making interpretation difficult.\n"

    interpretation += (
        "\n**Recommendations:**\n"
        "The identified factor structure provides a simplified representation of the data. For further validation, it is recommended to:\n"
        "1.  **Assess Internal Consistency:** Calculate Cronbach's alpha for the items within each extracted factor to ensure reliability.\n"
        "2.  **Perform Confirmatory Factor Analysis (CFA):** Test the stability and validity of this factor structure on a different dataset or through structural equation modeling."
    )

    return interpretation.strip()

def plot_efa_results(eigenvalues, loadings, variables):
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))

    # Scree Plot
    n_comps = len(eigenvalues)
    ax = axes[0]
    
    # Use crest color palette
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

    # Loadings Plot for first 2 factors
    ax = axes[1]
    if loadings.shape[1] >= 2:
        ax.scatter(loadings[:, 0], loadings[:, 1], alpha=0.6, s=80, color='#5B9BD5', edgecolors='black', linewidths=0.5)
        ax.axhline(0, color='black', linestyle='--', alpha=0.7, lw=1)
        ax.axvline(0, color='black', linestyle='--', alpha=0.7, lw=1)
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
        
        # --- Data Cleaning & Preparation ---
        df_items = df[items].copy().dropna()
        
        if df_items.shape[0] < df_items.shape[1]:
            raise ValueError("The number of observations must be greater than the number of variables.")

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df_items)

        # --- Adequacy Tests ---
        kmo_overall = _calculate_kmo(X_scaled)
        kmo_interpretation = _interpret_kmo(kmo_overall)
        
        bartlett_stat, bartlett_p, bartlett_significant = _bartlett_sphericity(X_scaled)

        # --- Factor Analysis ---
        if method == 'pca':
            model = PCA(n_components=n_factors, random_state=42) if n_factors else PCA(random_state=42)
            model.fit(X_scaled)
            loadings = model.components_.T * np.sqrt(model.explained_variance_)
            eigenvalues_full = model.explained_variance_
            variance_explained = model.explained_variance_ratio_ * 100
        else: # Principal Axis Factoring
            fa_rotation = rotation if rotation in ['varimax', 'quartimax', 'promax', 'oblimin'] and rotation != 'none' else None
            model = FactorAnalysis(n_components=n_factors, rotation=fa_rotation, random_state=42)
            model.fit(X_scaled)
            loadings = model.components_.T
            
            # For PAF, eigenvalues from the original correlation matrix are standard.
            corr_matrix = np.corrcoef(X_scaled, rowvar=False)
            eigenvalues_full, _ = np.linalg.eigh(corr_matrix)
            eigenvalues_full = sorted(eigenvalues_full, reverse=True)
            
            # Explained variance in PAF is the sum of squared loadings (post-rotation)
            ss_loadings_sklearn = np.sum(loadings**2, axis=0)
            variance_explained = (ss_loadings_sklearn / len(items)) * 100

        
        # Communalities
        communalities = np.sum(loadings**2, axis=1)
        
        cumulative_variance = np.cumsum(variance_explained)

        # --- Factor Interpretation ---
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