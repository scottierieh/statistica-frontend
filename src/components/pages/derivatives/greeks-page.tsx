'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, BarChart3, CheckCircle, AlertCircle, AlertTriangle, Info, Eye, Zap } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GreeksResult {
    single_option?: {
        greeks: {
            delta: number;
            gamma: number;
            theta: number;
            vega: number;
            rho: number;
            lambda?: number;
        };
        option_price: number;
        intrinsic_value: number;
        time_value: number;
        moneyness: string;
        risk_metrics?: {
            delta_equivalent: number;
            gamma_risk: number;
            theta_decay_daily: number;
            vega_exposure: number;
            break_even_moves: number[];
        };
    };
    portfolio?: {
        portfolio_greeks: {
            total_delta: number;
            total_gamma: number;
            total_theta: number;
            total_vega: number;
            total_rho: number;
        };
        hedging_suggestions?: {
            delta_hedge: number;
            gamma_hedge: number;
            vega_hedge: number;
        };
    };
    risk_scenarios?: {
        scenarios: {
            name: string;
            spot_change: number;
            vol_change: number;
            time_decay: number;
            pnl_impact: number;
        }[];
        stress_metrics: {
            max_loss: number;
            max_gain: number;
            var_95: number;
            expected_pnl: number;
        };
    };
    plots?: {
        greeks_heatmap?: string;
        pnl_surface?: string;
        greek_evolution?: string;
        risk_scenarios?: string;
    };
    interpretation?: {
        key_insights: { title: string; description: string; severity: string }[];
        recommendations: string[];
        risk_warnings: string[];
        greek_summary: string;
    };
    parameters?: Record<string, any>;
}

const GREEK_TYPES = [
    { key: 'delta', label: 'Delta', symbol: 'Δ', color: 'text-blue-600', bg: 'bg-blue-50', description: 'Price sensitivity' },
    { key: 'gamma', label: 'Gamma', symbol: 'Γ', color: 'text-green-600', bg: 'bg-green-50', description: 'Delta change rate' },
    { key: 'theta', label: 'Theta', symbol: 'Θ', color: 'text-red-600', bg: 'bg-red-50', description: 'Time decay' },
    { key: 'vega', label: 'Vega', symbol: 'ν', color: 'text-purple-600', bg: 'bg-purple-50', description: 'Vol sensitivity' },
    { key: 'rho', label: 'Rho', symbol: 'ρ', color: 'text-orange-600', bg: 'bg-orange-50', description: 'Rate sensitivity' },
];

const ANALYSIS_PRESETS = [
    { name: 'ATM Call', spot: 100, strike: 100, vol: 0.20, time: 30, type: 'call', qty: 1 },
    { name: 'ITM Put', spot: 100, strike: 110, vol: 0.25, time: 45, type: 'put', qty: 1 },
    { name: 'OTM Call', spot: 100, strike: 110, vol: 0.18, time: 60, type: 'call', qty: 1 },
    { name: 'High Vol', spot: 100, strike: 100, vol: 0.40, time: 30, type: 'call', qty: 1 }
];

