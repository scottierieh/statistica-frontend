
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, HelpCircle, AlertTriangle, PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '../ui/textarea';
import { produce } from 'immer';

interface NlpResult {
    success: boolean;
    message: string;
    solution: number[];
    optimal_value: number;
    iterations: number;
}

interface Constraint {
    id: string;
    type: 'eq' | 'ineq';
    fun: string;
}

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Nonlinear Programming</CardTitle>
                    <CardDescription className="text-base pt-2">
                        Solve optimization problems where the objective function or constraints are nonlinear.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-left space-y-4">
                    <p>
                        Nonlinear programming extends optimization to problems that cannot be described with linear relationships. This tool uses numerical methods to find the optimal solution.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Objective Function:</strong> The function to minimize, written in Python syntax (e.g., `(x[0] - 1)**2 + (x[1] - 2.5)**2`). Variables are accessed as `x[0]`, `x[1]`, etc.</li>
                        <li><strong>Constraints:</strong> Define limits on your variables. Can be equality (`type: 'eq'`) or inequality (`type: 'ineq'`). Inequality constraints are of the form C(x) >= 0.</li>
                        <li><strong>Bounds:</strong> The lower and upper limits for each decision variable.</li>
                        <li><strong>Initial Guess:</strong> A starting point for the solver to begin its search.</li>
                    </ul>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={onStart}>Get Started</Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export default function NonlinearProgrammingPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    
    // Default to Rosenbrock function example
    const [objectiveStr, setObjectiveStr] = useState("100 * (x[1] - x[0]**2)**2 + (1 - x[0])**2");
    const [numVars, setNumVars] = useState(2);
    const [initialGuess, setInitialGuess] = useState<string[]>(['2', '2']);
    const [bounds, setBounds] = useState<{min: string, max: string}[]>([{min: '0', max: 'None'}, {min: '0', max: 'None'}]);
    const [constraints, setConstraints] = useState<Constraint[]>([
        { id: `c-${Date.now()}`, type: 'ineq', fun: 'lambda x: x[0] + 2*x[1] - 1' }
    ]);
    const [method, setMethod] = useState('SLSQP');

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<NlpResult | null>(null);
    
    const updateNumVars = (num: number) => {
        const newNum = Math.max(1, num);
        setNumVars(newNum);

        setInitialGuess(prev => {
            const newGuess = Array(newNum).fill('0');
            prev.forEach((val, i) => { if(i < newNum) newGuess[i] = val });
            return newGuess;
        });

        setBounds(prev => {
            const newBounds = Array(newNum).fill(null).map(() => ({ min: '0', max: 'None' }));
            prev.forEach((val, i) => { if(i < newNum) newBounds[i] = val });
            return newBounds;
        });
    };

    const handleLoadExample = () => {
        setObjectiveStr("100 * (x[1] - x[0]**2)**2 + (1 - x[0])**2");
        updateNumVars(2);
        setInitialGuess(['2', '2']);
        setBounds([{min: '0', max: 'None'}, {min: '0', max: 'None'}]);
        setConstraints([ { id: `c-${Date.now()}`, type: 'ineq', fun: 'lambda x: x[0] + 2*x[1] - 1' } ]);
        setMethod('SLSQP');
        toast({ title: "Example Loaded", description: "Rosenbrock function example has been set up." });
    };

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        const initialGuessStr = `[${initialGuess.join(', ')}]`;
        const boundsStr = `[${bounds.map(b => `(${b.min}, ${b.max})`).join(', ')}]`;
        const constraintsStr = `[${constraints.map(c => `{'type': '${c.type}', 'fun': ${c.fun}}`).join(', ')}]`;

        try {
            const response = await fetch('/api/analysis/nonlinear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    objective_str: objectiveStr, 
                    initial_guess: initialGuessStr, 
                    bounds: boundsStr, 
                    constraints: constraintsStr,
                    method
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [objectiveStr, initialGuess, bounds, constraints, method, toast]);
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Nonlinear Programming Solver</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Define your objective function, constraints, and bounds using Python syntax.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Security Warning</AlertTitle>
                        <AlertDescription>
                            This tool uses `eval` to process Python code. Do not run untrusted code. This feature is intended for educational and prototyping purposes only.
                        </AlertDescription>
                    </Alert>
                    
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                        <Label htmlFor="num-vars">Number of Variables:</Label>
                        <Input id="num-vars" type="number" value={numVars} onChange={e => updateNumVars(parseInt(e.target.value))} min="1" className="w-20"/>
                    </div>

                    <div>
                        <Label htmlFor="objective-func">Objective Function (to minimize)</Label>
                        <Textarea id="objective-func" value={objectiveStr} onChange={e => setObjectiveStr(e.target.value)} placeholder="e.g., (x[0] - 1)**2 + (x[1] - 2.5)**2" className="font-mono" />
                    </div>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div>
                           <Label>Initial Guess</Label>
                           <div className="grid grid-cols-2 gap-2 mt-2">
                               {initialGuess.map((val, i) => (
                                   <div key={i}><Label htmlFor={`guess-${i}`} className="text-xs">x[{i}]</Label><Input id={`guess-${i}`} value={val} onChange={e => setInitialGuess(produce(draft => {draft[i] = e.target.value}))} className="font-mono" /></div>
                               ))}
                           </div>
                        </div>
                        <div>
                           <Label>Bounds for Variables</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                               {bounds.map((b, i) => (
                                   <div key={i} className="flex items-center gap-2">
                                       <Label htmlFor={`b-min-${i}`} className="text-xs">x[{i}] Min:</Label><Input id={`b-min-${i}`} value={b.min} onChange={e => setBounds(produce(draft => {draft[i].min = e.target.value}))} className="font-mono" />
                                       <Label htmlFor={`b-max-${i}`} className="text-xs">Max:</Label><Input id={`b-max-${i}`} value={b.max} onChange={e => setBounds(produce(draft => {draft[i].max = e.target.value}))} className="font-mono" />
                                   </div>
                               ))}
                            </div>
                        </div>
                    </div>
                     <div>
                        <Label>Constraints (as Python lambda functions)</Label>
                        <div className="space-y-2">
                            {constraints.map((c, i) => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <Select value={c.type} onValueChange={(v) => setConstraints(produce(draft => {draft[i].type = v as any}))}>
                                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="ineq">ineq (>=0)</SelectItem><SelectItem value="eq">eq (==0)</SelectItem></SelectContent>
                                    </Select>
                                    <Input value={c.fun} onChange={e => setConstraints(produce(draft => {draft[i].fun = e.target.value}))} className="font-mono flex-1"/>
                                    <Button variant="ghost" size="icon" onClick={() => setConstraints(p => p.filter(pc => pc.id !== c.id))}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                </div>
                            ))}
                        </div>
                         <Button variant="outline" size="sm" className="mt-2" onClick={() => setConstraints(p => [...p, {id: `c-${Date.now()}`, type: 'ineq', fun: 'lambda x: ' }])}><PlusCircle className="mr-2"/>Add Constraint</Button>
                    </div>
                    <div>
                        <Label>Solver Method</Label>
                         <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SLSQP">Sequential Least Squares Programming (SLSQP)</SelectItem>
                                <SelectItem value="COBYLA">Constrained Optimization by Linear Approximation (COBYLA)</SelectItem>
                                <SelectItem value="trust-constr">Trust-Region Constrained (trust-constr)</SelectItem>
                                <SelectItem value="CG">Conjugate Gradient (CG)</SelectItem>
                                <SelectItem value="BFGS">Broyden-Fletcher-Goldfarb-Shanno (BFGS)</SelectItem>
                                <SelectItem value="Newton-CG">Newton-Conjugate Gradient (Newton-CG)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                     <Button variant="outline" onClick={handleLoadExample}>Load Example</Button>
                     <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Solving...</> : <><Play className="mr-2"/>Solve</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Optimal Solution</CardTitle>
                        <CardDescription>{analysisResult.message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {analysisResult.success ? (
                            <div>
                                <p><strong>Optimal Value (Z*):</strong> <span className="font-mono">{analysisResult.optimal_value?.toFixed(6)}</span></p>
                                <Table className="mt-2">
                                    <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Optimal Value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {analysisResult.solution?.map((s, i) => (
                                            <TableRow key={i}>
                                                <TableCell><strong>x[{i}]</strong></TableCell>
                                                <TableCell className="font-mono text-right">{s.toFixed(6)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-destructive">{analysisResult.message}</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
