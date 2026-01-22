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

const EXAMPLE_FUNCTIONS = [
    {
        name: 'Sphere',
        objective_function: 'sum(x**2)',
        pop_size: '50',
        generations: '100',
        mutation_rate: '0.01',
        variables: [
            { name: 'x1', min_value: '-5', max_value: '5' },
            { name: 'x2', min_value: '-5', max_value: '5' }
        ]
    },
    {
        name: 'Rosenbrock',
        objective_function: 'sum(100 * (x[1:] - x[:-1]**2)**2 + (1 - x[:-1])**2)',
        pop_size: '100',
        generations: '200',
        mutation_rate: '0.02',
        variables: [
            { name: 'x1', min_value: '-2', max_value: '2' },
            { name: 'x2', min_value: '-1', max_value: '3' }
        ]
    },
    {
        name: 'Rastrigin',
        objective_function: '10 * len(x) + sum(x**2 - 10 * np.cos(2 * np.pi * x))',
        pop_size: '80',
        generations: '150',
        mutation_rate: '0.05',
        variables: [
            { name: 'x1', min_value: '-5', max_value: '5' },
            { name: 'x2', min_value: '-5', max_value: '5' },
            { name: 'x3', min_value: '-5', max_value: '5' }
        ]
    },
];

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

interface GAResult {
    success: boolean;
    best_fitness: number;
    convergence_rate: number;
    population_diversity: number;
    efficiency: number;
    best_solution: number[];
    selected_variables: string[];
    variable_details: VariableDetail[];
    variable_details_by_range: VariableDetail[];
    problem: {
        n_variables: number;
        generations: number;
        n_selected: number;
    };
    plots: {
        convergence?: string;
        fitness_distribution?: string;
        solution_space?: string;
        population_evolution?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function GeneticAlgorithmPage() {
    const { toast } = useToast();

    const [objectiveFunction, setObjectiveFunction] = useState('sum(x**2)');
    const [popSize, setPopSize] = useState('50');
    const [generations, setGenerations] = useState('100');
    const [mutationRate, setMutationRate] = useState('0.01');
    const [variables, setVariables] = useState<VariableInput[]>([
        { id: '1', name: 'x1', min_value: '-5', max_value: '5' },
        { id: '2', name: 'x2', min_value: '-5', max_value: '5' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GAResult | null>(null);

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

    const handleExampleSelect = (example: typeof EXAMPLE_FUNCTIONS[0]) => {
        setObjectiveFunction(example.objective_function);
        setPopSize(example.pop_size);
        setGenerations(example.generations);
        setMutationRate(example.mutation_rate);
        setVariables(example.variables.map((variable, i) => ({
            id: (i + 1).toString(),
            ...variable
        })));
        setResult(null);
    };

    const handleOptimize = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedVariables = variables
                .filter(variable => variable.min_value && variable.max_value)
                .map(variable => ({
                    name: variable.name,
                    min_value: parseFloat(variable.min_value),
                    max_value: parseFloat(variable.max_value)
                }));

            if (parsedVariables.length === 0) {
                throw new Error("Please provide at least one valid variable.");
            }

            const payload = {
                objective_function: objectiveFunction,
                variables: parsedVariables,
                population_size: parseInt(popSize),
                generations: parseInt(generations),
                mutation_rate: parseFloat(mutationRate)
            };

            if (isNaN(payload.population_size) || payload.population_size <= 0) {
                throw new Error("Population size must be a positive integer.");
            }

            if (isNaN(payload.generations) || payload.generations <= 0) {
                throw new Error("Generations must be a positive integer.");
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/genetic-algorithm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Genetic algorithm optimization failed');
            }

            const res: GAResult = await response.json();
            setResult(res);

            toast({
                title: "Optimization Complete",
                description: `Best fitness: ${res.best_fitness.toFixed(4)} in ${res.problem.generations} generations`
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
                    Genetic Algorithm: Global Optimization
                </h1>
                <p className="text-sm text-muted-foreground">
                    Find optimal solutions using evolutionary computation and natural selection principles
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Parameters & Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Population Size</Label>
                            <Input
                                type="number"
                                value={popSize}
                                onChange={e => setPopSize(e.target.value)}
                                className="w-32 h-9 font-mono"
                                min="10"
                            />
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

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Total Range: {totalRange.toFixed(1)}</span>
                            <span>•</span>
                            <span>Avg Range: {avgRange.toFixed(1)}</span>
                        </div>

                        <div className="flex-1" />

                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_FUNCTIONS.map(ex => (
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

                    {/* Objective Function */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Objective Function</Label>
                        <Input
                            value={objectiveFunction}
                            onChange={e => setObjectiveFunction(e.target.value)}
                            className="font-mono"
                            placeholder="e.g., sum(x**2) or x[0]**2 + x[1]**2"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use Python syntax with numpy functions. Variables are accessible as x[0], x[1], etc.
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
                                                        className="h-8 w-8"
                                                        onClick={() => removeVariable(variable.id)}
                                                        disabled={variables.length <= 1}
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
                            Range = Max Value - Min Value (larger ranges allow more exploration)
                        </p>
                    </div>

                    <Separator />

                    {/* GA Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Generations</Label>
                            <Input
                                type="number"
                                value={generations}
                                onChange={e => setGenerations(e.target.value)}
                                className="h-9 font-mono"
                                min="10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Mutation Rate</Label>
                            <Input
                                type="number"
                                value={mutationRate}
                                onChange={e => setMutationRate(e.target.value)}
                                className="h-9 font-mono"
                                min="0"
                                max="1"
                                step="0.001"
                            />
                        </div>
                    </div>

                    <Button onClick={handleOptimize} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Optimize Function</>
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
                                        <p className="text-lg font-semibold font-mono">{result.best_fitness.toFixed(6)}</p>
                                    </div>
                                    <Target className="w-4 h-4 text-primary" />
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
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Diversity</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.population_diversity.toFixed(2)}
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

                    {/* Optimal Solution */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Optimal Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Optimal Values</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.best_solution.map((value, index) => (
                                        <Badge key={index} variant="default" className="text-sm">
                                            x{index + 1} = {value.toFixed(4)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Variable Details</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.variable_details.map((variable, i) => (
                                            <div key={i} className={`flex items-center justify-between text-sm ${variable.selected ? 'font-medium' : 'text-muted-foreground'}`}>
                                                <span className="flex items-center gap-1">
                                                    {variable.selected && <span className="text-green-500">✓</span>}
                                                    {variable.name}
                                                </span>
                                                <span className="font-mono text-xs">
                                                    {variable.optimal_value.toFixed(4)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">By Range</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {result.variable_details_by_range.map((variable, i) => (
                                            <div key={i} className={`flex items-center justify-between text-sm ${variable.selected ? 'font-medium' : 'text-muted-foreground'}`}>
                                                <span className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                                                    {variable.name}
                                                </span>
                                                <span className="font-mono text-xs">
                                                    {variable.range.toFixed(1)}
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
                                    Optimization Analysis
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
                                <Tabs defaultValue="convergence" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.convergence && (
                                            <TabsTrigger value="convergence" className="text-xs">Convergence</TabsTrigger>
                                        )}
                                        {result.plots.fitness_distribution && (
                                            <TabsTrigger value="distribution" className="text-xs">Fitness Distribution</TabsTrigger>
                                        )}
                                        {result.plots.solution_space && (
                                            <TabsTrigger value="solution" className="text-xs">Solution Space</TabsTrigger>
                                        )}
                                        {result.plots.population_evolution && (
                                            <TabsTrigger value="evolution" className="text-xs">Population Evolution</TabsTrigger>
                                        )}
                                    </TabsList>

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

                                    {result.plots.fitness_distribution && (
                                        <TabsContent value="distribution" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.fitness_distribution}`}
                                                    alt="Fitness Distribution"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.solution_space && (
                                        <TabsContent value="solution" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.solution_space}`}
                                                    alt="Solution Space"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.population_evolution && (
                                        <TabsContent value="evolution" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.population_evolution}`}
                                                    alt="Population Evolution"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Population diversity and evolution over generations
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

