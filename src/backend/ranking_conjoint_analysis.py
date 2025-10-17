
import sys
import json
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.special import softmax
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Optional
import warnings
import os
from itertools import combinations, product
import io
import base64

warnings.filterwarnings('ignore')
sns.set_style("whitegrid")
plt.rcParams['figure.facecolor'] = 'white'

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

class RankingConjointAnalyzer:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.coefficients = None
        self.part_worths = None
        self.attribute_importance = None
        self.fitted = False
        self.X = None
        self.y = None
        self.exploded_data = None
        self.ranking_data = None
        self.attributes = None

    def prepare_data(self, 
                     ranking_data: pd.DataFrame, 
                     attributes: Dict[str, List[str]]) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
        self.ranking_data = ranking_data
        self.attributes = attributes
        self.attribute_names = list(attributes.keys())
        self.level_names = {}
        self.baselines = {attr: levels[0] for attr, levels in attributes.items()}
        
        exploded_data = []
        
        # Ensure 'respondent_id' exists
        if 'respondent_id' not in ranking_data.columns:
            ranking_data['respondent_id'] = 'resp_1'

        for resp_id in ranking_data['respondent_id'].unique():
            resp_data = ranking_data[ranking_data['respondent_id'] == resp_id].copy()
            resp_data = resp_data.sort_values('rank')
            
            n_profiles = len(resp_data)
            for i in range(n_profiles - 1):
                chosen = resp_data.iloc[i]
                remaining = resp_data.iloc[i:].copy()
                
                for _, profile in remaining.iterrows():
                    row = profile.to_dict()
                    row['respondent_id'] = resp_id
                    row['choice_set_id'] = f"{resp_id}_rank{i+1}"
                    row['choice'] = 1 if profile['profile_id'] == chosen['profile_id'] else 0
                    exploded_data.append(row)
        
        exploded_df = pd.DataFrame(exploded_data)
        
        X_list = []
        self.feature_names = []
        for attr_name, levels in attributes.items():
            self.level_names[attr_name] = levels[1:]
            for level in levels[1:]:
                dummy = (exploded_df[attr_name] == level).astype(int)
                X_list.append(dummy.values)
                self.feature_names.append(f"{attr_name}_{level}")
        
        X = np.column_stack(X_list)
        y = exploded_df['choice'].values
        
        return X, y, exploded_df

    def log_likelihood(self, beta: np.ndarray, X: np.ndarray, y: np.ndarray, 
                       exploded_data: pd.DataFrame) -> float:
        V = X @ beta
        exploded_data['utility'] = V
        exploded_data['exp_utility'] = np.exp(V)
        denom = exploded_data.groupby('choice_set_id')['exp_utility'].transform('sum')
        prob = exploded_data['exp_utility'] / denom
        ll = np.sum(y * np.log(prob + 1e-10))
        return -ll

    def fit(self, X: np.ndarray, y: np.ndarray, exploded_data: pd.DataFrame):
        self.X = X
        self.y = y
        self.exploded_data = exploded_data.copy()
        
        n_params = X.shape[1]
        beta_init = np.zeros(n_params)
        
        result = minimize(
            fun=self.log_likelihood,
            x0=beta_init,
            args=(X, y, exploded_data.copy()),
            method='BFGS',
            options={'disp': self.verbose, 'maxiter': 1000}
        )
        
        if result.success:
            self.coefficients = result.x
            self.fitted = True
            self.log_likelihood_value = -result.fun
            
            # Calculate additional fit metrics
            self._calculate_fit_metrics()
        else:
            raise RuntimeError("Model estimation failed: " + result.message)
        
        return self

    def _calculate_fit_metrics(self):
        """Calculate additional model fit metrics"""
        n_params = len(self.coefficients)
        n_obs = len(self.y)
        
        # Null model log-likelihood (equal probabilities)
        null_ll = -n_obs * np.log(2)  # Binary choice in exploded logit
        
        # McFadden's Pseudo R-squared
        self.pseudo_r2 = 1 - (self.log_likelihood_value / null_ll) if null_ll != 0 else 0
        
        # AIC and BIC
        self.aic = 2 * n_params - 2 * (self.log_likelihood_value)
        self.bic = n_params * np.log(n_obs) - 2 * (self.log_likelihood_value)
        
        # Likelihood Ratio Test
        self.lr_statistic = -2 * (null_ll - (self.log_likelihood_value))
        self.lr_pvalue = 1 - np.exp(-self.lr_statistic / 2)  # Simplified p-value

    def calculate_part_worths(self) -> Dict[str, Dict[str, float]]:
        if not self.fitted: 
            raise RuntimeError("Model not fitted")
        
        part_worths = {}
        coef_idx = 0
        
        for attr_name in self.attribute_names:
            levels = self.level_names.get(attr_name, [])
            baseline = self.baselines.get(attr_name)
            attr_pw = {baseline: 0.0}
            
            for level in levels:
                if coef_idx < len(self.coefficients):
                    attr_pw[level] = self.coefficients[coef_idx]
                    coef_idx += 1
            
            part_worths[attr_name] = attr_pw
        
        self.part_worths = part_worths
        return part_worths

    def calculate_attribute_importance(self) -> Dict[str, float]:
        if self.part_worths is None: 
            self.calculate_part_worths()
        
        ranges = {}
        for attr_name, levels_pw in self.part_worths.items():
            utilities = list(levels_pw.values())
            ranges[attr_name] = max(utilities) - min(utilities) if utilities else 0
        
        total_range = sum(ranges.values())
        
        importance = {
            attr: (range_val / total_range) * 100 if total_range > 0 else 0 
            for attr, range_val in ranges.items()
        }
        
        self.attribute_importance = importance
        self.utility_ranges = ranges
        return importance

    def predict_market_share(self, products: List[Dict[str, str]]) -> Dict[str, float]:
        if not self.fitted:
            raise RuntimeError("Model not fitted")
        
        utilities = []
        for product in products:
            total_utility = 0.0
            for attr, level in product.items():
                if attr in self.part_worths and level in self.part_worths[attr]:
                    total_utility += self.part_worths[attr][level]
            utilities.append(total_utility)
        
        # Calculate market shares using softmax
        exp_utilities = np.exp(utilities)
        shares = exp_utilities / np.sum(exp_utilities)
        
        return {f"Product_{i+1}": float(share) * 100 for i, share in enumerate(shares)}

    def calculate_optimal_product(self) -> Tuple[Dict[str, str], float]:
        if self.part_worths is None:
            self.calculate_part_worths()
        
        optimal_config = {}
        total_utility = 0.0
        
        for attr, levels_pw in self.part_worths.items():
            best_level = max(levels_pw.items(), key=lambda x: x[1])
            optimal_config[attr] = best_level[0]
            total_utility += best_level[1]
        
        return optimal_config, total_utility

    def get_top_profiles(self, n: int = 5) -> List[Dict]:
        if self.ranking_data is None or self.part_worths is None:
            return []
        
        profiles = self.ranking_data.drop_duplicates(subset=['profile_id'])
        
        profile_utilities = []
        for _, profile in profiles.iterrows():
            total_utility = 0.0
            profile_config = {}
            for attr in self.attribute_names:
                level = profile.get(attr)
                if level and attr in self.part_worths and level in self.part_worths[attr]:
                    total_utility += self.part_worths[attr][level]
                    profile_config[attr] = level
            
            profile_utilities.append({
                'profile_id': profile['profile_id'],
                'configuration': profile_config,
                'total_utility': total_utility
            })
        
        profile_utilities.sort(key=lambda x: x['total_utility'], reverse=True)
        return profile_utilities[:n]

    def get_respondent_count(self) -> int:
        if self.ranking_data is None: return 0
        return self.ranking_data['respondent_id'].nunique()

    def get_profile_count(self) -> int:
        if self.ranking_data is None: return 0
        return self.ranking_data['profile_id'].nunique()

    def get_results(self):
        if not self.fitted: return {}
        
        self.calculate_part_worths()
        self.calculate_attribute_importance()
        
        optimal_product, optimal_utility = self.calculate_optimal_product()
        top_profiles = self.get_top_profiles(n=5)
        
        return {
            'part_worths': self.part_worths,
            'attribute_importance': self.attribute_importance,
            'utility_ranges': self.utility_ranges,
            'coefficients': dict(zip(self.feature_names, self.coefficients)),
            'log_likelihood': self.log_likelihood_value,
            'model_fit': {
                'pseudo_r2': self.pseudo_r2,
                'aic': self.aic,
                'bic': self.bic,
                'log_likelihood': self.log_likelihood_value,
                'lr_statistic': self.lr_statistic,
                'n_parameters': len(self.coefficients),
                'n_observations': len(self.y)
            },
            'optimal_product': {
                'configuration': optimal_product,
                'total_utility': optimal_utility
            },
            'top_profiles': top_profiles,
            'sample_info': {
                'n_respondents': self.get_respondent_count(),
                'n_profiles': self.get_profile_count(),
                'n_attributes': len(self.attribute_names)
            }
        }

def main():
    try:
        payload = json.load(sys.stdin)
        ranking_data = pd.DataFrame(payload.get('data'))
        attributes = payload.get('attributes')

        if ranking_data.empty or not attributes:
            raise ValueError("Missing 'data' or 'attributes' in request payload.")

        analyzer = RankingConjointAnalyzer()
        X, y, exploded_data = analyzer.prepare_data(ranking_data, attributes)
        analyzer.fit(X, y, exploded_data)
        
        results = analyzer.get_results()
        
        example_products = []
        top_profiles = analyzer.get_top_profiles(3)
        if len(top_profiles) >= 2:
             example_products = [p['configuration'] for p in top_profiles]
        
        if example_products:
            market_shares = analyzer.predict_market_share(example_products)
            results['market_simulation'] = {
                'products': example_products,
                'market_shares': market_shares
            }

        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
