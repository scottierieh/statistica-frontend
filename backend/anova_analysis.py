import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from itertools import combinations
import matplotlib.pyplot as plt
import seaborn as sns
import statsmodels.api as sm
import io
import base64
import warnings
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

class OneWayANOVA:
    def __init__(self, data=None, group_col=None, value_col=None):
        if data is not None and group_col is not None and value_col is not None:
            self.data = pd.DataFrame(data)
            self.group_col = group_col
            self.value_col = value_col
            self._prepare_data_from_df()
        else:
            raise ValueError("Must provide data, group_col, and value_col")
        
        self.results = {}
        
    def _prepare_data_from_df(self):
        self.clean_data = self.data[[self.group_col, self.value_col]].dropna()
        
        self.clean_data[self.value_col] = pd.to_numeric(self.clean_data[self.value_col], errors='coerce')
        self.clean_data.dropna(subset=[self.value_col], inplace=True)
        
        self.group_labels = self.clean_data[self.group_col].values
        self.values = self.clean_data[self.value_col].values
        
        self.groups = sorted(self.clean_data[self.group_col].unique())
        self.k = len(self.groups)

        if self.k < 2:
            raise ValueError(f"The independent variable '{self.group_col}' must have at least 2 unique groups.")
        
        self.group_data = {group: self.clean_data[self.clean_data[self.group_col] == group][self.value_col].values for group in self.groups}
        
        self.n_total = len(self.values)

        if self.n_total < self.k * 2:
             raise ValueError("Not enough valid data points for analysis.")

    def descriptive_statistics(self):
        descriptives = {}
        for group in self.groups:
            data = self.group_data[group]
            descriptives[group] = {
                'n': len(data),
                'mean': np.mean(data) if len(data) > 0 else 0,
                'std': np.std(data, ddof=1) if len(data) > 1 else 0,
                'var': np.var(data, ddof=1) if len(data) > 1 else 0,
                'min': np.min(data) if len(data) > 0 else 0,
                'max': np.max(data) if len(data) > 0 else 0,
                'median': np.median(data) if len(data) > 0 else 0,
                'q1': np.percentile(data, 25) if len(data) > 0 else 0,
                'q3': np.percentile(data, 75) if len(data) > 0 else 0,
                'se': stats.sem(data) if len(data) > 0 else 0
            }
        self.results['descriptives'] = descriptives
        return descriptives
    
    def anova_calculation(self):
        grand_mean = np.mean(self.values)
        
        ssb = sum(len(self.group_data[g]) * (np.mean(self.group_data[g]) - grand_mean)**2 for g in self.groups)
        ssw = sum(sum((self.group_data[g] - np.mean(self.group_data[g]))**2) for g in self.groups)
        sst = ssb + ssw

        df_between = self.k - 1
        df_within = self.n_total - self.k
        
        if df_between <= 0 or df_within <= 0:
            raise ValueError("Degrees of freedom must be positive.")

        msb = ssb / df_between
        msw = ssw / df_within
        
        f_statistic = msb / msw if msw > 0 else np.inf
        p_value = 1 - stats.f.cdf(f_statistic, df_between, df_within)
        
        eta_squared = ssb / sst if sst > 0 else 0
        omega_squared = (ssb - df_between * msw) / (sst + msw) if (sst + msw) > 0 else 0
        omega_squared = max(0, omega_squared)
        
        self.results['anova'] = {
            'ssb': ssb, 'ssw': ssw, 'sst': sst,
            'df_between': df_between, 'df_within': df_within, 'df_total': df_between + df_within,
            'msb': msb, 'msw': msw,
            'f_statistic': f_statistic, 'p_value': p_value,
            'eta_squared': eta_squared, 'omega_squared': omega_squared,
            'significant': p_value < 0.05
        }
        return self.results['anova']
    
    def assumption_tests(self):
        normality_tests = {}
        for group in self.groups:
            data = self.group_data[group]
            if len(data) >= 3:
                stat, p_val = stats.shapiro(data)
                normality_tests[group] = {'statistic': stat, 'p_value': p_val, 'normal': p_val > 0.05}
            else:
                normality_tests[group] = {'statistic': None, 'p_value': None, 'normal': None}
        
        group_arrays = [self.group_data[group] for group in self.groups if len(self.group_data[group]) > 0]
        
        levene_stat, levene_p = (np.nan, np.nan)
        if len(group_arrays) >= 2:
             levene_stat, levene_p = stats.levene(*group_arrays)
        
        self.results['assumptions'] = {
            'normality': normality_tests,
            'homogeneity': {
                'levene_statistic': levene_stat,
                'levene_p_value': levene_p,
                'equal_variances': levene_p > 0.05 if not np.isnan(levene_p) else None
            }
        }
        return self.results['assumptions']
        
    def _tukey_hsd(self):
        from statsmodels.stats.multicomp import pairwise_tukeyhsd
        
        tukey_result = pairwise_tukeyhsd(endog=self.clean_data[self.value_col], 
                                         groups=self.clean_data[self.group_col], 
                                         alpha=0.05)

        results_df = pd.DataFrame(data=tukey_result._results_table.data[1:], columns=tukey_result._results_table.data[0])
        results_df.rename(columns={'p-adj': 'p_adj'}, inplace=True) 
        self.results['post_hoc_tukey'] = results_df.to_dict('records')
        return self.results['post_hoc_tukey']

    def _generate_interpretation(self):
        anova_res = self.results['anova']
        desc_res = self.results['descriptives']
        
        sig_text = "statistically significant" if anova_res['significant'] else "not statistically significant"
        p_val_text = f"p < .001" if anova_res['p_value'] < 0.001 else f"p = {anova_res['p_value']:.3f}"
        
        interpretation = (
            f"A one-way ANOVA was conducted to determine if there was a {sig_text} difference in '{self.value_col}' scores between groups of '{self.group_col}'.\n"
            f"The results indicated a {sig_text} difference, *F*({anova_res['df_between']}, {anova_res['df_within']}) = {anova_res['f_statistic']:.2f}, {p_val_text}."
        )

        if anova_res['significant'] and 'post_hoc_tukey' in self.results:
            post_hoc_interp = []
            non_sig_pairs = []
            
            for res in self.results['post_hoc_tukey']:
                g1 = res['group1']
                g2 = res['group2']
                m1, std1 = desc_res[g1]['mean'], desc_res[g1]['std']
                m2, std2 = desc_res[g2]['mean'], desc_res[g2]['std']

                if res['reject']: # If significant
                    higher_group = g1 if m1 > m2 else g2
                    lower_group = g2 if m1 > m2 else g1
                    comp_text = (f"the mean score for the {higher_group} group (*M* = {max(m1, m2):.2f}, *SD* = {std1 if m1 > m2 else std2:.2f}) was significantly higher "
                                 f"than the {lower_group} group (*M* = {min(m1, m2):.2f}, *SD* = {std2 if m1 > m2 else std1:.2f})")
                    post_hoc_interp.append(comp_text)
                else:
                    non_sig_pairs.append(f"'{g1}' and '{g2}' (*p* = {res['p_adj']:.3f})")

            if post_hoc_interp:
                interpretation += "\nA Tukey post-hoc test revealed that " + ", and that ".join(post_hoc_interp) + "."
            if non_sig_pairs:
                interpretation += "\nNo statistically significant differences were found between " + ", and ".join(non_sig_pairs) + "."
        
        self.results['interpretation'] = interpretation.strip()

    def analyze(self):
        self.descriptive_statistics()
        self.anova_calculation()
        self.assumption_tests()
        if self.results['anova']['significant'] and self.k > 2:
            self._tukey_hsd()
        
        eta_sq = self.results['anova']['eta_squared']
        if eta_sq >= 0.14: interp = "Large effect"
        elif eta_sq >= 0.06: interp = "Medium effect"
        elif eta_sq >= 0.01: interp = "Small effect"
        else: interp = "Negligible effect"
        self.results['effect_size_interpretation'] = {'eta_squared_interpretation': interp}

        self._generate_interpretation()

    def plot_results(self):
        if not self.results:
            return None

        sns.set_style("darkgrid")
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))
        fig.suptitle('One-Way ANOVA Results', fontsize=16, fontweight='bold')

        # Plot 1: Point plot with error bars (similar to interaction plot style)
        means = [self.results['descriptives'][group]['mean'] for group in self.groups]
        ses = [self.results['descriptives'][group]['se'] for group in self.groups]
        
        axes[0, 0].errorbar(range(len(self.groups)), means, yerr=[1.96 * se for se in ses], 
                           marker='o', markersize=8, linestyle='-', linewidth=2, 
                           capsize=5, capthick=2, label='Mean ± 95% CI')
        axes[0, 0].set_title('Group Means')
        axes[0, 0].set_xlabel(self.group_col)
        axes[0, 0].set_ylabel(f'Mean of {self.value_col}')
        axes[0, 0].set_xticks(range(len(self.groups)))
        axes[0, 0].set_xticklabels(self.groups)
        axes[0, 0].legend()
        axes[0, 0].grid(True, linestyle='--', alpha=0.6)

        # Plot 2: Box plot (matching Two-Way ANOVA style)
        sns.boxplot(x=self.group_col, y=self.value_col, data=self.clean_data, ax=axes[0, 1], palette='crest')
        axes[0, 1].set_title(f'Distribution by {self.group_col}')
        axes[0, 1].set_xlabel(self.group_col)
        axes[0, 1].set_ylabel(self.value_col)

        # Plot 3: Violin plot for distribution visualization
        sns.violinplot(x=self.group_col, y=self.value_col, data=self.clean_data, ax=axes[1, 0], palette='crest')
        axes[1, 0].set_title(f'Violin Plot by {self.group_col}')
        axes[1, 0].set_xlabel(self.group_col)
        axes[1, 0].set_ylabel(self.value_col)
        
        # Plot 4: Q-Q Plot (matching Two-Way ANOVA style using statsmodels - NO GRID)
        all_residuals = []
        for group in self.groups:
            group_data = self.group_data[group]
            group_mean = self.results['descriptives'][group]['mean']
            residuals = group_data - group_mean
            all_residuals.extend(residuals)
        
        sm.qqplot(np.array(all_residuals), line='s', ax=axes[1, 1])
        axes[1, 1].set_title('Q-Q Plot of Residuals')

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return f"data:image/png;base64,{image_base64}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        independent_var = payload.get('independentVar')
        dependent_var = payload.get('dependentVar')

        if not all([data, independent_var, dependent_var]):
            raise ValueError("Missing 'data', 'independentVar', or 'dependentVar'")

        anova = OneWayANOVA(data=data, group_col=independent_var, value_col=dependent_var)
        anova.analyze()
        
        plot_image = anova.plot_results()
        
        response = {
            'results': anova.results,
            'plot': plot_image
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
