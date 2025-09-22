
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, TrendingUp, AlertTriangle, CheckCircle, Bot } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Slider } from '../ui/slider';


interface RegressionMetrics {
    r2_score: number;
    rmse: number;
    mae: number;
}
interface RegressionResultsData {
    model_name: string;
    model_type: string;
    features: string[];
    metrics: {
        train: RegressionMetrics;
        test: RegressionMetrics;
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
        }
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

const InterpretationDisplay = ({ interpretation, f_pvalue }: { interpretation?: string, f_pvalue?: number }) => {
    if (!interpretation) return null;

    const isSignificant = f_pvalue !== undefined && f_pvalue < 0.05;

    const { interpretationText, warnings } = useMemo(() => {
        const parts = interpretation.split('--- Diagnostic Warnings ---');
        return {
            interpretationText: parts[0] || '',
            warnings: parts[1] ? parts[1].trim().split('\n').filter(line => line.startsWith('Warning:')) : []
        };
    }, [interpretation]);

    const formattedInterpretation = useMemo(() => {
        if (!interpretationText) return null;
        return interpretationText
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/F\((.*?)\)\s*=\s*(.*?),/g, '<i>F</i>($1) = $2,')
            .replace(/p\s*=\s*(\.\d+)/g, '<i>p</i> = $1')
            .replace(/p\s*<\s*(\.\d+)/g, '<i>p</i> < $1')
            .replace(/R²adj\s*=\s*([\d.-]+)/g, '<i>R</i>²adj = $1')
            .replace(/R²\s*=\s*([\d.-]+)/g, '<i>R</i>² = $1')
            .replace(/B\s*=\s*([\d.-]+)/g, '<i>B</i> = $1');
    }, [interpretationText]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Bot /> Interpretation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert variant={isSignificant ? 'default' : 'secondary'}>
                    {isSignificant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{isSignificant ? "Statistically Significant Model" : "Not Statistically Significant Model"}</AlertTitle>
                    {formattedInterpretation && <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation }} />}
                </Alert>

