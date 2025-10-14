
import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
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

        # --- Data Preparation for Logistic Regression ---
        y = df['chosen']
        
        X_list = []
        feature_names = []
        original_levels_map = {}
        
        for attr_name, props in attributes.items():
            if props.get('includeInAnalysis', True):
                if props['type'] == 'categorical':
                    df[attr_name] = df[attr_name].astype('category')
                    levels = df[attr_name].cat.categories
                    original_levels_map[attr_name] = levels.tolist()
                    
                    # Create dummy variables, dropping one level as baseline
                    dummies = pd.get_dummies(df[attr_name], prefix=attr_name, drop_first=True).astype(int)
                    X_list.append(dummies)
                    feature_names.extend(dummies.columns.tolist())
        
        if not X_list:
            raise ValueError("No valid features for analysis.")

        X = pd.concat(X_list, axis=1)

        # --- Aggregate Logit Model ---
        model = LogisticRegression(fit_intercept=True, solver='liblinear', random_state=42)
        model.fit(X, y)
        
        # --- Part-Worths Calculation ---
        part_worths = []
        # Add intercept as the base utility
        part_worths.append({'attribute': 'Base', 'level': 'Intercept', 'value': model.intercept_[0]})

        coeff_map = dict(zip(X.columns, model.coef_[0]))
        
        total_utility_range = {}

        for attr_name, levels in original_levels_map.items():
            # The baseline level (first one) has a part-worth of 0 relative to other levels
            base_level_worth = 0
            part_worths.append({'attribute': attr_name, 'level': levels[0], 'value': base_level_worth})
            
            level_utilities = [base_level_worth]
            
            # Other levels' part-worths are their coefficients
            for level in levels[1:]:
                feature_name = f"{attr_name}_{level}"
                utility = coeff_map.get(feature_name, 0)
                part_worths.append({'attribute': attr_name, 'level': level, 'value': utility})
                level_utilities.append(utility)

            # Calculate range for importance
            total_utility_range[attr_name] = max(level_utilities) - min(level_utilities)
        
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
                'coefficients': {**{'intercept': model.intercept_[0]}, **coeff_map}
            },
        }

        print(json.dumps({'results': final_results}, default=_to_native_type))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
