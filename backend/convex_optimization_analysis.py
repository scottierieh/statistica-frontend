
import sys
import json
import numpy as np
from scipy.optimize import minimize

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def portfolio_return(weights, returns):
    return np.sum(weights * returns)

def portfolio_volatility(weights, returns, cov_matrix):
    return np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))

def run_convex_optimization_analysis(payload):
    assets_data = payload.get('assets', [])
    correlation_matrix = np.array(payload.get('correlation_matrix', []))
    target_return = float(payload.get('target_return', 0.1))

    if not assets_data:
        raise ValueError("No asset data provided.")
    
    n_assets = len(assets_data)
    returns = np.array([a['expected_return'] for a in assets_data])
    volatilities = np.array([a['volatility'] for a in assets_data])
    asset_names = [a['name'] for a in assets_data]

    # Create covariance matrix from correlations and volatilities
    cov_matrix = np.outer(volatilities, volatilities) * correlation_matrix

    # Objective function to minimize (portfolio variance)
    def objective(weights):
        return portfolio_volatility(weights, returns, cov_matrix)**2

    # Constraints
    constraints = [
        # Sum of weights must be 1
        {'type': 'eq', 'fun': lambda weights: np.sum(weights) - 1},
        # Portfolio return must meet target return
        {'type': 'eq', 'fun': lambda weights: portfolio_return(weights, returns) - target_return}
    ]

    # Bounds for each weight (0 to 1, no short selling)
    bounds = tuple((0, 1) for _ in range(n_assets))

    # Initial guess (equal weights)
    initial_weights = np.array([1/n_assets] * n_assets)

    # Optimization
    result = minimize(objective, initial_weights, method='SLSQP', bounds=bounds, constraints=constraints)

    if not result.success:
        raise Exception(f"Optimization failed: {result.message}")

    optimal_weights = result.x
    
    # Calculate final portfolio metrics
    final_return = portfolio_return(optimal_weights, returns)
    final_volatility = portfolio_volatility(optimal_weights, returns, cov_matrix)

    return {
        'results': {
            'optimal_weights': dict(zip(asset_names, optimal_weights.tolist())),
            'portfolio_return': final_return,
            'portfolio_volatility': final_volatility
        }
    }

if __name__ == '__main__':
    try:
        input_payload = json.load(sys.stdin)
        output = run_convex_optimization_analysis(input_payload)
        print(json.dumps(output, default=_to_native_type))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
