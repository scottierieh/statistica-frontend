
import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from itertools import product
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def calculate_importance(part_worths):
    utility_ranges = {}
    for attribute, levels in part_worths.items():
        if attribute == 'Base': continue
        utilities = list(levels.values())
        utility_ranges[attribute] = max(utilities) - min(utilities)
    
    total_range = sum(utility_ranges.values())
    
    importance = {}
    if total_range > 0:
        for attribute, range_val in utility_ranges.items():
            importance[attribute] = (range_val / total_range) * 100
    
    return sorted([{'attribute': k, 'importance': v} for k, v in importance.items()], key=lambda x: x['importance'], reverse=True)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes = payload.get('attributes')
        target_variable = payload.get('targetVariable')
        
        df = pd.DataFrame(data)
        
        y = df[target_variable]
        
        X_df = pd.DataFrame()
        feature_names = []
        base_levels = {}
        
        for attr, props in attributes.items():
            if props.get('includeInAnalysis', True):
                if props['type'] == 'categorical':
                    df[attr] = df[attr].astype('category')
                    base_level = props['levels'][0]
                    base_levels[attr] = base_level
                    
                    dummies = pd.get_dummies(df[attr], prefix=attr, drop_first=True, dtype=float)
                    X_df = pd.concat([X_df, dummies], axis=1)
                    feature_names.extend(dummies.columns.tolist())
        
        model = LinearRegression()
        model.fit(X_df, y)
        
        y_pred = model.predict(X_df)
        r_squared = r2_score(y, y_pred)
        n = len(y)
        p = X_df.shape[1]
        adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - p - 1) if n - p - 1 > 0 else r_squared

        part_worths = {}
        coeff_map = dict(zip(X_df.columns, model.coef_))
        
        for attr, props in attributes.items():
             if props.get('includeInAnalysis', True) and props['type'] == 'categorical':
                base_level = base_levels[attr]
                part_worths[attr] = {base_level: 0}
                for level in props['levels'][1:]:
                    feature_name = f"{attr}_{level}"
                    part_worths[attr][level] = coeff_map.get(feature_name, 0)
        
        importance = calculate_importance(part_worths)
        
        final_results = {
            'partWorths': [{'attribute': attr, 'level': level, 'value': value} for attr, levels in part_worths.items() for level, value in levels.items()],
            'importance': importance,
            'regression': {
                'rSquared': r_squared,
                'adjustedRSquared': adj_r_squared,
                'predictions': y_pred.tolist(),
                'intercept': model.intercept_,
                'coefficients': coeff_map,
            },
            'targetVariable': target_variable
        }
        
        print(json.dumps({'results': final_results}, default=_to_native_type))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
