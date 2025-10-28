
import sys
import json
import pandas as pd
import numpy as np
from linearmodels.panel import PanelOLS, RandomEffects
import statsmodels.api as sm
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, (bool, np.bool_)): return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        dependent = payload.get('dependent')
        exog = payload.get('exog')
        entity_col = payload.get('entity_col')
        time_col = payload.get('time_col')

        if not all([dependent, exog, entity_col, time_col]):
            raise ValueError("Missing required parameters.")
            
        df = data.copy()
        df[time_col] = pd.to_datetime(df[time_col])
        df = df.set_index([entity_col, time_col])
        
        y = df[dependent]
        X = sm.add_constant(df[exog])

        # --- Pooled OLS ---
        pooled_ols = PanelOLS(y, X).fit()
        
        # --- Fixed Effects ---
        fe_model = PanelOLS(y, X, entity_effects=True).fit()
        
        # --- Random Effects ---
        re_model = RandomEffects(y, X).fit()

        # --- Hausman Test ---
        hausman_results = None
        try:
            # The Hausman test compares the fixed effects and random effects models
            # The null hypothesis is that the random effects model is preferred
            hausman_test = fe_model.compare(re_model)
            hausman_results = {
                'statistic': hausman_test.stat,
                'p_value': hausman_test.pval,
                'df': hausman_test.dof,
                'interpretation': 'Fixed Effects Recommended' if hausman_test.pval < 0.05 else 'Random Effects Recommended'
            }
        except Exception as e:
            hausman_results = {'error': str(e)}
            
        def format_summary(model_fit, name):
            return {
                'name': name,
                'params': model_fit.params.to_dict(),
                'pvalues': model_fit.pvalues.to_dict(),
                'tstats': model_fit.tstats.to_dict(),
                'rsquared': getattr(model_fit, 'rsquared_overall', getattr(model_fit, 'rsquared', None)),
                'rsquared_within': getattr(model_fit, 'rsquared_within', None),
            }

        response = {
            'results': {
                'pooled_ols': format_summary(pooled_ols, 'Pooled OLS'),
                'fixed_effects': format_summary(fe_model, 'Fixed Effects'),
                'random_effects': format_summary(re_model, 'Random Effects'),
                'hausman_test': hausman_results,
            }
        }
        
        print(json.dumps(response, default=_to_native_type, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
