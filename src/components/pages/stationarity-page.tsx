
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, CheckCircle2, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, LineChart as LineChartIcon } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const stationarityExample = exampleDatasets.find(d => d.id === 'time-series');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <LineChartIcon size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Stationarity Tests (ADF)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Check if a time series has statistical properties (like mean and variance) that are constant over time.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Test for Stationarity?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Many time series forecasting models, such as ARIMA, assume that the data is stationary. If a model is built on non-stationary data, the results can be spurious and unreliable. The Augmented Dickey-Fuller (ADF) test is a formal statistical test to determine if a time series has a unit root, which is a common cause of non-stationarity.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {stationarityExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(stationarityExample)}>
                                <stationarityExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{stationarityExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{stationarityExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Select Time & Value Columns:</strong> Choose the column that represents time and the numeric column whose stationarity you want to test.
                                </li>
                                <li>
                                    <strong>Run Test:</strong> The tool performs the ADF test on both the original series and the first-differenced series to see if differencing makes it stationary.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>ADF Statistic:</strong> A more negative value indicates stronger evidence against the null hypothesis (that a unit root is present).
                                </li>
                                <li>
                                    <strong>p-value:</strong> If the p-value is less than 0.05, you can reject the null hypothesis and conclude that the series is stationary.
                                </li>
                                 <li>
                                    <strong>Original vs. Differenced:</strong> If the original series is non-stationary, check the results for the differenced series. If the differenced series is stationary, you would use a differencing term (d=1) in your ARIMA model.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


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
    const [view, setView] = useState('intro');
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
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, canRun]);

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

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Stationarity Test Setup (ADF)</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
