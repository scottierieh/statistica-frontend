
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, TableIcon } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface DecompositionSummary {
    component: string;
    strength: number | null;
    variance_explained: number;
}

interface SeasonalPattern {
    month: string;
    seasonal_index: number;
    deviation: number;
}

interface TrendResults {
    decomposition_summary: DecompositionSummary[];
    seasonal_pattern: SeasonalPattern[];
    trend: { [key: string]: number | string }[];
    seasonal: { [key: string]: number | string }[];
    resid: { [key: string]: number | string }[];
}

interface FullAnalysisResponse {
    results: TrendResults;
    plot: string;
}

interface SeasonalDecompositionPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SeasonalDecompositionPage({ data, allHeaders, onLoadExample }: SeasonalDecompositionPageProps) {
    const { toast } = useToast();
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [model, setModel] = useState('additive');
    const [period, setPeriod] = useState<number>(12);
    
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

        const analysisData = data.map(row => ({
            [timeCol]: row[timeCol],
            [valueCol]: row[valueCol],
        }));

        try {
            const response = await fetch('/api/analysis/seasonal-decomposition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData, 
                    timeCol, 
                    valueCol, 
                    model, 
                    period 
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
            console.error('Seasonal Decomposition error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, model, period, toast]);

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('seasonal-decomposition'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Seasonal Decomposition</CardTitle>
                        <CardDescription>
                           To perform seasonal decomposition, you need time-series data with at least one date/time column and one numeric column.
                        </CardDescription>
                    </CardHeader>
                     {trendExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {trendExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <AreaChart className="h-6 w-6 text-secondary-foreground" />
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

    const getInterpretation = (deviation: number): string => {
        if (deviation > 10) return "Significant peak";
        if (deviation > 5) return "Notable increase";
        if (deviation < -10) return "Significant decline";
        if (deviation < -5) return "Notable decline";
        return "Near average";
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Seasonal Decomposition Setup</CardTitle>
                    <CardDescription>Configure the parameters for time series decomposition.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div>
                            <Label>Time Column</Label>
                            <Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Value Column</Label>
                            <Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <Label>Model Type</Label>
                            <Select value={model} onValueChange={setModel}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="additive">Additive</SelectItem><SelectItem value="multiplicative">Multiplicative</SelectItem></SelectContent></Select>
                        </div>
                        <div>
                            <Label>Period (Seasonality)</Label>
                            <Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} min="2" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Time Series Decomposition Plot</CardTitle>
                            <CardDescription>The original series decomposed into trend, seasonal, and residual components.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Time Series Decomposition Plot" width={1200} height={1000} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Seasonal Decomposition Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Component</TableHead>
                                        <TableHead className="text-right">Strength</TableHead>
                                        <TableHead className="text-right">Variance Explained</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.decomposition_summary?.map(item => (
                                        <TableRow key={item.component}>
                                            <TableCell className="font-medium">{item.component}</TableCell>
                                            <TableCell className="text-right font-mono">{item.strength !== null ? item.strength.toFixed(2) : "-"}</TableCell>
                                            <TableCell className="text-right font-mono">{item.variance_explained.toFixed(1)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                             <div className="mt-4 p-4 bg-muted/50 rounded-md text-sm text-muted-foreground">
                                <p><strong>Strength of Trend:</strong> Indicates how much of the variation is explained by the trend. Values close to 1 mean a strong trend.</p>
                                <p><strong>Strength of Seasonality:</strong> Indicates how much of the variation is due to the seasonal component. Values close to 1 mean strong seasonality.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {results.seasonal_pattern && results.seasonal_pattern.length > 0 && (
                        <Card>
                             <CardHeader>
                                <CardTitle>Seasonal Pattern Analysis</CardTitle>
                             </CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Month</TableHead>
                                            <TableHead className="text-right">Seasonal Index</TableHead>
                                            <TableHead className="text-right">% Deviation</TableHead>
                                            <TableHead>Interpretation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.seasonal_pattern.map(item => (
                                            <TableRow key={item.month}>
                                                <TableCell>{item.month}</TableCell>
                                                <TableCell className="text-right font-mono">{item.seasonal_index.toFixed(2)}</TableCell>
                                                <TableCell className={`text-right font-mono ${item.deviation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(1)}%
                                                </TableCell>
                                                <TableCell>{getInterpretation(item.deviation)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </CardContent>
                        </Card>
                    )}

                </div>
            )}
        </div>
    );
}