export default function GreeksAnalysisPage() {
    const { toast } = useToast();

    // Configuration
    const [analysisType, setAnalysisType] = useState('single_option');
    
    // Market Parameters  
    const [spotPrice, setSpotPrice] = useState(100);
    const [riskFreeRate, setRiskFreeRate] = useState(0.05);
    const [dividendYield, setDividendYield] = useState(0.0);
    
    // Option Parameters
    const [optionType, setOptionType] = useState('call');
    const [strikePrice, setStrikePrice] = useState(100);
    const [timeToExpiry, setTimeToExpiry] = useState(30);
    const [impliedVol, setImpliedVol] = useState(0.20);
    const [quantity, setQuantity] = useState(1);
    
    // Settings
    const [spotRange, setSpotRange] = useState([80, 120]);
    const [volRange, setVolRange] = useState([0.1, 0.4]);
    const [showRealTime, setShowRealTime] = useState(true);
    const [includeScenarios, setIncludeScenarios] = useState(true);
    
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GreeksResult | null>(null);

    // Real-time Greeks (simplified BS)
    const realTimeGreeks = useMemo(() => {
        if (!showRealTime || analysisType !== 'single_option') return null;
        
        try {
            const S = spotPrice;
            const K = strikePrice;
            const T = timeToExpiry / 365;
            const r = riskFreeRate;
            const sigma = impliedVol;
            
            if (T <= 0) return null;
            
            const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
            const d2 = d1 - sigma * Math.sqrt(T);
            
            const normCdf = (x: number) => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
            const normPdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
            
            let delta, theta, rho;
            
            if (optionType === 'call') {
                delta = normCdf(d1);
                theta = (-S * normPdf(d1) * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCdf(d2)) / 365;
                rho = K * T * Math.exp(-r * T) * normCdf(d2) / 100;
            } else {
                delta = -normCdf(-d1);
                theta = (-S * normPdf(d1) * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normCdf(-d2)) / 365;
                rho = -K * T * Math.exp(-r * T) * normCdf(-d2) / 100;
            }
            
            const gamma = normPdf(d1) / (S * sigma * Math.sqrt(T));
            const vega = S * normPdf(d1) * Math.sqrt(T) / 100;
            
            return {
                delta: delta * quantity,
                gamma: gamma * quantity,
                theta: theta * quantity,
                vega: vega * quantity,
                rho: rho * quantity
            };
        } catch (error) {
            return null;
        }
    }, [spotPrice, strikePrice, timeToExpiry, impliedVol, riskFreeRate, optionType, quantity, showRealTime, analysisType]);

    const handlePreset = (preset: typeof ANALYSIS_PRESETS[0]) => {
        setSpotPrice(preset.spot);
        setStrikePrice(preset.strike);
        setImpliedVol(preset.vol);
        setTimeToExpiry(preset.time);
        setOptionType(preset.type);
        setQuantity(preset.qty);
    };

    const handleAnalyze = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            const payload = {
                analysis_type: analysisType,
                market_params: {
                    spot_price: spotPrice,
                    risk_free_rate: riskFreeRate,
                    dividend_yield: dividendYield
                },
                single_option: analysisType === 'single_option' ? {
                    option_type: optionType,
                    strike_price: strikePrice,
                    time_to_expiry: timeToExpiry / 365,
                    implied_volatility: impliedVol,
                    quantity: quantity
                } : null,
                analysis_settings: {
                    spot_range: spotRange,
                    volatility_range: volRange,
                    include_scenarios: includeScenarios
                }
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/greeks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }
            
            const res: GreeksResult = await response.json();
            setResult(res);
            
            toast({ 
                title: "Greeks Analysis Complete", 
                description: "Risk sensitivity analysis completed successfully" 
            });
        } catch (e: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Analysis Error', 
                description: e.message 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatGreek = (value: number | undefined, type: string) => {
        if (value === undefined) return '0.0000';
        
        switch(type) {
            case 'delta': return value.toFixed(4);
            case 'gamma': return value.toFixed(4);
            case 'theta': return value.toFixed(2);
            case 'vega': return value.toFixed(3);
            case 'rho': return value.toFixed(4);
            default: return value.toFixed(4);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'low': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'medium': return <AlertCircle className="w-4 h-4 text-amber-500" />;
            case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'critical': return <Zap className="w-4 h-4 text-red-600" />;
            default: return <Info className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-7 h-7 text-blue-600" />
                    Greeks Analysis
                </h1>
                <p className="text-slate-600">
                    Comprehensive risk sensitivity analysis for options positions
                </p>
            </div>

            {/* Real-time Greeks */}
            {showRealTime && analysisType === 'single_option' && realTimeGreeks && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Eye className="w-5 h-5 text-blue-600" />
                            Real-time Greeks
                            <Badge variant="secondary" className="text-xs">Live</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 gap-3">
                            {GREEK_TYPES.map(greek => (
                                <div key={greek.key} className={`p-3 rounded-lg border ${greek.bg}`}>
                                    <div className="text-center">
                                        <div className={`text-lg font-bold ${greek.color} mb-1`}>
                                            {greek.symbol}
                                        </div>
                                        <div className={`text-xl font-mono font-bold ${greek.color}`}>
                                            {formatGreek(realTimeGreeks[greek.key as keyof typeof realTimeGreeks], greek.key)}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {greek.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Analysis Type */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Analysis Type</Label>
                        <Select value={analysisType} onValueChange={setAnalysisType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single_option">Single Option</SelectItem>
                                <SelectItem value="portfolio_greeks">Portfolio Greeks</SelectItem>
                                <SelectItem value="risk_scenarios">Risk Scenarios</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Market Parameters */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-slate-600">Market Parameters</Label>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Spot Price ($)</Label>
                                <Input
                                    type="number"
                                    value={spotPrice}
                                    onChange={e => setSpotPrice(parseFloat(e.target.value) || 0)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Risk-Free Rate</Label>
                                <Input
                                    type="number"
                                    value={riskFreeRate}
                                    onChange={e => setRiskFreeRate(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Dividend Yield</Label>
                                <Input
                                    type="number"
                                    value={dividendYield}
                                    onChange={e => setDividendYield(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Option Parameters */}
                    {analysisType === 'single_option' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-slate-600">Option Parameters</Label>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Real-time</Label>
                                    <Switch checked={showRealTime} onCheckedChange={setShowRealTime} />
                                </div>
                            </div>
                            
                            {/* Option Type Toggle */}
                            <div className="flex items-center gap-4">
                                <Label className="text-sm">Type:</Label>
                                <div className="inline-flex rounded-md border">
                                    <button
                                        onClick={() => setOptionType('call')}
                                        className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${
                                            optionType === 'call' 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        Call
                                    </button>
                                    <button
                                        onClick={() => setOptionType('put')}
                                        className={`px-4 py-2 text-sm font-medium rounded-r-md border-l transition-colors ${
                                            optionType === 'put' 
                                                ? 'bg-red-500 text-white' 
                                                : 'bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        Put
                                    </button>
                                </div>
                            </div>
                            
                            {/* Parameters Grid */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Strike ($)</Label>
                                    <Input
                                        type="number"
                                        value={strikePrice}
                                        onChange={e => setStrikePrice(parseFloat(e.target.value) || 0)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Days to Expiry</Label>
                                    <Input
                                        type="number"
                                        value={timeToExpiry}
                                        onChange={e => setTimeToExpiry(parseInt(e.target.value) || 1)}
                                        min="1"
                                        max="365"
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Implied Vol</Label>
                                    <Input
                                        type="number"
                                        value={impliedVol}
                                        onChange={e => setImpliedVol(parseFloat(e.target.value) || 0.01)}
                                        step="0.01"
                                        min="0.01"
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Quantity</Label>
                                    <Input
                                        type="number"
                                        value={quantity}
                                        onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            
                            {/* Presets */}
                            <div className="flex gap-2 flex-wrap">
                                {ANALYSIS_PRESETS.map(preset => (
                                    <Button
                                        key={preset.name}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreset(preset)}
                                        className="text-xs"
                                    >
                                        {preset.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Analysis Settings */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-slate-600">Analysis Settings</Label>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs text-slate-500">Spot Price Range</Label>
                                <Slider
                                    value={spotRange}
                                    onValueChange={setSpotRange}
                                    min={50}
                                    max={150}
                                    step={1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>${spotRange[0]}</span>
                                    <span>${spotRange[1]}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs text-slate-500">Volatility Range</Label>
                                <Slider
                                    value={volRange}
                                    onValueChange={setVolRange}
                                    min={0.05}
                                    max={0.8}
                                    step={0.01}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>{(volRange[0] * 100).toFixed(0)}%</span>
                                    <span>{(volRange[1] * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Include Risk Scenarios</Label>
                            <Switch checked={includeScenarios} onCheckedChange={setIncludeScenarios} />
                        </div>
                    </div>

                    <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
                        ) : (
                            <><Target className="mr-2 h-4 w-4" />Analyze Greeks</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Greeks Dashboard */}
                    {result.single_option && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    Option Greeks
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-5 gap-4 mb-6">
                                    {GREEK_TYPES.map(greek => (
                                        <div key={greek.key} className={`p-4 rounded-lg border ${greek.bg} text-center`}>
                                            <div className={`text-2xl font-bold ${greek.color} mb-1`}>
                                                {greek.symbol}
                                            </div>
                                            <div className={`text-xl font-mono font-bold ${greek.color}`}>
                                                {formatGreek(result.single_option?.greeks?.[greek.key as keyof typeof result.single_option.greeks], greek.key)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {greek.description}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Option Details */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Option Price</p>
                                        <p className="text-lg font-semibold">
                                            ${result.single_option?.option_price?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Intrinsic Value</p>
                                        <p className="text-lg font-semibold">
                                            ${result.single_option?.intrinsic_value?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Time Value</p>
                                        <p className="text-lg font-semibold">
                                            ${result.single_option?.time_value?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Moneyness</p>
                                        <p className="text-lg font-semibold">
                                            {result.single_option?.moneyness || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Portfolio Greeks */}
                    {result.portfolio && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Portfolio Greeks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-5 gap-4 mb-4">
                                    {GREEK_TYPES.map(greek => (
                                        <div key={greek.key} className={`p-4 rounded-lg border ${greek.bg} text-center`}>
                                            <p className="text-sm text-slate-600 mb-1">{greek.label}</p>
                                            <p className={`text-xl font-bold ${greek.color}`}>
                                                {result.portfolio?.portfolio_greeks?.[`total_${greek.key}` as keyof typeof result.portfolio.portfolio_greeks]?.toFixed(greek.key === 'theta' ? 2 : 4) || '0.0000'}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Hedging Suggestions */}
                                {result.portfolio?.hedging_suggestions && (
                                    <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                        <h4 className="font-semibold text-amber-800 mb-3">Hedging Suggestions</h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium">Delta:</span>
                                                <span className="ml-2">{result.portfolio.hedging_suggestions.delta_hedge?.toFixed(0) || '0'} shares</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Gamma:</span>
                                                <span className="ml-2">{result.portfolio.hedging_suggestions.gamma_hedge?.toFixed(2) || '0.00'} contracts</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Vega:</span>
                                                <span className="ml-2">{result.portfolio.hedging_suggestions.vega_hedge?.toFixed(2) || '0.00'} contracts</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Risk Scenarios */}
                    {result.risk_scenarios && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Scenarios</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 mb-6">
                                    {result.risk_scenarios.scenarios?.map((scenario, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium">{scenario.name}</h4>
                                                <Badge variant={scenario.pnl_impact >= 0 ? "default" : "destructive"}>
                                                    {scenario.pnl_impact >= 0 ? '+' : ''}${scenario.pnl_impact.toFixed(2)}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
                                                <span>Spot: {(scenario.spot_change * 100).toFixed(1)}%</span>
                                                <span>Vol: {(scenario.vol_change * 100).toFixed(1)}%</span>
                                                <span>Time: {scenario.time_decay} days</span>
                                            </div>
                                        </div>
                                    )) || []}
                                </div>

                                {/* Stress Metrics */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-xs text-red-600 mb-1">Max Loss</p>
                                        <p className="text-lg font-bold text-red-600">
                                            ${result.risk_scenarios.stress_metrics.max_loss?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-xs text-green-600 mb-1">Max Gain</p>
                                        <p className="text-lg font-bold text-green-600">
                                            ${result.risk_scenarios.stress_metrics.max_gain?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                        <p className="text-xs text-orange-600 mb-1">VaR 95%</p>
                                        <p className="text-lg font-bold text-orange-600">
                                            ${result.risk_scenarios.stress_metrics.var_95?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-xs text-blue-600 mb-1">Expected P&L</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            ${result.risk_scenarios.stress_metrics.expected_pnl?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Insights */}
                    {result.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="w-5 h-5 text-purple-600" />
                                    Analysis Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Summary */}
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <h4 className="font-semibold text-purple-800 mb-2">Summary</h4>
                                    <p className="text-sm text-purple-700">{result.interpretation.greek_summary}</p>
                                </div>

                                {/* Key Insights */}
                                <div className="space-y-3">
                                    {result.interpretation.key_insights?.map((insight, idx) => (
                                        <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                                            {getSeverityIcon(insight.severity)}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{insight.title}</p>
                                                <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                                            </div>
                                        </div>
                                    )) || []}
                                </div>
                                
                                {/* Recommendations */}
                                {result.interpretation.recommendations && result.interpretation.recommendations.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-slate-700 mb-2">Recommendations</h4>
                                        <ul className="space-y-1">
                                            {result.interpretation.recommendations.map((rec, idx) => (
                                                <li key={idx} className="text-sm text-slate-600 flex gap-2">
                                                    <span className="text-blue-500">•</span>
                                                    <span>{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Visualizations */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visualizations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="heatmap" className="w-full">
                                <TabsList className="grid grid-cols-4 w-full">
                                    <TabsTrigger value="heatmap" className="text-sm">Heatmap</TabsTrigger>
                                    <TabsTrigger value="surface" className="text-sm">P&L Surface</TabsTrigger>
                                    <TabsTrigger value="evolution" className="text-sm">Evolution</TabsTrigger>
                                    <TabsTrigger value="scenarios" className="text-sm">Scenarios</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="heatmap" className="mt-4">
                                    {result.plots?.greeks_heatmap ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.greeks_heatmap}`}
                                                alt="Greeks Heatmap"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-slate-500 border rounded-lg">
                                            Greeks heatmap visualization will appear here
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="surface" className="mt-4">
                                    {result.plots?.pnl_surface ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.pnl_surface}`}
                                                alt="P&L Surface"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-slate-500 border rounded-lg">
                                            P&L surface visualization will appear here
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="evolution" className="mt-4">
                                    {result.plots?.greek_evolution ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.greek_evolution}`}
                                                alt="Greek Evolution"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-slate-500 border rounded-lg">
                                            Time evolution visualization will appear here
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="scenarios" className="mt-4">
                                    {result.plots?.risk_scenarios ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.risk_scenarios}`}
                                                alt="Risk Scenarios"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-slate-500 border rounded-lg">
                                            Risk scenarios visualization will appear here
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Methodology */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Methodology</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600 space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <p className="font-medium text-slate-800 mb-2">Greeks Calculation</p>
                                    <p className="mb-3">Black-Scholes analytical formulas with finite difference for numerical Greeks.</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• <strong>Delta (Δ):</strong> ∂V/∂S - price sensitivity</li>
                                        <li>• <strong>Gamma (Γ):</strong> ∂²V/∂S² - delta rate of change</li>
                                        <li>• <strong>Theta (Θ):</strong> ∂V/∂t - time decay per day</li>
                                        <li>• <strong>Vega (ν):</strong> ∂V/∂σ - volatility sensitivity</li>
                                        <li>• <strong>Rho (ρ):</strong> ∂V/∂r - rate sensitivity</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800 mb-2">Risk Analysis</p>
                                    <p className="mb-3">Comprehensive scenario testing with multiple market stress conditions.</p>
                                    <div className="text-xs bg-slate-50 p-3 rounded font-mono">
                                        Greeks = f(S, K, T, σ, r, q)<br/>
                                        Scenarios: Market ±20%, Vol ±50%<br/>
                                        Time decay: 1D to 30D horizon
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="text-xs">
                                <p className="font-medium text-slate-800 mb-2">Analysis Parameters</p>
                                <div className="grid grid-cols-4 gap-3">
                                    <span>Spot: ${result.parameters?.spot_price || 'N/A'}</span>
                                    <span>Strike: ${result.parameters?.strike_price || 'N/A'}</span>
                                    <span>Time: {result.parameters?.time_to_expiry ? `${(result.parameters.time_to_expiry * 365).toFixed(0)}D` : 'N/A'}</span>
                                    <span>Vol: {result.parameters?.volatility ? `${(result.parameters.volatility * 100).toFixed(0)}%` : 'N/A'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
