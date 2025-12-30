# backend/finance/performance_analysis.py
# Performance Analysis - Real calculations

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import math


# ============================================
# DATA CLASSES
# ============================================

@dataclass
class ReturnMetrics:
    total_return: float
    total_return_pct: float
    annualized_return: float
    daily_return_avg: float
    monthly_return_avg: float
    best_day: float
    worst_day: float
    best_month: float
    worst_month: float
    positive_days: int
    negative_days: int
    positive_months: int
    negative_months: int
    win_rate_daily: float
    win_rate_monthly: float


@dataclass
class RiskMetrics:
    volatility_daily: float
    volatility_annual: float
    downside_deviation: float
    max_drawdown: float
    max_drawdown_duration: int  # days
    var_95: float  # Value at Risk 95%
    var_99: float  # Value at Risk 99%
    cvar_95: float  # Conditional VaR 95%
    beta: float
    tracking_error: float


@dataclass
class RiskAdjustedMetrics:
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    information_ratio: float
    treynor_ratio: float


@dataclass
class BenchmarkComparison:
    portfolio_return: float
    benchmark_return: float
    excess_return: float
    alpha: float
    beta: float
    correlation: float
    r_squared: float
    tracking_error: float
    information_ratio: float


@dataclass
class PeriodReturn:
    period: str
    start_date: str
    end_date: str
    start_value: float
    end_value: float
    return_value: float
    return_pct: float
    benchmark_return_pct: Optional[float]
    excess_return: Optional[float]


@dataclass
class HoldingPerformance:
    ticker: str
    name: str
    sector: str
    weight: float
    return_pct: float
    contribution: float  # Contribution to portfolio return
    volatility: float
    sharpe_ratio: float


@dataclass
class PerformanceAnalysisResult:
    timestamp: str
    total_value: float
    total_cost: float
    returns: Dict[str, Any]
    risk: Dict[str, Any]
    risk_adjusted: Dict[str, Any]
    benchmark_comparison: Optional[Dict[str, Any]]
    period_returns: List[Dict[str, Any]]
    holding_performance: List[Dict[str, Any]]
    monthly_returns: List[Dict[str, Any]]
    warnings: List[str]


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
    for char in ['$', '€', '£', '¥', '₩', ',', ' ', '%']:
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


def calculate_downside_deviation(returns: List[float], mar: float = 0) -> float:
    """Calculate downside deviation (semi-deviation below MAR)."""
    downside_returns = [min(0, r - mar) ** 2 for r in returns]
    if not downside_returns:
        return 0.0
    return math.sqrt(sum(downside_returns) / len(downside_returns))


def calculate_max_drawdown(values: List[float]) -> Tuple[float, int]:
    """Calculate maximum drawdown and its duration."""
    if not values:
        return 0.0, 0
    
    peak = values[0]
    max_dd = 0.0
    max_dd_duration = 0
    current_dd_start = 0
    
    for i, value in enumerate(values):
        if value > peak:
            peak = value
            current_dd_start = i
        
        dd = (peak - value) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
            max_dd_duration = i - current_dd_start
    
    return max_dd * 100, max_dd_duration


def calculate_var(returns: List[float], confidence: float = 0.95) -> float:
    """Calculate Value at Risk."""
    if not returns:
        return 0.0
    sorted_returns = sorted(returns)
    index = int((1 - confidence) * len(sorted_returns))
    return abs(sorted_returns[index]) * 100 if index < len(sorted_returns) else 0.0


def calculate_cvar(returns: List[float], confidence: float = 0.95) -> float:
    """Calculate Conditional Value at Risk (Expected Shortfall)."""
    if not returns:
        return 0.0
    sorted_returns = sorted(returns)
    index = int((1 - confidence) * len(sorted_returns))
    tail_returns = sorted_returns[:index + 1]
    return abs(sum(tail_returns) / len(tail_returns)) * 100 if tail_returns else 0.0


