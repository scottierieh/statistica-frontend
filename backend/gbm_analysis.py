import sys
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import io
import base64
import warnings

warnings.filterwarnings('ignore')

sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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


def _generate_interpretation(results, problem_type, target, features, n_estimators, learning_rate, max_depth, n_samples):
    """Generate detailed interpretation for GBM results in APA format."""
    
    interpretation_parts = []
    metrics = results.get('metrics', {})
    feature_importance = results.get('feature_importance', {})
    
    # --- Overall Assessment ---
    interpretation_parts.append("**Overall Assessment**")
    
    interpretation_parts.append(
        f"→ A Gradient Boosting {'Regressor' if problem_type == 'regression' else 'Classifier'} was trained to predict "
        f"**{target}** using {len(features)} feature(s) (N = {n_samples})."
    )
    
    interpretation_parts.append(
        f"→ Ensemble configuration: {n_estimators} sequential trees, learning rate = {learning_rate}, max depth = {max_depth}."
    )
    
    if problem_type == 'regression':
        r2 = metrics.get('r2_score', 0)
        rmse = metrics.get('rmse', 0)
        mse = metrics.get('mse', 0)
        
        if r2 >= 0.9:
            perf_desc = "excellent"
        elif r2 >= 0.7:
            perf_desc = "good"
        elif r2 >= 0.5:
            perf_desc = "moderate"
        else:
            perf_desc = "limited"
        
        interpretation_parts.append(
            f"→ The model achieved **R² = {r2:.4f}**, indicating {perf_desc} explanatory power "
            f"({r2*100:.1f}% of variance explained)."
        )
        interpretation_parts.append(
            f"→ Prediction error metrics: RMSE = {rmse:.2f}, MSE = {mse:.2f}."
        )
    else:
        accuracy = metrics.get('accuracy', 0)
        
        if accuracy >= 0.9:
            perf_desc = "excellent"
        elif accuracy >= 0.8:
            perf_desc = "good"
        elif accuracy >= 0.7:
            perf_desc = "fair"
        else:
            perf_desc = "limited"
        
        interpretation_parts.append(
            f"→ The model achieved **{accuracy*100:.1f}%** test accuracy, indicating {perf_desc} classification performance."
        )
        
        # Class-level metrics
        clf_report = metrics.get('classification_report', {})
        if clf_report:
            classes = [k for k in clf_report.keys() if k not in ['accuracy', 'macro avg', 'weighted avg']]
            if classes:
                precisions = [clf_report[c].get('precision', 0) for c in classes]
                recalls = [clf_report[c].get('recall', 0) for c in classes]
                interpretation_parts.append(
                    f"→ Average precision: {np.mean(precisions)*100:.1f}%, average recall: {np.mean(recalls)*100:.1f}%."
                )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Feature importance insights
    if feature_importance:
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        top_features = sorted_features[:3]
        
        interpretation_parts.append("→ **Top predictive features** (by importance):")
        for feat, imp in top_features:
            interpretation_parts.append(f"  • {feat}: {imp*100:.1f}% importance")
        
        # Feature concentration
        top3_importance = sum(imp for _, imp in top_features)
        if top3_importance > 0.7:
            interpretation_parts.append(
                f"→ Top 3 features account for {top3_importance*100:.1f}% of total importance - "
                f"model relies heavily on few predictors."
            )
        elif top3_importance > 0.5:
            interpretation_parts.append(
                f"→ Top 3 features account for {top3_importance*100:.1f}% of importance - "
                f"balanced feature contribution."
            )
        else:
            interpretation_parts.append(
                f"→ Top 3 features account for only {top3_importance*100:.1f}% - "
                f"prediction distributed across many features."
            )
    
    if problem_type == 'regression':
        r2 = metrics.get('r2_score', 0)
        if r2 >= 0.8:
            interpretation_parts.append(
                f"→ **Strong fit**: R² of {r2:.4f} suggests the model captures most systematic variation in {target}."
            )
        elif r2 >= 0.5:
            interpretation_parts.append(
                f"→ **Moderate fit**: R² of {r2:.4f} indicates reasonable predictive power but unexplained variance remains."
            )
        else:
            interpretation_parts.append(
                f"→ **Weak fit**: R² of {r2:.4f} suggests significant unexplained variance; consider more features or data."
            )
    else:
        # Classification insights
        cm = metrics.get('confusion_matrix', [])
        if cm:
            total = sum(sum(row) for row in cm)
            correct = sum(cm[i][i] for i in range(len(cm)))
            interpretation_parts.append(
                f"→ Correctly classified {correct} of {total} test cases ({correct/total*100:.1f}%)."
            )
    
    # Learning dynamics
    interpretation_parts.append(
        f"→ **Boosting dynamics**: With learning rate {learning_rate} and {n_estimators} iterations, "
        f"each tree contributes {learning_rate*100:.0f}% of its prediction to the ensemble."
    )
    
    if learning_rate < 0.05:
        interpretation_parts.append(
            "→ Low learning rate provides fine-grained learning but may require more trees for convergence."
        )
    elif learning_rate > 0.3:
        interpretation_parts.append(
            "→ High learning rate enables faster learning but increases overfitting risk."
        )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if problem_type == 'regression':
        r2 = metrics.get('r2_score', 0)
        if r2 < 0.5:
            interpretation_parts.append(
                "→ Low R² suggests: (1) add more predictive features, (2) increase n_estimators, "
                "(3) try deeper trees (max_depth), (4) check for data quality issues."
            )
        elif r2 < 0.7:
            interpretation_parts.append(
                "→ Moderate performance. Consider: (1) hyperparameter tuning via GridSearchCV, "
                "(2) feature engineering, (3) trying XGBoost or LightGBM for potential improvement."
            )
        else:
            interpretation_parts.append(
                "→ Good performance! Validate on holdout data, check residual plots for patterns, "
                "and consider model interpretability with SHAP values."
            )
    else:
        accuracy = metrics.get('accuracy', 0)
        if accuracy < 0.7:
            interpretation_parts.append(
                "→ Limited accuracy suggests: (1) collect more training data, (2) address class imbalance, "
                "(3) increase model complexity, (4) try feature engineering."
            )
        elif accuracy < 0.85:
            interpretation_parts.append(
                "→ Fair performance. Consider: (1) tune hyperparameters, (2) use early stopping, "
                "(3) try XGBoost/LightGBM, (4) examine misclassified cases."
            )
        else:
            interpretation_parts.append(
                "→ Strong classification performance! Validate with cross-validation, "
                "check for data leakage, and analyze feature importance for insights."
            )
    
    # General recommendations
    if max_depth > 5:
        interpretation_parts.append(
            f"→ Tree depth of {max_depth} may increase overfitting risk; consider reducing if train/test gap is large."
        )
    
    if n_estimators < 50:
        interpretation_parts.append(
            "→ Consider increasing n_estimators (100-500) with lower learning rate for better generalization."
        )
    
    interpretation_parts.append(
        "→ Use the learning curve plot to check for overfitting (diverging train/test error)."
    )
    
    interpretation_parts.append(
        "→ For production deployment, consider model compression or using HistGradientBoosting for faster inference."
    )
    
    return "\n".join(interpretation_parts)


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        features = payload.get('features')
        target = payload.get('target')
        problem_type = payload.get('problemType')
        
        n_estimators = int(payload.get('nEstimators', 100))
        learning_rate = float(payload.get('learningRate', 0.1))
        max_depth = int(payload.get('maxDepth', 3))

        if not all([data, features, target, problem_type]):
            raise ValueError("Missing data, features, target, or problemType")

        df = pd.DataFrame(data)

        X = df[features]
        y = df[target]

        X = pd.get_dummies(X, drop_first=True)
        feature_names = X.columns.tolist()

        try:
             X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y if problem_type == 'classification' else None
            )
        except ValueError:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )

        if problem_type == 'regression':
            model = GradientBoostingRegressor(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=42,
                validation_fraction=0.1,
                n_iter_no_change=5, 
                tol=0.01
            )
        else:
            model = GradientBoostingClassifier(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=42
            )
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        results = {}
        prediction_examples = []
        if problem_type == 'regression':
            results['metrics'] = {
                'r2_score': r2_score(y_test, y_pred),
                'mse': mean_squared_error(y_test, y_pred),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred))
            }
            residuals = y_test - y_pred
            errors = np.abs(residuals)
            
            n_examples = min(10, len(y_test))
            example_indices = np.random.choice(y_test.index, n_examples, replace=False)
            
            for idx in example_indices:
                actual = y_test.loc[idx]
                predicted = model.predict(X_test.loc[[idx]])[0]
                error = abs(actual - predicted)
                error_pct = (error / actual) * 100 if actual != 0 else 0
                prediction_examples.append({
                    "actual": actual,
                    "predicted": predicted,
                    "error": error,
                    "error_percent": error_pct
                })

        else:
            results['metrics'] = {
                'accuracy': accuracy_score(y_test, y_pred),
                'classification_report': classification_report(y_test, y_pred, output_dict=True, zero_division=0),
                'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
            }
            n_examples = min(10, len(y_test))
            example_indices = np.random.choice(y_test.index, n_examples, replace=False)

            for idx in example_indices:
                actual = y_test.loc[idx]
                predicted = model.predict(X_test.loc[[idx]])[0]
                proba = model.predict_proba(X_test.loc[[idx]])[0]
                prediction_examples.append({
                    "actual": actual,
                    "predicted": predicted,
                    "status": "✅" if actual == predicted else "❌",
                    "confidence": max(proba)
                })

        results['feature_importance'] = dict(zip(feature_names, model.feature_importances_))
        results['prediction_examples'] = prediction_examples
        
        # Generate interpretation
        interpretation = _generate_interpretation(
            results=results,
            problem_type=problem_type,
            target=target,
            features=features,
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            n_samples=len(df)
        )
        results['interpretation'] = interpretation

        # Plotting
        plot_image = None
        if problem_type == 'regression':
            fig, axes = plt.subplots(3, 3, figsize=(32, 32))
            
            residuals = y_test - y_pred

            sns.scatterplot(x=y_test, y=y_pred, ax=axes[0, 0], alpha=0.6, color='#5B9BD5')
            axes[0, 0].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
            axes[0, 0].set_xlabel('Actual Values', fontsize=11)
            axes[0, 0].set_ylabel('Predicted Values', fontsize=11)
            axes[0, 0].set_title(f"Actual vs Predicted (R² = {results['metrics']['r2_score']:.3f})", fontsize=12, fontweight='bold')

            importance_df = pd.DataFrame({
                'feature': feature_names,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)
            sns.barplot(x='importance', y='feature', data=importance_df.head(10), ax=axes[0, 1], palette='crest')
            axes[0, 1].set_title('Top 10 Feature Importance', fontsize=12, fontweight='bold')
            axes[0, 1].set_xlabel('Importance', fontsize=11)
            axes[0, 1].set_ylabel('Feature', fontsize=11)

            sns.scatterplot(x=y_pred, y=residuals, ax=axes[0, 2], alpha=0.6, color='#5B9BD5')
            axes[0, 2].axhline(y=0, color='r', linestyle='--')
            axes[0, 2].set_xlabel('Predicted Values', fontsize=11)
            axes[0, 2].set_ylabel('Residuals', fontsize=11)
            axes[0, 2].set_title('Residuals vs. Predicted', fontsize=12, fontweight='bold')

            sns.histplot(residuals, kde=True, ax=axes[1, 0], bins=15, color='#5B9BD5')
            axes[1, 0].set_title('Residuals Distribution', fontsize=12, fontweight='bold')
            axes[1, 0].set_xlabel('Residuals', fontsize=11)
            axes[1, 0].set_ylabel('Frequency', fontsize=11)

            stats.probplot(residuals, dist="norm", plot=axes[1, 1])
            axes[1, 1].set_title('Q-Q Plot of Residuals', fontsize=12, fontweight='bold')
            axes[1, 1].set_xlabel('Theoretical Quantiles', fontsize=11)
            axes[1, 1].set_ylabel('Sample Quantiles', fontsize=11)
            
            train_scores = np.zeros(n_estimators)
            for i, y_pred_train in enumerate(model.staged_predict(X_train)):
                train_scores[i] = mean_squared_error(y_train, y_pred_train)
            
            test_scores = np.zeros(n_estimators)
            for i, y_pred_test in enumerate(model.staged_predict(X_test)):
                test_scores[i] = mean_squared_error(y_test, y_pred_test)

            axes[1, 2].plot(train_scores, 'b-', label='Train MSE', linewidth=2)
            axes[1, 2].plot(test_scores, 'r-', label='Test MSE', linewidth=2)
            axes[1, 2].set_xlabel('Boosting Iterations', fontsize=11)
            axes[1, 2].set_ylabel('Mean Squared Error', fontsize=11)
            axes[1, 2].set_title('Learning Curve', fontsize=12, fontweight='bold')
            axes[1, 2].legend()

            errors = np.abs(residuals)
            sns.histplot(errors, kde=False, ax=axes[2, 0], bins=15, color='#5B9BD5')
            axes[2, 0].set_title(f'Prediction Error Distribution (MAE={errors.mean():.2f})', fontsize=12, fontweight='bold')
            axes[2, 0].set_xlabel('Absolute Error', fontsize=11)
            axes[2, 0].set_ylabel('Frequency', fontsize=11)
            
            top_feature = importance_df.iloc[0]['feature']
            sns.scatterplot(x=X_test[top_feature], y=y_test, ax=axes[2, 1], alpha=0.6, label='Actual', color='#5B9BD5')
            sns.scatterplot(x=X_test[top_feature], y=y_pred, ax=axes[2, 1], alpha=0.6, label='Predicted', color='#FF6B6B')
            axes[2, 1].set_title(f'Top Feature ({top_feature}) vs Target', fontsize=12, fontweight='bold')
            axes[2, 1].set_xlabel(top_feature, fontsize=11)
            axes[2, 1].set_ylabel('Target', fontsize=11)
            axes[2, 1].legend()

            axes[2, 2].axis('off')
            summary_text = (
                f"Model Performance:\n"
                f"  R² Score: {results['metrics']['r2_score']:.4f}\n"
                f"  MSE: {results['metrics']['mse']:,.2f}\n"
                f"  RMSE: {results['metrics']['rmse']:,.2f}\n"
                f"  MAE: {errors.mean():,.2f}\n\n"
                f"Residuals Summary:\n"
                f"  Mean: {residuals.mean():.2f}\n"
                f"  Std Dev: {residuals.std():,.2f}\n"
                f"  Min: {residuals.min():,.2f}\n"
                f"  Max: {residuals.max():,.2f}"
            )
            axes[2, 2].text(0.05, 0.95, summary_text, transform=axes[2, 2].transAxes, fontsize=12,
                            verticalalignment='top', bbox=dict(boxstyle='round,pad=0.5', fc='wheat', alpha=0.3))

        else:
            fig, axes = plt.subplots(1, 2, figsize=(28, 12))
            
            importance_df = pd.DataFrame({
                'feature': feature_names,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False).head(15)
            
            sns.barplot(x='importance', y='feature', data=importance_df, ax=axes[0], palette='crest')
            axes[0].set_title('Feature Importance', fontsize=14, fontweight='bold')
            axes[0].set_xlabel('Importance', fontsize=12)
            axes[0].set_ylabel('Feature', fontsize=12)

            cm = confusion_matrix(y_test, y_pred)
            class_names = sorted(y.unique())
            sns.heatmap(cm, annot=True, fmt='d', cmap='vlag', ax=axes[1], 
                       xticklabels=class_names, yticklabels=class_names,
                       square=True, linewidths=1, cbar_kws={'label': 'Count'})
            axes[1].set_xlabel('Predicted', fontsize=12)
            axes[1].set_ylabel('Actual', fontsize=12)
            axes[1].set_title('Confusion Matrix', fontsize=14, fontweight='bold')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
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