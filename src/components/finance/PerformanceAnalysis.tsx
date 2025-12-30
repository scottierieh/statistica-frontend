'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
    TrendingUp, TrendingDown, Info, Calendar, Target, Award,
    BarChart3, LineChart as LineChartIcon, Percent, DollarSign
} from 'lucide-react';
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, AreaChart, Area, BarChart, Bar, Cell, ComposedChart,
    ReferenceLine
} from 'recharts';
import type { FinanceConfig, FinanceResults } from './FinanceLayout';

interface PerformanceAnalysisProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPercent = (value: number, showSign: boolean = true): string => {
    const sign = showSign && value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

// Calculate performance metrics from holdings
const calculatePerformanceMetrics = (holdings: any[]) => {
    if (!holdings || holdings.length === 0) return null;

    const returns = holdings.map(h => h.unrealizedGainPct);
    const weights = holdings.map(h => h.weight / 100);
    
    // Weighted average return
    const portfolioReturn = holdings.reduce((sum, h) => sum + (h.weight * h.unrealizedGainPct / 100), 0);
    
    // Volatility (standard deviation of returns)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Sharpe Ratio (assuming 5% risk-free rate)
    const riskFreeRate = 5;
    const sharpeRatio = volatility > 0 ? (portfolioReturn - riskFreeRate) / volatility : 0;
    
    // Sortino Ratio (downside deviation)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideVariance = negativeReturns.length > 0 
        ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length 
        : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? (portfolioReturn - riskFreeRate) / downsideDeviation : 0;
    
    // Win rate
    const winners = returns.filter(r => r > 0).length;
    const winRate = (winners / returns.length) * 100;
    
    // Best and worst
    const bestReturn = Math.max(...returns);
    const worstReturn = Math.min(...returns);
    
    // Generate mock historical performance data
    const historicalData = generateHistoricalPerformance(portfolioReturn);

    return {
        portfolioReturn,
        volatility,
        sharpeRatio,
        sortinoRatio,
        winRate,
        bestReturn,
        worstReturn,
        avgReturn,
        historicalData,
    };
};

// Generate mock historical performance data
const generateHistoricalPerformance = (targetReturn: number) => {
    const data = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    let portfolioValue = 100;
    let benchmarkValue = 100;
    
    // Adjust daily drift based on target annual return
    const dailyDrift = targetReturn / 252 / 100;
    
    for (let i = 0; i < 252; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        // Portfolio return (with some randomness)
        const portfolioDaily = dailyDrift + (Math.random() - 0.5) * 0.02;
        portfolioValue *= (1 + portfolioDaily);
        
        // Benchmark return (slightly lower)
        const benchmarkDaily = (dailyDrift * 0.8) + (Math.random() - 0.5) * 0.015;
        benchmarkValue *= (1 + benchmarkDaily);
        
        if (i % 5 === 0) { // Weekly data points
            data.push({
                date: date.toISOString().split('T')[0],
                dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
                portfolio: +((portfolioValue - 100)).toFixed(2),
                benchmark: +((benchmarkValue - 100)).toFixed(2),
                portfolioValue: +portfolioValue.toFixed(2),
                benchmarkValue: +benchmarkValue.toFixed(2),
            });
        }
    }
    
    return data;
};

// Generate monthly returns data
const generateMonthlyReturns = (holdings: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, idx) => ({
        month,
        portfolio: +(Math.random() * 10 - 3).toFixed(2),
        benchmark: +(Math.random() * 8 - 2).toFixed(2),
    }));
};

