import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report, roc_curve, auc
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    return obj

class LogisticRegressionAnalysis:
    def __init__(self, data, dependent_var, independent_vars, test_size=0.3, random_state=42, standardize=False):
        self.data = data.copy()
        self.dependent_var = dependent_var
        self.independent_vars = independent_vars
        self.test_size = test_size
        self.random_state = random_state
        self.standardize = standardize
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        # Track original indices before any operations
        original_length = len(self.data)
        self.data['__original_index__'] = range(original_length)
        
        all_vars = [self.dependent_var] + self.independent_vars + ['__original_index__']
        self.data_subset = self.data[all_vars].copy()
        
        # Track missing data
        vars_to_check = [self.dependent_var] + self.independent_vars
        missing_mask = self.data_subset[vars_to_check].isnull().any(axis=1)
        dropped_indices = self.data_subset.loc[missing_mask, '__original_index__'].tolist()
        
        # Drop missing values
        self.clean_data = self.data_subset.dropna(subset=vars_to_check)
        
        # Store dropped row information
        self.n_dropped = len(dropped_indices)
        self.dropped_rows = sorted(dropped_indices)
        
        # Remove tracking column
        self.clean_data = self.clean_data.drop(columns=['__original_index__'])
        
        if len(self.clean_data) < 10:
            raise ValueError(f"Not enough valid data points for analysis after removing missing values. Need at least 10, but only {len(self.clean_data)} remain.")
        
        self.le = LabelEncoder()
        y_encoded = self.le.fit_transform(self.clean_data[self.dependent_var])
        self.dependent_classes = self.le.classes_.tolist()
        if len(self.dependent_classes) != 2:
            raise ValueError(f"Dependent variable must have exactly 2 unique categories, but found {len(self.dependent_classes)}.")
        
        # Store encoded y as a 1D array
        self.y = np.asarray(y_encoded).ravel()
        
        # Debug print
        print(f"DEBUG: self.y shape after encoding: {self.y.shape}", file=sys.stderr)
        print(f"DEBUG: self.y dtype: {self.y.dtype}", file=sys.stderr)
        
        # Prepare X with dummy variables
        X_raw = self.clean_data[self.independent_vars]
        X_dummies = pd.get_dummies(X_raw, drop_first=True, dtype=float)
        self.feature_names = X_dummies.columns.tolist()
        
        # Convert to numpy array to ensure proper shape handling
        self.X = X_dummies.values
        
        # Debug print
        print(f"DEBUG: self.X shape: {self.X.shape}", file=sys.stderr)
        
        # Split data - both X and y are numpy arrays now
        self.X_train, self.X_test, y_train_raw, y_test_raw = train_test_split(
            self.X, self.y, test_size=self.test_size, random_state=self.random_state, stratify=self.y
        )
        
        # Ensure y_train and y_test are 1D arrays
        self.y_train = np.asarray(y_train_raw).ravel()
        self.y_test = np.asarray(y_test_raw).ravel()
        
        # Debug print
        print(f"DEBUG: y_train shape after split: {self.y_train.shape}", file=sys.stderr)
        print(f"DEBUG: y_test shape after split: {self.y_test.shape}", file=sys.stderr)

        self.scaler = StandardScaler()
        self.X_train_scaled = self.scaler.fit_transform(self.X_train)
        self.X_test_scaled = self.scaler.transform(self.X_test)
        
        self._check_multicollinearity()

    def _check_multicollinearity(self):
        if self.X_train.shape[1] < 2:
            return 
        
        # Use standardized or original data based on user preference
        X_train_data = self.X_train_scaled if self.standardize else self.X_train
        X_train_df = pd.DataFrame(X_train_data, columns=self.feature_names)
        X_with_const = sm.add_constant(X_train_df, has_constant='add')
        
        vif_data = pd.DataFrame()
        vif_data["feature"] = X_with_const.columns
        try:
            vif_data["VIF"] = [variance_inflation_factor(X_with_const.values, i) for i in range(X_with_const.shape[1])]
        except Exception as e:
            if "Singular matrix" in str(e):
                corr_matrix = X_with_const.corr()
                upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                to_drop = [column for column in upper_tri.columns if any(upper_tri[column].abs() > 0.999)]
                raise ValueError(f"Perfect multicollinearity detected. Please remove one of these highly correlated variables: {', '.join(to_drop)}")
            raise ValueError(f"Multicollinearity check failed. Original error: {e}")

        high_vif = vif_data[vif_data['VIF'] > 10]
        if not high_vif.empty:
            offending_vars = ", ".join(high_vif[high_vif['feature'] != 'const']['feature'].tolist())
            raise ValueError(f"High multicollinearity detected (VIF > 10) for variables: {offending_vars}. Please remove one or more of these variables to proceed.")

    def run_analysis(self):
        # Use standardized or original data based on user preference
        X_train_data = self.X_train_scaled if self.standardize else self.X_train
        X_test_data = self.X_test_scaled if self.standardize else self.X_test
        
        X_train_const = sm.add_constant(X_train_data)
        X_test_const = sm.add_constant(X_test_data)
        
        # Debug: Check shapes
        print(f"DEBUG: y_train shape: {self.y_train.shape}", file=sys.stderr)
        print(f"DEBUG: y_train dtype: {self.y_train.dtype}", file=sys.stderr)
        print(f"DEBUG: y_train ndim: {self.y_train.ndim}", file=sys.stderr)
        print(f"DEBUG: X_train_const shape: {X_train_const.shape}", file=sys.stderr)
        
        # y_train and y_test are already 1D arrays
        logit_model = sm.Logit(self.y_train, X_train_const)
        self.model_fit = logit_model.fit(disp=0)

        y_prob = self.model_fit.predict(X_test_const)
        y_pred = (y_prob > 0.5).astype(int)
        
        self._calculate_metrics(self.y_test, y_pred, y_prob)
        self._generate_interpretation()

    def _calculate_metrics(self, y_true, y_pred, y_prob):
        accuracy = accuracy_score(y_true, y_pred)
        cm = confusion_matrix(y_true, y_pred)
        class_report = classification_report(y_true, y_pred, target_names=self.dependent_classes, output_dict=True, zero_division=0)
        
        params = self.model_fit.params
        conf = self.model_fit.conf_int()
        conf['Odds Ratio'] = params
        conf.columns = ['2.5%', '97.5%', 'Odds Ratio']
        conf = np.exp(conf)

        self.results['metrics'] = {
            'accuracy': accuracy,
            'confusion_matrix': cm.tolist(),
            'classification_report': class_report
        }
        self.results['coefficients'] = dict(zip(['const'] + self.feature_names, self.model_fit.params))
        self.results['odds_ratios'] = dict(zip(['const'] + self.feature_names, conf['Odds Ratio']))
        self.results['odds_ratios_ci'] = {
            var: {'2.5%': conf.loc[var, '2.5%'], '97.5%': conf.loc[var, '97.5%']}
            for var in ['const'] + self.feature_names
        }
        self.results['p_values'] = dict(zip(['const'] + self.feature_names, self.model_fit.pvalues))
        
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        roc_auc = auc(fpr, tpr)
        
        self.results['roc_data'] = {'fpr': fpr.tolist(), 'tpr': tpr.tolist(), 'auc': roc_auc}
        self.results['dependent_classes'] = self.dependent_classes
        
        self.results['model_summary'] = {
            'llf': self.model_fit.llf,
            'llnull': self.model_fit.llnull,
            'llr': self.model_fit.llr,
            'llr_pvalue': self.model_fit.llr_pvalue,
            'prsquared': self.model_fit.prsquared,
            'df_model': self.model_fit.df_model,
            'df_resid': self.model_fit.df_resid
        }
        
        # Add missing data info
        self.results['n_dropped'] = self.n_dropped
        self.results['dropped_rows'] = self.dropped_rows
    
    def _generate_interpretation(self):
        res = self.results
        summary = res['model_summary']
        
        chi2 = summary['llr']
        df = summary['df_model']
        p_val = summary['llr_pvalue']
        pseudo_r2 = summary['prsquared']
        accuracy = res['metrics']['accuracy']
        
        interpretation = f"A logistic regression was performed to ascertain the effects of {len(self.independent_vars)} predictors on the likelihood that respondents would be classified as one group or another in '{self.dependent_var}'.\n\n"

        model_sig_text = "statistically significant" if p_val < 0.05 else "not statistically significant"
        p_val_text = f"p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
        interpretation += f"The logistic regression model was {model_sig_text}, χ²({df:.0f}, N = {len(self.clean_data)}) = {chi2:.3f}, {p_val_text}. "
        
        interpretation += f"The model explained {pseudo_r2*100:.1f}% (Pseudo R²) of the variance in {self.dependent_var} and correctly classified {accuracy*100:.1f}% of cases.\n\n"
        
        odds_ratios = res['odds_ratios']
        p_values = self.model_fit.pvalues
        
        sig_preds = []
        for var in self.feature_names:
            p = p_values.get(var)
            if p is not None and p < 0.05:
                odds = odds_ratios.get(var)
                if odds is not None:
                     change_text = f"{odds:.2f} times as likely" if odds > 1 else f"{(1-odds)*100:.1f}% less likely"
                     sig_preds.append(f"'{var.replace('_', ' ')}' was associated with a {change_text} to be in the target group")

        if sig_preds:
            interpretation += "Of the predictor variables, " + ", and ".join(sig_preds) + "."

        self.results['interpretation'] = interpretation.strip()

    def plot_results(self):
        # 깔끔한 스타일 설정
        plt.style.use('seaborn-v0_8-whitegrid')
        
        fig, axes = plt.subplots(1, 2, figsize=(14, 6), dpi=100)
        
        # ROC Curve - 깔끔한 스타일
        roc = self.results['roc_data']
        axes[0].plot(roc['fpr'], roc['tpr'], 'r-', linewidth=2.5, 
                     label=f'ROC Curve (AUC = {roc["auc"]:.3f})')
        axes[0].plot([0, 1], [0, 1], 'k--', linewidth=2, alpha=0.4, label='Random Classifier')
        
        axes[0].set_xlim([0.0, 1.0])
        axes[0].set_ylim([0.0, 1.05])
        axes[0].set_xlabel('False Positive Rate', fontsize=12, fontweight='bold')
        axes[0].set_ylabel('True Positive Rate', fontsize=12, fontweight='bold')
        axes[0].set_title('ROC Curve', fontsize=14, fontweight='bold', pad=15)
        axes[0].legend(loc="lower right", fontsize=10, frameon=True, shadow=True)
        axes[0].grid(True, alpha=0.3, linestyle='-', linewidth=0.5)
        axes[0].set_facecolor('white')
        
        # Confusion Matrix - 깔끔한 스타일
        cm = np.array(self.results['metrics']['confusion_matrix'])
        
        # Confusion Matrix를 직접 그리기 (더 깔끔한 스타일)
        im = axes[1].imshow(cm, interpolation='nearest', cmap='Blues')
        axes[1].figure.colorbar(im, ax=axes[1], fraction=0.046, pad=0.04)
        
        # 축 설정
        axes[1].set(xticks=np.arange(cm.shape[1]),
                    yticks=np.arange(cm.shape[0]),
                    xticklabels=self.dependent_classes,
                    yticklabels=self.dependent_classes,
                    ylabel='True Label',
                    xlabel='Predicted Label')
        
        axes[1].set_xlabel('Predicted Label', fontsize=12, fontweight='bold')
        axes[1].set_ylabel('True Label', fontsize=12, fontweight='bold')
        axes[1].set_title('Confusion Matrix', fontsize=14, fontweight='bold', pad=15)
        
        # 라벨 회전
        plt.setp(axes[1].get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
        
        # 텍스트 주석 추가
        thresh = cm.max() / 2.
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                axes[1].text(j, i, format(cm[i, j], 'd'),
                           ha="center", va="center",
                           color="white" if cm[i, j] > thresh else "black",
                           fontsize=14, fontweight='bold')
        
        axes[1].set_facecolor('white')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        dependent_var = payload.get('dependentVar')
        independent_vars = payload.get('independentVars')
        standardize = payload.get('standardize', False)  # 기본값: False

        if not all([not data.empty, dependent_var, independent_vars]):
            raise ValueError("Missing data, dependentVar, or independentVars")

        analysis = LogisticRegressionAnalysis(data, dependent_var, independent_vars, standardize=standardize)
        analysis.run_analysis()
        
        plot_image = analysis.plot_results()

        response = {
            'results': analysis.results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    