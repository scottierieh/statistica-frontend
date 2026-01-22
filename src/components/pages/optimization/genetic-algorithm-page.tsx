'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, GitBranch } from 'lucide-react';
import dynamic from 'next/dynamic';
import { produce } from 'immer';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface GAResult {
    best_solution: number[];
    best_fitness: number;
    convergence: number[];
}

export default function GeneticAlgorithmPage() {
    const { toast } = useToast();
    
    const [objectiveFn, setObjectiveFn] = useState('np.sin(x[0]) * np.cos(x[1])');
    const [numVars, setNumVars] = useState(2);
    const [varRange, setVarRange] = useState([['-5', '5'], ['-5', '5']]);
    const [popSize, setPopSize] = useState(50);
    const [generations, setGenerations] = useState(100);
    const [mutationRate, setMutationRate] = useState(0.01);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GAResult | null>(null);

    const handleNumVarsChange = (value: string) => {
        const val = parseInt(value, 10);
        if (val > 0 && val <= 5) {
            setNumVars(val);
            setVarRange(current => {
                const newRange = [...current];
                while(newRange.length < val) newRange.push(['-5', '5']);
                return newRange.slice(0, val);
            });
        }
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                objective_function: objectiveFn,
                n_vars: numVars,
                var_range: varRange.map(r => [parseFloat(r[0]), parseFloat(r[1])]),
                pop_size: popSize,
                n_generations: generations,
                mutation_rate: mutationRate
            };

            const response = await fetch('/api/analysis/genetic-algorithm', {
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
            toast({ title: "Success", description: "GA optimization complete." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitBranch />Genetic Algorithm</CardTitle>
                <CardDescription>Optimize a function using an evolutionary algorithm.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Objective Function (Python format)</Label>
                    <Input value={objectiveFn} onChange={e => setObjectiveFn(e.target.value)} placeholder="e.g., np.sin(x[0]) + x[1]**2" />
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Variables</Label><Input type="number" value={numVars} onChange={e => handleNumVarsChange(e.target.value)} min="1" max="5"/></div>
                    <div className="space-y-2"><Label>Population</Label><Input type="number" value={popSize} onChange={e => setPopSize(parseInt(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Generations</Label><Input type="number" value={generations} onChange={e => setGenerations(parseInt(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Mutation Rate</Label><Input type="number" value={mutationRate} onChange={e => setMutationRate(parseFloat(e.target.value))} step="0.01" /></div>
                </div>
                 <div className="space-y-2">
                    <Label>Variable Ranges</Label>
                    {varRange.map((range, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Label className="w-16">x[{i}]</Label>
                            <Input type="number" value={range[0]} onChange={e => setVarRange(prev => produce(prev, draft => {draft[i][0] = e.target.value}))} placeholder="Min" />
                            <Input type="number" value={range[1]} onChange={e => setVarRange(prev => produce(prev, draft => {draft[i][1] = e.target.value}))} placeholder="Max" />
                        </div>
                    ))}
                </div>
                <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Solve</Button>
                {result && (
                    <div className="pt-4 space-y-4">
                        <p><strong>Best Solution:</strong> {result.best_solution.map(v => v.toFixed(4)).join(', ')}</p>
                        <p><strong>Best Fitness:</strong> {result.best_fitness.toFixed(4)}</p>
                        <Plot
                            data={[{
                                x: Array.from({length: result.convergence.length}, (_, i) => i + 1),
                                y: result.convergence,
                                type: 'scatter',
                                mode: 'lines',
                                name: 'Best Fitness'
                            }]}
                            layout={{ title: 'Convergence over Generations', xaxis: {title: 'Generation'}, yaxis: {title: 'Fitness'} }}
                            useResizeHandler className="w-full"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
