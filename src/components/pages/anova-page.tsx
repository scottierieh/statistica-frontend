
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
import { Sigma, AlertCircle, Loader2, Bot, CheckCircle2, HelpCircle, MoveRight, Settings, FileSearch, BarChart as BarChartIcon, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Image from 'next/image';

// Type definitions for the ANOVA results
interface AnovaResults {
    descriptives: { [key: string]: GroupStats };
    anova: AnovaTable;
    assumptions: AssumptionChecks;
    post_hoc_tukey?: PostHocResult[];
    effect_size_interpretation: EffectSizeInterpretation;
    interpretation: string;
}

interface FullAnovaResponse {
    results: AnovaResults;
    plot: string;
}

interface GroupStats {
    n: number;
    mean: number;
    std: number;
    var: number;
    min: number;
    max: number;
    median: number;
    q1: number;
    q3: number;
    se: number;
}

interface AnovaTable {
    f_statistic: number;
    p_value: number;
    significant: boolean;
    ssb: number;
    ssw: number;
    sst: number;
    df_between: number;
    df_within: number;
    df_total: number;
    msb: number;
    msw: number;
    eta_squared: number;
    omega_squared: number;
}

interface AssumptionChecks {
    normality: { [key: string]: { statistic: number | null; p_value: number | null; normal: boolean | null } };
    homogeneity: { levene_statistic: number; levene_p_value: number; equal_variances: boolean };
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

interface EffectSizeInterpretation {
    eta_squared_interpretation: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'tips');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Users size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">One-Way Analysis of Variance (ANOVA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Compare the means of three or more independent groups to determine if there is a statistically significant difference between them.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8 px-8 py-10">
                    <div className="space-y-6">
                        <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                        <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                            <li>
                                <strong>Select Group Variable:</strong> Choose a categorical variable with three or more groups (e.g., 'Treatment Type', 'Education Level').
                            </li>
                            <li>
                                <strong>Select Value Variable:</strong> Choose the numeric variable whose mean you want to compare across the groups (e.g., 'Test Score', 'Income').
                            </li>
                            <li>
                                <strong>Run Analysis:</strong> The tool performs the ANOVA, checks assumptions like normality and homogeneity of variances, and runs post-hoc tests (Tukey's HSD) if the overall result is significant.
                            </li>
                        </ol>
                    </div>
                    <div className="space-y-6">
                        <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                        <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                            <li>
                                <strong>ANOVA Table:</strong> The main result is the F-statistic and its p-value. If p < 0.05, it indicates that there is a significant difference somewhere among the group means.
                            </li>
                             <li>
                                <strong>Effect Size (η²):</strong> Eta-squared tells you what percentage of the variance in the value variable is explained by the group variable.
                            </li>
                            <li>
                                <strong>Post-Hoc Tests:</strong> If the overall ANOVA is significant, these tests show which specific pairs of groups are different from each other (e.g., 'Group A' is significantly different from 'Group C', but not 'Group B').
                            </li>
                             <li>
                                <strong>Assumption Checks:</strong> It's important to check that the data meets the assumptions of normality and equal variances for the ANOVA results to be valid.
                            </li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                    {anovaExample && <Button variant="outline" onClick={() => onLoadExample(anovaExample)}>Load Sample Tips Data</Button>}
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const InterpretationDisplay = ({ anovaResult }: { anovaResult: AnovaResults | undefined }) => {
    const formattedInterpretation = useMemo(() => {
        if (!anovaResult?.interpretation) return null;
        return anovaResult.interpretation
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/F\((.*?)\)\s*=\s*(.*?),/g, '<i>F</i>($1) = $2,')
            .replace(/p\s*=\s*(\.\d+)/g, '<i>p</i> = $1')
            .replace(/p\s*<\s*(\.\d+)/g, '<i>p</i> < $1')
            .replace(/M\s*=\s*([\d.]+)/g, '<i>M</i> = $1')
            .replace(/SD\s*=\s*([\d.]+)/g, '<i>SD</i> = $1');
    }, [anovaResult]);

    if (!anovaResult) return null;

    return (
        <Alert variant={anovaResult.anova.significant ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{anovaResult.anova.significant ? "Result is Statistically Significant" : "Result is Not Statistically Significant"}</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation || '' }} />
        </Alert>
    );
};


interface AnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const getSignificanceStars = (p: number) => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};


