
import sys
import json
import numpy as np
import pandas as pd
from sklearn.decomposition import FactorAnalysis
from sklearn.preprocessing import StandardScaler

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
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

def _bartlett_sphericity(X):
    from scipy.stats import chi2
    n, p = X.shape
    corr_matrix = np.corrcoef(X, rowvar=False)
    det_corr = np.linalg.det(corr_matrix)
    if det_corr <= 0: return np.nan, np.nan
    statistic = - (n - 1 - (2 * p + 5) / 6) * np.log(det_corr)
    dof = p * (p - 1) / 2
    p_value = chi2.sf(statistic, dof)
    return statistic, p_value

def _calculate_kmo(X):
    corr_matrix = np.corrcoef(X, rowvar=False)
    inv_corr = np.linalg.inv(corr_matrix)
    A = np.ones_like(inv_corr)
    for i in range(X.shape[1]):
        for j in range(i, X.shape[1]):
            A[i, j] = A[j, i] = - (inv_corr[i, j]) / np.sqrt(inv_corr[i, i] * inv_corr[j, j])
    
    np.fill_diagonal(A, 0)
    np.fill_diagonal(corr_matrix, 0)
    
    kmo_num = np.sum(np.square(corr_matrix))
    kmo_den = kmo_num + np.sum(np.square(A))
    
    return kmo_num / kmo_den if kmo_den else 0

def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        items = payload.get('items')
        n_factors = payload.get('nFactors')

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
        bartlett_stat, bartlett_p = _bartlett_sphericity(X_scaled)

        # --- Factor Analysis ---
        fa = FactorAnalysis(n_components=n_factors, rotation='varimax', random_state=42)
        fa.fit(X_scaled)
        
        loadings = fa.components_.T
        
        # --- Eigenvalues and Variance Explained ---
        # Get eigenvalues from the correlation matrix
        corr_matrix = np.corrcoef(X_scaled, rowvar=False)
        eigenvalues_full, _ = np.linalg.eigh(corr_matrix)
        eigenvalues_full = sorted(eigenvalues_full, reverse=True)

        # Communalities
        communalities = np.sum(loadings**2, axis=1)
        
        # Explained variance by factors (Sum of Squared Loadings)
        ss_loadings = np.sum(loadings**2, axis=0)
        variance_explained = (ss_loadings / len(items)) * 100
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

        response = {
            "adequacy": {
                "kmo": kmo_overall,
                "kmo_interpretation": _interpret_kmo(kmo_overall),
                "bartlett_statistic": bartlett_stat,
                "bartlett_p_value": bartlett_p,
                "bartlett_significant": bool(bartlett_p < 0.05) if not np.isnan(bartlett_p) else False
            },
            "eigenvalues": eigenvalues_full,
            "factor_loadings": loadings.tolist(),
            "variance_explained": {
                "per_factor": variance_explained.tolist(),
                "cumulative": cumulative_variance.tolist()
            },
            "communalities": communalities.tolist(),
            "interpretation": interpretation,
            "variables": items,
            "n_factors": n_factors
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
