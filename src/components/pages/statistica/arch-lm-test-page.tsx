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
import { Loader2, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, FileType, LineChart as LineChartIcon, Download, Activity, Info, TrendingUp, BarChart3, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, FileText, Sparkles, Lightbulb, ChevronDown, Target, Percent, Layers, ArrowRight, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import { CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';


const metricDefinitions: Record<string, string> = {
    arch_effect: "Autoregressive Conditional Heteroscedasticity. A pattern where volatility clusters — large changes tend to follow large changes, and small changes follow small changes.",
    heteroscedasticity: "Non-constant variance in a time series. The opposite of homoscedasticity (constant variance).",
    volatility_clustering: "The tendency for high-volatility periods to cluster together, and low-volatility periods to cluster together. Common in financial data.",
    lm_statistic: "Lagrange Multiplier test statistic. Measures the strength of ARCH effects. Higher values indicate stronger evidence of heteroscedasticity.",
    f_statistic: "Alternative test statistic based on F-distribution. Provides similar conclusions to LM test but with different assumptions.",
    p_value: "Probability of observing results as extreme as calculated if no ARCH effects exist. Values below 0.05 indicate significant ARCH effects.",
    lags: "Number of past periods examined for volatility patterns. More lags capture longer-term volatility persistence.",
    squared_residuals: "Residuals squared to make them positive. Used to detect volatility patterns since variance is always positive.",
    garch_model: "Generalized ARCH model. Used when ARCH effects are detected. Captures both short and long-term volatility dynamics.",
    conditional_variance: "Variance that changes based on past information. ARCH models estimate this time-varying variance.",
    homoscedasticity: "Constant variance over time. Desirable property for many statistical models. ARCH test checks for violations.",
    white_noise: "Random series with constant mean and variance, and no autocorrelation. Ideal residual behavior.",
    chi_square_distribution: "Probability distribution used to evaluate the LM statistic. Degrees of freedom equal the number of lags tested."
};


const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        ARCH-LM Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in ARCH-LM testing
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



interface ArchLmResult {
    lm_statistic: number;
    p_value: number;
    f_statistic: number;
    f_p_value: number;
    lags: number;
    is_significant: boolean;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: ArchLmResult;
    plot: string;  
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


const ArchLmGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">ARCH-LM Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                What is the ARCH-LM Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The <strong>ARCH-LM test</strong> detects <strong>volatility clustering</strong> in time series data. 
                It checks if the variance (size of changes) is constant over time, or if periods of high volatility 
                tend to cluster together.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Concept:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    ARCH = Autoregressive Conditional Heteroscedasticity<br/>
                    LM = Lagrange Multiplier (the test method used)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                When Should You Use This Test?
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="font-medium text-sm mb-1 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  Use when:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• Analyzing <strong>financial returns</strong> (stocks, forex, crypto)</li>
                  <li>• Checking <strong>model residuals</strong> for volatility patterns</li>
                  <li>• Deciding whether to use <strong>GARCH models</strong></li>
                  <li>• Validating <strong>risk models</strong></li>
                </ul>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">p &gt; 0.05: No ARCH Effects ✓</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Variance is constant</li>
                    <li>• Standard models work well</li>
                    <li>• No need for GARCH</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">p ≤ 0.05: ARCH Effects Present</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Volatility clusters exist</li>
                    <li>• Consider GARCH models</li>
                    <li>• Use adaptive risk measures</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Choosing Number of Lags
              </h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-muted/30 rounded text-center border border-border">
                  <p className="font-bold">5-10</p>
                  <p className="text-muted-foreground">Short-term</p>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center border border-border">
                  <p className="font-bold">10-15</p>
                  <p className="text-muted-foreground">Standard</p>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center border border-border">
                  <p className="font-bold">20+</p>
                  <p className="text-muted-foreground">Long-term</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Rule of thumb:</strong> Lags should be less than 1/3 of your sample size.
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
                  <p className="font-medium text-sm text-primary mb-1">No ARCH Effects</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use standard ARIMA models</li>
                    <li>• Fixed confidence intervals are valid</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">ARCH Effects Present</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Consider GARCH(1,1) model</li>
                    <li>• Use time-varying confidence intervals</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> The ARCH-LM test is particularly important 
                for financial data analysis. If you find ARCH effects, your forecast uncertainty 
                should account for changing volatility.
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
                    <CardTitle className="font-headline text-3xl">ARCH-LM Test</CardTitle>
                    <CardDescription className="text-base mt-2">Test for Autoregressive Conditional Heteroscedasticity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Volatility Clustering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Detects non-constant variance</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">ARCH Effects</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Tests heteroscedasticity</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChart3 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Model Validation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Checks residual variance</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">The ARCH-LM test detects volatility clustering in financial time series.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2"><Settings className="w-4 h-4 text-primary inline mr-1" />Requirements</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />Time series or residuals</li>
                                    <li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />30+ observations</li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2"><FileSearch className="w-4 h-4 text-primary inline mr-1" />Results</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />p &gt; 0.05: No ARCH</li>
                                    <li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />p &lt; 0.05: ARCH present</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><LineChartIcon className="mr-2 h-5 w-5" />Load Example</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface ArchLmTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ArchLmTestPage({ data, numericHeaders, onLoadExample }: ArchLmTestPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [lags, setLags] = useState<number>(10);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);



    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Value column selected', passed: !!valueCol, message: valueCol ? `Selected: ${valueCol}` : 'Please select a variable' });
        checks.push({ label: 'Sufficient data', passed: data.length >= 30, message: data.length >= 30 ? `${data.length} observations (30+ recommended)` : `${data.length} observations insufficient` });
        checks.push({ label: 'Valid lag count', passed: lags >= 1 && lags <= data.length / 3, message: `${lags} lags (recommended: 1~${Math.floor(data.length / 3)})` });
        checks.push({ label: 'Lag < 1/3 of data', passed: lags < data.length / 3, message: lags < data.length / 3 ? 'Condition met' : 'Lag is too large' });
        return checks;
    }, [valueCol, data.length, lags]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    
    useEffect(() => {
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
        setCurrentStep(1);
        setMaxReachedStep(1);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!valueCol) { toast({ variant: 'destructive', title: 'Error', description: 'Select a column.' }); return; }
        setIsLoading(true); 
        setAnalysisResult(null);
        try {
            const seriesData = data.map(row => row[valueCol]).filter(v => typeof v === 'number');
            const response = await fetch(`${FASTAPI_URL}/api/analysis/arch-lm-test`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ data: seriesData, valueCol, lags }) 
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.detail || 'Analysis failed'); }
            const result: FullAnalysisResponse = await response.json();
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, valueCol, lags, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ARCH_LM_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const r = analysisResult.results;
        let csvContent = "ARCH-LM TEST RESULTS\n";
        csvContent += `Variable,${valueCol}\nLags,${lags}\n\n`;
        csvContent += Papa.unparse([{ 'LM Statistic': r.lm_statistic.toFixed(4), 'LM P-Value': r.p_value.toFixed(4), 'F Statistic': r.f_statistic.toFixed(4), 'F P-Value': r.f_p_value.toFixed(4), 'Significant': r.is_significant ? 'Yes' : 'No' }]);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ARCH_LM_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, valueCol, lags, toast]);

    // handleDownloadDOCX 함수 추가
    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/arch-lm-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisResult,
                    plot: analysisResult.plot,  // 플롯 추가!
                    valueCol,
                    lags,
                    sampleSize: data.length
                })
            });
            if (!response.ok) throw new Error('Failed');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `ARCH_LM_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            URL.revokeObjectURL(link.href);
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, valueCol, lags, data.length, toast]);


    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const r = analysisResult?.results;
    const isSignificant = r?.is_significant ?? false;
    const isGood = !isSignificant;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!r);
                    const isCurrent = step.id === currentStep;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!r);
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
            <ArchLmGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div><h1 className="text-2xl font-bold">ARCH-LM Test</h1><p className="text-muted-foreground mt-1">Test for heteroscedasticity</p></div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variable</CardTitle><CardDescription>Choose a numeric variable for ARCH testing</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Value Column</Label>
                                <Select value={valueCol} onValueChange={setValueCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Data points: <span className="font-semibold text-foreground">{data.length}</span> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Test Settings</CardTitle><CardDescription>Configure lag parameter</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label className="text-sm font-medium">Number of Lags</Label><Input type="number" value={lags} onChange={e => setLags(Number(e.target.value))} min={1} className="h-11"/><p className="text-xs text-muted-foreground">Number of lags to test for autocorrelation in squared residuals</p></div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Variable:</strong> {valueCol || 'Not selected'}</p><p>• <strong className="text-foreground">Lags:</strong> {lags}</p><p>• <strong className="text-foreground">α:</strong> 0.05</p></div></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Lag Selection</h4><p className="text-sm text-muted-foreground">Typically 5-15 lags are used. Higher lags capture long-term volatility persistence but reduce degrees of freedom.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

               {/* Step 3 */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {validationChecks.map((check, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${check.passed ? 'bg-primary/5 border-primary/30' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                        <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}<div><p className="font-medium text-sm">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                                        <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? 'Pass' : 'Fail'}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && r && (() => {
                    const pValue = r.p_value;
                    const stabilityLevel = !isSignificant ? (pValue > 0.2 ? 'Very Stable' : 'Stable') : (pValue > 0.01 ? 'Unstable' : 'Very Unstable');
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Volatility analysis for {valueCol}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{isSignificant ? 'Your data has unpredictable swings — sometimes calm, sometimes wild. Like weather that shifts between sunny weeks and stormy ones.' : 'Your data moves in a steady, predictable rhythm — like gentle waves on a calm lake. No sudden surprises.'}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{isSignificant ? 'The size of changes varies a lot over time. Big swings tend to follow big swings, and small moves follow small moves.' : 'The size of ups and downs stays fairly consistent. What happened yesterday is a good guide for what to expect tomorrow.'}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{isSignificant ? "You'll need smarter forecasting tools that can adapt to these changing conditions." : 'Simple forecasting methods will work just fine for your data.'}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">{isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{isGood ? "Steady & Predictable ✓" : "Volatile & Changing"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "Your data behaves consistently. Past patterns are a reliable guide for the future." : "Your data goes through calm and turbulent phases. Plan for both scenarios."}</p></div></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Stability</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{stabilityLevel}</p><p className="text-xs text-muted-foreground">Volatility pattern</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Confidence</p><Percent className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{((1 - Math.min(pValue, 1)) * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">{isGood ? 'Stable' : 'Volatile'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Lags Tested</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{r.lags}</p><p className="text-xs text-muted-foreground">Time periods</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Data Points</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{data.length}</p><p className="text-xs text-muted-foreground">Observations</p></div></CardContent></Card>
                                </div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Predictability:</span>{[1,2,3,4,5].map(star => { const score = !isSignificant ? 5 : pValue > 0.01 ? 3 : 1; return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;})}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && r && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Simple explanation of the analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What We Checked</h4><p className="text-sm text-muted-foreground">We looked at whether the size of changes in your data stays consistent, or if it varies wildly — like checking if a river flows smoothly or has rapids.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">How We Tested It</h4><p className="text-sm text-muted-foreground">We examined the last <strong className="text-foreground">{r.lags} time periods</strong> to see if big changes tend to cluster together.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">What We Found</h4><p className="text-sm text-muted-foreground">{isSignificant ? 'We found clear evidence that volatility clusters together. When things get bumpy, they tend to stay bumpy for a while.' : "We found no evidence of clustering. Your data's volatility is consistent — no sudden calm-to-storm shifts."}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">What You Should Do</h4><p className="text-sm text-muted-foreground">{isSignificant ? 'Use forecasting tools that can adapt to changing volatility. Set flexible safety margins.' : 'Simple forecasting methods work well. You can use fixed safety margins with confidence.'}</p></div></div></div>
                            <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Steady Pattern</> : <><AlertTriangle className="w-5 h-5 text-amber-600" /> Bottom Line: Variable Pattern</>}</h4><p className="text-sm text-muted-foreground">{isGood ? 'Your data is well-behaved. Standard methods will give you reliable results.' : 'Your data has changing volatility. Consider this when making predictions.'}</p></div>
                            <div className="bg-muted/20 rounded-xl p-4"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Volatility Pattern Reference</h4><div className="grid grid-cols-2 gap-2 text-xs"><div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">Stable</p><p className="text-muted-foreground">Consistent changes</p></div><div className="text-center p-2 bg-background rounded-lg border-amber-200 border"><p className="font-medium text-amber-600">Volatile</p><p className="text-muted-foreground">Clustered changes</p></div></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && r && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">ARCH-LM Test Report</h2><p className="text-sm text-muted-foreground mt-1">{valueCol} | Lags = {lags} | {new Date().toLocaleDateString()}</p></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Result</p><p className={`text-lg font-bold ${isSignificant ? 'text-amber-600' : 'text-green-600'}`}>{isSignificant ? 'Volatile' : 'Stable'}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">LM Statistic</p><p className="text-lg font-bold font-mono">{r.lm_statistic.toFixed(3)}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">P-Value</p><p className={`text-lg font-bold font-mono ${r.p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>{r.p_value < 0.001 ? '<0.001' : r.p_value.toFixed(4)}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">F Statistic</p><p className="text-lg font-bold font-mono">{r.f_statistic.toFixed(3)}</p></CardContent></Card>
                            </div>
                            <Card><CardHeader><CardTitle>Overall Analysis</CardTitle></CardHeader><CardContent><div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40"><div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Summary</h3></div><p className="text-sm text-muted-foreground leading-relaxed">An ARCH-LM test was conducted on <strong className="text-foreground">{valueCol}</strong> with <strong className="text-foreground">{r.lags} lags</strong>. The test {isSignificant ? 'detected significant ARCH effects' : 'found no significant ARCH effects'} (LM = {r.lm_statistic.toFixed(2)}, <em>p</em> {r.p_value < 0.001 ? '< .001' : `= ${r.p_value.toFixed(3)}`}). {isSignificant ? 'Volatility clustering is present — consider GARCH models for forecasting.' : 'Variance is constant — standard models are appropriate.'}</p></div></CardContent></Card>
                            <Card><CardHeader><CardTitle>Test Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-semibold">LM Statistic</TableCell><TableCell className="font-mono text-right">{r.lm_statistic.toFixed(4)}</TableCell><TableCell className="text-right text-muted-foreground">χ²({r.lags})</TableCell></TableRow><TableRow><TableCell className="font-semibold">P-Value (LM)</TableCell><TableCell className={`font-mono text-right ${r.p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>{r.p_value < 0.001 ? "< .001" : r.p_value.toFixed(4)}</TableCell><TableCell className="text-right"><Badge variant={isSignificant ? 'destructive' : 'default'}>{isSignificant ? 'Significant' : 'Not Significant'}</Badge></TableCell></TableRow><TableRow><TableCell className="font-semibold">F-Statistic</TableCell><TableCell className="font-mono text-right">{r.f_statistic.toFixed(4)}</TableCell><TableCell className="text-right text-muted-foreground">Alternative test</TableCell></TableRow><TableRow><TableCell className="font-semibold">P-Value (F)</TableCell><TableCell className={`font-mono text-right ${r.f_p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>{r.f_p_value < 0.001 ? "< .001" : r.f_p_value.toFixed(4)}</TableCell><TableCell className="text-right text-muted-foreground">{r.f_p_value < 0.05 ? 'Confirms result' : 'Confirms stability'}</TableCell></TableRow><TableRow><TableCell className="font-semibold">Lags</TableCell><TableCell className="font-mono text-right">{r.lags}</TableCell><TableCell className="text-right text-muted-foreground">Degrees of freedom</TableCell></TableRow></TableBody></Table><p className="text-sm text-muted-foreground mt-4">α = 0.05 | p &lt; 0.05 indicates volatility clustering</p></CardContent></Card>
                        
                            {analysisResult?.plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Volatility Visualization</CardTitle>
                                    <CardDescription>Original series and squared values (volatility proxy)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Image 
                                        src={analysisResult.plot} 
                                        alt="ARCH-LM Volatility Plot" 
                                        width={1000} 
                                        height={600} 
                                        className="w-full rounded-md border"
                                    />
                                </CardContent>
                            </Card>
                        )}

                        
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running ARCH-LM test...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>)}
            </div>
        </div>
    );
}