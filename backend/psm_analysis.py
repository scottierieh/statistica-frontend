import sys
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from scipy import stats
import warnings
import io
import base64

# Suppress warnings
warnings.filterwarnings('ignore')
pd.options.mode.copy_on_write = True  # Enable future behavior

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
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if pd.isna(obj):
        return None
    return obj

class AdvancedPSM:
    def __init__(self, caliper=None, replacement=False, estimator='logistic'):
        self.caliper = caliper
        self.replacement = replacement
        self.estimator = estimator
        self.propensity_model = None
        self.scaler = StandardScaler()
        self.caliper_val = None
        
    def _get_estimator(self):
        if self.estimator == 'logistic':
            return LogisticRegression(random_state=42, max_iter=1000, solver='lbfgs')
        else:
            raise ValueError(f"Unsupported estimator: {self.estimator}")
    
    def estimate_propensity_scores(self, X, treatment):
        """Estimate propensity scores using logistic regression"""
        X_scaled = self.scaler.fit_transform(X)
        self.propensity_model = self._get_estimator()
        self.propensity_model.fit(X_scaled, treatment)
        
        prop_scores = self.propensity_model.predict_proba(X_scaled)[:, 1]
        prop_scores = np.clip(prop_scores, 1e-6, 1 - 1e-6)
        
        # Set caliper value
        if self.caliper is None:
            logit_ps = np.log(prop_scores / (1 - prop_scores))
            self.caliper_val = 0.2 * np.std(logit_ps)
        else:
            self.caliper_val = self.caliper

        return prop_scores

    def nearest_neighbor_matching(self, prop_scores, treatment):
        """Perform nearest neighbor matching with optional caliper"""
        treated_idx = np.where(treatment == 1)[0]
        control_idx = np.where(treatment == 0)[0]
        
        if len(treated_idx) == 0 or len(control_idx) == 0:
            return [], set()

        matched_pairs = []
        used_controls = set()
        
        for t_idx in treated_idx:
            t_score = prop_scores[t_idx]
            
            available_controls = [c for c in control_idx if self.replacement or c not in used_controls]
            if not available_controls:
                continue

            distances = np.abs(prop_scores[available_controls] - t_score)
            
            if self.caliper_val is not None:
                valid_mask = distances <= self.caliper_val
                if not np.any(valid_mask):
                    continue
                
                valid_distances = distances[valid_mask]
                valid_indices = np.array(available_controls)[valid_mask]
            else:
                valid_distances = distances
                valid_indices = np.array(available_controls)

            best_match_local_idx = np.argmin(valid_distances)
            best_match_global_idx = valid_indices[best_match_local_idx]

            matched_pairs.append((int(t_idx), int(best_match_global_idx)))
            
            if not self.replacement:
                used_controls.add(best_match_global_idx)
        
        return matched_pairs, used_controls
    
    def match(self, X, treatment):
        """Main matching function"""
        prop_scores = self.estimate_propensity_scores(X, treatment)
        matched_pairs, _ = self.nearest_neighbor_matching(prop_scores, treatment)
        return matched_pairs, prop_scores

    def visualize(self, X_df, prop_scores, treatment, matched_pairs):
        """Create visualization plots for PSM diagnostics"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        X = X_df.values
        treatment_np = treatment.values

        # Plot 1: Propensity Score Distribution Before Matching
        ax = axes[0, 0]
        sns.histplot(prop_scores[treatment_np == 1], ax=ax, color="red", label='Treated', kde=True, stat='density', alpha=0.6)
        sns.histplot(prop_scores[treatment_np == 0], ax=ax, color="blue", label='Control', kde=True, stat='density', alpha=0.6)
        ax.set_title('Propensity Score Distribution (Before Matching)', fontsize=12, fontweight='bold')
        ax.set_xlabel('Propensity Score')
        ax.set_ylabel('Density')
        ax.legend()

        # Plot 2: Standardized Mean Difference (Love Plot)
        smd_before, smd_after = [], []
        for i in range(X.shape[1]):
            treated = X[treatment_np == 1, i]
            control = X[treatment_np == 0, i]
            smd_before.append((treated.mean() - control.mean()) / np.sqrt((treated.var() + control.var()) / 2))

            if matched_pairs:
                matched_treated_indices = [p[0] for p in matched_pairs]
                matched_control_indices = [p[1] for p in matched_pairs]
                matched_treated = X[matched_treated_indices, i]
                matched_control = X[matched_control_indices, i]
                var_sum = matched_treated.var() + matched_control.var()
                if var_sum > 0:
                    smd_after.append((matched_treated.mean() - matched_control.mean()) / np.sqrt(var_sum / 2))
                else:
                    smd_after.append(0)
        
        ax = axes[0, 1]
        y_pos = np.arange(len(X_df.columns))
        ax.scatter(np.abs(smd_before), y_pos, color='red', label='Before Matching', s=100, alpha=0.7)
        if smd_after:
            ax.scatter(np.abs(smd_after), y_pos, color='blue', label='After Matching', s=100, alpha=0.7)
        ax.axvline(0.1, color='gray', linestyle='--', linewidth=2, label='SMD = 0.1 threshold')
        ax.set_yticks(y_pos)
        ax.set_yticklabels(X_df.columns)
        ax.set_xlabel('Absolute Standardized Mean Difference')
        ax.set_title('Covariate Balance (Love Plot)', fontsize=12, fontweight='bold')
        ax.legend()

        # Plot 3: Common Support
        ax = axes[1, 0]
        if matched_pairs:
            ps_treated = prop_scores[[p[0] for p in matched_pairs]]
            ps_control = prop_scores[[p[1] for p in matched_pairs]]
            
            ax.scatter(ps_treated, np.ones(len(ps_treated)), color='red', alpha=0.5, label='Treated (Matched)', s=50)
            ax.scatter(ps_control, np.zeros(len(ps_control)), color='blue', alpha=0.5, label='Control (Matched)', s=50)
            ax.set_ylim(-0.5, 1.5)
            ax.set_yticks([0, 1])
            ax.set_yticklabels(['Control', 'Treated'])
        else:
            ax.scatter(prop_scores[treatment_np == 1], np.ones(sum(treatment_np == 1)), color='red', alpha=0.5, label='Treated', s=50)
            ax.scatter(prop_scores[treatment_np == 0], np.zeros(sum(treatment_np == 0)), color='blue', alpha=0.5, label='Control', s=50)
            ax.set_ylim(-0.5, 1.5)
            ax.set_yticks([0, 1])
            ax.set_yticklabels(['Control', 'Treated'])
        
        ax.set_xlabel('Propensity Score')
        ax.set_title("Common Support Region", fontsize=12, fontweight='bold')
        ax.legend()
        
        # Plot 4: Matched Propensity Score Distribution
        ax = axes[1, 1]
        if matched_pairs:
            ps_treated_matched = prop_scores[[p[0] for p in matched_pairs]]
            ps_control_matched = prop_scores[[p[1] for p in matched_pairs]]
            sns.histplot(ps_treated_matched, ax=ax, color="red", label='Treated (Matched)', kde=True, stat='density', alpha=0.6)
            sns.histplot(ps_control_matched, ax=ax, color="blue", label='Control (Matched)', kde=True, stat='density', alpha=0.6)
        ax.set_title("Propensity Score Distribution (After Matching)", fontsize=12, fontweight='bold')
        ax.set_xlabel('Propensity Score')
        ax.set_ylabel('Density')
        ax.legend()
        
        plt.tight_layout()
        
        # Convert plot to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode('utf-8')

def main():
    try:
        # Read input from stdin
        payload = json.load(sys.stdin)
        raw_data = payload.get('data')
        treatment_col = payload.get('treatment_col')
        outcome_col = payload.get('outcome_col')
        covariate_cols = payload.get('covariate_cols')
        
        # Validate inputs
        if not raw_data:
            raise ValueError("No data provided")
        if not treatment_col:
            raise ValueError("Treatment column not specified")
        if not outcome_col:
            raise ValueError("Outcome column not specified")
        if not covariate_cols or len(covariate_cols) == 0:
            raise ValueError("No covariate columns specified")
        
        # Create DataFrame with explicit dtype handling
        data = pd.DataFrame(raw_data)
        
        # Verify all required columns exist
        required_cols = [treatment_col, outcome_col] + covariate_cols
        missing_cols = [col for col in required_cols if col not in data.columns]
        if missing_cols:
            raise ValueError(f"Missing columns in data: {missing_cols}")
        
        # Select and copy required columns
        df = data[required_cols].copy()
        
        # Convert treatment to numeric (0/1)
        df[treatment_col] = pd.to_numeric(df[treatment_col], errors='coerce')
        
        # Convert outcome to numeric
        df[outcome_col] = pd.to_numeric(df[outcome_col], errors='coerce')
        
        # Convert covariates to numeric
        for col in covariate_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Drop rows with missing values
        df = df.dropna()
        
        if len(df) == 0:
            raise ValueError("No valid data remaining after removing missing values")
        
        # Check treatment is binary
        unique_treatments = df[treatment_col].unique()
        if len(unique_treatments) != 2:
            raise ValueError(f"Treatment variable must be binary. Found values: {unique_treatments}")
        
        # Ensure treatment is 0/1
        if set(unique_treatments) != {0, 1}:
            df[treatment_col] = (df[treatment_col] == df[treatment_col].max()).astype(int)
        
        # Extract variables
        X = df[covariate_cols].copy()
        treatment = df[treatment_col].copy()
        y = df[outcome_col].copy()
        
        # Check we have both treatment and control groups
        n_treated = (treatment == 1).sum()
        n_control = (treatment == 0).sum()
        
        if n_treated == 0:
            raise ValueError("No treated units found")
        if n_control == 0:
            raise ValueError("No control units found")
        
        # Perform PSM
        psm = AdvancedPSM()
        matched_pairs, prop_scores = psm.match(X, treatment)
        
        if not matched_pairs:
            raise ValueError("No matches found. Try adjusting the caliper or ensuring there is common support.")

        # Extract matched outcomes
        treated_idx = [p[0] for p in matched_pairs]
        control_idx = [p[1] for p in matched_pairs]
        
        y_treated = y.iloc[treated_idx].values
        y_control = y.iloc[control_idx].values
        
        # Calculate ATT
        att = float(y_treated.mean() - y_control.mean())
        
        # Perform t-test
        ttest = stats.ttest_rel(y_treated, y_control)  # Use paired t-test
        
        # Calculate SMD for each covariate after matching
        smd = []
        for col in covariate_cols:
            mean_diff = float(X.iloc[treated_idx][col].mean() - X.iloc[control_idx][col].mean())
            var_sum = X.iloc[treated_idx][col].var() + X.iloc[control_idx][col].var()
            pooled_std = np.sqrt(var_sum / 2) if var_sum > 0 else 1e-10
            smd.append({
                'variable': str(col),
                'smd': float(mean_diff / pooled_std)
            })

        # Generate visualization
        plot_base64 = psm.visualize(X, prop_scores, treatment, matched_pairs)
        
        # Prepare response
        response = {
            'results': {
                'att': _to_native_type(att),
                't_statistic': _to_native_type(ttest.statistic),
                'p_value': _to_native_type(ttest.pvalue),
                'n_matched': len(matched_pairs),
                'smd_after': smd
            },
            'plot': plot_base64
        }
        
        # Output JSON
        print(json.dumps(response, default=_to_native_type))
        
    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()


