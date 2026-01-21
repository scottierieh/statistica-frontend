
import sys
import json
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def solve_knapsack(items, capacity):
    """
    Solves the 0/1 Knapsack problem using dynamic programming.
    """
    n = len(items)
    # dp[i][w] will be the maximum value that can be attained with a capacity of w,
    # considering items from 1 to i.
    dp = [[0 for _ in range(capacity + 1)] for _ in range(n + 1)]

    for i in range(1, n + 1):
        item = items[i - 1]
        weight = item['weight']
        value = item['value']
        for w in range(1, capacity + 1):
            if weight > w:
                # Current item is heavier than capacity w, so we can't include it.
                dp[i][w] = dp[i - 1][w]
            else:
                # Max of (not including the item) vs (including the item)
                dp[i][w] = max(dp[i - 1][w], value + dp[i - 1][w - weight])

    # Backtrack to find which items were included
    selected_items = []
    total_value = dp[n][capacity]
    w = capacity
    for i in range(n, 0, -1):
        if total_value <= 0: break
        if total_value != dp[i-1][w]:
            item = items[i-1]
            selected_items.append(item['name'])
            total_value -= item['value']
            w -= item['weight']
            
    return {
        'total_value': dp[n][capacity],
        'total_weight': sum(item['weight'] for item in items if item['name'] in selected_items),
        'selected_items': selected_items
    }

def run_dynamic_programming_analysis(payload):
    items = payload.get('items', [])
    capacity = int(payload.get('capacity', 0))

    if not items:
        raise ValueError("No items provided for the knapsack.")
    if capacity <= 0:
        raise ValueError("Capacity must be a positive integer.")
        
    # Ensure item weights are integers for this DP approach
    for item in items:
        if not isinstance(item.get('weight'), int) or item.get('weight') <= 0:
            raise ValueError("Item weights must be positive integers.")
        if not isinstance(item.get('value'), (int, float)) or item.get('value') < 0:
            raise ValueError("Item values must be non-negative numbers.")

    result = solve_knapsack(items, capacity)
    return {'results': result}

