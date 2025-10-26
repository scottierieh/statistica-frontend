
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface AnalysisResponse {
    results: {
        data: any[];
        model_params: any;
        aic: number;
        bic: number;
        aicc: number;
    };
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.analysisTypes.includes('exponential-smoothing'));
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <TrendingUp size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Exponential Smoothing</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A versatile forecasting method that gives more weight to recent observations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Exponential Smoothing?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Exponential smoothing is a robust forecasting technique that is easy to interpret and computationally efficient. It's highly effective for short-term forecasting on time series data that exhibits trend and/or seasonality. Unlike simple moving averages, it assigns exponentially decreasing weights to older observations, making it more responsive to recent changes.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {example && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(example)}>
                                <example.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{example.name}</h4>
                                    <p className="text-xs text-muted-foreground">{example.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Time & Value Columns:</strong> Select the date/time column and the numeric data column.</li>
                                <li><strong>Smoothing Type:</strong>
                                    <ul className="list-disc pl-5 mt-1 text-xs">
                                        <li><strong>Simple:</strong> For data with no trend or seasonality.</li>
                                        <li><strong>Holt's Linear:</strong> For data with a trend but no seasonality.</li>
                                        <li><strong>Holt-Winters:</strong> For data with both trend and seasonality.</li>
                                    </ul>
                                </li>
                                <li><strong>Model Parameters (Optional):</strong> Leave parameters (alpha, beta, gamma) blank to let the model find the optimal values automatically.</li>
                                <li><strong>Run Analysis:</strong> The tool will fit the model and show the smoothed series against the original.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Fitted Plot:</strong> The primary output. Visually check how closely the orange 'Fitted Values' line follows the blue 'Original Series' line. A good fit will track the data's pattern well.</li>
                                <li><strong>AIC/BIC/AICc:</strong> Information criteria used to compare different models. Lower values indicate a better fit, especially when comparing different smoothing types on the same data.</li>
                                <li><strong>Fitted Parameters:</strong> These are the smoothing parameters (alpha, beta, gamma) found by the model. Values close to 1 mean the model puts heavy weight on recent observations, while values close to 0 mean it considers a longer history.</li>
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

interface ExponentialSmoothingPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ExponentialSmoothingPage({ data, allHeaders, onLoadExample }: ExponentialSmoothingPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [smoothingType, setSmoothingType] = useState('simple');
    
    // Model params
    const [alpha, setAlpha] = useState<number | null>(null);
    const [beta, setBeta] = useState<number | null>(null);
    const [gamma, setGamma] = useState<number | null>(null);

    // Holt-Winters params
    const [trendType, setTrendType] = useState('add');
    const [seasonalType, setSeasonalType] = useState('add');
    const [seasonalPeriods, setSeasonalPeriods] = useState<number | undefined>(12);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
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
            const response = await fetch('/api/analysis/exponential-smoothing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData, 
                    timeCol, 
                    valueCol, 
                    smoothingType,
                    alpha: alpha,
                    beta: beta,
                    gamma: gamma,
                    trendType: smoothingType !== 'simple' ? trendType : undefined,
                    seasonalType: smoothingType === 'holt-winters' ? seasonalType : undefined,
                    seasonalPeriods: smoothingType === 'holt-winters' ? seasonalPeriods : undefined,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, smoothingType, trendType, seasonalType, seasonalPeriods, toast, alpha, beta, gamma]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Exponential Smoothing Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Configure the parameters for the smoothing model.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Time Column</Label>
                            <Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Value Column</Label>
                            <Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Smoothing Type</Label>
                            <Select value={smoothingType} onValueChange={setSmoothingType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                                <SelectItem value="simple">Simple</SelectItem>
                                <SelectItem value="holt">Holt's Linear</SelectItem>
                                <SelectItem value="holt-winters">Holt-Winters</SelectItem>
                            </SelectContent></Select>
                        </div>
                    </div>
                    {smoothingType !== 'simple' && (
                        <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg">
                           <h3 className="md:col-span-3 font-semibold text-sm">Model Type Parameters</h3>
                            <div>
                                <Label>Trend</Label>
                                <Select value={trendType} onValueChange={setTrendType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                                    <SelectItem value="add">Additive</SelectItem>
                                    <SelectItem value="mul">Multiplicative</SelectItem>
                                </SelectContent></Select>
                            </div>
                            {smoothingType === 'holt-winters' && (
                                <>
                                <div>
                                    <Label>Seasonality</Label>
                                    <Select value={seasonalType} onValueChange={setSeasonalType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                                        <SelectItem value="add">Additive</SelectItem>
                                        <SelectItem value="mul">Multiplicative</SelectItem>
                                    </SelectContent></Select>
                                </div>
                                <div>
                                    <Label>Seasonal Periods</Label>
                                    <Input type="number" value={seasonalPeriods} onChange={e => setSeasonalPeriods(Number(e.target.value))} min="2" placeholder="e.g., 12 for monthly"/>
                                </div>
                                </>
                            )}
                        </div>
                    )}
                    <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="md:col-span-3 font-semibold text-sm">Smoothing Parameters (Optional)</h3>
                        <p className="md:col-span-3 text-xs text-muted-foreground -mt-2">Leave blank to let the model find the optimal values.</p>
                         <div>
                            <Label>Alpha (Level)</Label>
                            <Input type="number" value={alpha ?? ''} onChange={e => setAlpha(e.target.value ? parseFloat(e.target.value) : null)} min="0" max="1" step="0.01" />
                        </div>
                        {smoothingType !== 'simple' && (
                            <div>
                                <Label>Beta (Trend)</Label>
                                <Input type="number" value={beta ?? ''} onChange={e => setBeta(e.target.value ? parseFloat(e.target.value) : null)} min="0" max="1" step="0.01" />
                            </div>
                        )}
                         {smoothingType === 'holt-winters' && (
                            <div>
                                <Label>Gamma (Seasonal)</Label>
                                <Input type="number" value={gamma ?? ''} onChange={e => setGamma(e.target.value ? parseFloat(e.target.value) : null)} min="0" max="1" step="0.01" />
                            </div>
                        )}

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
                            <CardTitle className="font-headline">Exponential Smoothing Plot</CardTitle>
                            <CardDescription>The original time series data plotted against the model's fitted values.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Exponential Smoothing Plot" width={1200} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Model Fit</CardTitle></CardHeader>
                             <CardContent>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <dt className="text-muted-foreground">AIC</dt><dd className="text-right font-mono">{results.aic.toFixed(2)}</dd>
                                    <dt className="text-muted-foreground">BIC</dt><dd className="text-right font-mono">{results.bic.toFixed(2)}</dd>
                                    <dt className="text-muted-foreground">AICc</dt><dd className="text-right font-mono">{results.aicc.toFixed(2)}</dd>
                                </dl>
                             </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Fitted Parameters</CardTitle></CardHeader>
                            <CardContent>
                               <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    {Object.entries(results.model_params).map(([key, value]) => (
                                        <div key={key} className="flex justify-between border-b">
                                            <dt className="text-muted-foreground">{key}</dt>
                                            <dd className="font-mono">{typeof value === 'number' ? value.toFixed(4) : String(value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
