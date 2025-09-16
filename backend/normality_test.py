
import sys
import json
import pandas as pd
import numpy as np
import io
import base64
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
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
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        variables = payload.get('variables')
        alpha = payload.get('alpha', 0.05)

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        results = {}

        for var in variables:
            if var not in df.columns:
                results[var] = {"error": f"Variable '{var}' not found in data."}
                continue

            series = df[var].dropna()
            
            if series.empty or len(series) < 3:
                results[var] = {"error": f"Not enough valid data for variable '{var}' (minimum 3 required)."}
                continue
            
            series = pd.to_numeric(series, errors='coerce').dropna()

            if series.empty or len(series) < 3:
                results[var] = {"error": f"No valid numeric data for variable '{var}'."}
                continue
            
            # --- Shapiro-Wilk Test ---
            sw_stat, sw_p = stats.shapiro(series)
            
            # --- Jarque-Bera Test ---
            jb_stat, jb_p = stats.jarque_bera(series)
            
            # --- Interpretation ---
            is_normal_shapiro = sw_p > alpha
            interpretation_text = ""
            if is_normal_shapiro:
                interpretation_text = f"The data for '{var}' does not significantly deviate from a normal distribution (Shapiro-Wilk p > {alpha}). The normality assumption is met."
            else:
                interpretation_text = f"The data for '{var}' significantly deviates from a normal distribution (Shapiro-Wilk p < {alpha}). The normality assumption is not met. Consider using non-parametric tests."


            # --- Plotting ---
            fig, axes = plt.subplots(1, 2, figsize=(10, 5))
            fig.suptitle(f"Normality Analysis for '{var}'", fontsize=14)

            # Histogram
            sns.histplot(series, kde=True, ax=axes[0])
            axes[0].set_title('Histogram with Density Curve')
            
            # Q-Q Plot
            stats.probplot(series, dist="norm", plot=axes[1])
            axes[1].set_title('Q-Q Plot')

            plt.tight_layout(rect=[0, 0, 1, 0.96])
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            plt.close(fig)
            buf.seek(0)
            plot_image = base64.b64encode(buf.read()).decode('utf-8')
            
            results[var] = {
                'shapiro_wilk': {
                    'statistic': sw_stat,
                    'p_value': sw_p
                },
                'jarque_bera': {
                    'statistic': jb_stat,
                    'p_value': jb_p
                },
                'is_normal_shapiro': bool(is_normal_shapiro),
                'is_normal_jarque': bool(jb_p > alpha),
                'interpretation': interpretation_text,
                'plot': f"data:image/png;base64,{plot_image}"
            }
        
        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
