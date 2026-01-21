
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

def run_transportation_analysis(payload):
    costs = np.array(payload.get('costs'))
    supply = np.array(payload.get('supply'))
    demand = np.array(payload.get('demand'))

    if not all(x is not None for x in [costs, supply, demand]):
        raise ValueError("Missing 'costs', 'supply', or 'demand'")

    num_sources, num_dests = costs.shape

    if len(supply) != num_sources or len(demand) != num_dests:
        raise ValueError("Dimension mismatch between costs, supply, and demand")

    # Objective function (flattened cost matrix)
    c = costs.flatten()

    # Equality constraints
    A_eq = []
    b_eq = []

    # Supply constraints
    for i in range(num_sources):
        row = np.zeros(num_sources * num_dests)
        row[i*num_dests : (i+1)*num_dests] = 1
        A_eq.append(row)
        b_eq.append(supply[i])

    # Demand constraints
    for j in range(num_dests):
        row = np.zeros(num_sources * num_dests)
        row[j::num_dests] = 1
        A_eq.append(row)
        b_eq.append(demand[j])
    
    bounds = (0, None)

    res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

    if not res.success:
        raise Exception(f"Solver failed: {res.message}")
        
    shipments = []
    solution = res.x.reshape((num_sources, num_dests))
    for i in range(num_sources):
        for j in range(num_dests):
            if solution[i, j] > 1e-5:
                shipments.append({
                    "source": f"Source {i+1}",
                    "destination": f"Destination {j+1}",
                    "amount": solution[i, j]
                })
    
    response = {
        "success": True,
        "total_cost": res.fun,
        "shipments": shipments
    }
    
    return json.loads(json.dumps(response, default=_to_native_type))
