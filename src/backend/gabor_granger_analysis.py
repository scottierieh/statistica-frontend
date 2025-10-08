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

def generate_interpretation(results):
    """
    Generates a detailed interpretation of the Gabor-Granger analysis results.
    """
    if not results:
        return "Analysis could not be completed."

    rev_price = results.get('optimal_revenue_price')
    prof_price = results.get('optimal_profit_price')
    cliff_price = results.get('cliff_price')
    elasticities = results.get('price_elasticity', [])
    
    interp = (
        f"The Gabor-Granger analysis provides key insights into customer price sensitivity and optimal pricing strategies.\n\n"
        f"**Optimal Pricing:**\n"
        f"- The price that maximizes **revenue** is estimated to be **${rev_price:.2f}**.\n"
    )
    
    if prof_price is not None:
        interp += f"- The price that maximizes **profit** is estimated to be **${prof_price:.2f}**. This is often the most recommended price point if your unit costs are accurate.\n"
    else:
        interp += "- A profit-optimal price could not be determined as no unit cost was provided.\n"

    interp += f"\n**Demand & Price Sensitivity:**\n"
    interp += f"- The **'demand cliff'** occurs around **${cliff_price:.2f}**. After this point, purchase likelihood drops most sharply, indicating significant price resistance.\n"
    
    elastic_points = [e for e in elasticities if e.get('elasticity') is not None and e['elasticity'] < -1]
    if elastic_points:
        first_elastic_point = min(elastic_points, key=lambda x: x['price_from'])
        interp += f"- Demand becomes **elastic** (highly price-sensitive) starting in the range of **${first_elastic_point['price_from']:.2f} - ${first_elastic_point['price_to']:.2f}**. In this zone, a price increase will likely lead to a proportionally larger drop in demand, reducing overall revenue.\n"
    else:
        interp += "- Demand appears to be **inelastic** across the tested price range, suggesting that price increases are less likely to significantly deter purchasers.\n"

    interp += "\n**Strategic Recommendations:**\n"
    if prof_price is not None:
        interp += f"1.  **Primary Strategy:** Target the profit-optimal price of **${prof_price:.2f}** for the best balance of sales volume and margin.\n"
        interp += f"2.  **Market Share Focus:** If the goal is to maximize market penetration or revenue, consider pricing closer to the revenue-optimal price of **${rev_price:.2f}**, but be aware of the lower profit margin.\n"
    else:
        interp += f"1.  **Revenue Maximization:** The price point of **${rev_price:.2f}** is ideal for maximizing top-line revenue. Enter a unit cost to calculate the profit-optimal price.\n"
    
    interp += "3.  **Pricing Ceiling:** Avoid pricing above the 'demand cliff' of **${cliff_price:.2f}** without significant added value, as this is where you will lose the most customers.\n"

    return interp.strip()


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
        
        # Calculate demand drop (cliff detection)
        demand_curve['demand_drop'] = -demand_curve['likelihood'].diff()
        demand_curve['demand_drop'] = demand_curve['demand_drop'].fillna(0)
        
        # Find optimal price point (that maximizes revenue)
        optimal_revenue_price = 0
        max_revenue = 0
        if not demand_curve.empty:
            optimal_price_row = demand_curve.loc[demand_curve['revenue'].idxmax()]
            optimal_revenue_price = optimal_price_row[price_col]
            max_revenue = optimal_price_row['revenue']
        
        results_dict = {
            'optimal_revenue_price': optimal_revenue_price,
            'max_revenue': max_revenue,
        }

        # Find "cliff" price where demand drops most sharply
        if not demand_curve.empty:
            cliff_price_row = demand_curve.sort_values('demand_drop', ascending=False).iloc[0]
            results_dict['cliff_price'] = cliff_price_row[price_col]
        else:
            results_dict['cliff_price'] = None
        
        # Find acceptable price range (e.g., where revenue is >= 90% of max)
        acceptable_range_df = demand_curve[demand_curve['revenue'] >= 0.9 * max_revenue]
        if not acceptable_range_df.empty:
            results_dict['acceptable_range'] = [acceptable_range_df[price_col].min(), acceptable_range_df[price_col].max()]
        else:
            results_dict['acceptable_range'] = None

        # Calculate profit if cost is provided
        if unit_cost is not None:
            demand_curve['profit_margin'] = demand_curve[price_col] - unit_cost
            demand_curve['profit'] = demand_curve['profit_margin'] * demand_curve['likelihood']
            if not demand_curve.empty and not demand_curve['profit'].isnull().all():
                optimal_profit_row = demand_curve.loc[demand_curve['profit'].idxmax()]
                results_dict['optimal_profit_price'] = optimal_profit_row[price_col]
                results_dict['max_profit'] = optimal_profit_row['profit']
        else:
             demand_curve['profit'] = np.nan
        
        results_dict['demand_curve'] = demand_curve.to_dict('records')

        # Calculate price elasticity
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
        
        # Generate interpretation text
        results_dict['interpretation'] = generate_interpretation(results_dict)


        response = {
            'results': results_dict,
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
