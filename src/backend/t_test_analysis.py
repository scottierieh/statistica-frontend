
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

def get_interpretations(result):
    test_type = result.get('test_type')
    p_val = result.get('p_value', 1.0)
    alpha = 0.05 # Assuming alpha is 0.05
    significant = p_val < alpha
    
    interpretations = {}

    if 't_statistic' in result:
        t_stat = result['t_statistic']
        interpretations['t_statistic'] = {
            "title": "t-statistic",
            "description": f"The t-statistic ({t_stat:.3f}) measures how many standard errors the sample mean is from the hypothesized mean (or from the other sample's mean). A larger absolute value indicates a larger difference relative to the variability in the data."
        }
    if 'p_value' in result:
        interpretations['p_value'] = {
            "title": "p-value",
            "description": f"The p-value ({p_val:.4f}) indicates the probability of observing a result as extreme as, or more extreme than, the one obtained, assuming the null hypothesis is true. Since p {'<' if significant else '>='} {alpha}, the result is considered statistically {'significant' if significant else 'not significant'}."
        }
    if 'degrees_of_freedom' in result:
        df = result['degrees_of_freedom']
        interpretations['degrees_of_freedom'] = {
            "title": "Degrees of Freedom (df)",
            "description": f"Degrees of freedom ({df:.0f}) represent the number of independent pieces of information used to calculate the statistic. It is related to the sample size."
        }
    if 'cohens_d' in result:
        cohens_d = result['cohens_d']
        abs_d = abs(cohens_d)
        if abs_d >= 0.8: interp = 'large'
        elif abs_d >= 0.5: interp = 'medium'
        elif abs_d >= 0.2: interp = 'small'
        else: interp = 'negligible'
        
        interpretations['cohens_d'] = {
            "title": "Cohen's d (Effect Size)",
            "description": f"Cohen's d ({cohens_d:.3f}) measures the standardized difference between two means. A value of {cohens_d:.3f} indicates a {interp} effect size. It helps assess the practical significance of the result, regardless of statistical significance."
        }
    
    return interpretations

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
            variable: {
                "n": n, "mean": sample_mean, "std_dev": sample_std
            }
        }
        
        self.results['one_sample'] = {
            'test_type': 'one_sample',
            'variable': variable,
            'test_value': test_value,
            'n': n,
            'sample_mean': sample_mean,
            't_statistic': t_stat,
            'degrees_of_freedom': df,
            'p_value': p_value,
            'significant': p_value < self.alpha,
            'confidence_interval': (ci_lower, ci_upper),
            'cohens_d': cohens_d,
            'descriptives': descriptives,
            'data_values': data_values
        }
        self.results['one_sample']['interpretations'] = get_interpretations(self.results['one_sample'])
        return self.results['one_sample']
    
    def independent_samples_ttest(self, variable, group_variable, equal_var=True, alternative='two-sided'):
        clean_data = self.data[[variable, group_variable]].dropna()
        groups = clean_data[group_variable].unique()
        
        if len(groups) != 2:
            raise ValueError(f"Grouping variable must have exactly 2 groups, found {len(groups)}")
        
        group1_data = clean_data[clean_data[group_variable] == groups[0]][variable].values
        group2_data = clean_data[clean_data[group_variable] == groups[1]][variable].values
        
        n1, n2 = len(group1_data), len(group2_data)
        mean1, mean2 = np.mean(group1_data), np.mean(group2_data)
        std1, std2 = np.std(group1_data, ddof=1), np.std(group2_data, ddof=1)
        
        t_stat, p_value = stats.ttest_ind(group1_data, group2_data, equal_var=equal_var, alternative=alternative)
        
        if equal_var:
            df = n1 + n2 - 2
            pooled_std = np.sqrt(((n1-1)*std1**2 + (n2-1)*std2**2) / df) if df > 0 else 0
            cohens_d = (mean1 - mean2) / pooled_std if pooled_std > 0 else 0
        else:
            s1_sq_n1 = std1**2 / n1 if n1 > 0 else 0
            s2_sq_n2 = std2**2 / n2 if n2 > 0 else 0
            df_num = (s1_sq_n1 + s2_sq_n2)**2
            df_den = ((s1_sq_n1**2/(n1-1)) + (s2_sq_n2**2/(n2-1))) if n1 > 1 and n2 > 1 else np.inf
            df = df_num / df_den if df_den > 0 else np.inf
            pooled_std = np.sqrt((std1**2 + std2**2) / 2)
            cohens_d = (mean1 - mean2) / pooled_std if pooled_std > 0 else 0
        
        descriptives = {
            str(groups[0]): {"n": n1, "mean": mean1, "std_dev": std1},
            str(groups[1]): {"n": n2, "mean": mean2, "std_dev": std2}
        }
            
        self.results['independent_samples'] = {
            'test_type': 'independent_samples', 'variable': variable, 'group_variable': group_variable, 'groups': list(groups), 'equal_var': equal_var,
            'n1': n1, 'n2': n2, 'mean1': mean1, 'mean2': mean2, 'std1': std1, 'std2': std2,
            't_statistic': t_stat, 'degrees_of_freedom': df, 'p_value': p_value, 'significant': p_value < self.alpha,
            'cohens_d': cohens_d, 'descriptives': descriptives,
            'data1': group1_data, 'data2': group2_data
        }
        self.results['independent_samples']['interpretations'] = get_interpretations(self.results['independent_samples'])
        return self.results['independent_samples']
    
    def paired_samples_ttest(self, variable1, variable2, alternative='two-sided'):
        clean_data = self.data[[variable1, variable2]].dropna()
        if len(clean_data) == 0: raise ValueError("No complete pairs found")
        
        data1 = clean_data[variable1].values
        data2 = clean_data[variable2].values
        
        t_stat, p_value = stats.ttest_rel(data1, data2, alternative=alternative)
        
        differences = data1 - data2
        n = len(differences)
        df = n - 1
        mean_diff = np.mean(differences)
        std_diff = np.std(differences, ddof=1)
        
        cohens_d = mean_diff / std_diff if std_diff > 0 else 0
        
        descriptives = {
            variable1: {"n": len(data1), "mean": np.mean(data1), "std_dev": np.std(data1, ddof=1)},
            variable2: {"n": len(data2), "mean": np.mean(data2), "std_dev": np.std(data2, ddof=1)},
            "differences": {"n": n, "mean": mean_diff, "std_dev": std_diff}
        }
        
        self.results['paired_samples'] = {
            'test_type': 'paired_samples', 'variable1': variable1, 'variable2': variable2, 'n': n,
            'mean_diff': mean_diff, 't_statistic': t_stat, 'degrees_of_freedom': df, 'p_value': p_value,
            'significant': p_value < self.alpha, 'cohens_d': cohens_d, 
            'descriptives': descriptives,
            'data1': data1, 'data2': data2, 'differences': differences
        }
        self.results['paired_samples']['interpretations'] = get_interpretations(self.results['paired_samples'])
        return self.results['paired_samples']

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
        if df and df > 0:
            x = np.linspace(-4, 4, 500)
            y = t.pdf(x, df)
            axes[1, 0].plot(x, y, label=f't-distribution (df={df:.1f})')
            axes[1, 0].axvline(result['t_statistic'], color='red', linestyle='--', label=f"t-stat = {result['t_statistic']:.2f}")
            axes[1, 0].set_title('Test Statistic on t-Distribution')
            axes[1, 0].legend()
        
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
