
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, CheckCircle2, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';

interface ArchLmResult {
    lm_statistic: number;
    p_value: number;
    f_statistic: number;
    f_p_value: number;
    lags: number;
    is_significant: boolean;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: ArchLmResult;
}

interface ArchLmTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ArchLmTestPage({ data, numericHeaders, onLoadExample }: ArchLmTestPageProps) {
    const { toast } = useToast();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [lags, setLags] = useState<number>(10);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);
    
    useEffect(() => {
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!valueCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a value column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const seriesData = data.map(row => row[valueCol]).filter(v => typeof v === 'number');

            const response = await fetch('/api/analysis/arch-lm-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: seriesData, 
                    valueCol, 
                    lags
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
            console.error('ARCH-LM Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, valueCol, lags, toast]);

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('trend-analysis'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">ARCH-LM Test</CardTitle>
                        <CardDescription>
                           To run this test, you need time-series data with at least one numeric column (often the residuals from another model).
                        </CardDescription>
                    </CardHeader>
                     {trendExamples.length > 0 && (
                        <CardContent>
                             <Button onClick={() => onLoadExample(trendExamples[0])} className="w-full" size="sm">
                                Load Sample Time Series Data
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">ARCH-LM Test Setup</CardTitle>
                    <CardDescription>Test for Autoregressive Conditional Heteroscedasticity (ARCH effects) in a time series.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Value Column (e.g., Residuals)</Label>
                            <Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Number of Lags</Label>
                            <Input type="number" value={lags} onChange={e => setLags(Number(e.target.value))} min="1" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Test</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-48 w-full"/></CardContent></Card>}

            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle>ARCH-LM Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant={results.is_significant ? 'destructive' : 'default'}>
                           {results.is_significant ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                           <AlertTitle>{results.is_significant ? "ARCH Effects Detected (Heteroscedasticity)" : "No ARCH Effects Detected (Homoscedasticity)"}</AlertTitle>
                           <AlertDescription>{results.interpretation}</AlertDescription>
                        </Alert>
                         <Table className="mt-4">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Metric</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>LM Statistic</TableCell>
                                    <TableCell className="font-mono text-right">{results.lm_statistic.toFixed(4)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>p-value (LM Test)</TableCell>
                                    <TableCell className="font-mono text-right">{results.p_value < 0.001 ? "< 0.001" : results.p_value.toFixed(4)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>F-Statistic</TableCell>
                                    <TableCell className="font-mono text-right">{results.f_statistic.toFixed(4)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>p-value (F-Test)</TableCell>
                                    <TableCell className="font-mono text-right">{results.f_p_value < 0.001 ? "< 0.001" : results.f_p_value.toFixed(4)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>Lags</TableCell>
                                    <TableCell className="font-mono text-right">{results.lags}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
