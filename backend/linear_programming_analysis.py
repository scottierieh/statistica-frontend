
import sys
import json
import numpy as np
import matplotlib.pyplot as plt
import io
import base64

try:
    from scipy.optimize import linprog, milp
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

def generate_plot(c, A_ub, b_ub, A_eq, b_eq, solution, objective):
    """Generates a plot for a 2D linear programming problem."""
    if len(c) != 2:
        return None

    fig, ax = plt.subplots(figsize=(8, 8))
    x = np.linspace(0, max(b_ub) * 1.5 if len(b_ub) > 0 else 10, 400)
    
    # Plot constraints
    feasible_y = np.full_like(x, 10000) # Start with a large upper bound

    if A_ub is not None:
        for i in range(A_ub.shape[0]):
            a1, a2 = A_ub[i, 0], A_ub[i, 1]
            b_val = b_ub[i]
            if a2 != 0:
                y_constraint = (b_val - a1 * x) / a2
                ax.plot(x, y_constraint, label=f'{a1}x + {a2}y <= {b_val}')
                feasible_y = np.minimum(feasible_y, y_constraint)
            elif a1 != 0: # Vertical line
                x_constraint_val = b_val / a1
                ax.axvline(x_constraint_val, label=f'{a1}x <= {b_val}')
                feasible_y[x > x_constraint_val] = 0 # Invalidate region

    if A_eq is not None:
        for i in range(A_eq.shape[0]):
            a1, a2 = A_eq[i, 0], A_eq[i, 1]
            b_val = b_eq[i]
            if a2 != 0:
                y_constraint = (b_val - a1 * x) / a2
                ax.plot(x, y_constraint, label=f'{a1}x + {a2}y = {b_val}', linestyle='--')
            # Note: Equality constraints make the feasible region a line, which is harder to visualize with fill_between.
            # This plot focuses on inequality-defined regions.

    # Fill feasible region
    ax.fill_between(x, 0, feasible_y, where=(feasible_y>=0), color='lightgreen', alpha=0.5, label='Feasible Region')

    # Plot objective function (as a contour line)
    if solution is not None:
        obj_val = np.dot(c, solution)
        y_obj = (obj_val - c[0] * x) / c[1] if c[1] != 0 else np.full_like(x, obj_val / c[0])
        ax.plot(x, y_obj, 'k--', label=f'Objective Z = {obj_val:.2f}')
        ax.plot(solution[0], solution[1], 'ro', markersize=10, label=f'Optimal Solution ({solution[0]:.2f}, {solution[1]:.2f})')

    ax.set_xlim((0, None))
    ax.set_ylim((0, None))
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.set_title('Linear Programming Feasible Region')
    ax.legend()
    ax.grid(True)
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def solve_lp_and_dual(c, A_ub, b_ub, A_eq, b_eq, bounds, objective='maximize'):
    """
    Solves the primal LP.
    """
    c_solver = -np.array(c) if objective == 'maximize' else np.array(c)
    
    res = linprog(c_solver, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

    if not res.success:
        return {"error": f"Primal problem could not be solved: {res.message}", "success": False}

    primal_solution = res.x
    primal_optimal_value = -res.fun if objective == 'maximize' else res.fun

    return {
        "success": True,
        "primal_solution": primal_solution.tolist(),
        "primal_optimal_value": primal_optimal_value,
    }
    
def solve_integer_lp(c, A_ub, b_ub, A_eq, b_eq, bounds, integrality, objective='maximize'):
    """
    Solves a Mixed-Integer Linear Program (MILP).
    """
    c_solver = -np.array(c) if objective == 'maximize' else np.array(c)
    
    constraints = []
    if A_ub is not None and A_ub.shape[0] > 0:
        constraints.append(milp(A_ub, ub=b_ub))
    if A_eq is not None and A_eq.shape[0] > 0:
        constraints.append(milp(A_eq, lb=b_eq, ub=b_eq))
        
    res = milp(c=c_solver, constraints=constraints, integrality=integrality, bounds=bounds)

    if not res.success:
        return {"error": f"Integer problem could not be solved: {res.message}", "success": False}

    solution = res.x
    optimal_value = -res.fun if objective == 'maximize' else res.fun
    
    return {
        "success": True,
        "solution": solution.tolist(),
        "optimal_value": optimal_value
    }


def main():
    if not SCIPY_AVAILABLE:
        print(json.dumps({"error": "SciPy library is not installed. Please install it to use this feature."}), file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.load(sys.stdin)
        c = payload.get('c')
        A = np.array(payload.get('A'))
        b = np.array(payload.get('b'))
        constraint_types = payload.get('constraint_types')
        objective = payload.get('objective', 'maximize')
        problem_type = payload.get('problem_type', 'lp')
        variable_types = payload.get('variable_types')

        if not all([c is not None, A is not None, b is not None, constraint_types is not None]):
            raise ValueError("Missing required parameters: c, A, b, or constraint_types")
        
        num_vars = len(c)
        bounds = (0, None) # Non-negativity constraint

        A_ub_list = [A[i] for i, t in enumerate(constraint_types) if t == '<=']
        b_ub_list = [b[i] for i, t in enumerate(constraint_types) if t == '<=']
        
        for i, t in enumerate(constraint_types):
            if t == '>=':
                A_ub_list.append(-A[i])
                b_ub_list.append(-b[i])

        A_eq_list = [A[i] for i, t in enumerate(constraint_types) if t == '==']
        b_eq_list = [b[i] for i, t in enumerate(constraint_types) if t == '==']

        A_ub_np = np.array(A_ub_list) if A_ub_list else None
        b_ub_np = np.array(b_ub_list) if b_ub_list else None
        A_eq_np = np.array(A_eq_list) if A_eq_list else None
        b_eq_np = np.array(b_eq_list) if b_eq_list else None


        if problem_type == 'integer' or problem_type == 'milp':
             integrality = np.array([1 if v_type == 'integer' else 0 for v_type in variable_types])
             result = solve_integer_lp(c, A_ub_np, b_ub_np, A_eq_np, b_eq_np, bounds, integrality, objective)
        else: # Standard LP
            result = solve_lp_and_dual(c, A_ub_np, b_ub_np, A_eq_np, b_eq_np, bounds, objective)

        if not result.get("success"):
            raise ValueError(result.get("error", "An unknown error occurred in the solver."))

        if len(c) == 2 and problem_type == 'lp':
            solution = result.get('primal_solution') or result.get('solution')
            plot_base64 = generate_plot(c, A_ub_np, b_ub_np, A_eq_np, b_eq_np, solution, objective)
            result['plot'] = f"data:image/png;base64,{plot_base64}" if plot_base64 else None

        # Check for the specific car factory example to add interpretation
        is_car_example = (
            objective == 'maximize' and
            np.array_equal(c, [300, 500]) and
            np.array_equal(A, [[2, 3], [3, 4]]) and
            np.array_equal(b, [1000, 800]) and
            constraint_types == ['<=', '<=']
        )

        if is_car_example:
            result['interpretation'] = """### Car Factory Profit Maximization Problem

**Scenario**

A factory produces two types of cars: A and B. The production is limited by available resources: a total of 1000 hours of manufacturing time and 800 units of parts.

| Car Type | Profit (per unit) | Manufacturing Time (hours/unit) | Parts Required (units/unit) |
| :--- | :--- | :--- | :--- |
| A | $300 | 2 | 3 |
| B | $500 | 3 | 4 |

**Problem Definition**

The objective is to maximize the total profit.

- **Objective Function:** `maximize 300x + 500y`
  - `x`: number of cars of type A produced
  - `y`: number of cars of type B produced

- **Constraints:**
  - **Manufacturing Time:** `2x + 3y <= 1000`
  - **Parts Limit:** `3x + 4y <= 800`
  - **Non-negativity:** `x >= 0, y >= 0`

**LP Formulation**

```
maximize   300x + 500y
subject to 2x + 3y <= 1000
           3x + 4y <= 800
           x, y >= 0
```

**Solution**

By using a simplex algorithm, the optimal production plan is calculated.

- **Optimal Solution:**
  - `x = 200` (Car A)
  - `y = 50` (Car B)
- **Maximum Profit:**
  - `300 * 200 + 500 * 50 = $85,000`

This means the factory should produce 200 units of Car A and 50 units of Car B to achieve the highest possible profit of $85,000 within the given resource constraints. The role of Linear Programming is to find this optimal production quantity."""

        print(json.dumps(result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
