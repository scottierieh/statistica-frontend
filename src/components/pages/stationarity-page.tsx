'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sigma, Loader2, AreaChart, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, LineChart as LineChartIcon, BookOpen, Activity, Bot, Download, TrendingUp, GitBranch, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

interface TestResult {
    adf_statistic: number;
    adf_p_value: number;
    kpss_statistic: number;
    kpss_p_value: number;
}

interface AnalysisSection {
    test_results: TestResult;
    plot: string;
}

interface StationarityResults {
    original: AnalysisSection;
    first_difference: AnalysisSection | null;
    seasonal_difference: AnalysisSection | null;
    interpretations?: {
        overall_analysis: string;
        test_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: StationarityResults }) => {
    const originalAdfStationary = results.original.test_results.adf_p_value <= 0.05;
    const originalKpssStationary = results.original.test_results.kpss_p_value > 0.05;
    const firstDiffAdfStationary = results.first_difference?.test_results.adf_p_value ? results.first_difference.test_results.adf_p_value <= 0.05 : false;
    const seasonalDiffAdfStationary = results.seasonal_difference?.test_results.adf_p_value ? results.seasonal_difference.test_results.adf_p_value <= 0.05 : false;
    
    const getStationarityStatus = (adfStat: boolean, kpssStat: boolean) => {
        if (adfStat && kpssStat) return 'Stationary';
        if (!adfStat && !kpssStat) return 'Non-Stationary';
        if (adfStat && !kpssStat) return 'Trend-Stationary';
        return 'Unit Root';
    };

    const originalStatus = getStationarityStatus(originalAdfStationary, originalKpssStationary);
    const needsDifferencing = originalStatus !== 'Stationary';
    const differencingOrder = needsDifferencing ? (firstDiffAdfStationary ? 1 : seasonalDiffAdfStationary ? 1 : 2) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Original Series Status Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Original Series
                            </p>
                            {originalStatus === 'Stationary' ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {originalStatus}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            ADF p={results.original.test_results.adf_p_value.toFixed(3)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Differencing Order Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Diff Order (d)
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {differencingOrder}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {differencingOrder === 0 ? 'No differencing needed' : 'Suggested for ARIMA'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* First Difference Status Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                First Diff
                            </p>
                            {firstDiffAdfStationary ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.first_difference ? (firstDiffAdfStationary ? 'Stationary' : 'Non-Stat') : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.first_difference ? `ADF p=${results.first_difference.test_results.adf_p_value.toFixed(3)}` : 'Not tested'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Seasonal Difference Status Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Seasonal Diff
                            </p>
                            {seasonalDiffAdfStationary ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <GitBranch className="h-4 w-4 text-muted-foreground" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.seasonal_difference ? (seasonalDiffAdfStationary ? 'Stationary' : 'Non-Stat') : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.seasonal_difference ? `ADF p=${results.seasonal_difference.test_results.adf_p_value.toFixed(3)}` : 'Not tested'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const StationarityOverview = ({ timeCol, valueCol, period, data }: any) => {
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
        overview.push(`Seasonal period: ${period} (for seasonal differencing)`);

        // Data characteristics
        if (data.length < 30) {
            overview.push(`⚠ Limited data (${data.length} points) - tests may be less reliable`);
        } else {
            overview.push(`${data.length} data points available`);
        }

        // Test information
        overview.push('ADF Test: Null hypothesis = series has unit root (non-stationary)');
        overview.push('KPSS Test: Null hypothesis = series is stationary');
        overview.push('Combined interpretation provides robust assessment');
        overview.push('Tests original, first difference, and seasonal difference');
        overview.push('Best for: ARIMA parameter selection, model validation');

        return overview;
    }, [timeCol, valueCol, period, data]);

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

// Generate interpretations based on stationarity results
const generateStationarityInterpretations = (results: StationarityResults) => {
    const insights: string[] = [];
    
    // Analyze original series
    const origAdfStat = results.original.test_results.adf_p_value <= 0.05;
    const origKpssStat = results.original.test_results.kpss_p_value > 0.05;
    
    let overall = '';
    if (origAdfStat && origKpssStat) {
        overall = '<strong>Series is already stationary.</strong> No differencing required. The data shows constant mean and variance over time, suitable for direct ARMA modeling.';
    } else if (!origAdfStat && !origKpssStat) {
        overall = '<strong>Series is clearly non-stationary.</strong> Both tests confirm the presence of trends or changing variance. Differencing is required before modeling.';
    } else if (origAdfStat && !origKpssStat) {
        overall = '<strong>Series is trend-stationary (difference-stationary).</strong> ADF rejects unit root but KPSS detects deterministic trend. Consider detrending or differencing.';
    } else {
        overall = '<strong>Series has unit root non-stationarity.</strong> ADF fails to reject unit root while KPSS suggests level stationarity. Differencing recommended.';
    }
    
    // Test insights
    insights.push(`<strong>ADF Test (Original):</strong> Statistic = ${results.original.test_results.adf_statistic.toFixed(3)}, p-value = ${results.original.test_results.adf_p_value.toFixed(3)}. ${origAdfStat ? 'Rejects unit root hypothesis.' : 'Cannot reject unit root (non-stationary).'}`);
    
    insights.push(`<strong>KPSS Test (Original):</strong> Statistic = ${results.original.test_results.kpss_statistic.toFixed(3)}, p-value = ${results.original.test_results.kpss_p_value.toFixed(3)}. ${origKpssStat ? 'Cannot reject stationarity.' : 'Rejects stationarity hypothesis.'}`);
    
    // First difference results
    if (results.first_difference) {
        const firstDiffAdfStat = results.first_difference.test_results.adf_p_value <= 0.05;
        const firstDiffKpssStat = results.first_difference.test_results.kpss_p_value > 0.05;
        
        if (firstDiffAdfStat && firstDiffKpssStat) {
            insights.push('<strong>First Difference:</strong> Achieves stationarity. Use d=1 in ARIMA models.');
        } else if (firstDiffAdfStat) {
            insights.push('<strong>First Difference:</strong> ADF suggests stationarity but KPSS shows some remaining non-stationarity.');
        } else {
            insights.push('<strong>First Difference:</strong> Still non-stationary. May need second differencing or transformation.');
        }
    }
    
    // Seasonal difference results
    if (results.seasonal_difference) {
        const seasonalDiffAdfStat = results.seasonal_difference.test_results.adf_p_value <= 0.05;
        
        if (seasonalDiffAdfStat) {
            insights.push('<strong>Seasonal Difference:</strong> Removes seasonal non-stationarity. Consider SARIMA models.');
        } else {
            insights.push('<strong>Seasonal Difference:</strong> Seasonal pattern persists. May need combined differencing.');
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (origAdfStat && origKpssStat) {
        recommendations = 'Proceed with ARMA(p,q) modeling without differencing. Use ACF/PACF plots to identify p and q parameters.';
    } else if (results.first_difference && results.first_difference.test_results.adf_p_value <= 0.05) {
        recommendations = 'Use ARIMA(p,1,q) with first differencing. The d=1 parameter handles the non-stationarity.';
    } else if (results.seasonal_difference && results.seasonal_difference.test_results.adf_p_value <= 0.05) {
        recommendations = 'Consider SARIMA models with seasonal differencing. Include both regular and seasonal components.';
    } else {
        recommendations = 'Series requires transformation or multiple differencing. Consider log transformation or d=2 in ARIMA.';
    }
    
    return {
        overall_analysis: overall,
        test_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const stationarityExample = exampleDatasets.find(d => d.id === 'time-series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <LineChartIcon className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Stationarity Tests</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test if your time series has constant statistical properties over time
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <CheckCircle2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">ADF Test</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Unit root detection
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <AlertTriangle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">KPSS Test</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Trend stationarity check
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Differencing</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Transform to stationary
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Stationarity Tests
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use stationarity tests before building ARIMA models or other time series forecasts. 
                            Non-stationary data can lead to spurious results and unreliable predictions. 
                            These tests help determine if differencing is needed and what order (d parameter) 
                            to use in your models.
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
                                        <span><strong>Period:</strong> Seasonal cycle</span>
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
                                        <span><strong>ADF p&lt;0.05:</strong> Stationary</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>KPSS p&gt;0.05:</strong> Stationary</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Both agree:</strong> Clear conclusion</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Disagree:</strong> Check trend type</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {stationarityExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(stationarityExample)} size="lg">
                                <LineChartIcon className="mr-2 h-5 w-5" />
                                Load Time Series Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface StationarityPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function StationarityPage({ data, allHeaders, onLoadExample, onGenerateReport }: StationarityPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [period, setPeriod] = useState(12);
    
    const [analysisResult, setAnalysisResult] = useState<StationarityResults | null>(null);
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

            const result: StationarityResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Generate interpretations
            const interpretations = generateStationarityInterpretations(result);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Stationarity Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, timeCol, valueCol, period, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Test results are not available." });
            return;
        }
        
        const testData = [
            {
                series: 'Original',
                adf_statistic: analysisResult.original.test_results.adf_statistic,
                adf_p_value: analysisResult.original.test_results.adf_p_value,
                kpss_statistic: analysisResult.original.test_results.kpss_statistic,
                kpss_p_value: analysisResult.original.test_results.kpss_p_value
            }
        ];
        
        if (analysisResult.first_difference) {
            testData.push({
                series: 'First Difference',
                ...analysisResult.first_difference.test_results
            });
        }
        
        if (analysisResult.seasonal_difference) {
            testData.push({
                series: 'Seasonal Difference',
                ...analysisResult.seasonal_difference.test_results
            });
        }
        
        const csv = Papa.unparse(testData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'stationarity_test_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Test results are being downloaded." });
    }, [analysisResult, toast]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;

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
                                    {allHeaders.filter(h => h !== timeCol).map(h => 
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Seasonal Period</Label>
                            <Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} min={1} />
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <StationarityOverview 
                        timeCol={timeCol}
                        valueCol={valueCol}
                        period={period}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(results, null)}>
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
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Testing...</> : <><Sigma className="mr-2"/>Run Tests</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running stationarity tests...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Overall stationarity assessment and ARIMA recommendations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <LineChartIcon className="h-4 w-4" />
                                <AlertTitle>Stationarity Overview</AlertTitle>
                                <AlertDescription className="text-sm">
                                    <div dangerouslySetInnerHTML={{ __html: results.interpretations?.overall_analysis || '' }} />
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
                                        <LineChartIcon className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Stationarity Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: results.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Test Insights */}
                            {results.interpretations?.test_insights && results.interpretations.test_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Test Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {results.interpretations.test_insights.map((insight, idx) => (
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
                                        <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Modeling Recommendations</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                >
                                    {results.interpretations?.recommendations}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Time Series Visualizations */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Time Series Visualizations</CardTitle>
                            <CardDescription>Original and differenced series plots for visual inspection</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                        <LineChartIcon className="h-4 w-4 text-primary" />
                                        Original Series
                                    </h3>
                                    <Image src={results.original.plot} alt="Original Series Plot" width={1200} height={600} className="w-full rounded-md border"/>
                                </div>
                                {results.first_difference && (
                                    <div>
                                        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                            First Difference
                                        </h3>
                                        <Image src={results.first_difference.plot} alt="First Difference Plot" width={1200} height={600} className="w-full rounded-md border"/>
                                    </div>
                                )}
                                {results.seasonal_difference && (
                                    <div>
                                        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                            <GitBranch className="h-4 w-4 text-primary" />
                                            Seasonal Difference (period={period})
                                        </h3>
                                        <Image src={results.seasonal_difference.plot} alt="Seasonal Difference Plot" width={1200} height={600} className="w-full rounded-md border"/>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Test Statistics Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Test Statistics</CardTitle>
                            <CardDescription>Complete stationarity test results for all series transformations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Series</TableHead>
                                        <TableHead className="text-right">ADF Statistic</TableHead>
                                        <TableHead className="text-right">ADF p-value</TableHead>
                                        <TableHead>ADF Result</TableHead>
                                        <TableHead className="text-right">KPSS Statistic</TableHead>
                                        <TableHead className="text-right">KPSS p-value</TableHead>
                                        <TableHead>KPSS Result</TableHead>
                                        <TableHead className="text-center">Decision</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Original Series */}
                                    <TableRow>
                                        <TableCell className="font-medium">Original</TableCell>
                                        <TableCell className="font-mono text-right">{results.original.test_results.adf_statistic.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">
                                            {results.original.test_results.adf_p_value < 0.001 ? '<0.001' : results.original.test_results.adf_p_value.toFixed(3)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={results.original.test_results.adf_p_value <= 0.05 ? "default" : "destructive"}>
                                                {results.original.test_results.adf_p_value <= 0.05 ? "Stationary" : "Non-Stationary"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-right">{results.original.test_results.kpss_statistic.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">
                                            {results.original.test_results.kpss_p_value < 0.001 ? '<0.001' : results.original.test_results.kpss_p_value.toFixed(3)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={results.original.test_results.kpss_p_value > 0.05 ? "default" : "destructive"}>
                                                {results.original.test_results.kpss_p_value > 0.05 ? "Stationary" : "Non-Stationary"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={
                                                (results.original.test_results.adf_p_value <= 0.05 && results.original.test_results.kpss_p_value > 0.05) ? "default" : "secondary"
                                            }>
                                                {(results.original.test_results.adf_p_value <= 0.05 && results.original.test_results.kpss_p_value > 0.05) ? "Stationary" : 
                                                 (!results.original.test_results.adf_p_value || results.original.test_results.adf_p_value > 0.05) && 
                                                 (!results.original.test_results.kpss_p_value || results.original.test_results.kpss_p_value <= 0.05) ? "Non-Stationary" : "Mixed"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    
                                    {/* First Difference */}
                                    {results.first_difference && (
                                        <TableRow>
                                            <TableCell className="font-medium">First Difference</TableCell>
                                            <TableCell className="font-mono text-right">{results.first_difference.test_results.adf_statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.first_difference.test_results.adf_p_value < 0.001 ? '<0.001' : results.first_difference.test_results.adf_p_value.toFixed(3)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={results.first_difference.test_results.adf_p_value <= 0.05 ? "default" : "destructive"}>
                                                    {results.first_difference.test_results.adf_p_value <= 0.05 ? "Stationary" : "Non-Stationary"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-right">{results.first_difference.test_results.kpss_statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.first_difference.test_results.kpss_p_value < 0.001 ? '<0.001' : results.first_difference.test_results.kpss_p_value.toFixed(3)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={results.first_difference.test_results.kpss_p_value > 0.05 ? "default" : "destructive"}>
                                                    {results.first_difference.test_results.kpss_p_value > 0.05 ? "Stationary" : "Non-Stationary"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={
                                                    (results.first_difference.test_results.adf_p_value <= 0.05 && results.first_difference.test_results.kpss_p_value > 0.05) ? "default" : "secondary"
                                                }>
                                                    {(results.first_difference.test_results.adf_p_value <= 0.05 && results.first_difference.test_results.kpss_p_value > 0.05) ? "Stationary" : "Mixed"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    
                                    {/* Seasonal Difference */}
                                    {results.seasonal_difference && (
                                        <TableRow>
                                            <TableCell className="font-medium">Seasonal Diff (p={period})</TableCell>
                                            <TableCell className="font-mono text-right">{results.seasonal_difference.test_results.adf_statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.seasonal_difference.test_results.adf_p_value < 0.001 ? '<0.001' : results.seasonal_difference.test_results.adf_p_value.toFixed(3)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={results.seasonal_difference.test_results.adf_p_value <= 0.05 ? "default" : "destructive"}>
                                                    {results.seasonal_difference.test_results.adf_p_value <= 0.05 ? "Stationary" : "Non-Stationary"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-right">{results.seasonal_difference.test_results.kpss_statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.seasonal_difference.test_results.kpss_p_value < 0.001 ? '<0.001' : results.seasonal_difference.test_results.kpss_p_value.toFixed(3)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={results.seasonal_difference.test_results.kpss_p_value > 0.05 ? "default" : "destructive"}>
                                                    {results.seasonal_difference.test_results.kpss_p_value > 0.05 ? "Stationary" : "Non-Stationary"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={
                                                    (results.seasonal_difference.test_results.adf_p_value <= 0.05 && results.seasonal_difference.test_results.kpss_p_value > 0.05) ? "default" : "secondary"
                                                }>
                                                    {(results.seasonal_difference.test_results.adf_p_value <= 0.05 && results.seasonal_difference.test_results.kpss_p_value > 0.05) ? "Stationary" : "Mixed"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                ADF Test: p-value &lt; 0.05 indicates stationarity (reject unit root) | KPSS Test: p-value &gt; 0.05 indicates stationarity (cannot reject null)
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <LineChartIcon className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure parameters and click &apos;Run Tests&apos; to check stationarity.</p>
                </div>
            )}
        </div>
    );
}
