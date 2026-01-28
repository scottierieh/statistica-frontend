'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, GitBranch, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { produce } from 'immer';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: '2-Obj',
        objectives: [
            { name: 'f1', function: 'x[0]**2 + x[1]**2', weight: '1.0' },
            { name: 'f2', function: '(x[0]-1)**2 + (x[1]-1)**2', weight: '1.0' }
        ],
        variables: [
            { name: 'x1', min_value: '-5', max_value: '5' },
            { name: 'x2', min_value: '-5', max_value: '5' }
        ],
        n_solutions: '100',
        n_iterations: '100'
    },
    {
        name: '3-Obj',
        objectives: [
            { name: 'f1', function: 'x[0]**2', weight: '1.0' },
            { name: 'f2', function: 'x[1]**2', weight: '1.0' },
            { name: 'f3', function: '(x[0]-1)**2 + (x[1]-1)**2', weight: '1.0' }
        ],
        variables: [
            { name: 'x1', min_value: '-3', max_value: '3' },
            { name: 'x2', min_value: '-3', max_value: '3' }
        ],
        n_solutions: '150',
        n_iterations: '150'
    },
];

interface ObjectiveInput {
    id: string;
    name: string;
    function: string;
    weight: string;
}

interface VariableInput {
    id: string;
    name: string;
    min_value: string;
    max_value: string;
}

interface VariableDetail {
    name: string;
    min_value: number;
    max_value: number;
    optimal_value: number;
    range: number;
    selected: boolean;
}

