
import sys
import json
import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.preprocessing import StandardScaler
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, np.bool_): return bool(obj)
    return obj

def run_relative_importance_analysis(df: pd.DataFrame, y_col: str, x_cols: list):
    
    # 1. Standardize all variables
    scaler = StandardScaler()
    df_scaled = pd.DataFrame(scaler.fit_transform(df[[y_col] + x_cols]), columns=[y_col] + x_cols)
    
    y = df_scaled[y_col]
    X = df_scaled[x_cols]
    
    # Check for perfect multicollinearity before proceeding
    if X.shape[1] > 1:
        corr_matrix = X.corr().abs()
        upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        if any(upper[col].max() > 0.99 for col in upper.columns):
            raise ValueError("Perfect or near-perfect multicollinearity detected among predictors. Please remove one of the highly correlated variables.")

    X_const = sm.add_constant(X)

    # 2. Fit the full model to get R-squared and standardized betas
    full_model = sm.OLS(y, X_const).fit()
    full_r_squared = full_model.rsquared
    betas = full_model.params.drop('const')

    results = []
    
    # 3. Calculate Semi-Partial R² for each predictor
    semi_partial_r2_list = []
    for predictor in x_cols:
        # Fit a model without the current predictor
        X_reduced = X.drop(columns=[predictor])
        
        # If only one predictor is left, handle it differently
        if X_reduced.shape[1] > 0:
            X_reduced_const = sm.add_constant(X_reduced)
            reduced_model = sm.OLS(y, X_reduced_const).fit()
            reduced_r_squared = reduced_model.rsquared
        else: # Case where there was only one predictor to begin with
            reduced_r_squared = 0

        # Semi-Partial R^2 is the difference in R-squared
        semi_partial_r2 = full_r_squared - reduced_r_squared
        semi_partial_r2_list.append(semi_partial_r2)

    # 4. Calculate Relative Weights
    total_sp_r2 = sum(semi_partial_r2_list)
    
    for i, predictor in enumerate(x_cols):
        relative_weight = (semi_partial_r2_list[i] / total_sp_r2) * 100 if total_sp_r2 > 0 else 0
        
        results.append({
            'predictor': predictor,
            'standardized_beta': betas[predictor],
            'semi_partial_r2': semi_partial_r2_list[i],
            'relative_weight_pct': relative_weight
        })
        
    # 5. Rank the results
    results_df = pd.DataFrame(results).sort_values('relative_weight_pct', ascending=False)
    results_df['rank'] = range(1, len(results_df) + 1)
    
    return results_df.to_dict('records')


def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        dependent_var = payload.get('dependent_var')
        independent_vars = payload.get('independent_vars')

        if not all([not data.empty, dependent_var, independent_vars]):
            raise ValueError("Missing data, dependent_var, or independent_vars")
        
        df_clean = data[[dependent_var] + independent_vars].dropna()

        if len(df_clean) < len(independent_vars) + 2:
            raise ValueError("Not enough data for the number of variables selected.")

        analysis_results = run_relative_importance_analysis(df_clean, dependent_var, independent_vars)
        
        response = {
            'results': analysis_results,
        }
        
        print(json.dumps(response, default=_to_native_type, ensure_ascii=False))

    except Exception as e:
        error_response = {"error": str(e), "error_type": type(e).__name__}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
