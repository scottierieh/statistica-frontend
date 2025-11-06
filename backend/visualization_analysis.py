
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings
from scipy import stats
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import networkx as nx
from math import pi

warnings.filterwarnings('ignore')

# Set style for better looking plots
sns.set_style("whitegrid")
plt.rcParams['figure.facecolor'] = 'white'
plt.rcParams['axes.facecolor'] = 'white'

def fig_to_base64(fig):
    """Converts a matplotlib figure to a base64 encoded string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

# --- Distribution Charts ---

def plot_histogram(df, config):
    """Create histogram plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 6))
    x_col = config.get('x_col')
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    data_clean = df[x_col].dropna()
    if len(data_clean) == 0: raise ValueError(f"No valid numeric data in column '{x_col}'")
    bins = config.get('bins', min(30, int(np.sqrt(len(data_clean)))))
    sns.histplot(data=data_clean, bins=bins, kde=True, ax=ax)
    ax.set_title(f"Histogram of {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel('Frequency')
    ax.grid(True, alpha=0.3)
    return fig

def plot_density(df, config):
    """Create density plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 6))
    x_col = config.get('x_col')
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    data_clean = df[x_col].dropna()
    if len(data_clean) == 0: raise ValueError(f"No valid numeric data in column '{x_col}'")
    
    group_col = config.get('group_col')
    if group_col and group_col in df.columns:
        clean_df = df[[x_col, group_col]].dropna()
        sns.kdeplot(data=clean_df, x=x_col, hue=group_col, fill=True, alpha=0.5, ax=ax)
    else:
        sns.kdeplot(data=data_clean, fill=True, ax=ax, color='steelblue')
    
    ax.set_title(f"Density Plot of {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel('Density')
    ax.grid(True, alpha=0.3)
    return fig

def plot_box(df, config):
    """Create box plot with improved error handling for grouping."""
    fig, ax = plt.subplots(figsize=(10, 6))
    x_col = config.get('x_col')  # This is the numeric column
    group_col = config.get('group_col') # This is the categorical column for grouping

    if group_col and group_col in df.columns:
        # Box plot with grouping
        if x_col not in df.columns: raise ValueError(f"Numeric column '{x_col}' not found in data")
        if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
        
        clean_df = df[[x_col, group_col]].dropna()
        sns.boxplot(data=clean_df, x=group_col, y=x_col, ax=ax)
        ax.set_title(f"Box Plot of {x_col} by {group_col}", fontsize=14, fontweight='bold')
        if clean_df[group_col].nunique() > 10: plt.xticks(rotation=45, ha='right')
        ax.set_xlabel(group_col)
        ax.set_ylabel(x_col)
    else:
        # Simple box plot for a single numeric variable
        if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
        if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
        data_clean = df[x_col].dropna()
        sns.boxplot(data=data_clean, ax=ax, orient='h')
        ax.set_title(f"Box Plot of {x_col}", fontsize=14, fontweight='bold')
        ax.set_xlabel(x_col)
    
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

def plot_violin(df, config):
    """Create violin plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 6))
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    
    if y_col and y_col in df.columns:
        # Violin plot with grouping
        if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
        if not pd.api.types.is_numeric_dtype(df[y_col]): df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
        clean_df = df[[x_col, y_col]].dropna()
        sns.violinplot(data=clean_df, x=x_col, y=y_col, ax=ax, inner='box')
        ax.set_title(f"Violin Plot of {y_col} by {x_col}", fontsize=14, fontweight='bold')
        if clean_df[x_col].nunique() > 10: plt.xticks(rotation=45, ha='right')
    else:
        # Simple violin plot
        if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
        if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
        data_clean = df[x_col].dropna()
        sns.violinplot(data=data_clean, y=x_col, ax=ax, inner='box', orient='v')
        ax.set_title(f"Violin Plot of {x_col}", fontsize=14, fontweight='bold')
    
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

def plot_ridgeline(df, config):
    """Create ridgeline plot (using joyplot style)"""
    x_col = config.get('x_col')
    y_col = config.get('y_col') # Categorical column for grouping
    
    if not all([x_col in df.columns, y_col in df.columns]):
        raise ValueError(f"Required columns not found in data")

    if not pd.api.types.is_numeric_dtype(df[x_col]):
        df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    
    clean_df = df[[x_col, y_col]].dropna()
    
    # Get unique categories and sort them for better visualization
    categories = clean_df[y_col].unique()
    categories.sort()
    
    # Create figure and axes
    fig, axes = plt.subplots(nrows=len(categories), figsize=(10, 2 * len(categories)), sharex=True)
    
    # Plot KDE for each category
    for i, category in enumerate(categories):
        subset = clean_df[clean_df[y_col] == category]
        sns.kdeplot(data=subset, x=x_col, fill=True, alpha=0.8, ax=axes[i], color=plt.cm.viridis(i/len(categories)))
        axes[i].set_title(category, loc='left', fontsize=12)
        axes[i].set_ylabel('')
        axes[i].set_yticks([])
        axes[i].spines['left'].set_visible(False)
        axes[i].spines['right'].set_visible(False)
        axes[i].spines['top'].set_visible(False)

    # Set common x-axis label on the bottom plot
    axes[-1].set_xlabel(x_col, fontsize=14)
    
    fig.suptitle(f"Ridgeline Plot of {x_col} by {y_col}", fontsize=16, fontweight='bold', y=1.02)
    plt.subplots_adjust(hspace=-0.5) # Overlap the plots
    plt.tight_layout()
    return fig

