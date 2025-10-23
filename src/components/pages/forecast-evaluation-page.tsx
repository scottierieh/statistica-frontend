
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
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ModelResult {
    Method: string;
    RMSE: number | null;
    MAE: number | null;
    "MAPE (%)": number | null;
    MASE: number | null;
    "Coverage (95% PI)": number | null;
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

    const findBestModel = (results: ModelResult[], metric: keyof ModelResult, lowerIsBetter: boolean) => {
        const validResults = results.filter(r => r[metric] !== null && r[metric] !== undefined && !isNaN(r[metric] as number));
        if (validResults.length === 0) return null;

        const best = validResults.reduce((best, current) => {
            if (lowerIsBetter) {
                return (current[metric] as number) < (best[metric] as number) ? current : best;
            } else {
                return (current[metric] as number) > (best[metric] as number) ? current : best;
            }
        });
        return best.Method;
    };

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
    const bestRMSE = results ? findBestModel(results, 'RMSE', true) : null;
    const bestMAE = results ? findBestModel(results, 'MAE', true) : null;
    const bestMAPE = results ? findBestModel(results, 'MAPE (%)', true) : null;
    const bestMASE = results ? findBestModel(results, 'MASE', true) : null;

    const metricTooltips: Record<string, string> = {
        RMSE: "Root Mean Squared Error. Lower is better. Sensitive to large errors.",
        MAE: "Mean Absolute Error. Lower is better. Less sensitive to outliers than RMSE.",
        "MAPE (%)": "Mean Absolute Percentage Error. Lower is better. Relative error measure.",
        MASE: "Mean Absolute Scaled Error. Lower is better. Compares forecast to a naive seasonal forecast.",
        "Coverage (95% PI)": "Coverage of 95% Prediction Interval. Closer to 95% is better."
    };

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
                 <div className="grid grid-cols-1 gap-4">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="font-headline">Forecast Accuracy Comparison</CardTitle>
                            <CardDescription>Key metrics for evaluating model performance on the test set (last 12 periods).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Method</TableHead>
                                        {Object.keys(results[0]).filter(k => k !== 'Method' && k !== 'error').map(metric => (
                                            <TooltipProvider key={metric}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableHead className="text-right cursor-help">{metric}</TableHead>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{metricTooltips[metric] || metric}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((row) => (
                                        <TableRow key={row.Method}>
                                            <TableCell className="font-medium">{row.Method}</TableCell>
                                            <TableCell className={`text-right font-mono ${row.Method === bestRMSE ? 'font-bold text-green-600' : ''}`}>{row.RMSE != null ? row.RMSE.toFixed(2) : 'N/A'}</TableCell>
                                            <TableCell className={`text-right font-mono ${row.Method === bestMAE ? 'font-bold text-green-600' : ''}`}>{row.MAE != null ? row.MAE.toFixed(2) : 'N/A'}</TableCell>
                                            <TableCell className={`text-right font-mono ${row.Method === bestMAPE ? 'font-bold text-green-600' : ''}`}>{row['MAPE (%)'] != null ? row['MAPE (%)'].toFixed(1) : 'N/A'}</TableCell>
                                            <TableCell className={`text-right font-mono ${row.Method === bestMASE ? 'font-bold text-green-600' : ''}`}>{row.MASE != null ? row.MASE.toFixed(2) : 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{row['Coverage (95% PI)'] != null ? `${row['Coverage (95% PI)'].toFixed(1)}%` : 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
