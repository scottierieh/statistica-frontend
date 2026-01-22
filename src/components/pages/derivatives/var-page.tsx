'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, TrendingDown, AlertTriangle, BarChart3, Target, Shield, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const VAR_METHODS = [
    { value: 'historical', label: 'Historical Simulation' },
    { value: 'parametric', label: 'Parametric (Normal)' },
    { value: 'monte_carlo', label: 'Monte Carlo' },
    { value: 'cornish_fisher', label: 'Cornish-Fisher' },
];

const SAMPLE_RETURNS = [
    { name: 'Low Volatility', description: 'σ ≈ 1%', data: () => Array.from({length: 252}, () => (Math.random() - 0.5) * 0.02) },
    { name: 'Medium Volatility', description: 'σ ≈ 2%', data: () => Array.from({length: 252}, () => (Math.random() - 0.5) * 0.04) },
    { name: 'High Volatility', description: 'σ ≈ 4%', data: () => Array.from({length: 252}, () => (Math.random() - 0.5) * 0.08) },
    { name: 'Fat Tails', description: 'With outliers', data: () => Array.from({length: 252}, () => {
        const r = Math.random();
        if (r < 0.05) return (Math.random() - 0.5) * 0.15;
        return (Math.random() - 0.5) * 0.03;
    })},
];

