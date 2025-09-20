
import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.formula.api import mnlogit

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

        # Sanitize column names for the formula
        sanitized_cols = {col: f'C_{col.replace(" ", "_").replace(".", "_")}' for col in df.columns}
        df.rename(columns=sanitized_cols, inplace=True)
        
        target_var_clean = sanitized_cols[target_variable]
        
        formula_parts = []
        feature_names = []
        for attr_name, props in attributes_def.items():
            if props.get('includeInAnalysis', True) and attr_name != target_variable:
                attr_name_clean = sanitized_cols[attr_name]
                if props['type'] == 'categorical':
                    formula_parts.append(f'C(Q("{attr_name_clean}"))')
                else: # numerical - treat as is
                    formula_parts.append(f'Q("{attr_name_clean}")')
        
        formula = f'Q("{target_var_clean}") ~ {" + ".join(formula_parts)}'
        
        # Fit the OLS model to get coefficients and other stats
        model = sm.OLS.from_formula(formula, data=df).fit()
        
        # --- Regression Results ---
        regression_results = {
            'rSquared': model.rsquared,
            'adjustedRSquared': model.rsquared_adj,
            'rmse': np.sqrt(model.mse_resid),
            'mae': np.mean(np.abs(model.resid)),
            'predictions': model.predict().tolist(),
            'residuals': model.resid.tolist(),
            'intercept': model.params.get('Intercept', 0.0),
            'coefficients': model.params.to_dict()
        }

        # --- Part-Worths and Importance ---
        part_worths = []
        attribute_ranges = {}

        for attr_name, props in attributes_def.items():
            if props.get('includeInAnalysis', True) and attr_name != target_variable:
                if props['type'] == 'categorical':
                    base_level = props['levels'][0]
                    part_worths.append({'attribute': attr_name, 'level': str(base_level), 'value': 0})
                    
                    level_worths = [0]
                    for level in props['levels'][1:]:
                        param_name = f'C(Q("{sanitized_cols[attr_name]}"))[T.{level}]'
                        worth = model.params.get(param_name, 0)
                        part_worths.append({'attribute': attr_name, 'level': str(level), 'value': worth})
                        level_worths.append(worth)
                    
                    attribute_ranges[attr_name] = max(level_worths) - min(level_worths)
                
                elif props['type'] == 'numerical':
                    clean_name = f'Q("{sanitized_cols[attr_name]}")'
                    coeff = model.params.get(clean_name, 0)
                    part_worths.append({'attribute': attr_name, 'level': 'coefficient', 'value': coeff})
                    
                    # Approximate range for numerical by multiplying coeff with range of values
                    val_range = df[sanitized_cols[attr_name]].max() - df[sanitized_cols[attr_name]].min()
                    attribute_ranges[attr_name] = abs(coeff * val_range)

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

        print(json.dumps(final_results, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
