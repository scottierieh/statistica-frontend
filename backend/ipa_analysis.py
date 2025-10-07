
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
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

        # --- Data Cleaning ---
        all_cols_for_analysis = [dependent_var] + independent_vars
        df_analysis = df[all_cols_for_analysis].copy()
        
        for col in df_analysis.columns:
            df_analysis[col] = pd.to_numeric(df_analysis[col], errors='coerce')
        
        df_analysis.dropna(inplace=True)
        
        if df_analysis.shape[0] < len(independent_vars) + 2:
            raise ValueError(f"Not enough valid data points for analysis. Need at least {len(independent_vars) + 2} complete rows.")

        # --- Performance Calculation (Mean) ---
        performance = df_analysis[independent_vars].mean()

        # --- Importance Calculation (Correlation) ---
        importance_results = []
        for attr in independent_vars:
            corr, p_value = stats.pearsonr(df_analysis[attr], df_analysis[dependent_var])
            r_squared = corr ** 2
            importance_results.append({
                'Attribute': attr, 'Correlation': corr, 'R_Squared': r_squared, 'P_Value': p_value
            })
        
        df_importance = pd.DataFrame(importance_results)
        total_corr_abs = df_importance['Correlation'].abs().sum()
        df_importance['Relative_Importance'] = (df_importance['Correlation'].abs() / total_corr_abs) * 100 if total_corr_abs > 0 else 0
        
        # --- IPA Matrix Data Preparation ---
        ipa_data = []
        for attr in independent_vars:
            perf = performance.get(attr, 0)
            imp_row = df_importance[df_importance['Attribute'] == attr].iloc[0]
            ipa_data.append({
                'attribute': attr, 'performance': perf, 'importance': imp_row['Correlation'],
                'relative_importance': imp_row['Relative_Importance'], 'r_squared': imp_row['R_Squared']
            })
        
        df_ipa = pd.DataFrame(ipa_data)
        
        # Quadrant Classification
        perf_mean = df_ipa['performance'].mean()
        imp_mean = df_ipa['importance'].mean()
        
        def classify_quadrant(row):
            if row['importance'] >= imp_mean and row['performance'] >= perf_mean: return 'Q1: Keep Up Good Work'
            elif row['importance'] >= imp_mean and row['performance'] < perf_mean: return 'Q2: Concentrate Here'
            elif row['importance'] < imp_mean and row['performance'] < perf_mean: return 'Q3: Low Priority'
            else: return 'Q4: Possible Overkill'
        
        df_ipa['quadrant'] = df_ipa.apply(classify_quadrant, axis=1)
        
        # Advanced Metrics
        max_scale_value = df_analysis[independent_vars].max().max() if not df_analysis[independent_vars].empty else 7
        df_ipa['gap'] = df_ipa['performance'] - (df_ipa['relative_importance'] / df_ipa['relative_importance'].max() * max_scale_value if df_ipa['relative_importance'].max() > 0 else 0)
        df_ipa['priority_score'] = df_ipa['relative_importance'] * (max_scale_value - df_ipa['performance'])
        
        # Statistical Validation
        X = df_analysis[independent_vars]
        y = df_analysis[dependent_var]
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        model = LinearRegression().fit(X_scaled, y)
        
        r2 = model.score(X_scaled, y)
        adj_r2 = 1 - (1 - r2) * (len(y) - 1) / (len(y) - X.shape[1] - 1) if (len(y) - X.shape[1] - 1) > 0 else r2
        
        beta_coefficients = pd.DataFrame({'attribute': independent_vars, 'beta': model.coef_}).sort_values('beta', ascending=False)
        
        validation_results = {
            'r2': r2, 'adj_r2': adj_r2,
            'beta_coefficients': beta_coefficients.to_dict('records')
        }

        # --- Plotting ---
        fig = plt.figure(figsize=(18, 12))
        quadrant_colors = {'Q1: Keep Up Good Work': '#4CAF50', 'Q2: Concentrate Here': '#F44336', 'Q3: Low Priority': '#9E9E9E', 'Q4: Possible Overkill': '#FF9800'}

        # Main IPA Matrix
        ax1 = plt.subplot(2, 3, 1)
        sns.scatterplot(data=df_ipa, x='performance', y='importance', hue='quadrant', palette=quadrant_colors, s=200, alpha=0.7, ax=ax1, edgecolor='black', legend=True)
        for _, row in df_ipa.iterrows(): ax1.text(row['performance'], row['importance'], row['attribute'], ha='center', va='center', fontsize=9, fontweight='bold')
        ax1.axhline(imp_mean, color='k', ls='--'); ax1.axvline(perf_mean, color='k', ls='--')
        ax1.set_title('IPA Matrix - Correlation-Based Importance'); ax1.set_xlabel('Performance'); ax1.set_ylabel('Importance')
        ax1.legend(title='Quadrant')

        # Importance Ranking
        ax2 = plt.subplot(2, 3, 2)
        df_imp_sorted = df_ipa.sort_values('relative_importance', ascending=True)
        colors_imp = [quadrant_colors.get(q, '#cccccc') for q in df_imp_sorted['quadrant']]
        ax2.barh(df_imp_sorted['attribute'], df_imp_sorted['relative_importance'], color=colors_imp); ax2.set_title('Attribute Importance Ranking')

        # Performance Ranking
        ax3 = plt.subplot(2, 3, 3)
        df_perf_sorted = df_ipa.sort_values('performance', ascending=True)
        colors_perf = [quadrant_colors.get(q, '#cccccc') for q in df_perf_sorted['quadrant']]
        ax3.barh(df_perf_sorted['attribute'], df_perf_sorted['performance'], color=colors_perf); ax3.axvline(perf_mean, color='r', ls='--'); ax3.set_title('Attribute Performance Ranking')

        # Bubble Chart
        ax4 = plt.subplot(2, 3, 4)
        scatter = ax4.scatter(df_ipa['performance'], [1]*len(df_ipa), s=df_ipa['r_squared']*1500, c=df_ipa['r_squared'], cmap='viridis', alpha=0.6)
        for _, row in df_ipa.iterrows(): ax4.text(row['performance'], 1, row['attribute'], ha='center', va='center', fontsize=8)
        plt.colorbar(scatter, ax=ax4, label='R²'); ax4.set_title('Performance vs. R² (Bubble Size)')

        # Gap Analysis
        ax5 = plt.subplot(2, 3, 5)
        df_gap_sorted = df_ipa.sort_values('gap')
        colors_gap = ['red' if g < 0 else 'green' for g in df_gap_sorted['gap']]
        ax5.barh(df_gap_sorted['attribute'], df_gap_sorted['gap'], color=colors_gap); ax5.axvline(0, color='k', lw=1); ax5.set_title('Performance-Importance Gap')

        # Correlation Heatmap
        ax6 = plt.subplot(2, 3, 6)
        corr_matrix = df_analysis.corr()[[dependent_var]].sort_values(dependent_var, ascending=False)
        sns.heatmap(corr_matrix, annot=True, fmt='.3f', cmap='RdYlGn', center=0, ax=ax6)
        ax6.set_title(f'Correlation with {dependent_var}')

        plt.tight_layout()
        buf = io.BytesIO(); plt.savefig(buf, format='png'); plt.close(fig); buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        response = {
            'results': {
                'ipa_matrix': df_ipa.to_dict('records'),
                'regression_summary': validation_results,
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
