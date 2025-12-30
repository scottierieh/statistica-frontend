'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
    GitBranch, Info, TrendingUp, TrendingDown, PieChart, BarChart3,
    Target, Layers, ArrowRight, CheckCircle2, XCircle
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, Cell, Treemap, Sankey, Rectangle,
    ComposedChart, Line, ReferenceLine
} from 'recharts';
import type { FinanceConfig, FinanceResults, SectorAllocation } from './FinanceLayout';

interface AttributionAnalysisProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

const formatPercent = (value: number, showSign: boolean = true): string => {
    const sign = showSign && value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

// Colors
const COLORS = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
    allocation: '#3b82f6',
    selection: '#8b5cf6',
    interaction: '#f59e0b',
};

// Calculate Brinson Attribution
const calculateBrinsonAttribution = (holdings: any[], sectorAllocation: SectorAllocation[]) => {
    // Benchmark weights (assumed equal weight for simplicity)
    const numSectors = sectorAllocation.length;
    const benchmarkWeight = 100 / numSectors;
    
    // Benchmark return per sector (mock - slightly lower than portfolio)
    const benchmarkSectorReturns: Record<string, number> = {};
    sectorAllocation.forEach(s => {
        benchmarkSectorReturns[s.sector] = (Math.random() * 15) - 2; // -2% to +13%
    });
    
    // Calculate portfolio return per sector
    const sectorReturns: Record<string, { portfolioReturn: number; portfolioWeight: number; holdings: any[] }> = {};
    
    holdings.forEach(h => {
        if (!sectorReturns[h.sector]) {
            sectorReturns[h.sector] = { portfolioReturn: 0, portfolioWeight: 0, holdings: [] };
        }
        sectorReturns[h.sector].holdings.push(h);
        sectorReturns[h.sector].portfolioWeight += h.weight;
    });
    
    // Calculate weighted return per sector
    Object.keys(sectorReturns).forEach(sector => {
        const sectorData = sectorReturns[sector];
        const totalWeight = sectorData.portfolioWeight;
        let weightedReturn = 0;
        sectorData.holdings.forEach(h => {
            weightedReturn += (h.weight / totalWeight) * h.unrealizedGainPct;
        });
        sectorData.portfolioReturn = weightedReturn;
    });
    
    // Brinson Attribution Components
    const attribution = sectorAllocation.map(s => {
        const portfolioWeight = s.weight;
        const portfolioReturn = sectorReturns[s.sector]?.portfolioReturn || 0;
        const benchmarkReturn = benchmarkSectorReturns[s.sector] || 0;
        
        // Allocation Effect: (Wp - Wb) × (Rb - Rtotal_b)
        const totalBenchmarkReturn = Object.values(benchmarkSectorReturns).reduce((a, b) => a + b, 0) / numSectors;
        const allocationEffect = (portfolioWeight - benchmarkWeight) / 100 * (benchmarkReturn - totalBenchmarkReturn);
        
        // Selection Effect: Wb × (Rp - Rb)
        const selectionEffect = benchmarkWeight / 100 * (portfolioReturn - benchmarkReturn);
        
        // Interaction Effect: (Wp - Wb) × (Rp - Rb)
        const interactionEffect = (portfolioWeight - benchmarkWeight) / 100 * (portfolioReturn - benchmarkReturn);
        
        // Total Effect
        const totalEffect = allocationEffect + selectionEffect + interactionEffect;
        
        return {
            sector: s.sector,
            portfolioWeight,
            benchmarkWeight,
            portfolioReturn,
            benchmarkReturn,
            allocationEffect: allocationEffect * 100,
            selectionEffect: selectionEffect * 100,
            interactionEffect: interactionEffect * 100,
            totalEffect: totalEffect * 100,
            activeWeight: portfolioWeight - benchmarkWeight,
            activeReturn: portfolioReturn - benchmarkReturn,
        };
    });
    
    // Summary totals
    const totalAllocation = attribution.reduce((sum, a) => sum + a.allocationEffect, 0);
    const totalSelection = attribution.reduce((sum, a) => sum + a.selectionEffect, 0);
    const totalInteraction = attribution.reduce((sum, a) => sum + a.interactionEffect, 0);
    const totalActive = totalAllocation + totalSelection + totalInteraction;
    
    return {
        sectorAttribution: attribution,
        summary: {
            allocationEffect: totalAllocation,
            selectionEffect: totalSelection,
            interactionEffect: totalInteraction,
            totalActiveReturn: totalActive,
        }
    };
};

