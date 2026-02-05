'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sigma, Loader2, Users, FileSearch, Settings, HelpCircle, Layers, TrendingUp, Target, BarChart, CheckCircle, AlertTriangle, BookOpen, Activity, Lightbulb, Grid3x3, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, BarChart3, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/manova.py?alt=media";


const manovaMetricDefinitions: Record<string, string> = {
    wilks_lambda: "Wilks' Lambda (Λ) ranges from 0 to 1, indicating the proportion of variance not explained by group differences. Smaller values indicate larger group differences.",
    pillai_trace: "Pillai's Trace is the most robust multivariate test statistic. It ranges from 0 to 1 and is resistant to violations of assumptions.",
    hotelling_lawley_trace: "Hotelling-Lawley Trace represents the ratio of between-group to within-group variance. Larger values indicate greater group separation.",
    roy_largest_root: "Roy's Largest Root is the most powerful but assumption-sensitive test. It detects differences along the primary dimension of separation.",
    f_statistic: "The F-statistic represents the ratio of systematic variance to error variance. Larger values indicate more significant group differences.",
    p_value: "The probability of obtaining results at least as extreme as observed, assuming the null hypothesis is true. Values below 0.05 typically indicate statistical significance.",
    eta_squared: "Eta squared (η²) measures effect size: 0.01 = small, 0.06 = medium, 0.14 = large. Represents the proportion of total variance explained by the independent variable.",
    partial_eta_squared: "Partial eta squared measures effect size after controlling for other effects. Most commonly reported effect size measure in MANOVA.",
    box_m_test: "Box's M test evaluates the homogeneity of covariance matrices across groups. A non-significant result (p > 0.001) supports the assumption.",
    levene_test: "Levene's test checks the equality of variances for each dependent variable across groups. p > 0.05 indicates homogeneity of variance.",
    multivariate_normality: "The assumption that dependent variables jointly follow a multivariate normal distribution. More stringent than univariate normality for each variable.",
    degrees_of_freedom: "Degrees of freedom (df) represent the number of independent values that can vary. MANOVA uses hypothesis df and error df.",
    manova_assumptions: "MANOVA assumptions: (1) Independent observations, (2) Multivariate normality, (3) Homogeneity of covariance matrices, (4) Linearity, (5) Absence of multicollinearity.",
    follow_up_anova: "Follow-up univariate ANOVAs are conducted when MANOVA is significant to identify which dependent variables contribute to group differences.",
    bonferroni_correction: "Bonferroni correction controls Type I error inflation from multiple comparisons. Divides the significance level by the number of tests.",
    multicollinearity: "High correlations among dependent variables. Severe multicollinearity can distort MANOVA results and reduce statistical power.",
    discriminant_function: "A linear combination of dependent variables that maximally separates groups. Achieves maximum group discrimination.",
    mahalanobis_distance: "A distance measure used to detect multivariate outliers. Accounts for correlations among variables, unlike Euclidean distance.",
    null_hypothesis: "H₀: The population mean vectors are equal across all groups. MANOVA tests whether to reject this hypothesis.",
    alternative_hypothesis: "H₁: At least one group's mean vector differs from the others. Indicates systematic group differences exist.",
    covariance_matrix: "A matrix showing variances and covariances among dependent variables. MANOVA assumes equal covariance matrices across groups.",
    dependent_variables: "The multiple outcome variables measured simultaneously in MANOVA. Should be conceptually related but not highly correlated.",
    independent_variable: "The grouping or categorical variable used to compare groups. Must have two or more levels or groups.",
    statistical_power: "The probability of correctly detecting true group differences. Higher power (typically 80%+) reduces Type II error risk.",
    type_i_error: "False positive - concluding groups differ when they actually don't. Controlled by the alpha level (typically 5%).",
    type_ii_error: "False negative - failing to detect real group differences. Related to statistical power (1 - β).",
};


interface TestStatistic {
    statistic: number;
    F: number;
    df1: number;
    df2: number;
    p_value: number;
}

interface UnivariateResult {
    f_statistic: number;
    p_value: number;
    eta_squared: number;
    omega_squared?: number;
    partial_eta_squared?: number;
    ss_between?: number;
    ss_within?: number;
    df_between?: number;
    df_within?: number;
    significant: boolean;
}

