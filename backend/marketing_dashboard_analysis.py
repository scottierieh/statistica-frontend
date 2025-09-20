
import sys
import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        config = payload.get('config', {})

        df = pd.DataFrame(data)

        plots = {}
        
        # --- Convert types ---
        for col, type_info in config.items():
            is_numeric = 'revenue' in col.lower() or 'views' in col.lower() or 'duration' in col.lower() or 'ltv' in col.lower()
            if is_numeric:
                df[type_info] = pd.to_numeric(df[type_info], errors='coerce')
            elif 'date' in col.lower():
                 df[type_info] = pd.to_datetime(df[type_info], errors='coerce')


        # --- Generate plots ---
        plot_configs = [
            ('revenueBySource', 'bar', {'x_col': config.get('sourceCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Traffic Source'}),
            ('revenueByDevice', 'bar', {'x_col': config.get('deviceCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Device'}),
            ('revenueOverTime', 'line', {'x_col': config.get('dateCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue Over Time'}),
            ('revenueByAge', 'bar', {'x_col': config.get('ageGroupCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Age Group'}),
            ('pageViewsDist', 'hist', {'x_col': config.get('pageViewsCol'), 'title': 'Page Views per Session'}),
            ('durationVsRevenue', 'scatter', {'x_col': config.get('sessionDurationCol'), 'y_col': config.get('revenueCol'), 'title': 'Session Duration vs. Revenue'}),
            ('rfmAnalysis', 'scatter', {'x_col': config.get('ltvCol'), 'y_col': config.get('revenueCol'), 'title': 'User LTV vs. Purchase Revenue'}),
            ('revenueByGender', 'bar', {'x_col': config.get('genderCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Gender'}),
            ('revenueByCountry', 'bar', {'x_col': config.get('countryCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Country'}),
            ('revenueByMembership', 'bar', {'x_col': config.get('membershipCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Membership Level'}),
        ]

        for key, plot_type, plot_config in plot_configs:
            try:
                plt.figure(figsize=(8, 5))
                plt.title(plot_config['title'])
                
                # Check for required columns
                required_cols = [c for c in ['x_col', 'y_col'] if c in plot_config]
                if not all(plot_config.get(c) in df.columns for c in required_cols):
                    raise ValueError(f"Missing columns for {key}")

                if plot_type == 'bar':
                    sns.barplot(data=df, x=plot_config['x_col'], y=plot_config['y_col'], errorbar=None)
                    plt.xticks(rotation=45, ha='right')
                elif plot_type == 'line':
                    df_sorted = df.sort_values(by=plot_config['x_col'])
                    sns.lineplot(data=df_sorted, x=plot_config['x_col'], y=plot_config['y_col'])
                elif plot_type == 'hist':
                    sns.histplot(data=df, x=plot_config['x_col'], kde=True)
                elif plot_type == 'scatter':
                    sns.scatterplot(data=df, x=plot_config['x_col'], y=plot_config['y_col'])
                
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                buf.seek(0)
                plots[key] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            except Exception as e:
                plots[key] = None
        
        response = {'plots': plots}
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
