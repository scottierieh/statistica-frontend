
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from scipy import stats
import warnings
import io
import base64

warnings.filterwarnings('ignore')
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

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
        dependent_var = payload.get('dependentVar')
        independent_vars = payload.get('independentVars')

        if not all([data, dependent_var, independent_vars]):
            raise ValueError("Missing data, dependentVar, or independentVars")
        
        df = pd.DataFrame(data)

        # --- Regression Analysis ---
        analysis_data = df[[dependent_var] + independent_vars].dropna()
        if len(analysis_data) < len(independent_vars) + 2:
            raise ValueError("Not enough valid data points for regression analysis.")
            
        X = analysis_data[independent_vars]
        y = analysis_data[dependent_var]
        
        model = LinearRegression()
        model.fit(X, y)
        y_pred = model.predict(X)
        residuals = (y - y_pred).tolist()

        n = len(y)
        k = len(independent_vars)
        r2 = r2_score(y, y_pred)
        adj_r2 = 1 - (1 - r2) * (n - 1) / (n - k - 1) if (n - k - 1) > 0 else 0
        
        mse_model = np.sum((y_pred - y.mean()) ** 2) / k if k > 0 else 0
        mse_residual = np.sum((y - y_pred) ** 2) / (n - k - 1) if (n - k - 1) > 0 else 0
        f_stat = mse_model / mse_residual if mse_residual > 0 else np.inf
        f_pvalue = 1 - stats.f.cdf(f_stat, k, n - k - 1) if k > 0 and (n - k - 1) > 0 else np.nan

        regression_summary = {
            'r2': r2, 'adj_r2': adj_r2, 'f_stat': f_stat, 'f_pvalue': f_pvalue,
            'predictions': y_pred.tolist(), 'residuals': residuals,
        }

        # --- IPA Matrix Calculation ---
        implicit_importance = dict(zip(independent_vars, model.coef_))
        performance = analysis_data[independent_vars].mean().to_dict()
        
        ipa_results_list = []
        for attr in independent_vars:
            ipa_results_list.append({
                'attribute': attr,
                'importance': implicit_importance.get(attr, 0),
                'performance': performance.get(attr, 0)
            })
        
        ipa_df = pd.DataFrame(ipa_results_list)
        
        imp_mean = ipa_df['importance'].mean()
        perf_mean = ipa_df['performance'].mean()
        
        def classify_quadrant(row):
            if row['importance'] >= imp_mean and row['performance'] >= perf_mean:
                return 'Keep Up Good Work'
            elif row['importance'] >= imp_mean and row['performance'] < perf_mean:
                return 'Concentrate Here'
            elif row['importance'] < imp_mean and row['performance'] >= perf_mean:
                return 'Possible Overkill'
            else:
                return 'Low Priority'
        
        ipa_df['quadrant'] = ipa_df.apply(classify_quadrant, axis=1)

        # --- Plotting ---
        fig, ax = plt.subplots(figsize=(10, 8))
        colors = {
            'Keep Up Good Work': '#2E8B57', 'Concentrate Here': '#DC143C',
            'Possible Overkill': '#4169E1', 'Low Priority': '#808080'
        }
        
        for quadrant, color in colors.items():
            data_quad = ipa_df[ipa_df['quadrant'] == quadrant]
            ax.scatter(data_quad['importance'], data_quad['performance'], 
                      c=color, label=quadrant, s=120, alpha=0.8, edgecolors='white', linewidth=1.5)
        
        for idx, row in ipa_df.iterrows():
            ax.annotate(row['attribute'], (row['importance'], row['performance']),
                       xytext=(8, 8), textcoords='offset points', fontsize=9, ha='left', va='bottom')

        ax.axvline(x=imp_mean, color='gray', linestyle='--', alpha=0.7)
        ax.axhline(y=perf_mean, color='gray', linestyle='--', alpha=0.7)
        
        ax.set_xlabel('Derived Importance (Regression Coefficient)', fontsize=12)
        ax.set_ylabel('Performance (Mean Rating)', fontsize=12)
        ax.set_title(f'Importance-Performance Analysis (IPA) Matrix\n(R² = {r2:.3f})', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        # --- Final Response ---
        response = {
            'results': {
                'ipa_matrix': ipa_df.to_dict('records'),
                'regression_summary': regression_summary
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
