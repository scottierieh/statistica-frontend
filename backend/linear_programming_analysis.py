
import sys
import json
import numpy as np
from scipy.optimize import linprog

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        c = payload.get('c')
        A_ub = payload.get('A_ub')
        b_ub = payload.get('b_ub')
        problem_type = payload.get('problem_type', 'maximize') # Assume maximize by default

        if not all([c, A_ub, b_ub]):
            raise ValueError("Missing required parameters: c, A_ub, or b_ub")
        
        # SciPy's linprog minimizes. For maximization, we negate the objective function's coefficients.
        c_to_send = c if problem_type == 'minimize' else [-val for val in c]
        
        res = linprog(c_to_send, A_ub=A_ub, b_ub=b_ub, bounds=(0, None), method='highs')

        # If we maximized, the optimal value needs to be negated back.
        optimal_value = res.fun if problem_type == 'minimize' else -res.fun if res.success else res.fun

        response = {
            'solution': res.x,
            'optimal_value': optimal_value,
            'success': res.success,
            'message': res.message
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
