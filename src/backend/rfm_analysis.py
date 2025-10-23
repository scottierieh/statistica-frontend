
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings
from datetime import datetime

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    return obj

def get_rfm_segments(df):
    # Standard segmentation based on quintiles of R, F, and M scores
    # This can be customized based on business needs
    segment_map = {
        r'555': 'Champions',
        r'[4-5][4-5][1-5]': 'Loyal Customers',
        r'[3-5]3[1-5]': 'Potential Loyalists',
        r'5[1-2][1-5]': 'New Customers',
        r'4[1-2][1-5]': 'Promising',
        r'3[1-2][1-5]': 'Needs Attention',
        r'2[1-5][1-5]': 'At Risk',
        r'1[3-5][1-5]': "Can't Lose Them",
        r'1[1-2][1-5]': 'Hibernating',
        r'111': 'Lost'
    }
    
    df['Segment'] = 'Others' # Default
    for pattern, segment in segment_map.items():
        df.loc[df['RFM_Score'].str.match(pattern), 'Segment'] = segment
        
    return df

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        customer_id_col = payload.get('customer_id_col')
        invoice_date_col = payload.get('invoice_date_col')
        monetary_col = payload.get('monetary_col')

        if not all([data, customer_id_col, invoice_date_col, monetary_col]):
            raise ValueError("Missing data or required column names.")

        df = pd.DataFrame(data)

        # --- Data Cleaning and Preparation ---
        df[invoice_date_col] = pd.to_datetime(df[invoice_date_col])
        df[monetary_col] = pd.to_numeric(df[monetary_col], errors='coerce')
        df.dropna(subset=[customer_id_col, invoice_date_col, monetary_col], inplace=True)
        df = df[df[monetary_col] > 0]

        if df.empty:
            raise ValueError("No valid data for RFM analysis after cleaning.")

        # --- RFM Calculation ---
        snapshot_date = df[invoice_date_col].max() + pd.DateOffset(days=1)
        
        rfm = df.groupby(customer_id_col).agg({
            invoice_date_col: lambda date: (snapshot_date - date.max()).days,
            'invoice_no': 'nunique', # Assuming invoice_no exists for frequency
            monetary_col: 'sum'
        })
        
        # Rename columns for clarity
        rfm.rename(columns={invoice_date_col: 'Recency', 
                             'invoice_no': 'Frequency', 
                             monetary_col: 'Monetary'}, inplace=True)
        
        # --- RFM Scoring (Quintiles) - FIXED VERSION ---
        # Use qcut with duplicates='drop' and then map to 1-5 scale dynamically
        try:
            r_bins = pd.qcut(rfm['Recency'], 5, duplicates='drop')
            r_labels = sorted(r_bins.cat.categories, reverse=True)
            r_score_map = {label: score for score, label in enumerate(r_labels, 1)}
            rfm['R_Score'] = r_bins.map(r_score_map)
            # Reverse for Recency (lower is better)
            rfm['R_Score'] = 6 - rfm['R_Score']
        except ValueError:
            # If qcut fails, use simple ranking
            rfm['R_Score'] = pd.cut(rfm['Recency'], bins=5, labels=[5, 4, 3, 2, 1], duplicates='drop')
            if rfm['R_Score'].isna().any():
                rfm['R_Score'] = rfm['Recency'].rank(method='first', ascending=True)
                rfm['R_Score'] = pd.qcut(rfm['R_Score'], 5, labels=[5, 4, 3, 2, 1], duplicates='drop')
        
        try:
            f_bins = pd.qcut(rfm['Frequency'].rank(method='first'), 5, duplicates='drop')
            f_labels = sorted(f_bins.cat.categories)
            f_score_map = {label: score for score, label in enumerate(f_labels, 1)}
            rfm['F_Score'] = f_bins.map(f_score_map)
        except ValueError:
            rfm['F_Score'] = pd.cut(rfm['Frequency'], bins=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
            if rfm['F_Score'].isna().any():
                rfm['F_Score'] = rfm['Frequency'].rank(method='first')
                rfm['F_Score'] = pd.qcut(rfm['F_Score'], 5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        
        try:
            m_bins = pd.qcut(rfm['Monetary'], 5, duplicates='drop')
            m_labels = sorted(m_bins.cat.categories)
            m_score_map = {label: score for score, label in enumerate(m_labels, 1)}
            rfm['M_Score'] = m_bins.map(m_score_map)
        except ValueError:
            rfm['M_Score'] = pd.cut(rfm['Monetary'], bins=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
            if rfm['M_Score'].isna().any():
                rfm['M_Score'] = rfm['Monetary'].rank(method='first')
                rfm['M_Score'] = pd.qcut(rfm['M_Score'], 5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        
        # Ensure scores are integers
        rfm['R_Score'] = rfm['R_Score'].astype(int)
        rfm['F_Score'] = rfm['F_Score'].astype(int)
        rfm['M_Score'] = rfm['M_Score'].astype(int)
        
        rfm['RFM_Score'] = rfm['R_Score'].astype(str) + rfm['F_Score'].astype(str) + rfm['M_Score'].astype(str)
        
        # --- Segmentation ---
        rfm = get_rfm_segments(rfm)
        
        segment_counts = rfm['Segment'].value_counts().reset_index()
        segment_counts.columns = ['Segment', 'Count']
        
        # --- Plotting ---
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        
        # Segment Distribution Bar Chart
        sns.barplot(data=segment_counts, y='Segment', x='Count', ax=axes[0], palette='viridis')
        axes[0].set_title('Customer Segment Distribution')
        axes[0].set_xlabel('Number of Customers')

        # RFM Treemap
        # For treemap, we need to create a flat dataframe
        squarify_df = rfm.groupby('Segment')['Monetary'].sum().reset_index()
        
        import squarify
        sizes = squarify_df['Monetary']
        labels = [f'{row.Segment}\n(${row.Monetary:,.0f})' for _, row in squarify_df.iterrows()]
        colors = [plt.cm.viridis(i/float(len(sizes))) for i in range(len(sizes))]
        
        squarify.plot(sizes=sizes, label=labels, ax=axes[1], alpha=0.8, color=colors)
        axes[1].set_title('Segment Value (Monetary)')
        axes[1].axis('off')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        # --- Final Results ---
        results = {
            'rfm_data': rfm.reset_index().to_dict('records'),
            'segment_distribution': segment_counts.to_dict('records'),
            'plot': f"data:image/png;base64,{plot_image}"
        }
        
        print(json.dumps(results, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    # Add squarify to requirements if it's not there
    try:
        import squarify
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "squarify"])

    main()


