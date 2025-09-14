import numpy as np
import pandas as pd
from scipy import stats
from itertools import combinations
import warnings
warnings.filterwarnings('ignore')

class OneWayANOVA:
    """
    One-Way ANOVA Analysis Class
    Performs complete ANOVA with post-hoc tests and assumption checking
    """
    
    def __init__(self, data, group_col, value_col):
        self.data = data.copy()
        self.group_col = group_col
        self.value_col = value_col
        self.results = {}
        self._prepare_data_from_df()
        
    def _prepare_data_from_df(self):
        """Prepare data from DataFrame"""
        self.clean_data = self.data[[self.group_col, self.value_col]].dropna()
        self.group_labels = self.clean_data[self.group_col].values
        self.values = self.clean_data[self.value_col].values
        self.groups = sorted(self.clean_data[self.group_col].unique())
        self.k = len(self.groups)
        
        self.group_data = {group: self.clean_data[self.clean_data[self.group_col] == group][self.value_col].values for group in self.groups}
        self.n_total = len(self.values)
    
    def descriptive_statistics(self):
        """Calculate descriptive statistics for each group"""
        descriptives = {}
        for group in self.groups:
            data = self.group_data[group]
            descriptives[group] = {
                'n': len(data), 'mean': np.mean(data), 'std': np.std(data, ddof=1), 'var': np.var(data, ddof=1),
                'min': np.min(data), 'max': np.max(data), 'median': np.median(data),
                'q1': np.percentile(data, 25), 'q3': np.percentile(data, 75),
                'se': np.std(data, ddof=1) / np.sqrt(len(data))
            }
        self.results['descriptives'] = descriptives
    
    def anova_calculation(self):
        """Perform ANOVA calculations"""
        grand_mean = np.mean(self.values)
        ssb = sum(len(d) * (np.mean(d) - grand_mean)**2 for d in self.group_data.values())
        ssw = sum(sum((d - np.mean(d))**2) for d in self.group_data.values())
        sst = ssb + ssw
        
        df_between = self.k - 1
        df_within = self.n_total - self.k
        msb = ssb / df_between if df_between > 0 else 0
        msw = ssw / df_within if df_within > 0 else 0
        f_statistic = msb / msw if msw > 0 else 0
        p_value = 1 - stats.f.cdf(f_statistic, df_between, df_within) if df_between > 0 and df_within > 0 else 1.0

        eta_squared = ssb / sst if sst > 0 else 0
        omega_squared = (ssb - df_between * msw) / (sst + msw) if (sst + msw) > 0 else 0

        self.results['anova'] = {
            'f_statistic': f_statistic, 'p_value': p_value, 'significant': p_value < 0.05,
            'ssb': ssb, 'ssw': ssw, 'sst': sst, 'df_between': df_between, 'df_within': df_within, 'df_total': self.n_total - 1,
            'msb': msb, 'msw': msw, 'eta_squared': eta_squared, 'omega_squared': max(0, omega_squared)
        }
    
    def assumption_tests(self):
        """Test ANOVA assumptions"""
        normality_tests = {}
        for group in self.groups:
            data = self.group_data[group]
            if len(data) >= 3:
                stat, p_val = stats.shapiro(data)
                normality_tests[group] = {'statistic': stat, 'p_value': p_val, 'normal': p_val > 0.05}
            else:
                normality_tests[group] = {'statistic': None, 'p_value': None, 'normal': None}
        
        group_arrays = [self.group_data[group] for group in self.groups]
        levene_stat, levene_p = stats.levene(*group_arrays)
        
        self.results['assumptions'] = {
            'normality': normality_tests,
            'homogeneity': {'levene_statistic': levene_stat, 'levene_p_value': levene_p, 'equal_variances': levene_p > 0.05}
        }
    
    def post_hoc_tests(self, method='tukey'):
        """Perform post-hoc pairwise comparisons"""
        from statsmodels.stats.multicomp import pairwise_tukeyhsd
        if method.lower() == 'tukey':
            tukey_result = pairwise_tukeyhsd(self.clean_data[self.value_col], self.clean_data[self.group_col], alpha=0.05)
            df = pd.DataFrame(data=tukey_result._results_table.data[1:], columns=tukey_result._results_table.data[0])
            self.results['post_hoc_tukey'] = df.to_dict('records')

    def analyze(self, post_hoc_method='tukey'):
        self.descriptive_statistics()
        self.anova_calculation()
        self.assumption_tests()
        
        if self.results['anova']['significant']:
            self.post_hoc_tests(post_hoc_method)
        
        self._interpret_effect_size()

    def _interpret_effect_size(self):
        eta = self.results['anova']['eta_squared']
        interp = "Large" if eta >= 0.14 else "Medium" if eta >= 0.06 else "Small" if eta >= 0.01 else "Negligible"
        self.results['effect_size_interpretation'] = {'eta_squared_interpretation': f"{interp} effect"}
