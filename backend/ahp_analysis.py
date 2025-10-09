
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for NumPy types"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        return super(NumpyEncoder, self).default(obj)

class AHPAnalysis:
    """
    Analytic Hierarchy Process (AHP) Analysis Class
    Supports both: 
    1. Criteria-only AHP (no alternatives)
    2. Full AHP with alternatives
    """
    
    def __init__(self, criteria_names, alternative_names=None):
        """
        Initialize AHP analysis
        
        Parameters:
        - criteria_names: List of criteria names
        - alternative_names: List of alternative names (optional)
        """
        self.criteria_names = criteria_names
        self.alternative_names = alternative_names
        self.n_criteria = len(criteria_names)
        self.has_alternatives = alternative_names is not None
        
        if self.has_alternatives:
            self.n_alternatives = len(alternative_names)
            
        # Initialize matrices
        self.criteria_matrix = np.ones((self.n_criteria, self.n_criteria))
        
        if self.has_alternatives:
            # Alternative comparison matrices for each criterion
            self.alternative_matrices = {}
            for criterion in criteria_names:
                self.alternative_matrices[criterion] = np.ones((self.n_alternatives, self.n_alternatives))
    
    def set_criteria_matrix(self, matrix):
        """Set pairwise comparison matrix for criteria"""
        self.criteria_matrix = np.array(matrix, dtype=np.float64)
    
    def set_alternative_matrix(self, criterion_name, matrix):
        """Set pairwise comparison matrix for alternatives under a criterion"""
        if not self.has_alternatives:
            raise ValueError("No alternatives defined")
        self.alternative_matrices[criterion_name] = np.array(matrix, dtype=np.float64)

    def calculate_weights(self, matrix):
        """Calculate priority weights using eigenvalue method"""
        eigenvalues, eigenvectors = np.linalg.eig(matrix)
        max_eigenvalue_index = np.argmax(eigenvalues.real)
        max_eigenvalue = eigenvalues[max_eigenvalue_index].real
        priority_vector = eigenvectors[:, max_eigenvalue_index].real
        weights = priority_vector / np.sum(priority_vector)
        return weights, max_eigenvalue
    
    def calculate_consistency_ratio(self, matrix, max_eigenvalue):
        """Calculate Consistency Ratio (CR)"""
        RI = {1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 
              6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
        
        n = len(matrix)
        CI = (max_eigenvalue - n) / (n - 1) if n > 1 else 0
        CR = CI / RI[n] if n in RI and RI[n] != 0 else 0
        
        return CR, CI
    
    def analyze(self):
        """Perform complete AHP analysis"""
        # Calculate criteria weights
        self.criteria_weights, self.criteria_lambda_max = self.calculate_weights(self.criteria_matrix)
        self.criteria_CR, self.criteria_CI = self.calculate_consistency_ratio(
            self.criteria_matrix, self.criteria_lambda_max)
        
        if self.has_alternatives:
            # Calculate alternative weights for each criterion
            self.alternative_weights = {}
            self.alternative_CR = {}
            self.alternative_CI = {}
            self.alternative_lambda_max = {}
            
            for criterion in self.criteria_names:
                weights, lambda_max = self.calculate_weights(
                    self.alternative_matrices[criterion])
                CR, CI = self.calculate_consistency_ratio(
                    self.alternative_matrices[criterion], lambda_max)
                
                self.alternative_weights[criterion] = weights
                self.alternative_lambda_max[criterion] = lambda_max
                self.alternative_CR[criterion] = CR
                self.alternative_CI[criterion] = CI
            
            self.calculate_final_scores()
    
    def calculate_final_scores(self):
        """Calculate final scores by combining criteria and alternative weights"""
        if not self.has_alternatives:
            return
        
        self.final_scores = np.zeros(self.n_alternatives)
        
        for i, criterion in enumerate(self.criteria_names):
            criterion_weight = self.criteria_weights[i]
            alternative_weight = self.alternative_weights[criterion]
            self.final_scores += criterion_weight * alternative_weight
        
        self.ranking = np.argsort(self.final_scores)[::-1]

    def get_results(self):
        """Return analysis results as a dictionary with JSON-safe types"""
        results = {
            'criteria_analysis': {
                'weights': {name: float(weight) for name, weight in zip(self.criteria_names, self.criteria_weights)},
                'consistency': {
                    'lambda_max': float(self.criteria_lambda_max),
                    'CI': float(self.criteria_CI),
                    'CR': float(self.criteria_CR),
                    'is_consistent': bool(self.criteria_CR < 0.1)
                }
            }
        }
        
        if self.has_alternatives:
            results['alternative_weights_by_criterion'] = {}
            for criterion in self.criteria_names:
                results['alternative_weights_by_criterion'][criterion] = {
                    'weights': {name: float(weight) for name, weight in zip(self.alternative_names, self.alternative_weights[criterion])},
                    'consistency': {
                        'lambda_max': float(self.alternative_lambda_max[criterion]),
                        'CI': float(self.alternative_CI[criterion]),
                        'CR': float(self.alternative_CR[criterion]),
                        'is_consistent': bool(self.alternative_CR[criterion] < 0.1)
                    }
                }
            
            # Final scores as sorted list
            results['final_scores'] = [
                {'name': self.alternative_names[i], 'score': float(self.final_scores[i])}
                for i in self.ranking
            ]
            results['ranking'] = [self.alternative_names[i] for i in self.ranking]

        return results

def geometric_mean_of_matrices(matrices):
    """Calculates the element-wise geometric mean of a list of matrices."""
    if not matrices:
        return None
    
    matrices_array = np.array(matrices, dtype=np.float64)
    
    # Handle any invalid values
    matrices_array = np.where(matrices_array <= 0, 1, matrices_array)
    
    log_matrices = np.log(matrices_array)
    mean_log_matrix = np.mean(log_matrices, axis=0)
    geo_mean_matrix = np.exp(mean_log_matrix)
    
    # Ensure symmetry
    for i in range(geo_mean_matrix.shape[0]):
        for j in range(i, geo_mean_matrix.shape[1]):
            if i == j:
                geo_mean_matrix[i, j] = 1.0
            else:
                geo_mean_matrix[j, i] = 1.0 / geo_mean_matrix[i, j]
                
    return geo_mean_matrix

def process_hierarchy_level(level_nodes, matrices_by_respondent, alternatives, all_criteria_names):
    """
    Recursively process a level of the hierarchy.
    """
    analysis_results = {}
    
    level_criteria_names = [node['name'] for node in level_nodes]
    
    # --- Main criteria analysis for this level ---
    matrix_key = f"sub_criteria_{level_nodes[0].get('parent_id')}" if 'parent_id' in level_nodes[0] else 'criteria'

    if matrix_key not in matrices_by_respondent:
         if 'goal' in matrices_by_respondent and matrix_key == 'criteria':
             matrix_key = 'goal'
         else:
            return {} # Not enough data for this level

    agg_matrix = geometric_mean_of_matrices(matrices_by_respondent[matrix_key])
    
    if agg_matrix is not None:
        ahp = AHPAnalysis(level_criteria_names)
        ahp.set_criteria_matrix(agg_matrix)
        ahp.analyze()
        analysis_results = ahp.get_results()['criteria_analysis']

    # --- Sub-criteria and alternatives analysis ---
    analysis_results['sub_criteria_analysis'] = {}
    
    for node in level_nodes:
        criterion_name = node['name']
        
        # Analyze sub-criteria if they exist
        if 'nodes' in node and node['nodes']:
            sub_analysis = process_hierarchy_level(node['nodes'], matrices_by_respondent, alternatives, all_criteria_names)
            if sub_analysis:
                analysis_results['sub_criteria_analysis'][criterion_name] = sub_analysis
        
        # Analyze alternatives for this criterion if it's a leaf node in the criteria hierarchy
        elif alternatives:
            alt_matrix_key = f"alt_{node['id']}" # Key based on ID from frontend
            alt_matrix_key_by_name = f"alt_{criterion_name}" # Key based on name
            
            if alt_matrix_key in matrices_by_respondent or alt_matrix_key_by_name in matrices_by_respondent:
                key_to_use = alt_matrix_key if alt_matrix_key in matrices_by_respondent else alt_matrix_key_by_name
                agg_alt_matrix = geometric_mean_of_matrices(matrices_by_respondent[key_to_use])
                
                if agg_alt_matrix is not None:
                    alt_ahp = AHPAnalysis(alternatives)
                    alt_ahp.set_criteria_matrix(agg_alt_matrix)
                    alt_ahp.analyze()
                    analysis_results.setdefault('alternatives_analysis', {})[criterion_name] = alt_ahp.get_results()['criteria_analysis']
                    
    return analysis_results


def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            raise ValueError("Empty input received")
        
        payload = json.loads(input_data)
        
        # Extract data from payload
        hierarchy = payload.get('hierarchy')
        matrices_by_respondent = payload.get('matrices')
        alternatives = payload.get('alternatives')
        goal = payload.get('goal', 'Goal')

        # Validate input
        if not hierarchy or not isinstance(hierarchy, list) or len(hierarchy) == 0:
            raise ValueError("Invalid or missing hierarchy data")
        
        if not matrices_by_respondent or not isinstance(matrices_by_respondent, dict):
            raise ValueError("Invalid or missing matrices data")

        # Extract criteria names
        criteria_nodes = hierarchy[0].get('nodes', []) if hierarchy else []

        if not criteria_nodes:
            raise ValueError("No criteria found in hierarchy")
        
        all_criteria_names = [node['name'] for node in criteria_nodes]

        has_alternatives = bool(alternatives and len(alternatives) > 0)
        
        # Perform hierarchical analysis
        full_results = process_hierarchy_level(criteria_nodes, matrices_by_respondent, alternatives, all_criteria_names)

        response = {"results": full_results}
        
        # Output JSON with custom encoder
        print(json.dumps(response, cls=NumpyEncoder, ensure_ascii=False, indent=2))

    except json.JSONDecodeError as e:
        error_response = {
            "error": "Invalid JSON input",
            "details": str(e)
        }
        print(json.dumps(error_response, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
        
    except ValueError as e:
        error_response = {
            "error": "Validation error",
            "details": str(e)
        }
        print(json.dumps(error_response, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
        
    except Exception as e:
        error_response = {
            "error": "Unexpected error",
            "details": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_response, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
