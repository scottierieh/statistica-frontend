import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.api import SimpleExpSmoothing, Holt, ExponentialSmoothing
import io
import base64
import warnings

warnings.filterwarnings('ignore')

# Set seaborn style globally (consistent with other analyses)
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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
        
        # Parameters for smoothing
        smoothing_type = payload.get('smoothingType', 'simple')
        alpha = payload.get('alpha') # smoothing_level
        beta = payload.get('beta')   # smoothing_trend
        gamma = payload.get('gamma') # smoothing_seasonal
        trend_type = payload.get('trendType', 'add')
        seasonal_type = payload.get('seasonalType', 'add')
        seasonal_periods = payload.get('seasonalPeriods')


        if not all([data, time_col, value_col]):
            raise ValueError("Missing 'data', 'timeCol', or 'valueCol'")

        df = pd.DataFrame(data)
        
        # --- Data Preparation ---
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
        df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        df = df.dropna(subset=[time_col, value_col]).set_index(time_col).sort_index()

        if len(df) < 2:
            raise ValueError("Not enough data for analysis.")

        # --- Exponential Smoothing ---
        series = df[value_col]
        fitted_model = None
        
        if smoothing_type == 'simple':
            model = SimpleExpSmoothing(series, initialization_method="estimated").fit(
                smoothing_level=alpha, optimized=alpha is None
            )
        elif smoothing_type == 'holt':
            model = Holt(series, initialization_method="estimated", trend=trend_type).fit(
                smoothing_level=alpha, smoothing_trend=beta, optimized=alpha is None and beta is None
            )
        elif smoothing_type == 'holt-winters':
            if not seasonal_periods or int(seasonal_periods) < 2:
                raise ValueError("Holt-Winters method requires seasonal periods of at least 2.")
            model = ExponentialSmoothing(
                series, 
                trend=trend_type, 
                seasonal=seasonal_type, 
                seasonal_periods=int(seasonal_periods), 
                initialization_method="estimated"
            ).fit(
                smoothing_level=alpha, smoothing_trend=beta, smoothing_seasonal=gamma, 
                optimized=alpha is None and beta is None and gamma is None
            )
        else:
            raise ValueError(f"Unknown smoothing type: {smoothing_type}")
            
        fitted_values = model.fittedvalues
        
        result_df = df.copy()
        result_df['fitted'] = fitted_values

        # --- Plotting with consistent style ---
        fig, ax = plt.subplots(figsize=(12, 6))
        
        ax.plot(df.index, series, label='Original Series', color='#1f77b4', 
                linewidth=2, alpha=0.6)
        ax.plot(fitted_values.index, fitted_values, label='Fitted Values', 
                color='#ff7f0e', linewidth=2.5, alpha=0.9)
        
        ax.set_xlabel(time_col, fontsize=12)
        ax.set_ylabel(value_col, fontsize=12)
        ax.legend()
        ax.grid(True)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Results ---
        model_params = model.params
        # Remove numpy types from params
        for key, value in model_params.items():
            model_params[key] = _to_native_type(value)

        response = {
            'results': {
                "data": result_df.reset_index().to_dict('records'),
                "model_params": model_params,
                "aic": model.aic,
                "bic": model.bic,
                "aicc": model.aicc,
            },
            'plot': f"data:image/png;base64,{plot_image}",
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
    