                {warnings.length > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Diagnostic Warnings</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5 mt-2">
                                {warnings.map((warning, i) => (
                                    <li key={i}>{warning.replace('Warning: ', '')}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
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
    
    const modelType = useMemo(() => activeAnalysis.replace('regression-', ''), [activeAnalysis]);
    const [selectionMethod, setSelectionMethod] = useState('none');

    // States for different models
    const [simpleFeatureVar, setSimpleFeatureVar] = useState<string | undefined>(numericHeaders[0]);
    const [multipleFeatureVars, setMultipleFeatureVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    const [testSize, setTestSize] = useState(0.2);
    
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
    }, [data, numericHeaders]);

    const handleMultiFeatureSelectionChange = (header: string, checked: boolean) => {
        setMultipleFeatureVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const handleAnalysis = useCallback(async (predictValue?: number) => {
        if (!targetVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a target variable.'});
            return;
        }

        let features: string[] = [];
        let params: any = { data, targetVar, modelType, selectionMethod, test_size: testSize };

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
    }, [data, targetVar, modelType, simpleFeatureVar, multipleFeatureVars, polyDegree, selectionMethod, toast, testSize]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    const results = analysisResult?.results;
    const coeffs = results?.diagnostics?.coefficient_tests;

    const coefficientTableData = coeffs ? Object.keys(coeffs.params).map(key => ({
        key: key,
        coefficient: coeffs.params[key],
        stdError: coeffs.bse ? coeffs.bse[key] : undefined,
        tValue: coeffs.tvalues ? coeffs.tvalues[key] : undefined,
        pValue: coeffs.pvalues ? coeffs.pvalues[key] : undefined,
    })) : [];

    const getAnalysisButtonDisabled = () => {
        if (isLoading || !targetVar) return true;
        if (modelType === 'simple' && !simpleFeatureVar) return true;
        if (modelType !== 'simple' && multipleFeatureVars.length === 0) return true;
        return false;
    }
    
    const renderMultiFeatureSelector = () => (
        <div className="flex flex-col gap-4">
            <div>
                <Label>Feature Variables (X)</Label>
                    <ScrollArea className="h-32 border rounded-md p-4">
                    <div className="space-y-2">
                        {availableFeatures.map(h => (
                            <div key={h} className="flex items-center space-x-2">
                                <Checkbox id={`feat-${h}`} checked={multipleFeatureVars.includes(h)} onCheckedChange={(c) => handleMultiFeatureSelectionChange(h, c as boolean)} />
                                <label htmlFor={`feat-${h}`}>{h}</label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
             {modelType === 'multiple' && (
                <div>
                    <Label>Variable Selection Method</Label>
                    <Select value={selectionMethod} onValueChange={setSelectionMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Enter (None)</SelectItem>
                            <SelectItem value="forward">Forward Selection</SelectItem>
                            <SelectItem value="backward">Backward Elimination</SelectItem>
                            <SelectItem value="stepwise">Stepwise Regression</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
             )}
        </div>
    )

    const renderSetupUI = () => {
        switch (modelType) {
            case 'simple':
                return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Feature Variable (X)</Label>
                            <Select value={simpleFeatureVar} onValueChange={setSimpleFeatureVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{availableFeatures.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'multiple':
                return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        {renderMultiFeatureSelector()}
                    </div>
                );
            case 'polynomial':
                return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className='mt-4'>
                                <Label htmlFor="poly-degree">Polynomial Degree</Label>
                                <Input id="poly-degree" type="number" value={polyDegree} onChange={(e) => setPolyDegree(Number(e.target.value))} min="2" className="w-32" />
                           </div>
                        </div>
                        {renderMultiFeatureSelector()}
                    </div>
                );
            default:
                return <p>Select a model type.</p>;
        }
    };
    
    if (!canRun) {
        const regressionExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('regression'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Regression Analysis</CardTitle>
                        <CardDescription>
                           To perform regression, you need data with at least two numeric variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {regressionExamples.map((ex) => {
                                const Icon = ex.icon;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                            Load this data
                                        </Button>
                                    </CardContent>
                                </Card>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Regression Analysis Setup</CardTitle>
                    <CardDescription>Select a regression model, then configure its variables and parameters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderSetupUI()}
                     <div className='pt-4'>
                        <Label>Test Set Size: {Math.round(testSize*100)}%</Label>
                        <Slider value={[testSize]} onValueChange={v => setTestSize(v[0])} min={0.1} max={0.5} step={0.05} />
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button onClick={() => handleAnalysis()} disabled={getAnalysisButtonDisabled()}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                    {modelType === 'simple' && (
                        <Card>
                             <CardHeader>
                                <CardTitle className="font-headline">Prediction Simulation</CardTitle>
                                <CardDescription>Enter a value for '{simpleFeatureVar}' to predict '{targetVar}'.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <Input type="number" value={predictXValue} onChange={e => setPredictXValue(e.target.value === '' ? '' : Number(e.target.value))} placeholder={`Enter a value for ${simpleFeatureVar}`}/>
                                <Button onClick={() => handleAnalysis(Number(predictXValue))} disabled={predictXValue === '' || isLoading}>Predict</Button>
                            </CardContent>
                            {predictedYValue !== null && (
                                <CardFooter>
                                    <p className="text-lg">Predicted '{targetVar}': <strong className="font-bold text-primary">{predictedYValue.toFixed(2)}</strong></p>
                                </CardFooter>
                            )}
                        </Card>
                    )}

                    <InterpretationDisplay interpretation={results.interpretation} f_pvalue={results.diagnostics.f_pvalue} />

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

                    <Card>
                        <CardHeader><CardTitle className="font-headline">Coefficients</CardTitle></CardHeader>
                        <CardContent>
                            {coeffs ? (
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
                                            <TableCell>{row.key === 'const' ? 'Intercept' : row.key}</TableCell>
                                            <TableCell className="text-right font-mono">{row.coefficient?.toFixed(4) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{row.stdError?.toFixed(4) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{row.tValue?.toFixed(3) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{row.pValue < 0.001 ? '<.001' : row.pValue?.toFixed(4) ?? 'N/A'} {getSignificanceStars(row.pValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            ) : <p className="text-muted-foreground">Coefficient details not available.</p>}
                        </CardContent>
                    </Card>

                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.plot} alt="Regression Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/></CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
