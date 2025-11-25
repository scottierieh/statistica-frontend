import sys
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def relative_weights(X, y):
    """
    Calculate relative importance weights using Johnson's (2000) method.
    This decomposes R² into additive contributions for each predictor.
    """
    # Standardize X
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Correlation matrix of predictors
    R_xx = np.corrcoef(X_scaled, rowvar=False)
    
    # Check for singular matrix
    try:
        # Eigenvalue decomposition
        eigenvalues, eigenvectors = np.linalg.eigh(R_xx)
        
        # Check for near-zero eigenvalues (multicollinearity)
        if np.any(eigenvalues < 1e-10):
            raise ValueError("Perfect or near-perfect multicollinearity detected. Please remove highly correlated predictors.")
        
        # Create orthonormal predictors
        Lambda_sqrt = np.diag(np.sqrt(eigenvalues))
        Lambda_inv_sqrt = np.diag(1.0 / np.sqrt(eigenvalues))
        
        # Transformation matrix
        Z = X_scaled @ eigenvectors @ Lambda_inv_sqrt
        
        # Regress y on orthonormal predictors
        model = LinearRegression(fit_intercept=True)
        model.fit(Z, y)
        
        # Get R² contributions from orthonormal regression
        beta_z = model.coef_
        
        # Transform back to get relative weights
        # This gives the proportion of R² attributable to each original predictor
        raw_weights = (eigenvectors @ Lambda_inv_sqrt @ np.diag(beta_z ** 2) @ Lambda_sqrt @ eigenvectors.T).diagonal()
        
        # Ensure non-negative weights
        raw_weights = np.maximum(raw_weights, 0)
        
        # Calculate total R²
        y_pred = model.predict(Z)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        # Normalize weights to sum to R²
        weight_sum = np.sum(raw_weights)
        if weight_sum > 0:
            relative_weights = raw_weights * (r_squared / weight_sum)
        else:
            relative_weights = raw_weights
        
        return relative_weights, r_squared
        
    except np.linalg.LinAlgError:
        raise ValueError("Matrix computation failed. Check for multicollinearity among predictors.")

