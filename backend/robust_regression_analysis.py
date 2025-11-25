import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.robust.norms import HuberT, TukeyBiweight, RamsayE, AndrewWave, Hampel, LeastSquares
from statsmodels.robust.scale import mad, HuberScale
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def get_norm(norm_name):
    """Get the robust norm object by name."""
    norms = {
        'HuberT': HuberT(),
        'TukeyBiweight': TukeyBiweight(),
        'RamsayE': RamsayE(),
        'AndrewWave': AndrewWave(),
        'Hampel': Hampel(),
        'LeastSquares': LeastSquares()
    }
    return norms.get(norm_name, HuberT())

def _generate_interpretation(ols_r2, rlm_pseudo_r2, ols_slope, rlm_slope, ols_intercept, rlm_intercept, 
                             ols_se_slope, rlm_se_slope, x_col, y_col, m_norm, n_obs):
    """Generate detailed interpretation for Robust Regression results in APA format."""
    
    slope_diff = abs(ols_slope - rlm_slope)
    intercept_diff = abs(ols_intercept - rlm_intercept)
    
    # Relative difference for slope
    if abs(ols_slope) > 1e-6:
        relative_diff = (slope_diff / abs(ols_slope)) * 100
    else:
        relative_diff = 0
    
    interpretation_parts = []
    
    # --- Overall Assessment (APA Format) ---
    interpretation_parts.append("**Overall Assessment**")
    
    # Effect size interpretation
    if ols_r2 >= 0.75:
        effect_size = "large"
    elif ols_r2 >= 0.50:
        effect_size = "medium-to-large"
    elif ols_r2 >= 0.25:
        effect_size = "medium"
    else:
        effect_size = "small"
    
    # APA format reporting
    interpretation_parts.append(
        f"→ An ordinary least squares (OLS) regression was conducted to predict {y_col} from {x_col}. "
        f"The model explained {ols_r2*100:.1f}% of the variance, R² = {ols_r2:.2f}, representing a {effect_size} effect size."
    )
    
    interpretation_parts.append(
        f"→ A robust regression using the {m_norm} M-estimator was also fitted for comparison, "
        f"yielding a pseudo R² = {rlm_pseudo_r2:.2f}."
    )
    
    # Coefficient comparison
    interpretation_parts.append(
        f"→ Slope coefficients were compared between methods: OLS (b = {ols_slope:.4f}, SE = {ols_se_slope:.4f}) "
        f"versus RLM (b = {rlm_slope:.4f}, SE = {rlm_se_slope:.4f}), yielding Δb = {slope_diff:.4f}."
    )
    
    # Outlier impact assessment
    if relative_diff > 20:
        interpretation_parts.append(
            f"→ The substantial difference ({relative_diff:.1f}% relative change) indicates significant outlier influence on OLS estimates."
        )
    elif relative_diff > 10:
        interpretation_parts.append(
            f"→ The moderate difference ({relative_diff:.1f}% relative change) suggests some outlier influence on the OLS fit."
        )
    else:
        interpretation_parts.append(
            f"→ The minimal difference ({relative_diff:.1f}% relative change) indicates negligible outlier influence."
        )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # M-estimator explanation
    m_descriptions = {
        'HuberT': "Huber's T provides a balance between efficiency and robustness, suitable for moderate outliers",
        'TukeyBiweight': "Tukey's biweight completely rejects extreme outliers, ideal for heavy contamination",
        'RamsayE': "Ramsay's E offers smooth downweighting of outliers",
        'AndrewWave': "Andrew's Wave function provides strong outlier resistance",
        'Hampel': "Hampel's function uses three-part redescending weights for flexible outlier handling",
        'LeastSquares': "Least Squares (equivalent to OLS) provides no outlier protection"
    }
    interpretation_parts.append(f"→ M-estimator used: {m_descriptions.get(m_norm, m_norm)}")
    
    # Interpretation of slope direction
    if ols_slope > 0:
        interpretation_parts.append(
            f"→ Positive relationship: For each unit increase in {x_col}, {y_col} increases by {abs(ols_slope):.4f} units (OLS estimate)"
        )
    elif ols_slope < 0:
        interpretation_parts.append(
            f"→ Negative relationship: For each unit increase in {x_col}, {y_col} decreases by {abs(ols_slope):.4f} units (OLS estimate)"
        )
    else:
        interpretation_parts.append(f"→ No linear relationship detected between {x_col} and {y_col}")
    
    # Sample size consideration
    if n_obs < 30:
        interpretation_parts.append(f"→ Warning: Small sample size (n = {n_obs}) may limit the effectiveness of robust methods")
    elif n_obs < 100:
        interpretation_parts.append(f"→ Moderate sample size (n = {n_obs}) provides reasonable estimates")
    else:
        interpretation_parts.append(f"→ Adequate sample size (n = {n_obs}) supports reliable robust estimation")
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if relative_diff > 20:
        interpretation_parts.append("→ Significant outlier impact detected - prefer the robust (RLM) estimates for inference")
        interpretation_parts.append("→ Consider investigating the outlying observations for data quality issues")
        interpretation_parts.append("→ Report both OLS and RLM results to show the impact of outliers")
    elif relative_diff > 10:
        interpretation_parts.append("→ Moderate outlier influence - RLM estimates may be more reliable")
        interpretation_parts.append("→ Examine residual plots to identify specific outlying observations")
    else:
        interpretation_parts.append("→ OLS and RLM estimates are similar - either method is appropriate")
        interpretation_parts.append("→ OLS may be preferred for its familiar interpretation and inference properties")
    
    if m_norm == 'LeastSquares':
        interpretation_parts.append("→ Note: LeastSquares norm provides no outlier protection - consider HuberT or TukeyBiweight")
    
    interpretation_parts.append("→ Examine the scatter plot to visually assess the fit of both regression lines")
    
    return "\n".join(interpretation_parts)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        x_col = payload.get('x_col')
        y_col = payload.get('y_col')
        m_norm = payload.get('M', 'HuberT')
        missing = payload.get('missing', 'drop')
        scale_est = payload.get('scale_est', 'mad')
        init_method = payload.get('init', 'ls')

        if not all([data, x_col, y_col]):
            raise ValueError("Missing data, x_col, or y_col")

        df = pd.DataFrame(data)
        
        # Handle missing values
        if missing == 'drop':
            df = df[[x_col, y_col]].dropna()
        
        X = df[x_col].astype(float)
        y = df[y_col].astype(float)
        
        if len(X) < 3:
            raise ValueError("Not enough valid data points for regression.")
        
        # Add constant for intercept
        X_with_const = sm.add_constant(X)
        
        # OLS Regression
        ols_model = sm.OLS(y, X_with_const)
        ols_results = ols_model.fit()
        
        # Robust Regression
        norm = get_norm(m_norm)
        rlm_model = sm.RLM(y, X_with_const, M=norm)
        rlm_results = rlm_model.fit()
        
        # Calculate pseudo R-squared for RLM
        rlm_predictions = rlm_results.predict(X_with_const)
        ss_res = np.sum((y - rlm_predictions) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        rlm_pseudo_r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        # Generate interpretation
        interpretation = _generate_interpretation(
            ols_r2=ols_results.rsquared,
            rlm_pseudo_r2=rlm_pseudo_r2,
            ols_slope=ols_results.params[1],
            rlm_slope=rlm_results.params[1],
            ols_intercept=ols_results.params[0],
            rlm_intercept=rlm_results.params[0],
            ols_se_slope=ols_results.bse[1],
            rlm_se_slope=rlm_results.bse[1],
            x_col=x_col,
            y_col=y_col,
            m_norm=m_norm,
            n_obs=len(X)
        )
        
        results = {
            'ols': {
                'params': ols_results.params.tolist(),
                'bse': ols_results.bse.tolist(),
                'r_squared': ols_results.rsquared,
            },
            'rlm': {
                'params': rlm_results.params.tolist(),
                'bse': rlm_results.bse.tolist(),
                'pseudo_r_squared': rlm_pseudo_r2,
            }
        }
        
        # Create comparison plot
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Scatter plot
        sns.scatterplot(x=X, y=y, alpha=0.6, color='#5B9BD5', ax=ax, label='Data points')
        
        # OLS regression line
        x_range = np.linspace(X.min(), X.max(), 100)
        ols_line = ols_results.params[0] + ols_results.params[1] * x_range
        ax.plot(x_range, ols_line, '--', color='#C44E52', lw=2, label=f'OLS (R² = {ols_results.rsquared:.4f})')
        
        # RLM regression line
        rlm_line = rlm_results.params[0] + rlm_results.params[1] * x_range
        ax.plot(x_range, rlm_line, '-', color='#4C72B0', lw=2, label=f'RLM - {m_norm} (Pseudo R² = {rlm_pseudo_r2:.4f})')
        
        ax.set_xlabel(x_col, fontsize=12)
        ax.set_ylabel(y_col, fontsize=12)
        ax.set_title(f'OLS vs Robust Regression ({m_norm})', fontsize=14, fontweight='bold')
        ax.legend(loc='best')
        
        plt.tight_layout()
        plot_image = fig_to_base64(fig)
        
        response = {
            'results': results,
            'plot': plot_image,
            'interpretation': interpretation
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    