'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Package, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { produce } from 'immer';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: 'Classic',
        capacity: '50',
        items: [
            { name: 'Item 1', weight: '10', value: '60' },
            { name: 'Item 2', weight: '20', value: '100' },
            { name: 'Item 3', weight: '30', value: '120' }
        ]
    },
    {
        name: 'Electronics',
        capacity: '15',
        items: [
            { name: 'Laptop', weight: '5', value: '500' },
            { name: 'Camera', weight: '3', value: '300' },
            { name: 'Phone', weight: '1', value: '200' },
            { name: 'Tablet', weight: '4', value: '350' },
            { name: 'Watch', weight: '1', value: '150' }
        ]
    },
    {
        name: 'Camping',
        capacity: '40',
        items: [
            { name: 'Tent', weight: '15', value: '200' },
            { name: 'Sleeping Bag', weight: '8', value: '150' },
            { name: 'Stove', weight: '5', value: '100' },
            { name: 'Food', weight: '10', value: '180' },
            { name: 'Water', weight: '12', value: '120' },
            { name: 'First Aid', weight: '3', value: '80' }
        ]
    },
];

interface ItemInput {
    id: string;
    name: string;
    weight: string;
    value: string;
}

interface ItemDetail {
    name: string;
    weight: number;
    value: number;
    efficiency: number;
    selected: boolean;
}

