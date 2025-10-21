#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
from scipy import interpolate
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: _to_native_type(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_native_type(item) for item in obj]
    elif pd.isna(obj):
        return None
    return obj

def find_intersection(x, y1, y2):
    """
    Find intersection point of two curves using improved algorithm
    
    Van Westendorp intersections:
    - PMC (Point of Marginal Cheapness): Too Cheap vs Expensive
    - PME (Point of Marginal Expensiveness): Cheap vs Too Expensive  
    - IDP (Indifference Price Point): Cheap vs Expensive
    - OPP (Optimal Price Point): Too Cheap vs Too Expensive
    """
    try:
        # Create interpolation functions
        f1 = interpolate.interp1d(x, y1, kind='linear', fill_value='extrapolate', bounds_error=False)
        f2 = interpolate.interp1d(x, y2, kind='linear', fill_value='extrapolate', bounds_error=False)
        
        # Find where curves cross
        diff = f1(x) - f2(x)
        sign_changes = np.where(np.diff(np.sign(diff)))[0]
        
        if len(sign_changes) == 0:
            # No intersection found, return point of minimum difference
            idx = np.argmin(np.abs(diff))
            return float(x[idx])
        
        # Use first intersection point
        idx = sign_changes[0]
        
        # Linear interpolation for precise intersection
        x1, x2 = x[idx], x[idx + 1]
        y1_1, y1_2 = f1(x1), f1(x2)
        y2_1, y2_2 = f2(x1), f2(x2)
        
        # Solve for intersection: y1_1 + t*(y1_2 - y1_1) = y2_1 + t*(y2_2 - y2_1)
        denominator = (y1_2 - y1_1) - (y2_2 - y2_1)
        if abs(denominator) < 1e-10:
            return float(x1)
        
        t = (y2_1 - y1_1) / denominator
        t = np.clip(t, 0, 1)  # Ensure t is between 0 and 1
        
        intersection_x = x1 + t * (x2 - x1)
        return float(intersection_x)
        
    except Exception as e:
        # Fallback: find minimum difference
        diff = np.abs(np.array(y1) - np.array(y2))
        idx = np.argmin(diff)
        return float(x[idx])

def calculate_vw_curves(df, price_cols, price_range):
    """
    Calculate Van Westendorp cumulative curves
    
    Standard Van Westendorp methodology:
    - Too Cheap: Cumulative % who said price is too cheap at or below this price
    - Cheap: Cumulative % who said price is cheap (bargain) at or below this price
    - Expensive: Cumulative % who said price is expensive at or above this price (inverted)
    - Too Expensive: Cumulative % who said price is too expensive at or above this price (inverted)
    """
    too_cheap_col, cheap_col, expensive_col, too_expensive_col = price_cols
    n = len(df)
    if n == 0:
        return None

    # Cumulative "at or below" percentages (ascending curves)
    too_cheap_cum = np.array([(df[too_cheap_col] <= p).sum() / n * 100 for p in price_range])
    cheap_cum = np.array([(df[cheap_col] <= p).sum() / n * 100 for p in price_range])

    # Cumulative "at or above" percentages (descending curves)
    # These represent "NOT acceptable" at this price
    expensive_cum = np.array([(df[expensive_col] >= p).sum() / n * 100 for p in price_range])
    too_expensive_cum = np.array([(df[too_expensive_col] >= p).sum() / n * 100 for p in price_range])
    
    return {
        'too_cheap': too_cheap_cum,
        'cheap': cheap_cum,
        'expensive': expensive_cum,
        'too_expensive': too_expensive_cum
    }

