
import sys
import json
import pandas as pd
import numpy as np
from sklearn.neighbors import KNeighborsRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
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
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        features = payload.get('features')
        target = payload.get('target')
        k = int(payload.get('k', 5))
        test_size = float(payload.get('test_size', 0.25))
        predict_x = payload.get('predict_x')

        if not all([data, features, target]):
            raise ValueError("Missing data, features, or target")

        df = pd.DataFrame(data)

        # --- Data Preparation ---
        X = df[features]
        y = df[target]

        X = pd.get_dummies(X, drop_first=True)
        updated_features = X.columns.tolist()

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        # --- Model Training ---
        knr = KNeighborsRegressor(n_neighbors=k)
        knr.fit(X_train, y_train)
        y_pred = knr.predict(X_test)

        # --- Evaluation ---
        results = {
            'metrics': {
                'r2_score': r2_score(y_test, y_pred),
                'mse': mean_squared_error(y_test, y_pred),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred))
            },
            'params': {
                'k': k,
                'test_size': test_size,
                'n_train': len(X_train),
                'n_test': len(X_test)
            }
        }
        
        prediction_result = None
        if predict_x is not None:
            try:
                predict_x_value = float(predict_x)
                prediction = knr.predict([[predict_x_value]])
                
                distances, indexes = knr.kneighbors([[predict_x_value]])

                prediction_result = {
                    'x_value': predict_x_value,
                    'y_value': prediction[0],
                    'neighbors': {
                        'distances': distances[0].tolist(),
                        'x_values': X_train.iloc[indexes[0]].values.flatten().tolist(),
                        'y_values': y_train.iloc[indexes[0]].values.flatten().tolist(),
                    }
                }
            except (ValueError, IndexError):
                # Fails silently if predict_x is not a valid number or features > 1
                pass
        results['prediction'] = prediction_result


        # --- Create Main Plot (Actual vs. Predicted) for all cases ---
        fig_main, ax_main = plt.subplots(figsize=(8, 6))
        sns.scatterplot(x=y_test, y=y_pred, ax=ax_main, alpha=0.7)
        ax_main.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2, label='Ideal Fit')
        ax_main.set_xlabel("Actual Values")
        ax_main.set_ylabel("Predicted Values")
        ax_main.set_title(f"Model Performance: Actual vs. Predicted (R²={results['metrics']['r2_score']:.3f})")
        ax_main.legend()
        ax_main.grid(True, alpha=0.3)
        
        buf_main = io.BytesIO()
        fig_main.savefig(buf_main, format='png', bbox_inches='tight')
        plt.close(fig_main)
        buf_main.seek(0)
        main_plot_image = base64.b64encode(buf_main.read()).decode('utf-8')


        # --- Create Prediction Simulation Plot (only for simple regression with prediction) ---
        prediction_plot_image = None
        if len(features) == 1 and prediction_result:
            fig_pred, ax_pred = plt.subplots(figsize=(8, 6))
            
            # Scatter plot for training data
            ax_pred.scatter(X_train, y_train, alpha=0.5, label='Training Data')

            # Highlight neighbors
            neighbor_x = prediction_result['neighbors']['x_values']
            neighbor_y = prediction_result['neighbors']['y_values']
            ax_pred.scatter(neighbor_x, neighbor_y, color='orange', s=150, marker='D', label='Neighbors', zorder=5, edgecolors='black')

            # Highlight prediction point
            ax_pred.scatter([prediction_result['x_value']], [prediction_result['y_value']], color='magenta', s=200, marker='^', label=f'Prediction', zorder=6, edgecolors='black')

            ax_pred.set_xlabel(features[0])
            ax_pred.set_ylabel(target)
            ax_pred.set_title(f'KNN Prediction Simulation (k={k})')
            ax_pred.legend()
            ax_pred.grid(True, linestyle='--', alpha=0.6)

            buf_pred = io.BytesIO()
            fig_pred.savefig(buf_pred, format='png', bbox_inches='tight')
            plt.close(fig_pred)
            buf_pred.seek(0)
            prediction_plot_image = base64.b64encode(buf_pred.read()).decode('utf-8')


        response = {
            'results': results,
            'plot': f"data:image/png;base64,{main_plot_image}",
            'prediction_plot': f"data:image/png;base64,{prediction_plot_image}" if prediction_plot_image else None
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
