
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Container } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface KnnRegressionMetrics {
    r2_score: number;
    rmse: number;
    mae: number;
}

interface KnnRegressionResults {
    metrics: {
        test: KnnRegressionMetrics;
        train: KnnRegressionMetrics;
    };
    predictions: { actual: number; predicted: number }[];
    prediction?: {
        x_value: number;
        y_value: number;
    };
    features: string[];
}

interface FullAnalysisResponse {
    results: KnnRegressionResults;
    plot: string;
    relationship_plot?: string;
    prediction_plot?: string;
}

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

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setTarget(defaultTarget);

        if (mode === 'simple') {
            setFeatures(numericHeaders.length > 1 ? [numericHeaders[0]] : []);
        } else {
            setFeatures(numericHeaders.filter(h => h !== defaultTarget));
        }
        setAnalysisResult(null);
    }, [data, numericHeaders, mode]);
    
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders, mode]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        if (mode === 'simple') {
            setFeatures(checked ? [header] : []);
        } else {
            setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== header));
        }
    };

    const handleAnalysis = useCallback(async (predictValue?: number) => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        if (predictValue === undefined) {
             setAnalysisResult(null);
        }
        
        try {
            const analysisData = data.map(row => {
                const newRow: { [key: string]: any } = {};
                if (target) newRow[target] = row[target];
                features.forEach(f => {
                    if (row[f] !== undefined) {
                        newRow[f] = row[f];
                    }
                });
                return newRow;
            });

            const body = {
                data: analysisData,
                target,
                features,
                k,
                test_size: testSize,
                predict_x: predictValue
            };

            const response = await fetch('/api/analysis/knn-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            if (predictValue !== undefined && result.results.prediction) {
                toast({ title: 'Prediction Complete', description: `Predicted value is ${result.results.prediction.y_value.toFixed(2)}` });
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
    
    const results = analysisResult?.results;

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
                        <Button onClick={() => handleAnalysis(Number(predictXValue))} disabled={predictXValue === '' || isLoading}>Predict</Button>
                    </CardContent>
                    {analysisResult?.results?.prediction && (
                        <CardFooter>
                            <p className="text-lg">Predicted '{target}': <strong className="font-bold text-primary">{analysisResult.results.prediction.y_value.toFixed(2)}</strong></p>
                        </CardFooter>
                    )}
                </Card>
            )}

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="plots">Plots</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-4">
                         <Card>
                            <CardHeader>
                                <CardTitle>Train vs. Test Performance</CardTitle>
                                <CardDescription>Comparing model performance on training and testing data can help identify overfitting.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Metric</TableHead>
                                            <TableHead className="text-right">Train Score</TableHead>
                                            <TableHead className="text-right">Test Score</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>R-squared</TableCell>
                                            <TableCell className="text-right font-mono">{results?.metrics.train.r2_score.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{results?.metrics.test.r2_score.toFixed(4)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>RMSE</TableCell>
                                            <TableCell className="text-right font-mono">{results?.metrics.train.rmse.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results?.metrics.test.rmse.toFixed(3)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>MAE</TableCell>
                                            <TableCell className="text-right font-mono">{results?.metrics.train.mae.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results?.metrics.test.mae.toFixed(3)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="plots" className="mt-4">
                        <div className="space-y-4">
                             {analysisResult.plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Model Fit: Actual vs. Predicted</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Image src={analysisResult.plot} alt="KNN Actual vs Predicted Plot" width={800} height={600} className="w-full rounded-md border"/>
                                    </CardContent>
                                </Card>
                            )}
                             {analysisResult.relationship_plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>X vs. Y Relationship</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Image src={analysisResult.relationship_plot} alt="KNN Relationship Plot" width={800} height={600} className="w-full rounded-md border"/>
                                    </CardContent>
                                </Card>
                            )}
                            {analysisResult.prediction_plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Prediction Simulation Plot</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Image src={analysisResult.prediction_plot} alt="KNN Prediction Plot" width={800} height={600} className="w-full rounded-md border"/>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
