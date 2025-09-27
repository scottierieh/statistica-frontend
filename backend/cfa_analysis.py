

import sys
import json
import numpy as np
import pandas as pd
from scipy import stats, optimize
from scipy.stats import chi2, norm
import warnings
import matplotlib.pyplot as plt
import io
import base64
import math
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
    
    def run_cfa(self, model_name):
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not found. Use specify_model() first.")
        
        model_spec = self.models[model_name]
        
        desc = ""
        for factor, indicators in model_spec['factor_structure'].items():
            desc += f"{factor} =~ {' + '.join(indicators)}\n"
        
        m = semopy.Model(desc)
        
        all_observed_vars = [item for sublist in model_spec['factor_structure'].values() for item in sublist]
        
        model_data = self.data[all_observed_vars].copy().dropna()
        if model_data.empty:
            raise ValueError("No valid data after dropping rows with missing values.")

        m.fit(model_data)
        
        estimates = semopy.inspect(m)
        if 'p-value' in estimates.columns:
            estimates.rename(columns={'p-value': 'p_value'}, inplace=True)
            
        fit_indices = semopy.calc_stats(m).T.to_dict().get('Value', {})

        self.results[model_name] = {
            'model_name': model_name,
            'n_observations': len(model_data),
            'fit_indices': fit_indices,
            'estimates': estimates.to_dict('records'),
            'model_spec': model_spec,
            'model': m # Store the model object for plotting
        }
        
        return self.results[model_name]

    def plot_cfa_results(self, model_name):
        if model_name not in self.results or not self.results[model_name].get('model'):
             return None
             
        m = self.results[model_name]['model']
        
        try:
            temp_filename = "cfa_plot.png"
            semopy.semplot(m, temp_filename, plot_stats=True)
            
            buf = io.BytesIO()
            if os.path.exists(temp_filename):
                with open(temp_filename, 'rb') as f:
                    buf.write(f.read())
                buf.seek(0)
                os.remove(temp_filename)
                img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
                return f"data:image/png;base64,{img_base64}"
            else:
                 return self._fallback_plot(self.results[model_name])
        except Exception as e:
            print(f"Warning: semplot failed with error: {e}. A fallback plot will be generated.", file=sys.stderr)
            return self._fallback_plot(self.results[model_name])
            
    def _fallback_plot(self, sem_results):
        fig, ax = plt.subplots(1, 1, figsize=(10, 8))
        ax.axis('off')
        
        model_spec = sem_results['model_spec']
        text_content = ""
        for factor, indicators in model_spec['factor_structure'].items():
            text_content += f"{factor} =~ {' + '.join(indicators)}\n"

        ax.text(0.5, 0.5, text_content, ha='center', va='center', fontsize=12, family='monospace', bbox=dict(boxstyle="round,pad=1", fc="wheat", alpha=0.5))
        ax.set_title("CFA Path Diagram (Text Representation)", fontsize=14)

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
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
        plot_image = cfa.plot_cfa_results(model_name)
        
        # Don't serialize the model object
        if 'model' in results:
            del results['model']

        response = {
            'results': results,
            'plot': plot_image
        }
        
        cleaned_response = json.loads(json.dumps(response, default=_to_native_type))
        print(json.dumps(cleaned_response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
