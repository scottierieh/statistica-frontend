
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
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
    from statsmodels.stats.diagnostic import het_breuschpagan
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
        
        self.data[self.target_variable_clean] = pd.to_numeric(self.data[self.target_variable_clean], errors='coerce')
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
             name = re.sub(r'Q\("([^"]+)"\)', r'\\1', name.strip())
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
        
        jb_stat, jb_p, _, _ = jarque_bera(residuals)
        sw_stat, sw_p = stats.shapiro(residuals)
        diagnostics['normality_tests'] = {
            'jarque_bera': {'statistic': jb_stat, 'p_value': jb_p},
            'shapiro_wilk': {'statistic': sw_stat, 'p_value': sw_p}
        }
        
        try:
            bp_stat, bp_p, _, _ = het_breuschpagan(residuals, sm_model.model.exog)
            diagnostics['heteroscedasticity_tests'] = {'breusch_pagan': {'statistic': bp_stat, 'p_value': bp_p}}
        except Exception:
             diagnostics['heteroscedasticity_tests'] = {}
        
        return diagnostics
    
    def _generate_interpretation(self, metrics, stepwise_log):
        r2 = metrics['r2']
        
        interpretation = ""
        if stepwise_log:
             interpretation += f"Stepwise selection resulted in {len(stepwise_log)} steps.\\n"

        if r2 > 0.8:
            interpretation += "The model shows a **Good Fit**. "
        elif r2 > 0.5:
            interpretation += "The model shows a **Moderate Fit**. "
        else:
            interpretation += "**Weak Fit**. "
        
        interpretation += f"It explains {(r2 * 100):.1f}% of the variance in the target variable."

        return interpretation.strip()

    def run(self, model_type, **kwargs):
        if not HAS_STATSMODELS:
            raise ImportError("Statsmodels library is required for this analysis but is not installed in the environment.")

        features = kwargs.get('features')
        selection_method = kwargs.get('selectionMethod', 'none')
        
        X_selected = self.X[self._get_clean_feature_names(features)].dropna()
        y_aligned, X_selected = self.y.align(X_selected, join='inner', axis=0)

        stepwise_log = []
        if selection_method != 'none' and selection_method != 'enter':
            final_features, stepwise_log = perform_stepwise_selection(X_selected, y_aligned, method=selection_method)
            if not final_features: raise ValueError("No features were selected by the stepwise method.")
            X_selected = X_selected[final_features]

        X_final = self._scale_data(X_selected, standardize=True)
        
        if model_type == 'polynomial':
            degree = kwargs.get('degree', 2)
            poly = PolynomialFeatures(degree=degree, include_bias=False)
            X_poly = poly.fit_transform(X_final)
            poly_feature_names = poly.get_feature_names_out(X_final.columns)
            X_final = pd.DataFrame(X_poly, columns=poly_feature_names, index=X_final.index)

        X_with_const = sm.add_constant(X_final)
        sm_model = sm.OLS(y_aligned, X_with_const).fit()
        
        y_pred = sm_model.predict(X_with_const)

        metrics = self._calculate_metrics(y_aligned, y_pred, X_final.shape[1])
        diagnostics = self._calculate_diagnostics(X_final, sm_model)
        
        results = {
            'metrics': {'all_data': metrics},
            'diagnostics': diagnostics,
            'stepwise_log': stepwise_log,
            'interpretation': self._generate_interpretation(metrics, stepwise_log)
        }
        
        self.y_true_plot, self.y_pred_plot = y_aligned, y_pred
        self.sm_model = sm_model

        return results

    def plot_results(self, model_name):
        residuals = self.sm_model.resid
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle(f'{model_name.title()} Regression Diagnostics', fontsize=16)
        
        ax = axes[0, 0]
        ax.scatter(self.y_true_plot, self.y_pred_plot, alpha=0.6)
        ax.plot([self.y_true_plot.min(), self.y_true_plot.max()], [self.y_true_plot.min(), self.y_true_plot.max()], 'r--', lw=2)
        ax.set_xlabel('Actual Values'); ax.set_ylabel('Predicted Values')
        ax.set_title(f"Actual vs Predicted (R² = {self.sm_model.rsquared:.4f})")
        ax.grid(True, alpha=0.3)
        
        ax = axes[0, 1]
        ax.scatter(self.y_pred_plot, residuals, alpha=0.6)
        ax.axhline(y=0, color='red', linestyle='--'); ax.set_xlabel('Fitted Values'); ax.set_ylabel('Residuals')
        ax.set_title('Residuals vs Fitted'); ax.grid(True, alpha=0.3)
        
        ax = axes[1, 0]; sm.qqplot(residuals, line='s', ax=ax)
        ax.set_title('Q-Q Plot (Normality Check)'); ax.grid(True, alpha=0.3)
        
        ax = axes[1, 1]
        std_resid = self.sm_model.get_influence().resid_studentized_internal
        sqrt_abs_std_resid = np.sqrt(np.abs(std_resid))
        ax.scatter(self.y_pred_plot, sqrt_abs_std_resid, alpha=0.6)
        sns.regplot(x=self.y_pred_plot, y=sqrt_abs_std_resid, scatter=False, lowess=True, line_kws={'color': 'red', 'lw': 2}, ax=ax)
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
        
        if not HAS_STATSMODELS:
             raise ImportError("Statsmodels library is required for this analysis but is not installed in the environment.")

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
