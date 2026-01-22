'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, AlertTriangle, BarChart3, Target, Shield, CheckCircle, AlertCircle, Info, Zap, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STRESS_SCENARIOS = [
    { 
        value: 'financial_crisis', 
        label: 'Financial Crisis (2008)', 
        description: 'Stock -40%, Bond +20%, VIX +300%' 
    },
    { 
        value: 'covid_shock', 
        label: 'COVID-19 Shock (2020)', 
        description: 'Stock -35%, Credit +500bp, USD +15%' 
    },
    { 
        value: 'inflation_spike', 
        label: 'Inflation Spike', 
        description: 'Rates +400bp, Stock -25%, Real Assets +30%' 
    },
    { 
        value: 'geopolitical_crisis', 
        label: 'Geopolitical Crisis', 
        description: 'Oil +50%, Safe Haven +10%, EM -30%' 
    },
    { 
        value: 'currency_crisis', 
        label: 'Currency Crisis', 
        description: 'FX -50%, Local Bonds -30%, Flight to Quality' 
    },
    { 
        value: 'tech_bubble_burst', 
        label: 'Tech Bubble Burst', 
        description: 'Growth -60%, Value -20%, Rates -200bp' 
    },
    { 
        value: 'custom', 
        label: 'Custom Scenario', 
        description: 'Define your own stress parameters' 
    },
];

const RISK_FACTORS = [
    { id: 'equity', name: 'Equity Index', category: 'market' },
    { id: 'interest_rate', name: 'Interest Rates', category: 'rates' },
    { id: 'credit_spread', name: 'Credit Spreads', category: 'credit' },
    { id: 'fx_usd', name: 'USD Exchange Rate', category: 'fx' },
    { id: 'commodity', name: 'Commodities', category: 'commodity' },
    { id: 'volatility', name: 'Volatility Index', category: 'volatility' },
    { id: 'real_estate', name: 'Real Estate', category: 'alternative' },
    { id: 'emerging_markets', name: 'Emerging Markets', category: 'market' },
];

const SAMPLE_PORTFOLIOS = [
    { 
        name: 'Balanced Fund', 
        description: '60% Equity, 40% Bonds',
        exposures: {
            equity: 0.6, interest_rate: 0.4, credit_spread: 0.3, fx_usd: 0.1,
            commodity: 0.05, volatility: -0.2, real_estate: 0.1, emerging_markets: 0.15
        }
    },
    { 
        name: 'Growth Portfolio', 
        description: '85% Equity, 15% Alternatives',
        exposures: {
            equity: 0.85, interest_rate: 0.05, credit_spread: 0.1, fx_usd: 0.2,
            commodity: 0.1, volatility: -0.3, real_estate: 0.15, emerging_markets: 0.25
        }
    },
    { 
        name: 'Hedge Fund', 
        description: 'Multi-strategy with leverage',
        exposures: {
            equity: 1.2, interest_rate: -0.5, credit_spread: 0.8, fx_usd: 0.3,
            commodity: 0.4, volatility: 0.5, real_estate: 0.2, emerging_markets: 0.6
        }
    },
    { 
        name: 'Conservative', 
        description: 'Bonds and defensive assets',
        exposures: {
            equity: 0.2, interest_rate: 0.7, credit_spread: 0.5, fx_usd: 0.05,
            commodity: 0.1, volatility: -0.1, real_estate: 0.2, emerging_markets: 0.05
        }
    },
];