interface PosthocComparison {
    group1: string;
    group2: string;
    mean1: number;
    mean2: number;
    mean_diff: number;
    se_diff: number;
    ci_lower: number;
    ci_upper: number;
    t_statistic: number;
    df: number;
    p_value: number;
    p_corrected: number;
    cohens_d: number;
    significant_corrected: boolean;
}

interface DescriptiveStats {
    n: number;
    mean: number;
    std: number;
    se: number;
    min: number;
    max: number;
    ci_lower: number;
    ci_upper: number;
}

interface BoxsMTest {
    M: number;
    chi2: number;
    df: number;
    p_value: number;
    equal_covariances: boolean;
}

interface Assumptions {
    boxs_m: BoxsMTest | null;
    sample_size_adequate: boolean;
    min_group_size: number;
    n_per_dv_ratio: number;
}

interface ManovaResults {
    factor: string;
    groups: string[];
    n_groups: number;
    test_statistics: { pillai: TestStatistic; wilks: TestStatistic; hotelling: TestStatistic; roy: TestStatistic; };
    univariate_results: { [dv: string]: UnivariateResult };
    posthoc_results: { [dv: string]: PosthocComparison[] } | null;
    descriptives: { [dv: string]: { [group: string]: DescriptiveStats } };
    assumptions: Assumptions;
    significant: boolean;
    interpretation?: string;
    n_dropped?: number;
    n_used?: number;
    n_original?: number;
    dropped_rows?: number[];
}

interface FullAnalysisResponse {
    results: ManovaResults;
    plot: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const getEffectSizeInterpretation = (statistic: number) => {
    if (statistic >= 0.5) return 'Large';
    if (statistic >= 0.3) return 'Medium';
    if (statistic >= 0.1) return 'Small';
    return 'Negligible';
};

const getEtaInterpretation = (eta: number) => {
    if (eta >= 0.14) return 'Large';
    if (eta >= 0.06) return 'Medium';
    if (eta >= 0.01) return 'Small';
    return 'Negligible';
};

const formatPValue = (p: number | undefined) => {
    if (p === undefined || p === null) return 'N/A';
    if (p < 0.001) return '<.001';
    return p.toFixed(4);
};

// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - MANOVA"
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
            if (!response.ok) {
                throw new Error(`Failed to fetch code: ${response.status}`);
            }
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: 'Failed to load Python code' 
            });
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
        link.download = 'manova.py';
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
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopy} 
                        disabled={isLoading || !!error}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload} 
                        disabled={isLoading || !!error}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download .py
                    </Button>
                    {error && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchCode}
                        >
                            <Loader2 className="mr-2 h-4 w-4" />
                            Retry
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


const ManovaGlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        MANOVA Statistical Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in multivariate analysis of variance
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(manovaMetricDefinitions).map(([term, definition]) => (
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

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: ManovaResults }) => {
    const pillaiPValue = results.test_statistics.pillai.p_value;
    const isSignificant = pillaiPValue <= 0.05;
    const significantUnivariate = Object.values(results.univariate_results).filter(r => r.significant).length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Pillai's Trace</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.test_statistics.pillai.statistic.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(results.test_statistics.pillai.statistic)} effect</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-value (Pillai)</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${!isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>{pillaiPValue < 0.001 ? '<0.001' : pillaiPValue.toFixed(4)}</p><p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">F-Statistic</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.test_statistics.pillai.F.toFixed(3)}</p><p className="text-xs text-muted-foreground">df({results.test_statistics.pillai.df1.toFixed(0)}, {results.test_statistics.pillai.df2.toFixed(0)})</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Significant DVs</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{significantUnivariate} / {Object.keys(results.univariate_results).length}</p><p className="text-xs text-muted-foreground">Variables affected</p></div></CardContent></Card>
        </div>
    );
};

