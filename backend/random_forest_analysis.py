import sys
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_curve, auc
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj


def _generate_interpretation(results, target, features, n_estimators, max_depth, n_samples, class_names):
    """Generate detailed interpretation for Random Forest results in APA format."""
    
    interpretation_parts = []
    accuracy = results.get('accuracy', 0)
    roc_auc_data = results.get('roc_auc_data', {})
    classification_rep = results.get('classification_report', {})
    feature_importance = results.get('feature_importance', {})
    cm = results.get('confusion_matrix', [])
    
    # --- Overall Assessment ---
    interpretation_parts.append("**Overall Assessment**")
    
    interpretation_parts.append(
        f"→ A Random Forest Classifier with {n_estimators} trees was trained to predict "
        f"**{target}** using {len(features)} feature(s) (N = {n_samples})."
    )
    
    if max_depth:
        interpretation_parts.append(f"→ Tree complexity constrained to maximum depth of {max_depth} levels.")
    else:
        interpretation_parts.append("→ Trees grown to full depth (no max_depth constraint).")
    
    # Performance classification
    if accuracy >= 0.9:
        perf_desc = "excellent"
    elif accuracy >= 0.8:
        perf_desc = "good"
    elif accuracy >= 0.7:
        perf_desc = "fair"
    else:
        perf_desc = "limited"
    
    interpretation_parts.append(
        f"→ Overall classification accuracy: **{accuracy*100:.1f}%** ({perf_desc} performance)."
    )
    
    # ROC AUC interpretation
    if roc_auc_data and 'auc' in roc_auc_data:
        auc_score = roc_auc_data['auc']
        if auc_score >= 0.9:
            auc_desc = "excellent discrimination"
        elif auc_score >= 0.8:
            auc_desc = "good discrimination"
        elif auc_score >= 0.7:
            auc_desc = "acceptable discrimination"
        else:
            auc_desc = "poor discrimination"
        
        interpretation_parts.append(
            f"→ ROC AUC = **{auc_score:.3f}**, indicating {auc_desc} between classes."
        )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Feature importance analysis
    if feature_importance:
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        top_features = sorted_features[:3]
        
        interpretation_parts.append("→ **Most influential features** (by Gini importance):")
        for feat, imp in top_features:
            interpretation_parts.append(f"  • {feat}: {imp*100:.1f}% importance")
        
        # Feature concentration
        top3_importance = sum(imp for _, imp in top_features)
        if top3_importance > 0.6:
            interpretation_parts.append(
                f"→ Top 3 features account for {top3_importance*100:.1f}% of total importance - "
                f"strong predictive concentration."
            )
        else:
            interpretation_parts.append(
                f"→ Top 3 features account for {top3_importance*100:.1f}% - "
                f"predictions distributed across multiple features."
            )
    
    # Per-class performance
    if classification_rep:
        classes = [k for k in classification_rep.keys() if k not in ['accuracy', 'macro avg', 'weighted avg']]
        if classes:
            interpretation_parts.append("→ **Per-class performance:**")
            for cls in classes:
                metrics = classification_rep[cls]
                precision = metrics.get('precision', 0)
                recall = metrics.get('recall', 0)
                f1 = metrics.get('f1-score', 0)
                interpretation_parts.append(
                    f"  • Class '{cls}': Precision = {precision:.2f}, Recall = {recall:.2f}, F1 = {f1:.2f}"
                )
            
            # Check for class imbalance issues
            recalls = [classification_rep[c].get('recall', 0) for c in classes]
            if max(recalls) - min(recalls) > 0.2:
                interpretation_parts.append(
                    "→ ⚠ Significant recall difference between classes detected - possible class imbalance effect."
                )
    
    # Confusion matrix insights
    if cm and len(cm) == 2:
        tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
        total = tn + fp + fn + tp
        
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
        
        interpretation_parts.append(
            f"→ Sensitivity (true positive rate): {sensitivity*100:.1f}%, "
            f"Specificity (true negative rate): {specificity*100:.1f}%."
        )
        
        if fp > fn:
            interpretation_parts.append(
                f"→ Model tends toward false positives ({fp} FP vs {fn} FN) - conservative threshold may help."
            )
        elif fn > fp:
            interpretation_parts.append(
                f"→ Model tends toward false negatives ({fn} FN vs {fp} FP) - lower threshold may improve recall."
            )
    
    # Ensemble insights
    interpretation_parts.append(
        f"→ Ensemble of {n_estimators} trees provides variance reduction through bootstrap aggregation (bagging)."
    )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if accuracy < 0.7:
        interpretation_parts.append(
            "→ Limited accuracy suggests: (1) collect more training data, (2) engineer additional features, "
            "(3) address class imbalance with SMOTE or class weights, (4) try gradient boosting methods."
        )
    elif accuracy < 0.85:
        interpretation_parts.append(
            "→ Fair performance. Consider: (1) hyperparameter tuning via GridSearchCV, "
            "(2) increasing n_estimators (200-500), (3) feature selection based on importance scores."
        )
    else:
        interpretation_parts.append(
            "→ Strong performance! Validate with cross-validation, check for data leakage, "
            "and consider SHAP values for detailed feature interpretation."
        )
    
    # Depth recommendation
    if max_depth is None:
        interpretation_parts.append(
            "→ Trees are fully grown (no depth limit). If overfitting occurs, try max_depth = 10-20."
        )
    elif max_depth < 5:
        interpretation_parts.append(
            f"→ Shallow trees (depth={max_depth}) may underfit. Consider increasing max_depth for complex patterns."
        )
    
    # Estimator recommendation
    if n_estimators < 100:
        interpretation_parts.append(
            "→ Consider increasing n_estimators to 100-500 for more stable predictions."
        )
    elif n_estimators > 500:
        interpretation_parts.append(
            "→ Large ensemble ({n_estimators} trees) provides stability but increases computation time."
        )
    
    # ROC-based recommendations
    if roc_auc_data and 'auc' in roc_auc_data:
        auc_score = roc_auc_data['auc']
        if auc_score < 0.7:
            interpretation_parts.append(
                "→ Low AUC indicates weak class separation. Consider: more features, different algorithms, or data quality review."
            )
    
    interpretation_parts.append(
        "→ Use feature importance plot to identify candidates for feature selection or further investigation."
    )
    
    interpretation_parts.append(
        "→ For production, consider model calibration (CalibratedClassifierCV) if probability estimates are critical."
    )
    
    return "\n".join(interpretation_parts)


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        features = payload.get('features')
        target = payload.get('target')
        
        n_estimators = int(payload.get('n_estimators', 100))
        max_depth = int(payload.get('max_depth')) if payload.get('max_depth') else None
        min_samples_split = int(payload.get('min_samples_split', 2))
        min_samples_leaf = int(payload.get('min_samples_leaf', 1))

        df = pd.DataFrame(data)

        X = df[features]
        y = df[target]

        X = pd.get_dummies(X, drop_first=True)
        feature_names = X.columns.tolist()

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

        model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            random_state=42
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)

        accuracy = accuracy_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True)
        cm = confusion_matrix(y_test, y_pred)

        # ROC & AUC for binary classification
        roc_auc_data = {}
        if len(np.unique(y)) == 2:
            fpr, tpr, _ = roc_curve(y_test, y_prob[:, 1], pos_label=model.classes_[1])
            roc_auc = auc(fpr, tpr)
            roc_auc_data = {
                'fpr': fpr.tolist(),
                'tpr': tpr.tolist(),
                'auc': roc_auc
            }

        results = {
            'accuracy': accuracy,
            'classification_report': report,
            'confusion_matrix': cm.tolist(),
            'feature_importance': dict(zip(feature_names, model.feature_importances_)),
            'roc_auc_data': roc_auc_data,
            'class_names': [str(c) for c in model.classes_]
        }
        
        # Generate interpretation
        interpretation = _generate_interpretation(
            results=results,
            target=target,
            features=features,
            n_estimators=n_estimators,
            max_depth=max_depth,
            n_samples=len(df),
            class_names=model.classes_
        )
        results['interpretation'] = interpretation

        # --- Create Plot ---
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('Random Forest Classifier Analysis', fontsize=16)

        # 1. Confusion Matrix
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0, 0], xticklabels=model.classes_, yticklabels=model.classes_)
        axes[0, 0].set_title('Confusion Matrix')
        axes[0, 0].set_xlabel('Predicted Label')
        axes[0, 0].set_ylabel('True Label')

        # 2. Feature Importance
        importance_df = pd.DataFrame({'feature': feature_names, 'importance': model.feature_importances_}).sort_values('importance', ascending=False).head(15)
        sns.barplot(x='importance', y='feature', data=importance_df, ax=axes[0, 1])
        axes[0, 1].set_title('Top 15 Feature Importances')

        # 3. ROC Curve
        if roc_auc_data:
            axes[1, 0].plot(roc_auc_data['fpr'], roc_auc_data['tpr'], color='darkorange', lw=2, label=f"ROC curve (area = {roc_auc_data['auc']:.2f})")
            axes[1, 0].plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
            axes[1, 0].set_xlabel('False Positive Rate')
            axes[1, 0].set_ylabel('True Positive Rate')
            axes[1, 0].set_title('Receiver Operating Characteristic (ROC) Curve')
            axes[1, 0].legend(loc="lower right")

        # 4. Class Distribution
        class_counts = y_test.value_counts()
        axes[1, 1].bar(class_counts.index.astype(str), class_counts.values, color=['#5B9BD5', '#FF6B6B'])
        axes[1, 1].set_title('Test Set Class Distribution')
        axes[1, 1].set_xlabel('Class')
        axes[1, 1].set_ylabel('Count')

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
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
    