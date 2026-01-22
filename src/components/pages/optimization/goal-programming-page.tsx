'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Flag } from 'lucide-react';
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
        goals: [
            { coeffs: ['1', '0'], type: '>=', target: '80', priority: '1' },
            { coeffs: ['0', '1'], type: '>=', target: '60', priority: '2' }
        ],
        constraints: [
            { coeffs: ['1', '1'], type: '<=', rhs: '100' }
        ]
    },
    {
        name: 'Resource',
        goals: [
            { coeffs: ['2', '3'], type: '==', target: '120', priority: '1' },
            { coeffs: ['1', '1'], type: '>=', target: '30', priority: '2' },
            { coeffs: ['1', '0'], type: '<=', target: '25', priority: '3' }
        ],
        constraints: [
            { coeffs: ['1', '2'], type: '<=', rhs: '80' }
        ]
    },
    {
        name: 'Budget',
        goals: [
            { coeffs: ['5', '4'], type: '<=', target: '200', priority: '1' },
            { coeffs: ['1', '1'], type: '>=', target: '30', priority: '1' },
            { coeffs: ['1', '0'], type: '>=', target: '15', priority: '2' }
        ],
        constraints: [
            { coeffs: ['1', '1'], type: '<=', rhs: '50' }
        ]
    },
];

interface GoalAchievement {
    target: number;
    achieved: number;
    type: string;
    priority: number;
    deviation_minus: number;
    deviation_plus: number;
    satisfied: boolean;
}

