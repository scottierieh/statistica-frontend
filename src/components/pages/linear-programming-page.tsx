
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle, Truck, MoveRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Image from 'next/image';
import { produce } from 'immer';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface LpResult {
    primal_solution?: number[];
    solution?: number[]; // For MILP
    primal_optimal_value?: number;
    optimal_value?: number; // For MILP
    success: boolean;
    message?: string;
    interpretation?: string;
    plot?: string;
    sensitivity?: {
        slack: number[];
        shadow_prices_ub: number[];
        shadow_prices_eq: number[];
    };
    dual_problem?: {
        objective: string;
        c: number[];
        A: number[][];
        b: number[];
        constraint_types: string[];
    };
    dual_solution?: {
        solution: number[];
        optimal_value: number;
    };
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Sigma size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Linear Programming</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A powerful mathematical optimization technique to find the maximum profit or minimum cost using limited resources.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-left space-y-4 px-8 py-10">
                    <p>
                        Linear programming addresses how to optimize (maximize or minimize) a linear objective function under given linear constraints. This tool uses the Simplex algorithm to find the solution.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li><strong>Objective Function:</strong> A linear equation representing the goal to be maximized or minimized (e.g., `Max Z = 3x + 2y`).</li>
                        <li><strong>Constraints:</strong> Linear inequalities representing the limits of available resources (e.g., `x + y ≤ 4`).</li>
                        <li><strong>Optimal Solution:</strong> The values of the variables (x, y, ...) that optimize the objective function while satisfying all constraints.</li>
                    </ul>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     <Button variant="outline" onClick={onLoadExample}>Load Example</Button>
                     <Button size="lg" onClick={onStart}>Get Started <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export default function LinearProgrammingPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(2);
    const [objective, setObjective] = useState<'maximize' | 'minimize'>('maximize');
    const [problemType, setProblemType] = useState<'lp' | 'integer' | 'milp'>('lp');
    
    const [c, setC] = useState<number[]>([3, 2]);
    const [A, setA] = useState<number[][]>([[1, 1], [1, 0]]);
    const [b, setB] = useState<number[]>([4, 2]);
    const [constraintTypes, setConstraintTypes] = useState<string[]>(['<=', '<=']);
    const [variableTypes, setVariableTypes] = useState<string[]>(['continuous', 'continuous']);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<LpResult | null>(null);

    const decisionVars = React.useMemo(() => {
        if (numVars === 2) return ['x', 'y'];
        return Array.from({ length: numVars }, (_, i) => `x${i + 1}`);
    }, [numVars]);

    const handleBoardCreation = () => {
        const vars = Math.max(1, numVars);
        const constraints = Math.max(1, numConstraints);
        setC(Array(vars).fill(0));
        setA(Array(constraints).fill(null).map(() => Array(vars).fill(0)));
        setB(Array(constraints).fill(0));
        setConstraintTypes(Array(constraints).fill('<='));
        setVariableTypes(Array(vars).fill('continuous'));
        setAnalysisResult(null);
    };

    const handleLoadExample = () => {
        setNumVars(2);
        setNumConstraints(2);
        setObjective('maximize');
        setProblemType('lp');
        setC([3, 2]); 
        setA([[1, 1], [1, 0]]);
        setB([4, 2]);
        setConstraintTypes(['<=', '<=']);
        setVariableTypes(['continuous', 'continuous']);
        setAnalysisResult(null);
        setView('main');
        toast({ title: "Sample Data Loaded", description: "Example optimization problem has been set up." });
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
    
    const handleConstraintTypeChange = (i: number, value: string) => {
        const newTypes = [...constraintTypes];
        newTypes[i] = value;
        setConstraintTypes(newTypes);
    }
    
    const handleVariableTypeChange = (j: number, value: string) => {
        const newTypes = [...variableTypes];
        newTypes[j] = value;
        setVariableTypes(newTypes);
    }
    
    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ c, A, b, constraint_types: constraintTypes, objective, problem_type: problemType, variable_types: variableTypes })
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
    }, [c, A, b, objective, problemType, variableTypes, toast, constraintTypes]);

    const getObjectiveFunctionString = () => {
        return `${objective === 'maximize' ? 'Max' : 'Min'} Z = ` + c.map((val, j) => `${val}·${decisionVars[j]}`).join(' + ');
    };
    
    const getConstraintString = (i: number) => {
        return A[i].map((val, j) => `${val}·${decisionVars[j]}`).join(' + ') + ` ${constraintTypes[i]} ${b[i]}`;
    };


    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExample} />;
    }
    
    const primalSolution = analysisResult?.primal_solution ?? analysisResult?.solution;
    const optimalValue = analysisResult?.primal_optimal_value ?? analysisResult?.optimal_value;

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
                                    <div>
                                        <Label>Problem Type</Label>
                                         <Select value={problemType} onValueChange={(v) => setProblemType(v as any)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lp">Standard LP</SelectItem>
                                                <SelectItem value="integer">Integer Programming (MILP)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    {c.map((val, j) => (
                                        <div key={j} className="flex-1 min-w-[100px]">
                                            <Label htmlFor={`c${j}`}>{decisionVars[j]} Coeff:</Label>
                                            <Input id={`c${j}`} type="number" value={val} onChange={e => handleMatrixChange(e.target.value, 0, j, 'c')} />
                                        </div>
                                    ))}
                                </div>
                                {problemType === 'integer' && (
                                    <div className="mt-4">
                                        <Label>Variable Types</Label>
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            {variableTypes.map((vType, j) => (
                                                <div key={j}>
                                                    <Label htmlFor={`vtype${j}`}>{decisionVars[j]}</Label>
                                                    <Select value={vType} onValueChange={value => handleVariableTypeChange(j, value)}>
                                                        <SelectTrigger id={`vtype${j}`}><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="continuous">Continuous</SelectItem>
                                                            <SelectItem value="integer">Integer</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4">
                                     <Label>Constraints</Label>
                                     <div className="grid grid-cols-1 gap-2 mt-2">
                                        {A.map((row, i) => (
                                            <div key={i} className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-muted/20">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {row.map((val, j) => (
                                                        <div key={j} className="flex items-center gap-1">
                                                            <Input id={`a${i+1}${j+1}`} type="number" value={val} onChange={e => handleMatrixChange(e.target.value, i, j, 'A')} className="w-20"/>
                                                            <Label>· {decisionVars[j]}</Label>
                                                            {j < decisionVars.length - 1 && <span className="mx-1 font-semibold">+</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="w-[80px]">
                                                     <Select value={constraintTypes[i]} onValueChange={(v) => handleConstraintTypeChange(i, v)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent><SelectItem value="<=">≤</SelectItem><SelectItem value="==">=</SelectItem><SelectItem value=">=">≥</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                                <Input id={`b${i+1}`} type="number" value={b[i]} onChange={e => handleMatrixChange(e.target.value, i, 0, 'b')} className="w-24"/>
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

            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    {analysisResult.interpretation && (
                        <Card>
                            <CardHeader><CardTitle>Interpretation</CardTitle></CardHeader>
                            <CardContent>
                                <Alert>
                                    <AlertTitle>Summary of Results</AlertTitle>
                                    <AlertDescription dangerouslySetInnerHTML={{ __html: analysisResult.interpretation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Optimal Solution</CardTitle>
                                {analysisResult.success ? (
                                    <CardDescription>The optimal values for the decision variables.</CardDescription>
                                ) : <CardDescription className="text-destructive">No optimal solution found.</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                {analysisResult.success ? (
                                    <div>
                                        <p><strong>Optimal Value (Z*):</strong> <span className="font-mono text-lg text-primary">{optimalValue?.toFixed(2)}</span></p>
                                        <Table className="mt-2">
                                            <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Optimal Value</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {primalSolution?.map((s, i) => (
                                                    <TableRow key={i}><TableCell><strong>{decisionVars[i]}</strong></TableCell><TableCell className="font-mono text-right">{s.toFixed(4)}</TableCell></TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-destructive">{analysisResult.message}</p>
                                )}
                            </CardContent>
                        </Card>
                        {analysisResult.plot && (
                             <Card>
                                <CardHeader>
                                    <CardTitle>Feasible Region Plot</CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <Image src={analysisResult.plot} alt="Feasible Region Plot" width={600} height={600} className="w-full rounded-md border" />
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
