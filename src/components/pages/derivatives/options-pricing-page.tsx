'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, TrendingUp, DollarSign, Activity, Clock, Percent, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PRICING_MODELS = [
    { value: 'black_scholes', label: 'Black-Scholes' },
    { value: 'binomial', label: 'Binomial Tree' },
    { value: 'monte_carlo', label: 'Monte Carlo' },
];

const PRESET_OPTIONS = [
    { name: 'ATM Call', type: 'call', spot: 100, strike: 100, vol: 0.2, time: 1 },
    { name: 'OTM Call', type: 'call', spot: 100, strike: 110, vol: 0.2, time: 1 },
    { name: 'ITM Put', type: 'put', spot: 100, strike: 110, vol: 0.2, time: 1 },
    { name: 'High Vol', type: 'call', spot: 100, strike: 100, vol: 0.5, time: 0.5 },
];

interface OptionResult {
    price: number;
    intrinsic_value: number;
    time_value: number;
    greeks: {
        delta: number;
        gamma: number;
        theta: number;
        vega: number;
        rho: number;
    } | null;
    model_details: Record<string, any>;
    model_comparison: {
        black_scholes: number;
        binomial_100: number;
        monte_carlo_10k: number;
    };
    plots: {
        payoff?: string;
        greeks?: string;
        volatility_surface?: string;
        time_decay?: string;
        monte_carlo?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
        moneyness_status: string;
    };
    parameters: Record<string, any>;
}

const formatCurrency = (value: number) => {
    return `$${value.toFixed(4)}`;
};

const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
};

