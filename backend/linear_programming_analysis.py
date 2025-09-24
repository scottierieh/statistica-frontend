
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

    # We are maximizing, so we use -c in the objective row.
    objective = np.concatenate([-np.array(c), np.zeros(num_constraints + 1)])

    # Build the initial tableau
    tableau = np.zeros((num_constraints + 1, num_vars + num_constraints + 1))
    
    # Constraints part
    tableau[:num_constraints, :num_vars] = A_ub
    tableau[:num_constraints, num_vars:num_vars + num_constraints] = np.identity(num_constraints)
    tableau[:num_constraints, -1] = b_ub
    
    # Objective function part
    tableau[-1, :] = objective

    snapshots = [{'note': 'Initial Tableau', 'table': tableau.tolist()}]
    iteration = 0

    while np.any(tableau[-1, :-1] < -1e-9):
        if iteration > 100: # Safety break
            return {'solution': [], 'optimal_value': 0, 'success': False, 'message': 'Exceeded iteration limit.', 'snapshots': snapshots}
        
        pivot_col = np.where(tableau[-1, :-1] < -1e-9)[0][0]
        
        ratios = np.full(num_constraints, np.inf)
        for i in range(num_constraints):
            if tableau[i, pivot_col] > 1e-9:
                ratios[i] = tableau[i, -1] / tableau[i, pivot_col]
        
        pivot_row = np.argmin(ratios)
        
        if np.isinf(ratios[pivot_row]):
            return {'solution': [], 'optimal_value': np.inf, 'success': False, 'message': 'Solution is unbounded.', 'snapshots': snapshots}

        snapshots.append({'note': f'Iteration {iteration + 1}: Pivot on row {pivot_row + 1}, col {pivot_col + 1} (Before Pivot)', 'table': tableau.tolist()})
        
        pivot_element = tableau[pivot_row, pivot_col]
        tableau[pivot_row, :] /= pivot_element
        
        for i in range(num_constraints + 1):
            if i != pivot_row:
                factor = tableau[i, pivot_col]
                tableau[i, :] -= factor * tableau[pivot_row, :]
        
        snapshots.append({'note': f'Iteration {iteration + 1}: After Pivot', 'table': tableau.tolist()})
        iteration += 1

    snapshots.append({'note': 'Final Tableau', 'table': tableau.tolist()})
    
    solution = np.zeros(num_vars)
    # Correctly identify basic variables and assign their values
    for j in range(num_vars): # Iterate through decision variables
        col = tableau[:, j]
        # Check if this column is a basic variable column
        is_basic = (np.count_nonzero(np.abs(col) < 1e-9) == num_constraints) and (np.abs(np.sum(col) - 1) < 1e-9)
        if is_basic:
            # Find the row index where the '1' is located
            row_index = np.where(np.abs(col - 1) < 1e-9)[0][0]
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

        if not all([c, A_ub, b_ub]):
            raise ValueError("Missing required parameters: c, A_ub, or b_ub")
        
        # Invert objective for maximization as run_simplex expects minimization coefficients in obj row
        c_for_max = [-x for x in c]
        
        # Scipy's linprog and our manual simplex handle this differently. 
        # Our manual simplex negates 'c' internally. So we pass original 'c'.
        result = run_simplex(c, A_ub, b_ub)
        
        # Since we are maximizing, the optimal value from tableau is already correct
        # No need to negate it again.

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
