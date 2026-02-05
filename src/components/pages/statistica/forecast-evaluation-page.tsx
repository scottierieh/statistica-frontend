'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, Activity, Info, FileType, TrendingUp, CheckCircle, Download, FileSpreadsheet, ImageIcon, HelpCircle, Settings, FileSearch, BookOpen, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, Lightbulb, BarChart3, ChevronDown } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';


const metricDefinitions: Record<string, string> = {
    rmse: "Root Mean Squared Error. Penalizes large errors more heavily. Lower values indicate better forecast accuracy. Units are the same as the original data.",
    mae: "Mean Absolute Error. Average of absolute forecast errors. Less sensitive to outliers than RMSE. Lower is better.",
    mape: "Mean Absolute Percentage Error. Average percentage error. Useful for comparing across different scales. Lower is better.",
    mase: "Mean Absolute Scaled Error. Compares forecast accuracy to naive seasonal baseline. MASE < 1 means better than naive. Scale-independent metric.",
    coverage: "Prediction Interval Coverage. Percentage of actual values falling within the forecast confidence interval. Should be close to the nominal level (e.g., 95%).",
    sarima: "Seasonal ARIMA. Autoregressive model capturing both trend and seasonal patterns. Auto-fitted using information criteria.",
    holt_winters: "Holt-Winters exponential smoothing. Captures level, trend, and seasonality. Available in additive and multiplicative forms.",
    ets: "Error-Trend-Seasonal state space model. Automatically selects the best combination of error, trend, and seasonal components.",
    naive_seasonal: "Simple benchmark that uses the value from the same season last year as the forecast. Used as baseline for MASE calculation.",
    test_set: "Hold-out sample used to evaluate forecast accuracy. Not used in model fitting. Simulates real forecasting scenario.",
    training_set: "Data used to estimate model parameters. Should contain enough observations to capture patterns.",
    cross_validation: "Rolling origin evaluation. More robust than single train/test split. Repeatedly tests on different time windows.",
    forecast_horizon: "Number of periods ahead to forecast. Longer horizons typically have higher uncertainty."
};


interface ModelResult {
    Method: string;
    RMSE: number | null;
    MAE: number | null;
    "MAPE (%)": number | null;
    MASE: number | null;
    "Coverage (95% PI)": number | null;
    error?: string;
}

