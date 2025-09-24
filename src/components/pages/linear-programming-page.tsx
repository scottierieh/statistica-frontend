
'use client';
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LpResult {
    solution: number[];
    optimal_value: number;
    success: boolean;
    message: string;
}

export default function LinearProgrammingPage() {
    const { toast } = useToast();
    const [c, setC] = useState('-1, -2'); // Objective function coefficients
    const [A, setA] = useState('2, 1\n1, 2'); // Inequality constraint matrix
    const [b, setB] = useState('20, 20'); // Inequality constraint vector

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<LpResult | null>(null);
    
    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const parsedC = c.split(',').map(s => parseFloat(s.trim()));
            const parsedB = b.split(',').map(s => parseFloat(s.trim()));
            const parsedA = A.split('\n').map(row => row.split(',').map(s => parseFloat(s.trim())));

            if (parsedA.some(row => row.length !== parsedC.length) || parsedA.length !== parsedB.length) {
                throw new Error("Matrix and vector dimensions do not match.");
            }

            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ c: parsedC, A_ub: parsedA, b_ub: parsedB })
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

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Linear Programming Solver</CardTitle>
                    <CardDescription>
                        Solve linear programming problems of the form: minimize c' * x subject to A_ub * x &lt;= b_ub. 
                        Enter coefficients and matrix values separated by commas, and matrix rows on new lines.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="c-input">Objective Function Coefficients (c)</Label>
                        <Input id="c-input" value={c} onChange={e => setC(e.target.value)} placeholder="-1, -2" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="A-input">Inequality Constraint Matrix (A_ub)</Label>
                            <Textarea id="A-input" value={A} onChange={e => setA(e.target.value)} placeholder="2, 1\n1, 2" rows={4} />
                        </div>
                        <div>
                            <Label htmlFor="b-input">Inequality Constraint Vector (b_ub)</Label>
                            <Input id="b-input" value={b} onChange={e => setB(e.target.value)} placeholder="20, 20" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Solving...</> : <><Sigma className="mr-2"/>Solve</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Results</CardTitle>
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
                                            <TableCell>x[{i}]</TableCell>
                                            <TableCell className="text-right font-mono">{val.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold border-t">
                                        <TableCell>Optimal Objective Value</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.optimal_value.toFixed(4)}</TableCell>
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

// A temporary Textarea component until it's added to the UI library
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
