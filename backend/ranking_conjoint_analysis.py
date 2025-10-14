
import sys
import json
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.special import softmax
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple
import warnings
import os
from itertools import combinations
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

    def prepare_data(self, 
                     ranking_data: pd.DataFrame, 
                     attributes: Dict[str, List[str]]) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
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
        else:
            raise RuntimeError("Model estimation failed: " + result.message)
        
        return self

    def calculate_part_worths(self) -> Dict[str, Dict[str, float]]:
        if not self.fitted: raise RuntimeError("Model not fitted")
        
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
        if self.part_worths is None: self.calculate_part_worths()
        
        ranges = {}
        for attr_name, levels_pw in self.part_worths.items():
            utilities = list(levels_pw.values())
            ranges[attr_name] = max(utilities) - min(utilities) if utilities else 0
        
        total_range = sum(ranges.values())
        
        importance = {attr: (range_val / total_range) * 100 if total_range > 0 else 0 for attr, range_val in ranges.items()}
        self.attribute_importance = importance
        return importance

    def get_results(self):
        if not self.fitted: return {}
        self.calculate_part_worths()
        self.calculate_attribute_importance()
        
        return {
            'part_worths': self.part_worths,
            'attribute_importance': self.attribute_importance,
            'coefficients': dict(zip(self.feature_names, self.coefficients)),
            'log_likelihood': self.log_likelihood_value
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

        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
