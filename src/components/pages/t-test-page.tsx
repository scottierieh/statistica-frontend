

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, AlertTriangle, CheckCircle2, HelpCircle, MoveRight, Settings, FileSearch, BarChart, Users, Repeat, TestTube } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';

const getEffectSizeInterpretation = (d: number) => {
    const abs_d = Math.abs(d);
    if (abs_d >= 0.8) return "large";
    if (abs_d >= 0.5) return "medium";
    if (abs_d >= 0.2) return "small";
    return "negligible";
};

const OneSampleIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <TestTube size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">One-Sample T-Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Determine if the mean of a single sample is significantly different from a known or hypothesized value.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use a One-Sample T-Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is used to check if the average of a sample is statistically different from a population mean or a theoretical value. For example, you could test if the average IQ score of a group of students is different from the national average of 100.
                        </p>
                    </div>
                    <div className="flex justify-center">
                           {ttestExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ttestExample)}>
                                    <ttestExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{ttestExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{ttestExample.description}</p>
                                    </div>
                                </Card>
                            )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Select Variable:</strong> Choose the numeric variable whose mean you want to test.
                                </li>
                                <li>
                                    <strong>Set Test Value (μ₀):</strong> Enter the known or hypothesized population mean to compare your sample against.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will calculate the t-statistic and p-value to determine significance.
                                </li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>t-statistic:</strong> A larger absolute value indicates a greater difference between your sample mean and the test value.
                                </li>
                                <li>
                                    <strong>p-value:</strong> If less than 0.05, you can conclude that your sample mean is statistically significantly different from the test value.
                                </li>
                                <li>
                                    <strong>Cohen's d:</strong> Measures the size of the difference. A value around 0.2 is small, 0.5 is medium, and 0.8 is large.
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

const IndependentSamplesIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Users size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Independent Samples T-Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Compare the means of two independent groups to determine if there is a statistically significant difference between them.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use an Independent Samples T-Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is ideal for A/B testing or comparing outcomes between a control group and a treatment group. For instance, you could use it to see if a new website design (Group A) leads to more time on site than the old design (Group B).
                        </p>
                    </div>
                    <div className="flex justify-center">
                           {ttestExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ttestExample)}>
                                    <ttestExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{ttestExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{ttestExample.description}</p>
                                    </div>
                                </Card>
                            )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Group Variable:</strong> Select a categorical variable with exactly two groups (e.g., 'Group A', 'Group B').</li>
                                <li><strong>Value Variable:</strong> Choose the numeric variable you want to compare between the two groups.</li>
                                <li><strong>Run Analysis:</strong> The tool automatically performs Levene's test for variance equality and runs the appropriate t-test.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Levene's Test:</strong> If p > 0.05, the assumption of equal variances is met. If p &lt;= 0.05, the variances are unequal, and Welch's t-test (which doesn't assume equal variances) is used automatically.</li>
                                <li><strong>p-value:</strong> A value less than 0.05 indicates a significant difference in the means of the two groups.</li>
                                <li><strong>Cohen's d:</strong> This is the effect size. A larger value indicates a more substantial difference between the groups.</li>
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

const PairedSamplesIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Repeat size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Paired Samples T-Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Compare the means of two related groups to determine if there is a statistically significant difference between their means.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use a Paired Samples T-Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is used for "before-and-after" scenarios or matched-pairs designs. For example, you can use it to test if a training program had a significant effect on employee performance by comparing their scores before and after the training.
                        </p>
                    </div>
                     <div className="flex justify-center">
                           {ttestExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ttestExample)}>
                                    <ttestExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{ttestExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{ttestExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Variable 1:</strong> Select the numeric variable representing the first measurement (e.g., 'Pre-test Score').</li>
                                <li><strong>Variable 2:</strong> Select the numeric variable representing the second, related measurement (e.g., 'Post-test Score').</li>
                                <li><strong>Run Analysis:</strong> The tool calculates the difference for each pair and tests if the average difference is significantly different from zero.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>t-statistic:</strong> Indicates the size of the difference relative to the variation in the differences.</li>
                                <li><strong>p-value:</strong> If less than 0.05, there is a significant mean difference between the two paired measurements.</li>
                                <li><strong>Mean Difference & CI:</strong> Shows the average difference and the 95% confidence interval. If the CI does not contain zero, the result is significant.</li>
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


interface TTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string; 
}

export default function TTestPage({ data, numericHeaders, categoricalHeaders, onLoadExample, activeAnalysis }: TTestPageProps) {
    const { toast } = useToast();
    
    const initialTestType = useMemo(() => {
        if (activeAnalysis.includes('one-sample')) return 'one_sample';
        if (activeAnalysis.includes('independent')) return 'independent_samples';
        if (activeAnalysis.includes('paired')) return 'paired_samples';
        return 'one_sample';
    }, [activeAnalysis]);

    const [testType, setTestType] = useState(initialTestType);
    const [view, setView] = useState('main'); // Can be 'intro' or 'main'
    
    // States for different tests
    const [oneSampleVar, setOneSampleVar] = useState<string | undefined>(numericHeaders[0]);
    const [testValue, setTestValue] = useState<number>(0);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    const [independentVar, setIndependentVar] = useState<string | undefined>(numericHeaders[0]);
    const [groupVar, setGroupVar] = useState<string | undefined>(binaryCategoricalHeaders[0]);
    
    const [pairedVar1, setPairedVar1] = useState<string | undefined>(numericHeaders[0]);
    const [pairedVar2, setPairedVar2] = useState<string | undefined>(numericHeaders[1]);

    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    
     useEffect(() => {
        const newTestType = activeAnalysis.includes('one-sample') ? 'one_sample'
                          : activeAnalysis.includes('independent') ? 'independent_samples'
                          : 'paired_samples';
        setTestType(newTestType);
        setView('intro'); // Always go to intro when switching
        setAnalysisResult(null); // Clear previous results
    }, [activeAnalysis]);

    useEffect(() => {
        // Reset state when data changes
        setOneSampleVar(numericHeaders[0]);
        setIndependentVar(numericHeaders[0]);
        setGroupVar(binaryCategoricalHeaders[0]);
        setPairedVar1(numericHeaders[0]);
        setPairedVar2(numericHeaders[1]);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, binaryCategoricalHeaders]);


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        let params: any = {};
        let currentTestType = testType;

        switch(testType) {
            case 'one_sample':
                if (!oneSampleVar) {
                    toast({ variant: "destructive", title: "Please select a variable." });
                    return;
                }
                params = { variable: oneSampleVar, test_value: testValue };
                break;
            case 'independent_samples':
                if (!independentVar || !groupVar) {
                    toast({ variant: "destructive", title: "Please select a value and group variable." });
                    return;
                }
                 params = { variable: independentVar, group_variable: groupVar };
                break;
            case 'paired_samples':
                 if (!pairedVar1 || !pairedVar2 || pairedVar1 === pairedVar2) {
                    toast({ variant: "destructive", title: "Please select two different variables." });
                    return;
                }
                params = { variable1: pairedVar1, variable2: pairedVar2 };
                break;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/t-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: currentTestType, params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            setView('main'); // Go to main analysis view after running

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, testType, oneSampleVar, testValue, independentVar, groupVar, pairedVar1, pairedVar2, toast]);
    
    const renderSetupUI = () => {
        switch (testType) {
            case 'one_sample':
                 return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Variable</Label>
                            <Select value={oneSampleVar} onValueChange={setOneSampleVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Test Value (μ₀)</Label>
                            <Input type="number" value={testValue} onChange={e => setTestValue(Number(e.target.value))} />
                        </div>
                    </div>
                );
            case 'independent_samples':
                 if (binaryCategoricalHeaders.length === 0) {
                    return <p className="text-destructive-foreground bg-destructive p-3 rounded-md">This test requires a categorical variable with exactly two groups. None found.</p>
                }
                return (
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Group Variable</Label>
                             <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue placeholder="Select group..."/></SelectTrigger>
                                <SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Value Variable</Label>
                             <Select value={independentVar} onValueChange={setIndependentVar}>
                                <SelectTrigger><SelectValue placeholder="Select value..."/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'paired_samples':
                if (numericHeaders.length < 2) {
                    return <p className="text-destructive-foreground bg-destructive p-3 rounded-md">This test requires at least two numeric variables to compare.</p>
                }
                 return (
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Variable 1 (e.g. Pre-test)</Label>
                             <Select value={pairedVar1} onValueChange={setPairedVar1}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                           <Label>Variable 2 (e.g. Post-test)</Label>
                             <Select value={pairedVar2} onValueChange={setPairedVar2}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.filter(h => h !== pairedVar1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            default: return null;
        }
    }
    
    const renderResult = () => {
        if (!analysisResult) return null;
        const { results, plot } = analysisResult;
        
        if (!results) {
             return (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Analysis Incomplete</CardTitle>
                        <CardDescription>The analysis did not return any results.</CardDescription>
                    </CardHeader>
                </Card>
            );
        }

        const descriptives = results.descriptives;

        return (
            <div className="space-y-4">
                 {plot && (
                    <Card>
                        <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={plot} alt={`${results.test_type} plot`} width={1000} height={800} className="rounded-md border mx-auto" />
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Interpretation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant={results.significant ? 'default' : 'secondary'}>
                            {results.significant ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4" />}
                            <AlertTitle>{results.significant ? 'Statistically Significant' : 'Not Statistically Significant'}</AlertTitle>
                            <AlertDescription className="whitespace-pre-wrap">{results.interpretation}</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">{results.test_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Statistic</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>t-statistic</TableCell><TableCell className="text-right font-mono">{results.t_statistic?.toFixed(4)}</TableCell></TableRow>
                                    <TableRow><TableCell>p-value</TableCell><TableCell className="text-right font-mono">{results.p_value?.toFixed(4)}</TableCell></TableRow>
                                    <TableRow><TableCell>Degrees of Freedom</TableCell><TableCell className="text-right font-mono">{results.degrees_of_freedom?.toFixed(2)}</TableCell></TableRow>
                                    {results.cohens_d && <TableRow><TableCell>Cohen's d</TableCell><TableCell className="text-right font-mono">{results.cohens_d.toFixed(4)}</TableCell></TableRow>}
                                    {results.confidence_interval && <TableRow><TableCell>95% CI of Difference</TableCell><TableCell className="text-right font-mono">[{results.confidence_interval[0]?.toFixed(2)}, {results.confidence_interval[1]?.toFixed(2)}]</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    {descriptives && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Descriptive Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable/Group</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Std. Dev.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(descriptives).map(([key, value]: [string, any]) => (
                                            <TableRow key={key}>
                                                <TableCell>{key}</TableCell>
                                                <TableCell className="text-right font-mono">{value.n}</TableCell>
                                                <TableCell className="text-right font-mono">{value.mean?.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{value.std_dev?.toFixed(5)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {results.levene_test && (
                                    <div className="mt-4 text-sm flex items-center justify-between">
                                        <span>Homogeneity of Variances (Levene's Test):</span>
                                        <div className="flex items-center gap-2">
                                            {results.levene_test.assumption_met ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                            <span className="font-mono">p = {results.levene_test.p_value.toFixed(3)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        )
    };
    
    const IntroComponent = {
        'one_sample': OneSampleIntroPage,
        'independent_samples': IndependentSamplesIntroPage,
        'paired_samples': PairedSamplesIntroPage,
    }[testType];

    if (!canRun || view === 'intro') {
         return <IntroComponent onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">T-Test Analysis Setup</CardTitle>
                         <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select a test type and configure the variables for the analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderSetupUI()}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            {!isLoading && analysisResult && renderResult()}
            {!isLoading && !analysisResult && <div className="text-center text-muted-foreground py-10"><FlaskConical className="mx-auto h-12 w-12"/><p className="mt-2">Select variables, then click 'Run Analysis'.</p></div>}
        </div>
    );
}
