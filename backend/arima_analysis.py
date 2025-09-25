
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
        if exog_data is not None and not exog_data.empty:
             # Simple forecasting for exog: assume last value persists
             last_exog_values = exog_data.iloc[-1]
             
             # Attempt to infer frequency for forecasting index
             inferred_freq = pd.infer_freq(series.index)
             if not inferred_freq:
                 # If frequency cannot be inferred (e.g., irregular time series), calculate the average difference
                 avg_diff = np.mean(np.diff(series.index.values))
                 forecast_index = [series.index[-1] + (i+1)*avg_diff for i in range(forecast_periods)]
             else:
                 forecast_index = pd.date_range(start=series.index[-1], periods=forecast_periods + 1, freq=inferred_freq)[1:]

             exog_forecast = pd.DataFrame([last_exog_values.values] * forecast_periods, index=forecast_index, columns=exog_cols)


        forecast = model_fit.get_forecast(steps=forecast_periods, exog=exog_forecast)
        forecast_df = forecast.summary_frame(alpha=0.05)
        forecast_df.index.name = 'forecast_date'

        # --- Plotting ---
        fig, axes = plt.subplots(2, 1, figsize=(15, 12))
        
        # Forecast plot
        ax1 = axes[0]
        series.plot(ax=ax1, label='Original')
        forecast_df['mean'].plot(ax=ax1, label='Forecast')
        ax1.fill_between(forecast_df.index,
                         forecast_df['mean_ci_lower'],
                         forecast_df['mean_ci_upper'], color='k', alpha=.15)
        ax1.set_title('Forecast vs Actuals')
        ax1.legend()

        # Diagnostic plots
        # We cannot pass axes to plot_diagnostics, so we generate a separate figure for it and combine.
        # This part is now handled on the frontend to display two separate images.
        diag_fig = model_fit.plot_diagnostics(figsize=(15, 12))
        
        # Save forecast plot
        buf_forecast = io.BytesIO()
        fig.savefig(buf_forecast, format='png')
        plt.close(fig)
        buf_forecast.seek(0)
        forecast_plot_image = base64.b64encode(buf_forecast.read()).decode('utf-8')

        # Save diagnostics plot
        buf_diag = io.BytesIO()
        diag_fig.savefig(buf_diag, format='png')
        plt.close(diag_fig)
        buf_diag.seek(0)
        diag_plot_image = base64.b64encode(buf_diag.read()).decode('utf-8')


        # Prepare results
        summary_obj = model_fit.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })
            
        residuals = model_fit.resid
        residuals_desc = residuals.describe().to_dict()

        response = {
            'results': {
                'summary_data': summary_data,
                'aic': model_fit.aic,
                'bic': model_fit.bic,
                'hqic': model_fit.hqic,
                'forecast': forecast_df.reset_index().to_dict('records'),
                'residuals_summary': residuals_desc,
            },
            'plot': f"data:image/png;base64,{forecast_plot_image}",
            'diagnostics_plot': f"data:image/png;base64,{diag_plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
