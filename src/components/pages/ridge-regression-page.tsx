
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Container, AlertTriangle, CheckCircle, TrendingUp, HelpCircle, Settings, BarChart, X } from 'lucide-react';
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

const HelpPage = ({ onLoadExample, onBackToSetup }: { onLoadExample: (e: ExampleDataSet) => void, onBackToSetup: () => void }) => {
    const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-3 text-2xl">
                         <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Container size={28} />
                         </div>
                        Ridge Regression
                    </CardTitle>
                    <CardDescription className="text-base pt-2">
                        Ridge Regression is a regularized linear regression model designed to prevent overfitting by adding a penalty term (L2 regularization) to the loss function. It shrinks the coefficients of less important features towards zero without eliminating them completely.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><Settings className="mr-2 h-5 w-5 text-primary" />Setup Guide</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> Select the numeric variable you want to predict.</li>
                                <li><strong>Feature Variables (X):</strong> Select the numeric variables to use for prediction.</li>
                                <li><strong>Alpha (α):</strong> This is the regularization strength. A higher alpha value results in smaller coefficients and more regularization, which can help prevent overfitting but may lead to underfitting if too high.</li>
                                <li><strong>Test Set Size:</strong> The proportion of data used for evaluating the model's performance on unseen data.</li>
                            </ul>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" />Result Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>R-squared:</strong> A large gap between Train and Test R² can indicate overfitting. Ridge regression aims to reduce this gap.</li>
                                <li><strong>Coefficients:</strong> Ridge shrinks coefficients. Unlike Lasso, they will approach but not become exactly zero.</li>
                                <li><strong>R-squared vs. Alpha Plot:</strong> This shows how model performance on train and test sets changes as regularization (alpha) increases. The ideal alpha is often where the test R² is maximized.</li>
                                <li><strong>Coefficients Path Plot:</strong> Visualizes how the magnitude of each feature's coefficient decreases as alpha increases.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                     {regressionExample && (
                         <Button variant="outline" onClick={() => onLoadExample(regressionExample)}>
                            <TrendingUp className="mr-2 h-4 w-4" /> Load Sample Regression Data
                        </Button>
                     )}
                     <Button onClick={onBackToSetup}>Back to Setup</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

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
    const [showHelpPage, setShowHelpPage] = useState(data.length === 0);

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setTarget(defaultTarget);
        setFeatures(numericHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
         setShowHelpPage(data.length === 0);
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
    
    useEffect(() => {
        setShowHelpPage(!canRun);
    }, [canRun]);

    if (showHelpPage) {
        return <HelpPage onLoadExample={onLoadExample} onBackToSetup={() => setShowHelpPage(false)} />
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex items-center gap-2">
                        <CardTitle className="font-headline">Ridge Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setShowHelpPage(true)}><HelpCircle className="h-4 w-4" /></Button>
                    </div>
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
                        {(analysisResult.plot || analysisResult.path_plot) && (
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Ridge Regression Diagnostic & Path Plots</CardTitle>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-4">
                                     {analysisResult.plot && <Image src={analysisResult.plot} alt="Ridge Regression Plots" width={800} height={1200} className="w-full rounded-md border"/>}
                                     {analysisResult.path_plot && <Image src={analysisResult.path_plot} alt="Ridge Regression Path Plots" width={800} height={1200} className="w-full rounded-md border"/>}
                                </CardContent>
                            </Card>
                        )}
                        
                        <Card className="md:col-span-2">
                             <CardHeader>
                                <CardTitle>Coefficients</CardTitle>
                                <CardDescription>Ridge regression shrinks coefficients towards zero to prevent overfitting.</CardDescription>
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

