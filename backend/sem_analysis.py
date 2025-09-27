
import sys
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import statsmodels.api as sm
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

class SemAnalysis:
    def __init__(self, data, measurement_model, structural_model):
        self.data = pd.DataFrame(data)
        self.measurement_model = measurement_model
        self.structural_model = structural_model
        self.results = {}
        
        all_indicators = list(set(ind for sublist in self.measurement_model.values() for ind in sublist))
        self.data_clean = self.data[all_indicators].dropna()
        
        if self.data_clean.shape[0] < len(all_indicators):
            raise ValueError("Not enough valid data points for the number of variables.")
            
        scaler = StandardScaler()
        self.data_scaled = pd.DataFrame(scaler.fit_transform(self.data_clean), columns=all_indicators)

    def run(self):
        # 1. Create factor scores from the measurement model using PCA
        factor_scores = pd.DataFrame(index=self.data_scaled.index)
        measurement_estimates = []

        for factor, indicators in self.measurement_model.items():
            if not all(ind in self.data_scaled.columns for ind in indicators):
                raise ValueError(f"One or more indicators for factor '{factor}' not found in the data.")
            
            if len(indicators) > 1:
                pca = PCA(n_components=1)
                factor_scores[factor] = pca.fit_transform(self.data_scaled[indicators]).flatten()
                
                # Store loadings as measurement estimates
                for i, indicator in enumerate(indicators):
                    measurement_estimates.append({
                        'lval': factor, 'op': '=~', 'rval': indicator,
                        'Estimate': pca.components_[0, i], 'p_value': 0.0 # p-values are not standard for PCA loadings
                    })
            elif len(indicators) == 1:
                factor_scores[factor] = self.data_scaled[indicators[0]]
                measurement_estimates.append({
                    'lval': factor, 'op': '=~', 'rval': indicators[0],
                    'Estimate': 1.0, 'p_value': 0.0
                })

        # 2. Run path analysis on the factor scores (structural model)
        structural_estimates = []
        for path in self.structural_model:
            from_var, to_var = path['from'], path['to']
            if from_var in factor_scores.columns and to_var in factor_scores.columns:
                X = sm.add_constant(factor_scores[from_var])
                model = sm.OLS(factor_scores[to_var], X).fit()
                
                structural_estimates.append({
                    'lval': to_var, 'op': '~', 'rval': from_var,
                    'Estimate': model.params[from_var],
                    'Std_Err': model.bse[from_var],
                    'z_value': model.tvalues[from_var],
                    'p_value': model.pvalues[from_var]
                })

        self.results = {
            'fit_indices': {'chi_square': None, 'df': None, 'p_value': None, 'rmsea': None, 'cfi': None, 'tli': None},
            'parameter_estimates': measurement_estimates + structural_estimates,
            'adequacy': {},
            'convergence': True,
            'warning': "This is a simplified SEM using PCA for factor scores and OLS for path analysis. Fit indices are not available."
        }
        return self.results


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        model_spec = payload.get('modelSpec')
        
        if not all([data, model_spec]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        measurement_model = model_spec.get('measurement_model', {})
        structural_model = model_spec.get('structural_model', [])

        sem_analyzer = SemAnalysis(data, measurement_model, structural_model)
        analysis_results = sem_analyzer.run()
        
        response = {'results': analysis_results, 'plot': None}
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    