'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Users, Trash2 } from 'lucide-react';
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
        objective_function: 'np.sum(x**2)',
        particles: '30',
        iterations: '100',
        inertia: '0.5',
        cognitive: '1.5',
        social: '1.5',
        variables: [
            { name: 'x1', min_value: '-10', max_value: '10' },
            { name: 'x2', min_value: '-10', max_value: '10' }
        ]
    },
    {
        name: 'Rosenbrock',
        objective_function: 'np.sum(100.0 * (x[1:] - x[:-1]**2)**2 + (1 - x[:-1])**2)',
        particles: '50',
        iterations: '200',
        inertia: '0.7',
        cognitive: '2.0',
        social: '2.0',
        variables: [
            { name: 'x1', min_value: '-5', max_value: '5' },
            { name: 'x2', min_value: '-5', max_value: '5' }
        ]
    },
    {
        name: 'Ackley',
        objective_function: '-20 * np.exp(-0.2 * np.sqrt(0.5 * np.sum(x**2))) - np.exp(0.5 * np.sum(np.cos(2 * np.pi * x))) + np.e + 20',
        particles: '40',
        iterations: '150',
        inertia: '0.6',
        cognitive: '1.8',
        social: '1.8',
        variables: [
            { name: 'x1', min_value: '-15', max_value: '15' },
            { name: 'x2', min_value: '-15', max_value: '15' },
            { name: 'x3', min_value: '-15', max_value: '15' }
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
    name: str;
    min_value: number;
    max_value: number;
    optimal_value: number;
    range: number;
    selected: boolean;
}

interface PSOResult {
    success: boolean;
    best_fitness: number;
    convergence_rate: number;
    swarm_diversity: number;
    efficiency: number;
    best_solution: number[];
    selected_variables: string[];
    variable_details: VariableDetail[];
    variable_details_by_range: VariableDetail[];
    problem: {
        n_variables: number;
        iterations: number;
        n_selected: number;
    };
    plots: {
        convergence?: string;
        swarm_behavior?: string;
        solution_space?: string;
        particle_trajectories?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function ParticleSwarmOptimizationPage() {
    const { toast } = useToast();

    const [objectiveFunction, setObjectiveFunction] = useState('np.sum(x**2)');
    const [particles, setParticles] = useState('30');
    const [iterations, setIterations] = useState('100');
    const [inertia, setInertia] = useState('0.5');
    const [cognitive, setCognitive] = useState('1.5');
    const [social, setSocial] = useState('1.5');
    const [variables, setVariables] = useState<VariableInput[]>([
        { id: '1', name: 'x1', min_value: '-10', max_value: '10' },
        { id: '2', name: 'x2', min_value: '-10', max_value: '10' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PSOResult | null>(null);

    const addVariable = () => {
        setVariables(prev => [...prev, {
            id: Date.now().toString(),
            name: `x${prev.length + 1}`,
            min_value: '-10',
            max_value: '10'
        }]);
    };

    const removeVariable = (id: string) => {
        if (variables.length > 1) {
            setVariables(prev => prev.filter(variable => variable.id !== id));
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_FUNCTIONS[0]) => {
        setObjectiveFunction(example.objective_function);
        setParticles(example.particles);
        setIterations(example.iterations);
        setInertia(example.inertia);
        setCognitive(example.cognitive);
        setSocial(example.social);
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
                n_particles: parseInt(particles),
                n_iterations: parseInt(iterations),
                inertia_weight: parseFloat(inertia),
                cognitive_coeff: parseFloat(cognitive),
                social_coeff: parseFloat(social)
            };

            if (isNaN(payload.n_particles) || payload.n_particles <= 0) {
                throw new Error("Number of particles must be a positive integer.");
            }

            if (isNaN(payload.n_iterations) || payload.n_iterations <= 0) {
                throw new Error("Iterations must be a positive integer.");
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/particle-swarm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Particle swarm optimization failed');
            }

            const res: PSOResult = await response.json();
            setResult(res);

            toast({
                title: "Optimization Complete",
                description: `Best fitness: ${res.best_fitness.toFixed(4)} in ${res.problem.iterations} iterations`
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
                    <Users className="w-6 h-6 text-primary" />
                    Particle Swarm Optimization: Swarm Intelligence
                </h1>
                <p className="text-sm text-muted-foreground">
                    Find optimal solutions using collective intelligence and social behavior of particle swarms
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Swarm Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Parameters & Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Particles</Label>
                            <Input
                                type="number"
                                value={particles}
                                onChange={e => setParticles(e.target.value)}
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
                            placeholder="e.g., np.sum(x**2) or x[0]**2 + x[1]**2"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use Python/NumPy syntax. Variables are accessible as x[0], x[1], etc. Function will be minimized.
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
                            Range = Max Value - Min Value (larger ranges require more particles for exploration)
                        </p>
                    </div>

                    <Separator />

                    {/* PSO Parameters */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Iterations</Label>
                            <Input
                                type="number"
                                value={iterations}
                                onChange={e => setIterations(e.target.value)}
                                className="h-9 font-mono"
                                min="10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Inertia (w)</Label>
                            <Input
                                type="number"
                                value={inertia}
                                onChange={e => setInertia(e.target.value)}
                                className="h-9 font-mono"
                                min="0"
                                max="2"
                                step="0.1"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Cognitive (c1)</Label>
                            <Input
                                type="number"
                                value={cognitive}
                                onChange={e => setCognitive(e.target.value)}
                                className="h-9 font-mono"
                                min="0"
                                max="4"
                                step="0.1"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Social (c2)</Label>
                            <Input
                                type="number"
                                value={social}
                                onChange={e => setSocial(e.target.value)}
                                className="h-9 font-mono"
                                min="0"
                                max="4"
                                step="0.1"
                            />
                        </div>
                    </div>

                    <Button onClick={handleOptimize} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Optimize Swarm</>
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
                                        <p className="text-xs text-muted-foreground mb-1">Swarm Diversity</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.swarm_diversity.toFixed(2)}
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
                                    Swarm Analysis
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
                                        {result.plots.swarm_behavior && (
                                            <TabsTrigger value="behavior" className="text-xs">Swarm Behavior</TabsTrigger>
                                        )}
                                        {result.plots.solution_space && (
                                            <TabsTrigger value="solution" className="text-xs">Solution Space</TabsTrigger>
                                        )}
                                        {result.plots.particle_trajectories && (
                                            <TabsTrigger value="trajectories" className="text-xs">Particle Trajectories</TabsTrigger>
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

                                    {result.plots.swarm_behavior && (
                                        <TabsContent value="behavior" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.swarm_behavior}`}
                                                    alt="Swarm Behavior"
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

                                    {result.plots.particle_trajectories && (
                                        <TabsContent value="trajectories" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.particle_trajectories}`}
                                                    alt="Particle Trajectories"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Movement paths of particles throughout the optimization process
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


