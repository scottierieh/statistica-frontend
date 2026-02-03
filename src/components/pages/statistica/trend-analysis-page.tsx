'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, TrendingUp, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, Activity, BarChart3, Code, Calendar, AlertCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// TypeScript Interfaces
interface OverviewResult {
    n_periods: number;
    total_change: number;
    start_value: number;
    end_value: number;
    min_value: number;
    max_value: number;
    mean_value: number;
    growth_rate: number;
    avg_change: number;
    volatility: number;
    trend_direction: string;
    trend_slope: number;
    trend_r_squared: number;
    trend_significant: boolean;
}

interface ComparisonResult {
    recent_changes: Array<{
        period: string;
        value: number;
        yoy: number | null;
        mom: number | null;
    }>;
    latest_yoy: number | null;
    latest_mom: number | null;
    avg_yoy: number | null;
    avg_mom: number | null;
    yoy_positive_rate: number | null;
    error?: string;
}

interface CorrelationResult {
    correlations: Array<{
        variable: string;
        correlation: number;
        p_value: number;
        significant: boolean;
    }>;
    strongest_positive: { variable: string; correlation: number; } | null;
    strongest_negative: { variable: string; correlation: number; } | null;
    error?: string;
}

interface AnomalyResult {
    n_anomalies: number;
    anomalies: Array<{
        period: string;
        value: number;
        deviation: number;
        type: string;
    }>;
    n_inflections: number;
    inflections: Array<{
        period: string;
        direction: string;
        change: number;
    }>;
    threshold: number;
    anomaly_rate: number;
}

interface ForecastResult {
    forecast_direction: string;
    forecast_growth: number;
    next_period_value: number;
    forecast_periods: Array<{
        period: string;
        forecast: number;
        lower: number;
        upper: number;
    }>;
    confidence: number;
    model_r_squared: number;
    recommendations: string[];
    error?: string;
}

interface KeyInsight {
    title: string;
    description: string;
    status: string; // 'positive', 'warning', 'neutral'
}

interface ReportSection {
    title: string;
    question: string;
    finding: string;
    detail: string;
}

interface AnalysisResults {
    success: boolean;
    results: {
        overview: OverviewResult;
        comparison: ComparisonResult;
        correlation?: CorrelationResult;
        anomaly: AnomalyResult;
        forecast: ForecastResult;
    };
    visualizations: {
        overview_chart: string;
        comparison_chart?: string;
        correlation_chart?: string;
        anomaly_chart: string;
        forecast_chart: string;
    };
    report: {
        step1_overview: ReportSection;
        step2_comparison: ReportSection;
        step3_correlation: ReportSection;
        step4_anomaly: ReportSection;
        step5_forecast: ReportSection;
    };
    key_insights: KeyInsight[];
    summary: {
        n_periods: number;
        overall_trend: string;
        growth_rate: number;
        n_anomalies: number;
        forecast_direction: string;
    };
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const trendExample = exampleDatasets.find(d => d.id === 'trend' || d.id === 'timeseries');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Trend & Change Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Comprehensive time series trend analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Trend direction & magnitude</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Period-by-period changes</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <AlertCircle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Anomalies</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Detect outliers & patterns</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            5-Step Analysis Framework
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h4 className="font-semibold text-sm mb-2">What You'll Get</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Trend direction & magnitude</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Period comparisons</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Anomaly detection</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Forecasting</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• Date/time column</li>
                                    <li>• Numeric value column</li>
                                    <li>• At least 6 periods</li>
                                    <li>• Optional: External variables for correlation</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {trendExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(trendExample)} size="lg">
                                <TrendingUp className="mr-2 h-5 w-5" />
                                Load Example Data
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
    numericHeaders?: string[];
    categoricalHeaders?: string[];
    onFileSelected?: (file: File) => void;
    isUploading?: boolean;
    activeAnalysis?: string;
    onAnalysisComplete?: (result: any) => void;
    fileName?: string;
    onClearData?: () => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
}

