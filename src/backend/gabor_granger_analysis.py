
import sys
import json
import pandas as pd
import numpy as np
from scipy import interpolate
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        price_col = payload.get('price_col')
        purchase_intent_col = payload.get('purchase_intent_col')
        unit_cost = payload.get('unit_cost')
        if unit_cost is not None:
            unit_cost = float(unit_cost)

        if not all([data, price_col, purchase_intent_col]):
            raise ValueError("Missing required parameters: data, price_col, or purchase_intent_col.")

        df = pd.DataFrame(data)
        
        # Ensure columns are numeric
        df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
        df[purchase_intent_col] = pd.to_numeric(df[purchase_intent_col], errors='coerce')
        df = df.dropna(subset=[price_col, purchase_intent_col])

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis.")

        # Aggregate purchase likelihood at each price point
        demand_curve = df.groupby(price_col)[purchase_intent_col].mean().reset_index()
        demand_curve.rename(columns={purchase_intent_col: 'likelihood'}, inplace=True)
        demand_curve['revenue'] = demand_curve[price_col] * demand_curve['likelihood']
        
        # Find optimal price point (that maximizes revenue)
        optimal_revenue_price = 0
        max_revenue = 0
        if not demand_curve.empty and not demand_curve['revenue'].isnull().all():
            optimal_price_row = demand_curve.loc[demand_curve['revenue'].idxmax()]
            optimal_revenue_price = optimal_price_row[price_col]
            max_revenue = optimal_price_row['revenue']
        
        results_dict = {
            'optimal_revenue_price': optimal_revenue_price,
            'max_revenue': max_revenue,
        }

        # Calculate profit if cost is provided
        if unit_cost is not None:
            demand_curve['profit_margin'] = demand_curve[price_col] - unit_cost
            demand_curve['profit'] = demand_curve['profit_margin'] * demand_curve['likelihood']
            if not demand_curve.empty and not demand_curve['profit'].isnull().all():
                optimal_profit_row = demand_curve.loc[demand_curve['profit'].idxmax()]
                results_dict['optimal_profit_price'] = optimal_profit_row[price_col]
                results_dict['max_profit'] = optimal_profit_row['profit']
            
        results_dict['demand_curve'] = demand_curve.to_dict('records')


        # Find "cliff" price where demand drops most sharply
        demand_curve['demand_drop'] = -demand_curve['likelihood'].diff()
        if not demand_curve.empty and not demand_curve['demand_drop'].isnull().all():
            cliff_price_row = demand_curve.sort_values('demand_drop', ascending=False).iloc[0]
            results_dict['cliff_price'] = cliff_price_row[price_col]
        else:
            results_dict['cliff_price'] = None
        
        # Find acceptable price range (e.g., where revenue is >= 90% of max)
        if max_revenue > 0:
            acceptable_range_df = demand_curve[demand_curve['revenue'] >= 0.9 * max_revenue]
            if not acceptable_range_df.empty:
                results_dict['acceptable_range'] = [acceptable_range_df[price_col].min(), acceptable_range_df[price_col].max()]
            else:
                results_dict['acceptable_range'] = None
        else:
            results_dict['acceptable_range'] = None


        response = {
            'results': results_dict,
            'plot': None, # No longer generating plot on backend
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
