
import sys
import json
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import warnings
import base64
import io

warnings.filterwarnings('ignore')

try:
    import pyfolio as pf
    PYFOLIO_AVAILABLE = True
except ImportError:
    PYFOLIO_AVAILABLE = False

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
        if not PYFOLIO_AVAILABLE:
            raise ImportError("Pyfolio is not installed. Please add 'pyfolio-reloaded' and 'empyrical' to requirements.txt.")

        payload = json.load(sys.stdin)
        tickers = payload.get('tickers', [])
        start_date = payload.get('startDate')
        end_date = payload.get('endDate')
        benchmark = payload.get('benchmark', '^GSPC')
        weights = payload.get('weights')

        if not tickers:
            raise ValueError("Ticker list cannot be empty.")

        # --- Data Loading ---
        data = yf.download(tickers, start=start_date, end=end_date, progress=False)
        if data.empty or 'Adj Close' not in data:
            raise ValueError(f"Could not download valid data for tickers: {', '.join(tickers)}")
        
        prices = data['Adj Close']
        if isinstance(prices, pd.Series):
             prices = prices.to_frame(name=tickers[0])
             
        returns = prices.pct_change().dropna()

        # --- Portfolio Returns ---
        if weights and len(weights) == len(tickers):
            portfolio_weights = pd.Series(weights, index=tickers)
            portfolio_returns = (returns * portfolio_weights).sum(axis=1)
        else:
            # Equal weight if not specified
            n_assets = len(tickers)
            portfolio_weights = pd.Series([1/n_assets] * n_assets, index=tickers)
            portfolio_returns = (returns * portfolio_weights).sum(axis=1)
            
        portfolio_returns.index = portfolio_returns.index.tz_localize(None)


        # --- Pyfolio Report Generation ---
        with io.BytesIO() as f:
            pf.create_full_tear_sheet(
                portfolio_returns,
                benchmark_rets=None, # Benchmark can be added later
                live_start_date=None,
                round_trips=False,
                hide_positions=True,
                show=False,
                fig=None,
                set_context=False,
                output=f,
                return_fig=False
            )
            f.seek(0)
            html_report_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # --- Summary Stats ---
        stats = pf.timeseries.perf_stats(portfolio_returns)
        summary = {
            'annual_return': stats['Annual return'],
            'cumulative_returns': stats['Cumulative returns'],
            'sharpe_ratio': stats['Sharpe ratio'],
            'max_drawdown': stats['Max drawdown'],
        }

        response = {
            'results': {
                'summary': summary,
            },
            'report_html': html_report_base64
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
