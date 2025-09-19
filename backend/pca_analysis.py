

import sys
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class PcaAnalysis:
    def __init__(self, data, variables, n_components=None):
        self.data = pd.DataFrame(data).copy()
        self.variables = variables
        self.n_components = n_components
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        self.clean_data = self.data[self.variables].dropna()
        if self.clean_data.empty:
            raise ValueError("No valid data for selected variables.")
            
        scaler = StandardScaler()
        self.scaled_data = scaler.fit_transform(self.clean_data)

    def _generate_interpretation(self):
        eigenvalues = self.results['eigenvalues']
        loadings = self.results['loadings']
        variables = self.results['variables']
        cumulative_variance = self.results['cumulative_variance_ratio']
        
        n_factors_kaiser = sum(1 for ev in eigenvalues if ev > 1)
        if n_factors_kaiser == 0 and len(eigenvalues) > 0:
            n_factors_kaiser = 1 # At least interpret the first component

        interpretation = f"A Principal Component Analysis (PCA) was conducted on {len(variables)} items to explore the underlying structure of the variables.\n"
        
        interpretation += f"Based on the Kaiser criterion (eigenvalues > 1), **{n_factors_kaiser} components** were extracted.\n"
        if n_factors_kaiser > 0:
            interpretation += f"Together, these components explained **{cumulative_variance[n_factors_kaiser-1]*100:.2f}%** of the total variance.\n\n"
        
        interpretation += "**Component Loadings Interpretation:**\n"
        for i in range(n_factors_kaiser):
            interpretation += f"- **Component {i+1} (Explained Variance: {self.results['explained_variance_ratio'][i]*100:.2f}%):** "
            
            factor_loadings = np.array(loadings)[:, i]
            high_loadings_indices = np.where(np.abs(factor_loadings) >= 0.5)[0]
            
            if len(high_loadings_indices) > 0:
                high_loading_vars = [variables[j] for j in high_loadings_indices]
                interpretation += f"This component is primarily defined by high loadings on the variables: **{', '.join(high_loading_vars)}**.\nThis suggests Component {i+1} represents an underlying construct related to these items.\n"
            else:
                interpretation += "No variables had strong loadings (>= 0.5), making interpretation difficult based on this threshold.\n"

        interpretation += "\nIn conclusion, the PCA suggests that the data can be effectively reduced to these components, providing a simpler yet representative structure of the original variables."
        return interpretation.strip()

    def run_analysis(self):
        pca = PCA(n_components=self.n_components)
        self.principal_components = pca.fit_transform(self.scaled_data)
        
        self.results['eigenvalues'] = pca.explained_variance_
        self.results['explained_variance_ratio'] = pca.explained_variance_ratio_
        self.results['cumulative_variance_ratio'] = np.cumsum(pca.explained_variance_ratio_)
        self.results['loadings'] = pca.components_.T
        self.results['n_components'] = pca.n_components_
        self.results['variables'] = self.variables
        self.results['interpretation'] = self._generate_interpretation()

    def plot_results(self):
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        fig.suptitle('Principal Component Analysis (PCA) Results', fontsize=16)

        # Scree Plot
        eigenvalues = self.results['eigenvalues']
        n_comps = len(eigenvalues)
        ax = axes[0]
        ax.bar(range(1, n_comps + 1), eigenvalues, alpha=0.7, align='center', label='Individual Eigenvalues')
        ax.step(range(1, n_comps + 1), self.results['cumulative_variance_ratio'] * max(eigenvalues), where='mid', label='Cumulative Explained Variance', color='red')
        ax.axhline(y=1, color='gray', linestyle='--', label='Eigenvalue = 1 (Kaiser rule)')
        ax.set_xlabel('Principal Components')
        ax.set_ylabel('Eigenvalues / Explained Variance')
        ax.set_title('Scree Plot')
        ax.set_xticks(range(1, n_comps + 1))
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Loadings Plot for first 2 components
        ax = axes[1]
        loadings = np.array(self.results['loadings'])
        if loadings.shape[1] >= 2:
            ax.scatter(loadings[:, 0], loadings[:, 1], alpha=0.8)
            ax.axhline(0, color='grey', lw=1)
            ax.axvline(0, color='grey', lw=1)
            ax.set_xlabel(f'PC1 ({self.results["explained_variance_ratio"][0]:.1%})')
            ax.set_ylabel(f'PC2 ({self.results["explained_variance_ratio"][1]:.1%})')
            ax.set_title('Component Loadings (PC1 vs PC2)')
            ax.grid(True, alpha=0.3)
            for i, var in enumerate(self.variables):
                ax.annotate(var, (loadings[i, 0], loadings[i, 1]), textcoords="offset points", xytext=(0,5), ha='center')
        else:
            ax.text(0.5, 0.5, 'Not enough components to plot.', ha='center', va='center')
            ax.set_axis_off()

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
        variables = payload.get('variables')
        n_components = payload.get('nComponents') 

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        pca_analysis = PcaAnalysis(data, variables, n_components)
        pca_analysis.run_analysis()
        plot_image = pca_analysis.plot_results()
        
        response = {
            'results': pca_analysis.results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    
