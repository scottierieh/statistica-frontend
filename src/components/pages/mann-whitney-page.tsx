
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

interface MannWhitneyPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MannWhitneyPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: MannWhitneyPageProps) {
    const { toast } = useToast();
    const [groupCol, setGroupCol] = useState(categoricalHeaders.find(h => data.map(d => d[h]).filter(g => g != null).length === 2) || categoricalHeaders[0]);
    const [valueCol, setValueCol] = useState(numericHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setGroupCol(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size === 2) || categoricalHeaders[0]);
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
    }, [numericHeaders, categoricalHeaders, data]);

    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && binaryCategoricalHeaders.length > 0, [data, numericHeaders, binaryCategoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!groupCol || !valueCol) {
            toast({ variant: "destructive", title: "Please select group and value columns." });
            return;
        }
        const groups = Array.from(new Set(data.map(d => d[groupCol]))).filter(g => g != null);
        if (groups.length !== 2) {
            toast({ variant: "destructive", title: `Mann-Whitney U test requires exactly 2 groups, but found ${groups.length} in '${groupCol}'.` });
            return;
        }
        const params = { group_col: groupCol, value_col: valueCol, groups };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'mann_whitney', params })
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
    }, [data, groupCol, valueCol, toast]);

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
                        <CardTitle className="font-headline">{results.test_type} Results</CardTitle>
                        <CardDescription>
                            {results.interpretation.decision} (p={results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(3)})
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>{results.interpretation.conclusion}. The effect size was {results.effect_size_interpretation.text.toLowerCase()}.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Statistics</CardTitle></CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                            <dt>Statistic</dt><dd className="font-mono text-right">{results.statistic.toFixed(3)}</dd>
                            <dt>P-value</dt><dd className="font-mono text-right">{results.p_value.toFixed(4)}</dd>
                            <dt>Effect Size</dt><dd className="font-mono text-right">{results.effect_size.toFixed(3)}</dd>
                        </dl>
                    </CardContent>
                </Card>
            </div>
        )
    };

    if (!canRun) {
        const testExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('mann-whitney'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Mann-Whitney U Test</CardTitle>
                        <CardDescription>
                           Compares two independent groups. To perform this test, please upload data with a numeric variable and a categorical variable with exactly two groups.
                        </CardDescription>
                    </CardHeader>
                    {testExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {testExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <ex.icon className="h-6 w-6 text-secondary-foreground" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                                <CardDescription className="text-xs">{ex.description}</CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardFooter>
                                            <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                                Load this data
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
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
                    <CardTitle className="font-headline">Mann-Whitney U Test Setup</CardTitle>
                    <CardDescription>Choose a group variable with two categories and a numeric value variable.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><Label>Group Variable</Label><Select value={groupCol} onValueChange={setGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Value Variable</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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
            {!isLoading && !analysisResult && <div className="text-center text-muted-foreground py-10"><FlaskConical className="mx-auto h-12 w-12"/><p className="mt-2">Select variables, then click 'Run Analysis'.</p></div>}
        </div>
    );
}
