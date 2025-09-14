
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from itertools import combinations

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
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
        
        print(json.dumps(anova.results, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    # Add statsmodels to requirements
    try:
        from statsmodels.stats.multicomp import pairwise_tukeyhsd
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "statsmodels"])

    main()

    