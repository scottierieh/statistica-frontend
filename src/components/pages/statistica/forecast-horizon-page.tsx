'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lightbulb, CheckCircle, Zap, HelpCircle, BookOpen, Download, FileSpreadsheet, ImageIcon, Target, Clock, TrendingUp, TrendingDown, Timer, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, BarChart3, ChevronDown } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';


const metricDefinitions: Record<string, string> = {
    forecast_horizon: "The number of time steps ahead to predict. Longer horizons typically have higher uncertainty and lower accuracy.",
    rmse: "Root Mean Squared Error. Penalizes large errors heavily. Lower values indicate better accuracy. Units match the original data.",
    mae: "Mean Absolute Error. Average of absolute forecast errors. Less sensitive to outliers than RMSE.",
    mape: "Mean Absolute Percentage Error. Error expressed as percentage. Useful for comparing across different scales.",
    r_squared: "Coefficient of determination. Proportion of variance explained by the model. Range: -∞ to 1. Higher is better.",
    directional_accuracy: "Percentage of times the model correctly predicts the direction of change (up or down).",
    decay_rate: "Rate at which forecast accuracy degrades as horizon increases. Higher rate means faster accuracy loss.",
    optimal_horizon: "The maximum forecast horizon before accuracy drops sharply. Forecasts within this window are most reliable.",
    n_lags: "Number of past observations used as features for prediction. More lags capture longer patterns but risk overfitting.",
    train_ratio: "Proportion of data used for training. Remaining data is used for testing. Typically 70-80%.",
    linear_regression: "Simple model assuming linear relationship between lagged values and future values.",
    ridge_regression: "Linear regression with L2 regularization. Prevents overfitting by penalizing large coefficients.",
    random_forest: "Ensemble of decision trees. Captures non-linear patterns and interactions between features.",
    gradient_boosting: "Sequential ensemble method that builds trees to correct previous errors. Often achieves best accuracy."
};


const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Forecast Horizon Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in horizon sensitivity analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold uppercase">
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

const ForecastHorizonGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Forecast Horizon Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                What is Horizon Sensitivity?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                <strong>Horizon Sensitivity</strong> measures how forecast accuracy changes as you 
                predict further into the future. Generally, <strong>longer horizons = more error</strong>.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Insight:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1-step ahead forecasts are usually most accurate.<br/>
                    Error accumulates with each additional step.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Why Does This Matter?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Planning Decisions</p>
                  <p className="text-xs text-muted-foreground">
                    Know how far ahead you can reliably forecast.<br/>
                    Set realistic expectations for stakeholders.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Resource Allocation</p>
                  <p className="text-xs text-muted-foreground">
                    Focus modeling effort on reliable windows.<br/>
                    Use simpler methods for long horizons.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Understanding Decay Rate
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">What is Decay Rate?</p>
                  <p className="text-xs text-muted-foreground">
                    Measures how quickly accuracy degrades with horizon.<br/>
                    <strong>High decay</strong> = accuracy drops fast, short reliable window.<br/>
                    <strong>Low decay</strong> = accuracy stable, longer reliable window.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-muted/30 rounded text-center border border-border">
                    <p className="font-bold text-green-600">&lt; 0.05</p>
                    <p className="text-muted-foreground">Low decay</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded text-center border border-border">
                    <p className="font-bold text-amber-600">0.05 - 0.15</p>
                    <p className="text-muted-foreground">Moderate</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded text-center border border-border">
                    <p className="font-bold text-red-600">&gt; 0.15</p>
                    <p className="text-muted-foreground">High decay</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Key Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">RMSE / MAE</p>
                  <p className="text-xs text-muted-foreground">
                    Absolute error measures. <strong>Lower is better.</strong><br/>
                    RMSE penalizes large errors more heavily.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">R² (Coefficient of Determination)</p>
                  <p className="text-xs text-muted-foreground">
                    Variance explained by model. <strong>Higher is better.</strong><br/>
                    R² &lt; 0 means worse than predicting the mean.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Directional Accuracy</p>
                  <p className="text-xs text-muted-foreground">
                    % of correct up/down predictions. <strong>50% is random.</strong><br/>
                    Useful for trading and direction-critical decisions.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Practical Recommendations
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">If Decay is High</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Focus on short-term forecasts</li>
                    <li>• Use rolling/updating models</li>
                    <li>• Widen confidence intervals</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">If Decay is Low</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Longer forecasts are viable</li>
                    <li>• Less frequent model updates</li>
                    <li>• More stable planning possible</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> The optimal horizon is the maximum 
                reliable forecast window. Beyond this point, accuracy drops sharply and forecasts 
                should be used with extreme caution or replaced with scenario planning.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


