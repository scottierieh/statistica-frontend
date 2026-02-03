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
import { Loader2, HelpCircle, RefreshCw, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, Activity, FileCode, FileType, TrendingUp, Users, BarChart3, Code, Copy, FileSearch } from 'lucide-react';
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

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/repeated_measures_anova.py?alt=media";


const metricDefinitions: Record<string, string> = {
    "Repeated Measures ANOVA": "Tests whether means differ across multiple measurements of the same subjects. Controls for individual differences by treating each subject as their own control.",
    "Within-Subjects Design": "Same participants measured under all conditions. More powerful than between-subjects as it removes individual differences from error term.",
    "F-Statistic": "Ratio of between-condition variance to error variance. F = MS(treatment)/MS(error). Larger values indicate stronger evidence of differences between conditions.",
    "P-Value": "Probability of obtaining results at least as extreme if there were truly no differences. p < .05 indicates statistical significance at 95% confidence level.",
    "Partial Eta-Squared (η²p)": "Proportion of variance in DV explained by IV, excluding other sources. 0.01 = small, 0.06 = medium, 0.14 = large effect. Preferred over eta-squared for repeated measures.",
    "Generalized Eta-Squared (η²G)": "Effect size that's comparable across different study designs. More conservative than partial eta-squared. Better for comparing effects across studies.",
    "Omega-Squared (ω²)": "Unbiased effect size estimate that accounts for sample size. More conservative than eta-squared. Provides population-level effect size estimate.",
    "Sphericity": "Assumption that variances of differences between all pairs of repeated measures are equal. Required for valid F-test in repeated measures ANOVA.",
    "Mauchly's Test": "Tests sphericity assumption. Non-significant (p > .05) indicates sphericity is met. Very sensitive with large samples - even minor violations can be detected.",
    "Greenhouse-Geisser Correction": "Conservative adjustment for sphericity violations. Reduces degrees of freedom based on epsilon (ε). Recommended when ε < 0.75 or when in doubt.",
    "Huynh-Feldt Correction": "Less conservative sphericity correction than Greenhouse-Geisser. Performs better when epsilon > 0.75 and sample size is adequate. Can overcorrect with small samples.",
    "Epsilon (ε)": "Sphericity coefficient ranging from 1/(k-1) to 1.0, where k = number of levels. ε = 1.0 indicates perfect sphericity. Lower values indicate greater violations.",
    "Compound Symmetry": "Stricter assumption than sphericity requiring equal variances AND equal covariances. If met, sphericity is automatically satisfied. Tested by Mauchly's test.",
    "Bonferroni Correction": "Adjusts p-values for multiple pairwise comparisons by multiplying by number of tests. Controls family-wise error rate but reduces power.",
    "Pairwise Comparisons": "Follow-up tests comparing means between specific pairs of conditions. Essential after significant omnibus test to identify which conditions differ.",
    "Cohen's d": "Standardized mean difference between two conditions. 0.2 = small, 0.5 = medium, 0.8 = large effect. Unaffected by sample size, indicates practical significance.",
    "Degrees of Freedom (df)": "Number of independent values free to vary. df(treatment) = k-1, df(error) = (n-1)(k-1), where n = subjects, k = conditions.",
    "Mean Square (MS)": "Average squared deviation. MS = SS/df. MS(treatment) measures between-condition variance, MS(error) measures within-subject error variance.",
    "Sum of Squares (SS)": "Total squared deviations from mean. SS(treatment) = variance due to conditions, SS(error) = unexplained variance, SS(total) = SS(treatment) + SS(error).",
    "Error Term": "Variance not explained by conditions. In repeated measures, captures subject-by-condition interaction. Smaller error = greater statistical power.",
    "Power": "Probability of detecting a true effect. Repeated measures designs have higher power than between-subjects because they control for individual differences.",
    "Effect": "Systematic influence of independent variable on dependent variable. Main effect tests overall differences across conditions in repeated measures.",
    "Grand Mean": "Overall average across all subjects and conditions. Used as reference point for calculating sum of squares in ANOVA decomposition.",
    "Profile Plot": "Line graph showing mean scores for each condition. Each line represents the same subjects measured repeatedly. Visualizes trends over conditions.",
    "Carryover Effect": "Influence of earlier conditions on later ones. Can occur when insufficient time between measurements. Addressed by counterbalancing or washout periods.",
    "Order Effect": "Changes in performance due to practice, fatigue, or learning. Controlled through counterbalancing - varying order of conditions across subjects.",
    "Counterbalancing": "Systematically varying condition order across subjects to control for order effects. Latin square designs ensure each condition appears in each position equally.",
    "Assumption of Normality": "Data should be normally distributed within each condition. Shapiro-Wilk or Q-Q plots assess normality. ANOVA is robust to violations with n > 30.",
    "Type I Error": "False positive - concluding conditions differ when they don't. Controlled by alpha level (typically .05). Multiple comparisons increase risk.",
    "Type II Error": "False negative - failing to detect real differences. Related to statistical power. Repeated measures designs reduce Type II error risk.",
    "Family-Wise Error Rate": "Probability of at least one Type I error across all comparisons. Bonferroni correction controls this rate at desired alpha level.",
    "Crossover Design": "All subjects receive all treatments in sequence. Common in clinical trials. Requires adequate washout period between treatments.",
    "Baseline Measurement": "Initial measurement before manipulation. Can serve as covariate to increase precision by accounting for pre-existing individual differences."
};


// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - Repeated Measures ANOVA"
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
    title?: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen]);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) throw new Error(`Failed to fetch code: ${response.status}`);
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Python code' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'repeated_measures_anova.py';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!', description: 'Python file saved' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        View, copy, or download the Python code used for this analysis.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 py-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading || !!error}>
                        <Copy className="mr-2 h-4 w-4" />Copy Code
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading || !!error}>
                        <Download className="mr-2 h-4 w-4" />Download .py
                    </Button>
                    {error && (
                        <Button variant="outline" size="sm" onClick={fetchCode}>
                            <Loader2 className="mr-2 h-4 w-4" />Retry
                        </Button>
                    )}
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-3 text-slate-300">Loading code...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center">
                            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                            <p className="text-slate-300 mb-2">Failed to load code</p>
                            <p className="text-slate-500 text-sm">{error}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950">
                            <pre className="p-4 text-sm text-slate-50 overflow-x-auto">
                                <code className="language-python">{code}</code>
                            </pre>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface Descriptive { mean: number; std: number; sem: number; min: number; max: number; n: number; }
interface Sphericity { w_statistic: number | null; chi_square?: number | null; df?: number | null; p_value: number | null; epsilon_greenhouse_geisser: number; epsilon_huynh_feldt: number; sphericity_assumed: boolean; message: string; }
interface AnovaResult { ss_treatment: number; ss_error: number; ss_between_subjects: number; ss_total: number; df_treatment: number; df_error: number; df_total: number; ms_treatment: number; ms_error: number; f_statistic: number; p_value: number; p_value_greenhouse_geisser?: number; p_value_huynh_feldt?: number; partial_eta_squared: number; generalized_eta_squared: number; omega_squared: number; significant: boolean; alpha: number; n_subjects: number; n_conditions: number; grand_mean: number; }
interface PairwiseComparison { comparison: string; condition_1: string; condition_2: string; mean_1: number; mean_2: number; mean_difference: number; t_statistic: number; p_value: number; p_adjusted: number; cohens_d: number; significant_raw: boolean; significant_adjusted: boolean; }
interface KeyInsight { title: string; description: string; }
interface Interpretation { effect_size_interpretation: string; significant_pairs_count: number; key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { anova_result: AnovaResult; sphericity: Sphericity; descriptives: Record<string, Descriptive>; pairwise_comparisons: PairwiseComparison[]; profile_plot: string | null; boxplot: string | null; mean_plot: string | null; pairwise_heatmap: string | null; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [{ id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' }, { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }];


// Repeated Measures ANOVA Analysis Guide Component
const RepeatedMeasuresAnovaGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Repeated Measures ANOVA Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Repeated Measures ANOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                What is Repeated Measures ANOVA?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Repeated Measures ANOVA tests whether means differ across multiple measurements of the 
                <strong> same subjects</strong>. Each participant is measured under all conditions, making 
                them their own control and increasing statistical power.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Common Use Cases:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Pre-test, post-test, follow-up designs<br/>
                    • Longitudinal studies tracking change over time<br/>
                    • Within-subject experiments (same people, different conditions)<br/>
                    • Drug efficacy studies with multiple time points
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Why Use Within-Subjects Design */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Why Within-Subjects Design?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Advantages</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>More power:</strong> Individual differences controlled</li>
                    <li>• <strong>Fewer subjects:</strong> Same people measured repeatedly</li>
                    <li>• <strong>Reduced error:</strong> Each subject is their own control</li>
                    <li>• <strong>Detect smaller effects:</strong> Less noise in the data</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Considerations</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Order effects:</strong> Practice or fatigue may influence later measurements</li>
                    <li>• <strong>Carryover effects:</strong> Earlier conditions may affect later ones</li>
                    <li>• <strong>Attrition:</strong> Losing subjects over time</li>
                    <li>• <strong>Sphericity:</strong> Special assumption must be checked</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Statistics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Key Statistics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">F-Statistic</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Formula:</strong> F = MS<sub>treatment</sub> / MS<sub>error</sub>
                    <br/>Ratio of between-condition variance to within-subject error variance.
                    <br/>Larger F = stronger evidence of condition effects.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Partial Eta-Squared (η²p) — Effect Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of variance explained by condition, excluding between-subject variance.
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&lt;0.01</p>
                      <p className="text-muted-foreground">Negligible</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.01-0.06</p>
                      <p className="text-muted-foreground">Small</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.06-0.14</p>
                      <p className="text-muted-foreground">Medium</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&gt;0.14</p>
                      <p className="text-muted-foreground">Large</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cohen&apos;s d (Pairwise Comparisons)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Standardized mean difference between two conditions.
                    <br/>0.2 = small, 0.5 = medium, 0.8 = large effect.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Critical Assumption: Sphericity */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Assumption: Sphericity
              </h3>
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">What is Sphericity?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The assumption that variances of the <strong>differences between all pairs</strong> of 
                  conditions are equal. Unique to repeated measures designs.
                </p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <p><strong>Mauchly&apos;s Test:</strong> p &gt; 0.05 = sphericity assumed</p>
                  <p><strong>If violated (p &lt; 0.05):</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• <strong>Greenhouse-Geisser (ε &lt; 0.75):</strong> Conservative correction, reduces df</li>
                    <li>• <strong>Huynh-Feldt (ε &gt; 0.75):</strong> Less conservative, better with larger ε</li>
                  </ul>
                  <p className="mt-2"><strong>Epsilon (ε):</strong> Ranges from 1/(k-1) to 1.0. ε = 1 means perfect sphericity.</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Post-hoc Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Pairwise Comparisons
              </h3>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm text-primary">Bonferroni Correction</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After significant ANOVA, pairwise t-tests identify which specific conditions differ.
                  <br/><br/>
                  <strong>Bonferroni:</strong> Multiplies p-values by number of comparisons to control 
                  family-wise error rate. Conservative but widely accepted.
                  <br/><br/>
                  <strong>Example:</strong> With 3 conditions (A, B, C), there are 3 comparisons: A-B, A-C, B-C.
                  Each p-value is multiplied by 3.
                </p>
              </div>
            </div>

            <Separator />

            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ensure complete data (same subjects, all conditions)</li>
                    <li>• Check for outliers</li>
                    <li>• Consider counterbalancing for order effects</li>
                    <li>• Aim for n ≥ 20 subjects</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA Style)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report Mauchly&apos;s test result</li>
                    <li>• Note if correction applied (GG or HF)</li>
                    <li>• <em>F</em>(df<sub>cond</sub>, df<sub>error</sub>) = X.XX, <em>p</em> = .XXX, η²p = .XX</li>
                    <li>• Report significant pairwise comparisons</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Using between-subjects ANOVA for repeated data</li>
                    <li>• Ignoring sphericity violation</li>
                    <li>• Not correcting for multiple comparisons</li>
                    <li>• Ignoring order/carryover effects</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Different subjects in each condition → One-Way ANOVA</li>
                    <li>• Only 2 time points → Paired T-Test</li>
                    <li>• Mixed design (between + within) → Mixed ANOVA</li>
                    <li>• Non-normal data, small n → Friedman test</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Repeated measures ANOVA is powerful 
                because each subject serves as their own control. Always check <strong>sphericity</strong> with 
                Mauchly&apos;s test and apply corrections if violated. Report both F-test results AND effect 
                sizes (η²p) for complete interpretation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const rmAnovaExample = exampleDatasets.find(d => d.id === 'repeated-measures' || d.id === 'rm-anova');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><RefreshCw className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Repeated Measures ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">Analyze within-subject effects across multiple time points or conditions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Longitudinal</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Track changes over time for the same subjects</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Users className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Within-Subject</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Each subject serves as their own control</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">More Power</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Reduces error variance for better detection</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use when the same subjects are measured multiple times under different conditions or time points.</p>
                        <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Subject identifier column</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>2+ measurement columns</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Continuous dependent variable</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You'll Get
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Within-subjects F-test</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Sphericity test + corrections</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Pairwise comparisons (Bonferroni)</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {rmAnovaExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(rmAnovaExample)} size="lg"><RefreshCw className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Repeated Measures ANOVA Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in repeated measures ANOVA
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold">{term}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};



interface RepeatedMeasuresAnovaPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function RepeatedMeasuresAnovaPage({ data, allHeaders, onLoadExample }: RepeatedMeasuresAnovaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [subjectCol, setSubjectCol] = useState<string | undefined>();
    const [measureCols, setMeasureCols] = useState<string[]>([]);
    const [alpha, setAlpha] = useState(0.05);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 3, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const validationChecks = useMemo(() => [
        { label: 'Subject column selected', passed: !!subjectCol, message: subjectCol ? `Selected: ${subjectCol}` : 'Please select subject ID column' },
        { label: 'Measure columns selected (2+)', passed: measureCols.length >= 2, message: measureCols.length >= 2 ? `${measureCols.length} conditions selected` : `Select at least 2 measurement columns (${measureCols.length} selected)` },
        { label: 'Sufficient subjects', passed: data.length >= 5, message: data.length >= 10 ? `${data.length} subjects (good sample)` : data.length >= 5 ? `${data.length} subjects (minimum)` : `${data.length} subjects (need 5+)` },
        { label: 'Valid alpha level', passed: alpha > 0 && alpha < 1, message: `α = ${alpha}` }
    ], [subjectCol, measureCols, data.length, alpha]);

    const allChecksPassed = validationChecks.slice(0, 2).every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setSubjectCol(allHeaders.find(h => h.toLowerCase().includes('subject') || h.toLowerCase().includes('participant') || h.toLowerCase().includes('id')));
        const potentialMeasures = numericHeaders.filter(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('t1') || h.toLowerCase().includes('t2') || h.toLowerCase().includes('pre') || h.toLowerCase().includes('post') || h.toLowerCase().includes('baseline') || h.toLowerCase().includes('week') || h.toLowerCase().includes('day') || h.toLowerCase().includes('condition'));
        if (potentialMeasures.length >= 2) setMeasureCols(potentialMeasures.slice(0, 4));
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `RM_ANOVA_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const anova = analysisResult.anova_result;
        let csv = `REPEATED MEASURES ANOVA REPORT\nGenerated,${new Date().toISOString()}\n\nANOVA RESULTS\nF-statistic,${anova.f_statistic.toFixed(3)}\np-value,${anova.p_value.toFixed(4)}\ndf (treatment),${anova.df_treatment}\ndf (error),${anova.df_error}\nPartial η²,${anova.partial_eta_squared.toFixed(3)}\nSignificant,${anova.significant ? 'Yes' : 'No'}\n\n`;
        csv += `DESCRIPTIVES\n` + Papa.unparse(Object.entries(analysisResult.descriptives).map(([col, stats]) => ({ condition: col, mean: stats.mean.toFixed(3), std: stats.std.toFixed(3), n: stats.n }))) + '\n\n';
        csv += `PAIRWISE COMPARISONS\n` + Papa.unparse(analysisResult.pairwise_comparisons.map(p => ({ comparison: p.comparison, mean_diff: p.mean_difference.toFixed(3), t: p.t_statistic.toFixed(3), p_adjusted: p.p_adjusted.toFixed(4), cohens_d: p.cohens_d.toFixed(3), significant: p.significant_adjusted ? 'Yes' : 'No' })));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `RM_ANOVA_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!subjectCol || measureCols.length < 2) { toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select subject and measure columns.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/repeated-measures-anova`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, subject_col: subjectCol, measure_cols: measureCols, alpha }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `F(${result.anova_result.df_treatment}, ${result.anova_result.df_error}) = ${result.anova_result.f_statistic.toFixed(2)}` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, subjectCol, measureCols, alpha, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

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
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen} 
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
            
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
            
            <RepeatedMeasuresAnovaGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Repeated Measures ANOVA</h1>
                    <p className="text-muted-foreground mt-1">Within-subjects analysis across conditions</p>
                </div>
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
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose subject ID and measurement columns</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label>Subject ID Column</Label><Select value={subjectCol} onValueChange={setSubjectCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select subject identifier..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-3"><Label>Measurement Columns (Time Points / Conditions)</Label><ScrollArea className="h-48 border rounded-md p-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{numericHeaders.filter(h => h !== subjectCol).map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`measure-${h}`} checked={measureCols.includes(h)} onCheckedChange={(c) => setMeasureCols(prev => c ? [...prev, h] : prev.filter(x => x !== h))} /><label htmlFor={`measure-${h}`} className="text-sm font-medium cursor-pointer">{h}</label></div>))}</div></ScrollArea></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Selected: <span className="font-semibold text-foreground">{measureCols.length}</span> conditions | Subjects: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!subjectCol || measureCols.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Configure ANOVA parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3 max-w-xs"><Label>Significance Level (α)</Label><Select value={alpha.toString()} onValueChange={v => setAlpha(parseFloat(v))}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0.01">0.01 (99% confidence)</SelectItem><SelectItem value="0.05">0.05 (95% confidence)</SelectItem><SelectItem value="0.10">0.10 (90% confidence)</SelectItem></SelectContent></Select></div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Subject ID:</strong> {subjectCol}</p><p>• <strong className="text-foreground">Conditions:</strong> {measureCols.join(', ')}</p><p>• <strong className="text-foreground">Alpha:</strong> {alpha}</p><p>• <strong className="text-foreground">Test:</strong> Within-subjects F-test</p></div></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Analysis Info</h4><p className="text-sm text-muted-foreground">Repeated measures ANOVA tests whether the means differ across conditions. It accounts for individual differences by using each subject as their own control. Includes Mauchly sphericity test and Greenhouse-Geisser correction if needed.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6"><div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div></div>))}</div></CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run ANOVA<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const anova = results.anova_result; 
                    const isSignificant = anova.significant; 
                    const effectSize = anova.partial_eta_squared;
                    const effectLabel = effectSize >= 0.14 ? 'Large' : effectSize >= 0.06 ? 'Medium' : effectSize >= 0.01 ? 'Small' : 'Negligible';
                    const isGood = isSignificant && effectSize >= 0.06;
                    const pPct = (anova.p_value * 100).toFixed(1);
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>Repeated measures analysis of {measureCols.length} conditions</CardDescription>
                                    </div>
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
                                                {isSignificant 
                                                    ? `Significant differences found across ${measureCols.length} conditions. The dependent variable changes meaningfully over time/conditions.`
                                                    : `No significant differences across ${measureCols.length} conditions. Measurements remain relatively stable.`}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                Effect size: partial η² = <strong>{effectSize.toFixed(3)}</strong> ({effectLabel} effect). 
                                                {effectSize >= 0.14 ? ' Condition explains a large portion of variance.' : effectSize >= 0.06 ? ' Moderate practical significance.' : ' Limited practical impact.'}
                                            </p>
                                        </div>
                                        {!results.sphericity.sphericity_assumed && (
                                            <div className="flex items-start gap-3">
                                                <span className="font-bold text-amber-600">•</span>
                                                <p className="text-sm">Sphericity violated — Greenhouse-Geisser correction applied (ε = {results.sphericity.epsilon_greenhouse_geisser.toFixed(3)})</p>
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
                                                {isGood ? "Significant Change Detected!" : isSignificant ? "Significant but Small Effect" : "No Significant Change"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? `Conditions have a meaningful impact. ${results.interpretation.significant_pairs_count} pairwise comparison(s) are significant.`
                                                    : isSignificant 
                                                        ? `Statistical significance found but effect size is small (η² = ${effectSize.toFixed(3)}). Consider practical importance.`
                                                        : `No statistically significant difference was found across conditions (p = ${anova.p_value.toFixed(3)} > ${alpha}).`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>F-statistic:</strong> F({anova.df_treatment}, {anova.df_error}) = {anova.f_statistic.toFixed(2)} — Ratio of between-condition variance to within-subject error. Higher F = stronger effect.</p>
                                        <p>• <strong>p-value:</strong> {anova.p_value < 0.001 ? '< 0.001' : anova.p_value.toFixed(4)} — {isSignificant 
                                            ? `Only ${pPct}% chance this occurred by random variation. Below ${alpha * 100}%, so statistically significant.`
                                            : `${pPct}% chance this occurred randomly. Above ${alpha * 100}%, so we cannot rule out chance.`}</p>
                                        <p>• <strong>Effect size (η²):</strong> {effectSize.toFixed(3)} — {effectSize >= 0.14 ? 'Above 0.14 is large.' : effectSize >= 0.06 ? '0.06-0.14 is medium.' : 'Below 0.06 is small.'} Proportion of variance explained by condition.</p>
                                    </div>
                                </div>

                                {/* Star Rating */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Effect Strength:</span>
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

                {currentStep === 5 && results && (() => {
                    const anova = results.anova_result;
                    const effectSize = anova.partial_eta_squared;
                    const effectLabel = effectSize >= 0.14 ? 'large' : effectSize >= 0.06 ? 'medium' : effectSize >= 0.01 ? 'small' : 'negligible';
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Lightbulb className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Why This Conclusion?</CardTitle>
                                        <CardDescription>Understanding repeated measures ANOVA</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What is Repeated Measures ANOVA?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Tests whether there are significant differences across multiple measurements from the <strong className="text-foreground">same subjects</strong>. 
                                                Each person is measured under all conditions, controlling for individual differences.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">The F-test Calculation</h4>
                                            <p className="text-sm text-muted-foreground">
                                                F = MS<sub>treatment</sub> / MS<sub>error</sub> = {anova.ms_treatment.toFixed(2)} / {anova.ms_error.toFixed(2)} = <strong className="text-foreground">{anova.f_statistic.toFixed(2)}</strong>. 
                                                A larger F indicates more between-condition variance relative to error.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Sphericity Assumption</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {results.sphericity.sphericity_assumed 
                                                    ? "Mauchly's test indicates sphericity is assumed — variances of differences between conditions are equal." 
                                                    : `Sphericity violated (p = ${results.sphericity.p_value?.toFixed(3)}). Applied Greenhouse-Geisser correction (ε = ${results.sphericity.epsilon_greenhouse_geisser.toFixed(3)}) to adjust degrees of freedom and p-values.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Pairwise Comparisons</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Bonferroni-corrected paired t-tests identify which specific conditions differ.
                                                {results.interpretation.significant_pairs_count > 0 
                                                    ? ` Found ${results.interpretation.significant_pairs_count} significant pairwise difference(s).` 
                                                    : ' No significant pairwise differences after correction.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Line */}
                                <div className={`rounded-xl p-5 border ${anova.significant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        A repeated measures ANOVA was conducted on {anova.n_subjects} subjects across {anova.n_conditions} conditions. 
                                        The test {anova.significant ? 'revealed a statistically significant' : 'did not reveal a statistically significant'} effect, 
                                        <em> F</em>({anova.df_treatment}, {anova.df_error}) = {anova.f_statistic.toFixed(2)}, 
                                        <em> p</em> {anova.p_value < 0.001 ? '< .001' : `= ${anova.p_value.toFixed(3)}`}, 
                                        partial η² = {effectSize.toFixed(3)} ({effectLabel} effect).
                                    </p>
                                </div>

                                {/* Effect Size Guide */}
                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />Effect Size Guide (Partial η²)
                                    </h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt; .01</p><p className="text-muted-foreground">Negligible</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">.01 - .06</p><p className="text-muted-foreground">Small</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">.06 - .14</p><p className="text-muted-foreground">Medium</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">≥ .14</p><p className="text-muted-foreground">Large</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between">
                                <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                                <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (() => {
                    const anova = results.anova_result; 
                    const isSignificant = anova.significant; 
                    const effectSize = anova.partial_eta_squared;
                    const effectLabel = effectSize >= 0.14 ? 'Large' : effectSize >= 0.06 ? 'Medium' : effectSize >= 0.01 ? 'Small' : 'Negligible';
                    
                    const handleDownloadWord = () => {
                        const content = `Repeated Measures ANOVA Report\nGenerated: ${new Date().toLocaleString()}\n\n` +
                            `SUMMARY\n${'='.repeat(50)}\nF(${anova.df_treatment}, ${anova.df_error}) = ${anova.f_statistic.toFixed(2)}, p ${anova.p_value < 0.001 ? '< .001' : `= ${anova.p_value.toFixed(3)}`}\nEffect size: partial η² = ${effectSize.toFixed(3)} (${effectLabel})\nResult: ${isSignificant ? 'Significant difference found' : 'No significant difference'}\n\n` +
                            `SPHERICITY TEST\n${'='.repeat(50)}\nMauchly W = ${results.sphericity.w_statistic?.toFixed(3) ?? 'N/A'}\nGreenhouse-Geisser ε = ${results.sphericity.epsilon_greenhouse_geisser.toFixed(3)}\nHuynh-Feldt ε = ${results.sphericity.epsilon_huynh_feldt.toFixed(3)}\n${results.sphericity.message}\n\n` +
                            `DESCRIPTIVE STATISTICS\n${'='.repeat(50)}\n${Object.entries(results.descriptives).map(([col, s]) => `${col}: M = ${s.mean.toFixed(3)}, SD = ${s.std.toFixed(3)}, n = ${s.n}`).join('\n')}\n\n` +
                            `PAIRWISE COMPARISONS (Bonferroni)\n${'='.repeat(50)}\n${results.pairwise_comparisons.map(p => `${p.comparison}: diff = ${p.mean_difference.toFixed(3)}, t = ${p.t_statistic.toFixed(2)}, p = ${p.p_adjusted < 0.001 ? '< .001' : p.p_adjusted.toFixed(3)}, d = ${p.cohens_d.toFixed(2)} ${p.significant_adjusted ? '*' : ''}`).join('\n')}\n\n` +
                            `APA SUMMARY\n${'='.repeat(50)}\nA one-way repeated measures ANOVA was conducted to examine the effect of condition on the dependent variable across N = ${anova.n_subjects} participants measured under ${anova.n_conditions} conditions (${measureCols.join(', ')}). ${results.sphericity.sphericity_assumed ? "Mauchly's test indicated that the assumption of sphericity had been met." : `Mauchly's test indicated that the assumption of sphericity had been violated; therefore, Greenhouse-Geisser corrected results are reported (ε = ${results.sphericity.epsilon_greenhouse_geisser.toFixed(3)}).`} The results ${isSignificant ? 'revealed a statistically significant' : 'did not reveal a statistically significant'} effect of condition, F(${anova.df_treatment}, ${anova.df_error}) = ${anova.f_statistic.toFixed(2)}, p ${anova.p_value < 0.001 ? '< .001' : `= ${anova.p_value.toFixed(3)}`}, partial η² = ${effectSize.toFixed(3)}, representing a ${effectLabel.toLowerCase()} effect size.`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'rm_anova_report.doc'; a.click();
                        URL.revokeObjectURL(url);
                    };
                    
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Statistical Details</h2>
                                <p className="text-sm text-muted-foreground">Full ANOVA report</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                        PNG Image
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadWord}>
                                        <FileType className="mr-2 h-4 w-4" />Word Document
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                        <Code className="mr-2 h-4 w-4" />Python Code
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Repeated Measures ANOVA Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">{measureCols.join(' → ')} | n = {anova.n_subjects} | {new Date().toLocaleDateString()}</p>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">F-statistic</p>
                                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{anova.f_statistic.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">df = {anova.df_treatment}, {anova.df_error}</p>
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
                                            <p className={`text-2xl font-semibold ${!isSignificant ? 'text-amber-600' : ''}`}>
                                                {anova.p_value < 0.001 ? '< .001' : anova.p_value.toFixed(4)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p>
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
                                            <p className="text-2xl font-semibold">{anova.n_subjects}</p>
                                            <p className="text-xs text-muted-foreground">× {anova.n_conditions} conditions</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Analysis Card - APA Format */}
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
                                                A one-way repeated measures ANOVA was conducted to examine the effect of condition on the dependent variable across <em>N</em> = {anova.n_subjects} participants measured under {anova.n_conditions} conditions ({measureCols.join(', ')}).
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                Mauchly's test {results.sphericity.sphericity_assumed 
                                                    ? 'indicated that the assumption of sphericity had been met' 
                                                    : `indicated that the assumption of sphericity had been violated, χ²(${results.sphericity.df ?? 0}) = ${results.sphericity.chi_square?.toFixed(2) ?? 'N/A'}, p ${results.sphericity.p_value !== null && results.sphericity.p_value < 0.001 ? '< .001' : `= ${results.sphericity.p_value?.toFixed(3) ?? 'N/A'}`}; therefore, Greenhouse-Geisser corrected results are reported (ε = ${results.sphericity.epsilon_greenhouse_geisser.toFixed(3)})`}.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The results {isSignificant ? 'revealed a statistically significant' : 'did not reveal a statistically significant'} effect of condition, 
                                                <em> F</em>({anova.df_treatment}, {anova.df_error}) = {anova.f_statistic.toFixed(2)}, 
                                                <em> p</em> {anova.p_value < 0.001 ? '< .001' : `= ${anova.p_value.toFixed(3)}`}, 
                                                partial η² = {effectSize.toFixed(3)}, representing a {effectLabel.toLowerCase()} effect size.
                                            </p>
                                            {isSignificant && (
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    Post-hoc pairwise comparisons using Bonferroni correction revealed {results.interpretation.significant_pairs_count} significant difference{results.interpretation.significant_pairs_count !== 1 ? 's' : ''} among conditions.
                                                </p>
                                            )}
                                        </div>
                                    </div>
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
                                                <TableHead className="text-right">η²</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Condition</TableCell>
                                                <TableCell className="text-right font-mono">{anova.ss_treatment.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{anova.df_treatment}</TableCell>
                                                <TableCell className="text-right font-mono">{anova.ms_treatment.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono font-semibold">{anova.f_statistic.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    <span className={anova.p_value < alpha ? 'text-primary font-semibold' : ''}>{anova.p_value < 0.001 ? '< .001' : anova.p_value.toFixed(3)}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{effectSize.toFixed(3)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Error</TableCell>
                                                <TableCell className="text-right font-mono">{anova.ss_error.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{anova.df_error}</TableCell>
                                                <TableCell className="text-right font-mono">{anova.ms_error.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">-</TableCell>
                                                <TableCell className="text-right font-mono">-</TableCell>
                                                <TableCell className="text-right font-mono">-</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Sphericity Test */}
                            <Card>
                                <CardHeader><CardTitle>Sphericity Test (Mauchly)</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mauchly's W</TableHead>
                                                <TableHead className="text-right">χ²</TableHead>
                                                <TableHead className="text-right">df</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">ε (GG)</TableHead>
                                                <TableHead className="text-right">ε (HF)</TableHead>
                                                <TableHead className="text-center">Sphericity</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-mono">{results.sphericity.w_statistic?.toFixed(3) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.chi_square?.toFixed(2) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.df ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    <span className={!results.sphericity.sphericity_assumed ? 'text-amber-600 font-semibold' : ''}>
                                                        {results.sphericity.p_value !== null ? (results.sphericity.p_value < 0.001 ? '< .001' : results.sphericity.p_value.toFixed(3)) : 'N/A'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.epsilon_greenhouse_geisser.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.sphericity.epsilon_huynh_feldt.toFixed(3)}</TableCell>
                                                <TableCell className="text-center">
                                                    {results.sphericity.sphericity_assumed 
                                                        ? <Badge variant="outline" className="bg-primary/10 text-primary">Assumed</Badge>
                                                        : <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Violated</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <p className="text-sm text-muted-foreground mt-3">{results.sphericity.message}</p>
                                </CardContent>
                            </Card>

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
                                            {results.profile_plot ? <Image src={`data:image/png;base64,${results.profile_plot}`} alt="Profile Plot" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No profile plot available</p>}
                                        </TabsContent>
                                        <TabsContent value="boxplot" className="mt-4">
                                            {results.boxplot ? <Image src={`data:image/png;base64,${results.boxplot}`} alt="Box Plot" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No box plot available</p>}
                                        </TabsContent>
                                        <TabsContent value="means" className="mt-4">
                                            {results.mean_plot ? <Image src={`data:image/png;base64,${results.mean_plot}`} alt="Mean Comparison" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No mean plot available</p>}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>

                            {/* Descriptive Statistics */}
                            <Card>
                                <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Condition</TableHead>
                                                <TableHead className="text-right">Mean</TableHead>
                                                <TableHead className="text-right">SD</TableHead>
                                                <TableHead className="text-right">SE</TableHead>
                                                <TableHead className="text-right">Min</TableHead>
                                                <TableHead className="text-right">Max</TableHead>
                                                <TableHead className="text-right">n</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.descriptives).map(([col, stats]) => (
                                                <TableRow key={col}>
                                                    <TableCell className="font-medium">{col}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.sem.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.min.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.max.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Pairwise Comparisons */}
                            <Card>
                                <CardHeader><CardTitle>Pairwise Comparisons (Bonferroni)</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[300px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Comparison</TableHead>
                                                    <TableHead className="text-right">Mean Diff</TableHead>
                                                    <TableHead className="text-right">t</TableHead>
                                                    <TableHead className="text-right">p (adj)</TableHead>
                                                    <TableHead className="text-right">Cohen d</TableHead>
                                                    <TableHead className="text-center">Sig.</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.pairwise_comparisons.map((comp, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-medium">{comp.comparison}</TableCell>
                                                        <TableCell className="text-right font-mono">{comp.mean_difference.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{comp.t_statistic.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            <span className={comp.significant_adjusted ? 'text-primary font-semibold' : ''}>{comp.p_adjusted < 0.001 ? '< .001' : comp.p_adjusted.toFixed(3)}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">{comp.cohens_d.toFixed(2)}</TableCell>
                                                        <TableCell className="text-center">
                                                            {comp.significant_adjusted ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="mt-4 flex justify-start">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                        </div>
                    </>
                    );
                })()}

                {isLoading && (
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Running repeated measures ANOVA...</p>
                            <Skeleton className="h-[400px] w-full" />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}