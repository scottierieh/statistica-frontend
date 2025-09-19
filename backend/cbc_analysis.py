
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

        # Prepare data for MNLogit
        df_long = pd.get_dummies(df, columns=attribute_cols, drop_first=True)
        
        # Get the formula string
        feature_cols = [col for col in df_long.columns if col not in [respondent_id, alt_id, choice_col] + attribute_cols]
        formula = f'{choice_col} ~ {" + ".join(feature_cols)}'

        # Fit the multinomial logit model
        model = mnlogit(formula, data=df_long).fit()
        
        # Extract part-worths
        params = model.params
        part_worths = {}
        for attr in attribute_cols:
            part_worths[attr] = {}
            # Base level utility is 0
            base_level = df[attr].unique()[0]
            part_worths[attr][str(base_level)] = 0
            
            for level in df[attr].unique()[1:]:
                col_name = f"{attr}_{level}"
                if col_name in params.index:
                    part_worths[attr][str(level)] = params[col_name]
        
        # Calculate attribute importance
        ranges = {}
        for attr, levels in part_worths.items():
            worths = list(levels.values())
            ranges[attr] = max(worths) - min(worths)
        
        total_range = sum(ranges.values())
        importance = {attr: (rng / total_range) * 100 for attr, rng in ranges.items()} if total_range > 0 else {}
        
        response = {
            'results': {
                'part_worths': part_worths,
                'attribute_importance': importance,
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

