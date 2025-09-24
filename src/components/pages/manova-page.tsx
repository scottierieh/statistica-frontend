
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, FileSearch, Settings, MoveRight, HelpCircle, Layers } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import Image from 'next/image';

interface TestStatistic {
    statistic: number;
    F: number;
    df1: number;
    df2: number;
    p_value: number;
}
interface ManovaResults {
    factor: string;
    test_statistics: {
        pillai: TestStatistic;
        wilks: TestStatistic;
        hotelling: TestStatistic;
        roy: TestStatistic;
    };
    univariate_results: {
        [dv: string]: {
            f_statistic: number;
            p_value: number;
            eta_squared: number;
            significant: boolean;
        };
    };
    significant: boolean;
}

interface FullAnalysisResponse {
    results: ManovaResults;
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
    const manovaExample = exampleDatasets.find(d => d.id === 'manova-groups');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Layers size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Multivariate Analysis of Variance (MANOVA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        An extension of ANOVA for situations where you have two or more dependent variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use MANOVA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            MANOVA is used to determine whether there are any statistically significant differences between the means of two or more independent groups on a combination of two or more dependent variables. It's more powerful than running multiple separate ANOVAs because it accounts for the correlations between the dependent variables and reduces the risk of Type I errors (false positives).
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Dependent Variables:</strong> Select two or more continuous numeric variables that represent the outcomes you are measuring (e.g., 'Test Score' and 'Time to Complete').
                                </li>
                                <li>
                                    <strong>Factor Variable:</strong> Choose a single categorical variable that defines your independent groups (e.g., 'Teaching Group A', 'Group B', 'Group C').
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will calculate multivariate test statistics (like Pillai's Trace and Wilks' Lambda) to determine if there's an overall difference between groups.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Multivariate Tests:</strong> A significant p-value (e.g., for Pillai's Trace) indicates that there is a statistically significant difference between the groups when considering all dependent variables together.
                                </li>
                                <li>
                                    <strong>Univariate Follow-up Tests:</strong> If the overall MANOVA is significant, you then look at the individual ANOVAs for each dependent variable to see which specific outcomes differ across the groups.
                                </li>
                                 <li>
                                    <strong>Effect Size (Pillai's Trace or Partial η²):</strong> These metrics indicate the magnitude of the difference between groups.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                    {manovaExample && <Button variant="outline" onClick={() => onLoadExample(manovaExample)}><Users className="mr-2"/>Load Sample Group Data</Button>}
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface ManovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ManovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: ManovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVars, setDependentVars] = useState<string[]>([]);
    const [factorVar, setFactorVar] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setDependentVars(numericHeaders.slice(0, 2));
        setFactorVar(categoricalHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleDepVarChange = (header: string, checked: boolean) => {
        setDependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (dependentVars.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two dependent variables.' });
            return;
        }
        if (!factorVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a factor variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/manova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVars, factorVars: [factorVar] })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('MANOVA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVars, factorVar, toast]);
    
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
                        <CardTitle className="font-headline">MANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select two or more dependent variables and one factor (grouping variable).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Dependent Variables</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {numericHeaders.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`dv-${h}`} checked={dependentVars.includes(h)} onCheckedChange={(c) => handleDepVarChange(h, c as boolean)} />
                                            <Label htmlFor={`dv-${h}`}>{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div>
                            <Label>Factor (Grouping Variable)</Label>
                            <Select value={factorVar} onValueChange={setFactorVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || dependentVars.length < 2 || !factorVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="font-headline">MANOVA Plot</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="MANOVA plot" width={1500} height={1200} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Multivariate Test Results</CardTitle>
                            <CardDescription>Overall tests for differences between groups across all dependent variables.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">F-value</TableHead><TableHead className="text-right">p-value</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.test_statistics).map(([name, stat]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name.charAt(0).toUpperCase() + name.slice(1)}'s Trace</TableCell>
                                            <TableCell className="text-right font-mono">{stat.statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{stat.F.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{stat.p_value < 0.001 ? '<.001' : stat.p_value.toFixed(4)} {getSignificanceStars(stat.p_value)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Univariate Follow-up Tests (ANOVA)</CardTitle>
                            <CardDescription>Individual ANOVA test for each dependent variable.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Dependent Variable</TableHead><TableHead className="text-right">F-value</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">η²</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.univariate_results).map(([dv, res]) => (
                                        <TableRow key={dv}>
                                            <TableCell>{dv}</TableCell>
                                            <TableCell className="text-right font-mono">{res.f_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{res.p_value < 0.001 ? '<.001' : res.p_value.toFixed(4)} {getSignificanceStars(res.p_value)}</TableCell>
                                            <TableCell className="text-right font-mono">{res.eta_squared.toFixed(4)}</TableCell>
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
