
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, TableIcon, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const trendExample = exampleDatasets.find(d => d.analysisTypes.includes('seasonal-decomposition'));
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <AreaChart size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Seasonal Decomposition</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Deconstruct a time series into its core components: Trend, Seasonality, and Residuals.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Seasonal Decomposition?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Decomposition helps you understand the underlying patterns in your time series data. By separating the trend (long-term direction), seasonality (repeating cycles), and residuals (random noise), you can gain deeper insights, make better forecasts, and identify anomalies more effectively.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {trendExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(trendExample)}>
                                <trendExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{trendExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{trendExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Time & Value Columns:</strong> Select the date/time column and the numeric data column you want to analyze.</li>
                                <li><strong>Model Type:</strong> Choose 'Additive' if the seasonal variation is constant over time, or 'Multiplicative' if it changes in proportion to the level of the series.</li>
                                <li><strong>Period:</strong> Specify the length of the seasonal cycle (e.g., 12 for monthly data, 7 for daily data with weekly patterns).</li>
                                <li><strong>Run Analysis:</strong> The tool will decompose the series and visualize the components.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Trend Component:</strong> Shows the underlying long-term direction of the data, stripped of seasonality and noise.</li>
                                <li><strong>Seasonal Component:</strong> Displays the repeating cyclical pattern. For monthly data, this will show which months are typically higher or lower than average.</li>
                                <li><strong>Residual Component:</strong> What's left after removing the trend and seasonal components. Ideally, it should look like random noise with no clear pattern.</li>
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


interface SeasonalDecompositionPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SeasonalDecompositionPage({ data, allHeaders, onLoadExample }: SeasonalDecompositionPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
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
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, canRun]);

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

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
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
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Seasonal Decomposition Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
