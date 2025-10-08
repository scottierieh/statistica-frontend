
import sys
import json
import pandas as pd
import numpy as np
import warnings

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
    elif pd.isna(obj):
        return None
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
        
        df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
        df[purchase_intent_col] = pd.to_numeric(df[purchase_intent_col], errors='coerce')
        df = df.dropna(subset=[price_col, purchase_intent_col])

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis.")

        demand_curve = df.groupby(price_col)[purchase_intent_col].mean().reset_index()
        demand_curve.rename(columns={purchase_intent_col: 'likelihood'}, inplace=True)
        demand_curve['revenue'] = demand_curve[price_col] * demand_curve['likelihood']
        
        demand_curve['demand_drop'] = -demand_curve['likelihood'].diff().fillna(0)
        
        optimal_price_row = demand_curve.loc[demand_curve['revenue'].idxmax()]
        optimal_revenue_price = optimal_price_row[price_col]
        max_revenue = optimal_price_row['revenue']
        
        results_dict = {
            'optimal_revenue_price': optimal_revenue_price,
            'max_revenue': max_revenue,
        }

        cliff_price_row = demand_curve.loc[demand_curve['demand_drop'].idxmax()]
        results_dict['cliff_price'] = cliff_price_row[price_col]
        
        acceptable_range_df = demand_curve[demand_curve['revenue'] >= 0.9 * max_revenue]
        results_dict['acceptable_range'] = [acceptable_range_df[price_col].min(), acceptable_range_df[price_col].max()] if not acceptable_range_df.empty else None

        if unit_cost is not None:
            demand_curve['profit'] = (demand_curve[price_col] - unit_cost) * demand_curve['likelihood']
            if not demand_curve.empty and not demand_curve['profit'].isnull().all():
                optimal_profit_row = demand_curve.loc[demand_curve['profit'].idxmax()]
                results_dict['optimal_profit_price'] = optimal_profit_row[price_col]
                results_dict['max_profit'] = optimal_profit_row['profit']
        
        demand_curve_sorted = demand_curve.sort_values(price_col)
        prices = demand_curve_sorted[price_col].values
        quantities = demand_curve_sorted['likelihood'].values
        
        elasticities = []
        for i in range(1, len(prices)):
            if prices[i-1] == 0 or quantities[i-1] == 0: continue
            price_change = (prices[i] - prices[i-1]) / prices[i-1]
            quantity_change = (quantities[i] - quantities[i-1]) / quantities[i-1]
            
            if price_change != 0:
                elasticity = quantity_change / price_change
                elasticities.append({
                    'price_from': prices[i-1],
                    'price_to': prices[i],
                    'elasticity': elasticity
                })
        
        results_dict['price_elasticity'] = elasticities
        results_dict['demand_curve'] = demand_curve.to_dict('records')

        response = {'results': results_dict}

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
