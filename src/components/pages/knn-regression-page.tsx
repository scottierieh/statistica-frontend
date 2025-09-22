
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    prediction?: {
        x_value: number;
        y_value: number;
        neighbors_X: number[][];
        neighbors_y: number[];
    };
}

interface FullAnalysisResponse {
    results: KnnRegressionResults;
    plot: string;
}

interface WhatIfState {
    [key: string]: number;
}

const WhatIfSimulation = ({ features, onSimulate }: { features: string[], onSimulate: (state: WhatIfState) => number }) => {
    const initialWhatIfState = useMemo(() => {
        const state: {[key: string]: number} = {};
        features.forEach(f => state[f] = 50);
        return state;
    }, [features]);

    const [whatIfState, setWhatIfState] = useState<WhatIfState>(initialWhatIfState);
    const simulatedResult = onSimulate(whatIfState);

    return (
        <Card>
            <CardHeader>
                <CardTitle>What-If Simulation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                        {features.slice(0, 5).map(feature => (
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

interface KnnRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    mode: 'simple' | 'multiple';
}

export default function KnnRegressionPage({ data, numericHeaders, onLoadExample, mode }: KnnRegressionPageProps) {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [k, setK] = useState(5);
    const [testSize, setTestSize] = useState(0.2);
    
    const [predictXValue, setPredictXValue] = useState<number | ''>('');
    const [predictedYValue, setPredictedYValue] = useState<number | null>(null);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const defaultTarget = numericHeaders[numericHeaders.length - 1];
        setTarget(defaultTarget);
        if (mode === 'simple') {
            setFeatures(numericHeaders.length > 1 ? [numericHeaders[0]] : []);
        } else {
            setFeatures(numericHeaders.filter(h => h !== defaultTarget));
        }
        setAnalysisResult(null);
    }, [data, numericHeaders, mode]);
    
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        if (mode === 'simple') {
            setFeatures(checked ? [header] : []);
        } else {
            setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== h));
        }
    };

    const handleAnalysis = useCallback(async (predictValue?: number) => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        if (typeof predictValue !== 'number') {
            setAnalysisResult(null);
        }

        try {
            const response = await fetch('/api/analysis/knn-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target, features, k, test_size: testSize, predict_x: predictValue })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            if (result.results.prediction) {
                setPredictedYValue(result.results.prediction.y_value);
            }

        } catch (e: any) {
            console.error('KNN Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, k, testSize, toast]);
    
    if (!canRun) {
        const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
        return (
            <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">K-Nearest Neighbors Regression</CardTitle>
                        <CardDescription>
                           Upload data with numeric features and a target variable.
                        </CardDescription>
                    </CardHeader>
                    {regressionExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(regressionExample)}>
                                Load Sample Regression Data
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">KNN Regression Setup ({mode})</CardTitle>
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
                            {mode === 'simple' ? (
                                <Select value={features[0]} onValueChange={v => setFeatures([v])}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>{availableFeatures.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            ) : (
                            <ScrollArea className="h-24 border rounded-md p-2">
                               {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                            )}
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>K (Number of Neighbors): {k}</Label>
                            <Slider value={[k]} onValueChange={v => setK(v[0])} min={1} max={50} step={1} />
                        </div>
                         <div>
                            <Label>Test Set Size: {Math.round(testSize*100)}%</Label>
                            <Slider value={[testSize]} onValueChange={v => setTestSize(v[0])} min={0.1} max={0.5} step={0.05} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={() => handleAnalysis()} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run KNN</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {mode === 'simple' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Prediction Simulation</CardTitle>
                        <CardDescription>Enter a value for '{features[0]}' to predict '{target}'.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Input type="number" value={predictXValue} onChange={e => setPredictXValue(e.target.value === '' ? '' : Number(e.target.value))} placeholder={`Enter a value for ${features[0]}`}/>
                        <Button onClick={() => handleAnalysis(Number(predictXValue))} disabled={predictXValue === ''}>Predict</Button>
                    </CardContent>
                    {predictedYValue !== null && (
                        <CardFooter>
                            <p className="text-lg">Predicted '{target}': <strong className="font-bold text-primary">{predictedYValue.toFixed(2)}</strong></p>
                        </CardFooter>
                    )}
                </Card>
            )}

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
                </div>
            )}
        </div>
    );
}
