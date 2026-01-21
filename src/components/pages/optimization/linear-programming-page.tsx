'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';

export default function LinearProgrammingPage() {
    const { toast } = useToast();
    const [c, setC] = useState('[ -1, -2 ]');
    const [A, setA] = useState('[[ 2, 1 ], [ 1, 2 ]]');
    const [b, setB] = useState('[ 20, 20 ]');
    const [constraintTypes, setConstraintTypes] = useState('[ "<=", "<=" ]');
    const [objective, setObjective] = useState('maximize');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                c: JSON.parse(c),
                A: JSON.parse(A),
                b: JSON.parse(b),
                constraint_types: JSON.parse(constraintTypes),
                objective,
            };
            
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
                    <CardDescription>Define and solve a linear programming problem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Objective Function Coefficients (c)</Label>
                            <Textarea value={c} onChange={e => setC(e.target.value)} placeholder="e.g., [ -1, -2 ]" />
                        </div>
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
                    </div>
                    <div className="space-y-2">
                        <Label>Constraint Matrix (A)</Label>
                        <Textarea value={A} onChange={e => setA(e.target.value)} placeholder="e.g., [[ 2, 1 ], [ 1, 2 ]]" rows={4} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Constraint Bounds (b)</Label>
                            <Textarea value={b} onChange={e => setB(e.target.value)} placeholder="e.g., [ 20, 20 ]" />
                        </div>
                         <div className="space-y-2">
                            <Label>Constraint Types</Label>
                            <Textarea value={constraintTypes} onChange={e => setConstraintTypes(e.target.value)} placeholder='e.g., [ "<=", "<=" ]' />
                        </div>
                    </div>
                    <Button onClick={handleSolve} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>}
                        Solve
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
                        <pre className="mt-1 p-2 bg-muted rounded-md text-sm">
                            {JSON.stringify(result.primal_solution, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
