
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

interface KruskalWallisPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function KruskalWallisPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: KruskalWallisPageProps) {
    const { toast } = useToast();
    const [groupCol, setGroupCol] = useState(categoricalHeaders.find(h => data.map(d => d[h]).filter(g => g != null).length >= 3) || categoricalHeaders[0]);
    const [valueCol, setValueCol] = useState(numericHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setGroupCol(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size >= 3) || categoricalHeaders[0]);
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
    }, [numericHeaders, categoricalHeaders, data]);
    
    const multiGroupCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size >= 3);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && multiGroupCategoricalHeaders.length > 0, [data, numericHeaders, multiGroupCategoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!groupCol || !valueCol) {
            toast({ variant: "destructive", title: "Please select group and value columns." });
            return;
        }
        const groups = Array.from(new Set(data.map(d => d[groupCol]))).filter(g => g != null);
        if (groups.length < 3) {
            toast({ variant: "destructive", title: `Kruskal-Wallis requires at least 3 groups, but found ${groups.length} in '${groupCol}'.` });
            return;
        }
        const params = { group_col: groupCol, value_col: valueCol };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'kruskal_wallis', params })
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
                            <dt>Statistic (H)</dt><dd className="font-mono text-right">{results.statistic.toFixed(3)}</dd>
                            <dt>P-value</dt><dd className="font-mono text-right">{results.p_value.toFixed(4)}</dd>
                            <dt>Degrees of Freedom</dt><dd className="font-mono text-right">{results.df}</dd>
                            <dt>Effect Size (ε²)</dt><dd className="font-mono text-right">{results.effect_size.toFixed(3)}</dd>
                        </dl>
                    </CardContent>
                </Card>
            </div>
        )
    };

    if (!canRun) {
        const testExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('kruskal-wallis'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Kruskal-Wallis Test</CardTitle>
                        <CardDescription>
                           Compares three or more independent groups. To perform this test, upload data with a numeric variable and a categorical variable with at least three groups.
                        </CardDescription>
                    </CardHeader>
                    {testExamples.length > 0 && (
                        <CardContent>
                            {/* Example datasets can be shown here */}
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
                    <CardTitle className="font-headline">Kruskal-Wallis Test Setup</CardTitle>
                    <CardDescription>Choose a group variable with 3+ categories and a numeric value variable.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><Label>Group Variable</Label><Select value={groupCol} onValueChange={setGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{multiGroupCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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

