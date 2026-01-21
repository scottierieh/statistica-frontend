
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

def run_nonlinear_programming_analysis(payload):
    objective_str = payload.get('objective_function')
    constraints_list = payload.get('constraints', [])
    bounds = payload.get('bounds')
    initial_guess = payload.get('initial_guess')

    if not all([objective_str, bounds, initial_guess]):
        raise ValueError("Missing 'objective_function', 'bounds', or 'initial_guess'")

    # Define objective function
    def objective(x):
        return eval(objective_str, {"np": np, "x": x})

    # Define constraints
    constraints = []
    for c in constraints_list:
        constraints.append({
            'type': c['type'],
            'fun': lambda x, fun_str=c['fun']: eval(fun_str, {"np": np, "x": x})
        })

    # Run optimization
    result = minimize(objective, initial_guess, method='SLSQP', bounds=bounds, constraints=constraints)

    if not result.success:
        raise Exception(f"Optimization failed: {result.message}")

    return {
        'results': {
            'solution': result.x.tolist(),
            'objective_value': float(result.fun),
            'n_iterations': int(result.nit),
            'message': result.message,
            'success': bool(result.success)
        }
    }

if __name__ == '__main__':
    try:
        input_payload = json.load(sys.stdin)
        output = run_nonlinear_programming_analysis(input_payload)
        print(json.dumps(output, default=_to_native_type))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
