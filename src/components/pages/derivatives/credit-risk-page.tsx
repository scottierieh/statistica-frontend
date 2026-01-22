'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, ShieldAlert, DollarSign, TrendingDown, Activity, Target, CheckCircle, AlertCircle, Info, Percent } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PRODUCT_TYPES = [
    { value: 'european_call', label: 'European Call Option' },
    { value: 'european_put', label: 'European Put Option' },
    { value: 'irs_payer', label: 'IRS (Payer)' },
    { value: 'irs_receiver', label: 'IRS (Receiver)' },
    { value: 'forward', label: 'Forward Contract' },
];

const EXAMPLE_SCENARIOS = [
    { 
        name: 'Low Risk', 
        hazardRateCp: 0.01, 
        recoveryRateCp: 0.4, 
        hazardRateOwn: 0.005,
        description: 'Investment grade counterparty'
    },
    { 
        name: 'Medium Risk', 
        hazardRateCp: 0.03, 
        recoveryRateCp: 0.35, 
        hazardRateOwn: 0.01,
        description: 'BBB-rated counterparty'
    },
    { 
        name: 'High Risk', 
        hazardRateCp: 0.08, 
        recoveryRateCp: 0.25, 
        hazardRateOwn: 0.02,
        description: 'Speculative grade counterparty'
    },
];

