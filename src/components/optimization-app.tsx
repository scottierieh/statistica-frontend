
'use client';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, PlayCircle, FlaskConical, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sidebar, SidebarHeader, SidebarContent, SidebarInset, SidebarMenuItem, SidebarMenu, SidebarMenuButton, SidebarProvider, SidebarTrigger } from './ui/sidebar';


interface SimplexIteration {
    title: string;
    tableau: number[][];
}

interface AnalysisResult {
    solution: { [key: string]: number };
    optimal_value: number;
    objective_function_str: string;
    constraints_str: string[];
    iterations: SimplexIteration[];
}

const defaultProblem = {
    c: [3, 2],
    A: [[1, 1], [1, 0], [0, 1]],
    b: [4, 2, 3]
};

const LinearProgrammingTool = () => {
    const { toast } = useToast();
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(3);
    
    const [c, setC] = useState<number[]>(defaultProblem.c);
    const [A, setA] = useState<number[][]>(defaultProblem.A);
    const [b, setB] = useState<number[]>(defaultProblem.b);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showBoard, setShowBoard] = useState(false);
    
    const handleBoardCreate = () => {
        setC(Array(numVars).fill(0));
        setA(Array(numConstraints).fill(0).map(() => Array(numVars).fill(0)));
        setB(Array(numConstraints).fill(0));
        setAnalysisResult(null);
        setShowBoard(true);
    };

    const loadExample = () => {
        setNumVars(2);
        setNumConstraints(3);
        setC(defaultProblem.c);
        setA(defaultProblem.A);
        setB(defaultProblem.b);
        setAnalysisResult(null);
        setShowBoard(true);
    };

    const handleInputChange = (type: 'c' | 'A' | 'b', index: number, subIndex?: number, value?: string) => {
        const numValue = value !== undefined ? parseFloat(value) : 0;
        if (isNaN(numValue)) return;

        if (type === 'c') {
            const newC = [...c];
            newC[index] = numValue;
            setC(newC);
        } else if (type === 'b') {
            const newB = [...b];
            newB[index] = numValue;
            setB(newB);
        } else if (type === 'A' && subIndex !== undefined) {
            const newA = A.map(row => [...row]);
            newA[index][subIndex] = numValue;
            setA(newA);
        }
    };
    
    const runAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ c, A, b })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to run analysis');
            }
            
            const data = await response.json();
            if(data.error) throw new Error(data.error);

            setAnalysisResult(data.results);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    }, [c, A, b, toast]);

    const tableHeaders = useMemo(() => {
        const headers = ['Basis'];
        for (let i = 1; i <= numVars; i++) headers.push(`x${i}`);
        for (let i = 1; i <= numConstraints; i++) headers.push(`s${i}`);
        headers.push('RHS');
        return headers;
    }, [numVars, numConstraints]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Linear Programming (Simplex)</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="num-vars">Variables:</Label>
                        <Input id="num-vars" type="number" value={numVars} onChange={e => setNumVars(Number(e.target.value))} className="w-20" min="1"/>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="num-constraints">Constraints:</Label>
                        <Input id="num-constraints" type="number" value={numConstraints} onChange={e => setNumConstraints(Number(e.target.value))} className="w-20" min="1"/>
                    </div>
                    <Button onClick={handleBoardCreate}>Create Input Board</Button>
                    <Button onClick={loadExample} variant="outline">Load Example</Button>
                </CardContent>
            </Card>

            {showBoard && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Problem Setup</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Objective Function (Max Z)</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {Array.from({ length: numVars }).map((_, i) => (
                                            <div key={`c${i}`} className="flex items-center gap-1">
                                                <Input id={`c${i+1}`} type="number" value={c[i] ?? ''} onChange={e => handleInputChange('c', i, undefined, e.target.value)} className="w-20 h-8"/>
                                                <Label htmlFor={`c${i+1}`} className="text-sm font-mono">x{i+1}</Label>
                                                {i < numVars -1 && <span className="text-sm">+</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                 <div>
                                    <Label>Constraints (Ax ≤ b)</Label>
                                    <div className="space-y-2 mt-2">
                                        {Array.from({ length: numConstraints }).map((_, i) => (
                                            <div key={`con${i}`} className="flex flex-wrap items-center gap-2">
                                                 {Array.from({ length: numVars }).map((_, j) => (
                                                     <div key={`a${i}${j}`} className="flex items-center gap-1">
                                                        <Input id={`a${i+1}${j+1}`} type="number" value={A[i]?.[j] ?? ''} onChange={e => handleInputChange('A', i, j, e.target.value)} className="w-16 h-8"/>
                                                        <Label htmlFor={`a${i+1}${j+1}`} className="text-sm font-mono">x{j+1}</Label>
                                                         {j < numVars -1 && <span className="text-sm">+</span>}
                                                    </div>
                                                 ))}
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-sm font-mono">≤</span>
                                                    <Input id={`b${i+1}`} type="number" value={b[i] ?? ''} onChange={e => handleInputChange('b', i, undefined, e.target.value)} className="w-20 h-8"/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                 <div className="flex justify-end pt-4">
                                     <Button onClick={runAnalysis} disabled={isLoading}>
                                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                        Run Simplex
                                    </Button>
                                 </div>
                            </CardContent>
                        </Card>
                        <div className="space-y-6">
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Objective</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="font-mono text-lg">{analysisResult?.objective_function_str || 'Max Z = ' + c.map((val, i) => `${val}·x${i+1}`).join(' + ')}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Constraints</CardTitle></CardHeader>
                                <CardContent>
                                    <ul className="list-disc pl-5 space-y-1 font-mono">
                                        {(analysisResult?.constraints_str || A.map((row, i) => `${row.map((val, j) => `${val}·x${j+1}`).join(' + ')} ≤ ${b[i]}`)).map((con, i) => (
                                            <li key={i}>{con}</li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    
                    {analysisResult && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Optimal Solution</CardTitle></CardHeader>
                                <CardContent className="space-y-2">
                                     <p><strong>Solution:</strong> {Object.entries(analysisResult.solution).map(([key, val]) => `${key}=${val.toFixed(3)}`).join(', ')}</p>
                                     <p><strong>Optimal Value Z*:</strong> {analysisResult.optimal_value.toFixed(3)}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle className="text-lg">Simplex Iterations</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    {analysisResult.iterations.map((iter, index) => (
                                        <div key={index}>
                                            <h4 className="font-semibold mb-2">{iter.title}</h4>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {tableHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {iter.tableau.map((row, rIndex) => (
                                                            <TableRow key={rIndex}>
                                                                {row.map((cell, cIndex) => <TableCell key={cIndex} className="font-mono">{cell.toFixed(3)}</TableCell>)}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};


export default function OptimizationApp() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Optimization</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={true}
                >
                  <FlaskConical />
                  <span>Linear Programming</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Optimization</h1>
                <div />
            </header>
            <LinearProgrammingTool />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