interface ParetoResult {
    success: boolean;
    n_pareto_solutions: number;
    best_solution: number[];
    best_objectives: number[];
    hypervolume: number;
    convergence_rate: number;
    efficiency: number;
    pareto_front: number[][];
    selected_variables: string[];
    variable_details: VariableDetail[];
    variable_details_by_range: VariableDetail[];
    problem: {
        n_variables: number;
        n_objectives: number;
        n_solutions: number;
        iterations: number;
        n_selected: number;
    };
    plots: {
        convergence?: string;
        hypervolume?: string;
        pareto_front?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function ParetoOptimizationPage() {
    const { toast } = useToast();

    const [objectives, setObjectives] = useState<ObjectiveInput[]>([
        { id: '1', name: 'f1', function: 'x[0]**2 + x[1]**2', weight: '1.0' },
        { id: '2', name: 'f2', function: '(x[0]-1)**2 + (x[1]-1)**2', weight: '1.0' }
    ]);
    const [variables, setVariables] = useState<VariableInput[]>([
        { id: '1', name: 'x1', min_value: '-5', max_value: '5' },
        { id: '2', name: 'x2', min_value: '-5', max_value: '5' }
    ]);
    const [nSolutions, setNSolutions] = useState('100');
    const [nIterations, setNIterations] = useState('100');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ParetoResult | null>(null);

    const addObjective = () => {
        setObjectives(prev => [...prev, {
            id: Date.now().toString(),
            name: `f${prev.length + 1}`,
            function: 'x[0]**2',
            weight: '1.0'
        }]);
    };

    const removeObjective = (id: string) => {
        if (objectives.length > 2) {
            setObjectives(prev => prev.filter(obj => obj.id !== id));
        }
    };

    const addVariable = () => {
        setVariables(prev => [...prev, {
            id: Date.now().toString(),
            name: `x${prev.length + 1}`,
            min_value: '-5',
            max_value: '5'
        }]);
    };

    const removeVariable = (id: string) => {
        if (variables.length > 1) {
            setVariables(prev => prev.filter(variable => variable.id !== id));
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setObjectives(example.objectives.map((obj, i) => ({
            id: (i + 1).toString(),
            ...obj
        })));
        setVariables(example.variables.map((variable, i) => ({
            id: (i + 1).toString(),
            ...variable
        })));
        setNSolutions(example.n_solutions);
        setNIterations(example.n_iterations);
        setResult(null);
    };

    const handleOptimize = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedObjectives = objectives
                .filter(obj => obj.function)
                .map(obj => ({
                    name: obj.name,
                    function: obj.function,
                    weight: parseFloat(obj.weight) || 1.0
                }));

            const parsedVariables = variables
                .filter(variable => variable.min_value && variable.max_value)
                .map(variable => ({
                    name: variable.name,
                    min_value: parseFloat(variable.min_value),
                    max_value: parseFloat(variable.max_value)
                }));

            if (parsedObjectives.length < 2) {
                throw new Error("At least 2 objectives required for Pareto optimization.");
            }

            if (parsedVariables.length === 0) {
                throw new Error("Please provide at least one valid variable.");
            }

            const payload = {
                objectives: parsedObjectives,
                variables: parsedVariables,
                n_solutions: parseInt(nSolutions),
                n_iterations: parseInt(nIterations)
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/pareto-optimization`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Pareto optimization failed');
            }

            const res: ParetoResult = await response.json();
            setResult(res);

            toast({
                title: "Optimization Complete",
                description: `Found ${res.n_pareto_solutions} Pareto-optimal solutions`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const totalRange = variables.reduce((sum, variable) => {
        const min = parseFloat(variable.min_value) || 0;
        const max = parseFloat(variable.max_value) || 0;
        return sum + (max - min);
    }, 0);

    const avgRange = variables.length > 0 ? totalRange / variables.length : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <GitBranch className="w-6 h-6 text-primary" />
                    Pareto Optimization
                </h1>
                <p className="text-sm text-muted-foreground">
                    Multi-objective optimization to find Pareto-optimal trade-off solutions
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Multi-Objective Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Parameters & Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Solutions</Label>
                            <Input
                                type="number"
                                value={nSolutions}
                                onChange={e => setNSolutions(e.target.value)}
                                className="w-24 h-9 font-mono"
                                min="10"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Objectives</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => objectives.length > 2 && setObjectives(prev => prev.slice(0, -1))} disabled={objectives.length <= 2}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{objectives.length}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addObjective} disabled={objectives.length >= 5}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Variables</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => variables.length > 1 && setVariables(prev => prev.slice(0, -1))} disabled={variables.length <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{variables.length}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addVariable} disabled={variables.length >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
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

                    {/* Objectives Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Objective Functions (to minimize)</Label>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[20%]">Name</TableHead>
                                        <TableHead className="w-[50%]">Function</TableHead>
                                        <TableHead className="w-[20%]">Weight</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {objectives.map((objective, index) => (
                                        <TableRow key={objective.id}>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={objective.name}
                                                    onChange={e => setObjectives(produce(draft => { draft[index].name = e.target.value }))}
                                                    className="h-9 font-mono"
                                                    placeholder="f1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={objective.function}
                                                    onChange={e => setObjectives(produce(draft => { draft[index].function = e.target.value }))}
                                                    className="h-9 font-mono text-sm"
                                                    placeholder="x[0]**2 + x[1]**2"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={objective.weight}
                                                    onChange={e => setObjectives(produce(draft => { draft[index].weight = e.target.value }))}
                                                    className="h-9 w-16 font-mono"
                                                    step="0.1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-destructive/10"
                                                    onClick={() => removeObjective(objective.id)}
                                                    disabled={objectives.length <= 2}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Use Python/NumPy syntax. Variables: x[0], x[1], etc. Weight scales objective importance.
                        </p>
                    </div>

                    <Separator />

                    {/* Variables Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Variables</Label>
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
                                    {variables.map((variable, index) => {
                                        const min = parseFloat(variable.min_value) || 0;
                                        const max = parseFloat(variable.max_value) || 0;
                                        const range = max - min;
                                        return (
                                            <TableRow key={variable.id}>
                                                <TableCell className="p-1">
                                                    <Input
                                                        value={variable.name}
                                                        onChange={e => setVariables(produce(draft => { draft[index].name = e.target.value }))}
                                                        className="h-9"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={variable.min_value}
                                                        onChange={e => setVariables(produce(draft => { draft[index].min_value = e.target.value }))}
                                                        className="h-9 w-20 font-mono"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={variable.max_value}
                                                        onChange={e => setVariables(produce(draft => { draft[index].max_value = e.target.value }))}
                                                        className="h-9 w-20 font-mono"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                                    {range.toFixed(1)}
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-destructive/10"
                                                        onClick={() => removeVariable(variable.id)}
                                                        disabled={variables.length <= 1}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Range = Max - Min
                        </p>
                    </div>

                    <Separator />

                    {/* Pareto Parameters */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Optimization Parameters</Label>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Iterations</Label>
                                <Input
                                    type="number"
                                    value={nIterations}
                                    onChange={e => setNIterations(e.target.value)}
                                    className="h-9 font-mono"
                                    min="10"
                                />
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleOptimize} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Find Pareto Front</>
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
                                        <p className="text-xs text-muted-foreground mb-1">Pareto Solutions</p>
                                        <p className="text-lg font-semibold font-mono">{result.n_pareto_solutions}</p>
                                    </div>
                                    <Target className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Hypervolume</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.hypervolume.toFixed(2)}
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
                                        <p className="text-xs text-muted-foreground mb-1">Convergence</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.convergence_rate.toFixed(2)}%
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
                                        <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                                        <p className={`text-lg font-semibold ${result.efficiency >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {result.efficiency.toFixed(1)}%
                                        </p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Best Compromise Solution */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Best Compromise Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Variable Values</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.best_solution.map((value, index) => (
                                        <Badge key={index} variant="default" className="text-sm">
                                            {result.variable_details[index]?.name || `x${index}`} = {value.toFixed(4)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Objective Values</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.best_objectives.map((value, index) => (
                                        <Badge key={index} variant="secondary" className="text-sm">
                                            f{index + 1} = {value.toFixed(4)}
                                        </Badge>
                                    ))}
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
                                    Pareto Analysis
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
                                <Tabs defaultValue="pareto" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.pareto_front && (
                                            <TabsTrigger value="pareto" className="text-xs">Pareto Front</TabsTrigger>
                                        )}
                                        {result.plots.convergence && (
                                            <TabsTrigger value="convergence" className="text-xs">Convergence</TabsTrigger>
                                        )}
                                        {result.plots.hypervolume && (
                                            <TabsTrigger value="hypervolume" className="text-xs">Hypervolume</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.pareto_front && (
                                        <TabsContent value="pareto" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.pareto_front}`}
                                                    alt="Pareto Front"
                                                    width={800}
                                                    height={600}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Trade-off surface showing all Pareto-optimal solutions
                                            </p>
                                        </TabsContent>
                                    )}

                                    {result.plots.convergence && (
                                        <TabsContent value="convergence" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.convergence}`}
                                                    alt="Convergence Plot"
                                                    width={800}
                                                    height={400}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.hypervolume && (
                                        <TabsContent value="hypervolume" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.hypervolume}`}
                                                    alt="Hypervolume"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Hypervolume indicator showing solution set quality over iterations
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