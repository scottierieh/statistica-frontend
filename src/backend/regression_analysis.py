

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
import math
import re
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
    elif isinstance(obj, (float, np.floating)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    return obj
    
def perform_stepwise_selection(X, y, method='stepwise', p_enter=0.05, p_remove=0.1):
    """
    Performs forward, backward, or stepwise feature selection.
    """
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
                    continue # Handle potential multicollinearity issues
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
        
        if target_variable not in self.data.columns:
            raise ValueError(f"Target variable '{target_variable}' not found in data")
        
        self.sanitized_cols = {col: re.sub(r'[^A-Za-z0-9_]', '_', col) for col in self.data.columns}
        self.data.rename(columns=self.sanitized_cols, inplace=True)
        self.target_variable_clean = self.sanitized_cols[target_variable]
        
        self.y = self.data[self.target_variable_clean]
        
        X_to_process = self.data.drop(columns=[self.target_variable_clean])
        
        numeric_features = X_to_process.select_dtypes(include=np.number)
        categorical_features = X_to_process.select_dtypes(include=['object', 'category'])
        
        if not categorical_features.empty:
            X_encoded = pd.get_dummies(X_to_process, drop_first=True, dtype=float)
            self.X = X_encoded
        else:
            self.X = numeric_features

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

    def _calculate_diagnostics(self, X, y_true, y_pred, sm_model, sklearn_model, original_feature_names):
        residuals = y_true - y_pred
        diagnostics = {}
        
        original_to_sanitized = {v: k for k, v in self.sanitized_cols.items()}
        
        def clean_name(name):
             name = re.sub(r'Q\("([^"]+)"\)', r'\1', name.strip())
             return original_to_sanitized.get(name, name)

        if HAS_STATSMODELS and sm_model:
            summary_obj = sm_model.summary()
            summary_data = []
            for table in summary_obj.tables:
                table_data = [list(row) for row in table.data]
                if table_data and len(table_data) > 1 and 'coef' in table_data[0]:
                    for row in table_data[1:]:
                        if row and row[0]:
                             row[0] = clean_name(row[0])

                summary_data.append({'caption': getattr(table, 'title', None), 'data': table_data})
            diagnostics['model_summary_data'] = summary_data

            diagnostics['f_statistic'] = sm_model.fvalue
            diagnostics['f_pvalue'] = sm_model.f_pvalue
            diagnostics['df_model'] = sm_model.df_model
            diagnostics['df_resid'] = sm_model.df_resid
            
            diagnostics['coefficient_tests'] = {
                'params': {clean_name(k): v for k, v in sm_model.params.to_dict().items()},
                'pvalues': {clean_name(k): v for k, v in sm_model.pvalues.to_dict().items()},
                'bse': {clean_name(k): v for k, v in sm_model.bse.to_dict().items()},
                'tvalues': {clean_name(k): v for k, v in sm_model.tvalues.to_dict().items()},
            }
            diagnostics['durbin_watson'] = durbin_watson(residuals) if len(residuals) > 1 else None
            
            try:
                 if X.shape[1] > 1:
                    vif_data = [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
                    vif = {clean_name(X.columns[i]): vif_data[i] for i in range(X.shape[1])}
                    diagnostics['vif'] = vif
                 else:
                     diagnostics['vif'] = {}
            except Exception: diagnostics['vif'] = {}
            
            jb_stat, jb_p, _, _ = jarque_bera(residuals)
            sw_stat, sw_p = stats.shapiro(residuals)
            diagnostics['normality_tests'] = {
                'jarque_bera': {'statistic': jb_stat, 'p_value': jb_p},
                'shapiro_wilk': {'statistic': sw_stat, 'p_value': sw_p}
            }
            
            bp_stat, bp_p, _, _ = het_breuschpagan(residuals, sm_model.model.exog)
            diagnostics['heteroscedasticity_tests'] = {'breusch_pagan': {'statistic': bp_stat, 'p_value': bp_p}}
        else:
            diagnostics = self._basic_diagnostics(X, y_true, y_pred, sklearn_model, original_feature_names)
        return diagnostics
    
    def _basic_diagnostics(self, X, y_true, y_pred, sklearn_model, original_feature_names):
        diagnostics = {}
        residuals = y_true - y_pred
        try:
            sw_stat, sw_p = stats.shapiro(residuals)
            diagnostics['normality_tests'] = {'shapiro_wilk': {'statistic': sw_stat, 'p_value': sw_p}}
        except:
            diagnostics['normality_tests'] = {}
        
        diagnostics['coefficient_tests'] = {
            'params': {'const': sklearn_model.intercept_, **dict(zip(original_feature_names, sklearn_model.coef_))},
            'pvalues': {}, 'bse': {}, 'tvalues': {}
        }
        return diagnostics
    
    def _generate_interpretation(self, metrics, diagnostics, model_name, target_variable, features):
        model_type_str = model_name.replace('_', ' ').title()
        
        feature_list = ", ".join(f"'{f}'" for f in features)
        interpretation = f"A {model_type_str} regression was run to predict '{target_variable}' from {len(features)} feature(s).\n"

        adj_r2 = metrics.get('adj_r2')
        f_stat = diagnostics.get('f_statistic')
        f_pvalue = diagnostics.get('f_pvalue')
        
        if adj_r2 is not None:
             interpretation += f"The model explained {adj_r2*100:.1f}% of the variance in the target variable (*R*²adj = {adj_r2:.3f}). "
        
        if all(v is not None for v in [f_stat, f_pvalue]):
            p_val_str = f"p < .001" if f_pvalue < 0.001 else f"p = {f_pvalue:.3f}"
            model_sig_str = "statistically significant" if f_pvalue < self.alpha else "not statistically significant"
            interpretation += f"The overall model was {model_sig_str}, *F*({diagnostics.get('df_model', 'N/A')}, {diagnostics.get('df_resid', 'N/A')}) = {f_stat:.2f}, {p_val_str}.\n"
        
        return interpretation.strip()

    def run(self, model_type, **kwargs):
        features = kwargs.get('features')
        selection_method = kwargs.get('selectionMethod', 'none')
        predict_x = kwargs.get('predict_x')
        
        X_selected = self.X[self._get_clean_feature_names(features)]
        
        stepwise_log = []
        if HAS_STATSMODELS and selection_method != 'none':
            final_features, stepwise_log = perform_stepwise_selection(X_selected, self.y, method=selection_method)
            if not final_features: raise ValueError("No features were selected by the stepwise method.")
            X_selected = X_selected[final_features]

        X_scaled = self._scale_data(X_selected, standardize=True)
        
        sklearn_model = LinearRegression() # Default
        original_features = list(X_selected.columns)
        X_to_diagnose = X_scaled

        if model_type == 'polynomial':
            degree = kwargs.get('degree', 2)
            poly = PolynomialFeatures(degree=degree, include_bias=False)
            X_poly = poly.fit_transform(X_scaled)
            poly_feature_names = poly.get_feature_names_out(X_scaled.columns)
            X_poly_df = pd.DataFrame(X_poly, columns=poly_feature_names, index=X_scaled.index)
            sklearn_model.fit(X_poly_df, self.y)
            y_pred = sklearn_model.predict(X_poly_df)
            metrics = self._calculate_metrics(self.y, y_pred, X_poly_df.shape[1])
            original_features = list(poly_feature_names)
            X_to_diagnose = X_poly_df
        else:
            sklearn_model.fit(X_scaled, self.y)
            y_pred = sklearn_model.predict(X_scaled)
            metrics = self._calculate_metrics(self.y, y_pred, X_scaled.shape[1])

        sm_model = None
        if HAS_STATSMODELS:
            X_with_const = sm.add_constant(X_to_diagnose)
            try:
                sm_model = sm.OLS(self.y, X_with_const).fit()
            except: pass

        diagnostics = self._calculate_diagnostics(pd.DataFrame(X_to_diagnose), self.y, y_pred, sm_model, sklearn_model, original_features)
        
        results = {
            'metrics': {'all_data': metrics},
            'diagnostics': diagnostics,
            'stepwise_log': stepwise_log,
            'interpretation': self._generate_interpretation(metrics, diagnostics, model_type, self.target_variable, original_features)
        }
        
        # Plotting uses all data now
        self.y_true_plot, self.y_pred_plot = self.y, y_pred

        return results

    def plot_results(self, model_name):
        residuals = self.y_true_plot - self.y_pred_plot
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle(f'{model_name.title()} Regression Diagnostics', fontsize=16)
        
        ax = axes[0, 0]
        ax.scatter(self.y_true_plot, self.y_pred_plot, alpha=0.6)
        ax.plot([self.y_true_plot.min(), self.y_true_plot.max()], [self.y_true_plot.min(), self.y_true_plot.max()], 'r--', lw=2)
        ax.set_xlabel('Actual Values'); ax.set_ylabel('Predicted Values')
        ax.set_title(f"Actual vs Predicted")
        ax.grid(True, alpha=0.3)
        
        ax = axes[0, 1]
        ax.scatter(self.y_pred_plot, residuals, alpha=0.6)
        ax.axhline(y=0, color='red', linestyle='--'); ax.set_xlabel('Fitted Values'); ax.set_ylabel('Residuals')
        ax.set_title('Residuals vs Fitted'); ax.grid(True, alpha=0.3)
        
        ax = axes[1, 0]; stats.probplot(residuals, dist="norm", plot=ax)
        ax.set_title('Q-Q Plot (Normality Check)'); ax.grid(True, alpha=0.3)
        
        ax = axes[1, 1]
        sqrt_abs_residuals = np.sqrt(np.abs(residuals / np.std(residuals))) if np.std(residuals) > 0 else np.zeros_like(residuals)
        ax.scatter(self.y_pred_plot, sqrt_abs_residuals, alpha=0.6)
        z = np.polyfit(self.y_pred_plot, sqrt_abs_residuals, 1)
        p = np.poly1d(z)
        ax.plot(sorted(self.y_pred_plot), p(sorted(self.y_pred_plot)), "r--", alpha=0.8)
        ax.set_xlabel('Fitted Values'); ax.set_ylabel('√|Standardized Residuals|')
        ax.set_title('Scale-Location Plot'); ax.grid(True, alpha=0.3)

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        buf = io.BytesIO()
        plt.savefig(buf, format='png'); plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        reg_analysis = RegressionAnalysis(payload['data'], payload['targetVar'])
        results = reg_analysis.run(payload['modelType'], **payload)

        response = {
            'results': results,
            'model_name': payload['modelType'],
            'model_type': 'regression',
            'plot': reg_analysis.plot_results(payload['modelType'])
        }
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()



