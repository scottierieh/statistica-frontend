#!/usr/bin/env python3
"""
Scalability Analysis Module
Analyze whether effects remain consistent when scaled up.
Includes group comparison, interaction regression, non-linear analysis, and marginal effects.
"""

import sys
import os
import warnings

# Suppress all warnings
warnings.filterwarnings('ignore')
os.environ['PYARROW_IGNORE_TIMEZONE'] = '1'

import json
import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import curve_fit
import statsmodels.api as sm
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import base64
from io import BytesIO

# Set matplotlib style safely
try:
    plt.style.use('seaborn-v0_8-whitegrid')
except:
    try:
        plt.style.use('seaborn-whitegrid')
    except:
        pass

# Color scheme - CREST palette
COLORS = {
    'primary': '#2b8c8c',
    'primary_light': '#5fb3b3',
    'secondary': '#3d9a7c',
    'tertiary': '#74b49b',
    'quaternary': '#a7d4c6',
    'muted': '#94a3b8',
    'background': '#f8fafc',
    'warning': '#d4a574',
    'danger': '#c96868'
}


def to_native_type(obj):
    """Convert numpy types to native Python types recursively"""
    if isinstance(obj, dict):
        return {k: to_native_type(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_native_type(v) for v in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return [to_native_type(v) for v in obj.tolist()]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif pd.isna(obj):
        return None
    return obj


def fig_to_base64(fig):
    """Convert matplotlib figure to base64 string"""
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white', edgecolor='none')
    buf.seek(0)
    plot_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return f"data:image/png;base64,{plot_base64}"


def calculate_scale_groups(df, outcome_var, scale_var, n_groups=4):
    """Analyze outcome across scale groups (quartiles)"""
    df_clean = df.copy()
    df_clean[outcome_var] = pd.to_numeric(df_clean[outcome_var], errors='coerce')
    df_clean[scale_var] = pd.to_numeric(df_clean[scale_var], errors='coerce')
    df_clean = df_clean.dropna(subset=[outcome_var, scale_var])
    
    if len(df_clean) < 20:
        return {'error': 'Insufficient data'}
    
    # Create scale groups (quartiles)
    try:
        df_clean['scale_group'] = pd.qcut(df_clean[scale_var], q=n_groups, labels=[f'Q{i+1}' for i in range(n_groups)], duplicates='drop')
    except:
        # Fall back to equal-width bins
        df_clean['scale_group'] = pd.cut(df_clean[scale_var], bins=n_groups, labels=[f'G{i+1}' for i in range(n_groups)])
    
    df_clean = df_clean.dropna(subset=['scale_group'])
    
    # Calculate stats by group
    group_stats = {}
    groups = sorted(df_clean['scale_group'].unique())
    
    for group in groups:
        gdf = df_clean[df_clean['scale_group'] == group]
        values = gdf[outcome_var].values
        scale_values = gdf[scale_var].values
        
        if len(values) > 0:
            group_stats[str(group)] = {
                'n': len(values),
                'outcome_mean': float(np.mean(values)),
                'outcome_std': float(np.std(values)),
                'outcome_median': float(np.median(values)),
                'scale_min': float(np.min(scale_values)),
                'scale_max': float(np.max(scale_values)),
                'scale_mean': float(np.mean(scale_values)),
                'efficiency': float(np.mean(values) / np.mean(scale_values)) if np.mean(scale_values) > 0 else None
            }
    
    # Calculate effect change across groups
    if len(groups) >= 2:
        first_group = str(groups[0])
        last_group = str(groups[-1])
        effect_change = group_stats[last_group]['outcome_mean'] - group_stats[first_group]['outcome_mean']
        effect_change_pct = (effect_change / group_stats[first_group]['outcome_mean'] * 100) if group_stats[first_group]['outcome_mean'] != 0 else 0
        
        # Check if efficiency declines
        first_eff = group_stats[first_group].get('efficiency')
        last_eff = group_stats[last_group].get('efficiency')
        if first_eff and last_eff:
            efficiency_change = (last_eff - first_eff) / first_eff * 100
        else:
            efficiency_change = None
    else:
        effect_change = None
        effect_change_pct = None
        efficiency_change = None
    
    # Statistical test (ANOVA or Kruskal-Wallis)
    group_values = [df_clean[df_clean['scale_group'] == g][outcome_var].values for g in groups]
    group_values = [v for v in group_values if len(v) > 0]
    
    test_result = None
    if len(group_values) >= 2:
        try:
            stat, p_value = stats.kruskal(*group_values)
            test_result = {
                'test_used': 'Kruskal-Wallis',
                'statistic': float(stat),
                'p_value': float(p_value),
                'significant': p_value < 0.05
            }
        except:
            pass
    
    # Generate plot
    plot = None
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        fig.patch.set_facecolor('white')
        
        # Bar chart of means
        ax1 = axes[0]
        ax1.set_facecolor(COLORS['background'])
        group_names = list(group_stats.keys())
        means = [group_stats[g]['outcome_mean'] for g in group_names]
        stds = [group_stats[g]['outcome_std'] for g in group_names]
        
        crest_colors = [COLORS['primary'], COLORS['secondary'], COLORS['tertiary'], COLORS['quaternary']]
        colors = [crest_colors[i % len(crest_colors)] for i in range(len(group_names))]
        
        ax1.bar(group_names, means, color=colors, alpha=0.85, edgecolor='white', linewidth=1.5, yerr=stds, capsize=5)
        ax1.set_xlabel(f'Scale Group ({scale_var})', fontsize=11)
        ax1.set_ylabel(f'Mean {outcome_var}', fontsize=11)
        ax1.set_title('Outcome by Scale Group', fontweight='bold', fontsize=12)
        ax1.spines['top'].set_visible(False)
        ax1.spines['right'].set_visible(False)
        
        # Efficiency plot
        ax2 = axes[1]
        ax2.set_facecolor(COLORS['background'])
        efficiencies = [group_stats[g].get('efficiency', 0) for g in group_names]
        ax2.plot(group_names, efficiencies, 'o-', color=COLORS['primary'], linewidth=2.5, markersize=10)
        ax2.fill_between(group_names, efficiencies, alpha=0.3, color=COLORS['primary'])
        ax2.set_xlabel(f'Scale Group ({scale_var})', fontsize=11)
        ax2.set_ylabel('Efficiency (Outcome/Scale)', fontsize=11)
        ax2.set_title('Efficiency Across Scale', fontweight='bold', fontsize=12)
        ax2.spines['top'].set_visible(False)
        ax2.spines['right'].set_visible(False)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except:
        pass
    
    return {
        'group_stats': group_stats,
        'effect_change': effect_change,
        'effect_change_pct': effect_change_pct,
        'efficiency_change': efficiency_change,
        'test_result': test_result,
        'n_groups': len(groups),
        'plot': plot
    }


def calculate_interaction_regression(df, outcome_var, scale_var, treatment_var):
    """Regression with interaction term to test if effect varies by scale"""
    df_clean = df.copy()
    df_clean[outcome_var] = pd.to_numeric(df_clean[outcome_var], errors='coerce')
    df_clean[scale_var] = pd.to_numeric(df_clean[scale_var], errors='coerce')
    df_clean = df_clean.dropna(subset=[outcome_var, scale_var, treatment_var])
    
    if len(df_clean) < 20:
        return {'error': 'Insufficient data'}
    
    # Create treatment dummy
    treatment_vals = df_clean[treatment_var].unique()
    if len(treatment_vals) != 2:
        return {'error': 'Treatment variable must have exactly 2 levels'}
    
    treatment_val = treatment_vals[1]  # Assume second value is treatment
    control_val = treatment_vals[0]
    df_clean['treatment'] = (df_clean[treatment_var] == treatment_val).astype(int)
    
    # Standardize scale variable for interpretation
    scale_mean = df_clean[scale_var].mean()
    scale_std = df_clean[scale_var].std()
    df_clean['scale_std'] = (df_clean[scale_var] - scale_mean) / scale_std
    
    # Create interaction term
    df_clean['interaction'] = df_clean['treatment'] * df_clean['scale_std']
    
    # Fit model
    X = df_clean[['treatment', 'scale_std', 'interaction']]
    X = sm.add_constant(X)
    y = df_clean[outcome_var]
    
    try:
        model = sm.OLS(y, X).fit()
    except:
        return {'error': 'Model fitting failed'}
    
    # Extract coefficients
    coefficients = {
        'intercept': {
            'estimate': float(model.params['const']),
            'std_err': float(model.bse['const']),
            'p_value': float(model.pvalues['const'])
        },
        'treatment': {
            'estimate': float(model.params['treatment']),
            'std_err': float(model.bse['treatment']),
            'p_value': float(model.pvalues['treatment']),
            'significant': model.pvalues['treatment'] < 0.05,
            'interpretation': 'Main treatment effect at average scale'
        },
        'scale': {
            'estimate': float(model.params['scale_std']),
            'std_err': float(model.bse['scale_std']),
            'p_value': float(model.pvalues['scale_std']),
            'significant': model.pvalues['scale_std'] < 0.05,
            'interpretation': 'Effect of scale on outcome'
        },
        'interaction': {
            'estimate': float(model.params['interaction']),
            'std_err': float(model.bse['interaction']),
            'p_value': float(model.pvalues['interaction']),
            'significant': model.pvalues['interaction'] < 0.05,
            'interpretation': 'How treatment effect changes with scale'
        }
    }
    
    # Interpret interaction
    interaction_coef = coefficients['interaction']['estimate']
    if coefficients['interaction']['significant']:
        if interaction_coef > 0:
            scalability = 'POSITIVE'
            scalability_text = 'Treatment effect INCREASES with scale - good scalability'
        else:
            scalability = 'NEGATIVE'
            scalability_text = 'Treatment effect DECREASES with scale - diminishing returns'
    else:
        scalability = 'NEUTRAL'
        scalability_text = 'Treatment effect remains CONSISTENT across scale - stable scalability'
    
    # Generate interaction plot
    plot = None
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor('white')
        ax.set_facecolor(COLORS['background'])
        
        # Create prediction lines
        scale_range = np.linspace(df_clean['scale_std'].min(), df_clean['scale_std'].max(), 100)
        
        # Control group prediction
        y_control = model.params['const'] + model.params['scale_std'] * scale_range
        # Treatment group prediction
        y_treatment = (model.params['const'] + model.params['treatment'] + 
                      (model.params['scale_std'] + model.params['interaction']) * scale_range)
        
        # Convert back to original scale
        scale_original = scale_range * scale_std + scale_mean
        
        ax.plot(scale_original, y_control, '-', color=COLORS['muted'], linewidth=2.5, label=f'Control ({control_val})')
        ax.plot(scale_original, y_treatment, '-', color=COLORS['primary'], linewidth=2.5, label=f'Treatment ({treatment_val})')
        
        # Add confidence bands
        ax.fill_between(scale_original, y_control - 1.96*model.bse['const'], y_control + 1.96*model.bse['const'], 
                       alpha=0.2, color=COLORS['muted'])
        ax.fill_between(scale_original, y_treatment - 1.96*model.bse['treatment'], y_treatment + 1.96*model.bse['treatment'], 
                       alpha=0.2, color=COLORS['primary'])
        
        ax.set_xlabel(scale_var, fontsize=11)
        ax.set_ylabel(outcome_var, fontsize=11)
        ax.set_title(f'Treatment Effect by Scale\nInteraction: {interaction_coef:.3f} (p={coefficients["interaction"]["p_value"]:.4f})', 
                    fontweight='bold', fontsize=12)
        ax.legend()
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except:
        pass
    
    return {
        'coefficients': coefficients,
        'r_squared': float(model.rsquared),
        'adj_r_squared': float(model.rsquared_adj),
        'scalability': scalability,
        'scalability_text': scalability_text,
        'treatment_label': str(treatment_val),
        'control_label': str(control_val),
        'scale_mean': float(scale_mean),
        'scale_std': float(scale_std),
        'plot': plot
    }


def calculate_nonlinear_analysis(df, outcome_var, scale_var):
    """Fit non-linear models to detect diminishing/increasing returns"""
    df_clean = df.copy()
    df_clean[outcome_var] = pd.to_numeric(df_clean[outcome_var], errors='coerce')
    df_clean[scale_var] = pd.to_numeric(df_clean[scale_var], errors='coerce')
    df_clean = df_clean.dropna(subset=[outcome_var, scale_var])
    
    if len(df_clean) < 20:
        return {'error': 'Insufficient data'}
    
    x = df_clean[scale_var].values
    y = df_clean[outcome_var].values
    
    # Normalize x for numerical stability
    x_min, x_max = x.min(), x.max()
    x_norm = (x - x_min) / (x_max - x_min) if x_max > x_min else x
    
    results = {}
    
    # 1. Linear model: y = a + b*x
    try:
        X_lin = sm.add_constant(x)
        model_lin = sm.OLS(y, X_lin).fit()
        results['linear'] = {
            'r_squared': float(model_lin.rsquared),
            'aic': float(model_lin.aic),
            'bic': float(model_lin.bic),
            'params': {'intercept': float(model_lin.params[0]), 'slope': float(model_lin.params[1])},
            'p_value': float(model_lin.pvalues[1])
        }
    except:
        results['linear'] = {'error': 'Failed'}
    
    # 2. Quadratic model: y = a + b*x + c*x^2
    try:
        X_quad = np.column_stack([np.ones(len(x)), x, x**2])
        model_quad = sm.OLS(y, X_quad).fit()
        results['quadratic'] = {
            'r_squared': float(model_quad.rsquared),
            'aic': float(model_quad.aic),
            'bic': float(model_quad.bic),
            'params': {
                'intercept': float(model_quad.params[0]),
                'linear': float(model_quad.params[1]),
                'quadratic': float(model_quad.params[2])
            },
            'p_value_quadratic': float(model_quad.pvalues[2]),
            'curve_type': 'Concave (Diminishing Returns)' if model_quad.params[2] < 0 else 'Convex (Increasing Returns)'
        }
    except:
        results['quadratic'] = {'error': 'Failed'}
    
    # 3. Logarithmic model: y = a + b*log(x)
    try:
        x_pos = np.maximum(x, 0.001)  # Avoid log(0)
        X_log = np.column_stack([np.ones(len(x)), np.log(x_pos)])
        model_log = sm.OLS(y, X_log).fit()
        results['logarithmic'] = {
            'r_squared': float(model_log.rsquared),
            'aic': float(model_log.aic),
            'bic': float(model_log.bic),
            'params': {'intercept': float(model_log.params[0]), 'log_coef': float(model_log.params[1])},
            'p_value': float(model_log.pvalues[1]),
            'interpretation': 'Diminishing returns (log relationship)'
        }
    except:
        results['logarithmic'] = {'error': 'Failed'}
    
    # 4. Power model: y = a * x^b (using log transformation)
    try:
        x_pos = np.maximum(x, 0.001)
        y_pos = np.maximum(y, 0.001)
        log_x = np.log(x_pos)
        log_y = np.log(y_pos)
        X_pow = sm.add_constant(log_x)
        model_pow = sm.OLS(log_y, X_pow).fit()
        a = np.exp(model_pow.params[0])
        b = model_pow.params[1]
        y_pred_pow = a * (x_pos ** b)
        ss_res = np.sum((y - y_pred_pow) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r2_pow = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        
        results['power'] = {
            'r_squared': float(max(0, r2_pow)),
            'params': {'a': float(a), 'b': float(b)},
            'interpretation': 'Diminishing returns' if b < 1 else ('Constant returns' if b == 1 else 'Increasing returns')
        }
    except:
        results['power'] = {'error': 'Failed'}
    
    # Find best model
    valid_models = {k: v for k, v in results.items() if 'r_squared' in v and v['r_squared'] is not None}
    if valid_models:
        best_model = max(valid_models.keys(), key=lambda k: valid_models[k]['r_squared'])
        best_r2 = valid_models[best_model]['r_squared']
    else:
        best_model = 'linear'
        best_r2 = 0
    
    # Determine pattern
    if 'quadratic' in valid_models and valid_models['quadratic'].get('p_value_quadratic', 1) < 0.05:
        if results['quadratic']['params']['quadratic'] < 0:
            pattern = 'DIMINISHING_RETURNS'
            pattern_text = 'Diminishing returns detected - effect weakens at larger scale'
        else:
            pattern = 'INCREASING_RETURNS'
            pattern_text = 'Increasing returns detected - effect strengthens at larger scale'
    elif best_model == 'logarithmic' and valid_models.get('logarithmic', {}).get('r_squared', 0) > valid_models.get('linear', {}).get('r_squared', 0) + 0.05:
        pattern = 'DIMINISHING_RETURNS'
        pattern_text = 'Logarithmic relationship suggests diminishing returns'
    else:
        pattern = 'LINEAR'
        pattern_text = 'Approximately linear relationship - consistent returns across scale'
    
    # Generate plot
    plot = None
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor('white')
        ax.set_facecolor(COLORS['background'])
        
        # Scatter plot
        ax.scatter(x, y, alpha=0.5, color=COLORS['muted'], s=40, label='Data')
        
        # Sort for line plots
        sort_idx = np.argsort(x)
        x_sorted = x[sort_idx]
        
        # Plot best fitting models
        if 'linear' in valid_models:
            y_lin = results['linear']['params']['intercept'] + results['linear']['params']['slope'] * x_sorted
            ax.plot(x_sorted, y_lin, '--', color=COLORS['muted'], linewidth=2, 
                   label=f'Linear (R²={results["linear"]["r_squared"]:.3f})')
        
        if 'quadratic' in valid_models and 'params' in results['quadratic']:
            p = results['quadratic']['params']
            y_quad = p['intercept'] + p['linear'] * x_sorted + p['quadratic'] * x_sorted**2
            ax.plot(x_sorted, y_quad, '-', color=COLORS['primary'], linewidth=2.5, 
                   label=f'Quadratic (R²={results["quadratic"]["r_squared"]:.3f})')
        
        if 'logarithmic' in valid_models and 'params' in results['logarithmic']:
            x_pos_sorted = np.maximum(x_sorted, 0.001)
            y_log = results['logarithmic']['params']['intercept'] + results['logarithmic']['params']['log_coef'] * np.log(x_pos_sorted)
            ax.plot(x_sorted, y_log, ':', color=COLORS['secondary'], linewidth=2, 
                   label=f'Logarithmic (R²={results["logarithmic"]["r_squared"]:.3f})')
        
        ax.set_xlabel(scale_var, fontsize=11)
        ax.set_ylabel(outcome_var, fontsize=11)
        ax.set_title(f'Non-linear Analysis\nBest fit: {best_model.capitalize()} (R²={best_r2:.3f})', fontweight='bold', fontsize=12)
        ax.legend()
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except:
        pass
    
    return {
        'models': results,
        'best_model': best_model,
        'best_r_squared': best_r2,
        'pattern': pattern,
        'pattern_text': pattern_text,
        'plot': plot
    }


def calculate_marginal_effects(df, outcome_var, scale_var, treatment_var=None):
    """Calculate marginal effects at different scale levels"""
    df_clean = df.copy()
    df_clean[outcome_var] = pd.to_numeric(df_clean[outcome_var], errors='coerce')
    df_clean[scale_var] = pd.to_numeric(df_clean[scale_var], errors='coerce')
    df_clean = df_clean.dropna(subset=[outcome_var, scale_var])
    
    if len(df_clean) < 20:
        return {'error': 'Insufficient data'}
    
    x = df_clean[scale_var].values
    y = df_clean[outcome_var].values
    
    # Fit quadratic model
    X = np.column_stack([np.ones(len(x)), x, x**2])
    try:
        model = sm.OLS(y, X).fit()
    except:
        return {'error': 'Model fitting failed'}
    
    # Calculate marginal effect at different points
    # Marginal effect = dy/dx = b1 + 2*b2*x
    b1 = model.params[1]
    b2 = model.params[2]
    
    percentiles = [10, 25, 50, 75, 90]
    marginal_effects = {}
    
    for p in percentiles:
        x_val = np.percentile(x, p)
        me = b1 + 2 * b2 * x_val
        marginal_effects[f'p{p}'] = {
            'scale_value': float(x_val),
            'marginal_effect': float(me),
            'interpretation': 'Positive' if me > 0 else ('Negative' if me < 0 else 'Zero')
        }
    
    # Find inflection point (where marginal effect = 0)
    if b2 != 0:
        inflection = -b1 / (2 * b2)
        inflection_in_range = x.min() <= inflection <= x.max()
    else:
        inflection = None
        inflection_in_range = False
    
    # Calculate optimal scale (maximizing outcome)
    if b2 < 0:  # Concave - has maximum
        optimal_scale = inflection
        optimal_in_range = inflection_in_range
    else:
        optimal_scale = None
        optimal_in_range = False
    
    # Generate marginal effect plot
    plot = None
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        fig.patch.set_facecolor('white')
        
        # Outcome vs Scale with fitted curve
        ax1 = axes[0]
        ax1.set_facecolor(COLORS['background'])
        ax1.scatter(x, y, alpha=0.4, color=COLORS['muted'], s=30)
        
        x_line = np.linspace(x.min(), x.max(), 100)
        y_line = model.params[0] + model.params[1] * x_line + model.params[2] * x_line**2
        ax1.plot(x_line, y_line, '-', color=COLORS['primary'], linewidth=2.5)
        
        if optimal_scale and optimal_in_range:
            y_opt = model.params[0] + model.params[1] * optimal_scale + model.params[2] * optimal_scale**2
            ax1.axvline(x=optimal_scale, color=COLORS['warning'], linestyle='--', linewidth=2, label=f'Optimal: {optimal_scale:.1f}')
            ax1.scatter([optimal_scale], [y_opt], color=COLORS['warning'], s=100, zorder=5)
        
        ax1.set_xlabel(scale_var, fontsize=11)
        ax1.set_ylabel(outcome_var, fontsize=11)
        ax1.set_title('Outcome vs Scale', fontweight='bold', fontsize=12)
        ax1.legend()
        ax1.spines['top'].set_visible(False)
        ax1.spines['right'].set_visible(False)
        
        # Marginal effect plot
        ax2 = axes[1]
        ax2.set_facecolor(COLORS['background'])
        
        me_line = b1 + 2 * b2 * x_line
        ax2.plot(x_line, me_line, '-', color=COLORS['primary'], linewidth=2.5)
        ax2.axhline(y=0, color=COLORS['danger'], linestyle='--', linewidth=1.5)
        ax2.fill_between(x_line, me_line, 0, where=me_line > 0, alpha=0.3, color=COLORS['primary'])
        ax2.fill_between(x_line, me_line, 0, where=me_line < 0, alpha=0.3, color=COLORS['danger'])
        
        # Mark percentile points
        for p, data in marginal_effects.items():
            ax2.scatter([data['scale_value']], [data['marginal_effect']], color=COLORS['warning'], s=80, zorder=5)
        
        ax2.set_xlabel(scale_var, fontsize=11)
        ax2.set_ylabel('Marginal Effect', fontsize=11)
        ax2.set_title('Marginal Effect Across Scale', fontweight='bold', fontsize=12)
        ax2.spines['top'].set_visible(False)
        ax2.spines['right'].set_visible(False)
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except:
        pass
    
    # Determine scalability recommendation
    me_at_high = marginal_effects['p90']['marginal_effect']
    me_at_low = marginal_effects['p10']['marginal_effect']
    
    if me_at_high < 0 and me_at_low > 0:
        recommendation = 'CAUTION'
        recommendation_text = 'Marginal returns become negative at high scale. Consider optimal scale around the inflection point.'
    elif me_at_high < me_at_low * 0.5 and me_at_high > 0:
        recommendation = 'MODERATE'
        recommendation_text = 'Diminishing marginal returns detected. Scaling up is possible but with reduced efficiency.'
    elif me_at_high >= me_at_low:
        recommendation = 'FAVORABLE'
        recommendation_text = 'Marginal effects stable or increasing. Scaling up should maintain or improve efficiency.'
    else:
        recommendation = 'MODERATE'
        recommendation_text = 'Mixed marginal effects. Careful analysis needed before scaling.'
    
    return {
        'marginal_effects': marginal_effects,
        'coefficients': {
            'intercept': float(model.params[0]),
            'linear': float(b1),
            'quadratic': float(b2)
        },
        'inflection_point': float(inflection) if inflection else None,
        'inflection_in_range': inflection_in_range,
        'optimal_scale': float(optimal_scale) if optimal_scale else None,
        'optimal_in_range': optimal_in_range,
        'recommendation': recommendation,
        'recommendation_text': recommendation_text,
        'plot': plot
    }


def generate_overall_conclusion(scale_groups, interaction, nonlinear, marginal, outcome_var, scale_var):
    """Generate overall scalability conclusion"""
    
    findings = []
    scalability_score = 0  # -2 to +2
    
    # Scale groups analysis
    if scale_groups and not scale_groups.get('error'):
        eff_change = scale_groups.get('efficiency_change')
        if eff_change is not None:
            if eff_change < -20:
                findings.append({
                    'finding': 'Efficiency declines significantly at larger scale',
                    'detail': f'Efficiency changed by {eff_change:.1f}% from smallest to largest group',
                    'impact': 'negative'
                })
                scalability_score -= 1
            elif eff_change > 10:
                findings.append({
                    'finding': 'Efficiency improves at larger scale',
                    'detail': f'Efficiency increased by {eff_change:.1f}% from smallest to largest group',
                    'impact': 'positive'
                })
                scalability_score += 1
            else:
                findings.append({
                    'finding': 'Efficiency remains relatively stable across scale',
                    'detail': f'Efficiency changed by {eff_change:.1f}%',
                    'impact': 'neutral'
                })
    
    # Interaction analysis
    if interaction and not interaction.get('error'):
        if interaction['scalability'] == 'POSITIVE':
            findings.append({
                'finding': 'Treatment effect increases with scale',
                'detail': interaction['scalability_text'],
                'impact': 'positive'
            })
            scalability_score += 1
        elif interaction['scalability'] == 'NEGATIVE':
            findings.append({
                'finding': 'Treatment effect decreases with scale',
                'detail': interaction['scalability_text'],
                'impact': 'negative'
            })
            scalability_score -= 1
        else:
            findings.append({
                'finding': 'Treatment effect is stable across scale',
                'detail': interaction['scalability_text'],
                'impact': 'positive'
            })
            scalability_score += 0.5
    
    # Non-linear analysis
    if nonlinear and not nonlinear.get('error'):
        if nonlinear['pattern'] == 'DIMINISHING_RETURNS':
            findings.append({
                'finding': 'Diminishing returns detected',
                'detail': nonlinear['pattern_text'],
                'impact': 'negative'
            })
            scalability_score -= 0.5
        elif nonlinear['pattern'] == 'INCREASING_RETURNS':
            findings.append({
                'finding': 'Increasing returns detected',
                'detail': nonlinear['pattern_text'],
                'impact': 'positive'
            })
            scalability_score += 1
    
    # Marginal effects
    if marginal and not marginal.get('error'):
        if marginal['recommendation'] == 'FAVORABLE':
            findings.append({
                'finding': 'Marginal effects support scaling',
                'detail': marginal['recommendation_text'],
                'impact': 'positive'
            })
            scalability_score += 0.5
        elif marginal['recommendation'] == 'CAUTION':
            findings.append({
                'finding': 'Marginal effects suggest caution',
                'detail': marginal['recommendation_text'],
                'impact': 'negative'
            })
            scalability_score -= 0.5
    
    # Determine overall conclusion
    if scalability_score >= 1.5:
        conclusion = 'HIGHLY SCALABLE'
        conclusion_text = f'The relationship between {outcome_var} and {scale_var} indicates strong potential for scaling. Effects are maintained or improved at larger scale.'
        recommendation = 'Proceed with scaling. Monitor key metrics but expect consistent or improving returns.'
    elif scalability_score >= 0.5:
        conclusion = 'MODERATELY SCALABLE'
        conclusion_text = f'Scaling shows mixed but generally positive indicators. {outcome_var} effects are largely maintained with some efficiency variations.'
        recommendation = 'Scaling is feasible with careful monitoring. Consider phased approach to validate assumptions.'
    elif scalability_score >= -0.5:
        conclusion = 'LIMITED SCALABILITY'
        conclusion_text = f'Evidence suggests limited scalability. {outcome_var} effects may not fully translate at larger scale.'
        recommendation = 'Exercise caution when scaling. Pilot test at incremental scale levels before full expansion.'
    else:
        conclusion = 'NOT SCALABLE'
        conclusion_text = f'Strong evidence of diminishing returns or negative scaling effects. {outcome_var} outcomes decline significantly at larger scale.'
        recommendation = 'Scaling not recommended without fundamental changes to approach. Focus on optimizing at current scale.'
    
    return {
        'conclusion': conclusion,
        'conclusion_text': conclusion_text,
        'scalability_score': scalability_score,
        'findings': findings,
        'recommendation': recommendation
    }


def run_scalability_analysis(data, outcome_var, scale_var, treatment_var=None):
    """Main function to run comprehensive scalability analysis"""
    
    df = pd.DataFrame(data)
    
    if outcome_var not in df.columns:
        return {'error': f'Outcome variable {outcome_var} not found'}
    if scale_var not in df.columns:
        return {'error': f'Scale variable {scale_var} not found'}
    
    # Run analyses
    scale_groups = calculate_scale_groups(df, outcome_var, scale_var)
    nonlinear = calculate_nonlinear_analysis(df, outcome_var, scale_var)
    marginal = calculate_marginal_effects(df, outcome_var, scale_var)
    
    interaction = None
    if treatment_var and treatment_var in df.columns:
        interaction = calculate_interaction_regression(df, outcome_var, scale_var, treatment_var)
    
    # Generate conclusion
    overall_conclusion = generate_overall_conclusion(
        scale_groups, interaction, nonlinear, marginal, outcome_var, scale_var
    )
    
    # Summary statistics
    values = pd.to_numeric(df[outcome_var], errors='coerce').dropna()
    scale_values = pd.to_numeric(df[scale_var], errors='coerce').dropna()
    
    summary_statistics = {
        'n_total': len(df),
        'n_valid': len(values),
        'outcome_var': outcome_var,
        'scale_var': scale_var,
        'treatment_var': treatment_var,
        'scale_range': [float(scale_values.min()), float(scale_values.max())],
        'scale_mean': float(scale_values.mean())
    }
    
    results = {
        'scale_groups': scale_groups,
        'interaction_analysis': interaction,
        'nonlinear_analysis': nonlinear,
        'marginal_effects': marginal,
        'overall_conclusion': overall_conclusion,
        'summary_statistics': summary_statistics
    }
    
    return to_native_type(results)


if __name__ == '__main__':
    try:
        input_data = json.loads(sys.stdin.read())
        
        data = input_data.get('data', [])
        outcome = input_data.get('outcome')
        scale = input_data.get('scale')
        treatment = input_data.get('treatment')
        
        if not outcome:
            print(json.dumps({'error': 'Outcome variable is required'}))
            sys.exit(1)
        if not scale:
            print(json.dumps({'error': 'Scale variable is required'}))
            sys.exit(1)
        
        results = run_scalability_analysis(data, outcome, scale, treatment)
        print(json.dumps(results))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)