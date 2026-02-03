'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Activity, Info, TrendingUp, TrendingDown, DollarSign, Percent,
    BarChart3, ArrowUpDown, Target, Gauge, Zap
} from 'lucide-react';
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, BarChart, Bar, Cell, ReferenceLine, Area, AreaChart,
    ScatterChart, Scatter, ZAxis
} from 'recharts';
import type { FinanceConfig, FinanceResults } from './FinanceLayout';

interface SensitivityAnalysisProps {
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
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

// Market factors for sensitivity analysis
const marketFactors = [
    { id: 'market', name: 'Market (S&P 500)', description: 'Overall market movement', defaultBeta: 1.0 },
    { id: 'rates', name: 'Interest Rates', description: '100bps change impact', defaultBeta: -0.3 },
    { id: 'inflation', name: 'Inflation', description: '1% inflation change', defaultBeta: -0.2 },
    { id: 'usd', name: 'USD Strength', description: '10% USD appreciation', defaultBeta: -0.15 },
    { id: 'oil', name: 'Oil Prices', description: '20% oil price change', defaultBeta: 0.1 },
    { id: 'volatility', name: 'VIX', description: '10pt VIX spike', defaultBeta: -0.25 },
];

// Sector betas to different factors
const sectorFactorBetas: Record<string, Record<string, number>> = {
    'Technology': { market: 1.3, rates: -0.5, inflation: -0.3, usd: -0.2, oil: -0.1, volatility: -0.4 },
    'Healthcare': { market: 0.8, rates: -0.2, inflation: 0.1, usd: -0.1, oil: -0.05, volatility: -0.15 },
    'Financials': { market: 1.2, rates: 0.4, inflation: -0.1, usd: 0.1, oil: 0.05, volatility: -0.3 },
    'Energy': { market: 1.1, rates: -0.1, inflation: 0.3, usd: -0.3, oil: 0.8, volatility: -0.2 },
    'Consumer Discretionary': { market: 1.2, rates: -0.3, inflation: -0.4, usd: -0.1, oil: -0.2, volatility: -0.35 },
    'Consumer Staples': { market: 0.6, rates: -0.1, inflation: 0.2, usd: -0.15, oil: -0.1, volatility: -0.1 },
    'Industrials': { market: 1.1, rates: -0.2, inflation: -0.1, usd: -0.2, oil: -0.15, volatility: -0.25 },
    'Materials': { market: 1.0, rates: -0.15, inflation: 0.4, usd: -0.25, oil: 0.2, volatility: -0.2 },
};

// Calculate sensitivity to a factor
const calculateFactorSensitivity = (
    sectorAllocation: any[],
    totalValue: number,
    factorId: string,
    shockRange: number[] // e.g., [-20, -10, 0, 10, 20]
) => {
    return shockRange.map(shock => {
        let portfolioImpact = 0;
        sectorAllocation.forEach(sector => {
            const beta = sectorFactorBetas[sector.sector]?.[factorId] ?? 0.5;
            const sectorImpact = sector.value * beta * (shock / 100);
            portfolioImpact += sectorImpact;
        });
        return {
            shock,
            impact: portfolioImpact,
            impactPct: (portfolioImpact / totalValue) * 100,
            newValue: totalValue + portfolioImpact,
        };
    });
};

// Calculate portfolio beta to each factor
const calculatePortfolioBetas = (sectorAllocation: any[]) => {
    const betas: Record<string, number> = {};
    marketFactors.forEach(factor => {
        let weightedBeta = 0;
        sectorAllocation.forEach(sector => {
            const sectorBeta = sectorFactorBetas[sector.sector]?.[factor.id] ?? factor.defaultBeta;
            weightedBeta += (sector.weight / 100) * sectorBeta;
        });
        betas[factor.id] = weightedBeta;
    });
    return betas;
};

// Generate tornado chart data
const generateTornadoData = (sectorAllocation: any[], totalValue: number, shockSize: number = 10) => {
    return marketFactors.map(factor => {
        const upShock = calculateFactorSensitivity(sectorAllocation, totalValue, factor.id, [shockSize])[0];
        const downShock = calculateFactorSensitivity(sectorAllocation, totalValue, factor.id, [-shockSize])[0];
        return {
            factor: factor.name,
            factorId: factor.id,
            upside: upShock.impactPct,
            downside: downShock.impactPct,
            range: Math.abs(upShock.impactPct) + Math.abs(downShock.impactPct),
        };
    }).sort((a, b) => b.range - a.range);
};

// Sensitivity Line Chart
const SensitivityLineChart = ({ data, factorName }: { data: any[]; factorName: string }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                    <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                    dataKey="shock" 
                    fontSize={10} 
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                    label={{ value: `${factorName} Change`, position: 'bottom', fontSize: 11 }}
                />
                <YAxis 
                    tickFormatter={(v) => formatCurrency(v)} 
                    fontSize={10} 
                    tick={{ fill: '#6b7280' }}
                    label={{ value: 'Portfolio Impact', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip 
                    formatter={(value: number, name: string) => {
                        if (name === 'impact') return [formatCurrency(value), 'Impact'];
                        return [formatCurrency(value), 'Portfolio Value'];
                    }}
                    labelFormatter={(label) => `${factorName}: ${label > 0 ? '+' : ''}${label}%`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <ReferenceLine x={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="impact" stroke="#3b82f6" strokeWidth={2} fill="url(#impactGradient)" />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// Tornado Chart
const TornadoChart = ({ data }: { data: any[] }) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                <XAxis 
                    type="number" 
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`} 
                    fontSize={10} 
                    tick={{ fill: '#6b7280' }}
                    domain={['auto', 'auto']}
                />
                <YAxis type="category" dataKey="factor" fontSize={11} tick={{ fill: '#374151' }} width={95} />
                <Tooltip 
                    formatter={(value: number, name: string) => [
                        `${value > 0 ? '+' : ''}${value.toFixed(2)}%`,
                        name === 'upside' ? 'Positive Shock' : 'Negative Shock'
                    ]}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <ReferenceLine x={0} stroke="#374151" strokeWidth={2} />
                <Bar dataKey="downside" name="Negative Shock" fill="#ef4444" radius={[4, 0, 0, 4]} />
                <Bar dataKey="upside" name="Positive Shock" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// Factor Beta Card
const FactorBetaCard = ({ factor, beta }: { factor: typeof marketFactors[0]; beta: number }) => {
    const getBetaColor = (b: number) => {
        if (Math.abs(b) > 0.5) return b > 0 ? 'text-green-600' : 'text-red-600';
        if (Math.abs(b) > 0.2) return b > 0 ? 'text-green-500' : 'text-red-500';
        return 'text-gray-600';
    };

    const getBetaLabel = (b: number) => {
        if (Math.abs(b) > 0.5) return 'High';
        if (Math.abs(b) > 0.2) return 'Medium';
        return 'Low';
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500">{factor.name}</p>
                        <p className={`text-2xl font-bold ${getBetaColor(beta)}`}>
                            {beta >= 0 ? '+' : ''}{beta.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{factor.description}</p>
                    </div>
                    <Badge variant={Math.abs(beta) > 0.3 ? 'default' : 'secondary'}>
                        {getBetaLabel(beta)} Sensitivity
                    </Badge>
                </div>
                <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>-1.0</span>
                        <span>0</span>
                        <span>+1.0</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full relative">
                        <div 
                            className={`absolute h-full rounded-full ${beta >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{
                                left: beta >= 0 ? '50%' : `${50 + beta * 50}%`,
                                width: `${Math.abs(beta) * 50}%`,
                            }}
                        />
                        <div className="absolute w-0.5 h-4 bg-gray-600 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Sector Sensitivity Table
const SectorSensitivityTable = ({ sectorAllocation }: { sectorAllocation: any[] }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Sector</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Weight</th>
                        {marketFactors.slice(0, 4).map(f => (
                            <th key={f.id} className="text-right py-3 px-2 font-semibold text-gray-600">{f.name.split(' ')[0]}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sectorAllocation.map((sector, idx) => {
                        const betas = sectorFactorBetas[sector.sector] || {};
                        return (
                            <tr key={sector.sector} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-3 px-2 font-medium">{sector.sector}</td>
                                <td className="py-3 px-2 text-right">{sector.weight.toFixed(1)}%</td>
                                {marketFactors.slice(0, 4).map(f => {
                                    const beta = betas[f.id] ?? 0;
                                    return (
                                        <td 
                                            key={f.id} 
                                            className={`py-3 px-2 text-right font-medium ${
                                                beta > 0.3 ? 'text-green-600' : beta < -0.3 ? 'text-red-600' : 'text-gray-600'
                                            }`}
                                        >
                                            {beta >= 0 ? '+' : ''}{beta.toFixed(2)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// What-If Scenario
const WhatIfScenario = ({ 
    sectorAllocation, 
    totalValue 
}: { 
    sectorAllocation: any[]; 
    totalValue: number;
}) => {
    const [factorShocks, setFactorShocks] = useState<Record<string, number>>({
        market: 0,
        rates: 0,
        inflation: 0,
        usd: 0,
        oil: 0,
        volatility: 0,
    });

    const combinedImpact = useMemo(() => {
        let totalImpact = 0;
        const sectorImpacts: Record<string, number> = {};

        sectorAllocation.forEach(sector => {
            let sectorImpact = 0;
            const betas = sectorFactorBetas[sector.sector] || {};
            
            Object.entries(factorShocks).forEach(([factorId, shock]) => {
                const beta = betas[factorId] ?? 0;
                sectorImpact += sector.value * beta * (shock / 100);
            });
            
            sectorImpacts[sector.sector] = sectorImpact;
            totalImpact += sectorImpact;
        });

        return {
            totalImpact,
            totalImpactPct: (totalImpact / totalValue) * 100,
            newValue: totalValue + totalImpact,
            sectorImpacts,
        };
    }, [factorShocks, sectorAllocation, totalValue]);

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketFactors.map(factor => (
                    <div key={factor.id} className="space-y-2">
                        <div className="flex justify-between">
                            <Label className="text-sm">{factor.name}</Label>
                            <span className={`text-sm font-medium ${
                                factorShocks[factor.id] > 0 ? 'text-green-600' : 
                                factorShocks[factor.id] < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                                {factorShocks[factor.id] > 0 ? '+' : ''}{factorShocks[factor.id]}%
                            </span>
                        </div>
                        <Slider
                            value={[factorShocks[factor.id]]}
                            onValueChange={(v) => setFactorShocks({ ...factorShocks, [factor.id]: v[0] })}
                            min={-30}
                            max={30}
                            step={1}
                        />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card className={combinedImpact.totalImpact >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-gray-500">Combined Impact</p>
                        <p className={`text-2xl font-bold ${combinedImpact.totalImpact >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(combinedImpact.totalImpact)}
                        </p>
                        <p className={combinedImpact.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercent(combinedImpact.totalImpactPct)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-gray-500">Current Value</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
                    </CardContent>
                </Card>
                <Card className={combinedImpact.totalImpact >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-gray-500">Projected Value</p>
                        <p className={`text-2xl font-bold ${combinedImpact.totalImpact >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(combinedImpact.newValue)}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default function SensitivityAnalysis({ config, analysisResult }: SensitivityAnalysisProps) {
    const [selectedFactor, setSelectedFactor] = useState(marketFactors[0]);

    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sensitivity Analysis</h2>
                    <p className="text-gray-500 mt-1">Portfolio sensitivity to market factors</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Portfolio Data</AlertTitle>
                    <AlertDescription>
                        Please load portfolio data and run analysis in the Data Settings page first.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { holdings, summary, sectorAllocation } = analysisResult.portfolio;
    
    const portfolioBetas = calculatePortfolioBetas(sectorAllocation);
    const tornadoData = generateTornadoData(sectorAllocation, summary.totalValue, 10);
    const sensitivityData = calculateFactorSensitivity(
        sectorAllocation, 
        summary.totalValue, 
        selectedFactor.id,
        [-20, -15, -10, -5, 0, 5, 10, 15, 20]
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sensitivity Analysis</h2>
                    <p className="text-gray-500 mt-1">Analyze portfolio sensitivity to market factors and scenarios</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                    Market Beta: {portfolioBetas.market.toFixed(2)}
                </Badge>
            </div>

            {/* Portfolio Factor Betas */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {marketFactors.map(factor => (
                    <FactorBetaCard 
                        key={factor.id}
                        factor={factor}
                        beta={portfolioBetas[factor.id]}
                    />
                ))}
            </div>

            {/* Tornado Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowUpDown className="h-5 w-5 text-gray-500" />
                        Sensitivity Tornado Chart
                    </CardTitle>
                    <CardDescription>Portfolio impact from ±10% change in each factor</CardDescription>
                </CardHeader>
                <CardContent>
                    <TornadoChart data={tornadoData} />
                </CardContent>
            </Card>

            {/* Factor Sensitivity Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-gray-500" />
                        Factor Sensitivity Curve
                    </CardTitle>
                    <CardDescription>Portfolio impact across range of factor changes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {marketFactors.map(factor => (
                            <button
                                key={factor.id}
                                onClick={() => setSelectedFactor(factor)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedFactor.id === factor.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {factor.name}
                            </button>
                        ))}
                    </div>
                    <SensitivityLineChart data={sensitivityData} factorName={selectedFactor.name} />
                </CardContent>
            </Card>

            {/* What-If Scenario */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-gray-500" />
                        Multi-Factor What-If Analysis
                    </CardTitle>
                    <CardDescription>Combine multiple factor shocks to see combined impact</CardDescription>
                </CardHeader>
                <CardContent>
                    <WhatIfScenario sectorAllocation={sectorAllocation} totalValue={summary.totalValue} />
                </CardContent>
            </Card>

            {/* Sector Sensitivity Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Sector Factor Betas</CardTitle>
                    <CardDescription>Sensitivity of each sector to market factors</CardDescription>
                </CardHeader>
                <CardContent>
                    <SectorSensitivityTable sectorAllocation={sectorAllocation} />
                </CardContent>
            </Card>

            {/* Interpretation */}
            <Card>
                <CardHeader>
                    <CardTitle>Understanding Sensitivity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h4 className="font-semibold">Key Exposures</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                {tornadoData.slice(0, 3).map(item => (
                                    <li key={item.factorId} className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-primary" />
                                        <span>
                                            <strong>{item.factor}</strong>: {item.range.toFixed(1)}% range 
                                            (↓{Math.abs(item.downside).toFixed(1)}% / ↑{item.upside.toFixed(1)}%)
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-2">Beta Interpretation</h4>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li><strong>Beta {'>'} 1.0:</strong> More volatile than the factor</li>
                                <li><strong>Beta = 1.0:</strong> Moves in line with the factor</li>
                                <li><strong>Beta {'<'} 1.0:</strong> Less volatile than the factor</li>
                                <li><strong>Negative Beta:</strong> Inverse relationship (hedge)</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}