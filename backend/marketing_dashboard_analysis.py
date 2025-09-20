
import sys
import json
import pandas as pd
import numpy as np
import warnings
import plotly.graph_objects as go
import plotly.io as pio

warnings.filterwarnings('ignore')
pio.templates.default = "plotly_white"

def to_json(fig):
    """Converts a Plotly figure to a JSON string."""
    return pio.to_json(fig)

def create_bar_chart(data, x, y, title, xlabel, ylabel):
    fig = go.Figure(go.Bar(x=data[x], y=data[y], marker_color='rgb(31, 119, 180)'))
    fig.update_layout(title_text=title, xaxis_title=xlabel, yaxis_title=ylabel, margin=dict(l=20, r=20, t=40, b=20))
    return fig

def create_funnel_chart(data):
    fig = go.Figure(go.Funnel(
        y=data['Stage'],
        x=data['Count'],
        textinfo="value+percent initial"
    ))
    fig.update_layout(title_text='Simplified Conversion Funnel', margin=dict(l=20, r=20, t=40, b=20))
    return fig

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
            'revenueCol', 'costCol', 'ltvCol', 'conversionCol', 
            'priceCol', 'quantityCol'
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

        # --- Traffic Analysis Plots ---
        try:
            source_col, medium_col, conversion_col = config.get('sourceCol'), config.get('mediumCol'), config.get('conversionCol')
            if all(c and c in df.columns for c in [source_col, medium_col, conversion_col]):
                df['channel'] = df[source_col].astype(str) + ' / ' + df[medium_col].astype(str)
                conversion_rate = df.groupby('channel')[conversion_col].mean().sort_values(ascending=False) * 100
                conversion_rate = conversion_rate.reset_index()
                
                fig = create_bar_chart(conversion_rate, x='channel', y=conversion_col, title='Conversion Rate by Channel', xlabel='Channel', ylabel='Conversion Rate (%)')
                plots['channelPerformance'] = to_json(fig)
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
                campaign_stats = campaign_stats.sort_values('roi', ascending=False)

                fig = create_bar_chart(campaign_stats, x='roi', y=campaign_col, title='Campaign ROI (%)', xlabel='ROI (%)', ylabel='Campaign')
                fig.update_layout(yaxis={'categoryorder':'total ascending'})
                plots['campaignRoi'] = to_json(fig)
            else:
                plots['campaignRoi'] = None
        except Exception:
            plots['campaignRoi'] = None

        try:
            conversion_col = config.get('conversionCol')
            if conversion_col and conversion_col in df.columns:
                total_sessions = len(df)
                converted_sessions = len(df[df[conversion_col] == 1])
                
                funnel_data = {
                    'Stage': ['Total Sessions', 'Converted'],
                    'Count': [total_sessions, converted_sessions]
                }
                funnel_df = pd.DataFrame(funnel_data)
                
                fig = create_funnel_chart(funnel_df)
                plots['funnelAnalysis'] = to_json(fig)
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
                    attribution = attribution.sort_values('TotalRevenue', ascending=False)
                    
                    fig = create_bar_chart(attribution, x='TotalRevenue', y=source_col, title='Attributed Revenue (Last Touch)', xlabel='Attributed Revenue', ylabel='Source')
                    fig.update_layout(yaxis={'categoryorder':'total ascending'})
                    plots['attributionModeling'] = to_json(fig)
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
                df_cohort = df[[user_id_col, cohort_date_col, date_col]].copy().dropna()
                df_cohort['order_month'] = df_cohort[date_col].dt.to_period('M')
                df_cohort['cohort'] = df_cohort.groupby(user_id_col)[cohort_date_col].transform('min').dt.to_period('M')
                
                df_cohort_agg = df_cohort.groupby(['cohort', 'order_month']).agg(n_customers=(user_id_col, 'nunique')).reset_index(drop=False)
                df_cohort_agg['period_number'] = (df_cohort_agg.order_month - df_cohort_agg.cohort).apply(lambda x: x.n)
                cohort_pivot = df_cohort_agg.pivot_table(index='cohort', columns='period_number', values='n_customers')
                
                cohort_size = cohort_pivot.iloc[:, 0]
                retention_matrix = cohort_pivot.divide(cohort_size, axis=0) * 100
                
                fig = go.Figure(data=go.Heatmap(
                   z=retention_matrix.values,
                   x=retention_matrix.columns.astype(str),
                   y=retention_matrix.index.astype(str),
                   hoverongaps=False,
                   colorscale='Viridis',
                   text=np.around(retention_matrix.values, 2),
                   texttemplate="%{text}%"))
                fig.update_layout(title='Monthly Cohort Retention Rate (%)', xaxis_title='Months Since First Purchase', yaxis_title='Cohort')
                plots['cohortAnalysis'] = to_json(fig)
            else:
                plots['cohortAnalysis'] = None
        except Exception as e:
            plots['cohortAnalysis'] = None

        try:
            item_category_col, item_brand_col = config.get('itemCategoryCol'), config.get('itemBrandCol')
            if all(c and c in df.columns for c in [item_category_col, item_brand_col]):
                crosstab = pd.crosstab(df[item_category_col], df[item_brand_col])
                fig = go.Figure(data=go.Heatmap(
                    z=crosstab.values,
                    x=crosstab.columns,
                    y=crosstab.index,
                    hoverongaps=False, colorscale='Blues'
                ))
                fig.update_layout(title='Item Category vs. Brand Co-occurrence')
                plots['basketAnalysis'] = to_json(fig)
            else:
                plots['basketAnalysis'] = None
        except Exception:
            plots['basketAnalysis'] = None
            
        try:
            price_col, quantity_col = config.get('priceCol'), config.get('quantityCol')
            if all(c and c in df.columns for c in [price_col, quantity_col]):
                fig = go.Figure(data=go.Scatter(
                    x=df[price_col],
                    y=df[quantity_col],
                    mode='markers'
                ))
                fig.update_layout(title='Price vs. Quantity (Price Elasticity)', xaxis_title='Price', yaxis_title='Quantity Sold')
                plots['priceElasticity'] = to_json(fig)
            else:
                plots['priceElasticity'] = None
        except Exception:
            plots['priceElasticity'] = None
            
        try:
            coupon_col, conversion_col = config.get('couponUsedCol'), config.get('conversionCol')
            if all(c and c in df.columns for c in [coupon_col, conversion_col]):
                coupon_effect = df.groupby(coupon_col)[conversion_col].mean().sort_values() * 100
                coupon_effect = coupon_effect.reset_index()
                
                fig = create_bar_chart(coupon_effect, x=coupon_col, y=conversion_col, title='Coupon Usage vs. Conversion Rate', xlabel='Coupon Used', ylabel='Conversion Rate (%)')
                plots['couponEffectiveness'] = to_json(fig)
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

    