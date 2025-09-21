
import sys
import json
import numpy as np
import pandas as pd
import pingouin as pg
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
    return obj

def simulate_rm_anova_data(n_subjects=20, n_groups=2, n_times=3, mean_diff=0.5, sd=1.0, group_effect=0.5):
    """
    Simulates data for a repeated measures ANOVA.
    """
    subjects_per_group = n_subjects // n_groups
    data = []
    
    for g in range(n_groups):
        for s in range(subjects_per_group):
            subject_id = f"G{g+1}_S{s+1}"
            base_value = np.random.normal(0, sd) + g * group_effect
            
            row = {'Subject': subject_id, 'Group': f'Group {g+1}'}
            for t in range(n_times):
                time_effect = t * mean_diff
                noise = np.random.normal(0, sd)
                row[f'Time{t+1}'] = base_value + time_effect + noise
            data.append(row)
            
    return pd.DataFrame(data)

def main():
    try:
        payload = json.load(sys.stdin)
        
        n_subjects = int(payload.get('n_subjects', 40))
        n_groups = int(payload.get('n_groups', 2))
        n_times = int(payload.get('n_times', 3))
        effect_size = float(payload.get('effect_size', 0.5))
        group_effect = float(payload.get('group_effect', 0.8))

        # 1. Simulate Data
        df = simulate_rm_anova_data(n_subjects, n_groups, n_times, mean_diff=effect_size, group_effect=group_effect)
        
        # 2. Reshape data to long format for pingouin
        within_vars = [f'Time{i+1}' for i in range(n_times)]
        df_long = pd.melt(df, id_vars=['Subject', 'Group'], value_vars=within_vars,
                          var_name='Time', value_name='Score')

        # 3. Perform RM ANOVA
        aov = pg.rm_anova(data=df_long, dv='Score', within='Time', between='Group', subject='Subject', detailed=True)
        
        # 4. Post-hoc tests if there's a significant interaction
        posthoc = None
        interaction_p = aov[aov['Source'] == 'Time * Group']['p-GG-corr'].iloc[0]
        if interaction_p < 0.05:
            posthoc = pg.pairwise_ttests(data=df_long, dv='Score', within='Time', between='Group', subject='Subject', padjust='fdr_bh')

        response = {
            'simulated_data': df.to_dict('records'),
            'anova_results': aov.to_dict('records'),
            'posthoc_results': posthoc.to_dict('records') if posthoc is not None else None,
            'params': payload
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
