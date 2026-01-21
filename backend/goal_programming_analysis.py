
import sys
import json
import numpy as np
from scipy.optimize import linprog

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def solve_goal_programming(goals, constraints, num_vars):
    priorities = sorted(list(set(g['priority'] for g in goals)))
    
    solution = np.zeros(num_vars)
    achieved_goals = {}

    for p in priorities:
        # Objective: Minimize sum of deviations for current priority
        c = np.zeros(num_vars + 2 * len(goals))
        for i, goal in enumerate(goals):
            if goal['priority'] == p:
                c[num_vars + 2*i] = 1 # d_minus
                c[num_vars + 2*i + 1] = 1 # d_plus

        A_eq_list, b_eq_list = [], []

        # Add constraints for already achieved higher-priority goals
        for p_prev in sorted(achieved_goals.keys()):
            for i, goal in enumerate(goals):
                if goal['priority'] == p_prev:
                    deviation = achieved_goals[p_prev][i]
                    row = np.zeros(num_vars + 2 * len(goals))
                    row[num_vars + 2*i] = 1 # d_minus
                    row[num_vars + 2*i + 1] = 1 # d_plus
                    A_eq_list.append(row)
                    b_eq_list.append(deviation)
        
        # Add goal constraints
        for i, goal in enumerate(goals):
            row = np.zeros(num_vars + 2 * len(goals))
            row[:num_vars] = goal['coeffs']
            row[num_vars + 2*i] = -1 # -d_minus
            row[num_vars + 2*i + 1] = 1 # +d_plus
            A_eq_list.append(row)
            b_eq_list.append(goal['target'])

        # Add hard constraints
        A_ub_list, b_ub_list = [], []
        for const in constraints:
            if const['type'] == '<=':
                row = np.zeros(num_vars + 2 * len(goals))
                row[:num_vars] = const['coeffs']
                A_ub_list.append(row)
                b_ub_list.append(const['rhs'])
            elif const['type'] == '>=':
                row = np.zeros(num_vars + 2 * len(goals))
                row[:num_vars] = -np.array(const['coeffs'])
                A_ub_list.append(row)
                b_ub_list.append(-const['rhs'])
            elif const['type'] == '==':
                 row = np.zeros(num_vars + 2 * len(goals))
                 row[:num_vars] = const['coeffs']
                 A_eq_list.append(row)
                 b_eq_list.append(const['rhs'])

        A_eq = np.array(A_eq_list) if A_eq_list else None
        b_eq = np.array(b_eq_list) if b_eq_list else None
        A_ub = np.array(A_ub_list) if A_ub_list else None
        b_ub = np.array(b_ub_list) if b_ub_list else None
        
        bounds = [(0, None)] * (num_vars + 2 * len(goals))

        res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
        
        if not res.success:
            raise Exception(f"Optimization failed for priority {p}: {res.message}")

        solution = res.x
        
        current_priority_deviations = []
        for i, goal in enumerate(goals):
             if goal['priority'] == p:
                d_minus = solution[num_vars + 2*i]
                d_plus = solution[num_vars + 2*i + 1]
                current_priority_deviations.append(d_minus + d_plus)
        achieved_goals[p] = current_priority_deviations

    deviations = {}
    for i, goal in enumerate(goals):
        deviations[f"goal_{i+1}_priority_{goal['priority']}_d_minus"] = solution[num_vars + 2*i]
        deviations[f"goal_{i+1}_priority_{goal['priority']}_d_plus"] = solution[num_vars + 2*i + 1]
    
    return {
        "success": True,
        "solution": solution[:num_vars].tolist(),
        "deviations": deviations
    }


def main():
    try:
        payload = json.load(sys.stdin)
        goals = payload.get('goals', [])
        constraints = payload.get('constraints', [])
        num_vars = len(goals[0]['coeffs']) if goals else 0

        if not goals or num_vars == 0:
            raise ValueError("Invalid goals or variable count.")
        
        result = solve_goal_programming(goals, constraints, num_vars)
        
        print(json.dumps(result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
