'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Component, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { produce } from 'immer';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PORTFOLIOS = [
    {
        name: 'Conservative',
        target_return: '6',
        assets: [
            { name: 'Government Bonds', expected_return: '3', volatility: '5' },
            { name: 'Corporate Bonds', expected_return: '5', volatility: '8' },
            { name: 'Blue Chip Stocks', expected_return: '8', volatility: '15' }
        ],
        correlation: [
            ['1', '0.2', '0.1'],
            ['0.2', '1', '0.3'],
            ['0.1', '0.3', '1']
        ]
    },
    {
        name: 'Balanced',
        target_return: '8',
        assets: [
            { name: 'Stocks', expected_return: '10', volatility: '18' },
            { name: 'Bonds', expected_return: '4', volatility: '6' },
            { name: 'REITs', expected_return: '7', volatility: '12' },
            { name: 'Commodities', expected_return: '6', volatility: '20' }
        ],
        correlation: [
            ['1', '0.2', '0.4', '0.3'],
            ['0.2', '1', '0.1', '0.0'],
            ['0.4', '0.1', '1', '0.2'],
            ['0.3', '0.0', '0.2', '1']
        ]
    },
    {
        name: 'Aggressive',
        target_return: '12',
        assets: [
            { name: 'Tech Stocks', expected_return: '15', volatility: '25' },
            { name: 'Growth Stocks', expected_return: '12', volatility: '22' },
            { name: 'Emerging Markets', expected_return: '11', volatility: '28' }
        ],
        correlation: [
            ['1', '0.7', '0.5'],
            ['0.7', '1', '0.4'],
            ['0.5', '0.4', '1']
        ]
    },
];

interface AssetInput {
    id: string;
    name: string;
    expected_return: string;
    volatility: string;
}

interface AssetDetail {
    name: string;
    expected_return: number;
    volatility: number;
    weight: number;
    efficiency: number;
    selected: boolean;
}

