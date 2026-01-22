'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { produce } from 'immer';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: 'Production',
        c: [3, 5],
        A: [[1, 0], [0, 2], [3, 2]],
        b: [4, 12, 18],
        types: ['<=', '<=', '<='],
        objective: 'maximize'
    },
    {
        name: 'Resource',
        c: [-1, -2],
        A: [[2, 1], [1, 2]],
        b: [20, 20],
        types: ['<=', '<='],
        objective: 'maximize'
    },
    {
        name: 'Diet',
        c: [0.6, 0.35],
        A: [[5, 4], [2, 6]],
        b: [20, 18],
        types: ['>=', '>='],
        objective: 'minimize'
    },
    {
        name: 'Transport',
        c: [4, 3],
        A: [[2, 1], [1, 1], [1, 2]],
        b: [10, 8, 14],
        types: ['<=', '<=', '<='],
        objective: 'maximize'
    },
];

interface LPResult {
    success: boolean;
    status: string;
    optimal_value: number | null;
    solution: number[] | null;
    slack: number[] | null;
    binding_constraints: boolean[] | null;
    iterations: number | null;
    feasible_vertices: number[][];
    problem: {
        objective: string;
        objective_function: string;
        constraints: string[];
        n_variables: number;
        n_constraints: number;
    };
    plots: {
        feasible_region?: string;
        sensitivity?: string;
        surface_3d?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function LinearProgrammingPage() {
    const { toast } = useToast();
    
    // Problem state
    const [objective, setObjective] = useState<'maximize' | 'minimize'>('maximize');
    const [c, setC] = useState<string[]>(['3', '5']);
    const [A, setA] = useState<string[][]>([['1', '0'], ['0', '2'], ['3', '2']]);
    const [b, setB] = useState<string[]>(['4', '12', '18']);
    const [constraintTypes, setConstraintTypes] = useState<string[]>(['<=', '<=', '<=']);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<LPResult | null>(null);

    const numVars = c.length;
    const numConstraints = A.length;

    // Update dimensions
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
            };

            if (payload.c.some(isNaN) || payload.b.some(isNaN) || payload.A.flat().some(isNaN)) {
                throw new Error("All inputs must be valid numbers.");
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/linear-programming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: LPResult = await response.json();
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

    // Format objective function display
    const objectiveDisplay = useMemo(() => {
        const terms = c.map((coef, i) => {
            const val = parseFloat(coef) || 0;
            if (val === 0) return null;
            const sign = val >= 0 && i > 0 ? ' + ' : i > 0 ? ' ' : '';
            const absVal = Math.abs(val);
            const coefStr = absVal === 1 ? '' : absVal.toString();
            return `${sign}${val < 0 ? '-' : ''}${coefStr}x${i + 1}`;
        }).filter(Boolean).join('');
        return terms || '0';
    }, [c]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary" />
                    Linear Programming
                </h1>
                <p className="text-sm text-muted-foreground">
                    Optimize linear objectives subject to linear constraints
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

                    {/* Objective Function */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Objective Function</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-muted-foreground">
                                {objective === 'maximize' ? 'max' : 'min'} Z =
                            </span>
                            {c.map((val, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="text-muted-foreground">+</span>}
                                    <div className="flex items-center gap-1">
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
                            + Non-negativity: x<sub>i</sub> ≥ 0 for all i
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
                                        <p className="text-xs text-muted-foreground mb-1">Variables</p>
                                        <p className="text-lg font-semibold font-mono">{result.problem.n_variables}</p>
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
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
                                                    <span className="text-sm">x<sub>{i + 1}</sub></span>
                                                    <span className="font-mono text-sm font-medium">{val.toFixed(4)}</span>
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
                                            <TabsTrigger value="feasible" className="text-xs">2D Feasible Region</TabsTrigger>
                                        )}
                                        <TabsTrigger value="interactive3d" className="text-xs">3D Objective Surface</TabsTrigger>
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
                                                Shaded area shows feasible region • Star marks optimal solution
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
                                                    
                                                    // Create grid
                                                    const x1Vals = Array.from({ length: gridSize }, (_, i) => i * maxB / gridSize);
                                                    const x2Vals = Array.from({ length: gridSize }, (_, i) => i * maxB / gridSize);
                                                    
                                                    // Calculate Z (objective) values with feasibility mask
                                                    const zVals: (number | null)[][] = [];
                                                    const c1 = Number(c[0]);
                                                    const c2 = Number(c[1]);
                                                    
                                                    for (let j = 0; j < gridSize; j++) {
                                                        const row: (number | null)[] = [];
                                                        for (let i = 0; i < gridSize; i++) {
                                                            const x1 = x1Vals[i];
                                                            const x2 = x2Vals[j];
                                                            
                                                            // Check feasibility
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
                                                    
                                                    // Surface
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
                                                    
                                                    // Optimal point
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
                                                    title: `Z = ${c.map((coef, i) => `${coef}x${i+1}`).join(' + ')}`,
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
                                            Drag to rotate • Scroll to zoom • Surface shows objective over feasible region
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

