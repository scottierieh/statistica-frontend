import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import t, shapiro
import warnings
import io
import base64
import math

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)


def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization."""
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


def get_effect_size_interpretation(d: float) -> str:
    """Interpret Cohen's d effect size."""
    abs_d = abs(d)
    if abs_d >= 0.8:
        return "large"
    elif abs_d >= 0.5:
        return "medium"
    elif abs_d >= 0.2:
        return "small"
    else:
        return "negligible"


class OneSampleTTest:
    """One-sample t-test analysis class."""
    
    def __init__(self, data: pd.DataFrame, alpha: float = 0.05):
        self.data = data.copy()
        self.alpha = alpha
        self.result = None
        
    def run_test(self, variable: str, test_value: float, alternative: str = 'two-sided') -> dict:
        """
        Perform one-sample t-test.
        
        Parameters:
        -----------
        variable : str
            Name of the numeric variable to test
        test_value : float
            Hypothesized population mean (μ₀)
        alternative : str
            Alternative hypothesis: 'two-sided', 'greater', or 'less'
            
        Returns:
        --------
        dict : Test results including statistics, p-value, effect size, etc.
        """
        # Track original indices for missing value reporting
        original_data = self.data[[variable]].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop NA and track which rows were dropped
        clean_data = original_data.dropna()
        dropped_indices = list(set(range(len(original_data))) - set(clean_data['original_index']))
        
        data_values = clean_data[variable].values
        
        if len(data_values) < 2:
            raise ValueError("Not enough valid data for the specified variable (minimum 2 required).")
        
        # Calculate descriptive statistics
        n = len(data_values)
        sample_mean = np.mean(data_values)
        sample_std = np.std(data_values, ddof=1)
        standard_error = sample_std / np.sqrt(n) if n > 0 else 0
        
        # Normality test (Shapiro-Wilk)
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
        
        # Perform t-test
        t_stat, p_value = stats.ttest_1samp(data_values, test_value, alternative=alternative)
        df = n - 1
        
        # Confidence interval for the mean
        if df > 0:
            ci_lower, ci_upper = t.interval(1 - self.alpha, df, loc=sample_mean, scale=standard_error)
        else:
            ci_lower, ci_upper = np.nan, np.nan
        
        # Effect size (Cohen's d)
        cohens_d = (sample_mean - test_value) / sample_std if sample_std > 0 else 0
        
        # Standard error of difference (same as SE of mean for one-sample)
        se_diff = standard_error
        
        # Descriptive statistics
        descriptives = {
            variable: {
                "n": n,
                "mean": sample_mean,
                "std_dev": sample_std,
                "se_mean": standard_error
            }
        }
        
        # Compile results
        self.result = {
            'test_type': 'one_sample',
            'variable': variable,
            'test_value': test_value,
            'n': n,
            'sample_mean': sample_mean,
            'se_diff': se_diff,
            't_statistic': t_stat,
            'degrees_of_freedom': df,
            'p_value': p_value,
            'significant': p_value < self.alpha,
            'confidence_interval': (ci_lower, ci_upper),
            'cohens_d': cohens_d,
            'descriptives': descriptives,
            'data_values': data_values,
            'normality_test': normality_test,
            'dropped_rows': dropped_indices,
            'n_dropped': len(dropped_indices)
        }
        
        # Generate interpretation
        self.result['interpretation'] = self._generate_interpretation()
        
        return self.result
    
    def _generate_interpretation(self) -> str:
        """Generate human-readable interpretation of the test results."""
        res = self.result
        
        p_text = "p < .001" if res['p_value'] < 0.001 else f"p = {res['p_value']:.3f}"
        sig_text = "statistically significant" if res['significant'] else "not statistically significant"
        effect_interp = get_effect_size_interpretation(res['cohens_d'])
        
        m = res['sample_mean']
        sd = res['descriptives'][res['variable']]['std_dev']

        interpretation = (
            f"A one-sample t-test was conducted to determine whether the mean of "
            f"'{res['variable']}' was different from the test value of {res['test_value']}.\n\n"
            f"There was a {sig_text} difference between the sample mean (M={m:.2f}, SD={sd:.2f}) "
            f"and the test value of {res['test_value']}, "
            f"t({res['degrees_of_freedom']}) = {res['t_statistic']:.2f}, {p_text}.\n\n"
        )
        
        ci = res['confidence_interval']
        interpretation += (
            f"The 95% confidence interval for the mean is [{ci[0]:.2f}, {ci[1]:.2f}]. "
        )
        
        if not (ci[0] <= res['test_value'] <= ci[1]):
            interpretation += (
                f"Since this interval does not contain the test value of {res['test_value']}, "
                f"the result is significant.\n\n"
            )
        else:
            interpretation += (
                f"Since this interval contains the test value of {res['test_value']}, "
                f"the result is not significant.\n\n"
            )

        interpretation += (
            f"The calculated Cohen's d of {res['cohens_d']:.3f} indicates a {effect_interp} effect size."
        )
        
        return interpretation.strip()
    
    def plot_results(self, figsize: tuple = (12, 10)) -> str:
        """
        Generate visualization plots for the test results.
        
        Returns:
        --------
        str : Base64 encoded PNG image
        """
        if self.result is None:
            return None
            
        result = self.result
        fig, axes = plt.subplots(2, 2, figsize=figsize)
        
        # Plot 1: Histogram with distribution
        sns.histplot(result['data_values'], ax=axes[0, 0], color='#5B9BD5', kde=True)
        axes[0, 0].axvline(
            result['sample_mean'], 
            color='red', 
            linestyle='--', 
            label=f'Sample Mean ({result["sample_mean"]:.2f})'
        )
        axes[0, 0].axvline(
            result['test_value'], 
            color='orange', 
            linestyle='--', 
            label=f'Test Value ({result["test_value"]})'
        )
        axes[0, 0].set_title('Data Distribution', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel('Value', fontsize=12)
        axes[0, 0].set_ylabel('Frequency', fontsize=12)
        axes[0, 0].legend()
        
        # Plot 2: Q-Q Plot for normality check
        stats.probplot(result['data_values'], dist="norm", plot=axes[0, 1])
        axes[0, 1].set_title('Q-Q Plot', fontsize=12, fontweight='bold')
        axes[0, 1].set_xlabel('Theoretical Quantiles', fontsize=12)
        axes[0, 1].set_ylabel('Sample Quantiles', fontsize=12)

        # Plot 3: T-distribution with test statistic
        df = result['degrees_of_freedom']
        if df > 0 and np.isfinite(df):
            x = np.linspace(-4, 4, 500)
            y = t.pdf(x, df)
            axes[1, 0].plot(x, y, label=f't-distribution (df={df:.0f})', color='#5B9BD5')
            axes[1, 0].axvline(
                result['t_statistic'], 
                color='red', 
                linestyle='--', 
                label=f"t-stat = {result['t_statistic']:.2f}"
            )
            axes[1, 0].set_title('Test Statistic on t-Distribution', fontsize=12, fontweight='bold')
            axes[1, 0].set_xlabel('t-value', fontsize=12)
            axes[1, 0].set_ylabel('Density', fontsize=12)
            axes[1, 0].legend()
            
            # Shade rejection regions
            axes[1, 0].fill_between(
                x, 0, y, 
                where=(x >= abs(result['t_statistic'])) | (x <= -abs(result['t_statistic'])), 
                color='red', 
                alpha=0.3
            )
        else:
            axes[1, 0].text(0.5, 0.5, "Could not plot t-distribution.", ha='center', va='center')

        # Plot 4: Box Plot
        sns.boxplot(x=result['data_values'], ax=axes[1, 1], color='#5B9BD5')
        axes[1, 1].axvline(
            result['test_value'], 
            color='orange', 
            linestyle='--', 
            label=f'Test Value ({result["test_value"]})'
        )
        axes[1, 1].set_title('Box Plot', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Value', fontsize=12)
        axes[1, 1].legend()
        
        plt.tight_layout()
        
        # Convert to base64
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"


def main():
    """Main entry point for the script."""
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        params = payload.get('params', {})
        
        # Extract parameters
        variable = params.get('variable')
        test_value = params.get('test_value', 0)
        alternative = params.get('alternative', 'two-sided')
        
        # Run analysis
        tester = OneSampleTTest(data)
        result = tester.run_test(
            variable=variable,
            test_value=test_value,
            alternative=alternative
        )
        
        # Generate plot
        plot_image = tester.plot_results()
        
        # Prepare response
        response = {
            'results': result,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()