interface OptimizationResult {
    success: boolean;
    portfolio_return: number;
    portfolio_volatility: number;
    sharpe_ratio: number;
    utilization: number;
    optimal_weights: { [key: string]: number };
    selected_assets: string[];
    asset_details: AssetDetail[];
    asset_details_by_efficiency: AssetDetail[];
    portfolio: {
        n_assets: number;
        target_return: number;
        n_selected: number;
    };
    plots: {
        allocation?: string;
        efficient_frontier?: string;
        asset_comparison?: string;
        risk_breakdown?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function ConvexOptimizationPage() {
    const { toast } = useToast();

    const [targetReturn, setTargetReturn] = useState('8');
    const [assets, setAssets] = useState<AssetInput[]>([
        { id: '1', name: 'Stocks', expected_return: '10', volatility: '18' },
        { id: '2', name: 'Bonds', expected_return: '4', volatility: '6' },
        { id: '3', name: 'REITs', expected_return: '7', volatility: '12' }
    ]);
    const [correlationMatrix, setCorrelationMatrix] = useState<string[][]>([
        ['1', '0.2', '0.4'],
        ['0.2', '1', '0.1'],
        ['0.4', '0.1', '1']
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<OptimizationResult | null>(null);

    const updateMatrixSize = (size: number) => {
        setCorrelationMatrix(current => {
            const newMatrix = Array(size).fill(0).map(() => Array(size).fill('0'));
            for(let i = 0; i < size; i++) newMatrix[i][i] = '1';
            for(let i = 0; i < Math.min(size, current.length); i++) {
                for(let j = 0; j < Math.min(size, current[i].length); j++) {
                    newMatrix[i][j] = current[i][j];
                }
            }
            return newMatrix;
        });
    };

    const addAsset = () => {
        setAssets(prev => [...prev, {
            id: Date.now().toString(),
            name: `Asset ${prev.length + 1}`,
            expected_return: '8',
            volatility: '15'
        }]);
        updateMatrixSize(assets.length + 1);
    };

    const removeAsset = (id: string) => {
        if (assets.length > 2) {
            setAssets(prev => prev.filter(asset => asset.id !== id));
            updateMatrixSize(assets.length - 1);
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PORTFOLIOS[0]) => {
        setTargetReturn(example.target_return);
        setAssets(example.assets.map((asset, i) => ({
            id: (i + 1).toString(),
            ...asset
        })));
        setCorrelationMatrix(example.correlation);
        setResult(null);
    };

    const handleOptimize = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedAssets = assets
                .filter(asset => asset.expected_return && asset.volatility)
                .map(asset => ({
                    name: asset.name,
                    expected_return: parseFloat(asset.expected_return) / 100,
                    volatility: parseFloat(asset.volatility) / 100
                }));

            if (parsedAssets.length < 2) {
                throw new Error("Please provide at least two valid assets.");
            }

            const correlationNumbers = correlationMatrix.map(row => row.map(Number));
            if (correlationNumbers.flat().some(isNaN)) {
                throw new Error("Correlation matrix must contain valid numbers.");
            }

            const payload = {
                assets: parsedAssets,
                correlation_matrix: correlationNumbers,
                target_return: parseFloat(targetReturn) / 100
            };

            if (isNaN(payload.target_return) || payload.target_return <= 0) {
                throw new Error("Target return must be a positive number.");
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/convex-optimization`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Optimization failed');
            }

            const res: OptimizationResult = await response.json();
            setResult(res);

            toast({
                title: "Optimization Complete",
                description: `Expected return: ${(res.portfolio_return * 100).toFixed(2)}% with ${res.selected_assets.length} assets`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCorrelationChange = (rowIndex: number, colIndex: number, value: string) => {
        setCorrelationMatrix(produce(draft => {
            draft[rowIndex][colIndex] = value;
            if (rowIndex !== colIndex) {
                draft[colIndex][rowIndex] = value; // Symmetric matrix
            }
        }));
    };

    const totalExpectedReturn = assets.reduce((sum, asset) => sum + (parseFloat(asset.expected_return) || 0), 0);
    const avgVolatility = assets.length > 0 ? assets.reduce((sum, asset) => sum + (parseFloat(asset.volatility) || 0), 0) / assets.length : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Component className="w-6 h-6 text-primary" />
                    Convex Optimization: Portfolio Theory
                </h1>
                <p className="text-sm text-muted-foreground">
                    Find optimal asset allocation to minimize risk for a target return using Modern Portfolio Theory
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Portfolio Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Target Return & Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Target Return (%)</Label>
                            <Input
                                type="number"
                                value={targetReturn}
                                onChange={e => setTargetReturn(e.target.value)}
                                className="w-32 h-9 font-mono"
                                min="0"
                                step="0.1"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Assets</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => assets.length > 2 && setAssets(prev => prev.slice(0, -1)) && updateMatrixSize(assets.length - 1)} disabled={assets.length <= 2}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{assets.length}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addAsset} disabled={assets.length >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Total Return: {totalExpectedReturn.toFixed(1)}%</span>
                            <span>•</span>
                            <span>Avg Volatility: {avgVolatility.toFixed(1)}%</span>
                        </div>

                        <div className="flex-1" />

                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_PORTFOLIOS.map(ex => (
                                <button
                                    key={ex.name}
                                    onClick={() => handleExampleSelect(ex)}
                                    className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors"
                                >
                                    {ex.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Assets Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Assets</Label>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Name</TableHead>
                                        <TableHead>Expected Return (%)</TableHead>
                                        <TableHead>Volatility (%)</TableHead>
                                        <TableHead className="text-right">Sharpe Ratio</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assets.map((asset, index) => {
                                        const ret = parseFloat(asset.expected_return) || 0;
                                        const vol = parseFloat(asset.volatility) || 0;
                                        const sharpe = vol > 0 ? (ret / vol).toFixed(2) : '—';
                                        return (
                                            <TableRow key={asset.id}>
                                                <TableCell className="p-1">
                                                    <Input
                                                        value={asset.name}
                                                        onChange={e => setAssets(produce(draft => { draft[index].name = e.target.value }))}
                                                        className="h-9"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={asset.expected_return}
                                                        onChange={e => setAssets(produce(draft => { draft[index].expected_return = e.target.value }))}
                                                        className="h-9 w-20 font-mono"
                                                        min="0"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={asset.volatility}
                                                        onChange={e => setAssets(produce(draft => { draft[index].volatility = e.target.value }))}
                                                        className="h-9 w-20 font-mono"
                                                        min="0"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                                    {sharpe}
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => removeAsset(asset.id)}
                                                        disabled={assets.length <= 2}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sharpe Ratio = Expected Return / Volatility (higher is better for risk-adjusted return)
                        </p>
                    </div>

                    <Separator />

                    {/* Correlation Matrix */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Correlation Matrix</Label>
                        <div className="overflow-x-auto">
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-20"></TableHead>
                                            {assets.map((asset, i) => (
                                                <TableHead key={i} className="text-center w-20">
                                                    {asset.name.slice(0, 8)}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {correlationMatrix.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableHead className="text-center">
                                                    {assets[i]?.name.slice(0, 8) || ''}
                                                </TableHead>
                                                {row.map((val, j) => (
                                                    <TableCell key={j} className="p-1">
                                                        <Input
                                                            type="number"
                                                            value={val}
                                                            onChange={e => handleCorrelationChange(i, j, e.target.value)}
                                                            disabled={i === j}
                                                            className="h-9 w-16 text-center font-mono"
                                                            min="-1"
                                                            max="1"
                                                            step="0.1"
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Correlation ranges from -1 (perfect negative) to 1 (perfect positive). Diagonal values are always 1.
                        </p>
                    </div>

                    <Button onClick={handleOptimize} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing Portfolio...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Optimize Portfolio</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Expected Return</p>
                                        <p className="text-lg font-semibold font-mono">{(result.portfolio_return * 100).toFixed(2)}%</p>
                                    </div>
                                    <Target className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Portfolio Risk</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {(result.portfolio_volatility * 100).toFixed(2)}%
                                        </p>
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
                                        <p className={`text-lg font-semibold ${result.sharpe_ratio >= 1 ? 'text-green-600' : result.sharpe_ratio >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {result.sharpe_ratio.toFixed(2)}
                                        </p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Diversification</p>
                                        <p className={`text-lg font-semibold ${result.utilization >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {result.utilization.toFixed(1)}%
                                        </p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected Assets */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Optimal Portfolio</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Selected Assets</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.selected_assets.length > 0 ? (
                                        result.selected_assets.map(asset => (
                                            <Badge key={asset} variant="default" className="text-sm">
                                                {asset}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No assets selected</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Asset Details</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.asset_details.map((asset, i) => (
                                            <div key={i} className={`flex items-center justify-between text-sm ${asset.selected ? 'font-medium' : 'text-muted-foreground'}`}>
                                                <span className="flex items-center gap-1">
                                                    {asset.selected && <span className="text-green-500">✓</span>}
                                                    {asset.name}
                                                </span>
                                                <span className="font-mono text-xs">
                                                    w:{(asset.weight * 100).toFixed(1)}% r:{(asset.expected_return * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">By Efficiency</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.asset_details_by_efficiency.map((asset, i) => (
                                            <div key={i} className={`flex items-center justify-between text-sm ${asset.selected ? 'font-medium' : 'text-muted-foreground'}`}>
                                                <span className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                                                    {asset.name}
                                                </span>
                                                <span className="font-mono text-xs">
                                                    {asset.efficiency.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
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
                                    Portfolio Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {result.interpretation.key_insights.map((insight, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="mt-1">
                                            {insight.status === 'positive' ? (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            ) : insight.status === 'warning' ? (
                                                <AlertCircle className="w-5 h-5 text-yellow-500" />
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
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
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
                    {result.plots && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="allocation" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.allocation && (
                                            <TabsTrigger value="allocation" className="text-xs">Portfolio Allocation</TabsTrigger>
                                        )}
                                        {result.plots.efficient_frontier && (
                                            <TabsTrigger value="frontier" className="text-xs">Efficient Frontier</TabsTrigger>
                                        )}
                                        {result.plots.asset_comparison && (
                                            <TabsTrigger value="comparison" className="text-xs">Asset Comparison</TabsTrigger>
                                        )}
                                        {result.plots.risk_breakdown && (
                                            <TabsTrigger value="risk" className="text-xs">Risk Breakdown</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.allocation && (
                                        <TabsContent value="allocation" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.allocation}`}
                                                    alt="Portfolio Allocation"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.efficient_frontier && (
                                        <TabsContent value="frontier" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.efficient_frontier}`}
                                                    alt="Efficient Frontier"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                The efficient frontier shows the optimal risk-return tradeoff for different portfolio allocations
                                            </p>
                                        </TabsContent>
                                    )}

                                    {result.plots.asset_comparison && (
                                        <TabsContent value="comparison" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.asset_comparison}`}
                                                    alt="Asset Comparison"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.risk_breakdown && (
                                        <TabsContent value="risk" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.risk_breakdown}`}
                                                    alt="Risk Breakdown"
                                                    width={800}
                                                    height={400}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Risk contribution by asset showing diversification benefits
                                            </p>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

