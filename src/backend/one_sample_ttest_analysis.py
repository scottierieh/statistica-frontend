import sys
import json
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from io import BytesIO

def one_sample_ttest(data_series, test_mean):
    """Performs a one-sample t-test and returns detailed results."""
    
    # --- Core Calculation ---
    t_statistic, p_value = stats.ttest_1samp(data_series, test_mean, nan_policy='omit')
    
    # --- Descriptive Statistics ---
    n = len(data_series)
    mean = np.mean(data_series)
    std_dev = np.std(data_series, ddof=1)
    std_err = std_dev / np.sqrt(n)
    
    # --- Effect Size ---
    cohens_d = (mean - test_mean) / std_dev if std_dev > 0 else 0
    
    if abs(cohens_d) < 0.2:
        interpretation = 'Trivial'
    elif abs(cohens_d) < 0.5:
        interpretation = 'Small'
    elif abs(cohens_d) < 0.8:
        interpretation = 'Medium'
    else:
        interpretation = 'Large'

    # --- Confidence Interval ---
    confidence_level = 0.95
    df = n - 1
    t_critical = stats.t.ppf((1 + confidence_level) / 2, df)
    margin_of_error = t_critical * std_err
    ci_lower = mean - margin_of_error
    ci_upper = mean + margin_of_error
    
    results = {
        'summary_stats': {
            'N': n,
            'Mean': mean,
            'Std. Dev.': std_dev,
            'Std. Error': std_err,
        },
        't_test': {
            't-statistic': t_statistic,
            'df': df,
            'p-value': p_value,
            'Test Mean': test_mean
        },
        'confidence_interval': {
            'CI_lower': ci_lower,
            'CI_upper': ci_upper,
            'Confidence Level': f"{confidence_level*100}%"
        },
        'effect_size': {
            'Cohen\'s d': cohens_d,
            'Interpretation': interpretation
        }
    }
    return results

def create_plot(data_series, test_mean, variable_name):
    """Generates a distribution plot with the test mean indicated."""
    plt.figure(figsize=(10, 6))
    
    sns.histplot(data_series, kde=True, color='skyblue', label='Sample Distribution')
    
    plt.axvline(np.mean(data_series), color='blue', linestyle='--', linewidth=2, label=f'Sample Mean ({np.mean(data_series):.2f})')
    plt.axvline(test_mean, color='red', linestyle='-', linewidth=2, label=f'Test Mean ({test_mean})')
    
    plt.title(f'Distribution of {variable_name} vs. Test Mean', fontsize=16)
    plt.xlabel(variable_name, fontsize=12)
    plt.ylabel('Frequency', fontsize=12)
    plt.legend()
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plot_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()
    
    return {'distribution_plot': plot_base64}

def main():
    try:
        input_data = json.loads(sys.stdin.read())
        
        df = pd.DataFrame(input_data['data'])
        variable = input_data['variable']
        test_mean = float(input_data['test_mean'])
        
        if variable not in df.columns:
            raise ValueError(f"Variable '{variable}' not found in data.")
            
        data_series = df[variable].dropna()
        
        if len(data_series) < 2:
            raise ValueError("Not enough data points to perform the test.")

        results = one_sample_ttest(data_series, test_mean)
        plots = create_plot(data_series, test_mean, variable)
        
        output = {'results': results, 'plots': plots}
        print(json.dumps(output, allow_nan=True))

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
