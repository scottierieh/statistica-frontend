

import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm

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

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        choice_col = payload.get('choice_col')
        attribute_cols = payload.get('attribute_cols')

        if not all([data, choice_col, attribute_cols]):
            raise ValueError("Missing required parameters")

        df = pd.DataFrame(data)

        # Ensure choice column is numeric
        y = pd.to_numeric(df[choice_col], errors='coerce').dropna()
        
        # One-hot encode attributes
        X = pd.get_dummies(df[attribute_cols], drop_first=True)
        X = sm.add_constant(X)

        # Align data
        X = X.loc[y.index]

        # Fit the OLS model
        model = sm.OLS(y, X).fit()
        
        # --- Regression Results ---
        regression_results = {
            'rSquared': model.rsquared,
            'adjustedRSquared': model.rsquared_adj,
            'rmse': np.sqrt(model.mse_resid),
            'mae': np.mean(np.abs(model.resid)),
            'predictions': model.predict().tolist(),
            'residuals': model.resid.tolist(),
            'intercept': model.params.get('const', 0.0),
            'coefficients': model.params.drop('const').to_dict()
        }

        # --- Part-Worths and Importance ---
        part_worths = []
        attribute_ranges = {}
        
        original_levels = {attr: df[attr].unique() for attr in attribute_cols}

        for attr_name in attribute_cols:
            levels = original_levels[attr_name]
            base_level = levels[0]
            part_worths.append({'attribute': attr_name, 'level': str(base_level), 'value': 0})
            
            level_worths = [0]
            for level in levels[1:]:
                param_name = f"{attr_name}_{level}"
                worth = regression_results['coefficients'].get(param_name, 0)
                part_worths.append({'attribute': attr_name, 'level': str(level), 'value': worth})
                level_worths.append(worth)
            
            attribute_ranges[attr_name] = max(level_worths) - min(level_worths)
        
        total_range = sum(attribute_ranges.values())
        importance_list = []
        if total_range > 0:
            for attr, rng in attribute_ranges.items():
                importance_list.append({
                    'attribute': attr,
                    'importance': (rng / total_range) * 100
                })
        
        model_fit_summary = {
            'llf': model.llf,
            'f_pvalue': model.f_pvalue,
            'aic': model.aic,
            'bic': model.bic,
        }

        response = {
            'results': {
                'regression': regression_results,
                'part_worths': part_worths,
                'attribute_importance': importance_list,
                'model_fit': model_fit_summary,
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
