
import sys
import json
import numpy as np
import pandas as pd
from scipy.optimize import curve_fit
from scipy import stats
from sklearn.metrics import r2_score
import matplotlib.pyplot as plt
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    elif isinstance(obj, np.ndarray): return obj.tolist()
    return obj

# --- Model Functions ---
def model_exponential(x, a, b):
    return a * np.exp(b * x)

def model_logarithmic(x, a, b):
    return a + b * np.log(x)

def model_power(x, a, b):
    return a * np.power(x, b)
    
def model_sigmoid(x, L, k, x0):
    return L / (1 + np.exp(-k * (x - x0)))

def generate_interpretation(model_type, params, r2, p_values, x_col, y_col):
    param_names = list(params.keys())
    
    # Introduction
    interpretation = f"A nonlinear regression analysis was conducted to examine the {model_type} relationship between '{x_col}' and '{y_col}'. "

    # Model Fit
    r2_percent = r2 * 100
    fit_desc = "excellent" if r2 > 0.9 else "good" if r2 > 0.7 else "moderate" if r2 > 0.5 else "poor"
    interpretation += f"The model demonstrated a {fit_desc} fit, explaining {r2_percent:.1f}% of the variance in '{y_col}' (R² = {r2:.3f}).\n\n"

    # Coefficients
    interpretation += "The estimated parameters for the model are as follows:\n"
    for i, name in enumerate(param_names):
        p_val = p_values[i]
        sig_text = "statistically significant" if p_val < 0.05 else "not statistically significant"
        p_val_text = f"p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
        interpretation += f"- The parameter '{name}' was estimated to be {params[name]:.4f}. This coefficient was {sig_text} ({p_val_text}).\n"
    
    # Conclusion
    interpretation += f"\nIn conclusion, the {model_type} model provides a {fit_desc} approximation of the relationship between the variables, with several significant parameters indicating a reliable fit."
    
    return interpretation


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        x_col = payload.get('x_col')
        y_col = payload.get('y_col')
        model_type = payload.get('model_type', 'exponential')

        if not all([data, x_col, y_col]):
            raise ValueError("Missing 'data', 'x_col', or 'y_col'")

        df = pd.DataFrame(data).dropna(subset=[x_col, y_col])
        x_data = pd.to_numeric(df[x_col], errors='coerce')
        y_data = pd.to_numeric(df[y_col], errors='coerce')
        
        valid_indices = ~np.isnan(x_data) & ~np.isnan(y_data)
        x_data = x_data[valid_indices].values
        y_data = y_data[valid_indices].values

        if len(x_data) < 3:
            raise ValueError("Not enough valid data points for analysis.")

        model_map = {
            'exponential': (model_exponential, [1.0, 0.1]),
            'logarithmic': (model_logarithmic, [1.0, 1.0]),
            'power': (model_power, [1.0, 1.0]),
            'sigmoid': (model_sigmoid, [np.max(y_data), 1.0, np.median(x_data)])
        }
        
        if model_type not in model_map:
            raise ValueError(f"Unknown model type: {model_type}")

        model_func, p0 = model_map[model_type]
        
        if model_type in ['logarithmic', 'power'] and np.any(x_data <= 0):
            raise ValueError(f"{model_type.capitalize()} model requires all x-values to be positive.")

        params_opt, covariance = curve_fit(model_func, x_data, y_data, p0=p0, maxfev=5000)
        
        y_pred = model_func(x_data, *params_opt)
        r2 = r2_score(y_data, y_pred)
        
        # Advanced statistics
        n = len(y_data)
        k = len(params_opt)
        rss = np.sum((y_data - y_pred)**2)
        aic = n * np.log(rss / n) + 2 * k if rss > 0 else -np.inf
        
        # Parameter significance
        std_errs = np.sqrt(np.diag(covariance))
        t_values = params_opt / std_errs
        p_values = [2 * (1 - stats.t.cdf(np.abs(t), n - k)) for t in t_values]

        param_names = {
            'exponential': ['a', 'b'],
            'logarithmic': ['a', 'b'],
            'power': ['a', 'b'],
            'sigmoid': ['L', 'k', 'x0']
        }[model_type]
        
        parameters_dict = dict(zip(param_names, params_opt))
        
        interpretation_text = generate_interpretation(model_type, parameters_dict, r2, p_values, x_col, y_col)

        # --- Plotting ---
        plt.figure(figsize=(8, 6))
        plt.scatter(x_data, y_data, label='Data', alpha=0.6)
        
        x_fit = np.linspace(x_data.min(), x_data.max(), 200)
        y_fit = model_func(x_fit, *params_opt)
        plt.plot(x_fit, y_fit, 'r-', label=f'Fit: {model_type}', linewidth=2)
        
        plt.title(f'Nonlinear Regression ({model_type.capitalize()})')
        plt.xlabel(x_col)
        plt.ylabel(y_col)
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.5)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            "results": {
                "parameters": dict(zip(param_names, params_opt)),
                "standard_errors": dict(zip(param_names, std_errs)),
                "p_values": dict(zip(param_names, p_values)),
                "r_squared": r2,
                "aic": aic,
                "rss": rss,
                "interpretation": interpretation_text,
            },
            "plot": f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