// Metric Card Component
const MetricCard = ({ 
    title, 
    value, 
    subtitle,
    trend,
    icon: Icon,
    highlight
}: { 
    title: string; 
    value: string; 
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: any;
    highlight?: boolean;
}) => {
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-900';
    
    return (
        <Card className={highlight ? 'border-primary' : ''}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500">{title}</p>
                        <p className={`text-2xl font-bold mt-1 ${trendColor}`}>{value}</p>
                        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                    </div>
                    <div className={`p-2 rounded-lg ${highlight ? 'bg-primary/10' : 'bg-gray-100'}`}>
                        <Icon className={`h-5 w-5 ${highlight ? 'text-primary' : 'text-gray-500'}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Cumulative Returns Chart
const CumulativeReturnsChart = ({ data }: { data: any[] }) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dateLabel" fontSize={10} tick={{ fill: '#6b7280' }} />
                <YAxis tickFormatter={(v) => `${v}%`} fontSize={10} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                    formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name === 'portfolio' ? 'Portfolio' : 'Benchmark']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="portfolio" name="Portfolio" stroke="#3b82f6" strokeWidth={2} fill="url(#portfolioGradient)" />
                <Area type="monotone" dataKey="benchmark" name="Benchmark" stroke="#10b981" strokeWidth={2} fill="url(#benchmarkGradient)" />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// Monthly Returns Chart
const MonthlyReturnsChart = ({ data }: { data: any[] }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={10} tick={{ fill: '#6b7280' }} />
                <YAxis tickFormatter={(v) => `${v}%`} fontSize={10} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="portfolio" name="Portfolio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benchmark" name="Benchmark" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// Holdings Performance Table
const HoldingsPerformanceTable = ({ holdings }: { holdings: any[] }) => {
    const sortedHoldings = [...holdings].sort((a, b) => b.unrealizedGainPct - a.unrealizedGainPct);
    
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Rank</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Ticker</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Return</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Contribution</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Performance</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedHoldings.map((holding, idx) => {
                        const contribution = (holding.weight * holding.unrealizedGainPct / 100);
                        return (
                            <tr key={holding.ticker} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-3 px-2">
                                    {idx < 3 ? (
                                        <Badge variant={idx === 0 ? 'default' : 'secondary'} className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                                            {idx + 1}
                                        </Badge>
                                    ) : (
                                        <span className="text-gray-400">{idx + 1}</span>
                                    )}
                                </td>
                                <td className="py-3 px-2 font-medium">{holding.ticker}</td>
                                <td className="py-3 px-2 text-gray-600 truncate max-w-[150px]">{holding.name}</td>
                                <td className={`py-3 px-2 text-right font-medium ${holding.unrealizedGainPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(holding.unrealizedGainPct)}
                                </td>
                                <td className={`py-3 px-2 text-right ${contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(contribution)}
                                </td>
                                <td className="py-3 px-2 w-32">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                            {holding.unrealizedGainPct >= 0 ? (
                                                <div 
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${Math.min(100, holding.unrealizedGainPct * 2)}%` }}
                                                />
                                            ) : (
                                                <div 
                                                    className="h-full bg-red-500 rounded-full float-right"
                                                    style={{ width: `${Math.min(100, Math.abs(holding.unrealizedGainPct) * 2)}%` }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default function PerformanceAnalysis({ config, analysisResult }: PerformanceAnalysisProps) {
    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Performance Analysis</h2>
                    <p className="text-gray-500 mt-1">Returns analysis, risk metrics, and benchmark comparison</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Portfolio Data</AlertTitle>
                    <AlertDescription>
                        Please load portfolio data and run analysis in the Data Settings page first.
                        Use the "Sample Portfolio Holdings" dataset to get started.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { holdings, summary } = analysisResult.portfolio;
    const metrics = calculatePerformanceMetrics(holdings);
    const monthlyReturns = generateMonthlyReturns(holdings);

    if (!metrics) return null;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Performance Analysis</h2>
                    <p className="text-gray-500 mt-1">Returns, risk metrics, and benchmark comparison</p>
                </div>
                <Badge variant={metrics.portfolioReturn >= 0 ? 'default' : 'destructive'} className={metrics.portfolioReturn >= 0 ? 'bg-green-600' : ''}>
                    {formatPercent(metrics.portfolioReturn)} Total Return
                </Badge>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    title="Portfolio Return" 
                    value={formatPercent(metrics.portfolioReturn)}
                    subtitle="Total return"
                    trend={metrics.portfolioReturn >= 0 ? 'up' : 'down'}
                    icon={TrendingUp}
                    highlight
                />
                <MetricCard 
                    title="Volatility" 
                    value={formatPercent(metrics.volatility, false)}
                    subtitle="Standard deviation"
                    icon={BarChart3}
                />
                <MetricCard 
                    title="Sharpe Ratio" 
                    value={metrics.sharpeRatio.toFixed(2)}
                    subtitle="Risk-adjusted return"
                    trend={metrics.sharpeRatio >= 1 ? 'up' : metrics.sharpeRatio >= 0 ? 'neutral' : 'down'}
                    icon={Award}
                />
                <MetricCard 
                    title="Win Rate" 
                    value={formatPercent(metrics.winRate, false)}
                    subtitle={`${holdings.filter(h => h.unrealizedGainPct > 0).length} of ${holdings.length} positions`}
                    trend={metrics.winRate >= 50 ? 'up' : 'down'}
                    icon={Target}
                />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    title="Best Performer" 
                    value={formatPercent(metrics.bestReturn)}
                    trend="up"
                    icon={TrendingUp}
                />
                <MetricCard 
                    title="Worst Performer" 
                    value={formatPercent(metrics.worstReturn)}
                    trend="down"
                    icon={TrendingDown}
                />
                <MetricCard 
                    title="Sortino Ratio" 
                    value={metrics.sortinoRatio.toFixed(2)}
                    subtitle="Downside risk-adjusted"
                    icon={Award}
                />
                <MetricCard 
                    title="Avg. Return" 
                    value={formatPercent(metrics.avgReturn)}
                    subtitle="Per holding"
                    icon={Percent}
                />
            </div>

            {/* Cumulative Returns Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-gray-500" />
                        Cumulative Returns
                    </CardTitle>
                    <CardDescription>Portfolio vs Benchmark performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <CumulativeReturnsChart data={metrics.historicalData} />
                </CardContent>
            </Card>

            {/* Monthly Returns */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        Monthly Returns
                    </CardTitle>
                    <CardDescription>Month-by-month performance comparison</CardDescription>
                </CardHeader>
                <CardContent>
                    <MonthlyReturnsChart data={monthlyReturns} />
                </CardContent>
            </Card>

            {/* Risk Metrics Explanation */}
            <Card>
                <CardHeader>
                    <CardTitle>Risk-Adjusted Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">Sharpe Ratio</h4>
                                    <Badge variant={metrics.sharpeRatio >= 1 ? 'default' : 'secondary'}>
                                        {metrics.sharpeRatio.toFixed(2)}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Measures excess return per unit of risk. 
                                    {metrics.sharpeRatio >= 1 ? ' A ratio above 1.0 indicates good risk-adjusted performance.' : 
                                     metrics.sharpeRatio >= 0.5 ? ' A ratio between 0.5-1.0 is considered acceptable.' :
                                     ' Consider strategies to improve risk-adjusted returns.'}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">Sortino Ratio</h4>
                                    <Badge variant={metrics.sortinoRatio >= 1 ? 'default' : 'secondary'}>
                                        {metrics.sortinoRatio.toFixed(2)}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Similar to Sharpe but only considers downside volatility. 
                                    Higher values indicate better downside risk management.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">Volatility</h4>
                                    <Badge variant={metrics.volatility <= 15 ? 'default' : 'secondary'}>
                                        {formatPercent(metrics.volatility, false)}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Standard deviation of returns. 
                                    {metrics.volatility <= 10 ? ' Low volatility indicates stable returns.' :
                                     metrics.volatility <= 20 ? ' Moderate volatility is typical for diversified portfolios.' :
                                     ' High volatility suggests significant price swings.'}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">Win Rate</h4>
                                    <Badge variant={metrics.winRate >= 50 ? 'default' : 'destructive'}>
                                        {formatPercent(metrics.winRate, false)}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Percentage of holdings with positive returns.
                                    {metrics.winRate >= 60 ? ' Excellent stock selection performance.' :
                                     metrics.winRate >= 50 ? ' Majority of positions are profitable.' :
                                     ' Consider reviewing underperforming positions.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Holdings Performance Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-gray-500" />
                        Holdings Performance Ranking
                    </CardTitle>
                    <CardDescription>Individual position performance sorted by return</CardDescription>
                </CardHeader>
                <CardContent>
                    <HoldingsPerformanceTable holdings={holdings} />
                </CardContent>
            </Card>
        </div>
    );
}