interface FullAnalysisResponse {
    results: ModelResult[];
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

const generateInterpretations = (results: ModelResult[]) => {
    const insights: string[] = [];
    const validResults = results.filter(r => r.RMSE !== null).sort((a, b) => (a.RMSE || Infinity) - (b.RMSE || Infinity));
    
    if (validResults.length === 0) {
        return {
            overall_analysis: 'No models were successfully evaluated. Check data quality and observation count.',
            test_insights: ['All models failed to fit. This may indicate data quality issues or insufficient observations.'],
            recommendations: 'Ensure time series has at least 24 observations with no missing values.'
        };
    }
    
    const best = validResults[0];
    let overall = `${best.Method} achieved the best forecast accuracy (RMSE = ${best.RMSE?.toFixed(2)}).`;
    
    if (best.MASE !== null && best.MASE < 1) {
        overall += ` MASE of ${best.MASE.toFixed(2)} indicates outperformance vs naive seasonal forecast.`;
    }
    
    validResults.forEach((model, idx) => {
        insights.push(`${model.Method} (Rank ${idx + 1}): RMSE=${model.RMSE?.toFixed(2) || 'N/A'}, MAE=${model.MAE?.toFixed(2) || 'N/A'}, MAPE=${model['MAPE (%)']?.toFixed(1) || 'N/A'}%`);
    });
    
    const failedModels = results.filter(r => r.error);
    if (failedModels.length > 0) {
        insights.push(`Note: ${failedModels.length} model(s) failed to fit: ${failedModels.map(m => m.Method).join(', ')}`);
    }
    
    let recommendations = '';
    if (best.Method === 'Naive Seasonal') {
        recommendations = 'Naive seasonal is best. Strong seasonality exists but limited trend.';
    } else if (best.Method === 'SARIMA') {
        recommendations = 'SARIMA performs best. Data has both trend and seasonality. Fine-tune parameters.';
    } else if (best.Method.includes('Holt')) {
        recommendations = 'Exponential smoothing performs well. Consider Holt-Winters if seasonality exists.';
    } else {
        recommendations = 'Review assumptions of the best model. Use cross-validation for more robust evaluation.';
    }
    
    return { overall_analysis: overall, test_insights: insights, recommendations };
};


const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Forecast Evaluation Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in forecast model evaluation
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

const ForecastEvaluationGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Forecast Evaluation Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                What is Forecast Evaluation?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                <strong>Forecast Evaluation</strong> compares multiple forecasting models on your data 
                to find which one makes the most accurate predictions. It uses a hold-out test set 
                to simulate real forecasting scenarios.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Idea:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Train models on past data, test on recent data.<br/>
                    Compare accuracy metrics to find the best model.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Models Compared
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">SARIMA</p>
                  <p className="text-xs text-muted-foreground">
                    Seasonal ARIMA with auto-selected parameters.<br/>
                    Good for trend + seasonality.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Holt-Winters</p>
                  <p className="text-xs text-muted-foreground">
                    Exponential smoothing with trend + seasonality.<br/>
                    Fast and often effective.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">ETS</p>
                  <p className="text-xs text-muted-foreground">
                    State space model with auto-selection.<br/>
                    Flexible error/trend/seasonal.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Naive Seasonal</p>
                  <p className="text-xs text-muted-foreground">
                    Simple benchmark using last year's value.<br/>
                    Baseline for MASE calculation.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Understanding the Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">RMSE (Root Mean Squared Error)</p>
                  <p className="text-xs text-muted-foreground">
                    Penalizes large errors heavily. <strong>Lower is better.</strong><br/>
                    Same units as your data.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">MAE (Mean Absolute Error)</p>
                  <p className="text-xs text-muted-foreground">
                    Average size of errors. <strong>Lower is better.</strong><br/>
                    Less sensitive to outliers than RMSE.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">MAPE (Mean Absolute Percentage Error)</p>
                  <p className="text-xs text-muted-foreground">
                    Error as percentage. <strong>Lower is better.</strong><br/>
                    Easy to interpret across scales.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">MASE (Mean Absolute Scaled Error)</p>
                  <p className="text-xs text-muted-foreground">
                    Compares to naive seasonal. <strong>MASE &lt; 1 = better than naive.</strong><br/>
                    Scale-independent, great for comparison.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                How to Interpret Results
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Good Results</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• MASE &lt; 1 (beats naive)</li>
                    <li>• Low MAPE (&lt; 10% often good)</li>
                    <li>• Coverage near 95%</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Warning Signs</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• MASE ≥ 1 (naive is as good)</li>
                    <li>• Very high MAPE (&gt; 30%)</li>
                    <li>• Coverage far from 95%</li>
                  </ul>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> If MASE ≥ 1 for all models, the data may be hard to forecast. 
                  Consider data transformation or external variables.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Limitations
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  • Single train/test split can be unstable<br/>
                  • Consider cross-validation for robust selection<br/>
                  • Best model on test set may not be best for future<br/>
                  • Ensemble methods often outperform single models
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> The best model on the test set 
                gives a good indication, but forecasting is inherently uncertain. Use prediction 
                intervals and monitor forecast performance over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.analysisTypes.includes('arima'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BarChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Forecast Model Evaluation</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare multiple forecasting models on your time series
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">SARIMA</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Seasonal ARIMA
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Exp. Smoothing</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Holt-Winters
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Benchmarks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Naive seasonal
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Automatically compare multiple forecasting methods to find the best model.
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
                                        <span><strong>Columns:</strong> Time & value columns</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 24+ observations</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Metrics
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Accuracy:</strong> RMSE, MAE, MAPE</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>MASE:</strong> Comparison vs naive</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <BarChart className="mr-2 h-5 w-5" />
                                Load Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ForecastEvaluationPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function ForecastEvaluationPage({ data, allHeaders, onLoadExample }: ForecastEvaluationPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    const numericHeaders = useMemo(() => allHeaders.filter(h => { const sample = data[0]?.[h]; return typeof sample === 'number' || !isNaN(Number(sample)); }), [allHeaders, data]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Time column selected', passed: !!timeCol, message: timeCol ? `Selected: ${timeCol}` : 'Please select time column' });
        checks.push({ label: 'Value column selected', passed: !!valueCol, message: valueCol ? `Selected: ${valueCol}` : 'Please select value column' });
        checks.push({ label: 'Sufficient data', passed: data.length >= 24, message: `${data.length} observations (24+ recommended)` });
        checks.push({ label: 'Test period available', passed: data.length >= 36, message: data.length >= 36 ? '12 observations for testing' : 'Test period may be limited' });
        return checks;
    }, [timeCol, valueCol, data.length]);

    const allChecksPassed = validationChecks.filter(c => c.label !== 'Test period available').every(c => c.passed);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    
    useEffect(() => {
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'));
        setTimeCol(dateCol || allHeaders[0]);
        setValueCol(numericHeaders.find(h => h !== dateCol) || numericHeaders[0]);
        setAnalysisResult(null);
        setCurrentStep(1);
        setMaxReachedStep(1);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!timeCol || !valueCol) { toast({ variant: 'destructive', title: 'Error', description: 'Select columns.' }); return; }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/forecast-evaluation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, timeCol, valueCol }) });
            if (!response.ok) throw new Error((await response.json()).detail || 'Analysis failed');
            const result: FullAnalysisResponse = await response.json();
            result.interpretations = generateInterpretations(result.results);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, timeCol, valueCol, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ForecastEval_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const csvData = [['Forecast Model Evaluation Results'], [''], ['Configuration'], ['Time Column', timeCol || ''], ['Value Column', valueCol || ''], ['Test Period', 'Last 12 observations'], [''], ['Model Comparison'], ['Method', 'RMSE', 'MAE', 'MAPE (%)', 'MASE', 'Coverage (95% PI)'], ...analysisResult.results.map(r => [r.Method, r.RMSE?.toFixed(4) || 'N/A', r.MAE?.toFixed(4) || 'N/A', r['MAPE (%)']?.toFixed(2) || 'N/A', r.MASE?.toFixed(4) || 'N/A', r['Coverage (95% PI)']?.toFixed(2) || 'N/A'])];
        const csv = Papa.unparse(csvData);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `ForecastEval_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download started" });
    }, [analysisResult, timeCol, valueCol, toast]);

const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/forecast-evaluation-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                analysisResult,
                valueCol,
                timeCol,
                sampleSize: data.length,
                testPeriod: 12
            })
        });
        if (!response.ok) throw new Error('Failed');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ForecastEval_Report_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, valueCol, timeCol, data.length, toast]);

    const findBestModel = (results: ModelResult[], metric: keyof ModelResult, lowerIsBetter: boolean) => {
        const validResults = results.filter(r => r[metric] !== null && r[metric] !== undefined && !isNaN(r[metric] as number));
        if (validResults.length === 0) return null;
        const best = validResults.reduce((best, current) => lowerIsBetter ? ((current[metric] as number) < (best[metric] as number) ? current : best) : ((current[metric] as number) > (best[metric] as number) ? current : best));
        return best.Method;
    };

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;
    const bestRMSE = results ? findBestModel(results, 'RMSE', true) : null;
    const bestMAE = results ? findBestModel(results, 'MAE', true) : null;
    const bestMAPE = results ? findBestModel(results, 'MAPE (%)', true) : null;
    const bestMASE = results ? findBestModel(results, 'MASE', true) : null;
    const validResults = results?.filter(r => r.RMSE !== null) || [];
    const bestResult = validResults.find(r => r.Method === bestRMSE);

    const metricTooltips: Record<string, string> = { RMSE: "Root Mean Squared Error. Lower is better.", MAE: "Mean Absolute Error. Lower is better.", "MAPE (%)": "Mean Absolute Percentage Error. Lower is better.", MASE: "Mean Absolute Scaled Error. <1 means better than naive.", "Coverage (95% PI)": "Coverage of 95% Prediction Interval." };

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
                <div><h1 className="text-2xl font-bold">Forecast Model Evaluation</h1><p className="text-muted-foreground mt-1">Compare forecasting models</p></div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose time and value columns</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Time Column</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Value Column</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericHeaders.filter(h => h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground"><strong>{data.length}</strong> observations available</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Evaluation Settings</CardTitle><CardDescription>Models to compare</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-4">
                                <h4 className="font-medium text-sm">Models to Evaluate</h4>
                                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />SARIMA (auto parameters)</div>
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />Holt-Winters (add/mul)</div>
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />ETS (state space)</div>
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />Naive Seasonal (benchmark)</div>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Evaluation Method</h4>
                                <p className="text-sm text-muted-foreground">Last 12 observations are used as test set. All models are fitted on training data and evaluated on test data.</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Time:</strong> {timeCol || 'Not selected'}</p><p>• <strong className="text-foreground">Value:</strong> {valueCol || 'Not selected'}</p><p>• <strong className="text-foreground">Test Period:</strong> Last 12 observations</p></div></div>
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
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${check.passed ? 'bg-primary/5 border-primary/30' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'}`}>
                                        <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}<div><p className="font-medium text-sm">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                                        <Badge variant={check.passed ? "default" : "secondary"}>{check.passed ? 'Pass' : 'Warning'}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Evaluating...</> : <><Sigma className="mr-2 h-4 w-4" />Compare Models</>}</Button></CardFooter>
                    </Card>
                )}
                {/* Step 4: Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Best model for {valueCol}</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Best model: <strong className="text-green-600">{bestRMSE || 'N/A'}</strong> — lowest RMSE ({bestResult?.RMSE?.toFixed(2) || 'N/A'})</p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Models evaluated: <strong>{validResults.length}</strong> successfully fitted</p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{analysisResult?.interpretations?.recommendations}</p></div>
                                </div>
                            </div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <div className="flex items-start gap-3"><CheckCircle2 className="w-6 h-6 text-primary" /><div><p className="font-semibold">Winner: {bestRMSE}</p><p className="text-sm text-muted-foreground mt-1">RMSE = {bestResult?.RMSE?.toFixed(2)}, MAE = {bestResult?.MAE?.toFixed(2)}, MAPE = {bestResult?.['MAPE (%)']?.toFixed(1)}%</p></div></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Best Model</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-xl font-semibold text-green-600">{bestRMSE || 'N/A'}</p><p className="text-xs text-muted-foreground">Lowest RMSE</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Best RMSE</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{bestResult?.RMSE?.toFixed(2) || 'N/A'}</p><p className="text-xs text-muted-foreground">Root mean squared error</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Best MAPE</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{bestResult?.['MAPE (%)']?.toFixed(1) || 'N/A'}%</p><p className="text-xs text-muted-foreground">Percentage error</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">MASE</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${bestResult?.MASE && bestResult.MASE < 1 ? 'text-green-600' : ''}`}>{bestResult?.MASE?.toFixed(2) || 'N/A'}</p><p className="text-xs text-muted-foreground">{bestResult?.MASE && bestResult.MASE < 1 ? 'Better than naive' : 'Naive level'}</p></div></CardContent></Card>
                            </div>
                            <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Model Quality:</span>{[1,2,3,4,5].map(star => { const score = bestResult?.MASE && bestResult.MASE < 1 ? 5 : bestResult?.MASE && bestResult.MASE < 1.5 ? 3 : 2; return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;})}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Understanding forecast evaluation</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">Out-of-Sample Evaluation</h4><p className="text-sm text-muted-foreground">Last 12 observations are held out as <strong className="text-foreground">test set</strong>. Models are trained on remaining data and evaluated on test data. This simulates real forecasting scenarios.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Evaluation Metrics</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">RMSE:</strong> Penalizes large errors more<br/><strong className="text-foreground">MAE:</strong> Equal weight to all errors<br/><strong className="text-foreground">MASE:</strong> Relative to naive forecast. &lt;1 = outperforms naive<br/>All metrics: <strong className="text-foreground">lower is better</strong></p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Model Selection Criteria</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">RMSE</strong> is used as primary criterion. However, consider other metrics for comprehensive evaluation. Especially check if MASE &lt; 1 — if ≥1, even simple naive forecast is effective.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Limitations</h4><p className="text-sm text-muted-foreground">Single train/test split may be unstable. Time series cross-validation (rolling origin) provides more robust evaluation. Ensemble methods may also be more stable than single models.</p></div></div></div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4><p className="text-sm text-muted-foreground">{bestRMSE} achieved the best performance with RMSE={bestResult?.RMSE?.toFixed(2)}. {bestResult?.MASE && bestResult.MASE < 1 ? 'MASE < 1 indicates it outperforms naive seasonal baseline.' : 'Consider if simpler models might suffice.'}</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full model comparison</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Forecast Model Evaluation Report</h2><p className="text-sm text-muted-foreground mt-1">{valueCol} | {validResults.length} models | Test: last 12 obs | {new Date().toLocaleDateString()}</p></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Best Model</p><p className="text-lg font-bold text-green-600">{bestRMSE || 'N/A'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Best RMSE</p><p className="text-lg font-bold font-mono">{bestResult?.RMSE?.toFixed(2) || 'N/A'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Best MAE</p><p className="text-lg font-bold font-mono">{bestResult?.MAE?.toFixed(2) || 'N/A'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Models Compared</p><p className="text-lg font-bold">{validResults.length}</p></CardContent></Card>
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
                                                A comparative forecast evaluation was conducted on {valueCol} using <em>N</em> = {data.length} observations. 
                                                The last 12 observations were held out as the test set, with models trained on the preceding {data.length - 12} observations. 
                                                A total of {validResults.length} forecasting methods were successfully evaluated.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {bestRMSE} achieved the best overall performance with RMSE = {bestResult?.RMSE?.toFixed(4)}, 
                                                MAE = {bestResult?.MAE?.toFixed(4)}, and MAPE = {bestResult?.['MAPE (%)']?.toFixed(2)}%. 
                                                {bestResult?.MASE !== null && bestResult?.MASE !== undefined && (
                                                    bestResult.MASE < 1 
                                                        ? ` The MASE of ${bestResult.MASE.toFixed(4)} indicates the model outperforms the naive seasonal benchmark.`
                                                        : ` The MASE of ${bestResult.MASE.toFixed(4)} suggests performance comparable to or below the naive seasonal benchmark.`
                                                )}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {validResults.length > 1 && (() => {
                                                    const sorted = [...validResults].sort((a, b) => (a.RMSE || Infinity) - (b.RMSE || Infinity));
                                                    const second = sorted[1];
                                                    const improvement = second && bestResult?.RMSE 
                                                        ? ((second.RMSE! - bestResult.RMSE) / second.RMSE! * 100).toFixed(1)
                                                        : null;
                                                    return second && improvement 
                                                        ? `The best model showed a ${improvement}% improvement in RMSE compared to the second-best performer (${second.Method}: RMSE = ${second.RMSE?.toFixed(2)}).`
                                                        : '';
                                                })()}
                                                {results.filter(r => r.error).length > 0 && 
                                                    ` Note: ${results.filter(r => r.error).length} model(s) failed to converge and were excluded from comparison.`}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {bestResult?.MASE && bestResult.MASE < 0.8 
                                                    ? `The low MASE value (< 0.8) suggests strong predictive performance. The ${bestRMSE} model is recommended for operational forecasting.`
                                                    : bestResult?.MASE && bestResult.MASE < 1 
                                                        ? `With MASE < 1, the model provides meaningful improvement over naive methods. Consider ensemble approaches for potentially better results.`
                                                        : `The relatively high MASE suggests limited improvement over naive benchmarks. Consider data transformation, feature engineering, or alternative modeling approaches.`}
                                                {' '}Cross-validation with rolling origin is recommended for more robust model selection.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>


                            <Card><CardHeader><CardTitle>Forecast Accuracy Comparison</CardTitle><CardDescription>Test set: last 12 observations</CardDescription></CardHeader><CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Method</TableHead>{Object.keys(results[0] || {}).filter(k => k !== 'Method' && k !== 'error').map(metric => <TooltipProvider key={metric}><Tooltip><TooltipTrigger asChild><TableHead className="text-right cursor-help">{metric}</TableHead></TooltipTrigger><TooltipContent><p>{metricTooltips[metric] || metric}</p></TooltipContent></Tooltip></TooltipProvider>)}</TableRow></TableHeader>
                                    <TableBody>{results.map((row) => <TableRow key={row.Method}><TableCell className="font-medium">{row.Method}</TableCell><TableCell className={`text-right font-mono ${row.Method === bestRMSE ? 'font-bold text-green-600' : ''}`}>{row.RMSE != null ? row.RMSE.toFixed(2) : 'N/A'}</TableCell><TableCell className={`text-right font-mono ${row.Method === bestMAE ? 'font-bold text-green-600' : ''}`}>{row.MAE != null ? row.MAE.toFixed(2) : 'N/A'}</TableCell><TableCell className={`text-right font-mono ${row.Method === bestMAPE ? 'font-bold text-green-600' : ''}`}>{row['MAPE (%)'] != null ? row['MAPE (%)'].toFixed(1) : 'N/A'}</TableCell><TableCell className={`text-right font-mono ${row.Method === bestMASE ? 'font-bold text-green-600' : ''}`}>{row.MASE != null ? row.MASE.toFixed(2) : 'N/A'}</TableCell><TableCell className="text-right font-mono">{row['Coverage (95% PI)'] != null ? `${row['Coverage (95% PI)'].toFixed(1)}%` : 'N/A'}</TableCell></TableRow>)}</TableBody>
                                </Table>
                                <p className="text-sm text-muted-foreground mt-4">Green = best performance (lower is better except Coverage)</p>
                            </CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Evaluating forecast models...</p><Skeleton className="h-96 w-full" /></CardContent></Card>)}
            </div>
            
            {/* Modals */}
            <ForecastEvaluationGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        </div>
    );
}