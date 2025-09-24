
import sys
import json
import numpy as np
from scipy.optimize import linprog

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

def solve_lp(c, A_ub, b_ub, method='highs', objective='maximize'):
    """
    Solves a linear programming problem using scipy.optimize.linprog.
    """
    num_vars = len(c)
    
    # linprog solves minimization problems by default.
    # If we want to maximize, we minimize the negative of the objective function.
    c_for_solver = np.array(c)
    if objective == 'maximize':
        c_for_solver = -c_for_solver

    res = linprog(c=c_for_solver, A_ub=A_ub, b_ub=b_ub, method=method, bounds=[(0, None)] * num_vars)

    solution = []
    optimal_value = 0
    success = res.success
    message = res.message
    
    if success:
        solution = res.x.tolist()
        # If we maximized, the optimal value is the negative of the result
        optimal_value = -res.fun if objective == 'maximize' else res.fun
    
    return {
        'solution': solution,
        'optimal_value': optimal_value,
        'success': success,
        'message': message,
        'slack': res.slack.tolist() if hasattr(res, 'slack') else None,
    }


def main():
    try:
        payload = json.load(sys.stdin)
        c = payload.get('c')
        A_ub = payload.get('A_ub')
        b_ub = payload.get('b_ub')
        objective = payload.get('objective', 'maximize')

        if not all([c, A_ub, b_ub]):
            raise ValueError("Missing required parameters: c, A_ub, or b_ub")
        
        result = solve_lp(c, A_ub, b_ub, objective=objective)
        
        response = {
            'solution': result['solution'],
            'optimal_value': result['optimal_value'],
            'success': result['success'],
            'message': result['message'],
            'slack': result['slack']
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
