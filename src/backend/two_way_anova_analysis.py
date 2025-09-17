
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
        
        # Add partial eta-squared (η²p)
        anova_table['η²p'] = anova_table['sum_sq'] / (anova_table['sum_sq'] + anova_table.loc['Residual', 'sum_sq'])
        
        # Clean up source names
        interaction_source_key = f'C(Q("{self.fa_clean}")):C(Q("{self.fb_clean}"))'
        cleaned_index = {
            f'C(Q("{self.fa_clean}"))': self.factor_a,
            f'C(Q("{self.fb_clean}"))': self.factor_b,
            interaction_source_key: f'{self.factor_a} * {self.factor_b}'
        }
        anova_table = anova_table.rename(index=cleaned_index)

        self.results['anova_table'] = anova_table.reset_index().rename(columns={'index': 'Source', 'PR(>F)': 'p-value'}).to_dict('records')
        
        self._test_assumptions()
        self._calculate_marginal_means()
        
        # Perform post-hoc test if interaction is significant
        # This check must happen *after* renaming the index
        interaction_p_value = anova_table.loc[f'{self.factor_a} * {self.factor_b}', 'p-value']
        if interaction_p_value < self.alpha:
            self._perform_posthoc_tests()
    
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
        
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
