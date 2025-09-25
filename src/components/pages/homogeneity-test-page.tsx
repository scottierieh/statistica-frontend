
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, Layers, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface HomogeneityTestResult {
    levene_test: {
        statistic: number;
        p_value: number;
    };
    descriptives: {
        [group: string]: {
            n: number;
            mean: number;
            variance: number;
            std_dev: number;
        };
    };
    assumption_met: boolean;
    interpretation: string;
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: HomogeneityTestResult;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const homogeneityExample = exampleDatasets.find(d => d.id === 'tips');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Layers size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Homogeneity of Variances Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Use Levene's test to check if the variances are equal across two or more groups, a key assumption for ANOVA.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Test for Homogeneity?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Many parametric statistical tests, like ANOVA, work best when the variability within each group being compared is similar. If one group's data is much more spread out than another's, it can violate the test's assumptions and lead to inaccurate conclusions. Levene's test is a robust way to check this assumption before you proceed with your main analysis.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {homogeneityExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(homogeneityExample)}>
                                <homogeneityExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{homogeneityExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{homogeneityExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Value Variable:</strong> Select the continuous numeric variable you want to check (e.g., 'Tip Amount').
                                </li>
                                <li>
                                    <strong>Grouping Variable:</strong> Choose the categorical variable that defines your groups (e.g., 'Day of the Week').
                                </li>
                                 <li>
                                    <strong>Run Test:</strong> The tool will perform Levene's test and provide a clear pass/fail result.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Passed (p &gt; 0.05):</strong> The variances are equal across groups. You can proceed with standard tests like ANOVA.
                                </li>
                                <li>
                                    <strong>Failed (p &lt;= 0.05):</strong> The variances are unequal. You should use a statistical test that does not assume equal variances (e.g., Welch's ANOVA).
                                </li>
                                 <li>
                                    <strong>Box Plot:</strong> Visually inspect the plot. If the boxes for each group have roughly the same height (Interquartile Range), it supports the assumption of homogeneity.
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


interface HomogeneityTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function HomogeneityTestPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: HomogeneityTestPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [valueVar, setValueVar] = useState<string | undefined>(numericHeaders[0]);
    const [groupVar, setGroupVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setValueVar(numericHeaders[0]);
        setGroupVar(categoricalHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!valueVar || !groupVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a value and a group variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/homogeneity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, valueVar, groupVar })
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

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Homogeneity Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, valueVar, groupVar, toast]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Homogeneity of Variances Test (Levene's Test)</CardTitle>
                         <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select a numeric variable and a categorical grouping variable to test if the variances are equal across groups.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Value Variable</Label>
                            <Select value={valueVar} onValueChange={setValueVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label>Grouping Variable</Label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !valueVar || !groupVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Test</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Levene's Test Results</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Alert variant={results.assumption_met ? 'default' : 'destructive'}>
                                  {results.assumption_met ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
                                  <AlertTitle>Assumption of Homogeneity {results.assumption_met ? "Met" : "Violated"}</AlertTitle>
                                  <AlertDescription>{results.interpretation}</AlertDescription>
                                </Alert>
                                
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Levene Statistic</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.statistic.toFixed(4)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>p-value</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.p_value < 0.001 ? '<.001' : results.levene_test.p_value.toFixed(4)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <Image src={results.plot} alt={`Box plot of ${valueVar} by ${groupVar}`} width={800} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Descriptive Statistics by Group</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Group</TableHead>
                                        <TableHead className="text-right">N</TableHead>
                                        <TableHead className="text-right">Mean</TableHead>
                                        <TableHead className="text-right">Variance</TableHead>
                                        <TableHead className="text-right">Std. Deviation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.descriptives).map(([group, stats]) => (
                                        <TableRow key={group}>
                                            <TableCell>{group}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.variance.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Test' to check for homogeneity of variances.</p>
                </div>
            )}
        </div>
    );
}
