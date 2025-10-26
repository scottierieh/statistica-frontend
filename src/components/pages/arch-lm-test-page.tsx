
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const trendExample = exampleDatasets.find(d => d.analysisTypes.includes('trend-analysis'));
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <LineChartIcon size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">ARCH-LM Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Test for Autoregressive Conditional Heteroscedasticity (ARCH effects) in a time series.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use the ARCH-LM Test?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            In financial and economic time series, volatility often comes in clusters—periods of high volatility are followed by high volatility, and periods of low volatility by low volatility. The ARCH-LM test checks for this phenomenon, known as ARCH effects. Identifying these effects is crucial because it indicates that the variance of the series is not constant, which violates a key assumption of standard forecasting models like ARIMA.
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
                                <li><strong>Value Column:</strong> Select the time series data to test. This is typically the residuals from a previously fitted model (e.g., ARIMA) to check if any volatility clustering remains unexplained.</li>
                                <li><strong>Number of Lags:</strong> Specify how many past squared residuals to include in the test regression.</li>
                                <li><strong>Run Test:</strong> The tool will perform the test and provide a conclusion on the presence of ARCH effects.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Null Hypothesis (H₀):</strong> No ARCH effects are present (the residuals are homoscedastic).</li>
                                <li><strong>p-value:</strong> A p-value less than 0.05 indicates the presence of significant ARCH effects. This means the variance is not constant, and you should consider using volatility models like ARCH or GARCH.</li>
                                <li><strong>No Plot:</strong> This is a statistical test, not a visualization. A significant result suggests further modeling, not just a visual inspection.</li>
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

interface ArchLmTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ArchLmTestPage({ data, numericHeaders, onLoadExample }: ArchLmTestPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [lags, setLags] = useState<number>(10);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);
    
    useEffect(() => {
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

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

    const handleLoadExampleData = () => {
        const trendExample = exampleDatasets.find(d => d.analysisTypes.includes('trend-analysis'));
        if (trendExample) {
            onLoadExample(trendExample);
            setView('main');
        }
    };

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">ARCH-LM Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
