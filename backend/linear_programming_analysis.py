
import sys
import json
import numpy as np
from scipy.optimize import linprog

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

def main():
    try:
        payload = json.load(sys.stdin)
        c = np.array(payload.get('c'))
        A_ub = np.array(payload.get('A'))
        b_ub = np.array(payload.get('b'))
        
        if c is None or A_ub is None or b_ub is None:
            raise ValueError("Missing c, A, or b parameters.")

        num_vars = len(c)
        num_constraints = len(b_ub)
        
        # We assume a maximization problem, so we negate c for minimization
        c_neg = -c
        
        iterations = []
        
        def simplex_callback(res):
            tableau = res.get('tableau')
            if tableau is not None:
                phase = res.get('phase')
                nit = res.get('nit')
                pivot = res.get('pivot')
                
                title = f"{nit+1}. "
                if phase == 1:
                    title += "Phase 1 - "
                if 'status' in res and res.status != 0:
                    title += f"Pivot Selection: Row {pivot[0]}, Column {pivot[1]} (Before Pivot)"
                else:
                    title += "Optimal Tableau"

                iterations.append({
                    "title": title,
                    "tableau": tableau.tolist()
                })


        res = linprog(c_neg, A_ub=A_ub, b_ub=b_ub, method='simplex', callback=simplex_callback)

        if not res.success:
            raise Exception(f"Optimization failed: {res.message}")

        solution = {f'x{i+1}': x for i, x in enumerate(res.x)} if res.x is not None else {}
        
        objective_function_str = f"Max Z = {' + '.join([f'{c[i]}·x{i+1}' for i in range(num_vars)])}"
        
        constraints_str = []
        for i in range(num_constraints):
            constraint_parts = []
            for j in range(num_vars):
                if A_ub[i, j] != 0:
                    constraint_parts.append(f"{A_ub[i, j]}·x{j+1}")
            constraints_str.append(f"{' + '.join(constraint_parts)} <= {b_ub[i]}")


        response = {
            'results': {
                'solution': solution,
                'optimal_value': -res.fun if res.fun is not None else None,
                'objective_function_str': objective_function_str,
                'constraints_str': constraints_str,
                'iterations': iterations
            }
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
