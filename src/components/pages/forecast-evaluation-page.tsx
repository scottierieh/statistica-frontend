'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar as RechartsBar, CartesianGrid, Cell } from 'recharts';


interface ModelResult {
    Model: string;
    AIC: number | null;
    BIC: number | null;
    RMSE: number | null;
    error?: string;
}

interface FullAnalysisResponse {
    results: ModelResult[];
}

interface ForecastEvaluationPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ForecastEvaluationPage({ data, allHeaders, onLoadExample }: ForecastEvaluationPageProps) {
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
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a time and a value column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/forecast-evaluation', {
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
            console.error('Forecast Evaluation error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, toast]);

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('arima'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Forecast Model Evaluation</CardTitle>
                        <CardDescription>To compare models, you need time-series data with at least one date/time column and one numeric column.</CardDescription>
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
                    <CardTitle className="font-headline">Forecast Model Evaluation Setup</CardTitle>
                    <CardDescription>Select your time and value columns to compare a set of standard time series models.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><Label>Time Column</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Value Column</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Evaluating...</> : <><Sigma className="mr-2"/>Compare Models</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                 <div className="grid lg:grid-cols-2 gap-4">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="font-headline">Model Comparison</CardTitle>
                            <CardDescription>Lower AIC, BIC, and RMSE generally indicate a better model fit.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Model</TableHead>
                                        <TableHead className="text-right">AIC</TableHead>
                                        <TableHead className="text-right">BIC</TableHead>
                                        <TableHead className="text-right">RMSE (Test Set)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((row) => (
                                        <TableRow key={row.Model}>
                                            <TableCell className="font-medium">{row.Model}</TableCell>
                                            <TableCell className="text-right font-mono">{row.AIC?.toFixed(2) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{row.BIC?.toFixed(2) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{row.RMSE?.toFixed(2) ?? 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">RMSE Comparison</CardTitle></CardHeader>
                        <CardContent>
                            <ChartContainer config={{}} className="w-full h-80">
                                <ResponsiveContainer>
                                    <RechartsBarChart data={results.filter(r => r.RMSE !== null)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="Model" width={100} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <RechartsBar dataKey="RMSE" name="RMSE" fill="hsl(var(--chart-1))" />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">AIC/BIC Comparison</CardTitle></CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="w-full h-80">
                                <ResponsiveContainer>
                                    <RechartsBarChart data={results.filter(r => r.AIC !== null)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="Model" tick={{fontSize: 10}} />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <RechartsBar dataKey="AIC" fill="hsl(var(--chart-2))" />
                                        <RechartsBar dataKey="BIC" fill="hsl(var(--chart-3))" />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

