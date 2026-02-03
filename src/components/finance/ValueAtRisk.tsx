'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    AlertTriangle, Info, TrendingDown, Shield, BarChart3, 
    Calculator, Activity, DollarSign, Percent, Clock, Target,
    Loader2, RefreshCw
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, BarChart, Bar, Cell, ReferenceLine
} from 'recharts';
import type { FinanceConfig, FinanceResults } from './FinanceLayout';

interface ValueAtRiskProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

interface VaRResult {
    method: string;
    var_value: number;
    var_pct: number;
    expected_shortfall_value: number;
    expected_shortfall_pct: number;
    portfolio_volatility_daily?: number;
    portfolio_volatility_annual?: number;
    confidence_level: number;
    time_horizon: number;
    distribution_stats?: {
        mean: number;
        std: number;
        skewness: number;
        kurtosis: number;
        min: number;
        max: number;
    };
}

interface ComponentVaRResult {
    component_var: {
        ticker: string;
        name: string;
        sector: string;
        weight: number;
        marginal_var: number;
        component_var: number;
        component_var_value: number;
        contribution_pct: number;
    }[];
    total_var_pct: number;
    total_var_value: number;
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPercent = (value: number, decimals: number = 2): string => {
    return `${value.toFixed(decimals)}%`;
};

// VaR Summary Card
const VaRCard = ({ 
    title, 
    value, 
    pct, 
    description,
    variant = 'default',
    isLoading = false
}: { 
    title: string; 
    value: number; 
    pct: number;
    description: string;
    variant?: 'default' | 'warning' | 'danger';
    isLoading?: boolean;
}) => {
    const bgColor = variant === 'danger' ? 'bg-red-50 border-red-200' : 
                    variant === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                    'bg-white';
    const textColor = variant === 'danger' ? 'text-red-700' : 
                      variant === 'warning' ? 'text-yellow-700' : 
                      'text-gray-900';

    return (
        <Card className={bgColor}>
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-20">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-1">
                        <p className="text-sm text-gray-500">{title}</p>
                        <p className={`text-2xl font-bold ${textColor}`}>{formatCurrency(value)}</p>
                        <p className={`text-lg font-semibold ${textColor}`}>{formatPercent(pct)}</p>
                        <p className="text-xs text-gray-400 mt-2">{description}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Distribution Chart
const DistributionChart = ({ data, varPct }: { data: any[]; varPct: number }) => {
    if (!data || data.length === 0) return null;
    
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                    dataKey="range" 
                    fontSize={10} 
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <YAxis fontSize={10} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                    formatter={(value: number) => [value, 'Frequency']}
                    labelFormatter={(label) => `Return: ${Number(label).toFixed(1)}%`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <ReferenceLine x={-varPct} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'VaR', fill: '#ef4444', fontSize: 12 }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={entry.range < -varPct ? '#ef4444' : '#3b82f6'} 
                            opacity={entry.range < -varPct ? 0.8 : 0.6}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Component VaR Chart
const ComponentVaRChart = ({ data }: { data: ComponentVaRResult['component_var'] }) => {
    if (!data || data.length === 0) return null;
    
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={10} tick={{ fill: '#6b7280' }} />
                <YAxis type="category" dataKey="ticker" fontSize={11} tick={{ fill: '#374151' }} width={55} />
                <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Component VaR']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="component_var_value" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// VaR Comparison Chart
const VaRComparisonChart = ({ results, isLoading }: { results: { parametric?: VaRResult; historical?: VaRResult; monteCarlo?: VaRResult }; isLoading: boolean }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const data = [
        { method: 'Parametric', value: results.parametric?.var_value || 0, fill: '#3b82f6' },
        { method: 'Historical', value: results.historical?.var_value || 0, fill: '#10b981' },
        { method: 'Monte Carlo', value: results.monteCarlo?.var_value || 0, fill: '#8b5cf6' },
        { method: 'Expected Shortfall', value: results.monteCarlo?.expected_shortfall_value || 0, fill: '#ef4444' },
    ];

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="method" fontSize={11} tick={{ fill: '#374151' }} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={10} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Value at Risk']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default function ValueAtRisk({ config, analysisResult }: ValueAtRiskProps) {
    const [confidenceLevel, setConfidenceLevel] = useState(95);
    const [timeHorizon, setTimeHorizon] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // API Results
    const [parametricResult, setParametricResult] = useState<VaRResult | null>(null);
    const [historicalResult, setHistoricalResult] = useState<VaRResult | null>(null);
    const [monteCarloResult, setMonteCarloResult] = useState<VaRResult | null>(null);
    const [componentVaRResult, setComponentVaRResult] = useState<ComponentVaRResult | null>(null);

    // Prepare request data
    const prepareRequestData = useCallback(() => {
        if (!analysisResult?.portfolio) return null;
        
        const { holdings, summary } = analysisResult.portfolio;
        
        return {
            holdings: holdings.map(h => ({
                ticker: h.ticker,
                name: h.name,
                sector: h.sector,
                shares: h.shares,
                avg_cost: h.avgCost,
                current_price: h.currentPrice,
                market_value: h.marketValue,
                weight: h.weight
            })),
            total_value: summary.totalValue,
            confidence_level: confidenceLevel / 100,
            time_horizon: timeHorizon,
            risk_free_rate: parseFloat(config.riskFreeRate) || 0.05
        };
    }, [analysisResult, confidenceLevel, timeHorizon, config.riskFreeRate]);

    // Calculate VaR via API
    const calculateVaR = useCallback(async () => {
        const requestData = prepareRequestData();
        if (!requestData) return;

        setIsLoading(true);
        setError(null);

        try {
            // Call all VaR endpoints in parallel
            const [parametricRes, historicalRes, monteCarloRes, componentRes] = await Promise.all([
                fetch('/api/finance/var/parametric', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                }),
                fetch('/api/finance/var/historical', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                }),
                fetch('/api/finance/var/monte-carlo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                }),
                fetch('/api/finance/var/component', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                })
            ]);

            if (!parametricRes.ok || !historicalRes.ok || !monteCarloRes.ok || !componentRes.ok) {
                throw new Error('API request failed');
            }

            const [parametric, historical, monteCarlo, component] = await Promise.all([
                parametricRes.json(),
                historicalRes.json(),
                monteCarloRes.json(),
                componentRes.json()
            ]);

            setParametricResult(parametric);
            setHistoricalResult(historical);
            setMonteCarloResult(monteCarlo);
            setComponentVaRResult(component);

        } catch (err: any) {
            console.error('VaR calculation error:', err);
            setError(err.message || 'Failed to calculate VaR');
        } finally {
            setIsLoading(false);
        }
    }, [prepareRequestData]);

    // Auto-calculate when parameters change
    useEffect(() => {
        if (analysisResult?.portfolio) {
            calculateVaR();
        }
    }, [confidenceLevel, timeHorizon, analysisResult]);

    // Generate distribution data for chart
    const distributionData = monteCarloResult?.distribution_stats ? (() => {
        const { mean, std, min, max } = monteCarloResult.distribution_stats;
        const buckets: { range: number; count: number }[] = [];
        const bucketSize = (max - min) / 30;
        
        for (let i = 0; i < 30; i++) {
            const rangeStart = min + i * bucketSize;
            const rangeMid = rangeStart + bucketSize / 2;
            // Approximate normal distribution count
            const zScore = (rangeMid - mean) / std;
            const count = Math.round(100 * Math.exp(-0.5 * zScore * zScore));
            buckets.push({ range: rangeMid, count });
        }
        return buckets;
    })() : [];

    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Value at Risk (VaR)</h2>
                    <p className="text-gray-500 mt-1">Portfolio risk measurement and analysis</p>
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

    const { summary } = analysisResult.portfolio;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Value at Risk (VaR)</h2>
                    <p className="text-gray-500 mt-1">Maximum expected loss at {confidenceLevel}% confidence over {timeHorizon} day(s)</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={calculateVaR}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Recalculate</span>
                    </Button>
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                        VaR: {monteCarloResult ? formatCurrency(monteCarloResult.var_value) : '...'}
                    </Badge>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Parameters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-gray-500" />
                        VaR Parameters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label>Confidence Level: {confidenceLevel}%</Label>
                            <Slider
                                value={[confidenceLevel]}
                                onValueChange={(v) => setConfidenceLevel(v[0])}
                                min={90}
                                max={99}
                                step={1}
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>90%</span>
                                <span>95%</span>
                                <span>99%</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label>Time Horizon</Label>
                            <Select value={timeHorizon.toString()} onValueChange={(v) => setTimeHorizon(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 Day</SelectItem>
                                    <SelectItem value="5">5 Days (1 Week)</SelectItem>
                                    <SelectItem value="10">10 Days (2 Weeks)</SelectItem>
                                    <SelectItem value="21">21 Days (1 Month)</SelectItem>
                                    <SelectItem value="63">63 Days (1 Quarter)</SelectItem>
                                    <SelectItem value="252">252 Days (1 Year)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* VaR Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <VaRCard 
                    title="Parametric VaR"
                    value={parametricResult?.var_value || 0}
                    pct={parametricResult?.var_pct || 0}
                    description="Variance-covariance method"
                    isLoading={isLoading}
                />
                <VaRCard 
                    title="Historical VaR"
                    value={historicalResult?.var_value || 0}
                    pct={historicalResult?.var_pct || 0}
                    description="Based on historical simulation"
                    isLoading={isLoading}
                />
                <VaRCard 
                    title="Monte Carlo VaR"
                    value={monteCarloResult?.var_value || 0}
                    pct={monteCarloResult?.var_pct || 0}
                    description="10,000 simulated scenarios"
                    variant="warning"
                    isLoading={isLoading}
                />
                <VaRCard 
                    title="Expected Shortfall (CVaR)"
                    value={monteCarloResult?.expected_shortfall_value || 0}
                    pct={monteCarloResult?.expected_shortfall_pct || 0}
                    description="Average loss beyond VaR"
                    variant="danger"
                    isLoading={isLoading}
                />
            </div>

            {/* Portfolio Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">Portfolio Value</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">Annual Volatility</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {parametricResult ? formatPercent(parametricResult.portfolio_volatility_annual || 0) : '...'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">Daily Volatility</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {parametricResult ? formatPercent(parametricResult.portfolio_volatility_daily || 0) : '...'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">VaR as % of Portfolio</p>
                        <p className="text-2xl font-bold text-red-600">
                            {monteCarloResult ? formatPercent(monteCarloResult.var_pct) : '...'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* VaR Method Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-gray-500" />
                        VaR Method Comparison
                    </CardTitle>
                    <CardDescription>Comparison across different VaR calculation methods</CardDescription>
                </CardHeader>
                <CardContent>
                    <VaRComparisonChart 
                        results={{ parametric: parametricResult || undefined, historical: historicalResult || undefined, monteCarlo: monteCarloResult || undefined }}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            {/* Return Distribution */}
            {distributionData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-gray-500" />
                            Return Distribution
                        </CardTitle>
                        <CardDescription>Simulated portfolio return distribution with VaR threshold</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DistributionChart data={distributionData} varPct={monteCarloResult?.var_pct || 0} />
                        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded" />
                                <span>Loss beyond VaR ({formatPercent(100 - confidenceLevel)} probability)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-500 rounded opacity-60" />
                                <span>Normal returns</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Component VaR */}
            {componentVaRResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-gray-500" />
                            Component VaR
                        </CardTitle>
                        <CardDescription>Risk contribution by individual holding</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ComponentVaRChart data={componentVaRResult.component_var} />
                    </CardContent>
                </Card>
            )}

            {/* Component VaR Table */}
            {componentVaRResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Component VaR Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Ticker</th>
                                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Weight</th>
                                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Marginal VaR</th>
                                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Component VaR</th>
                                        <th className="text-right py-3 px-2 font-semibold text-gray-600">% of Total VaR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {componentVaRResult.component_var.map((item, idx) => (
                                        <tr key={item.ticker} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                            <td className="py-3 px-2 font-medium">{item.ticker}</td>
                                            <td className="py-3 px-2 text-gray-600 truncate max-w-[150px]">{item.name}</td>
                                            <td className="py-3 px-2 text-right">{formatPercent(item.weight)}</td>
                                            <td className="py-3 px-2 text-right">{formatPercent(item.marginal_var)}</td>
                                            <td className="py-3 px-2 text-right font-medium text-red-600">{formatCurrency(item.component_var_value)}</td>
                                            <td className="py-3 px-2 text-right">{formatPercent(item.contribution_pct)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Monte Carlo Statistics */}
            {monteCarloResult?.distribution_stats && (
                <Card>
                    <CardHeader>
                        <CardTitle>Monte Carlo Simulation Statistics</CardTitle>
                        <CardDescription>Distribution characteristics from 10,000 simulations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <p className="text-xs text-gray-500">Mean Return</p>
                                <p className="text-lg font-bold">{formatPercent(monteCarloResult.distribution_stats.mean)}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <p className="text-xs text-gray-500">Std Deviation</p>
                                <p className="text-lg font-bold">{formatPercent(monteCarloResult.distribution_stats.std)}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <p className="text-xs text-gray-500">Skewness</p>
                                <p className="text-lg font-bold">{monteCarloResult.distribution_stats.skewness.toFixed(3)}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <p className="text-xs text-gray-500">Kurtosis</p>
                                <p className="text-lg font-bold">{monteCarloResult.distribution_stats.kurtosis.toFixed(3)}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <p className="text-xs text-gray-500">Min Return</p>
                                <p className="text-lg font-bold text-red-600">{formatPercent(monteCarloResult.distribution_stats.min)}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <p className="text-xs text-gray-500">Max Return</p>
                                <p className="text-lg font-bold text-green-600">{formatPercent(monteCarloResult.distribution_stats.max)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* VaR Interpretation */}
            <Card>
                <CardHeader>
                    <CardTitle>Understanding VaR</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>What does this VaR mean?</AlertTitle>
                                <AlertDescription>
                                    With {confidenceLevel}% confidence, your portfolio will not lose more than{' '}
                                    <strong>{monteCarloResult ? formatCurrency(monteCarloResult.var_value) : '...'}</strong> ({monteCarloResult ? formatPercent(monteCarloResult.var_pct) : '...'} of portfolio value) 
                                    over the next {timeHorizon} trading day{timeHorizon > 1 ? 's' : ''}.
                                </AlertDescription>
                            </Alert>
                            <Alert variant="destructive">
                                <Shield className="h-4 w-4" />
                                <AlertTitle>Worst Case (Expected Shortfall)</AlertTitle>
                                <AlertDescription>
                                    If losses exceed VaR (which happens {formatPercent(100 - confidenceLevel)} of the time), 
                                    the average loss would be <strong>{monteCarloResult ? formatCurrency(monteCarloResult.expected_shortfall_value) : '...'}</strong>.
                                </AlertDescription>
                            </Alert>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold mb-2">VaR Methods Explained</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li><strong>Parametric:</strong> Assumes normal distribution, fastest calculation</li>
                                    <li><strong>Historical:</strong> Based on actual historical returns, captures fat tails</li>
                                    <li><strong>Monte Carlo:</strong> Simulates thousands of scenarios, most flexible</li>
                                    <li><strong>Expected Shortfall:</strong> Average loss when VaR is exceeded</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Limitations</h4>
                                <ul className="space-y-1 text-sm text-yellow-700">
                                    <li>• VaR doesn't capture tail risk beyond the threshold</li>
                                    <li>• Assumes past patterns predict future behavior</li>
                                    <li>• May underestimate risk during market stress</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}