export default function TrendAnalysisPage({ data, allHeaders, onLoadExample }: TrendAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [dateCol, setDateCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [externalCols, setExternalCols] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    const canRun = useMemo(() => data.length >= 6 && allHeaders.length >= 2, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => {
            const values = data.slice(0, 10).map(row => row[h]);
            return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''));
        });
    }, [data, allHeaders]);

    const dateHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => {
            const val = data[0][h];
            return typeof val === 'string' && !isNaN(Date.parse(val));
        });
    }, [data, allHeaders]);

    const validationChecks = useMemo(() => [
        { label: 'Date column selected', passed: !!dateCol, message: dateCol || 'Select date column' },
        { label: 'Value column selected', passed: !!valueCol, message: valueCol || 'Select value column' },
        { label: 'Sufficient data', passed: data.length >= 6, message: `${data.length} periods ${data.length >= 6 ? '✓' : '(need ≥6)'}` },
    ], [dateCol, valueCol, data.length]);

    const allChecksPassed = validationChecks.every(c => c.passed);
    const goToStep = (step: Step) => {
        setCurrentStep(step);
        if (step > maxReachedStep) setMaxReachedStep(step);
    };
    const nextStep = () => {
        if (currentStep < 6) goToStep((currentStep + 1) as Step);
    };
    const prevStep = () => {
        if (currentStep > 1) goToStep((currentStep - 1) as Step);
    };

    useEffect(() => {
        const potentialDateCol = dateHeaders[0] || allHeaders.find(h =>
            h.toLowerCase().includes('date') ||
            h.toLowerCase().includes('time') ||
            h.toLowerCase().includes('year')
        );
        const potentialValueCol = numericHeaders.find(h =>
            h.toLowerCase().includes('value') ||
            h.toLowerCase().includes('sales') ||
            h.toLowerCase().includes('revenue') ||
            h !== potentialDateCol
        ) || numericHeaders[0];

        setDateCol(potentialDateCol);
        setValueCol(potentialValueCol);
        setExternalCols([]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, dateHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Trend_Analysis_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch {
            toast({ variant: 'destructive', title: "Download failed" });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const res = analysisResult.results;
        let csv = `TREND ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\n\nOVERVIEW\n`;
        csv += `Periods,${res.overview.n_periods}\nTotal Change,${res.overview.total_change.toFixed(2)}\nGrowth Rate,${res.overview.growth_rate.toFixed(2)}%\nTrend,${res.overview.trend_direction}\n\n`;
        
        if (res.comparison && res.comparison.recent_changes) {
            csv += `PERIOD COMPARISON\n`;
            csv += Papa.unparse(res.comparison.recent_changes.map((change) => ({
                period: change.period,
                value: change.value,
                yoy: change.yoy,
                mom: change.mom
            })));
        }
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Trend_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);
    

    const handleAnalysis = useCallback(async () => {
        if (!dateCol || !valueCol) {
            toast({ variant: 'destructive', title: 'Error', description: 'Select date and value columns' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/trend-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    date_col: dateCol,
                    value_col: valueCol,
                    external_cols: externalCols.length > 0 ? externalCols : null
                })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: `Analyzed ${result.results.overview.n_periods} periods` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dateCol, valueCol, externalCols, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep || (step.id >= 4 && !!analysisResult);
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
                    return (
                        <button
                            key={step.id}
                            onClick={() => isClickable && goToStep(step.id as Step)}
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 transition-all ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Trend & Change Analysis</h1>
                    <p className="text-muted-foreground mt-1">Time series trend analysis</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                    <BookOpen className="w-5 h-5" />
                </Button>
            </div>

            <ProgressBar />

            <div className="min-h-[500px]">
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose date and value columns</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Date Column</Label>
                                <Select value={dateCol} onValueChange={setDateCol}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select date column..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(dateHeaders.length > 0 ? dateHeaders : allHeaders).map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label>Value Column</Label>
                                <Select value={valueCol} onValueChange={setValueCol}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select value column..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label>External Variables (Optional - for correlation)</Label>
                                <ScrollArea className="h-32 border rounded-md p-3">
                                    <div className="space-y-2">
                                        {numericHeaders.filter(h => h !== valueCol).map(h => (
                                            <div key={h} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`ext-${h}`}
                                                    checked={externalCols.includes(h)}
                                                    onCheckedChange={(c) => {
                                                        if (c) setExternalCols(prev => [...prev, h]);
                                                        else setExternalCols(prev => prev.filter(x => x !== h));
                                                    }}
                                                />
                                                <label htmlFor={`ext-${h}`} className="text-sm font-medium cursor-pointer">
                                                    {h}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">
                                    Selected: {externalCols.length} external variable(s)
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Date: <span className="font-semibold text-foreground">{dateCol || 'Not selected'}</span> |
                                    Value: <span className="font-semibold text-foreground">{valueCol || 'Not selected'}</span> |
                                    Data: <span className="font-semibold text-foreground">{data.length} periods</span>
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg" disabled={!dateCol || !valueCol}>
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Analysis Settings</CardTitle>
                                    <CardDescription>Configure analysis parameters</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Date Column:</strong> {dateCol}</p>
                                    <p>• <strong className="text-foreground">Value Column:</strong> {valueCol}</p>
                                    <p>• <strong className="text-foreground">External Variables:</strong> {externalCols.length > 0 ? externalCols.join(', ') : 'None'}</p>
                                    <p>• <strong className="text-foreground">Periods:</strong> {data.length}</p>
                                </div>
                            </div>

                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />
                                    Analysis Steps
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    The analysis will include: (1) Overview & trend direction, (2) Period-by-period comparison,
                                    (3) Correlation with external variables, (4) Anomaly detection, (5) Forecasting.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking requirements</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {validationChecks.map((check, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'
                                            }`}
                                    >
                                        {check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'
                                                }`}>
                                                {check.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...
                                    </>
                                ) : (
                                    <>
                                        Run Analysis<ArrowRight className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (() => {
                    const overview = results.results.overview;
                    const isPositive = overview.trend_direction.toLowerCase().includes('up') || overview.growth_rate > 0;
                    const hasAnomalies = results.results.anomaly.n_anomalies > 0;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>{overview.n_periods} periods analyzed</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isPositive ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                                    }`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isPositive ? 'text-primary' : 'text-amber-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isPositive ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>Trend Direction:</strong> {overview.trend_direction}. Growth rate of{' '}
                                                <strong>{overview.growth_rate.toFixed(1)}%</strong> ({overview.trend_significant ? 'statistically significant' : 'not significant'})
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isPositive ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>Average Change:</strong> {overview.avg_change.toFixed(2)}% per period
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isPositive ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>Range:</strong> {overview.min_value.toFixed(2)} to {overview.max_value.toFixed(2)} (Mean: {overview.mean_value.toFixed(2)})
                                            </p>
                                        </div>
                                        {hasAnomalies && (
                                            <div className="flex items-start gap-3">
                                                <span className="font-bold text-amber-600">•</span>
                                                <p className="text-sm">
                                                    <strong>Anomalies Detected:</strong> {results.results.anomaly.n_anomalies} unusual period(s) ({results.results.anomaly.anomaly_rate.toFixed(1)}% rate)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Line */}
                                <div className={`rounded-xl p-5 border ${isPositive ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {isPositive ? (
                                            <CheckCircle2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">
                                                {isPositive ? "Positive Trend Detected!" : "Trend Analysis Complete"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {results.summary.overall_trend} trend with {results.summary.growth_rate.toFixed(1)}% growth rate over {results.summary.n_periods} periods.
                                                {results.summary.n_anomalies > 0 && ` ${results.summary.n_anomalies} anomalies detected.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Start Value:</strong> {overview.start_value.toFixed(2)}</p>
                                        <p>• <strong>End Value:</strong> {overview.end_value.toFixed(2)}</p>
                                        <p>• <strong>Mean:</strong> {overview.mean_value.toFixed(2)} ± {overview.volatility.toFixed(2)} (SD)</p>
                                        <p>• <strong>Trend R²:</strong> {overview.trend_r_squared.toFixed(3)} (Model fit)</p>
                                        {results.results.forecast && !results.results.forecast.error && (
                                            <p>• <strong>Next Period Forecast:</strong> {results.results.forecast.next_period_value.toFixed(2)} ({results.results.forecast.confidence.toFixed(0)}% confidence)</p>
                                        )}
                                    </div>
                                </div>

                                {/* Star Rating */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Trend Strength:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = Math.abs(overview.growth_rate) >= 50 ? 5 :
                                            Math.abs(overview.growth_rate) >= 30 ? 4 :
                                                Math.abs(overview.growth_rate) >= 15 ? 3 :
                                                    Math.abs(overview.growth_rate) >= 5 ? 2 : 1;
                                        return (
                                            <span
                                                key={star}
                                                className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                                            >
                                                ★
                                            </span>
                                        );
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">
                                    Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Why This Conclusion?</CardTitle>
                                    <CardDescription>Understanding trend analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {results.key_insights.map((insight, i) => (
                                <div
                                    key={i}
                                    className={`bg-muted/30 rounded-xl p-5 border ${
                                        insight.status === 'positive' ? 'border-green-200 bg-green-50/50 dark:bg-green-950/10' :
                                        insight.status === 'warning' ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10' :
                                        'border-muted'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                                            insight.status === 'positive' ? 'bg-green-600 text-white' :
                                            insight.status === 'warning' ? 'bg-amber-600 text-white' :
                                            'bg-primary text-primary-foreground'
                                        }`}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">{insight.title}</h4>
                                            <p className="text-sm text-muted-foreground">{insight.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* 5-Step Report Summary */}
                            {results.report && (
                                <div className="rounded-xl p-5 border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                        5-Step Analysis Summary
                                    </h4>
                                    <div className="space-y-3">
                                        {Object.values(results.report).map((section, i) => (
                                            <div key={i} className="pb-3 border-b border-blue-200 dark:border-blue-800 last:border-0">
                                                <p className="text-sm font-semibold text-foreground mb-1">{section.title}</p>
                                                <p className="text-xs text-muted-foreground italic mb-1">{section.question}</p>
                                                <p className="text-sm text-foreground font-medium">{section.finding}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bottom Line */}
                            <div className={`rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {results.summary.overall_trend} trend with {results.summary.growth_rate.toFixed(1)}% growth rate over {results.summary.n_periods} periods.
                                    {results.summary.n_anomalies > 0 && ` ${results.summary.n_anomalies} anomalies detected.`}
                                    {results.summary.forecast_direction !== 'N/A' && ` Forecast: ${results.summary.forecast_direction}.`}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                View Full Statistics<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 6: Statistics */}
                {currentStep === 6 && results && (() => {
                    const overview = results.results.overview;
                    const comparison = results.results.comparison;
                    const correlation = results.results.correlation;
                    const anomaly = results.results.anomaly;
                    const forecast = results.results.forecast;

                    const handleDownloadWord = () => {
                        const content = `Trend Analysis Report\nGenerated: ${new Date().toLocaleString()}\n\n${results.report}`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'trend_analysis_report.doc';
                        a.click();
                        URL.revokeObjectURL(url);
                    };

                    return (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold">Statistical Details</h2>
                                    <p className="text-sm text-muted-foreground">Full trend analysis report</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleDownloadCSV}>
                                            <FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                            PNG Image
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDownloadWord}>
                                            <FileText className="mr-2 h-4 w-4" />Word Document
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                                <div className="text-center py-4 border-b">
                                    <h2 className="text-2xl font-bold">Trend Analysis Report</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {valueCol} | {overview.n_periods} periods | {new Date().toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{overview.growth_rate.toFixed(1)}%</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {overview.trend_significant ? 'Significant' : 'Not significant'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Avg Change</p>
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{overview.avg_change.toFixed(2)}%</p>
                                                <p className="text-xs text-muted-foreground">Per period</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Anomalies</p>
                                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{anomaly.n_anomalies}</p>
                                                <p className="text-xs text-muted-foreground">{anomaly.anomaly_rate.toFixed(1)}% rate</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Model R²</p>
                                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{overview.trend_r_squared.toFixed(3)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {forecast && !forecast.error ? `Next: ${forecast.next_period_value.toFixed(1)}` : 'N/A'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Detailed Analysis */}
                                <Card>
                                    <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <h3 className="font-semibold">5-Step Statistical Summary</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {Object.values(results.report).map((section, i) => (
                                                    <div key={i} className="pb-3 border-b border-blue-200/50 dark:border-blue-800/50 last:border-0">
                                                        <p className="text-sm font-semibold text-foreground mb-1">{section.title}</p>
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 italic mb-2">{section.question}</p>
                                                        <p className="text-sm text-foreground leading-relaxed mb-1">{section.finding}</p>
                                                        {section.detail && (
                                                            <p className="text-xs text-muted-foreground leading-relaxed">{section.detail}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Visualizations */}
                                <Card>
                                    <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                                    <CardContent>
                                        <Tabs defaultValue="overview" className="w-full">
                                            <TabsList className="grid w-full grid-cols-5">
                                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                                                <TabsTrigger value="correlation">Correlation</TabsTrigger>
                                                <TabsTrigger value="anomaly">Anomaly</TabsTrigger>
                                                <TabsTrigger value="forecast">Forecast</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="overview" className="mt-4">
                                                {results.visualizations.overview_chart ? (
                                                    <Image
                                                        src={`data:image/png;base64,${results.visualizations.overview_chart}`}
                                                        alt="Overview"
                                                        width={800}
                                                        height={500}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No chart available</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="comparison" className="mt-4">
                                                {results.visualizations.comparison_chart ? (
                                                    <Image
                                                        src={`data:image/png;base64,${results.visualizations.comparison_chart}`}
                                                        alt="Comparison"
                                                        width={800}
                                                        height={500}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No comparison data</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="correlation" className="mt-4">
                                                {results.visualizations.correlation_chart ? (
                                                    <Image
                                                        src={`data:image/png;base64,${results.visualizations.correlation_chart}`}
                                                        alt="Correlation"
                                                        width={800}
                                                        height={500}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No external variables selected</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="anomaly" className="mt-4">
                                                {results.visualizations.anomaly_chart ? (
                                                    <Image
                                                        src={`data:image/png;base64,${results.visualizations.anomaly_chart}`}
                                                        alt="Anomaly"
                                                        width={800}
                                                        height={500}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No chart available</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="forecast" className="mt-4">
                                                {results.visualizations.forecast_chart ? (
                                                    <Image
                                                        src={`data:image/png;base64,${results.visualizations.forecast_chart}`}
                                                        alt="Forecast"
                                                        width={800}
                                                        height={500}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No chart available</p>
                                                )}
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>

                                {/* Period Comparison Table */}
                                {comparison && !comparison.error && comparison.recent_changes && (
                                    <Card>
                                        <CardHeader><CardTitle>Period Comparison</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="mb-4 grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Latest YoY</p>
                                                    <p className="text-lg font-semibold">
                                                        {comparison.latest_yoy !== null ? `${comparison.latest_yoy.toFixed(1)}%` : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Latest MoM</p>
                                                    <p className="text-lg font-semibold">
                                                        {comparison.latest_mom !== null ? `${comparison.latest_mom.toFixed(1)}%` : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">YoY Positive Rate</p>
                                                    <p className="text-lg font-semibold">
                                                        {comparison.yoy_positive_rate !== null ? `${comparison.yoy_positive_rate.toFixed(0)}%` : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ScrollArea className="h-[400px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Period</TableHead>
                                                            <TableHead className="text-right">Value</TableHead>
                                                            <TableHead className="text-right">YoY %</TableHead>
                                                            <TableHead className="text-right">MoM %</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {comparison.recent_changes.map((change, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium">{change.period}</TableCell>
                                                                <TableCell className="text-right font-mono">
                                                                    {change.value.toFixed(2)}
                                                                </TableCell>
                                                                <TableCell className="text-right font-mono">
                                                                    <span className={change.yoy !== null && change.yoy > 0 ? 'text-green-600' : change.yoy !== null && change.yoy < 0 ? 'text-red-600' : ''}>
                                                                        {change.yoy !== null ? `${change.yoy.toFixed(1)}%` : '-'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right font-mono">
                                                                    <span className={change.mom !== null && change.mom > 0 ? 'text-green-600' : change.mom !== null && change.mom < 0 ? 'text-red-600' : ''}>
                                                                        {change.mom !== null ? `${change.mom.toFixed(1)}%` : '-'}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Correlation Results */}
                                {correlation && correlation.correlations && correlation.correlations.length > 0 && (
                                    <Card>
                                        <CardHeader><CardTitle>Correlation Analysis</CardTitle></CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Variable</TableHead>
                                                        <TableHead className="text-right">Correlation</TableHead>
                                                        <TableHead className="text-right">p-value</TableHead>
                                                        <TableHead className="text-center">Significant</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {correlation.correlations.map((corr, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium">{corr.variable}</TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {corr.correlation.toFixed(3)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {corr.p_value < 0.001 ? '< .001' : corr.p_value.toFixed(3)}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {corr.significant ? (
                                                                    <Badge className="bg-green-600">Yes</Badge>
                                                                ) : (
                                                                    <Badge variant="outline">No</Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Anomalies */}
                                {anomaly.n_anomalies > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Detected Anomalies</CardTitle>
                                            <CardDescription>{anomaly.n_anomalies} anomalies found ({anomaly.anomaly_rate.toFixed(1)}% rate, threshold: ±{anomaly.threshold}σ)</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Period</TableHead>
                                                        <TableHead className="text-right">Value</TableHead>
                                                        <TableHead className="text-right">Z-Score</TableHead>
                                                        <TableHead>Type</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {anomaly.anomalies.map((anom, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium">{anom.period}</TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {anom.value.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {anom.deviation.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={anom.type === 'Spike' ? 'default' : 'destructive'}>
                                                                    {anom.type}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            {anomaly.n_inflections > 0 && anomaly.inflections && (
                                                <div className="mt-6">
                                                    <h4 className="font-semibold text-sm mb-3">Trend Inflection Points ({anomaly.n_inflections})</h4>
                                                    <div className="space-y-2">
                                                        {anomaly.inflections.map((inflection, i) => (
                                                            <div key={i} className="p-3 bg-muted/50 rounded-lg">
                                                                <p className="text-sm"><strong>{inflection.period}:</strong> {inflection.direction}</p>
                                                                <p className="text-xs text-muted-foreground">Change: {inflection.change.toFixed(1)}%</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Forecast Details */}
                                {forecast && !forecast.error && (
                                    <Card>
                                        <CardHeader><CardTitle>Forecast Model</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                    <p className="text-xs text-muted-foreground">Direction</p>
                                                    <p className="font-semibold">{forecast.forecast_direction}</p>
                                                </div>
                                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                    <p className="text-xs text-muted-foreground">R²</p>
                                                    <p className="font-semibold font-mono">{forecast.model_r_squared.toFixed(3)}</p>
                                                </div>
                                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                    <p className="text-xs text-muted-foreground">Growth</p>
                                                    <p className="font-semibold font-mono">{forecast.forecast_growth.toFixed(2)}%</p>
                                                </div>
                                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                    <p className="text-xs text-muted-foreground">Confidence</p>
                                                    <p className="font-semibold font-mono">{forecast.confidence.toFixed(0)}%</p>
                                                </div>
                                            </div>
                                            
                                            {forecast.forecast_periods && forecast.forecast_periods.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-sm font-semibold mb-2">Next 3 Periods</h4>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Period</TableHead>
                                                                <TableHead className="text-right">Forecast</TableHead>
                                                                <TableHead className="text-right">Lower 95% CI</TableHead>
                                                                <TableHead className="text-right">Upper 95% CI</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {forecast.forecast_periods.map((period, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-medium">{period.period}</TableCell>
                                                                    <TableCell className="text-right font-mono font-semibold">
                                                                        {period.forecast.toFixed(2)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-xs">
                                                                        {period.lower.toFixed(2)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-xs">
                                                                        {period.upper.toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                            
                                            {forecast.recommendations && forecast.recommendations.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                                                    <ul className="space-y-1">
                                                        {forecast.recommendations.map((rec, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            <div className="mt-4 flex justify-start">
                                <Button variant="ghost" onClick={prevStep}>
                                    <ChevronLeft className="mr-2 w-4 h-4" />Back
                                </Button>
                            </div>
                        </>
                    );
                })()}

                {isLoading && (
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Running trend analysis...</p>
                            <Skeleton className="h-[400px] w-full" />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
