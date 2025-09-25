
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.stats.diagnostic import het_arch
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

        series = pd.to_numeric(pd.Series(data), errors='coerce').dropna()

        if len(series) <= lags:
            raise ValueError("The number of observations must be greater than the number of lags.")

        # Perform ARCH-LM test
        test_result = het_arch(series, nlags=lags)
        lm_stat, p_value, f_stat, f_p_value = test_result
        
        is_significant = p_value < 0.05
        
        interpretation = (
            f"The ARCH-LM test examines whether the variance of the residuals is constant over time. "
            f"With {lags} lags, the test statistic is {lm_stat:.2f} with a p-value of {p_value:.4f}. "
        )
        if is_significant:
            interpretation += "This indicates the presence of ARCH effects in the series, meaning the volatility is not constant and an ARCH/GARCH model may be appropriate."
        else:
            interpretation += "This suggests that there are no significant ARCH effects in the series, and the assumption of constant variance (homoscedasticity) holds."

        # No plot is generated from this script, it's a statistical test.
        # The frontend can create visualizations if needed.
        
        response = {
            'results': {
                'lm_statistic': lm_stat,
                'p_value': p_value,
                'f_statistic': f_stat,
                'f_p_value': f_p_value,
                'lags': lags,
                'is_significant': bool(is_significant),
                'interpretation': interpretation
            },
            'plot': None
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
