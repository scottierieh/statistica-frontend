
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report, roc_curve, auc
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

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
        
        # Encode dependent variable to 0/1
        self.le = LabelEncoder()
        y_encoded = self.le.fit_transform(self.clean_data[self.dependent_var])
        self.dependent_classes = self.le.classes_.tolist()
        if len(self.dependent_classes) != 2:
            raise ValueError(f"Dependent variable must have exactly 2 unique categories, but found {len(self.dependent_classes)}.")
        
        self.clean_data[self.dependent_var + '_encoded'] = y_encoded
        
        # One-hot encode categorical independent variables
        X_raw = self.clean_data[self.independent_vars]
        self.X = pd.get_dummies(X_raw, drop_first=True)
        self.feature_names = self.X.columns.tolist()
        
        self.y = self.clean_data[self.dependent_var + '_encoded']

    def run_analysis(self):
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(self.X, self.y, test_size=self.test_size, random_state=self.random_state, stratify=self.y)

        # Scale data
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Train model
        self.model = LogisticRegression(random_state=self.random_state)
        self.model.fit(X_train_scaled, y_train)

        # Predictions
        y_pred = self.model.predict(X_test_scaled)
        y_prob = self.model.predict_proba(X_test_scaled)[:, 1]
        
        self._calculate_metrics(y_test, y_pred, y_prob)

    def _calculate_metrics(self, y_true, y_pred, y_prob):
        accuracy = accuracy_score(y_true, y_pred)
        cm = confusion_matrix(y_true, y_pred)
        class_report = classification_report(y_true, y_pred, target_names=self.dependent_classes, output_dict=True, zero_division=0)
        
        coefficients = self.model.coef_[0]
        odds_ratios = np.exp(coefficients)

        self.results['metrics'] = {
            'accuracy': accuracy,
            'confusion_matrix': cm.tolist(),
            'classification_report': class_report
        }
        self.results['coefficients'] = dict(zip(self.feature_names, coefficients))
        self.results['odds_ratios'] = dict(zip(self.feature_names, odds_ratios))
        
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        roc_auc = auc(fpr, tpr)
        
        self.results['roc_data'] = {'fpr': fpr.tolist(), 'tpr': tpr.tolist(), 'auc': roc_auc}
        self.results['dependent_classes'] = self.dependent_classes
    
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
