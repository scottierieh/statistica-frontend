
'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface LpResult {
    solution: number[];
    optimal_value: number;
    success: boolean;
    message: string;
    tableau_steps?: number[][][];
}

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Linear Programming</CardTitle>
                    <CardDescription className="text-base pt-2">
                        A powerful mathematical optimization technique to find the maximum profit or minimum cost using limited resources.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-left space-y-4">
                    <p>
                        Linear programming addresses how to optimize (maximize or minimize) a linear objective function under given linear constraints. This tool uses the Simplex algorithm to find the solution.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Objective Function:</strong> A linear equation representing the goal to be maximized or minimized (e.g., `Max Z = 3x₁ + 2x₂`).</li>
                        <li><strong>Constraints:</strong> Linear inequalities representing the limits of available resources (e.g., `x₁ + x₂ ≤ 4`).</li>
                        <li><strong>Optimal Solution:</strong> The values of the variables (x₁, x₂, ...) that optimize the objective function while satisfying all constraints.</li>
                    </ul>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={onStart}>Get Started</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function LinearProgrammingPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(3);
    const [objective, setObjective] = useState<'maximize' | 'minimize'>('maximize');
    
    const [c, setC] = useState<number[]>([3, 2]);
    const [A, setA] = useState<number[][]>([[1, 1], [1, 0], [0, 1]]);
    const [b, setB] = useState<number[]>([4, 2, 3]);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<LpResult | null>(null);

    const handleBoardCreation = () => {
        const vars = Math.max(1, numVars);
        const constraints = Math.max(1, numConstraints);
        setC(Array(vars).fill(0));
        setA(Array(constraints).fill(null).map(() => Array(vars).fill(0)));
        setB(Array(constraints).fill(0));
    };

    const handleLoadExample = () => {
        setNumVars(2);
        setNumConstraints(3);
        setObjective('maximize');
        setC([3, 2]); 
        setA([[1, 1], [1, 0], [0, 1]]);
        setB([4, 2, 3]);
        setAnalysisResult(null);
        toast({ title: "Sample Data Loaded", description: "Example maximization problem has been set up." });
    };

    const handleMatrixChange = (val: string, i: number, j: number, type: 'A' | 'b' | 'c') => {
        const numVal = parseFloat(val) || 0;
        if (type === 'A') {
            const newA = [...A];
            newA[i][j] = numVal;
            setA(newA);
        } else if (type === 'b') {
            const newB = [...b];
            newB[i] = numVal;
            setB(newB);
        } else if (type === 'c') {
            const newC = [...c];
            newC[j] = numVal;
            setC(newC);
        }
    };
    
    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ c, A_ub: A, b_ub: b, objective })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: LpResult = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [c, A, b, objective, toast]);

    const getObjectiveFunctionString = () => {
        return `${objective === 'maximize' ? 'Max' : 'Min'} Z = ` + c.map((val, j) => `${val}·x${j + 1}`).join(' + ');
    };
    
    const getConstraintString = (i: number) => {
        return A[i].map((val, j) => `${val}·x${j + 1}`).join(' + ') + ` ≤ ${b[i]}`;
    };

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Linear Programming Board</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Define your variables and constraints to find the optimal solution.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                           <Label htmlFor="num-vars">Variables:</Label>
                           <Input id="num-vars" type="number" value={numVars} onChange={e => setNumVars(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="num-constraints">Constraints:</Label>
                            <Input id="num-constraints" type="number" value={numConstraints} onChange={e => setNumConstraints(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <Button onClick={handleBoardCreation}>
                            <Asterisk className="mr-2 h-4 w-4" />Create Board
                        </Button>
                        <Button variant="outline" onClick={handleLoadExample}>
                           <FileJson className="mr-2 h-4 w-4" /> Load Example
                        </Button>
                    </div>
                    
                    <div className="space-y-6 pt-4">
                        <div>
                            <h3 className="font-semibold">Problem Setup</h3>
                            <div className="mt-4 p-4 border rounded-lg space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <Label>Objective Function</Label>
                                         <Select value={objective} onValueChange={(v) => setObjective(v as any)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="maximize">Maximize</SelectItem>
                                                <SelectItem value="minimize">Minimize</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-2">
                                        {c.map((val, j) => (
                                            <div key={j} className="flex-1 min-w-[100px]">
                                                <Label htmlFor={`c${j}`}>x{j+1} Coeff:</Label>
                                                <Input id={`c${j}`} type="number" value={val} onChange={e => handleMatrixChange(e.target.value, 0, j, 'c')} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4">
                                     <Label>Constraints (Σaᵢⱼxⱼ ≤ bᵢ)</Label>
                                     <div className="grid grid-cols-1 gap-2 mt-2">
                                        {A.map((row, i) => (
                                            <div key={i} className="flex flex-wrap items-center gap-4 p-2 rounded-md bg-muted/20">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {row.map((val, j) => (
                                                        <div key={j} className="flex items-center gap-2">
                                                            <Label htmlFor={`a${i+1}${j+1}`}>x{j+1}:</Label>
                                                            <Input id={`a${i+1}${j+1}`} type="number" value={val} onChange={e => handleMatrixChange(e.target.value, i, j, 'A')} className="w-24"/>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">≤</span>
                                                    <Input id={`b${i+1}`} type="number" value={b[i]} onChange={e => handleMatrixChange(e.target.value, i, 0, 'b')} className="w-24"/>
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            </div>
                        </div>
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
                            <CardTitle>Problem Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="font-semibold">{getObjectiveFunctionString()}</p>
                            <p className="mt-2 text-muted-foreground">Subject to:</p>
                            <ul className="list-disc pl-5 mt-1 space-y-1 font-mono">
                                {A.map((_, i) => <li key={i}>{getConstraintString(i)}</li>)}
                            </ul>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Optimal Solution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analysisResult.success ? (
                                <div>
                                    <p><strong>Optimal Value (Z*):</strong> <span className="font-mono">{analysisResult.optimal_value.toFixed(6)}</span></p>
                                    <Table className="mt-2">
                                        <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {analysisResult.solution.map((s, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><strong>x{i + 1}</strong></TableCell>
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
                    {analysisResult.tableau_steps && analysisResult.tableau_steps.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Simplex Tableau Steps</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analysisResult.tableau_steps.map((step, index) => (
                                        <div key={index}>
                                            <h4 className="font-semibold">Iteration {index}</h4>
                                            <Table>
                                                <TableBody>
                                                    {step.map((row, i) => (
                                                        <TableRow key={i}>
                                                            {row.map((cell, j) => (
                                                                <TableCell key={j} className="font-mono text-right">{cell.toFixed(2)}</TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
