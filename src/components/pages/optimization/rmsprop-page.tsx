'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Wind } from 'lucide-react';
import dynamic from 'next/dynamic';
import { produce } from 'immer';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface RMSPropResult {
    best_solution: number[];
    best_fitness: number;
    convergence: number[];
}

export default function RmspropPage() {
    const { toast } = useToast();
    
    const [objectiveFn, setObjectiveFn] = useState('np.sum(x**2)');
    const [numVars, setNumVars] = useState(2);
    const [bounds, setBounds] = useState([['-10', '10'], ['-10', '10']]);
    const [learningRate, setLearningRate] = useState(0.01);
    const [decayRate, setDecayRate] = useState(0.9);
    const [epsilon, setEpsilon] = useState(1e-8);
    const [maxIter, setMaxIter] = useState(1000);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<RMSPropResult | null>(null);

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
                decay_rate: decayRate,
                epsilon: epsilon,
                max_iter: maxIter,
            };

            const response = await fetch('/api/analysis/rmsprop', {
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
            toast({ title: "Success", description: "RMSProp optimization complete." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wind />RMSProp Optimizer</CardTitle>
                <CardDescription>An adaptive learning rate method that divides the learning rate for a weight by a running average of the magnitudes of recent gradients for that weight.</CardDescription>
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
                    <div className="space-y-2"><Label>Decay Rate (γ)</Label><Input type="number" value={decayRate} onChange={e => setDecayRate(parseFloat(e.target.value))} step="0.01"/></div>
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
