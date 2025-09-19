

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
        self.models = {}
        self.scaler = StandardScaler()
        
        if target_variable not in self.data.columns:
            raise ValueError(f"Target variable '{target_variable}' not found in data")
        
        self.y = self.data[target_variable]
        # One-hot encode categorical features and combine with numeric
        numeric_features = self.data.select_dtypes(include=np.number).drop(columns=[target_variable], errors='ignore')
        categorical_features = self.data.select_dtypes(include=['object', 'category'])
        
        X_to_process = self.data.drop(columns=[target_variable])
        if not categorical_features.empty:
            X_encoded = pd.get_dummies(X_to_process, drop_first=True, dtype=float)
            self.X = X_encoded
        else:
            self.X = numeric_features


    def linear_regression(self, model_name="linear", features=None, standardize=False, selection_method='none'):
        stepwise_log = []
        if features is None:
            X_selected = self.X
        else:
            X_selected = self.X[[col for col in features if col in self.X.columns]]
        
        final_features = X_selected.columns.tolist()

        if HAS_STATSMODELS and selection_method != 'none':
            final_features, stepwise_log = perform_stepwise_selection(X_selected, self.y, method=selection_method)
            if not final_features:
                raise ValueError("No features were selected by the stepwise method. Try adjusting p-values or using a different method.")
            X_selected = X_selected[final_features]


        if standardize:
            X_scaled = pd.DataFrame(self.scaler.fit_transform(X_selected), columns=X_selected.columns, index=X_selected.index)
        else:
            X_scaled = X_selected

        sklearn_model = LinearRegression()
        sklearn_model.fit(X_scaled, self.y)
        
        sm_model = None
        if HAS_STATSMODELS:
            X_with_const = sm.add_constant(X_scaled)
            try:
                sm_model = sm.OLS(self.y, X_with_const).fit()
            except Exception as e:
                sm_model = None

        y_pred = sklearn_model.predict(X_scaled)
        metrics = self._calculate_metrics(self.y, y_pred, len(X_scaled.columns))
        diagnostics = self._calculate_diagnostics(X_scaled, self.y, y_pred, sm_model)
        
        self.results[model_name] = {
            'model_name': model_name,
            'model_type': 'linear_regression',
            'features': list(X_scaled.columns),
            'metrics': metrics,
            'diagnostics': diagnostics,
            'stepwise_log': stepwise_log,
            'interpretation': self._generate_interpretation(metrics, diagnostics, model_name, self.target_variable, list(X_scaled.columns))
        }
        self.y_pred = y_pred
        self.X_scaled = X_scaled
        return self.results[model_name]

    def polynomial_regression(self, model_name="polynomial", degree=2, features=None):
        if features is None:
            X_selected = self.X
        else:
            X_selected = self.X[features]

        poly = PolynomialFeatures(degree=degree, include_bias=False)
        X_poly = poly.fit_transform(X_selected)
        poly_feature_names = poly.get_feature_names_out(X_selected.columns)
        X_poly_df = pd.DataFrame(X_poly, columns=poly_feature_names, index=X_selected.index)

        sklearn_model = LinearRegression()
        sklearn_model.fit(X_poly_df, self.y)
        
        sm_model = None
        if HAS_STATSMODELS:
            X_with_const = sm.add_constant(X_poly_df)
            try:
                sm_model = sm.OLS(self.y, X_with_const).fit()
            except:
                sm_model = None

        y_pred = sklearn_model.predict(X_poly_df)
        metrics = self._calculate_metrics(self.y, y_pred, len(poly_feature_names))
        diagnostics = self._calculate_diagnostics(X_poly_df, self.y, y_pred, sm_model)
        
        self.results[model_name] = {
            'model_name': model_name, 'model_type': 'polynomial_regression', 'features': list(poly_feature_names),
            'metrics': metrics, 'diagnostics': diagnostics, 'stepwise_log': [],
            'interpretation': self._generate_interpretation(metrics, diagnostics, model_name, self.target_variable, list(poly_feature_names))
        }
        self.y_pred = y_pred
        self.X_scaled = X_poly_df
        return self.results[model_name]

    def regularized_regression(self, model_name, reg_type, alpha_reg, l1_ratio=None, features=None, standardize=True):
        if features is None:
            X_selected = self.X
        else:
            X_selected = self.X[features]

        if standardize:
            X_scaled = pd.DataFrame(self.scaler.fit_transform(X_selected), columns=X_selected.columns, index=X_selected.index)
        else:
            X_scaled = X_selected

        if reg_type == "ridge":
            model = Ridge(alpha=alpha_reg)
        elif reg_type == "lasso":
            model = Lasso(alpha=alpha_reg)
        elif reg_type == "elasticnet":
            model = ElasticNet(alpha=alpha_reg, l1_ratio=l1_ratio)
        else:
            raise ValueError("reg_type must be 'ridge', 'lasso', or 'elasticnet'")

        model.fit(X_scaled, self.y)

        y_pred = model.predict(X_scaled)
        metrics = self._calculate_metrics(self.y, y_pred, len(X_scaled.columns))
        
        diagnostics = self._basic_diagnostics(X_scaled, self.y, y_pred)
        
        diagnostics['coefficient_tests'] = {
            'params': {'const': model.intercept_, **dict(zip(X_scaled.columns, model.coef_))},
            'pvalues': {}, 'bse': {}, 'tvalues': {}
        }

        self.results[model_name] = {
            'model_name': model_name, 'model_type': f'{reg_type}_regression', 'features': list(X_scaled.columns),
            'metrics': metrics, 'diagnostics': diagnostics, 'stepwise_log': [],
            'interpretation': self._generate_interpretation(metrics, diagnostics, model_name, self.target_variable, list(X_scaled.columns))
        }
        self.y_pred = y_pred
        self.X_scaled = X_scaled
        return self.results[model_name]

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
        diagnostics = {}

        if HAS_STATSMODELS and sm_model:
            summary_obj = sm_model.summary()
            summary_data = []
            for table in summary_obj.tables:
                table_data = [list(row) for row in table.data]
                summary_data.append({'caption': getattr(table, 'title', None), 'data': table_data})
            diagnostics['model_summary_data'] = summary_data

            diagnostics['f_statistic'] = sm_model.fvalue
            diagnostics['f_pvalue'] = sm_model.f_pvalue
            diagnostics['df_model'] = sm_model.df_model
            diagnostics['df_resid'] = sm_model.df_resid

            diagnostics['coefficient_tests'] = {
                'params': sm_model.params.to_dict(),
                'pvalues': sm_model.pvalues.to_dict(),
                'bse': sm_model.bse.to_dict(),
                'tvalues': sm_model.tvalues.to_dict(),
            }
            try:
                diagnostics['durbin_watson'] = durbin_watson(residuals)
            except:
                diagnostics['durbin_watson'] = None

            try:
                 if X.shape[1] > 1:
                    vif_data = [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
                    vif = {X.columns[i]: vif_data[i] for i in range(X.shape[1])}
                    diagnostics['vif'] = vif
                 else:
                     diagnostics['vif'] = {}
            except Exception:
                diagnostics['vif'] = {}
            
            try:
                jb_stat, jb_p, _, _ = jarque_bera(residuals)
                sw_stat, sw_p = stats.shapiro(residuals)
                diagnostics['normality_tests'] = {
                    'jarque_bera': {'statistic': jb_stat, 'p_value': jb_p},
                    'shapiro_wilk': {'statistic': sw_stat, 'p_value': sw_p}
                }
            except:
                 diagnostics['normality_tests'] = {}
            
            try:
                bp_stat, bp_p, _, _ = het_breuschpagan(residuals, sm_model.model.exog)
                diagnostics['heteroscedasticity_tests'] = {
                    'breusch_pagan': {'statistic': bp_stat, 'p_value': bp_p}
                }
            except:
                 diagnostics['heteroscedasticity_tests'] = {}

        else:
            diagnostics = self._basic_diagnostics(X, y_true, y_pred)


        return diagnostics
    
    def _basic_diagnostics(self, X, y_true, y_pred):
        diagnostics = {}
        residuals = y_true - y_pred
        try:
            sw_stat, sw_p = stats.shapiro(residuals)
            diagnostics['normality_tests'] = {'shapiro_wilk': {'statistic': sw_stat, 'p_value': sw_p}}
        except:
            diagnostics['normality_tests'] = {}
        return diagnostics
    
    def _generate_interpretation(self, metrics, diagnostics, model_name, target_variable, features):
        model_type_str = model_name.replace('_', ' ').title()
        
        # Sentence 1: Purpose
        feature_list = ", ".join(f"'{f}'" for f in features)
        interpretation = f"A {model_type_str} regression was run to predict '{target_variable}' from {feature_list}.\n\n"

        # Sentence 2 & 3: Model Significance & R-squared
        f_stat = diagnostics.get('f_statistic')
        f_pvalue = diagnostics.get('f_pvalue')
        df_model = diagnostics.get('df_model')
        df_resid = diagnostics.get('df_resid')
        adj_r2 = metrics.get('adj_r2')

        if all(v is not None for v in [f_stat, f_pvalue, df_model, df_resid, adj_r2]):
            p_val_str = f"p < .001" if f_pvalue < 0.001 else f"p = {f_pvalue:.3f}"
            model_sig_str = "statistically significant" if f_pvalue < self.alpha else "not statistically significant"
            interpretation += (f"The overall regression model was {model_sig_str}, *F*({int(df_model)}, {int(df_resid)}) = {f_stat:.2f}, {p_val_str}.\n")
            interpretation += f"The model explained {adj_r2*100:.1f}% of the variance in '{target_variable}' (*R*²adj = {adj_r2:.3f}).\n\n"
        elif adj_r2 is not None:
            interpretation += f"The model explained {adj_r2*100:.1f}% of the variance in '{target_variable}' (*R*² = {metrics.get('r2', 0):.3f}).\n\n"


        # Sentence 4 & 5: Individual Predictors
        coeffs = diagnostics.get('coefficient_tests')
        if coeffs and coeffs.get('pvalues') and any(coeffs.get('pvalues')):
            params = coeffs['params']
            p_values = coeffs['pvalues']
            
            sig_vars_text = []
            for var in features:
                if var in p_values and p_values[var] < self.alpha:
                    b = params.get(var, 0)
                    p_val_text = f"p < .001" if p_values[var] < 0.001 else f"p = {p_values[var]:.3f}"
                    sig_vars_text.append(f"'{var}' (*B* = {b:.3f}, {p_val_text})")
            
            if sig_vars_text:
                interpretation += f"It was found that {', '.join(sig_vars_text)} significantly predicted '{target_variable}'.\n\n"

        # Sentence 6: Regression Equation
        if coeffs:
            b0 = coeffs['params'].get('const', 0)
            b1_str_parts = []
            for var in features:
                 b_val = coeffs['params'].get(var)
                 if b_val is not None:
                     sign = "-" if b_val < 0 else "+"
                     b1_str_parts.append(f"{sign} {abs(b_val):.3f}*({var})")
            
            b1_str = " ".join(b1_str_parts)
            interpretation += f"The final regression equation is: **{target_variable} = {b0:.3f} {b1_str}**."

        interpretation = interpretation.strip()

        # Diagnostic warnings
        warnings = []
        normality_p = diagnostics.get('normality_tests', {}).get('shapiro_wilk', {}).get('p_value')
        if normality_p is not None and normality_p < self.alpha:
            warnings.append("Warning: The residuals are not normally distributed (Shapiro-Wilk p < 0.05). This can affect the validity of p-values for the coefficients. Consider transforming the dependent variable (e.g., log transformation) or using a robust regression method.")

        hetero_p = diagnostics.get('heteroscedasticity_tests', {}).get('breusch_pagan', {}).get('p_value')
        if hetero_p is not None and hetero_p < self.alpha:
            warnings.append("Warning: Heteroscedasticity detected (Breusch-Pagan p < 0.05), meaning the variance of residuals is not constant. This can lead to unreliable standard errors. Consider using robust standard errors or a different model specification.")

        vif_data = diagnostics.get('vif', {})
        high_vif_vars = [var for var, vif in vif_data.items() if vif > 10]
        if high_vif_vars:
            warnings.append(f"Warning: High multicollinearity detected (VIF > 10) for variables: {', '.join(high_vif_vars)}. This suggests these variables are highly correlated, which can inflate standard errors and make coefficient estimates unstable. Consider removing one or more of these variables and re-running the analysis.")

        if warnings:
            interpretation += "\n\n--- Diagnostic Warnings ---\n" + "\n".join(warnings)

        return interpretation


    
    def plot_results(self, model_name):
        residuals = self.y - self.y_pred
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle(f'Regression Diagnostics - {model_name}', fontsize=16, fontweight='bold')
        
        # Actual vs Predicted
        ax = axes[0, 0]
        ax.scatter(self.y, self.y_pred, alpha=0.6)
        ax.plot([self.y.min(), self.y.max()], [self.y.min(), self.y.max()], 'r--', lw=2)
        ax.set_xlabel('Actual Values')
        ax.set_ylabel('Predicted Values')
        ax.set_title(f"Actual vs Predicted (R² = {self.results[model_name]['metrics']['r2']:.4f})")
        ax.grid(True, alpha=0.3)
        
        # Residuals vs Fitted
        ax = axes[0, 1]
        ax.scatter(self.y_pred, residuals, alpha=0.6)
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
        sqrt_abs_residuals = np.sqrt(np.abs(residuals / np.std(residuals))) if np.std(residuals) > 0 else np.zeros_like(residuals)
        ax.scatter(self.y_pred, sqrt_abs_residuals, alpha=0.6)
        z = np.polyfit(self.y_pred, sqrt_abs_residuals, 1)
        p = np.poly1d(z)
        ax.plot(sorted(self.y_pred), p(sorted(self.y_pred)), "r--", alpha=0.8)
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
        model_type = payload.get('modelType', 'multiple')
        selection_method = payload.get('selectionMethod', 'none')

        if not all([data, target_variable, features]):
            raise ValueError("Missing 'data', 'targetVar', or 'features'")

        df = pd.DataFrame(data)
        
        reg_analysis = RegressionAnalysis(df, target_variable)
        
        results = None
        if model_type == 'simple' or model_type == 'multiple':
            results = reg_analysis.linear_regression(model_name=model_type, features=features, standardize=True, selection_method=selection_method)
        elif model_type == 'polynomial':
            degree = payload.get('degree', 2)
            results = reg_analysis.polynomial_regression(model_name=model_type, features=features, degree=degree)
        elif model_type in ['ridge', 'lasso', 'elasticnet']:
            alpha = payload.get('alpha', 1.0)
            l1_ratio = payload.get('l1_ratio', 0.5) if model_type == 'elasticnet' else None
            results = reg_analysis.regularized_regression(model_name=model_type, reg_type=model_type, alpha_reg=alpha, l1_ratio=l1_ratio, features=features)
        else:
            raise ValueError(f"Unsupported model type: {model_type}")

        plot_image = reg_analysis.plot_results(model_type)

        response = {
            'results': results,
            'model_name': results['model_name'],
            'model_type': results['model_type'],
            'plot': plot_image
        }

        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    
