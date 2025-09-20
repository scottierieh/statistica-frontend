
import sys
import json
import numpy as np
import pandas as pd
import warnings
import math
import re

try:
    import statsmodels.api as sm
    import statsmodels.formula.api as smf
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False

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
    """
    Recursively cleans a data structure to make it JSON compliant,
    converting inf and nan to None.
    """
    if isinstance(o, list):
        return [clean_json_inf(v) for v in o]
    if isinstance(o, tuple):
        return tuple(clean_json_inf(v) for v in o)
    if isinstance(o, dict):
        return {k: clean_json_inf(v) for k, v in o.items()}
    return _to_native_type(o)


def main():
    if not STATSMODELS_AVAILABLE:
        print(json.dumps({"error": "Statsmodels library not found. Please ensure it is installed in the backend environment."}), file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target_var = payload.get('target_var')
        features = payload.get('features')
        family_name = payload.get('family', 'gaussian').lower()
        link_function_name = payload.get('link_function')

        if not all([data, target_var, features]):
            raise ValueError("Missing 'data', 'target_var', or 'features'")

        df = pd.DataFrame(data)
        
        # Map original names to sanitized names
        original_to_sanitized = {col: re.sub(r'[^A-Za-z0-9_]', '_', col) for col in df.columns}
        sanitized_to_original = {v: k for k, v in original_to_sanitized.items()}
        
        df_clean = df.rename(columns=original_to_sanitized)

        target_var_clean = original_to_sanitized.get(target_var, target_var)
        features_clean = [original_to_sanitized.get(f, f) for f in features]
        
        formula = f'Q("{target_var_clean}") ~ ' + ' + '.join([f'Q("{f}")' for f in features_clean])

        link_map = {
            'logit': sm.families.links.logit(),
            'probit': sm.families.links.probit(),
            'log': sm.families.links.log(),
            'inverse_power': sm.families.links.inverse_power(),
        }
        link = link_map.get(link_function_name) if link_function_name else None

        family_map = {
            'gaussian': sm.families.Gaussian(link=link),
            'binomial': sm.families.Binomial(link=link),
            'poisson': sm.families.Poisson(link=link),
            'gamma': sm.families.Gamma(link=link if link else sm.families.links.log()),
        }

        if family_name not in family_map:
            raise ValueError(f"Unsupported family: {family_name}. Supported families are: {list(family_map.keys())}")
        
        family = family_map[family_name]

        model = smf.glm(formula, data=df_clean, family=family)
        result = model.fit()
        
        def clean_sm_name(name):
            name = name.strip()
            # Regex for Q("...") or C(Q("..."))
            match = re.search(r'Q\("([^"]+)"\)', name)
            if match:
                sanitized_name = match.group(1)
                return sanitized_to_original.get(sanitized_name, sanitized_name)
            return name

        summary_obj = result.summary()
        summary_data = []
        for table in summary_obj.tables:
            caption = None
            if hasattr(table, 'title') and table.title:
                caption = table.title
            
            table_data = [list(row) for row in table.data]
            if table_data:
                 if len(table_data) > 1 and any('coef' in h.lower() for h in table_data[0]):
                    for row in table_data[1:]:
                        if row and row[0]:
                             row[0] = clean_sm_name(row[0])

            summary_data.append({ 'caption': caption, 'data': table_data })
        
        pseudo_r2 = 1 - (result.deviance / result.null_deviance) if result.null_deviance > 0 else 0

        params = result.params
        conf_int = result.conf_int()
        pvalues = result.pvalues

        coefficients_data = []
        
        is_exp = family_name in ['binomial', 'poisson', 'gamma']

        for param_name in params.index:
            cleaned_name = clean_sm_name(param_name)
            
            row = {
                'variable': cleaned_name,
                'coefficient': params[param_name],
                'p_value': pvalues[param_name],
                'conf_int_lower': conf_int.loc[param_name, 0],
                'conf_int_upper': conf_int.loc[param_name, 1],
            }

            if is_exp:
                try:
                    exp_coef = np.exp(params[param_name])
                    exp_ci = np.exp(conf_int.loc[param_name])
                    row['exp_coefficient'] = exp_coef
                    row['exp_conf_int_lower'] = exp_ci[0]
                    row['exp_conf_int_upper'] = exp_ci[1]
                except (OverflowError, ValueError):
                    row['exp_coefficient'] = None
                    row['exp_conf_int_lower'] = None
                    row['exp_conf_int_upper'] = None

            coefficients_data.append(row)

        final_result = {
            'model_summary_data': summary_data,
            'aic': result.aic,
            'bic': result.bic,
            'log_likelihood': result.llf,
            'deviance': result.deviance,
            'pseudo_r2': pseudo_r2,
            'coefficients': coefficients_data,
            'family': family_name,
        }

        cleaned_result = clean_json_inf(final_result)
        
        print(json.dumps(cleaned_result))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

  