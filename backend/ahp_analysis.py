
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
    n = matrix.shape[0]
    if n == 0:
        return None

    # Priority Vector (Geometric Mean Method)
    priority_vector = gmean(matrix, axis=1)
    normalized_weights = priority_vector / np.sum(priority_vector)

    # Consistency Check
    weighted_sum_vector = np.dot(matrix, normalized_weights)
    lambda_max = np.mean(weighted_sum_vector / normalized_weights)
    
    ci = (lambda_max - n) / (n - 1) if n > 1 else 0
    ri = RI_TABLE.get(n, 1.59) # Default to 1.59 for n > 15
    cr = (ci / ri) if ri > 0 else 0

    return {
        'priority_vector': normalized_weights.tolist(),
        'lambda_max': lambda_max,
        'consistency_index': ci,
        'consistency_ratio': cr,
        'is_consistent': cr < 0.1
    }

def main():
    try:
        payload = json.load(sys.stdin)
        goal = payload.get('goal')
        criteria = payload.get('criteria')
        alternatives = payload.get('alternatives')
        comparison_matrices = payload.get('comparison_matrices')

        if not all([goal, criteria, alternatives, comparison_matrices]):
            raise ValueError("Missing required fields: goal, criteria, alternatives, or comparison_matrices")

        # 1. Analyze criteria matrix
        criteria_matrix = np.array(comparison_matrices['criteria'])
        criteria_analysis = analyze_matrix(criteria_matrix)
        criteria_weights = np.array(criteria_analysis['priority_vector'])

        # 2. Analyze alternative matrices for each criterion
        alternatives_analysis = {}
        alternative_weights_matrix = []
        for criterion in criteria:
            alt_matrix = np.array(comparison_matrices['alternatives'][criterion])
            analysis = analyze_matrix(alt_matrix)
            alternatives_analysis[criterion] = analysis
            alternative_weights_matrix.append(analysis['priority_vector'])
            
        alternative_weights_matrix = np.array(alternative_weights_matrix).T

        # 3. Synthesize global weights
        global_weights = np.dot(alternative_weights_matrix, criteria_weights)
        
        # Ensure global weights sum to 1
        if np.sum(global_weights) > 0:
            global_weights = global_weights / np.sum(global_weights)

        # 4. Rank alternatives
        ranked_alternatives = sorted(
            zip(alternatives, global_weights),
            key=lambda x: x[1],
            reverse=True
        )

        response = {
            'goal': goal,
            'criteria_analysis': criteria_analysis,
            'alternatives_analysis': alternatives_analysis,
            'synthesis': {
                'global_weights': dict(zip(alternatives, global_weights)),
                'ranking': ranked_alternatives
            }
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
