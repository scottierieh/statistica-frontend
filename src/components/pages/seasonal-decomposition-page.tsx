'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, TableIcon, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp, BookOpen, Calendar, Activity, Bot, Download, Waves, GitBranch, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Alert, AlertDescription } from '../ui/alert';

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
    interpretations?: {
        overall_analysis: string;
        component_insights: string[];
        recommendations: string;
    };
}

interface FullAnalysisResponse {
    results: TrendResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: TrendResults }) => {
    const trendStrength = results.decomposition_summary?.find(c => c.component === 'Trend')?.strength || 0;
    const seasonalStrength = results.decomposition_summary?.find(c => c.component === 'Seasonal')?.strength || 0;
    const residualVariance = results.decomposition_summary?.find(c => c.component === 'Residual')?.variance_explained || 0;
    
    const getStrengthLevel = (strength: number) => {
        if (strength >= 0.8) return 'Very Strong';
        if (strength >= 0.6) return 'Strong';
        if (strength >= 0.4) return 'Moderate';
        if (strength >= 0.2) return 'Weak';
        return 'Very Weak';
    };

    const getNoiseLevel = (variance: number) => {
        if (variance < 10) return 'Very Low';
        if (variance < 20) return 'Low';
        if (variance < 30) return 'Moderate';
        return 'High';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Trend Strength Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Trend Strength
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(trendStrength * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getStrengthLevel(trendStrength)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Seasonal Strength Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Seasonality
                            </p>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(seasonalStrength * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getStrengthLevel(seasonalStrength)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Residual/Noise Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Noise Level
                            </p>
                            <Waves className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {residualVariance.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getNoiseLevel(residualVariance)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Total Variance Explained Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Pattern Quality
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(100 - residualVariance).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Variance explained
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const DecompositionOverview = ({ timeCol, valueCol, model, period, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!timeCol || !valueCol) {
            overview.push('Select both time and value columns');
        } else {
            overview.push(`Time axis: ${timeCol}`);
            overview.push(`Value axis: ${valueCol}`);
        }

        // Parameters
        overview.push(`Model type: ${model === 'additive' ? 'Additive (constant seasonal variation)' : 'Multiplicative (proportional seasonal variation)'}`);
        overview.push(`Period: ${period} (seasonal cycle length)`);

        // Data characteristics
        if (data.length < period * 2) {
            overview.push(`⚠ Limited data (${data.length} points) - need at least ${period * 2} for reliable decomposition`);
        } else {
            overview.push(`${data.length} data points (${Math.floor(data.length / period)} complete cycles)`);
        }

        // Analysis capabilities
        overview.push('Separates trend, seasonal, and residual components');
        overview.push('Identifies repeating patterns and cycles');
        overview.push('Isolates underlying trend from seasonal effects');
        overview.push('Best for: Forecasting, anomaly detection, seasonal adjustment');

        return overview;
    }, [timeCol, valueCol, model, period, data]);

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

// Generate interpretations based on decomposition results
const generateDecompositionInterpretations = (results: TrendResults) => {
    const insights: string[] = [];
    const trendStrength = results.decomposition_summary?.find(c => c.component === 'Trend')?.strength || 0;
    const seasonalStrength = results.decomposition_summary?.find(c => c.component === 'Seasonal')?.strength || 0;
    const residualVariance = results.decomposition_summary?.find(c => c.component === 'Residual')?.variance_explained || 0;
    
    // Overall analysis
    let overall = '';
    if (trendStrength >= 0.6 && seasonalStrength >= 0.6) {
        overall = '<strong>Strong trend and seasonality detected.</strong> The time series has clear directional movement with consistent seasonal patterns. This combination allows for reliable forecasting.';
    } else if (trendStrength >= 0.6) {
        overall = '<strong>Trend-dominated series.</strong> The data shows strong directional movement with ' + (seasonalStrength < 0.3 ? 'minimal' : 'moderate') + ' seasonal effects. Focus on trend analysis for insights.';
    } else if (seasonalStrength >= 0.6) {
        overall = '<strong>Seasonality-dominated series.</strong> Strong recurring patterns overshadow the trend. Seasonal adjustment is crucial for understanding underlying movement.';
    } else {
        overall = '<strong>Weak structural patterns.</strong> Neither trend nor seasonality strongly explain the variation. The series may be stationary or dominated by irregular factors.';
    }
    
    // Component insights
    if (trendStrength > 0) {
        insights.push(`<strong>Trend Component (${(trendStrength * 100).toFixed(0)}% strength):</strong> ${
            trendStrength >= 0.7 ? 'Very strong long-term direction indicates consistent growth or decline.' :
            trendStrength >= 0.4 ? 'Moderate trend suggests gradual changes over time.' :
            'Weak trend indicates relatively stable long-term behavior.'
        }`);
    }
    
    if (seasonalStrength > 0) {
        insights.push(`<strong>Seasonal Component (${(seasonalStrength * 100).toFixed(0)}% strength):</strong> ${
            seasonalStrength >= 0.7 ? 'Very strong seasonal patterns. Consider seasonal strategies and planning.' :
            seasonalStrength >= 0.4 ? 'Clear seasonal effects present. Account for these in forecasting.' :
            'Weak seasonality detected. May not significantly impact predictions.'
        }`);
    }
    
    insights.push(`<strong>Residual Component (${residualVariance.toFixed(1)}% of variance):</strong> ${
        residualVariance < 20 ? 'Low noise indicates highly predictable series with clear patterns.' :
        residualVariance < 40 ? 'Moderate noise level. Standard forecasting methods should work well.' :
        'High noise level suggests significant unpredictability or external factors.'
    }`);
    
    // Peak/trough months from seasonal pattern
    if (results.seasonal_pattern && results.seasonal_pattern.length > 0) {
        const peak = results.seasonal_pattern.reduce((max, p) => p.deviation > max.deviation ? p : max);
        const trough = results.seasonal_pattern.reduce((min, p) => p.deviation < min.deviation ? p : min);
        
        insights.push(`<strong>Seasonal Peaks:</strong> Highest in ${peak.month} (+${peak.deviation.toFixed(1)}%), lowest in ${trough.month} (${trough.deviation.toFixed(1)}%)`);
    }
    
    // Recommendations
    let recommendations = '';
    if (trendStrength >= 0.6 && seasonalStrength >= 0.6) {
        recommendations = 'Use SARIMA or Prophet models for forecasting. Apply seasonal adjustment for trend analysis. Plan for seasonal variations in capacity and resources.';
    } else if (trendStrength >= 0.6) {
        recommendations = 'Focus on trend extrapolation methods. Consider external factors driving the trend. Monitor for trend reversals or structural breaks.';
    } else if (seasonalStrength >= 0.6) {
        recommendations = 'Implement seasonal forecasting models. Adjust operations for seasonal peaks and troughs. Consider deseasonalized metrics for performance evaluation.';
    } else if (residualVariance > 40) {
        recommendations = 'Investigate external factors causing high variability. Consider more complex models or additional variables. Focus on short-term predictions.';
    } else {
        recommendations = 'Series appears stationary. Use simple moving averages or exponential smoothing. Monitor for emerging patterns or structural changes.';
    }
    
    return {
        overall_analysis: overall,
        component_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const trendExample = exampleDatasets.find(d => d.analysisTypes?.includes('seasonal-decomposition'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <AreaChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Seasonal Decomposition</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Separate time series into trend, seasonal, and residual components
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Trend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Long-term direction
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Calendar className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Seasonality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Recurring patterns
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Waves className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Residuals</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Random variation
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Seasonal Decomposition
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use seasonal decomposition to understand the underlying patterns in your time series data. 
                            By separating trend, seasonality, and residuals, you can gain deeper insights, make better 
                            forecasts, and identify anomalies more effectively. Essential for sales forecasting, 
                            demand planning, and any metric with cyclical patterns.
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
                                        <span><strong>Model:</strong> Additive or Multiplicative</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Period:</strong> Seasonal cycle length</span>
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
                                        <span><strong>Components:</strong> 3 separated series</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Strength:</strong> Component importance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variance:</strong> Explained variation</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Pattern:</strong> Monthly indices</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {trendExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(trendExample)} size="lg">
                                <Calendar className="mr-2 h-5 w-5" />
                                Load Time Series Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface SeasonalDecompositionPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function SeasonalDecompositionPage({ data, allHeaders, onLoadExample, onGenerateReport }: SeasonalDecompositionPageProps) {
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
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time') || h.toLowerCase().includes('month'));
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
            
            // Generate interpretations
            const interpretations = generateDecompositionInterpretations(result.results);
            
            setAnalysisResult({
                ...result,
                results: {
                    ...result.results,
                    interpretations
                }
            });

        } catch (e: any) {
            console.error('Seasonal Decomposition error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, model, period, toast]);

    const handleDownloadComponents = useCallback(() => {
        if (!analysisResult?.results) {
            toast({ title: "No Data to Download", description: "Decomposition results are not available." });
            return;
        }
        
        // Combine all components into one dataset
        const combinedData = analysisResult.results.trend.map((_, index) => ({
            index: index,
            trend: analysisResult.results.trend[index],
            seasonal: analysisResult.results.seasonal[index],
            residual: analysisResult.results.resid[index]
        }));
        
        const csv = Papa.unparse(combinedData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'decomposition_components.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Decomposition components are being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

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
                                    {allHeaders.filter(h => h !== timeCol).map(h => 
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Model Type</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="additive">Additive</SelectItem>
                                    <SelectItem value="multiplicative">Multiplicative</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Period (Seasonality)</Label>
                            <Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} min="2" />
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <DecompositionOverview 
                        timeCol={timeCol}
                        valueCol={valueCol}
                        model={model}
                        period={period}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(results, analysisResult?.plot || null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleDownloadComponents}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Components
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Decomposing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Decomposing time series components...</p>
                        <Skeleton className="h-[600px] w-full" />
                    </CardContent>
                </Card>
            )}

            {results && analysisResult?.plot && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Interpretation and Visualizations */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="font-headline">Interpretation</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                     <div>
                                        <strong className="text-foreground">Overall Analysis:</strong>
                                        <p className="text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: results.interpretations?.overall_analysis || '' }} />
                                    </div>
                                    <div>
                                        <strong className="text-foreground">Recommendations:</strong>
                                        <p className="text-muted-foreground mt-1">
                                            {results.interpretations?.recommendations}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Decomposition Visualization</CardTitle>
                                    <CardDescription>
                                        Original series separated into trend, seasonal, and residual components.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plot} alt="Time Series Decomposition Plot" width={1200} height={1000} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Component Insights */}
                    {results.interpretations?.component_insights && results.interpretations.component_insights.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Component Analysis</CardTitle>
                                <CardDescription>Detailed insights for each decomposed component.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {results.interpretations.component_insights.map((insight, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Seasonal Pattern Table */}
                    {results.seasonal_pattern && results.seasonal_pattern.length > 0 && (
                        <Card>
                             <CardHeader>
                                <CardTitle className="font-headline">Seasonal Pattern Analysis</CardTitle>
                                <CardDescription>Monthly seasonal indices showing typical variations from the trend.</CardDescription>
                             </CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Period</TableHead>
                                            <TableHead className="text-right">Seasonal Index</TableHead>
                                            <TableHead className="text-right">% Deviation</TableHead>
                                            <TableHead>Interpretation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.seasonal_pattern.map(item => {
                                            const getInterpretation = (deviation: number): string => {
                                                if (deviation > 10) return "Peak period";
                                                if (deviation > 5) return "Above average";
                                                if (deviation < -10) return "Trough period";
                                                if (deviation < -5) return "Below average";
                                                return "Near average";
                                            };
                                            
                                            return (
                                                <TableRow key={item.month}>
                                                    <TableCell className="font-medium">{item.month}</TableCell>
                                                    <TableCell className="text-right font-mono">{item.seasonal_index.toFixed(3)}</TableCell>
                                                    <TableCell className={`text-right font-mono ${item.deviation > 0 ? 'text-green-600' : item.deviation < 0 ? 'text-red-600' : ''}`}>
                                                        {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(1)}%
                                                    </TableCell>
                                                    <TableCell>{getInterpretation(item.deviation)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                             </CardContent>
                        </Card>
                    )}
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <AreaChart className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure parameters and click &apos;Run Analysis&apos; to decompose the time series.</p>
                </div>
            )}
        </div>
    );
}

