
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats, optimize, linalg
from scipy.stats import chi2, norm
import warnings
warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class ConfirmatoryFactorAnalysis:
    def __init__(self, data, alpha=0.05):
        self.data = data.copy()
        self.alpha = alpha
        self.models = {}
        self.results = {}
        self.n_obs = len(data)
        
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        self.data = data[numeric_cols]
        
        self.corr_matrix = self.data.corr()
        self.cov_matrix = self.data.cov()
    
    def specify_model(self, model_name, factor_structure, error_covariances=None, 
                     second_order=None, constraints=None):
        all_indicators = []
        for factor, indicators in factor_structure.items():
            all_indicators.extend(indicators)
            for indicator in indicators:
                if indicator not in self.data.columns:
                    raise ValueError(f"Indicator '{indicator}' not found in data")
        
        if len(all_indicators) != len(set(all_indicators)):
            duplicates = [item for item in set(all_indicators) 
                         if all_indicators.count(item) > 1]
            raise ValueError(f"Duplicate indicators found: {duplicates}")
        
        model_spec = {
            'factor_structure': factor_structure,
            'error_covariances': error_covariances or [],
            'second_order': second_order or {},
            'constraints': constraints or {},
            'indicators': all_indicators,
            'factors': list(factor_structure.keys())
        }
        self.models[model_name] = model_spec
        return model_spec
    
    def run_cfa(self, model_name, estimator='ml', standardized=True, bootstrap=None, missing='listwise'):
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not found. Use specify_model() first.")
        
        model_spec = self.models[model_name]
        indicators = model_spec['indicators']
        data_subset = self.data[indicators].copy().dropna()
        
        n_obs_used = len(data_subset)
        if n_obs_used < len(indicators) * 2:
            warnings.warn(f"Small sample size: {n_obs_used} for {len(indicators)} indicators")
        
        sample_cov = data_subset.cov()
        sample_corr = data_subset.corr()
        sample_means = data_subset.mean()
        
        param_setup = self._setup_parameters(model_spec, indicators)
        
        results = self._estimate_ml(sample_cov, param_setup, model_spec)
        
        implied_cov = self._calculate_implied_covariance(results['parameters'], param_setup)
        
        fit_indices = self._calculate_fit_indices(
            sample_cov, implied_cov, results.get('chi_square', 0), 
            results.get('df', 1), n_obs_used, len(indicators)
        )
        
        std_solution = self._calculate_standardized_solution(results['parameters'], implied_cov) if standardized else None
        
        reliability = self._calculate_reliability(std_solution, param_setup, model_spec) if std_solution else {}
        
        cfa_results = {
            'model_name': model_name,
            'model_spec': model_spec,
            'n_observations': n_obs_used,
            'parameters': results['parameters'],
            'standardized_solution': std_solution,
            'fit_indices': fit_indices,
            'reliability': reliability,
            'convergence': results.get('convergence', False),
        }
        
        self.results[model_name] = cfa_results
        return cfa_results

    def _setup_parameters(self, model_spec, indicators):
        n_vars = len(indicators)
        factors = model_spec['factors']
        n_factors = len(factors)
        
        lambda_free = np.zeros((n_vars, n_factors), dtype=bool)
        lambda_start = np.zeros((n_vars, n_factors))
        
        indicator_factor_map = {ind: fac for fac, inds in model_spec['factor_structure'].items() for ind in inds}

        for i, indicator in enumerate(indicators):
            if indicator in indicator_factor_map:
                factor = indicator_factor_map[indicator]
                j = factors.index(factor)
                
                first_indicator = model_spec['factor_structure'][factor][0]
                if indicator == first_indicator:
                    lambda_start[i, j] = 1.0
                    lambda_free[i, j] = False
                else:
                    lambda_start[i, j] = 0.8
                    lambda_free[i, j] = True
        
        phi_free = ~np.eye(n_factors, dtype=bool)
        phi_start = np.eye(n_factors) * 0.3 + np.eye(n_factors)
        np.fill_diagonal(phi_free, False)


        theta_free = np.eye(n_vars, dtype=bool)
        theta_start = np.eye(n_vars) * 0.5
        for var1, var2 in model_spec.get('error_covariances', []):
            if var1 in indicators and var2 in indicators:
                i1, i2 = indicators.index(var1), indicators.index(var2)
                theta_start[i1, i2] = theta_start[i2, i1] = 0.1
                theta_free[i1, i2] = theta_free[i2, i1] = True

        return {
            'indicators': indicators, 'factors': factors,
            'lambda_free': lambda_free, 'lambda_start': lambda_start,
            'phi_free': phi_free, 'phi_start': phi_start,
            'theta_free': theta_free, 'theta_start': theta_start,
            'n_vars': n_vars, 'n_factors': n_factors
        }

    def _estimate_ml(self, sample_cov, param_setup, model_spec):
        def ml_objective(params):
            param_matrices = self._unpack_parameters(params, param_setup)
            implied_cov = self._calculate_implied_covariance(param_matrices)
            try:
                log_det_implied = np.log(linalg.det(implied_cov))
                trace_term = np.trace(sample_cov @ linalg.inv(implied_cov))
                fit_value = log_det_implied + trace_term
                return fit_value if not np.isnan(fit_value) else 1e8
            except (linalg.LinAlgError, ValueError):
                return 1e8
        
        start_params = self._pack_parameters(param_setup)
        result = optimize.minimize(ml_objective, start_params, method='L-BFGS-B', options={'maxiter': 500, 'disp': False})
        
        final_params = self._unpack_parameters(result.x, param_setup)
        df = self._calculate_degrees_of_freedom(param_setup)
        
        return {
            'parameters': final_params,
            'chi_square': (self.n_obs - 1) * result.fun,
            'df': df, 'convergence': result.success,
        }

    def _pack_parameters(self, param_setup):
        return np.concatenate([
            param_setup['lambda_start'][param_setup['lambda_free']],
            param_setup['phi_start'][param_setup['phi_free']],
            param_setup['theta_start'][param_setup['theta_free']]
        ])

    def _unpack_parameters(self, params, param_setup):
        matrices = {'lambda': param_setup['lambda_start'].copy(), 'phi': param_setup['phi_start'].copy(), 'theta': param_setup['theta_start'].copy()}
        param_idx = 0
        for key in ['lambda', 'phi', 'theta']:
            free_mask = param_setup[f'{key}_free']
            n_free = np.sum(free_mask)
            matrices[key][free_mask] = params[param_idx : param_idx + n_free]
            param_idx += n_free
            if key in ['phi', 'theta']:
                matrices[key] = (matrices[key] + matrices[key].T) / 2
        return matrices

    def _calculate_implied_covariance(self, parameters):
        Lambda, Phi, Theta = parameters['lambda'], parameters['phi'], parameters['theta']
        return Lambda @ Phi @ Lambda.T + Theta

    def _calculate_degrees_of_freedom(self, param_setup):
        n_vars = param_setup['n_vars']
        n_sample_stats = n_vars * (n_vars + 1) // 2
        n_free_params = sum(np.sum(param_setup[f'{k}_free']) for k in ['lambda', 'phi', 'theta'])
        return n_sample_stats - n_free_params
    
    def _calculate_fit_indices(self, sample_cov, implied_cov, chi_square, df, n_obs, n_vars):
        S = sample_cov.values
        independence_chi = (n_obs - 1) * (np.sum(np.log(np.diag(S))) - np.log(linalg.det(S)))
        independence_df = n_vars * (n_vars - 1) // 2

        cfi = 1 - max(0, chi_square - df) / max(0, independence_chi - independence_df) if independence_chi > df else 1.0
        tli = ((independence_chi / independence_df) - (chi_square / df)) / ((independence_chi / independence_df) - 1) if df > 0 and independence_df > 0 else 1.0
        
        rmsea = np.sqrt(max(0, (chi_square - df) / (df * (n_obs - 1)))) if df > 0 else 0.0
        
        S_diag_inv = linalg.inv(np.diag(np.sqrt(np.diag(S))))
        std_residuals = S_diag_inv @ (S - implied_cov) @ S_diag_inv
        srmr = np.sqrt(np.sum(std_residuals[np.triu_indices(n_vars, k=1)]**2) / (n_vars * (n_vars + 1) / 2))
        
        return {
            'chi_square': chi_square, 'df': df, 'p_value': 1 - chi2.cdf(chi_square, df) if df > 0 else 1.0,
            'cfi': cfi, 'tli': tli, 'rmsea': rmsea, 'srmr': srmr
        }

    def _calculate_standardized_solution(self, parameters, implied_cov):
        Lambda, Phi = parameters['lambda'], parameters['phi']
        std_devs = np.sqrt(np.diag(implied_cov))
        std_lambda = Lambda * np.sqrt(np.diag(Phi)) / std_devs[:, np.newaxis]
        
        D_inv = np.diag(1 / np.sqrt(np.diag(Phi)))
        std_phi = D_inv @ Phi @ D_inv
        
        return {'loadings': std_lambda, 'factor_correlations': std_phi, 'r_squared': np.sum(std_lambda**2, axis=1)}

    def _calculate_reliability(self, std_solution, param_setup, model_spec):
        reliability = {}
        for factor_idx, (factor_name, indicators) in enumerate(model_spec['factor_structure'].items()):
            ind_indices = [param_setup['indicators'].index(i) for i in indicators]
            loadings = std_solution['loadings'][ind_indices, factor_idx]
            sum_loadings = np.sum(loadings)
            sum_error_vars = np.sum(1 - loadings**2)
            
            cr = (sum_loadings**2) / (sum_loadings**2 + sum_error_vars) if (sum_loadings**2 + sum_error_vars) > 0 else 0.0
            ave = np.mean(loadings**2)
            
            reliability[factor_name] = {'composite_reliability': cr, 'average_variance_extracted': ave}
        return reliability

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        model_spec = payload.get('modelSpec')
        model_name = payload.get('modelName', 'cfa_model')

        if not all([data, model_spec]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        df = pd.DataFrame(data)
        cfa = ConfirmatoryFactorAnalysis(df)
        
        cfa.specify_model(model_name, model_spec)
        results = cfa.run_cfa(model_name)

        print(json.dumps(results, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
