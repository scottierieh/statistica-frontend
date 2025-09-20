
import sys
import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings
import numpy as np

warnings.filterwarnings('ignore')

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        config = payload.get('config', {})

        if not data:
            raise ValueError("No data provided.")

        df = pd.DataFrame(data)
        plots = {}
        
        # --- Convert types ---
        numeric_cols_keys = ['revenueCol', 'costCol', 'pageViewsCol', 'sessionDurationCol', 'ltvCol', 'conversionCol']
        for key in numeric_cols_keys:
            col_name = config.get(key)
            if col_name and col_name in df.columns:
                df[col_name] = pd.to_numeric(df[col_name], errors='coerce')
        
        date_col_key = 'dateCol'
        date_col_name = config.get(date_col_key)
        if date_col_name and date_col_name in df.columns:
            df[date_col_name] = pd.to_datetime(df[date_col_name], errors='coerce')

        # --- Base Plot Configs ---
        base_plot_configs = [
            ('revenueBySource', 'bar', {'x_col': config.get('sourceCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Traffic Source'}),
            ('revenueByDevice', 'bar', {'x_col': config.get('deviceCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Device'}),
            ('revenueOverTime', 'line', {'x_col': config.get('dateCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue Over Time'}),
            ('revenueByAge', 'bar', {'x_col': config.get('ageGroupCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Age Group'}),
            ('pageViewsDist', 'hist', {'x_col': config.get('pageViewsCol'), 'title': 'Page Views per Session'}),
            ('durationVsRevenue', 'scatter', {'x_col': config.get('sessionDurationCol'), 'y_col': config.get('revenueCol'), 'title': 'Session Duration vs. Revenue'}),
            ('ltvVsRevenue', 'scatter', {'x_col': config.get('ltvCol'), 'y_col': config.get('revenueCol'), 'title': 'User LTV vs. Purchase Revenue'}),
            ('revenueByGender', 'bar', {'x_col': config.get('genderCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Gender'}),
            ('revenueByCountry', 'bar', {'x_col': config.get('countryCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Country'}),
            ('revenueByMembership', 'bar', {'x_col': config.get('membershipCol'), 'y_col': config.get('revenueCol'), 'title': 'Revenue by Membership Level'}),
        ]
        
        for key, plot_type, plot_config in base_plot_configs:
            try:
                required_cols = [c for c in ['x_col', 'y_col'] if c in plot_config]
                if not all(plot_config.get(c) and plot_config.get(c) in df.columns for c in required_cols):
                    raise ValueError(f"Missing columns for {key}")

                plt.figure(figsize=(10, 6))
                x_col, y_col = plot_config.get('x_col'), plot_config.get('y_col')
                
                plot_df = df.dropna(subset=[col for col in [x_col, y_col] if col])

                if plot_type == 'bar':
                    grouped_data = plot_df.groupby(x_col)[y_col].sum().sort_values(ascending=False)
                    sns.barplot(x=grouped_data.index, y=grouped_data.values, palette='viridis')
                    plt.xticks(rotation=45, ha='right')
                elif plot_type == 'line':
                    df_sorted = plot_df.sort_values(by=x_col)
                    sns.lineplot(data=df_sorted, x=x_col, y=y_col, marker='o')
                elif plot_type == 'hist':
                    sns.histplot(data=plot_df, x=x_col, kde=True)
                elif plot_type == 'scatter':
                    sns.scatterplot(data=plot_df, x=x_col, y=y_col, alpha=0.7)
                
                plt.title(plot_config['title'])
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                buf.seek(0)
                plots[key] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            except Exception:
                plots[key] = None
                
        # --- Advanced Traffic Analysis Plots ---
        
        # 1. Channel Performance (Conversion Rate)
        try:
            source_col, medium_col, conversion_col = config.get('sourceCol'), config.get('mediumCol'), config.get('conversionCol')
            if all([c in df.columns for c in [source_col, medium_col, conversion_col]]):
                df['channel'] = df[source_col].astype(str) + ' / ' + df[medium_col].astype(str)
                conversion_rate = df.groupby('channel')[conversion_col].mean().sort_values(ascending=False) * 100
                
                plt.figure(figsize=(10, 6))
                sns.barplot(x=conversion_rate.values, y=conversion_rate.index, palette='crest')
                plt.title('Conversion Rate by Channel')
                plt.xlabel('Conversion Rate (%)')
                plt.ylabel('Channel (Source / Medium)')
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                plots['channelPerformance'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            else:
                 plots['channelPerformance'] = None
        except Exception:
            plots['channelPerformance'] = None
        
        # 2. Campaign ROI
        try:
            campaign_col, cost_col, revenue_col = config.get('campaignCol'), config.get('costCol'), config.get('revenueCol')
            if all([c in df.columns for c in [campaign_col, cost_col, revenue_col]]):
                campaign_stats = df.groupby(campaign_col).agg(
                    total_cost=(cost_col, 'sum'),
                    total_revenue=(revenue_col, 'sum')
                ).reset_index()
                
                campaign_stats['roi'] = np.where(campaign_stats['total_cost'] > 0, ((campaign_stats['total_revenue'] - campaign_stats['total_cost']) / campaign_stats['total_cost']) * 100, 0)
                
                plt.figure(figsize=(10, 6))
                sns.barplot(data=campaign_stats.sort_values('roi', ascending=False), x='roi', y=campaign_col, palette='magma')
                plt.title('Campaign ROI (%)')
                plt.xlabel('Return on Investment (%)')
                plt.ylabel('Campaign')
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                plots['campaignRoi'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            else:
                plots['campaignRoi'] = None
        except Exception:
            plots['campaignRoi'] = None

        # 3. Funnel Analysis
        try:
            page_views_col, conversion_col = config.get('pageViewsCol'), config.get('conversionCol')
            if all([c in df.columns for c in [page_views_col, conversion_col]]):
                total_sessions = len(df)
                viewed_product_sessions = len(df[df[page_views_col] > 1])
                converted_sessions = len(df[df[conversion_col] == 1])
                
                funnel_data = {
                    'Stage': ['Total Sessions', 'Viewed Product', 'Converted'],
                    'Count': [total_sessions, viewed_product_sessions, converted_sessions]
                }
                funnel_df = pd.DataFrame(funnel_data)
                
                fig, ax = plt.subplots(figsize=(8, 5))
                sns.barplot(x='Count', y='Stage', data=funnel_df, ax=ax, palette='coolwarm')
                ax.set_title('Simplified Conversion Funnel')
                ax.set_xlabel('Number of Sessions')
                ax.set_ylabel('')
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                plots['funnelAnalysis'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            else:
                plots['funnelAnalysis'] = None
        except Exception:
            plots['funnelAnalysis'] = None

        # 4. Attribution Modeling
        try:
            source_col, conversion_col, revenue_col = config.get('sourceCol'), config.get('conversionCol'), config.get('revenueCol')
            if all([c in df.columns for c in [source_col, conversion_col, revenue_col]]):
                converted_df = df[df[conversion_col] == 1].copy()

                if not converted_df.empty:
                    attribution = converted_df.groupby(source_col)[revenue_col].agg(['sum', 'count']).reset_index()
                    attribution.rename(columns={'sum': 'TotalRevenue', 'count': 'Conversions'}, inplace=True)
                    
                    plt.figure(figsize=(12, 7))
                    sns.barplot(data=attribution.sort_values('TotalRevenue', ascending=False), x='TotalRevenue', y=source_col, palette='rocket')
                    plt.title('Attributed Revenue (Last Touch)')
                    plt.xlabel('Attributed Revenue')
                    plt.ylabel('Source')
                    plt.tight_layout()
                    buf = io.BytesIO()
                    plt.savefig(buf, format='png')
                    plt.close()
                    plots['attributionModeling'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
                else:
                    plots['attributionModeling'] = None
            else:
                plots['attributionModeling'] = None
        except Exception:
            plots['attributionModeling'] = None

        response = {'plots': plots}
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
