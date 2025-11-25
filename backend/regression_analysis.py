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

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()
        
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

    def _calculate_metrics(self, y_true, y_pred, n_features):
        n = len(y_true)
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        adj_r2 = 1 - (1 - r2) * (n - 1) / (n - n_features - 1) if (n - n_features - 1) > 0 else 0
        return {'mse': mse, 'rmse': rmse, 'mae': mae, 'r2': r2, 'adj_r2': adj_r2}

    def _calculate_diagnostics(self, X, sm_model, sm_model_standardized=None):
        residuals = sm_model.resid
        diagnostics = {}
        
        def clean_name(name):
             name = re.sub(r'Q\("([^"]+)"\)', r'\1', name.strip())
             return self.original_names.get(name, name)

        # 비표준화 모델 요약
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
        
        # 비표준화 계수
        diagnostics['coefficient_tests'] = {
            'params': {clean_name(k): v for k, v in sm_model.params.to_dict().items()},
            'pvalues': {clean_name(k): v for k, v in sm_model.pvalues.to_dict().items()},
            'bse': {clean_name(k): v for k, v in sm_model.bse.to_dict().items()},
            'tvalues': {clean_name(k): v for k, v in sm_model.tvalues.to_dict().items()},
        }
        
        # 표준화 계수 추가
        if sm_model_standardized is not None:
            diagnostics['standardized_coefficients'] = {
                'params': {clean_name(k): v for k, v in sm_model_standardized.params.to_dict().items()},
                'pvalues': {clean_name(k): v for k, v in sm_model_standardized.pvalues.to_dict().items()},
                'bse': {clean_name(k): v for k, v in sm_model_standardized.bse.to_dict().items()},
                'tvalues': {clean_name(k): v for k, v in sm_model_standardized.tvalues.to_dict().items()},
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
        
        # Get coefficients and p-values
        coeffs = diagnostics.get('coefficient_tests', {}).get('params', {})
        p_values = diagnostics.get('coefficient_tests', {}).get('pvalues', {})
        std_coeffs = diagnostics.get('standardized_coefficients', {}).get('params', {})
        
        intercept = coeffs.get('const', 0)
        slopes = {k:v for k,v in coeffs.items() if k != 'const'}
        
        r2 = metrics['r2']
        adj_r2 = metrics.get('adj_r2', r2)
        rmse = metrics['rmse']
        f_pvalue = diagnostics.get('f_pvalue', 1.0)
        
        sections = []
        
        # Overall Analysis Section
        sections.append("**Overall Analysis**")
        
        model_type_label = {
            'simple': 'Simple linear regression',
            'multiple': 'Multiple linear regression',
            'polynomial': 'Polynomial regression'
        }.get(model_type, 'Regression')
        
        sections.append(f"{model_type_label} was performed to predict {target_var_orig} using {len(feature_names_orig)} predictor{'s' if len(feature_names_orig) > 1 else ''}: {', '.join(feature_names_orig)}.")
        
        if f_pvalue < 0.05:
            sections.append(f"The overall model was statistically significant (F-test p < .05), indicating that the predictors collectively explain variance in {target_var_orig}.")
        else:
            sections.append(f"The overall model was not statistically significant (F-test p = {f_pvalue:.3f}), suggesting the predictors may not effectively explain variance in {target_var_orig}.")
        
        sections.append(f"The model explained {(r2*100):.1f}% of the variance (R² = {r2:.3f}).")
        
        sections.append("")
        
        # Statistical Insights Section
        sections.append("**Statistical Insights**")
        
        # Unstandardized coefficients
        sections.append(f"→ **Unstandardized Coefficients (B)** - showing actual unit changes:")
        for name, value in slopes.items():
            p_val = p_values.get(name, 1.0)
            if p_val is not None and not math.isnan(p_val):
                sig_text = "significant" if p_val < 0.05 else "not significant"
                direction = "increases" if value > 0 else "decreases"
                sig_marker = "***" if p_val < 0.001 else "**" if p_val < 0.01 else "*" if p_val < 0.05 else ""
                sections.append(f"  • **{name}**: B = {value:.3f} (p = {p_val:.3f}{sig_marker}) - For each unit increase in {name}, {target_var_orig} {direction} by {abs(value):.3f} units ({sig_text})")
        
        # Standardized coefficients
        if std_coeffs and model_type != 'polynomial':
            std_slopes = {k:v for k,v in std_coeffs.items() if k != 'const'}
            sorted_std = sorted(std_slopes.items(), key=lambda x: abs(x[1]), reverse=True)
            
            sections.append("")
            sections.append(f"→ **Standardized Coefficients (β)** - for comparing relative importance:")
            for name, value in sorted_std:
                sections.append(f"  • **{name}**: β = {value:.3f} (ranked #{sorted_std.index((name, value))+1} in importance)")
            
            if sorted_std:
                sections.append(f"  • The most influential predictor is **{sorted_std[0][0]}** (|β| = {abs(sorted_std[0][1]):.3f})")
        
        # Model fit metrics
        sections.append("")
        sections.append(f"→ **Model Performance**: R² = {r2:.3f}, Adjusted R² = {adj_r2:.3f}, RMSE = {rmse:.3f}")
        
        # Equation
        equation_parts = [f"{v:.3f}*{k}" for k, v in slopes.items()]
        equation = f"{target_var_orig} = {intercept:.3f} + " + " + ".join(equation_parts)
        sections.append(f"→ **Prediction Equation**: {equation}")
        
        sections.append("")
        
        # Recommendations Section
        sections.append("**Recommendations**")
        
        if f_pvalue < 0.05:
            sections.append(f"→ The model is statistically significant and can be used for prediction and inference")
            
            # R² interpretation
            if r2 >= 0.75:
                sections.append(f"→ Excellent model fit (R² = {r2:.3f}) - the model explains most of the variance")
            elif r2 >= 0.50:
                sections.append(f"→ Good model fit (R² = {r2:.3f}) - substantial variance explained")
            elif r2 >= 0.25:
                sections.append(f"→ Moderate model fit (R² = {r2:.3f}) - consider adding more predictors or transformations")
            else:
                sections.append(f"→ Weak model fit (R² = {r2:.3f}) - significant but limited explanatory power")
        else:
            sections.append(f"→ ⚠ Model not significant - reconsider variable selection or model specification")
            sections.append(f"→ Consider: different predictors, polynomial terms, interaction effects, or non-linear models")
        
        # Check assumptions
        dw = diagnostics.get('durbin_watson')
        if dw is not None:
            if dw < 1.5 or dw > 2.5:
                sections.append(f"→ ⚠ Durbin-Watson = {dw:.2f} suggests autocorrelation - check independence assumption")
        
        bp_test = diagnostics.get('heteroscedasticity_tests', {}).get('breusch_pagan', {})
        if bp_test.get('p_value') is not None and bp_test['p_value'] < 0.05:
            sections.append(f"→ ⚠ Heteroscedasticity detected (Breusch-Pagan p < .05) - consider robust standard errors or transformations")
        
        sw_test = diagnostics.get('normality_tests', {}).get('shapiro_wilk', {})
        if sw_test.get('p_value') is not None and sw_test['p_value'] < 0.05:
            sections.append(f"→ ⚠ Residuals not normally distributed (Shapiro-Wilk p < .05) - may affect inference")
        
        # VIF check for multicollinearity
        vif_values = diagnostics.get('vif', {})
        high_vif = {k: v for k, v in vif_values.items() if k != 'const' and v > 10}
        if high_vif:
            sections.append(f"→ ⚠ High multicollinearity detected (VIF > 10 for {', '.join(high_vif.keys())}) - consider removing correlated predictors")
        
        sections.append(f"→ Review diagnostic plots: check linearity (Residuals vs Fitted), normality (Q-Q plot), and homoscedasticity (Scale-Location)")
        sections.append(f"→ Validate model on new data before making real-world predictions")
        
        return "\n".join(sections)

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

        # 원본 데이터 사용 (표준화 없음)
        X_final = X_selected.copy()
        self.X_final = X_final # Store for interpretation
        
        if model_type == 'polynomial':
            degree = kwargs.get('degree', 2)
            poly = PolynomialFeatures(degree=degree, include_bias=False)
            X_poly = poly.fit_transform(X_final)
            poly_feature_names = poly.get_feature_names_out(X_final.columns)
            X_final = pd.DataFrame(X_poly, columns=poly_feature_names, index=X_final.index)

        # 1. 비표준화 모델 (원본 데이터)
        X_with_const = sm.add_constant(X_final)
        sm_model = sm.OLS(y_aligned, X_with_const).fit()
        y_pred = sm_model.predict(X_with_const)
        
        # 2. 표준화 모델 (X와 y 모두 표준화)
        X_standardized = pd.DataFrame(
            self.scaler_X.fit_transform(X_final), 
            columns=X_final.columns, 
            index=X_final.index
        )
        y_standardized = pd.Series(
            self.scaler_y.fit_transform(y_aligned.values.reshape(-1, 1)).flatten(),
            index=y_aligned.index
        )
        
        X_std_with_const = sm.add_constant(X_standardized)
        sm_model_standardized = sm.OLS(y_standardized, X_std_with_const).fit()

        metrics = self._calculate_metrics(y_aligned, y_pred, X_final.shape[1])
        diagnostics = self._calculate_diagnostics(X_final, sm_model, sm_model_standardized)
        
        results = {
            'metrics': {'all_data': metrics},
            'diagnostics': diagnostics,
            'stepwise_log': stepwise_log,
            'interpretation': self._generate_interpretation(metrics, diagnostics, stepwise_log, model_type),
            'n_dropped': len(all_dropped_rows),
            'dropped_rows': sorted(all_dropped_rows)
        }
        
        self.y_true_plot, self.y_pred_plot = y_aligned, y_pred
        self.sm_model = sm_model

        return results

    def plot_statsmodels(self, model_name):
        residuals = self.sm_model.resid
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # Define consistent line color (darker red)
        line_color = '#C44E52'  # Darker red, similar to seaborn default
        
        # Plot 1: Actual vs Predicted
        sns.scatterplot(x=self.y_true_plot, y=self.y_pred_plot, alpha=0.6, color='#5B9BD5', ax=axes[0, 0])
        axes[0, 0].plot([self.y_true_plot.min(), self.y_true_plot.max()], 
                        [self.y_true_plot.min(), self.y_true_plot.max()], 
                        '--', linewidth=2, color=line_color)
        axes[0, 0].set_xlabel('Actual Values', fontsize=12)
        axes[0, 0].set_ylabel('Predicted Values', fontsize=12)
        axes[0, 0].set_title(f"Actual vs Predicted (R² = {self.sm_model.rsquared:.4f})", fontsize=12, fontweight='bold')
        
        # Plot 2: Residuals vs Fitted
        sns.scatterplot(x=self.y_pred_plot, y=residuals, alpha=0.6, color='#5B9BD5', ax=axes[0, 1])
        axes[0, 1].axhline(y=0, linestyle='--', linewidth=2, color=line_color)
        axes[0, 1].set_xlabel('Fitted Values', fontsize=12)
        axes[0, 1].set_ylabel('Residuals', fontsize=12)
        axes[0, 1].set_title('Residuals vs Fitted', fontsize=12, fontweight='bold')
        
        # Plot 3: Q-Q Plot
        sm.qqplot(residuals, line='s', ax=axes[1, 0])
        # Change Q-Q line color to match
        for line in axes[1, 0].get_lines():
            if line.get_linestyle() == '-':
                line.set_color(line_color)
                line.set_linewidth(2)
        axes[1, 0].set_title('Q-Q Plot (Normality Check)', fontsize=12, fontweight='bold')
        axes[1, 0].set_xlabel('Theoretical Quantiles', fontsize=12)
        axes[1, 0].set_ylabel('Sample Quantiles', fontsize=12)
        
        # Plot 4: Scale-Location Plot
        std_resid = self.sm_model.get_influence().resid_studentized_internal
        sqrt_abs_std_resid = np.sqrt(np.abs(std_resid))
        sns.scatterplot(x=self.y_pred_plot, y=sqrt_abs_std_resid, alpha=0.6, color='#5B9BD5', ax=axes[1, 1])
        sns.regplot(x=self.y_pred_plot, y=sqrt_abs_std_resid, 
                    scatter=False, lowess=True, 
                    line_kws={'color': line_color, 'linewidth': 2}, ax=axes[1, 1])
        axes[1, 1].set_xlabel('Fitted Values', fontsize=12)
        axes[1, 1].set_ylabel('√|Standardized Residuals|', fontsize=12)
        axes[1, 1].set_title('Scale-Location Plot', fontsize=12, fontweight='bold')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
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
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()