'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
    Loader2, AlertTriangle, Lightbulb, CheckCircle, Zap, HelpCircle, 
    BookOpen, Download, FileSpreadsheet, ImageIcon, 
    Target, Sun, Waves, TrendingUp, Calendar,
    Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, Info, ChevronDown, FileCode, FileType, Percent, Layers
} from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';



const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';

const metricDefinitions: Record<string, string> = {
    seasonal_strength_index: "SSI measures how much variation is due to seasonal patterns. SSI = 1 - Var(Residual)/Var(Detrended). Values closer to 1 indicate stronger seasonality.",
    trend_strength_index: "TSI measures how much variation is due to trend. TSI = 1 - Var(Residual)/Var(Deseasonalized). Values closer to 1 indicate stronger trend.",
    seasonal_period: "The number of observations in one complete seasonal cycle. E.g., 12 for monthly data with yearly seasonality.",
    seasonal_indices: "Multipliers showing how each period compares to the average. Values above 1 indicate above-average periods.",
    decomposition: "Separating a time series into trend, seasonal, and residual components to understand underlying patterns.",
    dominant_period: "The seasonal cycle length with the strongest repeating pattern, detected via spectral analysis.",
    spectral_analysis: "A technique using Fourier transforms to identify dominant frequencies (periodicities) in time series data.",
    periodogram: "A plot showing the power (strength) at each frequency, helping identify the most important seasonal cycles.",
    fourier_transform: "Mathematical technique that decomposes a signal into constituent frequencies, revealing hidden periodicities.",
    residual: "The leftover variation after removing trend and seasonal components. Should be random noise if decomposition is good.",
    detrended_series: "Time series with the trend component removed, isolating seasonal and random variation.",
    deseasonalized_series: "Time series with the seasonal component removed, useful for analyzing underlying trends.",
    additive_model: "Y = Trend + Seasonal + Residual. Use when seasonal swings are constant regardless of level.",
    multiplicative_model: "Y = Trend × Seasonal × Residual. Use when seasonal swings are proportional to the level."
};


const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Seasonal Strength Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in seasonal strength analysis
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


const SeasonalStrengthGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Seasonal Strength Index Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sun className="w-4 h-4" />
                What is Seasonal Strength Index?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The <strong>Seasonal Strength Index (SSI)</strong> quantifies how much of your data's variation 
                comes from repeating seasonal patterns. It ranges from 0 (no seasonality) to 1 (perfect seasonality).
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Formula:</strong><br/>
                  <span className="font-mono text-xs">SSI = 1 - Var(Residual) / Var(Detrended)</span><br/>
                  <span className="text-muted-foreground text-xs">
                    Higher SSI means seasonal patterns explain more of your data's variation.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Interpreting SSI Values
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-2">Strength Levels</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-background rounded text-center">
                      <p className="font-bold text-primary">&gt; 0.7</p>
                      <p className="text-muted-foreground">Strong</p>
                    </div>
                    <div className="p-2 bg-background rounded text-center">
                      <p className="font-bold">0.4 - 0.7</p>
                      <p className="text-muted-foreground">Moderate</p>
                    </div>
                    <div className="p-2 bg-background rounded text-center">
                      <p className="font-bold">&lt; 0.4</p>
                      <p className="text-muted-foreground">Weak</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                SSI vs TSI
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">SSI (Seasonal)</p>
                  <p className="text-xs text-muted-foreground">
                    Measures repeating cyclical patterns.<br/>
                    High SSI → Use SARIMA, Prophet
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">TSI (Trend)</p>
                  <p className="text-xs text-muted-foreground">
                    Measures long-term direction.<br/>
                    High TSI → Include trend terms
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Choosing the Right Period
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-muted/30 rounded text-center border border-border">
                  <p className="font-bold">4</p>
                  <p className="text-muted-foreground">Quarterly</p>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center border border-border">
                  <p className="font-bold">7</p>
                  <p className="text-muted-foreground">Weekly</p>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center border border-border">
                  <p className="font-bold">12</p>
                  <p className="text-muted-foreground">Monthly</p>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center border border-border">
                  <p className="font-bold">52</p>
                  <p className="text-muted-foreground">Weekly/Year</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Use auto-detection to find the dominant period, 
                  or compare multiple periods to see which has the strongest seasonal pattern.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                What To Do With Results
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Strong SSI (&gt;0.7)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use SARIMA or Prophet for forecasting</li>
                    <li>• Plan operations around seasonal peaks</li>
                    <li>• Apply seasonal adjustment for trend analysis</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Weak SSI (&lt;0.4)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Simple models may suffice (ARIMA, ETS)</li>
                    <li>• Focus on trend and external factors</li>
                    <li>• Consider if period is correct</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4" />
                Understanding the Periodogram
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The periodogram shows the <strong>power</strong> (strength) at each frequency. 
                Peaks indicate dominant seasonal cycles. The highest peak corresponds to the 
                strongest repeating pattern in your data.
              </p>
              <div className="p-3 rounded-lg border border-border bg-muted/30 mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Reading the periodogram:</strong> X-axis shows frequency (or period), 
                  Y-axis shows power. Tall peaks = strong seasonal cycles at that frequency.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> SSI is most useful when comparing 
                multiple time series or deciding whether to include seasonal terms in your forecasting model. 
                Always combine with visual inspection of the seasonal pattern plot.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

