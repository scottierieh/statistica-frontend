
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
        A_ub = payload.get('A')
        b_ub = payload.get('b')

        if not all([c, A_ub, b_ub]):
            raise ValueError("Missing 'c', 'A', or 'b' parameters.")

        # scipy.linprog finds the minimum, so we need to negate 'c' for maximization
        c_min = [-x for x in c]

        res = linprog(c_min, A_ub=A_ub, b_ub=b_ub, method='highs')

        if not res.success:
            raise ValueError(f"Linear programming failed: {res.message}")

        # Format results
        solution = {f'x{i+1}': val for i, val in enumerate(res.x)}
        optimal_value = -res.fun # Negate back for maximization result

        # Create problem description strings
        objective_function_str = f"Max Z = {' + '.join([f'{coef}x{i+1}' for i, coef in enumerate(c)])}"
        constraints_str = [
            f"{' + '.join([f'{A_ub[i][j]}x{j+1}' for j in range(len(A_ub[i]))])} <= {b_ub[i]}"
            for i in range(len(A_ub))
        ]

        response = {
            "results": {
                "solution": solution,
                "optimal_value": optimal_value,
                "objective_function_str": objective_function_str,
                "constraints_str": constraints_str,
                "iterations": [], # No iterations are provided in this simplified version
            }
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