// Attribution Summary Card
const AttributionSummaryCard = ({ 
    title, 
    value, 
    description, 
    color 
}: { 
    title: string; 
    value: number; 
    description: string;
    color: string;
}) => (
    <Card>
        <CardContent className="pt-6">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className={`text-2xl font-bold mt-1`} style={{ color }}>
                        {formatPercent(value)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{description}</p>
                </div>
                <div className="w-3 h-12 rounded-full" style={{ backgroundColor: color }} />
            </div>
        </CardContent>
    </Card>
);

// Waterfall Chart for Attribution
const AttributionWaterfallChart = ({ summary }: { summary: any }) => {
    const data = [
        { name: 'Allocation', value: summary.allocationEffect, fill: COLORS.allocation },
        { name: 'Selection', value: summary.selectionEffect, fill: COLORS.selection },
        { name: 'Interaction', value: summary.interactionEffect, fill: COLORS.interaction },
        { name: 'Total Active', value: summary.totalActiveReturn, fill: summary.totalActiveReturn >= 0 ? COLORS.positive : COLORS.negative },
    ];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: '#374151' }} />
                <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} fontSize={10} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                    formatter={(value: number) => [formatPercent(value), 'Contribution']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Sector Attribution Chart
const SectorAttributionChart = ({ data }: { data: any[] }) => {
    const chartData = data.map(d => ({
        sector: d.sector.length > 12 ? d.sector.substring(0, 12) + '...' : d.sector,
        allocation: d.allocationEffect,
        selection: d.selectionEffect,
        interaction: d.interactionEffect,
        total: d.totalEffect,
    })).sort((a, b) => b.total - a.total);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}%`} fontSize={10} tick={{ fill: '#6b7280' }} />
                <YAxis type="category" dataKey="sector" fontSize={11} tick={{ fill: '#374151' }} width={75} />
                <Tooltip 
                    formatter={(value: number, name: string) => [formatPercent(value), name.charAt(0).toUpperCase() + name.slice(1)]}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <ReferenceLine x={0} stroke="#9ca3af" />
                <Bar dataKey="allocation" name="Allocation" stackId="a" fill={COLORS.allocation} />
                <Bar dataKey="selection" name="Selection" stackId="a" fill={COLORS.selection} />
                <Bar dataKey="interaction" name="Interaction" stackId="a" fill={COLORS.interaction} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// Active Weight vs Active Return Scatter-like Chart
const ActiveWeightReturnChart = ({ data }: { data: any[] }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="sector" fontSize={10} tick={{ fill: '#6b7280' }} angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${v.toFixed(0)}%`} fontSize={10} tick={{ fill: '#6b7280' }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(0)}%`} fontSize={10} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                    formatter={(value: number, name: string) => [formatPercent(value), name]}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <ReferenceLine y={0} yAxisId="left" stroke="#9ca3af" strokeDasharray="3 3" />
                <Bar yAxisId="left" dataKey="activeWeight" name="Active Weight" fill={COLORS.allocation} opacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="activeReturn" name="Active Return" stroke={COLORS.selection} strokeWidth={2} dot={{ fill: COLORS.selection }} />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

// Attribution Detail Table
const AttributionTable = ({ data }: { data: any[] }) => {
    const sortedData = [...data].sort((a, b) => b.totalEffect - a.totalEffect);
    
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Sector</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Port. Wt</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Bench. Wt</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Active Wt</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Port. Ret</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Bench. Ret</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600" style={{ color: COLORS.allocation }}>Allocation</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600" style={{ color: COLORS.selection }}>Selection</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600" style={{ color: COLORS.interaction }}>Interaction</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, idx) => (
                        <tr key={row.sector} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-3 px-2 font-medium">{row.sector}</td>
                            <td className="py-3 px-2 text-right">{row.portfolioWeight.toFixed(1)}%</td>
                            <td className="py-3 px-2 text-right">{row.benchmarkWeight.toFixed(1)}%</td>
                            <td className={`py-3 px-2 text-right ${row.activeWeight >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(row.activeWeight)}
                            </td>
                            <td className={`py-3 px-2 text-right ${row.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(row.portfolioReturn)}
                            </td>
                            <td className={`py-3 px-2 text-right ${row.benchmarkReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(row.benchmarkReturn)}
                            </td>
                            <td className={`py-3 px-2 text-right font-medium`} style={{ color: row.allocationEffect >= 0 ? COLORS.positive : COLORS.negative }}>
                                {formatPercent(row.allocationEffect)}
                            </td>
                            <td className={`py-3 px-2 text-right font-medium`} style={{ color: row.selectionEffect >= 0 ? COLORS.positive : COLORS.negative }}>
                                {formatPercent(row.selectionEffect)}
                            </td>
                            <td className={`py-3 px-2 text-right font-medium`} style={{ color: row.interactionEffect >= 0 ? COLORS.positive : COLORS.negative }}>
                                {formatPercent(row.interactionEffect)}
                            </td>
                            <td className={`py-3 px-2 text-right font-bold ${row.totalEffect >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(row.totalEffect)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-gray-300 font-semibold bg-gray-100">
                        <td className="py-3 px-2">Total</td>
                        <td className="py-3 px-2 text-right">100.0%</td>
                        <td className="py-3 px-2 text-right">100.0%</td>
                        <td className="py-3 px-2 text-right">-</td>
                        <td className="py-3 px-2 text-right">-</td>
                        <td className="py-3 px-2 text-right">-</td>
                        <td className="py-3 px-2 text-right" style={{ color: COLORS.allocation }}>
                            {formatPercent(sortedData.reduce((sum, r) => sum + r.allocationEffect, 0))}
                        </td>
                        <td className="py-3 px-2 text-right" style={{ color: COLORS.selection }}>
                            {formatPercent(sortedData.reduce((sum, r) => sum + r.selectionEffect, 0))}
                        </td>
                        <td className="py-3 px-2 text-right" style={{ color: COLORS.interaction }}>
                            {formatPercent(sortedData.reduce((sum, r) => sum + r.interactionEffect, 0))}
                        </td>
                        <td className="py-3 px-2 text-right text-primary">
                            {formatPercent(sortedData.reduce((sum, r) => sum + r.totalEffect, 0))}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default function AttributionAnalysis({ config, analysisResult }: AttributionAnalysisProps) {
    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Attribution Analysis</h2>
                    <p className="text-gray-500 mt-1">Brinson attribution and performance decomposition</p>
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

    const { holdings, sectorAllocation } = analysisResult.portfolio;
    const { sectorAttribution, summary } = calculateBrinsonAttribution(holdings, sectorAllocation);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Attribution Analysis</h2>
                    <p className="text-gray-500 mt-1">Brinson-Fachler performance attribution by sector</p>
                </div>
                <Badge variant={summary.totalActiveReturn >= 0 ? 'default' : 'destructive'} className={summary.totalActiveReturn >= 0 ? 'bg-green-600' : ''}>
                    {formatPercent(summary.totalActiveReturn)} Active Return
                </Badge>
            </div>

            {/* Attribution Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AttributionSummaryCard 
                    title="Allocation Effect"
                    value={summary.allocationEffect}
                    description="Sector weight decisions"
                    color={COLORS.allocation}
                />
                <AttributionSummaryCard 
                    title="Selection Effect"
                    value={summary.selectionEffect}
                    description="Stock picking within sectors"
                    color={COLORS.selection}
                />
                <AttributionSummaryCard 
                    title="Interaction Effect"
                    value={summary.interactionEffect}
                    description="Combined weight & selection"
                    color={COLORS.interaction}
                />
                <AttributionSummaryCard 
                    title="Total Active Return"
                    value={summary.totalActiveReturn}
                    description="Portfolio vs benchmark"
                    color={summary.totalActiveReturn >= 0 ? COLORS.positive : COLORS.negative}
                />
            </div>

            {/* Attribution Waterfall */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-gray-500" />
                        Attribution Decomposition
                    </CardTitle>
                    <CardDescription>Breakdown of active return by attribution effect</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttributionWaterfallChart summary={summary} />
                </CardContent>
            </Card>

            {/* Sector Attribution Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-gray-500" />
                        Sector Attribution
                    </CardTitle>
                    <CardDescription>Attribution effects by sector (stacked)</CardDescription>
                </CardHeader>
                <CardContent>
                    <SectorAttributionChart data={sectorAttribution} />
                </CardContent>
            </Card>

            {/* Active Weight vs Return */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-gray-500" />
                        Active Decisions Analysis
                    </CardTitle>
                    <CardDescription>Active weight (bars) vs active return (line) by sector</CardDescription>
                </CardHeader>
                <CardContent>
                    <ActiveWeightReturnChart data={sectorAttribution} />
                </CardContent>
            </Card>

            {/* Attribution Explanation */}
            <Card>
                <CardHeader>
                    <CardTitle>Understanding Brinson Attribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg border-l-4" style={{ borderColor: COLORS.allocation, backgroundColor: `${COLORS.allocation}10` }}>
                            <h4 className="font-semibold mb-2" style={{ color: COLORS.allocation }}>Allocation Effect</h4>
                            <p className="text-sm text-gray-600">
                                Measures the impact of over/underweighting sectors relative to the benchmark. 
                                Positive when you overweight outperforming sectors or underweight underperforming ones.
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border-l-4" style={{ borderColor: COLORS.selection, backgroundColor: `${COLORS.selection}10` }}>
                            <h4 className="font-semibold mb-2" style={{ color: COLORS.selection }}>Selection Effect</h4>
                            <p className="text-sm text-gray-600">
                                Measures the value added by stock selection within each sector. 
                                Positive when your stock picks outperform the sector benchmark.
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border-l-4" style={{ borderColor: COLORS.interaction, backgroundColor: `${COLORS.interaction}10` }}>
                            <h4 className="font-semibold mb-2" style={{ color: COLORS.interaction }}>Interaction Effect</h4>
                            <p className="text-sm text-gray-600">
                                Captures the combined effect of allocation and selection decisions. 
                                Positive when you overweight sectors where you also have good stock selection.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Attribution Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-gray-500" />
                        Detailed Attribution by Sector
                    </CardTitle>
                    <CardDescription>Complete breakdown of weights, returns, and attribution effects</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttributionTable data={sectorAttribution} />
                </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
                <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Top contributors */}
                        {sectorAttribution
                            .sort((a, b) => b.totalEffect - a.totalEffect)
                            .slice(0, 3)
                            .map((sector, idx) => (
                                <div key={sector.sector} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    {sector.totalEffect >= 0 ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium">{sector.sector}</p>
                                        <p className="text-sm text-gray-500">
                                            {sector.totalEffect >= 0 ? 'Contributed' : 'Detracted'} {formatPercent(Math.abs(sector.totalEffect))} 
                                            {' '}({sector.allocationEffect >= 0 ? '+' : ''}{sector.allocationEffect.toFixed(2)}% allocation, 
                                            {' '}{sector.selectionEffect >= 0 ? '+' : ''}{sector.selectionEffect.toFixed(2)}% selection)
                                        </p>
                                    </div>
                                    <Badge variant={sector.totalEffect >= 0 ? 'default' : 'destructive'}>
                                        {formatPercent(sector.totalEffect)}
                                    </Badge>
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}