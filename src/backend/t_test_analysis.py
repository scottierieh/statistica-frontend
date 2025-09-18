
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

class TTestAnalysis:
    def __init__(self, data, alpha=0.05):
        self.data = data.copy()
        self.alpha = alpha
        self.results = {}
        
    def one_sample_ttest(self, variable, test_value, alternative='two-sided'):
        data_values = self.data[variable].dropna().values
        
        if len(data_values) == 0:
            raise ValueError("No valid data found for the specified variable")
        
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
        return self.results['one_sample']

    def plot_results(self, test_type=None, figsize=(10, 8)):
        if not self.results: return None
        test_type = test_type or list(self.results.keys())[0]
        result = self.results.get(test_type)
        if not result: return None

        fig, axes = plt.subplots(1, 2, figsize=figsize)
        
        if test_type == 'one_sample':
            axes[0].hist(result['data_values'], bins=20, alpha=0.7, color='skyblue', edgecolor='black')
            axes[0].axvline(result['sample_mean'], color='red', linestyle='--', label=f'Sample Mean ({result["sample_mean"]:.2f})')
            axes[0].axvline(result['test_value'], color='orange', linestyle='--', label=f'Test Value ({result["test_value"]})')
            axes[0].set_title('Data Distribution')
            axes[0].legend()
            
            stats.probplot(result['data_values'], dist="norm", plot=axes[1])
            axes[1].set_title('Q-Q Plot')

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
        else:
             raise ValueError(f"Unknown or unsupported test type: {test_type}")

        plot_image = tester.plot_results(test_type)
        response = {'results': result, 'plot': plot_image}
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
