
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Input } from '../ui/input';

interface RegressionResultsData {
    model_name: string;
    model_type: string;
    features: string[];
    metrics: {
        r2: number;
        adj_r2: number;
        rmse: number;
        mae: number;
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
}

interface FullAnalysisResponse {
    results: RegressionResultsData;
    model_name: string;
    model_type: string;
    plot: string;
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

    // State for different models
    const [simpleFeatureVar, setSimpleFeatureVar] = useState<string | undefined>(numericHeaders[0]);
    const [multipleFeatureVars, setMultipleFeatureVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    
    // Model specific params
    const [polyDegree, setPolyDegree] = useState(2);
    const [ridgeAlpha, setRidgeAlpha] = useState(1.0);
    const [lassoAlpha, setLassoAlpha] = useState(0.1);
    const [elasticNetAlpha, setElasticNetAlpha] = useState(1.0);
    const [elasticNetL1Ratio, setElasticNetL1Ratio] = useState(0.5);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
        setMultipleFeatureVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!targetVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a target variable.'});
            return;
        }

        let features: string[] = [];
        let params: any = { data, targetVar, modelType, selectionMethod };

        switch (modelType) {
            case 'simple':
                if (!simpleFeatureVar) {
                    toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a feature variable.'});
                    return;
                }
                features = [simpleFeatureVar];
                break;
            case 'multiple':
            case 'polynomial':
            case 'ridge':
            case 'lasso':
            case 'elasticnet':
                if (multipleFeatureVars.length < 1) {
                    toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select at least one feature.'});
                    return;
                }
                features = multipleFeatureVars;
                if (modelType === 'polynomial') params.degree = polyDegree;
                if (modelType === 'ridge') params.alpha = ridgeAlpha;
                if (modelType === 'lasso') params.alpha = lassoAlpha;
                if (modelType === 'elasticnet') {
                    params.alpha = elasticNetAlpha;
                    params.l1_ratio = elasticNetL1Ratio;
                }
                break;
        }

        params.features = features;

        setIsLoading(true);
        setAnalysisResult(null);
        
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

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, modelType, simpleFeatureVar, multipleFeatureVars, polyDegree, ridgeAlpha, lassoAlpha, elasticNetAlpha, elasticNetL1Ratio, selectionMethod, toast]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
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

    const results = analysisResult?.results;
    const coeffs = results?.diagnostics?.coefficient_tests;

