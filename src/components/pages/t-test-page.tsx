
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart, Settings, FileSearch, Users, Repeat, CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Input } from '../ui/input';

interface TTestResults {
    test_type: string;
    variable?: string;
    variable1?: string;
    variable2?: string;
    test_value?: number;
    n?: number;
    n1?: number;
    n2?: number;
    sample_mean?: number;
    mean_diff?: number;
    t_statistic: number;
    degrees_of_freedom: number;
    p_value: number;
    significant: boolean;
    cohens_d: number;
    confidence_interval?: [number, number];
    interpretation: string;
    levene_test?: {
        statistic: number;
        p_value: number;
        assumption_met: boolean;
    };
     descriptives?: {
        [key: string]: {
            n: number;
            mean: number;
            std_dev: number;
            se_mean?: number;
        }
    }
}

interface FullAnalysisResponse {
    results: TTestResults;
    plot: string;
}

const OneSampleIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                     <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Sigma size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">One-Sample T-Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Determine if the mean of a single sample is significantly different from a known or hypothesized population mean.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use a One-Sample T-Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is useful when you want to compare your sample's average against a benchmark, a standard value, or a previously established mean. For example, testing if the average IQ score of a group of students is different from the national average of 100.
                        </p>
                    </div>
                    {ttestExample && (
                        <div className="flex justify-center">
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ttestExample)}>
                                <FlaskConical className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ttestExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ttestExample.description}</p>
                                </div>
                            </Card>
                        </div>
                    )}
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
                            This is one of the most common statistical tests, used for A/B testing and comparing outcomes between a control group and a treatment group. For example, you could use it to determine if a new drug results in different blood pressure levels compared to a placebo.
                        </p>
                    </div>
                    {ttestExample && (
                        <div className="flex justify-center">
                           <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ttestExample)}>
                                <FlaskConical className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ttestExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ttestExample.description}</p>
                                </div>
                            </Card>
                        </div>
                    )}
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
                        Compare the means of two related groups to determine if there is a significant mean difference between them.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use a Paired Samples T-Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            This test is used for "within-subjects" or "repeated measures" designs, such as a pre-test/post-test experiment. By comparing measurements from the same subject, it controls for individual differences, making it a more powerful test than an independent samples t-test when applicable.
                        </p>
                    </div>
                    {ttestExample && (
                        <div className="flex justify-center">
                           <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ttestExample)}>
                                <FlaskConical className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ttestExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ttestExample.description}</p>
                                </div>
                            </Card>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const OneSampleSetup = ({ numericHeaders, oneSampleVar, setOneSampleVar, testValue, setTestValue, oneSampleAlternative, setOneSampleAlternative }: any) => {
    return (
        <div className="grid md:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="oneSampleVar">Variable</Label>
                <Select value={oneSampleVar} onValueChange={setOneSampleVar}>
                    <SelectTrigger id="oneSampleVar"><SelectValue placeholder="Select a numeric variable..." /></SelectTrigger>
                    <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="testValue">Test Value (μ₀)</Label>
                <Input id="testValue" type="number" value={testValue} onChange={e => setTestValue(e.target.value)} />
            </div>
            <div>
                <Label htmlFor="oneSampleAlternative">Alternative Hypothesis</Label>
                <Select value={oneSampleAlternative} onValueChange={setOneSampleAlternative}>
                    <SelectTrigger id="oneSampleAlternative"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="two-sided">Two-sided (≠)</SelectItem>
                        <SelectItem value="greater">Greater (&gt;)</SelectItem>
                        <SelectItem value="less">Less (&lt;)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

const IndependentSamplesSetup = ({ numericHeaders, categoricalHeaders, data, groupVar, setGroupVar, valueVar, setValueVar, independentSampleAlternative, setIndependentSampleAlternative }: any) => {
    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter((h: string) => new Set(data.map((row: any) => row[h]).filter((v: any) => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    if (binaryCategoricalHeaders.length === 0) {
        return <p className="text-destructive-foreground bg-destructive p-3 rounded-md">This test requires a categorical variable with exactly two groups. None found.</p>;
    }

    return (
        <div className="grid md:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="groupVar">Grouping Variable</Label>
                <Select value={groupVar} onValueChange={setGroupVar}>
                    <SelectTrigger id="groupVar"><SelectValue /></SelectTrigger>
                    <SelectContent>{binaryCategoricalHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="valueVar">Dependent Variable</Label>
                <Select value={valueVar} onValueChange={setValueVar}>
                    <SelectTrigger id="valueVar"><SelectValue /></SelectTrigger>
                    <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="independentSampleAlternative">Alternative Hypothesis</Label>
                <Select value={independentSampleAlternative} onValueChange={setIndependentSampleAlternative}>
                    <SelectTrigger id="independentSampleAlternative"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="two-sided">Two-sided (≠)</SelectItem>
                        <SelectItem value="greater">Greater (&gt;)</SelectItem>
                        <SelectItem value="less">Less (&lt;)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

const PairedSamplesSetup = ({ numericHeaders, pairedVar1, setPairedVar1, pairedVar2, setPairedVar2, pairedSampleAlternative, setPairedSampleAlternative }: any) => {
    const availablePairedVar2 = numericHeaders.filter((h: string) => h !== pairedVar1);
    return (
        <div className="grid md:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="pairedVar1">Variable 1 (e.g., Pre-test)</Label>
                <Select value={pairedVar1} onValueChange={setPairedVar1}>
                    <SelectTrigger id="pairedVar1"><SelectValue /></SelectTrigger>
                    <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="pairedVar2">Variable 2 (e.g., Post-test)</Label>
                <Select value={pairedVar2} onValueChange={setPairedVar2} disabled={!pairedVar1}>
                    <SelectTrigger id="pairedVar2"><SelectValue /></SelectTrigger>
                    <SelectContent>{availablePairedVar2.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="pairedSampleAlternative">Alternative Hypothesis</Label>
                <Select value={pairedSampleAlternative} onValueChange={setPairedSampleAlternative}>
                    <SelectTrigger id="pairedSampleAlternative"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="two-sided">Two-sided (≠)</SelectItem>
                        <SelectItem value="greater">Greater (&gt;)</SelectItem>
                        <SelectItem value="less">Less (&lt;)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
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
    const [activeTest, setActiveTest] = useState(activeAnalysis.replace('t-test-', ''));
    
    // One-Sample State
    const [oneSampleVar, setOneSampleVar] = useState(numericHeaders[0]);
    const [testValue, setTestValue] = useState('0');
    const [oneSampleAlternative, setOneSampleAlternative] = useState('two-sided');

    // Independent Samples State
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [valueVar, setValueVar] = useState<string | undefined>();
    const [independentSampleAlternative, setIndependentSampleAlternative] = useState('two-sided');

    // Paired Samples State
    const [pairedVar1, setPairedVar1] = useState(numericHeaders[0]);
    const [pairedVar2, setPairedVar2] = useState(numericHeaders[1]);
    const [pairedSampleAlternative, setPairedSampleAlternative] = useState('two-sided');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0;
    }, [data, numericHeaders]);

    useEffect(() => {
        setActiveTest(activeAnalysis.replace('t-test-', ''));
        setView(canRun ? 'main' : 'intro');
        setAnalysisResult(null);

        // Set defaults when data changes
        const binaryHeaders = categoricalHeaders.filter(h => new Set(data.map(row => row[h])).size === 2);
        setGroupVar(binaryHeaders[0]);
        setValueVar(numericHeaders[0]);
        setOneSampleVar(numericHeaders[0]);
        setPairedVar1(numericHeaders[0]);
        setPairedVar2(numericHeaders[1]);

    }, [data, activeAnalysis, numericHeaders, categoricalHeaders, canRun]);
    
    const handleAnalysis = useCallback(async () => {
        let params;
        let testType;

        switch (activeTest) {
            case 'one-sample':
                if (!oneSampleVar || testValue === '') {
                    toast({ variant: 'destructive', title: 'Please select a variable and enter a test value.' });
                    return;
                }
                params = { variable: oneSampleVar, test_value: parseFloat(testValue), alternative: oneSampleAlternative };
                testType = 'one_sample';
                break;
            case 'independent-samples':
                if (!groupVar || !valueVar) {
                    toast({ variant: 'destructive', title: 'Please select group and value variables.' });
                    return;
                }
                params = { variable: valueVar, group_variable: groupVar, alternative: independentSampleAlternative };
                testType = 'independent_samples';
                break;
            case 'paired-samples':
                 if (!pairedVar1 || !pairedVar2 || pairedVar1 === pairedVar2) {
                    toast({ variant: 'destructive', title: 'Please select two different variables.' });
                    return;
                }
                params = { variable1: pairedVar1, variable2: pairedVar2, alternative: pairedSampleAlternative };
                testType = 'paired_samples';
                break;
            default:
                toast({ variant: 'destructive', title: 'Invalid test type selected.' });
                return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/t-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType, params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [activeTest, data, oneSampleVar, testValue, oneSampleAlternative, groupVar, valueVar, independentSampleAlternative, pairedVar1, pairedVar2, pairedSampleAlternative, toast]);

    const introPages: { [key: string]: React.FC<any> } = {
        'one-sample': OneSampleIntroPage,
        'independent-samples': IndependentSamplesIntroPage,
        'paired-samples': PairedSamplesIntroPage,
    };
    const IntroComponent = introPages[activeTest];

    if (!canRun || view === 'intro') {
        return <IntroComponent onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">{activeTest.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} T-Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {activeTest === 'one-sample' && <OneSampleSetup {...{ numericHeaders, oneSampleVar, setOneSampleVar, testValue, setTestValue, oneSampleAlternative, setOneSampleAlternative }} />}
                    {activeTest === 'independent-samples' && <IndependentSamplesSetup {...{ numericHeaders, categoricalHeaders, data, groupVar, setGroupVar, valueVar, setValueVar, independentSampleAlternative, setIndependentSampleAlternative }} />}
                    {activeTest === 'paired-samples' && <PairedSamplesSetup {...{ numericHeaders, pairedVar1, setPairedVar1, pairedVar2, setPairedVar2, pairedSampleAlternative, setPairedSampleAlternative }} />}
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Analysis Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={results.significant ? 'default' : 'secondary'}>
                                {results.significant ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                <AlertTitle>{results.significant ? 'Statistically Significant Result' : 'Not Statistically Significant'}</AlertTitle>
                                <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />') }} />
                            </Alert>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Diagnostic Plots</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Image src={analysisResult.plot} alt="T-Test Plots" width={1200} height={1000} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>T-Test Statistics</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableBody>
                                        <TableRow><TableCell>t-statistic</TableCell><TableCell className="text-right font-mono">{results.t_statistic.toFixed(3)}</TableCell></TableRow>
                                        <TableRow><TableCell>Degrees of Freedom</TableCell><TableCell className="text-right font-mono">{results.degrees_of_freedom.toFixed(2)}</TableCell></TableRow>
                                        <TableRow><TableCell>p-value</TableCell><TableCell className="text-right font-mono">{results.p_value < 0.001 ? '&lt; 0.001' : results.p_value.toFixed(4)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Effect Size &amp; Confidence Interval</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableBody>
                                        <TableRow><TableCell>Cohen's d</TableCell><TableCell className="text-right font-mono">{results.cohens_d.toFixed(3)}</TableCell></TableRow>
                                        {results.mean_diff !== undefined && <TableRow><TableCell>Mean Difference</TableCell><TableCell className="text-right font-mono">{results.mean_diff.toFixed(3)}</TableCell></TableRow>}
                                        {results.confidence_interval && <TableRow><TableCell>95% CI of Difference</TableCell><TableCell className="text-right font-mono">[{results.confidence_interval[0].toFixed(3)}, {results.confidence_interval[1].toFixed(3)}]</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
