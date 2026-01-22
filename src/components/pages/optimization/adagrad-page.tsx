'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Scaling, ChevronDown, ChevronUp, TrendingDown, Target, Activity, Zap, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// 수학 표기법 → Python 변환 함수
function mathToPython(expr: string): string {
    return expr
        .replace(/Σ\((.+?)\)/g, 'np.sum($1)')
        .replace(/∑\((.+?)\)/g, 'np.sum($1)')
        .replace(/∏\((.+?)\)/g, 'np.prod($1)')
        .replace(/x₀/g, 'x[0]').replace(/x₁/g, 'x[1]')
        .replace(/x₂/g, 'x[2]').replace(/x₃/g, 'x[3]')
        .replace(/x₄/g, 'x[4]').replace(/x₅/g, 'x[5]')
        .replace(/x₆/g, 'x[6]').replace(/x₇/g, 'x[7]')
        .replace(/x₈/g, 'x[8]').replace(/x₉/g, 'x[9]')
        .replace(/xi/g, 'x')
        .replace(/x(\d+)/g, (_, n) => `x[${parseInt(n) - 1}]`)
        .replace(/²/g, '**2')
        .replace(/³/g, '**3')
        .replace(/\^/g, '**')
        .replace(/π/g, 'np.pi')
        .replace(/\bpi\b/g, 'np.pi')
        .replace(/\be\b(?!\w)/g, 'np.e')
        .replace(/\bn\b/g, 'len(x)')
        .replace(/sin\(/g, 'np.sin(')
        .replace(/cos\(/g, 'np.cos(')
        .replace(/tan\(/g, 'np.tan(')
        .replace(/sqrt\(/g, 'np.sqrt(')
        .replace(/exp\(/g, 'np.exp(')
        .replace(/log\(/g, 'np.log(')
        .replace(/abs\(/g, 'np.abs(')
        .replace(/\|([^|]+)\|/g, 'np.abs($1)');
}

const EXAMPLE_FUNCTIONS = [
    { name: 'Sphere', math: 'Σ(xi^2)', python: 'np.sum(x**2)' },
    { name: 'Rosenbrock', math: '(1-x1)^2 + 100*(x2-x1^2)^2', python: '(1-x[0])**2 + 100*(x[1]-x[0]**2)**2' },
    { name: 'Booth', math: '(x1+2*x2-7)^2 + (2*x1+x2-5)^2', python: '(x[0]+2*x[1]-7)**2 + (2*x[0]+x[1]-5)**2' },
    { name: 'Rastrigin', math: '10*n + Σ(xi^2 - 10*cos(2*pi*xi))', python: '10*len(x) + np.sum(x**2 - 10*np.cos(2*np.pi*x))' },
];

interface AdagradResult {
    best_solution: number[];
    best_fitness: number;
    initial_solution: number[];
    initial_fitness: number;
    convergence: number[];
    iterations_used: number;
    converged: boolean;
    convergence_reason: string;
    n_vars: number;
    final_gradient: number[];
    final_gradient_norm: number;
    accumulated_gradients: number[];
    parameters: {
        objective_function: string;
        bounds: number[][];
        learning_rate: number;
        epsilon: number;
        max_iter: number;
        tolerance: number;
        random_state: number | null;
    };
    plots: {
        convergence_plot?: string;
        gradient_norm_plot?: string;
        learning_rate_plot?: string;
        variable_history_plot?: string;
        path_2d_plot?: string;
        surface_3d_plot?: string;
        wireframe_3d_plot?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
        summary: {
            converged: boolean;
            iterations: number;
            initial_fitness: number;
            final_fitness: number;
            improvement_pct: number;
            final_gradient_norm: number;
        };
    };
}

export default function AdagradPage() {
    const { toast } = useToast();
    
    const [inputMode, setInputMode] = useState<'math' | 'python'>('math');
    const [mathExpr, setMathExpr] = useState('x1^2 + x2^2');
    const [pythonExpr, setPythonExpr] = useState('np.sum(x**2)');
    
    const [numVars, setNumVars] = useState(2);
    const [bounds, setBounds] = useState<[string, string][]>([['-10', '10'], ['-10', '10']]);
    const [learningRate, setLearningRate] = useState(0.5);
    const [epsilon, setEpsilon] = useState(1e-8);
    const [maxIter, setMaxIter] = useState(1000);
    const [tolerance, setTolerance] = useState(1e-8);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AdagradResult | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const convertedPython = useMemo(() => {
        return inputMode === 'math' ? mathToPython(mathExpr) : pythonExpr;
    }, [inputMode, mathExpr, pythonExpr]);

    const finalObjectiveFunction = inputMode === 'math' ? convertedPython : pythonExpr;

    const handleNumVarsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 10) {
            setNumVars(val);
            setBounds(current => {
                const newBounds: [string, string][] = [...current];
                while (newBounds.length < val) newBounds.push(['-10', '10']);
                return newBounds.slice(0, val);
            });
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_FUNCTIONS[0]) => {
        setMathExpr(example.math);
        setPythonExpr(example.python);
        if (example.name === 'Rosenbrock') {
            setBounds([['-2', '2'], ['-1', '3']]);
            setNumVars(2);
        } else if (example.name === 'Rastrigin') {
            setBounds([['-5.12', '5.12'], ['-5.12', '5.12']]);
            setNumVars(2);
        }
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                objective_function: finalObjectiveFunction,
                bounds: bounds.map(r => [parseFloat(r[0]), parseFloat(r[1])]),
                learning_rate: learningRate,
                epsilon: epsilon,
                max_iter: maxIter,
                tolerance: tolerance,
                random_state: 42,
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/adagrad`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Failed to solve.');
            }
            
            const res: AdagradResult = await response.json();
            setResult(res);
            toast({ title: "Optimization Complete", description: `Best fitness: ${res.best_fitness.toExponential(4)}` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const improvement = result ? ((result.initial_fitness - result.best_fitness) / Math.abs(result.initial_fitness)) * 100 : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Scaling className="w-6 h-6 text-primary" />
                    Adagrad Optimizer
                </h1>
                <p className="text-sm text-muted-foreground">
                    Adaptive gradient descent with per-parameter learning rates
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Objective Function */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Objective Function</Label>
                            <div className="inline-flex rounded-md border p-0.5">
                                <button
                                    onClick={() => setInputMode('math')}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                        inputMode === 'math' 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Math
                                </button>
                                <button
                                    onClick={() => setInputMode('python')}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                        inputMode === 'python' 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Python
                                </button>
                            </div>
                        </div>
                        
                        <Input
                            value={inputMode === 'math' ? mathExpr : pythonExpr}
                            onChange={e => inputMode === 'math' ? setMathExpr(e.target.value) : setPythonExpr(e.target.value)}
                            placeholder={inputMode === 'math' ? "x1^2 + x2^2" : "np.sum(x**2)"}
                            className="font-mono h-11"
                        />
                        
                        {inputMode === 'math' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                                <span className="text-muted-foreground">→</span>
                                <code className="text-foreground">{convertedPython}</code>
                            </div>
                        )}

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

                    {/* Parameters Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Variables</Label>
                            <Input
                                type="number"
                                value={numVars}
                                onChange={e => handleNumVarsChange(e.target.value)}
                                min="1"
                                max="10"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Learning Rate</Label>
                            <Input
                                type="number"
                                value={learningRate}
                                onChange={e => setLearningRate(parseFloat(e.target.value))}
                                step="0.01"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Max Iterations</Label>
                            <Input
                                type="number"
                                value={maxIter}
                                onChange={e => setMaxIter(parseInt(e.target.value))}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Tolerance</Label>
                            <Input
                                type="number"
                                value={tolerance}
                                onChange={e => setTolerance(parseFloat(e.target.value))}
                                step="1e-9"
                                className="h-9"
                            />
                        </div>
                    </div>

                    {/* Bounds */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Bounds</Label>
                        <div className="space-y-1.5">
                            {bounds.map((range, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-8 text-xs text-muted-foreground text-right">x{i + 1}</span>
                                    <Input
                                        type="number"
                                        value={range[0]}
                                        onChange={e => {
                                            const newBounds = [...bounds] as [string, string][];
                                            newBounds[i] = [e.target.value, range[1]];
                                            setBounds(newBounds);
                                        }}
                                        className="h-8 w-20 text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground">to</span>
                                    <Input
                                        type="number"
                                        value={range[1]}
                                        onChange={e => {
                                            const newBounds = [...bounds] as [string, string][];
                                            newBounds[i] = [range[0], e.target.value];
                                            setBounds(newBounds);
                                        }}
                                        className="h-8 w-20 text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Advanced */}
                    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Advanced
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Epsilon (ε)</Label>
                                <Input
                                    type="number"
                                    value={epsilon}
                                    onChange={e => setEpsilon(parseFloat(e.target.value))}
                                    step="1e-9"
                                    className="h-9 w-40"
                                />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Run Optimization</>
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
                                        <p className="text-lg font-semibold font-mono">{result.best_fitness.toExponential(3)}</p>
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
                                        <p className="text-lg font-semibold font-mono">{improvement.toFixed(1)}%</p>
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
                                        <p className="text-lg font-semibold font-mono">{result.iterations_used}</p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">∇ Norm</p>
                                        <p className="text-lg font-semibold font-mono">{result.final_gradient_norm.toExponential(1)}</p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Solution & Analysis */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Optimal Point</p>
                                <p className="font-mono text-sm">
                                    [{result.best_solution.map(v => v.toFixed(6)).join(', ')}]
                                </p>
                            </div>
                            
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                <p className="text-sm">{result.convergence_reason}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analysis Insights - 하나의 카드에 통합 */}
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
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="convergence" className="w-full">
                                <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                    <TabsTrigger value="convergence" className="text-xs">Convergence</TabsTrigger>
                                    <TabsTrigger value="gradient" className="text-xs">Gradient</TabsTrigger>
                                    {result.n_vars === 2 && (
                                        <>
                                            <TabsTrigger value="path2d" className="text-xs">2D Path</TabsTrigger>
                                            <TabsTrigger value="surface3d" className="text-xs">3D Surface</TabsTrigger>
                                        </>
                                    )}
                                </TabsList>
                                
                                <TabsContent value="convergence" className="mt-4">
                                    {result.plots.convergence_plot ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.convergence_plot}`}
                                                alt="Convergence"
                                                width={800}
                                                height={400}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                            No plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="gradient" className="mt-4">
                                    {result.plots.gradient_norm_plot ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.gradient_norm_plot}`}
                                                alt="Gradient Norm"
                                                width={800}
                                                height={400}
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                            No plot available
                                        </div>
                                    )}
                                </TabsContent>
                                
                                {result.n_vars === 2 && (
                                    <>
                                        <TabsContent value="path2d" className="mt-4">
                                            {result.plots.path_2d_plot ? (
                                                <div className="rounded-lg overflow-hidden border">
                                                    <Image
                                                        src={`data:image/png;base64,${result.plots.path_2d_plot}`}
                                                        alt="2D Path"
                                                        width={800}
                                                        height={600}
                                                        className="w-full"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                                    No plot available
                                                </div>
                                            )}
                                        </TabsContent>
                                        
                                        <TabsContent value="surface3d" className="mt-4">
                                            {result.plots.surface_3d_plot ? (
                                                <div className="rounded-lg overflow-hidden border">
                                                    <Image
                                                        src={`data:image/png;base64,${result.plots.surface_3d_plot}`}
                                                        alt="3D Surface"
                                                        width={800}
                                                        height={600}
                                                        className="w-full"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                                                    No plot available
                                                </div>
                                            )}
                                        </TabsContent>
                                    </>
                                )}
                            </Tabs>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
