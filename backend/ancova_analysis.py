
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
import re

warnings.filterwarnings('ignore')

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
        self.clean_data = self.data[all_vars].dropna().copy()
        
        for var in [self.dependent_var] + self.covariate_vars:
            self.clean_data[var] = pd.to_numeric(self.clean_data[var], errors='coerce')
        
        # Ensure factor variable is treated as a category
        self.clean_data[self.factor_var] = self.clean_data[self.factor_var].astype('category')
        
        self.clean_data.dropna(inplace=True)
        
        # Sanitize column names for formula
        self.dv_clean = re.sub(r'[^A-Za-z0-9_]', '_', self.dependent_var)
        self.fv_clean = re.sub(r'[^A-Za-z0-9_]', '_', self.factor_var)
        self.cv_clean = [re.sub(r'[^A-Za-z0-9_]', '_', c) for c in self.covariate_vars]
        
        rename_dict = {
            self.dependent_var: self.dv_clean,
            self.factor_var: self.fv_clean,
            **dict(zip(self.covariate_vars, self.cv_clean))
        }
        self.clean_data.rename(columns=rename_dict, inplace=True)
        
    def _generate_interpretation(self):
        if 'anova_table' not in self.results:
            return "Interpretation could not be generated as analysis results are missing."

        anova_dict = {row['Source']: row for row in self.results['anova_table']}
        
        def format_p(p_val):
            if p_val is None: return "p = n/a"
            return f"p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
        
        def get_effect_size_interp(eta_sq_p):
            if eta_sq_p is None: return "unknown"
            if eta_sq_p >= 0.14: return "large"
            if eta_sq_p >= 0.06: return "medium"
            if eta_sq_p >= 0.01: return "small"
            return "negligible"

        interpretation = f"A One-Way ANCOVA was conducted to examine the effect of '{self.factor_var}' on '{self.dependent_var}', while considering the influence of '{', '.join(self.covariate_vars)}'.\n"

        # Main Effect of Factor
        factor_res = anova_dict.get(self.factor_var)
        if factor_res and 'p-value' in factor_res and factor_res['p-value'] is not None:
            sig_text = "a statistically significant" if factor_res['p-value'] < self.alpha else "no statistically significant"
            p_text = format_p(factor_res['p-value'])
            effect_size = factor_res.get('η²p', 0)
            effect_interp = get_effect_size_interp(effect_size)
            
            interpretation += (
                f"There was {sig_text} main effect for '{self.factor_var}', "
                f"F({factor_res['df']:.0f}, {anova_dict['Residual']['df']:.0f}) = {factor_res['F']:.2f}, {p_text}, with a {effect_interp} effect size (η²p = {effect_size:.3f}).\n"
            )

        # Effect of Covariates
        for i, cov in enumerate(self.covariate_vars):
            cov_res = anova_dict.get(cov)
            if cov_res and 'p-value' in cov_res and cov_res['p-value'] is not None:
                sig_text = "a statistically significant" if cov_res['p-value'] < self.alpha else "no statistically significant"
                p_text = format_p(cov_res['p-value'])
                effect_size = cov_res.get('η²p', 0)
                effect_interp = get_effect_size_interp(effect_size)

                interpretation += (
                    f"The covariate, '{cov}', had {sig_text} effect on '{self.dependent_var}', "
                    f"F({cov_res['df']:.0f}, {anova_dict['Residual']['df']:.0f}) = {cov_res['F']:.2f}, {p_text}, with a {effect_interp} effect size (η²p = {effect_size:.3f}).\n"
                )

        # Interaction Effect
        interaction_key = f'{self.factor_var} * {self.covariate_vars[0]}'
        int_res = anova_dict.get(interaction_key) # Simple interaction for now
        if int_res and 'p-value' in int_res and int_res['p-value'] is not None:
            sig_text = "a statistically significant" if int_res['p-value'] < self.alpha else "no statistically significant"
            p_text_int = format_p(int_res['p-value'])
            effect_size_int = int_res.get('η²p', 0)
            interp_int = get_effect_size_interp(effect_size_int)

            interpretation += (
                f"The analysis also revealed {sig_text} interaction effect between '{self.factor_var}' and '{self.covariate_vars[0]}', "
                f"F({int_res['df']:.0f}, {anova_dict['Residual']['df']:.0f}) = {int_res['F']:.2f}, {p_text_int}, indicating that the effect of '{self.factor_var}' on '{self.dependent_var}' depends on the level of '{self.covariate_vars[0]}'. "
                f"The effect size for this interaction was {interp_int} (η²p = {effect_size_int:.3f})."
            )

        self.results['interpretation'] = interpretation.strip()


    def run_analysis(self):
        covariates_formula = ' + '.join([f'Q("{c}")' for c in self.cv_clean])
        # Using Type II SS, interaction is tested separately from main effects
        formula = f'Q("{self.dv_clean}") ~ C(Q("{self.fv_clean}")) * ({covariates_formula})'
        
        try:
            model = ols(formula, data=self.clean_data).fit()
            anova_table = anova_lm(model, typ=2)
        except Exception as e:
            # A simpler model if interaction fails
            formula = f'Q("{self.dv_clean}") ~ C(Q("{self.fv_clean}")) + {covariates_formula}'
            model = ols(formula, data=self.clean_data).fit()
            anova_table = anova_lm(model, typ=2)
            warnings.warn(f"Could not fit interaction model, proceeding without it. Error: {e}")

        # Add partial eta-squared (η²p)
        if 'Residual' in anova_table.index and 'sum_sq' in anova_table.columns:
             anova_table['η²p'] = anova_table['sum_sq'] / (anova_table['sum_sq'] + anova_table.loc['Residual', 'sum_sq'])
        else:
             anova_table['η²p'] = np.nan
        
        # Clean the summary object
        summary_obj = model.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            if table_data:
                 # Clean header of the coefficient table
                if len(table_data) > 1 and 'coef' in table_data[0]:
                    for row in table_data[1:]:
                        if row and row[0]:
                             row[0] = re.sub(r'Q\("([^"]+)"\)', r'\1', row[0].strip())
            
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })
        self.results['model_summary_data'] = summary_data
        
        # Clean up source names for readability
        cleaned_index = {
            f'C(Q("{self.fv_clean}"))': self.factor_var,
            **{f'Q("{cv}")': self.covariate_vars[i] for i, cv in enumerate(self.cv_clean)}
        }
        for i, cv in enumerate(self.cv_clean):
             interaction_key = f'C(Q("{self.fv_clean}")):Q("{cv}")'
             cleaned_index[interaction_key] = f'{self.factor_var} * {self.covariate_vars[i]}'

        anova_table_renamed = anova_table.rename(index=cleaned_index)

        # Convert to dict, handling NaN
        self.results['anova_table'] = anova_table_renamed.reset_index().rename(columns={'index': 'Source', 'PR(>F)': 'p-value'}).to_dict('records')
        self.results['residuals'] = model.resid.tolist()
        
        self._test_assumptions(model)
        self._generate_interpretation()

    def _test_assumptions(self, model):
        residuals = model.resid
        # 1. Normality of residuals
        shapiro_stat, shapiro_p = stats.shapiro(residuals)
        
        # 2. Homogeneity of variances (Levene's test on the groups)
        groups = [group[self.dv_clean].values for name, group in self.clean_data.groupby(self.fv_clean)]
        if len(groups) > 1:
            levene_stat, levene_p = stats.levene(*groups)
        else:
            levene_stat, levene_p = (np.nan, np.nan)
        
        self.results['assumptions'] = {
            'normality': {'statistic': shapiro_stat, 'p_value': shapiro_p, 'met': shapiro_p > self.alpha},
            'homogeneity': {'statistic': levene_stat, 'p_value': levene_p, 'met': levene_p > self.alpha}
        }

    def plot_results(self):
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        fig.suptitle('ANCOVA Results', fontsize=16)

        # Interaction plot for the first covariate
        if self.cv_clean:
            original_cov_name = self.covariate_vars[0]
            clean_cov_name = self.cv_clean[0]
            
            sns.scatterplot(
                data=self.clean_data, 
                x=clean_cov_name, 
                y=self.dv_clean, 
                hue=self.fv_clean, 
                ax=axes[0]
            )
            
            for group_name, group_data in self.clean_data.groupby(self.fv_clean):
                group_model = ols(f'Q("{self.dv_clean}") ~ Q("{clean_cov_name}")', data=group_data).fit()
                x_vals = np.linspace(group_data[clean_cov_name].min(), group_data[clean_cov_name].max(), 100)
                y_vals = group_model.predict(pd.DataFrame({clean_cov_name: x_vals}))
                axes[0].plot(x_vals, y_vals, label=f'Fit: {group_name}')

            axes[0].set_title(f'Interaction: {self.dependent_var} vs {original_cov_name}')
            axes[0].set_xlabel(original_cov_name)
            axes[0].set_ylabel(self.dependent_var)
            axes[0].legend()
            axes[0].grid(True, alpha=0.3)
        else:
             axes[0].text(0.5, 0.5, 'No covariates to plot.', ha='center', va='center')


        # Q-Q plot for residuals
        sm.qqplot(self.results['residuals'], line='s', ax=axes[1])
        axes[1].set_title('Q-Q Plot of Residuals')
        axes[1].grid(True, alpha=0.3)
        
        plt.tight_layout(rect=[0, 0, 1, 0.96])
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
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

    

  
