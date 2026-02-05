'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, Activity, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, Info, Shield, FileType, Hash, Clock, Code, Copy, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components//ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components//ui/badge';
import { ScrollArea } from '@/components//ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components//ui/slider';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components//ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/cox_regression_analysis.py?alt=media";

const metricDefinitions: Record<string, string> = {
    concordance_index: "C-index: Probability that predictions and outcomes are concordant. Values > 0.7 indicate good discrimination.",
    hazard_ratio: "HR: The ratio of hazard rates. HR > 1 means increased risk, HR < 1 means decreased risk.",
    log_likelihood: "The log of the likelihood function. Higher values indicate better fit.",
    aic: "Akaike Information Criterion: Lower values indicate better model fit.",
    bic: "Bayesian Information Criterion: Similar to AIC but with stronger penalty for complexity.",
    proportional_hazards: "PH Assumption: Hazard ratios should be constant over time for valid Cox regression.",
    censoring: "Censored observations: Subjects who did not experience the event during follow-up.",
    event: "Event: The outcome of interest (e.g., death, disease progression).",
    duration: "Time-to-event: The time from study entry until the event or censoring.",
    coefficient: "Beta coefficient: Log of the hazard ratio.",
    p_value: "P-value: Probability of observing the result if HR=1.",
    confidence_interval: "95% CI: Range containing the true hazard ratio with 95% confidence."
};

interface Coefficient { covariate: string; coef: number; exp_coef: number; se_coef: number; coef_lower: number; coef_upper: number; exp_coef_lower: number; exp_coef_upper: number; z: number; p: number; significant: boolean; }
interface PHTest { covariate: string; test_statistic: number; p: number; assumption_met: boolean; }
interface PHTestResult { tests: PHTest[]; overall_p: number | null; assumption_met: boolean | null; interpretation: string; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { n_samples: number; n_covariates: number; n_events: number; n_censored: number; parameters: Record<string, any>; metrics: Record<string, number>; coefficients: Coefficient[]; ph_test: PHTestResult; forest_plot: string | null; survival_plot: string | null; hazard_plot: string | null; log_log_plot: string | null; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Parameters' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const cIndex = results.metrics.concordance_index;
    const getQuality = (c: number) => c >= 0.8 ? 'Excellent' : c >= 0.7 ? 'Good' : c >= 0.6 ? 'Fair' : 'Needs Work';
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">C-Index</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{cIndex?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getQuality(cIndex)} discrimination</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Events</p><Heart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_events}</p><p className="text-xs text-muted-foreground">{(results.metrics.event_rate * 100).toFixed(1)}% event rate</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Censored</p><Clock className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_censored}</p><p className="text-xs text-muted-foreground">{((1 - results.metrics.event_rate) * 100).toFixed(1)}% censored</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">LR Test p</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.log_likelihood_ratio_p < 0.001 ? '<0.001' : results.metrics.log_likelihood_ratio_p?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{results.metrics.log_likelihood_ratio_p < 0.05 ? 'Significant' : 'Not significant'}</p></div></CardContent></Card>
        </div>
    );
};