interface Insight { type: 'warning' | 'info'; title: string; description: string; }
interface HorizonResult { horizon: number; n_predictions: number; rmse: number; mae: number; mape: number | null; r2: number | null; directional_accuracy: number | null; }
interface DecayInfo { decay_rate: number; r_squared: number; p_value: number; interpretation: string; }
interface OptimalHorizon { optimal_horizon: number; threshold_exceeded_at?: number; base_value?: number; exceeded_value?: number; pct_increase?: number; note?: string; }
interface Summary { n_observations: number; model_type: string; n_lags: number; train_ratio: number; horizons_tested: number[]; best_horizon_rmse: number; worst_horizon_rmse: number; }
interface AnalysisResult { variable: string; summary: Summary; results: HorizonResult[]; decay_info: DecayInfo | null; optimal_horizon: OptimalHorizon | null; insights: Insight[]; recommendations: string[]; plots: { metrics: string; error_distribution?: string; actual_vs_predicted?: string; forecast_comparison: string; heatmap?: string; }; error?: string; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [{ id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' }, { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }];
const MODEL_OPTIONS = [{ value: 'linear', label: 'Linear Regression' }, { value: 'ridge', label: 'Ridge Regression' }, { value: 'random_forest', label: 'Random Forest' }, { value: 'gradient_boosting', label: 'Gradient Boosting' }];

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'timeseries' || d.id === 'time_series');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Timer className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Forecast Horizon Sensitivity</CardTitle>
                    <CardDescription className="text-base mt-2">Analyze how forecast accuracy degrades as horizon increases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Clock className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Multi-Horizon</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Test 1-step to n-step ahead</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingDown className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Decay Analysis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Measure degradation rate</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Optimal Horizon</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Find max reliable window</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Understanding accuracy degradation helps set realistic forecast expectations.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2"><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />Metrics</h4><ul className="space-y-1 text-sm text-muted-foreground"><li>RMSE, MAE, MAPE, R²</li><li>Directional Accuracy</li></ul></div>
                            <div><h4 className="font-semibold text-sm mb-2"><AlertTriangle className="w-4 h-4 text-amber-600 inline mr-1" />Questions</h4><ul className="space-y-1 text-sm text-muted-foreground"><li>How far can we forecast?</li><li>What's the optimal horizon?</li></ul></div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Timer className="mr-2 h-5 w-5" />Load Example</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface ForecastHorizonPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function ForecastHorizonPage({ data, numericHeaders, onLoadExample }: ForecastHorizonPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [selectedVar, setSelectedVar] = useState<string>('');
    const [modelType, setModelType] = useState('linear');
    const [nLags, setNLags] = useState(10);
    const [trainRatio, setTrainRatio] = useState(0.7);
    const [horizonsInput, setHorizonsInput] = useState('1,3,5,7,10,14');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
const [showGuide, setShowGuide] = useState(false);
const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

    const canRun = useMemo(() => data.length >= 50 && numericHeaders.length >= 1, [data, numericHeaders]);
    const horizons = useMemo(() => horizonsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0), [horizonsInput]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Variable selected', passed: !!selectedVar, message: selectedVar ? `Selected: ${selectedVar}` : 'Please select a variable' });
        checks.push({ label: 'Sufficient data', passed: data.length >= 50, message: `${data.length} observations (50+ recommended)` });
        checks.push({ label: 'Horizons configured', passed: horizons.length > 0, message: horizons.length > 0 ? `${horizons.length} horizons: ${horizons.join(', ')}` : 'Enter horizons' });
        checks.push({ label: 'Valid lag count', passed: nLags >= 3 && nLags <= data.length / 3, message: `Lags = ${nLags}` });
        return checks;
    }, [selectedVar, data.length, horizons, nLags]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) runAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => { setSelectedVar(''); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1); setView(canRun ? 'main' : 'intro'); }, [data, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `ForecastHorizon_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png'); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const csvData = [['Forecast Horizon Sensitivity Results'], [''], ['Configuration'], ['Variable', analysisResult.variable], ['Model', analysisResult.summary.model_type], ['Lags', analysisResult.summary.n_lags], ['Train Ratio', analysisResult.summary.train_ratio], [''], ['Horizon Results'], ['Horizon', 'N', 'RMSE', 'MAE', 'MAPE (%)', 'R²', 'Dir. Acc (%)'], ...analysisResult.results.map(r => [r.horizon, r.n_predictions, r.rmse?.toFixed(6), r.mae?.toFixed(6), r.mape?.toFixed(2), r.r2?.toFixed(4), r.directional_accuracy?.toFixed(1)])];
        if (analysisResult.decay_info) csvData.push([''], ['Decay Analysis'], ['Decay Rate', analysisResult.decay_info.decay_rate]);
        if (analysisResult.optimal_horizon) csvData.push([''], ['Optimal Horizon', analysisResult.optimal_horizon.optimal_horizon]);
        const csv = Papa.unparse(csvData);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `ForecastHorizon_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download started" });
    }, [analysisResult, toast]);

    const runAnalysis = useCallback(async () => {
        if (!selectedVar || horizons.length === 0) { toast({ variant: 'destructive', title: 'Configuration required' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/forecast-horizon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, variable: selectedVar, model_type: modelType, horizons, n_lags: nLags, train_ratio: trainRatio }) });
            if (!response.ok) throw new Error((await response.json()).detail || 'Analysis failed');
            const result: AnalysisResult = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedVar, modelType, horizons, nLags, trainRatio, toast]);
    
    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;
    const summary = analysisResult?.summary;
    const best = results ? results.reduce((a, b) => a.rmse < b.rmse ? a : b) : null;
    const worst = results ? results.reduce((a, b) => a.rmse > b.rmse ? a : b) : null;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = step.id === currentStep;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button key={step.id} onClick={() => isAccessible && goToStep(step.id as Step)} disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
            <div><h1 className="text-2xl font-bold">Forecast Horizon Sensitivity</h1><p className="text-muted-foreground mt-1">Analyze accuracy degradation</p></div>
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
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variable</CardTitle><CardDescription>Choose time series to analyze</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2"><Label>Variable</Label><Select value={selectedVar} onValueChange={setSelectedVar}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground"><strong>{data.length}</strong> observations available</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Configure horizon parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Model</Label><Select value={modelType} onValueChange={setModelType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MODEL_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Horizons (comma-separated)</Label><Input value={horizonsInput} onChange={(e) => setHorizonsInput(e.target.value)} placeholder="1,3,5,7,10,14" /></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2"><Label>Number of Lags: {nLags}</Label><Slider value={[nLags]} onValueChange={([v]) => setNLags(v)} min={3} max={30} step={1}/><p className="text-xs text-muted-foreground">Lagged features for AR model</p></div>
                                <div className="space-y-2"><Label>Train Ratio: {(trainRatio * 100).toFixed(0)}%</Label><Slider value={[trainRatio]} onValueChange={([v]) => setTrainRatio(v)} min={0.5} max={0.9} step={0.05}/><p className="text-xs text-muted-foreground">Training data proportion</p></div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Variable:</strong> {selectedVar || 'Not selected'}</p><p>• <strong className="text-foreground">Model:</strong> {MODEL_OPTIONS.find(o => o.value === modelType)?.label}</p><p>• <strong className="text-foreground">Horizons:</strong> {horizons.join(', ') || 'None'}</p></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {validationChecks.map((check, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${check.passed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                        <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}<div><p className="font-medium text-sm">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                                        <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? 'Pass' : 'Fail'}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Zap className="mr-2 h-4 w-4" />Analyze Horizons</>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && summary && best && worst && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Horizon Sensitivity Summary</CardTitle><CardDescription>{selectedVar} - {horizons.length} horizons tested</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Optimal horizon: <strong className="text-blue-600">h = {analysisResult?.optimal_horizon?.optimal_horizon ?? best.horizon}</strong> — lowest RMSE ({best.rmse.toFixed(4)})</p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Error increase: RMSE grows <strong className="text-red-600">{((worst.rmse - best.rmse) / best.rmse * 100).toFixed(1)}%</strong> from h={best.horizon} to h={worst.horizon}</p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{analysisResult?.decay_info && `Decay rate: ${analysisResult.decay_info.decay_rate.toFixed(4)} — ${analysisResult.decay_info.interpretation}`}</p></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><p className="text-sm font-medium text-muted-foreground">Observations</p><p className="text-2xl font-semibold">{summary.n_observations}</p></div></CardContent></Card>
                                <Card className="bg-green-50 dark:bg-green-900/20"><CardContent className="p-6"><div className="space-y-2"><p className="text-sm font-medium text-muted-foreground">Best Horizon</p><p className="text-2xl font-semibold text-green-600">h = {best.horizon}</p></div></CardContent></Card>
                                <Card className="bg-red-50 dark:bg-red-900/20"><CardContent className="p-6"><div className="space-y-2"><p className="text-sm font-medium text-muted-foreground">Worst Horizon</p><p className="text-2xl font-semibold text-red-600">h = {worst.horizon}</p></div></CardContent></Card>
                                <Card className="bg-blue-50 dark:bg-blue-900/20"><CardContent className="p-6"><div className="space-y-2"><p className="text-sm font-medium text-muted-foreground">Optimal</p><p className="text-2xl font-semibold text-blue-600">{analysisResult?.optimal_horizon?.optimal_horizon ?? 'N/A'}</p></div></CardContent></Card>
                            </div>
                            <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Predictability:</span>{[1,2,3,4,5].map(star => { const score = best.r2 && best.r2 > 0.8 ? 5 : best.r2 && best.r2 > 0.6 ? 4 : best.r2 && best.r2 > 0.4 ? 3 : 2; return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;})}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && best && worst && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Understanding horizon sensitivity</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What is Horizon Sensitivity?</h4><p className="text-sm text-muted-foreground">Forecast error <strong className="text-foreground">increases with longer horizons</strong> due to cumulative uncertainty. Short-term forecasts are more accurate than long-term ones.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Decay Rate</h4><p className="text-sm text-muted-foreground">Error growth is modeled with an <strong className="text-foreground">exponential function</strong>. Higher decay rate means faster accuracy degradation; lower rate means longer reliable forecast window. {analysisResult?.decay_info && `Current decay rate: ${analysisResult.decay_info.decay_rate.toFixed(4)}`}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Optimal Horizon</h4><p className="text-sm text-muted-foreground">The maximum horizon <strong className="text-foreground">before error spikes sharply</strong>. Forecasts within this window are reliable. Current: <strong>h = {analysisResult?.optimal_horizon?.optimal_horizon ?? best.horizon}</strong></p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Practical Recommendations</h4><ul className="text-sm text-muted-foreground space-y-1">{analysisResult?.recommendations.map((rec, i) => <li key={i}>• {rec}</li>)}</ul></div></div></div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4><p className="text-sm text-muted-foreground">Best horizon h={best.horizon} achieves RMSE={best.rmse.toFixed(4)} with R²={best.r2?.toFixed(4) ?? 'N/A'}. Error increases {((worst.rmse - best.rmse) / best.rmse * 100).toFixed(1)}% at h={worst.horizon}.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && analysisResult && results && best && worst && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full horizon analysis</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Forecast Horizon Sensitivity Report</h2><p className="text-sm text-muted-foreground mt-1">{selectedVar} | {horizons.length} horizons | {MODEL_OPTIONS.find(o => o.value === modelType)?.label} | {new Date().toLocaleDateString()}</p></div>
                            <Tabs defaultValue="metrics">
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                                    <TabsTrigger value="forecast">Forecasts</TabsTrigger>
                                    {analysisResult.plots.actual_vs_predicted && <TabsTrigger value="scatter">Actual vs Pred</TabsTrigger>}
                                    {analysisResult.plots.error_distribution && <TabsTrigger value="errors">Errors</TabsTrigger>}
                                    {analysisResult.plots.heatmap && <TabsTrigger value="heatmap">Heatmap</TabsTrigger>}
                                </TabsList>
                                <TabsContent value="metrics"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.metrics}`} alt="Metrics" className="w-full rounded border"/></CardContent></Card></TabsContent>
                                <TabsContent value="forecast"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.forecast_comparison}`} alt="Forecast" className="w-full rounded border"/></CardContent></Card></TabsContent>
                                {analysisResult.plots.actual_vs_predicted && <TabsContent value="scatter"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.actual_vs_predicted}`} alt="Scatter" className="w-full rounded border"/></CardContent></Card></TabsContent>}
                                {analysisResult.plots.error_distribution && <TabsContent value="errors"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.error_distribution}`} alt="Errors" className="w-full rounded border"/></CardContent></Card></TabsContent>}
                                {analysisResult.plots.heatmap && <TabsContent value="heatmap"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${analysisResult.plots.heatmap}`} alt="Heatmap" className="w-full rounded border"/></CardContent></Card></TabsContent>}
                            </Tabs>
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
                                                A forecast horizon sensitivity analysis was conducted on {selectedVar} using <em>N</em> = {analysisResult.summary.n_observations} observations. 
                                                A {MODEL_OPTIONS.find(o => o.value === modelType)?.label} model with {nLags} lagged features was trained on {(trainRatio * 100).toFixed(0)}% of the data, 
                                                evaluating forecast accuracy across {horizons.length} horizons (h = {horizons.join(', ')}).
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The optimal forecast horizon was h = {best.horizon}, achieving RMSE = {best.rmse.toFixed(4)}, MAE = {best.mae.toFixed(4)}
                                                {best.mape !== null ? `, and MAPE = ${best.mape.toFixed(2)}%` : ''}
                                                {best.r2 !== null ? `. The model explained ${(best.r2 * 100).toFixed(1)}% of variance (R² = ${best.r2.toFixed(4)})` : ''}
                                                {best.directional_accuracy !== null ? ` with ${best.directional_accuracy.toFixed(1)}% directional accuracy` : ''}.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                Forecast accuracy degraded as horizon increased. At h = {worst.horizon}, RMSE increased to {worst.rmse.toFixed(4)}, 
                                                representing a {((worst.rmse - best.rmse) / best.rmse * 100).toFixed(1)}% increase from the best horizon. 
                                                {analysisResult.decay_info 
                                                    ? ` The error decay analysis revealed a decay rate of ${analysisResult.decay_info.decay_rate.toFixed(4)} (R² = ${analysisResult.decay_info.r_squared.toFixed(3)}, p ${analysisResult.decay_info.p_value < 0.001 ? '< .001' : `= ${analysisResult.decay_info.p_value.toFixed(3)}`}), indicating ${analysisResult.decay_info.interpretation.toLowerCase()}.`
                                                    : ''}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {analysisResult.optimal_horizon 
                                                    ? `The recommended maximum reliable forecast window is h = ${analysisResult.optimal_horizon.optimal_horizon}. `
                                                    : ''}
                                                {best.r2 !== null && best.r2 > 0.7 
                                                    ? 'The high R² at short horizons suggests strong predictability for near-term forecasts. '
                                                    : best.r2 !== null && best.r2 > 0.4 
                                                        ? 'Moderate R² values indicate reasonable but limited predictive capability. '
                                                        : 'Low R² values suggest limited predictability; consider alternative modeling approaches. '}
                                                {worst.r2 !== null && worst.r2 < 0 
                                                    ? 'Negative R² at longer horizons indicates the model performs worse than a simple mean prediction, suggesting forecasts beyond the optimal horizon should be used with extreme caution.'
                                                    : 'Forecasts should be used with increasing caution as the horizon extends beyond the optimal window.'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>


                            <Card><CardHeader><CardTitle>Horizon Performance Comparison</CardTitle></CardHeader><CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Horizon</TableHead><TableHead className="text-right">N</TableHead><TableHead className="text-right">RMSE</TableHead><TableHead className="text-right">MAE</TableHead><TableHead className="text-right">MAPE (%)</TableHead><TableHead className="text-right">R²</TableHead><TableHead className="text-right">Dir. Acc (%)</TableHead></TableRow></TableHeader>
                                    <TableBody>{results.map((r) => <TableRow key={r.horizon} className={r.horizon === best.horizon ? 'bg-green-50 dark:bg-green-950/20' : r.horizon === worst.horizon ? 'bg-red-50 dark:bg-red-950/20' : ''}><TableCell><div className="flex items-center gap-2"><Badge variant={r.horizon === best.horizon ? 'default' : r.horizon === worst.horizon ? 'destructive' : 'outline'}>h = {r.horizon}</Badge>{r.horizon === analysisResult?.optimal_horizon?.optimal_horizon && <Badge variant="secondary" className="text-xs">Optimal</Badge>}</div></TableCell><TableCell className="text-right">{r.n_predictions}</TableCell><TableCell className="text-right font-mono">{r.rmse.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{r.mae.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{r.mape?.toFixed(2) ?? 'N/A'}</TableCell><TableCell className={`text-right font-mono ${(r.r2 ?? 0) < 0 ? 'text-red-600' : ''}`}>{r.r2?.toFixed(4) ?? 'N/A'}</TableCell><TableCell className="text-right font-mono">{r.directional_accuracy?.toFixed(1) ?? 'N/A'}</TableCell></TableRow>)}</TableBody>
                                </Table>
                            </CardContent></Card>
                            {analysisResult.decay_info && <Card><CardHeader><CardTitle>Error Decay Analysis</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-3 gap-4"><div className="bg-muted/50 rounded-lg p-4 text-center"><p className="text-xs text-muted-foreground">Decay Rate</p><p className="text-2xl font-bold">{analysisResult.decay_info.decay_rate.toFixed(4)}</p><p className="text-xs text-muted-foreground">{analysisResult.decay_info.interpretation}</p></div><div className="bg-muted/50 rounded-lg p-4 text-center"><p className="text-xs text-muted-foreground">Fit R²</p><p className="text-2xl font-bold">{analysisResult.decay_info.r_squared.toFixed(4)}</p></div><div className="bg-muted/50 rounded-lg p-4 text-center"><p className="text-xs text-muted-foreground">P-value</p><p className="text-2xl font-bold">{analysisResult.decay_info.p_value.toFixed(4)}</p></div></div></CardContent></Card>}
                            {analysisResult.insights.length > 0 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-blue-500"/>Key Insights</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-2 gap-4">{analysisResult.insights.map((insight, i) => <div key={i} className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-4 border border-blue-300 dark:border-blue-700"><div className="flex items-start gap-2">{insight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5"/> : <CheckCircle className="w-4 h-4 text-green-500 mt-0.5"/>}<div><strong>{insight.title}</strong><p className="text-sm text-muted-foreground mt-1">{insight.description}</p></div></div></div>)}</div></CardContent></Card>}
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Testing {horizons.length} forecast horizons...</p></CardContent></Card>)}
            </div>
            
            {/* Modals */}
            <ForecastHorizonGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        </div>
    );
}