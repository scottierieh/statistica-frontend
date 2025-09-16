
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import statsmodels.api as sm
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
        forecast_periods = int(payload.get('forecastPeriods', 12))

        if not all([data, time_col, value_col, order]):
            raise ValueError("Missing required parameters: data, timeCol, valueCol, or order")

        df = pd.DataFrame(data)
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df = df.dropna(subset=[time_col, value_col]).set_index(time_col).sort_index()

        if len(df) < sum(order):
            raise ValueError("Not enough data to fit the ARIMA model.")

        series = df[value_col]

        # Fit ARIMA model
        model = sm.tsa.arima.model.ARIMA(series, order=order)
        model_fit = model.fit()

        # Generate forecast
        forecast = model_fit.get_forecast(steps=forecast_periods)
        forecast_df = forecast.summary_frame(alpha=0.05)
        forecast_df.index.name = 'forecast_date'

        # Generate diagnostic plots
        fig = model_fit.plot_diagnostics(figsize=(15, 12))
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # Prepare results
        summary_tables = [table.as_html() for table in model_fit.summary().tables]

        response = {
            'results': {
                'summary_html': summary_tables,
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
