'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, LineChart as LineChartIcon, BookOpen, Activity, Download, TrendingUp, GitBranch, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, FileText, Sparkles, Info, BarChart3, Lightbulb, ChevronDown, FileCode, FileType, Layers, Percent } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '../../ui/scroll-area';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';



const metricDefinitions: Record<string, string> = {
    adf_test: "Augmented Dickey-Fuller Test. Tests whether a unit root is present in a time series. The null hypothesis is 'unit root exists (non-stationary)'. p < 0.05 supports stationarity.",
    kpss_test: "Kwiatkowski-Phillips-Schmidt-Shin Test. Tests whether a time series is stationary. The null hypothesis is 'stationary'. p > 0.05 supports stationarity.",
    stationarity: "A property where statistical characteristics (mean, variance) remain constant over time. Required assumption for ARIMA modeling.",
    unit_root: "A feature of a time series that makes it non-stationary. If present, shocks have permanent effects rather than dying out.",
    differencing: "Transformation technique: y'ₜ = yₜ - yₜ₋₁. Removes trends to achieve stationarity. The 'd' parameter in ARIMA.",
    seasonal_differencing: "Differencing at seasonal lag: y'ₜ = yₜ - yₜ₋ₛ. Removes seasonal patterns. The 'D' parameter in SARIMA.",
    p_value: "Probability of observing the test statistic under the null hypothesis. Lower p-values provide stronger evidence against the null.",
    test_statistic: "A numerical summary of the data used for hypothesis testing. More negative ADF statistics indicate stronger evidence against unit root.",
    trend_stationary: "A series that is stationary after removing a deterministic trend. Can be made stationary by detrending.",
    difference_stationary: "A series that becomes stationary after differencing. Requires differencing (not detrending) to achieve stationarity.",
    arima: "AutoRegressive Integrated Moving Average. A forecasting model where 'I' (integrated) refers to differencing order d.",
    sarima: "Seasonal ARIMA. Extends ARIMA to handle seasonal patterns with additional seasonal differencing parameter D.",
    acf: "Autocorrelation Function. Measures correlation between a series and its lagged values. Used to identify MA order.",
    pacf: "Partial Autocorrelation Function. Measures direct correlation at each lag, controlling for shorter lags. Used to identify AR order.",
    seasonal_period: "The number of observations per seasonal cycle. E.g., 12 for monthly data with yearly seasonality, 4 for quarterly data."
};


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

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const generateStationarityInterpretations = (results: StationarityResults) => {
    const insights: string[] = [];
    const origAdfStat = results.original.test_results.adf_p_value <= 0.05;
    const origKpssStat = results.original.test_results.kpss_p_value > 0.05;
    
    let overall = '';
    if (origAdfStat && origKpssStat) {
        overall = 'The series is Stationary. Both tests support stationarity. No differencing needed.';
    } else if (!origAdfStat && !origKpssStat) {
        overall = 'The series is Non-Stationary. Both tests confirm non-stationarity. Differencing required.';
    } else if (origAdfStat && !origKpssStat) {
        overall = 'The series is Trend-Stationary. Consider detrending or differencing.';
    } else {
        overall = 'The series shows unit root non-stationarity. Differencing recommended.';
    }
    
    insights.push(`ADF Test: stat = ${results.original.test_results.adf_statistic.toFixed(2)}, p = ${results.original.test_results.adf_p_value.toFixed(3)}. ${origAdfStat ? 'Unit root rejected (stationary)' : 'Unit root not rejected (non-stationary)'}`);
    insights.push(`KPSS Test: stat = ${results.original.test_results.kpss_statistic.toFixed(2)}, p = ${results.original.test_results.kpss_p_value.toFixed(3)}. ${origKpssStat ? 'Stationarity not rejected (stationary)' : 'Stationarity rejected (non-stationary)'}`);
    
    if (results.first_difference) {
        const fd = results.first_difference.test_results;
        const fdStat = fd.adf_p_value <= 0.05;
        insights.push(`First Diff: ADF p = ${fd.adf_p_value.toFixed(3)}. ${fdStat ? 'Stationary after d=1' : 'Still non-stationary'}`);
    }
    
    if (results.seasonal_difference) {
        const sd = results.seasonal_difference.test_results;
        const sdStat = sd.adf_p_value <= 0.05;
        insights.push(`Seasonal Diff: ADF p = ${sd.adf_p_value.toFixed(3)}. ${sdStat ? 'Seasonal pattern removed' : 'Seasonal pattern persists'}`);
    }
    
    let recommendations = origAdfStat && origKpssStat ? 'Use ARMA(p, q) model (no differencing needed)' :
        (results.first_difference?.test_results.adf_p_value ?? 1) <= 0.05 ? 'Use ARIMA(p, 1, q) model (d=1)' :
        (results.seasonal_difference?.test_results.adf_p_value ?? 1) <= 0.05 ? 'Consider SARIMA model (seasonal differencing)' :
        'Consider d=2 or log transformation';
    
    return { overall_analysis: overall, test_insights: insights, recommendations };
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Stationarity Tests Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in stationarity analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">
                                    {term.replace(/_/g, ' ')}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

const StationarityGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Stationarity Tests Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <LineChartIcon className="w-4 h-4" />
                What is Stationarity?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                A time series is <strong>stationary</strong> if its statistical properties (mean, variance, autocorrelation) 
                remain constant over time. This is a <strong>critical assumption</strong> for most time series forecasting 
                models like ARIMA.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why it matters:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Non-stationary data can lead to spurious regression results and unreliable forecasts. 
                    Models assume past patterns will continue — this only works if the data behavior is consistent.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Understanding ADF and KPSS Tests
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    ADF Test (Augmented Dickey-Fuller)
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• <strong>H₀:</strong> Unit root exists (non-stationary)</li>
                    <li>• <strong>H₁:</strong> No unit root (stationary)</li>
                    <li>• <strong>Decision:</strong> p &lt; 0.05 → Reject H₀ → <span className="text-green-600 font-medium">Stationary</span></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    KPSS Test
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• <strong>H₀:</strong> Series is stationary</li>
                    <li>• <strong>H₁:</strong> Series is non-stationary</li>
                    <li>• <strong>Decision:</strong> p &gt; 0.05 → Fail to reject H₀ → <span className="text-green-600 font-medium">Stationary</span></li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Important:</strong> The tests have opposite null hypotheses! 
                    ADF tests for non-stationarity while KPSS tests for stationarity. 
                    Using both provides a more robust conclusion.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Interpreting Combined Results
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                  <p className="font-medium text-sm text-green-700 dark:text-green-400 mb-1">Both Agree: Stationary ✓</p>
                  <p className="text-xs text-muted-foreground">ADF: p &lt; 0.05 AND KPSS: p &gt; 0.05</p>
                  <p className="text-xs text-muted-foreground mt-1">→ Use ARMA(p, q) directly</p>
                </div>
                
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400 mb-1">Both Agree: Non-Stationary ✗</p>
                  <p className="text-xs text-muted-foreground">ADF: p ≥ 0.05 AND KPSS: p ≤ 0.05</p>
                  <p className="text-xs text-muted-foreground mt-1">→ Apply differencing</p>
                </div>
                
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-1">ADF Only: Trend-Stationary</p>
                  <p className="text-xs text-muted-foreground">ADF: p &lt; 0.05 AND KPSS: p ≤ 0.05</p>
                  <p className="text-xs text-muted-foreground mt-1">→ Consider detrending</p>
                </div>
                
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-1">KPSS Only: Unit Root</p>
                  <p className="text-xs text-muted-foreground">ADF: p ≥ 0.05 AND KPSS: p &gt; 0.05</p>
                  <p className="text-xs text-muted-foreground mt-1">→ Differencing recommended</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Differencing Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">First Differencing (d = 1)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-mono">y'ₜ = yₜ - yₜ₋₁</span><br/>
                    Removes linear trends. Most common transformation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Seasonal Differencing (D = 1)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-mono">y'ₜ = yₜ - yₜ₋ₛ</span> (s = seasonal period)<br/>
                    Removes seasonal patterns.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Model Selection Guide
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Stationary</p>
                  <p className="text-xs text-muted-foreground">→ ARMA(p, q), d = 0</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">First Diff Works</p>
                  <p className="text-xs text-muted-foreground">→ ARIMA(p, 1, q)</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Seasonal Pattern</p>
                  <p className="text-xs text-muted-foreground">→ SARIMA(p,d,q)(P,D,Q)ₛ</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Still Non-Stationary</p>
                  <p className="text-xs text-muted-foreground">→ Try d=2 or log transform</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Stationarity testing is the first step in time series modeling. 
                Always combine statistical tests with visual inspection and domain knowledge.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'time-series');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><LineChartIcon className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Stationarity Tests</CardTitle>
                    <CardDescription className="text-base mt-2">Test if your time series has constant statistical properties</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><CheckCircle2 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">ADF Test</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Unit root detection</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><AlertTriangle className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">KPSS Test</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Trend stationarity check</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Differencing</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Transform to stationary</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use stationarity tests before ARIMA modeling. Non-stationary data leads to unreliable predictions.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2"><Settings className="w-4 h-4 text-primary inline mr-1" />Requirements</h4><ul className="space-y-1 text-sm text-muted-foreground"><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />Time & value columns</li><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />30+ observations</li></ul></div>
                            <div><h4 className="font-semibold text-sm mb-2"><FileSearch className="w-4 h-4 text-primary inline mr-1" />Results</h4><ul className="space-y-1 text-sm text-muted-foreground"><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />ADF p&lt;0.05 = Stationary</li><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />KPSS p&gt;0.05 = Stationary</li></ul></div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><LineChartIcon className="mr-2 h-5 w-5" />Load Example</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface StationarityPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void
}

