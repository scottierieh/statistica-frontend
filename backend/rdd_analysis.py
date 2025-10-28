
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import statsmodels.api as sm
import statsmodels.formula.api as smf
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

def generate_interpretation(results):
    effect = results.get('effect')
    p_value = results.get('p_value')
    ci = results.get('ci_lower'), results.get('ci_upper')

    if effect is None or p_value is None:
        return "Analysis results are incomplete. Cannot generate interpretation."

    sig_text = "statistically significant" if p_value < 0.05 else "not statistically significant"
    direction = "increase" if effect > 0 else "decrease"
    
    interp = (
        f"The analysis estimates a local average treatment effect of **{effect:.4f}**. This effect is **{sig_text}** (p = {p_value:.4f}).\n"
        f"This means that at the cutoff point, the treatment is associated with an estimated {direction} of {abs(effect):.4f} in the outcome variable.\n"
        f"The 95% confidence interval for this effect is [{ci[0]:.4f}, {ci[1]:.4f}]. Since this interval does {'not' if p_value < 0.05 else ''} contain zero, the result is considered significant."
    )
    return interp


class RegressionDiscontinuity:
    def __init__(self, cutoff, bandwidth=None, kernel='triangular', polynomial=1):
        self.cutoff = cutoff
        self.bandwidth = bandwidth
        self.kernel = kernel
        self.polynomial = polynomial
        self.results = {}
        
    def _calculate_optimal_bandwidth(self, X, Y):
        n = len(X)
        iqr_X = np.subtract(*np.percentile(X, [75, 25]))
        h = 1.84 * iqr_X * (n ** -0.2)
        return h

    def _kernel_weight(self, x_centered, h):
        u = x_centered / h
        if self.kernel == 'uniform': return (np.abs(u) <= 1).astype(float)
        elif self.kernel == 'triangular': return np.maximum(0, 1 - np.abs(u))
        elif self.kernel == 'epanechnikov': return np.maximum(0, 0.75 * (1 - u**2))
        else: raise ValueError(f"Unknown kernel: {self.kernel}")
    
    def estimate_sharp_rdd(self, X, Y):
        if self.bandwidth is None:
            self.bandwidth = self._calculate_optimal_bandwidth(X, Y)

        df = pd.DataFrame({'X': X, 'Y': Y})
        df_bw = df[np.abs(df['X'] - self.cutoff) <= self.bandwidth].copy()
        
        df_bw['T'] = (df_bw['X'] >= self.cutoff).astype(int)
        df_bw['X_centered'] = df_bw['X'] - self.cutoff
        weights = self._kernel_weight(df_bw['X_centered'], self.bandwidth)
        
        formula = 'Y ~ T'
        for i in range(1, self.polynomial + 1):
            df_bw[f'X_centered_p{i}'] = df_bw['X_centered'] ** i
            formula += f' + X_centered_p{i} + T:X_centered_p{i}'
            
        model = smf.wls(formula, data=df_bw, weights=weights).fit(cov_type='HC1') # Using robust standard errors

        self.results = {
            'effect': model.params.get('T', 0),
            'se': model.bse.get('T', 0),
            't_statistic': model.tvalues.get('T', 0),
            'p_value': model.pvalues.get('T', 0),
            'ci_lower': model.conf_int().loc['T'][0],
            'ci_upper': model.conf_int().loc['T'][1],
            'n_effective': int(len(df_bw)), 'bandwidth': self.bandwidth,
            'coefficients': {k: v for k, v in model.params.to_dict().items()},
            'model_summary': str(model.summary())
        }
        self.results['interpretation'] = generate_interpretation(self.results)
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
        bin_means = [Y[np.logical_and(X >= bins[i], X < bins[i+1])].mean() for i in range(len(bins)-1)]
        
        ax1.scatter(bin_centers, bin_means, alpha=0.8, edgecolors='k', facecolors='none', label='Binned Averages')
        
        # Plot fitted lines
        x_range_left = np.linspace(max(self.cutoff - self.bandwidth, X.min()), self.cutoff, 100)
        x_range_right = np.linspace(self.cutoff, min(self.cutoff + self.bandwidth, X.max()), 100)
        
        params = self.results['coefficients']
        
        def predict_y(x_vals, is_treated):
            y_pred = params.get('Intercept', 0) + params.get('T', 0) * is_treated
            for i in range(1, self.polynomial + 1):
                y_pred += params.get(f'X_centered_p{i}', 0) * (x_vals - self.cutoff)**i
                y_pred += params.get(f'T:X_centered_p{i}', 0) * is_treated * (x_vals - self.cutoff)**i
            return y_pred

        ax1.plot(x_range_left, predict_y(x_range_left, 0), color='blue', lw=2, label='Fit (Control)')
        ax1.plot(x_range_right, predict_y(x_range_right, 1), color='orange', lw=2, label='Fit (Treated)')

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
