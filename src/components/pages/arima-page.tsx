'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, HelpCircle, Settings, FileSearch, Activity, Bot, Download, Info, TrendingUp, BarChart3, GitBranch } from 'lucide-react';
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
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';

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
    diagnostics_plot: string;
    interpretations?: {
        overall_analysis: string;
        model_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, modelType }: { results: ArimaResults, modelType: string }) => {
    const modelLabels: Record<string, string> = {
        'ar': 'AR Model',
        'ma': 'MA Model',
        'arma': 'ARMA Model',
        'arima': 'ARIMA Model',
        'sarima': 'SARIMA Model',
        'arimax': 'ARIMAX Model'
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Model Type Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Model Type
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {modelLabels[modelType] || 'ARIMA'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Time series forecast
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* AIC Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                AIC
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

            {/* HQIC Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                HQIC
                            </p>
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.hqic.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Hannan-Quinn IC
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const ArimaOverview = ({ timeCol, valueCol, modelType, p, d, q, forecastPeriods, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!timeCol || !valueCol) {
            overview.push('Select both time and value columns');
        } else {
            overview.push(`Time axis: ${timeCol}`);
            overview.push(`Value axis: ${valueCol}`);
        }

        // Model configuration
        const modelDescriptions: Record<string, string> = {
            'ar': `AR(${p}) - Autoregressive model`,
            'ma': `MA(${q}) - Moving Average model`,
            'arma': `ARMA(${p},${q}) - Combined AR and MA`,
            'arima': `ARIMA(${p},${d},${q}) - Integrated ARMA`,
            'sarima': 'SARIMA - Seasonal ARIMA',
            'arimax': 'ARIMAX - ARIMA with exogenous variables'
        };
        overview.push(`Model: ${modelDescriptions[modelType]}`);
        overview.push(`Forecast horizon: ${forecastPeriods} periods ahead`);

        // Data characteristics
        if (data.length < 50) {
            overview.push(`⚠ Limited data (${data.length} points) - model may be less reliable`);
        } else {
            overview.push(`${data.length} data points for training`);
        }

        // Model information
        overview.push('Uses maximum likelihood estimation');
        overview.push('Generates point forecasts with confidence intervals');
        overview.push('Lower AIC/BIC indicates better model fit');
        overview.push('Best for: Univariate time series forecasting');

        return overview;
    }, [timeCol, valueCol, modelType, p, d, q, forecastPeriods, data]);

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

// Generate interpretations based on ARIMA results
const generateArimaInterpretations = (results: ArimaResults, modelType: string, p: number, d: number, q: number) => {
    const insights: string[] = [];
    
    const modelDescriptions: Record<string, string> = {
        'ar': `An AR(${p}) model was fitted, using ${p} lagged value(s) of the series to predict future values. This captures autocorrelation in the data.`,
        'ma': `An MA(${q}) model was fitted, using ${q} lagged forecast error(s) to smooth predictions. This captures short-term fluctuations.`,
        'arma': `An ARMA(${p},${q}) model was fitted, combining ${p} autoregressive term(s) and ${q} moving average term(s) for comprehensive modeling.`,
        'arima': `An ARIMA(${p},${d},${q}) model was fitted. The series was differenced ${d} time(s) to achieve stationarity, then modeled with ${p} AR and ${q} MA terms.`,
        'sarima': 'A SARIMA model was fitted, extending ARIMA to capture seasonal patterns in addition to trend and autocorrelation.',
        'arimax': 'An ARIMAX model was fitted, incorporating exogenous variables to improve forecast accuracy with external predictors.'
    };
    
    let overall = `<strong>${modelDescriptions[modelType] || 'An ARIMA model was fitted to your time series data.'}</strong> The model has been estimated using maximum likelihood, and forecasts have been generated with 95% confidence intervals.`;
    
    // Information criteria insights
    insights.push(`<strong>AIC (Akaike Information Criterion):</strong> ${results.aic.toFixed(2)}. Lower values indicate better model fit. Use this to compare different model specifications.`);
    insights.push(`<strong>BIC (Bayesian Information Criterion):</strong> ${results.bic.toFixed(2)}. Penalizes model complexity more heavily than AIC, favoring simpler models.`);
    insights.push(`<strong>HQIC (Hannan-Quinn IC):</strong> ${results.hqic.toFixed(2)}. Another criterion for model selection, striking a balance between AIC and BIC.`);
    
    // Forecast insights
    if (results.forecast && results.forecast.length > 0) {
        const firstForecast = results.forecast[0].mean;
        const lastForecast = results.forecast[results.forecast.length - 1].mean;
        const trend = lastForecast > firstForecast ? 'upward' : lastForecast < firstForecast ? 'downward' : 'stable';
        insights.push(`<strong>Forecast Trend:</strong> The ${results.forecast.length}-period forecast shows a ${trend} trajectory. The first forecast value is ${firstForecast.toFixed(2)} and the final value is ${lastForecast.toFixed(2)}.`);
        insights.push(`<strong>Confidence Intervals:</strong> The shaded area in the forecast plot represents 95% confidence bounds. Wider intervals indicate greater forecast uncertainty.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (modelType === 'ar' || modelType === 'ma') {
        recommendations = 'Your simple model may be suitable for basic patterns. If residual diagnostics show remaining autocorrelation, consider upgrading to ARMA or ARIMA. Check the diagnostic plots for: (1) Normality of residuals (Q-Q plot), (2) No remaining autocorrelation (ACF plot), (3) Homoscedasticity (standardized residuals). Compare AIC/BIC values with alternative models to find the best specification.';
    } else if (modelType === 'arima') {
        recommendations = 'Validate your model by checking: (1) Residual diagnostics plots - residuals should resemble white noise, (2) Ljung-Box test - p-value > 0.05 indicates good fit, (3) Forecast accuracy - compare predictions with holdout data if available. If the model shows deficiencies, try: adjusting p, d, q parameters, adding seasonal components (SARIMA), or including exogenous variables (ARIMAX).';
    } else if (modelType === 'sarima') {
        recommendations = 'Your seasonal model captures periodic patterns. Ensure the seasonal period is correctly specified. Validate by: (1) Checking if seasonal patterns are removed in residuals, (2) Comparing forecasts with known seasonal behavior, (3) Testing alternative seasonal orders. If performance is suboptimal, consider: different seasonal periods, Box-Cox transformation for non-constant variance, or additional exogenous variables.';
    } else {
        recommendations = 'Review the model diagnostics to ensure assumptions are met. Focus on: residual independence (ACF plot), normality (Q-Q plot), and constant variance. Use the information criteria to compare with alternative specifications. Monitor forecast performance and update the model periodically as new data becomes available. Consider ensemble methods if single model performance is insufficient.';
    }
    
    return {
        overall_analysis: overall,
        model_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const arimaExample = exampleDatasets.find(d => d.id === 'time-series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <AreaChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">ARIMA Models</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Powerful autoregressive models for time series forecasting
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">AR/MA/ARMA</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Basic autoregressive models
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">ARIMA</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Integrated model with differencing
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">SARIMA/ARIMAX</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Seasonal and exogenous extensions
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use ARIMA Models
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            ARIMA models are the gold standard for univariate time series forecasting. Use them when 
                            you need to predict future values based on past observations and patterns. The model family 
                            ranges from simple AR/MA models to complex SARIMA with seasonal components. Choose the 
                            appropriate variant based on your data characteristics: stationarity, trend, and seasonality.
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
                                        <span><strong>Value Column:</strong> Numeric metric to forecast</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Model Order:</strong> p, d, q parameters</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Points:</strong> 50+ recommended</span>
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
                                        <span><strong>Forecast Plot:</strong> Predictions with confidence bands</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>AIC/BIC:</strong> Compare model specifications</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Diagnostics:</strong> Validate model assumptions</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Residuals:</strong> Should resemble white noise</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {arimaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(arimaExample)} size="lg">
                                <AreaChart className="mr-2 h-5 w-5" />
                                Load Time Series Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ArimaPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function ArimaPage({ data, allHeaders, onLoadExample, onGenerateReport }: ArimaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
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
            
            // Generate interpretations
            const interpretations = generateArimaInterpretations(result.results, modelType, p, d, q);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, p, d, q, modelType, P, D, Q, s, exogCols, forecastPeriods, toast]);
    
    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const forecastData = analysisResult.results.forecast.map(f => ({
            forecast_date: f.forecast_date,
            forecast_mean: f.mean,
            ci_lower: f.mean_ci_lower,
            ci_upper: f.mean_ci_upper
        }));
        
        const csv = Papa.unparse(forecastData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'arima_forecast_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Forecast results are being downloaded." });
    }, [analysisResult, toast]);

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

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Autoregressive Model Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Configure the parameters for the selected time series model.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
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
                    
                    {/* Analysis Overview */}
                    <ArimaOverview 
                        timeCol={timeCol}
                        valueCol={valueCol}
                        modelType={modelType}
                        p={p}
                        d={d}
                        q={q}
                        forecastPeriods={forecastPeriods}
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
                                    Export Forecast
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
                        <p className="text-muted-foreground">Fitting ARIMA model and generating forecasts...</p>
                        <Skeleton className="h-[600px] w-full" />
                    </CardContent>
                </Card>
            )}
            
            {analysisResult && results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} modelType={modelType} />

                    {/* Interpretation */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="font-headline">Interpretation</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <strong className="text-foreground">Overall Analysis:</strong>
                                        <p className="text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }} />
                                    </div>
                                    <div>
                                        <strong className="text-foreground">Recommendations:</strong>
                                        <p className="text-muted-foreground mt-1">
                                            {analysisResult.interpretations?.recommendations}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Information Criteria</CardTitle>
                                    <CardDescription>
                                        Model fit metrics for comparison and validation.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-muted rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">AIC</p>
                                            <p className="text-2xl font-bold font-mono">{results.aic.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Akaike IC</p>
                                        </div>
                                        <div className="p-4 bg-muted rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">BIC</p>
                                            <p className="text-2xl font-bold font-mono">{results.bic.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Bayesian IC</p>
                                        </div>
                                        <div className="p-4 bg-muted rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">HQIC</p>
                                            <p className="text-2xl font-bold font-mono">{results.hqic.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Hannan-Quinn IC</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4">
                                        Lower values indicate better model fit. Use these criteria to compare different model specifications.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Model Insights */}
                    {analysisResult.interpretations?.model_insights && analysisResult.interpretations.model_insights.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Model Insights</CardTitle>
                                <CardDescription>Detailed analysis of model parameters and forecast quality.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysisResult.interpretations.model_insights.map((insight, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Forecast Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Forecast</CardTitle>
                            <CardDescription>
                                Time series forecast with 95% confidence intervals. The shaded area represents forecast uncertainty.
                            </CardDescription>
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

                    {/* Model Summary Tables */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Summary</CardTitle>
                            <CardDescription>Detailed parameter estimates and statistical tests.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {results.summary_data?.map((table, tableIndex) => (
                                <Table key={tableIndex}>
                                    {table.caption && <TableCaption>{table.caption}</TableCaption>}
                                    <TableHeader>
                                        <TableRow>
                                            {table.data[0].map((cell, cellIndex) => <TableHead key={cellIndex}>{cell}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {table.data.slice(1).map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                {row.map((cell, cellIndex) => <TableCell key={cellIndex} className="font-mono text-sm">{cell}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Diagnostics Plot */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Diagnostics</CardTitle>
                            <CardDescription>
                                Diagnostic plots to assess model performance: standardized residuals, histogram, Q-Q plot, and correlogram.
                            </CardDescription>
                        </CardHeader>
                         <CardContent>
                            <Image src={analysisResult.diagnostics_plot!} alt="ARIMA Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <AreaChart className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure model parameters and click &apos;Run Analysis&apos; to generate forecasts.</p>
                </div>
            )}
        </div>
    );
}
