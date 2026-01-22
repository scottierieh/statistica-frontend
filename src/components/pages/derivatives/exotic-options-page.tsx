'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, TrendingUp, DollarSign, Activity, Clock, Zap, Star, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXOTIC_TYPES = [
    { value: 'barrier', label: 'Barrier Option', description: 'Knock-in/Knock-out options with barriers' },
    { value: 'asian', label: 'Asian Option', description: 'Options based on average price' },
    { value: 'lookback', label: 'Lookback Option', description: 'Options on historical extremes' },
    { value: 'digital', label: 'Digital/Binary Option', description: 'Fixed payoff options' },
    { value: 'rainbow', label: 'Rainbow Option', description: 'Multi-asset correlations' },
    { value: 'basket', label: 'Basket Option', description: 'Portfolio of underlying assets' },
    { value: 'compound', label: 'Compound Option', description: 'Option on option' },
    { value: 'chooser', label: 'Chooser Option', description: 'Choose call/put later' },
    { value: 'shout', label: 'Shout Option', description: 'Lock in gains during life' },
];

const PRICING_METHODS = [
    { value: 'monte_carlo', label: 'Monte Carlo' },
    { value: 'finite_difference', label: 'Finite Difference' },
    { value: 'binomial', label: 'Binomial Tree' },
    { value: 'analytical', label: 'Analytical (if available)' },
];

const BARRIER_TYPES = [
    { value: 'up_and_out', label: 'Up-and-Out' },
    { value: 'up_and_in', label: 'Up-and-In' },
    { value: 'down_and_out', label: 'Down-and-Out' },
    { value: 'down_and_in', label: 'Down-and-In' },
];

const ASIAN_TYPES = [
    { value: 'arithmetic', label: 'Arithmetic Average' },
    { value: 'geometric', label: 'Geometric Average' },
];

const PRESET_EXOTICS = [
    { 
        name: 'Knock-Out Call', 
        type: 'barrier', 
        spot: 100, 
        strike: 100, 
        barrier: 120, 
        barrier_type: 'up_and_out',
        vol: 0.25,
        time: 1 
    },
    { 
        name: 'Asian Call', 
        type: 'asian', 
        spot: 100, 
        strike: 100, 
        asian_type: 'arithmetic',
        vol: 0.2,
        time: 1 
    },
    { 
        name: 'Digital Call', 
        type: 'digital', 
        spot: 100, 
        strike: 100, 
        digital_payout: 100,
        vol: 0.3,
        time: 0.5 
    },
    { 
        name: 'Lookback Put', 
        type: 'lookback', 
        spot: 100, 
        strike: 100,
        vol: 0.2,
        time: 1 
    },
];

interface ExoticResult {
    price: number;
    intrinsic_value: number;
    time_value: number;
    greeks?: {
        delta: number;
        gamma: number;
        theta: number;
        vega: number;
        rho: number;
    };
    exotic_greeks?: {
        barrier_delta?: number;
        probability_of_survival?: number;
        average_sensitivity?: number;
        path_dependency_factor?: number;
    };
    simulation_stats?: {
        paths_used: number;
        convergence_error: number;
        confidence_interval: [number, number];
        monte_carlo_se: number;
    };
    payoff_analysis: {
        expected_payoff: number;
        payoff_variance: number;
        probability_in_money: number;
        maximum_loss: number;
        maximum_gain: number;
    };
    plots: {
        payoff_distribution?: string;
        price_convergence?: string;
        barrier_analysis?: string;
        path_dependency?: string;
        sensitivity_surface?: string;
        monte_carlo_paths?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
        complexity_score: number;
        risk_assessment: string;
    };
    model_comparison?: Record<string, number>;
    parameters: Record<string, any>;
}

const formatCurrency = (value: number) => {
    return `$${value.toFixed(4)}`;
};

const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
};

