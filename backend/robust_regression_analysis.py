
import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
import matplotlib.pyplot as plt
import io
import base64

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
        x_col = payload.get('x_col')
        y_col = payload.get('y_col')

        if not all([data, x_col, y_col]):
            raise ValueError("Missing 'data', 'x_col', or 'y_col'")

        df = pd.DataFrame(data)
        
        X_data = pd.to_numeric(df[x_col], errors='coerce')
        y_data = pd.to_numeric(df[y_col], errors='coerce')
        
        df_clean = pd.concat([X_data, y_data], axis=1).dropna()
        
        X = sm.add_constant(df_clean[x_col])
        y = df_clean[y_col]

        # OLS
        ols_model = sm.OLS(y, X).fit()
        ols_pred = ols_model.get_prediction()
        ols_summary_frame = ols_pred.summary_frame(alpha=0.05)

        # RLM
        rlm_model = sm.RLM(y, X).fit()

        # Plot
        fig, ax = plt.subplots(figsize=(10, 8))
        ax.plot(df_clean[x_col], y, 'o', label='Data')
        ax.plot(df_clean[x_col], ols_model.fittedvalues, 'r-', label='OLS')
        ax.plot(df_clean[x_col], ols_summary_frame['obs_ci_upper'], 'r--')
        ax.plot(df_clean[x_col], ols_summary_frame['obs_ci_lower'], 'r--')
        ax.plot(df_clean[x_col], rlm_model.fittedvalues, 'g.-', label='RLM')
        ax.legend(loc='best')
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)
        ax.set_title('Robust Regression vs. OLS')
        
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        response = {
            'results': {
                'ols': {
                    'params': ols_model.params.tolist(),
                    'bse': ols_model.bse.tolist(),
                    'r_squared': ols_model.rsquared
                },
                'rlm': {
                    'params': rlm_model.params.tolist(),
                    'bse': rlm_model.bse.tolist()
                }
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
