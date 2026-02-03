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
import { Loader2, TrendingUp, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ArrowRight, BarChart3, Activity, Calendar, Waves } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// TypeScript Interfaces
interface Insight {
    type: string;
    title: string;
    description: string;
}

interface SeasonalIndex {
    position: number;
    index: number;
}

interface PeriodResult {
    period: number;
    seasonal_strength: number;
    trend_strength: number | null;
    combined_strength?: number;
}

interface FourierComponent {
    frequency: number;
    amplitude: number;
    period: number;
}

interface AnalysisResults {
    variable: string;
    n_observations: number;
    period: number;
    seasonal_strength_index: number;
    trend_strength_index: number | null;
    dominant_period_detected: number | null;
    seasonal_indices: SeasonalIndex[];
    period_comparison: PeriodResult[];
    fourier_components: FourierComponent[];
    interpretation_summary: {
        seasonality: string;
        trend: string;
    };
    insights: Insight[];
    recommendations: string[];
    interpretation: string;
    plots: {
        decomposition: string;
        seasonal_pattern?: string;
        gauge?: string;
        periodogram?: string;
        strength_comparison?: string;
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
    const seasonalExample = exampleDatasets.find(d => d.id === 'seasonal' || d.id === 'timeseries');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Waves className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Seasonal Decomposition</CardTitle>
                    <CardDescription className="text-base mt-2">Decompose time series into trend, seasonal, and residual components</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Trend Component</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Long-term movement</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Calendar className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Seasonal Pattern</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Repeating cycles</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Residuals</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Random fluctuations</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            STL Decomposition
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h4 className="font-semibold text-sm mb-2">What You'll Get</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Trend component extraction</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Seasonal pattern identification</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Seasonal strength measurement</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Auto period detection</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• Numeric time series variable</li>
                                    <li>• At least 20 observations</li>
                                    <li>• Sequential data (evenly spaced)</li>
                                    <li>• Known or auto-detected period</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {seasonalExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(seasonalExample)} size="lg">
                                <Waves className="mr-2 h-5 w-5" />
                                Load Example Data
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

export default function SeasonalDecompositionPage({ data, allHeaders, onLoadExample }: SeasonalDecompositionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [variable, setVariable] = useState<string | undefined>();
    const [period, setPeriod] = useState(12);
    const [autoDetect, setAutoDetect] = useState(true);
    const [testPeriods, setTestPeriods] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    const canRun = useMemo(() => data.length >= 20 && allHeaders.length >= 1, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => {
            const values = data.slice(0, 10).map(row => row[h]);
            return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''));
        });
    }, [data, allHeaders]);

    const validationChecks = useMemo(() => [
        { label: 'Variable selected', passed: !!variable, message: variable || 'Select a variable' },
        { label: 'Sufficient data', passed: data.length >= 20, message: `${data.length} observations ${data.length >= 20 ? '✓' : '(need ≥20)'}` },
        { label: 'Valid period', passed: period >= 2 && period <= 52, message: `Period: ${period}` },
    ], [variable, data.length, period]);

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
            h.toLowerCase().includes('revenue')
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
            link.download = `Seasonal_Decomposition_${new Date().toISOString().split('T')[0]}.png`;
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
        let csv = `SEASONAL DECOMPOSITION REPORT\nGenerated,${new Date().toISOString()}\n\nVARIABLE,${analysisResult.variable}\n`;
        csv += `Observations,${analysisResult.n_observations}\nPeriod,${analysisResult.period}\n`;
        csv += `Seasonal Strength,${analysisResult.seasonal_strength_index.toFixed(3)}\n`;
        csv += `Trend Strength,${analysisResult.trend_strength_index?.toFixed(3) || 'N/A'}\n\n`;
        
        if (analysisResult.seasonal_indices.length > 0) {
            csv += `SEASONAL INDICES\n` + Papa.unparse(analysisResult.seasonal_indices);
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Seasonal_Decomposition_${new Date().toISOString().split('T')[0]}.csv`;
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
            const res = await fetch(`${FASTAPI_URL}/api/analysis/seasonal-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    variable,
                    period,
                    test_periods: testPeriods,
                    auto_detect: autoDetect
                })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: `Period: ${result.period}, SSI: ${result.seasonal_strength_index.toFixed(3)}` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, variable, period, testPeriods, autoDetect, toast]);

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
                    <h1 className="text-2xl font-bold">Seasonal Decomposition</h1>
                    <p className="text-muted-foreground mt-1">STL decomposition analysis</p>
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
                                    <CardDescription>Choose time series variable for decomposition</CardDescription>
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
                                    <CardTitle>Decomposition Settings</CardTitle>
                                    <CardDescription>Configure period and detection options</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="auto-detect"
                                    checked={autoDetect}
                                    onCheckedChange={(checked) => setAutoDetect(checked as boolean)}
                                />
                                <label
                                    htmlFor="auto-detect"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Auto-detect dominant period
                                </label>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label>Seasonal Period</Label>
                                    <Badge variant="outline">{period}</Badge>
                                </div>
                                <Slider
                                    value={[period]}
                                    onValueChange={(v) => setPeriod(v[0])}
                                    min={2}
                                    max={52}
                                    step={1}
                                    disabled={autoDetect}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Common periods: 4 (quarterly), 7 (weekly), 12 (monthly), 52 (weekly in year)
                                </p>
                            </div>

                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />
                                    About Period
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    The period represents the number of observations before the pattern repeats.
                                    If auto-detect is enabled, the algorithm will find the dominant frequency automatically.
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
                    const isStrongSeasonal = results.seasonal_strength_index > 0.7;
                    const hasStrongTrend = results.trend_strength_index !== null && results.trend_strength_index > 0.7;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Decomposition Summary</CardTitle>
                                        <CardDescription>{results.n_observations} observations, period {results.period}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isStrongSeasonal ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isStrongSeasonal ? 'text-primary' : 'text-amber-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isStrongSeasonal ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>Seasonal Strength:</strong> {results.seasonal_strength_index.toFixed(3)} ({results.interpretation_summary.seasonality})
                                            </p>
                                        </div>
                                        {results.trend_strength_index !== null && (
                                            <div className="flex items-start gap-3">
                                                <span className={`font-bold ${isStrongSeasonal ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                                <p className="text-sm">
                                                    <strong>Trend Strength:</strong> {results.trend_strength_index.toFixed(3)} ({results.interpretation_summary.trend})
                                                </p>
                                            </div>
                                        )}
                                        {results.dominant_period_detected && (
                                            <div className="flex items-start gap-3">
                                                <span className={`font-bold ${isStrongSeasonal ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                                <p className="text-sm">
                                                    <strong>Detected Period:</strong> {results.dominant_period_detected}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Line */}
                                <div className={`rounded-xl p-5 border ${isStrongSeasonal ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isStrongSeasonal ? (
                                            <CheckCircle2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">
                                                {isStrongSeasonal ? "Strong Seasonality Detected!" : "Decomposition Complete"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {results.interpretation_summary.seasonality} seasonality with period {results.period}.
                                                {hasStrongTrend && ` ${results.interpretation_summary.trend} trend component present.`}
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
                                        <p>• <strong>SSI:</strong> {results.seasonal_strength_index.toFixed(3)} - Seasonal Strength Index</p>
                                        <p>• <strong>TSI:</strong> {results.trend_strength_index?.toFixed(3) || 'N/A'} - Trend Strength Index</p>
                                        <p>• <strong>Period:</strong> {results.period} observations</p>
                                        {results.fourier_components.length > 0 && (
                                            <p>• <strong>Top Frequency:</strong> {results.fourier_components[0].frequency.toFixed(4)}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Star Rating */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Seasonal Strength:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const ssi = results.seasonal_strength_index;
                                        const score = ssi >= 0.8 ? 5 : ssi >= 0.6 ? 4 : ssi >= 0.4 ? 3 : ssi >= 0.2 ? 2 : 1;
                                        return (
                                            <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>
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
                                    <CardDescription>Understanding seasonal decomposition</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What is Seasonal Decomposition?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            STL (Seasonal-Trend decomposition using Loess) separates time series into three components: trend, seasonal, and residual.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Seasonal Strength</h4>
                                        <p className="text-sm text-muted-foreground">
                                            SSI = {results.seasonal_strength_index.toFixed(3)} indicates {results.interpretation_summary.seasonality.toLowerCase()} seasonality 
                                            with period {results.period}. {results.dominant_period_detected ? `Auto-detected dominant period: ${results.dominant_period_detected}.` : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Trend Strength</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {results.trend_strength_index !== null 
                                                ? `TSI = ${results.trend_strength_index.toFixed(3)} indicates ${results.interpretation_summary.trend.toLowerCase()} trend component.`
                                                : 'Trend strength not available.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Components</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Decomposition extracted {results.seasonal_indices.length} seasonal indices across {results.n_observations} observations.
                                            {results.fourier_components.length > 0 && ` Top frequency: ${results.fourier_components[0].frequency.toFixed(4)}.`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Seasonal decomposition was performed on {results.n_observations} observations with period {results.period}. 
                                    {results.interpretation_summary.seasonality} seasonality (SSI = {results.seasonal_strength_index.toFixed(3)}) 
                                    {results.trend_strength_index !== null && ` and ${results.interpretation_summary.trend.toLowerCase()} trend (TSI = ${results.trend_strength_index.toFixed(3)})`} detected.
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
                        const content = `Seasonal Decomposition Report\nGenerated: ${new Date().toLocaleString()}\n\n${results.interpretation}`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'seasonal_decomposition_report.doc';
                        a.click();
                        URL.revokeObjectURL(url);
                    };

                    return (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold">Decomposition Results</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {results.variable} | Period {results.period} | {results.n_observations} observations
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
                                    <h2 className="text-2xl font-bold">Seasonal Decomposition Report</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {results.variable} | Period {results.period} | {new Date().toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">SSI</p>
                                                    <Waves className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.seasonal_strength_index.toFixed(3)}</p>
                                                <p className="text-xs text-muted-foreground">{results.interpretation_summary.seasonality}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">TSI</p>
                                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">
                                                    {results.trend_strength_index?.toFixed(3) || 'N/A'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{results.interpretation_summary.trend}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Period</p>
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.period}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {results.dominant_period_detected ? 'Auto-detected' : 'Manual'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Observations</p>
                                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.n_observations}</p>
                                                <p className="text-xs text-muted-foreground">{results.variable}</p>
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
                                                <h3 className="font-semibold">Detailed Analysis</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    Seasonal decomposition was performed on <em>N</em> = {results.n_observations} observations of {results.variable} using period = {results.period}.
                                                </p>
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    The Seasonal Strength Index was SSI = {results.seasonal_strength_index.toFixed(3)}, indicating {results.interpretation_summary.seasonality.toLowerCase()} seasonality.
                                                    {results.trend_strength_index !== null && (
                                                        ` The Trend Strength Index was TSI = ${results.trend_strength_index.toFixed(3)}, representing ${results.interpretation_summary.trend.toLowerCase()} trend component.`
                                                    )}
                                                </p>
                                                {results.dominant_period_detected && (
                                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                                        Auto-detection identified a dominant period of {results.dominant_period_detected} observations using spectral analysis.
                                                    </p>
                                                )}
                                                {results.seasonal_indices.length > 0 && (() => {
                                                    const maxIdx = results.seasonal_indices.reduce((max, curr) => curr.index > max.index ? curr : max);
                                                    const minIdx = results.seasonal_indices.reduce((min, curr) => curr.index < min.index ? curr : min);
                                                    return (
                                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                                            Seasonal indices ranged from {minIdx.index.toFixed(3)} (position {minIdx.position}) to {maxIdx.index.toFixed(3)} (position {maxIdx.position}), 
                                                            revealing systematic within-period variation.
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Visualizations */}
                                <Card>
                                    <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                                    <CardContent>
                                        <Tabs defaultValue="decomposition" className="w-full">
                                            <TabsList className="grid w-full grid-cols-5">
                                                <TabsTrigger value="decomposition">Decomposition</TabsTrigger>
                                                <TabsTrigger value="pattern">Pattern</TabsTrigger>
                                                <TabsTrigger value="gauge">Gauge</TabsTrigger>
                                                <TabsTrigger value="periodogram">Periodogram</TabsTrigger>
                                                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="decomposition" className="mt-4">
                                                {results.plots.decomposition ? (
                                                    <Image
                                                        src={results.plots.decomposition}
                                                        alt="Decomposition"
                                                        width={800}
                                                        height={600}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No chart available</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="pattern" className="mt-4">
                                                {results.plots.seasonal_pattern ? (
                                                    <Image
                                                        src={results.plots.seasonal_pattern}
                                                        alt="Seasonal Pattern"
                                                        width={800}
                                                        height={500}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No chart available</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="gauge" className="mt-4">
                                                {results.plots.gauge ? (
                                                    <Image
                                                        src={results.plots.gauge}
                                                        alt="Strength Gauge"
                                                        width={800}
                                                        height={400}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No chart available</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="periodogram" className="mt-4">
                                                {results.plots.periodogram ? (
                                                    <Image
                                                        src={results.plots.periodogram}
                                                        alt="Periodogram"
                                                        width={800}
                                                        height={500}
                                                        className="w-full rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-8">No chart available</p>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="comparison" className="mt-4">
                                                {results.plots.strength_comparison ? (
                                                    <Image
                                                        src={results.plots.strength_comparison}
                                                        alt="Strength Comparison"
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

                                {/* Seasonal Indices */}
                                {results.seasonal_indices && results.seasonal_indices.length > 0 && (
                                    <Card>
                                        <CardHeader><CardTitle>Seasonal Indices</CardTitle></CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[400px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Position</TableHead>
                                                            <TableHead className="text-right">Index</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.seasonal_indices.map((si, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium">{si.position ?? 'N/A'}</TableCell>
                                                                <TableCell className="text-right font-mono">
                                                                    {si.index != null ? si.index.toFixed(4) : 'N/A'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Period Comparison */}
                                {results.period_comparison && results.period_comparison.length > 0 && (
                                    <Card>
                                        <CardHeader><CardTitle>Period Comparison</CardTitle></CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Period</TableHead>
                                                        <TableHead className="text-right">SSI</TableHead>
                                                        <TableHead className="text-right">TSI</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {results.period_comparison.map((pc, i) => (
                                                        <TableRow key={i} className={pc.period === results.period ? 'bg-primary/5' : ''}>
                                                            <TableCell className="font-medium">{pc.period ?? 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {pc.seasonal_strength != null ? pc.seasonal_strength.toFixed(3) : 'N/A'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {pc.trend_strength != null ? pc.trend_strength.toFixed(3) : 'N/A'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Fourier Components */}
                                {results.fourier_components && results.fourier_components.length > 0 && (
                                    <Card>
                                        <CardHeader><CardTitle>Top Fourier Components</CardTitle></CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Frequency</TableHead>
                                                        <TableHead className="text-right">Amplitude</TableHead>
                                                        <TableHead className="text-right">Period</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {results.fourier_components.map((fc, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-mono">
                                                                {fc.frequency != null ? fc.frequency.toFixed(4) : 'N/A'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {fc.amplitude != null ? fc.amplitude.toFixed(2) : 'N/A'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {fc.period != null ? fc.period.toFixed(1) : 'N/A'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
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
                            <p className="text-muted-foreground">Running seasonal decomposition...</p>
                            <Skeleton className="h-[400px] w-full" />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}