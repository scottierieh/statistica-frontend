'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
    Gauge, Info, TrendingUp, TrendingDown, Activity, BarChart3, 
    Target, Percent, ArrowUpDown, Shield, Zap, Loader2, RefreshCw
} from 'lucide-react';
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, BarChart, Bar, Cell, ReferenceLine, ScatterChart,
    Scatter, ComposedChart, Area
} from 'recharts';
import type { FinanceConfig, FinanceResults } from './FinanceLayout';

interface BetaVolatilityProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

interface BetaResult {
    beta: number;
    alpha: number;
    r_squared: number;
    p_value: number;
    std_error: number;
    portfolio_volatility: number;
    benchmark_volatility: number;
    tracking_error: number;
    information_ratio: number;
    treynor_ratio: number;
    sharpe_ratio: number;
    systematic_risk_pct: number;
    idiosyncratic_risk_pct: number;
}

const formatPercent = (value: number, decimals: number = 2): string => {
    return `${value.toFixed(decimals)}%`;
};

// Stat Card
const StatCard = ({ 
    title, 
    value, 
    subtitle,
    icon: Icon,
    variant = 'default',
    isLoading = false
}: { 
    title: string; 
    value: string; 
    subtitle?: string;
    icon: any;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    isLoading?: boolean;
}) => {
    const styles = {
        default: { bg: 'bg-white', text: 'text-gray-900' },
        primary: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
        success: { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
        warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
        danger: { bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
    };

    return (
        <Card className={styles[variant].bg}>
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-16">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{title}</p>
                            <p className={`text-2xl font-bold mt-1 ${styles[variant].text}`}>{value}</p>
                            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                        </div>
                        <Icon className={`h-5 w-5 ${styles[variant].text}`} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Beta Gauge Component
const BetaGauge = ({ beta, isLoading }: { beta: number; isLoading: boolean }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[180px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const angle = Math.min(180, Math.max(0, (beta / 2) * 180));
    const color = beta > 1.2 ? '#ef4444' : beta < 0.8 ? '#10b981' : '#3b82f6';
    const label = beta > 1.2 ? 'Aggressive' : beta < 0.8 ? 'Defensive' : 'Moderate';

    return (
        <div className="flex flex-col items-center">
            <svg width="200" height="120" viewBox="0 0 200 120">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="20" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" strokeDasharray={`${angle * 2.8} 500`} />
                <line x1="100" y1="100" x2={100 + 60 * Math.cos((180 - angle) * Math.PI / 180)} y2={100 - 60 * Math.sin((180 - angle) * Math.PI / 180)} stroke="#374151" strokeWidth="3" strokeLinecap="round" />
                <circle cx="100" cy="100" r="8" fill="#374151" />
                <text x="20" y="115" fontSize="10" fill="#9ca3af">0</text>
                <text x="95" y="30" fontSize="10" fill="#9ca3af">1.0</text>
                <text x="175" y="115" fontSize="10" fill="#9ca3af">2.0</text>
            </svg>
            <p className="text-3xl font-bold mt-2" style={{ color }}>{beta.toFixed(2)}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
};

// Beta Scatter Chart
const BetaScatterChart = ({ data, beta }: { data: any[]; beta: number }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="marketReturn" name="Market" tickFormatter={(v) => `${v}%`} fontSize={10} tick={{ fill: '#6b7280' }} domain={[-6, 6]} label={{ value: 'Market Return', position: 'bottom', fontSize: 11 }} />
                <YAxis type="number" dataKey="portfolioReturn" name="Portfolio" tickFormatter={(v) => `${v}%`} fontSize={10} tick={{ fill: '#6b7280' }} domain={[-8, 8]} label={{ value: 'Portfolio Return', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`]} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <ReferenceLine x={0} stroke="#9ca3af" />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Scatter name="Returns" data={data} fill="#3b82f6" opacity={0.6} />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

// Risk Decomposition Chart
const RiskDecompositionChart = ({ systematic, idiosyncratic }: { systematic: number; idiosyncratic: number }) => {
    const data = [
        { name: 'Systematic Risk', value: systematic, fill: '#3b82f6' },
        { name: 'Idiosyncratic Risk', value: idiosyncratic, fill: '#f59e0b' },
    ];

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 100]} fontSize={10} />
                <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#374151' }} width={115} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Risk']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Generate synthetic scatter data
const generateScatterData = (beta: number, n: number = 100) => {
    const data = [];
    for (let i = 0; i < n; i++) {
        const marketReturn = (Math.random() - 0.5) * 10;
        const portfolioReturn = beta * marketReturn + (Math.random() - 0.5) * 3;
        data.push({ marketReturn, portfolioReturn });
    }
    return data;
};

// Generate synthetic returns for API call
const generateSyntheticReturns = (n: number = 252) => {
    const portfolioReturns: number[] = [];
    const benchmarkReturns: number[] = [];
    
    for (let i = 0; i < n; i++) {
        const benchmarkReturn = (Math.random() - 0.5) * 0.04;
        const portfolioReturn = 1.1 * benchmarkReturn + (Math.random() - 0.5) * 0.01;
        portfolioReturns.push(portfolioReturn);
        benchmarkReturns.push(benchmarkReturn);
    }
    
    return { portfolioReturns, benchmarkReturns };
};

export default function BetaVolatility({ config, analysisResult }: BetaVolatilityProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [betaResult, setBetaResult] = useState<BetaResult | null>(null);
    const [scatterData, setScatterData] = useState<any[]>([]);

    const calculateBeta = useCallback(async () => {
        if (!analysisResult?.portfolio) return;

        setIsLoading(true);
        setError(null);

        try {
            const { portfolioReturns, benchmarkReturns } = generateSyntheticReturns(252);
            
            const requestData = {
                holdings: analysisResult.portfolio.holdings.map(h => ({
                    ticker: h.ticker,
                    name: h.name,
                    sector: h.sector,
                    shares: h.shares,
                    avg_cost: h.avgCost,
                    current_price: h.currentPrice,
                    market_value: h.marketValue,
                    weight: h.weight
                })),
                portfolio_returns: portfolioReturns,
                benchmark_returns: benchmarkReturns
            };

            const response = await fetch('/api/finance/beta/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) throw new Error('API request failed');

            const result = await response.json();
            setBetaResult(result);
            setScatterData(generateScatterData(result.beta));

        } catch (err: any) {
            console.error('Beta calculation error:', err);
            setError(err.message || 'Failed to calculate beta');
        } finally {
            setIsLoading(false);
        }
    }, [analysisResult]);

    useEffect(() => {
        if (analysisResult?.portfolio) {
            calculateBeta();
        }
    }, [analysisResult]);

    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Beta & Volatility</h2>
                    <p className="text-gray-500 mt-1">Portfolio systematic risk and volatility analysis</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Portfolio Data</AlertTitle>
                    <AlertDescription>Please load portfolio data and run analysis in the Data Settings page first.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Beta & Volatility</h2>
                    <p className="text-gray-500 mt-1">Systematic risk, volatility, and risk-adjusted metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={calculateBeta} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Recalculate</span>
                    </Button>
                    <Badge variant="outline" className="text-lg px-4 py-2">β = {betaResult ? betaResult.beta.toFixed(2) : '...'}</Badge>
                    <Badge variant="outline" className="text-lg px-4 py-2">σ = {betaResult ? formatPercent(betaResult.portfolio_volatility) : '...'}</Badge>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Beta Gauge and Key Metrics */}
            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="flex items-center justify-center">
                    <CardContent className="pt-6">
                        <BetaGauge beta={betaResult?.beta || 1} isLoading={isLoading} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Key Risk Metrics</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Portfolio Beta</p>
                                <p className="text-xl font-bold text-blue-600">{isLoading ? '...' : betaResult?.beta.toFixed(2)}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Annual Volatility</p>
                                <p className="text-xl font-bold text-gray-900">{isLoading ? '...' : betaResult ? formatPercent(betaResult.portfolio_volatility) : '...'}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Benchmark Vol</p>
                                <p className="text-xl font-bold text-gray-900">{isLoading ? '...' : betaResult ? formatPercent(betaResult.benchmark_volatility) : '...'}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">R-Squared</p>
                                <p className="text-xl font-bold text-gray-900">{isLoading ? '...' : betaResult ? formatPercent(betaResult.r_squared * 100) : '...'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Risk-Adjusted Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Tracking Error" value={betaResult ? formatPercent(betaResult.tracking_error) : '...'} subtitle="vs Benchmark" icon={Target} isLoading={isLoading} />
                <StatCard title="Alpha" value={betaResult ? formatPercent(betaResult.alpha) : '...'} subtitle="Annualized excess return" icon={TrendingUp} variant={betaResult && betaResult.alpha > 0 ? 'success' : 'danger'} isLoading={isLoading} />
                <StatCard title="Sharpe Ratio" value={betaResult ? betaResult.sharpe_ratio.toFixed(2) : '...'} subtitle="Risk-adjusted return" icon={Gauge} isLoading={isLoading} />
                <StatCard title="Information Ratio" value={betaResult ? betaResult.information_ratio.toFixed(2) : '...'} subtitle="Alpha / Tracking Error" icon={Activity} variant={betaResult && betaResult.information_ratio > 0.5 ? 'success' : 'default'} isLoading={isLoading} />
            </div>

            {/* Scatter Plot */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5 text-gray-500" />Portfolio vs Market Returns</CardTitle>
                    <CardDescription>Scatter plot showing relationship (β = {betaResult?.beta.toFixed(2) || '...'}, R² = {betaResult ? formatPercent(betaResult.r_squared * 100) : '...'})</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
                    ) : (
                        <BetaScatterChart data={scatterData} beta={betaResult?.beta || 1} />
                    )}
                </CardContent>
            </Card>

            {/* Risk Decomposition */}
            {betaResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-gray-500" />Risk Decomposition</CardTitle>
                        <CardDescription>Breakdown of portfolio risk into systematic and idiosyncratic components</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RiskDecompositionChart systematic={betaResult.systematic_risk_pct} idiosyncratic={betaResult.idiosyncratic_risk_pct} />
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-semibold text-blue-800">Systematic Risk</h4>
                                <p className="text-sm text-blue-600 mt-1">Market-related risk that cannot be diversified away. Represents {formatPercent(betaResult.systematic_risk_pct)} of total portfolio risk.</p>
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-lg">
                                <h4 className="font-semibold text-yellow-800">Idiosyncratic Risk</h4>
                                <p className="text-sm text-yellow-600 mt-1">Stock-specific risk that can be reduced through diversification. Represents {formatPercent(betaResult.idiosyncratic_risk_pct)} of total portfolio risk.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Interpretation */}
            <Card>
                <CardHeader><CardTitle>Understanding Beta & Volatility</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold mb-2">Beta Interpretation</h4>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    <li><strong>β = 1.0:</strong> Moves with the market</li>
                                    <li><strong>β &gt; 1.0:</strong> More volatile than market (aggressive)</li>
                                    <li><strong>β &lt; 1.0:</strong> Less volatile than market (defensive)</li>
                                    <li><strong>β &lt; 0:</strong> Moves opposite to market (hedge)</li>
                                </ul>
                            </div>
                            {betaResult && (
                                <Alert>
                                    <Gauge className="h-4 w-4" />
                                    <AlertTitle>Your Portfolio Beta: {betaResult.beta.toFixed(2)}</AlertTitle>
                                    <AlertDescription>
                                        {betaResult.beta > 1.2 ? 'Your portfolio is more volatile than the market. Consider adding defensive positions.' : betaResult.beta < 0.8 ? 'Your portfolio is defensive with lower market sensitivity.' : 'Your portfolio has moderate market sensitivity, close to the overall market.'}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold mb-2">Risk-Adjusted Ratios</h4>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    <li><strong>Sharpe Ratio:</strong> Excess return per unit of total risk (&gt; 1.0 is good)</li>
                                    <li><strong>Treynor Ratio:</strong> Excess return per unit of systematic risk</li>
                                    <li><strong>Information Ratio:</strong> Active return per unit of active risk (&gt; 0.5 is good)</li>
                                    <li><strong>R-Squared:</strong> % of returns explained by market movements</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">Statistical Significance</h4>
                                <p className="text-sm text-blue-700">
                                    {betaResult && betaResult.p_value < 0.05 ? `P-value of ${betaResult.p_value.toFixed(4)} indicates the beta estimate is statistically significant at 95% confidence.` : 'Consider using more data points for a statistically significant beta estimate.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}