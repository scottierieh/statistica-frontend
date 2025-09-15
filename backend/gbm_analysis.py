import sys
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        features = payload.get('features')
        target = payload.get('target')
        problem_type = payload.get('problemType') # 'regression' or 'classification'
        
        # Hyperparameters
        n_estimators = int(payload.get('nEstimators', 100))
        learning_rate = float(payload.get('learningRate', 0.1))
        max_depth = int(payload.get('maxDepth', 3))

        if not all([data, features, target, problem_type]):
            raise ValueError("Missing data, features, target, or problemType")

        df = pd.DataFrame(data)

        # --- Data Preparation ---
        X = df[features]
        y = df[target]

        # One-hot encode categorical features
        X = pd.get_dummies(X, drop_first=True)
        feature_names = X.columns.tolist()

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if problem_type == 'classification' else None
        )

        # --- Model Training ---
        if problem_type == 'regression':
            model = GradientBoostingRegressor(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=42
            )
        else: # classification
            model = GradientBoostingClassifier(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=42
            )
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        # --- Evaluation ---
        results = {}
        if problem_type == 'regression':
            results['metrics'] = {
                'r2_score': r2_score(y_test, y_pred),
                'mse': mean_squared_error(y_test, y_pred),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred))
            }
        else:
            results['metrics'] = {
                'accuracy': accuracy_score(y_test, y_pred),
                'classification_report': classification_report(y_test, y_pred, output_dict=True, zero_division=0),
                'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
            }
        
        results['feature_importance'] = dict(zip(feature_names, model.feature_importances_))

        # --- Plotting ---
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        
        # Feature Importance Plot
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False).head(15)
        
        sns.barplot(x='importance', y='feature', data=importance_df, ax=axes[0], palette='viridis')
        axes[0].set_title('Feature Importance')

        if problem_type == 'regression':
            # Actual vs Predicted Plot
            sns.scatterplot(x=y_test, y=y_pred, ax=axes[1], alpha=0.6)
            axes[1].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
            axes[1].set_xlabel('Actual Values')
            axes[1].set_ylabel('Predicted Values')
            axes[1].set_title('Actual vs. Predicted')
        else:
            # Confusion Matrix
            cm = confusion_matrix(y_test, y_pred)
            class_names = sorted(y.unique())
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[1], xticklabels=class_names, yticklabels=class_names)
            axes[1].set_xlabel('Predicted')
            axes[1].set_ylabel('Actual')
            axes[1].set_title('Confusion Matrix')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        response = {
            'results': results,
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
