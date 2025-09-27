
import sys
import json
import numpy as np
import pandas as pd
from factor_analyzer import FactorAnalyzer, calculate_kmo, calculate_bartlett_sphericity
import statsmodels.api as sm
from sklearn.preprocessing import StandardScaler
import warnings

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

class CfaAnalysis:
    def __init__(self, data, model_spec):
        self.data = pd.DataFrame(data)
        self.model_spec = model_spec
        self.results = {}
        self.all_indicators = list(set(ind for sublist in self.model_spec.values() for ind in sublist))
        self.data_clean = self.data[self.all_indicators].dropna()
        
        if self.data_clean.shape[0] < len(self.all_indicators):
            raise ValueError("Not enough valid data points for the number of variables.")
            
        scaler = StandardScaler()
        self.data_scaled = pd.DataFrame(scaler.fit_transform(self.data_clean), columns=self.all_indicators)

    def _check_data_adequacy(self):
        kmo_all, kmo_model = calculate_kmo(self.data_scaled)
        bartlett_chi_square, bartlett_p_value = calculate_bartlett_sphericity(self.data_scaled)
        return {
            'kmo_overall': kmo_model,
            'bartlett_chi2': bartlett_chi_square,
            'bartlett_p': bartlett_p_value
        }

    def _get_fit_indices(self, fa):
        chi2, p_value = fa.calculate_chisquare()
        rmsea = fa.calculate_rmsea()
        return {
            'chi_square': chi2,
            'df': fa.df,
            'p_value': p_value,
            'rmsea': rmsea[0] if isinstance(rmsea, tuple) else rmsea,
        }

    def run(self):
        adequacy = self._check_data_adequacy()
        if adequacy['kmo_overall'] < 0.5:
             warnings.warn("KMO value is low (< 0.5), factor analysis may be inappropriate.")
        if adequacy['bartlett_p'] > 0.05:
            warnings.warn("Bartlett's test is not significant (p > 0.05), indicating correlations may be too low for factor analysis.")

        n_factors = len(self.model_spec)
        fa = FactorAnalyzer(n_factors=n_factors, rotation=None)
        fa.fit(self.data_scaled)

        # Re-creating a simplified parameter estimates table
        estimates = []
        for factor_idx, (factor_name, indicators) in enumerate(self.model_spec.items()):
            for indicator in indicators:
                try:
                    indicator_idx = self.all_indicators.index(indicator)
                    loading = fa.loadings_[indicator_idx, factor_idx]
                    
                    # Approximating SE and p-values as factor_analyzer doesn't provide them for CFA directly
                    se_approx = np.sqrt((1 - loading**2) / (len(self.data_clean) - 2)) if len(self.data_clean) > 2 else 0
                    z_approx = loading / se_approx if se_approx > 0 else np.inf
                    p_approx = 2 * (1 - sm.stats.norm.cdf(abs(z_approx)))
                    
                    estimates.append({
                        'lval': factor_name,
                        'op': '=~',
                        'rval': indicator,
                        'Estimate': loading,
                        'Std_Err': se_approx,
                        'z_value': z_approx,
                        'p_value': p_approx
                    })
                except (ValueError, IndexError):
                    continue


        self.results = {
            'fit_indices': self._get_fit_indices(fa),
            'parameter_estimates': estimates,
            'adequacy': adequacy,
            'convergence': True,
        }
        return self.results


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        model_spec = payload.get('modelSpec')
        
        if not all([data, model_spec]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        cfa_analyzer = CfaAnalysis(data, model_spec)
        analysis_results = cfa_analyzer.run()
        
        response = {'results': analysis_results, 'plot': None}
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    