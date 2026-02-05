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
import { Loader2, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ArrowRight, BarChart3, Activity, TrendingUp, Waves } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Slider } from '../../ui/slider';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '../../ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';

// TypeScript Interfaces matching backend exactly
interface OverallStats {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
    skew: number;
    kurt: number;
}

interface RollingLatest {
    mean: number | null;
    std: number | null;
    min: number | null;
    max: number | null;
    zscore: number | null;
}

interface AnomaliesSummary {
    count: number;
    rate: number;
    high_count: number;
    low_count: number;
}

interface AnomalyDetail {
    index: number;
    value: number;
    zscore: number;
    rolling_mean: number | null;
    rolling_std: number | null;
    type: string;
}

interface RollingDataPoint {
    index: number;
    value: number;
    rolling_mean: number | null;
    rolling_std: number | null;
    zscore: number | null;
    ewm_mean: number | null;
}

interface Insight {
    type: string;
    title: string;
    description: string;
}

interface AnalysisResults {
    variable: string;
    summary: {
        n_observations: number;
        window: number;
        overall: OverallStats;
        rolling_latest: RollingLatest;
        anomalies: AnomaliesSummary;
    };
    anomaly_details: AnomalyDetail[];
    rolling_data: RollingDataPoint[];
    insights: Insight[];
    recommendations: string[];
    plots: {
        rolling_mean_std: string;
        statistics_panel: string;
        anomalies: string;
        ewm_comparison: string;
        trend: string;
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
    const tsExample = exampleDatasets.find(d => d.id === 'timeseries' || d.id === 'trend');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Rolling Statistics</CardTitle>
                    <CardDescription className="text-base mt-2">Moving window analysis and anomaly detection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Moving Averages</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">SMA & EWM smoothing</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Waves className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Volatility Bands</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Rolling std deviation</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <AlertTriangle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Anomalies</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Z-score detection</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            What You'll Get
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Rolling mean & std bands</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Anomaly detection</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>MA crossover & momentum</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• Numeric time series</li>
                                    <li>• Window ≤ data size</li>
                                    <li>• Sequential observations</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {tsExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(tsExample)} size="lg">
                                <Activity className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RollingStatisticsPageProps {
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

export default function RollingStatisticsPage({ data, allHeaders, onLoadExample }: RollingStatisticsPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [variable, setVariable] = useState<string | undefined>();
    const [window, setWindow] = useState(10);
    const [ewmSpan, setEwmSpan] = useState(10);
    const [anomalyThreshold, setAnomalyThreshold] = useState(2.0);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    const canRun = useMemo(() => data.length >= 10 && allHeaders.length >= 1, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => {
            const values = data.slice(0, 10).map(row => row[h]);
            return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''));
        });
    }, [data, allHeaders]);

    const validationChecks = useMemo(() => [
        { label: 'Variable selected', passed: !!variable, message: variable || 'Select a variable' },
        { label: 'Sufficient data', passed: data.length >= window, message: `${data.length} observations ${data.length >= window ? '✓' : `(need ≥${window})`}` },
        { label: 'Valid window', passed: window >= 2 && window <= 100, message: `Window: ${window}` },
    ], [variable, data.length, window]);

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
        const potentialVar = numericHeaders.find(h =>
            h.toLowerCase().includes('value') ||
            h.toLowerCase().includes('sales') ||
            h.toLowerCase().includes('price')
        ) || numericHeaders[0];

        setVariable(potentialVar);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Rolling_Statistics_${new Date().toISOString().split('T')[0]}.png`;
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
        const csv = Papa.unparse(analysisResult.rolling_data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Rolling_Statistics_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!variable) {
            toast({ variant: 'destructive', title: 'Error', description: 'Select a variable' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/rolling-statistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    variable,
                    window,
                    ewm_span: ewmSpan,
                    anomaly_threshold: anomalyThreshold
                })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json();
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: `${result.summary.anomalies.count} anomalies detected` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, variable, window, ewmSpan, anomalyThreshold, toast]);

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
                    <h1 className="text-2xl font-bold">Rolling Statistics</h1>
                    <p className="text-muted-foreground mt-1">Moving window analysis</p>
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
                                    <CardTitle>Select Variable</CardTitle>
                                    <CardDescription>Choose time series variable for rolling analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Time Series Variable</Label>
                                <Select value={variable} onValueChange={setVariable}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select variable..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Variable: <span className="font-semibold text-foreground">{variable || 'Not selected'}</span> |
                                    Data: <span className="font-semibold text-foreground">{data.length} observations</span>
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg" disabled={!variable}>
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
                                    <CardDescription>Configure window size and thresholds</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label>Window Size</Label>
                                    <Badge variant="outline">{window}</Badge>
                                </div>
                                <Slider
                                    value={[window]}
                                    onValueChange={(v) => setWindow(v[0])}
                                    min={2}
                                    max={Math.min(100, Math.floor(data.length / 2))}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Number of observations in rolling window
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label>EWM Span</Label>
                                    <Badge variant="outline">{ewmSpan}</Badge>
                                </div>
                                <Slider
                                    value={[ewmSpan]}
                                    onValueChange={(v) => setEwmSpan(v[0])}
                                    min={2}
                                    max={50}
                                    step={1}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label>Anomaly Threshold (σ)</Label>
                                    <Badge variant="outline">{anomalyThreshold.toFixed(1)}</Badge>
                                </div>
                                <Slider
                                    value={[anomalyThreshold * 10]}
                                    onValueChange={(v) => setAnomalyThreshold(v[0] / 10)}
                                    min={10}
                                    max={40}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Z-score threshold for anomaly detection
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
                                        className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}
                                    >
                                        {check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>
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
                    const hasAnomalies = results.summary.anomalies.count > 0;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Analysis Summary</CardTitle>
                                        <CardDescription>{results.summary.n_observations} observations, window {results.summary.window}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings */}
                                <div className={`rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-primary">•</span>
                                            <p className="text-sm">
                                                <strong>Anomalies:</strong> {results.summary.anomalies.count} detected 
                                                ({results.summary.anomalies.rate.toFixed(1)}% rate)
                                                {hasAnomalies && ` - ${results.summary.anomalies.high_count} high, ${results.summary.anomalies.low_count} low`}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-primary">•</span>
                                            <p className="text-sm">
                                                <strong>Rolling Mean:</strong> {results.summary.rolling_latest.mean?.toFixed(2) || 'N/A'} 
                                                (Overall: {results.summary.overall.mean.toFixed(2)})
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-primary">•</span>
                                            <p className="text-sm">
                                                <strong>Volatility:</strong> σ = {results.summary.rolling_latest.std?.toFixed(2) || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Line */}
                                <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-primary" />
                                        <div>
                                            <p className="font-semibold">
                                                {hasAnomalies ? "Anomalies Detected" : "Analysis Complete"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Rolling statistics computed with window size {results.summary.window}. 
                                                {hasAnomalies ? ` ${results.summary.anomalies.count} outliers exceed ±${anomalyThreshold}σ threshold.` : ' No anomalies detected.'}
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
                                        <p>• <strong>Mean:</strong> {results.summary.overall.mean.toFixed(2)} (median: {results.summary.overall.median.toFixed(2)})</p>
                                        <p>• <strong>Std Dev:</strong> {results.summary.overall.std.toFixed(2)}</p>
                                        <p>• <strong>Range:</strong> [{results.summary.overall.min.toFixed(2)}, {results.summary.overall.max.toFixed(2)}]</p>
                                        <p>• <strong>Skewness:</strong> {results.summary.overall.skew.toFixed(3)}</p>
                                    </div>
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
                                    <CardDescription>Understanding rolling statistics</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What are Rolling Statistics?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Moving window calculations compute statistics (mean, std) over a sliding window of {results.summary.window} observations.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Anomaly Detection</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Z-score method: Values exceeding ±{anomalyThreshold}σ from rolling mean are flagged. 
                                            Detected {results.summary.anomalies.count} anomal{results.summary.anomalies.count === 1 ? 'y' : 'ies'} ({results.summary.anomalies.rate.toFixed(1)}% rate).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Volatility Bands</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Rolling std = {results.summary.rolling_latest.std?.toFixed(2) || 'N/A'}. 
                                            Volatility bands (±2σ) capture approximately 95% of observations under normal distribution.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">EWM vs SMA</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Exponentially Weighted Mean gives more weight to recent observations (span={ewmSpan}), 
                                            while Simple Moving Average treats all points equally.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Rolling statistics analysis performed on {results.summary.n_observations} observations with window={results.summary.window}. 
                                    {results.summary.anomalies.count > 0 
                                        ? `${results.summary.anomalies.count} anomalies detected exceeding ±${anomalyThreshold}σ threshold.`
                                        : 'No anomalies detected - data within normal bounds.'}
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
                    const handleDownloadWord = () => {
                        const content = `Rolling Statistics Report\nGenerated: ${new Date().toLocaleString()}\n\nVariable: ${results.variable}\nWindow: ${results.summary.window}\nAnomalies: ${results.summary.anomalies.count}`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'rolling_statistics_report.doc';
                        a.click();
                        URL.revokeObjectURL(url);
                    };

                    return (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold">Rolling Statistics Results</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {results.variable} | Window {results.summary.window} | {results.summary.n_observations} observations
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            <Download className="mr-2 h-4 w-4" />Export
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
                                    <h2 className="text-2xl font-bold">Rolling Statistics Report</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {results.variable} | Window {results.summary.window} | {new Date().toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Mean</p>
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.summary.overall.mean.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">σ = {results.summary.overall.std.toFixed(2)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Rolling Mean</p>
                                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">
                                                    {results.summary.rolling_latest.mean?.toFixed(2) || 'N/A'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Latest (w={results.summary.window})</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Anomalies</p>
                                                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.summary.anomalies.count}</p>
                                                <p className="text-xs text-muted-foreground">{results.summary.anomalies.rate.toFixed(1)}% rate</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Window</p>
                                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.summary.window}</p>
                                                <p className="text-xs text-muted-foreground">{results.summary.n_observations} obs</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Detailed Analysis */}
                                <Card>
                                    <CardHeader><CardTitle>Statistical Summary</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <h3 className="font-semibold">Analysis Details</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    Rolling statistics were computed on <em>N</em> = {results.summary.n_observations} observations 
                                                    using a moving window of {results.summary.window} periods.
                                                </p>
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    The overall mean was <em>M</em> = {results.summary.overall.mean.toFixed(2)} 
                                                    (<em>SD</em> = {results.summary.overall.std.toFixed(2)}), 
                                                    with values ranging from {results.summary.overall.min.toFixed(2)} to {results.summary.overall.max.toFixed(2)}.
                                                </p>
                                                {results.summary.anomalies.count > 0 && (
                                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                                        Anomaly detection using rolling Z-scores identified {results.summary.anomalies.count} outlier{results.summary.anomalies.count > 1 ? 's' : ''} 
                                                        ({results.summary.anomalies.rate.toFixed(1)}% of observations) exceeding ±{anomalyThreshold}σ threshold, 
                                                        comprising {results.summary.anomalies.high_count} high and {results.summary.anomalies.low_count} low anomalies.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Visualizations */}
                                <Card>
                                    <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                                    <CardContent>
                                        <Tabs defaultValue="mean" className="w-full">
                                            <TabsList className="grid w-full grid-cols-5">
                                                <TabsTrigger value="mean">Mean & Bands</TabsTrigger>
                                                <TabsTrigger value="panel">Statistics</TabsTrigger>
                                                <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
                                                <TabsTrigger value="ewm">SMA vs EWM</TabsTrigger>
                                                <TabsTrigger value="trend">Trend</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="mean" className="mt-4">
                                                <Image
                                                    src={`data:image/png;base64,${results.plots.rolling_mean_std}`}
                                                    alt="Rolling Mean & Std Bands"
                                                    width={800}
                                                    height={400}
                                                    className="w-full rounded-md border"
                                                />
                                            </TabsContent>
                                            <TabsContent value="panel" className="mt-4">
                                                <Image
                                                    src={`data:image/png;base64,${results.plots.statistics_panel}`}
                                                    alt="Statistics Panel"
                                                    width={800}
                                                    height={600}
                                                    className="w-full rounded-md border"
                                                />
                                            </TabsContent>
                                            <TabsContent value="anomalies" className="mt-4">
                                                <Image
                                                    src={`data:image/png;base64,${results.plots.anomalies}`}
                                                    alt="Anomaly Detection"
                                                    width={800}
                                                    height={400}
                                                    className="w-full rounded-md border"
                                                />
                                            </TabsContent>
                                            <TabsContent value="ewm" className="mt-4">
                                                <Image
                                                    src={`data:image/png;base64,${results.plots.ewm_comparison}`}
                                                    alt="SMA vs EWM"
                                                    width={800}
                                                    height={400}
                                                    className="w-full rounded-md border"
                                                />
                                            </TabsContent>
                                            <TabsContent value="trend" className="mt-4">
                                                <Image
                                                    src={`data:image/png;base64,${results.plots.trend}`}
                                                    alt="Trend Analysis"
                                                    width={800}
                                                    height={600}
                                                    className="w-full rounded-md border"
                                                />
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>

                                {/* Anomalies Table */}
                                {results.anomaly_details && results.anomaly_details.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Detected Anomalies ({results.anomaly_details.length})</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[400px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Index</TableHead>
                                                            <TableHead className="text-right">Value</TableHead>
                                                            <TableHead className="text-right">Z-Score</TableHead>
                                                            <TableHead className="text-right">Rolling Mean</TableHead>
                                                            <TableHead>Type</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.anomaly_details.map((anom, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium">{anom.index}</TableCell>
                                                                <TableCell className="text-right font-mono">{anom.value.toFixed(2)}</TableCell>
                                                                <TableCell className="text-right font-mono">{anom.zscore.toFixed(2)}</TableCell>
                                                                <TableCell className="text-right font-mono">
                                                                    {anom.rolling_mean != null ? anom.rolling_mean.toFixed(2) : 'N/A'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={anom.type === 'high' ? 'default' : 'destructive'}>
                                                                        {anom.type}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
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
                            <p className="text-muted-foreground">Computing rolling statistics...</p>
                            <Skeleton className="h-[400px] w-full" />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

