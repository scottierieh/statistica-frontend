
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

interface TTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TTestPage({ data, numericHeaders, onLoadExample }: TTestPageProps) {
    const { toast } = useToast();
    const [variable, setVariable] = useState<string | undefined>(numericHeaders[0]);
    const [testValue, setTestValue] = useState<number>(0);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setVariable(numericHeaders[0]);
        setAnalysisResult(null);
    }, [numericHeaders, data]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!variable) {
            toast({ variant: "destructive", title: "Please select a variable." });
            return;
        }
        const params = { variable, test_value: testValue };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/t-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'one_sample', params })
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
    }, [data, variable, testValue, toast]);
    
    const renderResult = () => {
        if (!analysisResult) return null;
        const { results, plot } = analysisResult;
        return (
            <div className="space-y-4">
                 {plot && (
                    <Card>
                        <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={plot} alt={`${results.test_type} plot`} width={800} height={400} className="rounded-md border mx-auto" />
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">One-Sample t-Test Results</CardTitle>
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
                                <TableRow><TableCell>t-statistic</TableCell><TableCell className="text-right font-mono">{results.t_statistic.toFixed(4)}</TableCell></TableRow>
                                <TableRow><TableCell>p-value</TableCell><TableCell className="text-right font-mono">{results.p_value.toFixed(4)}</TableCell></TableRow>
                                <TableRow><TableCell>Degrees of Freedom</TableCell><TableCell className="text-right font-mono">{results.degrees_of_freedom}</TableCell></TableRow>
                                <TableRow><TableCell>Cohen's d</TableCell><TableCell className="text-right font-mono">{results.cohens_d.toFixed(4)}</TableCell></TableRow>
                                <TableRow><TableCell>95% CI</TableCell><TableCell className="text-right font-mono">[{results.confidence_interval[0].toFixed(2)}, {results.confidence_interval[1].toFixed(2)}]</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Descriptive Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">N</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Std. Dev.</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {Object.entries(results.descriptives).map(([key, value]: [string, any]) => (
                                    <TableRow key={key}>
                                        <TableCell>{key}</TableCell>
                                        <TableCell className="text-right font-mono">{value.n}</TableCell>
                                        <TableCell className="text-right font-mono">{value.mean.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{value.std_dev.toFixed(3)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
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
                    <CardTitle className="font-headline">One-Sample T-Test</CardTitle>
                    <CardDescription>Test if the mean of a single variable is different from a specified value.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Variable</Label>
                            <Select value={variable} onValueChange={setVariable}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Test Value (μ₀)</Label>
                            <Input type="number" value={testValue} onChange={e => setTestValue(Number(e.target.value))} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            {!isLoading && analysisResult && renderResult()}
            {!isLoading && !analysisResult && <div className="text-center text-muted-foreground py-10"><FlaskConical className="mx-auto h-12 w-12"/><p className="mt-2">Select a variable and set a test value, then click 'Run Analysis'.</p></div>}
        </div>
    );
}

