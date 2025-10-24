

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
import { Sigma, AlertCircle, Loader2, Copy, Users, Settings, FileSearch, BarChart as BarChartIcon, HelpCircle, MoveRight } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';


interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    MS: number;
    F: number;
    'p-value': number;
    'η²p': number;
}

interface MarginalMeansRow {
    [key: string]: string | number;
    mean: number;
    std: number;
    sem: number;
    count: number;
}

interface NormalityResult {
    statistic: number | null;
    p_value: number | null;
    normal: boolean | null;
}

interface AssumptionResult {
    test: string;
    statistic: number;
    p_value: number;
    assumption_met: boolean;
}

interface PostHocResult {
    group1: string;
    group2: string;
    meandiff: number;
    p_adj: number;
    lower: number;
    upper: number;
    reject: boolean;
}


interface TwoWayAnovaResults {
    anova_table: AnovaRow[];
    descriptive_stats_table: { [key: string]: { [key: string]: number } };
    marginal_means: {
        factor_a: MarginalMeansRow[];
        factor_b: MarginalMeansRow[];
    };
    assumptions: {
        normality: { [key: string]: NormalityResult };
        homogeneity: AssumptionResult;
    };
    posthoc_results?: PostHocResult[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: TwoWayAnovaResults;
    plot: string; // base64 image string
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const getEffectSizeInterpretation = (eta_squared_p: number) => {
    if (eta_squared_p >= 0.14) return 'Large';
    if (eta_squared_p >= 0.06) return 'Medium';
    if (eta_squared_p >= 0.01) return 'Small';
    return 'Negligible';
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'two-way-anova');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Users size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Two-Way Analysis of Variance (ANOVA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Examine the influence of two different categorical independent variables on one continuous dependent variable.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Two-Way ANOVA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Two-Way ANOVA extends One-Way ANOVA by allowing you to test the effects of two independent factors simultaneously. This is powerful because it not only reveals the main effect of each factor but also uncovers if there is an **interaction effect** between them. An interaction means the effect of one factor depends on the level of the other, providing deeper insights than running separate one-way tests.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {anovaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(anovaExample)}>
                                <BarChartIcon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{anovaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{anovaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Dependent Variable:</strong> Select the continuous numeric variable you want to measure (e.g., 'Score', 'Response Time').
                                </li>
                                <li>
                                    <strong>Factor A & B:</strong> Choose two different categorical variables that represent the independent groups (e.g., 'Teaching Method' and 'Gender').
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will calculate the main effects of each factor, the interaction effect between them, and check statistical assumptions.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Main Effects:</strong> A significant main effect for a factor means that factor has an overall effect on the dependent variable, regardless of the other factor.
                                </li>
                                <li>
                                    <strong>Interaction Effect:</strong> A significant interaction effect is often the most important finding. It means the effect of one factor depends on the level of the other factor (e.g., Teaching Method A is only effective for one Gender).
                                </li>
                                <li>
                                    <strong>Interaction Plot:</strong> This plot is crucial for understanding an interaction. If the lines are not parallel, it suggests an interaction is present.
                                </li>
                                <li>
                                    <strong>Post-Hoc Tests:</strong> If the interaction is significant, these tests are performed to identify which specific group combinations are different from each other.
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

interface TwoWayAnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TwoWayAnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: TwoWayAnovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState(numericHeaders[0]);
    const [factorA, setFactorA] = useState(categoricalHeaders[0]);
    const [factorB, setFactorB] = useState(categoricalHeaders.length > 1 ? categoricalHeaders[1] : undefined);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 2;
    }, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setDependentVar(numericHeaders[0] || '');
        setFactorA(categoricalHeaders[0] || '');
        setFactorB(categoricalHeaders[1] || '');
        setAnalysisResponse(null);
        setView(canRun ? 'main' : 'intro');
    }, [categoricalHeaders, numericHeaders, data, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorA || !factorB) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a dependent variable and two factor variables.'});
            return;
        };
        if (factorA === factorB) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Factor A and Factor B must be different variables.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResponse(null);
        
        try {
            const response = await fetch('/api/analysis/two-way-anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorA, factorB })
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
            toast({variant: 'destructive', title: 'ANOVA Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResponse(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorA, factorB, toast]);

    const availableFactorB = useMemo(() => categoricalHeaders.filter(h => h !== factorA), [categoricalHeaders, factorA]);
    
    const results = analysisResponse?.results;
    const interactionPValue = results?.anova_table.find(row => row.Source.includes('*'))?.['p-value'];

    const descriptiveTable = useMemo(() => {
        if (!results?.descriptive_stats_table) return null;
        const data = results.descriptive_stats_table;
        const rowLabels = Object.keys(data.mean);
        const colLabels = Object.keys(data.mean[rowLabels[0]]);
        return {
            rowLabels,
            colLabels,
            data
        };
    }, [results]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Two-Way ANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select a dependent variable (numeric) and two factor variables (categorical), then click 'Run Analysis'.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Dependent Variable</label>
                            <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Factor A</label>
                            <Select value={factorA} onValueChange={setFactorA}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Factor B</label>
                            <Select value={factorB} onValueChange={setFactorB} disabled={availableFactorB.length === 0}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableFactorB.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || !factorA || !factorB || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                 <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Performing Two-Way ANOVA...</p>
                            <Skeleton className="h-96 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {analysisResponse && results ? (
                <>
                    {analysisResponse.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResponse.plot} alt="Two-Way ANOVA Plots" width={1400} height={1200} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary & Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={interactionPValue !== undefined && interactionPValue < 0.05 ? 'default' : 'secondary'}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>
                                    {interactionPValue !== undefined && interactionPValue < 0.05
                                        ? 'Significant Interaction Effect Found'
                                        : 'No Significant Interaction Effect'
                                    }
                                </AlertTitle>
                                <AlertDescription className="whitespace-pre-wrap">
                                    {results.interpretation}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {descriptiveTable && (
                        <Card>
                             <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{factorA}</TableHead>
                                            {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(col => <TableHead key={col} className="text-center">{col}</TableHead>)}
                                            <TableHead className="text-right bg-muted/50">Row Mean</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {descriptiveTable.rowLabels.filter(r => r !== 'Column Mean').map(rowLabel => (
                                            <TableRow key={rowLabel}>
                                                <TableCell className="font-medium">{rowLabel}</TableCell>
                                                {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(colLabel => (
                                                    <TableCell key={colLabel} className="text-center font-mono">
                                                        {descriptiveTable.data.mean[rowLabel][colLabel]?.toFixed(2)} (±{descriptiveTable.data.std[rowLabel][colLabel]?.toFixed(2)})
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-mono font-bold bg-muted/50">
                                                    {descriptiveTable.data.mean[rowLabel]['Row Mean']?.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                         <TableRow className="bg-muted/50 font-bold">
                                            <TableCell>Column Mean</TableCell>
                                            {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(colLabel => (
                                                <TableCell key={colLabel} className="text-center font-mono">
                                                    {descriptiveTable.data.mean['Column Mean'][colLabel]?.toFixed(2)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-mono">
                                                {descriptiveTable.data.mean['Column Mean']['Row Mean']?.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">ANOVA Table</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">SS</TableHead>
                                        <TableHead className="text-right">df</TableHead>
                                        <TableHead className="text-right">MS</TableHead>
                                        <TableHead className="text-right">F</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">η²p</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.Source}</TableCell>
                                            <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.df}</TableCell>
                                            <TableCell className="text-right font-mono">{row.MS?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">{row.F?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">{row['p-value'] < 0.001 ? "<.001" : row['p-value']?.toFixed(4) ?? ''} {getSignificanceStars(row['p-value'])}</TableCell>
                                            <TableCell className="text-right font-mono">{row['η²p']?.toFixed(3) ?? ''}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className='text-sm text-muted-foreground'>η²p: Partial Eta-Squared (Effect Size)</p>
                        </CardFooter>
                    </Card>
                </>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}

