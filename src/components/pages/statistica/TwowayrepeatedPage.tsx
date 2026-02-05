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
import { Loader2, HelpCircle, RefreshCw, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, Activity, FileCode, FileType, TrendingUp, Users, BarChart3, Code, Copy, FileSearch, GitBranch, Layers, Play } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '../../ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/mixed_design_anova.py?alt=media";

// Metric Definitions
const metricDefinitions: Record<string, string> = {
    "Mixed Design ANOVA": "Statistical technique combining between-subjects and within-subjects factors. Different groups are measured repeatedly over time. Also called Split-Plot ANOVA.",
    "Between-Subjects Factor": "Independent variable where different participants are assigned to different levels. Example: treatment group vs control group.",
    "Within-Subjects Factor": "Independent variable where all participants experience all levels. Example: measurements at Time 1, Time 2, Time 3.",
    "Main Effect (Between)": "Overall effect of the between-subjects factor averaged across all time points. Tests if groups differ overall.",
    "Main Effect (Within)": "Overall effect of time averaged across all groups. Tests if scores change over time.",
    "Interaction Effect": "Tests whether groups change differently over time. Non-parallel lines in profile plot indicate interaction.",
    "Time × Group Interaction": "Key effect in mixed designs. Significant interaction means treatment effects vary over time or groups respond differently.",
    "F-Statistic": "Ratio of between-condition variance to error variance. F = MS(effect)/MS(error). Larger values indicate stronger evidence of differences.",
    "P-Value": "Probability of obtaining results at least as extreme if there were truly no differences. p < .05 indicates statistical significance.",
    "Partial Eta-Squared (η²p)": "Proportion of variance explained by a factor, excluding other sources. 0.01 = small, 0.06 = medium, 0.14 = large effect.",
    "Sphericity": "Assumption that variances of differences between all pairs of repeated measures are equal. Required for valid repeated measures ANOVA.",
    "Mauchly's Test": "Tests sphericity assumption. Non-significant (p > .05) indicates sphericity is met. Very sensitive with large samples.",
    "Greenhouse-Geisser Correction": "Conservative adjustment for sphericity violations. Reduces degrees of freedom based on epsilon (ε). Recommended when ε < 0.75.",
    "Huynh-Feldt Correction": "Less conservative sphericity correction than Greenhouse-Geisser. Performs better when epsilon > 0.75.",
    "Epsilon (ε)": "Sphericity coefficient ranging from 1/(k-1) to 1.0. ε = 1.0 indicates perfect sphericity. Lower values indicate greater violations.",
    "Bonferroni Correction": "Adjusts p-values for multiple pairwise comparisons. Controls family-wise error rate but reduces power.",
    "Pairwise Comparisons": "Follow-up tests comparing means between specific pairs. Essential after significant effect to identify which conditions differ.",
    "Cohen's d": "Standardized mean difference. 0.2 = small, 0.5 = medium, 0.8 = large effect. Indicates practical significance.",
    "Profile Plot": "Line graph showing group means across time. Each line represents a different group. Reveals interaction patterns visually.",
    "Simple Effects": "Effect of one factor at specific level of another. Follow-up after significant interaction to understand conditional effects.",
    "Homogeneity of Variance": "Assumption that variances are equal across groups at each time point. Tested by Levene's test.",
    "Compound Symmetry": "Stricter assumption than sphericity requiring equal variances AND equal covariances. If met, sphericity is automatically satisfied.",
    "Power": "Probability of detecting a true effect. Mixed designs have higher power than between-subjects because they control for individual differences.",
    "Crossover Design": "Special case of mixed design where participants receive multiple treatments in sequence. Requires adequate washout period.",
    "Carryover Effect": "Influence of earlier conditions on later ones. Can occur in within-subjects portion. Addressed by counterbalancing.",
    "Order Effect": "Changes due to practice or fatigue in repeated measures. Controlled through counterbalancing condition order.",
};

// Types
interface Descriptive { mean: number; std: number; sem: number; min: number; max: number; n: number; ci_lower?: number; ci_upper?: number; }
interface Sphericity { W: number | null; chi_square?: number | null; df?: number | null; p_value: number | null; epsilon_gg: number | null; epsilon_hf: number | null; sphericity_met: boolean; message?: string; }
interface AnovaTableRow { Source: string; SS: number; df: number; MS: number; F: number; p_value: number; p_GG?: number | null; p_HF?: number | null; partial_eta_sq: number | null; epsilon?: number | null; }
interface PairwiseComparison { comparison: string; group_1?: string; group_2?: string; time_1?: string; time_2?: string; mean_1: number; mean_2: number; mean_difference: number; t_statistic: number; p_value: number; p_adjusted: number; cohens_d: number; significant_raw: boolean; significant_adjusted: boolean; comparison_type?: string; }
interface KeyInsight { title: string; description: string; }
interface Interpretation { effect_size_interpretation: string; significant_pairs_count: number; key_insights: KeyInsight[]; recommendation: string; }

