

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
        respondent_id = payload.get('respondent_id')
        alt_id = payload.get('alt_id')
        choice_col = payload.get('choice_col')
        attribute_cols = payload.get('attribute_cols')

        if not all([data, respondent_id, alt_id, choice_col, attribute_cols]):
            raise ValueError("Missing required parameters")

        df = pd.DataFrame(data)

        # Ensure choice column is numeric
        df[choice_col] = pd.to_numeric(df[choice_col], errors='coerce')
        df.dropna(subset=[choice_col], inplace=True)
        
        # Sanitize column names for formula
        sanitized_cols = {col: col.replace(' ', '_').replace('.', '_') for col in df.columns}
        df.rename(columns=sanitized_cols, inplace=True)
        
        choice_col_clean = sanitized_cols[choice_col]
        attribute_cols_clean = [sanitized_cols[attr] for attr in attribute_cols]

        # Prepare formula for MNLogit using statsmodels' C() for categorical encoding
        formula_parts = [f'C(Q("{attr}"))' for attr in attribute_cols_clean]
        formula = f'Q("{choice_col_clean}") ~ {" + ".join(formula_parts)}'
        
        # Fit the multinomial logit model
        model = mnlogit(formula, data=df, missing='drop').fit(disp=False)
        
        params = model.params
        part_worths = {}
        original_attribute_map = {v: k for k, v in sanitized_cols.items()}

        for i, attr_clean in enumerate(attribute_cols_clean):
            original_attr = original_attribute_map[attr_clean]
            part_worths[original_attr] = {}
            
            # Get levels directly from original dataframe to ensure correct order
            levels = pd.Series(payload['data']).apply(lambda x: x[original_attr]).unique()

            # Base level utility is 0 (the first level)
            base_level = str(levels[0])
            part_worths[original_attr][base_level] = 0
            
            # Extract coefficients for other levels
            for level in levels[1:]:
                # Construct the coefficient name as created by statsmodels C() function
                col_name = f'C(Q("{attr_clean}"))[T.{str(level)}]'
                if col_name in params.index:
                    part_worths[original_attr][str(level)] = params.loc[col_name][0]
                else:
                    part_worths[original_attr][str(level)] = 0.0

        # Calculate attribute importance
        ranges = {}
        for attr, levels in part_worths.items():
            worths = list(levels.values())
            ranges[attr] = max(worths) - min(worths) if worths else 0
        
        total_range = sum(ranges.values())
        importance_list = []
        if total_range > 0:
            for attr, rng in ranges.items():
                importance_list.append({
                    'attribute': attr,
                    'importance': (rng / total_range) * 100
                })
        
        response = {
            'results': {
                'part_worths': part_worths,
                'attribute_importance': importance_list,
                'model_fit': {
                    'llf': model.llf,
                    'llnull': model.llnull,
                    'pseudo_r2': model.prsquared
                }
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()



