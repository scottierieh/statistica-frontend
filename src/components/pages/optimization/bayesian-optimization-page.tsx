'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, BrainCircuit } from 'lucide-react';
import dynamic from 'next/dynamic';
import { produce } from 'immer';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface BOResult {
    best_solution: number[];
    best_fitness: number;
    convergence: number[];
    function_evaluations: number[];
}

export default function BayesianOptimizationPage() {
    const { toast } = useToast();
    
    const [objectiveFn, setObjectiveFn] = useState('np.sum(x**2)');
    const [numVars, setNumVars] = useState(2);
    const [bounds, setBounds] = useState([['-10', '10'], ['-10', '10']]);
    const [nCalls, setNCalls] = useState(50);
    const [nInitialPoints, setNInitialPoints] = useState(10);
    const [acqFunc, setAcqFunc] = useState('gp_hedge');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BOResult | null>(null);

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
                n_calls: nCalls,
                n_initial_points: nInitialPoints,
                acq_func: acqFunc,
            };

            const response = await fetch('/api/analysis/bayesian-optimization', {
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
            toast({ title: "Success", description: "Bayesian Optimization complete." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit />Bayesian Optimization</CardTitle>
                <CardDescription>Efficiently find the minimum of a function by building a probabilistic model of it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Objective Function (Python format, minimize)</Label>
                    <Input value={objectiveFn} onChange={e => setObjectiveFn(e.target.value)} placeholder="e.g., np.sum(x**2)" />
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Variables (Dimensions)</Label><Input type="number" value={numVars} onChange={e => handleNumVarsChange(e.target.value)} min="1" max="10"/></div>
                    <div className="space-y-2"><Label>Total Calls</Label><Input type="number" value={nCalls} onChange={e => setNCalls(parseInt(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Initial Points</Label><Input type="number" value={nInitialPoints} onChange={e => setNInitialPoints(parseInt(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Acquisition Func.</Label>
                        <Select value={acqFunc} onValueChange={setAcqFunc}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gp_hedge">gp_hedge</SelectItem>
                                <SelectItem value="EI">EI (Expected Improvement)</SelectItem>
                                <SelectItem value="LCB">LCB (Lower Confidence Bound)</SelectItem>
                                <SelectItem value="PI">PI (Probability of Improvement)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
                            data={[
                                {
                                    x: Array.from({length: result.convergence.length}, (_, i) => i + 1),
                                    y: result.convergence,
                                    type: 'scatter',
                                    mode: 'lines',
                                    name: 'Best Fitness Found'
                                },
                                {
                                    x: Array.from({length: result.function_evaluations.length}, (_, i) => i + 1),
                                    y: result.function_evaluations,
                                    type: 'scatter',
                                    mode: 'markers',
                                    name: 'Function Evaluations',
                                    marker: { opacity: 0.5 }
                                }
                            ]}
                            layout={{ title: 'Convergence over Iterations', xaxis: {title: 'Iteration'}, yaxis: {title: 'Fitness'} }}
                            useResizeHandler className="w-full"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
