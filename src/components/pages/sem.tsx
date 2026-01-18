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
import { Loader2, HelpCircle, GitBranch, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, Activity, FileCode, FileType, TrendingUp, Users, BarChart3, Code } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '../ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
interface LoadingData { indicators: string[]; loadings: Record<string, number>; eigenvalue: number; variance_explained: number; cronbach_alpha: number; }
interface PathCoefficient { path: string; from: string; to: string; estimate: number; std_error: number | null; t_value: number | null; p_value: number | null; significant: boolean | null; is_r_squared?: boolean; }
interface FitIndices { chi_square: number; df: number; p_value: number; cfi: number; tli: number; rmsea: number; srmr: number; aic: number; bic: number; n: number; note?: string; }
interface KeyInsight { title: string; description: string; }
interface Interpretation { key_insights: KeyInsight[]; n_latent_vars: number; n_significant_paths: number; overall_assessment: string; }
interface AnalysisResults { parsed_model: { latent_vars: Record<string, string[]>; regressions: Array<{dv: string; ivs: string[]}>; covariances: Array<[string, string]>; }; measurement_model: Record<string, LoadingData>; structural_model: PathCoefficient[]; fit_indices: FitIndices; path_diagram: string | null; loading_heatmap: string | null; correlation_matrix: string | null; interpretation: Interpretation; estimator: string; n_observations: number; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [{ id: 1, label: 'Model' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' }, { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }];

const EXAMPLE_MODEL = `# Measurement Model (latent =~ indicators)
VisualAbility =~ x1 + x2 + x3
TextualAbility =~ x4 + x5 + x6
SpeedAbility =~ x7 + x8 + x9

# Structural Model (regression paths)
TextualAbility ~ VisualAbility
SpeedAbility ~ TextualAbility + VisualAbility`;

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const semExample = exampleDatasets.find(d => d.id === 'sem' || d.id === 'factor-analysis');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><GitBranch className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Structural Equation Modeling</CardTitle>
                    <CardDescription className="text-base mt-2">Analyze complex relationships between latent and observed variables</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Latent Variables</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Model unobserved constructs from indicators</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><GitBranch className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Path Analysis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Test directional relationships between variables</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Fit Indices</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Evaluate model fit with CFI, RMSEA, SRMR</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />Model Syntax (lavaan-style)</h3>
                        <pre className="text-xs bg-background p-4 rounded-lg border overflow-x-auto">{`# Measurement Model
Factor1 =~ item1 + item2 + item3
Factor2 =~ item4 + item5 + item6

# Structural Model  
Factor2 ~ Factor1`}</pre>
                        <div className="grid md:grid-cols-2 gap-6 text-sm mt-4">
                            <div><h4 className="font-semibold mb-2">Operators</h4><ul className="space-y-1 text-muted-foreground"><li><code className="bg-muted px-1 rounded">=~</code> latent variable definition</li><li><code className="bg-muted px-1 rounded">~</code> regression path</li><li><code className="bg-muted px-1 rounded">~~</code> covariance</li></ul></div>
                            <div><h4 className="font-semibold mb-2">Requirements</h4><ul className="space-y-2 text-muted-foreground"><li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>3+ indicators per factor</span></li><li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>Sample size ≥ 200</span></li></ul></div>
                        </div>
                    </div>
                    {semExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(semExample)} size="lg"><GitBranch className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface SEMAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function SEMAnalysisPage({ data, allHeaders, onLoadExample }: SEMAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [modelSpec, setModelSpec] = useState('');
    const [estimator, setEstimator] = useState('ML');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    const canRun = useMemo(() => data.length >= 50 && allHeaders.length >= 4, [data, allHeaders]);
    
    const parsedModelPreview = useMemo(() => {
        const lines = modelSpec.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
        const latentCount = lines.filter(l => l.includes('=~')).length;
        const pathCount = lines.filter(l => l.includes('~') && !l.includes('=~') && !l.includes('~~')).length;
        return { latentCount, pathCount, isValid: latentCount > 0 || pathCount > 0 };
    }, [modelSpec]);

    const validationChecks = useMemo(() => [
        { label: 'Model specification', passed: parsedModelPreview.isValid, message: parsedModelPreview.isValid ? `${parsedModelPreview.latentCount} latent vars, ${parsedModelPreview.pathCount} paths` : 'Enter valid model syntax' },
        { label: 'Sample size', passed: data.length >= 100, message: data.length >= 200 ? `n = ${data.length} (good)` : data.length >= 100 ? `n = ${data.length} (minimum)` : `n = ${data.length} (need 100+)` },
        { label: 'Available variables', passed: allHeaders.length >= 4, message: `${allHeaders.length} columns available` },
    ], [parsedModelPreview, data.length, allHeaders.length]);

    const allChecksPassed = validationChecks.slice(0, 2).every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `SEM_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `SEM ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\n\nFIT INDICES\n`;
        const fit = analysisResult.fit_indices;
        csv += `CFI,${fit.cfi?.toFixed(3)}\nTLI,${fit.tli?.toFixed(3)}\nRMSEA,${fit.rmsea?.toFixed(3)}\nSRMR,${fit.srmr?.toFixed(3)}\nChi-square,${fit.chi_square?.toFixed(2)}\ndf,${fit.df}\n\n`;
        csv += `PATH COEFFICIENTS\n` + Papa.unparse(analysisResult.structural_model.filter(p => !p.is_r_squared).map(p => ({ path: p.path, estimate: p.estimate?.toFixed(3), se: p.std_error?.toFixed(3), t: p.t_value?.toFixed(2), p: p.p_value?.toFixed(4), sig: p.significant ? 'Yes' : 'No' })));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `SEM_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!modelSpec.trim()) { toast({ variant: 'destructive', title: 'Error', description: 'Enter model specification.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/multivariate/sem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, model_spec: modelSpec, estimator }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `CFI = ${result.fit_indices.cfi?.toFixed(3)}` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, modelSpec, estimator, toast]);

    const loadExampleModel = () => { setModelSpec(EXAMPLE_MODEL); toast({ title: 'Example model loaded' }); };

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
            <div className="mb-6 flex justify-between items-center"><div><h1 className="text-2xl font-bold">Structural Equation Modeling</h1><p className="text-muted-foreground mt-1">Latent variable analysis</p></div><Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button></div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Code className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Specification</CardTitle><CardDescription>Define your SEM model using lavaan syntax</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><Label>Model Syntax</Label><Button variant="outline" size="sm" onClick={loadExampleModel}><Lightbulb className="w-4 h-4 mr-1" />Load Example</Button></div>
                                <Textarea value={modelSpec} onChange={(e) => setModelSpec(e.target.value)} placeholder={`# Measurement Model\nF1 =~ x1 + x2 + x3\nF2 =~ x4 + x5 + x6\n\n# Structural Model\nF2 ~ F1`} className="font-mono text-sm h-48" />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Available Columns</h4><ScrollArea className="h-32"><div className="flex flex-wrap gap-1">{allHeaders.map(h => <Badge key={h} variant="outline" className="text-xs">{h}</Badge>)}</div></ScrollArea></div>
                                <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Model Preview</h4><div className="space-y-1 text-sm"><p>Latent Variables: <span className="font-semibold">{parsedModelPreview.latentCount}</span></p><p>Regression Paths: <span className="font-semibold">{parsedModelPreview.pathCount}</span></p><p>Status: {parsedModelPreview.isValid ? <span className="text-green-600">Valid</span> : <span className="text-amber-600">Incomplete</span>}</p></div></div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!parsedModelPreview.isValid}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Estimation Settings</CardTitle><CardDescription>Configure SEM parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3 max-w-xs"><Label>Estimator</Label><Select value={estimator} onValueChange={setEstimator}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ML">Maximum Likelihood (ML)</SelectItem><SelectItem value="GLS">Generalized Least Squares</SelectItem><SelectItem value="WLS">Weighted Least Squares</SelectItem></SelectContent></Select></div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Estimator:</strong> {estimator}</p><p>• <strong className="text-foreground">Sample size:</strong> n = {data.length}</p><p>• <strong className="text-foreground">Variables:</strong> {allHeaders.length} columns</p></div></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Estimator Info</h4><p className="text-sm text-muted-foreground">ML (Maximum Likelihood) is the default and works well for normally distributed data. GLS is more robust to non-normality. WLS is for ordinal/categorical data.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6"><div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-amber-50/50 dark:bg-amber-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div></div>))}</div></CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run SEM<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const fit = results.fit_indices;
                    const isGoodFit = (fit.cfi ?? 0) >= 0.90 && (fit.rmsea ?? 1) <= 0.08;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>SEM analysis with {results.interpretation.n_latent_vars} latent variables</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGoodFit ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        {results.interpretation.key_insights.slice(0, 3).map((insight, i) => (
                                            <div key={i} className="flex items-start gap-3"><span className={`font-bold ${isGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm"><strong>{insight.title}:</strong> {insight.description}</p></div>
                                        ))}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">{isGoodFit ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{isGoodFit ? "Good Model Fit!" : "Model Fit Needs Improvement"}</p><p className="text-sm text-muted-foreground mt-1">{isGoodFit ? `CFI = ${fit.cfi?.toFixed(3)}, RMSEA = ${fit.rmsea?.toFixed(3)}. The model adequately fits the data.` : `CFI = ${fit.cfi?.toFixed(3)}, RMSEA = ${fit.rmsea?.toFixed(3)}. Consider model modification.`}</p></div></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className={(fit.cfi ?? 0) >= 0.95 ? 'border-green-200' : ''}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">CFI</p><p className={`text-xl font-bold ${(fit.cfi ?? 0) >= 0.95 ? 'text-green-600' : (fit.cfi ?? 0) >= 0.90 ? 'text-blue-600' : 'text-amber-600'}`}>{fit.cfi?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{(fit.cfi ?? 0) >= 0.95 ? 'Excellent' : (fit.cfi ?? 0) >= 0.90 ? 'Good' : 'Poor'}</p></CardContent></Card>
                                    <Card className={(fit.rmsea ?? 1) <= 0.05 ? 'border-green-200' : ''}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">RMSEA</p><p className={`text-xl font-bold ${(fit.rmsea ?? 1) <= 0.05 ? 'text-green-600' : (fit.rmsea ?? 1) <= 0.08 ? 'text-blue-600' : 'text-amber-600'}`}>{fit.rmsea?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{(fit.rmsea ?? 1) <= 0.05 ? 'Excellent' : (fit.rmsea ?? 1) <= 0.08 ? 'Good' : 'Poor'}</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">SRMR</p><p className="text-xl font-bold">{fit.srmr?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{(fit.srmr ?? 1) <= 0.08 ? 'Good' : 'Poor'}</p></CardContent></Card>
                                    <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">χ² / df</p><p className="text-xl font-bold">{((fit.chi_square ?? 0) / (fit.df || 1)).toFixed(2)}</p><p className="text-xs text-muted-foreground">{((fit.chi_square ?? 0) / (fit.df || 1)) <= 3 ? 'Good' : 'Poor'}</p></CardContent></Card>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding SEM results</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">Measurement Model</h4><p className="text-sm text-muted-foreground">Factor loadings show how well each indicator reflects its latent variable. Loadings &gt; 0.7 are excellent, &gt; 0.5 are acceptable.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Structural Model</h4><p className="text-sm text-muted-foreground">Path coefficients (β) represent the strength and direction of relationships. Significant paths (p &lt; .05) support your hypotheses.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Model Fit</h4><p className="text-sm text-muted-foreground">CFI ≥ .95, RMSEA ≤ .05, SRMR ≤ .08 indicate excellent fit. CFI ≥ .90, RMSEA ≤ .08 are acceptable thresholds.</p></div></div></div>
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-xl p-5 border border-amber-300 dark:border-amber-700"><h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-amber-600" />Fit Index Guide</h4><div className="grid grid-cols-3 gap-2 text-xs mt-3"><div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">CFI ≥ .95</p><p className="text-muted-foreground">Excellent</p></div><div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">RMSEA ≤ .05</p><p className="text-muted-foreground">Excellent</p></div><div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">SRMR ≤ .08</p><p className="text-muted-foreground">Good</p></div></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4"><div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full SEM report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">SEM Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">n = {results.n_observations} | {results.estimator} estimation | {new Date().toLocaleDateString()}</p></div>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="path" className="w-full"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="path">Path Diagram</TabsTrigger><TabsTrigger value="loadings">Loadings</TabsTrigger><TabsTrigger value="corr">Correlations</TabsTrigger></TabsList><TabsContent value="path" className="mt-4">{results.path_diagram ? <Image src={`data:image/png;base64,${results.path_diagram}`} alt="Path Diagram" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No path diagram</p>}</TabsContent><TabsContent value="loadings" className="mt-4">{results.loading_heatmap ? <Image src={`data:image/png;base64,${results.loading_heatmap}`} alt="Loading Heatmap" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No loading heatmap</p>}</TabsContent><TabsContent value="corr" className="mt-4">{results.correlation_matrix ? <Image src={`data:image/png;base64,${results.correlation_matrix}`} alt="Correlation Matrix" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No correlation matrix</p>}</TabsContent></Tabs></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Fit Indices</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">{[{label: 'χ²', value: results.fit_indices.chi_square?.toFixed(2)}, {label: 'df', value: results.fit_indices.df}, {label: 'CFI', value: results.fit_indices.cfi?.toFixed(3)}, {label: 'TLI', value: results.fit_indices.tli?.toFixed(3)}, {label: 'RMSEA', value: results.fit_indices.rmsea?.toFixed(3)}, {label: 'SRMR', value: results.fit_indices.srmr?.toFixed(3)}].map((item, i) => (<div key={i} className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-lg font-semibold">{item.value}</p></div>))}</div></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Measurement Model (Factor Loadings)</CardTitle></CardHeader><CardContent><ScrollArea className="h-[250px]"><Table><TableHeader><TableRow><TableHead>Latent Variable</TableHead><TableHead>Indicator</TableHead><TableHead className="text-right">Loading</TableHead><TableHead className="text-right">Cronbach α</TableHead></TableRow></TableHeader><TableBody>{Object.entries(results.measurement_model).map(([latent, data]) => data.loadings && Object.entries(data.loadings).map(([ind, load], i) => (<TableRow key={`${latent}-${ind}`}><TableCell className="font-medium">{i === 0 ? latent : ''}</TableCell><TableCell>{ind}</TableCell><TableCell className="text-right font-mono"><span className={Math.abs(load) >= 0.7 ? 'text-green-600 font-semibold' : Math.abs(load) >= 0.5 ? '' : 'text-amber-600'}>{load.toFixed(3)}</span></TableCell><TableCell className="text-right font-mono">{i === 0 ? data.cronbach_alpha?.toFixed(3) : ''}</TableCell></TableRow>)))}</TableBody></Table></ScrollArea></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Structural Model (Path Coefficients)</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Path</TableHead><TableHead className="text-right">β</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">t</TableHead><TableHead className="text-right">p</TableHead><TableHead className="text-right">Sig.</TableHead></TableRow></TableHeader><TableBody>{results.structural_model.filter(p => !p.is_r_squared).map((p, i) => (<TableRow key={i} className={p.significant ? 'bg-green-50 dark:bg-green-950/20' : ''}><TableCell className="font-medium">{p.path}</TableCell><TableCell className="text-right font-mono">{p.estimate?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{p.std_error?.toFixed(3) ?? '-'}</TableCell><TableCell className="text-right font-mono">{p.t_value?.toFixed(2) ?? '-'}</TableCell><TableCell className="text-right font-mono"><span className={p.significant ? 'text-green-600 font-semibold' : ''}>{p.p_value != null ? (p.p_value < 0.001 ? '< .001' : p.p_value.toFixed(3)) : '-'}</span></TableCell><TableCell className="text-right">{p.significant ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running SEM analysis...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
        </div>
    );
}
