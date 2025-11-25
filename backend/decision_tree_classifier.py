import sys
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

sns.set_style("darkgrid")

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


def _generate_interpretation(results, target, features, class_names):
    """Generate detailed interpretation for Decision Tree results in APA format."""
    
    interpretation_parts = []
    
    accuracy = results['accuracy']
    train_accuracy = results.get('train_accuracy', accuracy)
    test_accuracy = results.get('test_accuracy', accuracy)
    tree_depth = results.get('tree_depth', 0)
    n_leaves = results.get('n_leaves', 0)
    n_features = results.get('n_features', len(features))
    n_samples = results.get('n_samples', 0)
    cm = results.get('confusion_matrix', [])
    
    overfit_gap = train_accuracy - test_accuracy
    is_overfit = overfit_gap > 0.1
    
    # --- Overall Assessment ---
    interpretation_parts.append("**Overall Assessment**")
    
    interpretation_parts.append(
        f"→ A Decision Tree Classifier was trained to predict **{target}** using {n_features} feature(s) "
        f"across {len(class_names)} classes (N = {n_samples})."
    )
    
    if accuracy >= 0.9:
        perf_desc = "excellent"
        interpretation_parts.append(
            f"→ The model achieved **{accuracy*100:.1f}%** test accuracy, indicating {perf_desc} predictive performance."
        )
    elif accuracy >= 0.8:
        perf_desc = "good"
        interpretation_parts.append(
            f"→ The model achieved **{accuracy*100:.1f}%** test accuracy, indicating {perf_desc} predictive performance."
        )
    elif accuracy >= 0.7:
        perf_desc = "fair"
        interpretation_parts.append(
            f"→ The model achieved **{accuracy*100:.1f}%** test accuracy, indicating {perf_desc} predictive performance with room for improvement."
        )
    else:
        perf_desc = "poor"
        interpretation_parts.append(
            f"→ The model achieved **{accuracy*100:.1f}%** test accuracy, indicating {perf_desc} predictive performance that requires attention."
        )
    
    interpretation_parts.append(
        f"→ Tree structure: depth = {tree_depth}, leaf nodes = {n_leaves}, providing "
        f"{'highly interpretable' if tree_depth <= 5 else 'moderately complex' if tree_depth <= 10 else 'complex'} decision rules."
    )
    
    if is_overfit:
        interpretation_parts.append(
            f"→ **Warning**: Signs of overfitting detected. Training accuracy ({train_accuracy*100:.1f}%) "
            f"exceeds test accuracy ({test_accuracy*100:.1f}%) by {overfit_gap*100:.1f}%."
        )
    else:
        interpretation_parts.append(
            f"→ Model generalization is good with training ({train_accuracy*100:.1f}%) and test ({test_accuracy*100:.1f}%) "
            f"accuracy difference of only {overfit_gap*100:.1f}%."
        )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Accuracy interpretation
    interpretation_parts.append(
        f"→ **Test Accuracy**: {accuracy*100:.1f}% of unseen cases were correctly classified, "
        f"{'exceeding' if accuracy >= 0.8 else 'approaching' if accuracy >= 0.7 else 'below'} the typical 80% threshold for reliable predictions."
    )
    
    # Overfitting analysis
    if overfit_gap > 0.15:
        interpretation_parts.append(
            f"→ **Overfitting Alert**: Large train-test gap ({overfit_gap*100:.1f}%) indicates the model memorized training patterns "
            f"rather than learning generalizable rules."
        )
    elif overfit_gap > 0.1:
        interpretation_parts.append(
            f"→ **Moderate Overfitting**: Train-test gap of {overfit_gap*100:.1f}% suggests some overfitting; "
            f"pruning may improve generalization."
        )
    elif overfit_gap > 0.05:
        interpretation_parts.append(
            f"→ **Good Generalization**: Small train-test gap ({overfit_gap*100:.1f}%) indicates balanced model complexity."
        )
    else:
        interpretation_parts.append(
            f"→ **Excellent Generalization**: Minimal train-test gap ({overfit_gap*100:.1f}%) shows robust learning."
        )
    
    # Tree complexity
    if tree_depth > 15:
        interpretation_parts.append(
            f"→ **Tree Complexity**: Very deep tree (depth={tree_depth}) creates highly specific rules prone to overfitting."
        )
    elif tree_depth > 10:
        interpretation_parts.append(
            f"→ **Tree Complexity**: Moderate depth ({tree_depth}) balances specificity with some interpretability."
        )
    elif tree_depth > 5:
        interpretation_parts.append(
            f"→ **Tree Complexity**: Reasonable depth ({tree_depth}) provides good interpretability while capturing patterns."
        )
    else:
        interpretation_parts.append(
            f"→ **Tree Complexity**: Shallow tree (depth={tree_depth}) is highly interpretable but may miss complex patterns."
        )
    
    # Confusion matrix insights
    if cm and len(cm) > 0:
        total = sum(sum(row) for row in cm)
        correct = sum(cm[i][i] for i in range(len(cm)))
        
        # Find most confused pair
        max_confusion = 0
        confused_pair = None
        for i in range(len(cm)):
            for j in range(len(cm)):
                if i != j and cm[i][j] > max_confusion:
                    max_confusion = cm[i][j]
                    confused_pair = (class_names[i], class_names[j])
        
        if confused_pair and max_confusion > 0:
            interpretation_parts.append(
                f"→ **Class Confusion**: Most common error is misclassifying '{confused_pair[0]}' as '{confused_pair[1]}' "
                f"({max_confusion} cases), suggesting feature overlap between these classes."
            )
        
        # Per-class performance
        class_accuracies = []
        for i in range(len(cm)):
            row_total = sum(cm[i])
            if row_total > 0:
                class_accuracies.append((class_names[i], cm[i][i] / row_total))
        
        if class_accuracies:
            worst = min(class_accuracies, key=lambda x: x[1])
            best = max(class_accuracies, key=lambda x: x[1])
            if worst[1] < 0.7:
                interpretation_parts.append(
                    f"→ **Class Performance**: '{worst[0]}' has lowest accuracy ({worst[1]*100:.1f}%), "
                    f"while '{best[0]}' performs best ({best[1]*100:.1f}%)."
                )
    
    # Feature count
    if n_features < 3:
        interpretation_parts.append(
            f"→ **Feature Set**: Only {n_features} feature(s) used; adding more discriminating variables may improve accuracy."
        )
    elif n_features > 20:
        interpretation_parts.append(
            f"→ **Feature Set**: {n_features} features may include redundant variables; consider feature selection."
        )
    else:
        interpretation_parts.append(
            f"→ **Feature Set**: {n_features} features provide reasonable predictive capacity."
        )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if accuracy < 0.7:
        interpretation_parts.append(
            "→ Low accuracy suggests: (1) collect more training data, (2) engineer better features, "
            "(3) check for label noise, (4) try ensemble methods like Random Forest."
        )
    elif is_overfit:
        interpretation_parts.append(
            "→ To reduce overfitting: (1) use cost-complexity pruning (see alpha plot), "
            "(2) set max_depth constraint (try 8-12), (3) increase min_samples_split/leaf, (4) try Random Forest."
        )
    elif accuracy >= 0.9:
        interpretation_parts.append(
            "→ Excellent performance! Validate on new data, interpret decision rules for domain sense, "
            "and consider ensemble methods for stability."
        )
    else:
        interpretation_parts.append(
            "→ Good performance. Consider: (1) pruning optimization via alpha plot, "
            "(2) feature engineering, (3) ensemble methods for potential improvement."
        )
    
    if tree_depth > 10:
        interpretation_parts.append(
            "→ Deep tree detected. Use the pruning plot to find optimal alpha that maximizes test accuracy."
        )
    
    interpretation_parts.append(
        "→ Examine the tree visualization to understand decision rules and validate they align with domain knowledge."
    )
    
    interpretation_parts.append(
        "→ For production use, consider Random Forest or Gradient Boosting for improved robustness and accuracy."
    )
    
    return "\n".join(interpretation_parts)


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
        y_train_pred = clf.predict(X_train)
        
        test_accuracy = accuracy_score(y_test, y_pred)
        train_accuracy = accuracy_score(y_train, y_train_pred)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        # --- Tree Statistics ---
        tree_depth = int(clf.tree_.max_depth)
        n_leaves = int(clf.tree_.n_leaves)
        n_features = int(X_clean.shape[1])
        n_samples = int(len(X_clean))
        
        # --- Build results dict ---
        results = {
            'accuracy': test_accuracy,
            'train_accuracy': train_accuracy,
            'test_accuracy': test_accuracy,
            'confusion_matrix': cm,
            'class_names': class_names,
            'tree_depth': tree_depth,
            'n_leaves': n_leaves,
            'n_features': n_features,
            'n_samples': n_samples,
        }
        
        # --- Generate Interpretation ---
        interpretation = _generate_interpretation(
            results=results,
            target=target,
            features=features,
            class_names=class_names
        )
        results['interpretation'] = interpretation
        
        # --- Decision Tree Plotting ---
        plt.figure(figsize=(20, 15))
        plot_tree(clf, 
                  feature_names=X_clean.columns.tolist(),
                  class_names=class_names,
                  filled=True, 
                  rounded=True,
                  fontsize=10)
        
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
            'results': results,
            'plot': f"data:image/png;base64,{tree_plot_image}",
            'pruning_plot': f"data:image/png;base64,{pruning_plot_image}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()


    