    const coefficientTableData = coeffs ? Object.keys(coeffs.params).map(key => ({
        key: key,
        coefficient: coeffs.params[key],
        stdError: coeffs.bse[key],
        tValue: coeffs.tvalues[key],
        pValue: coeffs.pvalues[key]
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
            case 'ridge':
                return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className='mt-4'>
                                <Label htmlFor="ridge-alpha">Alpha (Regularization Strength)</Label>
                                <Input id="ridge-alpha" type="number" value={ridgeAlpha ?? ''} onChange={(e) => setRidgeAlpha(Number(e.target.value))} min="0" step="0.1" className="w-32" />
                           </div>
                        </div>
                        {renderMultiFeatureSelector()}
                    </div>
                );
            case 'lasso':
                 return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className='mt-4'>
                                <Label htmlFor="lasso-alpha">Alpha (Regularization Strength)</Label>
                                <Input id="lasso-alpha" type="number" value={lassoAlpha ?? ''} onChange={(e) => setLassoAlpha(Number(e.target.value))} min="0" step="0.01" className="w-32" />
                           </div>
                        </div>
                       {renderMultiFeatureSelector()}
                    </div>
                );
            case 'elasticnet':
                 return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className='mt-4 space-y-2'>
                                <div>
                                    <Label htmlFor="elastic-alpha">Alpha (Regularization Strength)</Label>
                                    <Input id="elastic-alpha" type="number" value={elasticNetAlpha} onChange={(e) => setElasticNetAlpha(Number(e.target.value))} min="0" step="0.01" className="w-32" />
                                </div>
                                 <div>
                                    <Label htmlFor="l1-ratio">L1 Ratio (0=Ridge, 1=Lasso)</Label>
                                    <Input id="l1-ratio" type="number" value={elasticNetL1Ratio} onChange={(e) => setElasticNetL1Ratio(Number(e.target.value))} min="0" max="1" step="0.01" className="w-32" />
                                </div>
                           </div>
                        </div>
                       {renderMultiFeatureSelector()}
                    </div>
                );
            default:
                return <p>Select a model type.</p>;
        }
    };


    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Regression Analysis Setup</CardTitle>
                    <CardDescription>Select a regression model, then configure its variables and parameters.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderSetupUI()}
                    <div className="flex justify-end mt-4">
                        <Button onClick={handleAnalysis} disabled={getAnalysisButtonDisabled()}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Summary</CardTitle>
                            <CardDescription>Key performance metrics for the {analysisResult.model_type?.replace(/_/g, ' ')} model.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R-squared</p><p className="text-2xl font-bold">{results.metrics?.r2.toFixed(4)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Adj. R-squared</p><p className="text-2xl font-bold">{results.metrics?.adj_r2.toFixed(4)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">RMSE</p><p className="text-2xl font-bold">{results.metrics?.rmse.toFixed(3)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">MAE</p><p className="text-2xl font-bold">{results.metrics?.mae.toFixed(3)}</p></div>
                        </CardContent>
                    </Card>
                    
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.plot} alt="Regression Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/></CardContent>
                        </Card>
                    )}

                    {results.stepwise_log && results.stepwise_log.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle>Stepwise Selection Log</CardTitle></CardHeader>
                            <CardContent>
                                <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
                                    {results.stepwise_log.join('\n')}
                                </pre>
                            </CardContent>
                        </Card>
                    )}

                    {coeffs && (
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
                                                <TableCell>{row.key === 'const' ? 'Intercept' : row.key}</TableCell>
                                                <TableCell className="text-right font-mono">{row.coefficient?.toFixed(4) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{row.stdError?.toFixed(4) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{row.tValue?.toFixed(3) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{row.pValue < 0.001 ? '<.001' : row.pValue?.toFixed(4) ?? 'N/A'} {getSignificanceStars(row.pValue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                       <Card>
                            <CardHeader><CardTitle className="font-headline">Model Fit</CardTitle></CardHeader>
                            <CardContent>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span>F-statistic:</span><span className="font-mono">{results.diagnostics.f_statistic?.toFixed(3) || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span>Prob (F-statistic):</span><span className="font-mono">{results.diagnostics.f_pvalue?.toExponential(2) || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span>Durbin-Watson:</span><span className="font-mono">{results.diagnostics.durbin_watson?.toFixed(3) || 'N/A'}</span></div>
                                </dl>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="font-headline">Residual Diagnostics</CardTitle></CardHeader>
                            <CardContent>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex justify-between items-start">
                                        <span>Normality (Shapiro-Wilk):</span>
                                        <div className="text-right">
                                            {results.diagnostics.normality_tests?.shapiro_wilk?.p_value ? (
                                                <Badge variant={results.diagnostics.normality_tests.shapiro_wilk.p_value > 0.05 ? 'secondary' : 'destructive'}>p={results.diagnostics.normality_tests.shapiro_wilk.p_value.toFixed(3)}</Badge>
                                            ) : <Badge variant="outline">N/A</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span>Homoscedasticity (Breusch-Pagan):</span>
                                        <div className="text-right">
                                            {results.diagnostics.heteroscedasticity_tests?.breusch_pagan?.p_value ? (
                                                <Badge variant={results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value > 0.05 ? 'secondary' : 'destructive'}>p={results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value.toFixed(3)}</Badge>
                                            ) : <Badge variant="outline">N/A</Badge>}
                                        </div>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>
                         {results.diagnostics.vif && Object.keys(results.diagnostics.vif).length > 0 && (
                            <Card>
                                <CardHeader><CardTitle className="font-headline">Multicollinearity (VIF)</CardTitle></CardHeader>
                                <CardContent>
                                     <ScrollArea className="h-24">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead className="text-right">VIF</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {Object.entries(results.diagnostics.vif).map(([key, value]) => (
                                                    <TableRow key={key}>
                                                        <TableCell>{key}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={value > 10 ? 'destructive' : value > 5 ? 'secondary' : 'outline'}>{value.toFixed(2)}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                     </ScrollArea>
                                </CardContent>
                            </Card>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
}
