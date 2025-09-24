
'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, Plus, Trash2, HelpCircle, Award, MoveRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { produce } from 'immer';

interface Goal {
    id: string;
    name: string;
    coeffs: number[];
    rhs: number;
    priority: number;
}

interface HardConstraint {
    id: string;
    coeffs: number[];
    type: '<=' | '==' | '>=';
    rhs: number;
}

interface StepResult {
    priority: number;
    solution_x: number[];
    objective_value: number;
    goals: {
        name: string;
        achieved: number;
        target: number;
        d_minus: number;
        d_plus: number;
    }[];
}

interface GpResult {
    success: boolean;
    steps: StepResult[];
    final_solution: StepResult;
    message?: string;
}

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Award size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Goal Programming</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        An optimization technique for handling multiple, often conflicting, objectives by minimizing deviations from set goals.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-left space-y-6 px-8 py-10">
                    <p>
                        Unlike linear programming which optimizes a single objective, goal programming seeks a solution that comes as "close as possible" to achieving a set of goals, according to their priority.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li><strong>Decision Variables:</strong> The variables you can control to achieve your goals (e.g., production quantities, budget allocation).</li>
                        <li><strong>Goals:</strong> The target values for your objectives. Each goal has a priority level.</li>
                        <li><strong>Deviation Variables:</strong> Represent the under-achievement (d⁻) or over-achievement (d⁺) for each goal. The algorithm works to minimize these deviations.</li>
                        <li><strong>Priorities:</strong> Goals are solved sequentially from the highest priority (P1) to the lowest.</li>
                    </ul>
                </CardContent>
                <CardFooter className="flex justify-center p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Get Started <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export default function GoalProgrammingPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [numDecisionVars, setNumDecisionVars] = useState(2);
    const [decisionVars, setDecisionVars] = useState(['x1', 'x2']);
    
    const [goals, setGoals] = useState<Goal[]>([
        { id: `g-${Date.now()}`, name: 'Profit Goal', coeffs: [2, 3], rhs: 1200, priority: 1 },
        { id: `g-${Date.now()+1}`, name: 'Production Goal', coeffs: [1, 1], rhs: 500, priority: 2 }
    ]);
    const [constraints, setConstraints] = useState<HardConstraint[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<GpResult | null>(null);

    const updateDecisionVars = (num: number) => {
        const newNum = Math.max(1, num);
        setNumDecisionVars(newNum);
        const newVars = Array.from({ length: newNum }, (_, i) => `x${i+1}`);
        setDecisionVars(newVars);
        setGoals(prev => prev.map(g => ({ ...g, coeffs: Array(newNum).fill(0) })));
        setConstraints(prev => prev.map(c => ({ ...c, coeffs: Array(newNum).fill(0) })));
    };
    
    const handleGoalChange = (id: string, field: keyof Goal, value: any) => {
        setGoals(produce(draft => {
            const goal = draft.find(g => g.id === id);
            if (goal) {
                (goal as any)[field] = value;
            }
        }));
    };
    
     const handleGoalCoeffChange = (id: string, index: number, value: string) => {
        setGoals(produce(draft => {
            const goal = draft.find(g => g.id === id);
            if (goal) {
                goal.coeffs[index] = parseFloat(value) || 0;
            }
        }));
    };
    
    const addGoal = () => {
        const highestPriority = goals.length > 0 ? Math.max(...goals.map(g => g.priority)) : 0;
        setGoals(prev => [...prev, { id: `g-${Date.now()}`, name: `Goal ${prev.length + 1}`, coeffs: Array(numDecisionVars).fill(0), rhs: 0, priority: highestPriority + 1 }]);
    };
    
    const removeGoal = (id: string) => {
        setGoals(prev => prev.filter(g => g.id !== id));
    };

    const addConstraint = () => {
        setConstraints(prev => [...prev, { id: `c-${Date.now()}`, coeffs: Array(numDecisionVars).fill(0), type: '<=', rhs: 0 }]);
    }
    
    const handleConstraintChange = (id: string, field: keyof HardConstraint, value: any) => {
        setConstraints(produce(draft => {
            const constraint = draft.find(c => c.id === id);
            if (constraint) {
                (constraint as any)[field] = value;
            }
        }));
    };
    
    const handleConstraintCoeffChange = (id: string, index: number, value: string) => {
        setConstraints(produce(draft => {
            const constraint = draft.find(c => c.id === id);
            if (constraint) {
                constraint.coeffs[index] = parseFloat(value) || 0;
            }
        }));
    };
    
    const removeConstraint = (id: string) => {
        setConstraints(prev => prev.filter(c => c.id !== id));
    }


    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/goal-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goals, decisionVars, constraints })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: GpResult = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [goals, decisionVars, constraints, toast]);

    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    const finalSolution = analysisResult?.final_solution;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Goal Programming Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Define decision variables, goals (with priorities), and any hard constraints.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                     <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                        <Label htmlFor="num-vars">Decision Variables:</Label>
                        <Input id="num-vars" type="number" value={numDecisionVars} onChange={e => updateDecisionVars(parseInt(e.target.value))} min="1" className="w-20"/>
                    </div>
                     <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Goals (by Priority)</h3>
                        {goals.map(goal => (
                            <Card key={goal.id} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_auto] gap-4 items-end">
                                    <Input value={goal.name} onChange={e => handleGoalChange(goal.id, 'name', e.target.value)} placeholder="Goal Name" />
                                    <Input type="number" value={goal.priority} onChange={e => handleGoalChange(goal.id, 'priority', parseInt(e.target.value))} placeholder="Priority" />
                                    <div className="flex items-center gap-2">
                                        {goal.coeffs.map((coeff, i) => (
                                            <div key={i} className="flex-1">
                                                <Label htmlFor={`g-${goal.id}-c${i}`} className="text-xs">{decisionVars[i]}</Label>
                                                <Input id={`g-${goal.id}-c${i}`} type="number" value={coeff} onChange={e => handleGoalCoeffChange(goal.id, i, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-lg">=</p>
                                        <Input type="number" value={goal.rhs} onChange={e => handleGoalChange(goal.id, 'rhs', parseFloat(e.target.value))} className="w-24" />
                                        <Button variant="ghost" size="icon" onClick={() => removeGoal(goal.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                         <Button variant="outline" onClick={addGoal}><Plus className="mr-2" /> Add Goal</Button>
                    </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Hard Constraints (Optional)</h3>
                         {constraints.map(constraint => (
                            <Card key={constraint.id} className="p-4">
                                 <div className="flex items-center gap-2">
                                    {constraint.coeffs.map((coeff, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            <Input type="number" value={coeff} onChange={e => handleConstraintCoeffChange(constraint.id, i, e.target.value)} className="w-20" />
                                            <Label>· {decisionVars[i]}</Label>
                                            {i < decisionVars.length - 1 && <span className="mx-1">+</span>}
                                        </div>
                                    ))}
                                     <Select value={constraint.type} onValueChange={(v) => handleConstraintChange(constraint.id, 'type', v)}>
                                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="<=">≤</SelectItem><SelectItem value="==">=</SelectItem><SelectItem value=">=">≥</SelectItem></SelectContent>
                                    </Select>
                                     <Input type="number" value={constraint.rhs} onChange={e => handleConstraintChange(constraint.id, 'rhs', parseFloat(e.target.value))} className="w-24" />
                                     <Button variant="ghost" size="icon" onClick={() => removeConstraint(constraint.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </div>
                            </Card>
                         ))}
                        <Button variant="outline" onClick={addConstraint}><Plus className="mr-2" /> Add Constraint</Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                     <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Calculating...</> : <><Play className="mr-2"/>Solve</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Optimal Solution</CardTitle>
                             <CardDescription>{analysisResult.message}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {finalSolution && (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Optimal Value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {finalSolution.solution_x.map((val, i) => (
                                            <TableRow key={i}><TableCell>{decisionVars[i]}</TableCell><TableCell className="font-mono text-right">{val.toFixed(4)}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Goal Achievement</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Priority</TableHead><TableHead>Goal</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Achieved</TableHead><TableHead className="text-right">Under (d⁻)</TableHead><TableHead className="text-right">Over (d⁺)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.steps.flatMap(step =>
                                        step.goals.map(goal => (
                                            <TableRow key={`${step.priority}-${goal.name}`}>
                                                <TableCell>P{step.priority}</TableCell>
                                                <TableCell>{goal.name}</TableCell>
                                                <TableCell className="font-mono text-right">{goal.target.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-right">{goal.achieved.toFixed(2)}</TableCell>
                                                <TableCell className={`font-mono text-right ${goal.d_minus > 1e-6 ? 'text-destructive font-bold' : ''}`}>{goal.d_minus.toFixed(2)}</TableCell>
                                                <TableCell className={`font-mono text-right ${goal.d_plus > 1e-6 ? 'text-destructive font-bold' : ''}`}>{goal.d_plus.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
