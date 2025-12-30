#!/usr/bin/env python3
"""
Concentration Analysis Module
Analyze whether performance/outcomes are concentrated in specific areas.
Includes Gini coefficient, HHI, Lorenz curve, concentration ratios, and group comparisons.
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


def calculate_gini(values):
    """Calculate Gini coefficient"""
    values = np.array(values)
    values = values[~np.isnan(values)]
    if len(values) == 0:
        return None
    values = np.sort(values)
    n = len(values)
    cumsum = np.cumsum(values)
    gini = (2 * np.sum((np.arange(1, n + 1) * values))) / (n * np.sum(values)) - (n + 1) / n
    return max(0, min(1, gini))


def calculate_hhi(values):
    """Calculate Herfindahl-Hirschman Index"""
    values = np.array(values)
    values = values[values > 0]
    if len(values) == 0:
        return None
    total = np.sum(values)
    shares = values / total
    hhi = np.sum(shares ** 2)
    return hhi


def calculate_concentration_ratios(values, top_n_list=[1, 3, 5, 10]):
    """Calculate concentration ratios (CR1, CR3, CR5, CR10)"""
    values = np.array(values)
    values = values[~np.isnan(values)]
    values = np.sort(values)[::-1]  # Sort descending
    total = np.sum(values)
    
    ratios = {}
    for n in top_n_list:
        if len(values) >= n:
            ratios[f'CR{n}'] = np.sum(values[:n]) / total if total > 0 else 0
        else:
            ratios[f'CR{n}'] = 1.0  # All values in top n
    return ratios


def calculate_lorenz_curve(values):
    """Calculate Lorenz curve coordinates"""
    values = np.array(values)
    values = values[~np.isnan(values)]
    values = np.sort(values)
    
    n = len(values)
    cumsum = np.cumsum(values)
    total = cumsum[-1]
    
    # Add origin point
    x = np.concatenate([[0], np.arange(1, n + 1) / n])
    y = np.concatenate([[0], cumsum / total])
    
    return x.tolist(), y.tolist()


def calculate_percentile_analysis(values):
    """Calculate percentile-based concentration metrics"""
    values = np.array(values)
    values = values[~np.isnan(values)]
    
    if len(values) == 0:
        return None
    
    percentiles = [10, 25, 50, 75, 90, 95, 99]
    result = {f'p{p}': np.percentile(values, p) for p in percentiles}
    
    # Calculate share of total by percentile groups
    total = np.sum(values)
    sorted_vals = np.sort(values)
    n = len(sorted_vals)
    
    # Bottom 50% vs Top 50%
    mid = n // 2
    result['bottom_50_share'] = np.sum(sorted_vals[:mid]) / total if total > 0 else 0
    result['top_50_share'] = np.sum(sorted_vals[mid:]) / total if total > 0 else 0
    
    # Top 10% share
    top_10_idx = int(n * 0.9)
    result['top_10_share'] = np.sum(sorted_vals[top_10_idx:]) / total if total > 0 else 0
    
    # Top 1% share
    top_1_idx = int(n * 0.99)
    result['top_1_share'] = np.sum(sorted_vals[top_1_idx:]) / total if total > 0 else 0
    
    return result


def calculate_coefficient_of_variation(values):
    """Calculate coefficient of variation"""
    values = np.array(values)
    values = values[~np.isnan(values)]
    
    if len(values) == 0 or np.mean(values) == 0:
        return None
    
    return np.std(values) / np.mean(values)


def interpret_gini(gini):
    """Interpret Gini coefficient"""
    if gini is None:
        return "Unknown"
    if gini < 0.2:
        return "Very Equal"
    elif gini < 0.3:
        return "Relatively Equal"
    elif gini < 0.4:
        return "Moderate Inequality"
    elif gini < 0.5:
        return "High Inequality"
    else:
        return "Very High Inequality"


def interpret_hhi(hhi):
    """Interpret HHI"""
    if hhi is None:
        return "Unknown"
    if hhi < 0.01:
        return "Highly Competitive"
    elif hhi < 0.15:
        return "Unconcentrated"
    elif hhi < 0.25:
        return "Moderate Concentration"
    else:
        return "High Concentration"


def calculate_concentration_indices(df, value_var):
    """Calculate all concentration indices"""
    values = pd.to_numeric(df[value_var], errors='coerce').dropna().values
    
    if len(values) == 0:
        return {'error': 'No valid data'}
    
    gini = calculate_gini(values)
    hhi = calculate_hhi(values)
    cv = calculate_coefficient_of_variation(values)
    cr = calculate_concentration_ratios(values)
    percentiles = calculate_percentile_analysis(values)
    lorenz_x, lorenz_y = calculate_lorenz_curve(values)
    
    # Generate Lorenz curve plot
    plot = None
    try:
        fig, ax = plt.subplots(figsize=(8, 6))
        fig.patch.set_facecolor('white')
        ax.set_facecolor(COLORS['background'])
        
        # Perfect equality line
        ax.plot([0, 1], [0, 1], '--', color=COLORS['muted'], linewidth=2, label='Perfect Equality')
        
        # Lorenz curve
        ax.fill_between(lorenz_x, lorenz_y, [0]*len(lorenz_x), alpha=0.3, color=COLORS['primary'])
        ax.plot(lorenz_x, lorenz_y, '-', color=COLORS['primary'], linewidth=2.5, label=f'Lorenz Curve (Gini={gini:.3f})')
        
        ax.set_xlabel('Cumulative Share of Population', fontsize=11)
        ax.set_ylabel('Cumulative Share of Value', fontsize=11)
        ax.set_title('Lorenz Curve', fontweight='bold', fontsize=12)
        ax.legend(loc='upper left')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except Exception as e:
        pass
    
    return {
        'gini': gini,
        'gini_interpretation': interpret_gini(gini),
        'hhi': hhi,
        'hhi_interpretation': interpret_hhi(hhi),
        'cv': cv,
        'concentration_ratios': cr,
        'percentiles': percentiles,
        'lorenz_x': lorenz_x,
        'lorenz_y': lorenz_y,
        'n': len(values),
        'total': float(np.sum(values)),
        'mean': float(np.mean(values)),
        'std': float(np.std(values)),
        'median': float(np.median(values)),
        'min': float(np.min(values)),
        'max': float(np.max(values)),
        'plot': plot
    }


def calculate_distribution_analysis(df, value_var):
    """Analyze distribution shape and concentration patterns"""
    values = pd.to_numeric(df[value_var], errors='coerce').dropna().values
    
    if len(values) < 3:
        return {'error': 'Insufficient data'}
    
    # Skewness and Kurtosis
    skewness = stats.skew(values)
    kurtosis = stats.kurtosis(values)
    
    # Normality test
    if len(values) <= 5000:
        _, normality_p = stats.shapiro(values)
    else:
        _, normality_p = stats.normaltest(values)
    
    # Generate distribution plot
    plot = None
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        fig.patch.set_facecolor('white')
        
        # Histogram
        ax1 = axes[0]
        ax1.set_facecolor(COLORS['background'])
        ax1.hist(values, bins=30, color=COLORS['primary'], alpha=0.7, edgecolor='white', linewidth=1)
        ax1.axvline(np.mean(values), color=COLORS['warning'], linestyle='--', linewidth=2, label=f'Mean: {np.mean(values):.2f}')
        ax1.axvline(np.median(values), color=COLORS['danger'], linestyle=':', linewidth=2, label=f'Median: {np.median(values):.2f}')
        ax1.set_xlabel(value_var, fontsize=11)
        ax1.set_ylabel('Frequency', fontsize=11)
        ax1.set_title('Distribution', fontweight='bold', fontsize=12)
        ax1.legend(loc='upper right')
        ax1.spines['top'].set_visible(False)
        ax1.spines['right'].set_visible(False)
        
        # Box plot
        ax2 = axes[1]
        ax2.set_facecolor(COLORS['background'])
        bp = ax2.boxplot(values, patch_artist=True, vert=True)
        bp['boxes'][0].set_facecolor(COLORS['primary'])
        bp['boxes'][0].set_alpha(0.7)
        bp['medians'][0].set_color(COLORS['warning'])
        bp['medians'][0].set_linewidth(2)
        ax2.set_ylabel(value_var, fontsize=11)
        ax2.set_title('Box Plot', fontweight='bold', fontsize=12)
        ax2.spines['top'].set_visible(False)
        ax2.spines['right'].set_visible(False)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except Exception as e:
        pass
    
    # Interpret skewness
    if skewness > 1:
        skew_interp = "Highly Right-Skewed (concentrated at low values)"
    elif skewness > 0.5:
        skew_interp = "Moderately Right-Skewed"
    elif skewness > -0.5:
        skew_interp = "Approximately Symmetric"
    elif skewness > -1:
        skew_interp = "Moderately Left-Skewed"
    else:
        skew_interp = "Highly Left-Skewed (concentrated at high values)"
    
    return {
        'skewness': skewness,
        'skewness_interpretation': skew_interp,
        'kurtosis': kurtosis,
        'is_normal': normality_p > 0.05,
        'normality_p': normality_p,
        'plot': plot
    }


def calculate_group_comparison(df, value_var, group_var):
    """Compare concentration across groups"""
    if group_var not in df.columns:
        return {'error': 'Group variable not found'}
    
    groups = df[group_var].dropna().unique()
    group_stats = {}
    
    for group in groups:
        group_data = df[df[group_var] == group]
        values = pd.to_numeric(group_data[value_var], errors='coerce').dropna().values
        
        if len(values) > 0:
            group_stats[str(group)] = {
                'n': len(values),
                'mean': float(np.mean(values)),
                'std': float(np.std(values)),
                'total': float(np.sum(values)),
                'share': float(np.sum(values)),  # Will be normalized later
                'gini': calculate_gini(values),
                'cv': calculate_coefficient_of_variation(values)
            }
    
    # Calculate share of total
    grand_total = sum(g['total'] for g in group_stats.values())
    for group in group_stats:
        group_stats[group]['share'] = group_stats[group]['total'] / grand_total if grand_total > 0 else 0
    
    # ANOVA or Kruskal-Wallis test
    group_values = [pd.to_numeric(df[df[group_var] == g][value_var], errors='coerce').dropna().values 
                    for g in groups if len(pd.to_numeric(df[df[group_var] == g][value_var], errors='coerce').dropna()) > 0]
    
    test_result = None
    if len(group_values) >= 2:
        # Check normality for each group
        all_normal = all(stats.shapiro(g)[1] > 0.05 if len(g) <= 5000 and len(g) >= 3 else False 
                        for g in group_values if len(g) >= 3)
        
        if all_normal and len(group_values) >= 2:
            stat, p_value = stats.f_oneway(*group_values)
            test_used = "ANOVA"
        else:
            stat, p_value = stats.kruskal(*group_values)
            test_used = "Kruskal-Wallis"
        
        test_result = {
            'test_used': test_used,
            'statistic': stat,
            'p_value': p_value,
            'significant': p_value < 0.05
        }
    
    # Generate comparison plot
    plot = None
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        fig.patch.set_facecolor('white')
        
        # Bar chart of means
        ax1 = axes[0]
        ax1.set_facecolor(COLORS['background'])
        group_names = list(group_stats.keys())
        means = [group_stats[g]['mean'] for g in group_names]
        stds = [group_stats[g]['std'] for g in group_names]
        
        crest_colors = [COLORS['primary'], COLORS['secondary'], COLORS['tertiary'], COLORS['quaternary'], COLORS['warning']]
        colors = [crest_colors[i % len(crest_colors)] for i in range(len(group_names))]
        
        bars = ax1.bar(group_names, means, color=colors, alpha=0.85, edgecolor='white', linewidth=1.5, yerr=stds, capsize=5)
        ax1.set_xlabel(group_var, fontsize=11)
        ax1.set_ylabel(f'Mean {value_var}', fontsize=11)
        ax1.set_title('Mean by Group', fontweight='bold', fontsize=12)
        ax1.spines['top'].set_visible(False)
        ax1.spines['right'].set_visible(False)
        
        # Pie chart of shares
        ax2 = axes[1]
        shares = [group_stats[g]['share'] for g in group_names]
        ax2.pie(shares, labels=group_names, autopct='%1.1f%%', colors=colors, 
                startangle=90, explode=[0.02]*len(group_names))
        ax2.set_title('Share of Total', fontweight='bold', fontsize=12)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except Exception as e:
        pass
    
    return {
        'group_stats': group_stats,
        'test_result': test_result,
        'plot': plot
    }


def calculate_pareto_analysis(df, value_var, entity_var=None):
    """Perform Pareto (80/20) analysis"""
    values = pd.to_numeric(df[value_var], errors='coerce').dropna()
    
    if len(values) == 0:
        return {'error': 'No valid data'}
    
    # Sort descending
    sorted_df = df.copy()
    sorted_df[value_var] = pd.to_numeric(sorted_df[value_var], errors='coerce')
    sorted_df = sorted_df.dropna(subset=[value_var])
    sorted_df = sorted_df.sort_values(value_var, ascending=False).reset_index(drop=True)
    
    total = sorted_df[value_var].sum()
    n = len(sorted_df)
    
    # Find what percentage of entities account for 80% of value
    cumsum = sorted_df[value_var].cumsum()
    threshold_80 = total * 0.8
    n_for_80 = (cumsum <= threshold_80).sum() + 1
    pct_for_80 = (n_for_80 / n) * 100
    
    # Find what value the top 20% accounts for
    top_20_n = max(1, int(n * 0.2))
    top_20_value = sorted_df[value_var].head(top_20_n).sum()
    top_20_pct = (top_20_value / total) * 100
    
    # Pareto index (closer to 80 means more concentrated)
    pareto_index = top_20_pct
    
    # Generate Pareto chart
    plot = None
    try:
        fig, ax1 = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor('white')
        ax1.set_facecolor(COLORS['background'])
        
        x = range(len(sorted_df))
        values_sorted = sorted_df[value_var].values
        cumsum_pct = (cumsum / total * 100).values
        
        # Bar chart
        ax1.bar(x, values_sorted, color=COLORS['primary'], alpha=0.7, edgecolor='white', linewidth=0.5)
        ax1.set_xlabel('Rank', fontsize=11)
        ax1.set_ylabel(value_var, fontsize=11, color=COLORS['primary'])
        ax1.tick_params(axis='y', labelcolor=COLORS['primary'])
        
        # Cumulative line
        ax2 = ax1.twinx()
        ax2.plot(x, cumsum_pct, color=COLORS['warning'], linewidth=2.5, label='Cumulative %')
        ax2.axhline(y=80, color=COLORS['danger'], linestyle='--', linewidth=1.5, alpha=0.7, label='80% threshold')
        ax2.set_ylabel('Cumulative %', fontsize=11, color=COLORS['warning'])
        ax2.tick_params(axis='y', labelcolor=COLORS['warning'])
        ax2.set_ylim(0, 105)
        
        ax1.set_title(f'Pareto Analysis (Top {pct_for_80:.1f}% → 80% of value)', fontweight='bold', fontsize=12)
        ax2.legend(loc='center right')
        
        ax1.spines['top'].set_visible(False)
        
        plt.tight_layout()
        plot = fig_to_base64(fig)
    except Exception as e:
        pass
    
    # Interpretation
    if pareto_index >= 80:
        interp = "Extreme Concentration"
        strategy = "Focus resources on top performers; consider diversification to reduce risk"
    elif pareto_index >= 60:
        interp = "High Concentration"
        strategy = "Leverage top contributors while developing mid-tier performers"
    elif pareto_index >= 40:
        interp = "Moderate Concentration"
        strategy = "Balanced approach: maintain top performers, grow emerging contributors"
    else:
        interp = "Low Concentration"
        strategy = "Well-distributed; focus on raising overall performance levels"
    
    return {
        'total': float(total),
        'n': n,
        'pct_for_80': pct_for_80,
        'n_for_80': n_for_80,
        'top_20_pct': top_20_pct,
        'pareto_index': pareto_index,
        'interpretation': interp,
        'strategy': strategy,
        'plot': plot
    }


def generate_overall_conclusion(concentration, distribution, group_comparison, pareto, value_var, group_var):
    """Generate overall concentration analysis conclusion"""
    
    findings = []
    concentration_level = "moderate"
    
    # Gini assessment
    if concentration and concentration.get('gini'):
        gini = concentration['gini']
        if gini >= 0.5:
            concentration_level = "high"
            findings.append({
                'finding': f"High inequality in {value_var} distribution",
                'detail': f"Gini coefficient is {gini:.3f}, indicating {concentration['gini_interpretation'].lower()}",
                'significant': True
            })
        elif gini >= 0.3:
            findings.append({
                'finding': f"Moderate inequality in {value_var} distribution",
                'detail': f"Gini coefficient is {gini:.3f}, indicating {concentration['gini_interpretation'].lower()}",
                'significant': True
            })
        else:
            concentration_level = "low"
            findings.append({
                'finding': f"Relatively equal distribution of {value_var}",
                'detail': f"Gini coefficient is {gini:.3f}, indicating {concentration['gini_interpretation'].lower()}",
                'significant': False
            })
    
    # Pareto assessment
    if pareto and pareto.get('top_20_pct'):
        top_20 = pareto['top_20_pct']
        if top_20 >= 80:
            concentration_level = "high"
            findings.append({
                'finding': "Classic Pareto pattern (80/20 rule)",
                'detail': f"Top 20% accounts for {top_20:.1f}% of total {value_var}",
                'significant': True
            })
        elif top_20 >= 60:
            findings.append({
                'finding': "Moderate concentration in top performers",
                'detail': f"Top 20% accounts for {top_20:.1f}% of total {value_var}",
                'significant': True
            })
        else:
            findings.append({
                'finding': "Well-distributed across entities",
                'detail': f"Top 20% accounts for only {top_20:.1f}% of total {value_var}",
                'significant': False
            })
    
    # Group comparison
    if group_comparison and group_comparison.get('test_result'):
        test = group_comparison['test_result']
        if test['significant']:
            findings.append({
                'finding': f"Significant difference in {value_var} across {group_var} groups",
                'detail': f"{test['test_used']} test: p = {test['p_value']:.4f}",
                'significant': True
            })
        else:
            findings.append({
                'finding': f"No significant difference across {group_var} groups",
                'detail': f"{test['test_used']} test: p = {test['p_value']:.4f}",
                'significant': False
            })
    
    # Distribution shape
    if distribution and distribution.get('skewness'):
        skew = distribution['skewness']
        if abs(skew) > 1:
            findings.append({
                'finding': f"Highly skewed distribution",
                'detail': distribution['skewness_interpretation'],
                'significant': True
            })
    
    # Generate conclusion text
    if concentration_level == "high":
        conclusion = "HIGH CONCENTRATION"
        conclusion_text = f"{value_var} is highly concentrated in a small number of entities. This indicates significant inequality in the distribution, with top performers accounting for a disproportionate share of the total."
    elif concentration_level == "low":
        conclusion = "LOW CONCENTRATION"
        conclusion_text = f"{value_var} is well-distributed across entities. The distribution is relatively equal, suggesting broad participation and balanced contributions."
    else:
        conclusion = "MODERATE CONCENTRATION"
        conclusion_text = f"{value_var} shows moderate concentration. While some inequality exists, it is not extreme. There is a balance between top performers and broader participation."
    
    # Strategy recommendation
    if concentration_level == "high":
        strategy = "Consider diversification strategies to reduce dependency on top performers. Identify factors driving concentration and develop programs to elevate mid-tier contributors."
    elif concentration_level == "low":
        strategy = "Maintain current balanced approach. Focus on raising overall performance levels rather than targeting specific segments."
    else:
        strategy = "Balanced approach recommended: continue supporting top performers while implementing development programs for emerging contributors."
    
    return {
        'conclusion': conclusion,
        'conclusion_text': conclusion_text,
        'concentration_level': concentration_level,
        'findings': findings,
        'strategy': strategy
    }


def run_concentration_analysis(data, value_var, group_var=None, entity_var=None):
    """Main function to run comprehensive concentration analysis"""
    
    df = pd.DataFrame(data)
    
    if value_var not in df.columns:
        return {'error': f'Value variable {value_var} not found in data'}
    
    # Calculate all analyses
    concentration_indices = calculate_concentration_indices(df, value_var)
    distribution_analysis = calculate_distribution_analysis(df, value_var)
    pareto_analysis = calculate_pareto_analysis(df, value_var, entity_var)
    
    group_comparison = None
    if group_var and group_var in df.columns:
        group_comparison = calculate_group_comparison(df, value_var, group_var)
    
    # Generate overall conclusion
    overall_conclusion = generate_overall_conclusion(
        concentration_indices, distribution_analysis, group_comparison, pareto_analysis,
        value_var, group_var
    )
    
    # Summary statistics
    values = pd.to_numeric(df[value_var], errors='coerce').dropna()
    summary_statistics = {
        'n_total': len(df),
        'n_valid': len(values),
        'value_var': value_var,
        'group_var': group_var,
        'entity_var': entity_var
    }
    
    results = {
        'concentration_indices': concentration_indices,
        'distribution_analysis': distribution_analysis,
        'pareto_analysis': pareto_analysis,
        'group_comparison': group_comparison,
        'overall_conclusion': overall_conclusion,
        'summary_statistics': summary_statistics
    }
    
    return to_native_type(results)


if __name__ == '__main__':
    try:
        input_data = json.loads(sys.stdin.read())
        
        data = input_data.get('data', [])
        value_var = input_data.get('value')
        group_var = input_data.get('group')
        entity_var = input_data.get('entity')
        
        if not value_var:
            print(json.dumps({'error': 'Value variable is required'}))
            sys.exit(1)
        
        results = run_concentration_analysis(data, value_var, group_var, entity_var)
        print(json.dumps(results))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)