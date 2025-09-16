'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface HomogeneityTestResult {
    levene_test: {
        statistic: number;
        p_value: number;
    };
    descriptives: {
        [group: string]: {
            n: number;
            mean: number;
            variance: number;
            std_dev: number;
        };
    };
    assumption_met: boolean;
    interpretation: string;
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: HomogeneityTestResult;
}

interface HomogeneityTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function HomogeneityTestPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: HomogeneityTestPageProps) {
    const { toast } = useToast();
    const [valueVar, setValueVar] = useState<string | undefined>(numericHeaders[0]);
    const [groupVar, setGroupVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setValueVar(numericHeaders[0]);
        setGroupVar(categoricalHeaders[0]);
        setAnalysisResult(null);
    }, [data, numericHeaders, categoricalHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!valueVar || !groupVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a value and a group variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/homogeneity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, valueVar, groupVar })
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
                } catch (e) {
                    throw new Error(`Server returned non-JSON error: ${errorText}`);
                }
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Homogeneity Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, valueVar, groupVar, toast]);

    if (!canRun) {
        const homogeneityExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('homogeneity'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Homogeneity of Variances Test</CardTitle>
                        <CardDescription>
                           To perform this test, you need data with at least one numeric variable and one categorical variable with two or more groups.
                        </CardDescription>
                    </CardHeader>
                    {homogeneityExamples.length > 0 && (
                         <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {homogeneityExamples.map((ex) => (
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
    
    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Homogeneity of Variances Test (Levene's Test)</CardTitle>
                    <CardDescription>Select a numeric variable and a categorical grouping variable to test if the variances are equal across groups.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Value Variable</Label>
                            <Select value={valueVar} onValueChange={setValueVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label>Grouping Variable</Label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !valueVar || !groupVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Test</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Levene's Test Results</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Alert variant={results.assumption_met ? 'default' : 'destructive'}>
                                  {results.assumption_met ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
                                  <AlertTitle>Assumption of Homogeneity {results.assumption_met ? "Met" : "Violated"}</AlertTitle>
                                  <AlertDescription>{results.interpretation}</AlertDescription>
                                </Alert>
                                
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Levene Statistic</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.statistic.toFixed(4)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>p-value</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.p_value < 0.001 ? '<.001' : results.levene_test.p_value.toFixed(4)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <Image src={results.plot} alt={`Box plot of ${valueVar} by ${groupVar}`} width={800} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Descriptive Statistics by Group</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Group</TableHead>
                                        <TableHead className="text-right">N</TableHead>
                                        <TableHead className="text-right">Mean</TableHead>
                                        <TableHead className="text-right">Variance</TableHead>
                                        <TableHead className="text-right">Std. Deviation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.descriptives).map(([group, stats]) => (
                                        <TableRow key={group}>
                                            <TableCell>{group}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.variance.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Test' to check for homogeneity of variances.</p>
                </div>
            )}
        </div>
    );
}
