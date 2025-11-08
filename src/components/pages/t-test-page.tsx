
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart, Settings, FileSearch, Users, Repeat, CheckCircle, XCircle, AlertTriangle, HelpCircle, Info, Lightbulb, TrendingUp, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
                        Determine if the mean of a single sample is statistically different from a known or hypothesized population mean.
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
                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variable:</strong> Choose the single numeric variable you want to test.</li>
                                <li><strong>Enter Test Mean:</strong> Input the known or hypothesized mean you want to compare your sample against.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform the t-test and provide all relevant statistics and visualizations.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>t-statistic &amp; p-value:</strong> The core of the test. A p-value less than 0.05 indicates a statistically significant difference between your sample mean and the test mean.
                                </li>
                                <li>
                                    <strong>Cohen's d:</strong> Measures the size of the effect. A larger 'd' indicates a more substantial difference.
                                </li>
                                 <li>
                                    <strong>Confidence Interval:</strong> If this interval does not contain your test mean, it confirms a significant result.
                                </li>
                                <li>
                                    <strong>Distribution Plot:</strong> Visually compare your sample's distribution against the test mean.
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

// 추천사항 컴포넌트
const TTestRecommendations = ({ activeTest, oneSampleVar, testValue, groupVar, valueVar, pairedVar1, pairedVar2, dataLength }: any) => {
    const recommendations = useMemo(() => {
        const items = [];
        
        if (activeTest === 'one-sample') {
            if (!oneSampleVar) {
                items.push({ type: 'warning', title: 'No Variable Selected', message: 'Please select a numeric variable to test.' });
            } else {
                items.push({ type: 'success', title: 'Variable Selected', message: `Testing variable: ${oneSampleVar}` });
            }
            if (testValue === '' || isNaN(parseFloat(testValue))) {
                items.push({ type: 'warning', title: 'Invalid Test Value', message: 'Please enter a valid numeric test value (μ₀).' });
            } else {
                items.push({ type: 'success', title: 'Test Value Set', message: `Hypothesized population mean: ${testValue}` });
            }
        } else if (activeTest === 'independent-samples') {
            if (!groupVar || !valueVar) {
                items.push({ type: 'warning', title: 'Incomplete Selection', message: 'Please select both grouping and dependent variables.' });
            } else {
                items.push({ type: 'success', title: 'Variables Selected', message: `Comparing ${valueVar} across ${groupVar} groups.` });
            }
        } else if (activeTest === 'paired-samples') {
            if (!pairedVar1 || !pairedVar2) {
                items.push({ type: 'warning', title: 'Incomplete Selection', message: 'Please select both variables for paired comparison.' });
            } else if (pairedVar1 === pairedVar2) {
                items.push({ type: 'warning', title: 'Same Variable Selected', message: 'Please select two different variables.' });
            } else {
                items.push({ type: 'success', title: 'Variables Selected', message: `Comparing ${pairedVar1} vs ${pairedVar2} (paired).` });
            }
        }

        // 샘플 크기 체크
        if (dataLength < 10) {
            items.push({ type: 'warning', title: 'Very Small Sample', message: `With only ${dataLength} observations, t-test results may not be reliable.` });
        } else if (dataLength < 30) {
            items.push({ type: 'info', title: 'Small Sample Size', message: `${dataLength} observations. Check normality assumption.` });
        } else {
            items.push({ type: 'success', title: 'Adequate Sample Size', message: `${dataLength} observations provide good reliability.` });
        }

        // 방법론 정보
        if (activeTest === 'one-sample') {
            items.push({ type: 'info', title: 'One-Sample T-Test', message: 'Tests if sample mean differs from hypothesized population mean (μ₀). Assumes approximate normality.' });
        } else if (activeTest === 'independent-samples') {
            items.push({ type: 'info', title: 'Independent Samples T-Test', message: 'Compares means of two independent groups. Assumes equal variances (Levene test will check this).' });
        } else if (activeTest === 'paired-samples') {
            items.push({ type: 'info', title: 'Paired Samples T-Test', message: 'Compares means of two related groups (e.g., pre/post). Controls for individual differences.' });
        }

        // 일반 권장사항
        items.push({ type: 'tip', title: 'Interpreting Results', message: 'If p-value < 0.05, the result is statistically significant. Check Cohen\'s d for effect size magnitude.' });

        return items;
    }, [activeTest, oneSampleVar, testValue, groupVar, valueVar, pairedVar1, pairedVar2, dataLength]);

    if (recommendations.length === 0) return null;

    return (
        <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Recommendations & Warnings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {recommendations.map((rec, idx) => {
                    const bgColor = rec.type === 'success' ? 'bg-green-50 border-green-200' :
                                   rec.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                                   rec.type === 'error' ? 'bg-red-50 border-red-200' :
                                   rec.type === 'tip' ? 'bg-blue-50 border-blue-200' :
                                   'bg-muted/50 border-border';
                    const Icon = rec.type === 'success' ? CheckCircle :
                                rec.type === 'warning' ? AlertTriangle :
                                rec.type === 'error' ? AlertTriangle :
                                rec.type === 'tip' ? Lightbulb :
                                Info;
                    const iconColor = rec.type === 'success' ? 'text-green-600' :
                                     rec.type === 'warning' ? 'text-amber-600' :
                                     rec.type === 'error' ? 'text-red-600' :
                                     rec.type === 'tip' ? 'text-blue-600' :
                                     'text-muted-foreground';
                    return (
                        <div key={idx} className={`p-3 rounded-lg border ${bgColor}`}>
                            <div className="flex items-start gap-2">
                                <Icon className={`h-4 w-4 ${iconColor} mt-0.5`} />
                                <div>
                                    <div className="font-semibold text-sm">{rec.title}</div>
                                    <div className="text-xs text-muted-foreground">{rec.message}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

const OneSampleSetup = ({ numericHeaders, oneSampleVar, setOneSampleVar, testValue, setTestValue, oneSampleAlternative, setOneSampleAlternative }: any) => {
    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="oneSampleVar">Variable</Label>
                    <Select value={oneSampleVar} onValueChange={setOneSampleVar}>
                        <SelectTrigger id="oneSampleVar"><SelectValue placeholder="Select a numeric variable..." /></SelectTrigger>
                        <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="testValue">Test Value (μ₀)</Label>
                    <Input id="testValue" type="number" value={testValue} onChange={e => setTestValue(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
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
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="groupVar">Grouping Variable</Label>
                    <Select value={groupVar} onValueChange={setGroupVar}>
                        <SelectTrigger id="groupVar"><SelectValue /></SelectTrigger>
                        <SelectContent>{binaryCategoricalHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="valueVar">Dependent Variable</Label>
                    <Select value={valueVar} onValueChange={setValueVar}>
                        <SelectTrigger id="valueVar"><SelectValue /></SelectTrigger>
                        <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
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
        </div>
    );
};

const PairedSamplesSetup = ({ numericHeaders, pairedVar1, setPairedVar1, pairedVar2, setPairedVar2, pairedSampleAlternative, setPairedSampleAlternative }: any) => {
    const availablePairedVar2 = numericHeaders.filter((h: string) => h !== pairedVar1);
    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="pairedVar1">Variable 1 (e.g., Pre-test)</Label>
                    <Select value={pairedVar1} onValueChange={setPairedVar1}>
                        <SelectTrigger id="pairedVar1"><SelectValue /></SelectTrigger>
                        <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="pairedVar2">Variable 2 (e.g., Post-test)</Label>
                    <Select value={pairedVar2} onValueChange={setPairedVar2} disabled={!pairedVar1}>
                        <SelectTrigger id="pairedVar2"><SelectValue /></SelectTrigger>
                        <SelectContent>{availablePairedVar2.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
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
            toast({ title: 'T-Test Complete', description: 'Results are ready.' });

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
    const significant = results?.significant;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">{activeTest.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} T-Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activeTest === 'one-sample' && <OneSampleSetup {...{ numericHeaders, oneSampleVar, setOneSampleVar, testValue, setTestValue, oneSampleAlternative, setOneSampleAlternative }} />}
                    {activeTest === 'independent-samples' && <IndependentSamplesSetup {...{ numericHeaders, categoricalHeaders, data, groupVar, setGroupVar, valueVar, setValueVar, independentSampleAlternative, setIndependentSampleAlternative }} />}
                    {activeTest === 'paired-samples' && <PairedSamplesSetup {...{ numericHeaders, pairedVar1, setPairedVar1, pairedVar2, setPairedVar2, pairedSampleAlternative, setPairedSampleAlternative }} />}
                    
                    {/* 추천사항 컴포넌트 */}
                    <TTestRecommendations 
                        activeTest={activeTest}
                        oneSampleVar={oneSampleVar}
                        testValue={testValue}
                        groupVar={groupVar}
                        valueVar={valueVar}
                        pairedVar1={pairedVar1}
                        pairedVar2={pairedVar2}
                        dataLength={data.length}
                    />
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2 h-4 w-4"/>Run</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && <Skeleton className="h-96 w-full"/>}

            {analysisResult && results && (
                <div className="space-y-6">
                     {/* Performance Metrics - 4개 그리드 카드 */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className={significant ? "bg-amber-50 dark:bg-amber-950 border-amber-500/30" : "bg-green-50 dark:bg-green-950 border-green-500/30"}>
                            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Result</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    {significant ? <CheckCircle className="h-5 w-5 text-amber-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                                    <div className="text-2xl font-bold">{significant ? 'Significant' : 'Not Significant'}</div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {significant ? 'Means differ significantly' : 'No significant difference'}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">P-Value</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono">{results.p_value < 0.001 ? '< 0.001' : results.p_value.toFixed(4)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {results.p_value < 0.05 ? 'p < 0.05 (significant)' : 'p ≥ 0.05 (not significant)'}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">T-Statistic</CardTitle>
                                <BarChart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono">{results.t_statistic.toFixed(3)}</div>
                                <p className="text-xs text-muted-foreground">
                                    df = {results.degrees_of_freedom.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cohen's d</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono">{results.cohens_d.toFixed(3)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {Math.abs(results.cohens_d) < 0.2 ? 'Small effect' : 
                                     Math.abs(results.cohens_d) < 0.5 ? 'Medium effect' : 'Large effect'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Interpretation과 Visual을 좌우로 배치 */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="font-headline text-base">Interpretation</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Alert variant='default' className={significant ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : 'border-green-500 bg-green-50 dark:bg-green-950'}>
                                        <div className="flex items-start gap-2">
                                            {significant ? <CheckCircle className="h-5 w-5 text-amber-600 mt-0.5" /> : <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                                            <div className="flex-1">
                                                <AlertTitle className="text-base font-semibold mb-2">
                                                    {significant ? 'Statistically Significant' : 'Not Statistically Significant'}
                                                </AlertTitle>
                                                <AlertDescription className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />') }} />
                                            </div>
                                        </div>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="font-headline">Visual Summary</CardTitle>
                                    <CardDescription>
                                        Diagnostic plots for the t-test analysis.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plot} alt="T-Test Plots" width={1000} height={800} className="w-full rounded-lg border"/>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
