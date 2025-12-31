import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from scipy.stats import skew, kurtosis, mode

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def get_numeric_insights(stats):
    insights = []
    
    # Skewness interpretation
    skewness_val = stats.get('skewness', 0)
    if abs(skewness_val) < 0.5:
        insights.append(f"The data appears to be roughly symmetrical (skewness = {skewness_val:.2f}).")
    elif abs(skewness_val) < 1:
        insights.append(f"The data is moderately skewed (skewness = {skewness_val:.2f}).")
    else:
        insights.append(f"The data is highly skewed (skewness = {skewness_val:.2f}).")
        
    # Coefficient of Variation (CV)
    mean_val = stats.get('mean', 0)
    std_dev = stats.get('stdDev', 0)
    if mean_val != 0:
        cv = (std_dev / mean_val) * 100
        if cv < 15:
            insights.append(f"The standard deviation ({std_dev:.2f}) is low relative to the mean, indicating low variability (CV = {cv:.1f}%).")
        elif cv < 30:
            insights.append(f"The standard deviation ({std_dev:.2f}) indicates moderate variability relative to the mean (CV = {cv:.1f}%).")
        else:
            insights.append(f"The standard deviation ({std_dev:.2f}) is high relative to the mean, indicating high variability (CV = {cv:.1f}%).")
    
    return insights


def get_numeric_stats(series):
    if series.empty: return None, []
    stats = {
        'count': int(series.count()),
        'missing': int(series.isnull().sum()),
        'mean': float(series.mean()),
        'stdDev': float(series.std()),
        'min': float(series.min()),
        'q1': float(series.quantile(0.25)),
        'median': float(series.median()),
        'q3': float(series.quantile(0.75)),
        'max': float(series.max()),
        'skewness': float(skew(series)),
        'kurtosis': float(kurtosis(series)),
    }
    insights = get_numeric_insights(stats)
    return stats, insights

def get_categorical_stats(series):
    if series.empty: return None, []
    freq_table = series.value_counts().reset_index()
    freq_table.columns = ['Value', 'Frequency']
    total = freq_table['Frequency'].sum()
    freq_table['Percentage'] = (freq_table['Frequency'] / total) * 100
    
    summary = {
        'count': int(total),
        'missing': int(series.isnull().sum()),
        'unique': int(series.nunique()),
        'mode': series.mode().iloc[0] if not series.mode().empty else None,
    }

    insights = []
    if not freq_table.empty:
        top_category_pct = freq_table['Percentage'].iloc[0]
        if top_category_pct > 50:
            insights.append(f"The category '{freq_table['Value'].iloc[0]}' is dominant, making up {top_category_pct:.1f}% of the data.")
    
    return {'table': freq_table.to_dict('records'), 'summary': summary}, insights

