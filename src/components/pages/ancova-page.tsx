

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Copy, AlertTriangle, Layers, Settings, FileSearch, MoveRight, HelpCircle, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';


interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    F: number;
    'p-value': number;
    'η²p': number;
}

interface AssumptionResult {
    met: boolean;
    p_value: number;
    statistic: number;
}

interface AncovaResults {
    anova_table: AnovaRow[];
    assumptions: {
        normality: AssumptionResult;
        homogeneity: AssumptionResult;
    };
    interpretation: string;
}

interface FullAnalysisResponse {
    results: AncovaResults;
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
    const ancovaExample = exampleDatasets.find(d => d.id === 'student-performance');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                         <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Layers size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Analysis of Covariance (ANCOVA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        An extension of ANOVA that controls for the effects of an additional continuous variable (the covariate).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use ANCOVA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            ANCOVA is used to test the main and interaction effects of categorical variables on a continuous dependent variable, while controlling for the effect of other continuous variables (covariates). It increases statistical power by reducing the within-group error variance and helps to eliminate confounding variables. For example, when comparing the test scores of students under different teaching methods, you could use their 'prior knowledge' score as a covariate to statistically remove its effect.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {ancovaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ancovaExample)}>
                                <BookOpen className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ancovaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ancovaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Dependent Variable:</strong> The continuous outcome variable you are measuring (e.g., 'Final Score').
                                </li>
                                <li>
                                    <strong>Factor:</strong> The categorical independent variable that defines your main groups (e.g., 'Teaching Method').
                                </li>
                                <li>
                                    <strong>Covariate(s):</strong> One or more continuous variables that might also influence the dependent variable (e.g., 'Previous Score'). The analysis will statistically control for their effects.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will perform the ANCOVA and provide results for the main effects, covariate effects, and their interaction.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Main Effect of Factor:</strong> A significant p-value indicates that after adjusting for the covariate, there is still a significant difference between the groups defined by your factor.
                                </li>
                                 <li>
                                    <strong>Effect of Covariate:</strong> A significant p-value for a covariate means it is a significant predictor of the dependent variable.
                                </li>
                                <li>
                                    <strong>Interaction Effect:</strong> A significant interaction between a factor and a covariate suggests that the relationship between the covariate and the dependent variable is different across the groups of your factor.
                                </li>
                                 <li>
                                    <strong>Partial Eta-Squared (η²p):</strong> An effect size measure indicating the proportion of variance explained by a given variable, after controlling for other variables.
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

interface AncovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function AncovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: AncovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[0]);
    const [factorVar, setFactorVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [covariateVars, setCovariateVars] = useState<string[]>([numericHeaders[1]]);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1;
    }, [data, numericHeaders, categoricalHeaders]);

    useEffect(() => {
        setDependentVar(numericHeaders.find(h => h.toLowerCase().includes('score')) || numericHeaders[0]);
        setFactorVar(categoricalHeaders[0]);
        const initialCovariates = numericHeaders.filter(h => h !== (numericHeaders.find(h => h.toLowerCase().includes('score')) || numericHeaders[0]));
        setCovariateVars(initialCovariates.length > 0 ? [initialCovariates[0]] : []);
        setAnalysisResponse(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleCovariateChange = (header: string, checked: boolean) => {
        setCovariateVars(prev => 
            checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorVar || covariateVars.length === 0) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a dependent variable, a factor, and at least one covariate.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResponse(null);

        try {
            const response = await fetch('/api/analysis/ancova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorVar, covariateVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) {
                throw new Error((result as any).error);
            }
            setAnalysisResponse(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'ANCOVA Analysis Error', description: e.message || 'An unexpected error occurred.'})
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorVar, covariateVars, toast]);

    const availableNumeric = useMemo(() => {
        const selected = new Set([dependentVar, factorVar]);
        return numericHeaders.filter(h => !selected.has(h));
    }, [numericHeaders, dependentVar, factorVar]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResponse?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">ANCOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select your dependent variable, factor (grouping variable), and one or more covariates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Dependent Variable</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Factor</Label>
                            <Select value={factorVar} onValueChange={setFactorVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                             <Label>Covariate(s)</Label>
                             <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {availableNumeric.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`cov-${h}`} checked={covariateVars.includes(h)} onCheckedChange={(c) => handleCovariateChange(h, c as boolean)} />
                                            <Label htmlFor={`cov-${h}`}>{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || !factorVar || covariateVars.length === 0 || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                 <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Performing ANCOVA...</p>
                            <Skeleton className="h-96 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {results && analysisResponse && (
                 <>
                    {results.interpretation && (
                        <Card>
                            <CardHeader><CardTitle>Interpretation</CardTitle></CardHeader>
                            <CardContent>
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Analysis Summary</AlertTitle>
                                    <AlertDescription className="whitespace-pre-wrap">{results.interpretation}</AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                    {analysisResponse.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Interaction Plot</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResponse.plot} alt="ANCOVA Interaction Plot" width={800} height={600} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">ANCOVA Table</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Sum of Sq.</TableHead>
                                        <TableHead className="text-right">df</TableHead>
                                        <TableHead className="text-right">F</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">Partial η²</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.Source}</TableCell>
                                            <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.df}</TableCell>
                                            <TableCell className="text-right font-mono">{row.F?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">{row['p-value'] < 0.001 ? "<.001" : row['p-value']?.toFixed(4) ?? ''} {getSignificanceStars(row['p-value'])}</TableCell>
                                            <TableCell className="text-right font-mono">{row['η²p']?.toFixed(3) ?? ''}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="font-headline">Assumption Checks</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                             <div className="flex justify-between items-center">
                                <dt className="text-muted-foreground">Normality of Residuals (Shapiro-Wilk)</dt>
                                <dd>{results.assumptions.normality.met ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>} <span className='font-mono text-xs'>(p={(results.assumptions.normality.p_value || 0).toFixed(3)})</span></dd>
                            </div>
                            <div className="flex justify-between items-center">
                                <dt className="text-muted-foreground">Homogeneity of Variances (Levene's)</dt>
                                <dd>{results.assumptions.homogeneity.met ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>} <span className='font-mono text-xs'>(p={(results.assumptions.homogeneity.p_value || 0).toFixed(3)})</span></dd>

                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

        </div>
    );
}
