
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, LineChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface NormalityTestResult {
    shapiro_wilk: {
        statistic: number;
        p_value: number;
    };
    jarque_bera: {
        statistic: number;
        p_value: number;
    };
    is_normal_shapiro: boolean;
    is_normal_jarque: boolean;
    interpretation: string;
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: { [key: string]: NormalityTestResult };
}

interface NormalityTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NormalityTestPage({ data, numericHeaders, onLoadExample }: NormalityTestPageProps) {
    const { toast } = useToast();
    const [selectedVars, setSelectedVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedVars(numericHeaders);
        setAnalysisResult(null);
    }, [data, numericHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one numeric variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/normality', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Normality Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast]);

    if (!canRun) {
        const normalityExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('normality'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Normality Test</CardTitle>
                        <CardDescription>
                           To perform a normality test, you need data with at least one numeric variable.
                        </CardDescription>
                    </CardHeader>
                    {normalityExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {normalityExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <LineChart className="h-6 w-6 text-secondary-foreground" />
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
                    <CardTitle className="font-headline">Normality Test Setup</CardTitle>
                    <CardDescription>Select one or more numeric variables to test for normality.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label>Numeric Variables</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`norm-${header}`}
                                  checked={selectedVars.includes(header)}
                                  onCheckedChange={(checked) => handleVarSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`norm-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length === 0}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Test</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    {Object.entries(analysisResult.results).map(([variable, result]) => (
                        <Card key={variable}>
                            <CardHeader>
                                <CardTitle className="font-headline">Results for: {variable}</CardTitle>
                                {result.error && <CardDescription className="text-destructive">{result.error}</CardDescription>}
                            </CardHeader>
                            {!result.error && (
                                <CardContent className="grid lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <Alert variant={result.is_normal_shapiro ? 'default' : 'destructive'}>
                                          {result.is_normal_shapiro ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
                                          <AlertTitle>Normality Assumption ({result.is_normal_shapiro ? "Met" : "Not Met"})</AlertTitle>
                                          <AlertDescription>{result.interpretation}</AlertDescription>
                                        </Alert>
                                        
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Test</TableHead>
                                                    <TableHead className="text-right">Statistic</TableHead>
                                                    <TableHead className="text-right">p-value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell>Shapiro-Wilk</TableCell>
                                                    <TableCell className="text-right font-mono">{result.shapiro_wilk.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{result.shapiro_wilk.p_value < 0.001 ? '<.001' : result.shapiro_wilk.p_value.toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Jarque-Bera</TableCell>
                                                    <TableCell className="text-right font-mono">{result.jarque_bera.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{result.jarque_bera.p_value < 0.001 ? '<.001' : result.jarque_bera.p_value.toFixed(4)}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div>
                                        <Image src={result.plot} alt={`Plots for ${variable}`} width={800} height={400} className="w-full rounded-md border" />
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

             {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <LineChart className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Test' to check for normality.</p>
                </div>
            )}
        </div>
    );
}