interface VarResult {
    var_results: {
        confidence_levels: number[];
        var_values: number[];
        var_amounts: number[];
        var_percentages: number[];
        es_values: number[] | null;
        es_amounts: number[] | null;
        method: string;
        holding_period: number;
        method_comparison: Record<string, Record<string, number>>;
    };
    risk_metrics: {
        mean_return: number;
        volatility: number;
        annualized_volatility: number;
        skewness: number;
        kurtosis: number;
        max_drawdown: number;
        sharpe_ratio: number;
        sortino_ratio: number;
        calmar_ratio: number;
        best_day: number;
        worst_day: number;
        positive_days: number;
        negative_days: number;
        win_rate: number;
    };
    backtest: {
        total_observations: number;
        exceptions: number;
        expected_exceptions: number;
        exception_rate: number;
        kupiec_p_value: number;
        model_valid: boolean;
        basel_zone: string;
    };
    plots: {
        distribution?: string;
        time_series?: string;
        method_comparison?: string;
        monte_carlo?: string;
        drawdown?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
    parameters: Record<string, any>;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const formatPercent = (value: number, decimals: number = 2) => {
    return `${value.toFixed(decimals)}%`;
};

export default function VarAnalysisPage() {
    const { toast } = useToast();
    
    // Input state
    const [returnsInput, setReturnsInput] = useState('');
    const [portfolioValue, setPortfolioValue] = useState(1000000);
    const [method, setMethod] = useState('historical');
    const [confidenceLevel1, setConfidenceLevel1] = useState(0.95);
    const [confidenceLevel2, setConfidenceLevel2] = useState(0.99);
    const [holdingPeriod, setHoldingPeriod] = useState(1);
    const [numSimulations, setNumSimulations] = useState(10000);
    const [rollingWindow, setRollingWindow] = useState(252);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<VarResult | null>(null);

    const handleSampleData = (sample: typeof SAMPLE_RETURNS[0]) => {
        const data = sample.data();
        setReturnsInput(data.map(r => r.toFixed(6)).join('\n'));
    };

    const handleCalculate = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            // Parse returns
            const returns = returnsInput
                .split(/[\n,\s]+/)
                .map(s => parseFloat(s.trim()))
                .filter(n => !isNaN(n));
            
            if (returns.length < 30) {
                throw new Error('Need at least 30 return values');
            }

            const payload = {
                returns,
                portfolio_value: portfolioValue,
                confidence_levels: [confidenceLevel1, confidenceLevel2],
                holding_period: holdingPeriod,
                method,
                num_simulations: numSimulations,
                calculate_es: true,
                rolling_window: rollingWindow,
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/var-risk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Calculation failed');
            }
            
            const res: VarResult = await response.json();
            setResult(res);
            toast({ 
                title: "Calculation Complete", 
                description: `VaR (${confidenceLevel1*100}%): ${formatPercent(res.var_results.var_percentages[0])}` 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const getZoneColor = (zone: string) => {
        switch (zone) {
            case 'green': return 'text-emerald-500';
            case 'yellow': return 'text-amber-500';
            case 'red': return 'text-red-500';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <TrendingDown className="w-6 h-6 text-primary" />
                    Value at Risk (VaR)
                </h1>
                <p className="text-sm text-muted-foreground">
                    Comprehensive risk analysis with multiple VaR methodologies
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Returns Input */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Historical Returns</Label>
                            <span className="text-xs text-muted-foreground">
                                One value per line or comma-separated
                            </span>
                        </div>
                        
                        <Textarea
                            value={returnsInput}
                            onChange={e => setReturnsInput(e.target.value)}
                            placeholder="0.012&#10;-0.008&#10;0.005&#10;..."
                            className="font-mono text-sm h-32"
                        />
                        
                        <div className="flex flex-wrap gap-1.5">
                            {SAMPLE_RETURNS.map(sample => (
                                <button
                                    key={sample.name}
                                    onClick={() => handleSampleData(sample)}
                                    className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors"
                                    title={sample.description}
                                >
                                    {sample.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Portfolio & Method */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Portfolio</Label>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Portfolio Value ($)</Label>
                                <Input
                                    type="number"
                                    value={portfolioValue}
                                    onChange={e => setPortfolioValue(parseFloat(e.target.value))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Method</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {VAR_METHODS.map(m => (
                                        <SelectItem key={m.value} value={m.value}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    {/* VaR Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">VaR Parameters</Label>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Confidence 1</Label>
                                <Select value={confidenceLevel1.toString()} onValueChange={v => setConfidenceLevel1(parseFloat(v))}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0.90">90%</SelectItem>
                                        <SelectItem value="0.95">95%</SelectItem>
                                        <SelectItem value="0.99">99%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Confidence 2</Label>
                                <Select value={confidenceLevel2.toString()} onValueChange={v => setConfidenceLevel2(parseFloat(v))}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0.95">95%</SelectItem>
                                        <SelectItem value="0.99">99%</SelectItem>
                                        <SelectItem value="0.995">99.5%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Holding Period</Label>
                                <Input
                                    type="number"
                                    value={holdingPeriod}
                                    onChange={e => setHoldingPeriod(parseInt(e.target.value))}
                                    min="1"
                                    max="30"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Rolling Window</Label>
                                <Input
                                    type="number"
                                    value={rollingWindow}
                                    onChange={e => setRollingWindow(parseInt(e.target.value))}
                                    min="20"
                                    max="500"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>

                    {method === 'monte_carlo' && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Monte Carlo Settings</Label>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Number of Simulations</Label>
                                    <Input
                                        type="number"
                                        value={numSimulations}
                                        onChange={e => setNumSimulations(parseInt(e.target.value))}
                                        min="1000"
                                        max="100000"
                                        step="1000"
                                        className="h-9 w-48"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <Button onClick={handleCalculate} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Calculate VaR</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">VaR ({result.var_results.confidence_levels[0]*100}%)</p>
                                        <p className="text-lg font-semibold font-mono text-red-500">
                                            {formatPercent(result.var_results.var_percentages[0])}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatCurrency(result.var_results.var_amounts[0])}
                                        </p>
                                    </div>
                                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">VaR ({result.var_results.confidence_levels[1]*100}%)</p>
                                        <p className="text-lg font-semibold font-mono text-red-500">
                                            {formatPercent(result.var_results.var_percentages[1])}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatCurrency(result.var_results.var_amounts[1])}
                                        </p>
                                    </div>
                                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Expected Shortfall</p>
                                        <p className="text-lg font-semibold font-mono text-amber-500">
                                            {result.var_results.es_values ? formatPercent(result.var_results.es_values[0] * 100) : 'N/A'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {result.var_results.es_amounts ? formatCurrency(result.var_results.es_amounts[0]) : ''}
                                        </p>
                                    </div>
                                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Basel Zone</p>
                                        <p className={`text-lg font-semibold capitalize ${getZoneColor(result.backtest.basel_zone)}`}>
                                            {result.backtest.basel_zone}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {result.backtest.exceptions} exceptions
                                        </p>
                                    </div>
                                    <Shield className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Risk Metrics */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Risk Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Volatility (Ann.)</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatPercent(result.risk_metrics.annualized_volatility * 100)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
                                    <p className="font-mono text-sm font-semibold text-red-500">
                                        {formatPercent(result.risk_metrics.max_drawdown * 100)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {result.risk_metrics.sharpe_ratio.toFixed(2)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Sortino Ratio</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {result.risk_metrics.sortino_ratio.toFixed(2)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Skewness</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {result.risk_metrics.skewness.toFixed(3)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Kurtosis</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {result.risk_metrics.kurtosis.toFixed(3)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Best Day</p>
                                    <p className="font-mono text-sm font-semibold text-emerald-500">
                                        +{formatPercent(result.risk_metrics.best_day * 100)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Worst Day</p>
                                    <p className="font-mono text-sm font-semibold text-red-500">
                                        {formatPercent(result.risk_metrics.worst_day * 100)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analysis Insights */}
                    {result.interpretation && (
                        <Card className="border-primary/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Analysis Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {result.interpretation.key_insights.map((insight, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="mt-1">
                                            {insight.status === 'positive' ? (
                                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            ) : insight.status === 'warning' ? (
                                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                            ) : (
                                                <Info className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{insight.title}</p>
                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                                        </div>
                                    </div>
                                ))}
                                
                                {result.interpretation.recommendations.length > 0 && (
                                    <>
                                        <Separator className="my-4" />
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Recommendations</p>
                                            <ul className="space-y-1.5">
                                                {result.interpretation.recommendations.map((rec, idx) => (
                                                    <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                                                        <span className="text-primary">•</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Visualizations */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="distribution" className="w-full">
                                <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                    <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
                                    <TabsTrigger value="timeseries" className="text-xs">Time Series</TabsTrigger>
                                    <TabsTrigger value="comparison" className="text-xs">Method Comparison</TabsTrigger>
                                    <TabsTrigger value="drawdown" className="text-xs">Drawdown</TabsTrigger>
                                    {result.plots.monte_carlo && (
                                        <TabsTrigger value="montecarlo" className="text-xs">Monte Carlo</TabsTrigger>
                                    )}
                                </TabsList>
                                
                                <TabsContent value="distribution" className="mt-4">
                                    {result.plots.distribution ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.distribution}`}
                                                alt="Return Distribution"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                            No plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="timeseries" className="mt-4">
                                    {result.plots.time_series ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.time_series}`}
                                                alt="Time Series"
                                                width={800}
                                                height={400}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                            No plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="comparison" className="mt-4">
                                    {result.plots.method_comparison ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.method_comparison}`}
                                                alt="Method Comparison"
                                                width={800}
                                                height={400}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                            No plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="drawdown" className="mt-4">
                                    {result.plots.drawdown ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.drawdown}`}
                                                alt="Drawdown"
                                                width={800}
                                                height={600}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                            No plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                {result.plots.monte_carlo && (
                                    <TabsContent value="montecarlo" className="mt-4">
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.monte_carlo}`}
                                                alt="Monte Carlo Simulation"
                                                width={800}
                                                height={400}
                                                className="w-full"
                                            />
                                        </div>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Backtest Results */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Backtesting Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 gap-4 text-center">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Observations</p>
                                    <p className="font-mono text-sm font-semibold">{result.backtest.total_observations}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Exceptions</p>
                                    <p className="font-mono text-sm font-semibold">{result.backtest.exceptions}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Expected</p>
                                    <p className="font-mono text-sm font-semibold">{result.backtest.expected_exceptions}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Kupiec p-value</p>
                                    <p className="font-mono text-sm font-semibold">{result.backtest.kupiec_p_value?.toFixed(4) || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Model Valid</p>
                                    <p className={`font-mono text-sm font-semibold ${result.backtest.model_valid ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {result.backtest.model_valid ? 'Yes' : 'No'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Methodology */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Methodology</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="font-medium text-foreground">VaR Definition</p>
                                    <p>Maximum expected loss over a given time horizon at a specified confidence level.</p>
                                    <p className="font-mono text-xs bg-muted p-2 rounded">
                                        P(Loss &gt; VaR) = 1 - α
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-medium text-foreground">Expected Shortfall</p>
                                    <p>Average loss beyond VaR threshold. More conservative measure for tail risk.</p>
                                    <p className="font-mono text-xs bg-muted p-2 rounded">
                                        ES = E[Loss | Loss &gt; VaR]
                                    </p>
                                </div>
                            </div>
                            <Separator />
                            <div className="text-xs">
                                <p className="font-medium text-foreground mb-2">Parameters Used</p>
                                <div className="grid grid-cols-4 gap-2">
                                    <span>Method: {result.parameters.method}</span>
                                    <span>Holding: {result.parameters.holding_period} day(s)</span>
                                    <span>Window: {result.parameters.rolling_window}</span>
                                    <span>Observations: {result.parameters.num_observations}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}