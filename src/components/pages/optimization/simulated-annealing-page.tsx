'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Thermometer, TrendingDown, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_FUNCTIONS = [
    {
        name: 'Sphere Function',
        func: 'np.sum(x**2)',
        description: 'Simple convex function, global minimum at origin',
        bounds: [[-10, 10], [-10, 10]],
        optimal: 0
    },
    {
        name: 'Rosenbrock Function',
        func: '100*(x[1]-x[0]**2)**2 + (1-x[0])**2',
        description: 'Classic optimization test, banana-shaped valley',
        bounds: [[-2, 2], [-1, 3]],
        optimal: 0
    },
    {
        name: 'Rastrigin Function',
        func: '10*len(x) + np.sum(x**2 - 10*np.cos(2*np.pi*x))',
        description: 'Highly multimodal with many local minima',
        bounds: [[-5.12, 5.12], [-5.12, 5.12]],
        optimal: 0
    },
    {
        name: 'Ackley Function',
        func: '-20*np.exp(-0.2*np.sqrt(np.sum(x**2)/len(x))) - np.exp(np.sum(np.cos(2*np.pi*x))/len(x)) + 20 + np.e',
        description: 'Many local minima, challenging for optimization',
        bounds: [[-5, 5], [-5, 5]],
        optimal: 0
    }
];