export default function StationarityPage({ data, allHeaders, onLoadExample }: StationarityPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [period, setPeriod] = useState(12);
    
    const [analysisResult, setAnalysisResult] = useState<StationarityResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    const numericHeaders = useMemo(() => {
        return allHeaders.filter(h => { const sample = data[0]?.[h]; return typeof sample === 'number' || !isNaN(Number(sample)); });
    }, [allHeaders, data]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Time column selected', passed: !!timeCol, message: timeCol ? `Selected: ${timeCol}` : 'Please select a time column' });
        checks.push({ label: 'Value column selected', passed: !!valueCol, message: valueCol ? `Selected: ${valueCol}` : 'Please select a value column' });
        checks.push({ label: 'Sufficient data', passed: data.length >= 30, message: data.length >= 30 ? `${data.length} observations (30+ recommended)` : `${data.length} observations insufficient (30+ recommended)` });
        checks.push({ label: 'Valid seasonal period', passed: period >= 2 && period <= data.length / 2, message: `Period ${period} (for seasonal differencing)` });
        return checks;
    }, [timeCol, valueCol, data.length, period]);

    const allChecksPassed = validationChecks.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    
    useEffect(() => {
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'));
        setTimeCol(dateCol || allHeaders[0]);
        setValueCol(numericHeaders.find(h => h !== dateCol) || numericHeaders[0]);
        setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!timeCol || !valueCol) { toast({ variant: 'destructive', title: 'Error', description: 'Select columns.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/stationarity`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, timeCol, valueCol, period }) });
            if (!response.ok) { const err = await response.json(); throw new Error(err.detail || err.error || 'Analysis failed'); }
            const result: StationarityResults = await response.json();
            result.interpretations = generateStationarityInterpretations(result);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, timeCol, valueCol, period, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Stationarity_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const summaryData = [{
            series: 'Original',
            adf_stat: analysisResult.original.test_results.adf_statistic.toFixed(4),
            adf_p: analysisResult.original.test_results.adf_p_value.toFixed(4),
            kpss_stat: analysisResult.original.test_results.kpss_statistic.toFixed(4),
            kpss_p: analysisResult.original.test_results.kpss_p_value.toFixed(4)
        }];
        if (analysisResult.first_difference) {
            summaryData.push({ series: 'First Diff', adf_stat: analysisResult.first_difference.test_results.adf_statistic.toFixed(4), adf_p: analysisResult.first_difference.test_results.adf_p_value.toFixed(4), kpss_stat: analysisResult.first_difference.test_results.kpss_statistic.toFixed(4), kpss_p: analysisResult.first_difference.test_results.kpss_p_value.toFixed(4) });
        }
        if (analysisResult.seasonal_difference) {
            summaryData.push({ series: 'Seasonal Diff', adf_stat: analysisResult.seasonal_difference.test_results.adf_statistic.toFixed(4), adf_p: analysisResult.seasonal_difference.test_results.adf_p_value.toFixed(4), kpss_stat: analysisResult.seasonal_difference.test_results.kpss_statistic.toFixed(4), kpss_p: analysisResult.seasonal_difference.test_results.kpss_p_value.toFixed(4) });
        }
        let csvContent = "STATIONARITY TEST RESULTS\n" + Papa.unparse(summaryData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Stationarity_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

// handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/stationarity-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult,
                valueCol,
                timeCol,
                period,
                sampleSize: data.length
            })
        });
        if (!response.ok) throw new Error('Failed');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Stationarity_Report_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, valueCol, timeCol, period, data.length, toast]);

    
    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const origAdfStat = analysisResult?.original.test_results.adf_p_value ? analysisResult.original.test_results.adf_p_value <= 0.05 : false;
    const origKpssStat = analysisResult?.original.test_results.kpss_p_value ? analysisResult.original.test_results.kpss_p_value > 0.05 : false;
    const isStationary = origAdfStat && origKpssStat;
    const firstDiffStationary = analysisResult?.first_difference?.test_results.adf_p_value ? analysisResult.first_difference.test_results.adf_p_value <= 0.05 : false;
    const seasonalDiffStationary = analysisResult?.seasonal_difference?.test_results.adf_p_value ? analysisResult.seasonal_difference.test_results.adf_p_value <= 0.05 : false;

    const getStationarityStatus = () => {
        if (origAdfStat && origKpssStat) return 'Stationary';
        if (!origAdfStat && !origKpssStat) return 'Non-Stationary';
        if (origAdfStat && !origKpssStat) return 'Trend-Stationary';
        return 'Unit Root';
    };

    const ProgressBar = () => (
        <div className="w-full mb-8"><div className="flex items-center justify-between">
            {STEPS.map((step) => {
                const isCompleted = step.id < currentStep; const isCurrent = step.id === currentStep; const isClickable = step.id <= maxReachedStep;
                return (<button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable} className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>{isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}</div>
                    <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                </button>);
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <StationarityGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            
            <div className="mb-6 flex justify-between items-center">

    <div>
        <h1 className="text-2xl font-bold">Stationarity Tests</h1>
        <p className="text-muted-foreground mt-1">ADF and KPSS analysis</p>
    </div>
    <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Analysis Guide
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
            <HelpCircle className="w-5 h-5"/>
        </Button>
    </div>
</div>

            <ProgressBar />
            <div className="min-h-[500px]">
                {/* Step 1 */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose time and value columns</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3"><Label className="text-sm font-medium">Time Column</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-3"><Label className="text-sm font-medium">Value Column</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericHeaders.filter(h => h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Data points: <span className="font-semibold text-foreground">{data.length}</span> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Test Settings</CardTitle><CardDescription>Configure seasonal period</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label className="text-sm font-medium">Seasonal Period</Label><Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} min={2} className="h-11"/><p className="text-xs text-muted-foreground">Period for seasonal differencing (e.g., 12=monthly, 4=quarterly)</p></div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Time:</strong> {timeCol || 'Not selected'}</p><p>• <strong className="text-foreground">Value:</strong> {valueCol || 'Not selected'}</p><p>• <strong className="text-foreground">Period:</strong> {period}</p></div></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Test Information</h4><p className="text-sm text-muted-foreground"><strong>ADF:</strong> H₀ = unit root exists (non-stationary). p &lt; 0.05 → stationary<br/><strong>KPSS:</strong> H₀ = stationary. p &gt; 0.05 → stationary</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div></div>))}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing...</> : <><Sigma className="mr-2 h-4 w-4" />Run Tests</>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary (EFA Style) */}
                {currentStep === 4 && analysisResult && (() => {
                    const status = getStationarityStatus();
                    const isGood = isStationary;
                    const diffOrder = isStationary ? 0 : firstDiffStationary ? 1 : seasonalDiffStationary ? 1 : 2;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Stationarity test for {valueCol}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings Box */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Original series status: <strong className={isGood ? 'text-green-600' : 'text-amber-600'}>{status}</strong>
                                            {isGood ? ' — you can apply ARMA models without differencing.' : ' — differencing is needed before forecasting.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Recommended differencing order: <strong>d = {diffOrder}</strong>
                                            {diffOrder === 0 ? ' (no differencing needed)' : diffOrder === 1 ? ' (first difference achieves stationarity)' : ' (second difference or transformation needed)'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {analysisResult.interpretations?.recommendations}
                                        </p></div>
                                    </div>
                                </div>

                                {/* Conclusion Box */}
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Stationary Series!" : "Differencing Required"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? "Both tests support stationarity. You can directly apply ARMA(p,q) models."
                                                    : firstDiffStationary 
                                                        ? "First differencing achieves stationarity. Use ARIMA(p,1,q)."
                                                        : "Additional transformation may be needed. Consider log transformation or d=2."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Status</p><LineChartIcon className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${isGood ? 'text-green-600' : 'text-amber-600'}`}>{status}</p><p className="text-xs text-muted-foreground">Original series</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Diff Order</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">d = {diffOrder}</p><p className="text-xs text-muted-foreground">Recommended</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">ADF p-value</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${origAdfStat ? 'text-green-600' : 'text-amber-600'}`}>{analysisResult.original.test_results.adf_p_value.toFixed(3)}</p><p className="text-xs text-muted-foreground">{origAdfStat ? '< 0.05' : '≥ 0.05'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">KPSS p-value</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${origKpssStat ? 'text-green-600' : 'text-amber-600'}`}>{analysisResult.original.test_results.kpss_p_value.toFixed(3)}</p><p className="text-xs text-muted-foreground">{origKpssStat ? '> 0.05' : '≤ 0.05'}</p></div></CardContent></Card>
                                </div>

                                {/* Quality Stars */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Stationarity:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = isStationary ? 5 : firstDiffStationary ? 4 : seasonalDiffStationary ? 3 : 2;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && analysisResult && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of stationarity tests</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">ADF Test (Augmented Dickey-Fuller)</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">Null hypothesis:</strong> Unit root exists (non-stationary).<br/>If p &lt; 0.05, we reject the null and conclude the series is <strong className="text-foreground">stationary</strong>. Current p = {analysisResult.original.test_results.adf_p_value.toFixed(4)}.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">KPSS Test</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">Null hypothesis:</strong> Series is stationary.<br/>If p &gt; 0.05, we fail to reject and conclude <strong className="text-foreground">stationary</strong>. Current p = {analysisResult.original.test_results.kpss_p_value.toFixed(4)}.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Combined Interpretation</h4><p className="text-sm text-muted-foreground"><strong>Both stationary:</strong> Definitely stationary<br/><strong>Both non-stationary:</strong> Definitely non-stationary<br/><strong>ADF only:</strong> Trend-stationary (needs detrending)<br/><strong>KPSS only:</strong> Unit root (needs differencing)</p></div></div></div>
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-xl p-5 border border-amber-300 dark:border-amber-700"><h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-600" />Role of Differencing</h4><p className="text-sm text-muted-foreground"><strong>Differencing:</strong> y′ₜ = yₜ - yₜ₋₁. Removes trend to achieve stationarity.<br/><strong>Seasonal Diff:</strong> y′ₜ = yₜ - yₜ₋ₛ. Removes seasonal pattern (s = {period}).</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && analysisResult && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full test results and visualizations</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileCode className="mr-2 h-4 w-4" />Python Script<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Stationarity Test Report</h2><p className="text-sm text-muted-foreground mt-1">{valueCol} | Period {period} | {data.length} Observations | {new Date().toLocaleDateString()}</p></div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Original Series</p><p className={`text-lg font-bold ${isStationary ? 'text-green-600' : 'text-amber-600'}`}>{getStationarityStatus()}</p></CardContent></Card>
                            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Diff Order (d)</p><p className="text-lg font-bold">{isStationary ? 0 : firstDiffStationary ? 1 : 2}</p></CardContent></Card>
                            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">First Diff</p><p className={`text-lg font-bold ${firstDiffStationary ? 'text-green-600' : 'text-amber-600'}`}>{analysisResult.first_difference ? (firstDiffStationary ? 'Stationary' : 'Non-Stat') : 'N/A'}</p></CardContent></Card>
                            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Seasonal Diff</p><p className={`text-lg font-bold ${seasonalDiffStationary ? 'text-green-600' : 'text-amber-600'}`}>{analysisResult.seasonal_difference ? (seasonalDiffStationary ? 'Stationary' : 'Non-Stat') : 'N/A'}</p></CardContent></Card>
                        </div>

                        {/* Statistical Summary - APA Format */}
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Stationarity tests were conducted on {valueCol} across <em>N</em> = {data.length} observations 
                                            using both the Augmented Dickey-Fuller (ADF) and Kwiatkowski-Phillips-Schmidt-Shin (KPSS) tests 
                                            with a seasonal period of {period}.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            For the original series, the ADF test yielded a statistic of {analysisResult.original.test_results.adf_statistic.toFixed(4)} 
                                            (<em>p</em> = {analysisResult.original.test_results.adf_p_value.toFixed(4)}), 
                                            {origAdfStat 
                                                ? ' rejecting the null hypothesis of a unit root and supporting stationarity.'
                                                : ' failing to reject the unit root null hypothesis, indicating non-stationarity.'}
                                            {' '}The KPSS test produced a statistic of {analysisResult.original.test_results.kpss_statistic.toFixed(4)} 
                                            (<em>p</em> = {analysisResult.original.test_results.kpss_p_value.toFixed(4)}), 
                                            {origKpssStat 
                                                ? ' failing to reject the stationarity null hypothesis.'
                                                : ' rejecting the stationarity null hypothesis.'}
                                        </p>
                                        
                                        {analysisResult.first_difference && (
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                First differencing was applied to achieve stationarity. The differenced series showed 
                                                ADF statistic = {analysisResult.first_difference.test_results.adf_statistic.toFixed(4)} 
                                                (<em>p</em> = {analysisResult.first_difference.test_results.adf_p_value.toFixed(4)}), 
                                                {firstDiffStationary 
                                                    ? ' confirming stationarity after first-order differencing (d = 1).'
                                                    : ' suggesting additional differencing or transformation may be required.'}
                                            </p>
                                        )}
                                        
                                        {analysisResult.seasonal_difference && (
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                Seasonal differencing (lag = {period}) was also evaluated. The seasonally differenced series yielded 
                                                ADF statistic = {analysisResult.seasonal_difference.test_results.adf_statistic.toFixed(4)} 
                                                (<em>p</em> = {analysisResult.seasonal_difference.test_results.adf_p_value.toFixed(4)}), 
                                                {seasonalDiffStationary 
                                                    ? ' indicating successful removal of seasonal unit roots.'
                                                    : ' suggesting persistent seasonal patterns.'}
                                            </p>
                                        )}
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {isStationary 
                                                ? `Based on concordant results from both tests, the series is classified as stationary. ARMA(p, q) models are appropriate without differencing.`
                                                : firstDiffStationary 
                                                    ? `The series achieves stationarity after first differencing. ARIMA(p, 1, q) models are recommended for forecasting.`
                                                    : seasonalDiffStationary
                                                        ? `Seasonal differencing achieves stationarity. SARIMA models with seasonal differencing (D = 1) are recommended.`
                                                        : `Neither first nor seasonal differencing fully achieves stationarity. Consider second-order differencing (d = 2), log transformation, or alternative approaches.`}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>


                        {/* Visualizations */}
                        <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent className="space-y-6">
                            <div><h3 className="text-base font-semibold mb-3 flex items-center gap-2"><LineChartIcon className="h-4 w-4 text-primary" />Original Series</h3><Image src={analysisResult.original.plot} alt="Original" width={1200} height={600} className="w-full rounded-md border"/></div>
                            {analysisResult.first_difference && <div><h3 className="text-base font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />First Difference</h3><Image src={analysisResult.first_difference.plot} alt="First Diff" width={1200} height={600} className="w-full rounded-md border"/></div>}
                            {analysisResult.seasonal_difference && <div><h3 className="text-base font-semibold mb-3 flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Seasonal Difference</h3><Image src={analysisResult.seasonal_difference.plot} alt="Seasonal Diff" width={1200} height={600} className="w-full rounded-md border"/></div>}
                        </CardContent></Card>

                        {/* Test Statistics Table */}
                        <Card><CardHeader><CardTitle>Test Statistics</CardTitle></CardHeader><CardContent>
                            <Table><TableHeader><TableRow><TableHead>Series</TableHead><TableHead className="text-right">ADF Stat</TableHead><TableHead className="text-right">ADF p</TableHead><TableHead>ADF Result</TableHead><TableHead className="text-right">KPSS Stat</TableHead><TableHead className="text-right">KPSS p</TableHead><TableHead>KPSS Result</TableHead></TableRow></TableHeader>
                            <TableBody>
                                <TableRow><TableCell className="font-medium">Original</TableCell><TableCell className="font-mono text-right">{analysisResult.original.test_results.adf_statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{analysisResult.original.test_results.adf_p_value.toFixed(4)}</TableCell><TableCell><Badge variant={origAdfStat ? "default" : "destructive"}>{origAdfStat ? "Stationary" : "Non-Stat"}</Badge></TableCell><TableCell className="font-mono text-right">{analysisResult.original.test_results.kpss_statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{analysisResult.original.test_results.kpss_p_value.toFixed(4)}</TableCell><TableCell><Badge variant={origKpssStat ? "default" : "destructive"}>{origKpssStat ? "Stationary" : "Non-Stat"}</Badge></TableCell></TableRow>
                                {analysisResult.first_difference && <TableRow><TableCell className="font-medium">First Diff</TableCell><TableCell className="font-mono text-right">{analysisResult.first_difference.test_results.adf_statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{analysisResult.first_difference.test_results.adf_p_value.toFixed(4)}</TableCell><TableCell><Badge variant={firstDiffStationary ? "default" : "destructive"}>{firstDiffStationary ? "Stationary" : "Non-Stat"}</Badge></TableCell><TableCell className="font-mono text-right">{analysisResult.first_difference.test_results.kpss_statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{analysisResult.first_difference.test_results.kpss_p_value.toFixed(4)}</TableCell><TableCell><Badge variant={analysisResult.first_difference.test_results.kpss_p_value > 0.05 ? "default" : "destructive"}>{analysisResult.first_difference.test_results.kpss_p_value > 0.05 ? "Stationary" : "Non-Stat"}</Badge></TableCell></TableRow>}
                                {analysisResult.seasonal_difference && <TableRow><TableCell className="font-medium">Seasonal</TableCell><TableCell className="font-mono text-right">{analysisResult.seasonal_difference.test_results.adf_statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{analysisResult.seasonal_difference.test_results.adf_p_value.toFixed(4)}</TableCell><TableCell><Badge variant={seasonalDiffStationary ? "default" : "destructive"}>{seasonalDiffStationary ? "Stationary" : "Non-Stat"}</Badge></TableCell><TableCell className="font-mono text-right">{analysisResult.seasonal_difference.test_results.kpss_statistic.toFixed(3)}</TableCell><TableCell className="font-mono text-right">{analysisResult.seasonal_difference.test_results.kpss_p_value.toFixed(4)}</TableCell><TableCell><Badge variant={analysisResult.seasonal_difference.test_results.kpss_p_value > 0.05 ? "default" : "destructive"}>{analysisResult.seasonal_difference.test_results.kpss_p_value > 0.05 ? "Stationary" : "Non-Stat"}</Badge></TableCell></TableRow>}
                            </TableBody></Table>
                            <p className="text-sm text-muted-foreground mt-4">ADF: p &lt; 0.05 = stationary | KPSS: p &gt; 0.05 = stationary</p>
                        </CardContent></Card>
                    </div>

                    <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running stationarity tests...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>)}
            </div>
        </div>
    );
}

