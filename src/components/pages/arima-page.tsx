
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, LineChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid } from 'recharts';

interface ArimaResults {
    summary_html: string[];
    aic: number;
    bic: number;
    hqic: number;
    forecast: any[];
}

interface FullAnalysisResponse {
    results: ArimaResults;
    plot: string;
}

interface ArimaPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ArimaPage({ data, allHeaders, onLoadExample }: ArimaPageProps) {
    const { toast } = useToast();
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [p, setP] = useState(5);
    const [d, setD] = useState(1);
    const [q, setQ] = useState(0);
    const [forecastPeriods, setForecastPeriods] = useState(12);

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
            const response = await fetch('/api/analysis/arima', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    timeCol, 
                    valueCol, 
                    order: [p, d, q],
                    forecastPeriods,
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
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, p, d, q, forecastPeriods, toast]);

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('trend-analysis'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">ARIMA Forecasting</CardTitle>
                        <CardDescription>
                           To use ARIMA, you need time-series data with at least one date/time column and one numeric column.
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
    
    const forecastChartData = useMemo(() => {
        if (!results) return [];
        const originalData = data.map(d => ({
            date: new Date(d[timeCol!] as string).getTime(),
            [valueCol!]: d[valueCol!]
        }));
        
        const forecastData = results.forecast.map(f => ({
            date: new Date(f.forecast_date).getTime(),
            'Forecast': f.mean,
            'CI Lower': f['mean_ci_lower'],
            'CI Upper': f['mean_ci_upper'],
        }));
        
        return [...originalData, ...forecastData].sort((a,b) => a.date - b.date);
    }, [results, data, timeCol, valueCol]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">ARIMA Model Setup</CardTitle>
                    <CardDescription>Configure the parameters for the ARIMA model.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Time Column</Label>
                            <Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Value Column</Label>
                            <Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label>Order (p) - AR</Label>
                            <Input type="number" value={p} onChange={e => setP(Number(e.target.value))} min="0" />
                        </div>
                        <div>
                            <Label>Order (d) - I</Label>
                            <Input type="number" value={d} onChange={e => setD(Number(e.target.value))} min="0" />
                        </div>
                        <div>
                            <Label>Order (q) - MA</Label>
                            <Input type="number" value={q} onChange={e => setQ(Number(e.target.value))} min="0" />
                        </div>
                        <div>
                            <Label>Forecast Periods</Label>
                            <Input type="number" value={forecastPeriods} onChange={e => setForecastPeriods(Number(e.target.value))} min="1" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full"/></CardContent></Card>}
            
            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Forecast</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="w-full h-[400px]">
                                <ResponsiveContainer>
                                    <RechartsLineChart data={forecastChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="date" 
                                            type="number" 
                                            domain={['dataMin', 'dataMax']}
                                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                                        />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} labelFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()} />
                                        <Legend />
                                        <Line type="monotone" dataKey={valueCol} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Original Data" />
                                        <Line type="monotone" dataKey="Forecast" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Forecast"/>
                                        <Line type="monotone" dataKey="CI Lower" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="95% CI Lower"/>
                                        <Line type="monotone" dataKey="CI Upper" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="95% CI Upper"/>
                                    </RechartsLineChart>
                                </ResponsiveContainer>
                             </ChartContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                                <div className="p-4 bg-muted rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">AIC</p>
                                    <p className="text-2xl font-bold">{results.aic.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">BIC</p>
                                    <p className="text-2xl font-bold">{results.bic.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">HQIC</p>
                                    <p className="text-2xl font-bold">{results.hqic.toFixed(2)}</p>
                                </div>
                            </div>
                             <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: results.summary_html.join('<br/>') }} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Diagnostics</CardTitle>
                            <CardDescription>Plots to assess the model's performance and check assumptions about the residuals.</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <Image src={analysisResult.plot} alt="ARIMA Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
