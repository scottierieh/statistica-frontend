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

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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
        explained_variance = self.results['explained_variance_ratio']
        
        n_factors_kaiser = sum(1 for ev in eigenvalues if ev > 1)
        if n_factors_kaiser == 0 and len(eigenvalues) > 0:
            n_factors_kaiser = 1
        
        total_variance = cumulative_variance[n_factors_kaiser - 1] * 100 if n_factors_kaiser > 0 else 0
        
        # ===== Overall Summary =====
        interpretation = "**Overall Summary**\n"
        interpretation += f"A Principal Component Analysis (PCA) was conducted on {len(variables)} variables to explore the underlying structure of the data.\n"
        interpretation += f"→ Based on the Kaiser criterion (eigenvalues > 1), {n_factors_kaiser} component{'s were' if n_factors_kaiser != 1 else ' was'} extracted.\n"
        interpretation += f"→ Together, these components explain {total_variance:.1f}% of the total variance.\n"
        
        # Assess variance quality
        if total_variance >= 80:
            interpretation += f"→ This is an excellent level of variance explanation, indicating the components capture most of the data structure.\n"
        elif total_variance >= 70:
            interpretation += f"→ This is a good level of variance explanation, suitable for most analyses.\n"
        elif total_variance >= 60:
            interpretation += f"→ This is an acceptable level of variance explanation, though some information is lost.\n"
        else:
            interpretation += f"→ This is a relatively low level of variance explanation. Consider whether more components are needed.\n"

        # ===== Statistical Insights =====
        interpretation += "\n**Statistical Insights**\n"
        
        # Component-by-component analysis
        for i in range(min(n_factors_kaiser, 3)):  # Limit to first 3 components for readability
            var_pct = explained_variance[i] * 100
            interpretation += f"→ PC{i+1} explains {var_pct:.1f}% of variance (eigenvalue = {eigenvalues[i]:.2f}).\n"
            
            factor_loadings = np.array(loadings)[:, i]
            high_pos_indices = np.where(factor_loadings >= 0.5)[0]
            high_neg_indices = np.where(factor_loadings <= -0.5)[0]
            
            if len(high_pos_indices) > 0:
                high_pos_vars = [variables[j] for j in high_pos_indices]
                interpretation += f"  • Strong positive loadings: {', '.join(high_pos_vars)}\n"
            if len(high_neg_indices) > 0:
                high_neg_vars = [variables[j] for j in high_neg_indices]
                interpretation += f"  • Strong negative loadings: {', '.join(high_neg_vars)}\n"
            if len(high_pos_indices) == 0 and len(high_neg_indices) == 0:
                moderate_indices = np.where(np.abs(factor_loadings) >= 0.3)[0]
                if len(moderate_indices) > 0:
                    moderate_vars = [variables[j] for j in moderate_indices]
                    interpretation += f"  • Moderate loadings (≥0.3): {', '.join(moderate_vars)}\n"
                else:
                    interpretation += f"  • No strong loadings found for this component.\n"
        
        # Additional insights
        strong_loadings_count = np.sum(np.abs(loadings) >= 0.5)
        total_loadings = len(variables) * n_factors_kaiser
        interpretation += f"→ {strong_loadings_count} out of {total_loadings} loadings are strong (≥0.5), indicating {'clear' if strong_loadings_count/total_loadings > 0.3 else 'moderate'} variable-component relationships.\n"

        # ===== Recommendations =====
        interpretation += "\n**Recommendations**\n"
        
        # Sample size assessment
        n_obs = len(self.clean_data)
        ratio = n_obs / len(variables)
        if ratio < 5:
            interpretation += f"→ Warning: The subject-to-variable ratio ({ratio:.1f}:1) is low. Consider collecting more data for stable results.\n"
        elif ratio < 10:
            interpretation += f"→ The subject-to-variable ratio ({ratio:.1f}:1) is adequate but could be improved.\n"
        else:
            interpretation += f"→ The subject-to-variable ratio ({ratio:.1f}:1) is good for reliable PCA results.\n"
        
        # Variance threshold recommendations
        if total_variance < 70:
            interpretation += f"→ Consider extracting more components to capture at least 70% of variance.\n"
        
        # Component interpretation suggestions
        if n_factors_kaiser == 1:
            interpretation += f"→ With only one component, the variables appear to measure a single underlying construct.\n"
        elif n_factors_kaiser == 2:
            interpretation += f"→ Two components suggest the data has two distinct underlying dimensions.\n"
        else:
            interpretation += f"→ Multiple components ({n_factors_kaiser}) indicate a complex, multidimensional structure.\n"
        
        # Practical suggestions
        interpretation += f"→ Use the component scores for subsequent analyses to reduce multicollinearity.\n"
        interpretation += f"→ Review the loadings plot to identify clusters of related variables.\n"

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
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Define consistent line color
        line_color = '#C44E52'
        
        eigenvalues = self.results['eigenvalues']
        n_comps = len(eigenvalues)
        
        # 1. Scree Plot - Bar Chart
        axes[0, 0].bar(range(1, n_comps + 1), eigenvalues, alpha=0.7, color='#5B9BD5', edgecolor='black', label='Eigenvalues')
        axes[0, 0].axhline(y=1, color=line_color, linestyle='--', lw=2, label='Kaiser Criterion (λ=1)')
        axes[0, 0].set_xlabel('Principal Component', fontsize=12)
        axes[0, 0].set_ylabel('Eigenvalue', fontsize=12)
        axes[0, 0].set_title('Scree Plot', fontsize=12, fontweight='bold')
        axes[0, 0].set_xticks(range(1, n_comps + 1))
        axes[0, 0].legend()

        # 2. Cumulative Variance Explained
        cumulative_var = self.results['cumulative_variance_ratio'] * 100
        axes[0, 1].plot(range(1, n_comps + 1), cumulative_var, 'o-', color='#5B9BD5', linewidth=2, markersize=8)
        axes[0, 1].axhline(y=80, color=line_color, linestyle='--', lw=2, alpha=0.7, label='80% Threshold')
        axes[0, 1].set_xlabel('Number of Components', fontsize=12)
        axes[0, 1].set_ylabel('Cumulative Variance Explained (%)', fontsize=12)
        axes[0, 1].set_title('Cumulative Variance Explained', fontsize=12, fontweight='bold')
        axes[0, 1].set_xticks(range(1, n_comps + 1))
        axes[0, 1].set_ylim([0, 105])
        axes[0, 1].legend()
        
        # Add percentage labels on points
        for i, (x, y) in enumerate(zip(range(1, n_comps + 1), cumulative_var)):
            axes[0, 1].text(x, y + 2, f'{y:.1f}%', ha='center', fontsize=9)

        # 3. Component Loadings (PC1 vs PC2)
        loadings = np.array(self.results['loadings'])
        if loadings.shape[1] >= 2:
            axes[1, 0].scatter(loadings[:, 0], loadings[:, 1], alpha=0.8, s=100, color='#5B9BD5', edgecolors='black')
            axes[1, 0].axhline(0, color='grey', lw=1)
            axes[1, 0].axvline(0, color='grey', lw=1)
            axes[1, 0].set_xlabel(f'PC1 ({self.results["explained_variance_ratio"][0]*100:.1f}%)', fontsize=12)
            axes[1, 0].set_ylabel(f'PC2 ({self.results["explained_variance_ratio"][1]*100:.1f}%)', fontsize=12)
            axes[1, 0].set_title('Component Loadings (PC1 vs PC2)', fontsize=12, fontweight='bold')
            
            # Add variable labels
            for i, var in enumerate(self.variables):
                axes[1, 0].annotate(var, (loadings[i, 0], loadings[i, 1]), 
                                   textcoords="offset points", xytext=(0, 5), 
                                   ha='center', fontsize=9)
        else:
            axes[1, 0].text(0.5, 0.5, 'Not enough components\nfor biplot', 
                          ha='center', va='center', fontsize=12)
            axes[1, 0].set_title('Component Loadings', fontsize=12, fontweight='bold')

        # 4. Variance Explained by Each Component
        var_explained = self.results['explained_variance_ratio'] * 100
        bars = axes[1, 1].bar(range(1, n_comps + 1), var_explained, alpha=0.7, color='#5B9BD5', edgecolor='black')
        axes[1, 1].axhline(y=var_explained.mean(), color=line_color, linestyle='--', lw=2, alpha=0.7, label=f'Mean: {var_explained.mean():.1f}%')
        axes[1, 1].set_xlabel('Principal Component', fontsize=12)
        axes[1, 1].set_ylabel('Variance Explained (%)', fontsize=12)
        axes[1, 1].set_title('Variance Explained by Component', fontsize=12, fontweight='bold')
        axes[1, 1].set_xticks(range(1, n_comps + 1))
        axes[1, 1].legend()
        
        # Add percentage labels on bars
        for bar in bars:
            height = bar.get_height()
            axes[1, 1].text(bar.get_x() + bar.get_width()/2., height,
                          f'{height:.1f}%', ha='center', va='bottom', fontsize=9)

        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
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

    