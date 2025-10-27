
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return [_to_native_type(item) for item in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def perform_meta_analysis(studies):
    results = {}
    
    # Add weights and variance to studies
    for study in studies:
        study['variance'] = study['standardError'] ** 2
        study['weight'] = 1 / study['variance'] if study['variance'] > 0 else 0

    # Fixed-effect model
    total_weight_fixed = sum(s['weight'] for s in studies)
    weighted_effect_sum_fixed = sum(s['effectSize'] * s['weight'] for s in studies)
    
    pooled_effect_fixed = 0
    if total_weight_fixed > 0:
        pooled_effect_fixed = weighted_effect_sum_fixed / total_weight_fixed
        se_fixed = np.sqrt(1 / total_weight_fixed)
        z_fixed = pooled_effect_fixed / se_fixed
        p_fixed = 2 * (1 - stats.norm.cdf(abs(z_fixed)))
        ci_lower_fixed = pooled_effect_fixed - 1.96 * se_fixed
        ci_upper_fixed = pooled_effect_fixed + 1.96 * se_fixed
        results['fixedEffect'] = {
            'pooledEffect': pooled_effect_fixed, 'standardError': se_fixed,
            'lowerCI': ci_lower_fixed, 'upperCI': ci_upper_fixed,
            'zValue': z_fixed, 'pValue': p_fixed
        }
    else:
        results['fixedEffect'] = None

    # Heterogeneity (Q, I², τ²)
    q_statistic = sum(s['weight'] * ((s['effectSize'] - pooled_effect_fixed)**2) for s in studies) if total_weight_fixed > 0 else 0
    df = len(studies) - 1
    q_p_value = 1 - stats.chi2.cdf(q_statistic, df) if df > 0 else 1.0

    c_val = total_weight_fixed - (sum(s['weight']**2 for s in studies) / total_weight_fixed) if total_weight_fixed > 0 else 0
    tau_squared = max(0, (q_statistic - df) / c_val) if c_val > 0 else 0
    i_squared = max(0, (q_statistic - df) / q_statistic * 100) if q_statistic > 0 else 0

    results['heterogeneity'] = {
        'qStatistic': q_statistic, 'df': df, 'qPValue': q_p_value,
        'iSquared': i_squared, 'tauSquared': tau_squared
    }

    # Random-effects model
    for study in studies:
        study['random_weight'] = 1 / (study['variance'] + tau_squared) if (study['variance'] + tau_squared) > 0 else 0
    
    total_weight_random = sum(s['random_weight'] for s in studies)
    weighted_effect_sum_random = sum(s['effectSize'] * s['random_weight'] for s in studies)
    
    if total_weight_random > 0:
        pooled_effect_random = weighted_effect_sum_random / total_weight_random
        se_random = np.sqrt(1 / total_weight_random)
        z_random = pooled_effect_random / se_random
        p_random = 2 * (1 - stats.norm.cdf(abs(z_random)))
        ci_lower_random = pooled_effect_random - 1.96 * se_random
        ci_upper_random = pooled_effect_random + 1.96 * se_random
        results['randomEffect'] = {
            'pooledEffect': pooled_effect_random, 'standardError': se_random,
            'lowerCI': ci_lower_random, 'upperCI': ci_upper_random,
            'zValue': z_random, 'pValue': p_random
        }
    else:
        results['randomEffect'] = None

    # Publication Bias (Egger's test)
    precisions = [1 / s['standardError'] for s in studies]
    standardized_effects = [s['effectSize'] / s['standardError'] for s in studies]
    
    try:
        slope, intercept, r_value, p_value, std_err = stats.linregress(precisions, standardized_effects)
        results['publicationBias'] = {'intercept': intercept, 'pValue': p_value, 'significant': p_value < 0.1}
    except ValueError:
        results['publicationBias'] = {'intercept': None, 'pValue': None, 'significant': None}

    # Sensitivity Analysis
    sensitivity = []
    for i, study in enumerate(studies):
        remaining_studies = studies[:i] + studies[i+1:]
        if len(remaining_studies) > 1:
            try:
                rem_res = perform_meta_analysis(remaining_studies)
                sensitivity.append({'excluded_study': study['name'], 'fixed_effect': rem_res['fixedEffect']['pooledEffect'], 'random_effect': rem_res['randomEffect']['pooledEffect']})
            except:
                pass # Ignore if sub-analysis fails
    results['sensitivity'] = sensitivity

    return results

def main():
    try:
        payload = json.load(sys.stdin)
        studies = payload.get('studies')

        if not studies or len(studies) < 2:
            raise ValueError("At least two studies are required for meta-analysis.")

        analysis_results = perform_meta_analysis(studies)
        
        # Add studies with calculated weights to the final output
        analysis_results['studies'] = studies

        response = {
            'results': analysis_results
        }
        
        # Clean the final result of any non-compliant JSON values before dumping
        cleaned_result = json.loads(json.dumps(response, default=_to_native_type))
        
        print(json.dumps(cleaned_result))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
