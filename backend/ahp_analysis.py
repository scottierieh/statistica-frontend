

import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

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
        self.criteria_matrix = np.array(matrix)
    
    def input_criteria_comparison(self, i, j, value):
        """Input pairwise comparison for criteria"""
        self.criteria_matrix[i][j] = value
        self.criteria_matrix[j][i] = 1 / value
    
    def set_alternative_matrix(self, criterion_name, matrix):
        """Set pairwise comparison matrix for alternatives under a criterion"""
        if not self.has_alternatives:
            raise ValueError("No alternatives defined")
        self.alternative_matrices[criterion_name] = np.array(matrix)
    
    def input_alternative_comparison(self, criterion_name, i, j, value):
        """Input pairwise comparison for alternatives under a criterion"""
        if not self.has_alternatives:
            raise ValueError("No alternatives defined")
        self.alternative_matrices[criterion_name][i][j] = value
        self.alternative_matrices[criterion_name][j][i] = 1 / value
    
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
            
            # Calculate final scores for alternatives
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
        
        # Create ranking
        self.ranking = np.argsort(self.final_scores)[::-1]

    def get_results(self):
        """Return analysis results as a dictionary"""
        results = {
            'criteria_analysis': {
                'weights': dict(zip(self.criteria_names, self.criteria_weights)),
                'consistency': {
                    'lambda_max': self.criteria_lambda_max,
                    'CI': self.criteria_CI,
                    'CR': self.criteria_CR,
                    'is_consistent': self.criteria_CR < 0.1
                }
            }
        }
        
        if self.has_alternatives:
            results['alternatives_analysis'] = {}
            for criterion in self.criteria_names:
                results['alternatives_analysis'][criterion] = {
                    'weights': dict(zip(self.alternative_names, self.alternative_weights[criterion])),
                    'consistency': {
                        'lambda_max': self.alternative_lambda_max[criterion],
                        'CI': self.alternative_CI[criterion],
                        'CR': self.alternative_CR[criterion],
                        'is_consistent': self.alternative_CR[criterion] < 0.1
                    }
                }
            
            results['final_scores'] = dict(zip(self.alternative_names, self.final_scores))
            results['ranking'] = [self.alternative_names[i] for i in self.ranking]

        return results

def geometric_mean_of_matrices(matrices):
    """Calculates the element-wise geometric mean of a list of matrices."""
    if not matrices:
        return None
    
    matrices_array = np.array(matrices)
    # Using log-transform to calculate geometric mean to avoid overflow/underflow
    log_matrices = np.log(matrices_array)
    mean_log_matrix = np.mean(log_matrices, axis=0)
    geo_mean_matrix = np.exp(mean_log_matrix)
    
    # Normalize to ensure reciprocity
    for i in range(geo_mean_matrix.shape[0]):
        for j in range(i, geo_mean_matrix.shape[1]):
            if i == j:
                geo_mean_matrix[i, j] = 1
            else:
                geo_mean_matrix[j, i] = 1 / geo_mean_matrix[i, j]
                
    return geo_mean_matrix

def main():
    try:
        payload = json.load(sys.stdin)
        
        hierarchy = payload.get('hierarchy')
        matrices_by_respondent = payload.get('matrices')
        alternatives = payload.get('alternatives')
        goal = payload.get('goal', 'Goal')

        criteria_nodes = [node['name'] for node in hierarchy[0]['nodes']] if hierarchy else []

        if not criteria_nodes:
            raise ValueError("No criteria found in hierarchy")

        has_alternatives = bool(alternatives)
        
        ahp = AHPAnalysis(criteria_nodes, alternatives if has_alternatives else None)
        
        # Aggregate matrices using geometric mean
        agg_matrices = {}
        for key, matrix_list in matrices_by_respondent.items():
            if matrix_list:
                agg_matrices[key] = geometric_mean_of_matrices(matrix_list)

        # Set criteria matrix
        if 'goal' in agg_matrices:
            ahp.set_criteria_matrix(agg_matrices['goal'])
        else:
            raise ValueError("Criteria comparison matrix for 'goal' not found in matrices")

        if has_alternatives:
            for criterion in criteria_nodes:
                matrix_key = f"goal.{criterion}"
                if matrix_key in agg_matrices:
                    ahp.set_alternative_matrix(criterion, agg_matrices[matrix_key])
                else:
                    raise ValueError(f"Alternative comparison matrix for criterion '{criterion}' not found in matrices")

        ahp.analyze()
        results_data = ahp.get_results()

        # Rename keys to be more frontend-friendly
        if 'alternatives_analysis' in results_data:
            results_data['alternative_weights_by_criterion'] = results_data.pop('alternatives_analysis')
        
        if has_alternatives:
            results_data['final_scores'] = sorted([{'name': name, 'score': score} for name, score in results_data['final_scores'].items()], key=lambda x: x['score'], reverse=True)


        response = {"results": results_data}
        
        print(json.dumps(response, default=lambda x: x.tolist() if isinstance(x, np.ndarray) else x))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
