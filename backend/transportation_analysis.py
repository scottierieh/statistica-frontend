
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

def north_west_corner(supply, demand):
    supply = np.array(supply)
    demand = np.array(demand)
    n, m = len(supply), len(demand)
    solution = np.zeros((n, m))
    i, j = 0, 0
    while i < n and j < m:
        quantity = min(supply[i], demand[j])
        solution[i, j] = quantity
        supply[i] -= quantity
        demand[j] -= quantity
        if supply[i] == 0:
            i += 1
        else:
            j += 1
    return solution

def least_cost(supply, demand, costs):
    supply = np.array(supply)
    demand = np.array(demand)
    costs = np.array(costs)
    n, m = costs.shape
    solution = np.zeros((n, m))
    
    costs_copy = costs.copy().astype(float)

    while np.sum(supply) > 1e-6 and np.sum(demand) > 1e-6:
        min_cost = np.inf
        min_i, min_j = -1, -1
        
        # Find cell with minimum cost
        for i in range(n):
            for j in range(m):
                if supply[i] > 1e-6 and demand[j] > 1e-6 and costs_copy[i, j] < min_cost:
                    min_cost = costs_copy[i, j]
                    min_i, min_j = i, j
        
        if min_i == -1: break

        quantity = min(supply[min_i], demand[min_j])
        solution[min_i, min_j] = quantity
        supply[min_i] -= quantity
        demand[min_j] -= quantity
        
        # Mark row/column as fulfilled by setting costs to infinity
        if supply[min_i] < 1e-6:
            costs_copy[min_i, :] = np.inf
        if demand[min_j] < 1e-6:
            costs_copy[:, min_j] = np.inf
            
    return solution

def vogel_approximation(supply, demand, costs):
    supply_copy = np.array(supply, dtype=float)
    demand_copy = np.array(demand, dtype=float)
    costs_copy = np.array(costs, dtype=float)
    n, m = costs.shape
    solution = np.zeros((n, m))

    while np.sum(supply_copy) > 1e-6 and np.sum(demand_copy) > 1e-6:
        row_penalties = []
        for i in range(n):
            if supply_copy[i] > 1e-6:
                row_costs = sorted([costs_copy[i, j] for j in range(m) if demand_copy[j] > 1e-6])
                row_penalties.append(row_costs[1] - row_costs[0] if len(row_costs) > 1 else (row_costs[0] if len(row_costs) > 0 else -1))
            else:
                row_penalties.append(-1)

        col_penalties = []
        for j in range(m):
            if demand_copy[j] > 1e-6:
                col_costs = sorted([costs_copy[i, j] for i in range(n) if supply_copy[i] > 1e-6])
                col_penalties.append(col_costs[1] - col_costs[0] if len(col_costs) > 1 else (col_costs[0] if len(col_costs) > 0 else -1))
            else:
                col_penalties.append(-1)
        
        max_penalty = -1
        is_row = False
        idx = -1

        for i, p in enumerate(row_penalties):
            if p > max_penalty:
                max_penalty = p; is_row = True; idx = i
        
        for j, p in enumerate(col_penalties):
            if p > max_penalty:
                max_penalty = p; is_row = False; idx = j

        if idx == -1: break
        
        alloc_i, alloc_j = -1, -1
        if is_row:
            min_cost_j = -1; min_cost = np.inf
            for j in range(m):
                if demand_copy[j] > 1e-6 and costs_copy[idx, j] < min_cost:
                    min_cost = costs_copy[idx, j]; min_cost_j = j
            alloc_i, alloc_j = idx, min_cost_j
        else:
            min_cost_i = -1; min_cost = np.inf
            for i in range(n):
                if supply_copy[i] > 1e-6 and costs_copy[i, idx] < min_cost:
                    min_cost = costs_copy[i, idx]; min_cost_i = i
            alloc_i, alloc_j = min_cost_i, idx

        if alloc_i == -1 or alloc_j == -1: break

        quantity = min(supply_copy[alloc_i], demand_copy[alloc_j])
        solution[alloc_i, alloc_j] = quantity
        supply_copy[alloc_i] -= quantity
        demand_copy[alloc_j] -= quantity

    return solution

