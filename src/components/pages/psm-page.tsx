
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, AlertTriangle, CheckCircle, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface PsmResults {
    att: number;
    t_statistic: number;
    p_value: number;
    n_matched: number;
    smd_after: { variable: string; smd: number }[];
}

interface FullAnalysisResponse {
    results: PsmResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const psmExample = exampleDatasets.find(d => d.id === 'ab-test-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                     <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Users size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Propensity Score Matching (PSM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Estimate the causal effect of a treatment or intervention by accounting for covariates that influence selection into the treatment group.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use PSM?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           In observational studies, groups often differ systematically, leading to biased estimates. PSM attempts to mimic a randomized controlled trial by creating a 'control' group that is statistically similar to the 'treatment' group on all observed characteristics. This is done by matching individuals based on their propensity score—the probability of receiving the treatment given their covariates.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {psmExample && (
                             <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(psmExample)}>
                                <psmExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{psmExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{psmExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Treatment Variable:</strong> Select the binary variable indicating treatment (1) vs. control (0).</li>
                                <li><strong>Outcome Variable:</strong> The continuous variable whose outcome you want to measure.</li>
                                <li><strong>Covariates:</strong> Select all variables that might influence both treatment assignment and the outcome. These are used to calculate the propensity score.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform logistic regression to get propensity scores, match subjects, and estimate the Average Treatment Effect on the Treated (ATT).</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>ATT (Average Treatment Effect on the Treated):</strong> This is the key result. It shows the average effect of the treatment on those who actually received it, after accounting for confounding variables.
                                </li>
                                <li>
                                    <strong>Covariate Balance (Love Plot):</strong> This plot is crucial. It shows the standardized mean difference (SMD) for each covariate before and after matching. After matching, all points should ideally be close to zero (e.g., &lt; 0.1), indicating the groups are well-balanced.
                                </li>
                                 <li>
                                    <strong>Propensity Score Distribution:</strong> The "Before Matching" plot often shows different distributions for the two groups. The "After Matching" plot should show very similar distributions, confirming the matching was successful.
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


export default function PsmPage({ data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample }: { data: DataSet; numericHeaders: string[]; categoricalHeaders: string[]; allHeaders: string[], onLoadExample: (e: any) => void }) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [treatmentCol, setTreatmentCol] = useState<string | undefined>();
    const [outcomeCol, setOutcomeCol] = useState<string | undefined>();
    const [covariateCols, setCovariateCols] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h])).size === 2);
    }, [data, categoricalHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && binaryCategoricalHeaders.length >= 1, [data, numericHeaders, binaryCategoricalHeaders]);
    
    useEffect(() => {
        setTreatmentCol(binaryCategoricalHeaders[0]);
        setOutcomeCol(numericHeaders[0]);
        setCovariateCols(allHeaders.filter(h => h !== binaryCategoricalHeaders[0] && h !== numericHeaders[0]));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, binaryCategoricalHeaders, allHeaders, canRun]);
    
    const availableCovariates = useMemo(() => allHeaders.filter(h => h !== treatmentCol && h !== outcomeCol), [allHeaders, treatmentCol, outcomeCol]);

    const handleCovariateChange = (header: string, checked: boolean) => {
        setCovariateCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!treatmentCol || !outcomeCol || covariateCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/psm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, treatment_col: treatmentCol, outcome_col: outcomeCol, covariate_cols: covariateCols })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, treatmentCol, outcomeCol, covariateCols, toast]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">PSM Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div><Label>Treatment Variable (Binary)</Label><Select value={treatmentCol} onValueChange={setTreatmentCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Outcome Variable (Numeric)</Label><Select value={outcomeCol} onValueChange={setOutcomeCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div>
                            <Label>Covariates</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                               {availableCovariates.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`cov-${h}`} checked={covariateCols.includes(h)} onCheckedChange={(c) => handleCovariateChange(h, c as boolean)} />
                                        <Label htmlFor={`cov-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}><Sigma className="mr-2"/>Run Analysis</Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full" />}
            
            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Alert variant={results.p_value < 0.05 ? 'default' : 'secondary'}>
                                {results.p_value < 0.05 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertTitle>{results.p_value < 0.05 ? 'Significant Treatment Effect' : 'No Significant Treatment Effect'}</AlertTitle>
                                <AlertDescription>
                                    The Average Treatment Effect on the Treated (ATT) is <strong>{results.att.toFixed(4)}</strong>. This result is statistically {results.p_value < 0.05 ? 'significant' : 'not significant'} (p = {results.p_value.toFixed(4)}), suggesting the treatment had a {results.p_value < 0.05 ? 'real' : 'negligible'} effect on the outcome for the treated group after matching.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Diagnostic Plots</CardTitle>
                            <CardDescription>Assess propensity score distribution and covariate balance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="PSM Diagnostic Plots" width={1500} height={1200} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Standardized Mean Differences After Matching</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead className="text-right">SMD</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {results.smd_after.map(item => (
                                        <TableRow key={item.variable}>
                                            <TableCell>{item.variable}</TableCell>
                                            <TableCell className="font-mono text-right">{item.smd.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

