# backend/finance/asset_allocation.py
# Asset Allocation Analysis - Real calculations

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime
import math


# ============================================
# DATA CLASSES
# ============================================

@dataclass
class SectorAllocation:
    sector: str
    value: float
    cost: float
    weight: float
    holding_count: int
    gain: float
    gain_pct: float
    holdings: List[str]


@dataclass
class AssetClassAllocation:
    asset_class: str
    value: float
    weight: float
    holding_count: int
    holdings: List[str]


@dataclass
class ConcentrationMetrics:
    herfindahl_index: float  # HHI (0-10000 basis points)
    effective_sectors: float  # 1/HHI
    top3_weight: float
    top5_weight: float
    max_sector_weight: float
    min_sector_weight: float
    concentration_level: str  # 'Low', 'Medium', 'High'


@dataclass
class DiversificationMetrics:
    sector_count: int
    asset_class_count: int
    avg_sector_weight: float
    sector_weight_std: float
    diversification_ratio: float  # effective_sectors / actual_sectors
    is_well_diversified: bool


@dataclass
class AllocationComparison:
    sector: str
    current_weight: float
    target_weight: float
    difference: float
    difference_value: float
    action: str  # 'Buy', 'Sell', 'Hold'


@dataclass
class AssetAllocationResult:
    timestamp: str
    total_value: float
    total_cost: float
    sector_allocation: List[Dict[str, Any]]
    asset_class_allocation: List[Dict[str, Any]]
    concentration: Dict[str, Any]
    diversification: Dict[str, Any]
    target_comparison: List[Dict[str, Any]]
    warnings: List[str]
    recommendations: List[str]


# ============================================
# UTILITY FUNCTIONS
# ============================================

def parse_number(value: Any) -> float:
    """Parse various number formats to float."""
    if value is None or value == '':
        return 0.0
    if isinstance(value, (int, float)):
        return 0.0 if math.isnan(value) else float(value)
    
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


# ============================================
# MAIN CALCULATION FUNCTION
# ============================================

