import sys
import json
import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    """Recursively convert numpy/pandas types to native Python types."""
    if isinstance(obj, dict):
        return {k: _to_native_type(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_native_type(item) for item in obj]
    elif isinstance(obj, np.integer):
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

def generate_chart_data(demand_curve, price_col):
    """Generate chart-ready data for frontend."""
    chart_data = []
    for _, row in demand_curve.iterrows():
        point = {
            'price': float(row[price_col]),
            'likelihood': float(row['likelihood'] * 100),  # Convert to percentage
            'revenue': float(row['revenue']),
        }
        if 'profit' in row and pd.notna(row['profit']):
            point['profit'] = float(row['profit'])
        chart_data.append(point)
    return chart_data

def calculate_confidence_intervals(df, price_col, purchase_intent_col):
    """Calculate 95% confidence intervals for demand curve."""
    confidence_data = []
    for price in df[price_col].unique():
        subset = df[df[price_col] == price][purchase_intent_col]
        if len(subset) > 1:
            mean = subset.mean()
            std_error = subset.std() / np.sqrt(len(subset))
            ci_lower = max(0, mean - 1.96 * std_error)
            ci_upper = min(1, mean + 1.96 * std_error)
            confidence_data.append({
                'price': float(price),
                'mean': float(mean),
                'ci_lower': float(ci_lower),
                'ci_upper': float(ci_upper),
                'sample_size': int(len(subset))
            })
    return confidence_data

def generate_price_recommendations(results):
    """Generate strategic price recommendations."""
    recommendations = []
    
    rev_price = results.get('optimal_revenue_price')
    prof_price = results.get('optimal_profit_price')
    cliff_price = results.get('cliff_price')
    acceptable_range = results.get('acceptable_range')
    
    if prof_price is not None:
        recommendations.append({
            'strategy': 'Profit Maximization',
            'price': prof_price,
            'rationale': f'Maximizes profit at ${prof_price:.2f}. Best balance of margin and volume.',
            'priority': 1
        })
    
    if rev_price is not None:
        recommendations.append({
            'strategy': 'Revenue Maximization',
            'price': rev_price,
            'rationale': f'Maximizes revenue at ${rev_price:.2f}. Ideal for market share growth.',
            'priority': 2 if prof_price is not None else 1
        })
    
    if cliff_price is not None:
        recommendations.append({
            'strategy': 'Avoid Demand Cliff',
            'price': cliff_price * 0.95,  # 5% below cliff
            'rationale': f'Stay below ${cliff_price:.2f} to avoid sharp demand drop.',
            'priority': 3
        })
    
    if acceptable_range is not None and len(acceptable_range) == 2:
        mid_price = (acceptable_range[0] + acceptable_range[1]) / 2
        recommendations.append({
            'strategy': 'Safe Zone Pricing',
            'price': mid_price,
            'rationale': f'Mid-point of acceptable range (${acceptable_range[0]:.2f} - ${acceptable_range[1]:.2f}).',
            'priority': 4
        })
    
    return recommendations

def generate_interpretation(results):
    """Generate detailed interpretation of Gabor-Granger analysis results."""
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
        interp += f"1. **Primary Strategy:** Target the profit-optimal price of **${prof_price:.2f}** for the best balance of sales volume and margin.\n"
        interp += f"2. **Market Share Focus:** If the goal is to maximize market penetration or revenue, consider pricing closer to the revenue-optimal price of **${rev_price:.2f}**, but be aware of the lower profit margin.\n"
    else:
        interp += f"1. **Revenue Maximization:** The price point of **${rev_price:.2f}** is ideal for maximizing top-line revenue. Enter a unit cost to calculate the profit-optimal price.\n"
    
    interp += f"3. **Pricing Ceiling:** Avoid pricing above the 'demand cliff' of **${cliff_price:.2f}** without significant added value, as this is where you will lose the most customers.\n"

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
        
        # Validate data
        if df.empty:
            raise ValueError("Empty dataset provided.")
        
        # Ensure columns exist
        if price_col not in df.columns:
            raise ValueError(f"Price column '{price_col}' not found in data.")
        if purchase_intent_col not in df.columns:
            raise ValueError(f"Purchase intent column '{purchase_intent_col}' not found in data.")
        
        # Ensure columns are numeric
        df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
        df[purchase_intent_col] = pd.to_numeric(df[purchase_intent_col], errors='coerce')
        df = df.dropna(subset=[price_col, purchase_intent_col])

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis (minimum 10 required).")

        # Store total respondents and price range
        total_respondents = len(df)
        price_range = {
            'min': float(df[price_col].min()),
            'max': float(df[price_col].max()),
            'mean': float(df[price_col].mean())
        }

        # Aggregate purchase likelihood at each price point
        demand_curve = df.groupby(price_col)[purchase_intent_col].agg(['mean', 'count']).reset_index()
        demand_curve.rename(columns={'mean': 'likelihood', 'count': 'sample_size'}, inplace=True)
        demand_curve['revenue'] = demand_curve[price_col] * demand_curve['likelihood']
        
        # Calculate demand drop (cliff detection)
        demand_curve['demand_drop'] = -demand_curve['likelihood'].diff()
        demand_curve['demand_drop'] = demand_curve['demand_drop'].fillna(0)
        
        # Find optimal price point (that maximizes revenue)
        optimal_revenue_price = 0
        max_revenue = 0
        if not demand_curve.empty:
            optimal_price_row = demand_curve.loc[demand_curve['revenue'].idxmax()]
            optimal_revenue_price = float(optimal_price_row[price_col])
            max_revenue = float(optimal_price_row['revenue'])
        
        results_dict = {
            'optimal_revenue_price': optimal_revenue_price,
            'max_revenue': max_revenue,
            'total_respondents': total_respondents,
            'price_range': price_range,
            'price_points_tested': int(demand_curve.shape[0])
        }

        # Find "cliff" price where demand drops most sharply
        if not demand_curve.empty:
            cliff_price_row = demand_curve.sort_values('demand_drop', ascending=False).iloc[0]
            results_dict['cliff_price'] = float(cliff_price_row[price_col])
            results_dict['cliff_drop'] = float(cliff_price_row['demand_drop'])
        else:
            results_dict['cliff_price'] = None
            results_dict['cliff_drop'] = None
        
        # Find acceptable price range (e.g., where revenue is >= 90% of max)
        acceptable_range_df = demand_curve[demand_curve['revenue'] >= 0.9 * max_revenue]
        if not acceptable_range_df.empty:
            results_dict['acceptable_range'] = [
                float(acceptable_range_df[price_col].min()),
                float(acceptable_range_df[price_col].max())
            ]
        else:
            results_dict['acceptable_range'] = None

        # Calculate profit if cost is provided
        if unit_cost is not None:
            demand_curve['profit_margin'] = demand_curve[price_col] - unit_cost
            demand_curve['profit'] = demand_curve['profit_margin'] * demand_curve['likelihood']
            if not demand_curve.empty and not demand_curve['profit'].isnull().all():
                optimal_profit_row = demand_curve.loc[demand_curve['profit'].idxmax()]
                results_dict['optimal_profit_price'] = float(optimal_profit_row[price_col])
                results_dict['max_profit'] = float(optimal_profit_row['profit'])
                results_dict['unit_cost'] = unit_cost
            else:
                results_dict['optimal_profit_price'] = None
                results_dict['max_profit'] = None
        else:
            results_dict['optimal_profit_price'] = None
            results_dict['max_profit'] = None

        # Calculate price elasticity
        demand_curve_sorted = demand_curve.sort_values(price_col)
        prices = demand_curve_sorted[price_col].values
        quantities = demand_curve_sorted['likelihood'].values
        
        elasticities = []
        for i in range(1, len(prices)):
            if prices[i-1] == 0 or quantities[i-1] == 0:
                continue
            price_change = (prices[i] - prices[i-1]) / prices[i-1]
            quantity_change = (quantities[i] - quantities[i-1]) / quantities[i-1]
            
            if price_change != 0:
                elasticity = quantity_change / price_change
                elasticities.append({
                    'price_from': float(prices[i-1]),
                    'price_to': float(prices[i]),
                    'elasticity': float(elasticity),
                    'interpretation': 'Elastic' if elasticity < -1 else 'Inelastic' if elasticity > -1 else 'Unit Elastic'
                })
        
        results_dict['price_elasticity'] = elasticities
        
        # Calculate confidence intervals
        confidence_intervals = calculate_confidence_intervals(df, price_col, purchase_intent_col)
        results_dict['confidence_intervals'] = confidence_intervals
        
        # Generate chart data
        results_dict['chart_data'] = generate_chart_data(demand_curve, price_col)
        
        # Generate price recommendations
        results_dict['recommendations'] = generate_price_recommendations(results_dict)
        
        # Generate interpretation text
        results_dict['interpretation'] = generate_interpretation(results_dict)

        # Convert demand_curve to dict for response
        results_dict['demand_curve'] = demand_curve.to_dict('records')

        response = {
            'results': _to_native_type(results_dict),
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()



