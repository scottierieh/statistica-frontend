
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import gmean

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

# Standard Random Index (RI) values for matrix sizes 1 to 15
RI_TABLE = {
    1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41,
    9: 1.45, 10: 1.49, 11: 1.51, 12: 1.48, 13: 1.56, 14: 1.57, 15: 1.59
}

def analyze_matrix(matrix):
    """
    Analyzes a single pairwise comparison matrix.
    Calculates priority vector, lambda_max, CI, and CR.
    """
    matrix = np.array(matrix)
    n = matrix.shape[0]
    if n == 0:
        return None, None

    # Priority Vector (Geometric Mean Method)
    try:
        # Handle potential zero values in the matrix gracefully
        with np.errstate(divide='ignore'):
            priority_vector = gmean(matrix, axis=1)
        
        # Check for NaN or Inf which can result from gmean on rows with zeros
        if not np.all(np.isfinite(priority_vector)):
             # Fallback to a simple mean if gmean fails
             priority_vector = np.mean(matrix, axis=1)

        sum_priority_vector = np.sum(priority_vector)
        if sum_priority_vector == 0:
            # If all are zero, assign equal weights
            normalized_weights = np.ones(n) / n
        else:
            normalized_weights = priority_vector / sum_priority_vector

    except (ValueError, RuntimeWarning) as e:
        # Fallback for invalid values in matrix
        normalized_weights = np.ones(n) / n
    
    # Consistency Check
    weighted_sum_vector = np.dot(matrix, normalized_weights)
    
    # Avoid division by zero if normalized_weights contains zeros
    with np.errstate(divide='ignore', invalid='ignore'):
        lambda_max_per_item = weighted_sum_vector / normalized_weights
    
    lambda_max_per_item = np.nan_to_num(lambda_max_per_item, nan=0.0, posinf=0.0, neginf=0.0)
    lambda_max = np.mean(lambda_max_per_item)
    
    ci = (lambda_max - n) / (n - 1) if n > 1 else 0
    ri = RI_TABLE.get(n, 1.59) # Default to 1.59 for n > 15
    cr = (ci / ri) if ri > 0 else 0

    analysis = {
        'priority_vector': normalized_weights.tolist(),
        'lambda_max': lambda_max,
        'consistency_index': ci,
        'consistency_ratio': cr,
        'is_consistent': cr < 0.1
    }
    return normalized_weights, analysis


def main():
    try:
        payload = json.load(sys.stdin)
        goal = payload.get('goal', 'AHP Analysis')
        hierarchy = payload.get('hierarchy', [])
        has_alternatives = payload.get('hasAlternatives', False)
        alternatives = payload.get('alternatives', [])
        comparison_matrices = payload.get('matrices', {})

        if not hierarchy:
            raise ValueError("Hierarchy is not defined.")

        # --- Recursive Weight Calculation ---
        global_weights = {}
        analysis_results = {}
        
        def calculate_weights(level, parent_global_weight, parent_node_path):
            level_nodes = [node['name'] for node in level['nodes']]
            matrix_key = parent_node_path
            
            matrix = comparison_matrices.get(matrix_key)
            if not matrix:
                raise ValueError(f"Comparison matrix for '{matrix_key}' not found.")

            local_weights_vec, analysis = analyze_matrix(matrix)
            analysis_results[matrix_key] = analysis
            
            local_weights = dict(zip(level_nodes, local_weights_vec))

            for node in level['nodes']:
                current_node_path = f"{parent_node_path}.{node['name']}"
                current_global_weight = parent_global_weight * local_weights.get(node['name'], 0)
                global_weights[current_node_path] = current_global_weight

                # If this node has sub-criteria, recurse
                if 'children' in node and node['children']:
                    calculate_weights(node['children'], current_global_weight, current_node_path)
        
        # Start recursion from the top level
        top_level = hierarchy[0]
        calculate_weights(top_level, 1.0, 'goal')
        
        # --- Synthesize Final Weights ---
        synthesis = {}
        if has_alternatives and alternatives:
            # Get the lowest level criteria weights
            lowest_criteria_paths = [path for path, weight in global_weights.items() if not any(p.startswith(f"{path}.") for p in global_weights)]
            
            alternative_weights_matrix = []
            for criterion_path in lowest_criteria_paths:
                matrix = comparison_matrices.get(criterion_path)
                if not matrix:
                    raise ValueError(f"Alternatives comparison matrix for '{criterion_path}' not found.")
                
                alt_weights, alt_analysis = analyze_matrix(matrix)
                analysis_results[criterion_path] = alt_analysis
                alternative_weights_matrix.append(alt_weights)
            
            alternative_weights_matrix = np.array(alternative_weights_matrix).T
            
            criteria_global_weights = np.array([global_weights[path] for path in lowest_criteria_paths])
            
            final_scores = np.dot(alternative_weights_matrix, criteria_global_weights)

            synthesis['final_weights'] = dict(zip(alternatives, final_scores))
            synthesis['ranking'] = sorted(synthesis['final_weights'].items(), key=lambda x: x[1], reverse=True)
            synthesis['type'] = 'alternatives'

        else:
            # If no alternatives, the final weights are the global weights of the leaf criteria
            leaf_criteria_paths = [path for path, weight in global_weights.items() if not any(p.startswith(f"{path}.") for p in global_weights)]
            final_weights = {path.split('.')[-1]: global_weights[path] for path in leaf_criteria_paths}
            synthesis['final_weights'] = final_weights
            synthesis['ranking'] = sorted(final_weights.items(), key=lambda x: x[1], reverse=True)
            synthesis['type'] = 'criteria'

        response = {
            'goal': goal,
            'analysis_results': analysis_results,
            'synthesis': synthesis
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

