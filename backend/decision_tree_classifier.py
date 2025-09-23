
import sys
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import matplotlib.pyplot as plt
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
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target = payload.get('target')
        features = payload.get('features')
        random_state = int(payload.get('random_state', 42))

        if not all([data, target, features]):
            raise ValueError("Missing required parameters: data, target, or features")

        df = pd.DataFrame(data)

        # --- Data Preparation ---
        X = pd.get_dummies(df[features], drop_first=True)
        
        for col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce')
        
        le = LabelEncoder()
        y = le.fit_transform(df[target])
        class_names = le.classes_.tolist()

        combined = pd.concat([X, pd.Series(y, name='target')], axis=1).dropna()
        X_clean = combined.drop('target', axis=1)
        y_clean = combined['target']
        
        if X_clean.empty or y_clean.empty:
            raise ValueError("Not enough valid data after cleaning categorical features.")

        X_train, X_test, y_train, y_test = train_test_split(X_clean, y_clean, test_size=0.3, random_state=random_state)
        
        # --- Model Training ---
        clf = DecisionTreeClassifier(random_state=random_state)
        clf.fit(X_train, y_train)
        
        # --- Evaluation ---
        y_pred = clf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        # --- Decision Tree Plotting ---
        plt.figure(figsize=(20, 15))
        plot_tree(clf, 
                  feature_names=X_clean.columns.tolist(),
                  class_names=class_names,
                  filled=True, 
                  rounded=True,
                  fontsize=10)
        plt.title("Decision Tree", fontsize=24)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close()
        buf.seek(0)
        tree_plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Accuracy vs Alpha Plot ---
        path = clf.cost_complexity_pruning_path(X_train, y_train)
        ccp_alphas = path.ccp_alphas

        clfs = []
        for ccp_alpha in ccp_alphas:
            pruned_clf = DecisionTreeClassifier(random_state=random_state, ccp_alpha=ccp_alpha)
            pruned_clf.fit(X_train, y_train)
            clfs.append(pruned_clf)
        
        # We remove the last classifier because it's a trivial tree with only one node.
        clfs = clfs[:-1]
        ccp_alphas = ccp_alphas[:-1]

        train_scores = [clf.score(X_train, y_train) for clf in clfs]
        test_scores = [clf.score(X_test, y_test) for clf in clfs]

        fig, ax = plt.subplots(figsize=(10, 6))
        ax.set_xlabel("Effective Alpha")
        ax.set_ylabel("Accuracy")
        ax.set_title("Accuracy vs Effective Alpha for Training and Testing Sets")
        ax.plot(ccp_alphas, train_scores, marker="o", label="train", drawstyle="steps-post")
        ax.plot(ccp_alphas, test_scores, marker="o", label="test", drawstyle="steps-post")
        ax.legend()
        ax.grid(True)
        
        pruning_buf = io.BytesIO()
        plt.savefig(pruning_buf, format='png', bbox_inches='tight')
        plt.close(fig)
        pruning_buf.seek(0)
        pruning_plot_image = base64.b64encode(pruning_buf.read()).decode('utf-8')
        
        response = {
            'results': {
                'accuracy': accuracy,
                'confusion_matrix': cm,
                'class_names': class_names,
            },
            'plot': f"data:image/png;base64,{tree_plot_image}",
            'pruning_plot': f"data:image/png;base64,{pruning_plot_image}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
