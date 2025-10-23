
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
import squarify

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
        r'[4-5][4-5][4-5]': 'Champions',
        r'[3-4][4-5][3-5]': 'Loyal Customers',
        r'[4-5][2-3][3-5]': 'Potential Loyalists',
        r'5[1-2][1-5]': 'New Customers',
        r'4[1][1-5]': 'Promising',
        r'3[1-3][1-3]': 'Needs Attention',
        r'[1-2][3-5][3-5]': "Can't Lose Them",
        r'[1-2][1-2][1-5]': 'At Risk',
        r'1[1-5][1-5]': 'Hibernating',
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
        
        # Ensure 'invoice_no' exists for frequency calculation
        invoice_no_col = 'invoice_no'
        if 'invoice_no' not in df.columns:
            if 'invoice' in df.columns:
                invoice_no_col = 'invoice'
            else:
                 # If no invoice number, count occurrences as a fallback
                 df['invoice_no'] = df.index

        rfm = df.groupby(customer_id_col).agg({
            invoice_date_col: lambda date: (snapshot_date - date.max()).days,
            invoice_no_col: 'nunique', 
            monetary_col: 'sum'
        })
        
        # Rename columns for clarity
        rfm.rename(columns={invoice_date_col: 'Recency', 
                             invoice_no_col: 'Frequency', 
                             monetary_col: 'Monetary'}, inplace=True)
        
        # --- RFM Scoring (Quintiles using pd.cut for robustness) ---
        r_labels = range(5, 0, -1)
        f_labels = range(1, 6)
        m_labels = range(1, 6)
        
        try:
            rfm['R_Score'] = pd.qcut(rfm['Recency'], 5, labels=r_labels, duplicates='drop').astype(int)
            rfm['F_Score'] = pd.qcut(rfm['Frequency'].rank(method='first'), 5, labels=f_labels, duplicates='drop').astype(int)
            rfm['M_Score'] = pd.qcut(rfm['Monetary'], 5, labels=m_labels, duplicates='drop').astype(int)
        except ValueError:
            # Fallback to quartiles if quintiles fail due to insufficient distinct values
            r_labels_q = range(4, 0, -1)
            f_labels_q = range(1, 5)
            m_labels_q = range(1, 5)
            rfm['R_Score'] = pd.qcut(rfm['Recency'], 4, labels=r_labels_q, duplicates='drop').astype(int)
            rfm['F_Score'] = pd.qcut(rfm['Frequency'].rank(method='first'), 4, labels=f_labels_q, duplicates='drop').astype(int)
            rfm['M_Score'] = pd.qcut(rfm['Monetary'], 4, labels=m_labels_q, duplicates='drop').astype(int)

        
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
        squarify_df = rfm.groupby('Segment')['Monetary'].sum().reset_index()
        
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
    main()
