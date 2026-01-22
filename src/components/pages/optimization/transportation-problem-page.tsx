'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Truck } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { produce } from 'immer';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: 'Basic',
        costs: [['4', '6', '9'], ['5', '2', '7']],
        supply: ['120', '150'],
        demand: ['80', '90', '100']
    },
    {
        name: 'Unbalanced',
        costs: [['8', '6', '10'], ['9', '12', '13'], ['4', '8', '11']],
        supply: ['70', '80', '90'],
        demand: ['85', '75', '100']
    },
    {
        name: 'Large',
        costs: [['3', '1', '7', '4'], ['2', '6', '5', '9'], ['8', '3', '3', '2']],
        supply: ['300', '400', '500'],
        demand: ['250', '350', '400', '200']
    },
];

interface Shipment {
    source: string;
    source_idx: number;
    destination: string;
    dest_idx: number;
    amount: number;
    unit_cost: number;
    total_cost: number;
}

interface TPResult {
    success: boolean;
    message: string;
    total_cost: number | null;
    shipments: Shipment[];
    allocation_matrix: number[][];
    is_balanced: boolean;
    total_supply: number;
    total_demand: number;
    unmet_demand: { destination: string; amount: number }[];
    excess_supply: { source: string; amount: number }[];
    problem: {
        n_sources: number;
        n_destinations: number;
        n_routes: number;
    };
    plots: {
        heatmap?: string;
        flow?: string;
        cost_breakdown?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function TransportationProblemPage() {
    const { toast } = useToast();

    const [costs, setCosts] = useState<string[][]>([['4', '6', '9'], ['5', '2', '7']]);
    const [supply, setSupply] = useState<string[]>(['120', '150']);
    const [demand, setDemand] = useState<string[]>(['80', '90', '100']);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<TPResult | null>(null);

    const numSources = supply.length;
    const numDests = demand.length;

    const updateDimensions = (newSources: number, newDests: number) => {
        setCosts(current => {
            const newMatrix: string[][] = [];
            for (let i = 0; i < newSources; i++) {
                const row: string[] = [];
                for (let j = 0; j < newDests; j++) {
                    row.push(current[i]?.[j] ?? '0');
                }
                newMatrix.push(row);
            }
            return newMatrix;
        });

        setSupply(current => {
            const newSupply = [...current];
            while (newSupply.length < newSources) newSupply.push('0');
            return newSupply.slice(0, newSources);
        });

        setDemand(current => {
            const newDemand = [...current];
            while (newDemand.length < newDests) newDemand.push('0');
            return newDemand.slice(0, newDests);
        });
    };

    const addSource = () => {
        if (numSources < 10) updateDimensions(numSources + 1, numDests);
    };

    const removeSource = () => {
        if (numSources > 1) updateDimensions(numSources - 1, numDests);
    };

    const addDest = () => {
        if (numDests < 10) updateDimensions(numSources, numDests + 1);
    };

    const removeDest = () => {
        if (numDests > 1) updateDimensions(numSources, numDests - 1);
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setCosts(example.costs.map(row => [...row]));
        setSupply([...example.supply]);
        setDemand([...example.demand]);
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                costs: costs.map(row => row.map(Number)),
                supply: supply.map(Number),
                demand: demand.map(Number),
            };

            if (payload.costs.flat().some(isNaN) || payload.supply.some(isNaN) || payload.demand.some(isNaN)) {
                throw new Error("All inputs must be valid numbers.");
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/transportation-problem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: TPResult = await response.json();
            setResult(res);

            if (res.success) {
                toast({ title: "Solution Found", description: `Total cost: ${res.total_cost?.toFixed(2)}` });
            } else {
                toast({ variant: 'destructive', title: "No Solution", description: res.message });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const totalSupply = supply.reduce((sum, s) => sum + (parseFloat(s) || 0), 0);
    const totalDemand = demand.reduce((sum, d) => sum + (parseFloat(d) || 0), 0);
    const isBalanced = Math.abs(totalSupply - totalDemand) < 0.01;

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Truck className="w-6 h-6 text-primary" />
                    Transportation Problem
                </h1>
                <p className="text-sm text-muted-foreground">
                    Minimize transportation costs from sources to destinations
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Dimension Controls */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Sources</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={removeSource} disabled={numSources <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{numSources}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addSource} disabled={numSources >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Destinations</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={removeDest} disabled={numDests <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{numDests}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addDest} disabled={numDests >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Supply: {totalSupply} | Demand: {totalDemand}
                            </span>
                        </div>

                        <div className="flex-1" />

                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_PROBLEMS.map(ex => (
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

                    {/* Cost Matrix with Supply/Demand */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Cost Matrix, Supply & Demand</Label>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-20"></TableHead>
                                        {Array.from({ length: numDests }).map((_, j) => (
                                            <TableHead key={j} className="text-center min-w-[80px]">
                                                D{j + 1}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center bg-blue-50 min-w-[80px]">Supply</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costs.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">S{i + 1}</TableCell>
                                            {row.map((cost, j) => (
                                                <TableCell key={j} className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={cost}
                                                        onChange={e => setCosts(produce(draft => { draft[i][j] = e.target.value }))}
                                                        className="h-9 text-center font-mono"
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="p-1 bg-blue-50">
                                                <Input
                                                    type="number"
                                                    value={supply[i]}
                                                    onChange={e => setSupply(produce(draft => { draft[i] = e.target.value }))}
                                                    className="h-9 text-center font-mono bg-blue-50"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="font-medium bg-green-50">Demand</TableCell>
                                        {demand.map((d, j) => (
                                            <TableCell key={j} className="p-1 bg-green-50">
                                                <Input
                                                    type="number"
                                                    value={d}
                                                    onChange={e => setDemand(produce(draft => { draft[j] = e.target.value }))}
                                                    className="h-9 text-center font-mono bg-green-50"
                                                />
                                            </TableCell>
                                        ))}
                                        <TableCell className="bg-gray-100"></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Solving...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Solve Problem</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className={`border-0 shadow-sm ${result.success ? 'bg-gradient-to-br from-primary/5 to-primary/10' : 'bg-muted/50'}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.total_cost !== null ? result.total_cost.toFixed(2) : '—'}
                                        </p>
                                    </div>
                                    <Target className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Active Routes</p>
                                        <p className="text-lg font-semibold font-mono">{result.problem.n_routes}</p>
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Problem Size</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.problem.n_sources}×{result.problem.n_destinations}
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
                                        <p className="text-xs text-muted-foreground mb-1">Balance</p>
                                        <p className={`text-lg font-semibold ${result.is_balanced ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {result.is_balanced ? 'Balanced' : 'Unbalanced'}
                                        </p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Shipments Table */}
                    {result.success && result.shipments.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Optimal Shipments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Unit Cost</TableHead>
                                            <TableHead className="text-right">Total Cost</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {result.shipments.map((ship, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{ship.source}</TableCell>
                                                <TableCell>{ship.destination}</TableCell>
                                                <TableCell className="text-right font-mono">{ship.amount.toFixed(0)}</TableCell>
                                                <TableCell className="text-right font-mono">{ship.unit_cost.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono font-medium">{ship.total_cost.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/50">
                                            <TableCell colSpan={4} className="font-medium text-right">Total</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{result.total_cost?.toFixed(2)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

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
                    {result.success && result.plots && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="flow" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.flow && (
                                            <TabsTrigger value="flow" className="text-xs">Flow Diagram</TabsTrigger>
                                        )}
                                        {result.plots.heatmap && (
                                            <TabsTrigger value="heatmap" className="text-xs">Allocation Matrix</TabsTrigger>
                                        )}
                                        {result.plots.cost_breakdown && (
                                            <TabsTrigger value="cost" className="text-xs">Cost Breakdown</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.flow && (
                                        <TabsContent value="flow" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.flow}`}
                                                    alt="Flow Diagram"
                                                    width={800}
                                                    height={600}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.heatmap && (
                                        <TabsContent value="heatmap" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.heatmap}`}
                                                    alt="Allocation Heatmap"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.cost_breakdown && (
                                        <TabsContent value="cost" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.cost_breakdown}`}
                                                    alt="Cost Breakdown"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
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