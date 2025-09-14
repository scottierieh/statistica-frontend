import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import pearsonr, spearmanr
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import FactorAnalysis
from itertools import combinations
import warnings
warnings.filterwarnings('ignore')

class ReliabilityAnalysis:
    """
    Comprehensive Reliability Analysis Class
    Supports multiple reliability estimation methods with detailed diagnostics
    """
    
    def __init__(self, data, confidence_level=0.95, missing_data='listwise', standardize=False):
        """
        Initialize Reliability Analysis
        
        Parameters:
        -----------
        data : pandas.DataFrame
            Data to analyze
        confidence_level : float
            Confidence level for confidence intervals
        missing_data : str
            'listwise' or 'pairwise' deletion
        standardize : bool
            Whether to standardize items before analysis
        """
        self.data = data.copy()
        self.confidence_level = confidence_level
        self.missing_data = missing_data
        self.standardize = standardize
        self.alpha = 1 - confidence_level
        
        # Results storage
        self.results = {}
        
        print(f"Reliability Analysis initialized - {self.data.shape[0]} observations, {self.data.shape[1]} variables")
    
    def _prepare_items(self, item_cols, reverse_code=None):
        """Prepare item data with missing data handling and standardization"""
        if isinstance(item_cols, str):
            item_cols = [item_cols]
        
        # Extract item data
        item_data = self.data[item_cols].copy()
        
        # Reverse code items if specified
        if reverse_code:
            for col in reverse_code:
                if col in item_data.columns:
                    max_val = item_data[col].max()
                    min_val = item_data[col].min()
                    item_data[col] = max_val + min_val - item_data[col]
        
        # Handle missing data
        if self.missing_data == 'listwise':
            item_data = item_data.dropna()
        # For pairwise, handle in correlation calculations
        
        # Standardize if requested
        if self.standardize:
            scaler = StandardScaler()
            item_data = pd.DataFrame(
                scaler.fit_transform(item_data),
                columns=item_data.columns,
                index=item_data.index
            )
        
        return item_data
    
    def _confidence_interval_correlation(self, r, n):
        """Calculate confidence interval for correlation coefficient"""
        if abs(r) >= 1:
            return [np.nan, np.nan]
        
        # Fisher z-transformation
        z = 0.5 * np.log((1 + r) / (1 - r))
        se = 1 / np.sqrt(n - 3)
        z_critical = stats.norm.ppf(1 - self.alpha/2)
        
        z_lower = z - z_critical * se
        z_upper = z + z_critical * se
        
        # Transform back to correlation
        ci_lower = (np.exp(2 * z_lower) - 1) / (np.exp(2 * z_lower) + 1)
        ci_upper = (np.exp(2 * z_upper) - 1) / (np.exp(2 * z_upper) + 1)
        
        return [ci_lower, ci_upper]
    
    def cronbach_alpha(self, item_cols, reverse_code=None):
        """
        Calculate Cronbach's Alpha reliability
        
        Parameters:
        -----------
        item_cols : list
            Column names of items to analyze
        reverse_code : list
            Items to reverse code before analysis
        """
        print("Calculating Cronbach's Alpha...")
        
        item_data = self._prepare_items(item_cols, reverse_code)
        
        if len(item_data) < 2:
            raise ValueError("Need at least 2 complete observations")
        
        n_items = len(item_cols)
        n_cases = len(item_data)
        
        # Calculate item statistics
        item_means = item_data.mean()
        item_stds = item_data.std(ddof=1)
        item_vars = item_data.var(ddof=1)
        
        # Calculate total scores
        total_scores = item_data.sum(axis=1)
        total_var = total_scores.var(ddof=1)
        total_mean = total_scores.mean()
        total_std = total_scores.std(ddof=1)
        
        # Calculate Alpha
        sum_item_vars = item_vars.sum()
        alpha = (n_items / (n_items - 1)) * (1 - sum_item_vars / total_var)
        
        # Calculate item-total correlations
        item_total_corr = {}
        corrected_item_total_corr = {}
        
        for col in item_cols:
            # Item-total correlation (including the item)
            item_total_corr[col] = pearsonr(item_data[col], total_scores)[0]
            
            # Corrected item-total correlation (excluding the item)
            corrected_total = total_scores - item_data[col]
            corrected_item_total_corr[col] = pearsonr(item_data[col], corrected_total)[0]
        
        # Calculate Alpha if item deleted
        alpha_if_deleted = {}
        for col in item_cols:
            remaining_items = [c for c in item_cols if c != col]
            remaining_data = item_data[remaining_items]
            remaining_vars = remaining_data.var(ddof=1).sum()
            remaining_total_var = remaining_data.sum(axis=1).var(ddof=1)
            remaining_k = len(remaining_items)
            
            if remaining_k > 1:
                alpha_if_deleted[col] = (remaining_k / (remaining_k - 1)) * (1 - remaining_vars / remaining_total_var)
            else:
                alpha_if_deleted[col] = np.nan
        
        # Standard Error of Measurement
        sem = total_std * np.sqrt(1 - alpha)
        
        # Confidence interval for Alpha (approximate)
        se_alpha = np.sqrt((2 * n_items) / ((n_items - 1) * n_cases))
        z_critical = stats.norm.ppf(1 - self.alpha/2)
        ci_lower = max(0, alpha - z_critical * se_alpha)
        ci_upper = min(1, alpha + z_critical * se_alpha)
        
        # Inter-item correlation matrix
        corr_matrix = item_data.corr()
        
        # Average inter-item correlation
        n_pairs = n_items * (n_items - 1) / 2
        sum_corr = 0
        for i in range(n_items):
            for j in range(i + 1, n_items):
                sum_corr += corr_matrix.iloc[i, j]
        avg_inter_item_corr = sum_corr / n_pairs if n_pairs > 0 else np.nan
        
        # Store results
        results = {
            'type': 'cronbach_alpha',
            'alpha': alpha,
            'n_items': n_items,
            'n_cases': n_cases,
            'confidence_interval': [ci_lower, ci_upper],
            'sem': sem,
            'item_statistics': {
                'means': item_means,
                'stds': item_stds,
                'variances': item_vars,
                'item_total_correlations': item_total_corr,
                'corrected_item_total_correlations': corrected_item_total_corr,
                'alpha_if_deleted': alpha_if_deleted
            },
            'scale_statistics': {
                'mean': total_mean,
                'std': total_std,
                'variance': total_var,
                'avg_inter_item_correlation': avg_inter_item_corr
            },
            'correlation_matrix': corr_matrix
        }
        
        self.results['cronbach_alpha'] = results
        return results
    
    def _interpret_alpha(self, alpha):
        """Interpret Cronbach's Alpha value"""
        if alpha >= 0.9:
            return "Excellent"
        elif alpha >= 0.8:
            return "Good"
        elif alpha >= 0.7:
            return "Acceptable"
        elif alpha >= 0.6:
            return "Questionable"
        else:
            return "Poor"

