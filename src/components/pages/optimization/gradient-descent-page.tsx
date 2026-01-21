'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import Plot from 'react-plotly.js';

export default function GradientDescentPage() {
    const { toast } = useToast();
    
    const [learningRate, setLearningRate] = useState(0.1);
    const [startX, setStartX] = useState(4);
    const [startY, setStartY] = useState(4);
    const [numSteps, setNumSteps] = useState(50);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                learning_rate: learningRate,
                start_x: startX,
                start_y: startY,
                num_steps: numSteps,
            };

            const response = await fetch('/api/analysis/gradient-descent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(await response.text());
            const res = await response.json();
            if (res.error) throw new Error(res.error);

            setResult(res);
            toast({ title: "Success", description: "Gradient Descent simulation complete." });
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
                    <CardTitle>Gradient Descent Simulation</CardTitle>
                    <CardDescription>Visualize the path of gradient descent on a simple quadratic function.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-2"><Label>Learning Rate</Label><Input type="number" value={learningRate} onChange={e => setLearningRate(parseFloat(e.target.value))} step="0.01"/></div>
                        <div className="space-y-2"><Label>Start X</Label><Input type="number" value={startX} onChange={e => setStartX(parseFloat(e.target.value))}/></div>
                        <div className="space-y-2"><Label>Start Y</Label><Input type="number" value={startY} onChange={e => setStartY(parseFloat(e.target.value))}/></div>
                        <div className="space-y-2"><Label>Steps</Label><Input type="number" value={numSteps} onChange={e => setNumSteps(parseInt(e.target.value))} min="1" max="200"/></div>
                    </div>
                    <Button onClick={handleSolve} disabled={isLoading}><Play className="mr-2"/>Simulate</Button>
                </CardContent>
            </Card>

            {isLoading && <div className="flex justify-center"><Loader2 className="animate-spin"/></div>}

            {result && (
                <Card>
                    <CardHeader><CardTitle>Simulation Results</CardTitle></CardHeader>
                    <CardContent>
                        <p><strong>Final Position:</strong> ({result.path[result.path.length-1][0].toFixed(4)}, {result.path[result.path.length-1][1].toFixed(4)})</p>
                        <p><strong>Final Value:</strong> {result.path[result.path.length-1][2].toFixed(4)}</p>
                        <Plot
                            data={[
                                {
                                    x: result.path.map((p: number[]) => p[0]),
                                    y: result.path.map((p: number[]) => p[1]),
                                    z: result.path.map((p: number[]) => p[2]),
                                    type: 'scatter3d',
                                    mode: 'lines+markers',
                                    marker: { size: 4 },
                                    name: 'Path'
                                },
                                {
                                    x: result.path.map((p: number[]) => p[0]),
                                    y: result.path.map((p: number[]) => p[1]),
                                    z: result.path.map((p: number[]) => p[2]),
                                    type: 'surface',
                                    colorscale: 'Viridis',
                                    showscale: false,
                                    opacity: 0.5,
                                    name: 'Function Surface'
                                }
                            ]}
                            layout={{
                                title: `Gradient Descent Path for f(x, y) = x² + y²`,
                                autosize: true,
                                scene: {
                                    xaxis: { title: 'X' },
                                    yaxis: { title: 'Y' },
                                    zaxis: { title: 'f(x, y)' },
                                }
                            }}
                            useResizeHandler={true}
                            className="w-full h-[500px]"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