def calculate_acceptance_curve(curves):
    """
    Calculate price acceptance curve
    
    Acceptance = customers who find price neither too cheap nor too expensive
    = (100 - too_cheap) AND (100 - too_expensive)
    = min(not_too_cheap, not_too_expensive)
    """
    not_too_cheap = 100 - curves['too_cheap']
    not_too_expensive = 100 - curves['too_expensive']
    
    # Acceptance is the minimum of the two
    acceptance = np.minimum(not_too_cheap, not_too_expensive)
    
    return {
        'acceptance': acceptance,
        'not_too_cheap': not_too_cheap,
        'not_too_expensive': not_too_expensive
    }

def calculate_price_points(price_range, curves):
    """
    Calculate Van Westendorp price points from curves
    
    PMC (Point of Marginal Cheapness): Too Cheap ∩ Expensive
    PME (Point of Marginal Expensiveness): Cheap ∩ Too Expensive
    IDP (Indifference Price Point): Cheap ∩ Expensive
    OPP (Optimal Price Point): Too Cheap ∩ Too Expensive
    """
    # PMC: "Too Cheap" vs "Expensive"
    pmc = find_intersection(price_range, curves['too_cheap'], curves['expensive'])
    
    # PME: "Cheap" vs "Too Expensive"
    pme = find_intersection(price_range, curves['cheap'], curves['too_expensive'])
    
    # IDP: "Cheap" vs "Expensive"
    idp = find_intersection(price_range, curves['cheap'], curves['expensive'])
    
    # OPP: "Too Cheap" vs "Too Expensive"
    opp = find_intersection(price_range, curves['too_cheap'], curves['too_expensive'])

    return {
        'pmc': float(pmc),
        'pme': float(pme),
        'opp': float(opp),
        'idp': float(idp)
    }

def calculate_revenue_curve(price_range, acceptance, unit_cost=0):
    """
    Calculate revenue and profit curves
    
    Assumptions:
    - Market size = 100 units (normalized)
    - Demand = Acceptance % × Market size
    - Revenue = Price × Demand
    - Profit = (Price - Unit Cost) × Demand
    """
    market_size = 100
    demand = (acceptance / 100) * market_size
    revenue = price_range * demand
    profit = (price_range - unit_cost) * demand
    
    # Find optimal revenue and profit points
    max_revenue_idx = np.argmax(revenue)
    max_profit_idx = np.argmax(profit)
    
    return {
        'revenue': revenue,
        'profit': profit,
        'demand': demand,
        'optimal_revenue_price': float(price_range[max_revenue_idx]),
        'optimal_revenue_value': float(revenue[max_revenue_idx]),
        'optimal_profit_price': float(price_range[max_profit_idx]),
        'optimal_profit_value': float(profit[max_profit_idx])
    }

def calculate_price_elasticity(price_range, demand):
    """
    Calculate price elasticity of demand
    
    Elasticity = (% change in quantity demanded) / (% change in price)
    E < -1: Elastic (demand is sensitive to price)
    -1 < E < 0: Inelastic (demand is less sensitive to price)
    """
    elasticity = []
    
    for i in range(1, len(price_range)):
        # Avoid division by zero
        if demand[i-1] == 0 or price_range[i-1] == 0:
            elasticity.append(None)
            continue
        
        # Calculate percentage changes
        pct_change_demand = (demand[i] - demand[i-1]) / demand[i-1]
        pct_change_price = (price_range[i] - price_range[i-1]) / price_range[i-1]
        
        # Calculate elasticity
        if abs(pct_change_price) < 1e-10:
            elasticity.append(None)
        else:
            e = pct_change_demand / pct_change_price
            elasticity.append(float(e))
    
    # Add None for first point to match array length
    elasticity = [None] + elasticity
    
    return elasticity

