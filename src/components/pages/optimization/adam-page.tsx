'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Rocket } from 'lucide-react';
import Plot from 'react-plotly.js';
import { produce } from 'immer';

interface AdamResult {
    best_solution: number[];
    best_fitness: number;
    convergence: number[];
}

export default function AdamPage() {
    const { toast } = useToast();
    
    const [objectiveFn, setObjectiveFn] = useState('np.sum(x**2)');
    const [numVars, setNumVars] = useState(2);
    const [bounds, setBounds] = useState([['-10', '10'], ['-10', '10']]);
    const [learningRate, setLearningRate] = useState(0.01);
    const [beta1, setBeta1] = useState(0.9);
    const [beta2, setBeta2] = useState(0.999);
    const [epsilon, setEpsilon] = useState(1e-8);
    const [maxIter, setMaxIter] = useState(1000);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AdamResult | null>(null);

    const handleNumVarsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 10) {
            setNumVars(val);
            setBounds(current => {
                const newBounds = [...current];
                while(newBounds.length < val) newBounds.push(['-10', '10']);
                return newBounds.slice(0, val);
            });
        }
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                objective_function: objectiveFn,
                bounds: bounds.map(r => [parseFloat(r[0]), parseFloat(r[1])]),
                learning_rate: learningRate,
                beta1: beta1,
                beta2: beta2,
                epsilon: epsilon,
                max_iter: maxIter,
            };

            const response = await fetch('/api/analysis/adam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to solve.');
            }
            const res = await response.json();
            if (res.error) throw new Error(res.error);

            setResult(res.results);
            toast({ title: "Success", description: "Adam optimization complete." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Rocket />Adam Optimizer</CardTitle>
                <CardDescription>An adaptive learning rate optimization algorithm that’s been designed specifically for training deep neural networks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Objective Function (Python format, minimize)</Label>
                    <Input value={objectiveFn} onChange={e => setObjectiveFn(e.target.value)} placeholder="e.g., np.sum(x**2)" />
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Variables</Label><Input type="number" value={numVars} onChange={e => handleNumVarsChange(e.target.value)} min="1" max="10"/></div>
                    <div className="space-y-2"><Label>Iterations</Label><Input type="number" value={maxIter} onChange={e => setMaxIter(parseInt(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Learning Rate</Label><Input type="number" value={learningRate} onChange={e => setLearningRate(parseFloat(e.target.value))} step="0.001"/></div>
                    <div className="space-y-2"><Label>Beta 1</Label><Input type="number" value={beta1} onChange={e => setBeta1(parseFloat(e.target.value))} step="0.01"/></div>
                    <div className="space-y-2"><Label>Beta 2</Label><Input type="number" value={beta2} onChange={e => setBeta2(parseFloat(e.target.value))} step="0.001"/></div>
                    <div className="space-y-2"><Label>Epsilon</Label><Input type="number" value={epsilon} onChange={e => setEpsilon(parseFloat(e.target.value))} step="1e-9"/></div>
                </div>
                 <div className="space-y-2">
                    <Label>Variable Bounds</Label>
                    {bounds.map((range, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Label className="w-16">x[{i}]</Label>
                            <Input type="number" value={range[0]} onChange={e => setBounds(produce(draft => {draft[i][0] = e.target.value}))} placeholder="Min" />
                            <Input type="number" value={range[1]} onChange={e => setBounds(produce(draft => {draft[i][1] = e.target.value}))} placeholder="Max" />
                        </div>
                    ))}
                </div>
                <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Solve</Button>
                {result && (
                    <div className="pt-4 space-y-4">
                        <p><strong>Best Solution:</strong> {result.best_solution.map(v => v.toFixed(4)).join(', ')}</p>
                        <p><strong>Best Fitness (Minimum Value):</strong> {result.best_fitness.toFixed(4)}</p>
                        <Plot
                            data={[{
                                x: Array.from({length: result.convergence.length}, (_, i) => i + 1),
                                y: result.convergence,
                                type: 'scatter',
                                mode: 'lines',
                                name: 'Best Fitness'
                            }]}
                            layout={{ title: 'Convergence over Iterations', xaxis: {title: 'Iteration'}, yaxis: {title: 'Fitness'} }}
                            useResizeHandler className="w-full"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
