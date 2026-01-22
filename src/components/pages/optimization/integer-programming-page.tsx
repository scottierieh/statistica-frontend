'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Hash } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { produce } from 'immer';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: 'Knapsack',
        c: [5, 4, 3],
        A: [[2, 3, 1]],
        b: [5],
        types: ['<='],
        varTypes: ['binary', 'binary', 'binary'],
        objective: 'maximize'
    },
    {
        name: 'Assignment',
        c: [3, 5],
        A: [[1, 0], [0, 1], [1, 1]],
        b: [4, 6, 8],
        types: ['<=', '<=', '<='],
        varTypes: ['integer', 'integer'],
        objective: 'maximize'
    },
    {
        name: 'Production',
        c: [10, 15],
        A: [[1, 2], [3, 2], [1, 0]],
        b: [10, 15, 4],
        types: ['<=', '<=', '<='],
        varTypes: ['integer', 'integer'],
        objective: 'maximize'
    },
    {
        name: 'Mixed',
        c: [2, 3],
        A: [[1, 1], [2, 1]],
        b: [6, 8],
        types: ['<=', '<='],
        varTypes: ['integer', 'continuous'],
        objective: 'maximize'
    },
];

interface IPResult {
    success: boolean;
    status: string;
    optimal_value: number | null;
    solution: number[] | null;
    slack: number[] | null;
    binding_constraints: boolean[] | null;
    problem: {
        objective: string;
        objective_function: string;
        constraints: string[];
        n_variables: number;
        n_constraints: number;
        variable_types: string[];
    };
    plots: {
        feasible_region?: string;
        sensitivity?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function IntegerProgrammingPage() {
    const { toast } = useToast();
    
    const [objective, setObjective] = useState<'maximize' | 'minimize'>('maximize');
    const [c, setC] = useState<string[]>(['5', '4', '3']);
    const [A, setA] = useState<string[][]>([['2', '3', '1']]);
    const [b, setB] = useState<string[]>(['5']);
    const [constraintTypes, setConstraintTypes] = useState<string[]>(['<=']);
    const [variableTypes, setVariableTypes] = useState<string[]>(['binary', 'binary', 'binary']);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<IPResult | null>(null);

    const numVars = c.length;
    const numConstraints = A.length;

    const updateDimensions = (newVars: number, newConstraints: number) => {
        setC(current => {
            const newC = [...current];
            while (newC.length < newVars) newC.push('0');
            return newC.slice(0, newVars);
        });

        setB(current => {
            const newB = [...current];
            while (newB.length < newConstraints) newB.push('0');
            return newB.slice(0, newConstraints);
        });

        setConstraintTypes(current => {
            const newTypes = [...current];
            while (newTypes.length < newConstraints) newTypes.push('<=');
            return newTypes.slice(0, newConstraints);
        });

        setVariableTypes(current => {
            const newTypes = [...current];
            while (newTypes.length < newVars) newTypes.push('continuous');
            return newTypes.slice(0, newVars);
        });

        setA(current => {
            return produce(current, draft => {
                while (draft.length < newConstraints) {
                    draft.push(Array(current[0]?.length || newVars).fill('0'));
                }
                if (draft.length > newConstraints) draft.splice(newConstraints);

                draft.forEach(row => {
                    while (row.length < newVars) row.push('0');
                    if (row.length > newVars) row.splice(newVars);
                });
            });
        });
    };

    const addVariable = () => {
        if (numVars < 6) updateDimensions(numVars + 1, numConstraints);
    };

    const removeVariable = () => {
        if (numVars > 1) updateDimensions(numVars - 1, numConstraints);
    };

    const addConstraint = () => {
        if (numConstraints < 10) updateDimensions(numVars, numConstraints + 1);
    };

    const removeConstraint = () => {
        if (numConstraints > 1) updateDimensions(numVars, numConstraints - 1);
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setC(example.c.map(String));
        setA(example.A.map(row => row.map(String)));
        setB(example.b.map(String));
        setConstraintTypes(example.types);
        setVariableTypes(example.varTypes);
        setObjective(example.objective as 'maximize' | 'minimize');
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                c: c.map(Number),
                A: A.map(row => row.map(Number)),
                b: b.map(Number),
                constraint_types: constraintTypes,
                objective,
                variable_types: variableTypes,
            };

            if (payload.c.some(isNaN) || payload.b.some(isNaN) || payload.A.flat().some(isNaN)) {
                throw new Error("All inputs must be valid numbers.");
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/integer-programming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: IPResult = await response.json();
            setResult(res);

            if (res.success) {
                toast({ title: "Solution Found", description: `Optimal value: ${res.optimal_value?.toFixed(4)}` });
            } else {
                toast({ variant: 'destructive', title: "No Solution", description: res.status });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const getVariableTypeColor = (vt: string) => {
        switch (vt) {
            case 'binary': return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'integer': return 'bg-blue-100 text-blue-700 border-blue-300';
            default: return 'bg-green-100 text-green-700 border-green-300';
        }
    };

    const getVariableTypeLabel = (vt: string) => {
        switch (vt) {
            case 'binary': return 'BIN';
            case 'integer': return 'INT';
            default: return 'CONT';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Hash className="w-6 h-6 text-primary" />
                    Integer Programming
                </h1>
                <p className="text-sm text-muted-foreground">
                    Solve optimization problems with integer and binary variables
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Objective & Dimension Controls */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Objective</Label>
                            <Select value={objective} onValueChange={(v) => setObjective(v as 'maximize' | 'minimize')}>
                                <SelectTrigger className="w-32 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="maximize">Maximize</SelectItem>
                                    <SelectItem value="minimize">Minimize</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Variables</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={removeVariable} disabled={numVars <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{numVars}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addVariable} disabled={numVars >= 6}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Constraints</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={removeConstraint} disabled={numConstraints <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{numConstraints}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addConstraint} disabled={numConstraints >= 10}>
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

                    {/* Objective Function with Variable Types */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Objective Function & Variable Types</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-muted-foreground">
                                {objective === 'maximize' ? 'max' : 'min'} Z =
                            </span>
                            {c.map((val, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="text-muted-foreground">+</span>}
                                    <div className="flex flex-col items-center gap-1">
                                        <Input
                                            type="number"
                                            value={val}
                                            onChange={e => setC(produce(draft => { draft[i] = e.target.value }))}
                                            className="w-16 h-9 text-center font-mono"
                                        />
                                        <span className="text-sm">x<sub>{i + 1}</sub></span>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Variable Type Selectors */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {variableTypes.map((vt, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">x<sub>{i + 1}</sub>:</span>
                                    <Select
                                        value={vt}
                                        onValueChange={val => setVariableTypes(produce(draft => { draft[i] = val }))}
                                    >
                                        <SelectTrigger className={`w-24 h-7 text-xs ${getVariableTypeColor(vt)}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="continuous">Continuous</SelectItem>
                                            <SelectItem value="integer">Integer</SelectItem>
                                            <SelectItem value="binary">Binary</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Constraints */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Constraints</Label>
                        <div className="space-y-2">
                            {A.map((row, i) => (
                                <div key={i} className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground w-6">C{i + 1}:</span>
                                    {row.map((val, j) => (
                                        <React.Fragment key={j}>
                                            {j > 0 && <span className="text-muted-foreground">+</span>}
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={val}
                                                    onChange={e => setA(produce(draft => { draft[i][j] = e.target.value }))}
                                                    className="w-16 h-9 text-center font-mono"
                                                />
                                                <span className="text-sm">x<sub>{j + 1}</sub></span>
                                            </div>
                                        </React.Fragment>
                                    ))}
                                    <Select
                                        value={constraintTypes[i]}
                                        onValueChange={val => setConstraintTypes(produce(draft => { draft[i] = val }))}
                                    >
                                        <SelectTrigger className="w-16 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="<=">≤</SelectItem>
                                            <SelectItem value=">=">≥</SelectItem>
                                            <SelectItem value="==">=</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={b[i]}
                                        onChange={e => setB(produce(draft => { draft[i] = e.target.value }))}
                                        className="w-16 h-9 text-center font-mono"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            + Non-negativity: x<sub>i</sub> ≥ 0 • Binary: x<sub>i</sub> ∈ {'{0, 1}'}
                        </p>
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
                                            {result.optimal_value !== null ? result.optimal_value.toFixed(4) : '—'}
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
                                        <p className="text-xs text-muted-foreground mb-1">Integer Vars</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {variableTypes.filter(v => v === 'integer' || v === 'binary').length}
                                        </p>
                                    </div>
                                    <Hash className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Constraints</p>
                                        <p className="text-lg font-semibold font-mono">{result.problem.n_constraints}</p>
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
                                        <p className="text-xs text-muted-foreground mb-2">Variable Values</p>
                                        <div className="space-y-1">
                                            {result.solution.map((val, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm flex items-center gap-2">
                                                        x<sub>{i + 1}</sub>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded border ${getVariableTypeColor(result.problem.variable_types[i])}`}>
                                                            {getVariableTypeLabel(result.problem.variable_types[i])}
                                                        </span>
                                                    </span>
                                                    <span className="font-mono text-sm font-medium">
                                                        {result.problem.variable_types[i] === 'continuous' ? val.toFixed(4) : Math.round(val)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2">Constraint Slack</p>
                                        <div className="space-y-1">
                                            {result.slack?.map((val, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm flex items-center gap-1">
                                                        C{i + 1}
                                                        {result.binding_constraints?.[i] && (
                                                            <span className="text-xs px-1 py-0.5 bg-primary/10 text-primary rounded">binding</span>
                                                        )}
                                                    </span>
                                                    <span className="font-mono text-sm">{val.toFixed(4)}</span>
                                                </div>
                                            ))}
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
                    {result.success && result.problem.n_variables === 2 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="feasible" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots?.feasible_region && (
                                            <TabsTrigger value="feasible" className="text-xs">Feasible Region</TabsTrigger>
                                        )}
                                        <TabsTrigger value="interactive3d" className="text-xs">3D Objective</TabsTrigger>
                                        {result.plots?.sensitivity && (
                                            <TabsTrigger value="sensitivity" className="text-xs">Sensitivity</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots?.feasible_region && (
                                        <TabsContent value="feasible" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.feasible_region}`}
                                                    alt="Feasible Region"
                                                    width={800}
                                                    height={600}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Blue dots show feasible integer points • Star marks optimal solution
                                            </p>
                                        </TabsContent>
                                    )}

                                    <TabsContent value="interactive3d" className="mt-4">
                                        <div className="rounded-lg overflow-hidden border bg-white">
                                            <Plot
                                                data={(() => {
                                                    const traces: any[] = [];
                                                    const maxB = Math.max(...b.map(Number), 1) * 1.2;
                                                    const gridSize = 50;

                                                    const x1Vals = Array.from({ length: gridSize }, (_, i) => i * maxB / gridSize);
                                                    const x2Vals = Array.from({ length: gridSize }, (_, i) => i * maxB / gridSize);

                                                    const zVals: (number | null)[][] = [];
                                                    const c1 = Number(c[0]);
                                                    const c2 = Number(c[1]);

                                                    for (let j = 0; j < gridSize; j++) {
                                                        const row: (number | null)[] = [];
                                                        for (let i = 0; i < gridSize; i++) {
                                                            const x1 = x1Vals[i];
                                                            const x2 = x2Vals[j];

                                                            let feasible = x1 >= 0 && x2 >= 0;
                                                            A.forEach((aRow, k) => {
                                                                const lhs = Number(aRow[0]) * x1 + Number(aRow[1]) * x2;
                                                                const rhs = Number(b[k]);
                                                                const ct = constraintTypes[k];
                                                                if (ct === '<=' && lhs > rhs + 0.01) feasible = false;
                                                                if (ct === '>=' && lhs < rhs - 0.01) feasible = false;
                                                                if (ct === '==' && Math.abs(lhs - rhs) > 0.01) feasible = false;
                                                            });

                                                            row.push(feasible ? c1 * x1 + c2 * x2 : null);
                                                        }
                                                        zVals.push(row);
                                                    }

                                                    traces.push({
                                                        type: 'surface',
                                                        x: x1Vals,
                                                        y: x2Vals,
                                                        z: zVals,
                                                        colorscale: 'Viridis',
                                                        opacity: 0.8,
                                                        showscale: true,
                                                        colorbar: { title: 'Z' },
                                                        name: 'Objective Surface'
                                                    });

                                                    if (result.solution && result.optimal_value !== null) {
                                                        traces.push({
                                                            type: 'scatter3d',
                                                            x: [result.solution[0]],
                                                            y: [result.solution[1]],
                                                            z: [result.optimal_value],
                                                            mode: 'markers',
                                                            marker: { color: 'red', size: 10, symbol: 'diamond' },
                                                            name: 'Optimal'
                                                        });
                                                    }

                                                    return traces;
                                                })()}
                                                layout={{
                                                    title: `Z = ${c.map((coef, i) => `${coef}x${i + 1}`).join(' + ')}`,
                                                    scene: {
                                                        xaxis: { title: 'x₁' },
                                                        yaxis: { title: 'x₂' },
                                                        zaxis: { title: 'Z (Objective)' },
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

                                    {result.plots?.sensitivity && (
                                        <TabsContent value="sensitivity" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.sensitivity}`}
                                                    alt="Sensitivity Analysis"
                                                    width={800}
                                                    height={400}
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

