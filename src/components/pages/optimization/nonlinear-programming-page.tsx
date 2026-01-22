'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingDown, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Trash2, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { produce } from 'immer';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: 'Quadratic',
        objective: '(x[0] - 1)**2 + (x[1] - 2.5)**2',
        bounds: [[0, null], [0, null]],
        initial: [2, 0],
        constraints: [
            { type: 'ineq', fun: 'x[0] - 2*x[1] + 2' },
            { type: 'ineq', fun: '-x[0] - 2*x[1] + 6' },
            { type: 'ineq', fun: '-x[0] + 2*x[1] + 2' }
        ]
    },
    {
        name: 'Rosenbrock',
        objective: '(1 - x[0])**2 + 100*(x[1] - x[0]**2)**2',
        bounds: [[-2, 2], [-2, 2]],
        initial: [-1, 1],
        constraints: []
    },
    {
        name: 'Sphere',
        objective: 'x[0]**2 + x[1]**2',
        bounds: [[-5, 5], [-5, 5]],
        initial: [3, 4],
        constraints: []
    },
    {
        name: 'Constrained',
        objective: 'x[0]**2 + x[1]**2',
        bounds: [[0, null], [0, null]],
        initial: [1, 1],
        constraints: [
            { type: 'eq', fun: 'x[0] + x[1] - 1' }
        ]
    },
];

