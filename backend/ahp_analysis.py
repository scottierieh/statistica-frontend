
import sys
import json
import numpy as np
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def ahp_analysis(matrix):
    """
    Performs the Analytic Hierarchy Process (AHP) on a pairwise comparison matrix.

    Args:
        matrix (list of lists): A square, reciprocal pairwise comparison matrix.

    Returns:
        dict: A dictionary containing the calculated weights and consistency ratio.
    """
    try:
        matrix = np.array(matrix)
        n = matrix.shape[0]

        if n != matrix.shape[1]:
            raise ValueError("Matrix must be square.")

        # --- 1. Calculate Weights (Eigenvector Method) ---
        # Normalize the matrix by column sums
        col_sums = matrix.sum(axis=0)
        norm_matrix = matrix / col_sums

        # Calculate the average of each row to get the priority vector (weights)
        weights = norm_matrix.mean(axis=1)

        # --- 2. Calculate Consistency ---
        # Random Index (RI) values for matrices of size 1 to 10
        ri_values = {
            1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
            6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
        }
        
        # Calculate the weighted sum vector
        weighted_sum_vector = np.dot(matrix, weights)
        
        # Calculate lambda_max
        lambda_max = np.mean(weighted_sum_vector / weights)
        
        # Calculate Consistency Index (CI)
        if n <= 2:
            ci = 0
        else:
            ci = (lambda_max - n) / (n - 1)
        
        # Calculate Consistency Ratio (CR)
        ri = ri_values.get(n)
        if ri is None:
            # For n > 10, use an approximation, though not standard AHP
            ri = (1.98 * (n - 2)) / n 
            
        cr = ci / ri if ri != 0 else 0

        return {
            'weights': weights.tolist(),
            'consistency_ratio': cr,
            'is_consistent': cr < 0.10
        }

    except Exception as e:
        return {"error": str(e)}

def main():
    try:
        payload = json.load(sys.stdin)
        matrix = payload.get('matrix')
        
        if not matrix:
            raise ValueError("Missing 'matrix' parameter")

        results = ahp_analysis(matrix)

        response = {
            'results': results
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
