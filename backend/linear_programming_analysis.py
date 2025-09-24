
import sys
import json
import numpy as np

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

def run_simplex(c, A_ub, b_ub):
    num_vars = len(c)
    num_constraints = len(b_ub)
    
    # --- Build Tableau ---
    # The tableau will have `num_constraints + 1` rows and `num_vars + num_constraints + 1` columns
    tableau = np.zeros((num_constraints + 1, num_vars + num_constraints + 1))
    
    # Add constraints to tableau
    tableau[:num_constraints, :num_vars] = A_ub
    # Add slack variables
    tableau[:num_constraints, num_vars:num_vars + num_constraints] = np.identity(num_constraints)
    # Add RHS (b values)
    tableau[:num_constraints, -1] = b_ub
    
    # Add objective function to the last row (negated for maximization)
    tableau[-1, :num_vars] = -np.array(c)
    
    snapshots = []
    snapshots.append({'note': 'Initial Tableau', 'table': tableau.tolist()})

    iteration = 0
    while np.any(tableau[-1, :-1] < -1e-8) and iteration < 100: # Iteration guard
        iteration += 1
        
        # --- Find pivot column ---
        pivot_col = np.argmin(tableau[-1, :-1])
        
        # --- Find pivot row ---
        ratios = []
        for i in range(num_constraints):
            if tableau[i, pivot_col] > 1e-8:
                ratios.append(tableau[i, -1] / tableau[i, pivot_col])
            else:
                ratios.append(np.inf)
        
        pivot_row = np.argmin(ratios)
        
        if np.isinf(ratios[pivot_row]):
             # Unbounded solution
            return { 'solution': [], 'optimal_value': np.inf, 'success': False, 'message': 'Solution is unbounded.', 'snapshots': snapshots }

        # --- Pivot Operation ---
        pivot_element = tableau[pivot_row, pivot_col]
        # Normalize pivot row
        tableau[pivot_row, :] /= pivot_element
        
        # Eliminate other entries in pivot column
        for i in range(num_constraints + 1):
            if i != pivot_row:
                factor = tableau[i, pivot_col]
                tableau[i, :] -= factor * tableau[pivot_row, :]
        
        snapshots.append({'note': f'Iteration {iteration} (Pivot on row {pivot_row+1}, col {pivot_col+1})', 'table': tableau.tolist()})
        
    # --- Extract Solution ---
    solution = np.zeros(num_vars)
    for j in range(num_vars):
        col = tableau[:, j]
        is_basic = (np.count_nonzero(col) == 1) and (np.sum(col) == 1.0)
        if is_basic:
            row_index = np.where(col == 1.0)[0][0]
            solution[j] = tableau[row_index, -1]
            
    optimal_value = tableau[-1, -1]
    
    return {
        'solution': solution.tolist(),
        'optimal_value': optimal_value,
        'success': True,
        'message': 'Optimization terminated successfully.',
        'snapshots': snapshots
    }


def main():
    try:
        payload = json.load(sys.stdin)
        c = payload.get('c')
        A_ub = payload.get('A_ub')
        b_ub = payload.get('b_ub')
        problem_type = payload.get('problem_type', 'maximize')

        if not all([c, A_ub, b_ub]):
            raise ValueError("Missing required parameters: c, A_ub, or b_ub")
        
        c_np = np.array(c)
        if problem_type == 'maximize':
            c_np = -c_np

        # SciPy's linprog minimizes, so we run our simplex on the maximization form
        # The internal simplex implementation handles maximization by negating 'c'
        result = run_simplex(c, A_ub, b_ub)
        
        # If we maximized, the optimal value from the Z-row is already negated, so it's correct.
        
        response = {
            'solution': result['solution'],
            'optimal_value': result['optimal_value'],
            'success': result['success'],
            'message': result['message'],
            'snapshots': result['snapshots']
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
