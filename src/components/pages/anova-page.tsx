'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, AlertCircle, Loader2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getAnovaInterpretation } from '@/app/actions';

// Type definitions for the ANOVA results
interface AnovaResults {
    descriptives: { [key: string]: GroupStats };
    anova: AnovaTable;
    assumptions: AssumptionChecks;
    post_hoc_tukey?: PostHocResult[];
    effect_size_interpretation: EffectSizeInterpretation;
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
    reject: boolean;
}

interface EffectSizeInterpretation {
    eta_squared_interpretation: string;
}

const AIGeneratedInterpretation = ({ promise }: { promise: Promise<string | null> | null }) => {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promise) {
        setInterpretation(null);
        setLoading(false);
        return;
    };
    let isMounted = true;
    setLoading(true);
    promise.then((desc) => {
        if (isMounted) {
            setInterpretation(desc);
            setLoading(false);
        }
    });
    return () => { isMounted = false; };
  }, [promise]);
  
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!interpretation) return null;

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><AlertCircle /> AI Interpretation</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{interpretation}</p>
        </CardContent>
    </Card>
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
    const [groupVar, setGroupVar] = useState(categoricalHeaders[0]);
    const [valueVar, setValueVar] = useState(numericHeaders[0]);
    const [anovaResult, setAnovaResult] = useState<AnovaResults | null>(null);
    const [aiPromise, setAiPromise] = useState<Promise<string|null> | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length > 0;
    }, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setGroupVar(categoricalHeaders[0] || '');
        setValueVar(numericHeaders[0] || '');
        setAnovaResult(null);
        setAiPromise(null);
    }, [categoricalHeaders, numericHeaders, data]);

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || !valueVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select both a group variable and a value variable.'});
            return;
        };

        setIsLoading(true);
        setAnovaResult(null);
        setAiPromise(null);

        try {
            // NOTE: The backend URL is hardcoded here as environment variables were not reliable in this context.
            const backendUrl = 'https://us-central1-studio-7415103661-752d9.cloudfunctions.net/api/anova';

            console.log('Sending request to:', backendUrl);
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
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            setAnovaResult(result);

            if (result.anova) {
                const promise = getAnovaInterpretation({
                    fStat: result.anova.f_statistic,
                    pValue: result.anova.p_value,
                    groupVar: groupVar,
                    valueVar: valueVar,
                }).then(res => res.success ? res.interpretation ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));
                setAiPromise(promise);
            }


        } catch(e: any) {
            console.error('Fetch error:', e);
            toast({variant: 'destructive', title: 'ANOVA Analysis Error', description: e.message || 'An unexpected error occurred. Please check the console for details.'})
            setAnovaResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, valueVar, toast]);

    if (!canRun) {
        const anovaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('anova'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Analysis of Variance (ANOVA)</CardTitle>
                        <CardDescription>
                           To perform ANOVA, you need to upload data with at least one numeric and one categorical variable. Try one of our example datasets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {anovaExamples.map((ex) => {
                                const Icon = ex.icon;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-6 w-6 text-secondary-foreground" />
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
                    <CardTitle className="font-headline">ANOVA Setup</CardTitle>
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

            {anovaResult ? (
                <>
                <div className="grid lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">ANOVA Summary</CardTitle>
                                <CardDescription>
                                    F({anovaResult.anova.df_between}, {anovaResult.anova.df_within}) = {anovaResult.anova.f_statistic.toFixed(3)}, p = {anovaResult.anova.p_value.toFixed(4)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Alert variant={anovaResult.anova.significant ? "default" : "destructive"}>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>{anovaResult.anova.significant ? "Result is Statistically Significant" : "Result is Not Statistically Significant"}</AlertTitle>
                                    <AlertDescription>
                                        {anovaResult.anova.significant 
                                            ? `There is a significant difference between the means of the groups (p < 0.05).`
                                            : `There is no significant difference between the means of the groups (p >= 0.05).`}
                                    </AlertDescription>
                                </Alert>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="font-semibold mb-2 text-lg">Effect Size</h3>
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border p-4 rounded-md">
                                            <dt className="text-muted-foreground">Eta-squared (η²)</dt>
                                            <dd className="font-mono text-right">{anovaResult.anova.eta_squared.toFixed(4)}</dd>
                                            <dt className="text-muted-foreground">Interpretation</dt>
                                            <dd className="text-right"><Badge variant="secondary">{anovaResult.effect_size_interpretation.eta_squared_interpretation}</Badge></dd>
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2 text-lg">Assumption Checks</h3>
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border p-4 rounded-md">
                                            <dt className="text-muted-foreground">Normality (Shapiro-Wilk)</dt>
                                            <dd className="text-right">{Object.values(anovaResult.assumptions.normality).every(t => t.normal) ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>}</dd>
                                            <dt className="text-muted-foreground">Equal Variances (Levene)</dt>
                                            <dd className="text-right">{anovaResult.assumptions.homogeneity.equal_variances ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <AIGeneratedInterpretation promise={aiPromise} />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-4">
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
                                    <TableHead className="text-right">Significant</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {anovaResult.post_hoc_tukey.map((comp, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{comp.group1} vs. {comp.group2}</TableCell>
                                            <TableCell className="text-right font-mono">{comp.meandiff.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{comp.p_adj.toFixed(4)}</TableCell>
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
