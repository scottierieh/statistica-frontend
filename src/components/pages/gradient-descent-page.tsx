
'use client';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, XAxis, YAxis, ZAxis, Tooltip, Scatter, Legend, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface SimulationResult {
  path: [number, number, number][];
  function_expression: string;
  parameters: {
    learning_rate: number;
    start_x: number;
    start_y: number;
    num_steps: number;
  };
}

export default function GradientDescentPage() {
  const { toast } = useToast();
  const [learningRate, setLearningRate] = useState(0.1);
  const [startX, setStartX] = useState(4.0);
  const [startY, setStartY] = useState(4.0);
  const [numSteps, setNumSteps] = useState(50);
  
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SimulationResult | null>(null);

  const handleRunSimulation = useCallback(async () => {
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analysis/gradient-descent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_rate: learningRate, start_x: startX, start_y: startY, num_steps: numSteps }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to run simulation');
      }

      const result: SimulationResult = await response.json();
      if ((result as any).error) throw new Error((result as any).error);

      setAnalysisResult(result);
      toast({ title: 'Success', description: 'Gradient descent simulation completed.' });

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Simulation Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [learningRate, startX, startY, numSteps, toast]);

  const chartData = analysisResult?.path.map(([x, y, z]) => ({ x, y, z }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Gradient Descent Simulation</CardTitle>
          <CardDescription>Visualize how gradient descent finds the minimum of a function.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg text-center bg-muted">
            <p className="font-mono text-lg">Function: f(x, y) = x² + y²</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Learning Rate: {learningRate.toFixed(2)}</Label>
              <Slider
                value={[learningRate]}
                onValueChange={(v) => setLearningRate(v[0])}
                min={0.01}
                max={0.5}
                step={0.01}
              />
            </div>
            <div className="space-y-4">
              <Label>Number of Steps: {numSteps}</Label>
              <Slider
                value={[numSteps]}
                onValueChange={(v) => setNumSteps(v[0])}
                min={10}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
                <Label>Start X</Label>
                <Input type="number" value={startX} onChange={e => setStartX(parseFloat(e.target.value))} step={0.1} />
            </div>
             <div className="space-y-2">
                <Label>Start Y</Label>
                <Input type="number" value={startY} onChange={e => setStartY(parseFloat(e.target.value))} step={0.1} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRunSimulation} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <><Play className="mr-2 h-4 w-4" />Run Simulation</>}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Descent Path Visualization</CardTitle>
            <CardDescription>
                This plot shows the path of gradient descent in 2D space. The size of the points represents the function value (z-axis).
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <p>Loading visualization...</p> : (
                analysisResult && chartData ? (
                <ChartContainer config={{z: {label: 'f(x,y)'}}} className="w-full h-96">
                    <ResponsiveContainer>
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x" name="x" domain={['dataMin - 1', 'dataMax + 1']} />
                        <YAxis type="number" dataKey="y" name="y" domain={['dataMin - 1', 'dataMax + 1']} />
                        <ZAxis type="number" dataKey="z" name="z" range={[20, 400]}/>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                        <Legend />
                        <Scatter name="Path" data={chartData} fill="hsl(var(--primary))" line shape="circle" />
                    </ScatterChart>
                    </ResponsiveContainer>
                </ChartContainer>
                ) : (
                    <div className="h-96 flex items-center justify-center text-muted-foreground">Run simulation to see the visualization.</div>
                )
            )}
        </CardContent>
      </Card>
    </div>
  );
}
