import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import t, levene, shapiro
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

def get_effect_size_interpretation(d):
    abs_d = abs(d)
    if abs_d >= 0.8: return "large"
    elif abs_d >= 0.5: return "medium"
    elif abs_d >= 0.2: return "small"
    else: return "negligible"

class TTestAnalysis:
    def __init__(self, data, alpha=0.05):
        self.data = data.copy()
        self.alpha = alpha
        self.results = {}
        
    def one_sample_ttest(self, variable, test_value, alternative='two-sided'):
        # Track original indices
        original_data = self.data[[variable]].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop NA and track which rows were dropped
        clean_data = original_data.dropna()
        dropped_indices = list(set(range(len(original_data))) - set(clean_data['original_index']))
        
        data_values = clean_data[variable].values
        
        if len(data_values) < 2:
            raise ValueError("Not enough valid data for the specified variable (minimum 2 required).")
        
        n = len(data_values)
        sample_mean = np.mean(data_values)
        sample_std = np.std(data_values, ddof=1)
        standard_error = sample_std / np.sqrt(n) if n > 0 else 0
        
        # Normality test
        normality_test = None
        if n >= 3:  # Shapiro-Wilk requires at least 3 samples
            stat, p = shapiro(data_values)
            normality_test = {
                variable: {
                    'statistic': stat,
                    'p_value': p,
                    'assumption_met': p > self.alpha
                }
            }
        
        t_stat, p_value = stats.ttest_1samp(data_values, test_value, alternative=alternative)
        df = n - 1
        
        ci_lower, ci_upper = t.interval(1 - self.alpha, df, loc=sample_mean, scale=standard_error) if df > 0 else (np.nan, np.nan)
        
        cohens_d = (sample_mean - test_value) / sample_std if sample_std > 0 else 0
        
        # Calculate SE of difference for one-sample
        se_diff = standard_error
        
        descriptives = {
            variable: { "n": n, "mean": sample_mean, "std_dev": sample_std, "se_mean": standard_error }
        }
        
        result = {
            'test_type': 'one_sample', 'variable': variable, 'test_value': test_value, 'n': n,
            'sample_mean': sample_mean, 'se_diff': se_diff, 't_statistic': t_stat, 'degrees_of_freedom': df,
            'p_value': p_value, 'significant': p_value < self.alpha, 'confidence_interval': (ci_lower, ci_upper),
            'cohens_d': cohens_d, 'descriptives': descriptives, 'data_values': data_values,
            'normality_test': normality_test,
            'dropped_rows': dropped_indices, 'n_dropped': len(dropped_indices)
        }
        result['interpretation'] = self._generate_interpretation(result)
        self.results['one_sample'] = result
        return result
    
    def independent_samples_ttest(self, variable, group_variable, alternative='two-sided'):
        # Track original indices
        original_data = self.data[[variable, group_variable]].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop NA and track which rows were dropped
        clean_data = original_data.dropna()
        dropped_indices = list(set(range(len(original_data))) - set(clean_data['original_index']))
        
        groups = clean_data[group_variable].unique()
        
        if len(groups) != 2:
            raise ValueError(f"Grouping variable must have exactly 2 groups, found {len(groups)}")
        
        group1_data = clean_data[clean_data[group_variable] == groups[0]][variable].values
        group2_data = clean_data[clean_data[group_variable] == groups[1]][variable].values
        
        # Normality tests for each group
        normality_test = {}
        for i, group in enumerate([group1_data, group2_data]):
            if len(group) >= 3:  # Shapiro-Wilk requires at least 3 samples
                stat, p = shapiro(group)
                normality_test[str(groups[i])] = {
                    'statistic': stat,
                    'p_value': p,
                    'assumption_met': p > self.alpha
                }
        
        # Levene's test for homogeneity of variances
        levene_stat, levene_p = stats.levene(group1_data, group2_data)
        equal_var = levene_p > self.alpha

        n1, n2 = len(group1_data), len(group2_data)
        mean1, mean2 = np.mean(group1_data), np.mean(group2_data)
        std1, std2 = np.std(group1_data, ddof=1), np.std(group2_data, ddof=1)
        mean_diff = mean1 - mean2
        
        # Student's t-test (equal variances)
        t_stat_student, p_value_student = stats.ttest_ind(group1_data, group2_data, equal_var=True, alternative=alternative)
        df_student = n1 + n2 - 2
        pooled_std = np.sqrt(((n1-1)*std1**2 + (n2-1)*std2**2) / df_student) if df_student > 0 else 0
        se_diff_student = pooled_std * np.sqrt(1/n1 + 1/n2) if n1 > 0 and n2 > 0 else 0
        cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0
        
        # CI for Student's t-test
        ci_margin_student = t.ppf(1 - self.alpha/2, df_student) * se_diff_student if df_student > 0 else 0
        ci_student = (mean_diff - ci_margin_student, mean_diff + ci_margin_student)
        
        # Welch's t-test (unequal variances)
        t_stat_welch, p_value_welch = stats.ttest_ind(group1_data, group2_data, equal_var=False, alternative=alternative)
        
        # Welch's degrees of freedom
        s1_sq_n1 = std1**2 / n1 if n1 > 0 else 0
        s2_sq_n2 = std2**2 / n2 if n2 > 0 else 0
        df_num = (s1_sq_n1 + s2_sq_n2)**2
        df_den = ((s1_sq_n1**2/(n1-1)) + (s2_sq_n2**2/(n2-1))) if n1 > 1 and n2 > 1 else np.inf
        df_welch = df_num / df_den if df_den > 0 else np.inf
        
        # SE and CI for Welch's t-test
        se_diff_welch = np.sqrt(s1_sq_n1 + s2_sq_n2)
        ci_margin_welch = t.ppf(1 - self.alpha/2, df_welch) * se_diff_welch if np.isfinite(df_welch) else 0
        ci_welch = (mean_diff - ci_margin_welch, mean_diff + ci_margin_welch)
        
        descriptives = {
            str(groups[0]): {"n": n1, "mean": mean1, "std_dev": std1},
            str(groups[1]): {"n": n2, "mean": mean2, "std_dev": std2}
        }
        
        # Use appropriate test based on Levene's result
        if equal_var:
            t_stat_main = t_stat_student
            p_value_main = p_value_student
            df_main = df_student
            se_diff_main = se_diff_student
        else:
            t_stat_main = t_stat_welch
            p_value_main = p_value_welch
            df_main = df_welch
            se_diff_main = se_diff_welch
            
        result = {
            'test_type': 'independent_samples', 
            'variable': variable, 
            'group_variable': group_variable, 
            'groups': list(groups), 
            'equal_var': equal_var,
            'n1': n1, 'n2': n2, 
            'mean1': mean1, 'mean2': mean2, 
            'std1': std1, 'std2': std2,
            'mean_diff': mean_diff,
            'se_diff': se_diff_main,
            't_statistic': t_stat_main, 
            'degrees_of_freedom': df_main, 
            'p_value': p_value_main, 
            'significant': p_value_main < self.alpha,
            'cohens_d': cohens_d, 
            'descriptives': descriptives,
            'normality_test': normality_test if normality_test else None,
            'levene_test': {
                'statistic': levene_stat, 
                'p_value': levene_p, 
                'assumption_met': equal_var
            },
            # Student's t-test results
            'student_t': {
                't_statistic': t_stat_student,
                'df': df_student,
                'p_value': p_value_student,
                'mean_diff': mean_diff,
                'se_diff': se_diff_student,
                'ci': ci_student
            },
            # Welch's t-test results
            'welch_t': {
                't_statistic': t_stat_welch,
                'df': df_welch,
                'p_value': p_value_welch,
                'mean_diff': mean_diff,
                'se_diff': se_diff_welch,
                'ci': ci_welch
            },
            'data1': group1_data, 
            'data2': group2_data,
            'dropped_rows': dropped_indices,
            'n_dropped': len(dropped_indices)
        }
        result['interpretation'] = self._generate_interpretation(result)
        self.results['independent_samples'] = result
        return result
    
    def paired_samples_ttest(self, variable1, variable2, alternative='two-sided'):
        # Track original indices
        original_data = self.data[[variable1, variable2]].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop NA and track which rows were dropped
        clean_data = original_data.dropna()
        dropped_indices = list(set(range(len(original_data))) - set(clean_data['original_index']))
        
        if len(clean_data) < 2: 
            raise ValueError("Not enough complete pairs found (minimum 2).")
        
        data1 = clean_data[variable1].values
        data2 = clean_data[variable2].values
        
        differences = data1 - data2
        
        # Normality test on differences
        normality_test = None
        if len(differences) >= 3:  # Shapiro-Wilk requires at least 3 samples
            stat, p = shapiro(differences)
            normality_test = {
                'differences': {
                    'statistic': stat,
                    'p_value': p,
                    'assumption_met': p > self.alpha
                }
            }
        
        t_stat, p_value = stats.ttest_rel(data1, data2, alternative=alternative)
        
        n = len(differences)
        df = n - 1
        mean_diff = np.mean(differences)
        std_diff = np.std(differences, ddof=1)
        se_diff = std_diff / np.sqrt(n) if n > 0 else 0
        
        ci_lower, ci_upper = t.interval(1 - self.alpha, df, loc=mean_diff, scale=se_diff) if df > 0 else (np.nan, np.nan)
        
        cohens_d = mean_diff / std_diff if std_diff > 0 else 0
        
        descriptives = {
            variable1: {"n": len(data1), "mean": np.mean(data1), "std_dev": np.std(data1, ddof=1)},
            variable2: {"n": len(data2), "mean": np.mean(data2), "std_dev": np.std(data2, ddof=1)},
            "differences": {"n": n, "mean": mean_diff, "std_dev": std_diff}
        }
        
        result = {
            'test_type': 'paired_samples', 
            'variable1': variable1, 
            'variable2': variable2, 
            'n': n,
            'mean_diff': mean_diff, 
            'se_diff': se_diff,
            't_statistic': t_stat, 
            'degrees_of_freedom': df, 
            'p_value': p_value,
            'significant': p_value < self.alpha, 
            'cohens_d': cohens_d, 
            'confidence_interval': (ci_lower, ci_upper),
            'descriptives': descriptives, 
            'data1': data1, 
            'data2': data2, 
            'differences': differences,
            'normality_test': normality_test,
            'dropped_rows': dropped_indices,
            'n_dropped': len(dropped_indices)
        }
        result['interpretation'] = self._generate_interpretation(result)
        self.results['paired_samples'] = result
        return result

    def _generate_interpretation(self, result):
        test_type = result['test_type']
        
        if test_type == 'one_sample':
            return self._interpret_one_sample_ttest(result)
        elif test_type == 'independent_samples':
            return self._interpret_independent_ttest(result)
        elif test_type == 'paired_samples':
            return self._interpret_paired_ttest(result)
        
        # Fallback for other test types
        p_val = result['p_value']
        significant = result['significant']
        return f"The test was statistically {'significant' if significant else 'not significant'} with a p-value of {p_val:.4f}."

    def _interpret_one_sample_ttest(self, res):
        p_text = f"p < .001" if res['p_value'] < 0.001 else f"p = {res['p_value']:.3f}"
        sig_text = "statistically significant" if res['significant'] else "not statistically significant"
        effect_interp = get_effect_size_interpretation(res['cohens_d'])
        
        m = res['sample_mean']
        sd = res['descriptives'][res['variable']]['std_dev']

        interpretation = (
            f"A one-sample t-test was conducted to determine whether the mean of '{res['variable']}' was different from the test value of {res['test_value']}.\n\n"
            f"There was a {sig_text} difference between the sample mean (M={m:.2f}, SD={sd:.2f}) and the test value of {res['test_value']}, "
            f"t({res['degrees_of_freedom']}) = {res['t_statistic']:.2f}, {p_text}.\n\n"
        )
        
        ci = res['confidence_interval']
        interpretation += (
            f"The 95% confidence interval for the mean is [{ci[0]:.2f}, {ci[1]:.2f}]. "
        )
        if not (ci[0] <= res['test_value'] <= ci[1]):
             interpretation += f"Since this interval does not contain the test value of {res['test_value']}, the result is significant.\n\n"
        else:
             interpretation += f"Since this interval contains the test value of {res['test_value']}, the result is not significant.\n\n"

        interpretation += f"The calculated Cohen's d of {res['cohens_d']:.3f} indicates a {effect_interp} effect size."
        
        return interpretation.strip()

    def _interpret_independent_ttest(self, res):
        # Use the recommended test (based on Levene's)
        if res['equal_var']:
            p_value = res['student_t']['p_value']
            t_stat = res['student_t']['t_statistic']
            df = res['student_t']['df']
            test_name = "Student's independent-samples t-test"
        else:
            p_value = res['welch_t']['p_value']
            t_stat = res['welch_t']['t_statistic']
            df = res['welch_t']['df']
            test_name = "Welch's independent-samples t-test"
        
        p_text = f"p < .001" if p_value < 0.001 else f"p = {p_value:.3f}"
        sig_text = "statistically significant" if res['significant'] else "not statistically significant"
        effect_interp = get_effect_size_interpretation(res['cohens_d'])

        g1, g2 = res['groups']
        m1, sd1 = res['descriptives'][str(g1)]['mean'], res['descriptives'][str(g1)]['std_dev']
        m2, sd2 = res['descriptives'][str(g2)]['mean'], res['descriptives'][str(g2)]['std_dev']

        interpretation = (
            f"A {test_name} was conducted to compare '{res['variable']}' between two groups: '{g1}' and '{g2}'.\n\n"
        )
        
        levene_p = res['levene_test']['p_value']
        if levene_p > self.alpha:
            interpretation += f"Levene's test for equality of variances was not significant (p = {levene_p:.3f}), indicating equal variances can be assumed.\n\n"
        else:
            interpretation += f"Levene's test was significant (p = {levene_p:.3f}), indicating unequal variances (Welch's correction applied).\n\n"

        interpretation += (
            f"There was a {sig_text} difference in the scores for '{g1}' (M={m1:.2f}, SD={sd1:.2f}) and '{g2}' (M={m2:.2f}, SD={sd2:.2f}), "
            f"t({df:.2f}) = {t_stat:.2f}, {p_text}.\n\n"
        )
        
        interpretation += f"The calculated Cohen's d of {res['cohens_d']:.3f} indicates a {effect_interp} effect size."
        
        return interpretation.strip()

    def _interpret_paired_ttest(self, res):
        p_text = f"p < .001" if res['p_value'] < 0.001 else f"p = {res['p_value']:.3f}"
        sig_text = "statistically significant" if res['significant'] else "not statistically significant"
        effect_interp = get_effect_size_interpretation(res['cohens_d'])

        m1 = res['descriptives'][res['variable1']]['mean']
        sd1 = res['descriptives'][res['variable1']]['std_dev']
        m2 = res['descriptives'][res['variable2']]['mean']
        sd2 = res['descriptives'][res['variable2']]['std_dev']
        
        interpretation = (
            f"A paired-samples t-test was conducted to compare '{res['variable1']}' and '{res['variable2']}'.\n\n"
            f"There was a {sig_text} difference between '{res['variable1']}' (M={m1:.2f}, SD={sd1:.2f}) and '{res['variable2']}' (M={m2:.2f}, SD={sd2:.2f}), "
            f"t({res['degrees_of_freedom']}) = {res['t_statistic']:.2f}, {p_text}.\n\n"
        )
        
        mean_diff = res['mean_diff']
        ci = res['confidence_interval']
        interpretation += (
            f"The mean difference was {mean_diff:.2f}, with a 95% confidence interval of [{ci[0]:.2f}, {ci[1]:.2f}]. "
            f"This result suggests that the effect is {sig_text}.\n\n"
        )

        interpretation += f"The calculated Cohen's d of {res['cohens_d']:.3f} indicates a {effect_interp} effect size."
        
        return interpretation.strip()

    def plot_results(self, test_type=None, figsize=(12, 10)):
        if not self.results: 
            return None
        test_type = test_type or list(self.results.keys())[0]
        result = self.results.get(test_type)
        if not result: 
            return None

        fig, axes = plt.subplots(2, 2, figsize=figsize)
        
        if test_type == 'one_sample':
            sns.histplot(result['data_values'], ax=axes[0, 0], color='#5B9BD5', kde=True)
            axes[0, 0].axvline(result['sample_mean'], color='red', linestyle='--', label=f'Sample Mean ({result["sample_mean"]:.2f})')
            axes[0, 0].axvline(result['test_value'], color='orange', linestyle='--', label=f'Test Value ({result["test_value"]})')
            axes[0, 0].set_title('Data Distribution', fontsize=12, fontweight='bold')
            axes[0, 0].set_xlabel('Value', fontsize=12)
            axes[0, 0].set_ylabel('Frequency', fontsize=12)
            axes[0, 0].legend()
            
            stats.probplot(result['data_values'], dist="norm", plot=axes[0, 1])
            axes[0, 1].set_title('Q-Q Plot', fontsize=12, fontweight='bold')
            axes[0, 1].set_xlabel('Theoretical Quantiles', fontsize=12)
            axes[0, 1].set_ylabel('Sample Quantiles', fontsize=12)

            sns.boxplot(x=result['data_values'], ax=axes[1, 1], color='#5B9BD5')
            axes[1, 1].set_title('Box Plot', fontsize=12, fontweight='bold')
            axes[1, 1].set_xlabel('Value', fontsize=12)

        elif test_type == 'independent_samples':
            sns.histplot(result['data1'], ax=axes[0,0], color='#5B9BD5', label=str(result['groups'][0]), kde=True, alpha=0.6)
            sns.histplot(result['data2'], ax=axes[0,0], color='#F4A582', label=str(result['groups'][1]), kde=True, alpha=0.6)
            axes[0,0].set_title('Group Distributions', fontsize=12, fontweight='bold')
            axes[0,0].set_xlabel('Value', fontsize=12)
            axes[0,0].set_ylabel('Frequency', fontsize=12)
            axes[0,0].legend()
            
            sns.boxplot(data=[result['data1'], result['data2']], ax=axes[0,1], palette=['#5B9BD5', '#F4A582'])
            axes[0,1].set_xticklabels(result['groups'])
            axes[0,1].set_title('Group Boxplots', fontsize=12, fontweight='bold')
            axes[0,1].set_ylabel('Value', fontsize=12)

            residuals1 = result['data1'] - result['mean1']
            residuals2 = result['data2'] - result['mean2']
            all_residuals = np.concatenate([residuals1, residuals2])
            stats.probplot(all_residuals, dist="norm", plot=axes[1, 1])
            axes[1, 1].set_title('Q-Q Plot of Residuals', fontsize=12, fontweight='bold')
            axes[1, 1].set_xlabel('Theoretical Quantiles', fontsize=12)
            axes[1, 1].set_ylabel('Sample Quantiles', fontsize=12)

        elif test_type == 'paired_samples':
            sns.boxplot(data=[result['data1'], result['data2']], ax=axes[0,0], palette=['#5B9BD5', '#F4A582'])
            axes[0,0].set_xticklabels([result['variable1'], result['variable2']])
            axes[0,0].set_title('Paired Variables Distribution', fontsize=12, fontweight='bold')
            axes[0,0].set_ylabel('Value', fontsize=12)

            sns.histplot(result['differences'], ax=axes[0,1], color='#5B9BD5', kde=True)
            axes[0,1].axvline(0, color='black', linestyle='--')
            axes[0,1].set_title('Distribution of Differences', fontsize=12, fontweight='bold')
            axes[0,1].set_xlabel('Differences', fontsize=12)
            axes[0,1].set_ylabel('Frequency', fontsize=12)
            
            stats.probplot(result['differences'], dist="norm", plot=axes[1,1])
            axes[1,1].set_title('Q-Q Plot of Differences', fontsize=12, fontweight='bold')
            axes[1,1].set_xlabel('Theoretical Quantiles', fontsize=12)
            axes[1,1].set_ylabel('Sample Quantiles', fontsize=12)

        df = result.get('degrees_of_freedom')
        if df and df > 0 and np.isfinite(df):
            x = np.linspace(-4, 4, 500)
            y = t.pdf(x, df)
            axes[1, 0].plot(x, y, label=f't-distribution (df={df:.1f})', color='#5B9BD5')
            axes[1, 0].axvline(result['t_statistic'], color='red', linestyle='--', label=f"t-stat = {result['t_statistic']:.2f}")
            axes[1, 0].set_title('Test Statistic on t-Distribution', fontsize=12, fontweight='bold')
            axes[1, 0].set_xlabel('t-value', fontsize=12)
            axes[1, 0].set_ylabel('Density', fontsize=12)
            axes[1, 0].legend()
            axes[1,0].fill_between(x, 0, y, where=(x >= abs(result['t_statistic'])) | (x <= -abs(result['t_statistic'])), color='red', alpha=0.3)
        else:
            axes[1, 0].text(0.5, 0.5, "Could not plot t-distribution.", ha='center', va='center')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        test_type = payload.get('testType')
        params = payload.get('params')
        
        tester = TTestAnalysis(data)
        result = {}
        
        if test_type == 'one_sample':
            result = tester.one_sample_ttest(**params)
        elif test_type == 'independent_samples':
            # Remove equal_var from params as it's now determined internally
            params.pop('equal_var', None)
            result = tester.independent_samples_ttest(**params)
        elif test_type == 'paired_samples':
            result = tester.paired_samples_ttest(**params)
        else:
             raise ValueError(f"Unknown test type: {test_type}")

        plot_image = tester.plot_results(test_type)
        response = {'results': result, 'plot': plot_image}
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    