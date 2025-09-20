

import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats.anova import AnovaRM
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from itertools import combinations
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def repeated_measures_anova_statsmodels(data, subject_col, condition_col, value_col):
    """
    Statsmodels를 사용한 repeated measures ANOVA
    """
    aovrm = AnovaRM(data=data, depvar=value_col, subject=subject_col, within=[condition_col])
    res = aovrm.fit()
    return res

def post_hoc_pairwise_tests(data, subject_col, condition_col, value_col):
    """
    사후 검정 (Pairwise t-tests with Bonferroni correction)
    """
    from scipy.stats import ttest_rel
    
    conditions = data[condition_col].unique()
    pairs = list(combinations(conditions, 2))
    
    results = []
    
    for pair in pairs:
        cond1_data = data[data[condition_col] == pair[0]].sort_values(subject_col)[value_col].values
        cond2_data = data[data[condition_col] == pair[1]].sort_values(subject_col)[value_col].values
        
        t_stat, p_val = ttest_rel(cond1_data, cond2_data)
        
        results.append({
            'Comparison': f"{pair[0]} vs {pair[1]}",
            't-statistic': t_stat,
            'p-value': p_val,
            'p-value (Bonferroni)': p_val * len(pairs)
        })
    
    return pd.DataFrame(results)

def visualize_data(data, subject_col, condition_col, value_col):
    """
    데이터 시각화
    """
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    
    sns.boxplot(data=data, x=condition_col, y=value_col, ax=axes[0])
    axes[0].set_title('Boxplot by Condition')
    
    for subject in data[subject_col].unique():
        subject_data = data[data[subject_col] == subject]
        axes[1].plot(subject_data[condition_col], subject_data[value_col], 'o-', alpha=0.3, color='gray')
    
    mean_data = data.groupby(condition_col)[value_col].mean()
    axes[1].plot(mean_data.index, mean_data.values, 'ro-', linewidth=3, markersize=8)
    axes[1].set_title('Individual Trajectories + Mean')
    axes[1].set_ylabel(value_col)
    
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def check_assumptions(data, condition_col, value_col):
    """
    가정 검사
    """
    results = {}
    for condition in data[condition_col].unique():
        condition_data = data[data[condition_col] == condition][value_col]
        if len(condition_data) < 3: # Shapiro test requires at least 3 samples
            results[condition] = {'statistic': None, 'p_value': None, 'error': 'Not enough data for normality test'}
            continue
        stat, p_val = stats.shapiro(condition_data)
        results[condition] = {'statistic': stat, 'p_value': p_val}
    return results

def main():
    try:
        payload = json.load(sys.stdin)
        data_json = payload.get('data')
        subject_col = payload.get('subjectCol')
        within_cols = payload.get('withinCols')
        dependent_var = payload.get('dependentVar', 'measurement')
        between_col = payload.get('betweenCol') # Not used in this version, but kept for compatibility

        df = pd.DataFrame(data_json)

        # Reshape data from wide to long format
        id_vars = [subject_col]
        if between_col and between_col in df.columns:
            id_vars.append(between_col)

        long_df = pd.melt(df, 
                          id_vars=id_vars, 
                          value_vars=within_cols,
                          var_name='condition', 
                          value_name=dependent_var)

        # --- Analysis ---
        descriptives = long_df.groupby('condition')[dependent_var].describe().to_dict()
        assumption_results = check_assumptions(long_df, 'condition', dependent_var)
        sm_results = repeated_measures_anova_statsmodels(long_df, subject_col, 'condition', dependent_var)
        
        # Safely extract p-value to decide on post-hoc
        anova_summary = sm_results.summary().tables[0]
        try:
            main_effect_p_value = float(sm_results.anova_table['Pr(>F)'][0])
        except (KeyError, IndexError):
            main_effect_p_value = 1.0 # Default to non-significant if p-value can't be found

        posthoc_res = None
        if main_effect_p_value < 0.05:
            posthoc_res_df = post_hoc_pairwise_tests(long_df, subject_col, 'condition', dependent_var)
            posthoc_res = posthoc_res_df.to_dict('records')

        # --- Visualization ---
        plot_image = visualize_data(long_df, subject_col, 'condition', dependent_var)

        # --- Response Preparation ---
        sm_table_html = sm_results.summary().tables[0].as_html()
        sm_df = pd.read_html(sm_table_html, header=0, index_col=0)[0]

        response = {
            'results': {
                'descriptives': descriptives,
                'assumptions': assumption_results,
                'anova_table': sm_df.reset_index().to_dict('records'),
                'posthoc_results': posthoc_res
            },
            'plot': plot_image,
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
