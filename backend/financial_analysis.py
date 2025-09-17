
import sys
import json
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    return obj

def calculate_sharpe_ratio(returns, risk_free_rate=0.0):
    """Sharpe Ratio 계산"""
    excess_returns = returns - risk_free_rate / 252
    return np.sqrt(252) * (excess_returns.mean() / excess_returns.std()) if excess_returns.std() != 0 else 0

def calculate_max_drawdown(cumulative_returns):
    """Max Drawdown 계산"""
    peak = cumulative_returns.expanding(min_periods=1).max()
    drawdown = (cumulative_returns - peak) / peak
    return drawdown.min()

def main():
    try:
        payload = json.load(sys.stdin)
        tickers = payload.get('tickers', [])
        start_date = payload.get('startDate')
        end_date = payload.get('endDate')
        benchmark_ticker = payload.get('benchmark', '^GSPC')
        weights_list = payload.get('weights')

        if not tickers:
            raise ValueError("Ticker list cannot be empty.")

        # --- 데이터 로딩 ---
        all_tickers = tickers + ([benchmark_ticker] if benchmark_ticker else [])
        data = yf.download(all_tickers, start=start_date, end=end_date, progress=False)['Adj Close']
        if data.empty:
            raise ValueError(f"Could not download valid data for tickers: {', '.join(tickers)}")
        
        prices = data[tickers]
        if isinstance(prices, pd.Series):
             prices = prices.to_frame(name=tickers[0])
             
        returns = prices.pct_change().dropna()

        # --- 포트폴리오 수익률 계산 ---
        if weights_list and len(weights_list) == len(tickers):
            portfolio_weights = pd.Series(weights_list, index=tickers)
        else: # 균등 가중
            n_assets = len(tickers)
            portfolio_weights = pd.Series([1/n_assets] * n_assets, index=tickers)
            
        portfolio_returns = (returns * portfolio_weights).sum(axis=1)
        
        # --- 벤치마크 수익률 ---
        benchmark_returns = None
        if benchmark_ticker and benchmark_ticker in data.columns:
            benchmark_returns = data[benchmark_ticker].pct_change().dropna()

        # --- 주요 지표 계산 ---
        cumulative_returns = (1 + portfolio_returns).cumprod() - 1
        annual_return = portfolio_returns.mean() * 252
        annual_volatility = portfolio_returns.std() * np.sqrt(252)
        sharpe_ratio = calculate_sharpe_ratio(portfolio_returns)
        max_drawdown = calculate_max_drawdown((1 + portfolio_returns).cumprod())

        # --- 결과 조합 ---
        response = {
            'results': {
                'summary_stats': {
                    'annual_return': annual_return,
                    'cumulative_returns': cumulative_returns.iloc[-1],
                    'annual_volatility': annual_volatility,
                    'sharpe_ratio': sharpe_ratio,
                    'max_drawdown': max_drawdown,
                },
                'cumulative_returns_data': cumulative_returns.reset_index().rename(columns={'index': 'date'}).to_dict('records'),
                'portfolio_weights': portfolio_weights.to_dict(),
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
