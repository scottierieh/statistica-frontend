
import sys
import json
import numpy as np
from scipy.optimize import linprog

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

def solve_goal_programming(goals, decision_vars, constraints):
    num_decision_vars = len(decision_vars)
    num_goals = len(goals)
    
    A_eq_base, b_eq_base = [], []
    A_ub_base, b_ub_base = [], []
    
    # Process hard constraints
    for const in constraints:
        if const['type'] == '==':
            A_eq_base.append(const['coeffs'])
            b_eq_base.append(const['rhs'])
        else: # <=
            A_ub_base.append(const['coeffs'])
            b_ub_base.append(const['rhs'])
    
    # Sort goals by priority
    sorted_goals = sorted(goals, key=lambda g: g['priority'])
    
    priorities = sorted(list(set(g['priority'] for g in sorted_goals)))
    
    solution_x = None
    achieved_goals = {}
    steps = []

    for priority in priorities:
        priority_goals = [g for g in sorted_goals if g['priority'] == priority]
        num_priority_goals = len(priority_goals)
        
        # Objective function for this priority level: minimize sum of deviations
        c = np.zeros(num_decision_vars + 2 * num_priority_goals)
        c[num_decision_vars:] = 1 # Minimize d- + d+ for all goals in this level

        # Constraints
        # 1. Hard constraints from previous levels
        A_eq = [row + [0] * (2 * num_priority_goals) for row in A_eq_base] if A_eq_base else []
        b_eq = b_eq_base[:] if b_eq_base else []

        A_ub = [row + [0] * (2 * num_priority_goals) for row in A_ub_base] if A_ub_base else []
        b_ub = b_ub_base[:] if b_ub_base else []

        # 2. Goal achievement constraints from PREVIOUS higher priorities
        for p_prev in sorted(achieved_goals.keys()):
            for goal_name, achieved in achieved_goals[p_prev].items():
                prev_goal = next(g for g in sorted_goals if g['name'] == goal_name)
                row = prev_goal['coeffs'] + [0] * (2 * num_priority_goals)
                A_eq.append(row)
                b_eq.append(achieved['goal_value'])

        # 3. Goal constraints for CURRENT priority level
        for i, goal in enumerate(priority_goals):
            row = np.zeros(num_decision_vars + 2 * num_priority_goals)
            row[:num_decision_vars] = goal['coeffs']
            row[num_decision_vars + 2*i] = -1 # d-
            row[num_decision_vars + 2*i + 1] = 1  # d+
            A_eq.append(row.tolist())
            b_eq.append(goal['rhs'])
            
        bounds = [(0, None) for _ in range(len(c))] # All variables are non-negative

        # Solve LP for this priority level
        res = linprog(c, 
                      A_eq=np.array(A_eq) if A_eq else None, 
                      b_eq=np.array(b_eq) if b_eq else None,
                      A_ub=np.array(A_ub) if A_ub else None,
                      b_ub=np.array(b_ub) if b_ub else None,
                      bounds=bounds, method='highs')
        
        if not res.success:
            raise Exception(f"Optimization failed at priority level {priority}: {res.message}")

        # Store results for this step
        solution_x = res.x[:num_decision_vars]
        deviations = res.x[num_decision_vars:]
        
        step_result = {
            'priority': priority,
            'solution_x': solution_x.tolist(),
            'objective_value': res.fun,
            'goals': []
        }
        
        achieved_goals[priority] = {}
        for i, goal in enumerate(priority_goals):
            goal_value = np.dot(goal['coeffs'], solution_x)
            d_minus = deviations[2*i]
            d_plus = deviations[2*i+1]
            achieved_goals[priority][goal['name']] = {
                'goal_value': goal_value, 'target': goal['rhs'],
                'd_minus': d_minus, 'd_plus': d_plus
            }
            step_result['goals'].append({
                'name': goal['name'], 'achieved': goal_value, 'target': goal['rhs'],
                'd_minus': d_minus, 'd_plus': d_plus
            })
            
        steps.append(step_result)

    return steps


def main():
    try:
        payload = json.load(sys.stdin)
        goals = payload.get('goals')
        decision_vars = payload.get('decisionVars')
        constraints = payload.get('constraints', [])

        if not goals or not decision_vars:
            raise ValueError("Missing 'goals' or 'decisionVars' parameters.")

        steps = solve_goal_programming(goals, decision_vars, constraints)

        final_solution = steps[-1] if steps else {}

        response = {
            'success': True,
            'steps': steps,
            'final_solution': final_solution,
            'message': 'Goal programming finished.'
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
