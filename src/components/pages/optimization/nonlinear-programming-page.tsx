'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Plus, Trash2, TrendingUp } from 'lucide-react';
import { produce } from 'immer';

interface NLPResult {
    solution: number[];
    objective_value: number;
    n_iterations: number;
    message: string;
    success: boolean;
}

export default function NonLinearProgrammingPage() {
    const { toast } = useToast();
    
    const [objectiveFn, setObjectiveFn] = useState('(x[0] - 1)**2 + (x[1] - 2.5)**2');
    const [numVars, setNumVars] = useState(2);
    const [bounds, setBounds] = useState<string[][]>([['0', ''], ['0', '']]);
    const [initialGuess, setInitialGuess] = useState<string[]>(['2', '0']);
    const [constraints, setConstraints] = useState<{type: 'eq' | 'ineq', fun: string}[]>([
        { type: 'ineq', fun: 'x[0] - 2 * x[1] + 2' },
        { type: 'ineq', fun: '-x[0] - 2 * x[1] + 6' },
        { type: 'ineq', fun: '-x[0] + 2 * x[1] + 2' }
    ]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<NLPResult | null>(null);

    const handleNumVarsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 5) {
            setNumVars(val);
            const emptyArr = Array(val).fill('');
            setBounds(emptyArr.map(() => ['0', '']));
            setInitialGuess(emptyArr.map(() => '0'));
            setConstraints(current => current.map(c => ({...c, fun: `x[0] `})));
        }
    };
    
    const addConstraint = () => setConstraints(prev => [...prev, { type: 'ineq', fun: '' }]);
    const removeConstraint = (index: number) => setConstraints(prev => prev.filter((_, i) => i !== index));

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                objective_function: objectiveFn,
                bounds: bounds.map(b => [b[0] === '' ? null : parseFloat(b[0]), b[1] === '' ? null : parseFloat(b[1])]),
                initial_guess: initialGuess.map(parseFloat),
                constraints: constraints.filter(c => c.fun.trim() !== '')
            };

            const response = await fetch('/api/analysis/nonlinear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const res = await response.json();
            if (!response.ok || res.error) throw new Error(res.error || 'Failed to solve.');
            
            setResult(res.results);
            toast({ title: "Success", description: `NLP solved in ${res.results.n_iterations} iterations.` });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp />Non-linear Programming (NLP)</CardTitle>
                <CardDescription>Solve optimization problems with non-linear objectives and/or constraints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Objective Function (Python format, minimize)</Label>
                    <Input value={objectiveFn} onChange={e => setObjectiveFn(e.target.value)} placeholder="e.g., (x[0] - 1)**2 + (x[1] - 2.5)**2" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Variables</Label><Input type="number" value={numVars} onChange={e => handleNumVarsChange(e.target.value)} min="1" max="5"/></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Variable Bounds</Label>
                        {bounds.map((range, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Label className="w-16">x[{i}]</Label>
                                <Input type="number" value={range[0]} onChange={e => setBounds(produce(draft => {draft[i][0] = e.target.value}))} placeholder="Min (e.g., 0)" />
                                <Input type="number" value={range[1]} onChange={e => setBounds(produce(draft => {draft[i][1] = e.target.value}))} placeholder="Max (optional)" />
                            </div>
                        ))}
                    </div>
                     <div className="space-y-2">
                        <Label>Initial Guess</Label>
                        {initialGuess.map((guess, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Label className="w-16">x[{i}]</Label>
                                <Input type="number" value={guess} onChange={e => setInitialGuess(produce(draft => {draft[i] = e.target.value}))} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Constraints</Label>
                    {constraints.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Input value={c.fun} onChange={e => setConstraints(produce(draft => { draft[i].fun = e.target.value }))} placeholder="e.g., x[0] - 2*x[1] + 2"/>
                            <Select value={c.type} onValueChange={v => setConstraints(produce(draft => { draft[i].type = v as 'eq' | 'ineq' }))}>
                                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ineq">Inequality ({'>='} 0)</SelectItem>
                                    <SelectItem value="eq">Equality (== 0)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeConstraint(i)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addConstraint}><Plus className="mr-2"/> Add Constraint</Button>
                </div>

                <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Solve</Button>
                {result && (
                     <div className="pt-4 space-y-2">
                        <h3 className="font-semibold">Results</h3>
                        <p><strong>Status:</strong> <span className={result.success ? 'text-green-600' : 'text-red-600'}>{result.message}</span></p>
                        <p><strong>Optimal Objective Value:</strong> {result.objective_value.toFixed(6)}</p>
                        <p><strong>Optimal Solution:</strong></p>
                        <ul className="list-disc list-inside">
                            {result.solution.map((val, i) => <li key={i}>x[{i}]: {val.toFixed(4)}</li>)}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
