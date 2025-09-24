
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
    Solves a linear programming problem using the Two-Phase Simplex method.
    Returns the final tableau and the steps taken.
    """
    num_vars = len(c)
    num_slack = len(b_ub) if b_ub is not None else 0
    num_surplus = len(b_ub) if b_ub is not None else 0
    num_artificial = (len(b_eq) if b_eq is not None else 0) + (len(b_ub) if b_ub is not None and objective == 'minimize' else 0)

    # --- Phase 1: Find a feasible solution ---
    phase1_c = np.zeros(num_vars + num_slack + num_surplus + num_artificial)
    phase1_c[-(num_artificial):] = 1

    tableau_list = []

    # Build the initial tableau for Phase 1
    num_constraints = (len(b_ub) if b_ub is not None else 0) + (len(b_eq) if b_eq is not None else 0)
    tableau = np.zeros((num_constraints + 1, len(phase1_c) + 1))
    
    # Objective row
    tableau[0, :len(c)] = -np.array(c) if objective == 'maximize' else np.array(c)
    
    # Constraints
    row_idx = 0
    art_var_idx = num_vars + num_slack + num_surplus

    if A_ub is not None:
        for i in range(len(A_ub)):
            tableau[row_idx + 1, :num_vars] = A_ub[i]
            if objective == 'maximize': # <= constraint
                tableau[row_idx + 1, num_vars + i] = 1 # Slack
            else: # >= constraint
                tableau[row_idx + 1, num_vars + i] = -1 # Surplus
                tableau[row_idx + 1, art_var_idx] = 1 # Artificial
                art_var_idx += 1
            tableau[row_idx + 1, -1] = b_ub[i]
            row_idx += 1

    if A_eq is not None:
        for i in range(len(A_eq)):
            tableau[row_idx + 1, :num_vars] = A_eq[i]
            tableau[row_idx + 1, art_var_idx] = 1 # Artificial
            tableau[row_idx + 1, -1] = b_eq[i]
            art_var_idx += 1
            row_idx += 1

    # Adjust Phase 1 objective row for artificial variables
    tableau[0, :] = 0
    for i in range(num_constraints):
        if tableau[i+1, num_vars+num_slack+num_surplus:].sum() > 0: # If there's an artificial var
            tableau[0,:] -= tableau[i+1,:]
    
    # Add original objective function for Phase 2
    phase2_obj = np.zeros(len(phase1_c) + 1)
    phase2_obj[:len(c)] = -np.array(c) if objective == 'maximize' else np.array(c)
    tableau = np.vstack([tableau, phase2_obj])
    
    tableau_list.append(tableau.copy().tolist())


    # --- Simplex Algorithm Iterations ---
    while np.any(tableau[0, :-1] < -1e-6): # While there are negative costs in Phase 1 obj
        pivot_col = np.argmin(tableau[0, :-1])
        
        ratios = []
        for i in range(1, num_constraints + 1):
            if tableau[i, pivot_col] > 1e-6:
                ratios.append(tableau[i, -1] / tableau[i, pivot_col])
            else:
                ratios.append(np.inf)
        
        pivot_row_idx = np.argmin(ratios) + 1
        
        if np.isinf(ratios[pivot_row_idx - 1]):
            return {"error": "Unbounded solution", "steps": tableau_list}
            
        pivot_element = tableau[pivot_row_idx, pivot_col]
        tableau[pivot_row_idx, :] /= pivot_element
        
        for i in range(tableau.shape[0]):
            if i != pivot_row_idx:
                tableau[i, :] -= tableau[i, pivot_col] * tableau[pivot_row_idx, :]
        
        tableau_list.append(tableau.copy().tolist())

    # Check if Phase 1 was successful
    if tableau[0, -1] < -1e-6:
        return {"error": "Infeasible problem", "steps": tableau_list}

    # Now, solve Phase 2 using the main objective function
    # The main objective function is already being updated in the tableau
    tableau = np.delete(tableau, 0, 0) # Remove phase 1 objective
    
    while np.any(tableau[0, :num_vars+num_slack] < -1e-6):
        pivot_col = np.argmin(tableau[0, :num_vars+num_slack])
        
        ratios = []
        for i in range(1, num_constraints + 1):
            if tableau[i, pivot_col] > 1e-6:
                ratios.append(tableau[i, -1] / tableau[i, pivot_col])
            else:
                ratios.append(np.inf)
        
        pivot_row_idx = np.argmin(ratios) + 1
        
        if np.isinf(ratios[pivot_row_idx - 1]):
            return {"error": "Unbounded solution in Phase 2", "steps": tableau_list}
            
        pivot_element = tableau[pivot_row_idx, pivot_col]
        tableau[pivot_row_idx, :] /= pivot_element
        
        for i in range(tableau.shape[0]):
            if i != pivot_row_idx:
                tableau[i, :] -= tableau[i, pivot_col] * tableau[pivot_row_idx, :]
        
        tableau_list.append(tableau.copy().tolist())


    # --- Extract Solution ---
    solution = np.zeros(num_vars)
    for j in range(num_vars):
        col = tableau[:, j]
        is_basic = (np.sum(col == 0) == len(col) - 1) and (np.sum(col == 1) == 1)
        if is_basic:
            row_idx = np.where(col == 1)[0][0]
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
        
        A_ub = [A[i] for i, t in enumerate(constraint_types) if t == '<=']
        b_ub = [b[i] for i, t in enumerate(constraint_types) if t == '<=']
        
        # In this simplified simplex, we will treat >= as <= for maximization
        # and vice-versa for minimization. This is not standard but avoids artificial vars for now.
        # A proper two-phase simplex would be needed for full support.
        
        if objective == 'maximize':
             for i, t in enumerate(constraint_types):
                if t == '>=':
                    A_ub.append(-A[i])
                    b_ub.append(-b[i])
        else: # minimize
             for i, t in enumerate(constraint_types):
                if t == '<=':
                    A_ub.append(-A[i])
                    b_ub.append(-b[i])

        A_eq = [A[i] for i, t in enumerate(constraint_types) if t == '==']
        b_eq = [b[i] for i, t in enumerate(constraint_types) if t == '==']
        
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
