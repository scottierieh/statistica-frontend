'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lightbulb, HelpCircle, BookOpen, Download, FileSpreadsheet, ImageIcon, Target, GitCommit, TrendingUp, Search, BarChart3, Waypoints, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, BarChart, FileCode, FileType, Layers } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';

interface Insight { type: 'warning' | 'info'; title: string; description: string; }
interface BreakPoint { index: number; f_statistic?: number; p_value?: number; cusum_value?: number; direction?: string; variance_ratio?: number; normalized_diff?: number; type?: string; }
interface Segment { segment: number; start: number; end: number; length: number; mean: number; std: number; median: number; min: number; max: number; }
interface TestResult { statistic?: number; threshold?: number; significant?: boolean; n_breaks: number; breaks: BreakPoint[]; change_point?: number; p_value?: number; }
interface AnalysisResult { 
    variable: string; 
    n_observations: number; 
    tests: {
        cusum: TestResult;
        pettitt: { statistic: number; change_point: number; p_value: number; significant: boolean };
        bai_perron: { n_breaks: number; breaks: BreakPoint[] };
        variance: { n_breaks: number; breaks: BreakPoint[] };
        mean_shift: { n_breaks: number; breaks: BreakPoint[] };
    };
    all_breaks: number[];
    segments: Segment[]; 
    insights: Insight[]; 
    recommendations: string[]; 
    plots: { cusum: string; pettitt: string; breaks: string; variance: string; summary: string }; 
    error?: string; 
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [
    { id: 1, label: 'Variable' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'timeseries' || d.id === 'time_series');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Waypoints className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Change Point Detection</CardTitle>
                    <CardDescription className="text-base mt-2">Detect structural breaks in time series data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><GitCommit className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">CUSUM Test</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Cumulative sum for mean shifts</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Search className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Pettitt Test</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Single change point detection</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChart3 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Bai-Perron</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Multiple structural breaks</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />About Change Point Detection</h3>
                        <p className="text-sm text-muted-foreground mb-4">Identifies points where mean, variance, or trend significantly changes. Useful for regime detection, anomalies, and structural shifts.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2">Tests Included</h4><ul className="space-y-1 text-sm text-muted-foreground"><li>• CUSUM: Cumulative sum test</li><li>• Pettitt: Non-parametric test</li><li>• Bai-Perron: Sequential breaks</li><li>• Variance & Mean shift detection</li></ul></div>
                            <div><h4 className="font-semibold text-sm mb-2">Applications</h4><ul className="space-y-1 text-sm text-muted-foreground"><li>• Financial regime detection</li><li>• Climate change analysis</li><li>• Process monitoring</li><li>• Quality control</li></ul></div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Waypoints className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface ChangePointPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function ChangePointPage({ data, numericHeaders, onLoadExample }: ChangePointPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedVar, setSelectedVar] = useState<string>('');
    const [maxBreaks, setMaxBreaks] = useState(5);
    const [minSegmentPct, setMinSegmentPct] = useState(10);
    const [cusumThreshold, setCusumThreshold] = useState(1.36);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const canRun = useMemo(() => data.length >= 20 && numericHeaders.length >= 1, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Variable selected', passed: !!selectedVar, detail: selectedVar || 'Not selected' });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 20, detail: `n = ${data.length} (minimum: 20)` });
        const minSegSize = Math.max(Math.floor(data.length * minSegmentPct / 100), 5);
        checks.push({ label: 'Minimum segment feasibility', passed: data.length >= minSegSize * 2, detail: `Min segment: ${minSegSize} observations (${minSegmentPct}%)` });
        checks.push({ label: 'Max breaks feasible', passed: data.length >= (maxBreaks + 1) * minSegSize, detail: `Can detect up to ${maxBreaks} break(s)` });
        return checks;
    }, [selectedVar, data, minSegmentPct, maxBreaks]);

    const allValidationsPassed = useMemo(() => !!selectedVar && data.length >= 20, [selectedVar, data]);

