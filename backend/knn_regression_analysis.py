import sys
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsRegressor
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

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target = payload.get('target')
        features = payload.get('features')
        k = int(payload.get('k', 5))
        test_size = float(payload.get('test_size', 0.2))
        predict_x = payload.get('predict_x')

        if not all([data, target, features]):
            raise ValueError("Missing data, target, or features")

        df = pd.DataFrame(data)
        
        # Data Preparation
        X = df[features]
        y = df[target]
        
        X = pd.get_dummies(X, drop_first=True)
        processed_features = X.columns.tolist()

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Model Training
        model = KNeighborsRegressor(n_neighbors=k)
        model.fit(X_train_scaled, y_train)
        y_pred_test = model.predict(X_test_scaled)
        
        # Evaluation
        results = {
            'metrics': {
                'r2_score': r2_score(y_test, y_pred_test),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
                'mae': mean_absolute_error(y_test, y_pred_test)
            },
            'predictions': [{'actual': act, 'predicted': pred} for act, pred in zip(y_test.tolist(), y_pred_test.tolist())]
        }
        
        prediction_result = None
        plot_image = None
        
        if len(features) > 1: # Multiple regression
            fig, ax = plt.subplots(figsize=(8, 6))
            sns.scatterplot(x=y_test, y=y_pred_test, ax=ax, alpha=0.6)
            ax.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
            ax.set_xlabel('Actual Values')
            ax.set_ylabel('Predicted Values')
            ax.set_title(f'Actual vs. Predicted Values (k={k})')
            ax.grid(True)
            plt.tight_layout()
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            plt.close(fig)
            buf.seek(0)
            plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        # For simple regression, no plot is generated as per user request.

        if predict_x is not None and len(features) == 1:
            predict_x_scaled = scaler.transform([[predict_x]])
            predicted_y = model.predict(predict_x_scaled)[0]
            
            distances, indices = model.kneighbors(predict_x_scaled)
            neighbor_X = scaler.inverse_transform(X_train_scaled[indices[0]])
            neighbor_y = y_train.iloc[indices[0]]

            prediction_result = {
                'x_value': predict_x,
                'y_value': predicted_y,
                'neighbors_X': neighbor_X.flatten().tolist(),
                'neighbors_y': neighbor_y.tolist()
            }
        
        results['prediction'] = prediction_result
        
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
