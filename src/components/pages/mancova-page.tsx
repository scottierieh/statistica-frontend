
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface TestStatistic {
    Value: number;
    'F Value': number;
    'Num DF': number;
    'Den DF': number;
    'p-value': number;
}

interface UnivariateResult {
    F: number;
    'p-value': number;
    df: number;
    df_resid: number;
    eta_sq_partial: number;
}

interface PostHocResult {
    group1: string;
    group2: string;
    meandiff: number;
    p_adj: number;
    lower: number;
    upper: number;
    reject: boolean;
}

interface MancovaResults {
    multivariate_tests: { [key: string]: TestStatistic };
    univariate_tests: { [key: string]: UnivariateResult };
    posthoc_tests?: { [key: string]: PostHocResult[] };
    interpretation: string;
}

interface FullAnalysisResponse {
    results: MancovaResults;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

interface MancovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MancovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: MancovaPageProps) {
    const { toast } = useToast();
    const [dependentVars, setDependentVars] = useState<string[]>(numericHeaders.slice(0, 2));
    const [factorVar, setFactorVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [covariateVars, setCovariateVars] = useState<string[]>([numericHeaders[2]].filter(Boolean));
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setDependentVars(numericHeaders.slice(0, 2));
        setFactorVar(categoricalHeaders[0] || '');
        setCovariateVars([numericHeaders[2]].filter(Boolean));
        setAnalysisResult(null);
    }, [data, numericHeaders, categoricalHeaders]);

    const handleVarChange = (header: string, checked: boolean, type: 'dependent' | 'covariate') => {
        const setVars = type === 'dependent' ? setDependentVars : setCovariateVars;
        setVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length >= 3 && categoricalHeaders.length >= 1;
    }, [data, numericHeaders, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (dependentVars.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two dependent variables.' });
            return;
        }
        if (!factorVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a factor variable.' });
            return;
        }
        if (covariateVars.length < 1) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one covariate.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/mancova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    dependentVars,
                    factorVar,
                    covariateVars
                })
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
            toast({ variant: 'destructive', title: 'MANCOVA Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVars, factorVar, covariateVars, toast]);

    const availableNumeric = useMemo(() => {
        const selected = new Set([...dependentVars, ...covariateVars, factorVar]);
        return numericHeaders.filter(h => !selected.has(h));
    }, [numericHeaders, dependentVars, covariateVars, factorVar]);

    if (!canRun) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">MANCOVA</CardTitle>
                        <CardDescription>
                           To perform MANCOVA, you need at least 2 numeric dependent variables, 1 categorical factor, and 1 numeric covariate.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }
    
    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">MANCOVA Setup</CardTitle>
                    <CardDescription>Select dependent variables, a factor, and covariates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-3 gap-4">
                        <div>
                             <label className="text-sm font-medium mb-1 block">Dependent Variables</label>
                             <ScrollArea className="h-32 border rounded-md p-2">
                                {numericHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`dv-${h}`} checked={dependentVars.includes(h)} onCheckedChange={(c) => handleVarChange(h, c as boolean, 'dependent')} />
                                        <label htmlFor={`dv-${h}`}>{h}</label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Covariate(s)</label>
                             <ScrollArea className="h-32 border rounded-md p-2">
                                {numericHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`cv-${h}`} checked={covariateVars.includes(h)} onCheckedChange={(c) => handleVarChange(h, c as boolean, 'covariate')} />
                                        <label htmlFor={`cv-${h}`}>{h}</label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Factor</label>
                            <Select value={factorVar} onValueChange={setFactorVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                     </div>
                      <div className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={isLoading || dependentVars.length < 2 || !factorVar || covariateVars.length < 1}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                      </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTitle>Summary of Findings</AlertTitle>
                                <AlertDescription className="whitespace-pre-wrap">{results.interpretation}</AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Multivariate Tests</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Value</TableHead><TableHead>F-value</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.multivariate_tests).map(([name, stats]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name}</TableCell>
                                            <TableCell className="font-mono">{stats.Value.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono">{stats['F Value'].toFixed(4)}</TableCell>
                                            <TableCell className="font-mono">{stats['p-value'].toFixed(4)} {getSignificanceStars(stats['p-value'])}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Univariate ANCOVA Follow-up Tests</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Dependent Variable</TableHead><TableHead>F-value</TableHead><TableHead>p-value</TableHead><TableHead>Partial η²</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.univariate_tests).map(([dv, res]) => (
                                        <TableRow key={dv}>
                                            <TableCell>{dv}</TableCell>
                                            <TableCell className="font-mono">{res.F.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono">{res['p-value'].toFixed(4)} {getSignificanceStars(res['p-value'])}</TableCell>
                                            <TableCell className="font-mono">{res.eta_sq_partial.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {results.posthoc_tests && Object.keys(results.posthoc_tests).length > 0 && (
                        <Card>
                            <CardHeader><CardTitle>Post-Hoc Pairwise Comparisons (Tukey HSD)</CardTitle></CardHeader>
                            <CardContent>
                                {Object.entries(results.posthoc_tests).map(([dv, tests]) => (
                                    <div key={dv} className="mb-4">
                                        <h4 className="font-semibold">{dv}</h4>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Group 1</TableHead><TableHead>Group 2</TableHead><TableHead>Mean Difference</TableHead><TableHead>p-adj</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {tests.map((t, i) =>(
                                                    <TableRow key={i}>
                                                        <TableCell>{t.group1}</TableCell>
                                                        <TableCell>{t.group2}</TableCell>
                                                        <TableCell className="font-mono">{t.meandiff.toFixed(3)}</TableCell>
                                                        <TableCell className="font-mono">{t.p_adj.toFixed(4)} {getSignificanceStars(t.p_adj)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
