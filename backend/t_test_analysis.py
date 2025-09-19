
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
        data_values = self.data[variable].dropna().values
        
        if len(data_values) < 2:
            raise ValueError("Not enough valid data for the specified variable (minimum 2 required).")
        
        n = len(data_values)
        sample_mean = np.mean(data_values)
        sample_std = np.std(data_values, ddof=1)
        standard_error = sample_std / np.sqrt(n) if n > 0 else 0
        
        t_stat, p_value = stats.ttest_1samp(data_values, test_value, alternative=alternative)
        df = n - 1
        
        ci_lower, ci_upper = t.interval(1 - self.alpha, df, loc=sample_mean, scale=standard_error) if df > 0 else (np.nan, np.nan)
        
        cohens_d = (sample_mean - test_value) / sample_std if sample_std > 0 else 0
        
        descriptives = {
            variable: { "n": n, "mean": sample_mean, "std_dev": sample_std, "se_mean": standard_error }
        }
        
        result = {
            'test_type': 'one_sample', 'variable': variable, 'test_value': test_value, 'n': n,
            'sample_mean': sample_mean, 't_statistic': t_stat, 'degrees_of_freedom': df,
            'p_value': p_value, 'significant': p_value < self.alpha, 'confidence_interval': (ci_lower, ci_upper),
            'cohens_d': cohens_d, 'descriptives': descriptives, 'data_values': data_values
        }
        result['interpretation'] = self._generate_interpretation(result)
        self.results['one_sample'] = result
        return result
    
    def independent_samples_ttest(self, variable, group_variable, alternative='two-sided'):
        clean_data = self.data[[variable, group_variable]].dropna()
        groups = clean_data[group_variable].unique()
        
        if len(groups) != 2:
            raise ValueError(f"Grouping variable must have exactly 2 groups, found {len(groups)}")
        
        group1_data = clean_data[clean_data[group_variable] == groups[0]][variable].values
        group2_data = clean_data[clean_data[group_variable] == groups[1]][variable].values
        
        # Levene's test for homogeneity of variances
        levene_stat, levene_p = stats.levene(group1_data, group2_data)
        equal_var = levene_p > self.alpha

        n1, n2 = len(group1_data), len(group2_data)
        mean1, mean2 = np.mean(group1_data), np.mean(group2_data)
        std1, std2 = np.std(group1_data, ddof=1), np.std(group2_data, ddof=1)
        
        t_stat, p_value = stats.ttest_ind(group1_data, group2_data, equal_var=equal_var, alternative=alternative)
        
        if equal_var:
            df = n1 + n2 - 2
            pooled_std = np.sqrt(((n1-1)*std1**2 + (n2-1)*std2**2) / df) if df > 0 else 0
            cohens_d = (mean1 - mean2) / pooled_std if pooled_std > 0 else 0
        else: # Welch's t-test
            s1_sq_n1 = std1**2 / n1 if n1 > 0 else 0
            s2_sq_n2 = std2**2 / n2 if n2 > 0 else 0
            df_num = (s1_sq_n1 + s2_sq_n2)**2
            df_den = ((s1_sq_n1**2/(n1-1)) + (s2_sq_n2**2/(n2-1))) if n1 > 1 and n2 > 1 else np.inf
            df = df_num / df_den if df_den > 0 else np.inf
            pooled_std = np.sqrt((std1**2 + std2**2) / 2) # For Cohen's d in Welch's
            cohens_d = (mean1 - mean2) / pooled_std if pooled_std > 0 else 0
        
        descriptives = {
            str(groups[0]): {"n": n1, "mean": mean1, "std_dev": std1},
            str(groups[1]): {"n": n2, "mean": mean2, "std_dev": std2}
        }
            
        result = {
            'test_type': 'independent_samples', 'variable': variable, 'group_variable': group_variable, 'groups': list(groups), 'equal_var': equal_var,
            'n1': n1, 'n2': n2, 'mean1': mean1, 'mean2': mean2, 'std1': std1, 'std2': std2,
            't_statistic': t_stat, 'degrees_of_freedom': df, 'p_value': p_value, 'significant': p_value < self.alpha,
            'cohens_d': cohens_d, 'descriptives': descriptives,
            'levene_test': {'statistic': levene_stat, 'p_value': levene_p, 'assumption_met': equal_var},
            'data1': group1_data, 'data2': group2_data
        }
        result['interpretation'] = self._generate_interpretation(result)
        self.results['independent_samples'] = result
        return result
    
    def paired_samples_ttest(self, variable1, variable2, alternative='two-sided'):
        clean_data = self.data[[variable1, variable2]].dropna()
        if len(clean_data) < 2: raise ValueError("Not enough complete pairs found (minimum 2).")
        
        data1 = clean_data[variable1].values
        data2 = clean_data[variable2].values
        
        t_stat, p_value = stats.ttest_rel(data1, data2, alternative=alternative)
        
        differences = data1 - data2
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
            'test_type': 'paired_samples', 'variable1': variable1, 'variable2': variable2, 'n': n,
            'mean_diff': mean_diff, 't_statistic': t_stat, 'degrees_of_freedom': df, 'p_value': p_value,
            'significant': p_value < self.alpha, 'cohens_d': cohens_d, 'confidence_interval': (ci_lower, ci_upper),
            'descriptives': descriptives, 'data1': data1, 'data2': data2, 'differences': differences
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
            f"A one-sample t-test was run to determine whether the mean of '{res['variable']}' was different from the test value of {res['test_value']}.\n"
            f"The sample mean (M={m:.2f}, SD={sd:.2f}) was found to be {sig_text}ly different from {res['test_value']}, "
            f"t({res['degrees_of_freedom']}) = {res['t_statistic']:.2f}, {p_text}.\n"
        )
        
        ci = res['confidence_interval']
        interpretation += (
            f"The 95% confidence interval for the mean is [{ci[0]:.2f}, {ci[1]:.2f}].\n"
        )
        if not (ci[0] <= res['test_value'] <= ci[1]):
             interpretation += f"Since this interval does not contain the test value of {res['test_value']}, the result is significant.\n"
        else:
             interpretation += f"Since this interval contains the test value of {res['test_value']}, the result is not significant.\n"


        interpretation += f"The calculated Cohen's d of {res['cohens_d']:.3f} indicates a {effect_interp} effect size."
        
        return interpretation.strip()

    def _interpret_independent_ttest(self, res):
        p_text = f"p < .001" if res['p_value'] < 0.001 else f"p = {res['p_value']:.3f}"
        sig_text = "statistically significant" if res['significant'] else "not statistically significant"
        effect_interp = get_effect_size_interpretation(res['cohens_d'])

        g1, g2 = res['groups']
        m1, sd1 = res['descriptives'][str(g1)]['mean'], res['descriptives'][str(g1)]['std_dev']
        m2, sd2 = res['descriptives'][str(g2)]['mean'], res['descriptives'][str(g2)]['std_dev']

        interpretation = (
            f"An independent-samples t-test was conducted to compare '{res['variable']}' between two groups: '{g1}' and '{g2}'.\n"
        )
        
        levene_p = res['levene_test']['p_value']
        if levene_p > self.alpha:
            interpretation += f"Levene's test for equality of variances was not significant (p = {levene_p:.3f}), so equal variances were assumed.\n"
        else:
            interpretation += f"Levene's test was significant (p = {levene_p:.3f}), so equal variances were not assumed (Welch's t-test was used).\n"

        interpretation += (
            f"There was a {sig_text} difference in the scores for '{g1}' (M={m1:.2f}, SD={sd1:.2f}) and '{g2}' (M={m2:.2f}, SD={sd2:.2f}); "
            f"t({res['degrees_of_freedom']:.2f}) = {res['t_statistic']:.2f}, {p_text}.\n"
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
            f"A paired-samples t-test was conducted to compare '{res['variable1']}' and '{res['variable2']}'.\n"
            f"There was a {sig_text} difference in the scores for '{res['variable1']}' (M={m1:.2f}, SD={sd1:.2f}) and '{res['variable2']}' (M={m2:.2f}, SD={sd2:.2f}); t({res['degrees_of_freedom']}) = {res['t_statistic']:.2f}, {p_text}.\n"
        )
        
        mean_diff = res['mean_diff']
        ci = res['confidence_interval']
        interpretation += (
            f"The mean difference was {mean_diff:.2f}, with a 95% confidence interval ranging from {ci[0]:.2f} to {ci[1]:.2f}.\n"
            f"This result suggests that the effect is {sig_text}.\n"
        )

        interpretation += f"The calculated Cohen's d of {res['cohens_d']:.3f} indicates a {effect_interp} effect size."
        
        return interpretation.strip()

    def plot_results(self, test_type=None, figsize=(10, 8)):
        if not self.results: return None
        test_type = test_type or list(self.results.keys())[0]
        result = self.results.get(test_type)
        if not result: return None

        fig, axes = plt.subplots(2, 2, figsize=figsize)
        
        if test_type == 'one_sample':
            axes[0, 0].hist(result['data_values'], bins=20, alpha=0.7, color='skyblue', edgecolor='black')
            axes[0, 0].axvline(result['sample_mean'], color='red', linestyle='--', label=f'Sample Mean ({result["sample_mean"]:.2f})')
            axes[0, 0].axvline(result['test_value'], color='orange', linestyle='--', label=f'Test Value ({result["test_value"]})')
            axes[0, 0].set_title('Data Distribution')
            axes[0, 0].legend()
            
            stats.probplot(result['data_values'], dist="norm", plot=axes[0, 1])
            axes[0, 1].set_title('Q-Q Plot')

        elif test_type == 'independent_samples':
            sns.histplot(result['data1'], ax=axes[0,0], color='skyblue', label=str(result['groups'][0]), kde=True)
            sns.histplot(result['data2'], ax=axes[0,0], color='lightcoral', label=str(result['groups'][1]), kde=True)
            axes[0,0].set_title('Group Distributions')
            axes[0,0].legend()
            
            sns.boxplot(data=[result['data1'], result['data2']], ax=axes[0,1], palette=['skyblue', 'lightcoral'])
            axes[0,1].set_xticklabels(result['groups'])
            axes[0,1].set_title('Group Boxplots')

        elif test_type == 'paired_samples':
            min_val = min(np.min(result['data1']), np.min(result['data2'])) if len(result['data1']) > 0 and len(result['data2']) > 0 else 0
            max_val = max(np.max(result['data1']), np.max(result['data2'])) if len(result['data1']) > 0 and len(result['data2']) > 0 else 1
            
            axes[0, 0].scatter(result['data1'], result['data2'], alpha=0.6)
            axes[0, 0].plot([min_val, max_val], [min_val, max_val], 'r--')
            axes[0, 0].set_xlabel(result['variable1'])
            axes[0, 0].set_ylabel(result['variable2'])
            axes[0, 0].set_title('Before vs After')

            sns.histplot(result['differences'], ax=axes[0,1], color='lightgreen', kde=True)
            axes[0,1].axvline(0, color='black', linestyle='--')
            axes[0,1].set_title('Distribution of Differences')

        df = result.get('degrees_of_freedom')
        if df and df > 0 and np.isfinite(df):
            x = np.linspace(-4, 4, 500)
            y = t.pdf(x, df)
            axes[1, 0].plot(x, y, label=f't-distribution (df={df:.1f})')
            axes[1, 0].axvline(result['t_statistic'], color='red', linestyle='--', label=f"t-stat = {result['t_statistic']:.2f}")
            axes[1, 0].set_title('Test Statistic on t-Distribution')
            axes[1, 0].legend()
        else:
            axes[1, 0].text(0.5, 0.5, "Could not plot t-distribution.", ha='center', va='center')

        
        axes[1,1].axis('off')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
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

      

    