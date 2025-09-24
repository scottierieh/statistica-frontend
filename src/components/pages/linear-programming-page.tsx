
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
}

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
        setC([-3, -5]);
        setA([[1, 0], [0, 2], [3, 2]]);
        setB([4, 12, 18]);
        setAnalysisResult(null); // Clear previous results
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
            // SciPy's linprog minimizes, so for maximization, we must negate the objective function coefficients.
            const c_to_send = c.map(val => -val);

            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ c: c_to_send, A_ub: A, b_ub: b })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: LpResult = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Since we negated 'c' for maximization, we negate the result back.
            result.optimal_value = -result.optimal_value;
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [c, A, b, toast]);

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
                <Card>
                    <CardHeader>
                        <CardTitle>Optimal Solution</CardTitle>
                        <CardDescription>{analysisResult.message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analysisResult.success ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Optimal Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.solution.map((val, i) => (
                                        <TableRow key={i}>
                                            <TableCell>x{i+1}</TableCell>
                                            <TableCell className="text-right font-mono">{val.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold border-t-2 bg-muted/50">
                                        <TableCell>Maximum Objective Value (Z)</TableCell>
                                        <TableCell className="text-right font-mono text-lg">{analysisResult.optimal_value.toFixed(4)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-destructive">{analysisResult.message}</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = "Textarea";