    useEffect(() => { setSelectedVar(''); setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1); }, [data, numericHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { runAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ChangePoint_${new Date().toISOString().split('T')[0]}.png`;
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
            total_breaks: analysisResult.all_breaks.length,
            segments: analysisResult.segments.length,
            cusum_significant: analysisResult.tests.cusum.significant,
            pettitt_significant: analysisResult.tests.pettitt.significant,
            all_break_indices: analysisResult.all_breaks.join('; ')
        }];
        let csvContent = "CHANGE POINT DETECTION\n" + Papa.unparse(summaryData) + "\n\n";
        csvContent += "SEGMENTS\n" + Papa.unparse(analysisResult.segments.map(s => ({ Segment: s.segment, Start: s.start, End: s.end, Length: s.length, Mean: s.mean.toFixed(4), Std: s.std.toFixed(4), Median: s.median.toFixed(4) })));
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ChangePoint_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const runAnalysis = useCallback(async () => {
        if (!selectedVar) { toast({ variant: 'destructive', title: 'Please select a variable.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/change-point`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    variable: selectedVar, 
                    max_breaks: maxBreaks,
                    min_segment_pct: minSegmentPct,
                    cusum_threshold: cusumThreshold
                })
            });
            if (!response.ok) throw new Error((await response.json()).detail || 'Analysis failed');
            const result: AnalysisResult = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, selectedVar, maxBreaks, minSegmentPct, cusumThreshold, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const result = analysisResult;

    const ProgressBar = () => (
        <div className="w-full mb-8"><div className="flex items-center justify-between">
            {STEPS.map((step) => {
                const isCompleted = step.id < currentStep; const isCurrent = step.id === currentStep; const isClickable = step.id <= maxReachedStep;
                return (<button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable} className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>{isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}</div>
                    <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                </button>);
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="mb-6 flex justify-between items-center"><div><h1 className="text-2xl font-bold">Change Point Detection</h1><p className="text-muted-foreground mt-1">Detect structural breaks in time series</p></div><Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button></div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {/* Step 1 */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variable</CardTitle><CardDescription>Choose a numeric time series variable</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2"><Label className="text-sm font-medium">Time Series Variable</Label><Select value={selectedVar} onValueChange={setSelectedVar}><SelectTrigger className="h-12"><SelectValue placeholder="Select variable" /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">The numeric variable to analyze for structural breaks</p></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations. Minimum 20 required.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!selectedVar}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Detection Settings</CardTitle><CardDescription>Configure detection parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Label>Maximum Breaks: {maxBreaks}</Label>
                                    <Slider value={[maxBreaks]} onValueChange={([v]) => setMaxBreaks(v)} min={1} max={20} step={1}/>
                                    <p className="text-xs text-muted-foreground">Maximum number of structural breaks to detect (1-20)</p>
                                </div>
                                <div className="space-y-3">
                                    <Label>Minimum Segment Size: {minSegmentPct}%</Label>
                                    <Slider value={[minSegmentPct]} onValueChange={([v]) => setMinSegmentPct(v)} min={5} max={30} step={1}/>
                                    <p className="text-xs text-muted-foreground">Minimum segment length as percentage of data (5-30%)</p>
                                </div>
                                <div className="space-y-3">
                                    <Label>CUSUM Threshold: {cusumThreshold.toFixed(2)}</Label>
                                    <Slider value={[cusumThreshold]} onValueChange={([v]) => setCusumThreshold(v)} min={0.5} max={3.0} step={0.01}/>
                                    <p className="text-xs text-muted-foreground">Critical value for CUSUM test (0.5-3.0, default 1.36 for 5% significance)</p>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-2">Tests Applied</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />CUSUM Test</div>
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Pettitt Test</div>
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Bai-Perron</div>
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Variance Change</div>
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Mean Shift</div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div></div>))}</div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Waypoints className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" /><p className="text-sm text-muted-foreground">Will run 5 structural break tests on <strong>{selectedVar}</strong>.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Detecting...</> : <>Detect Change Points<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && result && (() => {
                    const nBreaks = result.all_breaks.length;
                    const isStable = nBreaks === 0;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Structural breaks detected in {selectedVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings Box */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isStable ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isStable ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isStable ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Detected <strong>{nBreaks}</strong> structural break(s) across multiple tests —
                                            {isStable ? " your series appears stable with no major shifts." : " regime changes were identified in your data."}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isStable ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Series divided into <strong>{result.segments.length}</strong> distinct segment(s) with different statistical properties.
                                        </p></div>
                                        {nBreaks > 0 && <div className="flex items-start gap-3"><span className="font-bold text-amber-600">•</span><p className="text-sm">
                                            Break points at indices: <strong>{result.all_breaks.slice(0, 5).join(', ')}{result.all_breaks.length > 5 ? '...' : ''}</strong>
                                        </p></div>}
                                    </div>
                                </div>

                                {/* Conclusion Box */}
                                <div className={`rounded-xl p-5 border ${isStable ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isStable ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isStable ? "Stable Series — No Structural Breaks" : "Structural Breaks Detected"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isStable 
                                                    ? "Your data can be analyzed as a whole without segmentation. Statistical properties are consistent throughout." 
                                                    : "Multiple regimes identified. Consider analyzing each segment separately or accounting for regime changes in your models."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Total Breaks</p><GitCommit className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${nBreaks > 0 ? 'text-amber-600' : 'text-primary'}`}>{nBreaks}</p><p className="text-xs text-muted-foreground">Combined</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Segments</p><Waypoints className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{result.segments.length}</p><p className="text-xs text-muted-foreground">Distinct regions</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">CUSUM</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${result.tests.cusum.significant ? 'text-amber-600' : 'text-primary'}`}>{result.tests.cusum.significant ? 'Sig.' : 'N.S.'}</p><p className="text-xs text-muted-foreground">p &lt; 0.05</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Observations</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{result.n_observations}</p><p className="text-xs text-muted-foreground">Data points</p></div></CardContent></Card>
                                </div>

                                {/* Test Results */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    <div className={`rounded-lg p-3 text-center ${result.tests.cusum.significant ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-muted/30'}`}>
                                        <p className="text-xs font-medium uppercase">CUSUM</p>
                                        <p className="text-lg font-bold">{result.tests.cusum.n_breaks}</p>
                                    </div>
                                    <div className={`rounded-lg p-3 text-center ${result.tests.pettitt.significant ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-muted/30'}`}>
                                        <p className="text-xs font-medium uppercase">Pettitt</p>
                                        <p className="text-lg font-bold">{result.tests.pettitt.significant ? '1' : '0'}</p>
                                    </div>
                                    <div className={`rounded-lg p-3 text-center ${result.tests.bai_perron.n_breaks > 0 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-muted/30'}`}>
                                        <p className="text-xs font-medium uppercase">Bai-Perron</p>
                                        <p className="text-lg font-bold">{result.tests.bai_perron.n_breaks}</p>
                                    </div>
                                    <div className={`rounded-lg p-3 text-center ${result.tests.variance.n_breaks > 0 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-muted/30'}`}>
                                        <p className="text-xs font-medium uppercase">Variance</p>
                                        <p className="text-lg font-bold">{result.tests.variance.n_breaks}</p>
                                    </div>
                                    <div className={`rounded-lg p-3 text-center ${result.tests.mean_shift.n_breaks > 0 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-muted/30'}`}>
                                        <p className="text-xs font-medium uppercase">Mean Shift</p>
                                        <p className="text-lg font-bold">{result.tests.mean_shift.n_breaks}</p>
                                    </div>
                                </div>

                                {/* Quality Stars */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Stability:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = nBreaks === 0 ? 5 : nBreaks === 1 ? 4 : nBreaks <= 3 ? 3 : nBreaks <= 5 ? 2 : 1;
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
                {currentStep === 5 && result && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding the structural break analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">CUSUM Test</h4><p className="text-sm text-muted-foreground">Tests for cumulative deviation from the mean. Statistic: {result.tests.cusum.statistic?.toFixed(4) ?? 'N/A'}, Threshold: {result.tests.cusum.threshold?.toFixed(2) ?? 'N/A'}. {result.tests.cusum.significant ? 'Significant departure detected.' : 'No significant departure.'}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Pettitt Test</h4><p className="text-sm text-muted-foreground">Non-parametric test for single change point. {result.tests.pettitt.significant ? `Significant change at index ${result.tests.pettitt.change_point}` : 'No significant single change point'} (p = {result.tests.pettitt.p_value?.toFixed(4) ?? 'N/A'}).</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Bai-Perron Sequential Test</h4><p className="text-sm text-muted-foreground">Tests for multiple structural breaks using F-tests. Found {result.tests.bai_perron.n_breaks} break(s) at: {result.tests.bai_perron.breaks.map(b => b.index).join(', ') || 'None'}.</p></div></div></div>
                            <div className={`rounded-xl p-5 border ${result.all_breaks.length === 0 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Practical Recommendations</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">{result.recommendations.slice(0, 4).map((rec, i) => <li key={i} className="flex items-start gap-2"><span>•</span>{rec}</li>)}</ul>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && result && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full detection results and visualizations</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileType className="mr-2 h-4 w-4" />Word Document<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileCode className="mr-2 h-4 w-4" />Python Script<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Change Point Detection Report</h2><p className="text-sm text-muted-foreground mt-1">{result.variable} | n = {result.n_observations} | {new Date().toLocaleDateString()}</p></div>
                        
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Observations</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{result.n_observations}</p><p className="text-xs text-muted-foreground">Data points</p></div></CardContent></Card>
                            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Breaks Detected</p><GitCommit className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${result.all_breaks.length > 0 ? 'text-amber-600' : ''}`}>{result.all_breaks.length}</p><p className="text-xs text-muted-foreground">Total unique</p></div></CardContent></Card>
                            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Segments</p><Waypoints className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold text-primary">{result.segments.length}</p><p className="text-xs text-muted-foreground">Distinct regions</p></div></CardContent></Card>
                            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Tests Run</p><Search className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">5</p><p className="text-xs text-muted-foreground">Applied</p></div></CardContent></Card>
                        </div>
                        
                        {/* Summary */}
                        <Card><CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader><CardContent>
                            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Summary</h3></div>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Structural break analysis was performed on {result.variable} (<em>N</em> = {result.n_observations}) using five tests: CUSUM, Pettitt, Bai-Perron, Variance Change, and Mean Shift detection. 
                                    {result.all_breaks.length > 0 
                                        ? ` A total of ${result.all_breaks.length} unique break point(s) were identified at indices ${result.all_breaks.slice(0, 5).join(', ')}${result.all_breaks.length > 5 ? '...' : ''}, dividing the series into ${result.segments.length} segments.`
                                        : ` No significant structural breaks were detected, indicating a stable series.`}
                                </p>
                            </div>
                        </CardContent></Card>

                        {/* Plots */}
                        <Tabs defaultValue="summary">
                            <TabsList className="grid w-full grid-cols-5"><TabsTrigger value="summary">Summary</TabsTrigger><TabsTrigger value="cusum">CUSUM</TabsTrigger><TabsTrigger value="pettitt">Pettitt</TabsTrigger><TabsTrigger value="breaks">Breaks</TabsTrigger><TabsTrigger value="variance">Variance</TabsTrigger></TabsList>
                            <TabsContent value="summary"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.summary}`} alt="Summary" className="w-full rounded border"/></CardContent></Card></TabsContent>
                            <TabsContent value="cusum"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.cusum}`} alt="CUSUM" className="w-full rounded border"/></CardContent></Card></TabsContent>
                            <TabsContent value="pettitt"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.pettitt}`} alt="Pettitt" className="w-full rounded border"/></CardContent></Card></TabsContent>
                            <TabsContent value="breaks"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.breaks}`} alt="Breaks" className="w-full rounded border"/></CardContent></Card></TabsContent>
                            <TabsContent value="variance"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.variance}`} alt="Variance" className="w-full rounded border"/></CardContent></Card></TabsContent>
                        </Tabs>

                        {/* Segments Table */}
                        <Card><CardHeader><CardTitle>Segment Statistics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Segment</TableHead><TableHead className="text-right">Start</TableHead><TableHead className="text-right">End</TableHead><TableHead className="text-right">Length</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Std</TableHead><TableHead className="text-right">Median</TableHead></TableRow></TableHeader><TableBody>{result.segments.map((seg) => (<TableRow key={seg.segment}><TableCell><Badge variant="outline">Seg {seg.segment}</Badge></TableCell><TableCell className="text-right">{seg.start}</TableCell><TableCell className="text-right">{seg.end}</TableCell><TableCell className="text-right">{seg.length}</TableCell><TableCell className="text-right font-mono">{seg.mean.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{seg.std.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{seg.median.toFixed(4)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                        {/* Break Points */}
                        {result.all_breaks.length > 0 && (
                            <Card><CardHeader><CardTitle>Detected Break Points</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{result.all_breaks.map((cp, i) => <Badge key={i} variant="destructive" className="text-sm px-3 py-1">Index {cp}</Badge>)}</div></CardContent></Card>
                        )}

                        {/* Insights */}
                        <Card><CardHeader><CardTitle>Insights</CardTitle></CardHeader><CardContent><div className="space-y-3">{result.insights.map((insight, i) => (
                            <div key={i} className={`p-4 rounded-lg ${insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-blue-50 dark:bg-blue-950/20'}`}>
                                <p className={`font-semibold text-sm ${insight.type === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>{insight.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                            </div>
                        ))}</div></CardContent></Card>
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
        </div>
    );
}