def create_histogram(series, var_name):
    """Create histogram with KDE for numeric data"""
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.histplot(series, kde=True, ax=ax, color='#1f77b4')
    ax.set_xlabel(var_name, fontsize=12)
    ax.set_ylabel('Frequency', fontsize=12)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def create_boxplot(series, var_name):
    """Create boxplot for numeric data"""
    fig, ax = plt.subplots(figsize=(10, 6))
    bp = sns.boxplot(y=series, ax=ax, color='#bcd4e6')  # Beau blue
    
    # Apply alpha (transparency) to the box patches
    for patch in ax.artists:
        r, g, b, a = patch.get_facecolor()
        patch.set_facecolor((r, g, b, 0.7))  # Set alpha to 0.7
    
    ax.set_ylabel(var_name, fontsize=12)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def create_bar_chart(series, var_name):
    """Create bar chart for categorical data"""
    fig, ax = plt.subplots(figsize=(10, 6))
    top_n = series.value_counts().nlargest(20)
    sns.barplot(x=top_n.values, y=top_n.index, ax=ax, orient='h', palette='crest')
    ax.set_xlabel('Frequency', fontsize=12)
    ax.set_ylabel(var_name, fontsize=12)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def create_pie_chart(series, var_name):
    """Create pie chart for categorical data"""
    fig, ax = plt.subplots(figsize=(10, 6))
    value_counts = series.value_counts().nlargest(10)  # Top 10 categories
    colors = sns.color_palette('vlag', n_colors=len(value_counts))
    
    # Create pie without labels on the chart
    wedges, texts, autotexts = ax.pie(
        value_counts.values, 
        autopct='%1.1f%%',
        colors=colors, 
        startangle=90
    )
    
    # Add legend with labels
    ax.legend(wedges, value_counts.index, 
              title="Categories",
              loc="center left",
              bbox_to_anchor=(1, 0, 0.5, 1))
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def create_donut_chart(series, var_name):
    """Create donut chart for categorical data"""
    fig, ax = plt.subplots(figsize=(10, 6))
    value_counts = series.value_counts().nlargest(10)  # Top 10 categories
    colors = sns.color_palette('vlag', n_colors=len(value_counts))
    
    # Create donut without labels on the chart
    wedges, texts, autotexts = ax.pie(
        value_counts.values, 
        autopct='%1.1f%%', 
        colors=colors, 
        startangle=90
    )
    
    # Draw circle in center to create donut effect
    centre_circle = plt.Circle((0, 0), 0.70, fc='white')
    ax.add_artist(centre_circle)
    
    # Add legend with labels
    ax.legend(wedges, value_counts.index, 
              title="Categories",
              loc="center left",
              bbox_to_anchor=(1, 0, 0.5, 1))
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def create_plots(series, is_numeric, var_name):
    """Create all relevant plots for the data type"""
    plots = {}
    
    if is_numeric:
        plots['histogram'] = create_histogram(series, var_name)
        plots['boxplot'] = create_boxplot(series, var_name)
    else:
        plots['bar'] = create_bar_chart(series, var_name)
        plots['pie'] = create_pie_chart(series, var_name)
        plots['donut'] = create_donut_chart(series, var_name)
    
    return plots

def run_descriptive_stats_analysis(data, variables, group_by_var=None):
    """Main function for descriptive statistics analysis."""
    df = pd.DataFrame(data)
    all_results = {}

    for var in variables:
        if group_by_var and group_by_var not in df.columns:
            all_results[var] = {"error": f"Group By variable '{group_by_var}' not found"}
            continue
        
        # --- Overall (non-grouped) analysis ---
        series = df[var].dropna()
        is_numeric = pd.api.types.is_numeric_dtype(df[var])
        var_result = {}

        if is_numeric:
            numeric_series = pd.to_numeric(series, errors='coerce').dropna()
            if not numeric_series.empty:
                stats, insights = get_numeric_stats(numeric_series)
                plots = create_plots(numeric_series, True, var)
                var_result = {'type': 'numeric', 'stats': stats, 'plots': plots, 'insights': insights}
            else:
                var_result = {'error': 'No numeric data to analyze.'}
        else:
            if not series.empty:
                stats, insights = get_categorical_stats(series)
                plots = create_plots(series, False, var)
                var_result = {'type': 'categorical', **stats, 'plots': plots, 'insights': insights}
            else:
                var_result = {'error': 'No categorical data to analyze.'}
        
        all_results[var] = var_result

        # --- Grouped analysis if requested ---
        if group_by_var:
            grouped = df.groupby(group_by_var)
            grouped_stats = {}
            grouped_table = {}
            
            for name, group in grouped:
                group_series = group[var].dropna()
                
                if is_numeric:
                    numeric_group_series = pd.to_numeric(group_series, errors='coerce').dropna()
                    if not numeric_group_series.empty:
                        stats, _ = get_numeric_stats(numeric_group_series)
                        grouped_stats[str(name)] = stats
                else:
                    if not group_series.empty:
                        stats, _ = get_categorical_stats(group_series)
                        grouped_table[str(name)] = stats['table']
            
            if is_numeric:
                all_results[var]['groupedStats'] = grouped_stats
            else:
                all_results[var]['groupedTable'] = grouped_table

    return {'results': all_results}
