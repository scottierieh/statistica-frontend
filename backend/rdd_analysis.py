
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
import warnings
import io
import base64

warnings.filterwarnings('ignore')

try:
    plt.style.use('seaborn-v0_8-whitegrid')
except:
    plt.style.use('seaborn-whitegrid')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, np.bool_): return bool(obj)
    return obj

class RegressionDiscontinuity:
    def __init__(self, cutoff, bandwidth=None, kernel='triangular', polynomial=1):
        self.cutoff = cutoff
        self.bandwidth = bandwidth
        self.kernel = kernel
        self.polynomial = polynomial
        self.results = {}
        
    def _calculate_optimal_bandwidth(self, X, Y):
        # Placeholder for a more complex optimal bandwidth calculation like Imbens-Kalyanaraman
        # Using a rule of thumb for now.
        n = len(X)
        iqr_X = np.subtract(*np.percentile(X, [75, 25]))
        h = 1.84 * iqr_X * (n ** -0.2)
        return h

    def _kernel_weight(self, x, h):
        u = x / h
        if self.kernel == 'uniform': return (np.abs(u) <= 1).astype(float)
        elif self.kernel == 'triangular': return np.maximum(0, 1 - np.abs(u))
        elif self.kernel == 'epanechnikov': return np.maximum(0, 0.75 * (1 - u**2))
        else: raise ValueError(f"Unknown kernel: {self.kernel}")
    
    def _run_regression(self, X_reg, y_reg, weights):
        model = LinearRegression()
        model.fit(X_reg, y_reg, sample_weight=weights)
        
        y_pred = model.predict(X_reg)
        residuals = y_reg - y_pred
        n, k = X_reg.shape

        # Robust Standard Errors (HC1)
        try:
            X_weighted = X_reg * np.sqrt(weights).reshape(-1, 1)
            bread = np.linalg.inv(X_weighted.T @ X_weighted)
            meat = np.zeros((k, k))
            for i in range(n):
                score = X_weighted[i:i+1].T * residuals[i]
                meat += score @ score.T
            vcov = bread @ meat @ bread
            se = np.sqrt(np.diag(vcov) * (n / (n - k)))
        except np.linalg.LinAlgError:
            se = np.full(k, np.nan)
        
        t_stats = model.coef_ / se if np.all(se > 0) else np.full(k, np.nan)
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), n - k)) if n > k else np.full(k, np.nan)
        
        return model.coef_, se, t_stats, p_values

    def estimate_sharp_rdd(self, X, Y):
        if self.bandwidth is None:
            self.bandwidth = self._calculate_optimal_bandwidth(X, Y)

        in_bw = np.abs(X - self.cutoff) <= self.bandwidth
        X_bw, Y_bw = X[in_bw], Y[in_bw]
        
        T = (X_bw >= self.cutoff).astype(int)
        X_centered = X_bw - self.cutoff
        weights = self._kernel_weight(X_centered, self.bandwidth)
        
        poly = PolynomialFeatures(self.polynomial, include_bias=False)
        X_poly = poly.fit_transform(X_centered.reshape(-1, 1))

        X_reg = np.column_stack([T] + [X_poly[:, i] for i in range(X_poly.shape[1])] + [X_poly[:, i] * T for i in range(X_poly.shape[1])])
        
        coefs, ses, t_stats, p_vals = self._run_regression(X_reg, Y_bw, weights)

        self.results = {
            'effect': coefs[0], 'se': ses[0], 't_statistic': t_stats[0], 'p_value': p_vals[0],
            'ci_lower': coefs[0] - 1.96 * ses[0], 'ci_upper': coefs[0] + 1.96 * ses[0],
            'n_effective': int(np.sum(in_bw)), 'bandwidth': self.bandwidth,
            'coefficients': { f'param_{i}': v for i, v in enumerate(coefs) },
            'X_bw': X_bw, 'Y_bw': Y_bw, 'T_bw': T,
        }
        return self.results

    def mccrary_test(self, X):
        h = 2 * np.std(X) * (len(X)**(-0.5))
        left = X[(X >= self.cutoff - h) & (X < self.cutoff)]
        right = X[(X >= self.cutoff) & (X <= self.cutoff + h)]
        
        if len(left) < 1 or len(right) < 1:
            return {'statistic': np.nan, 'p_value': np.nan}
            
        log_diff = np.log(len(right) / h) - np.log(len(left) / h)
        se = np.sqrt(1/len(right) + 1/len(left))
        z_stat = log_diff / se
        p_val = 2 * (1 - stats.norm.cdf(abs(z_stat)))
        return {'statistic': z_stat, 'p_value': p_val}

    def plot_rdd(self, X, Y, n_bins=40):
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        bin_width = (X.max() - X.min()) / n_bins
        bins = np.arange(X.min(), X.max() + bin_width, bin_width)
        bin_centers = (bins[:-1] + bins[1:]) / 2
        bin_means = [Y[np.logical_and(X >= bins[i], X < bins[i+1])].mean() for i in range(n_bins)]
        
        ax1.scatter(bin_centers, bin_means, alpha=0.8, edgecolors='k', facecolors='none', label='Binned Averages')
        ax1.axvline(self.cutoff, color='red', linestyle='--', label=f'Cutoff ({self.cutoff})')
        ax1.set_xlabel('Running Variable'); ax1.set_ylabel('Outcome'); ax1.set_title('RDD Plot'); ax1.legend()
        
        sns.histplot(X, bins=50, kde=True, ax=ax2)
        ax2.axvline(self.cutoff, color='red', linestyle='--'); ax2.set_title('Density of Running Variable');
        
        plt.tight_layout()
        buf = io.BytesIO(); plt.savefig(buf, format='png'); buf.seek(0);
        plot_base64 = base64.b64encode(buf.read()).decode('utf-8'); plt.close(fig)
        return plot_base64

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        running_var = payload.get('running_var')
        outcome_var = payload.get('outcome_var')
        cutoff = float(payload.get('cutoff'))
        
        df = data[[running_var, outcome_var]].dropna()
        X = df[running_var].values
        y = df[outcome_var].values
        
        rdd = RegressionDiscontinuity(cutoff=cutoff, polynomial=int(payload.get('polynomial', 1)), kernel=payload.get('kernel', 'triangular'))
        results = rdd.estimate_sharp_rdd(X, y)
        plot_base64 = rdd.plot_rdd(X, y)
        mccrary = rdd.mccrary_test(X)

        response = {
            'results': {**results, 'mccrary_test': mccrary},
            'plot': plot_base64
        }
        
        print(json.dumps(response, default=_to_native_type))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    