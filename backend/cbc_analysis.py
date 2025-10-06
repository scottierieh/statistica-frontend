

import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.formula.api import ols
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

        # Sanitize column names for the formula
        original_to_sanitized = {col: re.sub(r'[^A-Za-z0-9_]', '_', str(col)) for col in df.columns}
        sanitized_to_original = {v: k for k, v in original_to_sanitized.items()}
        
        df_clean = df.rename(columns=original_to_sanitized)
        
        target_var_clean = original_to_sanitized.get(target_variable, target_variable)
        
        formula_parts = []
        all_analysis_vars_set = {target_var_clean}
        
        independent_vars = [attr for attr, props in attributes_def.items() if props.get('includeInAnalysis', True) and attr != target_variable]

        for attr_name in independent_vars:
            attr_name_clean = original_to_sanitized.get(attr_name, attr_name)
            all_analysis_vars_set.add(attr_name_clean)
            
            # --- CRITICAL CHANGE: Convert all attribute columns to string type ---
            # This ensures that numeric attributes like 'Price' are treated as categories
            df_clean[attr_name_clean] = df_clean[attr_name_clean].astype(str)
            
            formula_parts.append(f'C(Q("{attr_name_clean}"))')
        
        if not formula_parts:
            raise ValueError("No independent variables selected for analysis.")

        formula = f'Q("{target_var_clean}") ~ {" + ".join(formula_parts)}'
        
        # --- Fit the Logit model for choice data ---
        model = ols(formula, data=df_clean).fit()
        
        # --- Regression Results ---
        regression_results = {
            'rSquared': model.rsquared,
            'adjustedRSquared': model.rsquared_adj,
            'rmse': np.sqrt(model.mse_resid),
            'mae': np.mean(np.abs(model.resid)),
            'predictions': model.predict(df_clean).tolist(),
            'residuals': model.resid.tolist(),
            'intercept': model.params.get('Intercept', 0.0),
            'coefficients': {k: v for k, v in model.params.items()}
        }
        
        # --- Part-Worths and Importance ---
        part_worths = []
        attribute_ranges = {}
        
        for attr_name in independent_vars:
            props = attributes_def[attr_name]
            attr_name_clean = original_to_sanitized[attr_name]

            # The first level is the baseline, its utility is 0
            base_level = props['levels'][0]
            part_worths.append({'attribute': attr_name, 'level': str(base_level), 'value': 0})
            
            level_worths = [0]
            for level in props['levels'][1:]:
                param_name = f"C(Q(\"{attr_name_clean}\"))[T.{level}]"
                worth = regression_results['coefficients'].get(param_name, 0)
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
            'partWorths': part_worths,
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
