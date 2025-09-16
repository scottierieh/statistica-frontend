
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        time_col = payload.get('timeCol')
        value_col = payload.get('valueCol')
        order = payload.get('order')  # (p, d, q)
        seasonal_order = payload.get('seasonalOrder') # (P, D, Q, s)
        exog_cols = payload.get('exogCols')
        forecast_periods = int(payload.get('forecastPeriods', 12))

        if not all([data, time_col, value_col, order]):
            raise ValueError("Missing required parameters: data, timeCol, valueCol, or order")

        df = pd.DataFrame(data)
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df = df.dropna(subset=[time_col, value_col]).set_index(time_col).sort_index()

        if len(df) < sum(order):
            raise ValueError("Not enough data to fit the ARIMA model.")

        series = df[value_col]
        
        exog_data = None
        if exog_cols and len(exog_cols) > 0:
            exog_data = df[exog_cols]
            # Ensure exog_data is numeric and has no missing values
            for col in exog_cols:
                exog_data[col] = pd.to_numeric(exog_data[col], errors='coerce')
            exog_data = exog_data.dropna()
            
            # Align exog data with series
            series, exog_data = series.align(exog_data, join='inner')
            

        # Fit SARIMAX model
        model = SARIMAX(
            series,
            exog=exog_data,
            order=order,
            seasonal_order=seasonal_order if seasonal_order else (0,0,0,0),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        model_fit = model.fit(disp=False)

        # Generate forecast
        exog_forecast = None
        if exog_data is not None:
             # Simple forecasting for exog: assume last value persists
             last_exog_values = exog_data.iloc[-1]
             exog_forecast_index = pd.date_range(start=series.index[-1] + series.index.freq, periods=forecast_periods, freq=series.index.freq)
             exog_forecast = pd.DataFrame([last_exog_values.values] * forecast_periods, index=exog_forecast_index, columns=exog_cols)


        forecast = model_fit.get_forecast(steps=forecast_periods, exog=exog_forecast)
        forecast_df = forecast.summary_frame(alpha=0.05)
        forecast_df.index.name = 'forecast_date'

        # Generate diagnostic plots
        fig = model_fit.plot_diagnostics(figsize=(15, 12))
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # Prepare results
        summary_obj = model_fit.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })

        response = {
            'results': {
                'summary_data': summary_data,
                'aic': model_fit.aic,
                'bic': model_fit.bic,
                'hqic': model_fit.hqic,
                'forecast': forecast_df.reset_index().to_dict('records')
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()

    