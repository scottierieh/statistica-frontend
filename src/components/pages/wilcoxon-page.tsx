
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

interface WilcoxonPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function WilcoxonPage({ data, numericHeaders, onLoadExample }: WilcoxonPageProps) {
    const { toast } = useToast();
    const [var1, setVar1] = useState(numericHeaders[0]);
    const [var2, setVar2] = useState(numericHeaders[1]);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setVar1(numericHeaders[0]);
        setVar2(numericHeaders[1]);
        setAnalysisResult(null);
    }, [numericHeaders, data]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!var1 || !var2 || var1 === var2) {
            toast({ variant: "destructive", title: "Please select two different variables." });
            return;
        }
        const params = { var1, var2 };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'wilcoxon', params })
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
    }, [data, var1, var2, toast]);
    
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
        const testExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('wilcoxon'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Wilcoxon Signed-Rank Test</CardTitle>
                        <CardDescription>
                           Compares two related samples. To perform this test, upload data with at least two numeric variables representing paired measurements.
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
                    <CardTitle className="font-headline">Wilcoxon Signed-Rank Test Setup</CardTitle>
                    <CardDescription>Choose two numeric variables to compare.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><Label>Variable 1 (e.g., Pre-test)</Label><Select value={var1} onValueChange={setVar1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Variable 2 (e.g., Post-test)</Label><Select value={var2} onValueChange={setVar2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h => h !== var1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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

