

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart as BarChartIcon, Settings, FileSearch, Users, Coffee } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';

interface AnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'tips');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                         <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Sigma size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">One-Way ANOVA</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Compare the means of three or more groups to see if at least one group is statistically different from the others.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use One-Way ANOVA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            When you want to compare the average of a continuous variable across several different categories or groups (e.g., comparing the average test scores of students from three different schools), a One-Way ANOVA is the appropriate statistical test. It checks if the observed differences in means are statistically significant or just due to random chance, preventing the errors that can arise from running multiple t-tests.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Independent Variable:</strong> Choose the categorical variable that defines your groups (e.g., 'Day of the Week', 'Customer Segment'). It must have at least 3 distinct groups.</li>
                                <li><strong>Dependent Variable:</strong> Select the continuous numeric variable whose mean you want to compare across the groups (e.g., 'Total Bill', 'Test Score').</li>
                                <li><strong>Run Analysis:</strong> The tool will perform the ANOVA, check assumptions, and run post-hoc tests if necessary to identify which specific groups differ.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>F-statistic:</strong> A large F-value suggests that the variation between groups is greater than the variation within groups, indicating a significant overall difference.
                                </li>
                                <li>
                                    <strong>p-value:</strong> If this value is less than 0.05, you can conclude that there is a statistically significant difference somewhere among the group means.
                                </li>
                                 <li>
                                    <strong>Post-Hoc Tests (Tukey's HSD):</strong> If the ANOVA result is significant, these tests are used to find out which specific group pairs are significantly different from each other.
                                </li>
                                <li><strong>Effect Size (η²):</strong> Indicates the proportion of variance in the dependent variable that is explained by the independent variable.</li>
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">Load Example Data</h3>
                        <div className="flex justify-center">
                            {anovaExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(anovaExample)}>
                                    <Coffee className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{anovaExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{anovaExample.description}</p>
                                    </div>
                                </Card>
                            )}
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


export default function AnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: AnovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[0]);
    const [independentVar, setIndependentVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setDependentVar(numericHeaders[0] || '');
        setIndependentVar(categoricalHeaders[0] || '');
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders]);
    
    const multiGroupCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size >= 3);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0 && multiGroupCategoricalHeaders.length > 0;
    }, [data, numericHeaders, multiGroupCategoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!independentVar || !dependentVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both an independent and a dependent variable.' });
            return;
        }

        const groups = new Set(data.map(row => row[independentVar]));
        if (groups.size < 3) {
            toast({ variant: 'destructive', title: 'Invalid Grouping', description: `The variable '${independentVar}' must have at least 3 distinct groups for ANOVA.` });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, independentVar, dependentVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, independentVar, dependentVar, toast]);

    const { results, plot } = analysisResult || {};

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (!canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>One-Way ANOVA</CardTitle>
                    <CardDescription>Select an independent (categorical, 3+ groups) and a dependent (numeric) variable.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Independent Variable (Group)</Label>
                        <Select value={independentVar} onValueChange={setIndependentVar}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{multiGroupCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Dependent Variable (Value)</Label>
                        <Select value={dependentVar} onValueChange={setDependentVar}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Running...</> : <><Sigma className="mr-2 h-4 w-4"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Interpretation</CardTitle></CardHeader>
                        <CardContent>
                             <Alert variant={results.anova.significant ? 'default' : 'destructive'}>
                                 <AlertTitle>
                                    {results.anova.significant ? "Statistically Significant Difference Found" : "No Statistically Significant Difference"}
                                </AlertTitle>
                                <AlertDescription>
                                     <div dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />') }} />
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader><CardTitle>ANOVA Results</CardTitle></CardHeader>
                         <CardContent><Image src={plot} alt="ANOVA Plot" width={1500} height={1200} className="w-full h-auto rounded-md border"/></CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