def _generate_interpretation(results, dependent_var, r_squared, n_obs, n_predictors):
    """Generate detailed interpretation for Relative Importance results in APA format."""
    
    interpretation_parts = []
    
    # Sort results by relative weight
    sorted_results = sorted(results, key=lambda x: x['relative_weight_pct'], reverse=True)
    top_predictor = sorted_results[0]
    
    # Calculate metrics
    total_r2_pct = r_squared * 100
    avg_importance = total_r2_pct / n_predictors
    importance_spread = sorted_results[0]['relative_weight_pct'] - sorted_results[-1]['relative_weight_pct']
    
    # Effect size interpretation
    if r_squared >= 0.26:
        effect_size = "large"
    elif r_squared >= 0.13:
        effect_size = "medium"
    elif r_squared >= 0.02:
        effect_size = "small"
    else:
        effect_size = "negligible"
    
    # --- Overall Assessment (APA Format) ---
    interpretation_parts.append("**Overall Assessment**")
    
    interpretation_parts.append(
        f"→ A relative importance analysis was conducted to examine the contribution of {n_predictors} predictors "
        f"to the prediction of {dependent_var} (N = {n_obs})."
    )
    
    interpretation_parts.append(
        f"→ The full model accounted for {total_r2_pct:.1f}% of the variance in {dependent_var}, "
        f"R² = {r_squared:.2f}, representing a {effect_size} effect size according to Cohen's (1988) guidelines."
    )
    
    interpretation_parts.append(
        f"→ The most influential predictor was {top_predictor['predictor']}, "
        f"contributing {top_predictor['relative_weight_pct']:.1f}% of the explained variance "
        f"(relative weight = {top_predictor['relative_weight_pct']/100:.3f})."
    )
    
    # Dominance pattern
    if importance_spread > 30:
        interpretation_parts.append(
            f"→ A clear dominance hierarchy emerged among predictors (spread = {importance_spread:.1f}%), "
            f"indicating distinct levels of importance."
        )
    elif importance_spread > 15:
        interpretation_parts.append(
            f"→ Moderate differentiation in predictor importance was observed (spread = {importance_spread:.1f}%)."
        )
    else:
        interpretation_parts.append(
            f"→ Predictors showed relatively similar importance levels (spread = {importance_spread:.1f}%), "
            f"suggesting shared predictive value."
        )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Top predictors breakdown
    interpretation_parts.append("→ Predictor importance ranking (by relative weight):")
    for i, res in enumerate(sorted_results[:5], 1):  # Top 5
        beta_direction = "positive" if res['standardized_beta'] > 0 else "negative"
        interpretation_parts.append(
            f"  • #{i} {res['predictor']}: {res['relative_weight_pct']:.1f}% "
            f"(β = {res['standardized_beta']:.3f}, {beta_direction} effect)"
        )
    
    if len(sorted_results) > 5:
        remaining = len(sorted_results) - 5
        remaining_pct = sum(r['relative_weight_pct'] for r in sorted_results[5:])
        interpretation_parts.append(f"  • ... and {remaining} more predictors contributing {remaining_pct:.1f}% combined")
    
    # Comparison of metrics
    interpretation_parts.append("→ Comparison of standardized beta vs. relative weight:")
    
    # Find cases where ranking differs
    beta_ranking = sorted(results, key=lambda x: abs(x['standardized_beta']), reverse=True)
    rw_ranking = sorted(results, key=lambda x: x['relative_weight_pct'], reverse=True)
    
    discrepancies = []
    for i, (beta_r, rw_r) in enumerate(zip(beta_ranking[:3], rw_ranking[:3])):
        if beta_r['predictor'] != rw_r['predictor']:
            discrepancies.append((beta_r['predictor'], rw_r['predictor'], i+1))
    
    if discrepancies:
        interpretation_parts.append(
            "  • Rankings differ between standardized beta and relative weight, "
            "indicating multicollinearity effects on beta coefficients."
        )
    else:
        interpretation_parts.append(
            "  • Rankings are consistent between standardized beta and relative weight, "
            "suggesting minimal multicollinearity impact."
        )
    
    # Sample size adequacy
    obs_per_predictor = n_obs / n_predictors
    if obs_per_predictor < 10:
        interpretation_parts.append(
            f"→ Warning: Only {obs_per_predictor:.1f} observations per predictor (recommended: 10+). "
            f"Results may be unstable."
        )
    elif obs_per_predictor < 20:
        interpretation_parts.append(
            f"→ Adequate sample size with {obs_per_predictor:.1f} observations per predictor."
        )
    else:
        interpretation_parts.append(
            f"→ Good sample size with {obs_per_predictor:.1f} observations per predictor, supporting stable estimates."
        )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if r_squared < 0.25:
        interpretation_parts.append(
            "→ Low R² suggests important predictors may be missing. Consider adding theoretically relevant variables."
        )
    elif r_squared >= 0.75:
        interpretation_parts.append(
            "→ High R² indicates strong predictive power. Verify model assumptions and check for overfitting."
        )
    else:
        interpretation_parts.append(
            "→ Moderate R² is typical for behavioral/social science data. Model appears reasonable."
        )
    
    # Feature selection guidance
    low_importance = [r for r in sorted_results if r['relative_weight_pct'] < avg_importance * 0.5]
    if low_importance:
        low_names = [r['predictor'] for r in low_importance[:3]]
        interpretation_parts.append(
            f"→ Consider removing low-importance predictors ({', '.join(low_names)}) for a more parsimonious model."
        )
    
    interpretation_parts.append(
        "→ Use relative weights rather than standardized betas when predictors are correlated."
    )
    
    interpretation_parts.append(
        "→ Report confidence intervals via bootstrapping for publication-quality results."
    )
    
    return "\n".join(interpretation_parts)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        dependent_var = payload.get('dependent_var')
        independent_vars = payload.get('independent_vars')

        if not all([data, dependent_var, independent_vars]):
            raise ValueError("Missing data, dependent_var, or independent_vars")

        if len(independent_vars) < 2:
            raise ValueError("Relative importance analysis requires at least 2 independent variables")

        df = pd.DataFrame(data)
        
        # Prepare data
        all_vars = [dependent_var] + independent_vars
        df_clean = df[all_vars].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(df_clean) < len(independent_vars) + 1:
            raise ValueError("Not enough valid data after cleaning")
        
        X = df_clean[independent_vars].values
        y = df_clean[dependent_var].values
        
        # Calculate relative weights
        rel_weights, r_squared = relative_weights(X, y)
        
        # Calculate standardized betas and semi-partial R²
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        y_scaled = (y - np.mean(y)) / np.std(y)
        
        model = LinearRegression(fit_intercept=False)
        model.fit(X_scaled, y_scaled)
        std_betas = model.coef_
        
        # Semi-partial R² (unique contribution)
        semi_partial_r2 = []
        for i in range(len(independent_vars)):
            # Remove predictor i and fit reduced model
            X_reduced = np.delete(X_scaled, i, axis=1)
            model_reduced = LinearRegression(fit_intercept=True)
            model_reduced.fit(X_reduced, y)
            
            y_pred_reduced = model_reduced.predict(X_reduced)
            ss_res_reduced = np.sum((y - y_pred_reduced) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r2_reduced = 1 - (ss_res_reduced / ss_tot) if ss_tot > 0 else 0
            
            # Semi-partial R² is the difference
            sr2 = max(0, r_squared - r2_reduced)
            semi_partial_r2.append(sr2)
        
        # Convert to percentages and create results
        rel_weights_pct = (rel_weights / r_squared * 100) if r_squared > 0 else rel_weights * 100
        
        results = []
        for i, var in enumerate(independent_vars):
            results.append({
                'predictor': var,
                'standardized_beta': std_betas[i],
                'semi_partial_r2': semi_partial_r2[i],
                'relative_weight_pct': rel_weights_pct[i],
                'rank': 0  # Will be set after sorting
            })
        
        # Sort by relative weight and assign ranks
        results.sort(key=lambda x: x['relative_weight_pct'], reverse=True)
        for i, r in enumerate(results):
            r['rank'] = i + 1
        
        # Generate interpretation
        interpretation = _generate_interpretation(
            results=results,
            dependent_var=dependent_var,
            r_squared=r_squared,
            n_obs=len(df_clean),
            n_predictors=len(independent_vars)
        )
        
        response = {
            'results': results,
            'interpretation': interpretation
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    