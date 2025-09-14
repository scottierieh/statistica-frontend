
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.anova import anova_lm
import warnings
import io
import base64

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class AncovaAnalysis:
    def __init__(self, data, dependent_var, factor_var, covariate_vars, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.dependent_var = dependent_var
        self.factor_var = factor_var
        self.covariate_vars = covariate_vars if isinstance(covariate_vars, list) else [covariate_vars]
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        all_vars = [self.dependent_var, self.factor_var] + self.covariate_vars
        self.clean_data = self.data[all_vars].dropna().copy()
        
        # Sanitize column names for formula
        self.clean_data.columns = [col.replace(' ', '_').replace('.', '') for col in self.clean_data.columns]
        self.dependent_var_clean = self.dependent_var.replace(' ', '_').replace('.', '')
        self.factor_var_clean = self.factor_var.replace(' ', '_').replace('.', '')
        self.covariate_vars_clean = [c.replace(' ', '_').replace('.', '') for c in self.covariate_vars]

    def run_analysis(self):
        covariates_formula = ' + '.join([f'Q("{c}")' for c in self.covariate_vars_clean])
        formula = f'Q("{self.dependent_var_clean}") ~ C(Q("{self.factor_var_clean}"), Sum) * ({covariates_formula})'
        
        model = ols(formula, data=self.clean_data).fit()
        anova_table = anova_lm(model, typ=2)
        
        # Add partial eta-squared
        if 'Residual' in anova_table.index and 'sum_sq' in anova_table.columns:
            anova_table['eta_sq_partial'] = anova_table['sum_sq'] / (anova_table['sum_sq'] + anova_table.loc['Residual', 'sum_sq'])
        else:
            anova_table['eta_sq_partial'] = np.nan
        
        self.results['model_summary'] = str(model.summary())
        
        # Replace NaN with None before converting to dict
        self.results['anova_table'] = anova_table.reset_index().rename(columns={'index': 'Source'}).replace({np.nan: None}).to_dict('records')
        self.results['residuals'] = model.resid.tolist()
        
        self._test_assumptions(model)

    def _test_assumptions(self, model):
        residuals = model.resid
        # 1. Normality of residuals
        shapiro_stat, shapiro_p = stats.shapiro(residuals)
        
        # 2. Homogeneity of variances
        levene_stat, levene_p = stats.levene(
            *[group[self.dependent_var_clean] for name, group in self.clean_data.groupby(self.factor_var_clean)]
        )
        
        self.results['assumptions'] = {
            'normality': {'statistic': shapiro_stat, 'p_value': shapiro_p, 'met': shapiro_p > self.alpha},
            'homogeneity': {'statistic': levene_stat, 'p_value': levene_p, 'met': levene_p > self.alpha}
        }

    def plot_results(self):
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        fig.suptitle('ANCOVA Results', fontsize=16)

        # Interaction plot
        if self.covariate_vars_clean:
            sns.lmplot(
                x=self.covariate_vars_clean[0], 
                y=self.dependent_var_clean, 
                hue=self.factor_var_clean, 
                data=self.clean_data, 
                ci=None
            )
            plt.title(f'Interaction Plot: {self.dependent_var_clean} vs {self.covariate_vars_clean[0]} by {self.factor_var_clean}')
            
            # Need to capture lmplot to a buffer as it creates its own figure
            lmplot_buf = io.BytesIO()
            plt.savefig(lmplot_buf, format='png', bbox_inches='tight')
            plt.close() # Close the figure created by lmplot
            lmplot_buf.seek(0)
            
            # Use a single buffer for all plots
            buf = io.BytesIO()
            final_fig, final_ax = plt.subplots(1,1, figsize=(8,6))
            final_ax.imshow(plt.imread(lmplot_buf))
            final_ax.axis('off')
            final_fig.suptitle(f'Interaction Plot', fontsize=14)

            plt.tight_layout()
            plt.savefig(buf, format='png')
            plt.close(final_fig)
            buf.seek(0)
            
            return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
        return None

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        dependent_var = payload.get('dependentVar')
        factor_var = payload.get('factorVar')
        covariate_vars = payload.get('covariateVars')

        if not all([data, dependent_var, factor_var, covariate_vars]):
            raise ValueError("Missing data, dependentVar, factorVar, or covariateVars")

        ancova = AncovaAnalysis(data, dependent_var, factor_var, covariate_vars)
        ancova.run_analysis()
        plot_image = ancova.plot_results()

        response = {
            'results': ancova.results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
