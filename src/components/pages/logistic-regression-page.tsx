
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface LogisticRegressionResults {
    metrics: {
        accuracy: number;
        confusion_matrix: number[][];
        classification_report: {
            [key: string]: {
                precision: number;
                recall: number;
                'f1-score': number;
                support: number;
            };
        };
    };
    coefficients: { [key: string]: number };
    odds_ratios: { [key: string]: number };
    roc_data: {
        fpr: number[];
        tpr: number[];
        auc: number;
    };
    dependent_classes: string[];
    interpretation: string;
    model_summary: any;
}

interface FullAnalysisResponse {
    results: LogisticRegressionResults;
    plot: string;
}

interface LogisticRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    allHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function LogisticRegressionPage({ data, numericHeaders, allHeaders, categoricalHeaders, onLoadExample }: LogisticRegressionPageProps) {
    const { toast } = useToast();
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && binaryCategoricalHeaders.length >= 1, [data, numericHeaders, binaryCategoricalHeaders]);

    useEffect(() => {
        const defaultDepVar = binaryCategoricalHeaders[0];
        setDependentVar(defaultDepVar);
        const initialIndepVars = allHeaders.filter(h => h !== defaultDepVar);
        setIndependentVars(initialIndepVars);
        setAnalysisResult(null);
    }, [data, allHeaders, binaryCategoricalHeaders]);

    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== dependentVar), [allHeaders, dependentVar]);
    
    const handleIndepVarChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a binary dependent variable.' });
            return;
        }
        if (independentVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one independent variable.' });
            return;
        }
        
        const dependentVarValues = new Set(data.map(row => row[dependentVar]).filter(v => v != null && v !== ''));
        if (dependentVarValues.size !== 2) {
            toast({ variant: 'destructive', title: 'Invalid Dependent Variable', description: `The selected dependent variable '${dependentVar}' must have exactly two unique categories. Found ${dependentVarValues.size}.`});
            return;
        }


        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/logistic-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Logistic Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    if (!canRun) {
        const logisticExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('logistic-regression'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Logistic Regression</CardTitle>
                        <CardDescription>
                           To perform this analysis, you need data with at least one binary categorical variable (the outcome) and one or more predictor variables.
                        </CardDescription>
                    </CardHeader>
                    {logisticExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {logisticExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <Target className="h-6 w-6 text-secondary-foreground" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                                <CardDescription className="text-xs">{ex.description}</CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardFooter>
                                            <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                                Load this data
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
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
                    <CardTitle className="font-headline">Logistic Regression Setup</CardTitle>
                    <CardDescription>Select a binary dependent variable and the independent variables to predict the outcome.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Dependent Variable (Binary Outcome)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger><SelectValue placeholder="Select an outcome variable" /></SelectTrigger>
                                <SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Independent Variables (Predictors)</Label>
                            <ScrollArea className="h-40 border rounded-md p-4">
                                {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIndepVarChange(h, c as boolean)}/>
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || independentVars.length === 0 || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2" />Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full" /></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Accuracy</p><p className="text-2xl font-bold">{(results.metrics.accuracy * 100).toFixed(1)}%</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">AUC</p><p className="text-2xl font-bold">{results.roc_data.auc.toFixed(3)}</p></div>
                             <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Pseudo R²</p><p className="text-2xl font-bold">{results.model_summary.prsquared.toFixed(3)}</p></div>
                             <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">LLR p-value</p><p className="text-2xl font-bold">{results.model_summary.llr_pvalue < 0.001 ? '<.001' : results.model_summary.llr_pvalue.toFixed(3)}</p></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="font-headline">Interpretation</CardTitle></CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTitle>Summary</AlertTitle>
                                <AlertDescription>
                                    <p className="whitespace-pre-wrap">{results.interpretation}</p>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="font-headline">Visualizations</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Logistic Regression Plots" width={1400} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Coefficients & Odds Ratios</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Coefficient</TableHead><TableHead className="text-right">Odds Ratio</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.coefficients).map(([variable, coeff]) => (
                                        <TableRow key={variable}>
                                            <TableCell>{variable}</TableCell>
                                            <TableCell className="text-right font-mono">{coeff.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.odds_ratios[variable].toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <p className="text-xs text-muted-foreground mt-2">Odds ratio &gt; 1 indicates increased odds of the outcome. Odds ratio &lt; 1 indicates decreased odds.</p>
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader><CardTitle>Classification Report</CardTitle></CardHeader>
                         <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1-Score</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {results.dependent_classes.map(cls => {
                                        const report = results.metrics.classification_report[cls];
                                        return (
                                        <TableRow key={cls}><TableCell>{cls}</TableCell><TableCell className="text-right font-mono">{report.precision.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{report.recall.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{report['f1-score'].toFixed(3)}</TableCell><TableCell className="text-right font-mono">{report.support}</TableCell></TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                         </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
