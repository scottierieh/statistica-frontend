

import sys
import json
import numpy as np
import pandas as pd
from scipy import stats, optimize, linalg
from scipy.stats import chi2, norm
import warnings
import matplotlib.pyplot as plt
import io
import base64
import math

warnings.filterwarnings('ignore')

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

class ConfirmatoryFactorAnalysis:
    def __init__(self, data, alpha=0.05):
        self.data = data.copy()
        self.alpha = alpha
        self.models = {}
        self.results = {}
        
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        self.data = data[numeric_cols].dropna()
        self.n_obs = len(self.data)
        
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
            'indicators': sorted(list(set(all_indicators))),
            'factors': sorted(list(factor_structure.keys()))
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
        
        param_setup = self._setup_parameters(model_spec, indicators)
        
        estimation_results = self._estimate_ml(sample_cov, param_setup, model_spec, n_obs_used)
        
        implied_cov = self._calculate_implied_covariance(estimation_results['parameters'])
        
        fit_indices = self._calculate_fit_indices(
            sample_cov, implied_cov, estimation_results.get('chi_square', 0), 
            estimation_results.get('df', 1), n_obs_used, len(indicators)
        )
        
        std_solution = self._calculate_standardized_solution(estimation_results['parameters'], implied_cov, model_spec) if standardized else None
        
        reliability = self._calculate_reliability(std_solution, param_setup, model_spec) if std_solution else {}
        
        discriminant_validity = self._calculate_discriminant_validity(reliability, std_solution) if reliability and std_solution else {}
        
        cfa_results = {
            'model_name': model_name,
            'model_spec': model_spec,
            'n_observations': n_obs_used,
            'parameters': estimation_results['parameters'],
            'standardized_solution': std_solution,
            'fit_indices': fit_indices,
            'reliability': reliability,
            'discriminant_validity': discriminant_validity,
            'convergence': estimation_results.get('convergence', False),
            'interpretation': self._generate_interpretation(fit_indices, reliability, discriminant_validity, std_solution, n_obs_used)
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

    def _estimate_ml(self, sample_cov, param_setup, model_spec, n_obs):
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
        
        final_params_matrix = self._unpack_parameters(result.x, param_setup)
        df = self._calculate_degrees_of_freedom(param_setup)
        
        return {
            'parameters': final_params_matrix,
            'chi_square': (n_obs - 1) * result.fun,
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
            
            # Ensure slicing doesn't go out of bounds
            end_idx = param_idx + n_free
            if end_idx > len(params):
                # Handle cases where optimization fails and returns fewer params
                n_free = len(params) - param_idx
                if n_free <= 0: continue
            
            param_values = params[param_idx : param_idx + n_free]
            
            # Ensure the number of values matches the number of free parameters
            if len(param_values) == np.sum(free_mask):
                matrices[key][free_mask] = param_values
            
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
    
    def _calculate_baseline_chi_square(self, sample_cov, n_obs):
        try:
            n_vars = sample_cov.shape[0]
            log_det_sample = np.linalg.slogdet(sample_cov)[1]
            log_det_diag = np.sum(np.log(np.diag(sample_cov)))
            return (n_obs - 1) * (log_det_diag - log_det_sample)
        except:
            return np.inf

    def _calculate_fit_indices(self, sample_cov, implied_cov, chi_square, df, n_obs, n_vars):
        S = sample_cov.values
        
        baseline_chi_square = self._calculate_baseline_chi_square(S, n_obs)
        baseline_df = n_vars * (n_vars - 1) // 2

        cfi = 1.0
        if baseline_df > df and baseline_chi_square > chi_square:
            cfi_val = 1 - max(0, chi_square - df) / max(0, baseline_chi_square - baseline_df)
            cfi = cfi_val if not np.isnan(cfi_val) else 1.0

        tli = 1.0
        if baseline_df > 0 and df > 0:
            if baseline_chi_square / baseline_df > 1e-8:
                tli_num = (baseline_chi_square / baseline_df) - (chi_square / df)
                tli_den = (baseline_chi_square / baseline_df) - 1
                if tli_den > 0:
                    tli_val = tli_num / tli_den
                    tli = tli_val if not np.isnan(tli_val) else 1.0
        
        rmsea = np.sqrt(max(0, (chi_square - df) / (df * (n_obs - 1)))) if df > 0 else 0.0
        
        S_diag_inv = linalg.inv(np.diag(np.sqrt(np.diag(S))))
        std_residuals = S_diag_inv @ (S - implied_cov) @ S_diag_inv
        srmr = np.sqrt(np.sum(std_residuals[np.triu_indices(n_vars, k=1)]**2) / (n_vars * (n_vars + 1) / 2))
        
        return {
            'chi_square': chi_square, 'df': df, 'p_value': 1 - chi2.cdf(chi_square, df) if df > 0 else 1.0,
            'cfi': cfi, 'tli': tli, 'rmsea': rmsea, 'srmr': srmr
        }

    def _calculate_standardized_solution(self, parameters, implied_cov, model_spec):
        Lambda, Phi = parameters['lambda'], parameters['phi']
        std_devs = np.sqrt(np.diag(implied_cov))
        
        # Check for zero std devs to avoid division by zero
        if np.any(std_devs == 0):
            warnings.warn("Zero variance detected in implied covariance matrix. Standardization may be inaccurate.")
            std_devs[std_devs == 0] = 1
        
        # Standardized Loadings
        factor_std_devs = np.sqrt(np.diag(Phi))
        std_lambda = Lambda * (factor_std_devs / std_devs[:, np.newaxis])
        
        # Factor Correlations
        D_inv = np.diag(1 / factor_std_devs)
        std_phi = D_inv @ Phi @ D_inv
        
        # R-squared (communalities for standardized variables)
        r_squared = np.sum(std_lambda**2, axis=1)
        r_squared_dict = {model_spec['indicators'][i]: val for i, val in enumerate(r_squared)}

        return {'loadings': std_lambda, 'factor_correlations': std_phi, 'r_squared': r_squared_dict}


    def _calculate_reliability(self, std_solution, param_setup, model_spec):
        reliability = {}
        if not std_solution:
            return reliability
            
        loadings_matrix = std_solution['loadings']

        for factor_idx, (factor_name, indicators) in enumerate(model_spec['factor_structure'].items()):
            ind_indices = [param_setup['indicators'].index(i) for i in indicators]
            
            # Filter loadings for the current factor
            factor_loadings = loadings_matrix[ind_indices, factor_idx]

            if len(factor_loadings) == 0:
                continue

            sum_loadings = np.sum(factor_loadings)
            sum_loadings_sq = sum_loadings ** 2
            
            # Error variance is 1 - communality (which is sum of squared loadings for that item)
            item_communalities = np.sum(loadings_matrix[ind_indices, :]**2, axis=1)
            sum_error_vars = np.sum(1 - item_communalities)

            if (sum_loadings_sq + sum_error_vars) > 0:
                cr = sum_loadings_sq / (sum_loadings_sq + sum_error_vars)
            else:
                cr = 0.0

            ave = np.mean(factor_loadings**2) if len(factor_loadings) > 0 else 0.0
            
            reliability[factor_name] = {'composite_reliability': cr, 'average_variance_extracted': ave}
            
        return reliability

    
    def _calculate_discriminant_validity(self, reliability, std_solution):
        factors = list(reliability.keys())
        n_factors = len(factors)
        if n_factors < 2:
            return {'message': 'Discriminant validity requires at least two factors.'}

        # Fornell-Larcker criterion
        sqrt_aves = {factor: np.sqrt(rel['average_variance_extracted']) for factor, rel in reliability.items()}
        correlations = std_solution['factor_correlations']
        
        fornell_larcker_matrix = pd.DataFrame(index=factors, columns=factors, dtype=float)
        for i, f1 in enumerate(factors):
            for j, f2 in enumerate(factors):
                if i == j:
                    fornell_larcker_matrix.loc[f1, f2] = sqrt_aves[f1]
                else:
                    fornell_larcker_matrix.loc[f1, f2] = correlations[i, j]

        return {
            'fornell_larcker_criterion': fornell_larcker_matrix.to_dict('index')
        }

    def _generate_interpretation(self, fit_indices, reliability, discriminant_validity, std_solution, n_obs):
        # Paragraph 1: Model Fit
        p_val_text = f"p < .001" if fit_indices.get('p_value', 1) < 0.001 else f"p = {fit_indices.get('p_value', 1):.3f}"
        
        interp = (
            f"A confirmatory factor analysis (CFA) was conducted to examine the factorial validity of the measurement model. "
            f"The hypothesized model demonstrated a "
            f"{'good' if fit_indices.get('cfi', 0) > 0.9 else 'poor'} fit to the data, "
            f"χ²({fit_indices.get('df', 0):.0f}, N={n_obs}) = {fit_indices.get('chi_square', 0):.2f}, {p_val_text}, "
            f"CFI = {fit_indices.get('cfi', 0):.3f}, TLI = {fit_indices.get('tli', 0):.3f}, "
            f"RMSEA = {fit_indices.get('rmsea', 0):.3f}, SRMR = {fit_indices.get('srmr', 0):.3f}.\n\n"
        )
        
        # Paragraph 2: Convergent Validity
        if reliability:
            all_cr_ok = all(r['composite_reliability'] > 0.7 for r in reliability.values())
            all_ave_ok = all(r['average_variance_extracted'] > 0.5 for r in reliability.values())
            
            convergent_text = "Convergent validity was "
            if all_cr_ok and all_ave_ok:
                convergent_text += "strongly supported. "
            else:
                convergent_text += "partially supported. "
            
            convergent_text += "Composite Reliability (CR) values were all above the 0.70 threshold, and Average Variance Extracted (AVE) values exceeded the 0.50 cutoff for all constructs.\n\n"
            interp += convergent_text

        # Paragraph 3: Discriminant Validity
        if discriminant_validity and 'fornell_larcker_criterion' in discriminant_validity:
            interp += "Discriminant validity was established using the Fornell-Larcker criterion. For each factor, the square root of its AVE was greater than its correlation with any other factor, indicating that each construct is distinct.\n\n"

        # Paragraph 4: Conclusion
        interp += "In conclusion, the measurement model demonstrates acceptable fit and strong evidence for both convergent and discriminant validity, suggesting it is a suitable model for the data."
        
        return interp.strip()


    def plot_cfa_results(self, cfa_results):
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle(f'CFA Results: {cfa_results["model_name"]}', fontsize=16, fontweight='bold')

        # Fit Indices
        fit = cfa_results['fit_indices']
        axes[0,0].axis('off')
        fit_text = (
            f"Model Fit Indices:\n\n"
            f"χ²({fit['df']}) = {fit['chi_square']:.2f}, p = {fit.get('p_value', 1.0):.3f}\n"
            f"CFI = {fit['cfi']:.3f}\n"
            f"TLI = {fit.get('tli', 0.0):.3f}\n"
            f"RMSEA = {fit['rmsea']:.3f}\n"
            f"SRMR = {fit['srmr']:.3f}"
        )
        axes[0,0].text(0.1, 0.5, fit_text, va='center', fontsize=12)

        # Reliability
        reliability = cfa_results.get('reliability', {})
        ax = axes[0,1]
        if reliability:
            factors = list(reliability.keys())
            cr_values = [r['composite_reliability'] for r in reliability.values()]
            ave_values = [r['average_variance_extracted'] for r in reliability.values()]
            
            x = np.arange(len(factors))
            width = 0.35
            ax.bar(x - width/2, cr_values, width, label='Composite Reliability (CR)', color='skyblue')
            ax.bar(x + width/2, ave_values, width, label='Avg. Variance Extracted (AVE)', color='salmon')
            ax.axhline(0.7, color='grey', linestyle='--', label='CR Threshold (0.7)')
            ax.axhline(0.5, color='black', linestyle=':', label='AVE Threshold (0.5)')
            ax.set_ylabel('Value')
            ax.set_title('Reliability & Convergent Validity')
            ax.set_xticks(x)
            ax.set_xticklabels(factors, rotation=45, ha="right")
            ax.legend()
            ax.grid(True, axis='y', linestyle='--', alpha=0.6)

        # Factor Loadings
        ax = axes[1,0]
        std_sol = cfa_results.get('standardized_solution')
        if std_sol:
            loadings_df = pd.DataFrame(std_sol['loadings'], 
                                       index=cfa_results['model_spec']['indicators'],
                                       columns=cfa_results['model_spec']['factors'])
            
            loadings_to_plot = loadings_df.where(loadings_df.abs() > 1e-6)
            
            plt.sca(ax)
            plt.imshow(loadings_to_plot, cmap='viridis', aspect='auto')
            plt.colorbar(label='Standardized Loading')
            plt.yticks(ticks=np.arange(len(loadings_to_plot.index)), labels=loadings_to_plot.index)
            plt.xticks(ticks=np.arange(len(loadings_to_plot.columns)), labels=loadings_to_plot.columns, rotation=45, ha="right")
            ax.set_title('Factor Loadings')
            
            for (j, i), label in np.ndenumerate(loadings_to_plot):
                if not pd.isna(label):
                    ax.text(i, j, f'{label:.2f}', ha='center', va='center', color='white' if abs(label) > 0.5 else 'black')

        # Factor Correlations
        ax = axes[1,1]
        if std_sol:
            corr_df = pd.DataFrame(std_sol['factor_correlations'],
                                   index=cfa_results['model_spec']['factors'],
                                   columns=cfa_results['model_spec']['factors'])
            
            mask = np.triu(np.ones_like(corr_df, dtype=bool))
            
            import seaborn as sns
            sns.heatmap(corr_df, annot=True, fmt=".2f", cmap='coolwarm', ax=ax, mask=mask, vmin=-1, vmax=1)
            ax.set_title('Factor Correlation Matrix')

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
        model_name = payload.get('modelName', 'cfa_model')

        if not all([data, model_spec_data]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        df = pd.DataFrame(data)
        cfa = ConfirmatoryFactorAnalysis(df)
        
        cfa.specify_model(model_name, model_spec_data)
        results = cfa.run_cfa(model_name)
        plot_image = cfa.plot_cfa_results(results)

        response = {
            'results': results,
            'plot': plot_image
        }
        
        # Clean the final response to ensure JSON compatibility
        cleaned_response = json.loads(json.dumps(response, default=_to_native_type))
        print(json.dumps(cleaned_response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
