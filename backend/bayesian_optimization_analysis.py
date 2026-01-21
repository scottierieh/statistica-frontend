
import sys
import json
import numpy as np
from skopt import gp_minimize
from skopt.space import Real
from skopt.utils import use_named_args
import warnings

warnings.filterwarnings('ignore')

# Helper to convert numpy types to native Python types for JSON serialization
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

def run_bayesian_optimization_analysis(payload):
    objective_function_str = payload.get('objective_function')
    bounds_list = payload.get('bounds')
    n_calls = int(payload.get('n_calls', 100))
    n_initial_points = int(payload.get('n_initial_points', 10))
    acq_func = payload.get('acq_func', 'gp_hedge')
    random_state = int(payload.get('random_state', 42))

    if not all([objective_function_str, bounds_list]):
        raise ValueError("Missing 'objective_function' or 'bounds'")

    # Define search space from bounds
    space = [Real(low, high, name=f'x{i}') for i, (low, high) in enumerate(bounds_list)]

    # Define the objective function that skopt can use
    @use_named_args(space)
    def objective(**params):
        x = np.array(list(params.values()))
        # Use a safe eval environment
        return eval(objective_function_str, {"np": np, "x": x})

    # Perform Bayesian Optimization
    result = gp_minimize(
        func=objective,
        dimensions=space,
        n_calls=n_calls,
        n_initial_points=n_initial_points,
        acq_func=acq_func,
        random_state=random_state
    )
    
    convergence = np.minimum.accumulate(result.func_vals)

    return {
        'results': {
            'best_solution': result.x,
            'best_fitness': result.fun,
            'convergence': convergence.tolist(),
            'function_evaluations': result.func_vals,
        }
    }

if __name__ == '__main__':
    try:
        input_payload = json.load(sys.stdin)
        output = run_bayesian_optimization_analysis(input_payload)
        print(json.dumps(output, default=_to_native_type))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
