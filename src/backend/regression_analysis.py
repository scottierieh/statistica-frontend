import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats, special
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import io
import base64
import warnings
import math
import re
warnings.filterwarnings('ignore')

try:
    import statsmodels.api as sm
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    from statsmodels.stats.diagnostic import het_breuschpagan, linear_reset
    from statsmodels.stats.stattools import durbin_watson, jarque_bera
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    return obj
    
def perform_stepwise_selection(X, y, method='stepwise', p_enter=0.05, p_remove=0.1):
    initial_cols = X.columns.tolist()
    included = []
    log = []

    if method == 'forward':
        while True:
            changed = False
            excluded = list(set(initial_cols) - set(included))
            best_pvalue = p_enter
            best_feature = None
            for new_column in excluded:
                model = sm.OLS(y, sm.add_constant(X[included + [new_column]])).fit()
                pvalues = model.pvalues.drop('const')
                new_pvalue = pvalues.get(new_column, 1.0)
                if new_pvalue < best_pvalue:
                    best_pvalue = new_pvalue
                    best_feature = new_column
            if best_feature:
                included.append(best_feature)
                changed = True
                log.append(f"Add '{best_feature}' (p={best_pvalue:.4f})")
            if not changed:
                break
    elif method == 'backward':
        included = initial_cols.copy()
        while True:
            changed = False
            model = sm.OLS(y, sm.add_constant(X[included])).fit()
            pvalues = model.pvalues.drop('const')
            worst_pvalue = p_remove
            worst_feature = None
            for feature, pvalue in pvalues.items():
                if pvalue > worst_pvalue:
                    worst_pvalue = pvalue
                    worst_feature = feature
            if worst_feature:
                included.remove(worst_feature)
                changed = True
                log.append(f"Remove '{worst_feature}' (p={worst_pvalue:.4f})")
            if not changed:
                break
    elif method == 'stepwise':
        included = []
        while True:
            changed = False
            # Forward step
            excluded = list(set(initial_cols) - set(included))
            best_pvalue = p_enter
            best_feature = None
            for new_column in excluded:
                try:
                    model = sm.OLS(y, sm.add_constant(X[included + [new_column]])).fit()
                    pvalues = model.pvalues.drop('const')
                    new_pvalue = pvalues.get(new_column, 1.0)
                    if new_pvalue < best_pvalue:
                        best_pvalue = new_pvalue
                        best_feature = new_column
                except Exception:
                    continue
            if best_feature:
                included.append(best_feature)
                changed = True
                log.append(f"Add '{best_feature}' (p={best_pvalue:.4f})")
            
            # Backward step
            if not included: break
            try:
                model = sm.OLS(y, sm.add_constant(X[included])).fit()
                pvalues = model.pvalues.drop('const')
                worst_pvalue = p_remove
                worst_feature = None
                for feature, pvalue in pvalues.items():
                     if pvalue > worst_pvalue:
                        worst_pvalue = pvalue
                        worst_feature = feature
                if worst_feature:
                    included.remove(worst_feature)
                    changed = True
                    log.append(f"Remove '{worst_feature}' (p={worst_pvalue:.4f})")
            except Exception:
                pass

            if not changed:
                break
    
    return included, log


