

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
        
        self.descriptive_stats = {
            self.X_name: {'mean': self.clean_data[self.X_name].mean(), 'std': self.clean_data[self.X_name].std()},
            self.M_name: {'mean': self.clean_data[self.M_name].mean(), 'std': self.clean_data[self.M_name].std()},
            self.Y_name: {'mean': self.clean_data[self.Y_name].mean(), 'std': self.clean_data[self.Y_name].std()},
        }

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
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        mse = ss_res / (len(Y) - 2) if (len(Y) - 2) > 0 else 0
        x_mean = np.mean(X)
        ss_x = np.sum((X - x_mean) ** 2)
        se_coef = np.sqrt(mse / ss_x) if ss_x > 0 else np.nan
        
        t_stat = model.coef_[0] / se_coef if se_coef != 0 and not np.isnan(se_coef) else np.inf
        p_value = 2 * (1 - stats.t.cdf(np.abs(t_stat), len(Y) - 2)) if (len(Y) - 2) > 0 else np.nan
        
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
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        mse = ss_res / (len(Y) - 3) if (len(Y) - 3) > 0 else 0
        X_design = np.column_stack([np.ones(len(X1)), X1, X2])
        try:
            cov_matrix = mse * np.linalg.inv(X_design.T @ X_design)
            se_coefs = np.sqrt(np.diag(cov_matrix))[1:]
        except np.linalg.LinAlgError:
            se_coefs = [np.nan, np.nan]

        t_stats = model.coef_ / se_coefs if not np.any(np.isnan(se_coefs)) and np.all(se_coefs != 0) else np.array([np.inf, np.inf])
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), len(Y) - 3)) if (len(Y) - 3) > 0 else np.array([np.nan, np.nan])
        
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
        ) if path_a['se'] > 0 and path_bc['se2'] > 0 and not np.isnan(path_a['se']) and not np.isnan(path_bc['se2']) else 0
        
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

    def bootstrap_analysis(self, n_bootstrap=5000, confidence_level=0.95):
        np.random.seed(42)
        indirect_effects = []
        for _ in range(n_bootstrap):
            indices = np.random.choice(self.n, self.n, replace=True)
            X_boot, M_boot, Y_boot = self.X[indices], self.M[indices], self.Y[indices]
            
            path_a_boot = self._simple_regression(X_boot, M_boot)
            path_bc_boot = self._multiple_regression(X_boot, M_boot, Y_boot)
            
            indirect_effect_boot = path_a_boot['coef'] * path_bc_boot['coef2']
            indirect_effects.append(indirect_effect_boot)
            
        indirect_effects = np.array(indirect_effects)
        alpha = 1 - confidence_level
        ci_lower = np.percentile(indirect_effects, 100 * alpha / 2)
        ci_upper = np.percentile(indirect_effects, 100 * (1 - alpha / 2))
        
        self.results['bootstrap'] = {
            'indirect_effects': indirect_effects.tolist(),
            'mean_effect': np.mean(indirect_effects),
            'se': np.std(indirect_effects),
            'ci_lower': ci_lower,
            'ci_upper': ci_upper,
            'n_bootstrap': n_bootstrap,
            'confidence_level': confidence_level,
            'significant': not (ci_lower <= 0 <= ci_upper)
        }
        return self.results['bootstrap']
    
    def analyze(self, method='both', n_bootstrap=1000):
        if method in ['baron_kenny', 'both']:
            self.baron_kenny_analysis()
        if method in ['bootstrap', 'both']:
            self.bootstrap_analysis(n_bootstrap=n_bootstrap)

        self._determine_mediation_type()
        self._generate_interpretation()
        
    def _determine_mediation_type(self):
        if 'baron_kenny' not in self.results: return
        bk = self.results['baron_kenny']
        
        indirect_sig = self.results.get('bootstrap', {}).get('significant')
        if indirect_sig is None:
            sobel_p = bk['sobel_test'].get('p_value')
            indirect_sig = sobel_p < 0.05 if sobel_p is not None else False

        c_prime_p = bk['path_c_prime'].get('p_value')
        path_c_prime_sig = c_prime_p < 0.05 if c_prime_p is not None else False
        
        if indirect_sig and not path_c_prime_sig: mediation_type = "Full Mediation"
        elif indirect_sig and path_c_prime_sig: mediation_type = "Partial Mediation"
        else: mediation_type = "No Mediation"
            
        self.results['mediation_type'] = mediation_type

    def _generate_interpretation(self):
        if 'baron_kenny' not in self.results:
            self.results['interpretation'] = "Analysis did not complete successfully."
            return

        bk = self.results['baron_kenny']
        boot = self.results.get('bootstrap')
        mediation_type = self.results['mediation_type']

        def format_p(p):
            return f"p < .001" if p < 0.001 else f"p = {p:.3f}"
        
        interp = (
            f"A mediation analysis was conducted to examine whether the effect of '{self.X_name}' on '{self.Y_name}' is mediated by '{self.M_name}'. "
            f"All variables were standardized before analysis.\n\n"
        )
        
        interp += (
            f"The total effect of {self.X_name} on {self.Y_name} was significant (c = {bk['path_c']['coef']:.3f}, {format_p(bk['path_c']['p_value'])}).\n"
            f"The effect of {self.X_name} on the mediator, {self.M_name}, was also significant (a = {bk['path_a']['coef']:.3f}, {format_p(bk['path_a']['p_value'])}). "
            f"When controlling for {self.X_name}, the mediator {self.M_name} significantly predicted {self.Y_name} (b = {bk['path_b']['coef']:.3f}, {format_p(bk['path_b']['p_value'])}).\n\n"
        )
        
        if boot:
            sig_text = "significant" if boot['significant'] else "not significant"
            ci_text = f"does not contain zero" if boot['significant'] else f"contains zero"
            interp += (
                f"A bootstrap analysis with {boot.get('n_bootstrap', 'N/A')} samples revealed a {sig_text} indirect effect of {self.X_name} on {self.Y_name} through {self.M_name} "
                f"(Indirect Effect = {boot['mean_effect']:.3f}, 95% CI [{boot['ci_lower']:.3f}, {boot['ci_upper']:.3f}]). "
                f"Because the confidence interval {ci_text}, the mediation effect is statistically {sig_text}.\n"
            )
        else: # Fallback to Sobel
             interp += (
                f"The Sobel test indicated that the indirect effect ({bk['indirect_effect']:.3f}) was {'significant' if bk['sobel_test']['p_value'] < 0.05 else 'not significant'} "
                f"(z = {bk['sobel_test']['z_stat']:.2f}, {format_p(bk['sobel_test']['p_value'])}).\n"
            )

        interp += f"The direct effect of {self.X_name} on {self.Y_name}, after controlling for the mediator, was {'significant' if bk['path_c_prime']['p_value'] < 0.05 else 'not significant'} (c' = {bk['path_c_prime']['coef']:.3f}, {format_p(bk['path_c_prime']['p_value'])}).\n\n"
        
        conclusion = ""
        if mediation_type == "Full Mediation":
            conclusion = f"**Conclusion**: These results support a **full mediation** model. The effect of {self.X_name} on {self.Y_name} is fully transmitted through {self.M_name}."
        elif mediation_type == "Partial Mediation":
            conclusion = f"**Conclusion**: These results support a **partial mediation** model. {self.X_name} influences {self.Y_name} both directly and indirectly through {self.M_name}."
        else:
            conclusion = f"**Conclusion**: The analysis suggests **no significant mediation** effect. While {self.X_name} may affect {self.Y_name}, this relationship is not explained by {self.M_name} in this model."
        
        interp += conclusion
        self.results['interpretation'] = interp


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
        
        # Always standardize for mediation analysis as it's best practice
        ma = MediationAnalysis(df, X=x_var, M=m_var, Y=y_var, standardize=True)
        ma.analyze(method='both', n_bootstrap=1000)
        
        results = ma.results
        plot_image = ma.plot_results()

        response = {
            'results': results,
            'plot': plot_image
        }
        
        # Custom JSON encoder to handle numpy types
        class NpEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, np.integer):
                    return int(obj)
                if isinstance(obj, np.floating):
                    if np.isnan(obj) or np.isinf(obj):
                        return None
                    return float(obj)
                if isinstance(obj, np.ndarray):
                    return obj.tolist()
                return super(NpEncoder, self).default(obj)

        print(json.dumps(response, cls=NpEncoder))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

