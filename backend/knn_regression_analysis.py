
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
        # Ensure feature order is consistent
        processed_features = X.columns.tolist()

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Model Training
        model = KNeighborsRegressor(n_neighbors=k)
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)
        
        # Evaluation
        results = {
            'metrics': {
                'r2_score': r2_score(y_test, y_pred),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
                'mae': mean_absolute_error(y_test, y_pred)
            },
            'predictions': [{'actual': act, 'predicted': pred} for act, pred in zip(y_test, y_pred)]
        }
        
        prediction_result = None
        if predict_x is not None and len(features) == 1:
            # Create a DataFrame for the prediction input to ensure column name matches
            predict_x_df = pd.DataFrame([[predict_x]], columns=features)
            predict_x_scaled = scaler.transform(predict_x_df)
            predicted_y = model.predict(predict_x_scaled)[0]
            
            # Find neighbors
            distances, indices = model.kneighbors(predict_x_scaled)
            
            # Get original values of neighbors
            neighbors_X = X_train.iloc[indices[0]].values
            neighbors_y = y_train.iloc[indices[0]].values
            
            prediction_result = {
                'x_value': predict_x,
                'y_value': predicted_y,
                'neighbors_X': neighbors_X.tolist(),
                'neighbors_y': neighbors_y.tolist()
            }
        results['prediction'] = prediction_result


        # Plotting
        plt.figure(figsize=(10, 6))

        # Simple regression plot
        if len(features) == 1:
            feature_name = features[0]
            plt.scatter(X_test[feature_name], y_test, alpha=0.6, label='Test Data')
            
            # Plot the prediction line (sorting is important for a clean line)
            X_range = np.linspace(X_train[feature_name].min(), X_train[feature_name].max(), 100).reshape(-1, 1)
            X_range_scaled = scaler.transform(X_range)
            y_range_pred = model.predict(X_range_scaled)
            plt.plot(X_range, y_range_pred, color='red', linestyle='--', label='KNN Prediction Line')
            
            if prediction_result:
                # Highlight the neighbors
                plt.scatter(prediction_result['neighbors_X'], prediction_result['neighbors_y'], color='orange', s=100, marker='D', label='Neighbors', zorder=5)
                # Highlight the predicted point
                plt.scatter(prediction_result['x_value'], prediction_result['y_value'], color='magenta', s=200, marker='^', label=f'Prediction for X={predict_x}', zorder=6)

            plt.xlabel(feature_name)
            plt.ylabel(target)
            plt.title(f'KNN Simple Regression (k={k})')

        # Multi-regression plot (Actual vs Predicted)
        else:
             sns.scatterplot(x=y_test, y=y_pred, alpha=0.6, label='Test Data')
             plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2, label='Ideal Line')
             plt.xlabel('Actual Values')
             plt.ylabel('Predicted Values')
             plt.title(f'KNN Multiple Regression: Actual vs. Predicted (k={k})')

        plt.grid(True)
        plt.legend()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
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
