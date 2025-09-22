

import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
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
    
    def _split_and_scale(self, X_selected, test_size, standardize):
        X_train, X_test, y_train, y_test = train_test_split(X_selected, self.y, test_size=test_size, random_state=42)
        
        if standardize:
            X_train_scaled = pd.DataFrame(self.scaler.fit_transform(X_train), columns=X_train.columns, index=X_train.index)
            X_test_scaled = pd.DataFrame(self.scaler.transform(X_test), columns=X_test.columns, index=X_test.index)
        else:
            X_train_scaled, X_test_scaled = X_train, X_test
            
        return X_train_scaled, X_test_scaled, y_train, y_test

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
            diagnostics = self._basic_diagnostics(X, y_true, y_pred)
        return diagnostics
    
    def _basic_diagnostics(self, X, y_true, y_pred):
        diagnostics = {}
        residuals = y_true - y_pred
        sw_stat, sw_p = stats.shapiro(residuals)
        diagnostics['normality_tests'] = {'shapiro_wilk': {'statistic': sw_stat, 'p_value': sw_p}}
        return diagnostics
    
    def _generate_interpretation(self, train_metrics, test_metrics, stepwise_log):
        train_r2, test_r2 = train_metrics['r2'], test_metrics['r2']
        r2_diff = train_r2 - test_r2
        
        interpretation = ""
        if stepwise_log:
             interpretation += f"Stepwise selection resulted in {len(stepwise_log)} steps.\n"

        if train_r2 > 0.8 and r2_diff < 0.2:
            interpretation += "The model shows a **Good Fit**. Both training and testing R-squared scores are high and close, indicating good generalization."
        elif train_r2 > 0.7 and r2_diff > 0.3:
            interpretation += "**Overfitting Warning**. The model performs significantly better on training data than on test data. This suggests it may not perform well on unseen data. Consider simplifying the model or using regularization."
        elif train_r2 < 0.5 and test_r2 < 0.5:
            interpretation += "**Underfitting Possible**. Both R-squared scores are low, suggesting the model is too simple to capture the data's underlying patterns."
        else:
            interpretation += "The model's performance is moderate. Review metrics and residuals to assess its sufficiency for your needs."

        return interpretation.strip()

    def run(self, model_type, **kwargs):
        features = kwargs.get('features')
        test_size = kwargs.get('test_size', 0.2)
        selection_method = kwargs.get('selectionMethod', 'none')
        predict_x = kwargs.get('predict_x')
        
        X_selected = self.X[self._get_clean_feature_names(features)]
        
        stepwise_log = []
        if HAS_STATSMODELS and selection_method != 'none':
            final_features, stepwise_log = perform_stepwise_selection(X_selected, self.y, method=selection_method)
            if not final_features: raise ValueError("No features were selected by the stepwise method.")
            X_selected = X_selected[final_features]

        X_train, X_test, y_train, y_test = self._split_and_scale(X_selected, test_size, standardize=True)
        
        model = LinearRegression() # Default
        if model_type == 'polynomial':
            degree = kwargs.get('degree', 2)
            poly = PolynomialFeatures(degree=degree, include_bias=False)
            X_train = poly.fit_transform(X_train)
            X_test = poly.transform(X_test)
        
        model.fit(X_train, y_train)

        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)

        train_metrics = self._calculate_metrics(y_train, y_pred_train, X_train.shape[1])
        test_metrics = self._calculate_metrics(y_test, y_pred_test, X_train.shape[1])

        sm_model = None
        if HAS_STATSMODELS:
            X_with_const = sm.add_constant(X_train)
            try:
                sm_model = sm.OLS(y_train, X_with_const).fit()
            except: pass

        diagnostics = self._calculate_diagnostics(X_train, y_train, y_pred_train, sm_model)
        
        results = {
            'metrics': {'train': train_metrics, 'test': test_metrics},
            'diagnostics': diagnostics,
            'stepwise_log': stepwise_log,
            'interpretation': self._generate_interpretation(train_metrics, test_metrics, stepwise_log)
        }
        
        # Plotting uses test data
        self.y_true_plot, self.y_pred_plot = y_test, y_pred_test

        return results

    def plot_results(self, model_name):
        residuals = self.y_true_plot - self.y_pred_plot
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle(f'{model_name.title()} Regression Diagnostics', fontsize=16)
        
        ax = axes[0, 0]
        ax.scatter(self.y_true_plot, self.y_pred_plot, alpha=0.6)
        ax.plot([self.y_true_plot.min(), self.y_true_plot.max()], [self.y_true_plot.min(), self.y_true_plot.max()], 'r--', lw=2)
        ax.set_xlabel('Actual Values'); ax.set_ylabel('Predicted Values')
        ax.set_title(f"Test Set: Actual vs Predicted")
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

