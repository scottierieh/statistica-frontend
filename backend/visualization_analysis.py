
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

def plot_histogram(df, config):
    plt.figure(figsize=(10, 6))
    sns.histplot(data=df, x=config['x_col'], bins=config.get('bins', 30), kde=True)
    plt.title(f"Histogram of {config['x_col']}")
    plt.xlabel(config['x_col'])
    plt.ylabel('Frequency')

def plot_box(df, config):
    plt.figure(figsize=(10, 6))
    if config.get('y_col'):
        sns.boxplot(data=df, x=config['x_col'], y=config['y_col'])
        plt.title(f"Box Plot of {config['y_col']} by {config['x_col']}")
    else:
        sns.boxplot(data=df, x=config['x_col'])
        plt.title(f"Box Plot of {config['x_col']}")

def plot_violin(df, config):
    plt.figure(figsize=(10, 6))
    if config.get('y_col'):
        sns.violinplot(data=df, x=config['x_col'], y=config['y_col'])
        plt.title(f"Violin Plot of {config['y_col']} by {config['x_col']}")
    else:
        sns.violinplot(data=df, x=config['x_col'])
        plt.title(f"Violin Plot of {config['x_col']}")
        
def plot_density(df, config):
    plt.figure(figsize=(10, 6))
    sns.kdeplot(data=df, x=config['x_col'], fill=True)
    plt.title(f"Density Plot of {config['x_col']}")

def plot_bar(df, config):
    plt.figure(figsize=(10, 6))
    if df[config['x_col']].dtype == 'object' or pd.api.types.is_categorical_dtype(df[config['x_col']]):
        sns.countplot(data=df, x=config['x_col'], order = df[config['x_col']].value_counts().index)
    else: # if numeric
        sns.barplot(data=df, x=config['x_col'], y=config['y_col'])
    plt.title(f"Bar Chart of {config['x_col']}")
    plt.xticks(rotation=45, ha='right')

def plot_scatter(df, config):
    plt.figure(figsize=(10, 6))
    sns.scatterplot(data=df, x=config['x_col'], y=config['y_col'], hue=config.get('group_col'), size=config.get('size_col'), sizes=(20, 200))
    if config.get('trend_line'):
        sns.regplot(data=df, x=config['x_col'], y=config['y_col'], scatter=False, color='red')
    plt.title(f"Scatter Plot of {config['y_col']} vs {config['x_col']}")

def plot_heatmap(df, config):
    plt.figure(figsize=(10, 8))
    corr = df[config['variables']].corr(numeric_only=True)
    sns.heatmap(corr, annot=True, cmap='coolwarm', fmt=".2f")
    plt.title("Correlation Heatmap")

def plot_pie(df, config):
    plt.figure(figsize=(8, 8))
    if config.get('value_col'):
        data_agg = df.groupby(config['name_col'])[config['value_col']].sum()
    else:
        data_agg = df[config['name_col']].value_counts()
    
    data_agg.plot.pie(autopct='%1.1f%%', startangle=90, counterclock=False, wedgeprops=dict(width=0.4 if config.get('donut') else 1))
    plt.title(f"Pie Chart of {config['name_col']}")
    plt.ylabel('') # Hide y-label for pie charts

def plot_grouped_bar(df, config):
    plt.figure(figsize=(12, 7))
    sns.barplot(data=df, x=config['x_col'], y=config['y_col'], hue=config['group_col'])
    plt.title(f"Grouped Bar Chart of {config['y_col']} by {config['x_col']} and {config['group_col']}")
    plt.xticks(rotation=45, ha='right')
    
def plot_stacked_bar(df, config):
    plt.figure(figsize=(12, 7))
    pivot_df = df.groupby([config['x_col'], config['group_col']])[config['y_col']].sum().unstack()
    pivot_df.plot(kind='bar', stacked=True, figsize=(12, 7))
    plt.title(f"Stacked Bar Chart of {config['y_col']} by {config['x_col']} and {config['group_col']}")
    plt.xticks(rotation=45, ha='right')


PLOT_MAP = {
    'histogram': plot_histogram,
    'box': plot_box,
    'violin': plot_violin,
    'density': plot_density,
    'bar': plot_bar,
    'scatter': plot_scatter,
    'heatmap': plot_heatmap,
    'pie': plot_pie,
    'donut': lambda df, config: plot_pie(df, {**config, 'donut': True}),
    'grouped-bar': plot_grouped_bar,
    'stacked-bar': plot_stacked_bar,
}


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        chart_type = payload.get('chartType')
        config = payload.get('config', {})

        if not all([data, chart_type, config]):
            raise ValueError("Missing data, chartType, or config")
        
        df = pd.DataFrame(data)

        # Data cleaning for numeric columns
        numeric_cols = [c for c in [config.get('x_col'), config.get('y_col'), config.get('size_col')] if c]
        if 'variables' in config:
             numeric_cols.extend(config['variables'])

        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df.dropna(subset=numeric_cols, inplace=True)

        if chart_type not in PLOT_MAP:
            raise ValueError(f"Unsupported chart type: {chart_type}")
        
        plot_function = PLOT_MAP[chart_type]
        plot_function(df, config)

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        response = {
            'plot': f"data:image/png;base64,{plot_image}",
            'chartType': chart_type
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

