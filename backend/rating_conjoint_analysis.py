
import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score
from itertools import product
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: _to_native_type(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_native_type(item) for item in obj]
    return obj

def calculate_importance(part_worths):
    """Calculate attribute importance based on utility ranges"""
    utility_ranges = {}
    for attribute, levels in part_worths.items():
        if attribute == 'Base':
            continue
        utilities = list(levels.values())
        utility_ranges[attribute] = max(utilities) - min(utilities) if utilities else 0
    
    total_range = sum(utility_ranges.values())
    
    importance = {}
    if total_range > 0:
        for attribute, range_val in utility_ranges.items():
            importance[attribute] = (range_val / total_range) * 100
    
    return sorted([{'attribute': k, 'importance': v} for k, v in importance.items()], 
                  key=lambda x: x['importance'], reverse=True)

def calculate_optimal_product(part_worths, intercept):
    """Find the optimal product configuration with highest total utility"""
    if not part_worths:
        return {}, intercept
        
    optimal_config = {}
    total_utility = intercept
    
    for attr, levels_pw in part_worths.items():
        if not levels_pw:
            continue
        best_level = max(levels_pw.items(), key=lambda x: x[1])
        optimal_config[attr] = best_level[0]
        total_utility += best_level[1]
    
    return optimal_config, total_utility

def calculate_simulation(scenarios, part_worths, intercept):
    """Calculate preference shares for given scenarios using softmax"""
    if not scenarios:
        return None
    
    simulation_results = []
    
    for scenario in scenarios:
        scenario_utility = intercept
        scenario_name = scenario.get('name', 'Unnamed')
        
        for attr, level in scenario.items():
            if attr == 'name':
                continue
            if attr in part_worths and level in part_worths[attr]:
                scenario_utility += part_worths[attr][level]
        
        simulation_results.append({
            'name': scenario_name,
            'utility': scenario_utility
        })
    
    # Calculate preference shares using softmax
    utilities = np.array([s['utility'] for s in simulation_results])
    
    # Numerical stability: subtract max
    exp_utilities = np.exp(utilities - np.max(utilities))
    shares = (exp_utilities / exp_utilities.sum()) * 100
    
    for i, result in enumerate(simulation_results):
        result['preferenceShare'] = float(shares[i])
    
    return simulation_results


def main():
    try:
        # Read input
        payload = json.load(sys.stdin)
        
        # Validate input
        data = payload.get('data')
        attributes = payload.get('attributes')
        target_variable = payload.get('targetVariable')
        scenarios = payload.get('scenarios')
        
        if not data:
            raise ValueError("No data provided")
        if not attributes:
            raise ValueError("No attributes provided")
        if not target_variable:
            raise ValueError("No target variable specified")
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        if len(df) == 0:
            raise ValueError("Data is empty")
        
        if target_variable not in df.columns:
            raise ValueError(f"Target variable '{target_variable}' not found in data")
        
        # Prepare target variable
        y = df[target_variable]
        
        # Prepare feature matrix
        X_df = pd.DataFrame()
        feature_names = []
        base_levels = {}
        
        for attr, props in attributes.items():
            if props.get('includeInAnalysis', True) and props['type'] == 'categorical':
                df[attr] = df[attr].astype('category')
                base_level = props['levels'][0]
                base_levels[attr] = base_level
                
                # Create dummy variables (drop first level)
                dummies = pd.get_dummies(df[attr], prefix=attr, drop_first=True, dtype=float)
                X_df = pd.concat([X_df, dummies], axis=1)
                feature_names.extend(dummies.columns.tolist())
        
        if X_df.shape[1] == 0:
            raise ValueError("No features to analyze. Check attribute configuration.")
        
        # Fit regression model
        model = LinearRegression()
        model.fit(X_df, y)
        
        # Calculate predictions and R-squared
        y_pred = model.predict(X_df)
        r_squared = r2_score(y, y_pred)
        
        # Calculate adjusted R-squared
        n = len(y)
        p = X_df.shape[1]
        adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - p - 1) if n > p + 1 else r_squared
        
        # Cross-validation (optional, for model validation)
        try:
            cv_scores = cross_val_score(model, X_df, y, cv=min(5, len(df)), scoring='r2')
            cv_r2_mean = float(cv_scores.mean())
        except:
            cv_r2_mean = None

        # Extract part-worths from coefficients
        part_worths = {}
        coeff_map = dict(zip(X_df.columns, model.coef_))
        
        for attr, props in attributes.items():
            if props.get('includeInAnalysis', True) and props['type'] == 'categorical':
                base_level = base_levels[attr]
                part_worths[attr] = {base_level: 0.0}
                
                for level in props['levels'][1:]:
                    feature_name = f"{attr}_{level}"
                    part_worths[attr][level] = float(coeff_map.get(feature_name, 0))
        
        # Zero-center part-worths (standard practice)
        for attr in part_worths:
            levels_dict = part_worths[attr]
            mean_utility = np.mean(list(levels_dict.values()))
            for level in levels_dict:
                levels_dict[level] = float(levels_dict[level] - mean_utility)
        
        # Calculate attribute importance
        importance = calculate_importance(part_worths)
        
        # Calculate optimal product
        optimal_config, optimal_utility = calculate_optimal_product(part_worths, float(model.intercept_))
        
        # Calculate simulation if scenarios provided
        simulation_results = None
        if scenarios:
            simulation_results = calculate_simulation(scenarios, part_worths, float(model.intercept_))
        
        # Prepare final results
        final_results = {
            'partWorths': [
                {'attribute': attr, 'level': level, 'value': float(value)} 
                for attr, levels in part_worths.items() 
                for level, value in levels.items()
            ],
            'importance': importance,
            'regression': {
                'rSquared': float(r_squared),
                'adjustedRSquared': float(adj_r_squared),
                'predictions': y_pred[:100].tolist() if len(y_pred) > 100 else y_pred.tolist(),
                'intercept': float(model.intercept_),
                'coefficients': {k: float(v) for k, v in coeff_map.items()},
            },
            'targetVariable': target_variable,
            'optimalProduct': {
                'config': optimal_config,
                'totalUtility': float(optimal_utility)
            }
        }
        
        # Add optional results
        if cv_r2_mean is not None:
            final_results['regression']['crossValidationR2'] = cv_r2_mean
        
        if simulation_results:
            final_results['simulation'] = simulation_results
        
        # Output results
        print(json.dumps({'results': final_results}, default=_to_native_type))
        
    except Exception as e:
        error_response = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