interface SAResult {
    success: boolean;
    best_solution: number[];
    best_fitness: number;
    convergence_history: number[];
    temperature_history: number[];
    acceptance_rate: number;
    iterations: number;
    problem_info: {
        n_variables: number;
        bounds: number[][];
        objective_function: string;
        initial_fitness: number;
        final_fitness: number;
        improvement: number;
    };
    plots: {
        convergence: string;
        temperature: string;
        surface?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function SimulatedAnnealingPage() {
    const { toast } = useToast();

    const [objectiveFunction, setObjectiveFunction] = useState('np.sum(x**2)');
    const [bounds, setBounds] = useState<[string, string][]>([['-10', '10'], ['-10', '10']]);
    const [variableNames, setVariableNames] = useState<string[]>(['x1', 'x2']);
    const [initialTemp, setInitialTemp] = useState(1000);
    const [coolingRate, setCoolingRate] = useState(0.99);
    const [maxIter, setMaxIter] = useState(1000);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SAResult | null>(null);

    const handleAddVariable = () => {
        if (bounds.length < 10) {
            setBounds([...bounds, ['-10', '10']]);
            setVariableNames([...variableNames, `x${bounds.length + 1}`]);
        }
    };

    const handleRemoveVariable = (index: number) => {
        if (bounds.length > 1) {
            setBounds(bounds.filter((_, i) => i !== index));
            setVariableNames(variableNames.filter((_, i) => i !== index));
        }
    };

    const handleVariableNameChange = (index: number, name: string) => {
        const newNames = [...variableNames];
        newNames[index] = name;
        setVariableNames(newNames);
    };

    const handleBoundChange = (index: number, side: 0 | 1, value: string) => {
        const newBounds = [...bounds];
        newBounds[index][side] = value;
        setBounds(newBounds);
    };

    const handleExampleSelect = (example: typeof EXAMPLE_FUNCTIONS[0]) => {
        setObjectiveFunction(example.func);
        setBounds(example.bounds.map(b => [b[0].toString(), b[1].toString()]) as [string, string][]);
        setVariableNames(example.bounds.map((_, i) => `x${i + 1}`));
        setResult(null);
        
        toast({
            title: "Example Loaded",
            description: example.name
        });
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const payload = {
                objective_function: objectiveFunction,
                bounds: bounds.map(b => [parseFloat(b[0]), parseFloat(b[1])]),
                initial_temp: initialTemp,
                cooling_rate: coolingRate,
                max_iter: maxIter
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/simulated-annealing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Optimization failed');
            }

            const res: SAResult = await response.json();
            setResult(res);

            toast({
                title: "Optimization Complete",
                description: `Best fitness: ${res.best_fitness.toFixed(4)}`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Thermometer className="w-6 h-6 text-primary" />
                    Simulated Annealing
                </h1>
                <p className="text-sm text-muted-foreground">
                    Metaheuristic optimization inspired by metallurgical annealing process
                </p>
            </div>

            {/* Configuration */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Dimension Controls + Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Variables</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => {
                                    if (bounds.length > 1) {
                                        setBounds(bounds.filter((_, i) => i !== bounds.length - 1));
                                    }
                                }} disabled={bounds.length <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{bounds.length}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleAddVariable} disabled={bounds.length >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1" />

                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_FUNCTIONS.map(example => (
                                <button
                                    key={example.name}
                                    onClick={() => handleExampleSelect(example)}
                                    className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors"
                                >
                                    {example.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Objective Function */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Objective Function (Python Expression)</Label>
                        <Input
                            value={objectiveFunction}
                            onChange={(e) => setObjectiveFunction(e.target.value)}
                            placeholder="e.g., np.sum(x**2)"
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use <code className="bg-muted px-1 rounded">x</code> for variable array. 
                            Available: np.sum, np.cos, np.sin, np.exp, np.log, np.sqrt
                        </p>
                    </div>

                    <Separator />

                    {/* Variable Bounds Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Variable Bounds</Label>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Name</TableHead>
                                        <TableHead>Min Value</TableHead>
                                        <TableHead>Max Value</TableHead>
                                        <TableHead className="text-right">Range</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bounds.map((bound, idx) => {
                                        const min = parseFloat(bound[0]) || 0;
                                        const max = parseFloat(bound[1]) || 0;
                                        const range = max - min;
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell className="p-1">
                                                    <Input
                                                        value={variableNames[idx]}
                                                        onChange={(e) => handleVariableNameChange(idx, e.target.value)}
                                                        className="h-9 font-mono"
                                                        placeholder={`x${idx + 1}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={bound[0]}
                                                        onChange={(e) => handleBoundChange(idx, 0, e.target.value)}
                                                        className="h-9 w-20 font-mono"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={bound[1]}
                                                        onChange={(e) => handleBoundChange(idx, 1, e.target.value)}
                                                        className="h-9 w-20 font-mono"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                                    {range.toFixed(1)}
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    {bounds.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-destructive/10"
                                                            onClick={() => handleRemoveVariable(idx)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Problem dimension: {bounds.length} variable{bounds.length > 1 ? 's' : ''}. Range = Max - Min.
                        </p>
                    </div>

                    <Separator />

                    {/* SA Parameters */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Simulated Annealing Parameters</Label>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Iterations</Label>
                                <Input
                                    type="number"
                                    value={maxIter}
                                    onChange={e => setMaxIter(parseInt(e.target.value))}
                                    className="h-9 font-mono"
                                    min="100"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Initial Temp</Label>
                                <Input
                                    type="number"
                                    value={initialTemp}
                                    onChange={e => setInitialTemp(parseInt(e.target.value))}
                                    className="h-9 font-mono"
                                    min="100"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Cooling Rate</Label>
                                <Input
                                    type="number"
                                    value={coolingRate}
                                    onChange={e => setCoolingRate(parseFloat(e.target.value))}
                                    className="h-9 font-mono"
                                    min="0.9"
                                    max="0.999"
                                    step="0.001"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800">
                            <Info className="w-3 h-3 inline mr-1" />
                            <strong>How it works:</strong> Simulates metal annealing. High temperature allows 
                            accepting worse solutions (exploration). As it cools, becomes more selective (exploitation).
                        </p>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Start Optimization</>
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
                                        <p className="text-xs text-muted-foreground mb-1">Best Fitness</p>
                                        <p className="text-lg font-semibold font-mono">{result.best_fitness.toFixed(4)}</p>
                                    </div>
                                    <TrendingDown className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Improvement</p>
                                        <p className="text-lg font-semibold font-mono">{result.problem_info.improvement.toFixed(4)}</p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Acceptance Rate</p>
                                        <p className="text-lg font-semibold font-mono">{(result.acceptance_rate * 100).toFixed(1)}%</p>
                                    </div>
                                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Iterations</p>
                                        <p className="text-lg font-semibold font-mono">{result.iterations}</p>
                                    </div>
                                    <Thermometer className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Best Solution */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Optimal Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                {result.best_solution.map((value, idx) => (
                                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">x[{idx}]</p>
                                        <p className="font-mono text-sm font-semibold">{value.toFixed(6)}</p>
                                    </div>
                                ))}
                            </div>

                            <Separator />

                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                <div>Function: <code className="font-mono">{result.problem_info.objective_function}</code></div>
                                <div>Initial fitness: <span className="font-mono">{result.problem_info.initial_fitness.toFixed(4)}</span></div>
                                <div>Final fitness: <span className="font-mono">{result.problem_info.final_fitness.toFixed(4)}</span></div>
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
                                                <AlertCircle className="w-5 h-5 text-primary/60" />
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
                    {result.plots && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Optimization Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="convergence" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        <TabsTrigger value="convergence" className="text-xs">Convergence</TabsTrigger>
                                        <TabsTrigger value="temperature" className="text-xs">Temperature</TabsTrigger>
                                        {result.plots.surface && (
                                            <TabsTrigger value="surface" className="text-xs">3D Surface</TabsTrigger>
                                        )}
                                    </TabsList>

                                    <TabsContent value="convergence" className="mt-4">
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.convergence}`}
                                                alt="Convergence"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 text-center">
                                            Best fitness value over iterations (lower is better)
                                        </p>
                                    </TabsContent>

                                    <TabsContent value="temperature" className="mt-4">
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.temperature}`}
                                                alt="Temperature"
                                                width={800}
                                                height={500}
                                                className="w-full"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 text-center">
                                            Temperature decay schedule (exponential cooling)
                                        </p>
                                    </TabsContent>

                                    {result.plots.surface && (
                                        <TabsContent value="surface" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.surface}`}
                                                    alt="3D Surface"
                                                    width={800}
                                                    height={700}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Objective function landscape with optimal solution (red star)
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