class RegressionAnalysis:
    def __init__(self, data, target_variable, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.target_variable = target_variable
        self.alpha = alpha
        self.results = {}
        self.scaler = StandardScaler()
        
        self.sanitized_cols = {col: re.sub(r'[^A-Za-z0-9_]', '_', col) for col in self.data.columns}
        self.original_names = {v: k for k, v in self.sanitized_cols.items()}
        
        self.data.rename(columns=self.sanitized_cols, inplace=True)
        self.target_variable_clean = self.sanitized_cols[target_variable]
        
        # Track original indices before any dropping
        self.original_indices = self.data.index.tolist()
        self.original_length = len(self.data)
        
        self.data[self.target_variable_clean] = pd.to_numeric(self.data[self.target_variable_clean], errors='coerce')
        
        # Track dropped rows from target variable
        target_na_mask = self.data[self.target_variable_clean].isna()
        self.dropped_rows = self.data.index[target_na_mask].tolist()
        
        self.data.dropna(subset=[self.target_variable_clean], inplace=True)

        self.y = self.data[self.target_variable_clean]
        
        X_to_process = self.data.drop(columns=[self.target_variable_clean])
        
        for col in X_to_process.columns:
             X_to_process[col] = pd.to_numeric(X_to_process[col], errors='coerce')

        numeric_features = X_to_process.select_dtypes(include=np.number)
        categorical_features = X_to_process.select_dtypes(include=['object', 'category'])
        
        if not categorical_features.empty:
            X_encoded = pd.get_dummies(X_to_process, columns=categorical_features.columns.tolist(), drop_first=True, dtype=float)
            self.X = X_encoded
        else:
            self.X = numeric_features
        
        self.X, self.y = self.X.align(self.y, join='inner', axis=0)

    def _get_clean_feature_names(self, features):
        return [self.sanitized_cols.get(f, f) for f in features if self.sanitized_cols.get(f, f) in self.X.columns]
    
    def _scale_data(self, X_selected, standardize):
        if standardize:
            X_scaled = pd.DataFrame(self.scaler.fit_transform(X_selected), columns=X_selected.columns, index=X_selected.index)
        else:
            X_scaled = X_selected
        return X_scaled

    def _calculate_metrics(self, y_true, y_pred, n_features):
        n = len(y_true)
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        adj_r2 = 1 - (1 - r2) * (n - 1) / (n - n_features - 1) if (n - n_features - 1) > 0 else 0
        return {'mse': mse, 'rmse': rmse, 'mae': mae, 'r2': r2, 'adj_r2': adj_r2}

    def _calculate_diagnostics(self, X, sm_model):
        residuals = sm_model.resid
        diagnostics = {}
        
        def clean_name(name):
             name = re.sub(r'Q\("([^"]+)"\)', r'\1', name.strip())
             return self.original_names.get(name, name)

        summary_obj = sm_model.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            if table_data and len(table_data) > 1 and any('coef' in str(h).lower() for h in table_data[0]):
                for row in table_data[1:]:
                    if row and row[0]:
                         row[0] = clean_name(row[0])

            summary_data.append({'caption': getattr(table, 'title', None), 'data': table_data})
        diagnostics['model_summary_data'] = summary_data

        diagnostics['f_statistic'] = sm_model.fvalue
        diagnostics['f_pvalue'] = sm_model.f_pvalue
        
        diagnostics['coefficient_tests'] = {
            'params': {clean_name(k): v for k, v in sm_model.params.to_dict().items()},
            'pvalues': {clean_name(k): v for k, v in sm_model.pvalues.to_dict().items()},
            'bse': {clean_name(k): v for k, v in sm_model.bse.to_dict().items()},
            'tvalues': {clean_name(k): v for k, v in sm_model.tvalues.to_dict().items()},
        }
        diagnostics['durbin_watson'] = durbin_watson(residuals) if len(residuals) > 1 else None
        
        try:
             X_for_vif = sm.add_constant(X)
             if X_for_vif.shape[1] > 1:
                vif_data = [variance_inflation_factor(X_for_vif.values, i) for i in range(X_for_vif.shape[1])]
                vif = {clean_name(X_for_vif.columns[i]): vif_data[i] for i in range(X_for_vif.shape[1])}
                diagnostics['vif'] = vif
             else:
                 diagnostics['vif'] = {}
        except Exception: diagnostics['vif'] = {}
        
        jb_stat, jb_p, _, _ = jarque_bera(residuals) if len(residuals) > 2 else (np.nan, np.nan, np.nan, np.nan)
        sw_stat, sw_p = stats.shapiro(residuals) if len(residuals) > 2 else (np.nan, np.nan)
        diagnostics['normality_tests'] = {
            'jarque_bera': {'statistic': jb_stat, 'p_value': jb_p},
            'shapiro_wilk': {'statistic': sw_stat, 'p_value': sw_p}
        }
        
        try:
            bp_stat, bp_p, _, _ = het_breuschpagan(residuals, sm_model.model.exog)
            diagnostics['heteroscedasticity_tests'] = {'breusch_pagan': {'statistic': bp_stat, 'p_value': bp_p}}
        except Exception:
             diagnostics['heteroscedasticity_tests'] = {}
        
        try:
            reset_test = linear_reset(sm_model)
            diagnostics['specification_tests'] = {'reset': {'statistic': reset_test.fvalue.item(), 'p_value': reset_test.pvalue}}
        except Exception:
            diagnostics['specification_tests'] = {}
        
        return diagnostics
    
    def _generate_interpretation(self, metrics, diagnostics, stepwise_log, model_type):
        if not diagnostics:
            return "Could not generate interpretation because model diagnostics failed."
            
        target_var_orig = self.original_names.get(self.target_variable_clean, self.target_variable_clean)
        feature_names_orig = [self.original_names.get(f, f) for f in self.X_final.columns]
        
        intro = f"A regression analysis was conducted to examine the relationship between the independent variable(s) ({', '.join(feature_names_orig)}) and the dependent variable ('{target_var_orig}').\n"

        coeffs = diagnostics.get('coefficient_tests', {}).get('params', {})
        p_values = diagnostics.get('coefficient_tests', {}).get('pvalues', {})
        
        intercept = coeffs.get('const', 0)
        slopes = {k:v for k,v in coeffs.items() if k != 'const'}
        
        equation_parts = [f"{v:.3f} * {k}" for k, v in slopes.items()]
        equation = f"Equation: {target_var_orig} = {intercept:.3f} + " + " + ".join(equation_parts) + "\n"

        coeff_interp = ""
        for name, value in slopes.items():
            p_val = p_values.get(name, 1.0)
            if p_val is not None and not math.isnan(p_val):
                sig_text = "significant" if p_val < 0.05 else "not significant"
                direction = "increase" if value > 0 else "decrease"
                coeff_interp += f"- The coefficient for '{name}' was {value:.3f}. This was statistically {sig_text} (p = {p_val:.3f}). This indicates that for a one-unit increase in '{name}', '{target_var_orig}' is predicted to {direction} by {abs(value):.3f} units.\n"

        r2 = metrics['r2']
        r2_text = f"The R-squared value of {r2:.3f} indicates that {(r2*100):.1f}% of the variability in '{target_var_orig}' can be explained by the linear relationship with the predictor(s).\n"
        
        conclusion = "In conclusion, the model provides a significant explanation of the variance in the target variable, with several predictors showing a clear impact. Practical significance should be considered based on the magnitude of the coefficients and the R-squared value."

        return intro + equation + coeff_interp + r2_text + conclusion

    def plot_function_comparison(self):
        """Plot comparison of logistic, error function, and hyperbolic tangent"""
        # Reset to default and set custom style
        plt.rcdefaults()
        
        # Set style parameters to match the third image
        plt.style.use('seaborn-v0_8-darkgrid')
        plt.rcParams['figure.facecolor'] = '#d3d3d3'
        plt.rcParams['axes.facecolor'] = '#EAEAF2'
        plt.rcParams['axes.edgecolor'] = 'gray'
        plt.rcParams['grid.color'] = 'white'
        plt.rcParams['grid.linestyle'] = '-'
        plt.rcParams['grid.linewidth'] = 1.2
        
        # Generate data
        xx = np.linspace(-5, 5, 1000)
        
        # Create figure
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Plot three functions using seaborn
        sns.lineplot(x=xx, y=1/(1+np.exp(-xx)), color='red', linestyle='-', 
                     linewidth=2, label='Logistic Function', ax=ax)
        sns.lineplot(x=xx, y=special.erf(0.5*np.sqrt(np.pi)*xx), color='green', 
                     linestyle=':', linewidth=2, label='Error Function', ax=ax)
        sns.lineplot(x=xx, y=np.tanh(xx), color='blue', linestyle='--', 
                     linewidth=2, label='Hyperbolic Tangent', ax=ax)
        
        # Set limits and labels
        ax.set_ylim([-1.1, 1.1])
        ax.set_xlabel("x", fontsize=12)
        ax.legend(loc=2, frameon=True, fancybox=True, shadow=False, fontsize=10)
        
        # Customize grid
        ax.grid(True, alpha=0.7)
        ax.set_axisbelow(True)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#d3d3d3')
        plt.close(fig)
        plt.rcdefaults()  # Reset to default after plotting
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

    def run(self, model_type, **kwargs):
        if not HAS_STATSMODELS:
            raise ImportError("Statsmodels library is required for this analysis but is not installed in the environment.")

        features = kwargs.get('features')
        selection_method = kwargs.get('selectionMethod', 'none')
        
        X_selected = self.X[self._get_clean_feature_names(features)].dropna()
        
        # Track additional dropped rows from feature selection
        feature_na_indices = self.X.index.difference(X_selected.index)
        additional_dropped = feature_na_indices.tolist()
        all_dropped_rows = list(set(self.dropped_rows + additional_dropped))
        
        y_aligned, X_selected = self.y.align(X_selected, join='inner', axis=0)

        stepwise_log = []
        if selection_method != 'none' and selection_method != 'enter':
            final_features, stepwise_log = perform_stepwise_selection(X_selected, y_aligned, method=selection_method)
            if not final_features: raise ValueError("No features were selected by the stepwise method.")
            X_selected = X_selected[final_features]

        # Store original X_selected for standardization calculation
        X_original = X_selected.copy()
        
        # Keep original X for unstandardized coefficients
        X_unstandardized = X_selected.copy()
        self.X_final = X_unstandardized
        
        if model_type == 'polynomial':
            degree = kwargs.get('degree', 2)
            poly = PolynomialFeatures(degree=degree, include_bias=False)
            X_poly = poly.fit_transform(X_unstandardized)
            poly_feature_names = poly.get_feature_names_out(X_unstandardized.columns)
            X_unstandardized = pd.DataFrame(X_poly, columns=poly_feature_names, index=X_unstandardized.index)

        # Fit unstandardized model
        X_with_const = sm.add_constant(X_unstandardized)
        sm_model = sm.OLS(y_aligned, X_with_const).fit()
        
        # Calculate standardized coefficients using original X (before polynomial)
        # Standardize X and y (excluding polynomial features)
        standardized_coeffs = {}
        if model_type != 'polynomial':
            # Standardize using zscore
            X_standardized = X_original.apply(stats.zscore)
            y_standardized = stats.zscore(y_aligned)
            
            X_std_const = sm.add_constant(X_standardized)
            sm_model_std = sm.OLS(y_standardized, X_std_const).fit()
            
            # Apply clean_name to match the main model's coefficient names
            def clean_name_helper(name):
                name = re.sub(r'Q\("([^"]+)"\)', r'\1', name.strip())
                return self.original_names.get(name, name)
            
            standardized_coeffs = {clean_name_helper(k): v for k, v in sm_model_std.params.to_dict().items()}
            
            # Debug: Print standardized coefficients
            print("DEBUG: Standardized coefficients:", standardized_coeffs, file=sys.stderr)
        
        y_pred = sm_model.predict(X_with_const)

        metrics = self._calculate_metrics(y_aligned, y_pred, X_unstandardized.shape[1])
        diagnostics = self._calculate_diagnostics(X_unstandardized, sm_model)
        
        # Add standardized coefficients to diagnostics
        diagnostics['standardized_coefficients'] = standardized_coeffs
        
        # Debug: Print diagnostics keys
        print("DEBUG: Diagnostics keys:", list(diagnostics.keys()), file=sys.stderr)
        print("DEBUG: standardized_coefficients in diagnostics:", diagnostics.get('standardized_coefficients'), file=sys.stderr)
        
        results = {
            'metrics': {'all_data': metrics},
            'diagnostics': diagnostics,
            'stepwise_log': stepwise_log,
            'interpretation': self._generate_interpretation(metrics, diagnostics, stepwise_log, model_type),
            'n_dropped': len(all_dropped_rows),
            'dropped_rows': sorted(all_dropped_rows),
            'standardized_coefficients_debug': standardized_coeffs  # DEBUG: Direct in results
        }
        
        self.y_true_plot, self.y_pred_plot = y_aligned, y_pred
        self.sm_model = sm_model

        return results

    def plot_statsmodels(self, model_name):
        # Reset to default and set custom style
        plt.rcdefaults()
        
        # Set style parameters - using seaborn's default colors
        plt.style.use('seaborn-v0_8-darkgrid')
        # axes.facecolor는 seaborn 스타일의 기본값 사용
        plt.rcParams['figure.facecolor'] = 'white'
        plt.rcParams['axes.edgecolor'] = 'gray'
        plt.rcParams['axes.linewidth'] = 1.5  # Axes border thickness
        plt.rcParams['grid.color'] = 'white'
        plt.rcParams['grid.linestyle'] = '-'
        plt.rcParams['grid.linewidth'] = 1.2  # Thicker grid lines
        plt.rcParams['grid.alpha'] = 0.8  # More opaque grid
        plt.rcParams['font.size'] = 10
        plt.rcParams['lines.linewidth'] = 2  # Default line width for all plots
        plt.rcParams['xtick.major.width'] = 1.5  # X-axis tick width
        plt.rcParams['ytick.major.width'] = 1.5  # Y-axis tick width
        
        residuals = self.sm_model.resid
        fig, axes = plt.subplots(2, 2, figsize=(10, 8))
        fig.suptitle(f'{model_name.title()} Regression Diagnostics', fontsize=16)
        
        # Plot 1: Actual vs Predicted
        ax = axes[0, 0]
        sns.scatterplot(x=self.y_true_plot, y=self.y_pred_plot, alpha=0.6, ax=ax)
        ax.plot([self.y_true_plot.min(), self.y_true_plot.max()], 
                [self.y_true_plot.min(), self.y_true_plot.max()], 
                'r--', linewidth=2.5)
        ax.set_xlabel('Actual Values')
        ax.set_ylabel('Predicted Values')
        ax.set_title(f"Actual vs Predicted (R² = {self.sm_model.rsquared:.4f})")
        
        # Plot 2: Residuals vs Fitted
        ax = axes[0, 1]
        sns.scatterplot(x=self.y_pred_plot, y=residuals, alpha=0.6, ax=ax)
        ax.axhline(y=0, color='red', linestyle='--', linewidth=2.5)
        ax.set_xlabel('Fitted Values')
        ax.set_ylabel('Residuals')
        ax.set_title('Residuals vs Fitted')
        
        # Plot 3: Q-Q Plot
        ax = axes[1, 0]
        sm.qqplot(residuals, line='s', ax=ax)
        # Make Q-Q plot line thicker
        for line in ax.get_lines():
            if line.get_linestyle() == '-':
                line.set_linewidth(2.5)
        ax.set_title('Q-Q Plot (Normality Check)')
        ax.grid(True)  # Ensure grid is visible
        
        # Plot 4: Scale-Location Plot
        ax = axes[1, 1]
        std_resid = self.sm_model.get_influence().resid_studentized_internal
        sqrt_abs_std_resid = np.sqrt(np.abs(std_resid))
        sns.scatterplot(x=self.y_pred_plot, y=sqrt_abs_std_resid, alpha=0.6, ax=ax)
        sns.regplot(x=self.y_pred_plot, y=sqrt_abs_std_resid, 
                    scatter=False, lowess=True, 
                    line_kws={'color': 'red', 'linewidth': 2.5}, ax=ax)
        ax.set_xlabel('Fitted Values')
        ax.set_ylabel('√|Standardized Residuals|')
        ax.set_title('Scale-Location Plot')

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close(fig)
        plt.rcdefaults()  # Reset to default after plotting
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        
        if not HAS_STATSMODELS:
             raise ImportError("Statsmodels library is required for this analysis but is not installed in the environment.")

        reg_analysis = RegressionAnalysis(payload['data'], payload['targetVar'])
        results = reg_analysis.run(payload['modelType'], **payload)

        response = {
            'results': results,
            'model_name': payload['modelType'],
            'model_type': 'regression',
            'plot': reg_analysis.plot_statsmodels(payload['modelType'])
        }
        
        # Debug output
        print("="*50, file=sys.stderr)
        print("DEBUG: standardized_coefficients_debug in results:", file=sys.stderr)
        print(results.get('standardized_coefficients_debug'), file=sys.stderr)
        print("DEBUG: diagnostics keys:", list(results.get('diagnostics', {}).keys()), file=sys.stderr)
        print("="*50, file=sys.stderr)
        
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    