def modi_method(initial_solution, costs):
    steps = []
    solution = initial_solution.copy()
    n, m = solution.shape
    
    for iteration in range(15): # Limit iterations to prevent infinite loops
        u = np.full(n, np.nan)
        v = np.full(m, np.nan)
        u[0] = 0

        # Calculate u and v for basic cells
        for _ in range(n + m):
            for i in range(n):
                for j in range(m):
                    if solution[i, j] > 1e-6: # Basic cell
                        if not np.isnan(u[i]) and np.isnan(v[j]):
                            v[j] = costs[i, j] - u[i]
                        elif np.isnan(u[i]) and not np.isnan(v[j]):
                            u[i] = costs[i, j] - v[j]

        # Calculate improvement indices (opportunity costs) for non-basic cells
        improvement_indices = np.zeros((n, m))
        max_improvement_index = -np.inf
        entering_cell = None
        for i in range(n):
            for j in range(m):
                if solution[i, j] < 1e-6: # Non-basic cell
                    improvement_indices[i, j] = costs[i, j] - (u[i] + v[j])
                    if improvement_indices[i, j] < max_improvement_index:
                        max_improvement_index = improvement_indices[i, j]
                        entering_cell = (i, j)

        step_info = {
            'iteration': iteration + 1, 'u': u.tolist(), 'v': v.tolist(),
            'improvement_indices': improvement_indices.tolist(),
            'max_improvement_index': max_improvement_index,
            'entering_cell': entering_cell, 'message': ''
        }

        if max_improvement_index >= -1e-6:
            step_info['message'] = "Optimal solution found."
            steps.append(step_info)
            return solution, steps

        # Find the loop
        path = find_loop_bfs(solution, entering_cell)
        if not path:
            step_info['message'] = "Could not find a loop to improve the solution. Optimal or degenerate case."
            steps.append(step_info)
            return solution, steps
            
        step_info['message'] = f"Improving solution by adjusting path: {path}"

        # Adjust allocations
        min_allocation = np.inf
        for i in range(1, len(path), 2):
            r, c = path[i]; min_allocation = min(min_allocation, solution[r, c])
        
        for i in range(len(path)):
            r, c = path[i]
            solution[r, c] += min_allocation if i % 2 == 0 else -min_allocation
                
        steps.append(step_info)

    return solution, steps


def find_loop_bfs(solution, start_node):
    n, m = solution.shape
    
    # Breadth-First Search to find a path
    # 'parent' tracks the path, 'direction' tracks if the last move was horizontal or vertical
    q = [(start_node, [start_node], 'h')]
    visited = {start_node}

    while q:
        (current_r, current_c), path, direction = q.pop(0)

        # Search horizontally
        if direction == 'h':
            for next_c in range(m):
                if next_c != current_c and solution[current_r, next_c] > 1e-6:
                    if (current_r, next_c) == start_node: continue
                    # Check if this move completes a loop
                    if next_c == start_node[1]:
                        return path + [(current_r, next_c)]
                    if (current_r, next_c) not in visited:
                        visited.add((current_r, next_c))
                        q.append(((current_r, next_c), path + [(current_r, next_c)], 'v'))
        # Search vertically
        else: # direction == 'v'
            for next_r in range(n):
                if next_r != current_r and solution[next_r, current_c] > 1e-6:
                    if (next_r, current_c) == start_node: continue
                    # Check if this move completes a loop
                    if next_r == start_node[0]:
                        return path + [(next_r, current_c)]
                    if (next_r, current_c) not in visited:
                        visited.add((next_r, current_c))
                        q.append(((next_r, current_c), path + [(next_r, current_c)], 'h'))
    return None

def main():
    try:
        payload = json.load(sys.stdin)
        costs = np.array(payload.get('costs'))
        supply = np.array(payload.get('supply'))
        demand = np.array(payload.get('demand'))
        initial_method = payload.get('initial_method', 'least_cost')
        optimization_method = payload.get('optimization_method', 'modi')

        # Balance the problem
        total_supply = np.sum(supply)
        total_demand = np.sum(demand)

        if total_supply > total_demand:
            demand = np.append(demand, total_supply - total_demand)
            costs = np.c_[costs, np.zeros(costs.shape[0])]
        elif total_demand > total_supply:
            supply = np.append(supply, total_demand - total_supply)
            costs = np.r_[costs, [np.zeros(costs.shape[1])]]
        
        # Get initial solution
        if initial_method == 'north_west':
            initial_solution = north_west_corner(supply.copy(), demand.copy())
        elif initial_method == 'vam':
            initial_solution = vogel_approximation(supply.copy(), demand.copy(), costs.copy())
        else: # least_cost
            initial_solution = least_cost(supply.copy(), demand.copy(), costs.copy())
        
        initial_cost = np.sum(initial_solution * costs)
        
        # Optimize if requested
        optimal_solution, steps = modi_method(initial_solution.copy(), costs)
        optimal_cost = np.sum(optimal_solution * costs)
        
        message = "Optimal solution found."
        if not steps or "Optimal" not in steps[-1].get('message', ''):
             # check if loop finder failed
            if steps and "Could not find a loop" in steps[-1].get('message', ''):
                 message = "Could not find a loop to improve the solution. The result may be optimal or degenerate."
            else:
                message = "The optimization process did not converge to a clear optimal solution within the iteration limit."

        response = {
            'initial_solution': initial_solution.tolist(),
            'initial_cost': initial_cost,
            'initial_method': initial_method,
            'optimal_solution': optimal_solution.tolist(),
            'optimal_cost': optimal_cost,
            'optimization_method': optimization_method,
            'steps': steps,
            'message': message,
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
