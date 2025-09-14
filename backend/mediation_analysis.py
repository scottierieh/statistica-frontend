
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

class MediationAnalysis:
    """
    매개분석을 수행하는 클래스
    Baron & Kenny 방법과 Bootstrap 방법을 지원
    """
    
    def __init__(self, data, X, M, Y, standardize=False):
        self.data = data.copy()
        self.X_name = X
        self.M_name = M
        self.Y_name = Y
        self.standardize = standardize
        self._prepare_data()
        self.results = {}
        
    def _prepare_data(self):
        self.clean_data = self.data[[self.X_name, self.M_name, self.Y_name]].dropna()
        self.X = self.clean_data[self.X_name].values
        self.M = self.clean_data[self.M_name].values
        self.Y = self.clean_data[self.Y_name].values
        
        if self.standardize:
            scaler = StandardScaler()
            self.X = scaler.fit_transform(self.X.reshape(-1, 1)).flatten()
            self.M = scaler.fit_transform(self.M.reshape(-1, 1)).flatten()
            self.Y = scaler.fit_transform(self.Y.reshape(-1, 1)).flatten()
            
        self.n = len(self.X)
        
    def _simple_regression(self, X, Y):
        model = LinearRegression()
        X_reshaped = X.reshape(-1, 1)
        model.fit(X_reshaped, Y)
        
        y_pred = model.predict(X_reshaped)
        residuals = Y - y_pred
        
        ss_res = np.sum(residuals ** 2)
        ss_tot = np.sum((Y - np.mean(Y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot)
        
        mse = ss_res / (len(Y) - 2)
        x_mean = np.mean(X)
        ss_x = np.sum((X - x_mean) ** 2)
        se_coef = np.sqrt(mse / ss_x)
        
        t_stat = model.coef_[0] / se_coef if se_coef != 0 else np.inf
        p_value = 2 * (1 - stats.t.cdf(np.abs(t_stat), len(Y) - 2))
        
        return {
            'coef': model.coef_[0], 'intercept': model.intercept_, 'se': se_coef,
            't_stat': t_stat, 'p_value': p_value, 'r_squared': r_squared
        }
    
    def _multiple_regression(self, X1, X2, Y):
        X_combined = np.column_stack([X1, X2])
        model = LinearRegression()
        model.fit(X_combined, Y)
        
        y_pred = model.predict(X_combined)
        residuals = Y - y_pred
        
        ss_res = np.sum(residuals ** 2)
        ss_tot = np.sum((Y - np.mean(Y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot)
        
        mse = ss_res / (len(Y) - 3)
        X_design = np.column_stack([np.ones(len(X1)), X1, X2])
        try:
            cov_matrix = mse * np.linalg.inv(X_design.T @ X_design)
            se_coefs = np.sqrt(np.diag(cov_matrix))[1:]
        except np.linalg.LinAlgError:
            se_coefs = [np.nan, np.nan]

        t_stats = model.coef_ / se_coefs
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), len(Y) - 3))
        
        return {
            'coef1': model.coef_[0], 'coef2': model.coef_[1], 'intercept': model.intercept_,
            'se1': se_coefs[0], 'se2': se_coefs[1], 't_stat1': t_stats[0], 't_stat2': t_stats[1],
            'p_value1': p_values[0], 'p_value2': p_values[1], 'r_squared': r_squared
        }
        
    def baron_kenny_analysis(self):
        path_c = self._simple_regression(self.X, self.Y)
        path_a = self._simple_regression(self.X, self.M)
        path_bc = self._multiple_regression(self.X, self.M, self.Y)
        
        indirect_effect = path_a['coef'] * path_bc['coef2']
        
        sobel_se = np.sqrt(
            path_bc['coef2']**2 * path_a['se']**2 + 
            path_a['coef']**2 * path_bc['se2']**2
        ) if path_a['se'] > 0 and path_bc['se2'] > 0 else 0
        
        sobel_z = indirect_effect / sobel_se if sobel_se > 0 else np.inf
        sobel_p = 2 * (1 - stats.norm.cdf(np.abs(sobel_z)))
        
        self.results['baron_kenny'] = {
            'path_c': path_c, 'path_a': path_a,
            'path_b': {'coef': path_bc['coef2'], 'se': path_bc['se2'], 't_stat': path_bc['t_stat2'], 'p_value': path_bc['p_value2']},
            'path_c_prime': {'coef': path_bc['coef1'], 'se': path_bc['se1'], 't_stat': path_bc['t_stat1'], 'p_value': path_bc['p_value1']},
            'indirect_effect': indirect_effect,
            'sobel_test': {'effect': indirect_effect, 'se': sobel_se, 'z_stat': sobel_z, 'p_value': sobel_p}
        }
        return self.results['baron_kenny']

    def analyze(self, method='baron_kenny'):
        if method == 'baron_kenny':
            self.baron_kenny_analysis()
        self._determine_mediation_type()
        
    def _determine_mediation_type(self):
        if 'baron_kenny' not in self.results: return
        bk = self.results['baron_kenny']
        
        indirect_sig = bk['sobel_test']['p_value'] < 0.05
        path_c_prime_sig = bk['path_c_prime']['p_value'] < 0.05
        
        if indirect_sig and not path_c_prime_sig: mediation_type = "Full Mediation"
        elif indirect_sig and path_c_prime_sig: mediation_type = "Partial Mediation"
        else: mediation_type = "No Mediation"
            
        self.results['mediation_type'] = mediation_type

    def plot_results(self):
        if 'baron_kenny' not in self.results:
            return None

        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        bk = self.results['baron_kenny']

        # Path Model
        ax_path = axes[0]
        nodes = {'X': (0.1, 0.5), 'M': (0.5, 0.8), 'Y': (0.9, 0.5)}
        for var, (x, y) in nodes.items():
            name = getattr(self, f'{var}_name')
            ax_path.text(x, y, name, ha='center', va='center', fontweight='bold', fontsize=12,
                         bbox=dict(boxstyle="round,pad=0.5", fc="skyblue", ec="b", lw=2, alpha=0.5))

        ax_path.annotate(f"a = {bk['path_a']['coef']:.3f}", xy=(0.3, 0.65), xytext=(0.3, 0.65))
        ax_path.annotate('', xy=(0.44, 0.74), xytext=(0.16, 0.56), arrowprops=dict(arrowstyle='->', lw=2))
        
        ax_path.annotate(f"b = {bk['path_b']['coef']:.3f}", xy=(0.7, 0.65), xytext=(0.7, 0.65))
        ax_path.annotate('', xy=(0.84, 0.56), xytext=(0.56, 0.74), arrowprops=dict(arrowstyle='->', lw=2))
        
        ax_path.annotate(f"c' = {bk['path_c_prime']['coef']:.3f}", xy=(0.5, 0.35), xytext=(0.5, 0.35))
        ax_path.annotate('', xy=(0.8, 0.45), xytext=(0.2, 0.45), arrowprops=dict(arrowstyle='->', lw=2))
        
        ax_path.set_xlim(0, 1); ax_path.set_ylim(0, 1)
        ax_path.set_title('Path Model', fontweight='bold'); ax_path.axis('off')

        # Effects Bar Chart
        effects = [bk['path_c']['coef'], bk['path_c_prime']['coef'], bk['indirect_effect']]
        effect_names = ['Total (c)', 'Direct (c\')', 'Indirect (ab)']
        axes[1].bar(effect_names, effects, color=['#3498db', '#2ecc71', '#f39c12'])
        axes[1].set_title('Effect Decomposition', fontweight='bold')
        axes[1].set_ylabel('Effect Size')

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
        m_var = payload.get('mVar')
        y_var = payload.get('yVar')

        if not all([data, x_var, m_var, y_var]):
            raise ValueError("Missing 'data', 'xVar', 'mVar' or 'yVar'")

        df = pd.DataFrame(data)
        
        ma = MediationAnalysis(df, X=x_var, M=m_var, Y=y_var, standardize=True)
        ma.analyze(method='baron_kenny')
        
        results = ma.results
        plot_image = ma.plot_results()

        response = {
            'results': results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=lambda x: x.tolist() if isinstance(x, np.ndarray) else x))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
