import sys
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
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

def _generate_interpretation(train_r2, test_r2, train_rmse, test_rmse, alpha, n_features, n_train):
    interpretation_sections = []
    r2_diff = abs(train_r2 - test_r2)
    is_overfitting = r2_diff > 0.1
    
    # Section 1: Overall Analysis
    section1 = "**Overall Analysis**\n"
    section1 += f"A Ridge regression model with L2 regularization (alpha = {alpha:.3f}) was fit on {n_train} training observations "
    section1 += f"using {n_features} predictor variable(s).\n\n"
    
    if train_r2 >= 0.75:
        section1 += f"• Training Performance: Excellent fit with R-squared = {train_r2:.4f}, explaining {train_r2*100:.1f}% of variance.\n"
    elif train_r2 >= 0.50:
        section1 += f"• Training Performance: Good fit with R-squared = {train_r2:.4f}, explaining {train_r2*100:.1f}% of variance.\n"
    elif train_r2 >= 0.25:
        section1 += f"• Training Performance: Moderate fit with R-squared = {train_r2:.4f}, explaining {train_r2*100:.1f}% of variance.\n"
    else:
        section1 += f"• Training Performance: Weak fit with R-squared = {train_r2:.4f}, explaining {train_r2*100:.1f}% of variance.\n"
    
    if test_r2 >= 0.75:
        section1 += f"• Test Performance: Excellent generalization with R-squared = {test_r2:.4f}.\n"
    elif test_r2 >= 0.50:
        section1 += f"• Test Performance: Good generalization with R-squared = {test_r2:.4f}.\n"
    elif test_r2 >= 0.25:
        section1 += f"• Test Performance: Moderate generalization with R-squared = {test_r2:.4f}.\n"
    else:
        section1 += f"• Test Performance: Weak generalization with R-squared = {test_r2:.4f}.\n"
    
    section1 += f"• Prediction Error (Test RMSE): {test_rmse:.4f}"
    
    interpretation_sections.append(section1)
    
    # Section 2: Statistical Insights
    section2 = "**Statistical Insights**\n"
    
    if is_overfitting:
        section2 += f"• Overfitting Detected: The model shows a train-test R-squared gap of {r2_diff:.4f}, "
        section2 += f"indicating the model performs {r2_diff*100:.1f}% better on training data than test data.\n"
        section2 += f"• Impact: This suggests the model has learned training-specific patterns that don't generalize well.\n"
        
        if alpha < 1.0:
            section2 += f"• Current Regularization: Alpha = {alpha:.3f} provides weak regularization. "
            section2 += f"Consider increasing alpha to strengthen regularization and reduce overfitting.\n"
        else:
            section2 += f"• Current Regularization: Alpha = {alpha:.3f}. Despite regularization, overfitting persists. "
            section2 += f"Consider further increasing alpha or reducing model complexity.\n"
    else:
        section2 += f"• Good Generalization: The model shows excellent generalization with a train-test R-squared gap of only {r2_diff:.4f}.\n"
        section2 += f"• Regularization Balance: Alpha = {alpha:.3f} provides appropriate regularization, "
        section2 += f"effectively preventing overfitting while maintaining predictive power.\n"
        section2 += f"• Model Stability: The close alignment between training and test performance indicates the model will likely perform consistently on new data.\n"
    
    # Ridge-specific explanation
    section2 += f"\nRidge regression applies L2 penalty proportional to the square of coefficient magnitudes. "
    section2 += f"This shrinks all coefficients toward zero (but not exactly to zero), helping to:\n"
    section2 += f"• Reduce model variance and prevent overfitting\n"
    section2 += f"• Handle multicollinearity by stabilizing coefficient estimates\n"
    section2 += f"• Maintain all features in the model with reduced impact"
    
    interpretation_sections.append(section2)
    
    # Section 3: Recommendations
    section3 = "**Recommendations**\n"
    
    # Performance assessment
    if test_r2 >= 0.7 and not is_overfitting:
        section3 += "• Model Quality: The model demonstrates strong predictive performance with good generalization.\n"
        section3 += "• Deployment Readiness: This model appears suitable for making predictions on new data.\n"
    elif test_r2 >= 0.5:
        section3 += "• Model Quality: The model shows acceptable performance but has room for improvement.\n"
        section3 += "• Enhancement Opportunities: Consider feature engineering or additional predictors to improve fit.\n"
    else:
        section3 += "• Model Quality: The model shows limited predictive power on test data.\n"
        section3 += "• Action Required: Consider substantial model revision - add features, try alternative approaches, or reassess data quality.\n"
    
    # Alpha tuning recommendations
    section3 += f"\nRegularization Parameter Tuning:\n"
    if is_overfitting and alpha < 5.0:
        section3 += f"• Increase alpha to strengthen regularization and reduce overfitting\n"
        section3 += f"• Try alpha values in the range [{alpha*2:.3f}, {alpha*10:.3f}] for better generalization\n"
    elif not is_overfitting and test_r2 < 0.6 and alpha > 0.1:
        section3 += f"• Current alpha may be too high, causing underfitting\n"
        section3 += f"• Try lower alpha values in the range [{alpha/10:.4f}, {alpha/2:.3f}] to improve fit\n"
    else:
        section3 += f"• Current alpha = {alpha:.3f} appears appropriate for this dataset\n"
        section3 += f"• Use cross-validation to fine-tune if seeking optimal performance\n"
    
    # General recommendations
    section3 += f"\nGeneral Recommendations:\n"
    section3 += f"• Compare Ridge with Lasso regression to see if feature selection improves performance\n"
    section3 += f"• Examine the regularization path plot to understand alpha's effect on coefficients\n"
    section3 += f"• Validate the model on completely independent data when possible\n"
    section3 += f"• Check residual plots for patterns that might indicate model misspecification"
    
    interpretation_sections.append(section3)
    
    return "\n\n".join(interpretation_sections)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target = payload.get('target')
        features = payload.get('features')
        alpha = float(payload.get('alpha', 1.0))
        test_size = float(payload.get('test_size', 0.2))

        if not all([data, target, features]):
            raise ValueError("Missing data, target, or features")

        df = pd.DataFrame(data)
        
        X = df[features]
        y = df[target]
        
        # One-hot encode categorical features if any
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
        
        model = Ridge(alpha=alpha, random_state=42)
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
            train_metrics['rmse'],
            test_metrics['rmse'],
            alpha,
            len(final_features),
            len(X_train)
        )
        
        results = {
            'metrics': {
                'test': test_metrics,
                'train': train_metrics,
            },
            'coefficients': dict(zip(final_features, model.coef_)),
            'intercept': model.intercept_,
            'alpha': alpha,
            'interpretation': interpretation,
        }
        
        # --- Create 2x2 Plot with consistent styling ---
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
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
            ridge_iter = Ridge(alpha=a, random_state=42)
            ridge_iter.fit(X_train_scaled, y_train)
            coefs.append(ridge_iter.coef_)
            path_train_scores.append(ridge_iter.score(X_train_scaled, y_train))
            path_test_scores.append(ridge_iter.score(X_test_scaled, y_test))

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
        axes[1, 1].set_title('Ridge Coefficients Path', fontsize=12, fontweight='bold')

        plt.tight_layout()
        plot_image = fig_to_base64(fig)

        response = {
            'results': results,
            'plot': plot_image,
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    