import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import io
import base64
import warnings
warnings.filterwarnings('ignore')

# Helper to convert numpy types to native Python types for JSON serialization
def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj


class ModerationAnalysis:
    """
    Moderation Analysis Class
    Supports simple moderation and hierarchical regression.
    """
    
    def __init__(self, data, X, Y, M, center_method='mean'):
        self.data = data.copy()
        self.X_name = X
        self.Y_name = Y
        self.M_name = M
        self.center_method = center_method
        self._prepare_data()
        self.results = {}
        
    def _prepare_data(self):
        all_vars = [self.X_name, self.Y_name, self.M_name]
        self.clean_data = self.data[all_vars].dropna()
        
        self.X_raw = self.clean_data[self.X_name].values
        self.Y = self.clean_data[self.Y_name].values
        self.M_raw = self.clean_data[self.M_name].values
        
        self.X = self._center_variable(self.X_raw)
        self.M = self._center_variable(self.M_raw)
        
        self.n = len(self.X)
        
    def _center_variable(self, arr):
        if self.center_method == 'none':
            return arr
        elif self.center_method == 'mean':
            return arr - np.mean(arr)
        elif self.center_method == 'standardize':
            return (arr - np.mean(arr)) / np.std(arr)
        return arr
    
    def _multiple_regression(self, predictors, outcome):
        if predictors.ndim == 1:
            predictors = predictors.reshape(-1, 1)
        
        model = LinearRegression()
        model.fit(predictors, outcome)
        
        predictions = model.predict(predictors)
        residuals = outcome - predictions
        
        n = len(outcome)
        k = predictors.shape[1]
        
        ss_res = np.sum(residuals ** 2)
        ss_tot = np.sum((outcome - np.mean(outcome)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        adj_r_squared = 1 - ((1 - r_squared) * (n - 1) / (n - k - 1)) if (n-k-1) > 0 else 0
        
        mse = ss_res / (n - k - 1) if (n - k - 1) > 0 else 0
        
        X_design = np.column_stack([np.ones(n), predictors])
        
        try:
            cov_matrix = mse * np.linalg.inv(X_design.T @ X_design)
            std_errors = np.sqrt(np.diag(cov_matrix))
            coefficients = np.concatenate([[model.intercept_], model.coef_])
            t_stats = coefficients / std_errors if not np.any(np.isnan(std_errors)) and np.all(std_errors != 0) else np.full(k+1, np.inf)
            df = n - k - 1
            p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), df)) if df > 0 else np.full(k+1, np.nan)
        except np.linalg.LinAlgError:
            std_errors = np.full(k + 1, np.nan)
            coefficients = np.concatenate([[model.intercept_], model.coef_])
            t_stats = np.full(k + 1, np.nan)
            p_values = np.full(k + 1, np.nan)
            df = n - k - 1

        f_stat = (r_squared / k) / ((1 - r_squared) / df) if (1-r_squared) > 0 and k > 0 and df > 0 else 0
        f_p_value = 1 - stats.f.cdf(f_stat, k, df) if k > 0 and df > 0 else np.nan

        return {
            'coefficients': coefficients.tolist(), 'std_errors': std_errors.tolist(),
            't_stats': t_stats.tolist(), 'p_values': p_values.tolist(), 'r_squared': r_squared,
            'adj_r_squared': adj_r_squared, 'f_stat': f_stat, 'f_p_value': f_p_value,
            'df': df, 'k': k, 'n': n
        }
    
    def hierarchical_regression(self):
        interaction = self.X * self.M
        
        # Step 1: Main effects
        X_step1 = np.column_stack([self.X, self.M])
        self.results['step1'] = self._multiple_regression(X_step1, self.Y)
        
        # Step 2: Interaction
        X_step2 = np.column_stack([self.X, self.M, interaction])
        self.results['step2'] = self._multiple_regression(X_step2, self.Y)

        # R² change
        delta_r2 = self.results['step2']['r_squared'] - self.results['step1']['r_squared']
        delta_df = self.results['step2']['k'] - self.results['step1']['k']
        df2 = self.results['step2']['df']
        
        f_change = (delta_r2 / delta_df) / ((1 - self.results['step2']['r_squared']) / df2) if delta_df > 0 and df2 > 0 and (1 - self.results['step2']['r_squared']) > 0 else 0
        p_change = 1 - stats.f.cdf(f_change, delta_df, df2) if delta_df > 0 and df2 > 0 else np.nan
        
        self.results['r_squared_change'] = {
            'delta_r2': delta_r2,
            'f_change': f_change,
            'p_change': p_change,
        }
        
    def simple_slopes_analysis(self):
        model = self.results.get('step2')
        if not model: return
        
        m_std = np.std(self.M_raw)
        moderator_values = [-m_std, 0, m_std]
        value_labels = ['Low (-1 SD)', 'Mean', 'High (+1 SD)']
        
        b1, b2, b3 = model['coefficients'][1], model['coefficients'][2], model['coefficients'][3]
        
        simple_slopes = []
        for i, m_val in enumerate(moderator_values):
            slope = b1 + b3 * m_val
            
            se_b1, se_b3 = model['std_errors'][1], model['std_errors'][3]
            # This is a simplified SE, a full calculation requires the covariance of b1 and b3
            se_slope = np.sqrt(se_b1**2 + (m_val**2) * se_b3**2) 
            
            t_stat = slope / se_slope if se_slope > 0 else np.inf
            p_value = 2 * (1 - stats.t.cdf(np.abs(t_stat), model['df'])) if model['df'] > 0 else np.nan
            
            simple_slopes.append({
                'label': value_labels[i], 'slope': slope, 'std_error': se_slope,
                't_stat': t_stat, 'p_value': p_value
            })
            
        self.results['simple_slopes'] = simple_slopes

    def _calculate_effect_size(self):
        if 'step2' not in self.results or 'step1' not in self.results:
            return
        
        r2_full = self.results['step2']['r_squared']
        r2_main = self.results['step1']['r_squared']
        
        f_squared = (r2_full - r2_main) / (1 - r2_full) if (1-r2_full) > 0 else 0
        
        interpretation = "Negligible effect"
        if f_squared >= 0.35:
            interpretation = "Large effect"
        elif f_squared >= 0.15:
            interpretation = "Medium effect"
        elif f_squared >= 0.02:
            interpretation = "Small effect"
            
        self.results['effect_size'] = {
            'f_squared': f_squared,
            'interpretation': interpretation
        }

    def _generate_interpretation(self):
        if 'step2' not in self.results or 'r_squared_change' not in self.results:
            self.results['interpretation'] = "Analysis could not be completed."
            return

        step2 = self.results['step2']
        r2_change = self.results['r_squared_change']

        def format_p(p_val):
            return "p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"

        # Introduction
        interp = (
            f"A moderation analysis was conducted using hierarchical regression to determine if '{self.M_name}' moderates the relationship between '{self.X_name}' and '{self.Y_name}'. "
            f"The independent variable and moderator were mean-centered before creating the interaction term.\n\n"
        )
        
        # Step 1: Main effects model
        step1 = self.results['step1']
        interp += (
            f"In the first step, the main effects of '{self.X_name}' and '{self.M_name}' were entered, accounting for a significant portion of the variance in '{self.Y_name}', "
            f"R² = {step1['r_squared']:.3f}, F({step1['k']}, {step1['df']:.0f}) = {step1['f_stat']:.2f}, {format_p(step1['f_p_value'])}.\n\n"
        )

        # Step 2: Interaction effect model
        b3_p_value = step2['p_values'][3]
        interaction_sig = b3_p_value < 0.05
        sig_text = "significant" if interaction_sig else "not significant"

        interp += (
            f"In the second step, the interaction term ('{self.X_name}' x '{self.M_name}') was added to the model. "
            f"This addition led to a {sig_text} increase in the explained variance, "
            f"ΔR² = {r2_change['delta_r2']:.3f}, F({1}, {step2['df']:.0f}) = {r2_change['f_change']:.2f}, {format_p(r2_change['p_change'])}.\n"
        )
        
        b3 = step2['coefficients'][3]
        interp += (
            f"The interaction term itself was statistically {sig_text} (B = {b3:.3f}, {format_p(b3_p_value)}), "
            f"indicating that the relationship between '{self.X_name}' and '{self.Y_name}' does indeed depend on the level of '{self.M_name}'.\n\n"
        )

        # Simple Slopes if interaction is significant
        if interaction_sig and 'simple_slopes' in self.results:
            interp += "Simple slopes analysis was performed to probe the nature of this interaction:\n"
            for slope in self.results['simple_slopes']:
                slope_sig = slope['p_value'] < 0.05
                slope_sig_text = "significant" if slope_sig else "not significant"
                interp += (
                    f"- At {slope['label']} levels of '{self.M_name}', the effect of '{self.X_name}' on '{self.Y_name}' was {slope_sig_text} "
                    f"(B = {slope['slope']:.3f}, {format_p(slope['p_value'])}).\n"
                )
        
        # Conclusion
        conclusion_text = f"In conclusion, the results support a moderating role for '{self.M_name}' in the relationship between '{self.X_name}' and '{self.Y_name}'." if interaction_sig else f"In conclusion, the results do not support a moderating role for '{self.M_name}' in the relationship between '{self.X_name}' and '{self.Y_name}'."
        interp += f"\n{conclusion_text}"

        self.results['interpretation'] = interp.strip()
        
    def analyze(self):
        self.hierarchical_regression()
        self.simple_slopes_analysis()
        self._calculate_effect_size()
        self._generate_interpretation()
        return self.results
        
    def plot_results(self):
        model = self.results.get('step2')
        if not model: return None

        fig, ax = plt.subplots(figsize=(8, 6))
        
        m_std = np.std(self.M_raw)
        mod_levels = [-m_std, 0, m_std]
        mod_labels = ['Low (-1 SD)', 'Mean', 'High (+1 SD)']
        colors = ['blue', 'green', 'red']
        
        x_min, x_max = np.min(self.X), np.max(self.X)
        x_range = np.linspace(x_min, x_max, 50)
        
        b0, b1, b2, b3 = model['coefficients']

        for i, (mod_val, label) in enumerate(zip(mod_levels, mod_labels)):
            y_pred = (b0 + b2*mod_val) + (b1 + b3*mod_val) * x_range
            ax.plot(x_range, y_pred, label=f"{self.M_name} = {label}", color=colors[i], linewidth=2)
        
        ax.set_xlabel(f"Centered {self.X_name}")
        ax.set_ylabel(self.Y_name)
        ax.set_title('Interaction Plot')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return f"data:image/png;base64,{image_base64}"


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        x_var = payload.get('xVar')
        y_var = payload.get('yVar')
        m_var = payload.get('mVar')

        if not all([data, x_var, y_var, m_var]):
            raise ValueError("Missing 'data', 'xVar', 'yVar', or 'mVar'")

        df = pd.DataFrame(data)
        
        ma = ModerationAnalysis(df, X=x_var, Y=y_var, M=m_var, center_method='mean')
        results = ma.analyze()
        plot_image = ma.plot_results()

        response = {
            'results': results,
            'plot': plot_image
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
