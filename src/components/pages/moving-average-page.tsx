
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
import { ScrollArea } from '../ui/scroll-area';

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

interface ExponentialSmoothingPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ExponentialSmoothingPage({ data, allHeaders, onLoadExample }: ExponentialSmoothingPageProps) {
    const { toast } = useToast();
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

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('trend-analysis'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Exponential Smoothing</CardTitle>
                        <CardDescription>
                           To use this feature, you need time-series data with at least one date/time column and one numeric column.
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

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Exponential Smoothing Setup</CardTitle>
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
