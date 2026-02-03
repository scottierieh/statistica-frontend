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
import { Loader2, HelpCircle, Heart, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, Gauge, Activity, Info, Shield, FileType, Hash, Clock, Users, Code, Copy, Timer, HeartPulse } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/kaplan_meier_analysis.py?alt=media";

const metricDefinitions: Record<string, string> = {
    survival_probability: "S(t): The probability that a subject survives beyond time t.",
    median_survival: "The time at which the survival probability drops to 50%.",
    confidence_interval: "Range of values within which the true survival probability likely falls.",
    censoring: "When a subject's event time is unknown (e.g., lost to follow-up, study ended).",
    event: "The outcome of interest (e.g., death, relapse, failure).",
    time_to_event: "Duration from study entry until the event occurs or censoring.",
    logrank_test: "Statistical test comparing survival distributions between groups.",
    p_value: "Probability of observing results as extreme as the data if no true difference exists.",
    hazard: "Instantaneous risk of the event occurring at time t, given survival until t.",
    cumulative_hazard: "H(t) = -log(S(t)): Accumulated risk up to time t.",
    at_risk: "Number of subjects still being observed (not yet had event or been censored) at time t.",
    kaplan_meier: "Non-parametric estimator of survival function from time-to-event data."
};

interface GroupResult {
    label: string;
    n_subjects: number;
    n_events: number;
    n_censored: number;
    censoring_rate: number;
    median_survival: number | null;
    median_ci_lower: number | null;
    median_ci_upper: number | null;
    timeline: number[];
    survival_prob: number[];
    ci_lower: number[];
    ci_upper: number[];
}

interface LogrankResult {
    test_name: string;
    test_statistic: number;
    p_value: number;
    degrees_of_freedom: number;
    groups_compared: string[];
    significant: boolean;
    interpretation: string;
}

interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }

interface AnalysisResults {
    n_subjects: number;
    n_events: number;
    n_censored: number;
    event_rate: number;
    confidence_level: number;
    has_groups: boolean;
    group_col: string | null;
    n_groups: number;
    group_results: GroupResult[];
    logrank_test: LogrankResult | null;
    km_plot: string | null;
    hazard_plot: string | null;
    survival_table_plot: string | null;
    interpretation: Interpretation;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

// ============ MODALS ============
const PythonCodeModal = ({ isOpen, onClose, codeUrl }: { isOpen: boolean; onClose: () => void; codeUrl: string; }) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { if (isOpen && !code) { fetchCode(); } }, [isOpen, code]);

    const fetchCode = async () => {
        setIsLoading(true); setError(null);
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) throw new Error(`Failed to fetch code: ${response.status}`);
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Python code' });
        } finally { setIsLoading(false); }
    };

    const handleCopy = () => { navigator.clipboard.writeText(code); toast({ title: 'Copied!', description: 'Code copied to clipboard' }); };
    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = 'kaplan_meier_analysis.py';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!', description: 'Python file saved' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Kaplan-Meier Analysis</DialogTitle>
                    <DialogDescription>View, copy, or download the Python code used for this analysis.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 py-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading || !!error}><Copy className="mr-2 h-4 w-4" />Copy Code</Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading || !!error}><Download className="mr-2 h-4 w-4" />Download .py</Button>
                    {error && <Button variant="outline" size="sm" onClick={fetchCode}><Loader2 className="mr-2 h-4 w-4" />Retry</Button>}
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 text-slate-300">Loading code...</span></div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center"><AlertTriangle className="h-10 w-10 text-amber-500 mb-3" /><p className="text-slate-300 mb-2">Failed to load code</p><p className="text-slate-500 text-sm">{error}</p></div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950"><pre className="p-4 text-sm text-slate-50 overflow-x-auto"><code>{code}</code></pre></ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Survival Analysis Terms Glossary</DialogTitle>
                <DialogDescription>Definitions of terms used in Kaplan-Meier analysis</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                    {Object.entries(metricDefinitions).map(([term, definition]) => (
                        <div key={term} className="border-b pb-3">
                            <h4 className="font-semibold capitalize">{term.replace(/_/g, ' ')}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
);

// ============ SUMMARY CARDS ============
const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const eventRate = results.event_rate;
    const getQuality = (rate: number) => rate < 30 ? 'Low event rate' : rate < 60 ? 'Moderate' : 'High event rate';
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Subjects</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_subjects}</p><p className="text-xs text-muted-foreground">Total analyzed</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Events</p><HeartPulse className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_events}</p><p className="text-xs text-muted-foreground">{eventRate.toFixed(1)}% event rate</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Censored</p><Timer className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_censored}</p><p className="text-xs text-muted-foreground">{(100 - eventRate).toFixed(1)}% censoring</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Groups</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.n_groups}</p><p className="text-xs text-muted-foreground">{results.has_groups ? 'Compared' : 'Overall'}</p></div></CardContent></Card>
        </div>
    );
};

const KaplanMeierGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Kaplan-Meier Survival Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Kaplan-Meier */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <HeartPulse className="w-4 h-4" />
                What is Kaplan-Meier Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Kaplan-Meier is a <strong>non-parametric method</strong> for estimating survival probabilities 
                from time-to-event data. It's the most common approach for analyzing how long until an event occurs.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The survival function S(t):</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    S(t) = P(T &gt; t) = probability of surviving beyond time t<br/>
                    Estimated as: S(t) = ∏ (1 - d_i/n_i) for all event times ≤ t<br/>
                    Where d_i = events at time i, n_i = at-risk at time i
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Understanding Censoring
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">What is Censoring?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Censoring occurs when we don't observe the event for a subject:
                    <br/>• <strong>Lost to follow-up:</strong> Subject dropped out of study
                    <br/>• <strong>Study ended:</strong> Event hadn't occurred by study end
                    <br/>• <strong>Competing event:</strong> Different event occurred first
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Why Censoring Matters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Simply excluding censored subjects would <strong>bias</strong> results
                    <br/>• Kaplan-Meier correctly uses their data up to censoring time
                    <br/>• Censored subjects reduce "at-risk" count when censored
                    <br/>• High censoring (&gt;70%) may affect estimate reliability
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                The Log-Rank Test
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  The <strong>log-rank test</strong> compares survival distributions between groups:
                </p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• <strong>H₀:</strong> Survival curves are identical</li>
                  <li>• <strong>H₁:</strong> Survival curves differ</li>
                  <li>• Compares observed vs expected events at each time point</li>
                  <li>• χ² distributed under H₀</li>
                  <li>• p &lt; 0.05 → significant survival difference</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Note:</strong> Log-rank test has equal weighting across time. 
                    Use Wilcoxon test if early differences matter more.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Median Survival</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Time when S(t) = 0.5 (50% survival probability)
                    <br/>• "Not reached" means &gt;50% still event-free
                    <br/>• More robust than mean survival time
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Confidence Intervals</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Greenwood's formula estimates variance of S(t)
                    <br/>• Wider CI = more uncertainty
                    <br/>• CI widens as at-risk count decreases
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Survival Curves</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Step function (drops at event times)
                    <br/>• + marks indicate censoring
                    <br/>• Curves that separate early suggest different survival
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Requirements</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Time variable: positive numeric</li>
                    <li>• Event indicator: 1=event, 0=censored</li>
                    <li>• Minimum ~10 events per group</li>
                    <li>• Check for tied event times</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Assumptions</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Censoring is non-informative</li>
                    <li>• Subjects enter at different times (OK)</li>
                    <li>• Event definition is consistent</li>
                    <li>• No competing risks (or handle separately)</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Estimating survival probabilities</li>
                    <li>• Comparing 2+ groups</li>
                    <li>• Visualizing time-to-event data</li>
                    <li>• Clinical trial analysis</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Limitations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Cannot adjust for covariates (use Cox)</li>
                    <li>• Log-rank test gives no effect size</li>
                    <li>• Requires proportional hazards for valid comparison</li>
                    <li>• Late-stage estimates may be unreliable</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Kaplan-Meier provides descriptive survival 
                estimates. For adjusted analysis or hazard ratios, use Cox proportional hazards regression. 
                Always report median survival with confidence intervals, number at risk, and censoring rates 
                for complete interpretation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// ============ INTRO PAGE ============
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'survival-data' || d.id === 'lung-cancer');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><HeartPulse className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Kaplan-Meier Survival Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Non-parametric estimation of survival functions from time-to-event data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Clock className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Time-to-Event</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Analyze duration until event occurs</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Handles Censoring</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Accounts for incomplete observations</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Gauge className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Group Comparison</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Log-rank test for differences</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use Kaplan-Meier</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Kaplan-Meier for analyzing time until an event (death, relapse, failure). It handles censored data where some subjects haven't experienced the event yet.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Time:</strong> Duration/follow-up time</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Event:</strong> 0/1 indicator (censored/event)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Optional:</strong> Grouping variable</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Survival curves:</strong> S(t) over time</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Median survival:</strong> 50% survival time</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Log-rank test:</strong> Group comparison</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><HeartPulse className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};
// ============ PART 2: MAIN COMPONENT START + STEPS 1-3 ============

