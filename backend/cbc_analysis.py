

import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
import warnings
import re

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

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes_def = payload.get('attributes')
        target_variable = payload.get('targetVariable')

        if not all([data, attributes_def, target_variable]):
            raise ValueError("Missing 'data', 'attributes', or 'targetVariable'")

        df = pd.DataFrame(data)

        # Ensure target is numeric and drop rows with invalid target values
        df[target_variable] = pd.to_numeric(df[target_variable], errors='coerce')
        df.dropna(subset=[target_variable], inplace=True)
        y = df[target_variable]

        X_dfs = []
        feature_names = []
        
        independent_vars = [attr for attr, props in attributes_def.items() if props.get('includeInAnalysis', True) and attr != target_variable]

        for attr_name in independent_vars:
            props = attributes_def[attr_name]
            # Create dummy variables, dropping the first level to create a baseline
            dummies = pd.get_dummies(df[attr_name], prefix=attr_name, drop_first=True, dtype=float)
            X_dfs.append(dummies)
            feature_names.extend(dummies.columns.tolist())
        
        if not X_dfs:
            raise ValueError("No independent variables selected for analysis.")
            
        X = pd.concat(X_dfs, axis=1)
        X = sm.add_constant(X) # Add intercept

        # --- Fit the Logit model for choice data ---
        model = sm.Logit(y, X).fit(disp=0)
        
        # --- Regression Results ---
        regression_results = {
            'rSquared': getattr(model, 'prsquared', 0.0),
            'adjustedRSquared': getattr(model, 'prsquared_adj', 0.0),
            'rmse': np.nan, 
            'mae': np.nan,
            'predictions': model.predict().tolist(),
            'residuals': model.resid_response.tolist(),
            'intercept': model.params.get('const', 0.0),
            'coefficients': model.params.to_dict()
        }

        # --- Part-Worths and Importance ---
        part_worths = []
        attribute_ranges = {}
        
        for attr_name in independent_vars:
            props = attributes_def[attr_name]
            base_level = props['levels'][0]
            part_worths.append({'attribute': attr_name, 'level': str(base_level), 'value': 0})
            
            level_worths = [0]
            for level in props['levels'][1:]:
                param_name = f"{attr_name}_{level}"
                worth = model.params.get(param_name, 0)
                part_worths.append({'attribute': attr_name, 'level': str(level), 'value': worth})
                level_worths.append(worth)
            
            attribute_ranges[attr_name] = max(level_worths) - min(level_worths)

        total_range = sum(attribute_ranges.values())
        importance = []
        if total_range > 0:
            for attr_name, range_val in attribute_ranges.items():
                importance.append({
                    'attribute': attr_name,
                    'importance': (range_val / total_range) * 100
                })
        importance.sort(key=lambda x: x['importance'], reverse=True)

        final_results = {
            'regression': regression_results,
            'part_worths': part_worths,
            'importance': importance,
            'targetVariable': target_variable
        }
        
        response = {'results': final_results}
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