interface CvaResult {
    cva: number;
    dva: number;
    xva: number;
    base_npv: number;
    adjusted_npv: number;
    ee_profile: number[];
    ene_profile: number[];
    pfe_profile: number[];
    epe: number;
    max_ee: number;
    max_pfe: number;
    time_grid: number[];
    exposure_paths: number[][];
    surface_data: {
        time: number[];
        ee: number[];
        ene: number[];
        pfe: number[];
    };
    plots: {
        exposure_profile?: string;
        exposure_distribution?: string;
        survival_probability?: string;
        path_simulation?: string;
        cva_breakdown?: string;
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

const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
};

export default function CreditRiskPage() {
    const { toast } = useToast();
    
    // Product parameters
    const [productType, setProductType] = useState('european_call');
    const [notional, setNotional] = useState(1000000);
    const [spotPrice, setSpotPrice] = useState(100);
    const [strikePrice, setStrikePrice] = useState(100);
    const [fixedRate, setFixedRate] = useState(0.03);
    
    // Market parameters
    const [volatility, setVolatility] = useState(0.2);
    const [riskFreeRate, setRiskFreeRate] = useState(0.05);
    const [dividendYield, setDividendYield] = useState(0);
    const [maturityYears, setMaturityYears] = useState(1);
    
    // Credit parameters
    const [hazardRateCp, setHazardRateCp] = useState(0.02);
    const [recoveryRateCp, setRecoveryRateCp] = useState(0.4);
    const [hazardRateOwn, setHazardRateOwn] = useState(0.01);
    const [recoveryRateOwn, setRecoveryRateOwn] = useState(0.4);
    
    // Simulation parameters
    const [numPaths, setNumPaths] = useState(10000);
    const [timeSteps, setTimeSteps] = useState(52);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CvaResult | null>(null);

    const isEquityProduct = useMemo(() => 
        ['european_call', 'european_put', 'forward'].includes(productType),
    [productType]);

    const handleScenarioSelect = (scenario: typeof EXAMPLE_SCENARIOS[0]) => {
        setHazardRateCp(scenario.hazardRateCp);
        setRecoveryRateCp(scenario.recoveryRateCp);
        setHazardRateOwn(scenario.hazardRateOwn);
    };

    const handleCalculate = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                product_type: productType,
                notional,
                spot_price: spotPrice,
                strike_price: strikePrice,
                fixed_rate: fixedRate,
                volatility,
                risk_free_rate: riskFreeRate,
                dividend_yield: dividendYield,
                maturity_years: maturityYears,
                hazard_rate_cp: hazardRateCp,
                recovery_rate_cp: recoveryRateCp,
                hazard_rate_own: hazardRateOwn,
                recovery_rate_own: recoveryRateOwn,
                num_paths: numPaths,
                time_steps: timeSteps,
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/cva-dva`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Calculation failed');
            }
            
            const res: CvaResult = await response.json();
            setResult(res);
            toast({ 
                title: "Calculation Complete", 
                description: `CVA: ${formatCurrency(res.cva)} | DVA: ${formatCurrency(res.dva)}` 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-primary" />
                    CVA/DVA Analysis
                </h1>
                <p className="text-sm text-muted-foreground">
                    Credit & Debit Value Adjustment using QuantLib-style Monte Carlo simulation
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Product Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Product Type</Label>
                        </div>
                        
                        <Select value={productType} onValueChange={setProductType}>
                            <SelectTrigger className="h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRODUCT_TYPES.map(pt => (
                                    <SelectItem key={pt.value} value={pt.value}>
                                        {pt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_SCENARIOS.map(scenario => (
                                <button
                                    key={scenario.name}
                                    onClick={() => handleScenarioSelect(scenario)}
                                    className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors"
                                    title={scenario.description}
                                >
                                    {scenario.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Product Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Product Parameters</Label>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Notional</Label>
                                <Input
                                    type="number"
                                    value={notional}
                                    onChange={e => setNotional(parseFloat(e.target.value))}
                                    className="h-9"
                                />
                            </div>
                            {isEquityProduct && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Spot Price</Label>
                                        <Input
                                            type="number"
                                            value={spotPrice}
                                            onChange={e => setSpotPrice(parseFloat(e.target.value))}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Strike Price</Label>
                                        <Input
                                            type="number"
                                            value={strikePrice}
                                            onChange={e => setStrikePrice(parseFloat(e.target.value))}
                                            className="h-9"
                                        />
                                    </div>
                                </>
                            )}
                            {!isEquityProduct && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Fixed Rate</Label>
                                    <Input
                                        type="number"
                                        value={fixedRate}
                                        onChange={e => setFixedRate(parseFloat(e.target.value))}
                                        step="0.001"
                                        className="h-9"
                                    />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Maturity (Yrs)</Label>
                                <Input
                                    type="number"
                                    value={maturityYears}
                                    onChange={e => setMaturityYears(parseFloat(e.target.value))}
                                    min="0.1"
                                    max="30"
                                    step="0.5"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Market Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Market Parameters</Label>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Volatility (σ)</Label>
                                <Input
                                    type="number"
                                    value={volatility}
                                    onChange={e => setVolatility(parseFloat(e.target.value))}
                                    step="0.01"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Risk-Free Rate (r)</Label>
                                <Input
                                    type="number"
                                    value={riskFreeRate}
                                    onChange={e => setRiskFreeRate(parseFloat(e.target.value))}
                                    step="0.01"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Dividend Yield</Label>
                                <Input
                                    type="number"
                                    value={dividendYield}
                                    onChange={e => setDividendYield(parseFloat(e.target.value))}
                                    step="0.01"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Credit Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Credit Parameters</Label>
                        <div className="grid grid-cols-2 gap-6">
                            {/* Counterparty */}
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg space-y-3">
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">Counterparty Risk (CVA)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Hazard Rate (λ)</Label>
                                        <Input
                                            type="number"
                                            value={hazardRateCp}
                                            onChange={e => setHazardRateCp(parseFloat(e.target.value))}
                                            step="0.01"
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Recovery Rate</Label>
                                        <Input
                                            type="number"
                                            value={recoveryRateCp}
                                            onChange={e => setRecoveryRateCp(parseFloat(e.target.value))}
                                            step="0.05"
                                            min="0"
                                            max="1"
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Own */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-3">
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Own Credit Risk (DVA)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Hazard Rate (λ)</Label>
                                        <Input
                                            type="number"
                                            value={hazardRateOwn}
                                            onChange={e => setHazardRateOwn(parseFloat(e.target.value))}
                                            step="0.01"
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Recovery Rate</Label>
                                        <Input
                                            type="number"
                                            value={recoveryRateOwn}
                                            onChange={e => setRecoveryRateOwn(parseFloat(e.target.value))}
                                            step="0.05"
                                            min="0"
                                            max="1"
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Simulation Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Simulation Parameters</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Monte Carlo Paths</Label>
                                <Input
                                    type="number"
                                    value={numPaths}
                                    onChange={e => setNumPaths(parseInt(e.target.value))}
                                    min="1000"
                                    max="100000"
                                    step="1000"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Time Steps</Label>
                                <Input
                                    type="number"
                                    value={timeSteps}
                                    onChange={e => setTimeSteps(parseInt(e.target.value))}
                                    min="12"
                                    max="365"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleCalculate} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Calculate CVA/DVA</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Risk-Free NPV</p>
                                        <p className="text-lg font-semibold font-mono">{formatCurrency(result.base_npv)}</p>
                                    </div>
                                    <DollarSign className="w-4 h-4 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">CVA</p>
                                        <p className="text-lg font-semibold font-mono text-red-600">-{formatCurrency(result.cva)}</p>
                                    </div>
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">DVA</p>
                                        <p className="text-lg font-semibold font-mono text-green-600">+{formatCurrency(result.dva)}</p>
                                    </div>
                                    <Activity className="w-4 h-4 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Adjusted NPV</p>
                                        <p className="text-lg font-semibold font-mono">{formatCurrency(result.adjusted_npv)}</p>
                                    </div>
                                    <Target className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Exposure Metrics */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Exposure Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Max Expected Exposure</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatCurrency(result.max_ee)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Max PFE (97.5%)</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatCurrency(result.max_pfe)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Expected Positive Exposure</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatCurrency(result.epe)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Net XVA Impact</p>
                                    <p className={`font-mono text-sm font-semibold ${result.xva > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {result.xva > 0 ? '-' : '+'}{formatCurrency(Math.abs(result.xva))}
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
                                                <CheckCircle className="w-5 h-5 text-green-500" />
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
                            <Tabs defaultValue="interactive" className="w-full">
                                <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                    <TabsTrigger value="interactive" className="text-xs">Interactive Exposure</TabsTrigger>
                                    <TabsTrigger value="paths" className="text-xs">Simulation Paths</TabsTrigger>
                                    <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
                                    <TabsTrigger value="survival" className="text-xs">Default Curves</TabsTrigger>
                                    <TabsTrigger value="waterfall" className="text-xs">CVA Breakdown</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="interactive" className="mt-4">
                                    <div className="rounded-lg overflow-hidden border bg-white">
                                        <Plot
                                            data={[
                                                // EE Profile
                                                {
                                                    type: 'scatter' as const,
                                                    x: result.time_grid,
                                                    y: result.ee_profile,
                                                    mode: 'lines' as const,
                                                    name: 'Expected Exposure (EE)',
                                                    fill: 'tozeroy',
                                                    fillcolor: 'rgba(239, 68, 68, 0.2)',
                                                    line: { color: '#ef4444', width: 2 }
                                                },
                                                // ENE Profile (negative)
                                                {
                                                    type: 'scatter' as const,
                                                    x: result.time_grid,
                                                    y: result.ene_profile.map(v => -v),
                                                    mode: 'lines' as const,
                                                    name: 'Expected Negative Exposure (ENE)',
                                                    fill: 'tozeroy',
                                                    fillcolor: 'rgba(59, 130, 246, 0.2)',
                                                    line: { color: '#3b82f6', width: 2 }
                                                },
                                                // PFE Profile
                                                {
                                                    type: 'scatter' as const,
                                                    x: result.time_grid,
                                                    y: result.pfe_profile,
                                                    mode: 'lines' as const,
                                                    name: 'PFE (97.5%)',
                                                    line: { color: '#22c55e', width: 2, dash: 'dash' }
                                                }
                                            ]}
                                            layout={{
                                                title: 'Expected Exposure Profiles Over Time',
                                                autosize: true,
                                                height: 450,
                                                margin: { l: 60, r: 30, t: 50, b: 50 },
                                                xaxis: { 
                                                    title: 'Time (Years)',
                                                    showgrid: true,
                                                    gridcolor: 'rgba(0,0,0,0.1)'
                                                },
                                                yaxis: { 
                                                    title: 'Exposure ($)',
                                                    showgrid: true,
                                                    gridcolor: 'rgba(0,0,0,0.1)',
                                                    zeroline: true,
                                                    zerolinecolor: 'black',
                                                    zerolinewidth: 1
                                                },
                                                showlegend: true,
                                                legend: { x: 0, y: 1.15, orientation: 'h' as const },
                                                hovermode: 'x unified' as const
                                            }}
                                            config={{
                                                displayModeBar: true,
                                                scrollZoom: true
                                            }}
                                            useResizeHandler
                                            className="w-full"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 text-center">
                                        Hover for details • Scroll to zoom • Drag to pan
                                    </p>
                                </TabsContent>
                                
                                <TabsContent value="paths" className="mt-4">
                                    {result.plots.path_simulation ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.path_simulation}`}
                                                alt="Simulation Paths"
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
                                
                                <TabsContent value="distribution" className="mt-4">
                                    {result.plots.exposure_distribution ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.exposure_distribution}`}
                                                alt="Exposure Distribution"
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
                                
                                <TabsContent value="survival" className="mt-4">
                                    {result.plots.survival_probability ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.survival_probability}`}
                                                alt="Survival Probability"
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
                                
                                <TabsContent value="waterfall" className="mt-4">
                                    {result.plots.cva_breakdown ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.cva_breakdown}`}
                                                alt="CVA Breakdown"
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
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Methodology Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Methodology</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-muted-foreground">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="font-medium text-foreground">CVA Formula</p>
                                    <p className="font-mono text-xs bg-muted p-2 rounded">
                                        CVA = (1 - R) × Σ EE(tᵢ) × PD(tᵢ₋₁, tᵢ) × DF(tᵢ)
                                    </p>
                                    <p>Expected loss due to counterparty default, where EE is Expected Exposure and PD is default probability.</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-medium text-foreground">DVA Formula</p>
                                    <p className="font-mono text-xs bg-muted p-2 rounded">
                                        DVA = (1 - R) × Σ ENE(tᵢ) × PD(tᵢ₋₁, tᵢ) × DF(tᵢ)
                                    </p>
                                    <p>Expected gain from own default, where ENE is Expected Negative Exposure.</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="text-xs">
                                <p className="font-medium text-foreground mb-2">Simulation Parameters Used</p>
                                <div className="grid grid-cols-4 gap-2">
                                    <span>Paths: {result.parameters.num_paths.toLocaleString()}</span>
                                    <span>Steps: {result.parameters.time_steps}</span>
                                    <span>Maturity: {result.parameters.maturity_years}Y</span>
                                    <span>Product: {result.parameters.product_type}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}