interface Insight {
    type: 'warning' | 'info';
    title: string;
    description: string;
}

interface SeasonalIndex {
    position: number;
    index: number;
    std: number;
    n: number;
}

interface PeriodResult {
    period: number;
    seasonal_strength: number;
    trend_strength: number | null;
    combined_strength: number;
}

interface FourierComponent {
    period: number;
    frequency: number;
    amplitude: number;
    power: number;
}

interface AnalysisResult {
    variable: string;
    n_observations: number;
    period: number;
    seasonal_strength_index: number;
    trend_strength_index: number | null;
    dominant_period_detected: number | null;
    seasonal_indices: SeasonalIndex[];
    period_comparison: PeriodResult[];
    fourier_components: FourierComponent[];
    interpretation: {
        seasonality: string;
        trend: string;
    };
    insights: Insight[];
    recommendations: string[];
    plots: {
        decomposition: string;
        seasonal_pattern: string;
        gauge: string;
        periodogram?: string;
        strength_comparison?: string;
        subseries?: string;
    };
    error?: string;
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

const COMMON_PERIODS = [
    { value: 4, label: '4 (Quarterly)' },
    { value: 7, label: '7 (Weekly)' },
    { value: 12, label: '12 (Monthly)' },
    { value: 24, label: '24 (Bi-monthly)' },
    { value: 52, label: '52 (Weekly in year)' },
    { value: 365, label: '365 (Daily in year)' },
];

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'timeseries' || d.id === 'time_series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Sun className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Seasonal Strength Index</CardTitle>
                    <CardDescription className="text-base mt-2">Measure the strength of seasonal patterns in time series</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Waves className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">SSI Index</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Quantify seasonality 0 to 1</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Trend Strength</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Separate trend from seasonal</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Calendar className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Period Detection</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Auto-detect dominant period</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />About Seasonal Strength Index</h3>
                        <p className="text-sm text-muted-foreground mb-4">SSI measures how much variation is attributable to seasonal patterns. SSI = 1 - Var(Residual) / Var(Detrended). Values close to 1 indicate strong seasonality.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Interpretation</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li><span className="font-mono bg-muted px-1">&gt;0.7</span> Strong seasonality</li>
                                    <li><span className="font-mono bg-muted px-1">0.4-0.7</span> Moderate seasonality</li>
                                    <li><span className="font-mono bg-muted px-1">&lt;0.4</span> Weak seasonality</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />Applications</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• Decide on seasonal modeling</li>
                                    <li>• Compare multiple time series</li>
                                    <li>• Forecast model selection</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg"><Sun className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface SeasonalStrengthPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SeasonalStrengthPage({ data, numericHeaders, onLoadExample }: SeasonalStrengthPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedVar, setSelectedVar] = useState<string>('');
    const [period, setPeriod] = useState(12);
    const [autoDetect, setAutoDetect] = useState(true);
    const [customPeriods, setCustomPeriods] = useState('4,7,12,24');
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

