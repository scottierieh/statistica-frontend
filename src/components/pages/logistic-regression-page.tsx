
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, CheckCircle, XCircle, HelpCircle, MoveRight, Settings, FileSearch, Binary, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';


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
    odds_ratios_ci: { [key: string]: { '2.5%': number, '97.5%': number } };
    p_values: { [key: string]: number };
    model_summary: any;
    roc_data: {
        fpr: number[];
        tpr: number[];
        auc: number;
    };
    dependent_classes: string[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: LogisticRegressionResults;
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const admissionExample = exampleDatasets.find(d => d.id === 'admission-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Binary size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Logistic Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Predict a binary outcome (e.g., yes/no, true/false) based on one or more predictor variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Logistic Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            When your goal is to predict which of two categories an outcome will fall into, linear regression is not suitable. Logistic regression is designed specifically for this purpose. It models the probability of a binary outcome occurring, making it a cornerstone of classification analysis in fields from medicine to marketing.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {admissionExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(admissionExample)}>
                                <admissionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{admissionExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{admissionExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Dependent Variable:</strong> Select a categorical variable with exactly two outcomes (e.g., 'admit' vs 'deny', 'churn' vs 'no-churn').
                                </li>
                                <li>
                                    <strong>Independent Variables:</strong> Choose one or more numeric or categorical variables that you believe influence the outcome.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will fit a logistic regression model and provide key metrics and visualizations to evaluate its performance.
                                </li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Odds Ratios:</strong> This is a key output. An odds ratio greater than 1 means the predictor increases the odds of the outcome occurring. A value less than 1 means it decreases the odds.
                                </li>
                                <li>
                                    <strong>Accuracy & AUC:</strong> Accuracy measures overall correctness, while the Area Under the Curve (AUC) from the ROC plot indicates the model's ability to distinguish between the two classes (AUC > 0.8 is generally considered good).
                                </li>
                                 <li>
                                    <strong>p-value:</strong> A significant p-value for a coefficient suggests that the predictor variable has a meaningful impact on the outcome.
                                </li>
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

interface LogisticRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    allHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function LogisticRegressionPage({ data, numericHeaders, allHeaders, categoricalHeaders, onLoadExample }: LogisticRegressionPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, allHeaders]);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2 && binaryCategoricalHeaders.length >=1, [data, allHeaders, binaryCategoricalHeaders]);
    
    useEffect(() => {
        const defaultDepVar = binaryCategoricalHeaders[0] || allHeaders[0];
        setDependentVar(defaultDepVar);
        const initialIndepVars = allHeaders.filter(h => h !== defaultDepVar);
        setIndependentVars(initialIndepVars);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, binaryCategoricalHeaders, canRun]);

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

    if (!canRun && view === 'main') {
         return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Logistic Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full"/></CardContent></Card>}

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
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Coefficient</TableHead>
                                        <TableHead className="text-right">Odds Ratio</TableHead>
                                        <TableHead className="text-right">95% CI</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.coefficients).map(([variable, coeff]) => (
                                        <TableRow key={variable}>
                                            <TableCell>{variable}</TableCell>
                                            <TableCell className="text-right font-mono">{coeff.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.odds_ratios[variable].toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                [{results.odds_ratios_ci[variable]['2.5%'].toFixed(3)}, {results.odds_ratios_ci[variable]['97.5%'].toFixed(3)}]
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.p_values[variable] < 0.001 ? '<.001' : results.p_values[variable].toFixed(4)}
                                                {getSignificanceStars(results.p_values[variable])}
                                            </TableCell>
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
