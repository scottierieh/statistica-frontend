
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
    fig.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

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
        
        results = {
            'metrics': { 'test': test_metrics, 'train': train_metrics },
            'coefficients': dict(zip(final_features, model.coef_)),
            'intercept': model.intercept_,
            'alpha': alpha
        }
        
        # --- Plotting: Actual vs Predicted ---
        fig_main, ax_main = plt.subplots(figsize=(8, 6))
        sns.scatterplot(x=y_test, y=y_pred_test, ax=ax_main, alpha=0.6)
        ax_main.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
        ax_main.set_xlabel('Actual Values')
        ax_main.set_ylabel('Predicted Values')
        ax_main.set_title(f'Lasso Regression Performance (alpha={alpha})')
        ax_main.grid(True)
        plot_image = fig_to_base64(fig_main)

        # --- Alpha vs R^2 Plot ---
        train_scores, test_scores = [], []
        alpha_list = [0.001, 0.01, 0.1, 1, 10, 100]
        for alpha_val in alpha_list:
            lasso_iter = Lasso(alpha=alpha_val, max_iter=10000)
            lasso_iter.fit(X_train_scaled, y_train)
            train_scores.append(lasso_iter.score(X_train_scaled, y_train))
            test_scores.append(lasso_iter.score(X_test_scaled, y_test))

        fig_alpha, ax_alpha = plt.subplots(figsize=(8, 6))
        ax_alpha.plot(np.log10(alpha_list), train_scores, label='Train R²')
        ax_alpha.plot(np.log10(alpha_list), test_scores, label='Test R²')
        ax_alpha.set_xlabel('log10(alpha)')
        ax_alpha.set_ylabel('R² Score')
        ax_alpha.set_title('Lasso: Alpha vs. R-squared')
        ax_alpha.legend()
        ax_alpha.grid(True)
        alpha_plot_image = fig_to_base64(fig_alpha)
        
        response = {
            'results': results,
            'plot': plot_image,
            'alpha_plot': alpha_plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

