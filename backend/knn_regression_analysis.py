

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
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def fig_to_base64(fig):
    """Converts a matplotlib figure to a base64 encoded string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def _generate_interpretation(train_metrics, test_metrics, k, target):
    """Generates an interpretation of the KNN regression results."""
    train_r2 = train_metrics['r2_score']
    test_r2 = test_metrics['r2_score']
    rmse = test_metrics['rmse']
    mae = test_metrics['mae']
    
    r2_diff = train_r2 - test_r2
    
    interp = ""

    # R-squared interpretation
    if test_r2 > 0.8:
        interp += f"The model shows a **strong fit** (R² = {test_r2:.3f}), explaining a large portion of the variance in '{target}'. "
    elif test_r2 > 0.5:
        interp += f"The model has a **moderate fit** (R² = {test_r2:.3f}), explaining a reasonable portion of the variance. "
    else:
        interp += f"The model shows a **weak fit** (R² = {test_r2:.3f}), indicating it doesn't explain much of the variance in the target variable. "

    # Overfitting/Underfitting check
    if r2_diff > 0.2:
        interp += "However, there is a significant drop in performance from the training set (R² = {train_r2:.3f}) to the test set, which suggests potential **overfitting**. The model may be too complex for the data, possibly due to a low K value. "
    elif train_r2 < 0.5 and test_r2 < 0.5:
        interp += "The low performance on both train and test sets may indicate **underfitting**. The model might be too simple, or the features may not have a strong relationship with the target. "
    else:
        interp += "The model generalizes well to new data, as the training and test set performances are similar. "
    
    # Error metrics interpretation
    interp += f"\nOn average, the model's predictions are off by **{mae:.2f}** (Mean Absolute Error). The Root Mean Squared Error (RMSE) is **{rmse:.2f}**, which gives a sense of the magnitude of typical prediction errors."

    return interp

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target = payload.get('target')
        features = payload.get('features')
        k = int(payload.get('k', 5))
        test_size = float(payload.get('test_size', 0.2))
        predict_x_input = payload.get('predict_x')

        if not all([data, target, features]):
            raise ValueError("Missing data, target, or features")

        df = pd.DataFrame(data)
        
        X = df[features]
        y = df[target]
        
        for col in features:
            X[col] = pd.to_numeric(X[col], errors='coerce')
        y = pd.to_numeric(y, errors='coerce')
        
        combined = pd.concat([X, y], axis=1).dropna()
        X = combined[features]
        y = combined[target]
        
        if X.empty or y.empty:
            raise ValueError("Not enough valid data after cleaning.")

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        model = KNeighborsRegressor(n_neighbors=k)
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
        
        interpretation = _generate_interpretation(train_metrics, test_metrics, k, target)

        results = {
            'metrics': {
                'test': test_metrics,
                'train': train_metrics,
            },
            'predictions': [{'actual': act, 'predicted': pred} for act, pred in zip(y_test.tolist(), y_pred_test.tolist())],
            'features': features,
            'interpretation': interpretation,
        }
        
        prediction_result = None
        plot_image = None
        relationship_plot_image = None
        prediction_plot_image = None
        
        # --- Plotting ---
        
        # Always create the Actual vs. Predicted plot
        fig_actual_vs_pred, ax_actual_vs_pred = plt.subplots(figsize=(8, 6))
        sns.scatterplot(x=y_test, y=y_pred_test, ax=ax_actual_vs_pred, alpha=0.6)
        ax_actual_vs_pred.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
        ax_actual_vs_pred.set_xlabel('Actual Values')
        ax_actual_vs_pred.set_ylabel('Predicted Values')
        ax_actual_vs_pred.set_title(f'Model Performance (k={k})')
        ax_actual_vs_pred.grid(True)
        plot_image = fig_to_base64(fig_actual_vs_pred)

        if len(features) == 1:
            feature_name = features[0]
            
            # Create Relationship Plot
            fig_relationship, ax_relationship = plt.subplots(figsize=(8, 6))
            ax_relationship.scatter(X_train[feature_name], y_train, alpha=0.6, label='Training Data')
            ax_relationship.scatter(X_test[feature_name], y_test, alpha=0.6, label='Test Data', marker='x')
            ax_relationship.set_xlabel(feature_name)
            ax_relationship.set_ylabel(target)
            ax_relationship.set_title(f'Relationship between {feature_name} and {target}')
            ax_relationship.legend()
            ax_relationship.grid(True)
            relationship_plot_image = fig_to_base64(fig_relationship)

        if predict_x_input is not None:
            if len(features) == 1:
                predict_x_val = float(predict_x_input)
                predict_x_df = pd.DataFrame([[predict_x_val]], columns=features)
                predict_x_scaled = scaler.transform(predict_x_df)
                
                predicted_y = model.predict(predict_x_scaled)[0]
                
                distances, indices = model.kneighbors(predict_x_scaled)
                neighbor_X_unscaled = X_train.iloc[indices[0]]
                neighbor_y = y_train.iloc[indices[0]]

                prediction_result = {
                    'x_value': predict_x_val,
                    'y_value': predicted_y,
                }
                
                # Create Prediction Simulation Plot
                fig_pred, ax_pred = plt.subplots(figsize=(8, 6))
                ax_pred.scatter(X_train[features[0]], y_train, alpha=0.3, label='Training Data')
                ax_pred.scatter(neighbor_X_unscaled[features[0]], neighbor_y, color='orange', s=100, marker='D', label=f'{k} Nearest Neighbors', zorder=5)
                ax_pred.scatter([prediction_result['x_value']], [prediction_result['y_value']], color='magenta', s=200, marker='^', label=f'Prediction for X={predict_x_val}', zorder=6, edgecolors='black')
                ax_pred.set_xlabel(features[0])
                ax_pred.set_ylabel(target)
                ax_pred.set_title(f'KNN Prediction Simulation (k={k})')
                ax_pred.legend()
                ax_pred.grid(True)
                prediction_plot_image = fig_to_base64(fig_pred)
            
            else: # Multiple regression prediction
                # Ensure the input dictionary keys match the feature order
                predict_values_ordered = [predict_x_input[f] for f in features]
                predict_x_df = pd.DataFrame([predict_values_ordered], columns=features)
                predict_x_scaled = scaler.transform(predict_x_df)
                predicted_y = model.predict(predict_x_scaled)[0]
                
                prediction_result = {
                    'x_value': predict_x_input,
                    'y_value': predicted_y,
                }


        results['prediction'] = prediction_result
        
        response = {
            'results': results,
            'plot': plot_image,
            'relationship_plot': relationship_plot_image,
            'prediction_plot': prediction_plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

