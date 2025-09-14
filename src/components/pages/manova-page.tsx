
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import Image from 'next/image';

interface TestStatistic {
    statistic: number;
    F: number;
    df1: number;
    df2: number;
    p_value: number;
}

interface UnivariateResult {
    f_statistic: number;
    p_value: number;
    eta_squared: number;
    significant: boolean;
}

interface PostHocResult {
    group1: string;
    group2: string;
    mean_diff: number;
    p_corrected: number;
    significant_corrected: boolean;
}

interface ManovaResults {
    factor: string;
    groups: string[];
    test_statistics: {
        pillai: TestStatistic;
        wilks: TestStatistic;
        hotelling: TestStatistic;
        roy: TestStatistic;
    };
    effect_size: number;
    significant: boolean;
    univariate_results: { [key: string]: UnivariateResult };
    posthoc_results?: { [key: string]: PostHocResult[] };
}

interface FullManovaResponse {
    results: ManovaResults;
    plot: string;
}

const getSignificanceStars = (p: number) => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};


interface ManovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ManovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: ManovaPageProps) {
    const { toast } = useToast();
    const [dependentVars, setDependentVars] = useState<string[]>(numericHeaders.slice(0, 2));
    const [factorVar, setFactorVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<FullManovaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setDependentVars(numericHeaders.slice(0, 2));
        setFactorVar(categoricalHeaders[0] || '');
        setAnalysisResult(null);
    }, [data, numericHeaders, categoricalHeaders]);

    const handleDepVarChange = (header: string, checked: boolean) => {
        setDependentVars(prev => 
            checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1;
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

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/manova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data,
                    dependentVars: dependentVars,
                    factorVars: [factorVar]
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullManovaResponse = await response.json();
            if (result.results.significant === undefined) throw new Error("Incomplete results from server.");
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'MANOVA Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVars, factorVar, toast]);

    if (!canRun) {
        const manovaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('manova'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">MANOVA</CardTitle>
                        <CardDescription>
                           To perform MANOVA, you need data with at least 2 numeric dependent variables and 1 categorical factor. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {manovaExamples.map(ex => (
                             <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                        <Users className="h-6 w-6 text-secondary-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                        <CardDescription className="text-xs">{ex.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent><Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">Load this data</Button></CardContent>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">MANOVA Setup</CardTitle>
                    <CardDescription>Select dependent variables (numeric) and a factor (categorical).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                             <label className="text-sm font-medium mb-1 block">Dependent Variables</label>
                             <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {numericHeaders.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`dv-${h}`} checked={dependentVars.includes(h)} onCheckedChange={(c) => handleDepVarChange(h, c as boolean)} />
                                            <label htmlFor={`dv-${h}`}>{h}</label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Factor Variable</label>
                            <Select value={factorVar} onValueChange={setFactorVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                     </div>
                      <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={isLoading || dependentVars.length < 2 || !factorVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">MANOVA Summary</CardTitle>
                            <CardDescription>Overall test for differences between groups across all dependent variables.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant={results.significant ? 'default' : 'secondary'}>
                                {results.significant ? 'Statistically Significant' : 'Not Statistically Significant'}
                            </Badge>
                             <p className="text-sm text-muted-foreground mt-2">There is a {results.significant ? 'significant' : 'non-significant'} difference among the levels of <strong>{results.factor}</strong> on the combined dependent variables.</p>
                        </CardContent>
                    </Card>

                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.plot} alt="MANOVA Plots" width={1500} height={1200} className="w-full rounded-md border"/></CardContent>
                        </Card>
                    )}
                    
                    <Card>
                        <CardHeader><CardTitle>Multivariate Tests</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Statistic</TableHead><TableHead>F-value</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.test_statistics).map(([name, stats]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name.charAt(0).toUpperCase() + name.slice(1)}</TableCell>
                                            <TableCell className="font-mono">{stats.statistic.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono">{stats.F.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono">{stats.p_value.toFixed(4)} {getSignificanceStars(stats.p_value)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Univariate Follow-up Tests (ANOVA)</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Dependent Variable</TableHead><TableHead>F-value</TableHead><TableHead>p-value</TableHead><TableHead>Eta-Squared (η²)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.univariate_results).map(([dv, res]) => (
                                        <TableRow key={dv}>
                                            <TableCell>{dv}</TableCell>
                                            <TableCell className="font-mono">{res.f_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono">{res.p_value.toFixed(4)} {getSignificanceStars(res.p_value)}</TableCell>
                                            <TableCell className="font-mono">{res.eta_squared.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {results.posthoc_results && (
                        <Card>
                            <CardHeader><CardTitle>Post-Hoc Pairwise Comparisons</CardTitle></CardHeader>
                            <CardContent>
                                {Object.entries(results.posthoc_results).map(([dv, tests]) => (
                                    <div key={dv} className="mb-4">
                                        <h4 className="font-semibold">{dv}</h4>
                                        <Table>
                                             <TableHeader><TableRow><TableHead>Comparison</TableHead><TableHead>Mean Difference</TableHead><TableHead>Corrected p-value</TableHead></TableRow></TableHeader>
                                             <TableBody>
                                                {tests.map((t, i) =>(
                                                    <TableRow key={i}>
                                                        <TableCell>{t.group1} vs {t.group2}</TableCell>
                                                        <TableCell className="font-mono">{t.mean_diff.toFixed(3)}</TableCell>
                                                        <TableCell className="font-mono">{t.p_corrected.toFixed(4)} {getSignificanceStars(t.p_corrected)}</TableCell>
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
