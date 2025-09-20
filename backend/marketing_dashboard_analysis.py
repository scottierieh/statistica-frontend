
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
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False


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
        numeric_cols_keys = [
            'revenueCol', 'costCol', 'pageViewsCol', 'sessionDurationCol', 
            'ltvCol', 'conversionCol', 'priceCol', 'quantityCol'
        ]
        for key in numeric_cols_keys:
            col_name = config.get(key)
            if col_name and col_name in df.columns:
                df[col_name] = pd.to_numeric(df[col_name], errors='coerce')
        
        date_cols_keys = ['dateCol', 'cohortDateCol']
        for key in date_cols_keys:
            col_name = config.get(key)
            if col_name and col_name in df.columns:
                df[col_name] = pd.to_datetime(df[col_name], errors='coerce')


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
        
        try:
            source_col, medium_col, conversion_col = config.get('sourceCol'), config.get('mediumCol'), config.get('conversionCol')
            if all(c and c in df.columns for c in [source_col, medium_col, conversion_col]):
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
        
        try:
            campaign_col, cost_col, revenue_col = config.get('campaignCol'), config.get('costCol'), config.get('revenueCol')
            if all(c and c in df.columns for c in [campaign_col, cost_col, revenue_col]):
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

        try:
            page_views_col, conversion_col = config.get('pageViewsCol'), config.get('conversionCol')
            if all(c and c in df.columns for c in [page_views_col, conversion_col]):
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

        try:
            source_col, conversion_col, revenue_col = config.get('sourceCol'), config.get('conversionCol'), config.get('revenueCol')
            if all(c and c in df.columns for c in [source_col, conversion_col, revenue_col]):
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

        # --- E-commerce Analysis Plots ---
        try:
            user_id_col, cohort_date_col, date_col = config.get('userIdCol'), config.get('cohortDateCol'), config.get('dateCol')
            if all(c and c in df.columns for c in [user_id_col, cohort_date_col, date_col]):
                df_cohort = df[[user_id_col, cohort_date_col, date_col]].copy()
                df_cohort['order_month'] = df_cohort[date_col].dt.to_period('M')
                df_cohort['cohort'] = df_cohort.groupby(user_id_col)[cohort_date_col].transform('min').dt.to_period('M')
                
                df_cohort_agg = df_cohort.groupby(['cohort', 'order_month']).agg(n_customers=(user_id_col, 'nunique')).reset_index(drop=False)
                df_cohort_agg['period_number'] = (df_cohort_agg.order_month - df_cohort_agg.cohort).apply(lambda x: x.n)
                cohort_pivot = df_cohort_agg.pivot_table(index='cohort', columns='period_number', values='n_customers')
                
                cohort_size = cohort_pivot.iloc[:, 0]
                retention_matrix = cohort_pivot.divide(cohort_size, axis=0) * 100
                
                plt.figure(figsize=(12, 8))
                sns.heatmap(retention_matrix, annot=True, fmt='.1f', cmap='viridis')
                plt.title('Monthly Cohort Retention Rate (%)')
                plt.xlabel('Months Since First Purchase')
                plt.ylabel('Cohort')
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                plots['cohortAnalysis'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            else:
                plots['cohortAnalysis'] = None
        except Exception:
            plots['cohortAnalysis'] = None

        try:
            item_category_col, item_brand_col = config.get('itemCategoryCol'), config.get('itemBrandCol')
            if all(c and c in df.columns for c in [item_category_col, item_brand_col]):
                crosstab = pd.crosstab(df[item_category_col], df[item_brand_col])
                plt.figure(figsize=(12, 8))
                sns.heatmap(crosstab, annot=True, fmt='d', cmap='YlGnBu')
                plt.title('Item Category vs. Brand Co-occurrence')
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                plots['basketAnalysis'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            else:
                plots['basketAnalysis'] = None
        except Exception:
            plots['basketAnalysis'] = None
            
        try:
            price_col, quantity_col = config.get('priceCol'), config.get('quantityCol')
            if all(c and c in df.columns for c in [price_col, quantity_col]):
                plt.figure(figsize=(10, 6))
                sns.scatterplot(data=df, x=price_col, y=quantity_col, alpha=0.5)
                sns.regplot(data=df, x=price_col, y=quantity_col, scatter=False, color='red')
                plt.title('Price vs. Quantity (Price Elasticity)')
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                plots['priceElasticity'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            else:
                plots['priceElasticity'] = None
        except Exception:
            plots['priceElasticity'] = None
            
        try:
            coupon_col, conversion_col = config.get('couponUsedCol'), config.get('conversionCol')
            if all(c and c in df.columns for c in [coupon_col, conversion_col]):
                coupon_effect = df.groupby(coupon_col)[conversion_col].mean().sort_values() * 100
                plt.figure(figsize=(8, 5))
                sns.barplot(x=coupon_effect.index, y=coupon_effect.values, palette='pastel')
                plt.title('Coupon Usage vs. Conversion Rate')
                plt.xlabel('Coupon Used')
                plt.ylabel('Conversion Rate (%)')
                plt.tight_layout()
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                plt.close()
                plots['couponEffectiveness'] = f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            else:
                plots['couponEffectiveness'] = None
        except Exception:
            plots['couponEffectiveness'] = None


        response = {'plots': plots}
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

