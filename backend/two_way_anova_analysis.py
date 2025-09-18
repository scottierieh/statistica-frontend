
import sys
import json
import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.anova import anova_lm
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from scipy import stats
import warnings
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import math

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

class TwoWayAnovaAnalysis:
    def __init__(self, data, dependent_var, factor_a, factor_b, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.dependent_var = dependent_var
        self.factor_a = factor_a
        self.factor_b = factor_b
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        all_vars = [self.dependent_var, self.factor_a, self.factor_b]
        self.clean_data = self.data[all_vars].dropna().copy()
        
        # Sanitize column names for formula
        self.dv_clean = self.dependent_var.replace(' ', '_').replace('.', '_')
        self.fa_clean = self.factor_a.replace(' ', '_').replace('.', '_')
        self.fb_clean = self.factor_b.replace(' ', '_').replace('.', '_')
        
        self.clean_data.columns = [self.dv_clean, self.fa_clean, self.fb_clean]
        
        self.model = ols(f'Q("{self.dv_clean}") ~ C(Q("{self.fa_clean}")) * C(Q("{self.fb_clean}"))', data=self.clean_data).fit()


    def run_analysis(self):
        anova_table = anova_lm(self.model, typ=2)
        
        interaction_source_key = f'C(Q("{self.fa_clean}")):C(Q("{self.fb_clean}"))'
        interaction_p_value = anova_table.loc[interaction_source_key, 'PR(>F)'] if interaction_source_key in anova_table.index else 1.0
        
        # Add partial eta-squared (η²p)
        if 'Residual' in anova_table.index:
            anova_table['η²p'] = anova_table['sum_sq'] / (anova_table['sum_sq'] + anova_table.loc['Residual', 'sum_sq'])
        else:
            anova_table['η²p'] = np.nan
        
        # Clean up source names for the final output
        cleaned_index = {
            f'C(Q("{self.fa_clean}"))': self.factor_a,
            f'C(Q("{self.fb_clean}"))': self.factor_b,
            interaction_source_key: f'{self.factor_a} * {self.factor_b}'
        }
        anova_table_renamed = anova_table.rename(index=cleaned_index)
        
        # Ensure NaN values are converted to None for JSON compatibility
        anova_df = anova_table_renamed.reset_index().rename(columns={'index': 'Source', 'PR(>F)': 'p-value'})
        self.results['anova_table'] = anova_df.replace({np.nan: None}).to_dict('records')
        
        self._test_assumptions()
        self._calculate_marginal_means()
        
        if interaction_p_value < self.alpha:
            self._perform_posthoc_tests()
        
        self._generate_interpretation()
    
    def _test_assumptions(self):
        residuals = self.model.resid
        # 1. Normality of residuals (Shapiro-Wilk test)
        shapiro_stat, shapiro_p = stats.shapiro(residuals)
        
        # 2. Homogeneity of variances (Levene's test)
        levene_stat, levene_p = stats.levene(
            self.clean_data[self.dv_clean], 
            self.clean_data.groupby([self.fa_clean, self.fb_clean]).grouper.group_info[0]
        )
        
        self.results['assumptions'] = {
            'normality': {'test': 'Shapiro-Wilk', 'statistic': shapiro_stat, 'p_value': shapiro_p, 'assumption_met': shapiro_p > self.alpha},
            'homogeneity': {'test': 'Levene', 'statistic': levene_stat, 'p_value': levene_p, 'assumption_met': levene_p > self.alpha}
        }
    
    def _calculate_marginal_means(self):
        means_a = self.clean_data.groupby(self.fa_clean)[self.dv_clean].agg(['mean', 'std', 'sem', 'count']).reset_index()
        means_b = self.clean_data.groupby(self.fb_clean)[self.dv_clean].agg(['mean', 'std', 'sem', 'count']).reset_index()
        
        self.results['marginal_means'] = {
            'factor_a': means_a.to_dict('records'),
            'factor_b': means_b.to_dict('records')
        }

    def _perform_posthoc_tests(self):
        # Combine the factors into a single group for Tukey's HSD
        self.clean_data['combined_group'] = self.clean_data[self.fa_clean].astype(str) + " * " + self.clean_data[self.fb_clean].astype(str)
        
        tukey_result = pairwise_tukeyhsd(
            endog=self.clean_data[self.dv_clean],
            groups=self.clean_data['combined_group'],
            alpha=self.alpha
        )
        
        results_df = pd.DataFrame(data=tukey_result._results_table.data[1:], columns=tukey_result._results_table.data[0])
        results_df.rename(columns={'p-adj': 'p_adj'}, inplace=True)
        self.results['posthoc_results'] = results_df.to_dict('records')

    def _generate_interpretation(self):
        anova_results = {row['Source']: row for row in self.results['anova_table']}
        
        def format_p(p_val):
            return f"p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
        
        def get_effect_size_interp(eta):
            if eta >= 0.14: return "large"
            if eta >= 0.06: return "medium"
            if eta >= 0.01: return "small"
            return "negligible"

        interpretation = f"A Two-Way ANOVA was conducted to examine the effects of '{self.factor_a}' and '{self.factor_b}' on '{self.dependent_var}'.\n"

        # Main Effect A
        res_a = anova_results.get(self.factor_a)
        if res_a:
            sig_text_a = "a statistically significant" if res_a['p-value'] < self.alpha else "no statistically significant"
            p_text_a = format_p(res_a['p-value'])
            effect_size_a = res_a.get('η²p', 0)
            interp_a = get_effect_size_interp(effect_size_a)
            interpretation += (
                f"There was {sig_text_a} main effect for '{self.factor_a}', "
                f"F({res_a['df']:.0f}, {anova_results['Residual']['df']:.0f}) = {res_a['F']:.2f}, {p_text_a}, with a {interp_a} effect size (η²p = {effect_size_a:.3f}).\n"
            )

        # Main Effect B
        res_b = anova_results.get(self.factor_b)
        if res_b:
            sig_text_b = "a statistically significant" if res_b['p-value'] < self.alpha else "no statistically significant"
            p_text_b = format_p(res_b['p-value'])
            effect_size_b = res_b.get('η²p', 0)
            interp_b = get_effect_size_interp(effect_size_b)
            interpretation += (
                f"There was {sig_text_b} main effect for '{self.factor_b}', "
                f"F({res_b['df']:.0f}, {anova_results['Residual']['df']:.0f}) = {res_b['F']:.2f}, {p_text_b}, with a {interp_b} effect size (η²p = {effect_size_b:.3f}).\n"
            )

        # Interaction Effect
        interaction_key = f'{self.factor_a} * {self.factor_b}'
        res_int = anova_results.get(interaction_key)
        if res_int and res_int['p-value'] is not None:
            sig_text_int = "a statistically significant" if res_int['p-value'] < self.alpha else "no statistically significant"
            p_text_int = format_p(res_int['p-value'])
            effect_size_int = res_int.get('η²p', 0)
            interp_int = get_effect_size_interp(effect_size_int)
            interpretation += (
                f"The analysis also revealed {sig_text_int} interaction effect between '{self.factor_a}' and '{self.factor_b}', "
                f"F({res_int['df']:.0f}, {anova_results['Residual']['df']:.0f}) = {res_int['F']:.2f}, {p_text_int}, indicating that the effect of one factor depends on the level of the other. The effect size was {interp_int} (η²p = {effect_size_int:.3f}).\n"
            )

            # Post-hoc for significant interaction
            if res_int['p-value'] < self.alpha and 'posthoc_results' in self.results:
                sig_pairs = [res for res in self.results['posthoc_results'] if res['reject']]
                if sig_pairs:
                    interpretation += "\nSimple main effects analysis using Tukey's HSD revealed that "
                    details = []
                    for pair in sig_pairs[:3]: # Limit for brevity
                        details.append(f"the difference between '{pair['group1']}' and '{pair['group2']}' was significant (p = {pair['p_adj']:.3f})")
                    interpretation += ", and ".join(details) + "."
                    if len(sig_pairs) > 3:
                        interpretation += f" along with {len(sig_pairs) - 3} other significant differences."


        self.results['interpretation'] = interpretation.strip()


    def plot_results(self):
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))
        fig.suptitle('Two-Way ANOVA Results', fontsize=16, fontweight='bold')
        
        # 1. Interaction plot
        sns.pointplot(data=self.clean_data, x=self.fa_clean, y=self.dv_clean, hue=self.fb_clean, ax=axes[0, 0], dodge=True, errorbar='ci')
        axes[0, 0].set_title('Interaction Plot')
        axes[0, 0].set_xlabel(self.factor_a)
        axes[0, 0].set_ylabel(f'Mean of {self.dependent_var}')
        axes[0, 0].legend(title=self.factor_b)
        axes[0, 0].grid(True, linestyle='--', alpha=0.6)

        # 2. Box plot for Factor A
        sns.boxplot(x=self.fa_clean, y=self.dv_clean, data=self.clean_data, ax=axes[0, 1])
        axes[0, 1].set_title(f'Distribution by {self.factor_a}')
        axes[0, 1].set_xlabel(self.factor_a)
        axes[0, 1].set_ylabel(self.dependent_var)

        # 3. Box plot for Factor B
        sns.boxplot(x=self.fb_clean, y=self.dv_clean, data=self.clean_data, ax=axes[1, 0])
        axes[1, 0].set_title(f'Distribution by {self.factor_b}')
        axes[1, 0].set_xlabel(self.factor_b)
        axes[1, 0].set_ylabel(self.dependent_var)

        # 4. Q-Q plot for normality of residuals
        sm.qqplot(self.model.resid, line='s', ax=axes[1, 1])
        axes[1, 1].set_title('Q-Q Plot of Residuals')
        
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
        dependent_var = payload.get('dependentVar')
        factor_a = payload.get('factorA')
        factor_b = payload.get('factorB')

        if not all([data, dependent_var, factor_a, factor_b]):
            raise ValueError("Missing required parameters: data, dependentVar, factorA, factorB")

        analysis = TwoWayAnovaAnalysis(data, dependent_var, factor_a, factor_b)
        analysis.run_analysis()
        
        plot_image = analysis.plot_results()

        response = {
            'results': analysis.results,
            'plot': plot_image
        }
        
        # Use the robust _to_native_type converter for the final JSON dump
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
