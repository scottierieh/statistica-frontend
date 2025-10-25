import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

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

def plot_histogram(df, config):
    """Create histogram plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    x_col = config.get('x_col')
    if x_col not in df.columns:
        raise ValueError(f"Column '{x_col}' not found in data")
    
    # Ensure numeric data
    if not pd.api.types.is_numeric_dtype(df[x_col]):
        df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    
    # Remove NaN values
    data_clean = df[x_col].dropna()
    
    if len(data_clean) == 0:
        raise ValueError(f"No valid numeric data in column '{x_col}'")
    
    # Dynamic bin calculation if not specified
    bins = config.get('bins', min(30, int(np.sqrt(len(data_clean)))))
    
    sns.histplot(data=data_clean, bins=bins, kde=True, ax=ax)
    ax.set_title(f"Histogram of {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel('Frequency')
    ax.grid(True, alpha=0.3)
    
    return fig

def plot_box(df, config):
    """Create box plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    
    if y_col:
        # Box plot with grouping
        if x_col not in df.columns or y_col not in df.columns:
            raise ValueError(f"Required columns not found in data")
        
        # Ensure y is numeric
        if not pd.api.types.is_numeric_dtype(df[y_col]):
            df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
        
        # Clean data
        clean_df = df[[x_col, y_col]].dropna()
        
        sns.boxplot(data=clean_df, x=x_col, y=y_col, ax=ax)
        ax.set_title(f"Box Plot of {y_col} by {x_col}", fontsize=14, fontweight='bold')
        
        # Rotate x labels if many categories
        if clean_df[x_col].nunique() > 10:
            plt.xticks(rotation=45, ha='right')
    else:
        # Simple box plot
        if x_col not in df.columns:
            raise ValueError(f"Column '{x_col}' not found in data")
        
        # Ensure numeric
        if not pd.api.types.is_numeric_dtype(df[x_col]):
            df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
        
        data_clean = df[x_col].dropna()
        
        sns.boxplot(data=data_clean, ax=ax, orient='h')
        ax.set_title(f"Box Plot of {x_col}", fontsize=14, fontweight='bold')
        ax.set_xlabel(x_col)
    
    ax.grid(True, alpha=0.3)
    return fig

