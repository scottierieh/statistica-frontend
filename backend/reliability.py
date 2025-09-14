import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import pearsonr
from sklearn.preprocessing import StandardScaler
from itertools import combinations
import warnings
warnings.filterwarnings('ignore')

class ReliabilityAnalysis:
    """
    Comprehensive Reliability Analysis Class
    Supports multiple reliability estimation methods with detailed diagnostics
    """
    
    def __init__(self, data, confidence_level=0.95, missing_data='listwise', standardize=False):
        self.data = data.copy()
        self.confidence_level = confidence_level
        self.missing_data = missing_data
        self.standardize = standardize
        self.alpha = 1 - confidence_level
        self.results = {}
        print(f"Reliability Analysis initialized - {self.data.shape[0]} observations, {self.data.shape[1]} variables")
    
    def _prepare_items(self, item_cols, reverse_code=None):
        if isinstance(item_cols, str):
            item_cols = [item_cols]
        item_data = self.data[item_cols].copy()
        
        if reverse_code:
            for col in reverse_code:
                if col in item_data.columns:
                    max_val = item_data[col].max()
                    min_val = item_data[col].min()
                    item_data[col] = max_val + min_val - item_data[col]
        
        if self.missing_data == 'listwise':
            item_data = item_data.dropna()
        
        if self.standardize:
            scaler = StandardScaler()
            item_data = pd.DataFrame(scaler.fit_transform(item_data), columns=item_data.columns, index=item_data.index)
        
        return item_data
    
    def cronbach_alpha(self, item_cols, reverse_code=None):
        print("Calculating Cronbach's Alpha...")
        item_data = self._prepare_items(item_cols, reverse_code)
        
        if len(item_data) < 2:
            raise ValueError("Need at least 2 complete observations")
        
        n_items = len(item_cols)
        n_cases = len(item_data)
        item_vars = item_data.var(ddof=1)
        total_scores = item_data.sum(axis=1)
        total_var = total_scores.var(ddof=1)
        
        if total_var == 0:
            return {
                'alpha': 1.0, 'n_items': n_items, 'n_cases': n_cases, 'confidence_interval': [1.0, 1.0], 'sem': 0,
                'item_statistics': {}, 'scale_statistics': {}, 'correlation_matrix': pd.DataFrame()
            }

        sum_item_vars = item_vars.sum()
        alpha = (n_items / (n_items - 1)) * (1 - sum_item_vars / total_var) if n_items > 1 else 1.0
        
        corrected_item_total_corr = {col: pearsonr(item_data[col], total_scores - item_data[col])[0] for col in item_cols}
        
        alpha_if_deleted = {}
        for col in item_cols:
            remaining_items = [c for c in item_cols if c != col]
            if len(remaining_items) > 1:
                remaining_data = item_data[remaining_items]
                remaining_vars = remaining_data.var(ddof=1).sum()
                remaining_total_var = remaining_data.sum(axis=1).var(ddof=1)
                alpha_if_deleted[col] = (len(remaining_items) / (len(remaining_items) - 1)) * (1 - remaining_vars / remaining_total_var) if remaining_total_var > 0 else 1.0
            else:
                alpha_if_deleted[col] = np.nan
        
        corr_matrix = item_data.corr()
        n_pairs = n_items * (n_items - 1) / 2
        sum_corr = corr_matrix.values[np.triu_indices(n_items, k=1)].sum()

        results = {
            'alpha': alpha,
            'n_items': n_items,
            'n_cases': n_cases,
            'confidence_interval': [np.nan, np.nan], # Simplified
            'sem': total_scores.std(ddof=1) * np.sqrt(1 - alpha),
            'item_statistics': {
                'means': item_data.mean().to_dict(),
                'stds': item_data.std(ddof=1).to_dict(),
                'corrected_item_total_correlations': corrected_item_total_corr,
                'alpha_if_deleted': alpha_if_deleted
            },
            'scale_statistics': {
                'mean': total_scores.mean(),
                'std': total_scores.std(ddof=1),
                'variance': total_var,
                'avg_inter_item_correlation': sum_corr / n_pairs if n_pairs > 0 else np.nan
            }
        }
        
        return results

    def _interpret_alpha(self, alpha):
        if alpha >= 0.9: return "Excellent"
        elif alpha >= 0.8: return "Good"
        elif alpha >= 0.7: return "Acceptable"
        elif alpha >= 0.6: return "Questionable"
        else: return "Poor"
