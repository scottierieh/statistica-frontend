'use client';

import { useState, useMemo, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TestType = 'mann_whitney' | 'wilcoxon' | 'kruskal_wallis' | 'friedman';

interface NonParametricPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NonParametricPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: NonParametricPageProps) {
    const { toast } = useToast();
    const [activeTest, setActiveTest] = useState<TestType>('mann_whitney');
    
    // State for each test
    const [mwGroupCol, setMwGroupCol] = useState(categoricalHeaders[0]);
    const [mwValueCol, setMwValueCol] = useState(numericHeaders[0]);
    const [wxVar1, setWxVar1] = useState(numericHeaders[0]);
    const [wxVar2, setWxVar2] = useState(numericHeaders[1]);
    const [kwGroupCol, setKwGroupCol] = useState(categoricalHeaders[0]);
    const [kwValueCol, setKwValueCol] = useState(numericHeaders[0]);
    const [friedmanVars, setFriedmanVars] = useState(numericHeaders.slice(0,3));

    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        let params;
        switch(activeTest) {
            case 'mann_whitney':
                if (!mwGroupCol || !mwValueCol) {
                    toast({ variant: "destructive", title: "Please select group and value columns." });
                    return;
                }
                const groups = Array.from(new Set(data.map(d => d[mwGroupCol]))).filter(g => g != null);
                if (groups.length !== 2) {
                    toast({ variant: "destructive", title: `Mann-Whitney requires exactly 2 groups, but found ${groups.length} in '${mwGroupCol}'.` });
                    return;
                }
                params = { group_col: mwGroupCol, value_col: mwValueCol, groups };
                break;
            case 'wilcoxon':
                if (!wxVar1 || !wxVar2 || wxVar1 === wxVar2) {
                    toast({ variant: "destructive", title: "Please select two different variables for Wilcoxon test." });
                    return;
                }
                params = { var1: wxVar1, var2: wxVar2 };
                break;
            case 'kruskal_wallis':
                 if (!kwGroupCol || !kwValueCol) {
                    toast({ variant: "destructive", title: "Please select group and value columns." });
                    return;
                }
                const kwGroups = Array.from(new Set(data.map(d => d[kwGroupCol]))).filter(g => g != null);
                if (kwGroups.length < 3) {
                    toast({ variant: "destructive", title: `Kruskal-Wallis requires at least 3 groups, but found ${kwGroups.length} in '${kwGroupCol}'.` });
                    return;
                }
                params = { group_col: kwGroupCol, value_col: kwValueCol };
                break;
            case 'friedman':
                if (friedmanVars.length < 3) {
                    toast({ variant: "destructive", title: "Please select at least 3 variables for Friedman test." });
                    return;
                }
                params = { variables: friedmanVars };
                break;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: activeTest, params })
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

    }, [activeTest, data, mwGroupCol, mwValueCol, wxVar1, wxVar2, kwGroupCol, kwValueCol, friedmanVars, toast]);

    const renderResult = () => {
        if (!analysisResult) return null;
        const { results, plot } = analysisResult;
        return (
            <div className="space-y-4">
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
                <div className="grid md:grid-cols-2 gap-4">
                     <Card>
                        <CardHeader><CardTitle>Statistics</CardTitle></CardHeader>
                        <CardContent>
                             <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <dt>Statistic</dt><dd className="font-mono text-right">{results.statistic.toFixed(3)}</dd>
                                <dt>P-value</dt><dd className="font-mono text-right">{results.p_value.toFixed(4)}</dd>
                                {results.df && <><dt>Degrees of Freedom</dt><dd className="font-mono text-right">{results.df}</dd></>}
                                <dt>Effect Size</dt><dd className="font-mono text-right">{results.effect_size.toFixed(3)}</dd>
                            </dl>
                        </CardContent>
                    </Card>
                    {plot && (
                         <Card>
                            <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={plot} alt={`${results.test_type} plot`} width={600} height={400} className="rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        )
    };
    
    if (!canRun) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Non-Parametric Tests</CardTitle>
                        <CardDescription>Upload data with numeric variables to run non-parametric tests.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Non-Parametric Test Setup</CardTitle>
                    <CardDescription>Choose a test and select the appropriate variables.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Tabs value={activeTest} onValueChange={(v) => {setActiveTest(v as TestType); setAnalysisResult(null);}} className="w-full">
                        <TabsList>
                            <TabsTrigger value="mann_whitney">Mann-Whitney U</TabsTrigger>
                            <TabsTrigger value="wilcoxon">Wilcoxon</TabsTrigger>
                            <TabsTrigger value="kruskal_wallis">Kruskal-Wallis</TabsTrigger>
                            <TabsTrigger value="friedman">Friedman</TabsTrigger>
                        </TabsList>
                        <TabsContent value="mann_whitney" className="pt-4">
                            <p className="text-sm text-muted-foreground mb-2">Compares two independent groups.</p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div><label>Group Variable</label><Select value={mwGroupCol} onValueChange={setMwGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div><label>Value Variable</label><Select value={mwValueCol} onValueChange={setMwValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                        </TabsContent>
                         <TabsContent value="wilcoxon" className="pt-4">
                             <p className="text-sm text-muted-foreground mb-2">Compares two related (paired) samples.</p>
                             <div className="grid md:grid-cols-2 gap-4">
                                <div><label>Variable 1 (e.g., Pre-test)</label><Select value={wxVar1} onValueChange={setWxVar1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div><label>Variable 2 (e.g., Post-test)</label><Select value={wxVar2} onValueChange={setWxVar2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=> h!==wxVar1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                        </TabsContent>
                        <TabsContent value="kruskal_wallis" className="pt-4">
                             <p className="text-sm text-muted-foreground mb-2">Compares three or more independent groups.</p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div><label>Group Variable</label><Select value={kwGroupCol} onValueChange={setKwGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div><label>Value Variable</label><Select value={kwValueCol} onValueChange={setKwValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                        </TabsContent>
                        <TabsContent value="friedman" className="pt-4">
                             <p className="text-sm text-muted-foreground mb-2">Compares three or more related (repeated measures) samples.</p>
                            <div><label>Select 3+ Variables</label>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-16">
                                    {numericHeaders.map(h=><Badge key={h} variant={friedmanVars.includes(h) ? "default" : "secondary"} onClick={() => setFriedmanVars(p=>p.includes(h)?p.filter(v=>v!==h):[...p,h])} className="cursor-pointer">{h}</Badge>)}
                                </div>
                             </div>
                        </TabsContent>
                    </Tabs>
                    <div className="flex justify-end mt-4">
                        <Button onClick={handleAnalysis} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            {!isLoading && analysisResult && renderResult()}
            {!isLoading && !analysisResult && <div className="text-center text-muted-foreground py-10"><FlaskConical className="mx-auto h-12 w-12"/><p className="mt-2">Select a test and variables, then click 'Run Analysis'.</p></div>}
        </div>
    );
}

    