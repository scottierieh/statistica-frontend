'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle, Award, MoveRight, Target, TrendingUp, Settings, CheckCircle, BookOpen, Plus, Trash2, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { produce } from 'immer';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Award className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Goal Programming</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Optimize multiple, often conflicting objectives by minimizing deviations from target goals
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Goals</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Handle multiple objectives simultaneously by setting target values for each goal
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Priority Levels</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Assign priorities to goals and solve them sequentially from highest to lowest
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Settings className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Deviation Minimization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Minimize under-achievement (d⁻) and over-achievement (d⁺) from target values
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            How It Works
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Unlike linear programming which optimizes a single objective, goal programming seeks a solution 
                            that comes as close as possible to achieving a set of goals according to their priority. Each goal 
                            has deviation variables (d⁻ for under-achievement and d⁺ for over-achievement), and the algorithm 
                            minimizes these deviations hierarchically.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Key Concepts
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Decision Variables:</strong> Variables you control (e.g., production quantities)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Goals:</strong> Target values with assigned priorities</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Deviation Variables:</strong> Measure how far from targets</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    Solution Process
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>P1 Goals:</strong> Highest priority solved first</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sequential:</strong> Each priority level solved in order</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Best compromise:</strong> Optimal balance across all goals</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-2">
                        <Button variant="outline" onClick={onLoadExample} size="lg">
                            <FileJson className="mr-2 h-5 w-5" />
                            Load Example
                        </Button>
                        <Button onClick={onStart} size="lg">
                            <Award className="mr-2 h-5 w-5" />
                            Get Started
                        </Button>
                    </div>
                </CardContent>
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

    const handleBoardCreation = () => {
        // Reset to initial state with updated number of variables
        const newVars = Array.from({ length: numDecisionVars }, (_, i) => `x${i+1}`);
        setDecisionVars(newVars);
        setGoals([
            { id: `g-${Date.now()}`, name: 'Goal 1', coeffs: Array(numDecisionVars).fill(0), rhs: 0, priority: 1 }
        ]);
        setConstraints([]);
        setAnalysisResult(null);
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
        return <IntroPage onStart={() => setView('main')} onLoadExample={() => {
            setView('main');
            // Load default example
            setNumDecisionVars(2);
            setDecisionVars(['x1', 'x2']);
            setGoals([
                { id: `g-${Date.now()}`, name: 'Profit Goal', coeffs: [2, 3], rhs: 1200, priority: 1 },
                { id: `g-${Date.now()+1}`, name: 'Production Goal', coeffs: [1, 1], rhs: 500, priority: 2 }
            ]);
            setConstraints([
                { id: `c-${Date.now()}`, coeffs: [1, 0], type: '<=', rhs: 400 },
                { id: `c-${Date.now()+1}`, coeffs: [0, 1], type: '<=', rhs: 300 }
            ]);
        }} />;
    }

    const finalSolution = analysisResult?.final_solution;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Goal Programming Setup</CardTitle>
                            <CardDescription>Define decision variables, goals (with priorities), and any hard constraints</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                 <CardContent className="space-y-6">
                     <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                           <Label htmlFor="num-vars">Decision Variables:</Label>
                           <Input id="num-vars" type="number" value={numDecisionVars} onChange={e => updateDecisionVars(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <Button onClick={handleBoardCreation}>
                            <Asterisk className="mr-2 h-4 w-4" />Create Board
                        </Button>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Goals (by Priority)</h3>
                        {goals.map(goal => (
                            <Card key={goal.id} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_auto_auto] gap-4 items-end">
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
                                     <Select value={constraint.type} onValueChange={(v) => handleConstraintChange(constraint.id, 'type', v as '<=' | '==' | '>=')}>
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

                {/* Overview Section */}
                {goals.length > 0 && (
                    <CardContent className="pt-0">
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Overview
                            </h3>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• Decision variables: {decisionVars.join(', ')}</li>
                                <li>• Number of goals: {goals.length} (Priority levels: P{Math.min(...goals.map(g => g.priority))} to P{Math.max(...goals.map(g => g.priority))})</li>
                                <li>• Hard constraints: {constraints.length}</li>
                                <li>• Solution method: Sequential optimization by priority</li>
                                <li>• Goals will be solved hierarchically from highest to lowest priority</li>
                            </ul>
                        </div>
                    </CardContent>
                )}

                <CardFooter className="flex justify-end">
                     <Button onClick={handleAnalysis} disabled={isLoading} size="lg">
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Calculating...</> : <><Play className="mr-2"/>Solve</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Optimal Solution</CardTitle>
                             <CardDescription>{analysisResult.message}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {finalSolution && (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Optimal Value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {finalSolution.solution_x.map((val, i) => (
                                            <TableRow key={i}><TableCell className="font-medium">{decisionVars[i]}</TableCell><TableCell className="font-mono text-right">{val.toFixed(4)}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle className="font-headline">Goal Achievement</CardTitle></CardHeader>
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
                                                <TableCell className="font-medium">{goal.name}</TableCell>
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