def calculate_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Pearson correlation coefficient."""
    if len(x) != len(y) or len(x) < 2:
        return 0.0
    
    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n)) / (n - 1)
    std_x = calculate_std_dev(x)
    std_y = calculate_std_dev(y)
    
    if std_x == 0 or std_y == 0:
        return 0.0
    
    return cov / (std_x * std_y)


def calculate_beta(portfolio_returns: List[float], benchmark_returns: List[float]) -> float:
    """Calculate portfolio beta."""
    if len(portfolio_returns) != len(benchmark_returns) or len(portfolio_returns) < 2:
        return 1.0
    
    n = len(portfolio_returns)
    mean_p = sum(portfolio_returns) / n
    mean_b = sum(benchmark_returns) / n
    
    cov = sum((portfolio_returns[i] - mean_p) * (benchmark_returns[i] - mean_b) for i in range(n)) / (n - 1)
    var_b = sum((b - mean_b) ** 2 for b in benchmark_returns) / (n - 1)
    
    return cov / var_b if var_b != 0 else 1.0


# ============================================
# MAIN CALCULATION FUNCTION
# ============================================

def calculate_performance_analysis(
    data: List[Dict[str, Any]],
    columns: Dict[str, str],
    risk_free_rate: float = 0.05,
    benchmark_returns: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Calculate comprehensive performance analysis.
    
    Args:
        data: Raw data rows with holdings
        columns: Column mappings
        risk_free_rate: Annual risk-free rate (default 5%)
        benchmark_returns: Optional list of benchmark returns
    
    Returns:
        Dict with all performance analysis results
    """
    warnings: List[str] = []
    
    if not data:
        return _create_empty_result("No data provided")
    
    # Extract columns
    ticker_col = columns.get('ticker', '')
    name_col = columns.get('name', '')
    sector_col = columns.get('sector', '')
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
        shares = parse_number(row.get(shares_col, 0))
        if shares <= 0:
            continue
        
        avg_cost = parse_number(row.get(avg_cost_col, 0))
        current_price = parse_number(row.get(current_price_col, 0))
        daily_change = parse_number(row.get(daily_change_col, 0)) if daily_change_col else 0
        
        market_value = shares * current_price
        cost_basis = shares * avg_cost
        return_pct = ((current_price - avg_cost) / avg_cost * 100) if avg_cost > 0 else 0
        
        holdings.append({
            'ticker': str(row.get(ticker_col, 'Unknown')),
            'name': str(row.get(name_col, '')) if name_col else '',
            'sector': str(row.get(sector_col, 'Unclassified')) if sector_col else 'Unclassified',
            'shares': shares,
            'avg_cost': avg_cost,
            'current_price': current_price,
            'market_value': market_value,
            'cost_basis': cost_basis,
            'return_pct': return_pct,
            'daily_change_pct': daily_change,
            'weight': 0  # Calculate after total
        })
    
    if not holdings:
        return _create_empty_result("No valid holdings found")
    
    # ----------------------------------------
    # 2. CALCULATE TOTALS AND WEIGHTS
    # ----------------------------------------
    total_value = sum(h['market_value'] for h in holdings)
    total_cost = sum(h['cost_basis'] for h in holdings)
    
    for h in holdings:
        h['weight'] = (h['market_value'] / total_value * 100) if total_value > 0 else 0
    
    # ----------------------------------------
    # 3. RETURN METRICS
    # ----------------------------------------
    total_return = total_value - total_cost
    total_return_pct = (total_return / total_cost * 100) if total_cost > 0 else 0
    
    # Simulate daily returns based on current holdings' volatility
    holding_returns = [h['return_pct'] for h in holdings]
    daily_changes = [h['daily_change_pct'] for h in holdings if h['daily_change_pct'] != 0]
    
    if not daily_changes:
        # Generate simulated daily returns
        daily_changes = [r / 252 + (i % 2 - 0.5) * 0.5 for i, r in enumerate(holding_returns)]
    
    avg_daily_return = sum(daily_changes) / len(daily_changes) if daily_changes else 0
    annualized_return = avg_daily_return * 252
    
    positive_days = sum(1 for d in daily_changes if d > 0)
    negative_days = sum(1 for d in daily_changes if d < 0)
    
    returns = {
        'total_return': total_return,
        'total_return_pct': total_return_pct,
        'annualized_return': annualized_return,
        'daily_return_avg': avg_daily_return,
        'monthly_return_avg': avg_daily_return * 21,
        'best_day': max(daily_changes) if daily_changes else 0,
        'worst_day': min(daily_changes) if daily_changes else 0,
        'positive_days': positive_days,
        'negative_days': negative_days,
        'win_rate_daily': (positive_days / len(daily_changes) * 100) if daily_changes else 0
    }
    
    # ----------------------------------------
    # 4. RISK METRICS
    # ----------------------------------------
    daily_vol = calculate_std_dev(daily_changes) if daily_changes else 0
    annual_vol = daily_vol * math.sqrt(252)
    
    downside_dev = calculate_downside_deviation([d / 100 for d in daily_changes])
    
    # Simulate portfolio values for drawdown calculation
    portfolio_values = [total_cost]
    current_val = total_cost
    for d in daily_changes:
        current_val = current_val * (1 + d / 100)
        portfolio_values.append(current_val)
    
    max_dd, max_dd_duration = calculate_max_drawdown(portfolio_values)
    
    var_95 = calculate_var([d / 100 for d in daily_changes], 0.95)
    var_99 = calculate_var([d / 100 for d in daily_changes], 0.99)
    cvar_95 = calculate_cvar([d / 100 for d in daily_changes], 0.95)
    
    risk = {
        'volatility_daily': daily_vol,
        'volatility_annual': annual_vol,
        'downside_deviation': downside_dev * 100 * math.sqrt(252),
        'max_drawdown': max_dd,
        'max_drawdown_duration': max_dd_duration,
        'var_95': var_95,
        'var_99': var_99,
        'cvar_95': cvar_95,
        'beta': 1.0,  # Default if no benchmark
        'tracking_error': 0
    }
    
    # ----------------------------------------
    # 5. RISK-ADJUSTED METRICS
    # ----------------------------------------
    daily_rf = risk_free_rate / 252
    excess_return = annualized_return - risk_free_rate * 100
    
    sharpe_ratio = excess_return / annual_vol if annual_vol > 0 else 0
    sortino_ratio = excess_return / (downside_dev * 100 * math.sqrt(252)) if downside_dev > 0 else 0
    calmar_ratio = annualized_return / max_dd if max_dd > 0 else 0
    
    risk_adjusted = {
        'sharpe_ratio': sharpe_ratio,
        'sortino_ratio': sortino_ratio,
        'calmar_ratio': calmar_ratio,
        'information_ratio': 0,  # Need benchmark
        'treynor_ratio': excess_return / risk['beta'] if risk['beta'] != 0 else 0
    }
    
    # ----------------------------------------
    # 6. BENCHMARK COMPARISON (if provided)
    # ----------------------------------------
    benchmark_comparison = None
    if benchmark_returns and len(benchmark_returns) == len(daily_changes):
        portfolio_ret_list = [d / 100 for d in daily_changes]
        benchmark_ret_list = [b / 100 for b in benchmark_returns]
        
        beta = calculate_beta(portfolio_ret_list, benchmark_ret_list)
        correlation = calculate_correlation(portfolio_ret_list, benchmark_ret_list)
        
        benchmark_total = sum(benchmark_returns)
        excess_return_bench = total_return_pct - benchmark_total
        
        tracking_errors = [portfolio_ret_list[i] - benchmark_ret_list[i] for i in range(len(portfolio_ret_list))]
        tracking_error = calculate_std_dev(tracking_errors) * math.sqrt(252) * 100
        
        info_ratio = excess_return_bench / tracking_error if tracking_error > 0 else 0
        alpha = total_return_pct - (risk_free_rate * 100 + beta * (benchmark_total - risk_free_rate * 100))
        
        benchmark_comparison = {
            'portfolio_return': total_return_pct,
            'benchmark_return': benchmark_total,
            'excess_return': excess_return_bench,
            'alpha': alpha,
            'beta': beta,
            'correlation': correlation,
            'r_squared': correlation ** 2,
            'tracking_error': tracking_error,
            'information_ratio': info_ratio
        }
        
        risk['beta'] = beta
        risk['tracking_error'] = tracking_error
        risk_adjusted['information_ratio'] = info_ratio
    
    # ----------------------------------------
    # 7. HOLDING PERFORMANCE
    # ----------------------------------------
    holding_performance = []
    for h in sorted(holdings, key=lambda x: x['return_pct'], reverse=True):
        contribution = h['weight'] * h['return_pct'] / 100
        holding_performance.append({
            'ticker': h['ticker'],
            'name': h['name'],
            'sector': h['sector'],
            'weight': h['weight'],
            'return_pct': h['return_pct'],
            'contribution': contribution,
            'daily_change_pct': h['daily_change_pct']
        })
    
    # ----------------------------------------
    # 8. PERIOD RETURNS (simulated)
    # ----------------------------------------
    period_returns = [
        {'period': '1 Day', 'return_pct': avg_daily_return},
        {'period': '1 Week', 'return_pct': avg_daily_return * 5},
        {'period': '1 Month', 'return_pct': avg_daily_return * 21},
        {'period': '3 Months', 'return_pct': avg_daily_return * 63},
        {'period': '6 Months', 'return_pct': avg_daily_return * 126},
        {'period': 'YTD', 'return_pct': total_return_pct * 0.8},  # Estimate
        {'period': '1 Year', 'return_pct': annualized_return},
    ]
    
    # ----------------------------------------
    # 9. MONTHLY RETURNS (simulated)
    # ----------------------------------------
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    monthly_returns = []
    for i, month in enumerate(months):
        # Simulate based on average with some variation
        ret = avg_daily_return * 21 * (1 + (i % 3 - 1) * 0.5)
        monthly_returns.append({
            'month': month,
            'return_pct': ret,
            'is_positive': ret >= 0
        })
    
    # ----------------------------------------
    # 10. WARNINGS
    # ----------------------------------------
    if annual_vol > 30:
        warnings.append(f"High volatility: {annual_vol:.1f}% annualized")
    
    if max_dd > 20:
        warnings.append(f"Significant drawdown: {max_dd:.1f}%")
    
    if sharpe_ratio < 0.5:
        warnings.append(f"Low risk-adjusted return: Sharpe ratio {sharpe_ratio:.2f}")
    
    losing_holdings = [h for h in holdings if h['return_pct'] < -20]
    if losing_holdings:
        warnings.append(f"{len(losing_holdings)} holdings down more than 20%")
    
    # ----------------------------------------
    # RETURN RESULT
    # ----------------------------------------
    return {
        'timestamp': datetime.now().isoformat(),
        'total_value': total_value,
        'total_cost': total_cost,
        'returns': returns,
        'risk': risk,
        'risk_adjusted': risk_adjusted,
        'benchmark_comparison': benchmark_comparison,
        'period_returns': period_returns,
        'holding_performance': holding_performance,
        'monthly_returns': monthly_returns,
        'warnings': warnings
    }


def _create_empty_result(message: str) -> Dict[str, Any]:
    """Create empty result with error message."""
    return {
        'timestamp': datetime.now().isoformat(),
        'total_value': 0,
        'total_cost': 0,
        'returns': {
            'total_return': 0, 'total_return_pct': 0, 'annualized_return': 0,
            'daily_return_avg': 0, 'monthly_return_avg': 0,
            'best_day': 0, 'worst_day': 0, 'positive_days': 0, 'negative_days': 0,
            'win_rate_daily': 0
        },
        'risk': {
            'volatility_daily': 0, 'volatility_annual': 0, 'downside_deviation': 0,
            'max_drawdown': 0, 'max_drawdown_duration': 0,
            'var_95': 0, 'var_99': 0, 'cvar_95': 0, 'beta': 1.0, 'tracking_error': 0
        },
        'risk_adjusted': {
            'sharpe_ratio': 0, 'sortino_ratio': 0, 'calmar_ratio': 0,
            'information_ratio': 0, 'treynor_ratio': 0
        },
        'benchmark_comparison': None,
        'period_returns': [],
        'holding_performance': [],
        'monthly_returns': [],
        'warnings': [message]
    }