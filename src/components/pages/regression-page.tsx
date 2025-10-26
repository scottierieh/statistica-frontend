
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart as BarChartIcon, Settings, FileSearch, Users, Repeat, CheckCircle, XCircle, AlertTriangle, HelpCircle, Bot, Loader2, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import Image from 'next/image';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';

interface RegressionMetrics {
    r2: number;
    adj_r2: number;
    rmse: number;
    mae: number;
    mse: number;
}
interface RegressionResultsData {
    model_name: string;
    model_type: string;
    features: string[];
    metrics: {
        all_data: RegressionMetrics;
    };
    diagnostics: {
        f_statistic?: number;
        f_pvalue?: number;
        durbin_watson?: number;
        vif?: { [key: string]: number };
        coefficient_tests?: {
            params: { [key: string]: number };
            pvalues: { [key: string]: number };
            bse: { [key: string]: number };
            tvalues: { [key: string]: number };
        },
        normality_tests?: {
            jarque_bera: { statistic: number; p_value: number; };
            shapiro_wilk: { statistic: number; p_value: number; };
        };
        heteroscedasticity_tests?: {
            breusch_pagan: { statistic: number; p_value: number; };
        },
        anova_table?: any[];
        model_summary_data?: any[];
    };
    stepwise_log?: string[];
    interpretation?: string;
    prediction?: {
        x_value: number,
        y_value: number,
        neighbors?: any[]
    }
}

interface FullAnalysisResponse {
    results: RegressionResultsData;
    model_name: string;
    model_type: string;
    plot: string;
}


const SimpleLinearIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold">Simple Linear Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">Model the relationship between two continuous variables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Simple Linear Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">This is the simplest form of regression, used to understand the relationship between a single independent variable (predictor) and a single dependent variable (outcome). It's perfect for finding a linear trend and making basic predictions.</p>
                    </div>
                     <div className="flex justify-center">
                           {regressionExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(regressionExample)}>
                                    <regressionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{regressionExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{regressionExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> The outcome you want to predict.</li>
                                <li><strong>Feature Variable (X):</strong> The single variable you believe influences the target.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Equation:</strong> Y = b0 + b1X. b1 is the slope, showing how much Y changes for a one-unit change in X.</li>
                                <li><strong>R-squared (R²):</strong> The percentage of variance in Y explained by X.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};
const MultipleLinearIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                 <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold">Multiple Linear Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">Predict an outcome based on the linear relationship with two or more predictor variables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Multiple Linear Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">This is an extension of simple linear regression. It allows you to model a single outcome variable using multiple predictor variables, assessing the independent contribution of each predictor while controlling for the others.</p>
                    </div>
                     <div className="flex justify-center">
                           {regressionExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(regressionExample)}>
                                    <regressionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{regressionExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{regressionExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> The single outcome variable to predict.</li>
                                <li><strong>Feature Variables (X):</strong> Select two or more predictor variables.</li>
                                <li><strong>Variable Selection:</strong> Optionally use Forward, Backward, or Stepwise methods to automatically select the most impactful features.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Coefficients:</strong> Each coefficient represents the change in Y for a one-unit change in its corresponding X, holding all other predictors constant.</li>
                                <li><strong>Adjusted R-squared:</strong> A modified version of R² that accounts for the number of predictors, providing a more accurate measure of model fit.</li>
                                <li><strong>VIF (Variance Inflation Factor):</strong> Checks for multicollinearity. Values above 5 or 10 suggest a predictor is highly correlated with others and may be redundant.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const PolynomialIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                 <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold">Polynomial Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">Model a non-linear relationship between variables by fitting a polynomial equation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Polynomial Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">When your data shows a curved or U-shaped pattern, a straight line (linear regression) won't fit well. Polynomial regression can capture these non-linear trends by adding polynomial terms (like X², X³) to the model, creating a more flexible curve.</p>
                    </div>
                     <div className="flex justify-center">
                           {regressionExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(regressionExample)}>
                                    <regressionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{regressionExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{regressionExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> The outcome variable.</li>
                                <li><strong>Feature Variable(s) (X):</strong> One or more predictor variables.</li>
                                <li><strong>Degree:</strong> The degree of the polynomial. A degree of 2 creates a quadratic model (e.g., Y = B₀ + B₁X + B₂X²). A degree of 3 creates a cubic model.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>R-squared (R²):</strong> Measures how well the curve fits the data. Be cautious, as higher degrees can easily overfit the data.</li>
                                <li><strong>Coefficients:</strong> Interpreting individual polynomial coefficients is complex. It's often better to focus on the overall model fit and the shape of the curve in the diagnostic plot.</li>
                                <li><strong>Actual vs. Predicted Plot:</strong> This is key to seeing if the generated curve accurately captures the trend in your data points.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface RegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string; 
}

export default function RegressionPage({ data, numericHeaders, onLoadExample, activeAnalysis }: RegressionPageProps) {
    const { toast } = useToast();
    const [targetVar, setTargetVar] = useState<string | undefined>(numericHeaders[numericHeaders.length - 1]);
    const [view, setView] = useState('intro');

    const modelType = useMemo(() => activeAnalysis.replace('regression-', ''), [activeAnalysis]);
    const [selectionMethod, setSelectionMethod] = useState('none');

    // States for different models
    const [simpleFeatureVar, setSimpleFeatureVar] = useState<string | undefined>(numericHeaders[0]);
    const [multipleFeatureVars, setMultipleFeatureVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    
    // Simple regression prediction state
    const [predictXValue, setPredictXValue] = useState<number | ''>('');
    const [predictedYValue, setPredictedYValue] = useState<number | null>(null);
    
    // Model specific params
    const [polyDegree, setPolyDegree] = useState(2);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const allHeaders = useMemo(() => numericHeaders, [numericHeaders]);

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== targetVar), [numericHeaders, targetVar]);
    
    useEffect(() => {
        const newTarget = numericHeaders[numericHeaders.length - 1];
        setTargetVar(newTarget);
        
        const initialFeatures = numericHeaders.filter(h => h !== newTarget);
        setSimpleFeatureVar(initialFeatures[0])
        setMultipleFeatureVars(initialFeatures);

        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders]);

    const handleMultiFeatureSelectionChange = (header: string, checked: boolean) => {
        setMultipleFeatureVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };
    
    const renderSetupUI = (modelType: string) => {
    switch (modelType) {
        case 'simple':
            return (
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Target Variable (Y)</Label>
                        <Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Feature Variable (X)</Label>
                        <Select value={simpleFeatureVar} onValueChange={setSimpleFeatureVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableFeatures.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </div>
            );
        case 'multiple':
            return (
                 <div className="grid md:grid-cols-3 gap-4">
                     <div>
                        <Label>Target Variable (Y)</Label>
                        <Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="md:col-span-2">
                        <Label>Feature Variables (X)</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            <div className="grid grid-cols-2 gap-2">
                                {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={multipleFeatureVars.includes(h)} onCheckedChange={(c) => handleMultiFeatureSelectionChange(h, !!c)} />
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            );
        case 'polynomial':
             return (
                 <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <Label>Target Variable (Y)</Label>
                        <Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="md:col-span-1">
                        <Label>Feature Variable(s)</Label>
                        <ScrollArea className="h-24 border rounded-md p-2">
                            <div className="grid grid-cols-1 gap-2">
                                {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={multipleFeatureVars.includes(h)} onCheckedChange={(c) => handleMultiFeatureSelectionChange(h, !!c)} />
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div>
                        <Label>Polynomial Degree</Label>
                        <Input type="number" value={polyDegree} onChange={e => setPolyDegree(Number(e.target.value))} min="2" max="5"/>
                    </div>
                </div>
            );
        default:
            return null;
        }
    }

    const handleAnalysis = useCallback(async (predictValue?: number) => {
        if (!targetVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a target variable.'});
            return;
        }

        let features: string[] = [];
        let params: any = { data, targetVar, modelType, selectionMethod, test_size: 0 };

        switch (modelType) {
            case 'simple':
                if (!simpleFeatureVar) {
                    toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a feature variable.'});
                    return;
                }
                features = [simpleFeatureVar];
                if (typeof predictValue === 'number') {
                    params.predict_x = predictValue;
                }
                break;
            case 'multiple':
            case 'polynomial':
                if (multipleFeatureVars.length < 1) {
                    toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select at least one feature.'});
                    return;
                }
                features = multipleFeatureVars;
                if (modelType === 'polynomial') params.degree = polyDegree;
                break;
        }

        params.features = features;

        setIsLoading(true);
        if (typeof predictValue !== 'number') {
             setAnalysisResult(null);
             setPredictedYValue(null);
        }
        
        try {
            const response = await fetch('/api/analysis/regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            if(result.results.prediction) {
                setPredictedYValue(result.results.prediction.y_value);
            }

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, modelType, simpleFeatureVar, multipleFeatureVars, polyDegree, selectionMethod, toast]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    useEffect(() => {
        setView(canRun ? 'main' : 'intro');
    }, [canRun]);

    const introPages: { [key: string]: React.FC<any> } = {
        simple: SimpleLinearIntroPage,
        multiple: MultipleLinearIntroPage,
        polynomial: PolynomialIntroPage
    };
    const IntroComponent = introPages[modelType];

    if (!IntroComponent || view === 'intro' || !canRun) {
        return <IntroComponent onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const anovaTable = results?.diagnostics?.anova_table;
    const coefficientTableData = results?.diagnostics?.coefficient_tests ? Object.entries(results.diagnostics.coefficient_tests.params).map(([key, value]) => ({
        key: key,
        coefficient: value,
        stdError: results.diagnostics!.coefficient_tests!.bse?.[key],
        tValue: results.diagnostics!.coefficient_tests!.tvalues?.[key],
        pValue: results.diagnostics!.coefficient_tests!.pvalues?.[key],
    })) : [];

    const durbinWatson = results?.diagnostics?.durbin_watson;
    const dwMet = durbinWatson !== undefined && durbinWatson >= 1.5 && durbinWatson <= 2.5;

    const bpTest = results?.diagnostics?.heteroscedasticity_tests?.breusch_pagan;
    const bpMet = bpTest !== undefined && bpTest.p_value > 0.05;

    const swTest = results?.diagnostics?.normality_tests?.shapiro_wilk;
    const swMet = swTest !== undefined && swTest.p_value > 0.05;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderSetupUI(modelType, { numericHeaders, availableFeatures, targetVar, setTargetVar, simpleFeatureVar, setSimpleFeatureVar, multipleFeatureVars, setMultipleFeatureVars, polyDegree, setPolyDegree, selectionMethod, setSelectionMethod })}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={() => handleAnalysis()} disabled={isLoading || !targetVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                    {results.interpretation && (
                        <Card>
                            <CardHeader><CardTitle>Interpretation</CardTitle></CardHeader>
                            <CardContent>
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Analysis Summary</AlertTitle>
                                    <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />') }} />
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.plot} alt="Regression Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/></CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader><CardTitle>Coefficients</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Coefficient</TableHead>
                                        <TableHead className="text-right">Std. Error</TableHead>
                                        <TableHead className="text-right">t-value</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {coefficientTableData.map(row => (
                                        <TableRow key={row.key}>
                                            <TableCell>{row.key}</TableCell>
                                            <TableCell className="text-right font-mono">{row.coefficient.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.stdError?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.tValue?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {row.pValue < 0.001 ? '<.001' : row.pValue?.toFixed(4)}
                                                {getSignificanceStars(row.pValue)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Assumption Checks</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Test</TableHead><TableHead>Assumption</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">Result</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {durbinWatson !== undefined && <TableRow><TableCell>Durbin-Watson</TableCell><TableCell>Independence of Residuals</TableCell><TableCell className="text-right font-mono">{durbinWatson.toFixed(3)}</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right"><Badge variant={dwMet ? 'default' : 'destructive'}>{dwMet ? "Met" : "Not Met"}</Badge></TableCell></TableRow>}
                                    {bpTest && <TableRow><TableCell>Breusch-Pagan</TableCell><TableCell>Homoscedasticity</TableCell><TableCell className="font-mono text-right">{bpTest.statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{bpTest.p_value.toFixed(4)}</TableCell><TableCell className="text-right"><Badge variant={bpMet ? 'default' : 'destructive'}>{bpMet ? "Met" : "Not Met"}</Badge></TableCell></TableRow>}
                                    {swTest && <TableRow><TableCell>Shapiro-Wilk</TableCell><TableCell>Normality of Residuals</TableCell><TableCell className="font-mono text-right">{swTest.statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{swTest.p_value.toFixed(4)}</TableCell><TableCell className="text-right"><Badge variant={swMet ? 'default' : 'destructive'}>{swMet ? "Met" : "Not Met"}</Badge></TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

```