def calculate_statistics(df, price_cols, price_points, acceptance_curve, price_range):
    """Calculate comprehensive statistics"""
    too_cheap_col, cheap_col, expensive_col, too_expensive_col = price_cols
    
    # Price distribution statistics
    price_distribution = {}
    for col in price_cols:
        col_name = col.replace(' ', '_').lower()
        price_distribution[col_name] = {
            'mean': float(df[col].mean()),
            'median': float(df[col].median()),
            'std': float(df[col].std()),
            'min': float(df[col].min()),
            'max': float(df[col].max()),
            'q25': float(df[col].quantile(0.25)),
            'q75': float(df[col].quantile(0.75))
        }
    
    # Acceptable range statistics
    pmc = price_points['pmc']
    pme = price_points['pme']
    opp = price_points['opp']
    
    # Find acceptance at OPP
    opp_idx = np.argmin(np.abs(price_range - opp))
    acceptance_at_opp = float(acceptance_curve['acceptance'][opp_idx])
    
    # Find maximum acceptance
    max_acceptance_idx = np.argmax(acceptance_curve['acceptance'])
    max_acceptance_price = float(price_range[max_acceptance_idx])
    max_acceptance_value = float(acceptance_curve['acceptance'][max_acceptance_idx])
    
    acceptable_range = {
        'min': float(pmc),
        'max': float(pme),
        'width': float(pme - pmc),
        'optimal_price': float(opp),
        'acceptance_at_opp': acceptance_at_opp,
        'max_acceptance_price': max_acceptance_price,
        'max_acceptance_value': max_acceptance_value
    }
    
    return {
        'total_responses': len(df),
        'price_distribution': price_distribution,
        'acceptable_range': acceptable_range
    }

def generate_interpretation(results, statistics):
    """Generate strategic pricing interpretation"""
    pmc = results.get('pmc')
    pme = results.get('pme')
    opp = results.get('opp')
    idp = results.get('idp')
    
    acceptable_range = statistics.get('acceptable_range', {})
    max_acceptance = acceptable_range.get('max_acceptance_value', 0)
    max_acceptance_price = acceptable_range.get('max_acceptance_price', opp)

    if any(val is None for val in [pmc, pme, opp, idp]):
        return "Could not determine all price points. Check data quality and distribution."

    interpretation = (
        f"Based on {statistics['total_responses']} responses, the Van Westendorp analysis identifies a recommended price range between **${pmc:.2f}** (Point of Marginal Cheapness) "
        f"and **${pme:.2f}** (Point of Marginal Expensiveness).\\n\\n"
        f"**Key Price Points:**\\n"
        f"- **Optimal Price Point (OPP): ${opp:.2f}**\\n"
        f"  This price minimizes the number of customers who find the product too cheap or too expensive. "
        f"At this price, {acceptable_range.get('acceptance_at_opp', 0):.1f}% of customers find the price acceptable.\\n\\n"
        f"- **Indifference Price Point (IDP): ${idp:.2f}**\\n"
        f"  At this price, equal numbers of customers consider the product 'cheap' vs 'expensive'.\\n\\n"
        f"- **Maximum Acceptance: ${max_acceptance_price:.2f}**\\n"
        f"  This price achieves the highest acceptance rate of {max_acceptance:.1f}%.\\n\\n"
        f"**Strategic Recommendations:**\\n"
        f"- **Premium Positioning**: Price between ${idp:.2f} and ${pme:.2f} to position as a premium product\\n"
        f"- **Value Positioning**: Price between ${pmc:.2f} and ${idp:.2f} to position as a value product\\n"
        f"- **Optimal Balance**: Price at ${opp:.2f} for maximum market acceptance\\n"
        f"- **Avoid**: Pricing below ${pmc:.2f} (quality concerns) or above ${pme:.2f} (price resistance)\\n\\n"
        f"**Price Range Width**: ${pme - pmc:.2f} indicates {'a wide' if pme - pmc > (pme + pmc) / 4 else 'a narrow'} acceptable price range, "
        f"suggesting {'flexible' if pme - pmc > (pme + pmc) / 4 else 'limited'} pricing options."
    )
    return interpretation.strip()

