

import sys
import json
import pandas as pd
import statsmodels.formula.api as smf
import statsmodels.api as sm
import re
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    if hasattr(obj, 'item'):
        return obj.item()
    return str(obj)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        group_var = payload.get('group_var')
        time_var = payload.get('time_var')
        outcome_var = payload.get('outcome_var')
        
        if not all([data, group_var, time_var, outcome_var]):
            raise ValueError("Missing required parameters: data, group_var, time_var, or outcome_var")

        df = pd.DataFrame(data)

        # Convert group/time vars to numeric categories (0/1) for easier interpretation
        df[group_var] = pd.Categorical(df[group_var]).codes
        df[time_var] = pd.Categorical(df[time_var]).codes

        df[outcome_var] = pd.to_numeric(df[outcome_var], errors='coerce')
        df_clean = df.dropna(subset=[outcome_var, group_var, time_var]).copy()
        
        if len(df_clean[group_var].unique()) != 2 or len(df_clean[time_var].unique()) != 2:
             raise ValueError("Group and Time variables must each have exactly two unique values for DiD analysis.")

        # --- Sanitize column names for formula ---
        outcome_clean = re.sub(r'[^A-Za-z0-9_]', '_', outcome_var)
        group_clean = re.sub(r'[^A-Za-z0-9_]', '_', group_var)
        time_clean = re.sub(r'[^A-Za-z0-9_]', '_', time_var)
        
        df_clean_renamed = df_clean.rename(columns={
            outcome_var: outcome_clean,
            group_var: group_clean,
            time_var: time_clean
        })

        formula = f'Q("{outcome_clean}") ~ C(Q("{group_clean}")) * C(Q("{time_clean}"))'
        model = smf.ols(formula, data=df_clean_renamed).fit()
        
        # --- Clean up coefficient names for display ---
        name_map = {
            group_clean: group_var,
            time_clean: time_var,
            outcome_clean: outcome_var
        }

        def clean_name(name):
            name = name.strip()
            # This regex will find C(Q("..."))[T.value] and replace it with the original variable name
            for clean, orig in name_map.items():
                name = re.sub(f'C\\(Q\\("{clean}"\\)\\)\\[T\\.([^]]+)\\]', orig + '_[T.\\1]', name)
            # This will find any remaining Q("...") and replace it
            name = re.sub(r'Q\("([^"]+)"\)', lambda m: name_map.get(m.group(1), m.group(1)), name)
            return name

        params_cleaned = {clean_name(k): v for k, v in model.params.to_dict().items()}
        pvalues_cleaned = {clean_name(k): v for k, v in model.pvalues.to_dict().items()}
        
        summary_obj = model.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            if table_data:
                if len(table_data) > 1 and 'coef' in table_data[0]:
                    for row in table_data[1:]:
                        if row and row[0]:
                             row[0] = clean_name(row[0])
            
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })
        
        response = {
            'results': {
                'model_summary_data': summary_data,
                'params': params_cleaned,
                'pvalues': pvalues_cleaned,
                'rsquared': model.rsquared,
                'rsquared_adj': model.rsquared_adj
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()

  


