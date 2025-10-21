
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import io
import base64
import warnings

warnings.filterwarnings('ignore')

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
    if isinstance(obj, np.bool_): 
        return bool(obj)
    return obj

class TwoSLS:
    """
    Two-Stage Least Squares (2SLS) Estimator
    
    Handles endogeneity using instrumental variables.
    """
    
    def __init__(self):
        self.beta_2sls = None
        self.beta_ols = None
        self.se_2sls = None
        self.se_ols = None
        self.t_stats = None
        self.p_values = None
        self.fitted_values = None
        self.residuals = None
        self.X_hat = None
        self.stage1_results = None
        self.n_obs = None
        self.n_params = None
        
    def fit(self, y, X, Z, add_constant=True, robust_se=False):
        """
        Fit the 2SLS model
        
        Parameters:
        -----------
        y : array-like
            Dependent variable
        X : array-like
            Endogenous and exogenous explanatory variables
        Z : array-like
            Instrumental variables (should include exogenous X variables)
        add_constant : bool
            Whether to add intercept
        robust_se : bool
            Whether to use heteroskedasticity-robust standard errors
            
        Returns:
        --------
        self : fitted model
        """
        # Convert to numpy arrays and handle dimensions
        y = np.asarray(y).flatten()
        X_orig = np.asarray(X)
        Z_orig = np.asarray(Z)
        
        if X_orig.ndim == 1: 
            X_orig = X_orig.reshape(-1, 1)
        if Z_orig.ndim == 1: 
            Z_orig = Z_orig.reshape(-1, 1)
        
        # Check for NaN or Inf
        if np.any(np.isnan(y)) or np.any(np.isinf(y)):
            raise ValueError("Dependent variable contains NaN or Inf values")
        if np.any(np.isnan(X_orig)) or np.any(np.isinf(X_orig)):
            raise ValueError("Explanatory variables contain NaN or Inf values")
        if np.any(np.isnan(Z_orig)) or np.any(np.isinf(Z_orig)):
            raise ValueError("Instrumental variables contain NaN or Inf values")
            
        n = len(y)
        self.n_obs = n
        
        # Add constant if requested
        X = X_orig.copy()
        Z = Z_orig.copy()
        
        if add_constant:
            X = np.column_stack([np.ones(n), X])
            Z = np.column_stack([np.ones(n), Z])
        
        self.n_params = X.shape[1]
        
        # Check identification
        if Z.shape[1] < X.shape[1]:
            raise ValueError(
                f"Under-identified model: Need at least {X.shape[1]} instruments, "
                f"but only {Z.shape[1]} provided. "
                f"Number of instruments must be >= number of parameters."
            )
        
        # Stage 1: Project X onto Z
        try:
            ZtZ_inv = np.linalg.inv(Z.T @ Z)
        except np.linalg.LinAlgError:
            raise ValueError(
                "Instrument matrix (Z'Z) is singular. "
                "This indicates perfect multicollinearity among instruments. "
                "Check for duplicate or linearly dependent instrumental variables."
            )

        P_Z = Z @ ZtZ_inv @ Z.T  # Projection matrix
        self.X_hat = P_Z @ X
        
        # Calculate first-stage statistics
        self.stage1_results = {
            'first_stage_R2': [],
            'first_stage_F': []
        }
        
        # Calculate R² and F-statistic for each endogenous variable
        # Skip constant term
        start_idx = 1 if add_constant else 0
        
        for j in range(start_idx, X.shape[1]):
            # R-squared
            ss_tot = np.sum((X[:, j] - np.mean(X[:, j]))**2)
            ss_res = np.sum((X[:, j] - self.X_hat[:, j])**2)
            r2 = 1 - (ss_res / ss_tot) if ss_tot > 1e-10 else 0.0
            self.stage1_results['first_stage_R2'].append(r2)
            
            # F-statistic for first stage
            # F = (R²/(k-1)) / ((1-R²)/(n-k))
            k = Z.shape[1]
            if r2 < 0.9999:  # Avoid division issues when R² ≈ 1
                f_stat = (r2 / (k - 1)) / ((1 - r2) / (n - k))
            else:
                f_stat = np.inf
            self.stage1_results['first_stage_F'].append(f_stat)

        # Stage 2: Regress y on X_hat
        try:
            XhatX_inv = np.linalg.inv(self.X_hat.T @ self.X_hat)
        except np.linalg.LinAlgError:
            raise ValueError(
                "X_hat'X_hat is singular. This can happen when instruments are "
                "not relevant (weak instruments) or perfectly collinear."
            )
            
        self.beta_2sls = XhatX_inv @ self.X_hat.T @ y
        
        # Calculate fitted values and residuals using ORIGINAL X (not X_hat)
        # This is the correct approach for 2SLS
        self.fitted_values = X @ self.beta_2sls
        self.residuals = y - self.fitted_values
        
        # Calculate standard errors
        if robust_se:
            # Heteroskedasticity-robust (White) standard errors
            self.se_2sls = self._robust_se(self.X_hat, self.residuals)
        else:
            # Homoskedastic standard errors
            sigma2 = np.sum(self.residuals**2) / (n - X.shape[1])
            var_beta = sigma2 * XhatX_inv
            self.se_2sls = np.sqrt(np.diag(var_beta))
        
        # Handle potential numerical issues
        self.se_2sls = np.where(self.se_2sls < 1e-10, np.nan, self.se_2sls)
        
        # Calculate t-statistics and p-values
        with np.errstate(divide='ignore', invalid='ignore'):
            self.t_stats = self.beta_2sls / self.se_2sls
            self.p_values = 2 * (1 - stats.t.cdf(np.abs(self.t_stats), n - X.shape[1]))
        
        # Replace inf/nan in t_stats with nan
        self.t_stats = np.where(np.isinf(self.t_stats) | np.isnan(self.t_stats), np.nan, self.t_stats)
        self.p_values = np.where(np.isnan(self.p_values), np.nan, self.p_values)
        
        # Also calculate OLS for comparison
        try:
            XtX_inv = np.linalg.inv(X.T @ X)
            self.beta_ols = XtX_inv @ X.T @ y
            
            # OLS standard errors
            residuals_ols = y - X @ self.beta_ols
            if robust_se:
                self.se_ols = self._robust_se(X, residuals_ols)
            else:
                sigma2_ols = np.sum(residuals_ols**2) / (n - X.shape[1])
                var_beta_ols = sigma2_ols * XtX_inv
                self.se_ols = np.sqrt(np.diag(var_beta_ols))
        except np.linalg.LinAlgError:
            self.beta_ols = np.full(X.shape[1], np.nan)
            self.se_ols = np.full(X.shape[1], np.nan)
        
        return self
    
    def _robust_se(self, X, residuals):
        """
        Calculate heteroskedasticity-robust standard errors (White/Huber-White)
        
        Parameters:
        -----------
        X : array
            Design matrix
        residuals : array
            Residuals from regression
            
        Returns:
        --------
        se : array
            Robust standard errors
        """
        n = len(residuals)
        k = X.shape[1]
        
        # Bread: (X'X)^(-1)
        try:
            bread = np.linalg.inv(X.T @ X)
        except np.linalg.LinAlgError:
            return np.full(k, np.nan)
        
        # Meat: X' diag(e²) X
        meat = X.T @ np.diag(residuals**2) @ X
        
        # Sandwich: (X'X)^(-1) [X' diag(e²) X] (X'X)^(-1)
        sandwich = bread @ meat @ bread
        
        # Standard errors with small sample correction
        se = np.sqrt(np.diag(sandwich) * n / (n - k))
        
        return se
    
    def summary(self):
        """Print summary of estimation results"""
        print("=" * 80)
        print("Two-Stage Least Squares (2SLS) Estimation Results")
        print("=" * 80)
        print(f"Number of observations: {self.n_obs}")
        print(f"Number of parameters: {self.n_params}")
        
        if self.stage1_results['first_stage_R2']:
            print("\nFirst-Stage Statistics:")
            for i, (r2, f_stat) in enumerate(zip(
                self.stage1_results['first_stage_R2'],
                self.stage1_results['first_stage_F']
            )):
                print(f"  Endogenous variable {i+1}:")
                print(f"    R² = {r2:.4f}")
                if np.isfinite(f_stat):
                    print(f"    F-statistic = {f_stat:.2f}", end="")
                    if f_stat < 10:
                        print(" (WARNING: Weak instrument, F < 10)")
                    else:
                        print(" (Strong instrument)")
                else:
                    print(f"    F-statistic = Inf (Perfect fit)")
        
        print("\n" + "-" * 80)
        print(f"{'Variable':<15} {'2SLS Coef':<13} {'Std Err':<13} {'t-stat':<11} {'P>|t|':<11}")
        print("-" * 80)
        
        for i in range(len(self.beta_2sls)):
            var_name = f"var_{i}" if i > 0 else "const"
            
            coef = self.beta_2sls[i]
            se = self.se_2sls[i]
            t = self.t_stats[i]
            p = self.p_values[i]
            
            coef_str = f"{coef:.6f}" if np.isfinite(coef) else "NaN"
            se_str = f"{se:.6f}" if np.isfinite(se) else "NaN"
            t_str = f"{t:.4f}" if np.isfinite(t) else "NaN"
            
            if np.isfinite(p):
                if p < 0.001:
                    p_str = "<0.001"
                else:
                    p_str = f"{p:.4f}"
            else:
                p_str = "NaN"
            
            print(f"{var_name:<15} {coef_str:>12} {se_str:>12} {t_str:>10} {p_str:>10}")
        
        print("-" * 80)
        print("\nComparison with OLS:")
        print(f"{'Variable':<15} {'OLS Coef':<13} {'2SLS Coef':<13} {'Difference':<13}")
        print("-" * 80)
        
        for i in range(len(self.beta_2sls)):
            var_name = f"var_{i}" if i > 0 else "const"
            
            ols_coef = self.beta_ols[i]
            tsls_coef = self.beta_2sls[i]
            diff = tsls_coef - ols_coef
            
            ols_str = f"{ols_coef:.6f}" if np.isfinite(ols_coef) else "NaN"
            tsls_str = f"{tsls_coef:.6f}" if np.isfinite(tsls_coef) else "NaN"
            diff_str = f"{diff:.6f}" if np.isfinite(diff) else "NaN"
            
            print(f"{var_name:<15} {ols_str:>12} {tsls_str:>12} {diff_str:>12}")
        
        print("=" * 80)
    
    def predict(self, X_new, add_constant=True):
        """Make predictions using fitted model"""
        X_new = np.asarray(X_new)
        if X_new.ndim == 1:
            X_new = X_new.reshape(-1, 1)
        
        if add_constant:
            X_new = np.column_stack([np.ones(len(X_new)), X_new])
        
        return X_new @ self.beta_2sls


