

import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss
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

        # --- Aggregate Logit Model ---
        model = LogisticRegression(fit_intercept=True, solver='liblinear', random_state=42)
        model.fit(X, y)
        
        # --- Part-Worths Calculation ---
        part_worths = []
        coeff_map = dict(zip(X.columns, model.coef_[0]))
        
        # Add intercept to represent the base utility
        part_worths.append({'attribute': 'Base', 'level': 'Intercept', 'value': model.intercept_[0]})
        
        total_utility_range = {}

        for attr_name, levels in original_levels_map.items():
            base_level_worth = 0
            part_worths.append({'attribute': attr_name, 'level': levels[0], 'value': base_level_worth})
            
            level_utilities = [base_level_worth]
            
            for level in levels[1:]:
                feature_name = f"{attr_name}_{level}"
                utility = coeff_map.get(feature_name, 0)
                part_worths.append({'attribute': attr_name, 'level': level, 'value': utility})
                level_utilities.append(utility)

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
        
        # --- Model Fit ---
        log_likelihood_full = -log_loss(y, model.predict_proba(X), normalize=False)
        log_likelihood_intercept = -log_loss(y, [y.mean()] * len(y), normalize=False)
        mcfadden_r2 = 1 - (log_likelihood_full / log_likelihood_intercept) if log_likelihood_intercept != 0 else 0

        final_results = {
            'partWorths': part_worths,
            'importance': importance,
            'regression': {
                'modelType': 'Aggregate Logit',
                'rSquared': mcfadden_r2,
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

