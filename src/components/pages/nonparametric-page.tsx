

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type TestType = 'mann_whitney' | 'wilcoxon' | 'kruskal_wallis' | 'friedman' | 'mcnemar';

interface NonParametricPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string;
}

export default function NonParametricPage({ data, numericHeaders, categoricalHeaders, onLoadExample, activeAnalysis }: NonParametricPageProps) {
    const { toast } = useToast();
    
    const activeTest: TestType = useMemo(() => {
        const test = activeAnalysis;
        if (test === 'mann-whitney') return 'mann_whitney';
        if (test === 'wilcoxon') return 'wilcoxon';
        if (test === 'kruskal-wallis') return 'kruskal_wallis';
        if (test === 'friedman') return 'friedman';
        if (test === 'mcnemar') return 'mcnemar';
        return 'mann_whitney';
    }, [activeAnalysis]);
    
    // State for each test
    const [mwGroupCol, setMwGroupCol] = useState(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size === 2) || categoricalHeaders[0]);
    const [mwValueCol, setMwValueCol] = useState(numericHeaders[0]);
    
    const [wxVar1, setWxVar1] = useState(numericHeaders[0]);
    const [wxVar2, setWxVar2] = useState(numericHeaders[1]);
    
    const [kwGroupCol, setKwGroupCol] = useState(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size >= 3) || categoricalHeaders[0]);
    const [kwValueCol, setKwValueCol] = useState(numericHeaders[0]);
    
    const [friedmanVars, setFriedmanVars] = useState<string[]>(numericHeaders.slice(0, 3));
    
    const [mcNemarVar1, setMcNemarVar1] = useState<string | undefined>();
    const [mcNemarVar2, setMcNemarVar2] = useState<string | undefined>();

    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    useEffect(() => {
        setMwGroupCol(binaryCategoricalHeaders[0]);
        setMwValueCol(numericHeaders[0]);
        setWxVar1(numericHeaders[0]);
        setWxVar2(numericHeaders[1]);
        setKwGroupCol(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size >= 3) || categoricalHeaders[0]);
        setKwValueCol(numericHeaders[0]);
        setFriedmanVars(numericHeaders.slice(0,3));
        setMcNemarVar1(binaryCategoricalHeaders.find(h => h.includes('pre')) || binaryCategoricalHeaders[0]);
        setMcNemarVar2(binaryCategoricalHeaders.find(h => h.includes('post')) || binaryCategoricalHeaders[1]);
        setAnalysisResult(null);
    }, [numericHeaders, categoricalHeaders, data, binaryCategoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        let params: any = {};
        let testType: TestType = activeTest;

        switch(activeTest) {
            case 'mann_whitney':
                if (!mwGroupCol || !mwValueCol) { toast({ variant: "destructive", title: "Please select group and value columns." }); return; }
                const groups = Array.from(new Set(data.map(d => d[mwGroupCol]))).filter(g => g != null);
                if (groups.length !== 2) { toast({ variant: "destructive", title: `Mann-Whitney U test requires exactly 2 groups, but found ${groups.length} in '${mwGroupCol}'.` }); return; }
                params = { group_col: mwGroupCol, value_col: mwValueCol, groups };
                testType = 'mann_whitney';
                break;
            case 'wilcoxon':
                if (!wxVar1 || !wxVar2 || wxVar1 === wxVar2) { toast({ variant: "destructive", title: "Please select two different variables for Wilcoxon test." }); return; }
                params = { var1: wxVar1, var2: wxVar2 };
                testType = 'wilcoxon';
                break;
            case 'kruskal_wallis':
                 if (!kwGroupCol || !kwValueCol) { toast({ variant: "destructive", title: "Please select group and value columns." }); return; }
                const kwGroups = Array.from(new Set(data.map(d => d[kwGroupCol]))).filter(g => g != null);
                if (kwGroups.length < 3) { toast({ variant: "destructive", title: `Kruskal-Wallis requires at least 3 groups, but found ${kwGroups.length} in '${kwGroupCol}'.` }); return; }
                params = { group_col: kwGroupCol, value_col: kwValueCol };
                testType = 'kruskal_wallis';
                break;
            case 'friedman':
                if (friedmanVars.length < 3) { toast({ variant: "destructive", title: "Please select at least 3 variables for Friedman test." }); return; }
                params = { variables: friedmanVars };
                testType = 'friedman';
                break;
            case 'mcnemar':
                if (!mcNemarVar1 || !mcNemarVar2 || mcNemarVar1 === mcNemarVar2) { toast({ variant: "destructive", title: "Please select two different binary categorical variables for McNemar's test." }); return; }
                params = { var1: mcNemarVar1, var2: mcNemarVar2 };
                testType = 'mcnemar';
                break;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType, params })
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

    }, [activeTest, data, mwGroupCol, mwValueCol, wxVar1, wxVar2, kwGroupCol, kwValueCol, friedmanVars, mcNemarVar1, mcNemarVar2, toast]);
    
    const renderMcNemarResult = () => {
        if (!analysisResult || activeTest !== 'mcnemar') return null;
        const { results } = analysisResult;
        const { contingency_table } = results;
        const labels = Object.keys(contingency_table);

        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{mcNemarVar1} \ {mcNemarVar2}</TableHead>
                        {labels.map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {labels.map(rowLabel => (
                        <TableRow key={rowLabel}>
                            <TableHead>{rowLabel}</TableHead>
                            {labels.map(colLabel => (
                                <TableCell key={colLabel} className="text-right font-mono">{contingency_table[colLabel]?.[rowLabel] || 0}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

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
                        <p>{results.interpretation.conclusion}.</p>
                        {results.effect_size && <p>The effect size was {results.effect_size_interpretation.text.toLowerCase()}.</p>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Statistics</CardTitle></CardHeader>
                    <CardContent>
                        {activeTest === 'mcnemar' ? renderMcNemarResult() : (
                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                <dt>Statistic</dt><dd className="font-mono text-right">{results.statistic.toFixed(3)}</dd>
                                <dt>P-value</dt><dd className="font-mono text-right">{results.p_value.toFixed(4)}</dd>
                                {results.df && <><dt>Degrees of Freedom</dt><dd className="font-mono text-right">{results.df}</dd></>}
                                {results.effect_size && <><dt>Effect Size</dt><dd className="font-mono text-right">{results.effect_size.toFixed(3)}</dd></>}
                            </dl>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    };
    
    if (!canRun) {
        const testExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('nonparametric'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Non-Parametric Tests</CardTitle>
                        <CardDescription>
                           To perform non-parametric tests, please upload data or try one of our example datasets.
                        </CardDescription>
                    </CardHeader>
                    {testExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {testExamples.map((ex) => {
                                    const Icon = ex.icon;
                                    return (
                                        <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                            <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                    <Icon className="h-6 w-6 text-secondary-foreground" />
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
                                    );
                                })}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const renderSetup = () => {
      switch(activeTest) {
        case 'mann_whitney':
          return (
             <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Compares two independent groups.</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Group Variable</Label><Select value={mwGroupCol} onValueChange={setMwGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Value Variable</Label><Select value={mwValueCol} onValueChange={setMwValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </div>
          );
        case 'wilcoxon':
          return (
             <div className="space-y-4">
                 <p className="text-sm text-muted-foreground">Compares two related (paired) samples.</p>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Variable 1 (e.g., Pre-test)</Label><Select value={wxVar1} onValueChange={setWxVar1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Variable 2 (e.g., Post-test)</Label><Select value={wxVar2} onValueChange={setWxVar2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=> h!==wxVar1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </div>
          );
        case 'kruskal_wallis':
          return (
             <div className="space-y-4">
                 <p className="text-sm text-muted-foreground">Compares three or more independent groups.</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Group Variable</Label><Select value={kwGroupCol} onValueChange={setKwGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Value Variable</Label><Select value={kwValueCol} onValueChange={setKwValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </div>
          );
        case 'friedman':
          return (
             <div className="space-y-4">
                 <p className="text-sm text-muted-foreground">Compares three or more related (repeated measures) samples.</p>
                <div><Label>Select 3+ Variables</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-16">
                        {numericHeaders.map(h=><Badge key={h} variant={friedmanVars.includes(h) ? "default" : "secondary"} onClick={() => setFriedmanVars(p=>p.includes(h)?p.filter(v=>v!==h):[...p,h])} className="cursor-pointer">{h}</Badge>)}
                    </div>
                 </div>
            </div>
          );
        case 'mcnemar':
          return (
             <div className="space-y-4">
                 <p className="text-sm text-muted-foreground">Tests for changes in proportions for paired nominal data.</p>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Variable 1 (e.g., Before)</Label><Select value={mcNemarVar1} onValueChange={setMcNemarVar1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Variable 2 (e.g., After)</Label><Select value={mcNemarVar2} onValueChange={setMcNemarVar2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{binaryCategoricalHeaders.filter(h => h !== mcNemarVar1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </div>
            </div>
          );
        default: return null;
      }
    }
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{activeTest.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Test</CardTitle>
                </CardHeader>
                <CardContent>
                    {renderSetup()}
                </CardContent>
                <CardFooter className="flex justify-end mt-4">
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
