
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

def solve_simplex(c, A_ub, b_ub, A_eq, b_eq, objective='maximize'):
    """
    Solves a linear programming problem using the Simplex method, including the Big M method for minimization.
    Returns the final tableau and the steps taken.
    """
    num_vars = len(c)
    num_slack = len(b_ub) if b_ub is not None else 0
    num_eq = len(b_eq) if b_eq is not None else 0
    
    # For >= constraints (minimization) or == constraints, we need artificial variables
    num_artificial = num_eq + (num_slack if objective == 'minimize' else 0)

    # Big M value
    M = 1e9 

    # --- Create the initial tableau ---
    num_constraints = num_slack + num_eq
    num_total_vars = num_vars + num_slack + num_artificial
    
    tableau = np.zeros((num_constraints + 1, num_total_vars + 1))
    
    # Objective Row (c_j row)
    tableau[0, :num_vars] = -np.array(c) if objective == 'maximize' else np.array(c)

    # Adjust objective function for Big M method
    if objective == 'minimize':
        tableau[0, num_vars + num_slack:num_vars + num_slack + num_artificial] = M

    # Constraint Rows
    row_idx = 0
    if A_ub is not None: # Represents <= for max, >= for min
        for i in range(num_slack):
            tableau[row_idx + 1, :num_vars] = A_ub[i]
            tableau[row_idx + 1, -1] = b_ub[i]
            if objective == 'maximize':
                tableau[row_idx + 1, num_vars + i] = 1 # Slack variable
            else: # minimize, >= constraint
                tableau[row_idx + 1, num_vars + i] = -1 # Surplus variable
                tableau[row_idx + 1, num_vars + num_slack + row_idx] = 1 # Artificial variable
            row_idx += 1

    if A_eq is not None:
        for i in range(num_eq):
            tableau[row_idx + 1, :num_vars] = A_eq[i]
            tableau[row_idx + 1, -1] = b_eq[i]
            # Artificial variable for equality constraint
            tableau[row_idx + 1, num_vars + num_slack + row_idx] = 1
            row_idx += 1

    # Adjust objective row for artificial variables in Big M method
    if num_artificial > 0 and objective == 'minimize':
         for i in range(num_constraints):
              if tableau[i+1, num_vars+num_slack:num_vars+num_slack+num_artificial].any(): # If row has an artificial var
                  tableau[0,:] = tableau[0,:] - M * tableau[i+1,:]

    tableau_list = [tableau.copy().tolist()]

    # --- Simplex Algorithm Iterations ---
    while np.any(tableau[0, :-1] < -1e-6):
        pivot_col = np.argmin(tableau[0, :-1])
        
        ratios = []
        for i in range(1, num_constraints + 1):
            if tableau[i, pivot_col] > 1e-6:
                ratios.append(tableau[i, -1] / tableau[i, pivot_col])
            else:
                ratios.append(np.inf)
        
        if not any(r != np.inf for r in ratios):
             return {"error": "Unbounded solution", "steps": tableau_list}

        pivot_row_idx = np.argmin(ratios) + 1
            
        pivot_element = tableau[pivot_row_idx, pivot_col]
        tableau[pivot_row_idx, :] /= pivot_element
        
        for i in range(num_constraints + 1):
            if i != pivot_row_idx:
                tableau[i, :] -= tableau[i, pivot_col] * tableau[pivot_row_idx, :]
        
        tableau_list.append(tableau.copy().tolist())

    # --- Extract Solution ---
    solution = np.zeros(num_vars)
    for j in range(num_vars):
        col = tableau[1:, j]
        is_basic = (np.sum(col == 0) == len(col) - 1) and (np.sum(col == 1) == 1)
        if is_basic:
            row_idx = np.where(col == 1)[0][0] + 1
            solution[j] = tableau[row_idx, -1]

    optimal_value = tableau[0, -1]
    if objective == 'maximize':
        optimal_value = -optimal_value
        
    return {
        "success": True,
        "solution": solution.tolist(),
        "optimal_value": optimal_value,
        "steps": tableau_list,
    }


def main():
    try:
        payload = json.load(sys.stdin)
        c = payload.get('c')
        A = np.array(payload.get('A'))
        b = np.array(payload.get('b'))
        constraint_types = payload.get('constraint_types')
        objective = payload.get('objective', 'maximize')

        if not all([c is not None, A is not None, b is not None, constraint_types is not None]):
            raise ValueError("Missing required parameters: c, A, b, or constraint_types")
        
        # Based on standard form, <= for max, >= for min
        A_ub = [A[i] for i, t in enumerate(constraint_types) if (objective == 'maximize' and t == '<=') or (objective == 'minimize' and t == '>=')]
        b_ub = [b[i] for i, t in enumerate(constraint_types) if (objective == 'maximize' and t == '<=') or (objective == 'minimize' and t == '>=')]
        
        A_eq = [A[i] for i, t in enumerate(constraint_types) if t == '==']
        b_eq = [b[i] for i, t in enumerate(constraint_types) if t == '==']

        # Handle non-standard constraints by conversion (only for LP, not for Tableau)
        for i, t in enumerate(constraint_types):
            if objective == 'maximize' and t == '>=':
                A_ub.append(-A[i])
                b_ub.append(-b[i])
            elif objective == 'minimize' and t == '<=':
                A_ub.append(-A[i])
                b_ub.append(-b[i])

        result = solve_simplex(c, 
                               np.array(A_ub) if A_ub else None, 
                               np.array(b_ub) if b_ub else None, 
                               np.array(A_eq) if A_eq else None,
                               np.array(b_eq) if b_eq else None,
                               objective)

        if not result.get("success"):
            raise ValueError(result.get("error", "An unknown error occurred in the solver."))

        print(json.dumps(result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
