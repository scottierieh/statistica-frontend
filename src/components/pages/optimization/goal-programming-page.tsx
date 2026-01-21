'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Plus, Trash2 } from 'lucide-react';
import { produce } from 'immer';

export default function GoalProgrammingPage() {
    const { toast } = useToast();
    
    const [numVars, setNumVars] = useState(2);
    const [numGoals, setNumGoals] = useState(2);
    const [numConstraints, setNumConstraints] = useState(1);

    const [goals, setGoals] = useState<{coeffs: string[], type: string, target: string, priority: string}>([
        { coeffs: ['1', '0'], type: '==', target: '80', priority: '1' },
        { coeffs: ['0', '1'], type: '>=', target: '60', priority: '2' },
    ]);
    const [constraints, setConstraints] = useState<{coeffs: string[], type: string, rhs: string}>([
        { coeffs: ['1', '1'], type: '<=', rhs: '100' },
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const updateDimensions = useCallback((newVars: number, newGoals: number, newConstraints: number) => {
        setGoals(current => {
            const newG = [...current];
            while (newG.length < newGoals) newG.push({ coeffs: Array(newVars).fill('0'), type: '==', target: '0', priority: '1' });
            if (newG.length > newGoals) newG.splice(newGoals);
            newG.forEach(goal => {
                while (goal.coeffs.length < newVars) goal.coeffs.push('0');
                if (goal.coeffs.length > newVars) goal.coeffs.splice(newVars);
            });
            return newG;
        });

        setConstraints(current => {
            const newC = [...current];
            while (newC.length < newConstraints) newC.push({ coeffs: Array(newVars).fill('0'), type: '<=', rhs: '0' });
            if (newC.length > newConstraints) newC.splice(newConstraints);
            newC.forEach(constraint => {
                while (constraint.coeffs.length < newVars) constraint.coeffs.push('0');
                if (constraint.coeffs.length > newVars) constraint.coeffs.splice(newVars);
            });
            return newC;
        });
    }, []);

    const handleNumVarsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 10) { setNumVars(val); updateDimensions(val, numGoals, numConstraints); }
    };
    const handleNumGoalsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 10) { setNumGoals(val); updateDimensions(numVars, val, numConstraints); }
    };
    const handleNumConstraintsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val >= 0 && val <= 10) { setNumConstraints(val); updateDimensions(numVars, numGoals, val); }
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                goals: goals.map(g => ({ coeffs: g.coeffs.map(Number), type: g.type, target: Number(g.target), priority: parseInt(g.priority, 10) })),
                constraints: constraints.map(c => ({ coeffs: c.coeffs.map(Number), type: c.type, rhs: Number(c.rhs) })),
            };

            const response = await fetch('/api/analysis/goal-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(await response.text());
            const res = await response.json();
            if(res.error) throw new Error(res.error);

            setResult(res);
            toast({ title: "Success", description: "Goal Programming problem solved." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Goal Programming</CardTitle>
                    <CardDescription>Solve problems with multiple, often conflicting, objectives by prioritizing goals.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-2"><Label>Variables</Label><Input type="number" value={numVars} onChange={e => handleNumVarsChange(e.target.value)} min="1" max="10"/></div>
                        <div className="space-y-2"><Label>Goals</Label><Input type="number" value={numGoals} onChange={e => handleNumGoalsChange(e.target.value)} min="1" max="10"/></div>
                        <div className="space-y-2"><Label>Hard Constraints</Label><Input type="number" value={numConstraints} onChange={e => handleNumConstraintsChange(e.target.value)} min="0" max="10"/></div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Goals</Label>
                        {goals.map((goal, i) => (
                            <div key={i} className="flex items-center gap-2">
                                {goal.coeffs.map((val, j) => (
                                    <React.Fragment key={j}>
                                        {j > 0 && <span>+</span>}
                                        <Input value={val} onChange={e => setGoals(produce(draft => { draft[i].coeffs[j] = e.target.value }))} className="w-20" />
                                        <Label className="font-normal">x<sub>{j+1}</sub></Label>
                                    </React.Fragment>
                                ))}
                                <Select value={goal.type} onValueChange={v => setGoals(produce(draft => { draft[i].type = v }))}><SelectTrigger className="w-20"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="<=">&le;</SelectItem><SelectItem value=">=">&ge;</SelectItem><SelectItem value="==">=</SelectItem></SelectContent></Select>
                                <Input value={goal.target} onChange={e => setGoals(produce(draft => { draft[i].target = e.target.value }))} className="w-20" />
                                <Input value={goal.priority} onChange={e => setGoals(produce(draft => { draft[i].priority = e.target.value }))} className="w-20" placeholder="Priority" />
                            </div>
                        ))}
                    </div>

                    {numConstraints > 0 && (
                        <div className="space-y-2">
                            <Label className="font-semibold">Hard Constraints</Label>
                            {constraints.map((c, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    {c.coeffs.map((val, j) => (
                                        <React.Fragment key={j}>
                                            {j > 0 && <span>+</span>}
                                            <Input value={val} onChange={e => setConstraints(produce(draft => { draft[i].coeffs[j] = e.target.value }))} className="w-20" />
                                            <Label className="font-normal">x<sub>{j+1}</sub></Label>
                                        </React.Fragment>
                                    ))}
                                    <Select value={c.type} onValueChange={v => setConstraints(produce(draft => { draft[i].type = v }))}><SelectTrigger className="w-20"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="<=">&le;</SelectItem><SelectItem value=">=">&ge;</SelectItem><SelectItem value="==">=</SelectItem></SelectContent></Select>
                                    <Input value={c.rhs} onChange={e => setConstraints(produce(draft => { draft[i].rhs = e.target.value }))} className="w-20" />
                                </div>
                            ))}
                        </div>
                    )}

                    <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Solve</Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                    <CardContent>
                        <p><strong>Solution Status:</strong> {result.success ? 'Optimal' : 'Failed'}</p>
                        <p><strong>Deviations from Goals:</strong></p>
                        <ul>{Object.entries(result.deviations).map(([k, v]) => <li key={k}>{k}: {(v as number).toFixed(4)}</li>)}</ul>
                        <p className="mt-2"><strong>Decision Variables:</strong></p>
                        <ul>{result.solution.map((val: number, i: number) => <li key={i}>x<sub>{i+1}</sub>: {val.toFixed(4)}</li>)}</ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
