import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.stats.diagnostic import acorr_ljungbox
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
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        value_col = payload.get('valueCol')
        lags = int(payload.get('lags', 10))

        if not data or not value_col:
            raise ValueError("Missing 'data' or 'valueCol'")

        series = pd.Series(data)

        if len(series) <= lags:
            raise ValueError("The number of observations must be greater than the number of lags.")

        # Perform Ljung-Box test
        lb_test_result = acorr_ljungbox(series, lags=[lags], return_df=True)
        lb_stat = lb_test_result['lb_stat'].iloc[0]
        lb_pvalue = lb_test_result['lb_pvalue'].iloc[0]
        
        # For plotting, get p-values for a range of lags
        lags_range = range(1, lags + 1)
        lb_range_result = acorr_ljungbox(series, lags=lags_range, return_df=True)

        # Plotting p-values with consistent style
        fig, ax = plt.subplots(figsize=(10, 5))
        
        ax.plot(lb_range_result.index, lb_range_result['lb_pvalue'], 
                marker='o', linestyle='-', color='#1f77b4', linewidth=2, 
                markersize=6, alpha=0.8, label='P-Value')
        ax.axhline(y=0.05, color='#d62728', linestyle='--', linewidth=2, 
                   label='Significance Level (0.05)')
        
        ax.set_xlabel('Lags', fontsize=12)
        ax.set_ylabel('P-Value', fontsize=12)
        ax.legend()
        ax.grid(True)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'lb_statistic': lb_stat,
                'p_value': lb_pvalue,
                'lags': lags,
                'is_significant': bool(lb_pvalue < 0.05),
                'interpretation': f"The Ljung-Box test statistic for {lags} lags is {lb_stat:.2f} with a p-value of {lb_pvalue:.4f}. {'This suggests that there is significant autocorrelation in the series.' if lb_pvalue < 0.05 else 'This suggests that there is no significant autocorrelation in the series.'}"
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    