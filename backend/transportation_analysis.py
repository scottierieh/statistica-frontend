
import sys
import json
import numpy as np

try:
    from scipy.optimize import linprog
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

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

def main():
    if not SCIPY_AVAILABLE:
        print(json.dumps({"error": "SciPy library is not installed."}), file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.load(sys.stdin)
        costs = np.array(payload.get('costs'))
        supply = np.array(payload.get('supply'))
        demand = np.array(payload.get('demand'))

        num_sources, num_destinations = costs.shape

        # Objective function (minimize total cost)
        c = costs.flatten()

        # Constraints
        # Supply constraints: sum(x_ij for j) <= supply_i
        A_ub = []
        for i in range(num_sources):
            row = np.zeros(num_sources * num_destinations)
            row[i*num_destinations : (i+1)*num_destinations] = 1
            A_ub.append(row)
        b_ub = supply

        # Demand constraints: sum(x_ij for i) >= demand_j
        # Or -sum(x_ij for i) <= -demand_j
        for j in range(num_destinations):
            row = np.zeros(num_sources * num_destinations)
            row[j::num_destinations] = -1
            A_ub.append(row)
            b_ub = np.append(b_ub, -demand[j])
        
        # Bounds (non-negativity)
        bounds = (0, None)

        res = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')

        if not res.success:
            raise ValueError(f"Solver failed: {res.message}")

        solution_matrix = res.x.reshape((num_sources, num_destinations))
        total_cost = res.fun
        
        response = {
            'success': True,
            'solution': solution_matrix.tolist(),
            'total_cost': total_cost
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
