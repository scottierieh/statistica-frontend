'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, HelpCircle, Settings, FileSearch, TrendingUp, Bot, Download, Activity, Info, BarChart3, CheckCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';

interface AnalysisResponse {
    results: {
        data: any[];
        model_params: any;
        aic: number;
        bic: number;
        aicc: number;
    };
    plot: string;
    interpretations?: {
        overall_analysis: string;
        model_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: AnalysisResponse['results'] }) => {
    const getModelQuality = (aic: number) => {
        // Lower is better, but this is relative
        return 'Fitted';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AIC Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                AIC
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.aic.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Akaike Information Criterion
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* BIC Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                BIC
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.bic.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Bayesian Information Criterion
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* AICc Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                AICc
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.aicc.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Corrected AIC
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Parameters Count Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Parameters
                            </p>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {Object.keys(results.model_params).length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Fitted coefficients
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const ExponentialSmoothingOverview = ({ timeCol, valueCol, smoothingType, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!timeCol || !valueCol) {
            overview.push('Select both time and value columns');
        } else {
            overview.push(`Time axis: ${timeCol}`);
            overview.push(`Value axis: ${valueCol}`);
        }

        // Model type
        const typeMap: Record<string, string> = {
            'simple': 'Simple Exponential Smoothing (no trend/seasonality)',
            'holt': "Holt's Linear Trend (trend, no seasonality)",
            'holt-winters': 'Holt-Winters (trend and seasonality)'
        };
        overview.push(`Model type: ${typeMap[smoothingType] || smoothingType}`);

        // Data characteristics
        if (data.length < 30) {
            overview.push(`⚠ Limited data (${data.length} points) - model may be less reliable`);
        } else {
            overview.push(`${data.length} data points available`);
        }

        // Model information
        overview.push('Exponentially weighted moving average');
        overview.push('Recent observations have higher weights');
        overview.push('AIC/BIC/AICc: Lower values indicate better fit');
        overview.push('Best for: Short-term forecasting, trend smoothing');

        return overview;
    }, [timeCol, valueCol, smoothingType, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Generate interpretations based on exponential smoothing results
const generateExponentialSmoothingInterpretations = (results: AnalysisResponse['results'], smoothingType: string) => {
    const insights: string[] = [];
    
    let overall = '';
    const typeDescriptions: Record<string, string> = {
        'simple': 'Simple Exponential Smoothing was applied to your data. This model is best suited for time series without trend or seasonal patterns, using only a level component.',
        'holt': "Holt's Linear Trend method was applied. This model captures both level and trend components, making it suitable for data with a consistent upward or downward trend.",
        'holt-winters': 'Holt-Winters method was applied. This comprehensive model captures level, trend, and seasonal components, ideal for data with recurring patterns.'
    };
    overall = `<strong>${typeDescriptions[smoothingType] || 'Exponential smoothing was applied.'}</strong> The model assigns exponentially decreasing weights to older observations, making it responsive to recent changes while maintaining stability.`;
    
    // Information criteria insights
    insights.push(`<strong>AIC (Akaike Information Criterion):</strong> ${results.aic.toFixed(2)}. Lower values indicate better model fit when comparing different models on the same data.`);
    insights.push(`<strong>BIC (Bayesian Information Criterion):</strong> ${results.bic.toFixed(2)}. Similar to AIC but penalizes model complexity more heavily.`);
    insights.push(`<strong>AICc (Corrected AIC):</strong> ${results.aicc.toFixed(2)}. Recommended for small sample sizes, provides correction for finite data.`);
    
    // Parameter insights
    const paramNames: Record<string, string> = {
        'smoothing_level': 'Alpha (α) - Level smoothing',
        'smoothing_trend': 'Beta (β) - Trend smoothing', 
        'smoothing_seasonal': 'Gamma (γ) - Seasonal smoothing',
        'initial_level': 'Initial level estimate',
        'initial_trend': 'Initial trend estimate'
    };
    
    Object.entries(results.model_params).forEach(([key, value]) => {
        if (typeof value === 'number') {
            const paramName = paramNames[key] || key;
            if (key.includes('smoothing')) {
                const weight = value > 0.7 ? 'high (responsive to recent changes)' : value > 0.3 ? 'moderate (balanced)' : 'low (stable, considers more history)';
                insights.push(`<strong>${paramName}:</strong> ${value.toFixed(4)} - ${weight} weight on recent observations.`);
            }
        }
    });
    
    // Recommendations
    let recommendations = '';
    if (smoothingType === 'simple') {
        recommendations = 'This model is suitable for flat data without trend or seasonality. If your data shows trends, consider using Holt\'s Linear method. If seasonal patterns exist, use Holt-Winters. For forecasting, use the last fitted value as the prediction for all future periods.';
    } else if (smoothingType === 'holt') {
        recommendations = 'This model captures linear trends well. If you notice seasonal patterns in your data, upgrade to Holt-Winters. The trend component allows for extrapolation into the future. Monitor the fitted line to ensure it follows your data pattern appropriately.';
    } else {
        recommendations = 'This comprehensive model captures both trend and seasonality. Ensure your seasonal period is correctly specified. Compare AIC/BIC values with simpler models to verify this complexity is warranted. Use this model for forecasting multiple periods ahead while accounting for seasonal fluctuations.';
    }
    
    return {
        overall_analysis: overall,
        model_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const smoothingExample = exampleDatasets.find(d => d.id === 'time-series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Exponential Smoothing</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Forecast time series by giving more weight to recent observations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Simple</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Level only, no trend/seasonality
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Holt's Linear</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Level and trend components
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Holt-Winters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Level, trend, and seasonality
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Exponential Smoothing
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Exponential smoothing is ideal for short-term forecasting when you have time series data. 
                            Unlike simple moving averages that weight all observations equally, exponential smoothing 
                            gives more importance to recent data points, making it highly responsive to changes. 
                            Choose the appropriate variant based on whether your data exhibits trends and/or seasonal patterns.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Time Column:</strong> Date/time series</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Value Column:</strong> Numeric metric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Model Type:</strong> Choose based on data patterns</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Points:</strong> 30+ recommended</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Fitted Plot:</strong> Compare with original data</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Lower AIC/BIC:</strong> Better model fit</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Alpha (α):</strong> Level smoothing parameter</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>High α:</strong> Responsive to recent changes</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {smoothingExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(smoothingExample)} size="lg">
                                <TrendingUp className="mr-2 h-5 w-5" />
                                Load Time Series Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ExponentialSmoothingPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function ExponentialSmoothingPage({ data, allHeaders, onLoadExample, onGenerateReport }: ExponentialSmoothingPageProps) {
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
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'));
        const numericCols = allHeaders.filter(h => {
            const sample = data[0]?.[h];
            return typeof sample === 'number' || !isNaN(Number(sample));
        });
        
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
            
            // Generate interpretations
            const interpretations = generateExponentialSmoothingInterpretations(result.results, smoothingType);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, smoothingType, trendType, seasonalType, seasonalPeriods, alpha, beta, gamma, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const modelData = [{
            model_type: smoothingType,
            aic: analysisResult.results.aic,
            bic: analysisResult.results.bic,
            aicc: analysisResult.results.aicc,
            ...analysisResult.results.model_params
        }];
        
        const csv = Papa.unparse(modelData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'exponential_smoothing_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Model results are being downloaded." });
    }, [analysisResult, smoothingType, toast]);

    if (view === 'intro' || !canRun) {
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
                            <Select value={timeCol} onValueChange={setTimeCol}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Value Column</Label>
                            <Select value={valueCol} onValueChange={setValueCol}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {allHeaders.filter(h=>h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Smoothing Type</Label>
                            <Select value={smoothingType} onValueChange={setSmoothingType}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="simple">Simple</SelectItem>
                                    <SelectItem value="holt">Holt's Linear</SelectItem>
                                    <SelectItem value="holt-winters">Holt-Winters</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {smoothingType !== 'simple' && (
                        <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg">
                           <h3 className="md:col-span-3 font-semibold text-sm">Model Type Parameters</h3>
                            <div>
                                <Label>Trend</Label>
                                <Select value={trendType} onValueChange={setTrendType}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="add">Additive</SelectItem>
                                        <SelectItem value="mul">Multiplicative</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {smoothingType === 'holt-winters' && (
                                <>
                                <div>
                                    <Label>Seasonality</Label>
                                    <Select value={seasonalType} onValueChange={setSeasonalType}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="add">Additive</SelectItem>
                                            <SelectItem value="mul">Multiplicative</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                    
                    {/* Analysis Overview */}
                    <ExponentialSmoothingOverview 
                        timeCol={timeCol}
                        valueCol={valueCol}
                        smoothingType={smoothingType}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(analysisResult, null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleDownloadResults}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Results
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Fitting exponential smoothing model...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Model fit quality and parameter estimates</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <TrendingUp className="h-4 w-4" />
                                <AlertTitle>Model Fitted Successfully</AlertTitle>
                                <AlertDescription>
                                    {smoothingType === 'simple' && 'Simple Exponential Smoothing model fitted to the data.'}
                                    {smoothingType === 'holt' && "Holt's Linear Trend model fitted with trend component."}
                                    {smoothingType === 'holt-winters' && 'Holt-Winters model fitted with trend and seasonal components.'}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Model Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Model Insights */}
                            {analysisResult.interpretations?.model_insights && analysisResult.interpretations.model_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Model Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.model_insights.map((insight, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Recommendations */}
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-500/10 rounded-md">
                                        <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Recommendations</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                >
                                    {analysisResult.interpretations?.recommendations}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fitted Values Plot */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Fitted vs Original Series</CardTitle>
                            <CardDescription>
                                Visual comparison of the original time series data against the model's fitted values
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Exponential Smoothing Plot" width={1200} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure parameters and click &apos;Run Analysis&apos; to fit the smoothing model.</p>
                </div>
            )}
        </div>
    );
}

