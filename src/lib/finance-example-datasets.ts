// Finance Example Datasets

export interface ExampleDataset {
    id: string;
    name: string;
    description: string;
    data: string; // CSV string
}

// Generate Portfolio Holdings Data
function generatePortfolioData(): string {
    const holdings = [
        { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', shares: 150, avgCost: 145.50, currentPrice: 178.25, weight: 0.18 },
        { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', shares: 100, avgCost: 285.00, currentPrice: 378.50, weight: 0.15 },
        { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', shares: 50, avgCost: 125.00, currentPrice: 141.80, weight: 0.08 },
        { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', shares: 80, avgCost: 135.00, currentPrice: 178.25, weight: 0.10 },
        { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', shares: 60, avgCost: 450.00, currentPrice: 875.50, weight: 0.12 },
        { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', shares: 120, avgCost: 145.00, currentPrice: 198.75, weight: 0.08 },
        { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', shares: 90, avgCost: 160.00, currentPrice: 156.50, weight: 0.06 },
        { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', shares: 70, avgCost: 230.00, currentPrice: 275.80, weight: 0.07 },
        { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', shares: 85, avgCost: 145.00, currentPrice: 162.30, weight: 0.05 },
        { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', shares: 40, avgCost: 480.00, currentPrice: 525.60, weight: 0.06 },
        { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', shares: 100, avgCost: 95.00, currentPrice: 105.40, weight: 0.04 },
        { ticker: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', shares: 30, avgCost: 320.00, currentPrice: 408.50, weight: 0.05 },
    ];

    const rows = holdings.map(h => {
        const marketValue = h.shares * h.currentPrice;
        const costBasis = h.shares * h.avgCost;
        const unrealizedGain = marketValue - costBasis;
        const unrealizedGainPct = ((h.currentPrice - h.avgCost) / h.avgCost) * 100;
        const dailyChange = (Math.random() - 0.5) * 4;
        const ytdReturn = (Math.random() * 40) - 10;
        
        return `${h.ticker},${h.name},${h.sector},${h.shares},${h.avgCost.toFixed(2)},${h.currentPrice.toFixed(2)},${marketValue.toFixed(2)},${costBasis.toFixed(2)},${unrealizedGain.toFixed(2)},${unrealizedGainPct.toFixed(2)},${(h.weight * 100).toFixed(2)},${dailyChange.toFixed(2)},${ytdReturn.toFixed(2)}`;
    });

    return `ticker,name,sector,shares,avg_cost,current_price,market_value,cost_basis,unrealized_gain,unrealized_gain_pct,weight,daily_change_pct,ytd_return_pct\n${rows.join('\n')}`;
}

// Generate Historical Price Data with Multiple Assets
function generateHistoricalPriceData(): string {
    const assets = ['AAPL', 'MSFT', 'GOOGL', 'SPY'];
    const startDate = new Date('2023-01-01');
    const rows: string[] = [];
    
    // Initial prices
    const prices: Record<string, number> = { AAPL: 130, MSFT: 240, GOOGL: 90, SPY: 380 };
    const volatility: Record<string, number> = { AAPL: 0.02, MSFT: 0.018, GOOGL: 0.025, SPY: 0.012 };
    
    for (let i = 0; i < 252; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        for (const asset of assets) {
            const dailyReturn = (Math.random() - 0.48) * volatility[asset] * 2;
            prices[asset] = prices[asset] * (1 + dailyReturn);
            
            const open = prices[asset] * (1 + (Math.random() - 0.5) * 0.005);
            const high = prices[asset] * (1 + Math.random() * 0.015);
            const low = prices[asset] * (1 - Math.random() * 0.015);
            const close = prices[asset];
            const volume = Math.floor(1000000 + Math.random() * 2000000);
            
            rows.push(`${dateStr},${asset},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${volume},${(dailyReturn * 100).toFixed(4)}`);
        }
    }
    
    return `date,ticker,open,high,low,close,volume,daily_return_pct\n${rows.join('\n')}`;
}

// Generate Portfolio Performance Data
function generatePerformanceData(): string {
    const startDate = new Date('2023-01-01');
    const rows: string[] = [];
    
    let portfolioValue = 100000;
    let benchmarkValue = 100000;
    let cumulativeReturn = 0;
    let benchmarkCumulativeReturn = 0;
    
    for (let i = 0; i < 252; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Portfolio daily return (slight outperformance on average)
        const portfolioReturn = (Math.random() - 0.47) * 0.025;
        const benchmarkReturn = (Math.random() - 0.48) * 0.02;
        
        portfolioValue = portfolioValue * (1 + portfolioReturn);
        benchmarkValue = benchmarkValue * (1 + benchmarkReturn);
        
        cumulativeReturn = ((portfolioValue - 100000) / 100000) * 100;
        benchmarkCumulativeReturn = ((benchmarkValue - 100000) / 100000) * 100;
        
        const alpha = portfolioReturn - benchmarkReturn;
        
        rows.push(`${dateStr},${portfolioValue.toFixed(2)},${benchmarkValue.toFixed(2)},${(portfolioReturn * 100).toFixed(4)},${(benchmarkReturn * 100).toFixed(4)},${cumulativeReturn.toFixed(2)},${benchmarkCumulativeReturn.toFixed(2)},${(alpha * 100).toFixed(4)}`);
    }
    
    return `date,portfolio_value,benchmark_value,portfolio_return_pct,benchmark_return_pct,cumulative_return_pct,benchmark_cumulative_pct,daily_alpha_pct\n${rows.join('\n')}`;
}

export const financeExampleDatasets: ExampleDataset[] = [
    {
        id: 'portfolio-holdings',
        name: 'Sample Portfolio Holdings',
        description: '12 stocks with holdings, costs, and performance metrics',
        data: generatePortfolioData(),
    },
    {
        id: 'historical-prices',
        name: 'Historical Price Data',
        description: '1 year of daily OHLCV data for 4 assets',
        data: generateHistoricalPriceData(),
    },
    {
        id: 'portfolio-performance',
        name: 'Portfolio Performance',
        description: '1 year of daily portfolio vs benchmark returns',
        data: generatePerformanceData(),
    },
];