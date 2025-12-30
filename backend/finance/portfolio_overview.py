# backend/finance/portfolio_overview.py
# Portfolio Overview Analysis - stdin/stdout for Next.js API

import sys
import json
import math
from datetime import datetime
from typing import List, Dict, Any


# ============================================
# UTILITY FUNCTIONS
# ============================================

def parse_number(value: Any) -> float:
    """Parse various number formats to float."""
    if value is None or value == '':
        return 0.0
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return 0.0
        return float(value)
    
    s = str(value)
    for char in ['$', '€', '£', '¥', '₩', ',', ' ']:
        s = s.replace(char, '')
    
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    
    try:
        return float(s)
    except ValueError:
        return 0.0


def calculate_std_dev(values: List[float]) -> float:
    """Calculate standard deviation."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    squared_diffs = [(v - mean) ** 2 for v in values]
    variance = sum(squared_diffs) / (len(values) - 1)
    return math.sqrt(variance)


def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization."""
    if hasattr(obj, 'item'):
        return obj.item()
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


# ============================================
# MAIN CALCULATION FUNCTION
# ============================================

def calculate_portfolio_overview(data: List[Dict[str, Any]], columns: Dict[str, str]) -> Dict[str, Any]:
    """Calculate comprehensive portfolio overview."""
    warnings: List[str] = []
    
    if not data:
        return _create_empty_result("No data provided")
    
    # Extract column names
    ticker_col = columns.get('ticker', '')
    name_col = columns.get('name', '')
    sector_col = columns.get('sector', '')
    asset_class_col = columns.get('asset_class', '')
    shares_col = columns.get('shares', '')
    avg_cost_col = columns.get('avg_cost', '')
    current_price_col = columns.get('current_price', '')
    daily_change_col = columns.get('daily_change', '')
    
    if not all([ticker_col, shares_col, avg_cost_col, current_price_col]):
        return _create_empty_result("Missing required columns")
    
    # ----------------------------------------
    # 1. PARSE HOLDINGS
    # ----------------------------------------
    holdings = []
    
    for row in data:
        ticker = str(row.get(ticker_col, ''))
        if not ticker:
            continue
            
        shares = parse_number(row.get(shares_col, 0))
        if shares <= 0:
            continue
            
        avg_cost = parse_number(row.get(avg_cost_col, 0))
        current_price = parse_number(row.get(current_price_col, 0))
        daily_change = parse_number(row.get(daily_change_col, 0)) if daily_change_col else 0
        
        market_value = shares * current_price
        cost_basis = shares * avg_cost
        unrealized_gain = market_value - cost_basis
        unrealized_gain_pct = (unrealized_gain / cost_basis * 100) if cost_basis > 0 else 0
        
        holdings.append({
            'ticker': ticker,
            'name': str(row.get(name_col, '')) if name_col else ticker,
            'sector': str(row.get(sector_col, 'Unclassified')) if sector_col else 'Unclassified',
            'asset_class': str(row.get(asset_class_col, 'Equity')) if asset_class_col else 'Equity',
            'shares': shares,
            'avg_cost': avg_cost,
            'current_price': current_price,
            'market_value': market_value,
            'cost_basis': cost_basis,
            'unrealized_gain': unrealized_gain,
            'unrealized_gain_pct': unrealized_gain_pct,
            'daily_change': daily_change * current_price * shares / 100 if daily_change else 0,
            'daily_change_pct': daily_change,
            'weight': 0
        })
    
    if not holdings:
        return _create_empty_result("No valid holdings found")
    
    # ----------------------------------------
    # 2. CALCULATE TOTALS
    # ----------------------------------------
    total_value = sum(h['market_value'] for h in holdings)
    total_cost = sum(h['cost_basis'] for h in holdings)
    total_gain = total_value - total_cost
    total_gain_pct = (total_gain / total_cost * 100) if total_cost > 0 else 0
    
    daily_change = sum(h['daily_change'] for h in holdings)
    daily_change_pct = (daily_change / total_value * 100) if total_value > 0 else 0
    
    # Calculate weights
    for h in holdings:
        h['weight'] = (h['market_value'] / total_value * 100) if total_value > 0 else 0
    
    # Sort by weight
    holdings.sort(key=lambda x: x['weight'], reverse=True)
    
    # ----------------------------------------
    # 3. SECTOR ALLOCATION
    # ----------------------------------------
    sector_map: Dict[str, Dict] = {}
    
    for h in holdings:
        sector = h['sector']
        if sector not in sector_map:
            sector_map[sector] = {'value': 0, 'cost': 0, 'holdings': []}
        sector_map[sector]['value'] += h['market_value']
        sector_map[sector]['cost'] += h['cost_basis']
        sector_map[sector]['holdings'].append(h['ticker'])
    
    sector_allocation = []
    for sector, sdata in sector_map.items():
        value = sdata['value']
        cost = sdata['cost']
        gain = value - cost
        
        sector_allocation.append({
            'sector': sector,
            'value': value,
            'cost': cost,
            'weight': (value / total_value * 100) if total_value > 0 else 0,
            'holding_count': len(sdata['holdings']),
            'gain': gain,
            'gain_pct': (gain / cost * 100) if cost > 0 else 0,
            'holdings': sdata['holdings']
        })
    
    sector_allocation.sort(key=lambda x: x['weight'], reverse=True)
    
    # ----------------------------------------
    # 4. ASSET CLASS ALLOCATION
    # ----------------------------------------
    asset_class_map: Dict[str, Dict] = {}
    
    for h in holdings:
        asset_class = h['asset_class']
        if asset_class not in asset_class_map:
            asset_class_map[asset_class] = {'value': 0, 'holdings': []}
        asset_class_map[asset_class]['value'] += h['market_value']
        asset_class_map[asset_class]['holdings'].append(h['ticker'])
    
    asset_class_allocation = []
    for asset_class, adata in asset_class_map.items():
        asset_class_allocation.append({
            'asset_class': asset_class,
            'value': adata['value'],
            'weight': (adata['value'] / total_value * 100) if total_value > 0 else 0,
            'holding_count': len(adata['holdings']),
            'holdings': adata['holdings']
        })
    
    asset_class_allocation.sort(key=lambda x: x['weight'], reverse=True)
    
    # ----------------------------------------
    # 5. CONCENTRATION METRICS
    # ----------------------------------------
    weights = [h['weight'] for h in holdings]
    weights_decimal = [w / 100 for w in weights]
    
    hhi_sum = sum(w * w for w in weights_decimal)
    herfindahl_index = hhi_sum * 10000
    effective_holdings = (1 / hhi_sum) if hhi_sum > 0 else len(holdings)
    
    sorted_weights = sorted(weights, reverse=True)
    top5_weight = sum(sorted_weights[:5]) if len(sorted_weights) >= 5 else sum(sorted_weights)
    top10_weight = sum(sorted_weights[:10]) if len(sorted_weights) >= 10 else sum(sorted_weights)
    
    concentration = {
        'herfindahl_index': herfindahl_index,
        'effective_num_holdings': effective_holdings,
        'top5_weight': top5_weight,
        'top10_weight': top10_weight,
        'max_weight': max(weights) if weights else 0,
        'min_weight': min(weights) if weights else 0,
        'weight_std_dev': calculate_std_dev(weights)
    }
    
    # ----------------------------------------
    # 6. GAIN/LOSS BREAKDOWN
    # ----------------------------------------
    gainers = [h for h in holdings if h['unrealized_gain'] > 0]
    losers = [h for h in holdings if h['unrealized_gain'] < 0]
    unchanged = [h for h in holdings if h['unrealized_gain'] == 0]
    
    gain_loss = {
        'total_gainers': len(gainers),
        'total_losers': len(losers),
        'total_unchanged': len(unchanged),
        'gainers_value': sum(h['market_value'] for h in gainers),
        'losers_value': sum(h['market_value'] for h in losers),
        'gainers_gain': sum(h['unrealized_gain'] for h in gainers),
        'losers_loss': sum(h['unrealized_gain'] for h in losers),
        'avg_gainer_return': (sum(h['unrealized_gain_pct'] for h in gainers) / len(gainers)) if gainers else 0,
        'avg_loser_return': (sum(h['unrealized_gain_pct'] for h in losers) / len(losers)) if losers else 0,
        'win_rate': (len(gainers) / len(holdings) * 100) if holdings else 0
    }
    
    # ----------------------------------------
    # 7. SUMMARY
    # ----------------------------------------
    top_holding = holdings[0] if holdings else None
    sorted_by_gain = sorted(holdings, key=lambda x: x['unrealized_gain_pct'], reverse=True)
    top_gainer = sorted_by_gain[0] if sorted_by_gain else None
    top_loser = sorted_by_gain[-1] if sorted_by_gain else None
    
    summary = {
        'total_value': total_value,
        'total_cost': total_cost,
        'total_gain': total_gain,
        'total_gain_pct': total_gain_pct,
        'daily_change': daily_change,
        'daily_change_pct': daily_change_pct,
        'num_holdings': len(holdings),
        'num_sectors': len(sector_allocation),
        'top_holding': {'ticker': top_holding['ticker'], 'weight': top_holding['weight']} if top_holding else None,
        'top_gainer': {'ticker': top_gainer['ticker'], 'gain_pct': top_gainer['unrealized_gain_pct']} if top_gainer else None,
        'top_loser': {'ticker': top_loser['ticker'], 'gain_pct': top_loser['unrealized_gain_pct']} if top_loser else None,
        'avg_holding_size': total_value / len(holdings) if holdings else 0,
        'largest_position': max(h['market_value'] for h in holdings) if holdings else 0,
        'smallest_position': min(h['market_value'] for h in holdings) if holdings else 0
    }
    
    # ----------------------------------------
    # 8. WARNINGS
    # ----------------------------------------
    if concentration['max_weight'] > 25:
        warnings.append(f"High concentration: {holdings[0]['ticker']} represents {concentration['max_weight']:.1f}% of portfolio")
    
    if top5_weight > 70:
        warnings.append(f"Top 5 holdings represent {top5_weight:.1f}% of portfolio")
    
    if effective_holdings < len(holdings) / 2:
        warnings.append(f"Low diversification: Effective holdings ({effective_holdings:.1f}) much lower than actual ({len(holdings)})")
    
    if gain_loss['win_rate'] < 30:
        warnings.append(f"Low win rate: Only {gain_loss['win_rate']:.1f}% of holdings are profitable")
    
    # ----------------------------------------
    # RETURN RESULT
    # ----------------------------------------
    return {
        'timestamp': datetime.now().isoformat(),
        'data_points': len(data),
        'holdings': holdings,
        'summary': summary,
        'sector_allocation': sector_allocation,
        'asset_class_allocation': asset_class_allocation,
        'concentration': concentration,
        'gain_loss': gain_loss,
        'warnings': warnings
    }