export default function OptionsPricingPage() {
    const { toast } = useToast();
    
    // Input state
    const [optionType, setOptionType] = useState('call');
    const [spotPrice, setSpotPrice] = useState(100);
    const [strikePrice, setStrikePrice] = useState(100);
    const [timeToMaturity, setTimeToMaturity] = useState(1);
    const [riskFreeRate, setRiskFreeRate] = useState(0.05);
    const [volatility, setVolatility] = useState(0.2);
    const [dividendYield, setDividendYield] = useState(0);
    const [pricingModel, setPricingModel] = useState('black_scholes');
    const [binomialSteps, setBinomialSteps] = useState(100);
    const [monteCarloP, setMonteCarloPaths] = useState(10000);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<OptionResult | null>(null);

    const handlePreset = (preset: typeof PRESET_OPTIONS[0]) => {
        setOptionType(preset.type);
        setSpotPrice(preset.spot);
        setStrikePrice(preset.strike);
        setVolatility(preset.vol);
        setTimeToMaturity(preset.time);
    };

    const handleCalculate = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            const payload = {
                option_type: optionType,
                spot_price: spotPrice,
                strike_price: strikePrice,
                time_to_maturity: timeToMaturity,
                risk_free_rate: riskFreeRate,
                volatility: volatility,
                dividend_yield: dividendYield,
                pricing_model: pricingModel,
                binomial_steps: binomialSteps,
                monte_carlo_paths: monteCarloP,
                calculate_greeks: true,
                generate_surfaces: true,
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/options-pricing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Calculation failed');
            }
            
            const res: OptionResult = await response.json();
            setResult(res);
            toast({ 
                title: "Calculation Complete", 
                description: `Option Price: ${formatCurrency(res.price)}` 
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
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Options Pricing
                </h1>
                <p className="text-sm text-muted-foreground">
                    Price options with Black-Scholes, Binomial, and Monte Carlo models
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Option Type & Presets */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Option Type</Label>
                            <div className="inline-flex rounded-md border p-0.5">
                                <button
                                    onClick={() => setOptionType('call')}
                                    className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${
                                        optionType === 'call' 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Call
                                </button>
                                <button
                                    onClick={() => setOptionType('put')}
                                    className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${
                                        optionType === 'put' 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Put
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_OPTIONS.map(preset => (
                                <button
                                    key={preset.name}
                                    onClick={() => handlePreset(preset)}
                                    className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Option Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Option Parameters</Label>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Spot Price (S)</Label>
                                <Input
                                    type="number"
                                    value={spotPrice}
                                    onChange={e => setSpotPrice(parseFloat(e.target.value))}
                                    step="1"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Strike Price (K)</Label>
                                <Input
                                    type="number"
                                    value={strikePrice}
                                    onChange={e => setStrikePrice(parseFloat(e.target.value))}
                                    step="1"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Time to Maturity (T)</Label>
                                <Input
                                    type="number"
                                    value={timeToMaturity}
                                    onChange={e => setTimeToMaturity(parseFloat(e.target.value))}
                                    step="0.1"
                                    min="0.01"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Volatility (σ)</Label>
                                <Input
                                    type="number"
                                    value={volatility}
                                    onChange={e => setVolatility(parseFloat(e.target.value))}
                                    step="0.01"
                                    min="0.01"
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
                                <Label className="text-xs text-muted-foreground">Dividend Yield (q)</Label>
                                <Input
                                    type="number"
                                    value={dividendYield}
                                    onChange={e => setDividendYield(parseFloat(e.target.value))}
                                    step="0.01"
                                    min="0"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Pricing Model</Label>
                                <Select value={pricingModel} onValueChange={setPricingModel}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRICING_MODELS.map(m => (
                                            <SelectItem key={m.value} value={m.value}>
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {(pricingModel === 'binomial' || pricingModel === 'monte_carlo') && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Model Settings</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    {pricingModel === 'binomial' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Binomial Steps</Label>
                                            <Input
                                                type="number"
                                                value={binomialSteps}
                                                onChange={e => setBinomialSteps(parseInt(e.target.value))}
                                                min="10"
                                                max="1000"
                                                className="h-9"
                                            />
                                        </div>
                                    )}
                                    {pricingModel === 'monte_carlo' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Simulation Paths</Label>
                                            <Input
                                                type="number"
                                                value={monteCarloP}
                                                onChange={e => setMonteCarloPaths(parseInt(e.target.value))}
                                                min="1000"
                                                max="100000"
                                                step="1000"
                                                className="h-9"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <Button onClick={handleCalculate} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Price Option</>
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
                                        <p className="text-xs text-muted-foreground mb-1">Option Price</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {formatCurrency(result.price)}
                                        </p>
                                    </div>
                                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Intrinsic Value</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {formatCurrency(result.intrinsic_value)}
                                        </p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Time Value</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {formatCurrency(result.time_value)}
                                        </p>
                                    </div>
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Moneyness</p>
                                        <p className="text-lg font-semibold">
                                            {result.interpretation.moneyness_status}
                                        </p>
                                    </div>
                                    <Percent className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Greeks */}
                    {result.greeks && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Option Greeks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-5 gap-4">
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Delta (Δ)</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {result.greeks.delta.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Gamma (Γ)</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {result.greeks.gamma.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Theta (Θ)</p>
                                        <p className="font-mono text-sm font-semibold text-red-500">
                                            {result.greeks.theta.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Vega (ν)</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {result.greeks.vega.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Rho (ρ)</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {result.greeks.rho.toFixed(4)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Model Comparison */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Model Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Black-Scholes</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatCurrency(result.model_comparison.black_scholes)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Binomial (100 steps)</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatCurrency(result.model_comparison.binomial_100)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Monte Carlo (10k)</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatCurrency(result.model_comparison.monte_carlo_10k)}
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
                            <Tabs defaultValue="payoff" className="w-full">
                                <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                    <TabsTrigger value="payoff" className="text-xs">Payoff</TabsTrigger>
                                    <TabsTrigger value="greeks" className="text-xs">Greeks</TabsTrigger>
                                    <TabsTrigger value="surface" className="text-xs">Price Surface</TabsTrigger>
                                    <TabsTrigger value="decay" className="text-xs">Time Decay</TabsTrigger>
                                    {result.plots.monte_carlo && (
                                        <TabsTrigger value="montecarlo" className="text-xs">Monte Carlo</TabsTrigger>
                                    )}
                                </TabsList>
                                
                                <TabsContent value="payoff" className="mt-4">
                                    {result.plots.payoff ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.payoff}`}
                                                alt="Payoff Diagram"
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
                                
                                <TabsContent value="greeks" className="mt-4">
                                    {result.plots.greeks ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.greeks}`}
                                                alt="Greeks"
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
                                
                                <TabsContent value="surface" className="mt-4">
                                    {result.plots.volatility_surface ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.volatility_surface}`}
                                                alt="Price Surface"
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
                                
                                <TabsContent value="decay" className="mt-4">
                                    {result.plots.time_decay ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.time_decay}`}
                                                alt="Time Decay"
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
                                
                                {result.plots.monte_carlo && (
                                    <TabsContent value="montecarlo" className="mt-4">
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.monte_carlo}`}
                                                alt="Monte Carlo"
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

                    {/* Methodology */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Methodology</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="font-medium text-foreground">Black-Scholes Formula</p>
                                    <p className="font-mono text-xs bg-muted p-2 rounded">
                                        C = S·N(d₁) - K·e⁻ʳᵀ·N(d₂)
                                    </p>
                                    <p>Closed-form solution assuming log-normal returns and constant volatility.</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-medium text-foreground">Greeks Interpretation</p>
                                    <ul className="text-xs space-y-1">
                                        <li>• Delta: Shares to hedge per option</li>
                                        <li>• Gamma: Delta change per $1 move</li>
                                        <li>• Theta: Daily time decay</li>
                                        <li>• Vega: Price change per 1% vol</li>
                                    </ul>
                                </div>
                            </div>
                            <Separator />
                            <div className="text-xs">
                                <p className="font-medium text-foreground mb-2">Parameters Used</p>
                                <div className="grid grid-cols-4 gap-2">
                                    <span>S = ${result.parameters.spot_price}</span>
                                    <span>K = ${result.parameters.strike_price}</span>
                                    <span>T = {result.parameters.time_to_maturity}y</span>
                                    <span>σ = {(result.parameters.volatility * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}