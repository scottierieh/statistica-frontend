

import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from scipy import stats
import warnings
import io
import base64

warnings.filterwarnings('ignore')

try:
    plt.style.use('seaborn-v0_8-darkgrid')
except:
    try:
        plt.style.use('seaborn-darkgrid')
    except:
        plt.style.use('default')
        sns.set_style("darkgrid")

sns.set_palette("husl")

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class AdvancedPSM:
    def __init__(self, caliper=0.2, replacement=False, estimator='logistic'):
        self.caliper = caliper
        self.replacement = replacement
        self.estimator = estimator
        self.propensity_model = None
        self.scaler = StandardScaler()
        
    def _get_estimator(self):
        if self.estimator == 'logistic':
            return LogisticRegression(random_state=42, max_iter=1000)
        else:
            raise ValueError(f"Unsupported estimator: {self.estimator}")
    
    def estimate_propensity_scores(self, X, treatment):
        X_scaled = self.scaler.fit_transform(X)
        self.propensity_model = self._get_estimator()
        self.propensity_model.fit(X_scaled, treatment)
        
        prop_scores = self.propensity_model.predict_proba(X_scaled)[:, 1]
        prop_scores = np.clip(prop_scores, 1e-6, 1 - 1e-6)
        
        if self.caliper is None:
            logit_ps = np.log(prop_scores / (1 - prop_scores))
            self.caliper_val = 0.2 * np.std(logit_ps)
        else:
            self.caliper_val = self.caliper

        return prop_scores

    def nearest_neighbor_matching(self, prop_scores, treatment):
        treated_idx = np.where(treatment == 1)[0]
        control_idx = np.where(treatment == 0)[0]
        
        matched_pairs = []
        used_controls = set()
        
        for t_idx in treated_idx:
            t_score = prop_scores[t_idx]
            
            available_controls = [c for c in control_idx if self.replacement or c not in used_controls]
            if not available_controls: continue

            distances = np.abs(prop_scores[available_controls] - t_score)
            
            valid_mask = distances <= self.caliper_val
            if not np.any(valid_mask): continue
            
            valid_distances = distances[valid_mask]
            valid_indices = np.array(available_controls)[valid_mask]
            
            best_match_local_idx = np.argmin(valid_distances)
            best_match_global_idx = valid_indices[best_match_local_idx]

            matched_pairs.append((t_idx, best_match_global_idx))
            if not self.replacement:
                used_controls.add(best_match_global_idx)
        
        return matched_pairs
    
    def match(self, X, treatment):
        prop_scores = self.estimate_propensity_scores(X, treatment)
        matched_pairs = self.nearest_neighbor_matching(prop_scores, treatment)
        return matched_pairs, prop_scores

    def visualize(self, X, prop_scores, treatment, matched_pairs):
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Plot 1: Propensity Score Distribution
        sns.histplot(prop_scores[treatment == 1], ax=axes[0, 0], color="red", label='Treated', kde=True, stat='density')
        sns.histplot(prop_scores[treatment == 0], ax=axes[0, 0], color="blue", label='Control', kde=True, stat='density')
        axes[0, 0].set_title('Propensity Score Distribution (Before Matching)')
        axes[0, 0].legend()

        # Plot 2: SMD Plot
        smd_before, smd_after = [], []
        for i in range(X.shape[1]):
            treated = X[treatment == 1, i]
            control = X[treatment == 0, i]
            smd_before.append((treated.mean() - control.mean()) / np.sqrt((treated.var() + control.var()) / 2))

            if matched_pairs:
                matched_treated = X[[p[0] for p in matched_pairs], i]
                matched_control = X[[p[1] for p in matched_pairs], i]
                smd_after.append((matched_treated.mean() - matched_control.mean()) / np.sqrt((matched_treated.var() + matched_control.var()) / 2))
        
        ax = axes[0, 1]
        y_pos = np.arange(len(X.columns))
        ax.scatter(np.abs(smd_before), y_pos, color='red', label='Before')
        if smd_after:
            ax.scatter(np.abs(smd_after), y_pos, color='blue', label='After')
        ax.axvline(0.1, color='gray', linestyle='--')
        ax.set_yticks(y_pos); ax.set_yticklabels(X.columns)
        ax.set_title('Covariate Balance (SMD)'); ax.legend()

        # Plot 3: Q-Q Plot
        ax = axes[1,0]
        if matched_pairs:
            ps_treated = prop_scores[[p[0] for p in matched_pairs]]
            ps_control = prop_scores[[p[1] for p in matched_pairs]]
            stats.probplot(ps_treated, dist="norm", plot=ax)
            stats.probplot(ps_control, dist="norm", plot=ax)
            ax.get_lines()[0].set_color('red')
            ax.get_lines()[1].set_color('red')
            ax.get_lines()[2].set_color('blue')
            ax.get_lines()[3].set_color('blue')
        ax.set_title("Q-Q Plot of Matched Propensity Scores")
        
        # Plot 4: Matched PS Distribution
        ax = axes[1, 1]
        if matched_pairs:
            sns.histplot(prop_scores[[p[0] for p in matched_pairs]], ax=ax, color="red", label='Treated (Matched)', kde=True, stat='density')
            sns.histplot(prop_scores[[p[1] for p in matched_pairs]], ax=ax, color="blue", label='Control (Matched)', kde=True, stat='density')
        ax.set_title("Propensity Score Distribution (After Matching)")
        ax.legend()
        
        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode('utf-8')

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        treatment_col = payload.get('treatment_col')
        outcome_col = payload.get('outcome_col')
        covariate_cols = payload.get('covariate_cols')
        
        df = data[[treatment_col, outcome_col] + covariate_cols].dropna()
        
        X = df[covariate_cols]
        treatment = df[treatment_col]
        y = df[outcome_col]
        
        psm = AdvancedPSM()
        matched_pairs, prop_scores = psm.match(X, treatment)
        
        treated_idx = [p[0] for p in matched_pairs]
        control_idx = [p[1] for p in matched_pairs]
        
        y_treated = y.iloc[treated_idx]
        y_control = y.iloc[control_idx]
        
        att = y_treated.mean() - y_control.mean()
        ttest = stats.ttest_ind(y_treated, y_control)
        
        smd = []
        for col in covariate_cols:
            mean_diff = X.iloc[treated_idx][col].mean() - X.iloc[control_idx][col].mean()
            pooled_std = np.sqrt((X.iloc[treated_idx][col].var() + X.iloc[control_idx][col].var())/2)
            smd.append({'variable': col, 'smd': mean_diff / pooled_std if pooled_std > 0 else 0})

        plot_base64 = psm.visualize(X, prop_scores, treatment, matched_pairs)
        
        response = {
            'results': {
                'att': att,
                't_statistic': ttest.statistic,
                'p_value': ttest.pvalue,
                'n_matched': len(matched_pairs),
                'smd_after': smd
            },
            'plot': plot_base64
        }
        
        print(json.dumps(response, default=_to_native_type))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file