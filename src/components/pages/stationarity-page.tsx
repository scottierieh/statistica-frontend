
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, CheckCircle2, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, LineChart as LineChartIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface AdfResult {
    adf_statistic: number;
    adf_p_value: number;
    kpss_statistic: number;
    kpss_p_value: number;
}

interface AnalysisSection {
    test_results: AdfResult;
    plot: string;
}

interface FullAnalysisResponse {
    original: AnalysisSection;
    first_difference: AnalysisSection | null;
    seasonal_difference: AnalysisSection | null;
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
                    <CardTitle className="font-headline text-4xl font-bold">Stationarity Tests (ADF & KPSS)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        Check if a time series has statistical properties (like mean and variance) that are constant over time.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Test for Stationarity?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Many time series forecasting models, such as ARIMA, assume that the data is stationary. If a model is built on non-stationary data, the results can be spurious and unreliable. This tool uses both the Augmented Dickey-Fuller (ADF) test and the Kwiatkowski-Phillips-Schmidt-Shin (KPSS) test to provide a comprehensive assessment of stationarity.
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
                                <li><strong>Select Time & Value Columns:</strong> Choose the time series data to test.</li>
                                <li><strong>Seasonal Period:</strong> Enter the period for seasonal differencing (e.g., 12 for monthly data).</li>
                                <li><strong>Run Test:</strong> The tool performs ADF and KPSS tests on the original, first-differenced, and seasonal-differenced series.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>ADF Test:</strong> Checks for a unit root. A p-value &lt; 0.05 suggests the series is **stationary**.</li>
                                <li><strong>KPSS Test:</strong> Checks for a trend or level stationarity. A p-value &lt; 0.05 suggests the series is **non-stationary**.</li>
                                <li><strong>Decision:</strong> Combine both tests. If ADF is non-significant AND KPSS is significant, the series is likely non-stationary. If differencing makes the series stationary, this informs your modeling approach (e.g., the 'd' in ARIMA).</li>
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

interface StationarityPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const ResultRow = ({ title, results }: { title: string, results: AdfResult | null | undefined }) => {
    if (!results) return null;
    const adfStationary = results.adf_p_value <= 0.05;
    const kpssStationary = results.kpss_p_value > 0.05;

    let finalDecision = "Undetermined";
    let decisionColor = "bg-gray-200 text-gray-800";
    if (adfStationary && kpssStationary) {
        finalDecision = "Stationary";
        decisionColor = "bg-green-100 text-green-800";
    } else if (!adfStationary && kpssStationary) {
        finalDecision = "Non-Stationary (Unit Root)";
        decisionColor = "bg-red-100 text-red-800";
    } else if (adfStationary && !kpssStationary) {
        finalDecision = "Trend-Stationary (Differencing may be needed)";
        decisionColor = "bg-yellow-100 text-yellow-800";
    } else { // !adfStationary && !kpssStationary
        finalDecision = "Non-Stationary (Conflicting Results)";
        decisionColor = "bg-orange-100 text-orange-800";
    }
    
    return (
        <TableRow>
            <TableCell className="font-semibold">{title}</TableCell>
            <TableCell className="text-right font-mono">{results.adf_statistic.toFixed(3)}</TableCell>
            <TableCell className={`text-right font-mono ${!adfStationary ? 'text-destructive' : 'text-green-600'}`}>{results.adf_p_value < 0.001 ? '<0.001' : results.adf_p_value.toFixed(3)}</TableCell>
            <TableCell className="text-right font-mono">{results.kpss_statistic.toFixed(3)}</TableCell>
            <TableCell className={`text-right font-mono ${kpssStationary ? 'text-green-600' : 'text-destructive'}`}>{results.kpss_p_value < 0.001 ? '<0.001' : results.kpss_p_value.toFixed(3)}</TableCell>
            <TableCell className="text-center"><Badge className={decisionColor}>{finalDecision}</Badge></TableCell>
        </TableRow>
    );
}

export default function StationarityPage({ data, allHeaders, onLoadExample }: StationarityPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [period, setPeriod] = useState(12);
    
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
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a time and a value column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/stationarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, timeCol, valueCol, period })
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
    }, [data, timeCol, valueCol, period, toast]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Stationarity Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select the time and value columns to test for stationarity.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                    <div><Label>Time Column</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Value Column</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Seasonal Period</Label><Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} min={1} /></div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Tests</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Stationarity Test Summary</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Series</TableHead>
                                        <TableHead className="text-right">ADF Statistic</TableHead>
                                        <TableHead className="text-right">ADF p-value</TableHead>
                                        <TableHead className="text-right">KPSS Statistic</TableHead>
                                        <TableHead className="text-right">KPSS p-value</TableHead>
                                        <TableHead className="text-center">Decision</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <ResultRow title="Original" results={analysisResult.original.test_results} />
                                    {analysisResult.first_difference && <ResultRow title="First Difference" results={analysisResult.first_difference.test_results} />}
                                    {analysisResult.seasonal_difference && <ResultRow title="Seasonal Difference" results={analysisResult.seasonal_difference.test_results} />}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Original Series</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.original.plot} alt="Original Series Plot" width={600} height={400} className="w-full rounded-md border"/></CardContent>
                        </Card>
                        {analysisResult.first_difference && <Card>
                            <CardHeader><CardTitle>First Difference</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.first_difference.plot} alt="First Difference Plot" width={600} height={400} className="w-full rounded-md border"/></CardContent>
                        </Card>}
                        {analysisResult.seasonal_difference && <Card>
                            <CardHeader><CardTitle>Seasonal Difference (p={period})</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.seasonal_difference.plot} alt="Seasonal Difference Plot" width={600} height={400} className="w-full rounded-md border"/></CardContent>
                        </Card>}
                    </div>
                </div>
            )}
        </div>
    );
}

