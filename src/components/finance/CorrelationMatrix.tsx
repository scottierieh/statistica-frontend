'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    GitBranch, Info, TrendingUp, TrendingDown, Grid3X3, 
    BarChart3, Network, AlertTriangle, CheckCircle2, Loader2, RefreshCw
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Cell
} from 'recharts';
import type { FinanceConfig, FinanceResults } from './FinanceLayout';

interface CorrelationMatrixProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

interface CorrelationResult {
    correlation_matrix: number[][];
    covariance_matrix: number[][];
    tickers: string[];
    statistics: {
        average_correlation: number;
        diversification_ratio: number;
        effective_n_assets: number;
        eigenvalues: number[];
        variance_explained: number[];
        cumulative_variance: number[];
    };
}

const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(0)}%`;
};

// Get heatmap background color
const getHeatmapBgColor = (value: number): string => {
    const intensity = Math.abs(value);
    if (value >= 0) {
        const r = 239;
        const g = Math.round(68 + (1 - intensity) * 150);
        const b = Math.round(68 + (1 - intensity) * 150);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        const r = Math.round(59 + (1 - intensity) * 150);
        const g = Math.round(130 + (1 - intensity) * 100);
        const b = 246;
        return `rgb(${r}, ${g}, ${b})`;
    }
};

// Correlation Heatmap
const CorrelationHeatmap = ({ labels, matrix }: { labels: string[]; matrix: number[][] }) => {
    const cellSize = 45;
    const fontSize = 9;

    if (!matrix || matrix.length === 0) return null;

    return (
        <div className="overflow-x-auto">
            <div className="inline-block">
                <div className="flex">
                    <div style={{ width: cellSize * 2 }} />
                    {labels.map((label, i) => (
                        <div key={i} style={{ width: cellSize }} className="text-center font-medium text-gray-600 truncate px-1" title={label}>
                            <span style={{ fontSize }}>{label.substring(0, 5)}</span>
                        </div>
                    ))}
                </div>
                {matrix.map((row, i) => (
                    <div key={i} className="flex items-center">
                        <div style={{ width: cellSize * 2 }} className="text-right pr-2 font-medium text-gray-600 truncate" title={labels[i]}>
                            <span style={{ fontSize: 10 }}>{labels[i].substring(0, 8)}</span>
                        </div>
                        {row.map((value, j) => (
                            <div
                                key={j}
                                style={{ width: cellSize, height: cellSize, backgroundColor: i === j ? '#f3f4f6' : getHeatmapBgColor(value), fontSize }}
                                className="flex items-center justify-center border border-white font-medium"
                                title={`${labels[i]} vs ${labels[j]}: ${value.toFixed(2)}`}
                            >
                                <span style={{ color: i === j ? '#9ca3af' : Math.abs(value) > 0.5 ? 'white' : '#374151' }}>
                                    {value.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Correlation Pairs List
const CorrelationPairsList = ({ labels, matrix, type }: { labels: string[]; matrix: number[][]; type: 'highest' | 'lowest' }) => {
    const pairs: { label1: string; label2: string; correlation: number }[] = [];
    
    for (let i = 0; i < matrix.length; i++) {
        for (let j = i + 1; j < matrix[i].length; j++) {
            pairs.push({ label1: labels[i], label2: labels[j], correlation: matrix[i][j] });
        }
    }

    const sorted = type === 'highest' 
        ? pairs.sort((a, b) => b.correlation - a.correlation).slice(0, 5)
        : pairs.sort((a, b) => a.correlation - b.correlation).slice(0, 5);

    return (
        <div className="space-y-2">
            {sorted.map((pair, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{pair.label1}</span>
                        <span className="text-gray-400">↔</span>
                        <span className="text-sm font-medium">{pair.label2}</span>
                    </div>
                    <Badge variant={pair.correlation > 0.5 ? 'destructive' : pair.correlation < 0.3 ? 'default' : 'secondary'}
                        className={pair.correlation > 0.5 ? '' : pair.correlation < 0.3 ? 'bg-green-600' : ''}>
                        {pair.correlation.toFixed(2)}
                    </Badge>
                </div>
            ))}
        </div>
    );
};

// Diversification Score Gauge
const DiversificationScore = ({ avgCorrelation, diversificationRatio, effectiveN, isLoading }: { avgCorrelation: number; diversificationRatio: number; effectiveN: number; isLoading: boolean }) => {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-6 flex items-center justify-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    const score = Math.max(0, Math.min(100, (1 - avgCorrelation) * 100));
    const color = score >= 70 ? '#10b981' : score >= 50 ? '#3b82f6' : score >= 30 ? '#f59e0b' : '#ef4444';
    const rating = score >= 70 ? 'Excellent' : score >= 50 ? 'Good' : score >= 30 ? 'Moderate' : 'Poor';

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Diversification Score</p>
                    <div className="relative w-32 h-32 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                            <circle cx="64" cy="64" r="56" fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${score * 3.52} 352`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold" style={{ color }}>{score.toFixed(0)}</span>
                        </div>
                    </div>
                    <p className="text-lg font-semibold mt-2" style={{ color }}>{rating}</p>
                    <p className="text-sm text-gray-500 mt-1">Avg Corr: {avgCorrelation.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Diversification Ratio: {diversificationRatio.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Effective Assets: {effectiveN.toFixed(1)}</p>
                </div>
            </CardContent>
        </Card>
    );
};

