
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitCommit, HelpCircle, MoveRight, Settings, FileSearch, CheckCircle, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface DidResults {
    model_summary_data: {
        caption: string | null;
        data: string[][];
    }[];
    params: { [key: string]: number };
    pvalues: { [key: string]: number };
    rsquared: number;
    rsquared_adj: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: DidResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const didExample = exampleDatasets.find(d => d.id === 'did-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                     <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <GitCommit size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Difference-in-Differences (DiD)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A quasi-experimental technique to estimate the causal effect of a specific intervention by comparing the change in outcomes over time between a treatment group and a control group.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use DiD?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            DiD mimics an experimental design using observational data. It assumes that, in the absence of the treatment, the treatment and control groups would have followed parallel trends. The effect of the treatment is then calculated as the difference in the average outcome change over time between the two groups.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {didExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(didExample)}>
                                <didExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{didExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{didExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Group Variable:</strong> The variable that distinguishes the treatment group from the control group (should be binary, e.g., 0 or 1).</li>
                                <li><strong>Time Variable:</strong> The variable that indicates the pre-intervention and post-intervention periods (should be binary, e.g., 0 or 1).</li>
                                <li><strong>Outcome Variable:</strong> The continuous variable whose change you want to measure.</li>
                                <li><strong>Run Analysis:</strong> The tool will run a regression with an interaction term to estimate the DiD effect.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Interaction Term:</strong> The coefficient for the 'group:time' interaction term is the core DiD estimator. A significant p-value for this term suggests the intervention had a real effect.
                                </li>
                                <li>
                                    <strong>Interaction Plot:</strong> This plot is essential. The "parallel trends" assumption means the lines for the control and treatment groups should be roughly parallel *before* the intervention. The DiD effect is the vertical difference between the treatment group's actual outcome and its projected outcome based on the control group's trend.
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


interface DidPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DidPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DidPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [timeVar, setTimeVar] = useState<string | undefined>();
    const [outcomeVar, setOutcomeVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, allHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && binaryCategoricalHeaders.length >= 2, [data, numericHeaders, binaryCategoricalHeaders]);
    
    useEffect(() => {
        setGroupVar(binaryCategoricalHeaders.find(h => h.toLowerCase().includes('group')));
        setTimeVar(binaryCategoricalHeaders.find(h => h.toLowerCase().includes('time')));
        setOutcomeVar(numericHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, binaryCategoricalHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || !timeVar || !outcomeVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select group, time, and outcome variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/did', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    group_var: groupVar, 
                    time_var: timeVar, 
                    outcome_var: outcomeVar 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: 'DiD Analysis Complete', description: 'Regression results are ready.' });

        } catch (e: any) {
            console.error('DiD Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, timeVar, outcomeVar, toast]);

    const handleLoadExampleData = () => {
        const didExample = exampleDatasets.find(ex => ex.id === 'did-data');
        if (didExample) {
            onLoadExample(didExample);
            setView('main');
        }
    };

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    const results = analysisResult?.results;
    const didPValue = results?.pvalues ? Object.entries(results.pvalues).find(([key]) => key.includes('DiD_Effect'))?.[1] : undefined;


    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">DiD Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Specify the outcome, group, and time variables for the analysis.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                    <div>
                        <Label>Outcome Variable</Label>
                        <Select value={outcomeVar} onValueChange={setOutcomeVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Group Variable (0/1)</Label>
                        <Select value={groupVar} onValueChange={setGroupVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Time Variable (0/1)</Label>
                        <Select value={timeVar} onValueChange={setTimeVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !groupVar || !timeVar || !outcomeVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                     {results.interpretation && (
                        <Card>
                            <CardHeader><CardTitle>Interpretation</CardTitle></CardHeader>
                            <CardContent>
                                <Alert variant={didPValue !== undefined && didPValue < 0.05 ? 'default' : 'secondary'}>
                                    {didPValue !== undefined && didPValue < 0.05 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                    <AlertTitle>{didPValue !== undefined && didPValue < 0.05 ? "Significant Intervention Effect" : "No Significant Intervention Effect"}</AlertTitle>
                                    <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: results.interpretation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}/>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle className="font-headline">Interaction Plot</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="DiD Interaction Plot" width={800} height={600} className="mx-auto rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Regression Results</CardTitle>
                            <CardDescription>
                                The interaction term represents the DiD effect. A significant coefficient suggests the treatment had a measurable effect.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {results.model_summary_data?.map((table, tableIndex) => (
                                <Table key={tableIndex}>
                                    {table.caption && <TableCaption>{table.caption}</TableCaption>}
                                    <TableHeader><TableRow>{table.data[0].map((cell, cellIndex) => <TableHead key={cellIndex}>{cell}</TableHead>)}</TableRow></TableHeader>
                                    <TableBody>
                                    {table.data.slice(1).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>{row.map((cell, cellIndex) => <TableCell key={cellIndex} className="font-mono">{cell}</TableCell>)}</TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

    