import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.linear_model import (LinearRegression, Ridge, Lasso, ElasticNet, 
                                 HuberRegressor, RANSACRegressor)
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import io
import base64
import warnings
warnings.filterwarnings('ignore')

try:
    import statsmodels.api as sm
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    from statsmodels.stats.diagnostic import het_breuschpagan, het_white
    from statsmodels.stats.stattools import durbin_watson, jarque_bera
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, np.floating): return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    return obj

class RegressionAnalysis:
    def __init__(self, data, target_variable, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.target_variable = target_variable
        self.alpha = alpha
        self.results = {}
        self.models = {}
        self.scaler = StandardScaler()
        
        if target_variable not in self.data.columns:
            raise ValueError(f"Target variable '{target_variable}' not found in data")
        
        self.y = self.data[target_variable]
        self.X = self.data.drop(columns=[target_variable])
        numeric_cols = self.X.select_dtypes(include=[np.number]).columns
        self.X = self.X[numeric_cols]

    def linear_regression(self, model_name="linear", features=None, standardize=False):
        if features is None:
            X_selected = self.X
        else:
            X_selected = self.X[features]

        if standardize:
            X_scaled = pd.DataFrame(self.scaler.fit_transform(X_selected), columns=X_selected.columns, index=X_selected.index)
        else:
            X_scaled = X_selected

        sklearn_model = LinearRegression()
        sklearn_model.fit(X_scaled, self.y)
        
        sm_model_summary = None
        if HAS_STATSMODELS:
            X_with_const = sm.add_constant(X_scaled)
            try:
                sm_model = sm.OLS(self.y, X_with_const).fit()
                sm_model_summary = sm_model.summary().as_text()
            except Exception as e:
                sm_model = None

        y_pred = sklearn_model.predict(X_scaled)
        metrics = self._calculate_metrics(self.y, y_pred, len(X_scaled.columns))
        diagnostics = self._calculate_diagnostics(X_scaled, self.y, y_pred, sm_model)
        
        results = {
            'model_name': model_name,
            'model_type': 'linear_regression',
            'features': list(X_scaled.columns),
            'metrics': metrics,
            'diagnostics': diagnostics,
            'plot': self.plot_results(model_name, y_pred, X_scaled, diagnostics)
        }
        self.results[model_name] = results
        return results

    def _calculate_metrics(self, y_true, y_pred, n_features):
        n = len(y_true)
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        adj_r2 = 1 - (1 - r2) * (n - 1) / (n - n_features - 1) if (n - n_features - 1) > 0 else 0
        return {'mse': mse, 'rmse': rmse, 'mae': mae, 'r2': r2, 'adj_r2': adj_r2}

    def _calculate_diagnostics(self, X, y_true, y_pred, sm_model):
        residuals = y_true - y_pred
        standardized_residuals = residuals / np.std(residuals)
        diagnostics = {}

        if HAS_STATSMODELS and sm_model:
            diagnostics['f_statistic'] = sm_model.fvalue
            diagnostics['f_pvalue'] = sm_model.f_pvalue
            diagnostics['coefficients'] = {
                'params': sm_model.params.to_dict(),
                'pvalues': sm_model.pvalues.to_dict(),
                'conf_int': sm_model.conf_int().to_dict('index')
            }
            try:
                diagnostics['durbin_watson'] = durbin_watson(residuals)
            except:
                diagnostics['durbin_watson'] = None

            try:
                vif = {X.columns[i]: variance_inflation_factor(X.values, i) for i in range(X.shape[1])}
                diagnostics['vif'] = vif
            except Exception:
                diagnostics['vif'] = {}

        return diagnostics
    
    def plot_results(self, model_name, y_pred, X, diagnostics):
        residuals = self.y - y_pred
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle(f'Regression Diagnostics - {model_name}', fontsize=16, fontweight='bold')
        
        # Actual vs Predicted
        ax = axes[0, 0]
        ax.scatter(self.y, y_pred, alpha=0.6)
        ax.plot([self.y.min(), self.y.max()], [self.y.min(), self.y.max()], 'r--', lw=2)
        ax.set_xlabel('Actual Values')
        ax.set_ylabel('Predicted Values')
        ax.set_title(f'Actual vs Predicted (R² = {self.results[model_name]["metrics"]["r2"]:.4f})')
        ax.grid(True, alpha=0.3)
        
        # Residuals vs Fitted
        ax = axes[0, 1]
        ax.scatter(y_pred, residuals, alpha=0.6)
        ax.axhline(y=0, color='red', linestyle='--')
        ax.set_xlabel('Fitted Values')
        ax.set_ylabel('Residuals')
        ax.set_title('Residuals vs Fitted')
        ax.grid(True, alpha=0.3)
        
        # Q-Q Plot for normality
        ax = axes[1, 0]
        stats.probplot(residuals, dist="norm", plot=ax)
        ax.set_title('Q-Q Plot (Normality Check)')
        ax.grid(True, alpha=0.3)
        
        # Scale-Location plot
        ax = axes[1, 1]
        sqrt_abs_residuals = np.sqrt(np.abs(residuals / np.std(residuals)))
        ax.scatter(y_pred, sqrt_abs_residuals, alpha=0.6)
        z = np.polyfit(y_pred, sqrt_abs_residuals, 1)
        p = np.poly1d(z)
        ax.plot(sorted(y_pred), p(sorted(y_pred)), "r--", alpha=0.8)
        ax.set_xlabel('Fitted Values')
        ax.set_ylabel('√|Standardized Residuals|')
        ax.set_title('Scale-Location Plot')
        ax.grid(True, alpha=0.3)

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target_variable = payload.get('targetVar')
        features = payload.get('features')
        model_type = payload.get('modelType', 'linear')

        if not all([data, target_variable, features]):
            raise ValueError("Missing 'data', 'targetVar', or 'features'")

        df = pd.DataFrame(data)
        
        reg_analysis = RegressionAnalysis(df, target_variable)
        
        results = reg_analysis.linear_regression(
            model_name=model_type, 
            features=features, 
            standardize=True
        )

        print(json.dumps(results, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
