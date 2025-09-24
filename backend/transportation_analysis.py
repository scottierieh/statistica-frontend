
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
    
    while np.sum(supply) > 0 and np.sum(demand) > 0:
        min_cost = np.inf
        min_i, min_j = -1, -1
        for i in range(n):
            for j in range(m):
                if supply[i] > 0 and demand[j] > 0 and costs[i, j] < min_cost:
                    min_cost = costs[i, j]
                    min_i, min_j = i, j
        
        if min_i == -1: break

        quantity = min(supply[min_i], demand[min_j])
        solution[min_i, min_j] = quantity
        supply[min_i] -= quantity
        demand[min_j] -= quantity
        
        if supply[min_i] == 0:
            costs[min_i, :] = np.inf
        if demand[min_j] == 0:
            costs[:, min_j] = np.inf
            
    return solution

def vogel_approximation(supply, demand, costs):
    supply = np.array(supply)
    demand = np.array(demand)
    costs = np.array(costs, dtype=float)
    n, m = costs.shape
    solution = np.zeros((n, m))

    while np.sum(supply) > 0 and np.sum(demand) > 0:
        row_penalties = []
        for i in range(n):
            if supply[i] > 0:
                row_costs = sorted(costs[i, demand > 0])
                row_penalties.append(row_costs[1] - row_costs[0] if len(row_costs) > 1 else row_costs[0])
            else:
                row_penalties.append(-1)

        col_penalties = []
        for j in range(m):
            if demand[j] > 0:
                col_costs = sorted(costs[supply > 0, j])
                col_penalties.append(col_costs[1] - col_costs[0] if len(col_costs) > 1 else col_costs[0])
            else:
                col_penalties.append(-1)
        
        max_penalty = -1
        is_row = False
        idx = -1

        for i, p in enumerate(row_penalties):
            if p > max_penalty:
                max_penalty = p
                is_row = True
                idx = i
        
        for j, p in enumerate(col_penalties):
            if p > max_penalty:
                max_penalty = p
                is_row = False
                idx = j

        if idx == -1: break
        
        alloc_i, alloc_j = -1, -1
        if is_row:
            min_cost_j = -1
            min_cost = np.inf
            for j in range(m):
                if demand[j] > 0 and costs[idx, j] < min_cost:
                    min_cost = costs[idx, j]
                    min_cost_j = j
            alloc_i, alloc_j = idx, min_cost_j
        else:
            min_cost_i = -1
            min_cost = np.inf
            for i in range(n):
                if supply[i] > 0 and costs[i, idx] < min_cost:
                    min_cost = costs[i, idx]
                    min_cost_i = i
            alloc_i, alloc_j = min_cost_i, idx

        if alloc_i == -1 or alloc_j == -1: break

        quantity = min(supply[alloc_i], demand[alloc_j])
        solution[alloc_i, alloc_j] = quantity
        supply[alloc_i] -= quantity
        demand[alloc_j] -= quantity

    return solution

def modi_method(initial_solution, costs):
    steps = []
    solution = initial_solution.copy()
    n, m = solution.shape
    
    for iteration in range(10): # Limit iterations
        u = np.full(n, np.nan)
        v = np.full(m, np.nan)
        u[0] = 0

        # Calculate u and v
        for _ in range(n + m):
            for i in range(n):
                for j in range(m):
                    if solution[i, j] > 0:
                        if not np.isnan(u[i]) and np.isnan(v[j]):
                            v[j] = costs[i, j] - u[i]
                        elif np.isnan(u[i]) and not np.isnan(v[j]):
                            u[i] = costs[i, j] - v[j]

        # Calculate improvement indices
        improvement_indices = np.zeros((n, m))
        max_improvement_index = -np.inf
        entering_cell = None
        for i in range(n):
            for j in range(m):
                if solution[i, j] == 0:
                    improvement_indices[i, j] = u[i] + v[j] - costs[i, j]
                    if improvement_indices[i, j] > max_improvement_index:
                        max_improvement_index = improvement_indices[i, j]
                        entering_cell = (i, j)

        step_info = {
            'iteration': iteration + 1,
            'u': u.tolist(), 'v': v.tolist(),
            'improvement_indices': improvement_indices.tolist(),
            'max_improvement_index': max_improvement_index,
            'entering_cell': entering_cell,
            'message': ''
        }

        if max_improvement_index <= 0:
            step_info['message'] = "Optimal solution found."
            steps.append(step_info)
            return solution, steps

        # Find the loop
        path = find_loop(solution, entering_cell)
        if not path:
            step_info['message'] = "Could not find a loop to improve the solution. Optimal or degenerate case."
            steps.append(step_info)
            return solution, steps
            
        step_info['message'] = f"Improving solution by adjusting path: {path}"

        # Adjust allocations
        min_allocation = np.inf
        for i in range(1, len(path), 2):
            r, c = path[i]
            min_allocation = min(min_allocation, solution[r, c])
        
        for i in range(len(path)):
            r, c = path[i]
            if i % 2 == 0:
                solution[r, c] += min_allocation
            else:
                solution[r, c] -= min_allocation
                
        steps.append(step_info)

    return solution, steps


def find_loop(solution, start_node):
    # This is a simplified loop finder and may not handle all cases
    path = [start_node]
    
    def search(current, direction):
        r, c = current
        
        # Search horizontally
        if direction == 'h':
            for j in range(solution.shape[1]):
                if j != c and solution[r, j] > 0 and (r,j) not in path:
                    new_path = path + [(r, j)]
                    if (r,j) == start_node: return new_path # Should not happen
                    
                    if solution.shape[0] > 1: # Check if vertical move is possible
                         result = search((r,j), 'v')
                         if result: return result

        # Search vertically
        else: # direction == 'v'
            for i in range(solution.shape[0]):
                if i != r and solution[i, c] > 0 and (i,c) not in path:
                    new_path = path + [(i, c)]
                    if (i,c) == start_node: return new_path # Should not happen

                    # Check if the start column is now in the same row
                    if i == start_node[0]: 
                        final_path = new_path + [start_node]
                        return final_path
                    
                    if solution.shape[1] > 1:
                        result = search((i, c), 'h')
                        if result: return result
        return None
        
    # Start searching horizontally
    for j in range(solution.shape[1]):
        if j != start_node[1] and solution[start_node[0], j] > 0:
            path.append((start_node[0], j))
            res = search(path[-1], 'v')
            if res:
                # Reconstruct path to be alternating + and -
                final_path = [start_node, res[-2]]
                
                # find a point in path[1]'s col
                for i in range(solution.shape[0]):
                    if i != res[-2][0] and solution[i, res[-2][1]] > 0 and i == start_node[0]:
                        final_path.append((i, res[-2][1]))
                        final_path.append(start_node)
                        return final_path
                return res

            path.pop()

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
            message = "Could not find a clear path to optimality from the initial solution. The result shown is the best found."

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
