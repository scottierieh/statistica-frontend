
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
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [_to_native_type(item) for item in obj.tolist()]
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, (list, tuple)):
        return [_to_native_type(item) for item in obj]
    return obj


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

        if not all([data, target_var, features]):
            raise ValueError("Missing 'data', 'target_var', or 'features'")

        df = pd.DataFrame(data)

        # Sanitize column names for the formula
        sanitized_cols = {col: col.replace(' ', '_').replace('.', '_').replace('[', '_').replace(']', '_') for col in df.columns}
        df.rename(columns=sanitized_cols, inplace=True)
        target_var_clean = sanitized_cols.get(target_var, target_var)
        features_clean = [sanitized_cols.get(f, f) for f in features]
        
        formula = f'Q("{target_var_clean}") ~ ' + ' + '.join([f'Q("{f}")' for f in features_clean])

        family_map = {
            'gaussian': sm.families.Gaussian(),
            'binomial': sm.families.Binomial(),
            'poisson': sm.families.Poisson(),
            'gamma': sm.families.Gamma(link=sm.families.links.log()),
        }

        if family_name not in family_map:
            raise ValueError(f"Unsupported family: {family_name}. Supported families are: {list(family_map.keys())}")
        
        family = family_map[family_name]

        model = smf.glm(formula, data=df, family=family)
        result = model.fit()
        
        # Extract structured data instead of HTML
        summary_obj = result.summary()
        summary_data = []
        for table in summary_obj.tables:
            # Extract caption if it exists
            caption = None
            if hasattr(table, 'title') and table.title:
                caption = table.title
            
            # Extract data as a list of lists
            table_data = [list(row) for row in table.data]
            
            summary_data.append({
                'caption': caption,
                'data': table_data
            })
        
        # Calculate pseudo R-squared
        pseudo_r2 = 1 - (result.deviance / result.null_deviance) if result.null_deviance > 0 else 0

        # Coefficients and interpretation
        params = result.params
        conf_int = result.conf_int()
        pvalues = result.pvalues

        coefficients_data = []
        
        if family_name in ['binomial', 'poisson', 'gamma']:
             # For models with log or logit links, calculate exponentiated coefficients
            exp_params = np.exp(params)
            exp_conf_int = np.exp(conf_int)
            
            for param in params.index:
                coefficients_data.append({
                    'variable': param,
                    'coefficient': params[param],
                    'exp_coefficient': exp_params[param],
                    'p_value': pvalues[param],
                    'conf_int_lower': conf_int.loc[param, 0],
                    'conf_int_upper': conf_int.loc[param, 1],
                    'exp_conf_int_lower': exp_conf_int.loc[param, 0],
                    'exp_conf_int_upper': exp_conf_int.loc[param, 1],
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

        print(json.dumps(final_result, default=_to_native_type, allow_nan=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

