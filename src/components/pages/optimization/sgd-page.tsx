'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function SgdPage() {
    const { toast } = useToast();
    
    const [learningRate, setLearningRate] = useState(0.05);
    const [epochs, setEpochs] = useState(20);
    const [batchSize, setBatchSize] = useState(1);
    const [startX, setStartX] = useState(4);
    const [startY, setStartY] = useState(4);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                learning_rate: learningRate,
                epochs,
                batch_size: batchSize,
                start_x: startX,
                start_y: startY,
            };

            const response = await fetch('/api/analysis/sgd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                 const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to run simulation');
            }
            const res = await response.json();
            if (res.error) throw new Error(res.error);

            setResult(res);
            toast({ title: "Success", description: "SGD simulation complete." });
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
                    <CardTitle className="flex items-center gap-2"><TrendingDown />Stochastic Gradient Descent (SGD)</CardTitle>
                    <CardDescription>Visualize SGD's optimization path. Each step uses a small batch of data, creating a more erratic but often faster convergence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-1">
                            <Label>Learning Rate</Label>
                            <CardDescription className="text-xs">Controls how large a step to take. (e.g., 0.01)</CardDescription>
                            <Input type="number" value={learningRate} onChange={e => setLearningRate(parseFloat(e.target.value))} step="0.01"/>
                        </div>
                        <div className="space-y-1">
                            <Label>Epochs</Label>
                             <CardDescription className="text-xs">How many times to loop through the entire dataset.</CardDescription>
                            <Input type="number" value={epochs} onChange={e => setEpochs(parseInt(e.target.value))} min="1" max="100"/>
                        </div>
                        <div className="space-y-1">
                            <Label>Batch Size</Label>
                             <CardDescription className="text-xs">Number of samples per gradient update. (1 for SGD)</CardDescription>
                            <Input type="number" value={batchSize} onChange={e => setBatchSize(parseInt(e.target.value))} min="1" max="100"/>
                        </div>
                        <div className="space-y-1">
                            <Label>Start X</Label>
                             <CardDescription className="text-xs">Initial starting point on the X-axis.</CardDescription>
                            <Input type="number" value={startX} onChange={e => setStartX(parseFloat(e.target.value))}/>
                        </div>
                        <div className="space-y-1">
                            <Label>Start Y</Label>
                             <CardDescription className="text-xs">Initial starting point on the Y-axis.</CardDescription>
                            <Input type="number" value={startY} onChange={e => setStartY(parseFloat(e.target.value))}/>
                        </div>
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
                                    marker: { size: 3, color: 'red' },
                                    line: { color: 'red', width: 2},
                                    name: 'SGD Path'
                                },
                                {
                                    x: [-5, 5],
                                    y: [-5, 5],
                                    z: Array(2).fill(null).map(() => Array(2).fill(null)),
                                    type: 'surface',
                                    colorscale: 'Blues',
                                    showscale: false,
                                    opacity: 0.5,
                                    name: 'Function Surface',
                                    cmin: 0,
                                    cmax: 50,
                                    zmin: 0,
                                    zmax: 50,
                                    contours: {
                                        z: {
                                          show: true,
                                          usecolormap: true,
                                          highlightcolor:"#42f462",
                                          project:{z: true}
                                        }
                                      }
                                }
                            ]}
                            layout={{
                                title: `SGD Path for f(x, y) = x² + y²`,
                                autosize: true,
                                scene: {
                                    xaxis: { title: 'X' },
                                    yaxis: { title: 'Y' },
                                    zaxis: { title: 'f(x, y)' },
                                    camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                                }
                            }}
                            useResizeHandler={true}
                            className="w-full h-[600px]"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
