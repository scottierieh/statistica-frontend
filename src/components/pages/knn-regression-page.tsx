
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Container, Info, HelpCircle, Settings, BarChart, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


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
        x_value: number | { [key: string]: number };
        y_value: number;
        neighbors?: any[]
    };
    features: string[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: KnnRegressionResults;
    plot: string | null;
    relationship_plot?: string | null;
    prediction_plot?: string | null;
}

interface KnnRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    mode: 'simple' | 'multiple';
}

const HelpPage = ({ mode, onLoadExample, onBackToSetup }: { mode: 'simple' | 'multiple', onLoadExample: (e: ExampleDataSet) => void, onBackToSetup: () => void }) => {
    const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
    
    const content = {
        simple: {
            title: "Simple K-Nearest Neighbors (KNN) Regression",
            description: "KNN is a non-parametric method that uses a single independent variable (X) to predict a single dependent variable (Y). It is based on the simple idea that 'things that are close to each other are similar.'",
            setup: [
                { title: 'Target Variable (Y)', text: 'Select the numeric variable you want to predict (e.g., Exam Score).' },
                { title: 'Feature Variable (X)', text: 'Select the numeric variable to use for prediction (e.g., Study Hours).' },
                { title: 'K (Number of Neighbors)', text: "Choose how many neighbors to consider for each prediction. A smaller K makes the model more flexible but sensitive to noise; a larger K makes it more stable but may miss local patterns." },
                { title: 'Test Set Size', text: "The proportion of data held out to evaluate the model's performance (e.g., 20%)." },
            ],
            interpretation: [
                { title: 'R-squared', text: "Indicates how well the model explains the variance in the data. Closer to 1 is better. If Train R² is much higher than Test R², it may indicate overfitting." },
                { title: 'RMSE (Root Mean Squared Error)', text: "The average size of the prediction errors. Lower is better." },
                { title: 'Actual vs. Predicted Plot', text: "Points closer to the 45-degree diagonal line indicate more accurate predictions." },
                { title: 'Prediction Simulation Plot', text: "Allows you to input a specific X value, see the predicted Y value, and visualize which K neighbor data points were used for the prediction." },
            ]
        },
        multiple: {
            title: "Multiple K-Nearest Neighbors (KNN) Regression",
            description: "Multiple KNN regression extends the simple version by using multiple independent variables (X₁, X₂, ...) to predict a single dependent variable (Y). It finds the 'K' nearest data points in a multi-dimensional space to make a prediction.",
            setup: [
                { title: 'Target Variable (Y)', text: 'Select the numeric variable you want to predict (e.g., House Price).' },
                { title: 'Feature Variables (X)', text: 'Select two or more numeric variables to use for prediction (e.g., House Size, Location Score, Age).' },
                { title: 'K (Number of Neighbors)', text: "The number of neighbors in the multi-dimensional feature space to average for a prediction." },
                { title: 'Test Set Size', text: "The proportion of data used for testing. A common choice is 20-30%." },
            ],
            interpretation: [
                { title: 'R-squared & Overfitting', text: "Similar to simple regression, a large gap between Train R² and Test R² can signal overfitting. The model may be too complex for the number of features." },
                { title: 'RMSE / MAE', text: "These error metrics tell you, on average, how far off your predictions are in the original units of the target variable." },
                { title: 'Prediction Simulation', text: "Input values for all feature variables to see the model's prediction for a new, unseen data point." },
            ]
        }
    };

    const currentContent = content[mode];

    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-3 text-2xl">
                         <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Container size={28} />
                         </div>
                        {currentContent.title}
                    </CardTitle>
                    <CardDescription className="text-base pt-2">
                        {currentContent.description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><Settings className="mr-2 h-5 w-5 text-primary" />Setup Guide</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                {currentContent.setup.map(item => <li key={item.title}><strong>{item.title}:</strong> {item.text}</li>)}
                            </ul>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" />Result Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                {currentContent.interpretation.map(item => <li key={item.title}><strong>{item.title}:</strong> {item.text}</li>)}
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

export default function KnnRegressionPage({ data, numericHeaders, onLoadExample, mode }: KnnRegressionPageProps) {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [k, setK] = useState(5);
    const [testSize, setTestSize] = useState(0.2);
    
    const [predictXValue, setPredictXValue] = useState<number | ''>('');
    const [predictXValues, setPredictXValues] = useState<{ [key: string]: number | '' }>({});

    const [predictedYValue, setPredictedYValue] = useState<number | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showHelpPage, setShowHelpPage] = useState(data.length === 0);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setTarget(defaultTarget);

        if (mode === 'simple') {
            const feature = numericHeaders.find(h => h !== defaultTarget) || numericHeaders[0];
            setFeatures(feature ? [feature] : []);
            setPredictXValues({});
        } else {
            const initialFeatures = numericHeaders.filter(h => h !== defaultTarget);
            setFeatures(initialFeatures);
            const initialValues: { [key: string]: number | '' } = {};
            initialFeatures.forEach(f => {
                initialValues[f] = '';
            });
            setPredictXValues(initialValues);
        }
        setAnalysisResult(null);
        setPredictedYValue(null);
        setPredictXValue('');
        setShowHelpPage(data.length === 0);
    }, [data, numericHeaders, mode]);
    
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= (mode === 'simple' ? 2 : 2), [data, numericHeaders, mode]);
    
    useEffect(() => {
        setShowHelpPage(!canRun);
    }, [canRun]);


    const handleFeatureChange = (header: string, checked: boolean) => {
        if (mode === 'simple') {
            setFeatures(checked ? [header] : []);
        } else {
            setFeatures(prev => {
                const newFeatures = checked ? [...prev, header] : prev.filter(f => f !== header);
                // Also update the state for prediction inputs
                setPredictXValues(currentValues => {
                    const newPredictValues: { [key: string]: number | '' } = {};
                    newFeatures.forEach(f => {
                        newPredictValues[f] = currentValues[f] || '';
                    });
                    return newPredictValues;
                });
                return newFeatures;
            });
        }
    };
    
    const handlePredictValuesChange = (feature: string, value: string) => {
        setPredictXValues(prev => ({
            ...prev,
            [feature]: value === '' ? '' : Number(value)
        }));
    }
    
     const handleMultiPredict = () => {
        const allValuesPresent = features.every(f => predictXValues[f] !== '' && predictXValues[f] !== null);
        if(!allValuesPresent) {
            toast({variant: 'destructive', title: 'Missing Values', description: 'Please enter a value for all feature variables.'})
            return;
        }
        const valuesToPredict = features.reduce((acc, f) => {
            acc[f] = Number(predictXValues[f]);
            return acc;
        }, {} as {[key: string]: number});
        handleAnalysis(valuesToPredict);
    };

    const handleAnalysis = useCallback(async (predictValue?: number | { [key: string]: number }) => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        if (predictValue === undefined) {
            setAnalysisResult(null);
            setPredictedYValue(null);
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
                setPredictedYValue(result.results.prediction.y_value);
                 toast({ title: 'Prediction Complete', description: `Predicted value is ${result.results.prediction.y_value.toFixed(2)}` });
            }

        } catch (e: any) {
            console.error('KNN Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, k, testSize, toast]);
    
    if (showHelpPage) {
        return <HelpPage mode={mode} onLoadExample={onLoadExample} onBackToSetup={() => setShowHelpPage(false)} />
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle className="font-headline">KNN Regression Setup ({mode})</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setShowHelpPage(true)}><HelpCircle className="h-4 w-4" /></Button>
                    </div>
                     <CardDescription>
                        Select your target variable (Y), feature variable(s) (X), and configure the model parameters.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex-1 space-y-2">
                         <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label>Target Variable (Y)</Label>
                                <Select value={target} onValueChange={setTarget}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">The variable you want to predict.</p>
                            </div>
                            {mode === 'simple' ? (
                                 <div>
                                    <Label>Feature Variable (X)</Label>
                                    <Select value={features[0]} onValueChange={v => setFeatures([v])}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{availableFeatures.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-1">The variable used to make the prediction.</p>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>K (Number of Neighbors): {k}</Label>
                            <Slider value={[k]} onValueChange={v => setK(v[0])} min={1} max={50} step={1} />
                            <p className="text-xs text-muted-foreground mt-1">The number of nearest data points to consider for a prediction.</p>
                        </div>
                         <div>
                            <Label>Test Set Size: {Math.round(testSize*100)}%</Label>
                            <Slider value={[testSize]} onValueChange={v => setTestSize(v[0])} min={0.1} max={0.5} step={0.05} />
                             <p className="text-xs text-muted-foreground mt-1">The proportion of data used for testing the model's accuracy.</p>
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
                    {predictedYValue !== null && (
                        <CardFooter>
                            <p className="text-lg">Predicted '{target}': <strong className="font-bold text-primary">{predictedYValue.toFixed(2)}</strong></p>
                        </CardFooter>
                    )}
                </Card>
            )}

            {mode === 'multiple' && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Prediction Simulation</CardTitle>
                        <CardDescription>Enter values for the features to get a prediction.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {features.map(feature => (
                                <div key={feature}>
                                    <Label htmlFor={`pred-in-${feature}`}>{feature}</Label>
                                    <Input
                                        id={`pred-in-${feature}`}
                                        type="number"
                                        value={predictXValues[feature] ?? ''}
                                        onChange={(e) => handlePredictValuesChange(feature, e.target.value)}
                                        placeholder="Enter value"
                                    />
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleMultiPredict} disabled={isLoading}>Predict</Button>
                    </CardContent>
                    {predictedYValue !== null && (
                        <CardFooter>
                            <p className="text-lg">Predicted '{target}': <strong className="font-bold text-primary">{predictedYValue.toFixed(2)}</strong></p>
                        </CardFooter>
                    )}
                </Card>
            )}

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                    {results.interpretation && (
                        <Card>
                            <CardHeader><CardTitle>Interpretation</CardTitle></CardHeader>
                            <CardContent>
                               <Alert variant={results.interpretation.includes('Warning') || results.interpretation.includes('Possible') || results.interpretation.includes('weak fit') ? 'destructive' : 'default'}>
                                  {results.interpretation.includes('strong fit') || results.interpretation.includes('moderate fit') ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                  <AlertTitle>Model Performance Summary</AlertTitle>
                                  <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br/>') }} />
                               </Alert>
                            </CardContent>
                        </Card>
                    )}
                     <Card>
                        <CardHeader>
                            <CardTitle>Train vs. Test Performance</CardTitle>
                            <CardDescription>Compares model accuracy on the data it was trained on versus new, unseen data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="flex items-center gap-2">
                                            Metric 
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger>
                                                <TooltipContent><p>Performance metrics to evaluate the model.</p></TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        </TableHead>
                                        <TableHead className="text-right">Train Score</TableHead>
                                        <TableHead className="text-right">Test Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="flex items-center gap-2">
                                            R-squared
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger>
                                                <TooltipContent><p>Proportion of variance in the target explained by the model. Closer to 1 is better.</p></TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.train.r2_score.toFixed(4)}</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.test.r2_score.toFixed(4)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="flex items-center gap-2">
                                            RMSE
                                             <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger>
                                                <TooltipContent><p>Root Mean Squared Error. The average size of the prediction errors. Lower is better.</p></TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.train.rmse.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.test.rmse.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="flex items-center gap-2">
                                            MAE
                                             <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger>
                                                <TooltipContent><p>Mean Absolute Error. The average of the absolute prediction errors. Lower is better.</p></TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.train.mae.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{results?.metrics.test.mae.toFixed(3)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <div className="grid md:grid-cols-2 gap-4">
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Model Fit: Actual vs. Predicted</CardTitle>
                                    <CardDescription>This plot shows the actual values from the test set against the values predicted by the model. Points closer to the red dashed line indicate more accurate predictions.</CardDescription>
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
                                    <CardDescription>This scatter plot visualizes the relationship between the feature and target variables in your dataset.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.relationship_plot} alt="KNN Relationship Plot" width={800} height={600} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        )}
                        {analysisResult.prediction_plot && (
                             <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Prediction Simulation Plot</CardTitle>
                                    <CardDescription>This chart visualizes how the model makes a prediction. The large triangle is the predicted point. The diamonds are the 'K' nearest neighbors from the training data that were averaged to make the prediction.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.prediction_plot} alt="KNN Prediction Plot" width={800} height={600} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