const PythonCodeModal = ({ isOpen, onClose, codeUrl }: { isOpen: boolean; onClose: () => void; codeUrl: string; }) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => { if (isOpen && !code) { fetchCode(); } }, [isOpen, code]);
    const fetchCode = async () => {
        setIsLoading(true); setError(null);
        try { const response = await fetch(codeUrl); if (!response.ok) throw new Error(`Failed: ${response.status}`); setCode(await response.text()); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); toast({ variant: 'destructive', title: 'Error' }); }
        finally { setIsLoading(false); }
    };
    const handleCopy = () => { navigator.clipboard.writeText(code); toast({ title: 'Copied!' }); };
    const handleDownload = () => { const blob = new Blob([code], { type: 'text/x-python' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'cox_regression_analysis.py'; link.click(); toast({ title: 'Downloaded!' }); };
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Cox Regression</DialogTitle><DialogDescription>View, copy, or download the Python code.</DialogDescription></DialogHeader>
                <div className="flex gap-2 py-2"><Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading || !!error}><Copy className="mr-2 h-4 w-4" />Copy</Button><Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading || !!error}><Download className="mr-2 h-4 w-4" />Download</Button></div>
                <div className="flex-1 min-h-0">{isLoading ? <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : error ? <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg"><AlertTriangle className="h-10 w-10 text-amber-500 mb-3" /><p className="text-slate-300">{error}</p></div> : <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950"><pre className="p-4 text-sm text-slate-50"><code>{code}</code></pre></ScrollArea>}</div>
            </DialogContent>
        </Dialog>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Cox Regression Glossary</DialogTitle></DialogHeader>
            <ScrollArea className="h-[60vh] pr-4"><div className="space-y-4">{Object.entries(metricDefinitions).map(([term, def]) => (<div key={term} className="border-b pb-3"><h4 className="font-semibold capitalize">{term.replace(/_/g, ' ')}</h4><p className="text-sm text-muted-foreground mt-1">{def}</p></div>))}</div></ScrollArea>
        </DialogContent>
    </Dialog>
);

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'cox-data' || d.id === 'lung');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Activity className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Cox Regression Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Survival analysis for time-to-event data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Clock className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Time-to-Event</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Analyze survival times</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Hazard Ratios</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Quantify risk factors</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Shield className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Handles Censoring</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Account for incomplete data</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use Cox Regression</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Cox regression when analyzing time until an event occurs, especially with censored observations.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Duration:</strong> Time-to-event column</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Event:</strong> Binary indicator (0/1)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Covariates:</strong> 1+ predictors</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Hazard ratios:</strong> Effect sizes with CI</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>C-index:</strong> Predictive accuracy</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Activity className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface CoxRegressionPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function CoxRegressionAnalysisPage({ data, allHeaders, onLoadExample }: CoxRegressionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [durationCol, setDurationCol] = useState<string | undefined>();
    const [eventCol, setEventCol] = useState<string | undefined>();
    const [covariateCols, setCovariateCols] = useState<string[]>([]);
    const [penalizer, setPenalizer] = useState(0.0);
    const [l1Ratio, setL1Ratio] = useState(0.0);
    const [robust, setRobust] = useState(false);
    const [checkAssumptions, setCheckAssumptions] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

    const canRun = useMemo(() => data.length >= 50 && allHeaders.length >= 3, [data, allHeaders]);
    const availableCovariates = useMemo(() => allHeaders.filter(h => h !== durationCol && h !== eventCol), [allHeaders, durationCol, eventCol]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Duration column selected', passed: !!durationCol, detail: durationCol || 'Select duration' });
        checks.push({ label: 'Event column selected', passed: !!eventCol, detail: eventCol || 'Select event' });
        checks.push({ label: 'Covariates selected', passed: covariateCols.length >= 1, detail: `${covariateCols.length} selected` });
        checks.push({ label: 'Sample size (n ≥ 50)', passed: data.length >= 50, detail: `n = ${data.length}` });
        if (eventCol) {
            const eventValues = new Set(data.map(row => row[eventCol]));
            const isBinary = eventValues.size <= 2;
            checks.push({ label: 'Event column is binary', passed: isBinary, detail: isBinary ? '0/1 values' : 'Must be 0 or 1' });
        }
        return checks;
    }, [durationCol, eventCol, covariateCols, data]);

    const allValidationsPassed = dataValidation.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        const potentialDuration = allHeaders.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('duration') || h.toLowerCase().includes('survival'));
        const potentialEvent = allHeaders.find(h => h.toLowerCase().includes('event') || h.toLowerCase().includes('status') || h.toLowerCase().includes('death'));
        setDurationCol(potentialDuration);
        setEventCol(potentialEvent);
        setCovariateCols([]);
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, canRun]);

    useEffect(() => {
        if (durationCol && eventCol && covariateCols.length === 0) {
            setCovariateCols(availableCovariates.slice(0, Math.min(10, availableCovariates.length)));
        }
    }, [durationCol, eventCol, availableCovariates, covariateCols.length]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `CoxRegression_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `COX REGRESSION REPORT\nGenerated,${new Date().toISOString()}\nN Samples,${analysisResult.n_samples}\nN Events,${analysisResult.n_events}\nN Censored,${analysisResult.n_censored}\n\nMETRICS\n`;
        csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nCOEFFICIENTS\nCovariate,HR,HR_Lower,HR_Upper,p-value,Significant\n`;
        csv += analysisResult.coefficients.map(c => `${c.covariate},${c.exp_coef},${c.exp_coef_lower},${c.exp_coef_upper},${c.p},${c.significant}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `CoxRegression_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!durationCol || !eventCol || covariateCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select all required columns.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/cox-regression`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, duration_col: durationCol, event_col: eventCol, covariate_cols: covariateCols, penalizer, l1_ratio: l1Ratio, robust, check_assumptions: checkAssumptions }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `C-index: ${result.metrics.concordance_index?.toFixed(3)}` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, durationCol, eventCol, covariateCols, penalizer, l1Ratio, robust, checkAssumptions, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

    const ProgressBar = () => (
        <div className="mb-8"><div className="flex items-center justify-between w-full gap-2">
            {STEPS.map((step) => {
                const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                const isCurrent = currentStep === step.id;
                const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                return (
                    <button key={step.id} onClick={() => isAccessible && goToStep(step.id)} disabled={!isAccessible} className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                            {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                        </div>
                        <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                    </button>
                );
            })}
        </div></div>
    );

    const ParamSlider = ({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) => (
        <div className="space-y-2"><div className="flex justify-between"><Label className="text-sm">{label}</Label><Badge variant="outline">{value}</Badge></div><Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} /></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <div><h1 className="text-2xl font-bold">Cox Regression Analysis</h1><p className="text-muted-foreground mt-1">Survival analysis for time-to-event data</p></div>
                <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}><HelpCircle className="w-5 h-5" /></Button>
            </div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose duration, event, and covariate columns</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Duration (Time-to-Event)</Label><Select value={durationCol} onValueChange={(v) => { setDurationCol(v); setCovariateCols([]); }}><SelectTrigger className="h-11"><SelectValue placeholder="Select duration..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Heart className="w-4 h-4 text-primary" />Event Indicator (0/1)</Label><Select value={eventCol} onValueChange={(v) => { setEventCol(v); setCovariateCols([]); }}><SelectTrigger className="h-11"><SelectValue placeholder="Select event..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Covariates (Predictors)</Label>
                                <ScrollArea className="h-48 border rounded-xl p-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{availableCovariates.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`cov-${h}`} checked={covariateCols.includes(h)} onCheckedChange={(c) => { if (c) setCovariateCols(prev => [...prev, h]); else setCovariateCols(prev => prev.filter(x => x !== h)); }} /><label htmlFor={`cov-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}</div></ScrollArea>
                                <div className="flex justify-between items-center"><p className="text-xs text-muted-foreground">{covariateCols.length} covariates selected</p><Button variant="outline" size="sm" onClick={() => setCovariateCols(availableCovariates)}>Select All</Button></div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample size: <strong>{data.length}</strong> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!durationCol || !eventCol || covariateCols.length < 1}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Parameters</CardTitle><CardDescription>Configure Cox regression settings</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <ParamSlider label="Penalizer (L2)" value={penalizer} onChange={setPenalizer} min={0} max={1} step={0.01} />
                                <ParamSlider label="L1 Ratio" value={l1Ratio} onChange={setL1Ratio} min={0} max={1} step={0.1} />
                                <div className="flex items-center space-x-2 pt-6"><Checkbox id="robust" checked={robust} onCheckedChange={(c) => setRobust(!!c)} /><label htmlFor="robust" className="text-sm">Use robust standard errors</label></div>
                                <div className="flex items-center space-x-2 pt-6"><Checkbox id="check-ph" checked={checkAssumptions} onCheckedChange={(c) => setCheckAssumptions(!!c)} /><label htmlFor="check-ph" className="text-sm">Test proportional hazards</label></div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Use regularization when you have many covariates relative to events. L1 ratio = 0 is ridge, = 1 is lasso.</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}<div><p className={`font-medium text-sm ${check.passed ? '' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></div>))}</div>
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Duration:</span> {durationCol}</div><div><span className="text-muted-foreground">Event:</span> {eventCol}</div><div><span className="text-muted-foreground">Penalizer:</span> {penalizer}</div><div><span className="text-muted-foreground">Covariates:</span> {covariateCols.length}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Activity className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Cox regression will estimate hazard ratios while accounting for censored observations.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fitting...</> : <>Fit Model<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const cIndex = results.metrics.concordance_index;
                    const isGood = cIndex >= 0.7;
                    const sigCount = results.coefficients.filter(c => c.significant).length;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Survival analysis with {results.n_covariates} covariates</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Model achieved <strong>C-index = {cIndex?.toFixed(3)}</strong> ({cIndex >= 0.8 ? 'excellent' : cIndex >= 0.7 ? 'good' : 'moderate'} discrimination).</p>
                                        <p className="text-sm">• <strong>{results.n_events}</strong> events, <strong>{results.n_censored}</strong> censored ({(results.metrics.event_rate * 100).toFixed(1)}% event rate).</p>
                                        <p className="text-sm">• <strong>{sigCount}</strong> of {results.coefficients.length} covariates significant (p {'<'} 0.05).</p>
                                        {results.coefficients[0] && <p className="text-sm">• Strongest: <strong>{results.coefficients[0].covariate}</strong> (HR = {results.coefficients[0].exp_coef?.toFixed(2)}).</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Good Predictive Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The model shows good discrimination between subjects." : "Consider adding more predictors."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• C-index: {cIndex?.toFixed(3)}</p><p>• LR test p: {results.metrics.log_likelihood_ratio_p < 0.001 ? '<0.001' : results.metrics.log_likelihood_ratio_p?.toFixed(4)}</p><p>• AIC: {results.metrics.aic?.toFixed(1)}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (cIndex >= 0.85 ? 5 : cIndex >= 0.75 ? 4 : cIndex >= 0.65 ? 3 : cIndex >= 0.55 ? 2 : 1) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const cIndex = results.metrics.concordance_index;
                    const isGood = cIndex >= 0.7;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding Cox Regression</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How Cox Regression Works</h4><p className="text-sm text-muted-foreground">Cox regression models the hazard rate as a function of covariates. It assumes proportional hazards — hazard ratios remain constant over time.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Interpreting Hazard Ratios</h4><p className="text-sm text-muted-foreground">HR {'>'} 1 means increased risk. HR {'<'} 1 means decreased risk. HR = 1 means no effect. The 95% CI should not include 1 for significance.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">C-Index Interpretation</h4><p className="text-sm text-muted-foreground">C-index ({cIndex?.toFixed(3)}) measures discrimination. 0.5 = random, 0.7-0.8 = good, {'>'}0.8 = excellent.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `With C-index = ${cIndex?.toFixed(3)}, this model reliably distinguishes survival outcomes. Significant covariates can guide decisions.` : `Consider adding predictors, checking interactions, or exploring time-varying effects.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Valid Survival Model</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Consider Improvements</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Hazard ratios can be interpreted as relative risks.` : `Check PH assumption and consider alternative approaches.`}</p></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator /><DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Cox Regression Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">Survival Analysis | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Model Summary</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.n_samples}</p><p className="text-sm text-muted-foreground">Subjects</p></div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.n_events}</p><p className="text-sm text-muted-foreground">Events</p></div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.n_censored}</p><p className="text-sm text-muted-foreground">Censored</p></div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.metrics.concordance_index?.toFixed(3)}</p><p className="text-sm text-muted-foreground">C-Index</p></div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.metrics.aic?.toFixed(0)}</p><p className="text-sm text-muted-foreground">AIC</p></div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.metrics.log_likelihood_ratio_p < 0.001 ? '<.001' : results.metrics.log_likelihood_ratio_p?.toFixed(3)}</p><p className="text-sm text-muted-foreground">LR p</p></div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A Cox proportional hazards regression was performed using {results.n_covariates} covariates.
                                                The analysis included <em>N</em> = {results.n_samples} subjects, of which {results.n_events} ({(results.metrics.event_rate * 100).toFixed(1)}%) experienced the event
                                                and {results.n_censored} ({((1 - results.metrics.event_rate) * 100).toFixed(1)}%) were censored.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The model achieved a concordance index of <span className="font-mono">{results.metrics.concordance_index?.toFixed(4)}</span>.
                                                The log-likelihood ratio test was {results.metrics.log_likelihood_ratio_p < 0.05 ? 'significant' : 'not significant'} 
                                                (χ² = <span className="font-mono">{results.metrics.log_likelihood_ratio_test?.toFixed(2)}</span>, 
                                                p {results.metrics.log_likelihood_ratio_p < 0.001 ? '< 0.001' : `= ${results.metrics.log_likelihood_ratio_p?.toFixed(4)}`}).
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {results.coefficients.filter(c => c.significant).length} of {results.coefficients.length} covariates reached significance at α = 0.05.
                                                {results.coefficients[0] && ` The strongest predictor was ${results.coefficients[0].covariate} with HR = ${results.coefficients[0].exp_coef?.toFixed(2)} (95% CI: ${results.coefficients[0].exp_coef_lower?.toFixed(2)}-${results.coefficients[0].exp_coef_upper?.toFixed(2)}).`}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="forest" className="w-full"><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="forest">Forest Plot</TabsTrigger><TabsTrigger value="survival">Survival</TabsTrigger><TabsTrigger value="hazard">Hazard Ratios</TabsTrigger><TabsTrigger value="loglog">Log-Log</TabsTrigger></TabsList><TabsContent value="forest" className="mt-4">{results.forest_plot ? <Image src={`data:image/png;base64,${results.forest_plot}`} alt="Forest Plot" width={900} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="survival" className="mt-4">{results.survival_plot ? <Image src={`data:image/png;base64,${results.survival_plot}`} alt="Survival" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="hazard" className="mt-4">{results.hazard_plot ? <Image src={`data:image/png;base64,${results.hazard_plot}`} alt="Hazard" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="loglog" className="mt-4">{results.log_log_plot ? <Image src={`data:image/png;base64,${results.log_log_plot}`} alt="Log-Log" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Coefficients & Hazard Ratios</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead className="text-right">HR</TableHead><TableHead className="text-right">95% CI</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-center">Sig.</TableHead></TableRow></TableHeader><TableBody>{results.coefficients.map((c, i) => (<TableRow key={i} className={c.significant ? 'bg-primary/5' : ''}><TableCell className="font-medium">{c.covariate}</TableCell><TableCell className="text-right font-mono">{c.exp_coef?.toFixed(3)}</TableCell><TableCell className="text-right font-mono text-sm">{c.exp_coef_lower?.toFixed(2)} - {c.exp_coef_upper?.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{c.p < 0.001 ? '<0.001' : c.p?.toFixed(4)}</TableCell><TableCell className="text-center">{c.significant ? <CheckCircle2 className="w-4 h-4 text-primary mx-auto" /> : <span className="text-muted-foreground">-</span>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.ph_test.tests.length > 0 && (<Card><CardHeader><CardTitle>Proportional Hazards Test</CardTitle><CardDescription>{results.ph_test.interpretation}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead className="text-right">Test Stat</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-center">PH Met</TableHead></TableRow></TableHeader><TableBody>{results.ph_test.tests.map((t, i) => (<TableRow key={i} className={!t.assumption_met ? 'bg-amber-50/50' : ''}><TableCell className="font-medium">{t.covariate}</TableCell><TableCell className="text-right font-mono">{t.test_statistic?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{t.p?.toFixed(4)}</TableCell><TableCell className="text-center">{t.assumption_met ? <CheckCircle2 className="w-4 h-4 text-primary mx-auto" /> : <AlertTriangle className="w-4 h-4 text-amber-600 mx-auto" />}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).filter(([_, v]) => v !== null).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}</p><p className="font-mono font-semibold">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'number' ? v.toFixed(2) : v}</p></div>))}</div></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Fitting Cox regression model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        </div>
    );
}