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
import math

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
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
        
        # Track original indices
        original_data = self.data[all_vars].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop NA and track which rows were dropped
        self.clean_data = original_data.dropna().copy()
        dropped_indices = list(set(range(len(original_data))) - set(self.clean_data['original_index']))
        
        self.dropped_rows = sorted(dropped_indices)
        self.n_dropped = len(dropped_indices)
        
        # Remove the original_index column
        self.clean_data = self.clean_data.drop(columns=['original_index'])
        
        # Sanitize column names for formula
        self.dependent_var_clean = self.dependent_var.replace(' ', '_').replace('.', '')
        self.factor_var_clean = self.factor_var.replace(' ', '_').replace('.', '')
        self.covariate_vars_clean = [c.replace(' ', '_').replace('.', '') for c in self.covariate_vars]
        
        self.clean_data.columns = [self.dependent_var_clean, self.factor_var_clean] + self.covariate_vars_clean

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
        
        # Clean up source names
        cleaned_index = {}
        cleaned_index[f'C(Q("{self.factor_var_clean}"), Sum)'] = self.factor_var
        for cov in self.covariate_vars_clean:
            cleaned_index[f'Q("{cov}")'] = cov
        
        interaction_term = f'C(Q("{self.factor_var_clean}"), Sum):Q("{self.covariate_vars_clean[0]}")' # Simple assumption for now
        cleaned_index[interaction_term] = f'{self.factor_var} * {self.covariate_vars[0]}'

        # More robust cleaning for multiple covariates
        for cov in self.covariate_vars_clean:
             interaction_key = f'C(Q("{self.factor_var_clean}"), Sum):Q("{cov}")'
             original_cov_name = self.covariate_vars[self.covariate_vars_clean.index(cov)]
             cleaned_index[interaction_key] = f'{self.factor_var} * {original_cov_name}'

        anova_table = anova_table.rename(index=cleaned_index)

        # Replace NaN with None before converting to dict
        self.results['anova_table'] = anova_table.reset_index().rename(columns={'index': 'Source', 'PR(>F)': 'p_value'}).replace({np.nan: None}).to_dict('records')
        self.results['residuals'] = model.resid.tolist()
        
        # Add dropped rows info
        self.results['dropped_rows'] = self.dropped_rows
        self.results['n_dropped'] = self.n_dropped
        self.results['n_used'] = len(self.clean_data)
        self.results['n_original'] = len(self.data)
        
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
        if not self.covariate_vars_clean:
            return None
            
        # Use original names for plotting
        original_cov_name_to_plot = self.covariate_vars[0]
        clean_cov_name_to_plot = self.covariate_vars_clean[0]
        
        temp_plot_data = self.clean_data.rename(columns={
            self.dependent_var_clean: self.dependent_var,
            self.factor_var_clean: self.factor_var,
            clean_cov_name_to_plot: original_cov_name_to_plot
        })

        # Create figure with seaborn styling
        fig = plt.figure(figsize=(10, 6))
        
        # Create the regression plot for each group
        for group_name, group_data in temp_plot_data.groupby(self.factor_var):
            sns.regplot(
                x=original_cov_name_to_plot, 
                y=self.dependent_var, 
                data=group_data,
                label=str(group_name),
                scatter_kws={'alpha': 0.6},
                line_kws={'linewidth': 2}
            )
        
        plt.title(f'Interaction Plot', fontsize=12, fontweight='bold')
        plt.xlabel(original_cov_name_to_plot, fontsize=12)
        plt.ylabel(self.dependent_var, fontsize=12)
        plt.legend(title=self.factor_var)
        
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