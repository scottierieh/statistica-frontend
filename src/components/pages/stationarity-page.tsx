
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface AdfResult {
    adf_statistic: number;
    p_value: number;
    critical_values: { [key: string]: number };
    is_stationary: boolean;
}

interface AnalysisSection {
    test_results: AdfResult;
    plot: string;
}

interface FullAnalysisResponse {
    original: AnalysisSection;
    differenced: AnalysisSection;
}

interface StationarityPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const ResultCard = ({ title, results }: { title: string, results: AdfResult }) => (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">{title}</CardTitle>
            <CardDescription>Augmented Dickey-Fuller Test Results</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant={results.is_stationary ? 'default' : 'destructive'}>
                {results.is_stationary ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle>{results.is_stationary ? 'Stationary' : 'Non-Stationary'}</AlertTitle>
                <AlertDescription>
                    The p-value is {results.p_value.toFixed(4)}. Since it is {results.is_stationary ? 'less than or equal to' : 'greater than'} 0.05, we {results.is_stationary ? 'reject' : 'fail to reject'} the null hypothesis. The series is likely stationary.
                </AlertDescription>
            </Alert>
            <Table className="mt-4">
                <TableHeader>
                    <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow><TableCell>ADF Statistic</TableCell><TableCell className="font-mono text-right">{results.adf_statistic.toFixed(4)}</TableCell></TableRow>
                    <TableRow><TableCell>p-value</TableCell><TableCell className="font-mono text-right">{results.p_value.toFixed(4)}</TableCell></TableRow>
                    {Object.entries(results.critical_values).map(([key, value]) => (
                         <TableRow key={key}><TableCell>Critical Value ({key})</TableCell><TableCell className="font-mono text-right">{value.toFixed(4)}</TableCell></TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

export default function StationarityPage({ data, allHeaders, onLoadExample }: StationarityPageProps) {
    const { toast } = useToast();
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    
    useEffect(() => {
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date'));
        const numericCols = allHeaders.filter(h => data.every(row => typeof row[h] === 'number' || !isNaN(Number(row[h]))));
        
        setTimeCol(dateCol || allHeaders[0]);
        setValueCol(numericCols.find(h => h !== dateCol) || numericCols[0]);
        setAnalysisResult(null);
    }, [data, allHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!timeCol || !valueCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a time column and a value column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/stationarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, timeCol, valueCol })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Stationarity Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, toast]);

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('stationarity-tests'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Stationarity Tests</CardTitle>
                        <CardDescription>To run stationarity tests, you need time-series data with at least one date/time column and one numeric column.</CardDescription>
                    </CardHeader>
                     {trendExamples.length > 0 && (
                        <CardContent><Button onClick={() => onLoadExample(trendExamples[0])} className="w-full" size="sm">Load {trendExamples[0].name}</Button></CardContent>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Stationarity Test Setup (ADF)</CardTitle>
                    <CardDescription>Select the time and value columns to test for stationarity.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Time Column</Label>
                        <Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Value Column</Label>
                        <Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Tests</>}
                    </Button>
                </CardFooter>
            </Card>
            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Original Series Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <Image src={analysisResult.original.plot} alt="Original Series Plot" width={600} height={400} className="w-full rounded-md border"/>
                            <ResultCard title="Original Series ADF Test" results={analysisResult.original.test_results} />
                        </CardContent>
                    </Card>
                      <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">1st Difference Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <Image src={analysisResult.differenced.plot} alt="Differenced Series Plot" width={600} height={400} className="w-full rounded-md border"/>
                            <ResultCard title="Differenced Series ADF Test" results={analysisResult.differenced.test_results} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