// Variance Explained Chart
const VarianceExplainedChart = ({ data }: { data: { component: number; variance: number; cumulative: number }[] }) => {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="component" tickFormatter={(v) => `PC${v}`} fontSize={10} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} fontSize={10} />
                <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`]} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="variance" name="Variance Explained" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// Generate synthetic returns for API
const generateSyntheticReturns = (n_assets: number, n_periods: number = 252) => {
    const returns: number[][] = [];
    for (let i = 0; i < n_assets; i++) {
        const assetReturns: number[] = [];
        for (let j = 0; j < n_periods; j++) {
            assetReturns.push((Math.random() - 0.5) * 0.04);
        }
        returns.push(assetReturns);
    }
    return returns;
};

export default function CorrelationMatrix({ config, analysisResult }: CorrelationMatrixProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [correlationResult, setCorrelationResult] = useState<CorrelationResult | null>(null);

    const calculateCorrelation = useCallback(async () => {
        if (!analysisResult?.portfolio) return;

        setIsLoading(true);
        setError(null);

        try {
            const { holdings } = analysisResult.portfolio;
            const returns_data = generateSyntheticReturns(holdings.length, 252);

            const requestData = {
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
                returns_data
            };

            const response = await fetch('/api/finance/correlation/matrix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) throw new Error('API request failed');

            const result = await response.json();
            setCorrelationResult(result);

        } catch (err: any) {
            console.error('Correlation calculation error:', err);
            setError(err.message || 'Failed to calculate correlation');
        } finally {
            setIsLoading(false);
        }
    }, [analysisResult]);

    useEffect(() => {
        if (analysisResult?.portfolio) {
            calculateCorrelation();
        }
    }, [analysisResult]);

    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Correlation Matrix</h2>
                    <p className="text-gray-500 mt-1">Asset correlation analysis and diversification</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Portfolio Data</AlertTitle>
                    <AlertDescription>Please load portfolio data and run analysis in the Data Settings page first.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const varianceData = correlationResult?.statistics.variance_explained.map((v, i) => ({
        component: i + 1,
        variance: v,
        cumulative: correlationResult.statistics.cumulative_variance[i]
    })) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Correlation Matrix</h2>
                    <p className="text-gray-500 mt-1">Analyze correlations between holdings</p>
                </div>
                <Button variant="outline" size="sm" onClick={calculateCorrelation} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">Recalculate</span>
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Diversification Score and PCA */}
            <div className="grid lg:grid-cols-3 gap-6">
                <DiversificationScore 
                    avgCorrelation={correlationResult?.statistics.average_correlation || 0}
                    diversificationRatio={correlationResult?.statistics.diversification_ratio || 1}
                    effectiveN={correlationResult?.statistics.effective_n_assets || 0}
                    isLoading={isLoading}
                />
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Principal Component Analysis</CardTitle>
                        <CardDescription>Variance explained by each principal component</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-[250px]"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
                        ) : (
                            <VarianceExplainedChart data={varianceData.slice(0, 8)} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Correlation Matrix */}
            <Card>
                <CardHeader>
                    <CardTitle>Correlation Matrix</CardTitle>
                    <CardDescription>Pairwise correlations between holdings</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
                    ) : correlationResult ? (
                        <CorrelationHeatmap labels={correlationResult.tickers} matrix={correlationResult.correlation_matrix} />
                    ) : null}
                </CardContent>
            </Card>

            {/* Highest/Lowest Correlations */}
            {correlationResult && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Highest Correlations</CardTitle>
                            <CardDescription>Most correlated pairs (concentration risk)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CorrelationPairsList labels={correlationResult.tickers} matrix={correlationResult.correlation_matrix} type="highest" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" />Lowest Correlations</CardTitle>
                            <CardDescription>Best diversification pairs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CorrelationPairsList labels={correlationResult.tickers} matrix={correlationResult.correlation_matrix} type="lowest" />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Color Legend */}
            <Card>
                <CardHeader><CardTitle>Correlation Guide</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3">Color Scale</h4>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-6 rounded" style={{ background: 'linear-gradient(to right, #3b82f6, #22d3ee, #a3e635, #facc15, #f97316, #dc2626)' }} />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>-1.0 (Inverse)</span>
                                <span>0</span>
                                <span>+1.0 (Perfect)</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Interpretation</h4>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li><span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: '#dc2626' }} /> <strong>&gt; 0.7:</strong> High correlation</li>
                                <li><span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: '#facc15' }} /> <strong>0.3-0.7:</strong> Moderate correlation</li>
                                <li><span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: '#a3e635' }} /> <strong>0-0.3:</strong> Low correlation (good diversification)</li>
                                <li><span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: '#3b82f6' }} /> <strong>&lt; 0:</strong> Negative correlation (hedge)</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}