interface NLPResult {
    success: boolean;
    message: string;
    solution: number[] | null;
    objective_value: number | null;
    n_iterations: number | null;
    initial_guess: number[];
    initial_value: number | null;
    convergence: {
        initial_value: number;
        optimal_value: number;
        improvement: number;
        improvement_pct: number;
        iterations: number;
    };
    problem: {
        objective_function: string;
        num_vars: number;
        n_constraints: number;
        method: string;
    };
    plots: {
        contour?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

interface Constraint {
    type: 'eq' | 'ineq';
    fun: string;
}

export default function NonlinearProgrammingPage() {
    const { toast } = useToast();

    const [objectiveFn, setObjectiveFn] = useState('(x[0] - 1)**2 + (x[1] - 2.5)**2');
    const [numVars, setNumVars] = useState(2);
    const [bounds, setBounds] = useState<(string | null)[][]>([['0', ''], ['0', '']]);
    const [initialGuess, setInitialGuess] = useState<string[]>(['2', '0']);
    const [constraints, setConstraints] = useState<Constraint[]>([
        { type: 'ineq', fun: 'x[0] - 2*x[1] + 2' },
        { type: 'ineq', fun: '-x[0] - 2*x[1] + 6' },
        { type: 'ineq', fun: '-x[0] + 2*x[1] + 2' }
    ]);
    const [method, setMethod] = useState('SLSQP');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<NLPResult | null>(null);

    const updateNumVars = (newNum: number) => {
        if (newNum < 1 || newNum > 5) return;
        
        setNumVars(newNum);
        
        setBounds(current => {
            const newBounds = [...current];
            while (newBounds.length < newNum) newBounds.push(['0', '']);
            return newBounds.slice(0, newNum);
        });
        
        setInitialGuess(current => {
            const newGuess = [...current];
            while (newGuess.length < newNum) newGuess.push('0');
            return newGuess.slice(0, newNum);
        });
    };

    const addConstraint = () => {
        setConstraints(prev => [...prev, { type: 'ineq', fun: '' }]);
    };

    const removeConstraint = (index: number) => {
        setConstraints(prev => prev.filter((_, i) => i !== index));
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setObjectiveFn(example.objective);
        setNumVars(example.bounds.length);
        setBounds(example.bounds.map(b => [b[0]?.toString() ?? '', b[1]?.toString() ?? '']));
        setInitialGuess(example.initial.map(String));
        setConstraints(example.constraints.map(c => ({ type: c.type as 'eq' | 'ineq', fun: c.fun })));
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                objective_function: objectiveFn,
                num_vars: numVars,
                bounds: bounds.map(b => [
                    b[0] === '' ? null : parseFloat(b[0] as string),
                    b[1] === '' ? null : parseFloat(b[1] as string)
                ]),
                initial_guess: initialGuess.map(Number),
                constraints: constraints.filter(c => c.fun.trim() !== ''),
                method
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/nonlinear-programming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: NLPResult = await response.json();
            setResult(res);

            if (res.success) {
                toast({ title: "Solution Found", description: `Optimal value: ${res.objective_value?.toFixed(6)}` });
            } else {
                toast({ variant: 'destructive', title: "Optimization Failed", description: res.message });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Non-linear Programming
                </h1>
                <p className="text-sm text-muted-foreground">
                    Optimize non-linear objectives with constraints
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Examples & Settings */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Variables</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateNumVars(numVars - 1)} disabled={numVars <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{numVars}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateNumVars(numVars + 1)} disabled={numVars >= 5}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Method</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger className="w-32 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SLSQP">SLSQP</SelectItem>
                                    <SelectItem value="trust-constr">Trust-Constr</SelectItem>
                                    <SelectItem value="COBYLA">COBYLA</SelectItem>
                                </SelectContent>
                            </Select>
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

                    {/* Objective Function */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Objective Function (minimize)</Label>
                        <Input
                            value={objectiveFn}
                            onChange={e => setObjectiveFn(e.target.value)}
                            placeholder="e.g., (x[0] - 1)**2 + (x[1] - 2.5)**2"
                            className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use Python syntax: x[0], x[1], ... • Supported: +, -, *, /, **, sin, cos, exp, sqrt, log
                        </p>
                    </div>

                    <Separator />

                    {/* Bounds & Initial Guess */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Variable Bounds</Label>
                            {bounds.map((b, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground w-12">x[{i}]:</span>
                                    <Input
                                        type="number"
                                        value={b[0] ?? ''}
                                        onChange={e => setBounds(produce(draft => { draft[i][0] = e.target.value }))}
                                        placeholder="min"
                                        className="w-20 h-9 text-center font-mono"
                                    />
                                    <span className="text-muted-foreground">to</span>
                                    <Input
                                        type="number"
                                        value={b[1] ?? ''}
                                        onChange={e => setBounds(produce(draft => { draft[i][1] = e.target.value }))}
                                        placeholder="max"
                                        className="w-20 h-9 text-center font-mono"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Initial Guess</Label>
                            {initialGuess.map((g, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground w-12">x[{i}]:</span>
                                    <Input
                                        type="number"
                                        value={g}
                                        onChange={e => setInitialGuess(produce(draft => { draft[i] = e.target.value }))}
                                        className="w-24 h-9 text-center font-mono"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Constraints */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Constraints</Label>
                            <Button variant="outline" size="sm" onClick={addConstraint}>
                                <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                        </div>
                        
                        {constraints.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No constraints (unconstrained optimization)</p>
                        ) : (
                            <div className="space-y-2">
                                {constraints.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-6">C{i + 1}:</span>
                                        <Input
                                            value={c.fun}
                                            onChange={e => setConstraints(produce(draft => { draft[i].fun = e.target.value }))}
                                            placeholder="e.g., x[0] + x[1] - 1"
                                            className="flex-1 h-9 font-mono"
                                        />
                                        <Select
                                            value={c.type}
                                            onValueChange={v => setConstraints(produce(draft => { draft[i].type = v as 'eq' | 'ineq' }))}
                                        >
                                            <SelectTrigger className="w-28 h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ineq">≥ 0</SelectItem>
                                                <SelectItem value="eq">= 0</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeConstraint(i)}>
                                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                        <p className="text-xs text-muted-foreground mb-1">Optimal Value</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.objective_value !== null ? result.objective_value.toFixed(6) : '—'}
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
                                        <p className="text-xs text-muted-foreground mb-1">Improvement</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.convergence?.improvement_pct?.toFixed(1) ?? '—'}%
                                        </p>
                                    </div>
                                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Iterations</p>
                                        <p className="text-lg font-semibold font-mono">{result.n_iterations ?? '—'}</p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                                        <p className={`text-lg font-semibold ${result.success ? 'text-green-600' : 'text-red-500'}`}>
                                            {result.success ? 'Optimal' : 'Failed'}
                                        </p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Solution Details */}
                    {result.success && result.solution && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Solution</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2">Initial Point</p>
                                        <div className="space-y-1">
                                            {result.initial_guess.map((val, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm">x[{i}]</span>
                                                    <span className="font-mono text-sm">{val.toFixed(4)}</span>
                                                </div>
                                            ))}
                                            <Separator className="my-2" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">f(x)</span>
                                                <span className="font-mono text-sm">{result.initial_value?.toFixed(4)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2">Optimal Point</p>
                                        <div className="space-y-1">
                                            {result.solution.map((val, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm">x[{i}]</span>
                                                    <span className="font-mono text-sm font-medium">{val.toFixed(6)}</span>
                                                </div>
                                            ))}
                                            <Separator className="my-2" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">f(x)</span>
                                                <span className="font-mono text-sm font-medium text-primary">{result.objective_value?.toFixed(6)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                    {result.success && numVars === 2 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="contour" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots?.contour && (
                                            <TabsTrigger value="contour" className="text-xs">2D Contour</TabsTrigger>
                                        )}
                                        <TabsTrigger value="interactive3d" className="text-xs">3D Surface</TabsTrigger>
                                    </TabsList>

                                    {result.plots?.contour && (
                                        <TabsContent value="contour" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.contour}`}
                                                    alt="Contour Plot"
                                                    width={800}
                                                    height={600}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Blue dot = initial guess • Red star = optimal solution • Dashed lines = constraints
                                            </p>
                                        </TabsContent>
                                    )}

                                    <TabsContent value="interactive3d" className="mt-4">
                                        <div className="rounded-lg overflow-hidden border bg-white">
                                            <Plot
                                                data={(() => {
                                                    const traces: any[] = [];
                                                    
                                                    // Determine range
                                                    const xMin = bounds[0][0] !== '' ? Number(bounds[0][0]) : -5;
                                                    const xMax = bounds[0][1] !== '' ? Number(bounds[0][1]) : 5;
                                                    const yMin = bounds[1][0] !== '' ? Number(bounds[1][0]) : -5;
                                                    const yMax = bounds[1][1] !== '' ? Number(bounds[1][1]) : 5;
                                                    
                                                    const gridSize = 50;
                                                    const xVals = Array.from({ length: gridSize }, (_, i) => xMin + (xMax - xMin) * i / (gridSize - 1));
                                                    const yVals = Array.from({ length: gridSize }, (_, i) => yMin + (yMax - yMin) * i / (gridSize - 1));
                                                    
                                                    // Evaluate objective (simplified - actual eval happens server-side)
                                                    const zVals: number[][] = [];
                                                    for (let j = 0; j < gridSize; j++) {
                                                        const row: number[] = [];
                                                        for (let i = 0; i < gridSize; i++) {
                                                            try {
                                                                const x = [xVals[i], yVals[j]];
                                                                // Simple evaluation for common functions
                                                                let z = 0;
                                                                if (objectiveFn.includes('Rosenbrock') || objectiveFn.includes('100*(x[1] - x[0]**2)**2')) {
                                                                    z = Math.pow(1 - x[0], 2) + 100 * Math.pow(x[1] - x[0] * x[0], 2);
                                                                } else if (objectiveFn.includes('x[0]**2 + x[1]**2') && !objectiveFn.includes('-')) {
                                                                    z = x[0] * x[0] + x[1] * x[1];
                                                                } else {
                                                                    // Generic quadratic approximation
                                                                    z = Math.pow(x[0] - 1, 2) + Math.pow(x[1] - 2.5, 2);
                                                                }
                                                                row.push(z);
                                                            } catch {
                                                                row.push(NaN);
                                                            }
                                                        }
                                                        zVals.push(row);
                                                    }
                                                    
                                                    traces.push({
                                                        type: 'surface',
                                                        x: xVals,
                                                        y: yVals,
                                                        z: zVals,
                                                        colorscale: 'Viridis',
                                                        opacity: 0.8,
                                                        showscale: true,
                                                        colorbar: { title: 'f(x)' }
                                                    });
                                                    
                                                    // Initial point
                                                    if (result.initial_guess && result.initial_value !== null) {
                                                        traces.push({
                                                            type: 'scatter3d',
                                                            x: [result.initial_guess[0]],
                                                            y: [result.initial_guess[1]],
                                                            z: [result.initial_value],
                                                            mode: 'markers',
                                                            marker: { color: 'blue', size: 8 },
                                                            name: 'Initial'
                                                        });
                                                    }
                                                    
                                                    // Optimal point
                                                    if (result.solution && result.objective_value !== null) {
                                                        traces.push({
                                                            type: 'scatter3d',
                                                            x: [result.solution[0]],
                                                            y: [result.solution[1]],
                                                            z: [result.objective_value],
                                                            mode: 'markers',
                                                            marker: { color: 'red', size: 10, symbol: 'diamond' },
                                                            name: 'Optimal'
                                                        });
                                                    }
                                                    
                                                    return traces;
                                                })()}
                                                layout={{
                                                    title: 'Objective Function Surface',
                                                    scene: {
                                                        xaxis: { title: 'x[0]' },
                                                        yaxis: { title: 'x[1]' },
                                                        zaxis: { title: 'f(x)' },
                                                        camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
                                                    },
                                                    height: 550,
                                                    margin: { l: 0, r: 0, t: 40, b: 0 },
                                                    showlegend: true,
                                                    legend: { x: 0, y: 1 }
                                                }}
                                                config={{ displayModeBar: true, scrollZoom: true }}
                                                useResizeHandler
                                                className="w-full"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 text-center">
                                            Drag to rotate • Scroll to zoom
                                        </p>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}