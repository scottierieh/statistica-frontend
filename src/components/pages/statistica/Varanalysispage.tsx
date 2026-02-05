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
import { Loader2, HelpCircle, GitBranch, CheckCircle, BookOpen, FileType, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, Activity, Layers, Network } from 'lucide-react';
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

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';

interface StationarityTest { variable: string; adf_statistic: number; p_value: number; stationary: boolean; }
interface LagSelection { aic: number; bic: number; hqic: number; fpe: number; recommended: number; }
interface GrangerResult { causing: string; caused: string; lag: number; f_statistic: number; p_value: number; granger_causes: boolean; }
interface Coefficient { term: string; coefficient: number; std_error: number; t_value: number; p_value: number; significant: boolean; }
interface VARDiagnostics { 
    aic: number; 
    bic: number; 
    hqic?: number;  // 추가 권장
    fpe?: number;   // 추가 권장
    log_likelihood?: number;  // ⭐ 이것 추가
    n_obs: number; 
    k_ar: number; 
    durbin_watson: Record<string, number>; 
}
interface VARResult { coefficients: Record<string, Coefficient[]>; diagnostics: VARDiagnostics; }
interface IRFData { [shockVar: string]: { [responseVar: string]: { values: number[]; lower?: number[]; upper?: number[]; }; }; }
interface FEVDData { [variable: string]: { [shockVar: string]: number[]; }; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { variables: string[]; n_obs: number; lag_order: number; stationarity_tests: StationarityTest[]; lag_selection: LagSelection; var_result: VARResult; granger_causality: GrangerResult[]; irf: IRFData; fevd: FEVDData; ts_plot: string | null; irf_plot: string | null; fevd_plot: string | null; granger_plot: string | null; lag_plot: string | null; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [{ id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' }, { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }];

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const varExample = exampleDatasets.find(d => d.id === 'var' || d.id === 'timeseries');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><GitBranch className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">VAR Decomposition</CardTitle>
                    <CardDescription className="text-base mt-2">Analyze dynamic relationships between multiple time series</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Network className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Granger Causality</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Test predictive relationships</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">IRF</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Impulse Response Functions</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Layers className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">FEVD</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Variance Decomposition</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />VAR Model</h3>
                        <div className="p-4 bg-background rounded-lg font-mono text-sm text-center">Y<sub>t</sub> = c + A<sub>1</sub>Y<sub>t-1</sub> + A<sub>2</sub>Y<sub>t-2</sub> + ... + A<sub>p</sub>Y<sub>t-p</sub> + ε<sub>t</sub></div>
                        <div className="grid md:grid-cols-2 gap-6 text-sm mt-4">
                            <div><h4 className="font-semibold mb-2">Key Outputs</h4><ul className="text-muted-foreground space-y-1"><li>• <strong>IRF:</strong> Response to unit shocks</li><li>• <strong>FEVD:</strong> Variance contribution</li><li>• <strong>Granger:</strong> Predictive causality</li></ul></div>
                            <div><h4 className="font-semibold mb-2">Applications</h4><ul className="text-muted-foreground space-y-1"><li>• Macroeconomic analysis</li><li>• Financial contagion</li><li>• Policy transmission</li></ul></div>
                        </div>
                    </div>
                    {varExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(varExample)} size="lg"><GitBranch className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface VARAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function VARAnalysisPage({ data, allHeaders, onLoadExample }: VARAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [maxLags, setMaxLags] = useState(8);
    const [irfPeriods, setIrfPeriods] = useState(20);
    const [fevdPeriods, setFevdPeriods] = useState(20);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    const canRun = useMemo(() => data.length >= 30 && allHeaders.length >= 2, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const validationChecks = useMemo(() => [
        { label: 'Variables selected', passed: selectedVars.length >= 2, message: `${selectedVars.length} selected (need ≥ 2)` },
        { label: 'Sample size', passed: data.length >= 30, message: `n = ${data.length}` },
        { label: 'Max lags', passed: maxLags >= 1 && maxLags <= 12, message: `p = ${maxLags}` },
    ], [selectedVars, data.length, maxLags]);

    const allChecksPassed = validationChecks.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        const defaultVars = numericHeaders.slice(0, Math.min(3, numericHeaders.length));
        setSelectedVars(defaultVars);
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `VAR_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `VAR DECOMPOSITION REPORT\nGenerated,${new Date().toISOString()}\nVariables,${analysisResult.variables.join('; ')}\nLag Order,${analysisResult.lag_order}\nN,${analysisResult.n_obs}\n\nSTATIONARITY TESTS\n`;
        csv += Papa.unparse(analysisResult.stationarity_tests.map(s => ({ variable: s.variable, adf: s.adf_statistic, p_value: s.p_value, stationary: s.stationary })));
        csv += `\n\nGRANGER CAUSALITY\n` + Papa.unparse(analysisResult.granger_causality.filter(g => g.granger_causes));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `VAR_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length < 2) { toast({ variant: 'destructive', title: 'Error', description: 'Select at least 2 variables.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/var-decomposition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, variables: selectedVars, max_lags: maxLags, irf_periods: irfPeriods, fevd_periods: fevdPeriods }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `VAR(${result.lag_order}) estimated` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedVars, maxLags, irfPeriods, fevdPeriods, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

    const ProgressBar = () => (
        <div className="w-full mb-8"><div className="flex items-center justify-between">
            {STEPS.map((step) => { const isCompleted = step.id < currentStep; const isCurrent = step.id === currentStep; const isClickable = step.id <= maxReachedStep;
                return (<button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable} className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>{isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}</div>
                    <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                </button>);
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex justify-between items-center"><div><h1 className="text-2xl font-bold">VAR Decomposition</h1><p className="text-muted-foreground mt-1">Vector Autoregression Analysis</p></div><Button variant="ghost" size="icon" onClick={() => setView('intro')}><BookOpen className="w-5 h-5"/></Button></div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose time series for VAR model</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label>Variables (select 2-6)</Label><ScrollArea className="h-48 border rounded-md p-3"><div className="space-y-2">{numericHeaders.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`var-${h}`} checked={selectedVars.includes(h)} onCheckedChange={(c) => { if (c && selectedVars.length < 6) setSelectedVars(prev => [...prev, h]); else if (!c) setSelectedVars(prev => prev.filter(x => x !== h)); }} disabled={!selectedVars.includes(h) && selectedVars.length >= 6} /><label htmlFor={`var-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}</div></ScrollArea><p className="text-xs text-muted-foreground">Selected: {selectedVars.length} variable(s)</p></div>
                            <div className="flex flex-wrap gap-2">{selectedVars.map((v, i) => (<Badge key={v} variant="secondary" className="text-sm">{i + 1}. {v}<button onClick={() => setSelectedVars(prev => prev.filter(x => x !== v))} className="ml-2 text-xs">×</button></Badge>))}</div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>VAR Settings</CardTitle><CardDescription>Configure lag order and horizons</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><div className="flex justify-between"><Label>Maximum Lags</Label><Badge variant="outline">{maxLags}</Badge></div><Slider value={[maxLags]} onValueChange={(v) => setMaxLags(v[0])} min={1} max={12} step={1} /><p className="text-xs text-muted-foreground">Will select optimal lag via AIC/BIC</p></div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><div className="flex justify-between"><Label>IRF Horizon</Label><Badge variant="outline">{irfPeriods}</Badge></div><Slider value={[irfPeriods]} onValueChange={(v) => setIrfPeriods(v[0])} min={10} max={40} step={5} /></div>
                                <div className="space-y-3"><div className="flex justify-between"><Label>FEVD Horizon</Label><Badge variant="outline">{fevdPeriods}</Badge></div><Slider value={[fevdPeriods]} onValueChange={(v) => setFevdPeriods(v[0])} min={10} max={40} step={5} /></div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-lg"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Variable Ordering</h4><p className="text-sm text-muted-foreground">Current order: {selectedVars.join(' → ')}. Cholesky decomposition uses this ordering for orthogonalization.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6"><div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-amber-50/50 dark:bg-amber-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div></div>))}</div></CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Estimating...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const sigGranger = results.granger_causality.filter(g => g.granger_causes);
                    const nonStationary = results.stationarity_tests.filter(s => !s.stationary);
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>VAR({results.lag_order}) Summary</CardTitle><CardDescription>{results.variables.length} variables, {results.n_obs} observations</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Lag Order</p><p className="text-2xl font-bold">{results.lag_order}</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">AIC</p><p className="text-lg font-bold font-mono">{results.var_result.diagnostics.aic?.toFixed(1)}</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Granger Links</p><p className="text-2xl font-bold text-green-600">{sigGranger.length}</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Non-Stationary</p><p className={`text-2xl font-bold ${nonStationary.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{nonStationary.length}</p></CardContent></Card>
                                </div>
                                {sigGranger.length > 0 && (<div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg"><h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-300">Significant Granger Causality</h4><div className="flex flex-wrap gap-2">{sigGranger.slice(0, 5).map((g, i) => (<Badge key={i} variant="outline" className="bg-green-100 dark:bg-green-900">{g.causing} → {g.caused}</Badge>))}</div></div>)}
                                {nonStationary.length > 0 && (<div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-300"><p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /><strong>Warning:</strong> Non-stationary: {nonStationary.map(s => s.variable).join(', ')}</p></div>)}
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding VAR analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            {results.interpretation.key_insights.map((insight, i) => (
                                <div key={i} className={`rounded-xl p-5 border ${insight.status === 'positive' ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200' : insight.status === 'negative' ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200' : insight.status === 'warning' ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200' : 'bg-muted/30 border-muted'}`}><div className="flex items-start gap-4"><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${insight.status === 'positive' ? 'bg-green-600 text-white' : insight.status === 'negative' ? 'bg-red-600 text-white' : insight.status === 'warning' ? 'bg-amber-600 text-white' : 'bg-primary text-primary-foreground'}`}>{i + 1}</div><div><h4 className="font-semibold mb-1">{insight.title}</h4><p className="text-sm text-muted-foreground">{insight.description}</p></div></div></div>
                            ))}
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 rounded-xl p-5 border border-amber-300"><h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-amber-600" />Interpretation Guide</h4><ul className="text-sm text-muted-foreground space-y-1"><li>• <strong>IRF:</strong> Shows dynamic response to one-unit shocks</li><li>• <strong>FEVD:</strong> Shows contribution to forecast variance</li><li>• <strong>Granger:</strong> Tests predictive (not true) causality</li></ul></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 6 && results && (() => {
                    const nStationary = results.stationarity_tests.filter(s => s.stationary).length;
                    const nGranger = results.granger_causality.filter(g => g.granger_causes).length;
                    const handleDownloadWord = () => {
                        const content = `VAR Analysis Report\nGenerated: ${new Date().toLocaleString()}\n\nMODEL: VAR(${results.lag_order}) with ${results.variables.length} variables\nObservations: ${results.n_obs}\nAIC: ${results.var_result.diagnostics.aic?.toFixed(2)}\nBIC: ${results.var_result.diagnostics.bic?.toFixed(2)}\n\nSTATIONARITY: ${nStationary}/${results.stationarity_tests.length} series stationary\nGRANGER CAUSALITY: ${nGranger} significant relationships`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'var_report.doc'; a.click();
                        URL.revokeObjectURL(url);
                    };
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4"><div><h2 className="text-lg font-semibold">VAR Results</h2><p className="text-sm text-muted-foreground">VAR({results.lag_order}) with {results.variables.length} variables</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadWord}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">VAR Decomposition Report</h2><p className="text-sm text-muted-foreground mt-1">VAR({results.lag_order}) | n = {results.n_obs} | {new Date().toLocaleDateString()}</p></div>
                            <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Result Summary</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"><div className="text-center p-4 rounded-lg bg-primary/5"><p className="text-xs text-muted-foreground">Lag Order</p><p className="text-2xl font-bold text-primary">{results.lag_order}</p></div><div className={`text-center p-4 rounded-lg ${nStationary === results.stationarity_tests.length ? 'bg-green-50 dark:bg-green-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}><p className="text-xs text-muted-foreground">Stationary</p><p className={`text-2xl font-bold ${nStationary === results.stationarity_tests.length ? 'text-green-600' : 'text-amber-600'}`}>{nStationary}/{results.stationarity_tests.length}</p></div><div className={`text-center p-4 rounded-lg ${nGranger > 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/50'}`}><p className="text-xs text-muted-foreground">Granger Causal</p><p className={`text-2xl font-bold ${nGranger > 0 ? 'text-green-600' : ''}`}>{nGranger}</p></div><div className="text-center p-4 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">AIC</p><p className="text-2xl font-bold">{results.var_result.diagnostics.aic?.toFixed(1)}</p></div></div></CardContent></Card>
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="irf" className="w-full"><TabsList className="grid w-full grid-cols-5"><TabsTrigger value="irf">IRF</TabsTrigger><TabsTrigger value="fevd">FEVD</TabsTrigger><TabsTrigger value="granger">Granger</TabsTrigger><TabsTrigger value="ts">Time Series</TabsTrigger><TabsTrigger value="lag">Lag Selection</TabsTrigger></TabsList><TabsContent value="irf" className="mt-4">{results.irf_plot ? <Image src={`data:image/png;base64,${results.irf_plot}`} alt="IRF" width={800} height={700} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="fevd" className="mt-4">{results.fevd_plot ? <Image src={`data:image/png;base64,${results.fevd_plot}`} alt="FEVD" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="granger" className="mt-4">{results.granger_plot ? <Image src={`data:image/png;base64,${results.granger_plot}`} alt="Granger" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="ts" className="mt-4">{results.ts_plot ? <Image src={`data:image/png;base64,${results.ts_plot}`} alt="Time Series" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="lag" className="mt-4">{results.lag_plot ? <Image src={`data:image/png;base64,${results.lag_plot}`} alt="Lag" width={700} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Stationarity Tests (ADF)</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">ADF Statistic</TableHead><TableHead className="text-right">p-value</TableHead><TableHead>Stationary</TableHead></TableRow></TableHeader><TableBody>{results.stationarity_tests.map((s, i) => (<TableRow key={i}><TableCell className="font-medium">{s.variable}</TableCell><TableCell className="text-right font-mono">{s.adf_statistic?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{s.p_value?.toFixed(4)}</TableCell><TableCell>{s.stationary ? <Badge className="bg-green-600">Yes</Badge> : <Badge variant="destructive">No</Badge>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            <Card><CardHeader><CardTitle>Granger Causality</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Causing</TableHead><TableHead>→</TableHead><TableHead>Caused</TableHead><TableHead className="text-right">F-stat</TableHead><TableHead className="text-right">p-value</TableHead><TableHead>Significant</TableHead></TableRow></TableHeader><TableBody>{results.granger_causality.map((g, i) => (<TableRow key={i}><TableCell className="font-medium">{g.causing}</TableCell><TableCell>→</TableCell><TableCell>{g.caused}</TableCell><TableCell className="text-right font-mono">{g.f_statistic?.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{g.p_value?.toFixed(4)}</TableCell><TableCell>{g.granger_causes ? <Badge className="bg-green-600">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            <Card><CardHeader><CardTitle>Model Diagnostics</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{label: 'AIC', value: results.var_result.diagnostics.aic?.toFixed(2)}, {label: 'BIC', value: results.var_result.diagnostics.bic?.toFixed(2)}, {label: 'Log-Likelihood', value: results.var_result.diagnostics.log_likelihood?.toFixed(2) || 'N/A'}, {label: 'K (Lag)', value: results.var_result.diagnostics.k_ar}].map((item, i) => (<div key={i} className="p-3 bg-muted/50 rounded-lg text-center"><p className="text-xs text-muted-foreground">{item.label}</p><p className="font-semibold font-mono">{item.value}</p></div>))}</div>{results.var_result.diagnostics.durbin_watson && (<div className="mt-4"><h4 className="text-sm font-semibold mb-2">Durbin-Watson Statistics</h4><div className="flex flex-wrap gap-2">{Object.entries(results.var_result.diagnostics.durbin_watson).map(([k, v]) => (<Badge key={k} variant="outline">{k}: {(v as number).toFixed(2)}</Badge>))}</div></div>)}</CardContent></Card>
                          

                            </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Estimating VAR model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
        </div>
    );
}