export default function ExoticOptionsPage() {
    const { toast } = useToast();
    
    // Basic option parameters
    const [exoticType, setExoticType] = useState('barrier');
    const [optionType, setOptionType] = useState('call');
    const [spotPrice, setSpotPrice] = useState(100);
    const [strikePrice, setStrikePrice] = useState(100);
    const [timeToMaturity, setTimeToMaturity] = useState(1);
    const [riskFreeRate, setRiskFreeRate] = useState(0.05);
    const [volatility, setVolatility] = useState(0.2);
    const [dividendYield, setDividendYield] = useState(0);
    
    // Exotic-specific parameters
    const [barrierLevel, setBarrierLevel] = useState(120);
    const [barrierType, setBarrierType] = useState('up_and_out');
    const [rebate, setRebate] = useState(0);
    const [asianType, setAsianType] = useState('arithmetic');
    const [averagingPeriod, setAveragingPeriod] = useState(252);
    const [digitalPayout, setDigitalPayout] = useState(100);
    const [underlyingAssets, setUnderlyingAssets] = useState('100,105,95'); // For basket/rainbow
    const [correlationMatrix, setCorrelationMatrix] = useState('1,0.5,0.3;0.5,1,0.4;0.3,0.4,1'); // For multi-asset
    const [shoutTimes, setShoutTimes] = useState('0.25,0.5,0.75'); // For shout options
    
    // Pricing parameters
    const [pricingMethod, setPricingMethod] = useState('monte_carlo');
    const [numSimulations, setNumSimulations] = useState(100000);
    const [numTimeSteps, setNumTimeSteps] = useState(252);
    const [antitheticVariates, setAntitheticVariates] = useState(true);
    const [controlVariates, setControlVariates] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ExoticResult | null>(null);

    const handlePreset = (preset: typeof PRESET_EXOTICS[0]) => {
        setExoticType(preset.type);
        setSpotPrice(preset.spot);
        setStrikePrice(preset.strike);
        setVolatility(preset.vol);
        setTimeToMaturity(preset.time);
        
        if (preset.barrier) setBarrierLevel(preset.barrier);
        if (preset.barrier_type) setBarrierType(preset.barrier_type);
        if (preset.asian_type) setAsianType(preset.asian_type);
        if (preset.digital_payout) setDigitalPayout(preset.digital_payout);
    };

    const buildExoticParameters = () => {
        const baseParams = {
            exotic_type: exoticType,
            option_type: optionType,
            spot_price: spotPrice,
            strike_price: strikePrice,
            time_to_maturity: timeToMaturity,
            risk_free_rate: riskFreeRate,
            volatility: volatility,
            dividend_yield: dividendYield,
            pricing_method: pricingMethod,
            num_simulations: numSimulations,
            num_time_steps: numTimeSteps,
            antithetic_variates: antitheticVariates,
            control_variates: controlVariates,
        };

        // Add exotic-specific parameters
        const exoticParams: Record<string, any> = {};
        
        if (exoticType === 'barrier') {
            exoticParams.barrier_level = barrierLevel;
            exoticParams.barrier_type = barrierType;
            exoticParams.rebate = rebate;
        } else if (exoticType === 'asian') {
            exoticParams.asian_type = asianType;
            exoticParams.averaging_period = averagingPeriod;
        } else if (exoticType === 'digital') {
            exoticParams.digital_payout = digitalPayout;
        } else if (['basket', 'rainbow'].includes(exoticType)) {
            exoticParams.underlying_prices = underlyingAssets.split(',').map(x => parseFloat(x.trim()));
            exoticParams.correlation_matrix = correlationMatrix.split(';').map(row => 
                row.split(',').map(x => parseFloat(x.trim()))
            );
        } else if (exoticType === 'shout') {
            exoticParams.shout_times = shoutTimes.split(',').map(x => parseFloat(x.trim()));
        }

        return { ...baseParams, ...exoticParams };
    };

    const handleCalculate = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            const payload = buildExoticParameters();

            const response = await fetch(`${FASTAPI_URL}/api/analysis/exotic-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Calculation failed');
            }
            
            const res: ExoticResult = await response.json();
            setResult(res);
            toast({ 
                title: "Calculation Complete", 
                description: `Exotic Option Price: ${formatCurrency(res.price)}` 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const renderExoticParameters = () => {
        switch (exoticType) {
            case 'barrier':
                return (
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Barrier Level</Label>
                            <Input
                                type="number"
                                value={barrierLevel}
                                onChange={e => setBarrierLevel(parseFloat(e.target.value))}
                                step="1"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Barrier Type</Label>
                            <Select value={barrierType} onValueChange={setBarrierType}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BARRIER_TYPES.map(bt => (
                                        <SelectItem key={bt.value} value={bt.value}>
                                            {bt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Rebate</Label>
                            <Input
                                type="number"
                                value={rebate}
                                onChange={e => setRebate(parseFloat(e.target.value))}
                                step="1"
                                min="0"
                                className="h-9"
                            />
                        </div>
                    </div>
                );
                
            case 'asian':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Average Type</Label>
                            <Select value={asianType} onValueChange={setAsianType}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASIAN_TYPES.map(at => (
                                        <SelectItem key={at.value} value={at.value}>
                                            {at.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Averaging Period (days)</Label>
                            <Input
                                type="number"
                                value={averagingPeriod}
                                onChange={e => setAveragingPeriod(parseInt(e.target.value))}
                                min="1"
                                max="1000"
                                className="h-9"
                            />
                        </div>
                    </div>
                );
                
            case 'digital':
                return (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Digital Payout</Label>
                            <Input
                                type="number"
                                value={digitalPayout}
                                onChange={e => setDigitalPayout(parseFloat(e.target.value))}
                                step="1"
                                min="0"
                                className="h-9"
                            />
                        </div>
                    </div>
                );
                
            case 'basket':
            case 'rainbow':
                return (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Underlying Asset Prices (comma-separated)</Label>
                            <Input
                                value={underlyingAssets}
                                onChange={e => setUnderlyingAssets(e.target.value)}
                                placeholder="100,105,95"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Correlation Matrix (semicolon-separated rows)</Label>
                            <Textarea
                                value={correlationMatrix}
                                onChange={e => setCorrelationMatrix(e.target.value)}
                                placeholder="1,0.5,0.3;0.5,1,0.4;0.3,0.4,1"
                                className="h-20 text-xs font-mono"
                            />
                        </div>
                    </div>
                );
                
            case 'shout':
                return (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Shout Times (comma-separated fractions of T)</Label>
                            <Input
                                value={shoutTimes}
                                onChange={e => setShoutTimes(e.target.value)}
                                placeholder="0.25,0.5,0.75"
                                className="h-9"
                            />
                        </div>
                    </div>
                );
                
            default:
                return null;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Star className="w-6 h-6 text-amber-500" />
                    Exotic Options Pricing
                </h1>
                <p className="text-sm text-muted-foreground">
                    Advanced pricing for path-dependent and multi-asset derivatives
                </p>
            </div>

            {/* Configuration Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Exotic Type Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Exotic Option Type</Label>
                            <Select value={exoticType} onValueChange={setExoticType}>
                                <SelectTrigger className="w-64">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXOTIC_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div>
                                                <div className="font-medium">{type.label}</div>
                                                <div className="text-xs text-muted-foreground">{type.description}</div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Label className="text-sm font-medium">Call/Put:</Label>
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
                            {PRESET_EXOTICS.map(preset => (
                                <button
                                    key={preset.name}
                                    onClick={() => handlePreset(preset)}
                                    className="px-3 py-2 text-xs border rounded-lg hover:bg-muted transition-colors"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Standard Option Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Standard Parameters</Label>
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
                        
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                    </div>

                    <Separator />

                    {/* Exotic-Specific Parameters */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                            {EXOTIC_TYPES.find(t => t.value === exoticType)?.label} Parameters
                        </Label>
                        {renderExoticParameters()}
                    </div>

                    <Separator />

                    {/* Pricing Method & Settings */}
                    <div className="space-y-4">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Pricing Method</Label>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Method</Label>
                                    <Select value={pricingMethod} onValueChange={setPricingMethod}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRICING_METHODS.map(m => (
                                                <SelectItem key={m.value} value={m.value}>
                                                    {m.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {pricingMethod === 'monte_carlo' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Simulations</Label>
                                        <Input
                                            type="number"
                                            value={numSimulations}
                                            onChange={e => setNumSimulations(parseInt(e.target.value))}
                                            min="10000"
                                            max="1000000"
                                            step="10000"
                                            className="h-9"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Time Steps</Label>
                                    <Input
                                        type="number"
                                        value={numTimeSteps}
                                        onChange={e => setNumTimeSteps(parseInt(e.target.value))}
                                        min="50"
                                        max="1000"
                                        className="h-9"
                                    />
                                </div>
                                
                                {pricingMethod === 'monte_carlo' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Antithetic Variates</Label>
                                            <Switch checked={antitheticVariates} onCheckedChange={setAntitheticVariates} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Control Variates</Label>
                                            <Switch checked={controlVariates} onCheckedChange={setControlVariates} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleCalculate} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pricing Exotic Option...</>
                        ) : (
                            <><Zap className="mr-2 h-4 w-4" />Price Exotic Option</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-5 gap-3">
                        <Card className="border-amber-200 bg-amber-50/50">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Option Price</p>
                                        <p className="text-lg font-semibold font-mono text-amber-600">
                                            {formatCurrency(result.price)}
                                        </p>
                                    </div>
                                    <DollarSign className="w-4 h-4 text-amber-500" />
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

                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Prob ITM</p>
                                        <p className="text-lg font-semibold font-mono text-blue-600">
                                            {formatPercent(result.payoff_analysis.probability_in_money)}
                                        </p>
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Complexity</p>
                                        <p className="text-lg font-semibold">
                                            {result.interpretation.complexity_score}/10
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {result.interpretation.risk_assessment}
                                        </p>
                                    </div>
                                    <Star className="w-4 h-4 text-muted-foreground" />
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
                                <div className="grid grid-cols-5 gap-4 mb-4">
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

                                {/* Exotic Greeks */}
                                {result.exotic_greeks && (
                                    <>
                                        <Separator className="my-4" />
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-amber-600">Exotic Greeks</Label>
                                            <div className="grid grid-cols-4 gap-4">
                                                {result.exotic_greeks.barrier_delta && (
                                                    <div className="p-3 bg-amber-50/50 rounded-lg text-center">
                                                        <p className="text-xs text-muted-foreground mb-1">Barrier Δ</p>
                                                        <p className="font-mono text-sm font-semibold">
                                                            {result.exotic_greeks.barrier_delta.toFixed(4)}
                                                        </p>
                                                    </div>
                                                )}
                                                {result.exotic_greeks.probability_of_survival && (
                                                    <div className="p-3 bg-amber-50/50 rounded-lg text-center">
                                                        <p className="text-xs text-muted-foreground mb-1">Survival Prob</p>
                                                        <p className="font-mono text-sm font-semibold">
                                                            {formatPercent(result.exotic_greeks.probability_of_survival)}
                                                        </p>
                                                    </div>
                                                )}
                                                {result.exotic_greeks.average_sensitivity && (
                                                    <div className="p-3 bg-amber-50/50 rounded-lg text-center">
                                                        <p className="text-xs text-muted-foreground mb-1">Avg Sensitivity</p>
                                                        <p className="font-mono text-sm font-semibold">
                                                            {result.exotic_greeks.average_sensitivity.toFixed(4)}
                                                        </p>
                                                    </div>
                                                )}
                                                {result.exotic_greeks.path_dependency_factor && (
                                                    <div className="p-3 bg-amber-50/50 rounded-lg text-center">
                                                        <p className="text-xs text-muted-foreground mb-1">Path Dependency</p>
                                                        <p className="font-mono text-sm font-semibold">
                                                            {result.exotic_greeks.path_dependency_factor.toFixed(4)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Simulation Statistics */}
                    {result.simulation_stats && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Simulation Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Paths Used</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {result.simulation_stats.paths_used.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Standard Error</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {formatCurrency(result.simulation_stats.monte_carlo_se)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">95% CI Lower</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {formatCurrency(result.simulation_stats.confidence_interval[0])}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">95% CI Upper</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {formatCurrency(result.simulation_stats.confidence_interval[1])}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Payoff Analysis */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Payoff Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Expected Payoff</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatCurrency(result.payoff_analysis.expected_payoff)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Payoff Variance</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {result.payoff_analysis.payoff_variance.toFixed(2)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Max Loss</p>
                                    <p className="font-mono text-sm font-semibold text-red-600">
                                        {formatCurrency(result.payoff_analysis.maximum_loss)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Max Gain</p>
                                    <p className="font-mono text-sm font-semibold text-emerald-600">
                                        {result.payoff_analysis.maximum_gain > 1000000 ? 'Unlimited' : formatCurrency(result.payoff_analysis.maximum_gain)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Prob ITM</p>
                                    <p className="font-mono text-sm font-semibold">
                                        {formatPercent(result.payoff_analysis.probability_in_money)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Model Comparison */}
                    {result.model_comparison && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Model Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    {Object.entries(result.model_comparison).map(([model, price]) => (
                                        <div key={model} className="p-3 bg-muted/50 rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground mb-1 capitalize">
                                                {model.replace('_', ' ')}
                                            </p>
                                            <p className="font-mono text-sm font-semibold">
                                                {formatCurrency(price)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Analysis Insights */}
                    {result.interpretation && (
                        <Card className="border-amber-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
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
                                                        <span className="text-amber-500">•</span>
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
                                    <TabsTrigger value="payoff" className="text-xs">Payoff Distribution</TabsTrigger>
                                    <TabsTrigger value="convergence" className="text-xs">Convergence</TabsTrigger>
                                    <TabsTrigger value="barrier" className="text-xs">Barrier Analysis</TabsTrigger>
                                    <TabsTrigger value="path" className="text-xs">Path Dependency</TabsTrigger>
                                    <TabsTrigger value="surface" className="text-xs">Sensitivity Surface</TabsTrigger>
                                    <TabsTrigger value="paths" className="text-xs">Monte Carlo Paths</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="payoff" className="mt-4">
                                    {result.plots.payoff_distribution ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.payoff_distribution}`}
                                                alt="Payoff Distribution"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No payoff distribution plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="convergence" className="mt-4">
                                    {result.plots.price_convergence ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.price_convergence}`}
                                                alt="Price Convergence"
                                                width={800}
                                                height={400}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No convergence plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="barrier" className="mt-4">
                                    {result.plots.barrier_analysis ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.barrier_analysis}`}
                                                alt="Barrier Analysis"
                                                width={800}
                                                height={400}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No barrier analysis plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="path" className="mt-4">
                                    {result.plots.path_dependency ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.path_dependency}`}
                                                alt="Path Dependency"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No path dependency plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="surface" className="mt-4">
                                    {result.plots.sensitivity_surface ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.sensitivity_surface}`}
                                                alt="Sensitivity Surface"
                                                width={800}
                                                height={600}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No sensitivity surface plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="paths" className="mt-4">
                                    {result.plots.monte_carlo_paths ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.monte_carlo_paths}`}
                                                alt="Monte Carlo Paths"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No Monte Carlo paths plot available
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Methodology */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Methodology</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <p className="font-medium text-foreground">Exotic Option Features</p>
                                    <p>Path-dependent and multi-asset derivatives requiring advanced numerical methods for accurate pricing.</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Barrier options: knock-in/knock-out features</li>
                                        <li>• Asian options: path-dependent averaging</li>
                                        <li>• Lookback options: path-dependent extremes</li>
                                        <li>• Digital options: discontinuous payoffs</li>
                                    </ul>
                                </div>
                                <div className="space-y-3">
                                    <p className="font-medium text-foreground">Numerical Methods</p>
                                    <p>Monte Carlo simulation with variance reduction techniques for complex payoff structures.</p>
                                    <div className="font-mono text-xs bg-muted p-3 rounded">
                                        E[Payoff] = (1/N) × Σ f(S_T) × 1_event
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="text-xs">
                                <p className="font-medium text-foreground mb-2">Calculation Parameters</p>
                                <div className="grid grid-cols-4 gap-3">
                                    <span>Type: {result.parameters?.exotic_type || 'N/A'}</span>
                                    <span>Method: {result.parameters?.pricing_method || 'N/A'}</span>
                                    <span>Paths: {result.parameters?.num_simulations?.toLocaleString() || 'N/A'}</span>
                                    <span>Steps: {result.parameters?.num_time_steps || 'N/A'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}