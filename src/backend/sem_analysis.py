

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
        
        model_data = self.data[all_observed].copy()
        model_data_std = pd.DataFrame(self.scaler.fit_transform(model_data), columns=model_data.columns)

        m = semopy.Model(model_spec['desc'])
        m.fit(model_data_std)
        
        stats = semopy.calc_stats(m)
        fit_indices = stats.T.to_dict()['Value']

        # Get factor scores
        try:
            factor_scores = m.predict_factors(model_data_std)
            mean_components = factor_scores.mean().to_dict()
        except Exception:
            factor_scores = pd.DataFrame()
            mean_components = {}


        self.results[model_name] = {
            'model_name': model_name,
            'model_spec': model_spec,
            'n_observations': len(model_data_std),
            'fit_indices': fit_indices,
            'factor_scores': factor_scores.to_dict('records'),
            'mean_components': mean_components,
            'model': m
        }
        
        return self.results[model_name]

    def plot_sem_results(self, model_name):
        if model_name not in self.results or not self.results[model_name].get('model'):
             return None
             
        m = self.results[model_name]['model']
        
        try:
            g = semopy.semplot(m, "sem_plot.png", plot_stats=True)
            
            # Since semplot saves a file, we need to read it back into a buffer.
            buf = io.BytesIO()
            with open("sem_plot.png", 'rb') as f:
                buf.write(f.read())
            buf.seek(0)
            
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            return f"data:image/png;base64,{img_base64}"
        except Exception as e:
            # Fallback if graphviz is not installed or fails
            print(f"Warning: semplot failed with error: {e}. A basic plot will be generated.", file=sys.stderr)
            return self._fallback_plot(self.results[model_name])


    def _fallback_plot(self, sem_results):
        fig, ax = plt.subplots(1, 1, figsize=(10, 8))
        ax.axis('off')
        
        model_spec = sem_results['model_spec']
        text_content = model_spec['desc']
        
        ax.text(0.5, 0.5, text_content, ha='center', va='center', fontsize=12, family='monospace', bbox=dict(boxstyle="round,pad=1", fc="wheat", alpha=0.5))
        ax.set_title("SEM Path Diagram (Text Representation)", fontsize=14)

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
        
        if not all([data, model_spec_data]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        df = pd.DataFrame(data)
        
        sem = SEMAnalysis(df)
        
        measurement_model = model_spec_data.get('measurement_model')
        structural_model = model_spec_data.get('structural_model')
        
        sem.specify_model('user_model', measurement_model, structural_model)
        results = sem.run_sem('user_model')
        plot_image = sem.plot_sem_results('user_model')

        # Clean up results for JSON
        del results['model']

        response = {
            'results': results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':