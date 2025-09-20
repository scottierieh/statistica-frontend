

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
    def __init__(self, data, dependent_var, independent_vars, test_size=0.3, random_state=42):
        self.data = data.copy()
        self.dependent_var = dependent_var
        self.independent_vars = independent_vars
        self.test_size = test_size
        self.random_state = random_state
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        all_vars = [self.dependent_var] + self.independent_vars
        self.clean_data = self.data[all_vars].dropna()
        
        self.le = LabelEncoder()
        y_encoded = self.le.fit_transform(self.clean_data[self.dependent_var])
        self.dependent_classes = self.le.classes_.tolist()
        if len(self.dependent_classes) != 2:
            raise ValueError(f"Dependent variable must have exactly 2 unique categories, but found {len(self.dependent_classes)}.")
        
        self.clean_data[self.dependent_var + '_encoded'] = y_encoded
        
        X_raw = self.clean_data[self.independent_vars]
        self.X = pd.get_dummies(X_raw, drop_first=True, dtype=float)
        self.feature_names = self.X.columns.tolist()
        
        # Ensure y is a 1D array
        self.y = self.clean_data[self.dependent_var + '_encoded'].values.ravel()
        
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(self.X, self.y, test_size=self.test_size, random_state=self.random_state, stratify=self.y)

        self.scaler = StandardScaler()
        self.X_train_scaled = self.scaler.fit_transform(self.X_train)
        self.X_test_scaled = self.scaler.transform(self.X_test)
        
        # Add VIF check here
        self._check_multicollinearity()


    def _check_multicollinearity(self):
        if self.X_train.shape[1] < 2:
            return # VIF not applicable for single feature
        
        # Create a dataframe from scaled training data to calculate VIF
        X_train_df_scaled = pd.DataFrame(self.X_train_scaled, columns=self.feature_names)
        X_train_df_scaled_const = sm.add_constant(X_train_df_scaled, prepend=False)
        
        vif_data = [variance_inflation_factor(X_train_df_scaled_const.values, i) for i in range(X_train_df_scaled_const.shape[1] - 1)]
        vif_df = pd.DataFrame({'vif': vif_data}, index=self.feature_names)
        
        high_vif = vif_df[vif_df['vif'] > 10]
        if not high_vif.empty:
            offending_vars = ", ".join(high_vif.index.tolist())
            raise ValueError(f"High multicollinearity detected (VIF > 10) for variables: {offending_vars}. Please remove one or more of these variables to proceed.")

    def run_analysis(self):
        X_train_const = sm.add_constant(self.X_train_scaled)
        X_test_const = sm.add_constant(self.X_test_scaled)
        
        logit_model = sm.Logit(self.y_train.ravel(), X_train_const)
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
        
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        roc_auc = auc(fpr, tpr)
        
        self.results['roc_data'] = {'fpr': fpr.tolist(), 'tpr': tpr.tolist(), 'auc': roc_auc}
        self.results['dependent_classes'] = self.dependent_classes
        
        # Add model summary stats
        self.results['model_summary'] = {
            'llf': self.model_fit.llf,
            'llnull': self.model_fit.llnull,
            'llr': self.model_fit.llr,
            'llr_pvalue': self.model_fit.llr_pvalue,
            'prsquared': self.model_fit.prsquared,
            'df_model': self.model_fit.df_model,
            'df_resid': self.model_fit.df_resid
        }
    
    def _generate_interpretation(self):
        res = self.results
        summary = res['model_summary']
        
        chi2 = summary['llr']
        df = summary['df_model']
        p_val = summary['llr_pvalue']
        pseudo_r2 = summary['prsquared']
        accuracy = res['metrics']['accuracy']
        
        # Sentence 1: Purpose
        interpretation = f"A logistic regression was performed to ascertain the effects of {len(self.independent_vars)} predictors on the likelihood that respondents would be classified as one group or another in '{self.dependent_var}'.\n\n"

        # Sentence 2: Model Significance
        model_sig_text = "statistically significant" if p_val < 0.05 else "not statistically significant"
        p_val_text = f"p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
        interpretation += f"The logistic regression model was {model_sig_text}, χ²({df:.0f}, N = {len(self.clean_data)}) = {chi2:.3f}, {p_val_text}. "
        
        # Sentence 3: Model Fit
        interpretation += f"The model explained {pseudo_r2*100:.1f}% (Pseudo R²) of the variance in {self.dependent_var} and correctly classified {accuracy*100:.1f}% of cases.\n\n"
        
        # Sentence 4: Individual Predictors
        odds_ratios = res['odds_ratios']
        p_values = self.model_fit.pvalues[1:] # Exclude const
        
        sig_preds = []
        for var, p in p_values.items():
            if p < 0.05:
                odds = odds_ratios.get(var)
                if odds is not None:
                     change_text = f"{odds:.2f} times as likely" if odds > 1 else f"{(1-odds)*100:.1f}% less likely"
                     sig_preds.append(f"'{var.replace('_', ' ')}' was associated with a {change_text} to be in the target group")

        if sig_preds:
            interpretation += "Of the predictor variables, " + ", and ".join(sig_preds) + "."

        self.results['interpretation'] = interpretation.strip()

    def plot_results(self):
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        
        # ROC Curve
        roc = self.results['roc_data']
        axes[0].plot(roc['fpr'], roc['tpr'], color='darkorange', lw=2, label=f'ROC curve (area = {roc["auc"]:.2f})')
        axes[0].plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
        axes[0].set_xlim([0.0, 1.0])
        axes[0].set_ylim([0.0, 1.05])
        axes[0].set_xlabel('False Positive Rate')
        axes[0].set_ylabel('True Positive Rate')
        axes[0].set_title('Receiver Operating Characteristic (ROC) Curve')
        axes[0].legend(loc="lower right")
        axes[0].grid(True, alpha=0.3)

        # Confusion Matrix Heatmap
        cm = np.array(self.results['metrics']['confusion_matrix'])
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[1], 
                    xticklabels=self.dependent_classes, yticklabels=self.dependent_classes)
        axes[1].set_xlabel('Predicted Label')
        axes[1].set_ylabel('True Label')
        axes[1].set_title('Confusion Matrix')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        dependent_var = payload.get('dependentVar')
        independent_vars = payload.get('independentVars')

        if not all([not data.empty, dependent_var, independent_vars]):
            raise ValueError("Missing data, dependentVar, or independentVars")

        analysis = LogisticRegressionAnalysis(data, dependent_var, independent_vars)
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



