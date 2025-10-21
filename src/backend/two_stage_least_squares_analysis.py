
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, np.bool_): return bool(obj)
    return obj

class TwoSLS:
    def __init__(self):
        self.beta_2sls = None
        self.beta_ols = None
        self.se_2sls = None
        self.t_stats = None
        self.p_values = None
        self.fitted_values = None
        self.residuals = None
        self.X_hat = None
        self.stage1_results = None
        
    def fit(self, y, X, Z, add_constant=True):
        y = np.asarray(y).flatten()
        X_orig = np.asarray(X)
        Z_orig = np.asarray(Z)
        
        if X_orig.ndim == 1: X_orig = X_orig.reshape(-1, 1)
        if Z_orig.ndim == 1: Z_orig = Z_orig.reshape(-1, 1)
            
        n = len(y)
        X, Z = X_orig, Z_orig
        if add_constant:
            X = np.column_stack([np.ones(n), X])
            Z = np.column_stack([np.ones(n), Z])
        
        if Z.shape[1] < X.shape[1]:
            raise ValueError(f"Under-identified: Need at least {X.shape[1]} instruments, got {Z.shape[1]}")
        
        try:
            ZtZ_inv = np.linalg.inv(Z.T @ Z)
        except np.linalg.LinAlgError:
            raise ValueError("Instrument matrix (Z'Z) is singular. Check for perfect multicollinearity among instruments.")

        P_Z = Z @ ZtZ_inv @ Z.T
        self.X_hat = P_Z @ X
        
        self.stage1_results = {'first_stage_R2': []}
        for j in range(X.shape[1]):
            if j == 0 and add_constant: continue
            ss_tot = np.sum((X[:, j] - np.mean(X[:, j]))**2)
            ss_res = np.sum((X[:, j] - self.X_hat[:, j])**2)
            r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            self.stage1_results['first_stage_R2'].append(r2)

        try:
            XhatX_inv = np.linalg.inv(self.X_hat.T @ self.X_hat)
        except np.linalg.LinAlgError:
            raise ValueError("X_hat'X_hat is singular. This can happen if instruments are not relevant.")
            
        self.beta_2sls = XhatX_inv @ self.X_hat.T @ y
        
        # Use original X for residuals and fitted values, not X_hat
        self.fitted_values = X @ self.beta_2sls
        self.residuals = y - self.fitted_values
        
        sigma2 = np.sum(self.residuals**2) / (n - X.shape[1])
        var_beta = sigma2 * XhatX_inv
        self.se_2sls = np.sqrt(np.diag(var_beta))
        
        self.t_stats = self.beta_2sls / self.se_2sls
        self.p_values = 2 * (1 - stats.t.cdf(np.abs(self.t_stats), n - X.shape[1]))
        
        XtX_inv = np.linalg.inv(X.T @ X)
        self.beta_ols = XtX_inv @ X.T @ y
        
        return self

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        y_col = payload.get('y_col')
        x_endog_cols = payload.get('x_endog_cols', [])
        x_exog_cols = payload.get('x_exog_cols', [])
        z_cols = payload.get('z_cols', [])

        if not all([y_col, x_endog_cols, z_cols]):
            raise ValueError("Missing dependent, endogenous, or instrumental variables.")
            
        df = data[[y_col] + x_endog_cols + x_exog_cols + z_cols].dropna()

        y = df[y_col].values
        X = df[x_endog_cols + x_exog_cols].values
        # Instruments include exogenous variables from main equation
        Z = df[x_exog_cols + z_cols].values

        model = TwoSLS()
        model.fit(y, X, Z)
        
        var_names = ['const'] + x_endog_cols + x_exog_cols

        results = {
            'ols_results': {
                'coefficients': model.beta_ols.tolist(),
                'variable_names': var_names,
            },
            'tsls_results': {
                'coefficients': model.beta_2sls.tolist(),
                'std_errors': model.se_2sls.tolist(),
                't_statistics': model.t_stats.tolist(),
                'p_values': model.p_values.tolist(),
                'variable_names': var_names,
            }
        }
        
        print(json.dumps(results, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
