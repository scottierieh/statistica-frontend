
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sigma, Loader2, GitCommit, HelpCircle, MoveRight, Settings, FileSearch, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RddResults {
    effect: number;
    se: number;
    t_statistic: number;
    p_value: number;
    ci_lower: number;
    ci_upper: number;
    n_effective: number;
    bandwidth: number;
    mccrary_test: {
        statistic: number;
        p_value: number;
    };
}

interface FullAnalysisResponse {
    results: RddResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const rddExample = exampleDatasets.find(d => d.id === 'rdd-scholarship');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <GitCommit size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Regression Discontinuity Design (RDD)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Estimate the causal effect of an intervention by comparing observations lying closely on either side of a cutoff point.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use RDD?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            RDD is a powerful quasi-experimental method used when a treatment is assigned based on whether an observation is above or below a specific threshold (the "cutoff"). By comparing outcomes for units just on either side of this cutoff, we can estimate the local average treatment effect, assuming that these units are otherwise very similar.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {rddExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(rddExample)}>
                                <rddExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{rddExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{rddExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Running Variable:</strong> The continuous variable that determines treatment eligibility (e.g., 'Test Score').</li>
                                <li><strong>Outcome Variable:</strong> The continuous variable whose change you want to measure (e.g., 'University GPA').</li>
                                <li><strong>Cutoff Point:</strong> The exact threshold on the running variable where the treatment is assigned.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform the RDD estimation and check key assumptions.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Treatment Effect:</strong> The main result. A significant p-value indicates the treatment had a causal effect on the outcome at the cutoff.</li>
                                <li><strong>RDD Plot:</strong> Shows a discontinuity (a "jump") at the cutoff if there is a treatment effect. The lines show the fitted regression on either side.</li>
                                <li><strong>McCrary Density Test:</strong> Checks if units are precisely manipulating the running variable to be on one side of the cutoff. A non-significant p-value is desired, suggesting no manipulation.</li>
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


export default function RddPage({ data, numericHeaders, onLoadExample }: { data: DataSet; numericHeaders: string[]; onLoadExample: (e: any) => void }) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [runningVar, setRunningVar] = useState<string | undefined>();
    const [outcomeVar, setOutcomeVar] = useState<string | undefined>();
    const [cutoff, setCutoff] = useState<number>(0);
    const [polynomial, setPolynomial] = useState<number>(1);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        if (canRun) {
            setRunningVar(numericHeaders[0]);
            setOutcomeVar(numericHeaders[1]);
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
    }, [canRun, numericHeaders]);
    
    const availableOutcomeVars = useMemo(() => numericHeaders.filter(h => h !== runningVar), [numericHeaders, runningVar]);
    
    useEffect(() => {
        if(outcomeVar === runningVar) {
            setOutcomeVar(availableOutcomeVars[0]);
        }
    }, [runningVar, outcomeVar, availableOutcomeVars]);

    const handleAnalysis = useCallback(async () => {
        if (!runningVar || !outcomeVar || cutoff === undefined) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required fields.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/rdd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, running_var: runningVar, outcome_var: outcomeVar, cutoff, polynomial })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'RDD Analysis Complete', description: 'The treatment effect has been estimated.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, runningVar, outcomeVar, cutoff, polynomial, toast]);

    const handleLoadExampleData = () => {
        const rddExample = exampleDatasets.find(ex => ex.id === 'rdd-scholarship');
        if (rddExample) {
            onLoadExample(rddExample);
            setView('main');
        }
    };
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Regression Discontinuity Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><Label>Running Variable</Label><Select value={runningVar} onValueChange={setRunningVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Outcome Variable</Label><Select value={outcomeVar} onValueChange={setOutcomeVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableOutcomeVars.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Cutoff Point</Label><Input type="number" value={cutoff} onChange={e => setCutoff(Number(e.target.value))} /></div>
                    <div><Label>Polynomial Degree</Label><Input type="number" value={polynomial} onChange={e => setPolynomial(Number(e.target.value))} min="1" /></div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !runningVar || !outcomeVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run RDD</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && <Skeleton className="h-96 w-full" />}
            
            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>RDD Treatment Effect Estimate</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Alert variant={results.p_value < 0.05 ? 'default' : 'secondary'}>
                                {results.p_value < 0.05 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertTitle>
                                    {results.p_value < 0.05 ? "Statistically Significant Effect" : "No Significant Effect"}
                                </AlertTitle>
                                <AlertDescription>
                                    The estimated treatment effect at the cutoff is <strong>{results.effect.toFixed(4)}</strong>. 
                                    This result is statistically {results.p_value < 0.05 ? 'significant' : 'not significant'} (p = {results.p_value.toFixed(4)}).
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                             <CardHeader><CardTitle>RDD Plot</CardTitle></CardHeader>
                             <CardContent><Image src={`data:image/png;base64,${analysisResult.plot}`} alt="RDD Plot" width={1500} height={600} className="w-full rounded-md border" /></CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Estimation Details</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableBody>
                                        <TableRow><TableCell>Effect</TableCell><TableCell className="font-mono text-right">{results.effect.toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell>Std. Error</TableCell><TableCell className="font-mono text-right">{results.se.toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell>T-statistic</TableCell><TableCell className="font-mono text-right">{results.t_statistic.toFixed(3)}</TableCell></TableRow>
                                        <TableRow><TableCell>P-value</TableCell><TableCell className="font-mono text-right">{results.p_value.toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell>95% CI</TableCell><TableCell className="font-mono text-right">[{results.ci_lower.toFixed(3)}, {results.ci_upper.toFixed(3)}]</TableCell></TableRow>
                                        <TableRow><TableCell>Bandwidth</TableCell><TableCell className="font-mono text-right">{results.bandwidth.toFixed(3)}</TableCell></TableRow>
                                        <TableRow><TableCell>Observations</TableCell><TableCell className="font-mono text-right">{results.n_effective}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>McCrary Density Test</CardTitle></CardHeader>
                            <CardContent>
                                <Alert variant={results.mccrary_test.p_value > 0.05 ? 'default' : 'destructive'}>
                                    {results.mccrary_test.p_value > 0.05 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                    <AlertTitle>{results.mccrary_test.p_value > 0.05 ? "No Significant Manipulation" : "Potential Manipulation Detected"}</AlertTitle>
                                    <AlertDescription>
                                        A non-significant p-value ({results.mccrary_test.p_value.toFixed(3)}) suggests no evidence of individuals manipulating the running variable around the cutoff.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

    