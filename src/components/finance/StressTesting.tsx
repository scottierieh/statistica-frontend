'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Zap, Info, TrendingDown, AlertTriangle, BarChart3, 
    History, FlaskConical, Loader2, RefreshCw, ArrowDown, ArrowUp
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Cell, ReferenceLine
} from 'recharts';
import type { FinanceConfig, FinanceResults } from './FinanceLayout';

interface StressTestingProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

interface StressTestResult {
    portfolio_impact: number;
    portfolio_impact_pct: number;
    current_value: number;
    stressed_value: number;
    sector_impacts: { sector: string; shock_pct: number; current_value: number; impact: number; stressed_value: number }[];
    holding_impacts: { ticker: string; name: string; sector: string; current_value: number; shock_pct: number; impact: number; stressed_value: number }[];
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatPercent = (value: number, showSign: boolean = true): string => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

// Historical Scenarios
const historicalScenarios = [
    { id: 'covid-2020', name: 'COVID-19 Crash', date: 'Feb-Mar 2020', description: 'Global pandemic market crash', shocks: { 'Technology': -30, 'Healthcare': -15, 'Financials': -40, 'Energy': -55, 'Consumer Discretionary': -35, 'Consumer Staples': -10, 'Industrials': -35, 'Materials': -25 } },
    { id: 'gfc-2008', name: '2008 Financial Crisis', date: 'Sep-Nov 2008', description: 'Global financial crisis', shocks: { 'Technology': -45, 'Healthcare': -25, 'Financials': -60, 'Energy': -50, 'Consumer Discretionary': -45, 'Consumer Staples': -20, 'Industrials': -45, 'Materials': -50 } },
    { id: 'dotcom-2000', name: 'Dot-com Bubble', date: '2000-2002', description: 'Tech bubble burst', shocks: { 'Technology': -78, 'Healthcare': -30, 'Financials': -25, 'Energy': -10, 'Consumer Discretionary': -40, 'Consumer Staples': -5, 'Industrials': -35, 'Materials': -20 } },
    { id: 'rate-hike-2022', name: '2022 Rate Hikes', date: 'Jan-Oct 2022', description: 'Fed aggressive rate increases', shocks: { 'Technology': -35, 'Healthcare': -10, 'Financials': -20, 'Energy': 25, 'Consumer Discretionary': -38, 'Consumer Staples': -5, 'Industrials': -15, 'Materials': -10 } },
];

// Hypothetical Scenarios
const hypotheticalScenarios = [
    { id: 'mild-recession', name: 'Mild Recession', description: 'Economic slowdown', shocks: { 'Technology': -15, 'Healthcare': -5, 'Financials': -20, 'Energy': -10, 'Consumer Discretionary': -25, 'Consumer Staples': 0, 'Industrials': -15, 'Materials': -12 } },
    { id: 'severe-recession', name: 'Severe Recession', description: 'Deep economic contraction', shocks: { 'Technology': -40, 'Healthcare': -20, 'Financials': -50, 'Energy': -35, 'Consumer Discretionary': -45, 'Consumer Staples': -10, 'Industrials': -40, 'Materials': -35 } },
    { id: 'inflation-spike', name: 'Inflation Spike', description: 'High inflation (>10%)', shocks: { 'Technology': -25, 'Healthcare': -5, 'Financials': -15, 'Energy': 20, 'Consumer Discretionary': -30, 'Consumer Staples': -5, 'Industrials': -10, 'Materials': 5 } },
    { id: 'geopolitical', name: 'Geopolitical Crisis', description: 'Major conflict', shocks: { 'Technology': -20, 'Healthcare': -5, 'Financials': -25, 'Energy': 30, 'Consumer Discretionary': -20, 'Consumer Staples': -5, 'Industrials': -15, 'Materials': 10 } },
];

// Sector Impact Chart
const SectorImpactChart = ({ data }: { data: StressTestResult['sector_impacts'] }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal vertical={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={10} />
                <YAxis type="category" dataKey="sector" fontSize={11} width={95} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Impact']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <ReferenceLine x={0} stroke="#9ca3af" />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.impact >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Scenario Card
const ScenarioCard = ({ scenario, isSelected, onClick, impact }: { scenario: any; isSelected: boolean; onClick: () => void; impact?: number }) => (
    <button onClick={onClick} className={`w-full p-4 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
        <div className="flex items-start justify-between mb-2">
            <div>
                <h4 className="font-semibold">{scenario.name}</h4>
                {scenario.date && <p className="text-xs text-gray-400">{scenario.date}</p>}
            </div>
            {impact !== undefined && (
                <Badge variant={impact >= 0 ? 'default' : 'destructive'}>{formatPercent(impact)}</Badge>
            )}
        </div>
        <p className="text-sm text-gray-500">{scenario.description}</p>
    </button>
);

// Custom Scenario Editor
const CustomScenarioEditor = ({ shocks, setShocks, sectors }: { shocks: Record<string, number>; setShocks: (s: Record<string, number>) => void; sectors: string[] }) => (
    <div className="space-y-4">
        <p className="text-sm text-gray-500">Set custom percentage shocks for each sector:</p>
        <div className="grid md:grid-cols-2 gap-4">
            {sectors.map(sector => (
                <div key={sector} className="flex items-center gap-3">
                    <span className="w-36 text-sm font-medium truncate">{sector}</span>
                    <Slider value={[shocks[sector] ?? 0]} onValueChange={(v) => setShocks({ ...shocks, [sector]: v[0] })} min={-80} max={50} step={1} className="flex-1" />
                    <Input type="number" value={shocks[sector] ?? 0} onChange={(e) => setShocks({ ...shocks, [sector]: parseFloat(e.target.value) || 0 })} className="w-20 text-right" />
                    <span className="text-sm text-gray-400">%</span>
                </div>
            ))}
        </div>
    </div>
);

export default function StressTesting({ config, analysisResult }: StressTestingProps) {
    const [activeTab, setActiveTab] = useState('historical');
    const [selectedScenario, setSelectedScenario] = useState(historicalScenarios[0]);
    const [customShocks, setCustomShocks] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stressResult, setStressResult] = useState<StressTestResult | null>(null);

    const runStressTest = useCallback(async (shocks: Record<string, number>) => {
        if (!analysisResult?.portfolio) return;

        setIsLoading(true);
        setError(null);

        try {
            const { holdings, summary } = analysisResult.portfolio;

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
                total_value: summary.totalValue,
                scenario_shocks: shocks
            };

            const response = await fetch('/api/finance/stress-test/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) throw new Error('API request failed');

            const result = await response.json();
            setStressResult(result);

        } catch (err: any) {
            console.error('Stress test error:', err);
            setError(err.message || 'Failed to run stress test');
        } finally {
            setIsLoading(false);
        }
    }, [analysisResult]);

    // Run stress test when scenario changes
    const handleScenarioSelect = (scenario: any) => {
        setSelectedScenario(scenario);
        runStressTest(scenario.shocks);
    };

    const handleCustomTest = () => {
        runStressTest(customShocks);
    };

    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Stress Testing</h2>
                    <p className="text-gray-500 mt-1">Historical and hypothetical scenario analysis</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Portfolio Data</AlertTitle>
                    <AlertDescription>Please load portfolio data and run analysis in the Data Settings page first.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const { summary, sectorAllocation } = analysisResult.portfolio;
    const sectors = sectorAllocation.map(s => s.sector);

    // Initialize custom shocks if empty
    if (Object.keys(customShocks).length === 0 && sectors.length > 0) {
        const initial: Record<string, number> = {};
        sectors.forEach(s => initial[s] = -20);
        setCustomShocks(initial);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Stress Testing</h2>
                    <p className="text-gray-500 mt-1">Analyze portfolio under various scenarios</p>
                </div>
                <Badge variant={stressResult && stressResult.portfolio_impact_pct >= 0 ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                    {stressResult ? formatPercent(stressResult.portfolio_impact_pct) : '...'} Impact
                </Badge>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Scenario Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="historical" className="gap-2"><History className="h-4 w-4" />Historical</TabsTrigger>
                    <TabsTrigger value="hypothetical" className="gap-2"><FlaskConical className="h-4 w-4" />Hypothetical</TabsTrigger>
                    <TabsTrigger value="custom" className="gap-2"><Zap className="h-4 w-4" />Custom</TabsTrigger>
                </TabsList>

                <TabsContent value="historical" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        {historicalScenarios.map(scenario => (
                            <ScenarioCard key={scenario.id} scenario={scenario} isSelected={selectedScenario.id === scenario.id} onClick={() => handleScenarioSelect(scenario)} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="hypothetical" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        {hypotheticalScenarios.map(scenario => (
                            <ScenarioCard key={scenario.id} scenario={scenario} isSelected={selectedScenario.id === scenario.id} onClick={() => handleScenarioSelect(scenario)} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Custom Scenario</CardTitle>
                            <CardDescription>Define your own stress scenario</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CustomScenarioEditor shocks={customShocks} setShocks={setCustomShocks} sectors={sectors} />
                            <Button className="mt-4" onClick={handleCustomTest} disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                Run Stress Test
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Results Summary */}
            {stressResult && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className={stressResult.portfolio_impact >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                            <CardContent className="pt-6">
                                <p className="text-sm text-gray-500">Portfolio Impact</p>
                                <p className={`text-2xl font-bold ${stressResult.portfolio_impact >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(stressResult.portfolio_impact)}</p>
                                <p className={stressResult.portfolio_impact >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPercent(stressResult.portfolio_impact_pct)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-gray-500">Current Value</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stressResult.current_value)}</p>
                            </CardContent>
                        </Card>
                        <Card className={stressResult.portfolio_impact >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                            <CardContent className="pt-6">
                                <p className="text-sm text-gray-500">Stressed Value</p>
                                <p className={`text-2xl font-bold ${stressResult.portfolio_impact >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(stressResult.stressed_value)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-gray-500">Worst Sector</p>
                                <p className="text-xl font-bold text-gray-900">{stressResult.sector_impacts[0]?.sector || 'N/A'}</p>
                                <p className="text-sm text-red-600">{formatPercent(stressResult.sector_impacts[0]?.shock_pct || 0)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sector Impact Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-gray-500" />Sector Impact</CardTitle>
                            <CardDescription>Impact by sector under selected scenario</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
                            ) : (
                                <SectorImpactChart data={stressResult.sector_impacts} />
                            )}
                        </CardContent>
                    </Card>

                    {/* Holdings Impact Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Holdings Impact Detail</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-2 font-semibold text-gray-600">Ticker</th>
                                            <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                                            <th className="text-left py-3 px-2 font-semibold text-gray-600">Sector</th>
                                            <th className="text-right py-3 px-2 font-semibold text-gray-600">Current</th>
                                            <th className="text-right py-3 px-2 font-semibold text-gray-600">Shock</th>
                                            <th className="text-right py-3 px-2 font-semibold text-gray-600">Impact</th>
                                            <th className="text-right py-3 px-2 font-semibold text-gray-600">Stressed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stressResult.holding_impacts.map((item, idx) => (
                                            <tr key={item.ticker} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                                <td className="py-3 px-2 font-medium">{item.ticker}</td>
                                                <td className="py-3 px-2 text-gray-600 truncate max-w-[120px]">{item.name}</td>
                                                <td className="py-3 px-2 text-gray-500">{item.sector}</td>
                                                <td className="py-3 px-2 text-right">{formatCurrency(item.current_value)}</td>
                                                <td className={`py-3 px-2 text-right font-medium ${item.shock_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(item.shock_pct)}</td>
                                                <td className={`py-3 px-2 text-right font-medium ${item.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.impact)}</td>
                                                <td className={`py-3 px-2 text-right font-bold ${item.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.stressed_value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}