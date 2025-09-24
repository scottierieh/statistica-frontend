
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

def solve_simplex(c, A, b, objective='maximize'):
    num_vars = len(c)
    num_constraints = len(b)

    # --- Create the initial tableau ---
    # Convert to standard form (maximization)
    if objective == 'minimize':
        c = -np.array(c)

    # Add slack variables
    slack_vars = np.eye(num_constraints)
    A_std = np.hstack((A, slack_vars))
    
    # Create the tableau
    tableau = np.zeros((num_constraints + 1, num_vars + num_constraints + 1))
    tableau[:-1, :num_vars + num_constraints] = A_std
    tableau[:-1, -1] = b
    tableau[-1, :num_vars] = c 
    
    tableau_steps = [tableau.copy().tolist()]

    iteration = 0
    max_iterations = 50 

    # --- Simplex Algorithm Iterations ---
    while np.any(tableau[-1, :-1] > 1e-6) and iteration < max_iterations:
        # Find pivot column (most positive in objective row)
        pivot_col = np.argmax(tableau[-1, :-1])
        
        # Check for unboundedness
        if np.all(tableau[:-1, pivot_col] <= 0):
            return {"error": "Unbounded solution.", "steps": tableau_steps}
            
        # Find pivot row (minimum ratio test)
        ratios = []
        for i in range(num_constraints):
            if tableau[i, pivot_col] > 1e-9:
                ratios.append(tableau[i, -1] / tableau[i, pivot_col])
            else:
                ratios.append(np.inf)
        
        pivot_row = np.argmin(ratios)

        # Perform pivot operation
        pivot_element = tableau[pivot_row, pivot_col]
        tableau[pivot_row, :] /= pivot_element
        
        for i in range(num_constraints + 1):
            if i != pivot_row:
                factor = tableau[i, pivot_col]
                tableau[i, :] -= factor * tableau[pivot_row, :]
        
        tableau_steps.append(tableau.copy().tolist())
        iteration += 1
        
    if iteration >= max_iterations:
         return {"error": "Max iterations reached. The problem may be unbounded or cycling.", "steps": tableau_steps}
    
    # --- Extract Solution ---
    solution = np.zeros(num_vars)
    for j in range(num_vars):
        col = tableau[:-1, j]
        is_basic = (np.sum(col) == 1.0) and (len(col[col == 1.0]) == 1)
        if is_basic:
            row_index = np.where(col == 1.0)[0][0]
            solution[j] = tableau[row_index, -1]

    optimal_value = -tableau[-1, -1] if objective == 'maximize' else tableau[-1, -1]

    return {
        "solution": solution.tolist(),
        "optimal_value": optimal_value,
        "steps": tableau_steps,
        "success": True,
        "message": "Optimization successful."
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
        
        result = solve_simplex(c, A_ub, b_ub, objective=objective)
        
        if "error" in result:
             print(json.dumps(result), file=sys.stderr)
             sys.exit(1)

        response = {
            'solution': result['solution'],
            'optimal_value': result['optimal_value'],
            'success': result['success'],
            'message': result['message'],
            'tableau_steps': result.get('steps', [])
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
