import sys
import json
import pandas as pd
import numpy as np
from statsmodels.tsa.api import SimpleExpSmoothing, Holt, ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_squared_error
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

def fit_and_evaluate(model_name, model_func, train, test):
    try:
        model_fit = model_func(train).fit()
        forecast = model_fit.forecast(steps=len(test))
        rmse = np.sqrt(mean_squared_error(test, forecast))
        aic = model_fit.aic
        bic = model_fit.bic
        return {
            "Model": model_name,
            "AIC": aic,
            "BIC": bic,
            "RMSE": rmse
        }
    except Exception as e:
        return {
            "Model": model_name,
            "AIC": None,
            "BIC": None,
            "RMSE": None,
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

        models_to_run = {
            "SES": lambda d: SimpleExpSmoothing(d, initialization_method="estimated"),
            "Holt's Linear": lambda d: Holt(d, initialization_method="estimated"),
            "Holt-Winters Add": lambda d: ExponentialSmoothing(d, seasonal_periods=12, trend='add', seasonal='add', initialization_method="estimated"),
            "ARIMA(1,1,1)": lambda d: SARIMAX(d, order=(1,1,1)),
            "SARIMA(1,1,1)(1,1,1)12": lambda d: SARIMAX(d, order=(1,1,1), seasonal_order=(1,1,1,12)),
        }
        
        results = []
        for name, func in models_to_run.items():
            result = fit_and_evaluate(name, func, train, test)
            results.append(result)

        response = {
            "results": results
        }
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
