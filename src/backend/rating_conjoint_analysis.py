
import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from itertools import product
import warnings
from typing import Dict, List

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
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
        utility_ranges[attribute] = max(utilities) - min(utilities) if utilities else 0
    
    total_range = sum(utility_ranges.values())
    
    importance = {}
    if total_range > 0:
        for attribute, range_val in utility_ranges.items():
            importance[attribute] = (range_val / total_range) * 100
    
    return sorted([{'attribute': k, 'importance': v} for k, v in importance.items()], key=lambda x: x['importance'], reverse=True)

def calculate_optimal_product(part_worths):
    """Find the optimal product configuration with highest total utility"""
    if not part_worths:
        return {}, 0.0
        
    optimal_config = {}
    total_utility = 0.0
    
    for attr, levels_pw in part_worths.items():
        if not levels_pw: continue
        best_level = max(levels_pw.items(), key=lambda x: x[1])
        optimal_config[attr] = best_level[0]
        total_utility += best_level[1]
    
    return optimal_config, total_utility

def predict_market_share(products: List[Dict[str, str]], part_worths: Dict, intercept: float) -> Dict[str, float]:
    """
    Predict market share for a set of product configurations using the logit choice model.
    """
    utilities = []
    for product in products:
        # Start with the base utility (intercept)
        total_utility = intercept
        for attr, level in product.items():
            if attr in part_worths and level in part_worths[attr]:
                total_utility += part_worths[attr][level]
        utilities.append(total_utility)
    
    # Calculate market shares using softmax (logit model)
    exp_utilities = np.exp(utilities)
    sum_exp_utilities = np.sum(exp_utilities)
    
    if sum_exp_utilities == 0:
        # Avoid division by zero, assume equal shares if all utilities are extremely negative
        shares = [100.0 / len(products)] * len(products)
    else:
        shares = (exp_utilities / sum_exp_utilities) * 100
    
    return {f"Scenario {i+1}": float(share) for i, share in enumerate(shares)}


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes = payload.get('attributes')
        target_variable = payload.get('targetVariable')
        scenarios = payload.get('scenarios')
        
        df = pd.DataFrame(data)
        
        y = df[target_variable]
        
        X_df = pd.DataFrame()
        
        for attr, props in attributes.items():
            if props.get('includeInAnalysis', True) and props['type'] == 'categorical':
                df[attr] = df[attr].astype('category')
                dummies = pd.get_dummies(df[attr], prefix=attr, dtype=float)
                X_df = pd.concat([X_df, dummies], axis=1)
        
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
                part_worths[attr] = {}
                for level in props['levels']:
                    feature_name = f"{attr}_{level}"
                    part_worths[attr][level] = coeff_map.get(feature_name, 0)

        # Zero-center part-worths for better interpretation
        for attr in part_worths:
            levels = part_worths[attr]
            mean_utility = np.mean(list(levels.values()))
            for level in levels:
                levels[level] -= mean_utility
        
        importance = calculate_importance(part_worths)
        
        optimal_config, optimal_utility = calculate_optimal_product(part_worths)
        optimal_utility += model.intercept_

        simulation_results = None
        if scenarios:
            market_shares = predict_market_share(scenarios, part_worths, model.intercept_)
            simulation_results = [{'name': scenario.get('name', f'Scenario {i+1}'), 'preferenceShare': share} for i, (scenario, share) in enumerate(zip(scenarios, market_shares.values()))]

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
            'targetVariable': target_variable,
            'optimalProduct': {
                'config': optimal_config,
                'totalUtility': optimal_utility
            },
            'simulation': simulation_results
        }
        
        print(json.dumps({'results': final_results}, default=_to_native_type))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
