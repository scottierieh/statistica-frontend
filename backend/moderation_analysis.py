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
            'coefficients': coefficients, 'std_errors': std_errors,
            't_stats': t_stats, 'p_values': p_values, 'r_squared': r_squared,
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
            
            # Simplified SE for simple slope
            se_b1, se_b3 = model['std_errors'][1], model['std_errors'][3]
            se_slope = np.sqrt(se_b1**2 + (m_val**2) * se_b3**2) # Simplified
            
            t_stat = slope / se_slope if se_slope > 0 else np.inf
            p_value = 2 * (1 - stats.t.cdf(np.abs(t_stat), model['df'])) if model['df'] > 0 else np.nan
            
            simple_slopes.append({
                'label': value_labels[i], 'slope': slope, 'std_error': se_slope,
                't_stat': t_stat, 'p_value': p_value
            })
            
        self.results['simple_slopes'] = simple_slopes
        
    def analyze(self):
        self.hierarchical_regression()
        self.simple_slopes_analysis()
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
            'results': json.loads(json.dumps(results, default=_to_native_type)),
            'plot': plot_image
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
