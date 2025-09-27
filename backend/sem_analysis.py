
import sys
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import semopy
import warnings
import os
import io
import base64

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
    Comprehensive Structural Equation Modeling System using the semopy library.
    """
    
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

    def _build_model_description(self):
        desc = ""
        # Measurement model part
        for factor, indicators in self.measurement_model.items():
            desc += f"{factor} =~ {' + '.join(indicators)}\n"
        # Structural model part
        for path in self.structural_model:
            desc += f"{path['to']} ~ {path['from']}\n"
        return desc

    def run(self):
        model_desc = self._build_model_description()
        if not model_desc:
            raise ValueError("Model specification is empty.")

        model = semopy.Model(model_desc)
        
        try:
            res = model.fit(data=self.data_scaled)
        except Exception as e:
            raise ValueError(f"Failed to fit SEM model. Please check model specification. Original error: {e}")

        stats = semopy.calc_stats(model)
        estimates = semopy.inspect(model)
        
        # Rename for consistency if needed
        if 'p-value' in estimates.columns:
            estimates.rename(columns={'p-value': 'p_value'}, inplace=True)
            
        fit_indices = stats.T.to_dict().get('Value', {})

        self.results = {
            'fit_indices': fit_indices,
            'parameter_estimates': estimates.to_dict('records'),
            'convergence': res.x is not None,
            'model_description': model_desc,
            'model_object': model # Keep model object for plotting
        }
        return self.results

    def plot_graph(self):
        if not self.results.get('model_object'):
            return None
            
        model = self.results['model_object']
        
        try:
            temp_filename = "sem_plot.png"
            semopy.semplot(model, temp_filename, plot_stats=True)
            
            if os.path.exists(temp_filename):
                with open(temp_filename, 'rb') as f:
                    img_bytes = f.read()
                os.remove(temp_filename)
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                return f"data:image/png;base64,{img_base64}"
            else:
                return None
        except Exception as e:
            print(f"Warning: semplot failed with error: {e}. Graphviz might not be installed.", file=sys.stderr)
            return None


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        model_spec = payload.get('modelSpec')
        
        if not all([data, model_spec]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        measurement_model = model_spec.get('measurement_model', {})
        structural_model = model_spec.get('structural_model', [])

        sem_analyzer = SEMAnalysis(data, measurement_model, structural_model)
        analysis_results = sem_analyzer.run()
        plot_image = sem_analyzer.plot_graph()
        
        # Remove non-serializable model object before sending response
        if 'model_object' in analysis_results:
            del analysis_results['model_object']
        
        response = {'results': analysis_results, 'plot': plot_image}
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