interface KaplanMeierPageProps { data: DataSet; allHeaders: string[]; numericHeaders: string[]; categoricalHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function KaplanMeierAnalysisPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: KaplanMeierPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Variable selection
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [eventCol, setEventCol] = useState<string | undefined>();
    const [groupCol, setGroupCol] = useState<string | undefined>();
    
    // Settings
    const [confidenceLevel, setConfidenceLevel] = useState(0.95);
    const [showCensors, setShowCensors] = useState(true);
    const [showCI, setShowCI] = useState(true);
    const [atRiskCounts, setAtRiskCounts] = useState(true);
    
    // Results
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);


    const canRun = useMemo(() => data.length >= 10 && numericHeaders.length >= 2, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Time variable selected', passed: !!timeCol, detail: timeCol || 'Select time column' });
        checks.push({ label: 'Event variable selected', passed: !!eventCol, detail: eventCol || 'Select event column (0/1)' });
        checks.push({ label: 'Sample size (n ≥ 10)', passed: data.length >= 10, detail: `n = ${data.length}` });
        
        if (eventCol) {
            const eventValues = data.map(row => row[eventCol]).filter(v => v !== null && v !== undefined && v !== '');
            const uniqueEvents = [...new Set(eventValues)];
            const isValidEvent = uniqueEvents.every(v => v === 0 || v === 1 || v === '0' || v === '1');
            checks.push({ label: 'Event column is binary (0/1)', passed: isValidEvent, detail: isValidEvent ? 'Valid binary indicator' : `Found values: ${uniqueEvents.slice(0, 5).join(', ')}` });
        }
        
        if (groupCol) {
            const groupValues = data.map(row => row[groupCol]).filter(v => v !== null && v !== undefined && v !== '');
            const uniqueGroups = [...new Set(groupValues)];
            checks.push({ label: 'Group variable', passed: uniqueGroups.length >= 2 && uniqueGroups.length <= 10, detail: `${uniqueGroups.length} groups found` });
        }
        
        return checks;
    }, [timeCol, eventCol, groupCol, data]);

    const allValidationsPassed = dataValidation.filter(c => c.label !== 'Group variable').every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        // Auto-detect columns
        const potentialTime = numericHeaders.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('duration') || h.toLowerCase().includes('survival') || h.toLowerCase().includes('days') || h.toLowerCase().includes('months'));
        const potentialEvent = numericHeaders.find(h => h.toLowerCase().includes('event') || h.toLowerCase().includes('status') || h.toLowerCase().includes('censor') || h.toLowerCase().includes('death'));
        
        setTimeCol(potentialTime || numericHeaders[0]);
        setEventCol(potentialEvent || numericHeaders[1]);
        setGroupCol(undefined);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `KaplanMeier_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `KAPLAN-MEIER SURVIVAL ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nSubjects,${analysisResult.n_subjects}\nEvents,${analysisResult.n_events}\nCensored,${analysisResult.n_censored}\nEvent Rate,${analysisResult.event_rate.toFixed(2)}%\nConfidence Level,${analysisResult.confidence_level}\n\n`;
        
        if (analysisResult.logrank_test) {
            csv += `LOG-RANK TEST\nTest Statistic,${analysisResult.logrank_test.test_statistic}\np-value,${analysisResult.logrank_test.p_value}\nSignificant,${analysisResult.logrank_test.significant}\n\n`;
        }
        
        csv += `GROUP RESULTS\n`;
        const groupData = analysisResult.group_results.map(g => ({
            Group: g.label,
            Subjects: g.n_subjects,
            Events: g.n_events,
            Censored: g.n_censored,
            'Censoring Rate': `${g.censoring_rate.toFixed(1)}%`,
            'Median Survival': g.median_survival?.toFixed(2) || 'NR'
        }));
        csv += Papa.unparse(groupData);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `KaplanMeier_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/kaplan-meier-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult, timeCol, eventCol, groupCol, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `KaplanMeier_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, timeCol, eventCol, groupCol, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!timeCol || !eventCol) { toast({ variant: 'destructive', title: 'Error', description: 'Select time and event columns.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/survival-curves`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    data, 
                    time_col: timeCol, 
                    event_col: eventCol, 
                    group_col: groupCol || null,
                    confidence_level: confidenceLevel,
                    show_censors: showCensors,
                    show_ci: showCI,
                    at_risk_counts: atRiskCounts
                }) 
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `${result.n_subjects} subjects, ${result.n_events} events` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, timeCol, eventCol, groupCol, confidenceLevel, showCensors, showCI, atRiskCounts, toast]);

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

    return (
        <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
    <div><h1 className="text-2xl font-bold">Kaplan-Meier Survival Analysis</h1><p className="text-muted-foreground mt-1">Time-to-event analysis with censoring</p></div>
    <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Analysis Guide
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
            <HelpCircle className="w-5 h-5" />
        </Button>
    </div>
</div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose time, event, and optional grouping variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Time Variable</Label>
                                    <Select value={timeCol} onValueChange={setTimeCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select time column..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Duration/follow-up time (numeric)</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-primary" />Event Variable</Label>
                                    <Select value={eventCol} onValueChange={setEventCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select event column..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Event indicator: 1=event, 0=censored</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Group Variable (Optional)</Label>
                                <Select value={groupCol || 'none'} onValueChange={(v) => setGroupCol(v === 'none' ? undefined : v)}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="No grouping" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No grouping — analyze all together</SelectItem>
                                        {[...categoricalHeaders, ...numericHeaders.filter(h => h !== timeCol && h !== eventCol)].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Compare survival curves between groups (e.g., treatment vs control)</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample size: <strong>{data.length}</strong> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!timeCol || !eventCol}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Configure visualization options</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between"><Label className="text-sm">Confidence Level</Label><Badge variant="outline">{(confidenceLevel * 100).toFixed(0)}%</Badge></div>
                                    <Slider value={[confidenceLevel]} onValueChange={(v) => setConfidenceLevel(v[0])} min={0.8} max={0.99} step={0.01} />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2"><Checkbox id="show-ci" checked={showCI} onCheckedChange={(c) => setShowCI(!!c)} /><label htmlFor="show-ci" className="text-sm">Show confidence intervals</label></div>
                                    <div className="flex items-center gap-2"><Checkbox id="show-censors" checked={showCensors} onCheckedChange={(c) => setShowCensors(!!c)} /><label htmlFor="show-censors" className="text-sm">Show censoring marks (+)</label></div>
                                    <div className="flex items-center gap-2"><Checkbox id="at-risk" checked={atRiskCounts} onCheckedChange={(c) => setAtRiskCounts(!!c)} /><label htmlFor="at-risk" className="text-sm">Show at-risk table</label></div>
                                </div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Confidence intervals show uncertainty around survival estimates. At-risk counts display how many subjects are still being followed at each time point.</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}<div><p className={`font-medium text-sm ${check.passed ? '' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></div>))}
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Analysis Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Time:</span> {timeCol}</div><div><span className="text-muted-foreground">Event:</span> {eventCol}</div><div><span className="text-muted-foreground">Group:</span> {groupCol || 'None'}</div><div><span className="text-muted-foreground">CI Level:</span> {(confidenceLevel * 100).toFixed(0)}%</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><HeartPulse className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Kaplan-Meier will estimate survival probabilities accounting for censored observations.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}
                {/* ============ PART 3: STEPS 4-6 + CLOSING ============ */}

                {currentStep === 4 && results && (() => {
                    const hasSignificantDiff = results.logrank_test?.significant;
                    const medianReached = results.group_results.some(g => g.median_survival !== null);
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Survival analysis with {results.n_subjects} subjects</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${hasSignificantDiff !== undefined ? (hasSignificantDiff ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300') : 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${hasSignificantDiff ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Analyzed <strong>{results.n_subjects}</strong> subjects: <strong>{results.n_events}</strong> events ({results.event_rate.toFixed(1)}%), <strong>{results.n_censored}</strong> censored.</p>
                                        {results.group_results.map(g => (
                                            <p key={g.label} className="text-sm">• <strong>{g.label}</strong>: {g.n_subjects} subjects, median survival {g.median_survival !== null ? <strong>{g.median_survival.toFixed(2)}</strong> : <span className="text-muted-foreground">not reached</span>}.</p>
                                        ))}
                                        {results.logrank_test && (
                                            <p className="text-sm">• Log-rank test: p = <strong>{results.logrank_test.p_value < 0.001 ? '<0.001' : results.logrank_test.p_value.toFixed(4)}</strong> — {results.logrank_test.interpretation}</p>
                                        )}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${hasSignificantDiff ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {hasSignificantDiff ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{hasSignificantDiff ? "Significant Survival Difference!" : results.has_groups ? "No Significant Difference" : "Survival Analysis Complete"}</p><p className="text-sm text-muted-foreground mt-1">{hasSignificantDiff ? "The survival curves are statistically different between groups." : results.has_groups ? "Survival curves are not significantly different. Consider other factors or larger sample size." : "Single group analysis completed. Consider comparing with a control or reference group."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Event rate: {results.event_rate.toFixed(1)}% — {results.event_rate > 50 ? 'majority experienced event' : 'majority censored'}</p><p>• Censoring: {(100 - results.event_rate).toFixed(1)}% — {results.event_rate < 30 ? 'high censoring may affect estimates' : 'acceptable censoring rate'}</p>{results.logrank_test && <p>• Statistical significance: {results.logrank_test.significant ? 'Yes (p < 0.05)' : 'No (p ≥ 0.05)'}</p>}</div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Analysis Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (results.n_subjects >= 100 ? 5 : results.n_subjects >= 50 ? 4 : results.n_subjects >= 30 ? 3 : 2) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding Kaplan-Meier survival analysis</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How Kaplan-Meier Works</h4><p className="text-sm text-muted-foreground">Kaplan-Meier estimates survival probability S(t) at each time point where an event occurs. It multiplies conditional survival probabilities: S(t) = ∏(1 - d_i/n_i), where d_i is deaths and n_i is at-risk at time i. This handles censored data properly.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Handling Censoring</h4><p className="text-sm text-muted-foreground">Censored subjects (event=0) contribute to the at-risk count until their censoring time, then are removed from calculations. This accounts for lost follow-up, study end, or competing events without biasing survival estimates.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Log-Rank Test</h4><p className="text-sm text-muted-foreground">{results.logrank_test ? `The log-rank test compares observed vs expected events in each group. Your test statistic of ${results.logrank_test.test_statistic.toFixed(2)} with p=${results.logrank_test.p_value < 0.001 ? '<0.001' : results.logrank_test.p_value.toFixed(4)} ${results.logrank_test.significant ? 'indicates significant difference' : 'suggests no significant difference'} between groups.` : 'Log-rank test compares survival distributions between groups. It tests whether the survival curves are statistically different.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Median Survival</h4><p className="text-sm text-muted-foreground">{results.group_results.some(g => g.median_survival !== null) ? `Median survival is the time when S(t)=0.5 (50% survival). ${results.group_results.filter(g => g.median_survival !== null).map(g => `${g.label}: ${g.median_survival?.toFixed(2)}`).join(', ')}.` : 'Median survival was not reached — more than 50% of subjects were still event-free at end of follow-up. This often indicates good prognosis or insufficient follow-up time.'}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${results.logrank_test?.significant ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{results.logrank_test?.significant ? <><CheckCircle2 className="w-5 h-5 text-primary" />Clinical Significance</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Interpretation Caution</>}</h4><p className="text-sm text-muted-foreground">{results.logrank_test?.significant ? 'Statistical significance suggests real survival difference between groups. Consider clinical relevance, effect size, and confidence intervals when making decisions.' : results.has_groups ? 'No statistical difference doesn\'t mean groups are identical. Power may be limited by sample size. Consider hazard ratios from Cox regression for more nuanced analysis.' : 'Single-group analysis provides baseline survival estimates. Compare with historical data or literature for context.'}</p></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full survival analysis report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator /><DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Kaplan-Meier Survival Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">n = {results.n_subjects} | {results.n_events} events | {results.n_groups} group{results.n_groups > 1 ? 's' : ''} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            {results.logrank_test && (
                                <Card>
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Log-Rank Test</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.logrank_test.test_statistic.toFixed(2)}</p><p className="text-sm text-muted-foreground">Test Statistic</p></div>
                                            <div className="text-center p-4 bg-muted/50 rounded-lg"><p className={`text-2xl font-bold ${results.logrank_test.significant ? 'text-primary' : 'text-muted-foreground'}`}>{results.logrank_test.p_value < 0.001 ? '<0.001' : results.logrank_test.p_value.toFixed(4)}</p><p className="text-sm text-muted-foreground">p-value</p></div>
                                            <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.logrank_test.degrees_of_freedom}</p><p className="text-sm text-muted-foreground">df</p></div>
                                            <div className="text-center p-4 bg-muted/50 rounded-lg"><p className={`text-2xl font-bold ${results.logrank_test.significant ? 'text-green-600' : 'text-amber-600'}`}>{results.logrank_test.significant ? 'Yes' : 'No'}</p><p className="text-sm text-muted-foreground">Significant</p></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A Kaplan-Meier survival analysis was conducted on <em>N</em> = {results.n_subjects} subjects to estimate survival functions{results.has_groups ? ` across ${results.n_groups} groups (${results.group_col})` : ''}.
                                                Of these, {results.n_events} ({results.event_rate.toFixed(1)}%) experienced the event, while {results.n_censored} ({(100 - results.event_rate).toFixed(1)}%) were censored.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {results.group_results.map(g => (
                                                    `The ${g.label} group (n=${g.n_subjects}) had ${g.n_events} events (${(g.n_events/g.n_subjects*100).toFixed(1)}%) with ${g.median_survival !== null ? `median survival of ${g.median_survival.toFixed(2)} (${results.confidence_level*100}% CI: ${g.median_ci_lower?.toFixed(2) || 'NA'} - ${g.median_ci_upper?.toFixed(2) || 'NA'})` : 'median survival not reached'}.`
                                                )).join(' ')}
                                            </p>
                                            {results.logrank_test && (
                                                <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                    A log-rank test was performed to compare survival distributions. The test yielded χ² = <span className="font-mono">{results.logrank_test.test_statistic.toFixed(2)}</span> (df = {results.logrank_test.degrees_of_freedom}), 
                                                    p = <span className="font-mono">{results.logrank_test.p_value < 0.001 ? '<0.001' : results.logrank_test.p_value.toFixed(4)}</span>, 
                                                    indicating {results.logrank_test.significant ? 'a statistically significant difference' : 'no statistically significant difference'} in survival between groups (α = 0.05).
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="km" className="w-full"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="km">Survival Curves</TabsTrigger><TabsTrigger value="hazard">Cumulative Hazard</TabsTrigger><TabsTrigger value="table">Survival Table</TabsTrigger></TabsList><TabsContent value="km" className="mt-4">{results.km_plot ? <Image src={`data:image/png;base64,${results.km_plot}`} alt="KM Curves" width={900} height={600} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="hazard" className="mt-4">{results.hazard_plot ? <Image src={`data:image/png;base64,${results.hazard_plot}`} alt="Hazard" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="table" className="mt-4">{results.survival_table_plot ? <Image src={`data:image/png;base64,${results.survival_table_plot}`} alt="Survival Table" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Group Summary</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Group</TableHead><TableHead className="text-right">Subjects</TableHead><TableHead className="text-right">Events</TableHead><TableHead className="text-right">Censored</TableHead><TableHead className="text-right">Event Rate</TableHead><TableHead className="text-right">Median Survival</TableHead><TableHead className="text-right">{(results.confidence_level*100).toFixed(0)}% CI</TableHead></TableRow></TableHeader><TableBody>{results.group_results.map((g, i) => (<TableRow key={i}><TableCell className="font-medium">{g.label}</TableCell><TableCell className="text-right">{g.n_subjects}</TableCell><TableCell className="text-right">{g.n_events}</TableCell><TableCell className="text-right">{g.n_censored}</TableCell><TableCell className="text-right font-mono">{(g.n_events/g.n_subjects*100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{g.median_survival?.toFixed(2) || 'NR'}</TableCell><TableCell className="text-right font-mono text-muted-foreground">{g.median_ci_lower && g.median_ci_upper ? `${g.median_ci_lower.toFixed(2)} - ${g.median_ci_upper.toFixed(2)}` : '-'}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            <Card><CardHeader><CardTitle>Analysis Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">Time Variable</p><p className="font-mono font-semibold text-sm">{timeCol}</p></div><div className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">Event Variable</p><p className="font-mono font-semibold text-sm">{eventCol}</p></div><div className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">Group Variable</p><p className="font-mono font-semibold text-sm">{groupCol || 'None'}</p></div><div className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">Confidence Level</p><p className="font-mono font-semibold text-sm">{(results.confidence_level * 100).toFixed(0)}%</p></div></div></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running Kaplan-Meier analysis...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
            <KaplanMeierGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        </div>
    );
}