
import sys
import json
import numpy as np

try:
    from scipy.optimize import linprog, milp
    from scipy.optimize import LinearConstraint
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

def solve_lp(c, A_ub, b_ub, A_eq, b_eq, bounds, objective='maximize'):
    """
    Solves a standard Linear Program (LP).
    """
    c_solver = -np.array(c) if objective == 'maximize' else np.array(c)
    
    res = linprog(c_solver, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

    if not res.success:
        return {"error": f"LP problem could not be solved: {res.message}", "success": False}

    optimal_value = -res.fun if objective == 'maximize' else res.fun

    return {
        "success": True,
        "primal_solution": res.x.tolist(),
        "primal_optimal_value": optimal_value,
    }
    
def solve_milp(c, A_ub, b_ub, A_eq, b_eq, bounds, integrality, objective='maximize'):
    """
    Solves a Mixed-Integer Linear Program (MILP).
    """
    c_solver = -np.array(c) if objective == 'maximize' else np.array(c)
    
    scipy_constraints = []
    if A_ub is not None and A_ub.size > 0:
        scipy_constraints.append(LinearConstraint(A_ub, -np.inf, b_ub))
    if A_eq is not None and A_eq.size > 0:
        scipy_constraints.append(LinearConstraint(A_eq, b_eq, b_eq))
    
    res = milp(c=c_solver, constraints=scipy_constraints, integrality=integrality, bounds=bounds)

    if not res.success:
        return {"error": f"Integer problem could not be solved: {res.message}", "success": False}

    optimal_value = -res.fun if objective == 'maximize' else res.fun
    
    return {
        "success": True,
        "solution": res.x.tolist(),
        "optimal_value": optimal_value
    }


def run_linear_programming_analysis(payload):
    if not SCIPY_AVAILABLE:
        raise ImportError("SciPy library is not installed. Please install it to use this feature.")

    c = payload.get('c')
    A = np.array(payload.get('A'))
    b = np.array(payload.get('b'))
    constraint_types = payload.get('constraint_types')
    objective = payload.get('objective', 'maximize')
    variable_types = payload.get('variable_types')
    problem_type = payload.get('problem_type', 'lp')

    if not all([c is not None, A is not None, b is not None, constraint_types is not None]):
        raise ValueError("Missing required parameters: c, A, b, or constraint_types")
    
    bounds = (0, None)

    is_integer_problem = problem_type == 'milp' or (variable_types and any(v == 'integer' for v in variable_types))
    
    A_ub = [A[i] for i, t in enumerate(constraint_types) if t == '<=']
    b_ub = [b[i] for i, t in enumerate(constraint_types) if t == '<=']
    
    for i, t in enumerate(constraint_types):
        if t == '>=':
            A_ub.append(-A[i])
            b_ub.append(-b[i])

    A_eq = [A[i] for i, t in enumerate(constraint_types) if t == '==']
    b_eq = [b[i] for i, t in enumerate(constraint_types) if t == '==']

    if is_integer_problem:
            integrality = np.array([1 if v_type == 'integer' else 0 for v_type in variable_types])
            result = solve_milp(c, 
                                np.array(A_ub) if A_ub else None, 
                                np.array(b_ub) if b_ub else None, 
                                np.array(A_eq) if A_eq else None,
                                np.array(b_eq) if b_eq else None,
                                bounds, integrality, objective)
    else: # Standard LP
        result = solve_lp(c, 
                                np.array(A_ub) if A_ub else None, 
                                np.array(b_ub) if b_ub else None, 
                                np.array(A_eq) if A_eq else None,
                                np.array(b_eq) if b_eq else None,
                                bounds, objective)

    if not result.get("success"):
        raise ValueError(result.get("error", "An unknown error occurred in the solver."))

    # Rename keys for consistency if needed
    if "primal_solution" in result:
        result["solution"] = result.pop("primal_solution")
    if "primal_optimal_value" in result:
        result["optimal_value"] = result.pop("primal_optimal_value")

    return json.loads(json.dumps(result, default=_to_native_type))

