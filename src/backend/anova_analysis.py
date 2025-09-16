
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from itertools import combinations
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
        if np.isnan(obj):
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
        
        # Ensure value column is numeric
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
        results_df.rename(columns={'p-adj': 'p_adj'}, inplace=True) # Rename p-adj to p_adj
        self.results['post_hoc_tukey'] = results_df.to_dict('records')
        return self.results['post_hoc_tukey']

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

    def plot_results(self):
        if not self.results:
            return None

        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        fig.suptitle('One-Way ANOVA Results', fontsize=16, fontweight='bold')

        # 1. Box plot
        sns.boxplot(x=self.group_col, y=self.value_col, data=self.clean_data, ax=axes[0, 0])
        axes[0, 0].set_title('Box Plot by Group')
        axes[0, 0].grid(True, alpha=0.3)
        
        # 2. Mean plot with error bars
        means = [self.results['descriptives'][group]['mean'] for group in self.groups]
        ses = [self.results['descriptives'][group]['se'] for group in self.groups]
        x_pos = range(len(self.groups))

        axes[0, 1].bar(x_pos, means, yerr=[1.96 * se for se in ses], capsize=5, alpha=0.7, color='skyblue', edgecolor='black')
        axes[0, 1].set_title('Group Means with 95% CI')
        axes[0, 1].set_ylabel('Mean Values')
        axes[0, 1].set_xticks(x_pos)
        axes[0, 1].set_xticklabels(self.groups)
        axes[0, 1].grid(True, alpha=0.3)

        # 3. Residual plot
        all_residuals = []
        fitted_values = []
        for group in self.groups:
            group_data = self.group_data[group]
            group_mean = self.results['descriptives'][group]['mean']
            residuals = group_data - group_mean
            all_residuals.extend(residuals)
            fitted_values.extend([group_mean] * len(group_data))
        
        axes[1, 0].scatter(fitted_values, all_residuals, alpha=0.6)
        axes[1, 0].axhline(y=0, color='red', linestyle='--', alpha=0.7)
        axes[1, 0].set_title('Residuals vs Fitted Values')
        axes[1, 0].set_xlabel('Fitted Values')
        axes[1, 0].set_ylabel('Residuals')
        axes[1, 0].grid(True, alpha=0.3)
        
        # 4. Q-Q plot for normality check
        stats.probplot(np.concatenate(list(self.group_data.values())), dist="norm", plot=axes[1, 1])
        axes[1, 1].set_title('Q-Q Plot of All Residuals')
        axes[1, 1].grid(True, alpha=0.3)

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