def plot_ecdf(df, config):
    """Create Empirical Cumulative Distribution Function (ECDF) plot"""
    fig, ax = plt.subplots(figsize=(10, 6))
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    data_clean = df[x_col].dropna()
    
    sns.ecdfplot(data=data_clean, ax=ax, complementary=False, color='steelblue', linewidth=2)
    
    ax.set_title(f"ECDF Plot of {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel('Proportion')
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

def plot_qq(df, config):
    """Create Q-Q Plot (Quantile-Quantile Plot)"""
    fig, ax = plt.subplots(figsize=(10, 6))
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    data_clean = df[x_col].dropna()
    
    stats.probplot(data_clean, dist="norm", plot=ax)
    
    ax.set_title(f"Q-Q Plot of {x_col} (vs Normal Distribution)", fontsize=14, fontweight='bold')
    ax.set_xlabel("Theoretical Quantiles")
    ax.set_ylabel("Sample Quantiles")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

# --- Categorical Charts ---

def plot_bar(df, config):
    """Create bar/column plot (vertical/horizontal) with improved error handling"""
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    chart_type = config.get('chartType', 'bar') # Used for title/orientation logic
    
    # Logic to determine if it's a vertical (column) or horizontal (bar) chart
    is_column = chart_type in ['column', 'stacked-column']
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    if y_col and y_col in df.columns:
        # Standard bar plot with aggregation
        if not pd.api.types.is_numeric_dtype(df[y_col]): df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
        clean_df = df[[x_col, y_col]].dropna()
        agg_df = clean_df.groupby(x_col)[y_col].mean().reset_index()
        
        if is_column:
            sns.barplot(data=agg_df, x=x_col, y=y_col, ax=ax)
        else:
            sns.barplot(data=agg_df, x=y_col, y=x_col, ax=ax)
        
        ax.set_title(f"{chart_type.title()} Chart of {y_col} by {x_col}", fontsize=14, fontweight='bold')
    else:
        # Count plot
        value_counts = df[x_col].value_counts()
        max_bars = config.get('max_bars', 20)
        if len(value_counts) > max_bars: value_counts = value_counts.head(max_bars)
        
        if is_column:
            value_counts.plot(kind='bar', ax=ax, color='steelblue')
            ax.set_xlabel(x_col)
            ax.set_ylabel('Count')
        else:
            value_counts.plot(kind='barh', ax=ax, color='steelblue')
            ax.set_xlabel('Count')
            ax.set_ylabel(x_col)
            ax.invert_yaxis() # To have the largest bar at the top
        
        ax.set_title(f"Count {chart_type.title()} Chart of {x_col}", fontsize=14, fontweight='bold')
    
    if is_column:
        plt.xticks(rotation=45, ha='right')
        ax.grid(True, alpha=0.3, axis='y')
    else:
        ax.grid(True, alpha=0.3, axis='x')
        
    plt.tight_layout()
    return fig

def plot_lollipop(df, config):
    """Create lollipop chart"""
    fig, ax = plt.subplots(figsize=(12, 6))
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    value_counts = df[x_col].value_counts().head(20).sort_values(ascending=True)
    
    ax.hlines(y=value_counts.index, xmin=0, xmax=value_counts.values, color='skyblue')
    ax.plot(value_counts.values, value_counts.index, "o", color='steelblue')
    
    ax.set_title(f"Lollipop Chart of {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel('Count')
    ax.set_ylabel(x_col)
    ax.grid(True, alpha=0.3, axis='x')
    plt.tight_layout()
    return fig

def plot_pareto(df, config):
    """Create Pareto chart (Bar chart + Line chart for cumulative percentage)"""
    fig, ax = plt.subplots(figsize=(12, 6))
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    data_counts = df[x_col].value_counts().sort_values(ascending=False).head(20)
    data_cum_perc = data_counts.cumsum() / data_counts.sum() * 100
    
    # Bar plot (Counts)
    ax.bar(data_counts.index, data_counts.values, color='steelblue')
    ax.set_xlabel(x_col)
    ax.set_ylabel('Frequency', color='steelblue')
    ax.tick_params(axis='y', labelcolor='steelblue')
    
    # Line plot (Cumulative Percentage)
    ax2 = ax.twinx()
    ax2.plot(data_counts.index, data_cum_perc, color='red', marker='o', linestyle='--')
    ax2.set_ylabel('Cumulative Percentage', color='red')
    ax2.tick_params(axis='y', labelcolor='red')
    ax2.set_ylim(0, 105)
    
    # Add cumulative percentage labels
    for i, p in enumerate(data_cum_perc):
        ax2.annotate(f'{p:.0f}%', (data_counts.index[i], p), ha='center', va='bottom', fontsize=9)
        
    ax.set_title(f"Pareto Chart of {x_col}", fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    return fig

def plot_diverging_bar(df, config):
    """Create Diverging Bar Chart (requires a column with values centered around zero)"""
    fig, ax = plt.subplots(figsize=(12, 6))
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    # Assuming the user is selecting a categorical column and we need a metric to diverge
    # For simplicity, we will calculate a 'score' for each category based on a simple metric (e.g., mean of a numeric column)
    # Since we only have x_col (categorical) from the frontend config for this type, we'll use a dummy metric.
    
    # Fallback to a dummy score: mean of a numeric column if available, otherwise just use counts
    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    if numeric_cols:
        metric_col = numeric_cols[0]
        agg_df = df.groupby(x_col)[metric_col].mean().reset_index()
        agg_df.columns = [x_col, 'score']
        # Center the score around the overall mean
        agg_df['score_centered'] = agg_df['score'] - agg_df['score'].mean()
        plot_col = 'score_centered'
        title_suffix = f" (Centered {metric_col} Mean)"
    else:
        # Fallback for count-based data (less meaningful for diverging bar, but prevents error)
        agg_df = df[x_col].value_counts().reset_index()
        agg_df.columns = [x_col, 'score']
        agg_df['score_centered'] = agg_df['score'] - agg_df['score'].mean()
        plot_col = 'score_centered'
        title_suffix = " (Centered Count)"

    agg_df = agg_df.sort_values(plot_col, ascending=False).head(20).sort_values(plot_col, ascending=True)

    # Colors based on positive/negative
    agg_df['color'] = np.where(agg_df[plot_col] < 0, 'indianred', 'steelblue')
    
    ax.hlines(y=agg_df[x_col], xmin=0, xmax=agg_df[plot_col], color=agg_df['color'], alpha=0.8, linewidth=10)
    
    ax.set_title(f"Diverging Bar Chart of {x_col}{title_suffix}", fontsize=14, fontweight='bold')
    ax.set_xlabel(plot_col.replace('_', ' ').title())
    ax.set_ylabel(x_col)
    ax.grid(True, alpha=0.3, axis='x')
    plt.tight_layout()
    return fig

def plot_likert(df, config):
    """Create Likert Scale Chart (Stacked Bar Chart for survey responses)"""
    fig, ax = plt.subplots(figsize=(12, 6))
    x_col = config.get('x_col') # The categorical column containing the Likert statements
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    # Assuming the data is already structured as a survey response where each row is a response
    # and x_col is the question/statement. We need another column for the response category (e.g., 'Strongly Agree').
    # Since the front-end only sends one column, we will assume the data has been pre-pivoted
    # or we will use a dummy response column.
    
    # Fallback: Assume the data has columns that represent the response categories
    # e.g., 'Statement', 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'
    # Since we can't infer this from the single x_col, we will create a dummy example.
    
    # This chart is better handled by a different function if it's a simple count bar.
    # To make it a Likert, we need a second categorical column (the response)
    
    # Since we can't assume the structure, we'll default to a simple bar chart with a Likert-style title.
    return plot_bar(df, {**config, 'chartType': 'bar', 'title_override': f"Likert Scale Chart (Count) of {x_col}"})

def plot_nps(df, config):
    """Create NPS Chart (Net Promoter Score) - a specialized stacked bar/pie"""
    fig, ax = plt.subplots(figsize=(8, 8))
    x_col = config.get('x_col') # The categorical column containing the NPS categories (Promoter, Passive, Detractor)
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    # Assuming the categories are 'Promoter', 'Passive', 'Detractor'
    nps_counts = df[x_col].value_counts()
    
    # Calculate NPS score: %Promoters - %Detractors
    total = nps_counts.sum()
    promoters = nps_counts.get('Promoter', 0)
    detractors = nps_counts.get('Detractor', 0)
    
    nps_score = (promoters / total * 100) - (detractors / total * 100)
    
    # Pie chart representation
    labels = nps_counts.index.tolist()
    sizes = nps_counts.values.tolist()
    colors = ['#00B068', '#FFC900', '#FF3333'] # Green, Yellow, Red for P, N, D
    
    # Map colors to labels
    color_map = {'Promoter': '#00B068', 'Passive': '#FFC900', 'Detractor': '#FF3333'}
    mapped_colors = [color_map.get(label, 'gray') for label in labels]
    
    ax.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=mapped_colors, wedgeprops={'edgecolor': 'black'})
    
    ax.set_title(f"NPS Chart (Score: {nps_score:.0f})", fontsize=14, fontweight='bold')
    plt.tight_layout()
    return fig

def plot_grouped_bar(df, config):
    """Create grouped bar chart with improved error handling"""
    fig, ax = plt.subplots(figsize=(12, 7))
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    group_col = config.get('group_col')
    
    required_cols = [x_col, y_col, group_col]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols: raise ValueError(f"Required columns not found: {missing_cols}")
    
    if not pd.api.types.is_numeric_dtype(df[y_col]): df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    clean_df = df[[x_col, y_col, group_col]].dropna()
    agg_df = clean_df.groupby([x_col, group_col])[y_col].mean().reset_index()
    
    sns.barplot(data=agg_df, x=x_col, y=y_col, hue=group_col, ax=ax)
    
    ax.set_title(f"Grouped Bar Chart: {y_col} by {x_col} and {group_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    if agg_df[x_col].nunique() > 5: plt.xticks(rotation=45, ha='right')
    ax.grid(True, alpha=0.3, axis='y')
    ax.legend(title=group_col, bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    return fig

def plot_stacked_bar(df, config):
    """Create stacked bar/column chart with improved error handling"""
    fig, ax = plt.subplots(figsize=(12, 7))
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    group_col = config.get('group_col')
    chart_type = config.get('chartType', 'stacked-bar')
    
    required_cols = [x_col, y_col, group_col]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols: raise ValueError(f"Required columns not found: {missing_cols}")
    
    if not pd.api.types.is_numeric_dtype(df[y_col]): df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    clean_df = df[[x_col, y_col, group_col]].dropna()
    pivot_df = clean_df.groupby([x_col, group_col])[y_col].sum().unstack(fill_value=0)
    
    if len(pivot_df) > 20: pivot_df = pivot_df.head(20)
    
    if chart_type == 'stacked-column':
        pivot_df.plot(kind='bar', stacked=True, ax=ax, colormap='Set3')
        ax.set_xlabel(x_col)
        ax.set_ylabel(f"Total {y_col}")
        if len(pivot_df) > 5: plt.xticks(rotation=45, ha='right')
        ax.grid(True, alpha=0.3, axis='y')
    else: # stacked-bar (horizontal)
        pivot_df.plot(kind='barh', stacked=True, ax=ax, colormap='Set3')
        ax.set_xlabel(f"Total {y_col}")
        ax.set_ylabel(x_col)
        ax.invert_yaxis()
        ax.grid(True, alpha=0.3, axis='x')
    
    ax.set_title(f"{chart_type.replace('-', ' ').title()}: {y_col} by {x_col} and {group_col}", fontsize=14, fontweight='bold')
    ax.legend(title=group_col, bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    return fig

# --- Part-to-Whole Charts ---

def plot_pie(df, config):
    """Create pie/donut/sunburst/treemap chart (simplified)"""
    fig, ax = plt.subplots(figsize=(10, 8))
    name_col = config.get('name_col')
    value_col = config.get('value_col')
    chart_type = config.get('chartType', 'pie')
    
    if name_col not in df.columns: raise ValueError(f"Column '{name_col}' not found in data")
    
    if value_col and value_col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[value_col]): df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        clean_df = df[[name_col, value_col]].dropna()
        data_agg = clean_df.groupby(name_col)[value_col].sum().sort_values(ascending=False)
    else:
        data_agg = df[name_col].value_counts()
    
    max_slices = config.get('max_slices', 10)
    if len(data_agg) > max_slices:
        others = data_agg[max_slices:].sum()
        data_agg = data_agg[:max_slices]
        if others > 0: data_agg['Others'] = others
    
    colors = plt.cm.Set3(np.linspace(0, 1, len(data_agg)))
    
    # Handle Donut/Pie
    wedgeprops = dict(width=0.5) if chart_type == 'donut' else {}
    
    ax.pie(
        data_agg.values,
        labels=data_agg.index,
        autopct='%1.1f%%',
        startangle=90,
        counterclock=False,
        colors=colors,
        wedgeprops=wedgeprops
    )
    
    title = f"{chart_type.title()} Chart of {name_col}"
    
    # Note: Treemap and Sunburst require more complex libraries (e.g., Plotly, Squarify)
    # Since we are limited to Matplotlib/Seaborn, we will use a pie chart as a fallback visual representation
    # and adjust the title to reflect the user's choice.
    if chart_type in ['treemap', 'sunburst']:
        title += " (Simplified to Pie Chart)"
        
    ax.set_title(title, fontsize=14, fontweight='bold')
    
    if len(data_agg) > 6: ax.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    
    plt.tight_layout()
    return fig

# --- Relationship Charts ---

def plot_scatter(df, config):
    """Create scatter/bubble/regression/hexbin plot (unified)"""
    fig, ax = plt.subplots(figsize=(10, 8))
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    size_col = config.get('size_col')
    chart_type = config.get('chartType', 'scatter')
    
    if x_col not in df.columns or y_col not in df.columns: raise ValueError(f"Required columns not found in data")
    
    for col in [x_col, y_col]:
        if not pd.api.types.is_numeric_dtype(df[col]): df[col] = pd.to_numeric(df[col], errors='coerce')
    
    clean_df = df[[x_col, y_col]].dropna()
    plot_df = clean_df.copy()
    
    group_col = config.get('group_col')
    if group_col and group_col in df.columns:
        plot_df[group_col] = df.loc[clean_df.index, group_col]
    
    if size_col and size_col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[size_col]): df[size_col] = pd.to_numeric(df[size_col], errors='coerce')
        plot_df[size_col] = df.loc[clean_df.index, size_col]
    
    if chart_type == 'hexbin':
        # Hexbin plot
        hb = ax.hexbin(plot_df[x_col], plot_df[y_col], gridsize=20, cmap='viridis')
        cb = fig.colorbar(hb, ax=ax)
        cb.set_label('Count')
        title = f"Hexbin Plot of {y_col} vs {x_col}"
    else:
        # Scatter/Bubble/Regression
        sns.scatterplot(
            data=plot_df, 
            x=x_col, 
            y=y_col, 
            hue=group_col if group_col and group_col in plot_df.columns else None,
            size=size_col if size_col and size_col in plot_df.columns else None,
            sizes=(20, 400) if size_col else None,
            alpha=0.6,
            ax=ax
        )
        
        if config.get('trend_line', False) or chart_type == 'regression':
            sns.regplot(
                data=clean_df, 
                x=x_col, 
                y=y_col, 
                scatter=False, 
                color='red', 
                ax=ax,
                line_kws={'linewidth': 2, 'alpha': 0.7}
            )
        
        title = f"{chart_type.replace('-', ' ').title()} of {y_col} vs {x_col}"
        if ax.get_legend(): ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

def plot_scatter_matrix(df, config):
    """Create Scatter Matrix (Pair Plot)"""
    variables = config.get('variables', [])
    
    if not variables:
        variables = df.select_dtypes(include=[np.number]).columns.tolist()
    
    variables = [v for v in variables if v in df.columns]
    
    if len(variables) < 2:
        raise ValueError("Need at least 2 numeric variables for Scatter Matrix")
    
    plot_df = df[variables].dropna()
    
    # Use seaborn pairplot which is essentially a scatter matrix
    g = sns.pairplot(plot_df)
    
    # Get the figure from the PairGrid
    fig = g.fig
    fig.suptitle("Scatter Matrix (Pair Plot)", fontsize=16, fontweight='bold', y=1.02)
    plt.tight_layout()
    return fig

def plot_heatmap(df, config):
    """Create correlation heatmap"""
    variables = config.get('variables', [])
    
    if not variables:
        variables = df.select_dtypes(include=[np.number]).columns.tolist()
    
    variables = [v for v in variables if v in df.columns]
    
    if len(variables) < 2:
        raise ValueError("Need at least 2 numeric variables for correlation heatmap")
    
    for col in variables:
        if not pd.api.types.is_numeric_dtype(df[col]): df[col] = pd.to_numeric(df[col], errors='coerce')
    
    corr = df[variables].corr()
    fig_size = max(8, len(variables) * 0.8)
    fig, ax = plt.subplots(figsize=(fig_size, fig_size * 0.8))
    
    sns.heatmap(
        corr, 
        annot=True, 
        cmap='coolwarm', 
        fmt=".2f", 
        center=0,
        square=True,
        linewidths=1,
        cbar_kws={"shrink": .8},
        ax=ax
    )
    
    ax.set_title("Correlation Heatmap", fontsize=14, fontweight='bold')
    plt.tight_layout()
    return fig

# --- Time Series / Flow Charts ---

def plot_line(df, config):
    """Create line/area/stream plot (unified)"""
    fig, ax = plt.subplots(figsize=(12, 6))
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    chart_type = config.get('chartType', 'line')
    
    if x_col not in df.columns or y_col not in df.columns: raise ValueError(f"Required columns not found in data")
    if not pd.api.types.is_numeric_dtype(df[y_col]): df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    
    clean_df = df[[x_col, y_col]].dropna()
    
    # Try to convert x_col to datetime for proper sorting
    try:
        clean_df[x_col] = pd.to_datetime(clean_df[x_col])
        clean_df = clean_df.sort_values(x_col)
    except:
        clean_df = clean_df.sort_values(x_col)
    
    group_col = config.get('group_col')
    if group_col and group_col in df.columns:
        plot_df = clean_df.copy()
        plot_df[group_col] = df.loc[clean_df.index, group_col]
        if chart_type == 'area':
            # Stacked area chart for grouped data
            pivot_df = plot_df.groupby([x_col, group_col])[y_col].sum().unstack(fill_value=0)
            pivot_df.plot(kind='area', stacked=True, ax=ax, colormap='Set3')
        elif chart_type == 'stream':
            # Stream graph is complex, falling back to stacked area
            pivot_df = plot_df.groupby([x_col, group_col])[y_col].sum().unstack(fill_value=0)
            pivot_df.plot(kind='area', stacked=True, ax=ax, colormap='Set3')
            ax.set_title(f"Stream Graph (Simplified to Stacked Area) of {y_col} over {x_col}", fontsize=14, fontweight='bold')
        else:
            sns.lineplot(data=plot_df, x=x_col, y=y_col, hue=group_col, marker='o', ax=ax)
    else:
        if chart_type == 'area':
            ax.fill_between(clean_df[x_col], clean_df[y_col].values, alpha=0.3, color='steelblue')
            ax.plot(clean_df[x_col], clean_df[y_col].values, color='steelblue', linewidth=2)
        elif chart_type == 'stream':
            # Stream graph requires multiple series, falling back to simple area
            ax.fill_between(clean_df[x_col], clean_df[y_col].values, alpha=0.3, color='steelblue')
            ax.plot(clean_df[x_col], clean_df[y_col].values, color='steelblue', linewidth=2)
            ax.set_title(f"Stream Graph (Simplified to Area) of {y_col} over {x_col}", fontsize=14, fontweight='bold')
        else:
            sns.lineplot(data=clean_df, x=x_col, y=y_col, marker='o', ax=ax, color='steelblue', linewidth=2)
    
    title = f"{chart_type.replace('-', ' ').title()} of {y_col} vs {x_col}"
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    
    if clean_df[x_col].nunique() > 10 or isinstance(clean_df[x_col].iloc[0], (pd.Timestamp, str)):
        plt.xticks(rotation=45, ha='right')
    
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

def plot_calendar_heatmap(df, config):
    """Create Calendar Heatmap (simplified)"""
    # Requires date column and a value column.
    # Since only 'variables' are passed for heatmap, we'll assume the first is date, second is value
    variables = config.get('variables', [])
    if len(variables) < 2:
        raise ValueError("Calendar Heatmap requires a date column and a value column.")
    
    date_col = variables[0]
    value_col = variables[1]
    
    if not all([date_col in df.columns, value_col in df.columns]):
        raise ValueError(f"Required columns not found in data")

    plot_df = df[[date_col, value_col]].dropna()
    
    try:
        plot_df[date_col] = pd.to_datetime(plot_df[date_col])
    except:
        raise ValueError(f"Column '{date_col}' could not be converted to datetime.")
        
    if not pd.api.types.is_numeric_dtype(plot_df[value_col]):
        plot_df[value_col] = pd.to_numeric(plot_df[value_col], errors='coerce')
        plot_df.dropna(subset=[value_col], inplace=True)
    
    # Aggregate by day
    daily_data = plot_df.set_index(date_col)[value_col].resample('D').mean().fillna(0)
    
    # Create the structure for the heatmap
    daily_data = daily_data.to_frame(name='value')
    daily_data['year'] = daily_data.index.year
    daily_data['month'] = daily_data.index.month
    daily_data['dayofweek'] = daily_data.index.dayofweek # Monday=0, Sunday=6
    daily_data['dayofyear'] = daily_data.index.dayofyear
    daily_data['weekofyear'] = daily_data.index.isocalendar().week.astype(int)
    
    # Filter to one year for simplicity
    year = daily_data['year'].max()
    daily_data = daily_data[daily_data['year'] == year]
    
    # Pivot for heatmap: rows=dayofweek, columns=weekofyear
    heatmap_data = daily_data.pivot_table(index='dayofweek', columns='weekofyear', values='value', aggfunc='mean')
    
    # Reindex to ensure all days of week are present (0-6)
    heatmap_data = heatmap_data.reindex(index=range(7))
    
    fig, ax = plt.subplots(figsize=(15, 5))
    
    sns.heatmap(
        heatmap_data, 
        cmap="YlGnBu", 
        linewidths=0.5, 
        linecolor='lightgray', 
        cbar_kws={'label': value_col}, 
        ax=ax
    )
    
    ax.set_title(f"Calendar Heatmap of {value_col} in {year}", fontsize=14, fontweight='bold')
    ax.set_xlabel('Week of Year')
    ax.set_ylabel('Day of Week')
    ax.set_yticklabels(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], rotation=0)
    plt.tight_layout()
    return fig

# --- Network / Flow Charts (Simplified) ---

def plot_network(df, config):
    """Create Network Graph (simplified to a node-link diagram)"""
    # Requires two columns for source and target nodes (edges)
    if len(df.columns) < 2: raise ValueError("Network Graph requires at least two columns for nodes.")
    
    source_col = df.columns[0]
    target_col = df.columns[1]
    
    plot_df = df[[source_col, target_col]].dropna().head(50) # Limit size for visualization
    
    G = nx.from_pandas_edgelist(plot_df, source=source_col, target=target_col)
    
    fig, ax = plt.subplots(figsize=(10, 10))
    pos = nx.spring_layout(G, k=0.15, iterations=20) # positions for all nodes
    
    # Draw nodes
    nx.draw_networkx_nodes(G, pos, node_size=500, node_color="skyblue", alpha=0.8, ax=ax)
    # Draw edges
    nx.draw_networkx_edges(G, pos, width=1.0, alpha=0.5, ax=ax)
    # Draw labels
    nx.draw_networkx_labels(G, pos, font_size=10, font_family="sans-serif", ax=ax)
    
    ax.set_title(f"Network Graph ({source_col} to {target_col})", fontsize=14, fontweight='bold')
    ax.axis('off')
    plt.tight_layout()
    return fig

def plot_sankey(df, config):
    """Create Sankey Diagram (Simplified to a flow chart representation)"""
    # Sankey requires a dedicated library (e.g., Plotly, Matplotlib's Sankey module which is complex)
    # Falling back to a simplified flow visualization (e.g., a simple bar chart of flow stages)
    
    x_col = config.get('x_col')
    group_col = config.get('group_col')
    y_col = config.get('y_col')
    
    required_cols = [x_col, group_col, y_col]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        # Fallback to a simple count of the first categorical column
        if x_col in df.columns:
            return plot_bar(df, {**config, 'chartType': 'bar', 'title_override': f"Sankey Diagram (Simplified to Bar Chart) of {x_col}"})
        else:
            raise ValueError(f"Sankey requires at least two categorical columns and one value column.")

    # Simplified flow: Grouped Bar Chart to show flow between two stages
    # This is a common simplification when Sankey is unavailable.
    
    fig, ax = plt.subplots(figsize=(12, 7))
    
    if not pd.api.types.is_numeric_dtype(df[y_col]): df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    clean_df = df[[x_col, y_col, group_col]].dropna()
    agg_df = clean_df.groupby([x_col, group_col])[y_col].sum().reset_index()
    
    sns.barplot(data=agg_df, x=x_col, y=y_col, hue=group_col, ax=ax)
    
    ax.set_title(f"Sankey Diagram (Simplified to Grouped Bar) Flow: {y_col} by {x_col} and {group_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(f"Total {y_col}")
    if agg_df[x_col].nunique() > 5: plt.xticks(rotation=45, ha='right')
    ax.grid(True, alpha=0.3, axis='y')
    ax.legend(title=group_col, bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    return fig

def plot_chord(df, config):
    """Create Chord Diagram (Simplified to a Network Graph)"""
    # Chord requires a dedicated library. Falling back to Network Graph.
    
    x_col = config.get('x_col')
    group_col = config.get('group_col')
    
    if not all([x_col in df.columns, group_col in df.columns]):
        raise ValueError(f"Chord Diagram requires two categorical columns.")

    # Treat as a connection list
    plot_df = df[[x_col, group_col]].dropna().head(50)
    
    G = nx.from_pandas_edgelist(plot_df, source=x_col, target=group_col)
    
    fig, ax = plt.subplots(figsize=(10, 10))
    pos = nx.circular_layout(G) # Circular layout for a chord-like feel
    
    # Draw nodes
    nx.draw_networkx_nodes(G, pos, node_size=500, node_color="lightcoral", alpha=0.8, ax=ax)
    # Draw edges
    nx.draw_networkx_edges(G, pos, width=1.0, alpha=0.5, ax=ax)
    # Draw labels
    nx.draw_networkx_labels(G, pos, font_size=10, font_family="sans-serif", ax=ax)
    
    ax.set_title(f"Chord Diagram (Simplified to Circular Network) of {x_col} and {group_col}", fontsize=14, fontweight='bold')
    ax.axis('off')
    plt.tight_layout()
    return fig

def plot_alluvial(df, config):
    """Create Alluvial Diagram (Simplified to a Grouped Bar Chart)"""
    # Alluvial requires a dedicated library (e.g., Plotly, pyalluvial). Falling back to Grouped Bar.
    return plot_sankey(df, {**config, 'chartType': 'alluvial'})

def plot_mosaic(df, config):
    """Create Mosaic Plot (Simplified to a Stacked Bar Chart)"""
    # Mosaic requires a dedicated library (e.g., statsmodels). Falling back to Stacked Bar.
    return plot_stacked_bar(df, {**config, 'chartType': 'stacked-bar'})

# --- Statistical Charts ---

def plot_pca(df, config):
    """Create PCA Plot (Principal Component Analysis)"""
    variables = config.get('variables', df.select_dtypes(include=np.number).columns.tolist())
    variables = [v for v in variables if v in df.columns]
    
    if len(variables) < 2: raise ValueError("PCA requires at least 2 numeric variables.")
    
    plot_df = df[variables].dropna()
    
    # Standardize the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(plot_df)
    
    # Apply PCA
    pca = PCA(n_components=2)
    principal_components = pca.fit_transform(scaled_data)
    
    # Create a DataFrame for plotting
    pca_df = pd.DataFrame(data = principal_components, columns = ['PC1', 'PC2'])
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Plot the first two principal components
    ax.scatter(pca_df['PC1'], pca_df['PC2'], alpha=0.6, color='steelblue')
    
    ax.set_title("PCA Plot (First Two Principal Components)", fontsize=14, fontweight='bold')
    ax.set_xlabel(f"Principal Component 1 ({pca.explained_variance_ratio_[0]*100:.1f}%)")
    ax.set_ylabel(f"Principal Component 2 ({pca.explained_variance_ratio_[1]*100:.1f}%)")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

def plot_scree(df, config):
    """Create Scree Plot (PCA explained variance)"""
    variables = config.get('variables', df.select_dtypes(include=np.number).columns.tolist())
    variables = [v for v in variables if v in df.columns]
    
    if len(variables) < 2: raise ValueError("Scree Plot requires at least 2 numeric variables.")
    
    plot_df = df[variables].dropna()
    
    # Standardize and apply PCA
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(plot_df)
    pca = PCA(n_components=len(variables))
    pca.fit(scaled_data)
    
    explained_variance_ratio = pca.explained_variance_ratio_
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plot explained variance
    components = range(1, len(explained_variance_ratio) + 1)
    ax.plot(components, explained_variance_ratio, marker='o', linestyle='-', color='steelblue')
    
    # Plot cumulative explained variance
    cumulative_variance = np.cumsum(explained_variance_ratio)
    ax.plot(components, cumulative_variance, marker='x', linestyle='--', color='red')
    
    ax.set_title("Scree Plot (Explained Variance)", fontsize=14, fontweight='bold')
    ax.set_xlabel("Principal Component Number")
    ax.set_ylabel("Explained Variance Ratio")
    ax.set_xticks(components)
    ax.legend(['Individual Explained Variance', 'Cumulative Explained Variance'])
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

def plot_cluster(df, config):
    """Create Cluster Plot (K-Means Clustering on first two PCA components)"""
    variables = config.get('variables', df.select_dtypes(include=np.number).columns.tolist())
    variables = [v for v in variables if v in df.columns]
    
    if len(variables) < 2: raise ValueError("Cluster Plot requires at least 2 numeric variables.")
    
    plot_df = df[variables].dropna()
    
    # Standardize and apply PCA
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(plot_df)
    pca = PCA(n_components=2)
    principal_components = pca.fit_transform(scaled_data)
    pca_df = pd.DataFrame(data = principal_components, columns = ['PC1', 'PC2'])
    
    # Apply K-Means Clustering (default to 3 clusters)
    n_clusters = config.get('n_clusters', 3)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(scaled_data)
    
    pca_df['Cluster'] = clusters.astype(str)
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Plot the clusters
    sns.scatterplot(
        data=pca_df, 
        x='PC1', 
        y='PC2', 
        hue='Cluster', 
        palette='viridis', 
        s=100, 
        alpha=0.7, 
        ax=ax
    )
    
    ax.set_title(f"Cluster Plot (K-Means, k={n_clusters})", fontsize=14, fontweight='bold')
    ax.set_xlabel("Principal Component 1")
    ax.set_ylabel("Principal Component 2")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig

# --- Business / Specialized Charts ---

def plot_kpi(df, config):
    """Create KPI Card (Simplified to a single large number)"""
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    data_clean = df[x_col].dropna()
    
    if data_clean.empty: raise ValueError(f"No valid numeric data in column '{x_col}'")
    
    kpi_value = data_clean.mean() # Use mean as the default KPI
    
    fig, ax = plt.subplots(figsize=(6, 4))
    
    # Display the KPI value prominently
    ax.text(0.5, 0.6, f"{kpi_value:,.2f}", 
            fontsize=40, 
            ha='center', 
            va='center', 
            color='darkgreen' if kpi_value >= 0 else 'darkred', 
            fontweight='bold')
            
    ax.text(0.5, 0.2, f"Average {x_col}", 
            fontsize=16, 
            ha='center', 
            va='center', 
            color='gray')
    
    ax.set_title("KPI Card", fontsize=14, fontweight='bold')
    ax.axis('off')
    plt.tight_layout()
    return fig

def plot_bullet(df, config):
    """Create Bullet Chart (Simplified to a bar chart with a target line)"""
    # Requires a value (x_col) and a target (y_col in grouped-bar config)
    x_col = config.get('x_col') # The actual value
    y_col = config.get('y_col') # The target value (re-using grouped-bar config names)
    
    if not all([x_col in df.columns, y_col in df.columns]):
        raise ValueError("Bullet Chart requires two numeric columns: actual value and target value.")

    if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    if not pd.api.types.is_numeric_dtype(df[y_col]): df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
        
    plot_df = df[[x_col, y_col]].dropna()
    
    actual_value = plot_df[x_col].mean()
    target_value = plot_df[y_col].mean()
    
    fig, ax = plt.subplots(figsize=(8, 3))
    
    # Background ranges (simplified to a single range)
    max_val = max(actual_value, target_value) * 1.2
    
    # Performance range (e.g., 80% of max)
    ax.barh([0], [max_val], height=0.5, color='lightgray', alpha=0.5)
    
    # Actual value bar
    ax.barh([0], [actual_value], height=0.3, color='steelblue')
    
    # Target line
    ax.axvline(x=target_value, color='red', linewidth=3, ymin=0.1, ymax=0.9)
    
    ax.set_title("Bullet Chart (Simplified)", fontsize=14, fontweight='bold')
    ax.set_yticks([0])
    ax.set_yticklabels([x_col])
    ax.set_xlim(0, max_val)
    plt.tight_layout()
    return fig

def plot_waterfall(df, config):
    """Create Waterfall Chart (Simplified to a stacked bar chart showing change)"""
    # Requires a categorical column for steps and a numeric column for change
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    if not pd.api.types.is_numeric_dtype(df[x_col]): df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    data_clean = df[x_col].dropna()
    
    # Create dummy steps for a simple waterfall
    steps = [f"Step {i+1}" for i in range(len(data_clean))]
    changes = data_clean.values
    
    # Calculate cumulative values
    data = pd.DataFrame({'step': steps, 'change': changes})
    data['start'] = data['change'].cumsum().shift(1).fillna(0)
    data['end'] = data['start'] + data['change']
    data['is_increase'] = data['change'] > 0
    
    # Add total bar (end of last step)
    total = data['end'].iloc[-1]
    data.loc[len(data)] = {'step': 'Total', 'change': total, 'start': 0, 'end': total, 'is_increase': True}
    
    # Plotting
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plot the 'start' bar (hidden base)
    ax.bar(data['step'], data['start'], color='white', alpha=0)
    
    # Plot the 'change' bar
    for i, row in data.iterrows():
        color = 'green' if row['is_increase'] else 'red'
        if row['step'] == 'Total': color = 'blue'
        
        ax.bar(row['step'], row['change'], bottom=row['start'], color=color, alpha=0.7)
    
    ax.set_title(f"Waterfall Chart (Simplified) of {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel("Steps")
    ax.set_ylabel(x_col)
    plt.xticks(rotation=45, ha='right')
    ax.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    return fig

def plot_funnel(df, config):
    """Create Funnel Chart (Simplified to a proportional bar chart)"""
    # Requires a categorical column for stages and a numeric column for count/value
    x_col = config.get('x_col')
    
    if x_col not in df.columns: raise ValueError(f"Column '{x_col}' not found in data")
    
    # Assuming x_col is the stage/category and we are counting occurrences
    data_counts = df[x_col].value_counts().sort_values(ascending=False)
    
    # Normalize for funnel shape
    max_count = data_counts.max()
    widths = data_counts / max_count
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plotting horizontal bars with decreasing width
    y_pos = np.arange(len(data_counts))
    
    for i, (stage, count) in enumerate(data_counts.items()):
        width = widths.iloc[i]
        
        # Draw the bar centered
        ax.barh(y_pos[i], width, height=0.8, left=(1 - width) / 2, color='steelblue', alpha=0.8)
        
        # Add labels
        ax.text(0.5, y_pos[i], f"{stage} ({count})", ha='center', va='center', color='white', fontweight='bold', fontsize=12)
    
    ax.set_title(f"Funnel Chart (Simplified) of {x_col} Stages", fontsize=14, fontweight='bold')
    ax.set_yticks(y_pos)
    ax.set_yticklabels(data_counts.index)
    ax.set_xlim(0, 1)
    ax.axis('off') # Hide axes for a cleaner funnel look
    plt.tight_layout()
    return fig

# --- Dendrogram ---
def plot_dendrogram(df, config):
    """Create Dendrogram (Hierarchical Clustering)"""
    from scipy.cluster.hierarchy import linkage, dendrogram
    
    variables = config.get('variables', df.select_dtypes(include=np.number).columns.tolist())
    variables = [v for v in variables if v in df.columns]
    
    if len(variables) < 2: raise ValueError("Dendrogram requires at least 2 numeric variables.")
    
    plot_df = df[variables].dropna()
    
    # Perform hierarchical clustering
    Z = linkage(plot_df, method='ward')
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Create the dendrogram
    dendrogram(Z, orientation='top', labels=plot_df.index.astype(str).tolist(), ax=ax)
    
    ax.set_title("Dendrogram (Hierarchical Clustering)", fontsize=14, fontweight='bold')
    ax.set_xlabel("Data Points")
    ax.set_ylabel("Distance")
    plt.tight_layout()
    return fig

# --- Updated Plot Map ---

PLOT_MAP = {
    # Distribution
    'histogram': plot_histogram,
    'density': plot_density,
    'box': plot_box,
    'violin': plot_violin,
    'ridgeline': plot_ridgeline,
    'ecdf': plot_ecdf,
    'qq': plot_qq,
    
    # Categorical
    'bar': plot_bar,
    'column': lambda df, config: plot_bar(df, {**config, 'chartType': 'column'}),
    'lollipop': plot_lollipop,
    'pareto': plot_pareto,
    'diverging_bar': plot_diverging_bar,
    'likert': plot_likert, # Simplified
    'nps': plot_nps,
    
    # Relationship
    'scatter': plot_scatter,
    'regression': lambda df, config: plot_scatter(df, {**config, 'chartType': 'regression', 'trend_line': True}),
    'hexbin': lambda df, config: plot_scatter(df, {**config, 'chartType': 'hexbin'}),
    'bubble': lambda df, config: plot_scatter(df, {**config, 'chartType': 'bubble'}), # plot_scatter handles size_col
    'scatter_matrix': plot_scatter_matrix,
    'heatmap': plot_heatmap, # Correlation Heatmap
    
    # Time Series / Flow
    'line': plot_line,
    'area': lambda df, config: plot_line(df, {**config, 'chartType': 'area'}),
    'stream': lambda df, config: plot_line(df, {**config, 'chartType': 'stream'}), # Simplified
    'calendar_heatmap': plot_calendar_heatmap, # Simplified
    
    # Grouped/Stacked
    'grouped-bar': plot_grouped_bar,
    'stacked-bar': plot_stacked_bar,
    'stacked-column': lambda df, config: plot_stacked_bar(df, {**config, 'chartType': 'stacked-column'}),
    
    # Part-to-Whole
    'pie': plot_pie,
    'donut': lambda df, config: plot_pie(df, {**config, 'chartType': 'donut'}),
    'treemap': lambda df, config: plot_pie(df, {**config, 'chartType': 'treemap'}), # Simplified
    'sunburst': lambda df, config: plot_pie(df, {**config, 'chartType': 'sunburst'}), # Simplified
    
    # Flow / Network
    'sankey': plot_sankey, # Simplified
    'chord': plot_chord, # Simplified
    'alluvial': lambda df, config: plot_sankey(df, {**config, 'chartType': 'alluvial'}), # Simplified
    'network': plot_network, # Simplified
    
    # Statistical
    'pca': plot_pca,
    'scree': plot_scree,
    'cluster': plot_cluster,
    'dendrogram': plot_dendrogram,
    'mosaic': plot_mosaic, # Simplified
    
    # Business
    'kpi': plot_kpi,
    'bullet': plot_bullet, # Simplified
    'waterfall': plot_waterfall, # Simplified
    'funnel': plot_funnel, # Simplified
}

# --- Main Execution Logic (Copied from original file) ---

def validate_data(df):
    """Validate the input dataframe"""
    if df.empty:
        raise ValueError("DataFrame is empty")
    
    if len(df) < 2:
        raise ValueError("DataFrame has less than 2 rows - insufficient for visualization")
    
    return True

def main():
    try:
        # Read input
        payload = json.load(sys.stdin)
        data = payload.get('data')
        chart_type = payload.get('chartType', '').lower()  # Normalize to lowercase
        config = payload.get('config', {})
        
        # Validate input
        if not data:
            raise ValueError("No data provided")
        
        if not chart_type:
            raise ValueError("No chart type specified")
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Validate DataFrame
        validate_data(df)
        
        # Log basic info for debugging (to stderr so it doesn't affect output)
        print(f"Data shape: {df.shape}", file=sys.stderr)
        print(f"Columns: {df.columns.tolist()}", file=sys.stderr)
        print(f"Chart type: {chart_type}", file=sys.stderr)
        
        # Check if chart type is supported
        if chart_type not in PLOT_MAP:
            available_types = ', '.join(sorted(PLOT_MAP.keys()))
            raise ValueError(f"Unsupported chart type: '{chart_type}'. Available types: {available_types}")
        
        # Generate plot
        plot_function = PLOT_MAP[chart_type]
        fig = plot_function(df, {**config, 'chartType': chart_type}) # Pass chartType to config
        
        # Convert to base64
        plot_image = fig_to_base64(fig)
        
        # Create response
        response = {
            'success': True,
            'plot': plot_image,
            'chartType': chart_type,
            'dataInfo': {
                'rows': len(df),
                'columns': len(df.columns),
                'columnNames': df.columns.tolist()
            }
        }
        
        # Output response
        print(json.dumps(response))
        
    except Exception as e:
        # Error response
        error_response = {
            'success': False,
            'error': str(e),
            'errorType': type(e).__name__
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()


