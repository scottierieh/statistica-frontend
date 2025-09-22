
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Container, AlertTriangle, CheckCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface RegressionMetrics {
    r2_score: number;
    rmse: number;
    mae: number;
}

interface RidgeRegressionResults {
    metrics: {
        test: RegressionMetrics;
        train: RegressionMetrics;
    };
    coefficients: { [key: string]: number };
    intercept: number;
    alpha: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: RidgeRegressionResults;
    plot: string | null;
    path_plot: string | null;
}

interface RidgeRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RidgeRegressionPage({ data, numericHeaders, onLoadExample }: RidgeRegressionPageProps) {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [alpha, setAlpha] = useState(1.0);
    const [testSize, setTestSize] = useState(0.2);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setTarget(defaultTarget);
        setFeatures(numericHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/ridge-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target, features, alpha, test_size: testSize })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Ridge regression model has been trained and evaluated.' });

        } catch (e: any) {
            console.error('Ridge Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, alpha, testSize, toast]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    if (!canRun) {
        const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
        return (
            <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Ridge Regression</CardTitle>
                        <CardDescription>Upload data with numeric features and a target variable.</CardDescription>
                    </CardHeader>
                    {regressionExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(regressionExample)}>Load Sample Regression Data</Button>
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
                    <CardTitle className="font-headline">Ridge Regression Setup</CardTitle>
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
                               {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Alpha (Regularization Strength): {alpha.toFixed(2)}</Label>
                            <Slider value={[alpha]} onValueChange={v => setAlpha(v[0])} min={0.01} max={10.0} step={0.01} />
                        </div>
                        <div>
                            <Label>Test Set Size: {Math.round(testSize*100)}%</Label>
                            <Slider value={[testSize]} onValueChange={v => setTestSize(v[0])} min={0.1} max={0.5} step={0.05} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Ridge Regression</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader><CardTitle>Interpretation</CardTitle></CardHeader>
                        <CardContent>
                           <Alert variant={results.interpretation.includes('Warning') || results.interpretation.includes('Possible') ? 'destructive' : 'default'}>
                              {results.interpretation.includes('Warning') || results.interpretation.includes('Possible') ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              <AlertTitle>{results.interpretation.split('**')[1] || 'Model Summary'}</AlertTitle>
                              <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\*\*(.*?)\*\*/g, '') }} />
                           </Alert>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Train vs. Test Performance</CardTitle>
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
                                        <TableCell className="text-right font-mono">{results.metrics.train.r2_score.toFixed(4)}</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.test.r2_score.toFixed(4)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>RMSE</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.train.rmse.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.test.rmse.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>MAE</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.train.mae.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.test.mae.toFixed(3)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        {analysisResult.plot && (
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Model Fit: Actual vs. Predicted</CardTitle>
                                    <CardDescription>Performance for alpha = {results.alpha}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plot} alt="Ridge Actual vs Predicted Plot" width={800} height={1200} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        )}
                        {analysisResult.path_plot && (
                            <Card>
                                <CardHeader>
                                     <CardTitle>Alpha vs. Model Performance</CardTitle>
                                    <CardDescription>Shows how R² and coefficients change as alpha increases.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.path_plot} alt="Ridge Coefficients Path Plot" width={800} height={1200} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        )}
                        <Card>
                            <CardHeader>
                                <CardTitle>Coefficients</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <ScrollArea className="h-80">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead className="text-right">Coefficient</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-semibold">(Intercept)</TableCell>
                                                <TableCell className="text-right font-mono">{results.intercept.toFixed(4)}</TableCell>
                                            </TableRow>
                                            {Object.entries(results.coefficients).map(([feature, coeff]) => (
                                                <TableRow key={feature}>
                                                    <TableCell>{feature}</TableCell>
                                                    <TableCell className="text-right font-mono">{coeff.toFixed(4)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
