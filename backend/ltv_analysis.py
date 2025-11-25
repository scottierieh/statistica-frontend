
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

try:
    from lifelines import WeibullAFTFitter
    from lifelines.utils import datetimes_to_durations
    LIFELINES_AVAILABLE = True
except ImportError:
    LIFELINES_AVAILABLE = False

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    if not LIFELINES_AVAILABLE:
        print(json.dumps({"error": "The 'lifelines' library is required for this analysis. Please ensure it is installed."}), file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        customer_id_col = payload.get('customer_id_col')
        datetime_col = payload.get('datetime_col')
        monetary_value_col = payload.get('monetary_value_col')
        
        prediction_months = int(payload.get('prediction_months', 12))

        if not all([data, customer_id_col, datetime_col, monetary_value_col]):
            raise ValueError("Missing required parameters.")

        df = pd.DataFrame(data)
        
        # --- Data Preparation ---
        df[datetime_col] = pd.to_datetime(df[datetime_col], errors='coerce')
        df[monetary_value_col] = pd.to_numeric(df[monetary_value_col], errors='coerce')
        df.dropna(subset=[customer_id_col, datetime_col, monetary_value_col], inplace=True)
        
        df = df[df[monetary_value_col] > 0]
        
        if len(df) == 0:
            raise ValueError("No valid data after cleaning.")
            
        # RFM-style data aggregation
        snapshot_date = df[datetime_col].max() + pd.Timedelta(days=1)
        
        agg_df = df.groupby(customer_id_col).agg(
            recency=(datetime_col, lambda date: (date.max() - date.min()).days),
            frequency=(datetime_col, 'count'),
            T=(datetime_col, lambda date: (snapshot_date - date.min()).days),
            monetary_value=(monetary_value_col, 'mean')
        ).reset_index()

        agg_df = agg_df[agg_df['frequency'] > 1] # Model needs repeat customers
        
        if len(agg_df) < 10:
             raise ValueError("Not enough repeat customers for a reliable LTV model.")

        # --- AFT Model for Purchase Frequency ---
        # We will model time between purchases
        df_sorted = df.sort_values([customer_id_col, datetime_col])
        df_sorted['time_since_last'] = df_sorted.groupby(customer_id_col)[datetime_col].diff().dt.days
        
        # We need to create a survival dataset for time between purchases
        interpurchase_data = df_sorted.dropna(subset=['time_since_last'])
        
        # AFT model for time between purchases
        aft = WeibullAFTFitter()
        
        # We can add covariates here if needed, for now just a baseline model
        interpurchase_data['event'] = 1 # All inter-purchase times are observed events
        
        # Add a dummy covariate as lifelines requires it for predict_... functions
        interpurchase_data['dummy_covariate'] = 1
        
        aft.fit(interpurchase_data[['time_since_last', 'event', 'dummy_covariate']], 
                duration_col='time_since_last', 
                event_col='event')
        
        # Predicted median time until next purchase
        dummy_df_for_pred = pd.DataFrame([{'dummy_covariate': 1}])
        predicted_median_time_between_purchases = aft.predict_median(dummy_df_for_pred).iloc[0]

        # --- LTV Calculation ---
        # Avg purchases per month (simplified)
        avg_purchases_per_month = 30 / predicted_median_time_between_purchases if predicted_median_time_between_purchases > 0 else 0

        # Now, calculate LTV for each customer in agg_df
        ltv_results = []
        for _, row in agg_df.iterrows():
            customer_id = row[customer_id_col]
            avg_monetary_value = row['monetary_value']
            
            # Simplified LTV = (Avg Purchases per Month * Prediction Months) * Avg Monetary Value
            predicted_ltv = avg_purchases_per_month * prediction_months * avg_monetary_value
            
            ltv_results.append({
                'CustomerID': customer_id,
                'predicted_ltv': predicted_ltv,
                'frequency': row['frequency'],
                'recency': row['recency'],
                'monetary_value': avg_monetary_value
            })

        results_df = pd.DataFrame(ltv_results)
        
        summary = {
            'total_customers': int(len(agg_df)),
            'average_ltv': float(results_df['predicted_ltv'].mean()),
            'median_ltv': float(results_df['predicted_ltv'].median()),
            'total_predicted_revenue': float(results_df['predicted_ltv'].sum()),
            'returning_customers': int(len(agg_df))
        }
        
        top_customers = results_df.nlargest(10, 'predicted_ltv').to_dict('records')
        
        response = {
            'results': {
                'summary': summary,
                'top_customers': top_customers,
                'all_customers_ltv': results_df.to_dict('records')
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        import traceback
        error_response = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
