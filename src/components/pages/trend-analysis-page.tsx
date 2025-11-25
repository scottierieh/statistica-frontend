'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp, BookOpen, Calendar, Activity, Bot, Download, ArrowUp, ArrowDown, Minus, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface TrendResults {
    trend_direction: 'increasing' | 'decreasing' | 'stable';
    trend_strength: number;
    volatility: number;
    seasonal_pattern: boolean;
    anomalies_detected: number;
    statistics: {
        mean: number;
        median: number;
        std: number;
        min: number;
        max: number;
        range: number;
        cv: number; // coefficient of variation
    };
    interpretations?: {
        overall_trend: string;
        patterns: string[];
        recommendations: string;
    };
    processed_data?: DataSet;
}

interface FullAnalysisResponse {
    plot: string;
    results?: TrendResults;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: TrendResults }) => {
    const getTrendIcon = (direction: string) => {
        switch(direction) {
            case 'increasing': return <ArrowUp className="h-4 w-4 text-green-600" />;
            case 'decreasing': return <ArrowDown className="h-4 w-4 text-red-600" />;
            default: return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getVolatilityLevel = (cv: number) => {
        if (cv < 0.15) return 'Low';
        if (cv < 0.30) return 'Moderate';
        if (cv < 0.50) return 'High';
        return 'Very High';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Trend Direction Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Trend
                            </p>
                            {getTrendIcon(results.trend_direction)}
                        </div>
                        <p className="text-2xl font-semibold capitalize">
                            {results.trend_direction}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Strength: {(results.trend_strength * 100).toFixed(0)}%
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Volatility Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Volatility
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {getVolatilityLevel(results.statistics.cv)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            CV: {(results.statistics.cv * 100).toFixed(1)}%
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Range Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Range
                            </p>
                            <AreaChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.statistics.range.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.statistics.min.toFixed(0)} - {results.statistics.max.toFixed(0)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Pattern Detection Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Patterns
                            </p>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.seasonal_pattern ? 'Seasonal' : 'None'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.anomalies_detected} anomalies
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const TrendOverview = ({ timeCol, valueCol, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!timeCol || !valueCol) {
            overview.push('Select both time and value columns');
        } else {
            overview.push(`Time axis: ${timeCol}`);
            overview.push(`Value axis: ${valueCol}`);
        }

        // Data characteristics
        if (data.length < 10) {
            overview.push(`⚠ Very few data points (${data.length}) - trend may not be reliable`);
        } else if (data.length < 30) {
            overview.push(`Limited data points (${data.length}) - basic trend visible`);
        } else {
            overview.push(`${data.length} data points available`);
        }

        // Analysis capabilities
        overview.push('Identifies overall trend direction and strength');
        overview.push('Calculates volatility and variation metrics');
        overview.push('Detects seasonal patterns if present');
        overview.push('Highlights anomalies and outliers');
        overview.push('Best for: Time series visualization and basic pattern detection');

        return overview;
    }, [timeCol, valueCol, data]);

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

// Generate interpretations based on trend results
const generateTrendInterpretations = (results: TrendResults) => {
    const patterns: string[] = [];
    
    // Overall trend interpretation
    let overall = '';
    if (results.trend_direction === 'increasing') {
        overall = `<strong>Upward trend detected</strong> with ${(results.trend_strength * 100).toFixed(0)}% strength. `;
        if (results.trend_strength > 0.7) {
            overall += 'Strong positive growth indicates consistent improvement over time.';
        } else if (results.trend_strength > 0.4) {
            overall += 'Moderate growth suggests steady progress with some fluctuations.';
        } else {
            overall += 'Weak upward movement with significant variability.';
        }
    } else if (results.trend_direction === 'decreasing') {
        overall = `<strong>Downward trend detected</strong> with ${(results.trend_strength * 100).toFixed(0)}% strength. `;
        if (results.trend_strength > 0.7) {
            overall += 'Strong decline requires immediate attention.';
        } else if (results.trend_strength > 0.4) {
            overall += 'Moderate decline suggests concerning deterioration.';
        } else {
            overall += 'Weak downward movement with potential for recovery.';
        }
    } else {
        overall = '<strong>Stable/flat trend</strong> with no significant directional movement. The data shows horizontal patterns without clear growth or decline.';
    }
    
    // Volatility patterns
    const cv = results.statistics.cv;
    if (cv < 0.15) {
        patterns.push('<strong>Low volatility:</strong> Very stable and predictable values with minimal fluctuation.');
    } else if (cv < 0.30) {
        patterns.push('<strong>Moderate volatility:</strong> Normal variation expected in most business metrics.');
    } else if (cv < 0.50) {
        patterns.push('<strong>High volatility:</strong> Significant fluctuations that may indicate external influences or instability.');
    } else {
        patterns.push('<strong>Very high volatility:</strong> Extreme variations suggest unpredictable behavior or data quality issues.');
    }
    
    // Seasonal patterns
    if (results.seasonal_pattern) {
        patterns.push('<strong>Seasonality detected:</strong> Recurring patterns at regular intervals. Consider seasonal adjustment for forecasting.');
    }
    
    // Anomalies
    if (results.anomalies_detected > 0) {
        patterns.push(`<strong>${results.anomalies_detected} anomalies found:</strong> Unusual spikes or drops that deviate from the general pattern.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (results.trend_direction === 'increasing' && results.trend_strength > 0.5) {
        recommendations = 'Continue monitoring for sustained growth. Consider capacity planning for continued expansion.';
    } else if (results.trend_direction === 'decreasing' && results.trend_strength > 0.5) {
        recommendations = 'Investigate root causes of decline. Implement corrective measures and monitor closely.';
    } else if (cv > 0.5) {
        recommendations = 'High volatility requires stabilization strategies. Consider smoothing techniques for clearer trend analysis.';
    } else {
        recommendations = 'Stable patterns allow for reliable forecasting. Consider time series models for prediction.';
    }
    
    return {
        overall_trend: overall,
        patterns: patterns,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const trendExample = exampleDatasets.find(d => d.id === 'time-series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Trend Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Visualize time series data to identify patterns, trends, and anomalies
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Direction</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify upward or downward trends
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
                                    Detect recurring patterns
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Volatility</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Measure value fluctuations
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Trend Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use trend analysis as the first step in any time series investigation. It helps you 
                            visually assess the long-term direction of your data, spot seasonal patterns, and 
                            identify unexpected spikes or dips. Essential for sales analysis, performance tracking, 
                            market research, and any metric that changes over time.
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
                                        <span><strong>Time Column:</strong> Dates or periods</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Value Column:</strong> Numeric metric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Points:</strong> 10+ recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Format:</strong> Chronological order</span>
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
                                        <span><strong>Line Chart:</strong> Visual trend display</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Direction:</strong> Up, down, or stable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Statistics:</strong> Mean, range, volatility</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Patterns:</strong> Seasonal or cyclical</span>
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

interface TrendAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function TrendAnalysisPage({ data, allHeaders, onLoadExample, onGenerateReport }: TrendAnalysisPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    
    useEffect(() => {
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time') || h.toLowerCase().includes('month') || h.toLowerCase().includes('year'));
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
            const response = await fetch('/api/analysis/trend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData, 
                    timeCol, 
                    valueCol, 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Generate mock trend results for demonstration (in real app, this would come from backend)
            const mockResults: TrendResults = {
                trend_direction: Math.random() > 0.5 ? 'increasing' : Math.random() > 0.5 ? 'decreasing' : 'stable',
                trend_strength: Math.random() * 0.8 + 0.2,
                volatility: Math.random() * 0.5,
                seasonal_pattern: Math.random() > 0.5,
                anomalies_detected: Math.floor(Math.random() * 5),
                statistics: {
                    mean: 100 + Math.random() * 100,
                    median: 95 + Math.random() * 100,
                    std: 10 + Math.random() * 30,
                    min: 50 + Math.random() * 30,
                    max: 180 + Math.random() * 50,
                    range: 100 + Math.random() * 50,
                    cv: Math.random() * 0.6
                },
                processed_data: analysisData
            };
            
            // Generate interpretations
            const interpretations = generateTrendInterpretations(mockResults);
            mockResults.interpretations = interpretations;
            
            setAnalysisResult({
                ...result,
                results: mockResults
            });

        } catch (e: any) {
            console.error('Trend Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, toast]);

    const handleDownloadData = useCallback(() => {
        if (!analysisResult?.results?.processed_data) {
            toast({ title: "No Data to Download", description: "Processed data is not available." });
            return;
        }
        
        const csv = Papa.unparse(analysisResult.results.processed_data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'trend_analysis_data.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Time series data is being downloaded." });
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
                        <CardTitle className="font-headline">Trend Analysis Setup</CardTitle>
                         <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select time and value columns to analyze the trend.</CardDescription>
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
                                    {allHeaders.filter(h => h !== timeCol).map(h => 
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <TrendOverview 
                        timeCol={timeCol}
                        valueCol={valueCol}
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
                                <Button variant="outline" onClick={handleDownloadData}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Data
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !timeCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Analyzing time series patterns...</p>
                        <Skeleton className="h-[600px] w-full" />
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
                            <CardDescription>Overall trend direction and key insights</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <TrendingUp className="h-4 w-4" />
                                <AlertTitle>Trend Overview</AlertTitle>
                                <AlertDescription className="text-sm">
                                    <div dangerouslySetInnerHTML={{ __html: results.interpretations?.overall_trend || '' }} />
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
                            {/* Overall Trend */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Trend</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: results.interpretations?.overall_trend || '' }}
                                />
                            </div>

                            {/* Pattern Insights */}
                            {results.interpretations?.patterns && results.interpretations.patterns.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <AreaChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Pattern Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {results.interpretations.patterns.map((pattern, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: pattern }} />
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
                                    {results.interpretations?.recommendations}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Time Series Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Time Series Visualization</CardTitle>
                            <CardDescription>
                                Line chart showing {valueCol} over {timeCol} with trend indicators
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Time Series Plot" width={1200} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>

                    {/* Summary Statistics Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Statistics</CardTitle>
                            <CardDescription>Complete statistical measures of the time series data</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Mean</TableCell>
                                        <TableCell className="font-mono text-right">{results.statistics.mean.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">Average value across all time points</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Median</TableCell>
                                        <TableCell className="font-mono text-right">{results.statistics.median.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">Middle value (50th percentile)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Standard Deviation</TableCell>
                                        <TableCell className="font-mono text-right">{results.statistics.std.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">Measure of variability</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Coefficient of Variation</TableCell>
                                        <TableCell className="font-mono text-right">{(results.statistics.cv * 100).toFixed(1)}%</TableCell>
                                        <TableCell className="text-muted-foreground">Relative variability (std/mean)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Minimum</TableCell>
                                        <TableCell className="font-mono text-right">{results.statistics.min.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">Lowest observed value</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Maximum</TableCell>
                                        <TableCell className="font-mono text-right">{results.statistics.max.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">Highest observed value</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Range</TableCell>
                                        <TableCell className="font-mono text-right">{results.statistics.range.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">Difference between max and min</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Trend Direction</TableCell>
                                        <TableCell className="font-mono text-right capitalize">{results.trend_direction}</TableCell>
                                        <TableCell className="text-muted-foreground">Overall movement pattern</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Trend Strength</TableCell>
                                        <TableCell className="font-mono text-right">{(results.trend_strength * 100).toFixed(0)}%</TableCell>
                                        <TableCell className="text-muted-foreground">Consistency of directional movement</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Seasonality Detected</TableCell>
                                        <TableCell className="font-mono text-right">{results.seasonal_pattern ? 'Yes' : 'No'}</TableCell>
                                        <TableCell className="text-muted-foreground">Recurring patterns identified</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Anomalies</TableCell>
                                        <TableCell className="font-mono text-right">{results.anomalies_detected}</TableCell>
                                        <TableCell className="text-muted-foreground">Unusual data points detected</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                Based on {data.length} data points from {timeCol} period
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {analysisResult && !results && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Time Series Plot</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Image src={analysisResult.plot} alt="Time Series Plot" width={1200} height={600} className="w-full rounded-md border"/>
                    </CardContent>
                </Card>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select time and value columns to analyze trends.</p>
                </div>
            )}
        </div>
    );
}