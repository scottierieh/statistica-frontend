
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
import warnings
from typing import Dict

warnings.filterwarnings('ignore')

class IVRegression:
    def __init__(self, data: pd.DataFrame, y_col: str, 
                 x_endog_cols: list, x_exog_cols: list, z_cols: list):
        self.data = data.copy()
        self.y_col = y_col
        self.x_endog_cols = x_endog_cols
        self.x_exog_cols = x_exog_cols
        self.z_cols = z_cols
        
        self.y = data[y_col].values.reshape(-1, 1)
        self.X_endog = data[self.x_endog_cols].values
        self.X_exog = data[self.x_exog_cols].values if self.x_exog_cols else np.array([]).reshape(len(data), 0)
        self.Z_inst = data[self.z_cols].values
        
        self.n_obs = len(data)
        self.n_endog = len(self.x_endog_cols)
        self.n_exog = len(self.x_exog_cols)
        self.n_instruments = len(self.z_cols)
        self.k = self.n_endog + self.n_exog + 1

        self.X = np.column_stack([self.X_endog, self.X_exog])
        self.X_const = np.column_stack([np.ones(self.n_obs), self.X])
        self.Z = np.column_stack([self.X_exog, self.Z_inst]) # Instruments include exogenous vars
        self.Z_const = np.column_stack([np.ones(self.n_obs), self.Z])
        
        self.var_names = ['const'] + self.x_endog_cols + self.x_exog_cols

    def _regress(self, y, X):
        try:
            beta = np.linalg.inv(X.T @ X) @ X.T @ y
            y_pred = X @ beta
            residuals = y - y_pred
            
            sse = np.sum(residuals ** 2)
            dof = X.shape[0] - X.shape[1]
            sigma2 = sse / dof if dof > 0 else 0
            
            var_beta = sigma2 * np.linalg.inv(X.T @ X)
            se_beta = np.sqrt(np.diag(var_beta))
            
            t_stats = beta.flatten() / se_beta if np.all(se_beta > 0) else np.full(beta.shape[0], np.nan)
            p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof)) if dof > 0 else np.full(beta.shape[0], np.nan)
            
            return beta.flatten(), se_beta, t_stats, p_values, residuals.flatten()
        except np.linalg.LinAlgError:
            return np.full(X.shape[1], np.nan), np.full(X.shape[1], np.nan), np.full(X.shape[1], np.nan), np.full(X.shape[1], np.nan), np.full(y.shape[0], np.nan)


    def ols(self) -> Dict:
        beta, se, t_stats, p_values, _ = self._regress(self.y, self.X_const)
        
        return {
            'model': 'OLS (Naive)',
            'coefficients': beta.tolist() if isinstance(beta, np.ndarray) else beta,
            'std_errors': se.tolist() if isinstance(se, np.ndarray) else se,
            't_statistics': t_stats.tolist() if isinstance(t_stats, np.ndarray) else t_stats,
            'p_values': p_values.tolist() if isinstance(p_values, np.ndarray) else p_values,
            'variable_names': self.var_names,
        }

    def tsls(self) -> Dict:
        Z = self.Z_const
        X = self.X_const

        try:
            # Stage 1: Project X onto Z
            P_Z = Z @ np.linalg.inv(Z.T @ Z) @ Z.T
            X_hat = P_Z @ X
            
            # Stage 2: Regress y on X_hat
            beta = np.linalg.inv(X_hat.T @ X) @ X_hat.T @ self.y
            
            y_pred = X @ beta
            residuals = self.y - y_pred
            sse = np.sum(residuals ** 2)
            dof = self.n_obs - self.k
            
            if dof <= 0:
                raise ValueError("Insufficient degrees of freedom for 2SLS estimation.")
            
            sigma2 = sse / dof
            
            var_beta = sigma2 * np.linalg.inv(X_hat.T @ X_hat)
            se_beta = np.sqrt(np.diag(var_beta)).reshape(-1, 1)
            
            t_stats = beta / se_beta
            p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof))
            
            return {
                'model': '2SLS',
                'coefficients': beta.flatten().tolist(),
                'std_errors': se_beta.flatten().tolist(),
                't_statistics': t_stats.flatten().tolist(),
                'p_values': p_values.flatten().tolist(),
                'variable_names': self.var_names,
            }
        except (np.linalg.LinAlgError, ValueError) as e:
            return {
                'model': '2SLS',
                'error': str(e),
                'coefficients': [np.nan] * len(self.var_names),
                'std_errors': [np.nan] * len(self.var_names),
                't_statistics': [np.nan] * len(self.var_names),
                'p_values': [np.nan] * len(self.var_names),
                'variable_names': self.var_names,
            }

def _to_native_type(obj):
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, (np.floating, float)): return None if np.isnan(obj) or np.isinf(obj) else float(obj)
    if isinstance(obj, (np.integer, int)): return int(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        y_col = payload.get('y_col')
        x_endog_cols = payload.get('x_endog_cols')
        x_exog_cols = payload.get('x_exog_cols')
        z_cols = payload.get('z_cols')

        iv_analyzer = IVRegression(data, y_col, x_endog_cols, x_exog_cols, z_cols)
        
        ols_results = iv_analyzer.ols()
        tsls_results = iv_analyzer.tsls()
        
        response = {
            "ols": ols_results,
            "tsls": tsls_results,
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()


