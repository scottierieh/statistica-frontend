

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

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
        setTestType(initialTestType);
        setOneSampleVar(numericHeaders[0]);
        setIndependentVar(numericHeaders[0]);
        setGroupVar(binaryCategoricalHeaders[0]);
        setPairedVar1(numericHeaders[0]);
        setPairedVar2(numericHeaders[1]);
        setAnalysisResult(null);
    }, [initialTestType, data, numericHeaders, binaryCategoricalHeaders]);

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
                 params = { variable: independentVar, group_variable: groupVar, equal_var: true };
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
        const { results } = analysisResult;
        const plot = analysisResult.plot;
        
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
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">{results.test_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} t-Test Results</CardTitle>
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
                                <TableRow><TableCell>Degrees of Freedom</TableCell><TableCell className="text-right font-mono">{results.degrees_of_freedom}</TableCell></TableRow>
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
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">N</TableHead>
                                        <TableHead className="text-right">Mean</TableHead>
                                        <TableHead className="text-right">Std. Deviation</TableHead>
                                        <TableHead className="text-right">Std. Error Mean</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(descriptives).map(([key, value]: [string, any]) => (
                                        <TableRow key={key}>
                                            <TableCell>{key}</TableCell>
                                            <TableCell className="text-right font-mono">{value.n}</TableCell>
                                            <TableCell className="text-right font-mono">{value.mean?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{value.std_dev?.toFixed(5)}</TableCell>
                                            <TableCell className="text-right font-mono">{value.se_mean?.toFixed(5) || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        )
    };

    if (!canRun) {
        const testExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('t-test'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">T-Test</CardTitle>
                        <CardDescription>
                           To perform a t-test, you need data with numeric variables.
                        </CardDescription>
                    </CardHeader>
                    {testExamples.length > 0 && (
                        <CardContent>
                           <Button onClick={() => onLoadExample(testExamples[0])} className="w-full" size="sm">
                                <Sigma className="mr-2 h-4 w-4" />
                                Load T-Test Suite Data
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">T-Test Analysis</CardTitle>
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
