'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import { produce } from 'immer';

export default function IntegerProgrammingPage() {
    const { toast } = useToast();
    
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(2);
    const [c, setC] = useState<string[]>(['-1', '-2']);
    const [A, setA] = useState<string[][]>([['2', '1'], ['1', '2']]);
    const [b, setB] = useState<string[]>(['20', '20']);
    const [constraintTypes, setConstraintTypes] = useState<string[]>(['<=', '<=']);
    const [variableTypes, setVariableTypes] = useState<string[]>(['continuous', 'continuous']);
    const [objective, setObjective] = useState('maximize');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const updateDimensions = (newVars: number, newConstraints: number) => {
        setC(current => Array(newVars).fill('0').map((v, i) => current[i] || v));
        setB(current => Array(newConstraints).fill('0').map((v, i) => current[i] || v));
        setConstraintTypes(current => Array(newConstraints).fill('<=').map((v, i) => current[i] || v));
        setVariableTypes(current => Array(newVars).fill('continuous').map((v, i) => current[i] || v));

        setA(current => {
            const newA = Array(newConstraints).fill(0).map(() => Array(newVars).fill('0'));
            for (let i = 0; i < Math.min(newConstraints, current.length); i++) {
                for (let j = 0; j < Math.min(newVars, current[i]?.length || 0); j++) {
                    newA[i][j] = current[i][j];
                }
            }
            return newA;
        });
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
                problem_type: 'milp'
            };
            
            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                 const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to solve MILP problem.');
            }
            const res = await response.json();
            if (res.error) throw new Error(res.error);

            setResult(res);
            toast({ title: "Success", description: "Integer Programming problem solved." });
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
                    <CardTitle>Integer Programming Solver</CardTitle>
                    <CardDescription>Solve linear problems where some or all variables must be integers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                        <div><Label>Objective</Label><Select value={objective} onValueChange={setObjective as any}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="maximize">Maximize</SelectItem><SelectItem value="minimize">Minimize</SelectItem></SelectContent></Select></div>
                        <div><Label>Variables</Label><Input type="number" value={numVars} onChange={e => { const v = parseInt(e.target.value); if (v > 0 && v <= 10) { setNumVars(v); updateDimensions(v, numConstraints); }}} min="1" max="10"/></div>
                        <div><Label>Constraints</Label><Input type="number" value={numConstraints} onChange={e => { const v = parseInt(e.target.value); if (v > 0 && v <= 10) { setNumConstraints(v); updateDimensions(numVars, v); }}} min="1" max="10"/></div>
                    </div>

                    <div>
                        <Label>Objective Function & Variable Types</Label>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                           <span>{objective === 'maximize' ? 'Maximize Z = ' : 'Minimize Z = '}</span>
                            {c.map((val, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span>+</span>}
                                    <div className="flex flex-col items-center gap-1">
                                        <Input value={val} onChange={e => setC(produce(draft => { draft[i] = e.target.value }))} className="w-20"/>
                                        <div className="flex items-center gap-1"><Label className="text-xs">x<sub>{i+1}</sub></Label></div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                         <div className="flex items-center gap-4 mt-2">
                            {variableTypes.map((type, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                    <Checkbox id={`int-${i}`} checked={type === 'integer'} onCheckedChange={checked => setVariableTypes(produce(draft => {draft[i] = checked ? 'integer' : 'continuous'}))} />
                                    <Label htmlFor={`int-${i}`}>x<sub>{i+1}</sub> is Integer</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Constraints</Label>
                        {A.map((row, i) => (
                             <div key={i} className="flex items-center gap-2 overflow-x-auto">
                                {row.map((val, j) => (
                                    <React.Fragment key={j}>
                                        {j > 0 && <span>+</span>}
                                        <Input value={val} onChange={e => setA(produce(draft => { draft[i][j] = e.target.value }))} className="w-20" />
                                        <Label className="font-normal">x<sub>{j+1}</sub></Label>
                                    </React.Fragment>
                                ))}
                                <Select value={constraintTypes[i]} onValueChange={val => setConstraintTypes(produce(draft => { draft[i] = val }))}><SelectTrigger className="w-20"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="<=">&le;</SelectItem><SelectItem value=">=">&ge;</SelectItem><SelectItem value="==">=</SelectItem></SelectContent></Select>
                                <Input value={b[i]} onChange={e => setB(produce(draft => { draft[i] = e.target.value }))} className="w-20" />
                            </div>
                        ))}
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Solve</Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                    <CardContent>
                        <p><strong>Solution Status:</strong> {result.success ? 'Optimal' : 'Failed'}</p>
                        <p><strong>Optimal Value:</strong> {result.optimal_value?.toFixed(4)}</p>
                        <p className="mt-2"><strong>Decision Variables:</strong></p>
                        <ul>{result.solution?.map((val: number, i: number) => <li key={i}>x<sub>{i+1}</sub>: {val.toFixed(4)}</li>)}</ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
