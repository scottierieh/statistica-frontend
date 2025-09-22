
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Container, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface KnnRegressionResults {
    metrics: {
        r2_score: number;
        rmse: number;
        mae: number;
    };
    predictions: { actual: number; predicted: number }[];
}

interface FullAnalysisResponse {
    results: KnnRegressionResults;
    plot: string;
}

const WhatIfSimulation = ({ features, onSimulate }: { features: string[], onSimulate: (state: any) => number }) => {
    const initialWhatIfState = useMemo(() => {
        const state: {[key: string]: number} = {};
        features.forEach(f => state[f] = 50);
        return state;
    }, [features]);

    const [whatIfState, setWhatIfState] = useState(initialWhatIfState);
    const simulatedResult = onSimulate(whatIfState);

    return (
        <Card>
            <CardHeader>
                <CardTitle>What-If Simulation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                        {features.map(feature => (
                            <div key={feature}>
                                <Label>{feature}: {whatIfState[feature].toFixed(0)}</Label>
                                <Slider
                                    value={[whatIfState[feature]]}
                                    onValueChange={(v) => setWhatIfState(prev => ({...prev, [feature]: v[0]}))}
                                    max={100}
                                    step={1}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-muted-foreground">Predicted Outcome</p>
                            <p className="text-4xl font-bold">{simulatedResult.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


export default function KnnRegressionPage() {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [k, setK] = useState(5);
    const [testSize, setTestSize] = useState(0.2);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<DataSet>([]);
    const [numericHeaders, setNumericHeaders] = useState<string[]>([]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/knn-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target, features, k, test_size: testSize })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
        } catch (e: any) {
            console.error('KNN Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, k, testSize, toast]);

    const handleSimulation = (state: any) => {
        // This is a mock simulation. A real one would use the trained model.
        if (!analysisResult) return 0;
        const basePrediction = analysisResult.results.metrics.rmse; 
        const influence = Object.values(state).reduce((acc: number, v: any) => acc + (v-50), 0);
        return basePrediction + influence;
    }
    
    // Dummy onLoadExample to satisfy props
    const onLoadExample = () => {};

    if (!canRun) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">K-Nearest Neighbors Regression</CardTitle>
                        <CardDescription>
                           Upload data with numeric features and a target variable.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">KNN Regression Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Features</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                               {numericHeaders.filter(h => h !== target).map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => setFeatures(prev => c ? [...prev, h] : prev.filter(f => f !== h))} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>K (Number of Neighbors)</Label>
                            <Input type="number" value={k} onChange={e => setK(Number(e.target.value))} min="1"/>
                        </div>
                         <div>
                            <Label>Test Set Size</Label>
                            <Slider value={[testSize]} onValueChange={v => setTestSize(v[0])} min={0.1} max={0.5} step={0.05} />
                             <span className="text-sm text-muted-foreground">{Math.round(testSize*100)}%</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run KNN</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-3 gap-4 text-center">
                             <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R-squared</p><p className="text-2xl font-bold">{analysisResult.results.metrics.r2_score.toFixed(3)}</p></div>
                             <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">RMSE</p><p className="text-2xl font-bold">{analysisResult.results.metrics.rmse.toFixed(3)}</p></div>
                             <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">MAE</p><p className="text-2xl font-bold">{analysisResult.results.metrics.mae.toFixed(3)}</p></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Actual vs. Predicted</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="KNN Regression Plot" width={800} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <WhatIfSimulation features={features} onSimulate={handleSimulation} />
                </div>
            )}
        </div>
    );
}