interface StressResult {
    scenario_analysis: {
        scenario_name: string;
        base_portfolio_value: number;
        stressed_portfolio_value: number;
        total_loss: number;
        loss_percentage: number;
        risk_factor_contributions: Record<string, {
            shock: number;
            exposure: number;
            contribution: number;
            percentage_contribution: number;
        }>;
        stress_parameters: Record<string, number>;
    };
    sensitivity_analysis: {
        risk_factor_sensitivities: Record<string, {
            delta: number;
            gamma: number;
            theta: number;
        }>;
        correlation_impact: Record<string, number>;
        portfolio_greeks: {
            total_delta: number;
            total_gamma: number;
            total_vega: number;
        };
    };
    reverse_stress: {
        loss_targets: number[];
        required_shocks: Record<string, Record<string, number>>;
        probability_estimates: Record<string, number>;
        historical_precedents: Record<string, {
            date: string;
            magnitude: number;
            description: string;
        }[]>;
    };
    concentration_risk: {
        sector_concentrations: Record<string, number>;
        geographic_concentrations: Record<string, number>;
        single_name_exposures: Record<string, number>;
        concentration_metrics: {
            herfindahl_index: number;
            concentration_ratio: number;
            effective_diversification: number;
        };
    };
    tail_scenarios: {
        percentile_losses: Record<string, number>;
        extreme_scenarios: {
            name: string;
            probability: number;
            loss_amount: number;
            loss_percentage: number;
            description: string;
        }[];
        black_swan_indicators: {
            tail_dependency: number;
            extreme_correlation: number;
            liquidity_risk_score: number;
        };
    };
    risk_attribution: {
        factor_contributions: Record<string, {
            stand_alone_risk: number;
            marginal_risk: number;
            component_risk: number;
            diversification_benefit: number;
        }>;
        portfolio_decomposition: {
            systematic_risk: number;
            idiosyncratic_risk: number;
            correlation_benefit: number;
            total_portfolio_risk: number;
        };
    };
    plots: {
        scenario_waterfall?: string;
        sensitivity_heatmap?: string;
        tail_distribution?: string;
        factor_attribution?: string;
        correlation_matrix?: string;
        stress_surface?: string;
    };
    interpretation: {
        key_findings: { title: string; description: string; severity: string }[];
        recommendations: string[];
        risk_warnings: string[];
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

const formatBasisPoints = (value: number) => {
    return `${(value * 10000).toFixed(0)}bp`;
};

export default function StressTestingPage() {
    const { toast } = useToast();
    
    // Input state
    const [portfolioValue, setPortfolioValue] = useState(1000000);
    const [selectedScenario, setSelectedScenario] = useState('financial_crisis');
    const [customShocks, setCustomShocks] = useState<Record<string, number>>({});
    const [portfolioExposures, setPortfolioExposures] = useState<Record<string, number>>({
        equity: 0.6, interest_rate: 0.4, credit_spread: 0.3, fx_usd: 0.1,
        commodity: 0.05, volatility: -0.2, real_estate: 0.1, emerging_markets: 0.15
    });
    
    // Advanced options
    const [includeCorrelations, setIncludeCorrelations] = useState(true);
    const [includeLiquidity, setIncludeLiquidity] = useState(true);
    const [includeConcentration, setIncludeConcentration] = useState(true);
    const [timeHorizon, setTimeHorizon] = useState(1); // days
    const [confidenceLevel, setConfidenceLevel] = useState(0.99);
    const [numSimulations, setNumSimulations] = useState(10000);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<StressResult | null>(null);

    const handleSamplePortfolio = (portfolio: typeof SAMPLE_PORTFOLIOS[0]) => {
        setPortfolioExposures(portfolio.exposures);
        toast({ 
            title: "Portfolio Loaded", 
            description: `Applied ${portfolio.name} exposures` 
        });
    };

    const handleExposureChange = (factorId: string, value: number) => {
        setPortfolioExposures(prev => ({
            ...prev,
            [factorId]: value
        }));
    };

    const handleCustomShockChange = (factorId: string, value: number) => {
        setCustomShocks(prev => ({
            ...prev,
            [factorId]: value / 100 // Convert percentage to decimal
        }));
    };

    const handleStressTest = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            const payload = {
                portfolio_value: portfolioValue,
                portfolio_exposures: portfolioExposures,
                scenario: selectedScenario,
                custom_shocks: selectedScenario === 'custom' ? customShocks : undefined,
                time_horizon: timeHorizon,
                confidence_level: confidenceLevel,
                include_correlations: includeCorrelations,
                include_liquidity: includeLiquidity,
                include_concentration: includeConcentration,
                num_simulations: numSimulations,
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/stress-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Stress test failed');
            }
            
            const res: StressResult = await response.json();
            setResult(res);
            toast({ 
                title: "Stress Test Complete", 
                description: `Potential loss: ${formatPercent(res.scenario_analysis.loss_percentage)}` 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'low': return 'text-emerald-500';
            case 'medium': return 'text-amber-500';
            case 'high': return 'text-red-500';
            case 'critical': return 'text-red-600';
            default: return 'text-muted-foreground';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'low': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'medium': return <AlertCircle className="w-5 h-5 text-amber-500" />;
            case 'high': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'critical': return <Zap className="w-5 h-5 text-red-600" />;
            default: return <Info className="w-5 h-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Zap className="w-6 h-6 text-amber-500" />
                    Stress Testing
                </h1>
                <p className="text-sm text-muted-foreground">
                    Evaluate portfolio resilience under extreme market scenarios
                </p>
            </div>

            {/* Configuration Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Portfolio Setup */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Portfolio Setup</Label>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">Portfolio Value ($)</Label>
                                <Input
                                    type="number"
                                    value={portfolioValue}
                                    onChange={e => setPortfolioValue(parseFloat(e.target.value))}
                                    className="w-32 h-8"
                                />
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {SAMPLE_PORTFOLIOS.map(portfolio => (
                                <button
                                    key={portfolio.name}
                                    onClick={() => handleSamplePortfolio(portfolio)}
                                    className="px-3 py-2 text-xs border rounded-lg hover:bg-muted transition-colors"
                                    title={portfolio.description}
                                >
                                    {portfolio.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Risk Factor Exposures */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Risk Factor Exposures</Label>
                        <div className="grid grid-cols-4 gap-4">
                            {RISK_FACTORS.map(factor => (
                                <div key={factor.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">{factor.name}</Label>
                                        <span className="text-xs font-mono">
                                            {formatPercent((portfolioExposures[factor.id] || 0) * 100, 0)}
                                        </span>
                                    </div>
                                    <Input
                                        type="number"
                                        value={(portfolioExposures[factor.id] || 0) * 100}
                                        onChange={e => handleExposureChange(factor.id, parseFloat(e.target.value) / 100)}
                                        step="5"
                                        min="-200"
                                        max="200"
                                        className="h-8"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Stress Scenario */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Stress Scenario</Label>
                        <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STRESS_SCENARIOS.map(scenario => (
                                    <SelectItem key={scenario.value} value={scenario.value}>
                                        <div>
                                            <div className="font-medium">{scenario.label}</div>
                                            <div className="text-xs text-muted-foreground">{scenario.description}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedScenario === 'custom' && (
                            <div className="mt-4 p-4 border rounded-lg space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground">Custom Shock Parameters (%)</Label>
                                <div className="grid grid-cols-4 gap-3">
                                    {RISK_FACTORS.map(factor => (
                                        <div key={factor.id} className="space-y-1">
                                            <Label className="text-xs">{factor.name}</Label>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={(customShocks[factor.id] || 0) * 100}
                                                onChange={e => handleCustomShockChange(factor.id, parseFloat(e.target.value) || 0)}
                                                step="1"
                                                min="-100"
                                                max="500"
                                                className="h-8"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Advanced Options */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Advanced Options</Label>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Include Correlations</Label>
                                    <Switch checked={includeCorrelations} onCheckedChange={setIncludeCorrelations} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Include Liquidity Risk</Label>
                                    <Switch checked={includeLiquidity} onCheckedChange={setIncludeLiquidity} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Include Concentration Risk</Label>
                                    <Switch checked={includeConcentration} onCheckedChange={setIncludeConcentration} />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Label className="text-xs min-w-0">Time Horizon (days)</Label>
                                    <Input
                                        type="number"
                                        value={timeHorizon}
                                        onChange={e => setTimeHorizon(parseInt(e.target.value))}
                                        min="1"
                                        max="252"
                                        className="h-8 w-20"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Label className="text-xs min-w-0">Confidence Level</Label>
                                    <Select value={confidenceLevel.toString()} onValueChange={v => setConfidenceLevel(parseFloat(v))}>
                                        <SelectTrigger className="w-20 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.95">95%</SelectItem>
                                            <SelectItem value="0.99">99%</SelectItem>
                                            <SelectItem value="0.995">99.5%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Label className="text-xs min-w-0">Simulations</Label>
                                    <Input
                                        type="number"
                                        value={numSimulations}
                                        onChange={e => setNumSimulations(parseInt(e.target.value))}
                                        min="1000"
                                        max="100000"
                                        step="1000"
                                        className="h-8 w-20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleStressTest} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running Stress Test...</>
                        ) : (
                            <><Zap className="mr-2 h-4 w-4" />Run Stress Test</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-5 gap-3">
                        <Card className="border-red-200 bg-red-50/50">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Loss</p>
                                        <p className="text-lg font-semibold font-mono text-red-600">
                                            {formatPercent(result.scenario_analysis.loss_percentage)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatCurrency(result.scenario_analysis.total_loss)}
                                        </p>
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Portfolio Value</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {formatCurrency(result.scenario_analysis.stressed_portfolio_value)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            After stress
                                        </p>
                                    </div>
                                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Systematic Risk</p>
                                        <p className="text-lg font-semibold font-mono text-amber-600">
                                            {result.risk_attribution?.portfolio_decomposition ? 
                                                formatPercent(result.risk_attribution.portfolio_decomposition.systematic_risk * 100) : 'N/A'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Of total risk
                                        </p>
                                    </div>
                                    <Target className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Concentration</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.concentration_risk?.concentration_metrics?.herfindahl_index ? 
                                                result.concentration_risk.concentration_metrics.herfindahl_index.toFixed(3) : 'N/A'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Herfindahl Index
                                        </p>
                                    </div>
                                    <Shield className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Tail Risk</p>
                                        <p className="text-lg font-semibold font-mono text-purple-600">
                                            {result.tail_scenarios?.percentile_losses?.['99.9'] ? 
                                                formatPercent(result.tail_scenarios.percentile_losses['99.9']) : 'N/A'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            99.9th percentile
                                        </p>
                                    </div>
                                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Risk Factor Contributions */}
                    {result.scenario_analysis.risk_factor_contributions && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Risk Factor Contributions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(result.scenario_analysis.risk_factor_contributions)
                                        .sort(([,a], [,b]) => Math.abs(b.contribution) - Math.abs(a.contribution))
                                        .map(([factor, data]) => (
                                        <div key={factor} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-primary/20"></div>
                                                <div>
                                                    <p className="text-sm font-medium capitalize">{factor.replace('_', ' ')}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Shock: {formatPercent(data.shock * 100)} • 
                                                        Exposure: {formatPercent(data.exposure * 100)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-mono font-semibold">
                                                    {formatCurrency(data.contribution)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatPercent(data.percentage_contribution)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Key Findings */}
                    {result.interpretation?.key_findings && (
                        <Card className="border-amber-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Key Findings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {result.interpretation.key_findings.map((finding, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="mt-1">
                                            {getSeverityIcon(finding.severity)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{finding.title}</p>
                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                                {finding.description}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-opacity-20 ${getSeverityColor(finding.severity)}`}>
                                                {finding.severity.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {result.interpretation.recommendations?.length > 0 && (
                                    <>
                                        <Separator className="my-4" />
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-3">Recommendations</p>
                                            <ul className="space-y-2">
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

                                {result.interpretation.risk_warnings?.length > 0 && (
                                    <>
                                        <Separator className="my-4" />
                                        <div>
                                            <p className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Risk Warnings
                                            </p>
                                            <ul className="space-y-2">
                                                {result.interpretation.risk_warnings.map((warning, idx) => (
                                                    <li key={idx} className="text-sm text-red-600 flex gap-2">
                                                        <span className="text-red-500">⚠</span>
                                                        <span>{warning}</span>
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
                            <CardTitle className="text-base font-medium">Analysis Charts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="waterfall" className="w-full">
                                <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                    <TabsTrigger value="waterfall" className="text-xs">Waterfall</TabsTrigger>
                                    <TabsTrigger value="heatmap" className="text-xs">Sensitivity</TabsTrigger>
                                    <TabsTrigger value="attribution" className="text-xs">Attribution</TabsTrigger>
                                    <TabsTrigger value="tail" className="text-xs">Tail Risk</TabsTrigger>
                                    <TabsTrigger value="correlation" className="text-xs">Correlations</TabsTrigger>
                                    <TabsTrigger value="surface" className="text-xs">Stress Surface</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="waterfall" className="mt-4">
                                    {result.plots?.scenario_waterfall ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.scenario_waterfall}`}
                                                alt="Scenario Waterfall"
                                                width={900}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No waterfall chart available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="heatmap" className="mt-4">
                                    {result.plots?.sensitivity_heatmap ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.sensitivity_heatmap}`}
                                                alt="Sensitivity Heatmap"
                                                width={900}
                                                height={600}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No sensitivity heatmap available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="attribution" className="mt-4">
                                    {result.plots?.factor_attribution ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.factor_attribution}`}
                                                alt="Factor Attribution"
                                                width={900}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No attribution chart available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="tail" className="mt-4">
                                    {result.plots?.tail_distribution ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.tail_distribution}`}
                                                alt="Tail Distribution"
                                                width={900}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No tail distribution chart available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="correlation" className="mt-4">
                                    {result.plots?.correlation_matrix ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.correlation_matrix}`}
                                                alt="Correlation Matrix"
                                                width={800}
                                                height={800}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No correlation matrix available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="surface" className="mt-4">
                                    {result.plots?.stress_surface ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.stress_surface}`}
                                                alt="Stress Surface"
                                                width={900}
                                                height={600}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                                            No stress surface available
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Risk Attribution Details */}
                    {result.risk_attribution && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Risk Attribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Systematic Risk</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {formatPercent(result.risk_attribution.portfolio_decomposition.systematic_risk * 100)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Idiosyncratic Risk</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {formatPercent(result.risk_attribution.portfolio_decomposition.idiosyncratic_risk * 100)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Correlation Benefit</p>
                                        <p className="font-mono text-sm font-semibold text-emerald-600">
                                            {formatPercent(result.risk_attribution.portfolio_decomposition.correlation_benefit * 100)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Total Portfolio Risk</p>
                                        <p className="font-mono text-sm font-semibold">
                                            {formatPercent(result.risk_attribution.portfolio_decomposition.total_portfolio_risk * 100)}
                                        </p>
                                    </div>
                                </div>

                                {result.risk_attribution.factor_contributions && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground mb-3">Factor Risk Components</p>
                                        {Object.entries(result.risk_attribution.factor_contributions).map(([factor, data]) => (
                                            <div key={factor} className="grid grid-cols-5 gap-4 p-3 bg-muted/30 rounded-lg text-center">
                                                <div>
                                                    <p className="text-xs font-medium capitalize">{factor.replace('_', ' ')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Stand-alone</p>
                                                    <p className="font-mono text-xs">{formatPercent(data.stand_alone_risk * 100)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Marginal</p>
                                                    <p className="font-mono text-xs">{formatPercent(data.marginal_risk * 100)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Component</p>
                                                    <p className="font-mono text-xs">{formatPercent(data.component_risk * 100)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Diversification</p>
                                                    <p className="font-mono text-xs text-emerald-600">{formatPercent(data.diversification_benefit * 100)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Methodology */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Methodology</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <p className="font-medium text-foreground">Stress Testing Approach</p>
                                    <p>Apply extreme but plausible market scenarios to evaluate portfolio resilience and identify vulnerabilities.</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Historical scenario replication</li>
                                        <li>• Monte Carlo simulation with extreme correlations</li>
                                        <li>• Reverse stress testing for loss thresholds</li>
                                        <li>• Concentration and liquidity risk assessment</li>
                                    </ul>
                                </div>
                                <div className="space-y-3">
                                    <p className="font-medium text-foreground">Risk Factor Model</p>
                                    <p>Multi-factor framework capturing market, credit, operational, and liquidity risks with dynamic correlations.</p>
                                    <div className="font-mono text-xs bg-muted p-3 rounded">
                                        P&L = Σ(Exposure_i × Shock_i) + Correlation_Effects + Liquidity_Costs
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="text-xs">
                                <p className="font-medium text-foreground mb-2">Test Parameters</p>
                                <div className="grid grid-cols-5 gap-3">
                                    <span>Scenario: {result.parameters?.scenario || 'N/A'}</span>
                                    <span>Horizon: {result.parameters?.time_horizon || 'N/A'} day(s)</span>
                                    <span>Confidence: {result.parameters?.confidence_level ? `${(result.parameters.confidence_level * 100).toFixed(1)}%` : 'N/A'}</span>
                                    <span>Correlations: {result.parameters?.include_correlations ? 'Yes' : 'No'}</span>
                                    <span>Simulations: {result.parameters?.num_simulations?.toLocaleString() || 'N/A'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}