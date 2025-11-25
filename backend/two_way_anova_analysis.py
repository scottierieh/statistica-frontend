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
import re

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
        
        # Track original indices before any operations
        original_data = self.data[all_vars].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop rows with any NA values
        self.clean_data = original_data.dropna().copy()
        
        # Track which rows were dropped
        dropped_indices = list(set(range(len(original_data))) - set(self.clean_data['original_index']))
        self.dropped_rows = sorted(dropped_indices)
        self.n_dropped = len(dropped_indices)
        
        # Convert dependent variable to numeric and drop any that failed conversion
        before_conversion = len(self.clean_data)
        self.clean_data[self.dependent_var] = pd.to_numeric(self.clean_data[self.dependent_var], errors='coerce')
        self.clean_data.dropna(subset=[self.dependent_var], inplace=True)
        after_conversion = len(self.clean_data)
        
        # Track additional rows dropped during numeric conversion
        if after_conversion < before_conversion:
            conversion_dropped = before_conversion - after_conversion
            # Note: exact indices already tracked in dropped_rows

        # Sanitize column names for formula
        self.dv_clean = re.sub(r'[^A-Za-z0-9_]', '_', self.dependent_var)
        self.fa_clean = re.sub(r'[^A-Za-z0-9_]', '_', self.factor_a)
        self.fb_clean = re.sub(r'[^A-Za-z0-9_]', '_', self.factor_b)
        
        # Remove the original_index column before renaming
        self.clean_data = self.clean_data.drop(columns=['original_index'])
        
        self.clean_data_renamed = self.clean_data.rename(columns={
            self.dependent_var: self.dv_clean,
            self.factor_a: self.fa_clean,
            self.factor_b: self.fb_clean
        })
        
        self.model = ols(f'Q("{self.dv_clean}") ~ C(Q("{self.fa_clean}")) * C(Q("{self.fb_clean}"))', data=self.clean_data_renamed).fit()

    def run_analysis(self):
        # Type I Sum of Squares (Sequential SS)
        anova_table = anova_lm(self.model, typ=1)
        
        # Calculate MS (Mean Square) = SS / df
        anova_table['MS'] = anova_table['sum_sq'] / anova_table['df']
        
        interaction_source_key = f'C(Q("{self.fa_clean}")):C(Q("{self.fb_clean}"))'
        interaction_p_value = anova_table.loc[interaction_source_key, 'PR(>F)'] if interaction_source_key in anova_table.index else 1.0
        
        if 'Residual' in anova_table.index:
            anova_table['η²p'] = anova_table['sum_sq'] / (anova_table['sum_sq'] + anova_table.loc['Residual', 'sum_sq'])
        else:
            anova_table['η²p'] = np.nan
        
        cleaned_index = {
            f'C(Q("{self.fa_clean}"))': self.factor_a,
            f'C(Q("{self.fb_clean}"))': self.factor_b,
            interaction_source_key: f'{self.factor_a} * {self.factor_b}'
        }
        anova_table_renamed = anova_table.rename(index=cleaned_index)
        
        anova_df = anova_table_renamed.reset_index().rename(columns={'index': 'Source', 'PR(>F)': 'p-value'})
        self.results['anova_table'] = anova_df.replace({np.nan: None}).to_dict('records')
        
        # Add dropped rows info to results
        self.results['dropped_rows'] = self.dropped_rows
        self.results['n_dropped'] = self.n_dropped
        self.results['n_used'] = len(self.clean_data)
        self.results['n_original'] = len(self.data)
        
        self._calculate_descriptive_stats()
        self._test_assumptions()
        self._calculate_marginal_means()
        
        # Calculate simple main effects if interaction is significant
        if interaction_p_value < self.alpha:
            self._calculate_simple_main_effects()
            self._perform_posthoc_tests()
        
        self._generate_interpretation()
    
    def _calculate_descriptive_stats(self):
        """Calculate mean and std for each combination of factors"""
        grouped = self.clean_data_renamed.groupby([self.fa_clean, self.fb_clean])
        
        # Create nested dictionaries for mean and std
        means = {}
        stds = {}
        
        for (fa_val, fb_val), group in grouped:
            if str(fa_val) not in means:
                means[str(fa_val)] = {}
                stds[str(fa_val)] = {}
            means[str(fa_val)][str(fb_val)] = group[self.dv_clean].mean()
            stds[str(fa_val)][str(fb_val)] = group[self.dv_clean].std()
        
        # Calculate row means (across Factor B)
        for fa_val in means.keys():
            row_values = list(means[fa_val].values())
            means[fa_val]['Row Mean'] = np.mean(row_values)
        
        # Calculate column means (across Factor A)
        fb_levels = list(means[list(means.keys())[0]].keys())
        fb_levels = [k for k in fb_levels if k != 'Row Mean']
        
        means['Column Mean'] = {}
        for fb_val in fb_levels:
            col_values = [means[fa_val][fb_val] for fa_val in means.keys() if fa_val != 'Column Mean']
            means['Column Mean'][fb_val] = np.mean(col_values)
        
        # Grand mean
        all_means = [means[fa][fb] for fa in means.keys() if fa != 'Column Mean' 
                     for fb in means[fa].keys() if fb != 'Row Mean']
        means['Column Mean']['Row Mean'] = np.mean(all_means)
        
        # Similar structure for std
        stds['Column Mean'] = {}
        for fb_val in fb_levels:
            stds['Column Mean'][fb_val] = 0  # Column mean std is not typically calculated
        stds['Column Mean']['Row Mean'] = 0
        
        self.results['descriptive_stats_table'] = {
            'mean': means,
            'std': stds
        }
    
    def _test_assumptions(self):
        # 1. Normality of residuals (Shapiro-Wilk test for each group)
        normality_tests = {}
        grouped = self.clean_data_renamed.groupby([self.fa_clean, self.fb_clean])
        for name, group in grouped:
            group_name = " * ".join(map(str, name))
            data = group[self.dv_clean]
            if len(data) >= 3:
                stat, p_val = stats.shapiro(data)
                normality_tests[group_name] = {'statistic': stat, 'p_value': p_val, 'normal': p_val > self.alpha}
            else:
                normality_tests[group_name] = {'statistic': None, 'p_value': None, 'normal': None}
        
        # 2. Homogeneity of variances (Levene's test - median based for JASP compatibility)
        samples = [group[self.dv_clean].values for name, group in grouped]
        if len(samples) > 1:
            # Use center='median' for Brown-Forsythe test (JASP default)
            levene_stat, levene_p = stats.levene(*samples, center='median')
            
            # Calculate degrees of freedom
            k = len(samples)  # number of groups
            n = sum(len(sample) for sample in samples)  # total observations
            df1 = k - 1  # between groups df
            df2 = n - k  # within groups df
        else:
            levene_stat, levene_p = (np.nan, np.nan)
            df1, df2 = (np.nan, np.nan)
        
        self.results['assumptions'] = {
            'normality': normality_tests,
            'homogeneity': {
                'test': 'Levene (Brown-Forsythe)', 
                'f_statistic': levene_stat,
                'statistic': levene_stat,  # Keep for backward compatibility
                'df1': df1,
                'df2': df2,
                'p_value': levene_p, 
                'assumption_met': levene_p > self.alpha if not np.isnan(levene_p) else None
            }
        }
    
    def _calculate_marginal_means(self):
        from scipy import stats as scipy_stats
        
        # Factor A marginal means with confidence intervals
        means_a = self.clean_data_renamed.groupby(self.fa_clean)[self.dv_clean].agg(['mean', 'std', 'sem', 'count']).reset_index()
        
        # Calculate 95% confidence intervals
        confidence_level = 0.95
        means_a['lower'] = means_a.apply(
            lambda row: row['mean'] - scipy_stats.t.ppf((1 + confidence_level) / 2, row['count'] - 1) * row['sem'] if row['count'] > 1 else row['mean'],
            axis=1
        )
        means_a['upper'] = means_a.apply(
            lambda row: row['mean'] + scipy_stats.t.ppf((1 + confidence_level) / 2, row['count'] - 1) * row['sem'] if row['count'] > 1 else row['mean'],
            axis=1
        )
        
        means_a.rename(columns={self.fa_clean: 'group'}, inplace=True)
        
        # Factor B marginal means with confidence intervals
        means_b = self.clean_data_renamed.groupby(self.fb_clean)[self.dv_clean].agg(['mean', 'std', 'sem', 'count']).reset_index()
        
        means_b['lower'] = means_b.apply(
            lambda row: row['mean'] - scipy_stats.t.ppf((1 + confidence_level) / 2, row['count'] - 1) * row['sem'] if row['count'] > 1 else row['mean'],
            axis=1
        )
        means_b['upper'] = means_b.apply(
            lambda row: row['mean'] + scipy_stats.t.ppf((1 + confidence_level) / 2, row['count'] - 1) * row['sem'] if row['count'] > 1 else row['mean'],
            axis=1
        )
        
        means_b.rename(columns={self.fb_clean: 'group'}, inplace=True)
        
        self.results['marginal_means'] = {
            'factor_a': means_a.to_dict('records'),
            'factor_b': means_b.to_dict('records')
        }

    def _calculate_simple_main_effects(self):
        """Calculate simple main effects: effect of one factor at each level of the other factor"""
        simple_effects = []
        
        # Simple effects of Factor A at each level of Factor B
        for fb_level in self.clean_data_renamed[self.fb_clean].unique():
            subset = self.clean_data_renamed[self.clean_data_renamed[self.fb_clean] == fb_level]
            if len(subset) > 0:
                # One-way ANOVA of Factor A at this level of Factor B
                groups = [subset[subset[self.fa_clean] == level][self.dv_clean].values 
                         for level in subset[self.fa_clean].unique()]
                groups = [g for g in groups if len(g) > 0]
                
                if len(groups) >= 2:
                    f_stat, p_val = stats.f_oneway(*groups)
                    
                    # Calculate effect size (eta-squared)
                    grand_mean = subset[self.dv_clean].mean()
                    ss_between = sum([len(g) * (np.mean(g) - grand_mean)**2 for g in groups])
                    ss_total = sum([(x - grand_mean)**2 for g in groups for x in g])
                    eta_sq = ss_between / ss_total if ss_total > 0 else 0
                    
                    simple_effects.append({
                        'effect': f'{self.factor_a} at {self.factor_b}={fb_level}',
                        'factor_varied': self.factor_a,
                        'factor_fixed': self.factor_b,
                        'fixed_level': str(fb_level),
                        'f_statistic': f_stat,
                        'p_value': p_val,
                        'eta_squared': eta_sq,
                        'significant': p_val < self.alpha
                    })
        
        # Simple effects of Factor B at each level of Factor A
        for fa_level in self.clean_data_renamed[self.fa_clean].unique():
            subset = self.clean_data_renamed[self.clean_data_renamed[self.fa_clean] == fa_level]
            if len(subset) > 0:
                # One-way ANOVA of Factor B at this level of Factor A
                groups = [subset[subset[self.fb_clean] == level][self.dv_clean].values 
                         for level in subset[self.fb_clean].unique()]
                groups = [g for g in groups if len(g) > 0]
                
                if len(groups) >= 2:
                    f_stat, p_val = stats.f_oneway(*groups)
                    
                    # Calculate effect size
                    grand_mean = subset[self.dv_clean].mean()
                    ss_between = sum([len(g) * (np.mean(g) - grand_mean)**2 for g in groups])
                    ss_total = sum([(x - grand_mean)**2 for g in groups for x in g])
                    eta_sq = ss_between / ss_total if ss_total > 0 else 0
                    
                    simple_effects.append({
                        'effect': f'{self.factor_b} at {self.factor_a}={fa_level}',
                        'factor_varied': self.factor_b,
                        'factor_fixed': self.factor_a,
                        'fixed_level': str(fa_level),
                        'f_statistic': f_stat,
                        'p_value': p_val,
                        'eta_squared': eta_sq,
                        'significant': p_val < self.alpha
                    })
        
        self.results['simple_main_effects'] = simple_effects

    def _perform_posthoc_tests(self):
        self.clean_data_renamed['combined_group'] = self.clean_data_renamed[self.fa_clean].astype(str) + " * " + self.clean_data_renamed[self.fb_clean].astype(str)
        
        tukey_result = pairwise_tukeyhsd(
            endog=self.clean_data_renamed[self.dv_clean],
            groups=self.clean_data_renamed['combined_group'],
            alpha=self.alpha
        )
        
        results_df = pd.DataFrame(data=tukey_result._results_table.data[1:], columns=tukey_result._results_table.data[0])
        results_df.rename(columns={'p-adj': 'p_adj'}, inplace=True)
        self.results['posthoc_results'] = results_df.to_dict('records')

    def _generate_interpretation(self):
        anova_results = {row['Source']: row for row in self.results['anova_table']}
        
        def format_p(p_val):
            if p_val is None: return "p = n/a"
            return f"p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
        
        def get_effect_size_interp(eta):
            if eta is None: return "unknown"
            if eta >= 0.14: return "large"
            if eta >= 0.06: return "medium"
            if eta >= 0.01: return "small"
            return "negligible"

        interpretation = f"A Two-Way ANOVA was conducted to examine the effects of '{self.factor_a}' and '{self.factor_b}' on '{self.dependent_var}'."
        
        # Add information about dropped rows if any
        if self.n_dropped > 0:
            interpretation += f" {self.n_dropped} row(s) with missing data were excluded from the analysis, leaving {self.n_used} observations."
        
        interpretation += "\n"

        res_a = anova_results.get(self.factor_a)
        if res_a and res_a.get('p-value') is not None:
            sig_text_a = "a statistically significant" if res_a['p-value'] < self.alpha else "no statistically significant"
            p_text_a = format_p(res_a['p-value'])
            effect_size_a = res_a.get('η²p', 0)
            interp_a = get_effect_size_interp(effect_size_a)
            interpretation += (
                f"There was {sig_text_a} main effect for '{self.factor_a}', "
                f"F({res_a['df']:.0f}, {anova_results['Residual']['df']:.0f}) = {res_a['F']:.2f}, {p_text_a}, with a {interp_a} effect size (η²p = {effect_size_a:.3f}).\n"
            )

        res_b = anova_results.get(self.factor_b)
        if res_b and res_b.get('p-value') is not None:
            sig_text_b = "a statistically significant" if res_b['p-value'] < self.alpha else "no statistically significant"
            p_text_b = format_p(res_b['p-value'])
            effect_size_b = res_b.get('η²p', 0)
            interp_b = get_effect_size_interp(effect_size_b)
            interpretation += (
                f"There was {sig_text_b} main effect for '{self.factor_b}', "
                f"F({res_b['df']:.0f}, {anova_results['Residual']['df']:.0f}) = {res_b['F']:.2f}, {p_text_b}, with a {interp_b} effect size (η²p = {effect_size_b:.3f}).\n"
            )

        interaction_key = f'{self.factor_a} * {self.factor_b}'
        res_int = anova_results.get(interaction_key)
        if res_int and res_int.get('p-value') is not None:
            sig_text_int = "a statistically significant" if res_int['p-value'] < self.alpha else "no statistically significant"
            p_text_int = format_p(res_int['p-value'])
            effect_size_int = res_int.get('η²p', 0)
            interp_int = get_effect_size_interp(effect_size_int)
            interpretation += (
                f"The analysis also revealed {sig_text_int} interaction effect between '{self.factor_a}' and '{self.factor_b}', "
                f"F({res_int['df']:.0f}, {anova_results['Residual']['df']:.0f}) = {res_int['F']:.2f}, {p_text_int}, indicating that the effect of one factor depends on the level of the other. "
                f"The effect size was {interp_int} (η²p = {effect_size_int:.3f}).\n"
            )

            if res_int['p-value'] < self.alpha and 'posthoc_results' in self.results:
                sig_pairs = [res for res in self.results['posthoc_results'] if res['reject']]
                if sig_pairs:
                    interpretation += "\nSimple main effects analysis using Tukey's HSD revealed that "
                    details = []
                    for pair in sig_pairs[:3]:
                        details.append(f"the difference between '{pair['group1']}' and '{pair['group2']}' was significant (p = {pair['p_adj']:.3f})")
                    interpretation += ", and ".join(details) + "."
                    if len(sig_pairs) > 3:
                        interpretation += f" along with {len(sig_pairs) - 3} other significant differences."

        self.results['interpretation'] = interpretation.strip()

    def plot_results(self):
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))
        
        sns.pointplot(data=self.clean_data_renamed, x=self.fa_clean, y=self.dv_clean, hue=self.fb_clean, ax=axes[0, 0], dodge=True, errorbar='ci', capsize=.1, palette='crest')
        axes[0, 0].set_title('Interaction Plot', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel(self.factor_a, fontsize=12)
        axes[0, 0].set_ylabel(f'Mean of {self.dependent_var}', fontsize=12)
        axes[0, 0].legend(title=self.factor_b)

        sns.boxplot(x=self.fa_clean, y=self.dv_clean, data=self.clean_data_renamed, ax=axes[0, 1], palette='crest')
        axes[0, 1].set_title(f'Distribution by {self.factor_a}', fontsize=12, fontweight='bold')
        axes[0, 1].set_xlabel(self.factor_a, fontsize=12)
        axes[0, 1].set_ylabel(self.dependent_var, fontsize=12)

        sns.boxplot(x=self.fb_clean, y=self.dv_clean, data=self.clean_data_renamed, ax=axes[1, 0], palette='crest')
        axes[1, 0].set_title(f'Distribution by {self.factor_b}', fontsize=12, fontweight='bold')
        axes[1, 0].set_xlabel(self.factor_b, fontsize=12)
        axes[1, 0].set_ylabel(self.dependent_var, fontsize=12)

        sm.qqplot(self.model.resid, line='s', ax=axes[1, 1])
        axes[1, 1].set_title('Q-Q Plot of Residuals', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Theoretical Quantiles', fontsize=12)
        axes[1, 1].set_ylabel('Sample Quantiles', fontsize=12)
        
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
        error_response = {"error": str(e), "details": "Error in Python script execution"}
        print(json.dumps(error_response, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    