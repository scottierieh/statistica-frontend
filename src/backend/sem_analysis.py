
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
import semopy
import os

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
    
    def specify_model(self, model_name, measurement_model_dict, structural_model_list=None):
        
        desc = ""
        for factor, indicators in measurement_model_dict.items():
            desc += f"{factor} =~ {' + '.join(indicators)}\n"
        if structural_model_list:
            for path in structural_model_list:
                desc += f"{path['to']} ~ {path['from']}\n"

        self.models[model_name] = {'desc': desc, 'measurement_model': measurement_model_dict}
        return self.models[model_name]
    
    def run_sem(self, model_name):
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not found.")
        
        model_spec = self.models[model_name]
        all_observed = list(set(ind for sublist in model_spec['measurement_model'].values() for ind in sublist))
        
        model_data = self.data[all_observed].copy().dropna()
        if model_data.empty:
            raise ValueError("No valid data for the specified variables after dropping NaNs.")
            
        model_data_std = pd.DataFrame(self.scaler.fit_transform(model_data), columns=model_data.columns)

        m = semopy.Model(model_spec['desc'])
        m.fit(model_data_std)
        
        stats_results = semopy.calc_stats(m)
        fit_indices = stats_results.T.to_dict().get('Value', {})
        estimates = semopy.inspect(m)

        # Get factor scores and mean components
        factor_scores_df = pd.DataFrame()
        mean_components = {}
        try:
            factor_scores_df = m.predict_factors(model_data_std)
            mean_components = factor_scores_df.mean().to_dict()
        except Exception as e:
            print(f"Warning: Could not predict factor scores. Error: {e}", file=sys.stderr)


        self.results[model_name] = {
            'model_name': model_name,
            'model_spec': model_spec,
            'n_observations': len(model_data_std),
            'fit_indices': fit_indices,
            'estimates': estimates.to_dict('records'),
            'factor_scores': factor_scores_df.to_dict('records'),
            'mean_components': mean_components,
            'model': m
        }
        
        return self.results[model_name]

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
        
        # Clean up results for JSON by removing the model object
        del results['model']

        response = {
            'results': results,
            'plot': None
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