interface GPResult {
    success: boolean;
    message: string;
    solution: number[] | null;
    deviations: Record<string, number>;
    goal_achievements: Record<string, GoalAchievement>;
    priority_achievements: Record<string, number>;
    problem: {
        n_variables: number;
        n_goals: number;
        n_constraints: number;
        priorities: number[];
    };
    plots: {
        achievement?: string;
        deviations?: string;
        feasible_region?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

interface GoalInput {
    coeffs: string[];
    type: string;
    target: string;
    priority: string;
}

interface ConstraintInput {
    coeffs: string[];
    type: string;
    rhs: string;
}

export default function GoalProgrammingPage() {
    const { toast } = useToast();

    const [goals, setGoals] = useState<GoalInput[]>([
        { coeffs: ['1', '0'], type: '>=', target: '80', priority: '1' },
        { coeffs: ['0', '1'], type: '>=', target: '60', priority: '2' }
    ]);
    const [constraints, setConstraints] = useState<ConstraintInput[]>([
        { coeffs: ['1', '1'], type: '<=', rhs: '100' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GPResult | null>(null);

    const numVars = goals[0]?.coeffs.length || 2;
    const numGoals = goals.length;
    const numConstraints = constraints.length;

    const updateNumVars = (newNum: number) => {
        if (newNum < 1 || newNum > 6) return;

        setGoals(current => current.map(g => {
            const newCoeffs = [...g.coeffs];
            while (newCoeffs.length < newNum) newCoeffs.push('0');
            return { ...g, coeffs: newCoeffs.slice(0, newNum) };
        }));

        setConstraints(current => current.map(c => {
            const newCoeffs = [...c.coeffs];
            while (newCoeffs.length < newNum) newCoeffs.push('0');
            return { ...c, coeffs: newCoeffs.slice(0, newNum) };
        }));
    };

    const addGoal = () => {
        setGoals(prev => [...prev, { 
            coeffs: Array(numVars).fill('0'), 
            type: '>=', 
            target: '0', 
            priority: String(numGoals + 1) 
        }]);
    };

    const removeGoal = () => {
        if (numGoals > 1) setGoals(prev => prev.slice(0, -1));
    };

    const addConstraint = () => {
        setConstraints(prev => [...prev, { 
            coeffs: Array(numVars).fill('0'), 
            type: '<=', 
            rhs: '0' 
        }]);
    };

    const removeConstraint = () => {
        if (numConstraints > 0) setConstraints(prev => prev.slice(0, -1));
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setGoals(example.goals.map(g => ({ ...g })));
        setConstraints(example.constraints.map(c => ({ ...c })));
        setResult(null);
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                goals: goals.map(g => ({
                    coeffs: g.coeffs.map(Number),
                    type: g.type,
                    target: Number(g.target),
                    priority: parseInt(g.priority)
                })),
                constraints: constraints.map(c => ({
                    coeffs: c.coeffs.map(Number),
                    type: c.type,
                    rhs: Number(c.rhs)
                }))
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/goal-programming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Solver failed');
            }

            const res: GPResult = await response.json();
            setResult(res);

            if (res.success) {
                const satisfied = Object.values(res.goal_achievements).filter(g => g.satisfied).length;
                toast({ title: "Solution Found", description: `${satisfied}/${Object.keys(res.goal_achievements).length} goals achieved` });
            } else {
                toast({ variant: 'destructive', title: "No Solution", description: res.message });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        const p = parseInt(priority);
        if (p === 1) return 'bg-red-100 text-red-700 border-red-300';
        if (p === 2) return 'bg-orange-100 text-orange-700 border-orange-300';
        if (p === 3) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        return 'bg-gray-100 text-gray-700 border-gray-300';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Flag className="w-6 h-6 text-primary" />
                    Goal Programming
                </h1>
                <p className="text-sm text-muted-foreground">
                    Optimize multiple objectives with prioritized goals
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Problem Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Dimension Controls */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Variables</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateNumVars(numVars - 1)} disabled={numVars <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{numVars}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateNumVars(numVars + 1)} disabled={numVars >= 6}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Goals</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={removeGoal} disabled={numGoals <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{numGoals}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addGoal} disabled={numGoals >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Constraints</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={removeConstraint} disabled={numConstraints <= 0}>
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

                    {/* Goals */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Goals (with Priority)</Label>
                        <div className="space-y-2">
                            {goals.map((goal, i) => (
                                <div key={i} className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(goal.priority)}`}>
                                        P{goal.priority}
                                    </span>
                                    {goal.coeffs.map((val, j) => (
                                        <React.Fragment key={j}>
                                            {j > 0 && <span className="text-muted-foreground">+</span>}
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={val}
                                                    onChange={e => setGoals(produce(draft => { draft[i].coeffs[j] = e.target.value }))}
                                                    className="w-14 h-9 text-center font-mono"
                                                />
                                                <span className="text-sm">x<sub>{j + 1}</sub></span>
                                            </div>
                                        </React.Fragment>
                                    ))}
                                    <Select
                                        value={goal.type}
                                        onValueChange={v => setGoals(produce(draft => { draft[i].type = v }))}
                                    >
                                        <SelectTrigger className="w-16 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=">=">≥</SelectItem>
                                            <SelectItem value="<=">≤</SelectItem>
                                            <SelectItem value="==">=</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={goal.target}
                                        onChange={e => setGoals(produce(draft => { draft[i].target = e.target.value }))}
                                        className="w-16 h-9 text-center font-mono"
                                        placeholder="Target"
                                    />
                                    <Input
                                        type="number"
                                        value={goal.priority}
                                        onChange={e => setGoals(produce(draft => { draft[i].priority = e.target.value }))}
                                        className="w-14 h-9 text-center font-mono"
                                        placeholder="Pri"
                                        min="1"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Priority 1 = highest priority (satisfied first)
                        </p>
                    </div>

                    {numConstraints > 0 && (
                        <>
                            <Separator />

                            {/* Hard Constraints */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Hard Constraints</Label>
                                <div className="space-y-2">
                                    {constraints.map((c, i) => (
                                        <div key={i} className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-muted-foreground w-6">C{i + 1}:</span>
                                            {c.coeffs.map((val, j) => (
                                                <React.Fragment key={j}>
                                                    {j > 0 && <span className="text-muted-foreground">+</span>}
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            value={val}
                                                            onChange={e => setConstraints(produce(draft => { draft[i].coeffs[j] = e.target.value }))}
                                                            className="w-14 h-9 text-center font-mono"
                                                        />
                                                        <span className="text-sm">x<sub>{j + 1}</sub></span>
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                            <Select
                                                value={c.type}
                                                onValueChange={v => setConstraints(produce(draft => { draft[i].type = v }))}
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
                                                value={c.rhs}
                                                onChange={e => setConstraints(produce(draft => { draft[i].rhs = e.target.value }))}
                                                className="w-16 h-9 text-center font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

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
                                        <p className="text-xs text-muted-foreground mb-1">Goals Achieved</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.goal_achievements ? 
                                                `${Object.values(result.goal_achievements).filter(g => g.satisfied).length}/${Object.keys(result.goal_achievements).length}` 
                                                : '—'}
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
                                        <p className="text-xs text-muted-foreground mb-1">Priority Levels</p>
                                        <p className="text-lg font-semibold font-mono">{result.problem.priorities.length}</p>
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

                    {/* Solution & Goal Achievements */}
                    {result.success && result.solution && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Solution & Goal Achievements</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2">Decision Variables</p>
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
                                        <p className="text-xs text-muted-foreground mb-2">Goal Status</p>
                                        <div className="space-y-1">
                                            {Object.entries(result.goal_achievements).map(([name, g]) => (
                                                <div key={name} className="flex items-center justify-between">
                                                    <span className="text-sm flex items-center gap-1">
                                                        {name}
                                                        <span className={`text-xs px-1 py-0.5 rounded ${g.satisfied ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            P{g.priority}
                                                        </span>
                                                    </span>
                                                    <span className="font-mono text-sm">
                                                        {g.achieved.toFixed(2)} / {g.target}
                                                    </span>
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
                    {result.success && result.plots && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="achievement" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.achievement && (
                                            <TabsTrigger value="achievement" className="text-xs">Goal Achievement</TabsTrigger>
                                        )}
                                        {result.plots.deviations && (
                                            <TabsTrigger value="deviations" className="text-xs">Deviations</TabsTrigger>
                                        )}
                                        {result.plots.feasible_region && (
                                            <TabsTrigger value="feasible" className="text-xs">Solution Space</TabsTrigger>
                                        )}
                                        {numVars === 2 && (
                                            <TabsTrigger value="interactive" className="text-xs">Interactive</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.achievement && (
                                        <TabsContent value="achievement" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.achievement}`}
                                                    alt="Goal Achievement"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.deviations && (
                                        <TabsContent value="deviations" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.deviations}`}
                                                    alt="Deviations"
                                                    width={800}
                                                    height={400}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.feasible_region && (
                                        <TabsContent value="feasible" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.feasible_region}`}
                                                    alt="Solution Space"
                                                    width={800}
                                                    height={600}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {numVars === 2 && (
                                        <TabsContent value="interactive" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border bg-white">
                                                <Plot
                                                    data={(() => {
                                                        const traces: any[] = [];

                                                        // Goal achievement bars
                                                        const goalNames = Object.keys(result.goal_achievements);
                                                        const targets = goalNames.map(n => result.goal_achievements[n].target);
                                                        const achieved = goalNames.map(n => result.goal_achievements[n].achieved);
                                                        const satisfied = goalNames.map(n => result.goal_achievements[n].satisfied);

                                                        traces.push({
                                                            type: 'bar',
                                                            x: goalNames,
                                                            y: targets,
                                                            name: 'Target',
                                                            marker: { color: '#BBDEFB' }
                                                        });

                                                        traces.push({
                                                            type: 'bar',
                                                            x: goalNames,
                                                            y: achieved,
                                                            name: 'Achieved',
                                                            marker: { color: satisfied.map(s => s ? '#4CAF50' : '#F44336') }
                                                        });

                                                        return traces;
                                                    })()}
                                                    layout={{
                                                        title: 'Goal Achievement Comparison',
                                                        barmode: 'group',
                                                        height: 400,
                                                        margin: { l: 50, r: 50, t: 50, b: 50 },
                                                        showlegend: true,
                                                        legend: { x: 1, y: 1, xanchor: 'right' }
                                                    }}
                                                    config={{ displayModeBar: true }}
                                                    useResizeHandler
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