def main():
    """
    Main function for API endpoint
    Expects JSON input with data and variable specifications
    """
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        y_col = payload.get('y_col')
        x_endog_cols = payload.get('x_endog_cols', [])
        x_exog_cols = payload.get('x_exog_cols', [])
        z_cols = payload.get('z_cols', [])
        robust_se = payload.get('robust_se', False)

        # Validation
        if not y_col:
            raise ValueError("Dependent variable (y_col) is required.")
        if not x_endog_cols:
            raise ValueError("At least one endogenous variable (x_endog_cols) is required.")
        if not z_cols:
            raise ValueError("At least one instrumental variable (z_cols) is required.")
        
        # Prepare data
        all_cols = [y_col] + x_endog_cols + x_exog_cols + z_cols
        df = data[all_cols].dropna()
        
        if len(df) == 0:
            raise ValueError("No valid observations after removing missing values.")
        
        y = df[y_col].values
        
        # X includes both endogenous and exogenous variables
        X = df[x_endog_cols + x_exog_cols].values
        
        # Z includes exogenous variables AND external instruments
        # This is the correct specification for 2SLS
        Z = df[x_exog_cols + z_cols].values if x_exog_cols else df[z_cols].values
        
        # Fit model
        model = TwoSLS()
        model.fit(y, X, Z, add_constant=True, robust_se=robust_se)
        
        # Variable names for output
        var_names = ['const'] + x_endog_cols + x_exog_cols
        
        # Prepare results
        results = {
            'ols_results': {
                'model': 'OLS (Naive)',
                'coefficients': [_to_native_type(x) for x in model.beta_ols],
                'std_errors': [_to_native_type(x) for x in model.se_ols],
                'variable_names': var_names,
            },
            'tsls_results': {
                'model': '2SLS (IV)',
                'coefficients': [_to_native_type(x) for x in model.beta_2sls],
                'std_errors': [_to_native_type(x) for x in model.se_2sls],
                't_statistics': [_to_native_type(x) for x in model.t_stats],
                'p_values': [_to_native_type(x) for x in model.p_values],
                'variable_names': var_names,
            },
            'first_stage': {
                'r_squared': [_to_native_type(x) for x in model.stage1_results['first_stage_R2']],
                'f_statistics': [_to_native_type(x) for x in model.stage1_results['first_stage_F']],
            },
            'diagnostics': {
                'n_observations': int(model.n_obs),
                'n_parameters': int(model.n_params),
                'n_instruments': int(Z.shape[1] + 1),  # +1 for constant
            }
        }
        
        print(json.dumps(results, default=_to_native_type))

    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()


