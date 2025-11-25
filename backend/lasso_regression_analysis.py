import sys
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Lasso
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def _generate_interpretation(train_r2, test_r2, alpha, coefficients, feature_names):
    """Generate detailed interpretation for Lasso regression results."""
    
    r2_diff = train_r2 - test_r2
    
    # Count non-zero coefficients (feature selection)
    non_zero_mask = np.abs(coefficients) >= 1e-6
    n_selected = np.sum(non_zero_mask)
    n_total = len(coefficients)
    n_excluded = n_total - n_selected
    
    # Get selected and excluded features
    selected_features = [f for f, c in zip(feature_names, coefficients) if abs(c) >= 1e-6]
    excluded_features = [f for f, c in zip(feature_names, coefficients) if abs(c) < 1e-6]
    
    # Get top features by absolute coefficient value
    coef_abs = np.abs(coefficients)
    top_indices = np.argsort(coef_abs)[::-1][:min(5, n_selected)]
    top_features = [(feature_names[i], coefficients[i]) for i in top_indices if abs(coefficients[i]) >= 1e-6]
    
    interpretation_parts = []
    
    # --- Overall Assessment (APA Format) ---
    interpretation_parts.append("**Overall Assessment**")
    
    # Model performance interpretation
    if test_r2 >= 0.75:
        effect_size = "large"
    elif test_r2 >= 0.50:
        effect_size = "medium-to-large"
    elif test_r2 >= 0.25:
        effect_size = "medium"
    else:
        effect_size = "small"
    
    # APA format: R² = .XX
    interpretation_parts.append(
        f"→ The Lasso regression model was statistically evaluated. "
        f"The model accounted for {test_r2*100:.1f}% of the variance in the outcome variable, "
        f"R² = {test_r2:.2f}, representing a {effect_size} effect size."
    )
    
    # Feature selection summary in APA style
    interpretation_parts.append(
        f"→ Through L1 regularization (α = {alpha:.3f}), the model retained {n_selected} of {n_total} predictors "
        f"({n_excluded} coefficients shrunk to zero)."
    )
    
    # Train-test comparison
    interpretation_parts.append(
        f"→ Model generalization was assessed by comparing training (R² = {train_r2:.2f}) "
        f"and test set performance (R² = {test_r2:.2f}), yielding a difference of ΔR² = {r2_diff:.2f}."
    )
    
    # Overfitting assessment
    if r2_diff > 0.15:
        interpretation_parts.append(f"→ The substantial performance gap suggests potential overfitting; increasing regularization is recommended.")
    elif r2_diff > 0.05:
        interpretation_parts.append(f"→ The moderate performance gap indicates acceptable generalization to unseen data.")
    else:
        interpretation_parts.append(f"→ The minimal performance gap indicates strong generalization capability.")
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Alpha effect
    if alpha < 0.01:
        interpretation_parts.append(f"→ Very low regularization (α={alpha:.4f}) - model is close to ordinary least squares")
    elif alpha < 0.1:
        interpretation_parts.append(f"→ Light regularization (α={alpha:.4f}) - minimal feature selection applied")
    elif alpha < 1.0:
        interpretation_parts.append(f"→ Moderate regularization (α={alpha:.4f}) - balanced feature selection")
    else:
        interpretation_parts.append(f"→ Strong regularization (α={alpha:.4f}) - aggressive feature selection")
    
    # Top predictors
    if top_features:
        interpretation_parts.append("→ Most influential predictors (by coefficient magnitude):")
        for feat, coef in top_features[:3]:
            direction = "positive" if coef > 0 else "negative"
            interpretation_parts.append(f"  • {feat}: {coef:.4f} ({direction} effect)")
    
    # Excluded features info
    if excluded_features:
        if len(excluded_features) <= 3:
            interpretation_parts.append(f"→ Excluded features: {', '.join(excluded_features)}")
        else:
            interpretation_parts.append(f"→ {len(excluded_features)} features excluded (coefficients shrunk to zero)")
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if test_r2 < 0.3 and n_selected < n_total * 0.3:
        interpretation_parts.append("→ Low R² with many excluded features - try reducing alpha to retain more predictors")
    elif r2_diff > 0.15:
        interpretation_parts.append("→ Increase alpha to reduce overfitting and improve generalization")
    elif n_excluded == 0 and alpha < 0.5:
        interpretation_parts.append("→ No features excluded - consider increasing alpha for sparser model")
    elif test_r2 >= 0.7 and r2_diff < 0.1:
        interpretation_parts.append("→ Model performs well - current alpha provides good balance")
    else:
        interpretation_parts.append("→ Try cross-validation to find optimal alpha value")
    
    if n_selected <= 5 and n_total > 10:
        interpretation_parts.append("→ Highly sparse model - verify excluded features are truly irrelevant")
    
    interpretation_parts.append("→ Examine residual plots to check for non-linear patterns or heteroscedasticity")
    
    return "\n".join(interpretation_parts)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target = payload.get('target')
        features = payload.get('features')
        alpha = float(payload.get('alpha', 0.1))
        test_size = float(payload.get('test_size', 0.2))

        if not all([data, target, features]):
            raise ValueError("Missing data, target, or features")

        df = pd.DataFrame(data)
        
        X = df[features]
        y = df[target]
        
        X = pd.get_dummies(X, drop_first=True)
        final_features = X.columns.tolist()

        y = pd.to_numeric(y, errors='coerce')
        
        combined = pd.concat([X, y], axis=1).dropna()
        X = combined[final_features]
        y = combined[target]
        
        if X.empty or y.empty:
            raise ValueError("Not enough valid data after cleaning.")

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Main model for specific alpha
        model = Lasso(alpha=alpha, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        y_pred_test = model.predict(X_test_scaled)
        y_pred_train = model.predict(X_train_scaled)
        
        test_metrics = {
            'r2_score': r2_score(y_test, y_pred_test),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
            'mae': mean_absolute_error(y_test, y_pred_test)
        }
        
        train_metrics = {
            'r2_score': r2_score(y_train, y_pred_train),
            'rmse': np.sqrt(mean_squared_error(y_train, y_pred_train)),
            'mae': mean_absolute_error(y_train, y_pred_train)
        }
        
        interpretation = _generate_interpretation(
            train_metrics['r2_score'], 
            test_metrics['r2_score'],
            alpha,
            model.coef_,
            final_features
        )
        
        results = {
            'metrics': { 'test': test_metrics, 'train': train_metrics },
            'coefficients': dict(zip(final_features, model.coef_)),
            'intercept': model.intercept_,
            'alpha': alpha,
            'interpretation': interpretation,
        }
        
        # --- Create 2x2 Plot with consistent styling ---
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Define consistent line color
        line_color = '#C44E52'
        
        # 1. Train set: Actual vs Predicted
        sns.scatterplot(x=y_train, y=y_pred_train, alpha=0.6, color='#5B9BD5', ax=axes[0, 0])
        axes[0, 0].plot([y_train.min(), y_train.max()], [y_train.min(), y_train.max()], 
                       '--', lw=2, color=line_color)
        axes[0, 0].set_xlabel('Actual Values', fontsize=12)
        axes[0, 0].set_ylabel('Predicted Values', fontsize=12)
        axes[0, 0].set_title('Train Set Performance', fontsize=12, fontweight='bold')
        train_text = f"Train R²: {train_metrics['r2_score']:.4f}\nTrain RMSE: {train_metrics['rmse']:.4f}"
        axes[0, 0].text(0.05, 0.95, train_text, transform=axes[0, 0].transAxes, 
                       fontsize=10, verticalalignment='top', 
                       bbox=dict(boxstyle='round,pad=0.5', fc='white', alpha=0.8))

        # 2. Test set: Actual vs Predicted
        sns.scatterplot(x=y_test, y=y_pred_test, alpha=0.6, color='#5B9BD5', ax=axes[0, 1])
        axes[0, 1].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
                       '--', lw=2, color=line_color)
        axes[0, 1].set_xlabel('Actual Values', fontsize=12)
        axes[0, 1].set_ylabel('Predicted Values', fontsize=12)
        axes[0, 1].set_title('Test Set Performance', fontsize=12, fontweight='bold')
        test_text = f"Test R²: {test_metrics['r2_score']:.4f}\nTest RMSE: {test_metrics['rmse']:.4f}"
        axes[0, 1].text(0.05, 0.95, test_text, transform=axes[0, 1].transAxes, 
                       fontsize=10, verticalalignment='top', 
                       bbox=dict(boxstyle='round,pad=0.5', fc='white', alpha=0.8))
        
        # --- Path Plot Data Calculation ---
        alpha_list = np.logspace(-3, 2, 100)
        coefs = []
        path_train_scores, path_test_scores = [], []
        for a in alpha_list:
            lasso_iter = Lasso(alpha=a, random_state=42, max_iter=1000)
            lasso_iter.fit(X_train_scaled, y_train)
            coefs.append(lasso_iter.coef_)
            path_train_scores.append(lasso_iter.score(X_train_scaled, y_train))
            path_test_scores.append(lasso_iter.score(X_test_scaled, y_test))

        # 3. R-squared vs. Alpha
        axes[1, 0].plot(alpha_list, path_train_scores, label='Train R²', color='#5B9BD5', linewidth=2)
        axes[1, 0].plot(alpha_list, path_test_scores, label='Test R²', color='#F4A582', linewidth=2)
        axes[1, 0].set_xlabel('Alpha', fontsize=12)
        axes[1, 0].set_ylabel('R-squared', fontsize=12)
        axes[1, 0].set_xscale('log')
        axes[1, 0].set_title('R-squared vs. Regularization Strength', fontsize=12, fontweight='bold')
        axes[1, 0].legend()

        # 4. Coefficients Path
        coefs_array = np.array(coefs)
        for i in range(coefs_array.shape[1]):
            axes[1, 1].plot(alpha_list, coefs_array[:, i], linewidth=1.5)
        axes[1, 1].set_xscale('log')
        axes[1, 1].set_xlabel('Alpha', fontsize=12)
        axes[1, 1].set_ylabel('Coefficients', fontsize=12)
        axes[1, 1].set_title('Lasso Coefficients Path', fontsize=12, fontweight='bold')

        plt.tight_layout()
        plot_image = fig_to_base64(fig)

        response = {
            'results': results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()