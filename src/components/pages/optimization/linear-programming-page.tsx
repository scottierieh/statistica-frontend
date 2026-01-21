'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Plus, Trash2, ArrowRight, Settings } from 'lucide-react';
import { produce } from 'immer';

export default function LinearProgrammingPage() {
    const { toast } = useToast();
    
    // State for problem dimensions
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(2);

    // State for the LP problem components, now using structured arrays
    const [c, setC] = useState<string[]>(['-1', '-2']);
    const [A, setA] = useState<string[][]>([['2', '1'], ['1', '2']]);
    const [b, setB] = useState<string[]>(['20', '20']);
    const [constraintTypes, setConstraintTypes] = useState<string[]>(['<=', '<=']);
    const [objective, setObjective] = useState('maximize');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Handlers to update matrix/vector dimensions
    const updateDimensions = (newVars: number, newConstraints: number) => {
        // Objective function coefficients
        setC(current => {
            const newC = [...current];
            while(newC.length < newVars) newC.push('0');
            return newC.slice(0, newVars);
        });

        // Constraint bounds
        setB(current => {
            const newB = [...current];
            while(newB.length < newConstraints) newB.push('0');
            return newB.slice(0, newConstraints);
        });

        // Constraint types
        setConstraintTypes(current => {
            const newTypes = [...current];
            while(newTypes.length < newConstraints) newTypes.push('<=');
            return newTypes.slice(0, newConstraints);
        });

        // A matrix
        setA(current => {
            const newA = produce(current, draft => {
                // Adjust rows
                while(draft.length < newConstraints) draft.push(Array(current[0]?.length || newVars).fill('0'));
                if(draft.length > newConstraints) draft.splice(newConstraints);

                // Adjust columns
                draft.forEach(row => {
                    while(row.length < newVars) row.push('0');
                    if(row.length > newVars) row.splice(newVars);
                });
            });
            return newA;
        });
    };

    const handleNumVarsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 10) {
            setNumVars(val);
            updateDimensions(val, numConstraints);
        }
    };
    
    const handleNumConstraintsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 10) {
            setNumConstraints(val);
            updateDimensions(numVars, val);
        }
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

            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to solve LP problem.');
            }

            const res = await response.json();
            setResult(res);
            toast({ title: "Success", description: "LP problem solved." });

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
                    <CardTitle>Linear Programming Solver</CardTitle>
                    <CardDescription>Define and solve a linear programming problem using a visual grid.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Settings */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-2">
                            <Label>Objective</Label>
                            <Select value={objective} onValueChange={setObjective as any}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="maximize">Maximize</SelectItem>
                                    <SelectItem value="minimize">Minimize</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="numVars">Variables</Label>
                             <Input id="numVars" type="number" value={numVars} onChange={e => handleNumVarsChange(e.target.value)} min="1" max="10"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="numConstraints">Constraints</Label>
                            <Input id="numConstraints" type="number" value={numConstraints} onChange={e => handleNumConstraintsChange(e.target.value)} min="1" max="10"/>
                        </div>
                    </div>

                    {/* Objective Function */}
                    <div className="space-y-2">
                        <Label>Objective Function (Z)</Label>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            <span>{objective === 'maximize' ? 'Maximize Z = ' : 'Minimize Z = '}</span>
                            {c.map((val, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span>+</span>}
                                    <Input
                                        type="number"
                                        value={val}
                                        onChange={e => setC(produce(draft => { draft[i] = e.target.value }))}
                                        className="w-20 inline-block"
                                    />
                                    <Label className="font-normal">x<sub>{i+1}</sub></Label>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Constraints */}
                    <div className="space-y-2">
                        <Label>Constraints</Label>
                        <div className="space-y-2 overflow-x-auto">
                            {A.map((row, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    {row.map((val, j) => (
                                        <React.Fragment key={j}>
                                            {j > 0 && <span>+</span>}
                                            <Input
                                                type="number"
                                                value={val}
                                                onChange={e => setA(produce(draft => { draft[i][j] = e.target.value }))}
                                                className="w-20"
                                            />
                                            <Label className="font-normal">x<sub>{j+1}</sub></Label>
                                        </React.Fragment>
                                    ))}
                                    <Select value={constraintTypes[i]} onValueChange={val => setConstraintTypes(produce(draft => { draft[i] = val }))}>
                                        <SelectTrigger className="w-20"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="<=">&le;</SelectItem>
                                            <SelectItem value=">=">&ge;</SelectItem>
                                            <SelectItem value="==">=</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={b[i]}
                                        onChange={e => setB(produce(draft => { draft[i] = e.target.value }))}
                                        className="w-20"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading} size="lg">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>}
                        Solve Problem
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p><strong>Optimal Value:</strong> {result.primal_optimal_value?.toFixed(4)}</p>
                        <p className="mt-2"><strong>Solution (Variable Values):</strong></p>
                        <div className="mt-2 space-y-1">
                            {result.primal_solution?.map((val: number, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="font-semibold">x<sub>{i+1}</sub>:</span>
                                    <span className="font-mono p-2 bg-muted rounded-md">{val.toFixed(4)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