    const canRun = useMemo(() => data.length >= 20 && numericHeaders.length >= 1, [data, numericHeaders]);

    const testPeriods = useMemo(() => {
        return customPeriods.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 2);
    }, [customPeriods]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Variable selected', passed: !!selectedVar, message: selectedVar ? `Selected: ${selectedVar}` : 'Please select a variable' });
        checks.push({ label: 'Sufficient data', passed: data.length >= period * 2, message: data.length >= period * 2 ? `${data.length} observations (minimum ${period * 2} needed, ${Math.floor(data.length / period)} cycles)` : `${data.length} observations insufficient (minimum ${period * 2} needed)` });
        checks.push({ label: 'Valid period', passed: period >= 2 && period <= data.length / 2, message: `Period ${period} (must be ≤ half of data length)` });
        checks.push({ label: 'Test periods', passed: testPeriods.length > 0, message: testPeriods.length > 0 ? `Periods to compare: ${testPeriods.join(', ')}` : 'No test periods specified' });
        return checks;
    }, [selectedVar, data.length, period, testPeriods]);

    const allChecksPassed = validationChecks.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setSelectedVar(''); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Seasonal_Strength_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const summaryData = [{
            variable: analysisResult.variable,
            observations: analysisResult.n_observations,
            period: analysisResult.period,
            seasonal_strength_index: analysisResult.seasonal_strength_index.toFixed(4),
            trend_strength_index: analysisResult.trend_strength_index?.toFixed(4) ?? 'N/A',
            detected_period: analysisResult.dominant_period_detected ?? 'N/A',
            seasonality_interpretation: analysisResult.interpretation.seasonality,
            trend_interpretation: analysisResult.interpretation.trend
        }];
        let csvContent = "SEASONAL STRENGTH ANALYSIS\n" + Papa.unparse(summaryData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Seasonal_Strength_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    
    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/seasonal-strength-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult,
                variable: selectedVar,
                period,
                sampleSize: data.length,
                autoDetect,
                gaugePlot: analysisResult.plots.gauge,           // 게이지 이미지
                decompositionPlot: analysisResult.plots.decomposition  // 분해 이미지
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Seasonal_Strength_Report_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, selectedVar, period, data.length, autoDetect, toast]);

    const runAnalysis = useCallback(async () => {
        if (!selectedVar) { toast({ variant: 'destructive', title: 'Please select a variable' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/seasonal-strength`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variable: selectedVar, period, test_periods: testPeriods, auto_detect: autoDetect })
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.detail || err.error || 'Analysis failed'); }
            const result: AnalysisResult = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedVar, period, testPeriods, autoDetect, toast]);
    
    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const ssi = analysisResult?.seasonal_strength_index ?? 0;
    const tsi = analysisResult?.trend_strength_index ?? null;
    const getStrengthColor = (value: number) => { if (value > 0.7) return 'text-green-600'; if (value > 0.4) return 'text-amber-600'; return 'text-red-600'; };

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
            <SeasonalStrengthGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            
            <div className="mb-6 flex justify-between items-center">

                
    <div><h1 className="text-2xl font-bold">Seasonal Strength Index</h1><p className="text-muted-foreground mt-1">Measure seasonal pattern strength</p></div>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variable</CardTitle><CardDescription>Choose a numeric variable for seasonal analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label className="text-sm font-medium">Analysis Variable</Label><Select value={selectedVar} onValueChange={setSelectedVar}><SelectTrigger className="h-11"><SelectValue placeholder="Choose variable..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Data points: <span className="font-semibold text-foreground">{data.length}</span> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Configure seasonal analysis parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label className="text-sm font-medium">Period</Label><Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{COMMON_PERIODS.map(p => (<SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>))}</SelectContent></Select><p className="text-xs text-muted-foreground">Seasonal cycle length (e.g., 12 = monthly)</p></div>
                                <div className="space-y-3"><Label className="text-sm font-medium">Test Periods</Label><Input value={customPeriods} onChange={(e) => setCustomPeriods(e.target.value)} placeholder="4,7,12,24" className="h-11"/><p className="text-xs text-muted-foreground">Periods to compare (comma-separated)</p></div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl"><Switch id="auto-detect" checked={autoDetect} onCheckedChange={setAutoDetect}/><Label htmlFor="auto-detect">Auto-detect dominant period via spectral analysis</Label></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Period Selection</h4><p className="text-sm text-muted-foreground"><strong>4:</strong> Quarterly data<br/><strong>12:</strong> Monthly data (annual seasonality)<br/><strong>7:</strong> Daily data (weekly seasonality)</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements for seasonal analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div></div>))}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={runAnalysis} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Zap className="mr-2 h-4 w-4" />Analyze Seasonality</>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly (EFA Style) */}
                {currentStep === 4 && analysisResult && (() => {
                    const isStrong = ssi >= 0.7;
                    const isModerate = ssi >= 0.4;
                    const isGood = isStrong || isModerate;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Seasonal patterns discovered in your data</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings Box */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Your {selectedVar} shows <strong className={getStrengthColor(ssi)}>{analysisResult.interpretation.seasonality.toLowerCase()}</strong> seasonality (SSI = {ssi.toFixed(3)}) — 
                                            {isStrong ? " there's a clear repeating pattern you can plan around." : isModerate ? " there's some seasonal variation worth considering." : " seasonal effects are minimal."}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {tsi !== null 
                                                ? `Trend strength is ${tsi.toFixed(3)} (${analysisResult.interpretation.trend.toLowerCase()}) — ${tsi > 0.5 ? "there's also a significant underlying direction." : "the overall direction is relatively flat."}`
                                                : 'Trend strength could not be calculated.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {analysisResult.dominant_period_detected 
                                                ? `The strongest seasonal cycle is every ${analysisResult.dominant_period_detected} periods — use this for planning.`
                                                : `Analysis used your specified period of ${period}.`}
                                        </p></div>
                                    </div>
                                </div>

                                {/* Conclusion Box */}
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isStrong ? "Strong Seasonal Pattern Confirmed" : isModerate ? "Moderate Seasonality — Consider in Planning" : "Weak Seasonality — May Not Need Seasonal Models"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isStrong 
                                                    ? "Using seasonal models (SARIMA, Prophet) will significantly improve your forecasts." 
                                                    : isModerate 
                                                        ? "Including seasonal components may help, but simpler models could also work."
                                                        : "Simple non-seasonal models may be sufficient for your forecasting needs."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">SSI</p><Waves className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${getStrengthColor(ssi)}`}>{ssi.toFixed(3)}</p><p className="text-xs text-muted-foreground">{analysisResult.interpretation.seasonality}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">TSI</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${tsi ? getStrengthColor(tsi) : 'text-muted-foreground'}`}>{tsi?.toFixed(3) ?? 'N/A'}</p><p className="text-xs text-muted-foreground">{tsi ? analysisResult.interpretation.trend : 'Not available'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Period</p><Calendar className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{analysisResult.dominant_period_detected ?? period}</p><p className="text-xs text-muted-foreground">{analysisResult.dominant_period_detected ? 'Detected' : 'Specified'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Cycles</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{Math.floor(data.length / period)}</p><p className="text-xs text-muted-foreground">In your data</p></div></CardContent></Card>
                                </div>

                                {/* Quality Stars */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Seasonal Strength:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = ssi >= 0.9 ? 5 : ssi >= 0.7 ? 4 : ssi >= 0.5 ? 3 : ssi >= 0.3 ? 2 : 1;
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of how we measured seasonality</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What is SSI?</h4><p className="text-sm text-muted-foreground">The <strong className="text-foreground">Seasonal Strength Index</strong> measures how much of your data's variation comes from repeating seasonal patterns. SSI = 1 - (leftover noise / total variation after removing trend). Closer to 1 means stronger seasonality.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">How We Calculated It</h4><p className="text-sm text-muted-foreground">We separated your data into <strong className="text-foreground">trend</strong> (overall direction), <strong className="text-foreground">seasonal</strong> (repeating pattern), and <strong className="text-foreground">residual</strong> (random noise). Then compared how much the seasonal part explains vs. the noise.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Why Period Matters</h4><p className="text-sm text-muted-foreground">Using the wrong period can hide or exaggerate seasonality. {autoDetect ? 'We automatically detected the strongest cycle.' : `You specified period ${period}.`} {analysisResult.period_comparison.length > 0 && 'Check the comparison table to see how different periods score.'}</p></div></div></div>
                            <div className={`rounded-xl p-5 border ${ssi >= 0.4 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-amber-600" />Practical Recommendations</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">{analysisResult.recommendations.map((rec, i) => (<li key={i} className="flex items-start gap-2"><span className="text-amber-600">•</span>{rec}</li>))}</ul>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && analysisResult && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
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
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Seasonal Strength Analysis Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">{selectedVar} | Period {period} | {data.length} Observations | {new Date().toLocaleDateString()}</p>
                            </div>

                            {/* Main Metrics - 개선된 디자인 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">SSI</p><Waves className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${getStrengthColor(ssi)}`}>{ssi.toFixed(3)}</p><p className="text-xs text-muted-foreground">{analysisResult.interpretation.seasonality}</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">TSI</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${tsi ? getStrengthColor(tsi) : 'text-muted-foreground'}`}>{tsi?.toFixed(3) ?? 'N/A'}</p><p className="text-xs text-muted-foreground">{tsi ? analysisResult.interpretation.trend : 'Not available'}</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Period</p><Calendar className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{analysisResult.dominant_period_detected ?? analysisResult.period}</p><p className="text-xs text-muted-foreground">{analysisResult.dominant_period_detected ? 'Auto-detected' : 'User specified'}</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Cycles</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{Math.floor(data.length / period)}</p><p className="text-xs text-muted-foreground">Complete cycles</p></div></CardContent></Card>
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
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A seasonal strength analysis was conducted on {selectedVar} across <em>N</em> = {data.length} observations 
                                                with a specified seasonal period of {period}. {autoDetect && 'Automatic period detection via spectral analysis was enabled.'}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The Seasonal Strength Index (SSI) was <span className="font-mono">{ssi.toFixed(4)}</span>, 
                                                indicating <strong className={getStrengthColor(ssi)}>{analysisResult.interpretation.seasonality.toLowerCase()}</strong> seasonality. 
                                                {tsi !== null 
                                                    ? ` The Trend Strength Index (TSI) was ${tsi.toFixed(4)}, suggesting ${analysisResult.interpretation.trend.toLowerCase()} trend component.`
                                                    : ' Trend strength could not be calculated for this series.'}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {analysisResult.dominant_period_detected 
                                                    ? `Spectral analysis identified a dominant period of ${analysisResult.dominant_period_detected}, which ${analysisResult.dominant_period_detected === period ? 'matches' : 'differs from'} the specified period of ${period}.`
                                                    : `Analysis was conducted using the user-specified period of ${period}.`}
                                                {' '}The data contains approximately {Math.floor(data.length / period)} complete seasonal cycles.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {ssi >= 0.7 
                                                    ? `The high SSI (≥0.7) confirms strong seasonal patterns. Seasonal forecasting models such as SARIMA or Prophet are recommended for accurate predictions.`
                                                    : ssi >= 0.4
                                                        ? `The moderate SSI (0.4-0.7) suggests meaningful seasonal variation. Including seasonal components in forecasting models may improve accuracy.`
                                                        : `The low SSI (<0.4) indicates weak seasonality. Non-seasonal models may be sufficient, though seasonal terms could be tested for marginal improvement.`}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>


                            {/* Gauge */}
                            <Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.gauge}`} alt="Gauge" className="w-full max-w-2xl mx-auto rounded"/></CardContent></Card>

                            {/* Plots */}
                            <Tabs defaultValue="decomposition">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="decomposition">Decomposition</TabsTrigger>
                                    <TabsTrigger value="pattern">Seasonal Pattern</TabsTrigger>
                                    {analysisResult.plots.periodogram && <TabsTrigger value="periodogram">Periodogram</TabsTrigger>}
                                    {analysisResult.plots.strength_comparison && <TabsTrigger value="comparison">Comparison</TabsTrigger>}
                                </TabsList>
                                <TabsContent value="decomposition"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.decomposition}`} alt="Decomposition" className="w-full rounded border"/></CardContent></Card></TabsContent>
                                <TabsContent value="pattern"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.seasonal_pattern}`} alt="Pattern" className="w-full rounded border"/></CardContent></Card></TabsContent>
                                {analysisResult.plots.periodogram && <TabsContent value="periodogram"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.periodogram}`} alt="Periodogram" className="w-full rounded border"/></CardContent></Card></TabsContent>}
                                {analysisResult.plots.strength_comparison && <TabsContent value="comparison"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.strength_comparison}`} alt="Comparison" className="w-full rounded border"/></CardContent></Card></TabsContent>}
                            </Tabs>

                            {/* Seasonal Indices Table */}
                            <Card><CardHeader><CardTitle>Seasonal Indices</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Position</TableHead><TableHead className="text-right">Index</TableHead><TableHead className="text-right">Std Dev</TableHead><TableHead>Deviation</TableHead></TableRow></TableHeader><TableBody>{analysisResult.seasonal_indices.map((s) => (<TableRow key={s.position} className={s.index > 1.1 ? 'bg-green-50 dark:bg-green-950/20' : s.index < 0.9 ? 'bg-red-50 dark:bg-red-950/20' : ''}><TableCell className="font-medium">{s.position}</TableCell><TableCell className="text-right font-mono">{s.index.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{s.std.toFixed(4)}</TableCell><TableCell className="text-xs">{s.index > 1 ? `+${((s.index - 1) * 100).toFixed(1)}%` : `${((s.index - 1) * 100).toFixed(1)}%`}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {/* Period Comparison */}
                            {analysisResult.period_comparison.length > 0 && (
                                <Card><CardHeader><CardTitle>Period Comparison</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">SSI</TableHead><TableHead className="text-right">TSI</TableHead><TableHead className="text-right">Combined</TableHead></TableRow></TableHeader><TableBody>{analysisResult.period_comparison.map((p) => { const isBest = p.seasonal_strength === Math.max(...analysisResult.period_comparison.map(x => x.seasonal_strength)); return (<TableRow key={p.period} className={isBest ? 'bg-green-50 dark:bg-green-950/20' : ''}><TableCell><div className="flex items-center gap-2"><span className="font-medium">{p.period}</span>{isBest && <Badge variant="default" className="text-xs">Best</Badge>}</div></TableCell><TableCell className={`text-right font-mono ${getStrengthColor(p.seasonal_strength)}`}>{p.seasonal_strength.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{p.trend_strength?.toFixed(4) ?? 'N/A'}</TableCell><TableCell className="text-right font-mono">{p.combined_strength.toFixed(4)}</TableCell></TableRow>); })}</TableBody></Table></CardContent></Card>
                            )}
                        </div>

                        <div className="mt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button>
                        </div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Analyzing seasonal patterns...</p></CardContent></Card>)}
            </div>
        </div>
    );
}