def _create_empty_result(message: str) -> Dict[str, Any]:
    """Create empty result with error message."""
    return {
        'timestamp': datetime.now().isoformat(),
        'data_points': 0,
        'holdings': [],
        'summary': {
            'total_value': 0, 'total_cost': 0, 'total_gain': 0, 'total_gain_pct': 0,
            'daily_change': 0, 'daily_change_pct': 0, 'num_holdings': 0, 'num_sectors': 0,
            'top_holding': None, 'top_gainer': None, 'top_loser': None,
            'avg_holding_size': 0, 'largest_position': 0, 'smallest_position': 0
        },
        'sector_allocation': [],
        'asset_class_allocation': [],
        'concentration': {
            'herfindahl_index': 0, 'effective_num_holdings': 0,
            'top5_weight': 0, 'top10_weight': 0,
            'max_weight': 0, 'min_weight': 0, 'weight_std_dev': 0
        },
        'gain_loss': {
            'total_gainers': 0, 'total_losers': 0, 'total_unchanged': 0,
            'gainers_value': 0, 'losers_value': 0,
            'gainers_gain': 0, 'losers_loss': 0,
            'avg_gainer_return': 0, 'avg_loser_return': 0, 'win_rate': 0
        },
        'warnings': [message]
    }


# ============================================
# MAIN - Read from stdin, write to stdout
# ============================================

def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data', [])
        columns = payload.get('columns', {})
        
        result = calculate_portfolio_overview(data, columns)
        
        print(json.dumps(result, default=_to_native_type))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
    