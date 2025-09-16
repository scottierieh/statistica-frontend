

import sys
import json
import numpy as np
import pandas as pd
from sklearn.decomposition import FactorAnalysis, PCA
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import io
import base64

try:
    from factor_analyzer import FactorAnalyzer
    from factor_analyzer.factor_analyzer import calculate_kmo, calculate_bartlett_sphericity
    FA_AVAILABLE = True
except ImportError:
    FA_AVAILABLE = False


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


def plot_efa_results(eigenvalues, loadings, variables):
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle('Exploratory Factor Analysis Results', fontsize=16)

    # Scree Plot
    n_comps = len(eigenvalues)
    ax = axes[0]
    ax.bar(range(1, n_comps + 1), eigenvalues, alpha=0.7, align='center', label='Eigenvalues')
    ax.axhline(y=1, color='gray', linestyle='--', label='Eigenvalue = 1 (Kaiser rule)')
    ax.set_xlabel('Factors')
    ax.set_ylabel('Eigenvalues')
    ax.set_title('Scree Plot')
    ax.set_xticks(range(1, n_comps + 1))
    ax.legend()
    ax.grid(True, alpha=0.3)

    # Loadings Plot for first 2 factors
    ax = axes[1]
    if loadings.shape[1] >= 2:
        ax.scatter(loadings[:, 0], loadings[:, 1], alpha=0.8)
        ax.axhline(0, color='grey', lw=1)
        ax.axvline(0, color='grey', lw=1)
        ax.set_xlabel('Factor 1 Loadings')
        ax.set_ylabel('Factor 2 Loadings')
        ax.set_title('Factor Loadings (F1 vs F2)')
        ax.grid(True, alpha=0.3)
        for i, var in enumerate(variables):
            ax.annotate(var, (loadings[i, 0], loadings[i, 1]), textcoords="offset points", xytext=(0,5), ha='center', fontsize=9)
    else:
        ax.text(0.5, 0.5, 'Not enough factors to plot.', ha='center', va='center')
        ax.set_axis_off()

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
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
        method = payload.get('method', 'principal') # 'principal' or 'pca'

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
        if FA_AVAILABLE:
            bartlett_stat, bartlett_p = calculate_bartlett_sphericity(df_items)
            kmo_per_variable, kmo_overall = calculate_kmo(df_items)
            kmo_overall = _to_native_type(kmo_overall)
        else: # Fallback if factor_analyzer is not available
             bartlett_stat, bartlett_p = np.nan, np.nan
             kmo_overall = np.nan


        # --- Factor Analysis ---
        if method == 'pca':
            # Using PCA for factor extraction
            pca = PCA(n_components=n_factors)
            pca.fit(X_scaled)
            loadings = pca.components_.T * np.sqrt(pca.explained_variance_)
            eigenvalues_full = pca.explained_variance_
            variance_explained = pca.explained_variance_ratio_ * 100
        else:
            # Using FactorAnalyzer or fallback to sklearn
            if FA_AVAILABLE:
                fa = FactorAnalyzer(n_factors=n_factors, rotation=rotation, method=method)
                fa.fit(X_scaled)
                loadings = fa.loadings_
                eigenvalues_full, _ = fa.get_eigenvalues()
                variance_info = fa.get_factor_variance()
                variance_explained = variance_info[1] * 100
            else: # Fallback sklearn
                fa = FactorAnalysis(n_components=n_factors, rotation=rotation if rotation in ['varimax', 'quartimax'] else 'varimax', random_state=42)
                fa.fit(X_scaled)
                loadings = fa.components_.T
                 # Get eigenvalues from the correlation matrix for sklearn
                corr_matrix = np.corrcoef(X_scaled, rowvar=False)
                eigenvalues_full, _ = np.linalg.eigh(corr_matrix)
                eigenvalues_full = sorted(eigenvalues_full, reverse=True)
                ss_loadings_sklearn = np.sum(loadings**2, axis=0)
                variance_explained = (ss_loadings_sklearn / len(items)) * 100

        
        # Communalities
        communalities = np.sum(loadings**2, axis=1)
        
        cumulative_variance = np.cumsum(variance_explained)

        # --- Factor Interpretation ---
        interpretation = {}
        for i in range(n_factors):
            factor_loadings = loadings[:, i]
            high_loadings_indices = np.where(np.abs(factor_loadings) >= 0.4)[0]
            
            interpretation[f'Factor {i+1}'] = {
                'variables': [items[j] for j in high_loadings_indices],
                'loadings': [factor_loadings[j] for j in high_loadings_indices]
            }
        
        plot_image = plot_efa_results(eigenvalues_full[:len(items)], loadings, items)

        def _interpret_kmo(kmo):
            if kmo is None or np.isnan(kmo): return 'Unavailable'
            if kmo >= 0.9: return 'Excellent'
            if kmo >= 0.8: return 'Good'
            if kmo >= 0.7: return 'Acceptable'
            if kmo >= 0.6: return 'Questionable'
            if kmo >= 0.5: return 'Poor'
            return 'Unacceptable'


        response = {
            "adequacy": {
                "kmo": kmo_overall,
                "kmo_interpretation": _interpret_kmo(kmo_overall),
                "bartlett_statistic": bartlett_stat,
                "bartlett_p_value": bartlett_p,
                "bartlett_significant": bool(bartlett_p < 0.05) if not np.isnan(bartlett_p) else False
            },
            "eigenvalues": eigenvalues_full,
            "factor_loadings": loadings,
            "variance_explained": {
                "per_factor": variance_explained,
                "cumulative": cumulative_variance
            },
            "communalities": communalities,
            "interpretation": interpretation,
            "variables": items,
            "n_factors": n_factors,
            "plot": plot_image
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
