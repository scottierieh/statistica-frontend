
import sys
import json
import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
import warnings
import math
import re

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        if math.isinf(obj) or math.isnan(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [_to_native_type(item) for item in obj]
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def clean_json_inf(o):
    if isinstance(o, list):
        return [clean_json_inf(v) for v in o]
    if isinstance(o, tuple):
        return tuple(clean_json_inf(v) for v in o)
    if isinstance(o, dict):
        return {k: clean_json_inf(v) for k, v in o.items()}
    return _to_native_type(o)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        dependent_var = payload.get('dependent_var')
        fixed_effects = payload.get('fixed_effects')
        group_var = payload.get('group_var')

        if not all([data, dependent_var, fixed_effects, group_var]):
            raise ValueError("Missing data, dependent_var, fixed_effects, or group_var")

        df = pd.DataFrame(data)

        # Sanitize column names
        sanitized_cols = {col: re.sub(r'[^A-Za-z0-9_]', '_', str(col)) for col in df.columns}
        df.rename(columns=sanitized_cols, inplace=True)
        
        dependent_var_clean = sanitized_cols.get(dependent_var, dependent_var)
        fixed_effects_clean = [sanitized_cols.get(f, f) for f in fixed_effects]
        group_var_clean = sanitized_cols.get(group_var, group_var)

        # Ensure types
        df[dependent_var_clean] = pd.to_numeric(df[dependent_var_clean], errors='coerce')
        for col in fixed_effects_clean:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df[group_var_clean] = df[group_var_clean].astype('category')
        
        df.dropna(subset=[dependent_var_clean, group_var_clean] + fixed_effects_clean, inplace=True)
        
        if df.empty:
            raise ValueError("No valid data remaining after cleaning for the specified variables.")

        # Build formula
        fixed_formula = ' + '.join([f'Q("{f}")' for f in fixed_effects_clean])
        formula = f'Q("{dependent_var_clean}") ~ {fixed_formula}'
        
        model = smf.mixedlm(formula, df, groups=df[group_var_clean])
        result = model.fit()

        summary_obj = result.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })
        
        # Extract fixed and random effects results
        fixed_effects_summary = result.params.to_dict()
        fixed_effects_pvalues = result.pvalues.to_dict()
        
        random_effects_summary = {k: v.item() if hasattr(v, 'item') else v for k, v in result.cov_re.to_dict().items()}

        final_result = {
            'model_summary_data': summary_data,
            'fixed_effects': fixed_effects_summary,
            'random_effects': random_effects_summary,
            'p_values': fixed_effects_pvalues,
            'log_likelihood': result.llf,
            'aic': result.aic,
            'bic': result.bic
        }
        
        cleaned_result = clean_json_inf(final_result)
        print(json.dumps(cleaned_result))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
