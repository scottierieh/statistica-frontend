
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from "@/lib/utils";

interface LpResult {
    solution: number[];
    optimal_value: number;
    success: boolean;
    message: string;
    snapshots: { note: string; table: number[][] }[];
}

const TableauTable = ({ table, numVars, numConstraints }: { table: number[][], numVars: number, numConstraints: number }) => {
    if (!table || table.length === 0) return null;

    const headers = [...Array(numVars).keys()].map(i => `x${i + 1}`)
        .concat([...Array(numConstraints).keys()].map(i => `s${i + 1}`))
        .concat(['RHS']);
    
    return (
        <div className="overflow-x-auto">
            <Table className="min-w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>Row/Col</TableHead>
                        {headers.map(h => <TableHead key={h} className="text-right">{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {table.map((row, i) => {
                        const rowLabel = i === table.length - 1 ? 'Z' : `Constraint ${i + 1}`;
                        return (
                            <TableRow key={i}>
                                <TableHead>{rowLabel}</TableHead>
                                {row.map((cell, j) => (
                                    <TableCell key={j} className="text-right font-mono">{cell.toFixed(6)}</TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default function LinearProgrammingPage() {
    const { toast } = useToast();
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(3);
    
    const [c, setC] = useState<number[]>(Array(2).fill(0));
    const [A, setA] = useState<number[][]>(Array(3).fill(null).map(() => Array(2).fill(0)));
    const [b, setB] = useState<number[]>(Array(3).fill(0));

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
        setC([-3, -2]); // Objective function is Max Z = 3x1 + 2x2. Negate for minimization problem in scipy.
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
                body: JSON.stringify({ c: c, A_ub: A, b_ub: b, problem_type: 'maximize' })
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
    }, [c, A, b, toast]);

    const getObjectiveFunctionString = () => {
        return "Max Z = " + c.map((val, j) => `${val}·x${j + 1}`).join(' + ');
    };
    
    const getConstraintString = (i: number) => {
        return A[i].map((val, j) => `${val}·x${j + 1}`).join(' + ') + ` ≤ ${b[i]}`;
    };
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Linear Programming (Simplex) Board</CardTitle>
                    <CardDescription>
                        Define your variables and constraints to find the optimal solution. This tool solves maximization problems.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                           <Label htmlFor="num-vars">Number of Variables:</Label>
                           <Input id="num-vars" type="number" value={numVars} onChange={e => setNumVars(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="num-constraints">Number of Constraints:</Label>
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
                                <div>
                                    <Label>Objective Function Coefficients (Max Z = c₁x₁ + c₂x₂ + ...)</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {c.map((val, j) => (
                                            <div key={j} className="flex items-center gap-2">
                                                <Label htmlFor={`c${j}`}>x{j+1}:</Label>
                                                <Input id={`c${j}`} type="number" value={val} onChange={e => handleMatrixChange(e.target.value, 0, j, 'c')} className="w-24" />
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
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Solving...</> : <><Play className="mr-2"/>Solve with Simplex</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card>
                         <CardHeader>
                            <CardTitle>Objective</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-mono">{getObjectiveFunctionString()}</p>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <CardTitle>Constraints</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-1 font-mono">
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
                                <>
                                    <p><strong>Optimal Value (Z*):</strong> <span className="font-mono">{analysisResult.optimal_value.toFixed(6)}</span></p>
                                    {analysisResult.solution.slice(0, numVars).map((s, i) => (
                                        <p key={i}><strong>x{i + 1}:</strong> <span className="font-mono">{s.toFixed(6)}</span></p>
                                    ))}
                                </>
                            ) : (
                                <p className="text-destructive">{analysisResult.message}</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Simplex Tableau Iterations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {analysisResult.snapshots.map((snapshot, index) => (
                                <div key={index}>
                                    <h4 className="font-semibold mb-2">{index + 1}. {snapshot.note}</h4>
                                    <TableauTable table={snapshot.table} numVars={numVars} numConstraints={numConstraints} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
