
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
    
    # --- Maximization Problem Setup ---
    if objective == 'maximize':
        tableau = np.zeros((num_constraints + 1, num_vars + num_constraints + 1))
        tableau[:-1, :num_vars] = A
        tableau[:-1, num_vars:num_vars + num_constraints] = np.eye(num_constraints)
        tableau[:-1, -1] = b
        tableau[-1, :num_vars] = -np.array(c)
        tableau[-1, -1] = 0
    # --- Minimization Problem Setup ---
    else: # 'minimize'
        # To solve a minimization problem, we can solve the dual maximization problem.
        # min c*x s.t. Ax <= b  <=>  max -b*y s.t. -A_T*y <= -c
        c_dual = -np.array(b)
        A_dual = -np.array(A).T
        b_dual = -np.array(c)
        
        num_vars_dual = len(c_dual)
        num_constraints_dual = len(b_dual)

        tableau = np.zeros((num_constraints_dual + 1, num_vars_dual + num_constraints_dual + 1))
        tableau[:-1, :num_vars_dual] = A_dual
        tableau[:-1, num_vars_dual:num_vars_dual + num_constraints_dual] = np.eye(num_constraints_dual)
        tableau[:-1, -1] = b_dual
        tableau[-1, :num_vars_dual] = -np.array(c_dual)
        tableau[-1, -1] = 0

    tableau_steps = [tableau.copy().tolist()]

    iteration = 0
    max_iterations = 50 

    while np.any(tableau[-1, :-1] < -1e-6) and iteration < max_iterations:
        pivot_col = np.argmin(tableau[-1, :-1])
        
        ratios = []
        for i in range(tableau.shape[0] - 1):
            if tableau[i, pivot_col] > 1e-6:
                ratios.append(tableau[i, -1] / tableau[i, pivot_col])
            else:
                ratios.append(np.inf)
        
        if all(r == np.inf for r in ratios):
            return {"error": "Unbounded solution.", "steps": tableau_steps}

        pivot_row = np.argmin(ratios)
        pivot_element = tableau[pivot_row, pivot_col]
        tableau[pivot_row, :] /= pivot_element
        
        for i in range(tableau.shape[0]):
            if i != pivot_row:
                factor = tableau[i, pivot_col]
                tableau[i, :] -= factor * tableau[pivot_row, :]
        
        tableau_steps.append(tableau.copy().tolist())
        iteration += 1
        
    if iteration >= max_iterations:
         return {"error": "Max iterations reached. The problem may be unbounded or cycling.", "steps": tableau_steps}

    # --- Extract Solution ---
    num_total_vars = tableau.shape[1] - 1
    solution = np.zeros(num_total_vars)
    
    # Identify basic variables
    for col in range(num_total_vars):
        column = tableau[:-1, col]
        is_basic = (np.sum(column) == 1.0) and (len(column[column == 1.0]) == 1)
        if is_basic:
            row_index = np.where(column == 1.0)[0][0]
            # Check if this row hasn't been used for another basic variable
            if np.sum(tableau[row_index, :num_total_vars] == 1.0) == 1:
                 solution[col] = tableau[row_index, -1]

    if objective == 'maximize':
        return {
            "solution": solution[:num_vars].tolist(),
            "optimal_value": tableau[-1, -1],
            "steps": tableau_steps,
            "success": True,
            "message": "Optimization successful."
        }
    else: # For minimization, the solution is in the slack variables of the dual problem
         num_vars_dual = len(c_dual)
         return {
            "solution": solution[num_vars_dual:num_vars_dual + num_vars].tolist(),
            "optimal_value": tableau[-1, -1],
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