def calculate_asset_allocation(
    data: List[Dict[str, Any]],
    columns: Dict[str, str],
    target_allocations: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Calculate comprehensive asset allocation analysis.
    
    Args:
        data: Raw data rows
        columns: Column mappings (ticker, sector, shares, avg_cost, current_price, etc.)
        target_allocations: Optional dict of {sector: target_weight_pct}
    
    Returns:
        Dict with all allocation analysis results
    """
    warnings: List[str] = []
    recommendations: List[str] = []
    
    if not data:
        return _create_empty_result("No data provided")
    
    # Extract column names
    ticker_col = columns.get('ticker', '')
    sector_col = columns.get('sector', '')
    asset_class_col = columns.get('asset_class', '')
    shares_col = columns.get('shares', '')
    avg_cost_col = columns.get('avg_cost', '')
    current_price_col = columns.get('current_price', '')
    
    if not all([ticker_col, shares_col, avg_cost_col, current_price_col]):
        return _create_empty_result("Missing required columns")
    
    # ----------------------------------------
    # 1. PARSE HOLDINGS AND CALCULATE VALUES
    # ----------------------------------------
    holdings = []
    
    for row in data:
        shares = parse_number(row.get(shares_col, 0))
        if shares <= 0:
            continue
            
        avg_cost = parse_number(row.get(avg_cost_col, 0))
        current_price = parse_number(row.get(current_price_col, 0))
        
        market_value = shares * current_price
        cost_basis = shares * avg_cost
        
        holdings.append({
            'ticker': str(row.get(ticker_col, 'Unknown')),
            'sector': str(row.get(sector_col, 'Unclassified')) if sector_col else 'Unclassified',
            'asset_class': str(row.get(asset_class_col, 'Equity')) if asset_class_col else 'Equity',
            'shares': shares,
            'avg_cost': avg_cost,
            'current_price': current_price,
            'market_value': market_value,
            'cost_basis': cost_basis
        })
    
    if not holdings:
        return _create_empty_result("No valid holdings found")
    
    # ----------------------------------------
    # 2. CALCULATE TOTALS
    # ----------------------------------------
    total_value = sum(h['market_value'] for h in holdings)
    total_cost = sum(h['cost_basis'] for h in holdings)
    
    if total_value <= 0:
        return _create_empty_result("Total portfolio value is zero or negative")
    
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
    for sector, data in sector_map.items():
        value = data['value']
        cost = data['cost']
        gain = value - cost
        
        sector_allocation.append({
            'sector': sector,
            'value': value,
            'cost': cost,
            'weight': (value / total_value * 100) if total_value > 0 else 0,
            'holding_count': len(data['holdings']),
            'gain': gain,
            'gain_pct': (gain / cost * 100) if cost > 0 else 0,
            'holdings': data['holdings']
        })
    
    # Sort by weight descending
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
    for asset_class, data in asset_class_map.items():
        asset_class_allocation.append({
            'asset_class': asset_class,
            'value': data['value'],
            'weight': (data['value'] / total_value * 100) if total_value > 0 else 0,
            'holding_count': len(data['holdings']),
            'holdings': data['holdings']
        })
    
    asset_class_allocation.sort(key=lambda x: x['weight'], reverse=True)
    
    # ----------------------------------------
    # 5. CONCENTRATION METRICS
    # ----------------------------------------
    weights = [s['weight'] for s in sector_allocation]
    weights_decimal = [w / 100 for w in weights]
    
    # Herfindahl-Hirschman Index
    hhi = sum(w * w for w in weights_decimal)
    effective_sectors = (1 / hhi) if hhi > 0 else len(sector_allocation)
    
    # Top N weights
    sorted_weights = sorted(weights, reverse=True)
    top3_weight = sum(sorted_weights[:3]) if len(sorted_weights) >= 3 else sum(sorted_weights)
    top5_weight = sum(sorted_weights[:5]) if len(sorted_weights) >= 5 else sum(sorted_weights)
    
    # Concentration level
    if top3_weight >= 70:
        concentration_level = 'High'
    elif top3_weight >= 50:
        concentration_level = 'Medium'
    else:
        concentration_level = 'Low'
    
    concentration = {
        'herfindahl_index': hhi * 10000,  # Convert to basis points
        'effective_sectors': effective_sectors,
        'top3_weight': top3_weight,
        'top5_weight': top5_weight,
        'max_sector_weight': max(weights) if weights else 0,
        'min_sector_weight': min(weights) if weights else 0,
        'concentration_level': concentration_level
    }
    
    # ----------------------------------------
    # 6. DIVERSIFICATION METRICS
    # ----------------------------------------
    avg_weight = sum(weights) / len(weights) if weights else 0
    weight_std = calculate_std_dev(weights)
    diversification_ratio = effective_sectors / len(sector_allocation) if sector_allocation else 0
    
    diversification = {
        'sector_count': len(sector_allocation),
        'asset_class_count': len(asset_class_allocation),
        'avg_sector_weight': avg_weight,
        'sector_weight_std': weight_std,
        'diversification_ratio': diversification_ratio,
        'is_well_diversified': concentration_level == 'Low' and diversification_ratio > 0.7
    }
    
    # ----------------------------------------
    # 7. TARGET COMPARISON (if provided)
    # ----------------------------------------
    target_comparison = []
    
    if target_allocations:
        for sector_data in sector_allocation:
            sector = sector_data['sector']
            current_weight = sector_data['weight']
            target_weight = target_allocations.get(sector, 0)
            difference = current_weight - target_weight
            difference_value = (difference / 100) * total_value
            
            if difference > 2:
                action = 'Sell'
            elif difference < -2:
                action = 'Buy'
            else:
                action = 'Hold'
            
            target_comparison.append({
                'sector': sector,
                'current_weight': current_weight,
                'target_weight': target_weight,
                'difference': difference,
                'difference_value': difference_value,
                'action': action
            })
    else:
        # Use equal weight as default target
        equal_weight = 100 / len(sector_allocation) if sector_allocation else 0
        for sector_data in sector_allocation:
            current_weight = sector_data['weight']
            difference = current_weight - equal_weight
            difference_value = (difference / 100) * total_value
            
            if difference > 5:
                action = 'Sell'
            elif difference < -5:
                action = 'Buy'
            else:
                action = 'Hold'
            
            target_comparison.append({
                'sector': sector_data['sector'],
                'current_weight': current_weight,
                'target_weight': equal_weight,
                'difference': difference,
                'difference_value': difference_value,
                'action': action
            })
    
    # ----------------------------------------
    # 8. GENERATE WARNINGS & RECOMMENDATIONS
    # ----------------------------------------
    if concentration_level == 'High':
        warnings.append(f"High concentration: Top 3 sectors represent {top3_weight:.1f}% of portfolio")
        recommendations.append("Consider diversifying into underweight sectors to reduce concentration risk")
    
    if sector_allocation and sector_allocation[0]['weight'] > 30:
        top_sector = sector_allocation[0]
        warnings.append(f"{top_sector['sector']} represents {top_sector['weight']:.1f}% of portfolio")
        recommendations.append(f"Consider reducing {top_sector['sector']} exposure")
    
    if len(sector_allocation) < 5:
        warnings.append(f"Limited diversification: Only {len(sector_allocation)} sectors")
        recommendations.append("Consider adding exposure to additional sectors")
    
    if diversification['is_well_diversified']:
        recommendations.append("Portfolio is well-diversified. Maintain current sector balance")
    
    # Check for sectors with losses
    losing_sectors = [s for s in sector_allocation if s['gain_pct'] < -10]
    if losing_sectors:
        for ls in losing_sectors:
            warnings.append(f"{ls['sector']} sector is down {ls['gain_pct']:.1f}%")
    
    # ----------------------------------------
    # RETURN RESULT
    # ----------------------------------------
    return {
        'timestamp': datetime.now().isoformat(),
        'total_value': total_value,
        'total_cost': total_cost,
        'sector_allocation': sector_allocation,
        'asset_class_allocation': asset_class_allocation,
        'concentration': concentration,
        'diversification': diversification,
        'target_comparison': target_comparison,
        'warnings': warnings,
        'recommendations': recommendations
    }


def _create_empty_result(message: str) -> Dict[str, Any]:
    """Create empty result with error message."""
    return {
        'timestamp': datetime.now().isoformat(),
        'total_value': 0,
        'total_cost': 0,
        'sector_allocation': [],
        'asset_class_allocation': [],
        'concentration': {
            'herfindahl_index': 0,
            'effective_sectors': 0,
            'top3_weight': 0,
            'top5_weight': 0,
            'max_sector_weight': 0,
            'min_sector_weight': 0,
            'concentration_level': 'N/A'
        },
        'diversification': {
            'sector_count': 0,
            'asset_class_count': 0,
            'avg_sector_weight': 0,
            'sector_weight_std': 0,
            'diversification_ratio': 0,
            'is_well_diversified': False
        },
        'target_comparison': [],
        'warnings': [message],
        'recommendations': []
    }

    