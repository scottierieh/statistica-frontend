
import sys
import json
import pandas as pd
import numpy as np
from statsmodels.tsa.api import SimpleExpSmoothing, Holt, ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_squared_error, mean_absolute_error
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    return obj

def mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    # Avoid division by zero
    non_zero_mask = y_true != 0
    if not np.any(non_zero_mask):
        return 0.0
    return np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100

def mean_absolute_scaled_error(y_true, y_pred, y_train, seasonality=1):
    mae_pred = mean_absolute_error(y_true, y_pred)
    
    # Naive seasonal forecast on training data
    naive_forecast = y_train[:-seasonality]
    actual_train = y_train[seasonality:]
    mae_naive = mean_absolute_error(actual_train, naive_forecast)

    if mae_naive == 0:
        return np.inf
    return mae_pred / mae_naive


def fit_and_evaluate(model_name, model_func, train, test):
    try:
        model_fit = model_func(train).fit(disp=False)
        forecast_result = model_fit.get_forecast(steps=len(test))
        forecast = forecast_result.predicted_mean
        
        conf_int = forecast_result.conf_int()
        
        rmse = np.sqrt(mean_squared_error(test, forecast))
        mae = mean_absolute_error(test, forecast)
        mape = mean_absolute_percentage_error(test, forecast)
        
        # Using a default seasonality of 1 for MASE for non-seasonal models
        seasonality = 12 if 'SARIMA' in model_name or 'Holt-Winters' in model_name else 1
        mase = mean_absolute_scaled_error(test, forecast, train, seasonality=seasonality)

        coverage = np.mean((test >= conf_int.iloc[:, 0]) & (test <= conf_int.iloc[:, 1])) * 100

        return {
            "Method": model_name,
            "RMSE": _to_native_type(rmse),
            "MAE": _to_native_type(mae),
            "MAPE (%)": _to_native_type(mape),
            "MASE": _to_native_type(mase),
            "Coverage (95% PI)": _to_native_type(coverage)
        }
    except Exception as e:
        return {
            "Method": model_name,
            "RMSE": None, "MAE": None, "MAPE (%)": None, "MASE": None, "Coverage (95% PI)": None,
            "error": str(e)
        }

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        time_col = payload.get('timeCol')
        value_col = payload.get('valueCol')

        if not all([data, time_col, value_col]):
            raise ValueError("Missing 'data', 'timeCol', or 'valueCol'")

        df = pd.DataFrame(data)
        df[time_col] = pd.to_datetime(df[time_col])
        series = df.set_index(time_col)[value_col].dropna()
        
        if len(series) < 24:
            raise ValueError("At least 24 data points are recommended for robust model comparison.")

        # Split data into training and testing sets
        train, test = series[:-12], series[-12:]

        # Define models to run
        models_to_run = {
            "SARIMA": lambda d: SARIMAX(d, order=(1,1,1), seasonal_order=(1,1,1,12), enforce_stationarity=False, enforce_invertibility=False),
            "ETS(A,Ad,A)": lambda d: ExponentialSmoothing(d, seasonal_periods=12, trend='add', seasonal='add', damped_trend=True, initialization_method="estimated"),
            "Simple Exp Smoothing": lambda d: SimpleExpSmoothing(d, initialization_method="estimated"),
            "Holt's Linear": lambda d: Holt(d, initialization_method="estimated"),
            # Naive seasonal model needs to be handled separately as it's not a standard fit/predict model in the same way
        }
        
        results = []
        for name, func in models_to_run.items():
            result = fit_and_evaluate(name, func, train, test)
            results.append(result)

        # Handle Naive Seasonal separately
        try:
            naive_forecast = train.iloc[-12:].values
            naive_rmse = np.sqrt(mean_squared_error(test, naive_forecast))
            naive_mae = mean_absolute_error(test, naive_forecast)
            naive_mape = mean_absolute_percentage_error(test, naive_forecast)
            naive_mase = mean_absolute_scaled_error(test, naive_forecast, train, seasonality=12)
            results.append({
                "Method": "Naive Seasonal", "RMSE": naive_rmse, "MAE": naive_mae, "MAPE (%)": naive_mape, "MASE": naive_mase, "Coverage (95% PI)": None
            })
        except Exception as e:
             results.append({ "Method": "Naive Seasonal", "error": str(e), "RMSE": None, "MAE": None, "MAPE (%)": None, "MASE": None, "Coverage (95% PI)": None })


        response = {
            "results": results
        }
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