export default function AnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: AnovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [groupVar, setGroupVar] = useState(categoricalHeaders[0]);
    const [valueVar, setValueVar] = useState(numericHeaders[0]);
    const [analysisResponse, setAnalysisResponse] = useState<FullAnovaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length > 0;
    }, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setGroupVar(categoricalHeaders[0] || '');
        setValueVar(numericHeaders[0] || '');
        setAnalysisResponse(null);
        setView(canRun ? 'main' : 'intro');
    }, [categoricalHeaders, numericHeaders, data, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || !valueVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select both a group variable and a value variable.'});
            return;
        };

        setIsLoading(true);
        setAnalysisResponse(null);
        
        const backendUrl = '/api/analysis/anova';

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data,
                    independentVar: groupVar,
                    dependentVar: valueVar
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
                } catch (e) {
                    throw new Error(`Server returned non-JSON error: ${errorText}`);
                }
            }
            
            const result: FullAnovaResponse = await response.json();
             if ((result as any).error) {
                throw new Error((result as any).error);
            }
            setAnalysisResponse(result);
            

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'ANOVA Analysis Error', description: e.message || 'An unexpected error occurred. Please check the console for details.'})
            setAnalysisResponse(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, valueVar, toast]);

    const anovaResult = analysisResponse?.results;
    
    if (view === 'intro') {
       return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (!canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">One-Way ANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select a group variable (categorical) and a value variable (numeric) to compare means across groups, then click 'Run Analysis'.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Group Variable (Categorical)</label>
                            <Select value={groupVar} onValueChange={setGroupVar} disabled={categoricalHeaders.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Select a variable" /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Value Variable (Numeric)</label>
                            <Select value={valueVar} onValueChange={setValueVar} disabled={numericHeaders.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Select a variable" /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={!groupVar || !valueVar || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardContent>
            </Card>

            {isLoading && (
                 <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Performing ANOVA calculations...</p>
                            <Skeleton className="h-96 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {analysisResponse && anovaResult ? (
                <>
                {analysisResponse.plot && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Visualizations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResponse.plot} alt="ANOVA Plots" width={1200} height={1000} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                )}
                
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Analysis Summary & Interpretation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <InterpretationDisplay anovaResult={anovaResult} />
                    </CardContent>
                </Card>

                <div className="grid lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 flex flex-col gap-4">
                         <Card>
                            <CardHeader><CardTitle className="font-headline">Group Statistics</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group ({groupVar})</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Std. Dev.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(anovaResult.descriptives).map(([groupName, stats]) => (
                                            <TableRow key={groupName}>
                                                <TableCell>{groupName}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-4">
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Effect Size & Assumptions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <h3 className="font-semibold mb-2">Effect Size</h3>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border p-3 rounded-md">
                                        <dt className="text-muted-foreground">Eta-squared (η²)</dt>
                                        <dd className="font-mono text-right">{anovaResult.anova.eta_squared.toFixed(4)}</dd>
                                        <dt className="text-muted-foreground">Interpretation</dt>
                                        <dd className="text-right"><Badge variant="secondary">{anovaResult.effect_size_interpretation.eta_squared_interpretation}</Badge></dd>
                                    </dl>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Assumption Checks</h3>
                                    <div className="border p-3 rounded-md space-y-3">
                                        <div className="flex justify-between items-center">
                                            <dt className="text-muted-foreground">Normality (Shapiro-Wilk)</dt>
                                            <dd>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="link" size="sm" className="h-auto p-0">Details</Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80">
                                                        <div className="grid gap-4">
                                                            <div className="space-y-2">
                                                                <h4 className="font-medium leading-none">Normality Test</h4>
                                                                <p className="text-xs text-muted-foreground">Tests if each group's data is normal. p > 0.05 suggests normality.</p>
                                                            </div>
                                                            <div className="grid gap-2 text-xs">
                                                                {Object.entries(anovaResult.assumptions.normality).map(([group, result]) => (
                                                                    <div className="grid grid-cols-3 items-center gap-4" key={group}>
                                                                        <span className="font-semibold">{group}</span>
                                                                        <span className="font-mono">p = {result.p_value?.toFixed(3) ?? 'N/A'}</span>
                                                                        {result.normal === null ? <Badge variant="outline">N/A</Badge> : result.normal ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </dd>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <dt className="text-muted-foreground">Equal Variances (Levene's)</dt>
                                            <dd className="text-right">
                                                {anovaResult.assumptions.homogeneity.equal_variances ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>}
                                                <p className="font-mono text-xs">(p = {anovaResult.assumptions.homogeneity.levene_p_value.toFixed(3)})</p>
                                            </dd>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader><CardTitle className="font-headline">ANOVA Table</CardTitle></CardHeader>
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Between Groups</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.ssb.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.df_between}</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.msb.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.f_statistic.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.p_value < 0.001 ? "<.001" : anovaResult.anova.p_value.toFixed(3)} {getSignificanceStars(anovaResult.anova.p_value)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Within Groups</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.ssw.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.df_within}</TableCell>
                                    <TableCell className="text-right font-mono">{anovaResult.anova.msw.toFixed(3)}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-bold">Total</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{anovaResult.anova.sst.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{anovaResult.anova.df_total}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 
                 {anovaResult.post_hoc_tukey && anovaResult.anova.significant && (
                    <Card>
                        <CardHeader><CardTitle className="font-headline">Post-Hoc Tests (Tukey HSD)</CardTitle><CardDescription>Pairwise comparisons between groups.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Comparison</TableHead>
                                    <TableHead className="text-right">Mean Difference</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                    <TableHead className="text-right">95% CI</TableHead>
                                    <TableHead className="text-right">Significant</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {anovaResult.post_hoc_tukey.map((comp, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{comp.group1} vs. {comp.group2}</TableCell>
                                            <TableCell className="text-right font-mono">{comp.meandiff.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{comp.p_adj < 0.001 ? "<.001" : comp.p_adj.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">[{comp.lower.toFixed(2)}, {comp.upper.toFixed(2)}]</TableCell>
                                            <TableCell className="text-right">{comp.reject ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
                </>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}
