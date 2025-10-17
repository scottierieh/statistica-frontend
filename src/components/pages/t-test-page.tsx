'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats'; // 가정
import { type ExampleDataSet } from '@/lib/example-datasets'; // 가정
import { exampleDatasets } from '@/lib/example-datasets'; // 가정
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart, Settings, FileSearch, Users, Repeat, CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast'; // 가정
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Input } from '../ui/input';

// --- Type Definitions ---
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

// --- Helper Components (Intros) ---

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

// --- Setup Components ---

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
    const variableOptions = numericHeaders.filter((h: string) => h !== pairedVar1 && h !== pairedVar2);
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
                <Select value={pairedVar2} onValueChange={setPairedVar2}>
                    <SelectTrigger id="pairedVar2"><SelectValue /></SelectTrigger>
                    <SelectContent>{variableOptions.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
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

// --- New Descriptive Statistics Table Component ---
const DescriptiveStatisticsTable = ({ descriptives, testType }: { descriptives: TTestResults['descriptives'], testType: TTestResults['test_type'] }) => {
    if (!descriptives) return null;

    const rows = Object.entries(descriptives).map(([key, value]) => ({
        ...value,
        label: key,
    }));
    
    // One-sample test의 경우 se_mean을 추가로 표시
    const showSE = testType === 'one_sample';
    
    return (
        <div className="space-y-3">
            <h3 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2 text-gray-700">
                <FileSearch className="w-6 h-6 text-primary" />
                Descriptive Statistics
            </h3>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead>{testType === 'one_sample' ? 'Variable' : (testType === 'paired_samples' ? 'Variable / Difference' : 'Group')}</TableHead>
                        <TableHead className="text-right">N</TableHead>
                        <TableHead className="text-right">Mean</TableHead>
                        <TableHead className="text-right">Std. Dev.</TableHead>
                        {showSE && <TableHead className="text-right">SE Mean</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.label}>
                            <TableCell className="font-medium text-gray-900">{row.label}</TableCell>
                            <TableCell className="text-right">{row.n}</TableCell>
                            <TableCell className="text-right font-mono">{row.mean?.toFixed(3)}</TableCell>
                            <TableCell className="text-right font-mono">{row.std_dev?.toFixed(3)}</TableCell>
                            {showSE && <TableCell className="text-right font-mono">{row.se_mean?.toFixed(3) || 'N/A'}</TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

// --- T-Test Results Component (Refined) ---
const TTestAnalysisResult = ({ analysisResult }: { analysisResult: FullAnalysisResponse }) => {
    const results = analysisResult.results;

    const getTestTitle = () => {
        switch (results.test_type) {
            case 'one_sample': return `One-Sample T-Test for ${results.variable}`;
            case 'independent_samples': return `Independent Samples T-Test for ${results.variable}`;
            case 'paired_samples': return `Paired Samples T-Test for ${results.variable1} vs ${results.variable2}`;
            default: return 'T-Test Analysis Results';
        }
    }

    const LeveneResult = results.levene_test ? (
        <Alert variant={results.levene_test.assumption_met ? "default" : "destructive"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Variance Equality (Levene's Test)</AlertTitle>
            <AlertDescription>
                Statistic: **{results.levene_test.statistic.toFixed(3)}**, p-value: **{results.levene_test.p_value.toFixed(3)}**. <br/>
                {results.levene_test.assumption_met 
                    ? `Variances are assumed to be equal (p > 0.05). Standard t-test used.` 
                    : `Variances are NOT assumed equal (p < 0.05). Welch's t-test used.`
                }
            </AlertDescription>
        </Alert>
    ) : null;
    
    const CI_text = results.confidence_interval ? 
        `[${results.confidence_interval[0]?.toFixed(3)}, ${results.confidence_interval[1]?.toFixed(3)}]` : 'N/A';

    return (
        <Card className="w-full shadow-2xl">
            <CardHeader className="bg-primary/5 rounded-t-lg p-6">
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                    <BarChart className="w-8 h-8 text-primary" /> {getTestTitle()}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-10 p-8">
                
                {/* 1. DESCRIPTIVE STATISTICS TABLE (ADDED) */}
                <DescriptiveStatisticsTable 
                    descriptives={results.descriptives} 
                    testType={results.test_type}
                />
                
                {/* 2. HYPOTHESIS TESTING SUMMARY */}
                <div className="space-y-3">
                    <h3 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2 text-gray-700">
                        <FlaskConical className="w-6 h-6 text-primary" />
                        Hypothesis Test Results
                    </h3>
                    {LeveneResult}
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Test Statistic</TableHead>
                                <TableHead className="text-right">t</TableHead>
                                <TableHead className="text-right">df</TableHead>
                                <TableHead className="text-right">p-value</TableHead>
                                <TableHead className="text-right">Cohen's d</TableHead>
                                <TableHead className="text-right">95% CI {results.test_type === 'one_sample' ? 'for Mean' : (results.test_type === 'paired_samples' ? 'for Mean Diff' : '')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">T-Test</TableCell>
                                <TableCell className="text-right font-mono">{results.t_statistic.toFixed(3)}</TableCell>
                                <TableCell className="text-right font-mono">{results.degrees_of_freedom.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">{results.p_value < 0.001 ? '< 0.001' : results.p_value.toFixed(3)}</TableCell>
                                <TableCell className="text-right font-mono">{results.cohens_d.toFixed(3)}</TableCell>
                                <TableCell className="text-right font-mono">{CI_text}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <Alert variant={results.significant ? "success" : "warning"}>
                        {results.significant ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <AlertTitle>Decision ({results.p_value.toFixed(3)} vs $\alpha$ = 0.05)</AlertTitle>
                        <AlertDescription>
                            The result is **{results.significant ? 'statistically significant' : 'not statistically significant'}**. We {results.significant ? 'reject' : 'fail to reject'} the null hypothesis.
                        </AlertDescription>
                    </Alert>
                </div>

                {/* 3. INTERPRETATION */}
                <div className="space-y-3">
                    <h3 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2 text-gray-700">
                        <HelpCircle className="w-6 h-6 text-primary" />
                        Interpretation (APA Style)
                    </h3>
                    <Card className="bg-muted/30 p-4 whitespace-pre-wrap text-sm border-l-4 border-primary">
                        {results.interpretation}
                    </Card>
                </div>

                {/* 4. PLOTS */}
                <div className="space-y-3">
                    <h3 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2 text-gray-700">
                        <BarChart className="w-6 h-6 text-primary" />
                        Diagnostic Plots
                    </h3>
                    <div className="border rounded-lg p-2 bg-white">
                        <img src={analysisResult.plot} alt="T-Test Diagnostic Plots" className="w-full h-auto" />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};

// --- Main T-Test Analysis Component (Refined) ---
const TTestAnalysisComponent = ({ data, numericHeaders, categoricalHeaders }: { data: DataSet[], numericHeaders: string[], categoricalHeaders: string[] }) => {
    const { toast } = useToast();
    const [analysisType, setAnalysisType] = useState<'one_sample' | 'independent_samples' | 'paired_samples'>('one_sample');
    const [step, setStep] = useState<'intro' | 'setup' | 'results'>('intro');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

    // One-Sample State
    const [oneSampleVar, setOneSampleVar] = useState<string>('');
    const [testValue, setTestValue] = useState<string>('0');
    const [oneSampleAlternative, setOneSampleAlternative] = useState<'two-sided' | 'greater' | 'less'>('two-sided');

    // Independent Samples State
    const [groupVar, setGroupVar] = useState<string>('');
    const [valueVar, setValueVar] = useState<string>('');
    const [independentSampleAlternative, setIndependentSampleAlternative] = useState<'two-sided' | 'greater' | 'less'>('two-sided');
    
    // Paired Samples State
    const [pairedVar1, setPairedVar1] = useState<string>('');
    const [pairedVar2, setPairedVar2] = useState<string>('');
    const [pairedSampleAlternative, setPairedSampleAlternative] = useState<'two-sided' | 'greater' | 'less'>('two-sided');

    // Default selection logic
    useEffect(() => {
        if (numericHeaders.length > 0) {
            if (analysisType === 'one_sample' && !oneSampleVar) setOneSampleVar(numericHeaders[0]);
            if (analysisType === 'paired_samples') {
                if (!pairedVar1 && numericHeaders.length >= 2) {
                    setPairedVar1(numericHeaders[0]);
                    setPairedVar2(numericHeaders[1]);
                } else if (!pairedVar1) {
                    setPairedVar1(numericHeaders[0] || '');
                }
            }
        }
        if (analysisType === 'independent_samples' && categoricalHeaders.length > 0) {
            const binaryHeaders = categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
            if (!groupVar && binaryHeaders.length > 0) setGroupVar(binaryHeaders[0]);
            if (!valueVar && numericHeaders.length > 0) setValueVar(numericHeaders[0]);
        }
    }, [numericHeaders, categoricalHeaders, data, analysisType, oneSampleVar, groupVar, valueVar, pairedVar1, pairedVar2]);

    const handleRunAnalysis = useCallback(async () => {
        setError(null);
        setAnalysisResult(null);
        if (!data || data.length === 0) {
            setError('No data available to run the analysis.');
            return;
        }

        let params: any = {};
        let valid = true;

        if (analysisType === 'one_sample') {
            if (!oneSampleVar || isNaN(parseFloat(testValue))) { valid = false; }
            params = { variable: oneSampleVar, test_value: parseFloat(testValue), alternative: oneSampleAlternative };
        } else if (analysisType === 'independent_samples') {
            if (!valueVar || !groupVar) { valid = false; }
            params = { variable: valueVar, group_variable: groupVar, alternative: independentSampleAlternative };
        } else if (analysisType === 'paired_samples') {
            if (!pairedVar1 || !pairedVar2 || pairedVar1 === pairedVar2) { valid = false; }
            params = { variable1: pairedVar1, variable2: pairedVar2, alternative: pairedSampleAlternative };
        }

        if (!valid) {
            setError('Please select all required variables and input a valid test value.');
            return;
        }

        const payload = { testType: analysisType, data: data, params };

        setIsLoading(true);
        try {
            // Replace with actual API call to your Python backend
            // For demonstration, this is a placeholder function call
            const response = await fetch('/api/run-t-test', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            const result: FullAnalysisResponse | { error: string } = await response.json();

            if ('error' in result) {
                throw new Error(result.error);
            }
            
            setAnalysisResult(result);
            setStep('results');
            toast({ title: "Analysis Complete", description: "The T-Test analysis finished successfully.", duration: 3000 });
        } catch (e) {
            const message = e instanceof Error ? e.message : "An unknown error occurred during analysis.";
            setError(message);
            toast({ title: "Analysis Failed", description: message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [analysisType, data, oneSampleVar, testValue, oneSampleAlternative, valueVar, groupVar, independentSampleAlternative, pairedVar1, pairedVar2, pairedSampleAlternative, toast]);

    const isRunDisabled = useMemo(() => {
        if (analysisType === 'one_sample') {
            return !oneSampleVar || isNaN(parseFloat(testValue));
        } else if (analysisType === 'independent_samples') {
            return !valueVar || !groupVar;
        } else if (analysisType === 'paired_samples') {
            return !pairedVar1 || !pairedVar2 || pairedVar1 === pairedVar2;
        }
        return true;
    }, [analysisType, oneSampleVar, testValue, valueVar, groupVar, pairedVar1, pairedVar2]);

    const handleLoadExample = (example: ExampleDataSet) => {
        // Implement logic to load example data into the state
        // This is a placeholder for actual data loading logic
        toast({ title: "Example Loaded", description: `Loaded example data: ${example.name}. Start Setup.`, duration: 3000 });
        setStep('setup');
    };


    const renderSetup = () => {
        if (numericHeaders.length === 0) {
            return <Alert variant="destructive"><AlertTitle>Data Error</AlertTitle><AlertDescription>No numeric data columns found for T-test analysis.</AlertDescription></Alert>;
        }

        switch (analysisType) {
            case 'one_sample':
                return <OneSampleSetup 
                    numericHeaders={numericHeaders} 
                    oneSampleVar={oneSampleVar} setOneSampleVar={setOneSampleVar} 
                    testValue={testValue} setTestValue={setTestValue} 
                    oneSampleAlternative={oneSampleAlternative} setOneSampleAlternative={setOneSampleAlternative}
                />;
            case 'independent_samples':
                return <IndependentSamplesSetup 
                    numericHeaders={numericHeaders} categoricalHeaders={categoricalHeaders} data={data} 
                    groupVar={groupVar} setGroupVar={setGroupVar} 
                    valueVar={valueVar} setValueVar={setValueVar} 
                    independentSampleAlternative={independentSampleAlternative} setIndependentSampleAlternative={setIndependentSampleAlternative}
                />;
            case 'paired_samples':
                return <PairedSamplesSetup 
                    numericHeaders={numericHeaders} 
                    pairedVar1={pairedVar1} setPairedVar1={setPairedVar1} 
                    pairedVar2={pairedVar2} setPairedVar2={setPairedVar2} 
                    pairedSampleAlternative={pairedSampleAlternative} setPairedSampleAlternative={setPairedSampleAlternative}
                />;
            default:
                return null;
        }
    };

    if (step === 'results' && analysisResult) {
        return (
            <div className="p-4 flex flex-col gap-4">
                <Button onClick={() => setStep('setup')} variant="outline" className="w-fit">
                    <MoveRight className="rotate-180 w-4 h-4 mr-2"/> Back to Setup
                </Button>
                <TTestAnalysisResult analysisResult={analysisResult} />
            </div>
        );
    }
    
    if (step === 'intro') {
        const IntroComponent = analysisType === 'one_sample' ? OneSampleIntroPage : 
                             analysisType === 'independent_samples' ? IndependentSamplesIntroPage : 
                             PairedSamplesIntroPage;
        return <IntroComponent onStart={() => setStep('setup')} onLoadExample={handleLoadExample} />;
    }

    return (
        <Card className="w-full max-w-5xl mx-auto shadow-xl">
            <CardHeader className="bg-primary/10 rounded-t-lg p-6">
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                    <Settings className="w-7 h-7 text-primary" /> T-Test Configuration
                </CardTitle>
                <CardDescription>
                    Select the type of T-Test and configure the variables from your dataset.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
                <div className="space-y-2">
                    <Label htmlFor="analysisType">Select Test Type</Label>
                    <Select value={analysisType} onValueChange={(value: any) => {
                        setAnalysisType(value);
                        setStep('intro'); // Go back to intro for new type explanation
                    }}>
                        <SelectTrigger id="analysisType" className="w-full md:w-[300px]">
                            <SelectValue placeholder="Select T-Test type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="one_sample"><Sigma className="w-4 h-4 mr-2"/> One-Sample T-Test</SelectItem>
                            <SelectItem value="independent_samples"><Users className="w-4 h-4 mr-2"/> Independent Samples T-Test</SelectItem>
                            <SelectItem value="paired_samples"><Repeat className="w-4 h-4 mr-2"/> Paired Samples T-Test</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <h3 className="text-xl font-semibold border-b pb-2 pt-4">Variable Selection</h3>
                {renderSetup()}

                {error && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

            </CardContent>
            <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                <Button onClick={() => setStep('intro')} variant="secondary">
                    <MoveRight className="rotate-180 w-4 h-4 mr-2"/> Change Test Type
                </Button>
                <Button onClick={handleRunAnalysis} disabled={isRunDisabled || isLoading} size="lg">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running Analysis...
                        </>
                    ) : (
                        <>
                            Run Analysis <BarChart className="ml-2 w-5 h-5"/>
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
};