// Inner results structure
interface InnerAnalysisResults {
    design_type: 'mixed';
    anova_table: AnovaTableRow[];
    sphericity: Sphericity;
    descriptives: Record<string, Record<string, Descriptive>>;
    descriptives_by_cell?: Array<{
        group: string;
        time: string;
        n: number;
        mean: number;
        std: number;
        se: number;
        min: number;
        max: number;
        ci_lower: number;
        ci_upper: number;
    }>;
    simple_effects?: Array<{
        effect_type: string;
        level: string;
        F: number;
        df1: number;
        df2: number;
        p_value: number;
        partial_eta_sq: number | null;
        significant: boolean;
    }>;
    pairwise_within: PairwiseComparison[];
    pairwise_between: PairwiseComparison[];
    interpretation: string; // Text string from backend
    n_subjects: number;
    n_dropped: number;
    n_groups: number;
    n_time_points: number;
    settings: {
        alpha: number;
        post_hoc_method: string;
        sphericity_correction: string;
    };
}

// Backend response structure
interface AnalysisResults {
    results: InnerAnalysisResults;
    plot: string | null;
    boxplot?: string | null;
    mean_plot?: string | null;
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
// Part 2: Modals & Intro Page

// Python Code Modal
const PythonCodeModal = ({ isOpen, onClose, codeUrl, title = "Python Code - Mixed Design ANOVA" }: { isOpen: boolean; onClose: () => void; codeUrl: string; title?: string; }) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { if (isOpen && !code) fetchCode(); }, [isOpen]);

    const fetchCode = async () => {
        setIsLoading(true); setError(null);
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) throw new Error(`Failed: ${response.status}`);
            setCode(await response.text());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load');
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load code' });
        } finally { setIsLoading(false); }
    };

    const handleCopy = () => { navigator.clipboard.writeText(code); toast({ title: 'Copied!' }); };
    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'mixed_design_anova.py';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />{title}</DialogTitle>
                    <DialogDescription>View, copy, or download the Python code</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 py-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading || !!error}><Copy className="mr-2 h-4 w-4" />Copy</Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading || !!error}><Download className="mr-2 h-4 w-4" />Download</Button>
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 text-slate-300">Loading...</span></div> : error ? <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg"><AlertTriangle className="h-10 w-10 text-amber-500 mb-3" /><p className="text-slate-300">{error}</p></div> : <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950"><pre className="p-4 text-sm text-slate-50"><code className="language-python">{code}</code></pre></ScrollArea>}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Mixed Design ANOVA Glossary</DialogTitle>
                <DialogDescription>Statistical terms and concepts</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">{Object.entries(metricDefinitions).map(([term, def]) => <div key={term} className="border-b pb-3"><h4 className="font-semibold">{term}</h4><p className="text-sm text-muted-foreground mt-1">{def}</p></div>)}</div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
);

const MixedDesignAnovaGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Mixed Design ANOVA Guide</h2></div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><GitBranch className="w-4 h-4" />What is Mixed Design ANOVA?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">Mixed Design ANOVA (Split-Plot) combines <strong>between-subjects</strong> and <strong>within-subjects</strong> factors. Different groups measured repeatedly over time.</p>
              <div className="bg-muted/50 rounded-lg p-4 border"><p className="text-sm"><strong>Example:</strong><br/><span className="text-muted-foreground text-xs">• Between: Treatment vs Control<br/>• Within: Week 0, 2, 4, 6<br/>• Tests: Group, Time, Group×Time</span></p></div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Layers className="w-4 h-4" />Three Effects Tested</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5"><p className="font-medium text-sm text-primary">Main Effect: Group</p><p className="text-xs text-muted-foreground mt-1">Do groups differ overall?</p></div>
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5"><p className="font-medium text-sm text-primary">Main Effect: Time</p><p className="text-xs text-muted-foreground mt-1">Do scores change over time?</p></div>
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5"><p className="font-medium text-sm text-primary">Interaction: Group × Time</p><p className="text-xs text-muted-foreground mt-1"><strong>Most important!</strong> Do groups change differently?</p></div>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Sphericity</h3>
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Within-Subjects Only</p>
                <p className="text-xs text-muted-foreground mt-1">Applies only to time factor. Mauchly p &gt; .05 = OK. If violated, use GG or HF correction.</p>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground"><strong className="text-primary">Key:</strong> Mixed Design = groups + time. Check sphericity. Interaction is most interesting.</p>
            </div>
          </div>
        </div>
      </div>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const mixedExample = exampleDatasets.find(d => d.id === 'mixed-design' || d.id === 'rm-anova');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><GitBranch className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Mixed Design ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">Analyze between-subjects groups measured repeatedly over time</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Users className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Between Factor</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Different groups (Treatment vs Control)</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Within Factor</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Repeated measurements over time</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Interaction</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Groups change differently over time</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use when comparing different groups measured multiple times.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Subject ID column</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Between-subjects grouping</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>2+ repeated measures</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />What You'll Get</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Group, Time, Interaction tests</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Sphericity test + corrections</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Pairwise comparisons</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {mixedExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(mixedExample)} size="lg"><GitBranch className="mr-2 h-5 w-5" />Load Example</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};