// MANOVA Analysis Guide Component
const ManovaGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">MANOVA Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is MANOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                What is MANOVA?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                MANOVA (Multivariate Analysis of Variance) tests whether groups differ across 
                <strong> multiple dependent variables simultaneously</strong>. It extends ANOVA to 
                situations with 2+ outcome variables.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Advantage:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    MANOVA accounts for correlations between DVs and controls Type I error better 
                    than running separate ANOVAs. It can detect multivariate patterns that individual 
                    ANOVAs would miss.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use MANOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use MANOVA?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Use MANOVA When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• You have <strong>2+ continuous DVs</strong> measured on same subjects</li>
                    <li>• DVs are conceptually related (measure similar construct)</li>
                    <li>• You want to control Type I error across multiple tests</li>
                    <li>• You suspect DVs are correlated</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Don&apos;t Use MANOVA When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• DVs are highly correlated (r &gt; 0.9) → multicollinearity</li>
                    <li>• DVs are completely unrelated → separate ANOVAs</li>
                    <li>• Sample size is very small (n per group &lt; DVs)</li>
                    <li>• You only have 1 dependent variable → use ANOVA</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Multivariate Test Statistics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Multivariate Test Statistics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Pillai&apos;s Trace (Recommended)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Most robust to assumption violations. Use this when:
                    <br/>• Sample sizes are unequal
                    <br/>• Covariance matrices may differ across groups
                    <br/>• You&apos;re unsure about assumptions
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Wilks&apos; Lambda</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Most commonly reported. Ranges from 0 to 1.
                    <br/>• Lower values = larger group differences
                    <br/>• Traditional choice when assumptions are met
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Hotelling-Lawley Trace</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ratio of between-group to within-group variance.
                    <br/>• More powerful when groups differ on one dimension
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Roy&apos;s Largest Root</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Most powerful but most assumption-sensitive.
                    <br/>• Only considers the first discriminant function
                    <br/>• Use with caution
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Effect Size Interpretation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Effect Size Interpretation
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Pillai&apos;s Trace Effect Size</p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&lt;0.1</p>
                      <p className="text-muted-foreground">Negligible</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.1-0.3</p>
                      <p className="text-muted-foreground">Small</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.3-0.5</p>
                      <p className="text-muted-foreground">Medium</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&gt;0.5</p>
                      <p className="text-muted-foreground">Large</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Eta-Squared (η²) for Univariate Follow-ups</p>
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
              </div>
            </div>

            <Separator />

            {/* Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                MANOVA Assumptions
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">1. Homogeneity of Covariance Matrices</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Box&apos;s M Test:</strong> p &gt; 0.001 (some use 0.05)
                    <br/>If violated: Use Pillai&apos;s Trace (most robust)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Multivariate Normality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    DVs should be jointly normally distributed within each group.
                    <br/>MANOVA is fairly robust with n &gt; 20 per group.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Independence</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Observations must be independent (different subjects in each group).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">4. Adequate Sample Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    n per group &gt; number of DVs.
                    <br/>Recommended: at least 20 observations per group.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">5. No Severe Multicollinearity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    DVs should not be too highly correlated (r &lt; 0.9).
                    <br/>Highly correlated DVs provide redundant information.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpretation Steps */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                How to Interpret MANOVA Results
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium text-sm">Check Multivariate Effect (Pillai&apos;s)</p>
                    <p className="text-xs text-muted-foreground">If p &lt; 0.05: Groups differ overall across DVs. Proceed to step 2.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium text-sm">Examine Univariate Follow-ups</p>
                    <p className="text-xs text-muted-foreground">Check which individual DVs show significant group differences.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium text-sm">Review Post-hoc Comparisons</p>
                    <p className="text-xs text-muted-foreground">For significant DVs, identify which specific groups differ.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium text-sm">Report Effect Sizes</p>
                    <p className="text-xs text-muted-foreground">Always report η² alongside p-values for practical significance.</p>
                  </div>
                </div>
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
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA Style)</p>
                  <p className="text-xs text-muted-foreground">
                    Report: Pillai&apos;s Trace, F, df1, df2, p, η²
                    <br/>Example: V = 0.45, F(6, 190) = 8.23, p &lt; .001
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Running multiple ANOVAs without MANOVA</li>
                    <li>• Ignoring Box&apos;s M test result</li>
                    <li>• Including highly correlated DVs</li>
                    <li>• Insufficient sample size per group</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> MANOVA tests whether groups differ 
                on a <strong>linear combination</strong> of DVs. A significant multivariate effect 
                doesn&apos;t necessarily mean all DVs differ — check univariate follow-ups. Use 
                Pillai&apos;s Trace when assumptions are uncertain.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const manovaExample = exampleDatasets.find(d => d.id === 'manova-groups');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">MANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Multivariate Analysis of Variance - Test group differences across multiple outcomes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Grid3x3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Outcomes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test 2+ dependent variables simultaneously
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Correlation Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Accounts for DV correlations
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Type I Error Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reduces false positives vs multiple ANOVAs
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
                            Test if groups differ across multiple dependent variables simultaneously. More powerful than separate ANOVAs.
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
                                        <span><strong>Dependent variables:</strong> 2+ continuous DVs</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Factor:</strong> 1 categorical grouping variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> More cases than DVs per group</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You'll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Pillai's Trace:</strong> Overall multivariate effect</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Univariate ANOVAs:</strong> Follow-up tests per DV</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Effect sizes (η²):</strong> Practical significance</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {manovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(manovaExample)} size="lg">
                                <Layers className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ManovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ManovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: ManovaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVars, setDependentVars] = useState<string[]>([]);
    const [factorVar, setFactorVar] = useState<string>('');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false); 
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    const numGroups = useMemo(() => {
        if (!factorVar || data.length === 0) return 0;
        return new Set(data.map(row => row[factorVar]).filter(v => v != null && v !== '')).size;
    }, [data, factorVar]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'At least 2 dependent variables', passed: dependentVars.length >= 2, detail: `${dependentVars.length} DV(s) selected` });
        checks.push({ label: 'Factor selected', passed: factorVar !== '', detail: factorVar ? `${factorVar} (${numGroups} groups)` : 'Select a factor' });
        checks.push({ label: 'At least 2 groups', passed: numGroups >= 2, detail: `${numGroups} groups found` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 20, detail: `n = ${data.length} (recommended: 20+)` });
        
        const minPerGroup = factorVar ? Math.floor(data.length / numGroups) : 0;
        checks.push({ label: 'Cases > DVs per group', passed: minPerGroup > dependentVars.length, detail: `~${minPerGroup} per group, ${dependentVars.length} DVs` });
        
        return checks;
    }, [dependentVars, factorVar, numGroups, data]);

    const allValidationsPassed = useMemo(() => {
        return dependentVars.length >= 2 && factorVar !== '' && numGroups >= 2;
    }, [dependentVars, factorVar, numGroups]);

    useEffect(() => {
        if (data.length === 0 || !canRun) {
            setView('intro');
        } else {
            setDependentVars(numericHeaders.slice(0, 2));
            setFactorVar(categoricalHeaders[0] || '');
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleDepVarChange = (header: string, checked: boolean) => {
        setDependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `MANOVA_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "MANOVA RESULTS\n";
        csvContent += `DVs: ${dependentVars.join(', ')}\nFactor: ${factorVar}\n\n`;
        csvContent += "MULTIVARIATE TESTS\n";
        const multiData = Object.entries(results.test_statistics).map(([name, stat]) => ({ Test: name, Statistic: stat.statistic, F: stat.F, df1: stat.df1, df2: stat.df2, p: stat.p_value }));
        csvContent += Papa.unparse(multiData) + "\n\n";
        csvContent += "UNIVARIATE TESTS\n";
        const univData = Object.entries(results.univariate_results).map(([dv, res]) => ({ 
            DV: dv, 
            F: res.f_statistic, 
            p: res.p_value, 
            eta_sq: res.eta_squared,
            omega_sq: res.omega_squared,
            partial_eta_sq: res.partial_eta_squared
        }));
        csvContent += Papa.unparse(univData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `MANOVA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, dependentVars, factorVar, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/manova-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    dependentVars,
                    factorVar,
                    sampleSize: data.length,
                    numGroups
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `MANOVA_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, dependentVars, factorVar, data.length, numGroups, toast]);

    const handleAnalysis = useCallback(async () => {
        if (dependentVars.length < 2 || !factorVar) {
            toast({ variant: 'destructive', title: 'Please select at least 2 DVs and a factor.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/manova`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVars, factorVars: [factorVar] })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            goToStep(4);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVars, factorVar, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            <ManovaGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <ManovaGlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">MANOVA</h1>
                    <p className="text-muted-foreground mt-1">Multivariate Analysis of Variance</p>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose dependent variables and factor</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Dependent Variables ({dependentVars.length} selected)</Label>
                                    <ScrollArea className="h-40 p-4 border rounded-xl bg-muted/30">
                                        <div className="space-y-2">
                                            {numericHeaders.map(h => (
                                                <div key={h} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                    <Checkbox id={`dv-${h}`} checked={dependentVars.includes(h)} onCheckedChange={(c) => handleDepVarChange(h, c as boolean)} />
                                                    <Label htmlFor={`dv-${h}`} className="text-sm font-normal cursor-pointer truncate">{h}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    {dependentVars.length > 0 && (
                                        <div className="flex flex-wrap gap-1">{dependentVars.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}</div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Factor (Grouping Variable)</Label>
                                    <Select value={factorVar} onValueChange={setFactorVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select factor..." /></SelectTrigger>
                                        <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    {numGroups > 0 && <Badge variant="outline">{numGroups} groups</Badge>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={dependentVars.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Review MANOVA configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Dependent Variables:</strong> {dependentVars.join(', ')}</p>
                                    <p>• <strong className="text-foreground">Factor:</strong> {factorVar || 'Not selected'} ({numGroups} groups)</p>
                                    <p>• <strong className="text-foreground">Test Type:</strong> One-Way MANOVA</p>
                                    <p>• <strong className="text-foreground">Primary Statistic:</strong> Pillai's Trace (most robust)</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About MANOVA</h4>
                                <p className="text-sm text-muted-foreground">MANOVA tests whether groups differ on a linear combination of dependent variables. It accounts for correlations between DVs and controls Type I error better than multiple ANOVAs.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">MANOVA will test overall group differences across all dependent variables simultaneously.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run MANOVA<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const isSignificant = results.test_statistics.pillai.p_value < 0.05;
                    const pillai = results.test_statistics.pillai.statistic;
                    const significantDVs = Object.values(results.univariate_results).filter(r => r.significant).length;
                    const totalDVs = Object.keys(results.univariate_results).length;
                    const isGood = isSignificant && pillai >= 0.1;
                    const pValue = results.test_statistics.pillai.p_value;
                    const pPct = (pValue * 100).toFixed(2);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>MANOVA: {dependentVars.length} DVs by {factorVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isSignificant 
                                                ? `The ${dependentVars.length} dependent variables differ overall by ${factorVar}. Meaningful group differences exist.`
                                                : `No overall difference in the ${dependentVars.length} dependent variables by ${factorVar}.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {pillai >= 0.35 
                                                ? `Effect size is large. ${factorVar} has substantial practical impact on the DV combination.`
                                                : pillai >= 0.15 
                                                    ? `Effect size is medium. There is moderate practical impact.`
                                                    : `Effect size is small. Even if differences exist, practical significance is limited.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Univariate follow-ups show <strong>{significantDVs}</strong>/{totalDVs} variables with significant group differences.
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Group Differences Confirmed!" : isSignificant ? "Significant but Small Effect" : "No Significant Multivariate Effect"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood ? "Groups differ meaningfully across multiple outcome variables. Consider group-specific strategies." : isSignificant ? "Statistical differences exist but practical significance needs review." : "No overall differences between groups across outcomes."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Pillai's Trace:</strong> {pillai.toFixed(3)} — {pillai >= 0.35 ? 'Large effect (above 0.35).' : pillai >= 0.15 ? 'Medium effect (0.15-0.35).' : 'Small effect (below 0.15).'}</p>
                                        <p>• <strong>p-value:</strong> {pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)} — {isSignificant 
                                            ? `Below 5%, statistically significant.`
                                            : `Above 5%, not statistically significant.`}</p>
                                        <p>• <strong>Univariate:</strong> {significantDVs}/{totalDVs} DVs show significant group differences.</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Effect Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = pillai >= 0.5 ? 5 : pillai >= 0.35 ? 4 : pillai >= 0.2 ? 3 : pillai >= 0.1 ? 2 : 1;
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

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (() => {
                    const univariateResults = Object.entries(results.univariate_results);
                    const significantDVs = univariateResults.filter(([_, r]) => r.significant);
                    const isSignificant = results.test_statistics.pillai.p_value < 0.05;
                    const boxsM = results.assumptions?.boxs_m;
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding MANOVA results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How MANOVA Works</h4>
                                            <p className="text-sm text-muted-foreground">
                                                MANOVA tests whether groups differ on a <strong className="text-foreground">linear combination</strong> of dependent variables. 
                                                It's more powerful than separate ANOVAs because it accounts for correlations between DVs.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Assumption Check: Box's M Test</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {boxsM ? (
                                                    boxsM.equal_covariances 
                                                        ? `Covariance matrices are equal across groups (p = ${boxsM.p_value.toFixed(3)}). MANOVA assumptions are met.`
                                                        : `Covariance matrices differ across groups (p = ${boxsM.p_value.toFixed(3)}). Pillai's Trace is robust to this violation.`
                                                ) : 'Box\'s M test could not be computed (insufficient data per group).'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Univariate Follow-ups</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {significantDVs.length > 0 ? (
                                                    <>Significant effects found for: {significantDVs.map(([dv, r], i) => (
                                                        <span key={dv}><strong className="text-foreground">{dv}</strong> (η² = {r.eta_squared.toFixed(3)}, {getEtaInterpretation(r.eta_squared).toLowerCase()}){i < significantDVs.length - 1 ? ', ' : '.'}</span>
                                                    ))}</>
                                                ) : 'No individual DVs showed significant effects.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Recommendation</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {isSignificant 
                                                    ? 'Significant multivariate effect found. Examine post-hoc comparisons to identify which groups differ on each DV.' 
                                                    : 'No significant multivariate effect. Groups do not differ across the combination of dependent variables.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isSignificant 
                                            ? `Groups differ significantly across the ${dependentVars.length} outcome variables. Post-hoc tests can reveal specific group differences.`
                                            : `No significant differences were found between ${factorVar} groups across the outcome variables.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Pillai's Trace Guide</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt; 0.1</p><p className="text-muted-foreground">Negligible</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.1-0.3</p><p className="text-muted-foreground">Small</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.3-0.5</p><p className="text-muted-foreground">Medium</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt; 0.5</p><p className="text-muted-foreground">Large</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && analysisResult && (() => {
                    const groups = results.groups || [];
                    const boxsM = results.assumptions?.boxs_m;
                    
                    return (
                    <>
                    <PythonCodeModal 
                        isOpen={pythonCodeModalOpen} 
                        onClose={() => setPythonCodeModalOpen(false)}
                        codeUrl={PYTHON_CODE_URL}
                    />

                    <ManovaGlossaryModal 
                                isOpen={glossaryModalOpen}
                                onClose={() => setGlossaryModalOpen(false)}
                            />

                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileText className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">MANOVA Report</h2><p className="text-sm text-muted-foreground mt-1">DVs: {dependentVars.join(', ')} | Factor: {factorVar} | N = {results.n_used || data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Missing Values Alert */}
                        {results.n_dropped !== undefined && results.n_dropped > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Missing Values</AlertTitle>
                                <AlertDescription>{results.n_dropped} row(s) excluded due to missing values (original: {results.n_original}, used: {results.n_used}).</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Detailed Analysis - APA Format */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-primary/10 rounded-md">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-base">Statistical Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            A one-way multivariate analysis of variance (MANOVA) was conducted to examine the effect of {factorVar} on 
                                            {dependentVars.length} dependent variables: {dependentVars.join(', ')}. The sample consisted of <em>N</em> = {results.n_used || data.length} observations 
                                            across {results.n_groups} groups.
                                        </p>
                                        
                                        {boxsM && (
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Box's M test for homogeneity of covariance matrices was {boxsM.equal_covariances ? 'not significant' : 'significant'} 
                                                (<em>M</em> = {boxsM.M.toFixed(2)}, <em>χ²</em>({boxsM.df.toFixed(0)}) = {boxsM.chi2.toFixed(2)}, <em>p</em> {boxsM.p_value < 0.001 ? '< .001' : `= ${boxsM.p_value.toFixed(3)}`}), 
                                                {boxsM.equal_covariances ? ' indicating equal covariance matrices across groups.' : ' suggesting unequal covariance matrices. Pillai\'s Trace was used due to its robustness.'}
                                            </p>
                                        )}
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The multivariate effect of {factorVar} was {results.test_statistics.pillai.p_value < 0.05 ? 'statistically significant' : 'not statistically significant'}, 
                                            <span className="font-mono"> Pillai's Trace = {results.test_statistics.pillai.statistic.toFixed(3)}</span>, 
                                            <span className="font-mono"> F({results.test_statistics.pillai.df1.toFixed(0)}, {results.test_statistics.pillai.df2.toFixed(0)}) = {results.test_statistics.pillai.F.toFixed(2)}</span>, 
                                            <em> p</em> {results.test_statistics.pillai.p_value < 0.001 ? '< .001' : `= ${results.test_statistics.pillai.p_value.toFixed(3)}`}.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            {results.test_statistics.pillai.p_value < 0.05 
                                                ? `Follow-up univariate ANOVAs revealed significant effects for ${Object.entries(results.univariate_results).filter(([_, r]) => r.significant).map(([dv]) => dv).join(', ') || 'no individual variables'}.`
                                                : 'As the multivariate effect was not significant, univariate follow-ups should be interpreted with caution.'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Descriptive Statistics */}
                        {results.descriptives && Object.keys(results.descriptives).length > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    <Tabs defaultValue={dependentVars[0]} className="w-full">
                                        <TabsList className="mb-4">
                                            {dependentVars.map(dv => (
                                                <TabsTrigger key={dv} value={dv}>{dv}</TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {dependentVars.map(dv => (
                                            <TabsContent key={dv} value={dv}>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>{factorVar}</TableHead>
                                                            <TableHead className="text-right">n</TableHead>
                                                            <TableHead className="text-right">Mean</TableHead>
                                                            <TableHead className="text-right">SD</TableHead>
                                                            <TableHead className="text-right">SE</TableHead>
                                                            <TableHead className="text-right">95% CI</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.descriptives[dv] && Object.entries(results.descriptives[dv]).map(([group, stats]) => (
                                                            <TableRow key={group}>
                                                                <TableCell className="font-medium">{group}</TableCell>
                                                                <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                                <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                                <TableCell className="text-right font-mono">{stats.se.toFixed(3)}</TableCell>
                                                                <TableCell className="text-right font-mono">[{stats.ci_lower.toFixed(2)}, {stats.ci_upper.toFixed(2)}]</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </CardContent>
                            </Card>
                        )}

                        {/* Visualization */}
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={analysisResult.plot} alt="MANOVA Visualization" width={1500} height={1200} className="w-3/4 rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

                        {/* Multivariate Test Statistics */}
                        <Card>
                            <CardHeader><CardTitle>Multivariate Test Statistics</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">F</TableHead><TableHead className="text-right">df1</TableHead><TableHead className="text-right">df2</TableHead><TableHead className="text-right">p</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.entries(results.test_statistics).map(([name, stat]) => (
                                            <TableRow key={name}>
                                                <TableCell className="font-medium">{name.charAt(0).toUpperCase() + name.slice(1)}'s {name === 'wilks' ? 'Lambda' : name === 'roy' ? 'Largest Root' : 'Trace'}</TableCell>
                                                <TableCell className="text-right font-mono">{stat.statistic.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{stat.F.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{stat.df1.toFixed(0)}</TableCell>
                                                <TableCell className="text-right font-mono">{stat.df2.toFixed(0)}</TableCell>
                                                <TableCell className="text-right"><Badge variant={stat.p_value < 0.05 ? 'default' : 'outline'}>{stat.p_value < 0.001 ? '<.001' : stat.p_value.toFixed(4)}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">Pillai's Trace is generally recommended for robustness to assumption violations.</p></CardFooter>
                        </Card>

                        {/* Univariate Follow-ups */}
                        <Card>
                            <CardHeader><CardTitle>Univariate Follow-up Tests (ANOVA)</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Dependent Variable</TableHead>
                                            <TableHead className="text-right">F</TableHead>
                                            <TableHead className="text-right">p</TableHead>
                                            <TableHead className="text-right">η²</TableHead>
                                            <TableHead className="text-right">ω²</TableHead>
                                            <TableHead className="text-center">Sig.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.univariate_results).map(([dv, res]) => (
                                            <TableRow key={dv}>
                                                <TableCell className="font-medium">{dv}</TableCell>
                                                <TableCell className="text-right font-mono">{res.f_statistic.toFixed(3)}</TableCell>
                                                <TableCell className="text-right"><Badge variant={res.p_value < 0.05 ? 'default' : 'outline'}>{formatPValue(res.p_value)}</Badge></TableCell>
                                                <TableCell className="text-right font-mono">{res.eta_squared.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{res.omega_squared?.toFixed(3) ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center">{res.significant ? <CheckCircle className="w-4 h-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">η²: Eta-squared, ω²: Omega-squared (unbiased). Significant results highlighted.</p></CardFooter>
                        </Card>

                        {/* Post-hoc Comparisons */}
                        {results.posthoc_results && Object.keys(results.posthoc_results).length > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Post-hoc Comparisons (Bonferroni)</CardTitle></CardHeader>
                                <CardContent>
                                    <Tabs defaultValue={Object.keys(results.posthoc_results)[0]} className="w-full">
                                        <TabsList className="mb-4">
                                            {Object.keys(results.posthoc_results).map(dv => (
                                                <TabsTrigger key={dv} value={dv}>{dv}</TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {Object.entries(results.posthoc_results).map(([dv, comparisons]) => (
                                            <TabsContent key={dv} value={dv}>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Comparison</TableHead>
                                                            <TableHead className="text-right">Mean Diff</TableHead>
                                                            <TableHead className="text-right">SE</TableHead>
                                                            <TableHead className="text-right">95% CI</TableHead>
                                                            <TableHead className="text-right">t</TableHead>
                                                            <TableHead className="text-right">p (corrected)</TableHead>
                                                            <TableHead className="text-right">Cohen's d</TableHead>
                                                            <TableHead className="text-center">Sig.</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {comparisons.map((comp, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-medium">{comp.group1} vs {comp.group2}</TableCell>
                                                                <TableCell className="text-right font-mono">{comp.mean_diff.toFixed(3)}</TableCell>
                                                                <TableCell className="text-right font-mono">{comp.se_diff.toFixed(3)}</TableCell>
                                                                <TableCell className="text-right font-mono">[{comp.ci_lower.toFixed(2)}, {comp.ci_upper.toFixed(2)}]</TableCell>
                                                                <TableCell className="text-right font-mono">{comp.t_statistic.toFixed(3)}</TableCell>
                                                                <TableCell className="text-right"><Badge variant={comp.significant_corrected ? 'default' : 'outline'}>{formatPValue(comp.p_corrected)}</Badge></TableCell>
                                                                <TableCell className="text-right font-mono">{comp.cohens_d.toFixed(3)}</TableCell>
                                                                <TableCell className="text-center">{comp.significant_corrected ? <CheckCircle className="w-4 h-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </CardContent>
                                <CardFooter><p className="text-sm text-muted-foreground">Bonferroni correction applied to control Type I error. Cohen's d: 0.2 = small, 0.5 = medium, 0.8 = large.</p></CardFooter>
                            </Card>
                        )}

                        {/* Assumptions */}
                        {results.assumptions && (
                            <Card>
                                <CardHeader><CardTitle>Assumption Checks</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Test</TableHead>
                                                <TableHead className="text-right">Statistic</TableHead>
                                                <TableHead className="text-right">df</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-center">Result</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {boxsM && (
                                                <TableRow>
                                                    <TableCell className="font-medium">Box's M Test</TableCell>
                                                    <TableCell className="text-right font-mono">{boxsM.chi2.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{boxsM.df.toFixed(0)}</TableCell>
                                                    <TableCell className="text-right"><Badge variant={boxsM.equal_covariances ? 'outline' : 'default'}>{formatPValue(boxsM.p_value)}</Badge></TableCell>
                                                    <TableCell className="text-center">
                                                        {boxsM.equal_covariances 
                                                            ? <span className="text-xs text-muted-foreground">Equal covariances</span>
                                                            : <span className="text-xs text-amber-600">Unequal covariances</span>}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            <TableRow>
                                                <TableCell className="font-medium">Sample Size Adequacy</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-center">
                                                    {results.assumptions.sample_size_adequate 
                                                        ? <span className="text-xs text-muted-foreground">Adequate (min n={results.assumptions.min_group_size})</span>
                                                        : <span className="text-xs text-amber-600">Insufficient (min n={results.assumptions.min_group_size})</span>}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter>
                                    <p className="text-sm text-muted-foreground">
                                        Box's M tests homogeneity of covariance matrices. Non-significant p ({">"} .05) indicates assumption is met. 
                                        Pillai's Trace is robust to violations.
                                    </p>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>
        </div>
    );
}