def main():
    try:
        # Read input data
        payload = json.load(sys.stdin)
        data = payload.get('data')
        too_cheap_col = payload.get('too_cheap_col', 'Too Cheap')
        cheap_col = payload.get('cheap_col', 'Cheap')
        expensive_col = payload.get('expensive_col', 'Expensive')
        too_expensive_col = payload.get('too_expensive_col', 'Too Expensive')
        unit_cost = payload.get('unit_cost', 0)  # Optional unit cost for profit calculation

        if not data:
            raise ValueError("Missing required data.")

        # Create DataFrame
        df = pd.DataFrame(data)
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        
        # Validate columns
        for col in price_cols:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in data.")
        
        # Clean data
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df_clean = df[price_cols].dropna()
        
        if len(df_clean) < 10:
            raise ValueError(f"Need at least 10 complete responses, found {len(df_clean)}.")
        
        # Validate and fix price ordering
        for idx in df_clean.index:
            prices = df_clean.loc[idx, price_cols].values
            if not all(prices[i] <= prices[i+1] for i in range(len(prices)-1)):
                # Auto-correct by sorting
                df_clean.loc[idx, price_cols] = sorted(prices)
        
        # Determine price range
        price_min = df_clean[price_cols].min().min()
        price_max = df_clean[price_cols].max().max()
        
        # Create dense price range for smooth curves
        price_range = np.linspace(price_min, price_max, 500)
        
        # Calculate Van Westendorp curves
        curves = calculate_vw_curves(df_clean, price_cols, price_range)
        if curves is None:
            raise ValueError("Could not calculate Van Westendorp curves.")

        # Calculate price points
        price_points = calculate_price_points(price_range, curves)
        
        # Calculate acceptance curve
        acceptance_data = calculate_acceptance_curve(curves)
        
        # Calculate revenue and profit curves
        revenue_data = calculate_revenue_curve(price_range, acceptance_data['acceptance'], unit_cost)
        
        # Calculate price elasticity
        elasticity = calculate_price_elasticity(price_range, revenue_data['demand'])
        
        # Calculate statistics
        statistics = calculate_statistics(df_clean, price_cols, price_points, acceptance_data, price_range)
        
        # Generate interpretation
        interpretation = generate_interpretation(price_points, statistics)
        
        # Prepare results
        results = {
            'pmc': price_points['pmc'],
            'pme': price_points['pme'],
            'opp': price_points['opp'],
            'idp': price_points['idp'],
            'interpretation': interpretation
        }
        
        # Prepare curves data for frontend
        curves_data = {
            'price_range': price_range.tolist(),
            'too_cheap': curves['too_cheap'].tolist(),
            'cheap': curves['cheap'].tolist(),
            'expensive': curves['expensive'].tolist(),
            'too_expensive': curves['too_expensive'].tolist(),
            'acceptance': acceptance_data['acceptance'].tolist(),
            'not_too_cheap': acceptance_data['not_too_cheap'].tolist(),
            'not_too_expensive': acceptance_data['not_too_expensive'].tolist()
        }
        
        # Prepare revenue data
        revenue_curves = {
            'price_range': price_range.tolist(),
            'revenue': revenue_data['revenue'].tolist(),
            'profit': revenue_data['profit'].tolist(),
            'demand': revenue_data['demand'].tolist(),
            'optimal_revenue_price': revenue_data['optimal_revenue_price'],
            'optimal_revenue_value': revenue_data['optimal_revenue_value'],
            'optimal_profit_price': revenue_data['optimal_profit_price'],
            'optimal_profit_value': revenue_data['optimal_profit_value']
        }
        
        # Prepare elasticity data
        elasticity_data = {
            'price_range': price_range.tolist(),
            'elasticity': elasticity
        }
        
        # Prepare response
        response = {
            'results': results,
            'curves_data': curves_data,
            'revenue_data': revenue_curves,
            'elasticity_data': elasticity_data,
            'statistics': statistics
        }
        
        print(json.dumps(response, default=_to_native_type))
        
    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