// Part 3: Main Component & Steps 1-3

interface MixedDesignAnovaPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function MixedDesignAnovaPage({ data, allHeaders, onLoadExample }: MixedDesignAnovaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [subjectCol, setSubjectCol] = useState<string | undefined>();
    const [betweenFactorCol, setBetweenFactorCol] = useState<string | undefined>();
    const [withinMeasureCols, setWithinMeasureCols] = useState<string[]>([]);
    const [alpha, setAlpha] = useState(0.05);
    const [postHocMethod, setPostHocMethod] = useState<'bonferroni' | 'tukey' | 'scheffe'>('bonferroni');
    const [sphericityCorrection, setSphericityCorrection] = useState<'none' | 'greenhouse-geisser' | 'huynh-feldt'>('greenhouse-geisser');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 3, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const categoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => {
            if (h === subjectCol) return false;
            const uniqueValues = [...new Set(data.map(row => row[h]))];
            return uniqueValues.length >= 2 && uniqueValues.length <= 20;
        });
    }, [data, allHeaders, subjectCol]);

    const validationChecks = useMemo(() => [
        { label: 'Subject column selected', passed: !!subjectCol, message: subjectCol ? `Selected: ${subjectCol}` : 'Select subject ID' },
        { label: 'Between-subjects factor selected', passed: !!betweenFactorCol, message: betweenFactorCol ? `Group: ${betweenFactorCol}` : 'Select grouping variable' },
        { label: 'Within-subjects measures (2+)', passed: withinMeasureCols.length >= 2, message: `${withinMeasureCols.length} time points selected` },
        { label: 'Sufficient subjects', passed: data.length >= 10, message: `n = ${data.length}` },
        { label: 'Valid alpha level', passed: alpha > 0 && alpha < 1, message: `α = ${alpha}` }
    ], [subjectCol, betweenFactorCol, withinMeasureCols, data.length, alpha]);

    const allChecksPassed = validationChecks.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setSubjectCol(allHeaders.find(h => h.toLowerCase().includes('subject') || h.toLowerCase().includes('participant') || h.toLowerCase().includes('id')));
        const potentialGroup = allHeaders.find(h => h.toLowerCase().includes('group') || h.toLowerCase().includes('condition') || h.toLowerCase().includes('treatment'));
        if (potentialGroup) setBetweenFactorCol(potentialGroup);
        const potentialMeasures = numericHeaders.filter(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('t1') || h.toLowerCase().includes('week') || h.toLowerCase().includes('day'));
        if (potentialMeasures.length >= 2) setWithinMeasureCols(potentialMeasures.slice(0, 4));
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `Mixed_ANOVA_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const csv = `MIXED DESIGN ANOVA REPORT\nGenerated,${new Date().toISOString()}\n\n`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Mixed_ANOVA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!subjectCol || !betweenFactorCol || withinMeasureCols.length < 2) { 
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required variables.' }); 
            return; 
        }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/two-way-rm-anova`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ data, subject_col: subjectCol, between_factor_col: betweenFactorCol, within_measure_cols: withinMeasureCols, alpha, post_hoc_method: postHocMethod, sphericity_correction: sphericityCorrection }) 
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json();
            console.log('🔍 Backend Response:', result); // Debug log
            if (result.error) throw new Error(result.error);
            // Store entire result which has structure: {results: {...}, plot: "base64..."}
            setAnalysisResult(result); 
            goToStep(4);
            toast({ title: 'Analysis Complete', description: 'Mixed Design ANOVA completed' });
        } catch (e: any) { 
            console.error('❌ Analysis Error:', e); // Debug log
            toast({ variant: 'destructive', title: 'Error', description: e.message }); 
        }
        finally { setIsLoading(false); }
    }, [data, subjectCol, betweenFactorCol, withinMeasureCols, alpha, postHocMethod, sphericityCorrection, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const ProgressBar = () => (
        <div className="w-full mb-8"><div className="flex items-center justify-between">
            {STEPS.map((step) => { const isCompleted = step.id < currentStep || (step.id >= 4 && !!analysisResult); const isCurrent = step.id === currentStep; const isClickable = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
                return (<button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable} className={`flex flex-col items-center gap-2 flex-1 transition-all ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>{isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}</div>
                    <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                </button>);
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <MixedDesignAnovaGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Mixed Design ANOVA</h1>
                    <p className="text-muted-foreground mt-1">Between-subjects groups × Within-subjects time</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}><BookOpen className="w-4 h-4 mr-2" />Guide</Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}><HelpCircle className="w-5 h-5"/></Button>
                </div>
            </div>
    
            <ProgressBar />
            
            <div className="min-h-[500px]">
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose subject ID, between-subjects factor, and within-subjects measures</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label>Subject ID Column</Label><Select value={subjectCol} onValueChange={setSubjectCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select subject identifier..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-3"><Label>Between-Subjects Factor (Grouping Variable)</Label><Select value={betweenFactorCol} onValueChange={setBetweenFactorCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select group column..." /></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h} ({[...new Set(data.map(row => row[h]))].length} groups)</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-3"><Label>Within-Subjects Measurements (Time Points / Conditions)</Label><ScrollArea className="h-48 border rounded-md p-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{numericHeaders.filter(h => h !== subjectCol && h !== betweenFactorCol).map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`measure-${h}`} checked={withinMeasureCols.includes(h)} onCheckedChange={(c) => setWithinMeasureCols(prev => c ? [...prev, h] : prev.filter(x => x !== h))} /><label htmlFor={`measure-${h}`} className="text-sm font-medium cursor-pointer">{h}</label></div>))}</div></ScrollArea></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Selected: <span className="font-semibold text-foreground">{withinMeasureCols.length}</span> time points | Subjects: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!subjectCol || !betweenFactorCol || withinMeasureCols.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Configure parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3 max-w-xs"><Label>Significance Level (α)</Label><Select value={alpha.toString()} onValueChange={v => setAlpha(parseFloat(v))}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0.01">0.01</SelectItem><SelectItem value="0.05">0.05</SelectItem><SelectItem value="0.10">0.10</SelectItem></SelectContent></Select></div>
                            <div className="space-y-3 max-w-xs"><Label>Sphericity Correction</Label><Select value={sphericityCorrection} onValueChange={v => setSphericityCorrection(v as any)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="greenhouse-geisser">Greenhouse-Geisser</SelectItem><SelectItem value="huynh-feldt">Huynh-Feldt</SelectItem></SelectContent></Select></div>
                            <div className="space-y-3 max-w-xs"><Label>Post-hoc Method</Label><Select value={postHocMethod} onValueChange={v => setPostHocMethod(v as any)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bonferroni">Bonferroni</SelectItem><SelectItem value="tukey">Tukey HSD</SelectItem><SelectItem value="scheffe">Scheffé</SelectItem></SelectContent></Select></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6"><div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div></div>))}</div></CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Play className="mr-2 h-4 w-4" />Run Analysis</>}</Button></CardFooter>
                    </Card>
                )}
// Part 4: Steps 4-6 (Results)

                {/* Step 4: Summary */}
                {currentStep === 4 && analysisResult && (() => {
                    // Extract results from backend response structure: {results: {...}, plot: "..."}
                    const results: InnerAnalysisResults = analysisResult.results || (analysisResult as any);
                    const plot = analysisResult.plot;
                    
                    console.log('📊 Step 4 - Plot available:', !!plot, plot ? `(${plot.substring(0, 50)}...)` : 'NO PLOT');
                    console.log('📋 Step 4 - Results structure:', Object.keys(results));
                    
                    // Safety check
                    if (!results.anova_table || !Array.isArray(results.anova_table)) {
                        return (
                            <Card className="border-0 shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 text-amber-600">
                                        <AlertTriangle className="w-6 h-6" />
                                        <div>
                                            <p className="font-semibold">Invalid Analysis Result</p>
                                            <p className="text-sm text-muted-foreground mt-1">The analysis result is missing ANOVA table data. Please try running the analysis again.</p>
                                        </div>
                                    </div>
                                    <pre className="mt-4 p-3 bg-muted rounded text-xs overflow-auto">
                                        {JSON.stringify(analysisResult, null, 2)}
                                    </pre>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="ghost" onClick={() => goToStep(3)}>
                                        <ChevronLeft className="mr-2 w-4 h-4" />Back to Validation
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    }

                    const groupEffect = results.anova_table.find((r: AnovaTableRow) => r.Source.toLowerCase().includes('between') || r.Source.toLowerCase().includes('group'));
                    const timeEffect = results.anova_table.find((r: AnovaTableRow) => r.Source.toLowerCase().includes('time') || r.Source.toLowerCase().includes('within'));
                    const interactionEffect = results.anova_table.find((r: AnovaTableRow) => r.Source.toLowerCase().includes('interaction') || r.Source.includes('×'));
                    const sigInteraction = interactionEffect && interactionEffect.p_value < alpha;
                    const sigGroup = groupEffect && groupEffect.p_value < alpha;
                    const sigTime = timeEffect && timeEffect.p_value < alpha;
                    
                    // Effect size for interaction (most important)
                    const effectSize = interactionEffect?.partial_eta_sq ?? 0;
                    const effectLabel = effectSize >= 0.14 ? 'Large' : effectSize >= 0.06 ? 'Medium' : effectSize >= 0.01 ? 'Small' : 'Negligible';
                    const isGood = sigInteraction && effectSize >= 0.06;
                    const interactionP = interactionEffect?.p_value ?? 1;
                    const pPct = (interactionP * 100).toFixed(1);
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
                                    <div><CardTitle>Result Summary</CardTitle><CardDescription>Mixed design analysis of {withinMeasureCols.length} time points</CardDescription></div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>Interaction (Group × Time):</strong> {sigInteraction 
                                                    ? 'Significant! Groups change differently over time. This is the most interesting finding.' 
                                                    : 'Not significant. Groups change similarly over time — parallel trajectories.'}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${sigGroup ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>Main Effect (Group):</strong> {sigGroup 
                                                    ? 'Significant. Groups differ overall across all time points.' 
                                                    : 'Not significant. No overall group difference.'}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${sigTime ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>Main Effect (Time):</strong> {sigTime 
                                                    ? 'Significant. Scores change across time points (averaged over groups).' 
                                                    : 'Not significant. Measurements remain stable over time.'}
                                            </p>
                                        </div>
                                        {interactionEffect && (
                                            <div className="flex items-start gap-3">
                                                <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                                <p className="text-sm">
                                                    <strong>Effect size (Interaction):</strong> partial η² = {effectSize.toFixed(3)} ({effectLabel} effect). 
                                                    {effectSize >= 0.14 ? ' Large practical significance!' : effectSize >= 0.06 ? ' Moderate practical importance.' : ' Limited practical impact.'}
                                                </p>
                                            </div>
                                        )}
                                        {!results.sphericity.sphericity_met && (
                                            <div className="flex items-start gap-3">
                                                <span className="font-bold text-amber-600">•</span>
                                                <p className="text-sm">Sphericity violated — Greenhouse-Geisser correction applied (ε = {results.sphericity.epsilon_gg?.toFixed(3) ?? 'N/A'})</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Line */}
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">
                                                {isGood 
                                                    ? "Groups Respond Differently Over Time!" 
                                                    : sigInteraction 
                                                        ? "Interaction Found but Small Effect" 
                                                        : sigGroup || sigTime 
                                                            ? "Main Effects Only" 
                                                            : "No Significant Effects"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? `The interaction effect is both statistically significant and practically meaningful. Treatment effects vary across time — groups show different trajectories.`
                                                    : sigInteraction 
                                                        ? `Statistical significance found but effect size is small (η² = ${effectSize.toFixed(3)}). Consider practical importance.`
                                                        : sigGroup && sigTime 
                                                            ? 'Both main effects are significant, but groups change in parallel (no interaction). Groups maintain constant differences over time.'
                                                            : sigGroup 
                                                                ? 'Only group differences found. Groups differ but remain stable over time.'
                                                                : sigTime 
                                                                    ? 'Only time effect found. All groups change similarly over time.'
                                                                    : 'No significant differences detected across groups or time.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Summary */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {interactionEffect && (
                                            <p>• <strong>Interaction (Group×Time):</strong> F({interactionEffect.df}, {results.n_subjects}) = {interactionEffect.F.toFixed(2)}, p = {interactionP < 0.001 ? '< .001' : interactionP.toFixed(3)}, η²p = {effectSize.toFixed(3)} — 
                                            {sigInteraction ? ` Only ${pPct}% chance by random variation. This is THE key finding.` : ` ${pPct}% chance by chance. Groups change in parallel.`}</p>
                                        )}
                                        {groupEffect && (
                                            <p>• <strong>Group (Between):</strong> F({groupEffect.df}, {results.n_subjects}) = {groupEffect.F.toFixed(2)}, p = {groupEffect.p_value < 0.001 ? '< .001' : groupEffect.p_value.toFixed(3)}, η²p = {groupEffect.partial_eta_sq?.toFixed(3) ?? 'N/A'} — 
                                            {sigGroup ? 'Groups differ overall.' : 'No overall group difference.'}</p>
                                        )}
                                        {timeEffect && (
                                            <p>• <strong>Time (Within):</strong> F({timeEffect.df}, {results.n_subjects}) = {timeEffect.F.toFixed(2)}, p = {timeEffect.p_value < 0.001 ? '< .001' : timeEffect.p_value.toFixed(3)}, η²p = {timeEffect.partial_eta_sq?.toFixed(3) ?? 'N/A'} — 
                                            {sigTime ? 'Changes occur over time.' : 'Stable across time.'}</p>
                                        )}
                                    </div>
                                </div>

                                

                                {/* Star Rating */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Interaction Strength:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = effectSize >= 0.14 ? 5 : effectSize >= 0.10 ? 4 : effectSize >= 0.06 ? 3 : effectSize >= 0.01 ? 2 : 1;
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
                {currentStep === 5 && analysisResult && (() => {
                    const results: InnerAnalysisResults = analysisResult.results || (analysisResult as any);
                    
                    return (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding mixed design ANOVA</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div><h4 className="font-semibold mb-1">What is Mixed Design ANOVA?</h4><p className="text-sm text-muted-foreground">Combines between-subjects (different groups) and within-subjects (repeated measures) factors. Tests three effects: Group, Time, and Group×Time interaction.</p></div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div><h4 className="font-semibold mb-1">Three F-tests</h4><p className="text-sm text-muted-foreground">Between-subjects (Group): Do groups differ overall? Within-subjects (Time): Do scores change over time? Interaction (Group×Time): Do groups change differently?</p></div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div><h4 className="font-semibold mb-1">Sphericity</h4><p className="text-sm text-muted-foreground">{results.sphericity.sphericity_met ? "Mauchly's test indicates sphericity is assumed for the within-subjects factor." : `Sphericity violated (p = ${results.sphericity.p_value?.toFixed(3) ?? 'N/A'}). Applied Greenhouse-Geisser correction (ε = ${results.sphericity.epsilon_gg?.toFixed(3) ?? 'N/A'}).`}</p></div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div><h4 className="font-semibold mb-1">Pairwise Comparisons</h4><p className="text-sm text-muted-foreground">Within-subjects: Paired t-tests compare time points. Between-subjects: Independent t-tests compare groups at each time. Bonferroni corrected for multiple comparisons.</p></div>
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4>
                                <p className="text-sm text-muted-foreground">A mixed design ANOVA was conducted with {results.n_subjects} subjects across {withinMeasureCols.length} time points. The analysis tested group differences, time effects, and the group×time interaction to determine if groups change differently over time.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                    );
                })()}

                {/* Step 6: Statistics */}
                {currentStep === 6 && analysisResult && (() => {
                    const results: InnerAnalysisResults = analysisResult.results || (analysisResult as any);
                    const plot = analysisResult.plot;
                    const boxplot = analysisResult.boxplot;
                    const meanPlot = analysisResult.mean_plot;
                    
                    // Get key effects
                    const groupEffect = results.anova_table.find((r: AnovaTableRow) => r.Source.toLowerCase().includes('between') || r.Source.toLowerCase().includes('group'));
                    const timeEffect = results.anova_table.find((r: AnovaTableRow) => r.Source.toLowerCase().includes('time') || r.Source.toLowerCase().includes('within'));
                    const interactionEffect = results.anova_table.find((r: AnovaTableRow) => r.Source.toLowerCase().includes('interaction') || r.Source.includes('×'));
                    const sigInteraction = interactionEffect && interactionEffect.p_value < alpha;
                    const effectSize = interactionEffect?.partial_eta_sq ?? 0;
                    const effectLabel = effectSize >= 0.14 ? 'Large' : effectSize >= 0.06 ? 'Medium' : effectSize >= 0.01 ? 'Small' : 'Negligible';
                    const interactionP = interactionEffect?.p_value ?? 1;
                    const interactionF = interactionEffect?.F ?? 0;
                    const interactionDf = interactionEffect?.df ?? 0;
                    
                    const handleDownloadWord = () => {
                        const content = `Mixed Design ANOVA Report\n${new Date().toLocaleString()}\n\n`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'mixed_anova_report.doc'; a.click();
                        URL.revokeObjectURL(url);
                    };
                    
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full ANOVA report</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadWord}><FileType className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Mixed Design ANOVA Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">{withinMeasureCols.join(' → ')} | n = {results.n_subjects} | {new Date().toLocaleDateString()}</p>
                            </div>
                            
                            {/* Summary Cards - 4 Cards like Repeated Measures */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">F-statistic (Interaction)</p>
                                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{interactionF.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">df = {interactionDf}, {results.n_subjects}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">p-value</p>
                                                <Target className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className={`text-2xl font-semibold ${!sigInteraction ? 'text-amber-600' : ''}`}>
                                                {interactionP < 0.001 ? '< .001' : interactionP.toFixed(4)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{sigInteraction ? 'Significant' : 'Not Significant'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Effect Size</p>
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{effectSize.toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">Partial η² ({effectLabel})</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{results.n_subjects}</p>
                                            <p className="text-xs text-muted-foreground">× {withinMeasureCols.length} time points</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Analysis Card - APA Style */}
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
                                                A mixed design ANOVA was conducted to examine the interaction between group ({betweenFactorCol}) and time ({withinMeasureCols.join(', ')}) across <em>N</em> = {results.n_subjects} participants in {results.n_groups} groups measured at {results.n_time_points} time points.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                Mauchly's test {results.sphericity.sphericity_met 
                                                    ? 'indicated that the assumption of sphericity had been met for the within-subjects factor' 
                                                    : `indicated that the assumption of sphericity had been violated for the within-subjects factor, χ²(${results.sphericity.df ?? 0}) = ${results.sphericity.chi_square?.toFixed(2) ?? 'N/A'}, p ${results.sphericity.p_value !== null && results.sphericity.p_value < 0.001 ? '< .001' : `= ${results.sphericity.p_value?.toFixed(3) ?? 'N/A'}`}; therefore, Greenhouse-Geisser corrected results are reported (ε = ${results.sphericity.epsilon_gg?.toFixed(3) ?? 'N/A'})`}.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The results {sigInteraction ? 'revealed a statistically significant' : 'did not reveal a statistically significant'} group × time interaction effect, 
                                                <em> F</em>({interactionDf}, {results.n_subjects}) = {interactionF.toFixed(2)}, 
                                                <em> p</em> {interactionP < 0.001 ? '< .001' : `= ${interactionP.toFixed(3)}`}, 
                                                partial η² = {effectSize.toFixed(3)}, representing a {effectLabel.toLowerCase()} effect size.
                                            </p>
                                            {sigInteraction && (
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    This significant interaction indicates that the groups changed differently over time — the trajectories were not parallel.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Effect Sizes Comparison Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Effect Sizes Comparison</CardTitle>
                                    <CardDescription>All effects at a glance</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Effect</TableHead>
                                                <TableHead className="text-right">F</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-right">η²p</TableHead>
                                                <TableHead className="text-right">Interpretation</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {interactionEffect && (
                                                <TableRow className={interactionEffect.p_value < alpha ? 'bg-primary/5' : ''}>
                                                    <TableCell className="font-medium">Group × Time (Interaction)</TableCell>
                                                    <TableCell className="text-right font-mono">{interactionEffect.F.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        <span className={interactionEffect.p_value < alpha ? 'text-primary font-semibold' : ''}>
                                                            {interactionEffect.p_value < 0.001 ? '< .001' : interactionEffect.p_value.toFixed(3)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{(interactionEffect.partial_eta_sq ?? 0).toFixed(3)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={interactionEffect.p_value < alpha ? "default" : "outline"}>
                                                            {(interactionEffect.partial_eta_sq ?? 0) >= 0.14 ? 'Large' : (interactionEffect.partial_eta_sq ?? 0) >= 0.06 ? 'Medium' : (interactionEffect.partial_eta_sq ?? 0) >= 0.01 ? 'Small' : 'Negligible'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {groupEffect && (
                                                <TableRow className={groupEffect.p_value < alpha ? 'bg-primary/5' : ''}>
                                                    <TableCell className="font-medium">Group (Between)</TableCell>
                                                    <TableCell className="text-right font-mono">{groupEffect.F.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        <span className={groupEffect.p_value < alpha ? 'text-primary font-semibold' : ''}>
                                                            {groupEffect.p_value < 0.001 ? '< .001' : groupEffect.p_value.toFixed(3)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{(groupEffect.partial_eta_sq ?? 0).toFixed(3)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={groupEffect.p_value < alpha ? "default" : "outline"}>
                                                            {(groupEffect.partial_eta_sq ?? 0) >= 0.14 ? 'Large' : (groupEffect.partial_eta_sq ?? 0) >= 0.06 ? 'Medium' : (groupEffect.partial_eta_sq ?? 0) >= 0.01 ? 'Small' : 'Negligible'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {timeEffect && (
                                                <TableRow className={timeEffect.p_value < alpha ? 'bg-primary/5' : ''}>
                                                    <TableCell className="font-medium">Time (Within)</TableCell>
                                                    <TableCell className="text-right font-mono">{timeEffect.F.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        <span className={timeEffect.p_value < alpha ? 'text-primary font-semibold' : ''}>
                                                            {timeEffect.p_value < 0.001 ? '< .001' : timeEffect.p_value.toFixed(3)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{(timeEffect.partial_eta_sq ?? 0).toFixed(3)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={timeEffect.p_value < alpha ? "default" : "outline"}>
                                                            {(timeEffect.partial_eta_sq ?? 0) >= 0.14 ? 'Large' : (timeEffect.partial_eta_sq ?? 0) >= 0.06 ? 'Medium' : (timeEffect.partial_eta_sq ?? 0) >= 0.01 ? 'Small' : 'Negligible'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* ANOVA Summary Table */}
                            <Card>
                                <CardHeader><CardTitle>ANOVA Summary Table</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Source</TableHead>
                                                <TableHead className="text-right">SS</TableHead>
                                                <TableHead className="text-right">df</TableHead>
                                                <TableHead className="text-right">MS</TableHead>
                                                <TableHead className="text-right">F</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-right">η²p</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.anova_table.map((row: AnovaTableRow, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{row.Source}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.SS.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.df}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.MS.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono font-semibold">{row.F.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono"><span className={row.p_value < alpha ? 'text-primary font-semibold' : ''}>{row.p_value < 0.001 ? '< .001' : row.p_value.toFixed(3)}</span></TableCell>
                                                    <TableCell className="text-right font-mono">{row.partial_eta_sq?.toFixed(3) ?? '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Simple Effects Tests */}
                            {sigInteraction && results.simple_effects && results.simple_effects.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Simple Effects Tests</CardTitle>
                                        <CardDescription>Follow-up analysis for significant interaction</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-800">
                                            <p className="text-sm text-muted-foreground">
                                                <strong className="text-blue-700 dark:text-blue-400">What are Simple Effects?</strong><br/>
                                                Since the interaction is significant, we examine: (1) Time effect within each group separately, (2) Group differences at each time point.
                                            </p>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Effect</TableHead>
                                                    <TableHead>Level</TableHead>
                                                    <TableHead className="text-right">F</TableHead>
                                                    <TableHead className="text-right">df</TableHead>
                                                    <TableHead className="text-right">p</TableHead>
                                                    <TableHead className="text-right">η²p</TableHead>
                                                    <TableHead className="text-center">Result</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.simple_effects.map((effect: any, idx: number) => (
                                                    <TableRow key={idx} className={effect.significant ? 'bg-primary/5' : ''}>
                                                        <TableCell className="font-medium">{effect.effect_type}</TableCell>
                                                        <TableCell className="font-mono">{effect.level}</TableCell>
                                                        <TableCell className="text-right font-mono">{effect.F.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs">{effect.df1}, {effect.df2}</TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            <span className={effect.significant ? 'text-primary font-semibold' : ''}>
                                                                {effect.p_value < 0.001 ? '< .001' : effect.p_value.toFixed(3)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">{effect.partial_eta_sq?.toFixed(3) ?? '-'}</TableCell>
                                                        <TableCell className="text-center">
                                                            {effect.significant ? (
                                                                <Badge variant="default">Significant</Badge>
                                                            ) : (
                                                                <Badge variant="outline">n.s.</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <p className="text-xs text-muted-foreground mt-3">
                                            n.s. = not significant. Simple effects help identify which groups change over time and where groups differ.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Sphericity Test */}
                            <Card>
                                <CardHeader><CardTitle>Sphericity Test (Mauchly)</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>W</TableHead>
                                                <TableHead className="text-right">χ²</TableHead>
                                                <TableHead className="text-right">df</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-right">ε (GG)</TableHead>
                                                <TableHead className="text-right">ε (HF)</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-mono">{results.sphericity.W?.toFixed(3) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.chi_square?.toFixed(2) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.df ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono"><span className={!results.sphericity.sphericity_met ? 'text-amber-600 font-semibold' : ''}>{results.sphericity.p_value !== null ? (results.sphericity.p_value < 0.001 ? '< .001' : results.sphericity.p_value.toFixed(3)) : 'N/A'}</span></TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.epsilon_gg?.toFixed(3) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.epsilon_hf?.toFixed(3) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center">{results.sphericity.sphericity_met ? <Badge variant="outline" className="bg-primary/10 text-primary">Assumed</Badge> : <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Violated</Badge>}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <p className="text-sm text-muted-foreground mt-3">{results.sphericity.message}</p>
                                </CardContent>
                            </Card>

                            {/* Descriptive Statistics by Group × Time */}
                            {results.descriptives_by_cell && results.descriptives_by_cell.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Descriptive Statistics by Group × Time</CardTitle>
                                        <CardDescription>Cell means and variability</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Group</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead className="text-right">n</TableHead>
                                                    <TableHead className="text-right">Mean</TableHead>
                                                    <TableHead className="text-right">SD</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                    <TableHead className="text-right">95% CI</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.descriptives_by_cell.map((cell: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{cell.group}</TableCell>
                                                        <TableCell className="font-mono">{cell.time}</TableCell>
                                                        <TableCell className="text-right font-mono">{cell.n}</TableCell>
                                                        <TableCell className="text-right font-mono font-semibold">{cell.mean.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{cell.std.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{cell.se.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            [{cell.ci_lower.toFixed(2)}, {cell.ci_upper.toFixed(2)}]
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <p className="text-xs text-muted-foreground mt-3">
                                            Each cell represents a unique combination of group and time point. CI = 95% Confidence Interval.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Visualizations */}
                            <Card>
                                <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                                <CardContent>
                                    <Tabs defaultValue="profile" className="w-full">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="profile">Profile Plot</TabsTrigger>
                                            <TabsTrigger value="boxplot">Box Plot</TabsTrigger>
                                            <TabsTrigger value="means">Mean Comparison</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="profile" className="mt-4">
                                            {plot ? (
                                                <Image src={plot} alt="Profile Plot" width={800} height={500} className="w-full rounded-md border" />
                                            ) : (
                                                <p className="text-center text-muted-foreground py-8">No profile plot available</p>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="boxplot" className="mt-4">
                                            {boxplot ? (
                                                <Image src={boxplot} alt="Box Plot" width={800} height={500} className="w-full rounded-md border" />
                                            ) : (
                                                <p className="text-center text-muted-foreground py-8">No box plot available</p>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="means" className="mt-4">
                                            {meanPlot ? (
                                                <Image src={meanPlot} alt="Mean Comparison" width={800} height={500} className="w-full rounded-md border" />
                                            ) : (
                                                <p className="text-center text-muted-foreground py-8">No mean plot available</p>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running mixed design ANOVA...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
        </div>
    );
}
