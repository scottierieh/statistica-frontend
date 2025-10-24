
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt
import io
import base64
import math
from typing import Dict

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, np.bool_): return bool(obj)
    return obj

class PanelDataRegression:
    def __init__(self, data: pd.DataFrame, entity_col: str, time_col: str, 
                 y_col: str, x_cols: list):
        self.data = data.copy()
        self.entity_col = entity_col
        self.time_col = time_col
        self.y_col = y_col
        self.x_cols = x_cols
        
        self.data = self.data.sort_values([entity_col, time_col]).reset_index(drop=True)
        
        self.entities = self.data[entity_col].unique()
        self.times = self.data[time_col].unique()
        self.n_entities = len(self.entities)
        self.n_times_per_entity = self.data.groupby(entity_col).size()
        self.is_balanced = len(self.n_times_per_entity.unique()) == 1
        self.n_obs = len(self.data)
        self.k = len(x_cols)
        
        self.y = self.data[y_col].values.reshape(-1, 1)
        self.X = self.data[x_cols].values
        
    def pooled_ols(self) -> Dict:
        X_with_const = np.column_stack([np.ones(self.n_obs), self.X])
        
        try:
            beta = np.linalg.inv(X_with_const.T @ X_with_const) @ X_with_const.T @ self.y
        except np.linalg.LinAlgError:
            return {
                'model': 'Pooled OLS',
                'error': "Singular matrix. Check for perfect multicollinearity among predictors."
            }
            
        y_pred = X_with_const @ beta
        residuals = self.y - y_pred
        
        sse = np.sum(residuals ** 2)
        dof = self.n_obs - (self.k + 1)
        sigma2 = sse / dof if dof > 0 else 0
        
        var_beta = sigma2 * np.linalg.inv(X_with_const.T @ X_with_const)
        se_beta = np.sqrt(np.diag(var_beta)).reshape(-1, 1) if sigma2 > 0 else np.full(self.k + 1, np.nan).reshape(-1, 1)
        
        t_stats = beta / se_beta if np.all(se_beta > 0) else np.full(beta.shape, np.nan)
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof)) if dof > 0 else np.full(beta.shape, np.nan)
        
        sst = np.sum((self.y - np.mean(self.y)) ** 2)
        r_squared = 1 - (sse / sst) if sst > 0 else 0
        adj_r_squared = 1 - (1 - r_squared) * (self.n_obs - 1) / dof if dof > 0 else 0
        
        return {
            'model': 'Pooled OLS',
            'coefficients': beta.flatten().tolist(),
            'std_errors': se_beta.flatten().tolist(),
            't_statistics': t_stats.flatten().tolist(),
            'p_values': p_values.flatten().tolist(),
            'r_squared': r_squared,
            'adj_r_squared': adj_r_squared,
            'n_obs': self.n_obs,
            'dof': dof,
            'variable_names': ['const'] + self.x_cols,
        }

    def fixed_effects(self) -> Dict:
        entity_means_y = self.data.groupby(self.entity_col)[self.y_col].transform('mean').values.reshape(-1, 1)
        entity_means_X = self.data.groupby(self.entity_col)[self.x_cols].transform('mean').values
        
        y_demeaned = self.y - entity_means_y
        X_demeaned = self.X - entity_means_X
        
        try:
             beta = np.linalg.inv(X_demeaned.T @ X_demeaned) @ X_demeaned.T @ y_demeaned
        except np.linalg.LinAlgError:
            return {
                'model': 'Fixed Effects',
                'error': "Singular matrix. This often occurs if one or more predictors are time-invariant (e.g., gender, country) and perfectly collinear after demeaning. Please remove time-invariant variables from your model."
            }
            
        residuals = y_demeaned - (X_demeaned @ beta)
        sse = np.sum(residuals ** 2)
        dof = self.n_obs - self.k - self.n_entities
        sigma2 = sse / dof if dof > 0 else 0

        var_beta = sigma2 * np.linalg.inv(X_demeaned.T @ X_demeaned)
        se_beta = np.sqrt(np.diag(var_beta)).reshape(-1, 1) if sigma2 > 0 else np.full(self.k, np.nan).reshape(-1, 1)

        t_stats = beta / se_beta if np.all(se_beta > 0) else np.full(beta.shape, np.nan)
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof)) if dof > 0 else np.full(beta.shape, np.nan)

        sst_within = np.sum(y_demeaned ** 2)
        r_squared_within = 1 - (sse / sst_within) if sst_within > 0 else 0
        
        return {
            'model': 'Fixed Effects',
            'coefficients': beta.flatten().tolist(),
            'std_errors': se_beta.flatten().tolist(),
            't_statistics': t_stats.flatten().tolist(),
            'p_values': p_values.flatten().tolist(),
            'r_squared_within': r_squared_within,
            'n_obs': self.n_obs,
            'n_entities': self.n_entities,
            'dof': dof,
            'variable_names': self.x_cols,
        }

    def random_effects(self) -> Dict:
        if not self.is_balanced:
            return {
                'model': 'Random Effects',
                'error': 'Random Effects model currently supports balanced panels only.'
            }

        fe_results = self.fixed_effects()
        if 'error' in fe_results:
             return {
                'model': 'Random Effects',
                'error': f'Cannot compute RE because FE failed: {fe_results["error"]}'
            }

        
        entity_means_y = self.data.groupby(self.entity_col)[self.y_col].mean().values.reshape(-1, 1)
        entity_means_X = self.data.groupby(self.entity_col)[self.x_cols].mean().values
        
        X_between_const = np.column_stack([np.ones(self.n_entities), entity_means_X])
        beta_be = np.linalg.inv(X_between_const.T @ X_between_const) @ X_between_const.T @ entity_means_y
        residuals_be = entity_means_y - X_between_const @ beta_be

        y_demeaned = self.y - self.data.groupby(self.entity_col)[self.y_col].transform('mean').values.reshape(-1,1)
        X_demeaned = self.X - self.data.groupby(self.entity_col)[self.x_cols].transform('mean').values
        beta_fe = np.array(fe_results['coefficients']).reshape(-1, 1)
        residuals_fe = y_demeaned - X_demeaned @ beta_fe
        dof_fe = self.n_obs - self.n_entities - self.k
        dof_be = self.n_entities - self.k - 1
        
        if dof_fe <= 0 or dof_be <= 0:
            return {
                'model': 'Random Effects',
                'error': 'Insufficient degrees of freedom for Random Effects estimation.'
            }
        
        sigma2_e = np.sum(residuals_fe**2) / dof_fe
        sigma2_between = np.sum(residuals_be**2) / dof_be
        sigma2_u = max(0, sigma2_between - (sigma2_e / self.n_times_per_entity.iloc[0]))
        
        # theta 계산 시 0으로 나누기 방지
        denominator = sigma2_e + self.n_times_per_entity.iloc[0] * sigma2_u
        if denominator <= 0 or sigma2_e <= 0:
            theta = 0.0  # fallback to pooled OLS
        else:
            theta = 1 - np.sqrt(sigma2_e / denominator)
        
        y_transformed = self.y - theta * self.data.groupby(self.entity_col)[self.y_col].transform('mean').values.reshape(-1, 1)
        X_transformed = self.X - theta * self.data.groupby(self.entity_col)[self.x_cols].transform('mean').values
        X_transformed_const = np.column_stack([np.ones(self.n_obs) * (1 - theta), X_transformed])
        
        beta = np.linalg.inv(X_transformed_const.T @ X_transformed_const) @ X_transformed_const.T @ y_transformed
        
        residuals = self.y - np.column_stack([np.ones(self.n_obs), self.X]) @ beta
        sse = np.sum(residuals**2)
        dof = self.n_obs - self.k - 1
        
        var_beta = (sse / dof) * np.linalg.inv(X_transformed_const.T @ X_transformed_const)
        se_beta = np.sqrt(np.diag(var_beta)).reshape(-1, 1)
        t_stats = beta / se_beta
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof))

        return {
            'model': 'Random Effects',
            'coefficients': beta.flatten().tolist(),
            'std_errors': se_beta.flatten().tolist(),
            't_statistics': t_stats.flatten().tolist(),
            'p_values': p_values.flatten().tolist(),
            'theta': theta,
            'variable_names': ['const'] + self.x_cols,
        }

    def hausman_test(self, fe_results, re_results):
        if not self.is_balanced or 'error' in re_results:
             return { 'test': 'Hausman Test', 'statistic': None, 'p_value': None, 'dof': self.k, 'interpretation': 'Test not performed (unbalanced panel or RE model failed).' }
        if 'error' in fe_results:
            return { 'test': 'Hausman Test', 'statistic': None, 'p_value': None, 'dof': self.k, 'interpretation': 'Test not performed (FE model failed).' }

        beta_fe = np.array(fe_results['coefficients'])
        beta_re = np.array(re_results['coefficients'][1:])
        diff = beta_fe - beta_re

        # Recalculate var_beta for FE and RE with consistent assumptions for Hausman
        X_demeaned = self.X - self.data.groupby(self.entity_col)[self.x_cols].transform('mean').values
        y_demeaned_h = self.y - self.data.groupby(self.entity_col)[self.y_col].transform('mean').values.reshape(-1,1)
        residuals_fe_h = y_demeaned_h - X_demeaned @ beta_fe.reshape(-1, 1)
        
        dof_h = self.n_obs - self.n_entities - self.k
        if dof_h <= 0:
            return { 'test': 'Hausman Test', 'statistic': None, 'p_value': None, 'dof': self.k, 'interpretation': 'Test failed (insufficient degrees of freedom).' }
        
        sigma2_e_fe = np.sum(residuals_fe_h**2) / dof_h
        var_beta_fe = sigma2_e_fe * np.linalg.inv(X_demeaned.T @ X_demeaned)

        theta = re_results['theta']
        X_transformed = self.X - theta * self.data.groupby(self.entity_col)[self.x_cols].transform('mean').values
        X_transformed_const = np.column_stack([np.ones(self.n_obs) * (1-theta), X_transformed])
        var_beta_re = sigma2_e_fe * np.linalg.inv(X_transformed_const.T @ X_transformed_const)[1:, 1:] # Exclude intercept

        var_diff = var_beta_fe - var_beta_re
        
        try:
            H = diff.T @ np.linalg.inv(var_diff) @ diff
            p_value = 1 - stats.chi2.cdf(H, self.k)
        except np.linalg.LinAlgError:
            H = np.nan
            p_value = np.nan

        return {
            'test': 'Hausman Test', 'statistic': H, 'p_value': p_value, 'dof': self.k,
            'interpretation': 'Fixed Effects preferred' if p_value < 0.05 else 'Random Effects preferred' if not np.isnan(p_value) else 'Test failed'
        }
        
def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        entity_col = payload.get('entityCol')
        time_col = payload.get('timeCol')
        y_col = payload.get('yCol')
        x_cols = payload.get('xCols')

        if not all([data, entity_col, time_col, y_col, x_cols]):
            raise ValueError("Missing required parameters.")
            
        df = pd.DataFrame(data)
        
        analyzer = PanelDataRegression(df, entity_col, time_col, y_col, x_cols)
        
        pooled_ols = analyzer.pooled_ols()
        fixed_effects = analyzer.fixed_effects()
        random_effects = analyzer.random_effects()
        hausman_test = analyzer.hausman_test(fixed_effects, random_effects)
        
        response = {
            'pooled_ols': pooled_ols,
            'fixed_effects': fixed_effects,
            'random_effects': random_effects,
            'hausman_test': hausman_test
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
