

import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss
import statsmodels.api as sm
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

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes = payload.get('attributes')
        scenarios = payload.get('scenarios')

        if not data or not attributes:
            raise ValueError("Missing 'data' or 'attributes'")
        
        df = pd.DataFrame(data)

        # Drop rows where 'chosen' is not 0 or 1, or is missing
        df = df[df['chosen'].isin([0, 1])]
        
        if df.empty:
            raise ValueError("No valid choice data found.")

        y = pd.to_numeric(df['chosen'], errors='coerce')

        X_list = []
        feature_names = []
        original_levels_map = {}
        
        independent_vars = list(attributes.keys())
        
        for attr_name, props in attributes.items():
            if props['type'] == 'categorical':
                df[attr_name] = df[attr_name].astype('category')
                levels = df[attr_name].cat.categories
                original_levels_map[attr_name] = levels.tolist()
                
                dummies = pd.get_dummies(df[attr_name], prefix=attr_name, drop_first=True).astype(int)
                X_list.append(dummies)
                feature_names.extend(dummies.columns.tolist())
        
        if not X_list:
            raise ValueError("No valid features for analysis.")

        X = pd.concat(X_list, axis=1)

        # Align data after potential row drops from 'chosen'
        X, y = X.align(y, join='inner', axis=0)

        # --- Aggregate Logit Model using Statsmodels ---
        X_const = sm.add_constant(X)
        logit_model = sm.Logit(y, X_const)
        result = logit_model.fit(disp=0)
        
        # --- Part-Worths Calculation (Zero-Centered) ---
        part_worths = []
        coeff_map = result.params.to_dict()
        
        total_utility_range = {}

        for attr_name, levels in original_levels_map.items():
            level_utilities = {}
            # Baseline level has utility of 0 in the model
            level_utilities[levels[0]] = 0
            
            # Get utilities for other levels from coefficients
            for level in levels[1:]:
                feature_name = f"{attr_name}_{level}"
                level_utilities[level] = coeff_map.get(feature_name, 0)
            
            # Zero-center the utilities for this attribute
            mean_utility = np.mean(list(level_utilities.values()))
            for level, utility in level_utilities.items():
                centered_utility = utility - mean_utility
                part_worths.append({'attribute': attr_name, 'level': level, 'value': centered_utility})
            
            # Calculate utility range for importance
            centered_utilities = [pw['value'] for pw in part_worths if pw['attribute'] == attr_name]
            total_utility_range[attr_name] = max(centered_utilities) - min(centered_utilities)
        
        # --- Importance Calculation ---
        total_range_sum = sum(total_utility_range.values())
        importance = []
        if total_range_sum > 0:
            for attr_name, range_val in total_utility_range.items():
                importance.append({
                    'attribute': attr_name,
                    'importance': (range_val / total_range_sum) * 100
                })
        importance.sort(key=lambda x: x['importance'], reverse=True)
        
        final_results = {
            'partWorths': part_worths,
            'importance': importance,
            'regression': {
                'modelType': 'Aggregate Logit',
                'log_likelihood': result.llf,
                'pseudo_r_squared': result.prsquared,
                'coefficients': result.params.to_dict(),
                'p_values': result.pvalues.to_dict(),
            },
        }

        print(json.dumps({'results': final_results}, default=_to_native_type))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()


