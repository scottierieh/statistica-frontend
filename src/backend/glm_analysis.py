
import sys
import json
import numpy as np
import pandas as pd
import warnings
import math

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

        # Sanitize column names for the formula
        sanitized_cols = {col: col.replace(' ', '_').replace('.', '_').replace('[', '_').replace(']', '_') for col in df.columns}
        df.rename(columns=sanitized_cols, inplace=True)
        target_var_clean = sanitized_cols.get(target_var, target_var)
        features_clean = [sanitized_cols.get(f, f) for f in features]
        
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

        model = smf.glm(formula, data=df, family=family)
        result = model.fit()
        
        summary_obj = result.summary()
        summary_data = []
        for table in summary_obj.tables:
            caption = None
            if hasattr(table, 'title') and table.title:
                caption = table.title
            
            table_data = [list(row) for row in table.data]
            
            summary_data.append({
                'caption': caption,
                'data': table_data
            })
        
        pseudo_r2 = 1 - (result.deviance / result.null_deviance) if result.null_deviance > 0 else 0

        params = result.params
        conf_int = result.conf_int()
        pvalues = result.pvalues

        coefficients_data = []
        
        if family_name in ['binomial', 'poisson', 'gamma']:
            try:
                exp_params = np.exp(params)
                exp_conf_int = np.exp(conf_int)
            except Exception: # Handle potential overflow
                exp_params = pd.Series([np.nan] * len(params), index=params.index)
                exp_conf_int = pd.DataFrame([[np.nan, np.nan]] * len(params), index=conf_int.index)
            
            for param in params.index:
                coefficients_data.append({
                    'variable': param,
                    'coefficient': params[param],
                    'exp_coefficient': exp_params.get(param),
                    'p_value': pvalues[param],
                    'conf_int_lower': conf_int.loc[param, 0],
                    'conf_int_upper': conf_int.loc[param, 1],
                    'exp_conf_int_lower': exp_conf_int.loc[param, 0] if param in exp_conf_int.index else None,
                    'exp_conf_int_upper': exp_conf_int.loc[param, 1] if param in exp_conf_int.index else None,
                })
        else: # Gaussian
            for param in params.index:
                coefficients_data.append({
                    'variable': param,
                    'coefficient': params[param],
                    'p_value': pvalues[param],
                    'conf_int_lower': conf_int.loc[param, 0],
                    'conf_int_upper': conf_int.loc[param, 1],
                })

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

        # Clean the final result of any non-compliant JSON values before dumping
        cleaned_result = clean_json_inf(final_result)
        
        print(json.dumps(cleaned_result))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
