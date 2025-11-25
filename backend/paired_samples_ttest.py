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


class PairedSamplesTTest:
    """Paired samples t-test analysis class."""
    
    def __init__(self, data: pd.DataFrame, alpha: float = 0.05):
        self.data = data.copy()
        self.alpha = alpha
        self.result = None
        
    def run_test(self, variable1: str, variable2: str, alternative: str = 'two-sided') -> dict:
        """
        Perform paired samples t-test.
        
        Parameters:
        -----------
        variable1 : str
            Name of the first numeric variable (e.g., pre-test)
        variable2 : str
            Name of the second numeric variable (e.g., post-test)
        alternative : str
            Alternative hypothesis: 'two-sided', 'greater', or 'less'
            
        Returns:
        --------
        dict : Test results including statistics, p-value, effect size, etc.
        """
        # Track original indices for missing value reporting
        original_data = self.data[[variable1, variable2]].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop NA and track which rows were dropped
        clean_data = original_data.dropna()
        dropped_indices = list(set(range(len(original_data))) - set(clean_data['original_index']))
        
        if len(clean_data) < 2:
            raise ValueError("Not enough complete pairs found (minimum 2).")
        
        data1 = clean_data[variable1].values
        data2 = clean_data[variable2].values
        
        # Calculate differences
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
        
        # Perform paired t-test
        t_stat, p_value = stats.ttest_rel(data1, data2, alternative=alternative)
        
        # Calculate statistics
        n = len(differences)
        df = n - 1
        mean_diff = np.mean(differences)
        std_diff = np.std(differences, ddof=1)
        se_diff = std_diff / np.sqrt(n) if n > 0 else 0
        
        # Confidence interval for the mean difference
        if df > 0:
            ci_lower, ci_upper = t.interval(1 - self.alpha, df, loc=mean_diff, scale=se_diff)
        else:
            ci_lower, ci_upper = np.nan, np.nan
        
        # Effect size (Cohen's d for paired samples)
        cohens_d = mean_diff / std_diff if std_diff > 0 else 0
        
        # Descriptive statistics
        descriptives = {
            variable1: {
                "n": len(data1),
                "mean": np.mean(data1),
                "std_dev": np.std(data1, ddof=1)
            },
            variable2: {
                "n": len(data2),
                "mean": np.mean(data2),
                "std_dev": np.std(data2, ddof=1)
            },
            "differences": {
                "n": n,
                "mean": mean_diff,
                "std_dev": std_diff
            }
        }
        
        # Compile results
        self.result = {
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
        
        # Generate interpretation
        self.result['interpretation'] = self._generate_interpretation()
        
        return self.result
    
    def _generate_interpretation(self) -> str:
        """Generate human-readable interpretation of the test results."""
        res = self.result
        
        p_text = "p < .001" if res['p_value'] < 0.001 else f"p = {res['p_value']:.3f}"
        sig_text = "statistically significant" if res['significant'] else "not statistically significant"
        effect_interp = get_effect_size_interpretation(res['cohens_d'])

        m1 = res['descriptives'][res['variable1']]['mean']
        sd1 = res['descriptives'][res['variable1']]['std_dev']
        m2 = res['descriptives'][res['variable2']]['mean']
        sd2 = res['descriptives'][res['variable2']]['std_dev']
        
        interpretation = (
            f"A paired-samples t-test was conducted to compare '{res['variable1']}' and '{res['variable2']}'.\n\n"
            f"There was a {sig_text} difference between '{res['variable1']}' (M={m1:.2f}, SD={sd1:.2f}) "
            f"and '{res['variable2']}' (M={m2:.2f}, SD={sd2:.2f}), "
            f"t({res['degrees_of_freedom']}) = {res['t_statistic']:.2f}, {p_text}.\n\n"
        )
        
        mean_diff = res['mean_diff']
        ci = res['confidence_interval']
        interpretation += (
            f"The mean difference was {mean_diff:.2f}, with a 95% confidence interval of "
            f"[{ci[0]:.2f}, {ci[1]:.2f}]. This result suggests that the effect is {sig_text}.\n\n"
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
        
        # Plot 1: Paired variables distribution (box plot)
        sns.boxplot(data=[result['data1'], result['data2']], ax=axes[0, 0], 
                    palette=['#5B9BD5', '#F4A582'])
        axes[0, 0].set_xticklabels([result['variable1'], result['variable2']])
        axes[0, 0].set_title('Paired Variables Distribution', fontsize=12, fontweight='bold')
        axes[0, 0].set_ylabel('Value', fontsize=12)

        # Plot 2: Distribution of differences
        sns.histplot(result['differences'], ax=axes[0, 1], color='#5B9BD5', kde=True)
        axes[0, 1].axvline(0, color='black', linestyle='--', label='No difference')
        axes[0, 1].axvline(result['mean_diff'], color='red', linestyle='--', 
                          label=f'Mean diff = {result["mean_diff"]:.2f}')
        axes[0, 1].set_title('Distribution of Differences', fontsize=12, fontweight='bold')
        axes[0, 1].set_xlabel('Difference (Var1 - Var2)', fontsize=12)
        axes[0, 1].set_ylabel('Frequency', fontsize=12)
        axes[0, 1].legend()

        # Plot 3: T-distribution with test statistic
        df = result['degrees_of_freedom']
        if df > 0 and np.isfinite(df):
            x = np.linspace(-4, 4, 500)
            y = t.pdf(x, df)
            axes[1, 0].plot(x, y, label=f't-distribution (df={df})', color='#5B9BD5')
            axes[1, 0].axvline(result['t_statistic'], color='red', linestyle='--', 
                              label=f"t-stat = {result['t_statistic']:.2f}")
            axes[1, 0].set_title('Test Statistic on t-Distribution', fontsize=12, fontweight='bold')
            axes[1, 0].set_xlabel('t-value', fontsize=12)
            axes[1, 0].set_ylabel('Density', fontsize=12)
            axes[1, 0].legend()
            axes[1, 0].fill_between(x, 0, y, 
                where=(x >= abs(result['t_statistic'])) | (x <= -abs(result['t_statistic'])), 
                color='red', alpha=0.3)
        else:
            axes[1, 0].text(0.5, 0.5, "Could not plot t-distribution.", ha='center', va='center')

        # Plot 4: Q-Q Plot of differences
        stats.probplot(result['differences'], dist="norm", plot=axes[1, 1])
        axes[1, 1].set_title('Q-Q Plot of Differences', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Theoretical Quantiles', fontsize=12)
        axes[1, 1].set_ylabel('Sample Quantiles', fontsize=12)
        
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
        variable1 = params.get('variable1')
        variable2 = params.get('variable2')
        alternative = params.get('alternative', 'two-sided')
        
        # Run analysis
        tester = PairedSamplesTTest(data)
        result = tester.run_test(
            variable1=variable1,
            variable2=variable2,
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

    