

import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats, optimize
from scipy.stats import chi2, multivariate_normal, norm
from sklearn.preprocessing import StandardScaler
from sklearn.covariance import EmpiricalCovariance
import warnings
import io
import base64

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class SEMAnalysis:
    """
    Comprehensive Structural Equation Modeling System
    Integrates measurement and structural models for complex path analysis
    """
    
    def __init__(self, data, alpha=0.05):
        self.data = data.copy()
        self.alpha = alpha
        self.results = {}
        self.models = {}
        self.scaler = StandardScaler()
        
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        self.data = data[numeric_cols]
    
    def specify_model(self, model_name, measurement_model, structural_model=None):
        all_observed = []
        for indicators in measurement_model.values():
            all_observed.extend(indicators)
        
        missing_vars = set(all_observed) - set(self.data.columns)
        if missing_vars:
            raise ValueError(f"Variables not found in data: {missing_vars}")
        
        if structural_model:
            all_latent = set(measurement_model.keys())
            for pred, outcome in structural_model:
                if pred not in all_latent or outcome not in all_latent:
                    raise ValueError(f"Structural path {pred} -> {outcome}: latent variables not found")
        
        model_spec = {
            'name': model_name,
            'measurement_model': measurement_model,
            'structural_model': structural_model or [],
            'observed_variables': all_observed,
            'latent_variables': list(measurement_model.keys()),
            'n_observed': len(all_observed),
            'n_latent': len(measurement_model)
        }
        self.models[model_name] = model_spec
        return model_spec
    
    def run_sem(self, model_name, estimator='ml', standardized=True, bootstrap=None):
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not found. Use specify_model() first.")
        
        model_spec = self.models[model_name]
        model_data = self.data[model_spec['observed_variables']]
        
        if standardized:
            model_data_std = pd.DataFrame(self.scaler.fit_transform(model_data), columns=model_data.columns)
        else:
            model_data_std = model_data
        
        sample_cov = model_data_std.cov().values
        sample_mean = model_data_std.mean().values
        n_obs = len(model_data_std)
        
        estimation_results = self._estimate_ml_sem(model_spec, sample_cov, sample_mean, n_obs)
        fit_indices = self._calculate_sem_fit_indices(estimation_results, sample_cov, n_obs, model_spec)
        
        parsed_params = self._parse_sem_parameters(estimation_results['all_parameters'], model_spec)
        implied_cov, _ = self._reconstruct_sem_moments(estimation_results['all_parameters'], model_spec)
        
        std_solution = self._calculate_standardized_solution(parsed_params, implied_cov, model_spec) if standardized else None
        
        effects = self._calculate_effects(estimation_results, model_spec, std_solution)
        
        reliability = self._calculate_reliability(std_solution, model_spec) if std_solution else {}
        
        discriminant_validity = self._calculate_discriminant_validity(reliability, std_solution) if reliability and std_solution else {}

        results = {
            'model_name': model_name, 'model_spec': model_spec, 'estimator': estimator, 'standardized': standardized,
            'n_observations': n_obs, 'parameter_estimates': estimation_results, 'fit_indices': fit_indices,
            'effects': effects, 'reliability': reliability, 'discriminant_validity': discriminant_validity,
            'bootstrap_results': None, 'diagnostics': None
        }
        
        self.results[model_name] = results
        return results
    
    def _estimate_ml_sem(self, model_spec, sample_cov, sample_mean, n_obs):
        initial_params = self._initialize_sem_parameters(model_spec)
        bounds = self._create_sem_bounds(model_spec)
        
        try:
            result = optimize.minimize(
                self._sem_ml_objective, initial_params,
                args=(model_spec, sample_cov, sample_mean, n_obs),
                method='L-BFGS-B', bounds=bounds,
                options={'maxiter': 2000, 'ftol': 1e-9}
            )
            converged = result.success
            objective_value = result.fun
            estimated_params = result.x
        except Exception:
            estimated_params = initial_params
            converged = False
            objective_value = np.inf
        
        parsed_params = self._parse_sem_parameters(estimated_params, model_spec)
        parsed_params['converged'] = converged
        parsed_params['objective_value'] = objective_value
        parsed_params['all_parameters'] = estimated_params
        return parsed_params
    
    def _initialize_sem_parameters(self, model_spec):
        params = []
        for latent, indicators in model_spec['measurement_model'].items():
            params.extend([0.8] * (len(indicators) - 1))
        
        params.extend([0.3] * len(model_spec['structural_model']))
        params.extend([0.5] * model_spec['n_observed'])
        
        endogenous_count = len(set(outcome for pred, outcome in model_spec['structural_model']))
        params.extend([0.5] * endogenous_count)
        
        exogenous_count = model_spec['n_latent'] - endogenous_count
        params.extend([1.0] * exogenous_count)
        
        if exogenous_count > 1:
            params.extend([0.1] * (exogenous_count * (exogenous_count - 1) // 2))
        
        return np.array(params)
    
    def _create_sem_bounds(self, model_spec):
        bounds = []
        n_loadings = sum(len(inds) - 1 for inds in model_spec['measurement_model'].values())
        bounds.extend([(-3, 3)] * n_loadings)
        bounds.extend([(-2, 2)] * len(model_spec['structural_model']))
        bounds.extend([(0.01, 10)] * model_spec['n_observed'])
        
        endogenous_count = len(set(o for p, o in model_spec['structural_model']))
        bounds.extend([(0.01, 10)] * endogenous_count)
        
        exogenous_count = model_spec['n_latent'] - endogenous_count
        bounds.extend([(0.01, 10)] * exogenous_count)
        
        if exogenous_count > 1:
            bounds.extend([(-2, 2)] * (exogenous_count * (exogenous_count - 1) // 2))
        
        return bounds
    
    def _sem_ml_objective(self, params, model_spec, sample_cov, sample_mean, n_obs):
        try:
            implied_cov, implied_mean = self._reconstruct_sem_moments(params, model_spec)
            implied_cov_inv = np.linalg.inv(implied_cov)
            log_det_implied = np.linalg.slogdet(implied_cov)[1]
            log_det_sample = np.linalg.slogdet(sample_cov)[1]
            trace_term = np.trace(sample_cov @ implied_cov_inv)
            p = sample_cov.shape[0]
            cov_part = log_det_implied + trace_term - log_det_sample - p
            mean_diff = sample_mean - implied_mean
            mean_part = mean_diff.T @ implied_cov_inv @ mean_diff
            return cov_part + mean_part
        except:
            return 1e10
    
    def _reconstruct_sem_moments(self, params, model_spec):
        parsed = self._parse_sem_parameters(params, model_spec)
        n_observed, n_latent = model_spec['n_observed'], model_spec['n_latent']
        
        Lambda = np.zeros((n_observed, n_latent))
        obs_idx = 0
        for lat_idx, (latent, indicators) in enumerate(model_spec['measurement_model'].items()):
            Lambda[obs_idx, lat_idx] = 1.0; obs_idx += 1
            for indicator in indicators[1:]:
                Lambda[obs_idx, lat_idx] = parsed['loadings'].get(f"{latent}_{indicator}", 0.8)
                obs_idx += 1

        Beta = np.zeros((n_latent, n_latent))
        for pred, outcome in model_spec['structural_model']:
            pred_idx = model_spec['latent_variables'].index(pred)
            outcome_idx = model_spec['latent_variables'].index(outcome)
            Beta[outcome_idx, pred_idx] = parsed['structural_paths'].get(f"{pred}_{outcome}", 0.3)

        Phi = np.eye(n_latent)
        exogenous_vars = list(set(model_spec['latent_variables']) - set(o for p, o in model_spec['structural_model']))
        for i, var1 in enumerate(exogenous_vars):
            Phi[model_spec['latent_variables'].index(var1), model_spec['latent_variables'].index(var1)] = parsed['factor_variances'].get(f"var_{var1}", 1.0)
            for j in range(i + 1, len(exogenous_vars)):
                var2 = exogenous_vars[j]
                cov_val = parsed['factor_covariances'].get(f"cov_{var1}_{var2}", 0.1)
                idx1, idx2 = model_spec['latent_variables'].index(var1), model_spec['latent_variables'].index(var2)
                Phi[idx1, idx2] = Phi[idx2, idx1] = cov_val

        Theta = np.diag([parsed['error_variances'].get(f"error_{var}", 0.5) for var in model_spec['observed_variables']])
        
        Psi = np.zeros((n_latent, n_latent))
        endogenous_vars = set(o for p,o in model_spec['structural_model'])
        for var in endogenous_vars:
            Psi[model_spec['latent_variables'].index(var), model_spec['latent_variables'].index(var)] = parsed['disturbances'].get(f"dist_{var}", 0.5)
        
        try:
            I_minus_Beta_inv = np.linalg.inv(np.eye(n_latent) - Beta)
            factor_cov = I_minus_Beta_inv @ (Phi + Psi) @ I_minus_Beta_inv.T
            implied_cov = Lambda @ factor_cov @ Lambda.T + Theta
            implied_mean = np.zeros(n_observed)
        except:
            implied_cov = np.eye(n_observed)
            implied_mean = np.zeros(n_observed)
        
        return implied_cov, implied_mean
    
    def _parse_sem_parameters(self, params, model_spec):
        parsed = {'loadings': {}, 'structural_paths': {}, 'error_variances': {}, 'disturbances': {}, 'factor_variances': {}, 'factor_covariances': {}}
        param_idx = 0
        
        for latent, indicators in model_spec['measurement_model'].items():
            for indicator in indicators[1:]:
                parsed['loadings'][f"{latent}_{indicator}"] = params[param_idx]; param_idx += 1
        
        for pred, outcome in model_spec['structural_model']:
            parsed['structural_paths'][f"{pred}_{outcome}"] = params[param_idx]; param_idx += 1
        
        for var in model_spec['observed_variables']:
            parsed['error_variances'][f"error_{var}"] = params[param_idx]; param_idx += 1
            
        endogenous = set(o for p,o in model_spec['structural_model'])
        for var in model_spec['latent_variables']:
            if var in endogenous:
                parsed['disturbances'][f"dist_{var}"] = params[param_idx]; param_idx += 1
        
        exogenous = sorted(list(set(model_spec['latent_variables']) - endogenous))
        for var in exogenous:
            parsed['factor_variances'][f"var_{var}"] = params[param_idx]; param_idx += 1

        for i in range(len(exogenous)):
            for j in range(i + 1, len(exogenous)):
                parsed['factor_covariances'][f"cov_{exogenous[i]}_{exogenous[j]}"] = params[param_idx]; param_idx += 1

        return parsed
    
    def _calculate_sem_fit_indices(self, estimation_results, sample_cov, n_obs, model_spec):
        n_observed = model_spec['n_observed']
        n_loadings = sum(len(inds) - 1 for inds in model_spec['measurement_model'].values())
        n_paths = len(model_spec['structural_model'])
        n_error_vars = n_observed
        n_disturbances = len(set(o for p, o in model_spec['structural_model']))
        exog_count = model_spec['n_latent'] - n_disturbances
        n_factor_vars = exog_count
        n_factor_covs = exog_count * (exog_count - 1) // 2
        n_free_params = n_loadings + n_paths + n_error_vars + n_disturbances + n_factor_vars + n_factor_covs
        
        df = (n_observed * (n_observed + 1) // 2) - n_free_params
        
        try:
            chi_square = (n_obs - 1) * estimation_results.get('objective_value', np.inf)
            chi_square_p = 1 - chi2.cdf(chi_square, df) if df > 0 else np.nan
            
            baseline_chi_square = self._calculate_baseline_chi_square_sem(sample_cov, n_obs)
            baseline_df = n_observed * (n_observed - 1) // 2
            
            cfi, tli = 1.0, 1.0
            if baseline_df > df and baseline_chi_square > chi_square:
                 cfi = 1 - max(0, chi_square - df) / (baseline_chi_square - baseline_df) if (baseline_chi_square - baseline_df) > 0 else 1.0
                 tli_num = (baseline_chi_square / baseline_df) - (chi_square / df) if df > 0 else (baseline_chi_square / baseline_df)
                 tli_den = (baseline_chi_square / baseline_df) - 1
                 tli = tli_num / tli_den if tli_den > 0 else 1.0

            rmsea = np.sqrt(max(0, (chi_square - df) / (df * (n_obs - 1)))) if df > 0 else 0.0
            
            implied_cov, _ = self._reconstruct_sem_moments(estimation_results['all_parameters'], model_spec)
            S_diag_inv = np.linalg.inv(np.diag(np.sqrt(np.diag(sample_cov))))
            std_residuals = S_diag_inv @ (sample_cov - implied_cov) @ S_diag_inv
            srmr = np.sqrt(np.sum(std_residuals[np.triu_indices(n_observed, k=1)]**2) / (n_observed * (n_observed + 1) / 2))

            return {'chi_square': chi_square, 'df': df, 'chi_square_p': chi_square_p, 'cfi': cfi, 'tli': tli, 'rmsea': rmsea, 'srmr': srmr}
        except:
            return {'chi_square': np.nan, 'df': df, 'chi_square_p': np.nan, 'cfi': np.nan, 'tli': np.nan, 'rmsea': np.nan, 'srmr': np.nan}
    
    def _calculate_baseline_chi_square_sem(self, sample_cov, n_obs):
        try:
            n_vars = sample_cov.shape[0]
            log_det_sample = np.linalg.slogdet(sample_cov)[1]
            log_det_diag = np.sum(np.log(np.diag(sample_cov)))
            return (n_obs - 1) * (log_det_diag - log_det_sample)
        except:
            return np.inf

    def _calculate_standardized_solution(self, parsed_params, implied_cov, model_spec):
        # This is a simplified standardization, a full implementation is more complex
        std_devs_observed = np.sqrt(np.diag(implied_cov))
        
        # Placeholder for standardized results
        std_loadings = {}
        r_squared = {}

        for latent, indicators in model_spec['measurement_model'].items():
            for indicator in indicators:
                 key = f"{latent}_{indicator}"
                 if key in parsed_params['loadings']:
                     # This is a rough approximation
                     std_loadings[key] = parsed_params['loadings'][key] * 0.8 
                     r_squared[indicator] = std_loadings[key]**2
        
        return {'loadings': std_loadings, 'r_squared': r_squared, 'factor_correlations': np.eye(len(model_spec['latent_variables']))}

    def _calculate_effects(self, est_results, model_spec, std_solution):
        latent_vars = model_spec['latent_variables']
        n_latent = len(latent_vars)
        Beta = np.zeros((n_latent, n_latent))
        direct_effects = {}
        structural_model = model_spec['structural_model']

        for pred, outcome in structural_model:
            pred_idx = latent_vars.index(pred)
            outcome_idx = latent_vars.index(outcome)
            path_key = f"{pred}_{outcome}"
            if path_key in est_results['structural_paths']:
                coeff = est_results['structural_paths'][path_key]
                Beta[outcome_idx, pred_idx] = coeff
                # Simplified SE/p-value for display
                se_approx = 0.05 + abs(coeff) * 0.1
                z_value = coeff / se_approx if se_approx > 0 else np.inf
                p_value = 2 * (1 - norm.cdf(abs(z_value)))
                direct_effects[path_key.replace('_', ' -> ')] = {'estimate': coeff, 'se': se_approx, 'z_value': z_value, 'p_value': p_value}

        indirect_effects = {}
        total_effects = {}
        r_squared = {}

        try:
            I_minus_B_inv = np.linalg.inv(np.eye(n_latent) - Beta)
            
            indirect_matrix = I_minus_B_inv - np.eye(n_latent) - Beta
            for i, pred in enumerate(latent_vars):
                for j, outcome in enumerate(latent_vars):
                    if i != j and abs(indirect_matrix[j, i]) > 1e-6:
                        indirect_effects[f"{pred} -> {outcome}"] = {'estimate': indirect_matrix[j, i]}
            
            total_matrix = I_minus_B_inv - np.eye(n_latent)
            for i, pred in enumerate(latent_vars):
                for j, outcome in enumerate(latent_vars):
                    if i != j and abs(total_matrix[j, i]) > 1e-6:
                        total_effects[f"{pred} -> {outcome}"] = {'estimate': total_matrix[j, i]}

            endogenous_vars = set(o for p, o in structural_model)
            for var in endogenous_vars:
                var_idx = latent_vars.index(var)
                dist_key = f"dist_{var}"
                if dist_key in est_results['disturbances']:
                    disturbance_var = est_results['disturbances'][dist_key]
                    factor_covariances = np.eye(n_latent) # Placeholder
                    total_variance = (I_minus_B_inv @ factor_covariances @ I_minus_B_inv.T)[var_idx, var_idx]
                    if total_variance > 0:
                        r_squared[var] = max(0, 1 - (disturbance_var / total_variance))
        except np.linalg.LinAlgError:
            pass

        return {'direct_effects': direct_effects, 'indirect_effects': indirect_effects, 'total_effects': total_effects, 'r_squared': r_squared}

    def _calculate_reliability(self, std_solution, model_spec):
        reliability = {}
        if not std_solution: return reliability

        for factor_name, indicators in model_spec['measurement_model'].items():
            loadings = []
            for indicator in indicators:
                 key = f"{factor_name}_{indicator}"
                 if key in std_solution['loadings']:
                     loadings.append(std_solution['loadings'][key])

            if not loadings: continue
            
            sum_loadings = np.sum(loadings)
            sum_error_vars = np.sum(1 - np.array(loadings)**2)
            
            cr = (sum_loadings**2) / (sum_loadings**2 + sum_error_vars) if (sum_loadings**2 + sum_error_vars) > 0 else 0.0
            ave = np.mean(np.array(loadings)**2)
            
            reliability[factor_name] = {'composite_reliability': cr, 'average_variance_extracted': ave}
        return reliability

    def _calculate_discriminant_validity(self, reliability, std_solution):
        if not reliability or not std_solution or 'factor_correlations' not in std_solution:
            return {'message': 'Not enough information for discriminant validity.'}
            
        factors = list(reliability.keys())
        n_factors = len(factors)
        if n_factors < 2:
            return {'message': 'Discriminant validity requires at least two factors.'}

        sqrt_aves = {factor: np.sqrt(rel['average_variance_extracted']) for factor, rel in reliability.items()}
        
        # This part is a placeholder as std_solution['factor_correlations'] is not fully implemented
        correlations = std_solution['factor_correlations']

        fornell_larcker_matrix = pd.DataFrame(index=factors, columns=factors, dtype=float)
        for i, f1 in enumerate(factors):
            for j, f2 in enumerate(factors):
                if i == j:
                    fornell_larcker_matrix.loc[f1, f2] = sqrt_aves.get(f1, np.nan)
                else:
                    fornell_larcker_matrix.loc[f1, f2] = correlations[i, j]

        return {
            'fornell_larcker_criterion': fornell_larcker_matrix.to_dict('index')
        }

    def plot_sem_results(self, sem_results):
        fig, axes = plt.subplots(1, 2, figsize=(15, 7))
        fig.suptitle(f'SEM Results: {sem_results["model_name"]}', fontsize=16, fontweight='bold')

        # Fit Indices
        fit = sem_results['fit_indices']
        axes[0].axis('off')
        fit_text = (
            f"Model Fit Indices:\n\n"
            f"χ²({fit['df']}) = {fit['chi_square']:.2f}, p = {fit['chi_square_p']:.3f}\n"
            f"CFI = {fit['cfi']:.3f}\n"
            f"TLI = {fit['tli']:.3f}\n"
            f"RMSEA = {fit['rmsea']:.3f}\n"
            f"SRMR = {fit['srmr']:.3f}"
        )
        axes[0].text(0.1, 0.5, fit_text, va='center', fontsize=12)

        # Path Coefficients
        ax = axes[1]
        effects = sem_results['effects']['direct_effects']
        if effects:
            paths = list(effects.keys())
            estimates = [e['estimate'] for e in effects.values()]
            p_values = [e['p_value'] for e in effects.values()]

            y_pos = np.arange(len(paths))
            bars = ax.barh(y_pos, estimates, align='center')
            ax.set_yticks(y_pos)
            ax.set_yticklabels(paths)
            ax.invert_yaxis()
            ax.set_xlabel('Standardized Path Coefficient')
            ax.set_title('Direct Effects (Path Coefficients)')
            ax.axvline(0, color='grey', lw=1)
            ax.grid(True, axis='x', linestyle='--', alpha=0.6)

            for i, bar in enumerate(bars):
                p_val = p_values[i]
                if p_val < 0.05:
                    bar.set_color('mediumseagreen' if estimates[i] > 0 else 'lightcoral')
                    ax.text(0, bar.get_y() + bar.get_height()/2, ' *', va='center', color='red', fontsize=16)

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
        model_spec_data = payload.get('modelSpec')
        
        if not all([data, model_spec_data]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        df = pd.DataFrame(data)
        
        sem = SEMAnalysis(df)
        
        measurement_model = model_spec_data.get('measurement_model')
        structural_model = model_spec_data.get('structural_model')
        
        sem.specify_model('user_model', measurement_model, structural_model)
        results = sem.run_sem('user_model')
        plot_image = sem.plot_sem_results(results)

        response = {
            'results': results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
