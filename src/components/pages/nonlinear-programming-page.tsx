
'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, HelpCircle, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '../ui/textarea';

interface NlpResult {
    success: boolean;
    message: string;
    solution: number[];
    optimal_value: number;
    iterations: number;
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
    const [constraintsStr, setConstraintsStr] = useState("[{'type': 'ineq', 'fun': 'lambda x: x[0] + 2*x[1] - 1'}]");
    const [boundsStr, setBoundsStr] = useState("[(0, None), (0, None)]");
    const [initialGuessStr, setInitialGuessStr] = useState("[2, 2]");
    const [method, setMethod] = useState('SLSQP');

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<NlpResult | null>(null);

    const handleLoadExample = () => {
        setObjectiveStr("100 * (x[1] - x[0]**2)**2 + (1 - x[0])**2");
        setInitialGuessStr("[2, 2]");
        setBoundsStr("[(0, None), (0, None)]");
        setConstraintsStr("[{'type': 'ineq', 'fun': 'lambda x: x[0] + 2*x[1] - 1'}]");
        setMethod('SLSQP');
        toast({ title: "Example Loaded", description: "Rosenbrock function example has been set up." });
    };

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

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
    }, [objectiveStr, initialGuessStr, boundsStr, constraintsStr, method, toast]);
    
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

                    <div>
                        <Label htmlFor="objective-func">Objective Function (to minimize)</Label>
                        <Textarea id="objective-func" value={objectiveStr} onChange={e => setObjectiveStr(e.target.value)} placeholder="e.g., (x[0] - 1)**2 + (x[1] - 2.5)**2" className="font-mono" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="initial-guess">Initial Guess</Label>
                            <Input id="initial-guess" value={initialGuessStr} onChange={e => setInitialGuessStr(e.target.value)} placeholder="e.g., [0, 0]" className="font-mono"/>
                        </div>
                         <div>
                            <Label htmlFor="bounds">Bounds for Variables</Label>
                            <Input id="bounds" value={boundsStr} onChange={e => setBoundsStr(e.target.value)} placeholder="e.g., [(0, None), (0, 1)]" className="font-mono"/>
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="constraints">Constraints</Label>
                        <Textarea id="constraints" value={constraintsStr} onChange={e => setConstraintsStr(e.target.value)} className="font-mono" rows={4} placeholder="e.g., [{'type': 'ineq', 'fun': 'lambda x: x[0] - 2*x[1] + 2'}]"/>
                    </div>
                    <div>
                        <Label>Solver Method</Label>
                         <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SLSQP">SLSQP</SelectItem>
                                <SelectItem value="COBYLA">COBYLA</SelectItem>
                                <SelectItem value="trust-constr">trust-constr</SelectItem>
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
                                                <TableCell><strong>x{i}</strong></TableCell>
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
