
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '../ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid, Area } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';

interface ArimaResults {
    summary_data: {
        caption: string | null;
        data: string[][];
    }[];
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
    const [modelType, setModelType] = useState('arima');
    
    // ARIMA Order
    const [p, setP] = useState(1);
    const [d, setD] = useState(1);
    const [q, setQ] = useState(1);
    
    // Seasonal Order
    const [P, setP_seasonal] = useState(1);
    const [D, setD_seasonal] = useState(1);
    const [Q, setQ_seasonal] = useState(1);
    const [s, setS_seasonal] = useState(12);

    // Exogenous variables
    const [exogCols, setExogCols] = useState<string[]>([]);

    const [forecastPeriods, setForecastPeriods] = useState(12);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    
    const availableExogCols = useMemo(() => allHeaders.filter(h => h !== timeCol && h !== valueCol), [allHeaders, timeCol, valueCol]);

    useEffect(() => {
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date'));
        const numericCols = allHeaders.filter(h => data.every(row => typeof row[h] === 'number' || !isNaN(Number(row[h]))));
        
        setTimeCol(dateCol || allHeaders[0]);
        setValueCol(numericCols.find(h => h !== dateCol) || numericCols[0]);
        setAnalysisResult(null);
    }, [data, allHeaders]);

    const handleExogChange = (header: string, checked: boolean) => {
        setExogCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!timeCol || !valueCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a time column and a value column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        let order = [p,d,q];
        let seasonalOrder: number[] | null = null;
        let finalExogCols: string[] | null = null;

        switch (modelType) {
            case 'ar': order = [p,0,0]; break;
            case 'ma': order = [0,0,q]; break;
            case 'arma': order = [p,0,q]; break;
            case 'arima': order = [p,d,q]; break;
            case 'sarima': order = [p,d,q]; seasonalOrder = [P,D,Q,s]; break;
            case 'arimax': order = [p,d,q]; finalExogCols = exogCols; break;
        }

        try {
            const response = await fetch('/api/analysis/arima', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    timeCol, 
                    valueCol, 
                    order,
                    seasonalOrder,
                    exogCols: finalExogCols,
                    forecastPeriods,
                })
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
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, p, d, q, modelType, P, D, Q, s, exogCols, forecastPeriods, toast]);
    
    const results = analysisResult?.results;
    
    const forecastChartData = useMemo(() => {
        if (!results || !timeCol || !valueCol) return [];
        const originalData = data.map(d => ({
            date: new Date(d[timeCol] as any).getTime(),
            [valueCol]: d[valueCol!]
        }));
        
        const forecastData = results.forecast.map(f => ({
            date: new Date(f.forecast_date).getTime(),
            'Forecast': f.mean,
            'CI Lower': f['mean_ci_lower'],
            'CI Upper': f['mean_ci_upper'],
        }));
        
        return [...originalData, ...forecastData].sort((a,b) => a.date - b.date);
    }, [results, data, timeCol, valueCol]);

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('arima'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Autoregressive Models</CardTitle>
                        <CardDescription>
                           To use these models, you need time-series data with at least one date/time column and one numeric column.
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

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Autoregressive Model Setup</CardTitle>
                    <CardDescription>Configure the parameters for the selected time series model.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><Label>Time Column</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Value Column</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>

                    <Tabs value={modelType} onValueChange={setModelType} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
                            <TabsTrigger value="ar">AR</TabsTrigger>
                            <TabsTrigger value="ma">MA</TabsTrigger>
                            <TabsTrigger value="arma">ARMA</TabsTrigger>
                            <TabsTrigger value="arima">ARIMA</TabsTrigger>
                            <TabsTrigger value="sarima">SARIMA</TabsTrigger>
                            <TabsTrigger value="arimax">ARIMAX</TabsTrigger>
                        </TabsList>
                        
                        <Card className="mt-4 p-4">
                            <div className="grid md:grid-cols-4 gap-4 items-end">
                                {/* Common ARIMA Order */}
                                {(modelType.includes('ar') || modelType.includes('arma')) && <div><Label>p (AR)</Label><Input type="number" value={p} onChange={e => setP(Number(e.target.value))} min="0" /></div>}
                                {(modelType.includes('arima')) && <div><Label>d (I)</Label><Input type="number" value={d} onChange={e => setD(Number(e.target.value))} min="0" /></div>}
                                {(modelType.includes('ma') || modelType.includes('arma')) && <div><Label>q (MA)</Label><Input type="number" value={q} onChange={e => setQ(Number(e.target.value))} min="0" /></div>}
                                
                                {/* Seasonal Order */}
                                {modelType === 'sarima' && (
                                <>
                                    <div className="md:col-span-4 font-semibold text-sm pt-4">Seasonal Order</div>
                                    <div><Label>P (Seasonal AR)</Label><Input type="number" value={P} onChange={e => setP_seasonal(Number(e.target.value))} min="0" /></div>
                                    <div><Label>D (Seasonal I)</Label><Input type="number" value={D} onChange={e => setD_seasonal(Number(e.target.value))} min="0" /></div>
                                    <div><Label>Q (Seasonal MA)</Label><Input type="number" value={Q} onChange={e => setQ_seasonal(Number(e.target.value))} min="0" /></div>
                                    <div><Label>s (Seasonal Period)</Label><Input type="number" value={s} onChange={e => setS_seasonal(Number(e.target.value))} min="1" /></div>
                                </>
                                )}

                                {/* Exogenous Variables */}
                                {modelType === 'arimax' && (
                                    <div className="md:col-span-4">
                                        <Label>Exogenous Variables</Label>
                                        <ScrollArea className="h-24 border rounded-md p-2">
                                            {availableExogCols.map(h => (
                                                <div key={h} className="flex items-center space-x-2">
                                                    <Checkbox id={`exog-${h}`} checked={exogCols.includes(h)} onCheckedChange={(c) => handleExogChange(h, c as boolean)} />
                                                    <label htmlFor={`exog-${h}`}>{h}</label>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Tabs>
                    <div className="grid md:grid-cols-4 gap-4 items-end pt-4">
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
                                        <YAxis domain={['auto', 'auto']} />
                                        <Tooltip content={<ChartTooltipContent />} labelFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()} />
                                        <Legend />
                                        <defs>
                                            <linearGradient id="splitColor" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="50%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
                                                <stop offset="50%" stopColor="hsl(var(--chart-2))" stopOpacity={1} />
                                            </linearGradient>
                                            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <Line type="monotone" dataKey={valueCol} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Original Data" />
                                        <Line type="monotone" dataKey="Forecast" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Forecast" dot={false}/>
                                        <Area type="monotone" dataKey="CI Upper" stackId="1" strokeWidth={0} fill="url(#fill)" />
                                        <Area type="monotone" dataKey="CI Lower" stackId="1" strokeWidth={0} fill="url(#fill)" />
                                    </RechartsLineChart>
                                </ResponsiveContainer>
                             </ChartContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                            
                            {results.summary_data?.map((table, tableIndex) => (
                                <Table key={tableIndex}>
                                    {table.caption && <TableCaption>{table.caption}</TableCaption>}
                                    <TableHeader><TableRow>{table.data[0].map((cell, cellIndex) => <TableHead key={cellIndex}>{cell}</TableHead>)}</TableRow></TableHeader>
                                    <TableBody>
                                    {table.data.slice(1).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>{row.map((cell, cellIndex) => <TableCell key={cellIndex} className="font-mono">{cell}</TableCell>)}</TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                            ))}
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