interface DPResult {
    success: boolean;
    total_value: number;
    total_weight: number;
    remaining_capacity: number;
    utilization: number;
    selected_items: string[];
    item_details: ItemDetail[];
    item_details_by_efficiency: ItemDetail[];
    problem: {
        n_items: number;
        capacity: number;
        n_selected: number;
    };
    plots: {
        items_comparison?: string;
        efficiency?: string;
        utilization?: string;
        dp_table?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function DynamicProgrammingPage() {
    const { toast } = useToast();

    const [capacity, setCapacity] = useState('50');
    const [items, setItems] = useState<ItemInput[]>([
        { id: '1', name: 'Item 1', weight: '10', value: '60' },
        { id: '2', name: 'Item 2', weight: '20', value: '100' },
        { id: '3', name: 'Item 3', weight: '30', value: '120' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DPResult | null>(null);

    const addItem = () => {
        setItems(prev => [...prev, {
            id: Date.now().toString(),
            name: `Item ${prev.length + 1}`,
            weight: '',
            value: ''
        }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setCapacity(example.capacity);
        setItems(example.items.map((item, i) => ({
            id: (i + 1).toString(),
            ...item
        })));
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedItems = items
                .filter(item => item.weight && item.value)
                .map(item => ({
                    name: item.name,
                    weight: parseInt(item.weight),
                    value: parseFloat(item.value)
                }));

            if (parsedItems.length === 0) {
                throw new Error("Please provide at least one valid item.");
            }

            const payload = {
                items: parsedItems,
                capacity: parseInt(capacity)
            };

            if (isNaN(payload.capacity) || payload.capacity <= 0) {
                throw new Error("Capacity must be a positive integer.");
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/dynamic-programming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: DPResult = await response.json();
            setResult(res);

            toast({
                title: "Solution Found",
                description: `Max value: ${res.total_value.toFixed(2)} with ${res.selected_items.length} items`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const totalWeight = items.reduce((sum, item) => sum + (parseInt(item.weight) || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Package className="w-6 h-6 text-primary" />
                    Dynamic Programming: Knapsack
                </h1>
                <p className="text-sm text-muted-foreground">
                    Find the optimal combination of items to maximize value within capacity
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Capacity & Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Knapsack Capacity</Label>
                            <Input
                                type="number"
                                value={capacity}
                                onChange={e => setCapacity(e.target.value)}
                                className="w-32 h-9 font-mono"
                                min="1"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Items</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => items.length > 1 && setItems(prev => prev.slice(0, -1))}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{items.length}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addItem} disabled={items.length >= 20}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Total Weight: {totalWeight}</span>
                            <span>•</span>
                            <span>Total Value: {totalValue.toFixed(0)}</span>
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

                    {/* Items Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Items</Label>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Name</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead className="text-right">Efficiency</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => {
                                        const w = parseInt(item.weight) || 0;
                                        const v = parseFloat(item.value) || 0;
                                        const eff = w > 0 ? (v / w).toFixed(2) : '—';
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="p-1">
                                                    <Input
                                                        value={item.name}
                                                        onChange={e => setItems(produce(draft => { draft[index].name = e.target.value }))}
                                                        className="h-9"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={item.weight}
                                                        onChange={e => setItems(produce(draft => { draft[index].weight = e.target.value }))}
                                                        className="h-9 w-20 font-mono"
                                                        min="1"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={item.value}
                                                        onChange={e => setItems(produce(draft => { draft[index].value = e.target.value }))}
                                                        className="h-9 w-24 font-mono"
                                                        min="0"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                                    {eff}
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length <= 1}
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
                            Efficiency = Value / Weight (higher is better)
                        </p>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Solving...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Solve Knapsack</>
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
                                        <p className="text-xs text-muted-foreground mb-1">Max Value</p>
                                        <p className="text-lg font-semibold font-mono">{result.total_value.toFixed(2)}</p>
                                    </div>
                                    <Target className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Weight</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.total_weight} / {result.problem.capacity}
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
                                        <p className="text-xs text-muted-foreground mb-1">Items Selected</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.problem.n_selected} / {result.problem.n_items}
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
                                        <p className="text-xs text-muted-foreground mb-1">Utilization</p>
                                        <p className={`text-lg font-semibold ${result.utilization >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {result.utilization.toFixed(1)}%
                                        </p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected Items */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Selected Items</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.selected_items.length > 0 ? (
                                        result.selected_items.map(item => (
                                            <Badge key={item} variant="default" className="text-sm">
                                                {item}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No items selected</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Item Details</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.item_details.map((item, i) => (
                                            <div key={i} className={`flex items-center justify-between text-sm ${item.selected ? 'font-medium' : 'text-muted-foreground'}`}>
                                                <span className="flex items-center gap-1">
                                                    {item.selected && <span className="text-green-500">✓</span>}
                                                    {item.name}
                                                </span>
                                                <span className="font-mono text-xs">
                                                    w:{item.weight} v:{item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">By Efficiency</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.item_details_by_efficiency.map((item, i) => (
                                            <div key={i} className={`flex items-center justify-between text-sm ${item.selected ? 'font-medium' : 'text-muted-foreground'}`}>
                                                <span className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                                                    {item.name}
                                                </span>
                                                <span className="font-mono text-xs">
                                                    {item.efficiency.toFixed(2)}
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
                                <Tabs defaultValue="comparison" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.items_comparison && (
                                            <TabsTrigger value="comparison" className="text-xs">Items Comparison</TabsTrigger>
                                        )}
                                        {result.plots.efficiency && (
                                            <TabsTrigger value="efficiency" className="text-xs">Efficiency</TabsTrigger>
                                        )}
                                        {result.plots.utilization && (
                                            <TabsTrigger value="utilization" className="text-xs">Utilization</TabsTrigger>
                                        )}
                                        {result.plots.dp_table && (
                                            <TabsTrigger value="dp" className="text-xs">DP Table</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.items_comparison && (
                                        <TabsContent value="comparison" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.items_comparison}`}
                                                    alt="Items Comparison"
                                                    width={800}
                                                    height={400}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.efficiency && (
                                        <TabsContent value="efficiency" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.efficiency}`}
                                                    alt="Efficiency Ranking"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.utilization && (
                                        <TabsContent value="utilization" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.utilization}`}
                                                    alt="Capacity Utilization"
                                                    width={800}
                                                    height={400}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.dp_table && (
                                        <TabsContent value="dp" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.dp_table}`}
                                                    alt="DP Table"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                DP Table shows maximum value achievable with items 0..i and capacity 0..w
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