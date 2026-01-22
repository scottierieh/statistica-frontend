'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, TrendingDown, Target, Activity, Zap, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// 수학 표기법 → Python 변환
function mathToPython(expr: string): string {
    return expr
        .replace(/x1/g, 'x')
        .replace(/x2/g, 'y')
        .replace(/\^/g, '**')
        .replace(/pi/g, 'np.pi')
        .replace(/sin\(/g, 'np.sin(')
        .replace(/cos\(/g, 'np.cos(')
        .replace(/exp\(/g, 'np.exp(')
        .replace(/sqrt\(/g, 'np.sqrt(');
}

const EXAMPLE_FUNCTIONS = [
    { name: 'Quadratic', math: 'x1^2 + x2^2' },
    { name: 'Rosenbrock', math: '(1-x1)^2 + 100*(x2-x1^2)^2' },
    { name: 'Booth', math: '(x1+2*x2-7)^2 + (2*x1+x2-5)^2' },
    { name: 'Beale', math: '(1.5-x1+x1*x2)^2 + (2.25-x1+x1*x2^2)^2' },
];

interface GradientDescentResult {
    path: number[][];
    initial_position: number[];
    final_position: number[];
    improvement: number;
    improvement_pct: number;
    steps_taken: number;
    converged: boolean;
    function_expression: string;
    parameters: {
        learning_rate: number;
        start_x: number;
        start_y: number;
        num_steps: number;
    };
    surface_data?: {
        x: number[];
        y: number[];
        z: number[][];
    };
    plots: {
        surface_3d?: string;
        contour_2d?: string;
        convergence?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function GradientDescentPage() {
    const { toast } = useToast();
    
    const [inputMode, setInputMode] = useState<'math' | 'python'>('math');
    const [mathExpr, setMathExpr] = useState('x1^2 + x2^2');
    const [pythonExpr, setPythonExpr] = useState('x**2 + y**2');
    
    const [learningRate, setLearningRate] = useState(0.1);
    const [startX, setStartX] = useState(4);
    const [startY, setStartY] = useState(4);
    const [numSteps, setNumSteps] = useState(50);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GradientDescentResult | null>(null);

    const convertedPython = useMemo(() => {
        return inputMode === 'math' ? mathToPython(mathExpr) : pythonExpr;
    }, [inputMode, mathExpr, pythonExpr]);

    const handleExampleSelect = (example: typeof EXAMPLE_FUNCTIONS[0]) => {
        setMathExpr(example.math);
        setPythonExpr(mathToPython(example.math));
        if (example.name === 'Rosenbrock') {
            setStartX(0);
            setStartY(0);
            setLearningRate(0.001);
            setNumSteps(200);
        } else {
            setStartX(4);
            setStartY(4);
            setLearningRate(0.1);
            setNumSteps(50);
        }
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                objective_function: inputMode === 'math' ? mathExpr : pythonExpr,
                learning_rate: learningRate,
                start_x: startX,
                start_y: startY,
                num_steps: numSteps,
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/gradient-descent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Simulation failed');
            }
            
            const res: GradientDescentResult = await response.json();
            setResult(res);
            toast({ title: "Simulation Complete", description: `Final value: ${res.final_position[2].toExponential(4)}` });
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
                    <TrendingDown className="w-6 h-6 text-primary" />
                    Gradient Descent
                </h1>
                <p className="text-sm text-muted-foreground">
                    Visualize the path of gradient descent optimization
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
                            placeholder={inputMode === 'math' ? "x1^2 + x2^2" : "x**2 + y**2"}
                            className="font-mono h-11"
                        />
                        
                        {inputMode === 'math' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                                <span>→</span>
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

                    {/* Parameters */}
                    <div className="grid grid-cols-4 gap-4">
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
                            <Label className="text-xs text-muted-foreground">Start X</Label>
                            <Input
                                type="number"
                                value={startX}
                                onChange={e => setStartX(parseFloat(e.target.value))}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Start Y</Label>
                            <Input
                                type="number"
                                value={startY}
                                onChange={e => setStartY(parseFloat(e.target.value))}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Steps</Label>
                            <Input
                                type="number"
                                value={numSteps}
                                onChange={e => setNumSteps(parseInt(e.target.value))}
                                min="1"
                                max="500"
                                className="h-9"
                            />
                        </div>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Simulating...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Run Simulation</>
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
                                        <p className="text-xs text-muted-foreground mb-1">Final Value</p>
                                        <p className="text-lg font-semibold font-mono">{result.final_position[2].toExponential(3)}</p>
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
                                        <p className="text-lg font-semibold font-mono">{result.improvement_pct.toFixed(1)}%</p>
                                    </div>
                                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Steps</p>
                                        <p className="text-lg font-semibold font-mono">{result.steps_taken}</p>
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
                                        <p className="text-lg font-semibold">{result.converged ? 'Converged' : 'Completed'}</p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Solution */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Start Point</p>
                                    <p className="font-mono text-sm">
                                        ({result.initial_position[0].toFixed(4)}, {result.initial_position[1].toFixed(4)})
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        f = {result.initial_position[2].toFixed(4)}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">End Point</p>
                                    <p className="font-mono text-sm">
                                        ({result.final_position[0].toFixed(6)}, {result.final_position[1].toFixed(6)})
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        f = {result.final_position[2].toExponential(4)}
                                    </p>
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
                            <Tabs defaultValue="interactive3d" className="w-full">
                                <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                    <TabsTrigger value="interactive3d" className="text-xs">3D Interactive</TabsTrigger>
                                    <TabsTrigger value="contour2d" className="text-xs">2D Contour</TabsTrigger>
                                    <TabsTrigger value="convergence" className="text-xs">Convergence</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="interactive3d" className="mt-4">
                                    <div className="rounded-lg overflow-hidden border bg-white">
                                        <Plot
                                            data={[
                                                // Surface
                                                ...(result.surface_data ? [{
                                                    type: 'surface' as const,
                                                    x: result.surface_data.x,
                                                    y: result.surface_data.y,
                                                    z: result.surface_data.z,
                                                    colorscale: 'Viridis',
                                                    opacity: 0.7,
                                                    showscale: false,
                                                    name: 'Surface'
                                                }] : []),
                                                // Full path (faded)
                                                {
                                                    type: 'scatter3d' as const,
                                                    x: result.path.map(p => p[0]),
                                                    y: result.path.map(p => p[1]),
                                                    z: result.path.map(p => p[2]),
                                                    mode: 'lines' as const,
                                                    line: { color: 'rgba(255,0,0,0.3)', width: 2 },
                                                    name: 'Full Path',
                                                    showlegend: false
                                                },
                                                // Animated current position
                                                {
                                                    type: 'scatter3d' as const,
                                                    x: [result.path[0][0]],
                                                    y: [result.path[0][1]],
                                                    z: [result.path[0][2]],
                                                    mode: 'markers' as const,
                                                    marker: { size: 8, color: 'red' },
                                                    name: 'Current Position'
                                                },
                                                // Start point
                                                {
                                                    type: 'scatter3d' as const,
                                                    x: [result.initial_position[0]],
                                                    y: [result.initial_position[1]],
                                                    z: [result.initial_position[2]],
                                                    mode: 'markers' as const,
                                                    marker: { size: 6, color: 'blue', symbol: 'circle' },
                                                    name: 'Start'
                                                },
                                                // End point
                                                {
                                                    type: 'scatter3d' as const,
                                                    x: [result.final_position[0]],
                                                    y: [result.final_position[1]],
                                                    z: [result.final_position[2]],
                                                    mode: 'markers' as const,
                                                    marker: { size: 8, color: 'green', symbol: 'diamond' },
                                                    name: 'End'
                                                }
                                            ]}
                                            layout={{
                                                title: `f(x, y) = ${result.function_expression}`,
                                                autosize: true,
                                                height: 550,
                                                margin: { l: 0, r: 0, t: 40, b: 0 },
                                                scene: {
                                                    xaxis: { title: 'X' },
                                                    yaxis: { title: 'Y' },
                                                    zaxis: { title: 'f(x, y)' },
                                                    camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
                                                },
                                                showlegend: true,
                                                legend: { x: 0, y: 1 },
                                                updatemenus: [{
                                                    type: 'buttons',
                                                    showactive: false,
                                                    x: 0.1,
                                                    y: 0,
                                                    xanchor: 'right',
                                                    yanchor: 'top',
                                                    pad: { t: 60, r: 20 },
                                                    buttons: [
                                                        {
                                                            label: '▶ Play',
                                                            method: 'animate',
                                                            args: [null, {
                                                                mode: 'immediate',
                                                                fromcurrent: true,
                                                                frame: { duration: 50, redraw: true },
                                                                transition: { duration: 0 }
                                                            }]
                                                        },
                                                        {
                                                            label: '⏸ Pause',
                                                            method: 'animate',
                                                            args: [[null], {
                                                                mode: 'immediate',
                                                                frame: { duration: 0, redraw: false },
                                                                transition: { duration: 0 }
                                                            }]
                                                        }
                                                    ]
                                                }],
                                                sliders: [{
                                                    active: 0,
                                                    pad: { t: 50, b: 10 },
                                                    currentvalue: {
                                                        prefix: 'Step: ',
                                                        visible: true,
                                                        xanchor: 'center'
                                                    },
                                                    steps: result.path.map((_, i) => ({
                                                        label: String(i),
                                                        method: 'animate',
                                                        args: [[`frame${i}`], {
                                                            mode: 'immediate',
                                                            frame: { duration: 0, redraw: true },
                                                            transition: { duration: 0 }
                                                        }]
                                                    }))
                                                }]
                                            }}
                                            frames={result.path.map((point, i) => ({
                                                name: `frame${i}`,
                                                data: [
                                                    {},  // Surface (no change)
                                                    {    // Animated path up to current step
                                                        x: result.path.slice(0, i + 1).map(p => p[0]),
                                                        y: result.path.slice(0, i + 1).map(p => p[1]),
                                                        z: result.path.slice(0, i + 1).map(p => p[2]),
                                                        'line.color': 'red',
                                                        'line.width': 3
                                                    },
                                                    {    // Current position marker
                                                        x: [point[0]],
                                                        y: [point[1]],
                                                        z: [point[2]]
                                                    },
                                                    {},  // Start (no change)
                                                    {}   // End (no change)
                                                ]
                                            }))}
                                            config={{
                                                displayModeBar: true,
                                                scrollZoom: true
                                            }}
                                            useResizeHandler
                                            className="w-full"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 text-center">
                                        ▶ Play to animate • Drag to rotate • Scroll to zoom
                                    </p>
                                </TabsContent>
                                
                                <TabsContent value="contour2d" className="mt-4">
                                    {result.plots.contour_2d ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.contour_2d}`}
                                                alt="2D Contour"
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
                                
                                <TabsContent value="convergence" className="mt-4">
                                    {result.plots.convergence ? (
                                        <div className="rounded-lg overflow-hidden border">
                                            <Image
                                                src={`data:image/png;base64,${result.plots.convergence}`}
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
                            </Tabs>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}