def plot_violin(df, config):
    """Create violin plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    
    if y_col:
        # Violin plot with grouping
        if x_col not in df.columns or y_col not in df.columns:
            raise ValueError(f"Required columns not found in data")
        
        # Ensure y is numeric
        if not pd.api.types.is_numeric_dtype(df[y_col]):
            df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
        
        # Clean data
        clean_df = df[[x_col, y_col]].dropna()
        
        sns.violinplot(data=clean_df, x=x_col, y=y_col, ax=ax, inner='box')
        ax.set_title(f"Violin Plot of {y_col} by {x_col}", fontsize=14, fontweight='bold')
        
        # Rotate x labels if many categories
        if clean_df[x_col].nunique() > 10:
            plt.xticks(rotation=45, ha='right')
    else:
        # Simple violin plot
        if x_col not in df.columns:
            raise ValueError(f"Column '{x_col}' not found in data")
        
        # Ensure numeric
        if not pd.api.types.is_numeric_dtype(df[x_col]):
            df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
        
        data_clean = df[[x_col]].dropna()
        
        sns.violinplot(data=data_clean, y=x_col, ax=ax, inner='box', orient='v')
        ax.set_title(f"Violin Plot of {x_col}", fontsize=14, fontweight='bold')
    
    ax.grid(True, alpha=0.3)
    return fig

def plot_density(df, config):
    """Create density plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    x_col = config.get('x_col')
    if x_col not in df.columns:
        raise ValueError(f"Column '{x_col}' not found in data")
    
    # Ensure numeric data
    if not pd.api.types.is_numeric_dtype(df[x_col]):
        df[x_col] = pd.to_numeric(df[x_col], errors='coerce')
    
    # Remove NaN values
    data_clean = df[x_col].dropna()
    
    if len(data_clean) == 0:
        raise ValueError(f"No valid numeric data in column '{x_col}'")
    
    # Check for multiple groups
    group_col = config.get('group_col')
    if group_col and group_col in df.columns:
        clean_df = df[[x_col, group_col]].dropna()
        for group in clean_df[group_col].unique():
            group_data = clean_df[clean_df[group_col] == group][x_col]
            sns.kdeplot(data=group_data, fill=True, alpha=0.5, label=str(group), ax=ax)
        ax.legend()
    else:
        sns.kdeplot(data=data_clean, fill=True, ax=ax, color='steelblue')
    
    ax.set_title(f"Density Plot of {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel('Density')
    ax.grid(True, alpha=0.3)
    
    return fig

def plot_bar(df, config):
    """Create bar plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    
    if x_col not in df.columns:
        raise ValueError(f"Column '{x_col}' not found in data")
    
    if y_col and y_col in df.columns:
        # Standard bar plot with aggregation
        if not pd.api.types.is_numeric_dtype(df[y_col]):
            df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
        
        # Clean data and aggregate
        clean_df = df[[x_col, y_col]].dropna()
        
        # Aggregate if needed
        if clean_df[x_col].duplicated().any():
            agg_df = clean_df.groupby(x_col)[y_col].mean().reset_index()
            sns.barplot(data=agg_df, x=x_col, y=y_col, ax=ax)
        else:
            sns.barplot(data=clean_df, x=x_col, y=y_col, ax=ax)
        
        ax.set_title(f"Bar Chart of {y_col} by {x_col}", fontsize=14, fontweight='bold')
    else:
        # Count plot
        value_counts = df[x_col].value_counts()
        
        # Limit to top N categories if too many
        max_bars = config.get('max_bars', 20)
        if len(value_counts) > max_bars:
            value_counts = value_counts.head(max_bars)
        
        value_counts.plot(kind='bar', ax=ax, color='steelblue')
        ax.set_title(f"Count Plot of {x_col}", fontsize=14, fontweight='bold')
        ax.set_xlabel(x_col)
        ax.set_ylabel('Count')
    
    plt.xticks(rotation=45, ha='right')
    ax.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    
    return fig

def plot_scatter(df, config):
    """Create scatter plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 8))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    
    if x_col not in df.columns or y_col not in df.columns:
        raise ValueError(f"Required columns not found in data")
    
    # Ensure numeric data
    for col in [x_col, y_col]:
        if not pd.api.types.is_numeric_dtype(df[col]):
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Clean data
    clean_df = df[[x_col, y_col]].dropna()
    
    # Add optional grouping
    group_col = config.get('group_col')
    size_col = config.get('size_col')
    
    plot_df = clean_df.copy()
    
    if group_col and group_col in df.columns:
        plot_df[group_col] = df.loc[clean_df.index, group_col]
    
    if size_col and size_col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[size_col]):
            df[size_col] = pd.to_numeric(df[size_col], errors='coerce')
        plot_df[size_col] = df.loc[clean_df.index, size_col]
    
    # Create scatter plot
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
    
    # Add trend line if requested
    if config.get('trend_line', False):
        sns.regplot(
            data=clean_df, 
            x=x_col, 
            y=y_col, 
            scatter=False, 
            color='red', 
            ax=ax,
            line_kws={'linewidth': 2, 'alpha': 0.7}
        )
    
    ax.set_title(f"Scatter Plot of {y_col} vs {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    ax.grid(True, alpha=0.3)
    
    # Move legend outside if it exists
    if ax.get_legend():
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    
    plt.tight_layout()
    return fig

def plot_line(df, config):
    """Create line plot with improved error handling"""
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    
    if x_col not in df.columns or y_col not in df.columns:
        raise ValueError(f"Required columns not found in data")
    
    # Ensure y is numeric
    if not pd.api.types.is_numeric_dtype(df[y_col]):
        df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    
    # Clean and sort data
    clean_df = df[[x_col, y_col]].dropna()
    
    # Try to convert x to datetime if it looks like dates
    try:
        clean_df[x_col] = pd.to_datetime(clean_df[x_col])
        clean_df = clean_df.sort_values(x_col)
    except:
        # If not dates, try to sort numerically or alphabetically
        clean_df = clean_df.sort_values(x_col)
    
    # Check for grouping
    group_col = config.get('group_col')
    if group_col and group_col in df.columns:
        plot_df = clean_df.copy()
        plot_df[group_col] = df.loc[clean_df.index, group_col]
        sns.lineplot(data=plot_df, x=x_col, y=y_col, hue=group_col, marker='o', ax=ax)
    else:
        sns.lineplot(data=clean_df, x=x_col, y=y_col, marker='o', ax=ax, color='steelblue', linewidth=2)
    
    ax.set_title(f"Line Chart of {y_col} vs {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    
    # Rotate x labels if needed
    if clean_df[x_col].nunique() > 10 or isinstance(clean_df[x_col].iloc[0], (pd.Timestamp, str)):
        plt.xticks(rotation=45, ha='right')
    
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    
    return fig

def plot_heatmap(df, config):
    """Create heatmap with improved error handling"""
    variables = config.get('variables', [])
    
    if not variables:
        # Use all numeric columns if no variables specified
        variables = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # Filter to existing columns
    variables = [v for v in variables if v in df.columns]
    
    if len(variables) < 2:
        raise ValueError("Need at least 2 numeric variables for correlation heatmap")
    
    # Ensure numeric data
    for col in variables:
        if not pd.api.types.is_numeric_dtype(df[col]):
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Calculate correlation
    corr = df[variables].corr()
    
    # Determine figure size based on number of variables
    fig_size = max(8, len(variables) * 0.8)
    fig, ax = plt.subplots(figsize=(fig_size, fig_size * 0.8))
    
    # Create heatmap
    mask = np.triu(np.ones_like(corr, dtype=bool), k=1) if config.get('triangle', False) else None
    
    sns.heatmap(
        corr, 
        annot=True, 
        cmap='coolwarm', 
        fmt=".2f", 
        center=0,
        square=True,
        linewidths=1,
        cbar_kws={"shrink": .8},
        mask=mask,
        ax=ax
    )
    
    ax.set_title("Correlation Heatmap", fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    return fig

def plot_pie(df, config):
    """Create pie/donut chart with improved error handling"""
    fig, ax = plt.subplots(figsize=(10, 8))
    
    name_col = config.get('name_col')
    value_col = config.get('value_col')
    
    if name_col not in df.columns:
        raise ValueError(f"Column '{name_col}' not found in data")
    
    if value_col and value_col in df.columns:
        # Aggregate values
        if not pd.api.types.is_numeric_dtype(df[value_col]):
            df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        
        clean_df = df[[name_col, value_col]].dropna()
        data_agg = clean_df.groupby(name_col)[value_col].sum().sort_values(ascending=False)
    else:
        # Count occurrences
        data_agg = df[name_col].value_counts()
    
    # Limit to top N categories if too many
    max_slices = config.get('max_slices', 10)
    if len(data_agg) > max_slices:
        others = data_agg[max_slices:].sum()
        data_agg = data_agg[:max_slices]
        if others > 0:
            data_agg['Others'] = others
    
    # Create pie chart
    colors = plt.cm.Set3(np.linspace(0, 1, len(data_agg)))
    
    wedgeprops = dict(width=0.5) if config.get('donut', False) else {}
    
    wedges, texts, autotexts = ax.pie(
        data_agg.values,
        labels=data_agg.index,
        autopct='%1.1f%%',
        startangle=90,
        counterclock=False,
        colors=colors,
        wedgeprops=wedgeprops
    )
    
    # Improve text readability
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_weight('bold')
    
    title = f"{'Donut' if config.get('donut', False) else 'Pie'} Chart of {name_col}"
    ax.set_title(title, fontsize=14, fontweight='bold')
    
    # Add legend if many categories
    if len(data_agg) > 6:
        ax.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    
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
    if missing_cols:
        raise ValueError(f"Required columns not found: {missing_cols}")
    
    # Ensure y is numeric
    if not pd.api.types.is_numeric_dtype(df[y_col]):
        df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    
    # Clean data
    clean_df = df[[x_col, y_col, group_col]].dropna()
    
    # Aggregate data
    agg_df = clean_df.groupby([x_col, group_col])[y_col].mean().reset_index()
    
    # Create grouped bar plot
    sns.barplot(data=agg_df, x=x_col, y=y_col, hue=group_col, ax=ax)
    
    ax.set_title(f"Grouped Bar Chart: {y_col} by {x_col} and {group_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    
    # Rotate x labels if needed
    if agg_df[x_col].nunique() > 5:
        plt.xticks(rotation=45, ha='right')
    
    ax.grid(True, alpha=0.3, axis='y')
    ax.legend(title=group_col, bbox_to_anchor=(1.05, 1), loc='upper left')
    
    plt.tight_layout()
    return fig

def plot_stacked_bar(df, config):
    """Create stacked bar chart with improved error handling"""
    fig, ax = plt.subplots(figsize=(12, 7))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    group_col = config.get('group_col')
    
    required_cols = [x_col, y_col, group_col]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Required columns not found: {missing_cols}")
    
    # Ensure y is numeric
    if not pd.api.types.is_numeric_dtype(df[y_col]):
        df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    
    # Clean and aggregate data
    clean_df = df[[x_col, y_col, group_col]].dropna()
    
    # Create pivot table
    pivot_df = clean_df.groupby([x_col, group_col])[y_col].sum().unstack(fill_value=0)
    
    # Limit categories if too many
    if len(pivot_df) > 20:
        pivot_df = pivot_df.head(20)
    
    # Create stacked bar plot
    pivot_df.plot(kind='bar', stacked=True, ax=ax, colormap='Set3')
    
    ax.set_title(f"Stacked Bar Chart: {y_col} by {x_col} and {group_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(f"Total {y_col}")
    
    # Rotate x labels if needed
    if len(pivot_df) > 5:
        plt.xticks(rotation=45, ha='right')
    
    ax.grid(True, alpha=0.3, axis='y')
    ax.legend(title=group_col, bbox_to_anchor=(1.05, 1), loc='upper left')
    
    plt.tight_layout()
    return fig

# Additional chart types
def plot_area(df, config):
    """Create area chart"""
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    
    if x_col not in df.columns or y_col not in df.columns:
        raise ValueError(f"Required columns not found in data")
    
    # Ensure y is numeric
    if not pd.api.types.is_numeric_dtype(df[y_col]):
        df[y_col] = pd.to_numeric(df[y_col], errors='coerce')
    
    # Clean and sort data
    clean_df = df[[x_col, y_col]].dropna().sort_values(x_col)
    
    ax.fill_between(range(len(clean_df)), clean_df[y_col].values, alpha=0.3, color='steelblue')
    ax.plot(range(len(clean_df)), clean_df[y_col].values, color='steelblue', linewidth=2)
    
    ax.set_title(f"Area Chart of {y_col} over {x_col}", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    ax.set_xticks(range(0, len(clean_df), max(1, len(clean_df)//10)))
    ax.set_xticklabels(clean_df[x_col].values[::max(1, len(clean_df)//10)], rotation=45, ha='right')
    
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    
    return fig

def plot_bubble(df, config):
    """Create bubble chart (enhanced scatter plot)"""
    fig, ax = plt.subplots(figsize=(10, 8))
    
    x_col = config.get('x_col')
    y_col = config.get('y_col')
    size_col = config.get('size_col', config.get('z_col'))  # z_col as alias for size
    
    if not all([x_col in df.columns, y_col in df.columns, size_col in df.columns]):
        raise ValueError(f"Required columns not found in data")
    
    # Ensure numeric data
    for col in [x_col, y_col, size_col]:
        if not pd.api.types.is_numeric_dtype(df[col]):
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Clean data
    clean_df = df[[x_col, y_col, size_col]].dropna()
    
    # Normalize sizes for better visualization
    sizes = (clean_df[size_col] - clean_df[size_col].min()) / (clean_df[size_col].max() - clean_df[size_col].min())
    sizes = sizes * 1000 + 50  # Scale to reasonable size range
    
    scatter = ax.scatter(
        clean_df[x_col], 
        clean_df[y_col], 
        s=sizes, 
        alpha=0.5, 
        c=clean_df[size_col], 
        cmap='viridis',
        edgecolors='black',
        linewidth=1
    )
    
    # Add colorbar
    cbar = plt.colorbar(scatter, ax=ax)
    cbar.set_label(size_col, rotation=270, labelpad=15)
    
    ax.set_title(f"Bubble Chart: {y_col} vs {x_col} (sized by {size_col})", fontsize=14, fontweight='bold')
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    return fig

# Updated plot map
PLOT_MAP = {
    'histogram': plot_histogram,
    'box': plot_box,
    'boxplot': plot_box,  # Alias
    'violin': plot_violin,
    'density': plot_density,
    'kde': plot_density,  # Alias
    'bar': plot_bar,
    'barplot': plot_bar,  # Alias
    'scatter': plot_scatter,
    'scatterplot': plot_scatter,  # Alias
    'line': plot_line,
    'lineplot': plot_line,  # Alias
    'heatmap': plot_heatmap,
    'correlation': plot_heatmap,  # Alias
    'pie': plot_pie,
    'donut': lambda df, config: plot_pie(df, {**config, 'donut': True}),
    'grouped-bar': plot_grouped_bar,
    'grouped_bar': plot_grouped_bar,  # Alias
    'stacked-bar': plot_stacked_bar,
    'stacked_bar': plot_stacked_bar,  # Alias
    'area': plot_area,
    'bubble': plot_bubble,
}

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
        fig = plot_function(df, config)
        
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
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()