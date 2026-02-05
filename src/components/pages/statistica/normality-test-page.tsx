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
import { Check, CheckCircle2, AlertTriangle, LineChart, HelpCircle, Settings, FileSearch, BarChart, BookOpen, CheckCircle, Activity, TrendingUp, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, ArrowRight, ChevronDown, FileText, Sparkles, Info, Lightbulb, Loader2, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import Image from 'next/image';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/normality_test.py?alt=media";

interface NormalityTestResult {
    n: number;
    primary_test: string;
    primary_test_name: string;
    shapiro_wilk: { statistic: number; p_value: number; };
    jarque_bera: { statistic: number; p_value: number; };
    kolmogorov_smirnov: { statistic: number; p_value: number; };
    is_normal: boolean;
    is_normal_shapiro: boolean;
    is_normal_jarque: boolean;
    is_normal_ks: boolean;
    interpretation: string;
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: { [key: string]: NormalityTestResult };
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

// Statistical Terms Glossary for Normality Test
const normalityMetricDefinitions: Record<string, string> = {
    normality: "A statistical property where data follows a bell-shaped (Gaussian) distribution. Many parametric tests assume normality for valid inference.",
    normal_distribution: "A symmetric, bell-shaped probability distribution defined by its mean (μ) and standard deviation (σ). About 68% of data falls within 1 SD, 95% within 2 SDs.",
    shapiro_wilk: "A test for normality that compares the ordered sample values to their expected values under normality. Most powerful for small samples (n < 50). W statistic ranges 0-1; values near 1 indicate normality.",
    kolmogorov_smirnov: "A test comparing the empirical distribution function to a reference distribution (normal). Works for any sample size but has lower power. The D statistic measures maximum distance between distributions.",
    jarque_bera: "A test based on skewness and kurtosis that checks if data matches the third and fourth moments of a normal distribution. Best for large samples (n ≥ 300). Based on χ² distribution.",
    p_value: "The probability of observing results at least as extreme as the sample, assuming the null hypothesis is true. In normality tests, p > 0.05 suggests data is likely normal.",
    null_hypothesis: "In normality testing, H₀ states that the data comes from a normal distribution. We fail to reject H₀ when p > α (typically 0.05).",
    alternative_hypothesis: "H₁ states that data does NOT come from a normal distribution. We reject H₀ in favor of H₁ when p ≤ α.",
    significance_level: "Alpha (α), typically set at 0.05. The threshold for deciding whether to reject the null hypothesis. Represents the acceptable probability of a Type I error.",
    type_i_error: "Falsely rejecting H₀ when it's true (false positive). In normality testing, concluding data is non-normal when it actually is normal.",
    type_ii_error: "Failing to reject H₀ when it's false (false negative). Concluding data is normal when it actually isn't.",
    statistical_power: "The probability of correctly rejecting a false null hypothesis. Higher sample sizes increase power. Shapiro-Wilk has highest power for small samples.",
    skewness: "A measure of distribution asymmetry. Zero skewness indicates symmetry. Positive skew means longer right tail; negative skew means longer left tail.",
    kurtosis: "A measure of 'tailedness' of a distribution. Normal distribution has kurtosis of 3 (excess kurtosis = 0). High kurtosis indicates heavy tails and sharp peak.",
    qq_plot: "Quantile-Quantile plot comparing sample quantiles to theoretical normal quantiles. Points following the diagonal line indicate normality; deviations suggest non-normality.",
    histogram: "A graphical representation of data distribution using bars. For normal data, the histogram should show a symmetric, bell-shaped pattern centered at the mean.",
    parametric_tests: "Statistical tests that assume specific distributions (usually normal). Examples: t-test, ANOVA, Pearson correlation, linear regression. Require normality assumption.",
    nonparametric_tests: "Distribution-free tests that don't assume normality. Examples: Mann-Whitney U, Kruskal-Wallis, Spearman correlation. Use when normality is violated.",
    central_limit_theorem: "States that the sampling distribution of the mean approaches normality as sample size increases, regardless of the population distribution. Generally applies when n ≥ 30.",
    data_transformation: "Mathematical operations (log, square root, Box-Cox) applied to data to achieve normality. Common when original data is skewed or has unequal variances."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Normality Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in normality testing
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(normalityMetricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold">
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

// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen, code]);

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
        link.download = 'normality_test.py';
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
                        Python Code - Normality Test
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

// Statistical Summary Cards
const StatisticalSummaryCards = ({ results }: { results: { [key: string]: NormalityTestResult } }) => {
    const entries = Object.entries(results).filter(([_, r]) => !r.error);
    const normalCount = entries.filter(([_, r]) => r.is_normal).length;
    const totalCount = entries.length;
    const avgN = entries.reduce((sum, [_, r]) => sum + r.n, 0) / entries.length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Variables Tested</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{totalCount}</p><p className="text-xs text-muted-foreground">Analyzed</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Normal</p><CheckCircle className="h-4 w-4 text-green-600" /></div><p className="text-2xl font-semibold text-green-600">{normalCount}</p><p className="text-xs text-muted-foreground">Pass normality test</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Non-Normal</p><AlertTriangle className="h-4 w-4 text-amber-500" /></div><p className="text-2xl font-semibold text-amber-600">{totalCount - normalCount}</p><p className="text-xs text-muted-foreground">Reject normality</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Avg Sample Size</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{Math.round(avgN)}</p><p className="text-xs text-muted-foreground">Per variable</p></div></CardContent></Card>
        </div>
    );
};


// Normality Test Analysis Guide Component
const NormalityGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Normality Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Normality Testing */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                What is Normality Testing?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Normality tests determine whether your data follows a <strong>normal (Gaussian) distribution</strong> — 
                the bell-shaped curve. This is important because many statistical tests assume normality.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why It Matters:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Parametric tests (t-test, ANOVA, Pearson correlation, linear regression) assume normal distribution. 
                    If violated, use non-parametric alternatives or data transformations.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* The Three Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Three Normality Tests
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Each test has strengths for different sample sizes. The appropriate test is <strong>automatically selected</strong> based on your data.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-primary">Shapiro-Wilk Test</p>
                    <Badge variant="outline">n &lt; 50</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    The <strong>most powerful</strong> test for small samples. Compares ordered sample values to expected normal values.
                    <br/>W statistic ranges 0-1; values near 1 indicate normality.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Kolmogorov-Smirnov (K-S) Test</p>
                    <Badge variant="outline">50 ≤ n &lt; 300</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compares the empirical distribution to theoretical normal. Works for any sample size but has lower power.
                    <br/>D statistic measures maximum distance between distributions.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Jarque-Bera Test</p>
                    <Badge variant="outline">n ≥ 300</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on <strong>skewness and kurtosis</strong>. Best for large samples.
                    <br/>Tests whether the 3rd and 4th moments match a normal distribution.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                  <p className="font-medium text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    p &gt; 0.05 → Normal
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fail to reject H₀. Data is <strong>likely normally distributed</strong>.
                    <br/>Parametric tests are appropriate.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    p ≤ 0.05 → Non-Normal
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reject H₀. Data is <strong>not normally distributed</strong>.
                    <br/>Consider non-parametric tests or transformations.
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  <strong>Important:</strong> The null hypothesis (H₀) states that data IS normal. 
                  Unlike most tests, we often <em>want</em> to fail to reject H₀ here.
                </p>
              </div>
            </div>

            <Separator />

            {/* Visual Diagnostics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Visual Diagnostics
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Q-Q Plot (Quantile-Quantile)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plots sample quantiles against theoretical normal quantiles.
                    <br/><strong>Normal:</strong> Points follow the diagonal line.
                    <br/><strong>Non-normal:</strong> Systematic deviations, especially at tails.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Histogram</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows the frequency distribution of your data.
                    <br/><strong>Normal:</strong> Symmetric, bell-shaped curve.
                    <br/><strong>Non-normal:</strong> Skewed, bimodal, or irregular shape.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <em>Always combine statistical tests with visual inspection.</em> 
                Tests can be overly sensitive with large samples.
              </p>
            </div>

            <Separator />

            {/* What To Do If Non-Normal */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                What If Data Is Non-Normal?
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Option 1: Use Non-Parametric Alternatives</p>
                  <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-1">
                    <span>• t-test → Mann-Whitney U</span>
                    <span>• ANOVA → Kruskal-Wallis</span>
                    <span>• Pearson → Spearman</span>
                    <span>• Paired t → Wilcoxon</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Option 2: Transform the Data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Common transformations: <strong>Log</strong> (for right-skewed), <strong>Square root</strong>, 
                    <strong>Box-Cox</strong>, <strong>Inverse</strong>. Re-test normality after transformation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Option 3: Rely on Central Limit Theorem</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For large samples (n ≥ 30), the sampling distribution of the mean approaches normal 
                    regardless of population shape. Parametric tests may still be robust.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Pitfalls */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Pitfalls
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Large Sample Sensitivity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    With very large samples (n &gt; 500), even trivial departures from normality 
                    become statistically significant. Visual inspection becomes more important.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Small Sample Power</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    With very small samples (n &lt; 20), tests have low power and may fail to detect 
                    non-normality. Larger samples give more reliable results.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Outliers</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A few outliers can cause rejection of normality. Check for data entry errors 
                    or genuine extreme values before concluding non-normality.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sample Size Guidelines */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Test Selection by Sample Size
              </h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded bg-primary/10 border border-primary/30 text-center">
                  <p className="font-semibold">n &lt; 50</p>
                  <p className="text-primary font-medium">Shapiro-Wilk</p>
                  <p className="text-muted-foreground">Highest power</p>
                </div>
                <div className="p-2 rounded bg-muted text-center">
                  <p className="font-semibold">50 ≤ n &lt; 300</p>
                  <p className="font-medium">K-S Test</p>
                  <p className="text-muted-foreground">Medium samples</p>
                </div>
                <div className="p-2 rounded bg-muted text-center">
                  <p className="font-semibold">n ≥ 300</p>
                  <p className="font-medium">Jarque-Bera</p>
                  <p className="text-muted-foreground">Moment-based</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Normality testing is a <strong>prerequisite check</strong>, 
                not an end goal. The purpose is to determine whether parametric tests are valid for your data. 
                Always combine statistical tests with visual inspection (Q-Q plots, histograms). When in doubt about 
                borderline cases, non-parametric tests are a safe alternative that work with any distribution.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const normalityExample = exampleDatasets.find(d => d.id === 'iris');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <LineChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Normality Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Check whether your data follows a normal distribution
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Three Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Shapiro-Wilk, Kolmogorov-Smirnov, Jarque-Bera
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Auto Selection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Best test chosen based on sample size
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual Diagnostics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Histograms and Q-Q plots included
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
                            Run before parametric tests (t-tests, ANOVA, regression). 
                            The appropriate test is automatically selected based on your sample size.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="p-3 bg-background rounded-md border text-center">
                                <p className="font-semibold text-sm">n &lt; 50</p>
                                <p className="text-xs text-muted-foreground">Shapiro-Wilk</p>
                            </div>
                            <div className="p-3 bg-background rounded-md border text-center">
                                <p className="font-semibold text-sm">50 ≤ n &lt; 300</p>
                                <p className="text-xs text-muted-foreground">Kolmogorov-Smirnov</p>
                            </div>
                            <div className="p-3 bg-background rounded-md border text-center">
                                <p className="font-semibold text-sm">n ≥ 300</p>
                                <p className="text-xs text-muted-foreground">Jarque-Bera</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Numeric data:</strong> Continuous variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 3 (20+ recommended)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Multiple tests:</strong> Analyze several variables at once</span>
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
                                        <span><strong>p &gt; 0.05:</strong> Data is likely normal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Q-Q plot:</strong> Points on diagonal = normal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Guidance:</strong> Parametric vs non-parametric</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {normalityExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(normalityExample)} size="lg">
                                <LineChart className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface NormalityTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NormalityTestPage({ data, numericHeaders, onLoadExample }: NormalityTestPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const primaryTest = useMemo(() => {
        const n = data.length;
        if (n < 50) return 'Shapiro-Wilk';
        if (n < 300) return 'Kolmogorov-Smirnov';
        return 'Jarque-Bera';
    }, [data]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'Variables selected', passed: selectedVars.length > 0, detail: `${selectedVars.length} variable(s) selected` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 20, detail: `n = ${data.length} (recommended: 20+)` });
        checks.push({ label: 'Minimum sample size', passed: data.length >= 3, detail: data.length >= 3 ? 'At least 3 observations' : 'Need at least 3 observations' });
        
        return checks;
    }, [selectedVars, data]);

    const allValidationsPassed = useMemo(() => {
        return selectedVars.length > 0 && data.length >= 3;
    }, [selectedVars, data]);

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            setSelectedVars(numericHeaders.slice(0, Math.min(4, numericHeaders.length)));
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
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
            link.download = `Normality_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csvContent = "NORMALITY TEST RESULTS\n\n";
        const detailedData = Object.entries(analysisResult.results).filter(([_, r]) => !r.error).map(([variable, result]) => ({
            Variable: variable, N: result.n, Primary_Test: result.primary_test_name,
            SW_Stat: result.shapiro_wilk.statistic.toFixed(4), SW_p: result.shapiro_wilk.p_value.toFixed(4),
            KS_Stat: result.kolmogorov_smirnov.statistic.toFixed(4), KS_p: result.kolmogorov_smirnov.p_value.toFixed(4),
            JB_Stat: result.jarque_bera.statistic.toFixed(4), JB_p: result.jarque_bera.p_value.toFixed(4),
            Is_Normal: result.is_normal ? 'Yes' : 'No'
        }));
        csvContent += Papa.unparse(detailedData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Normality_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/normality-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedVars,
                    totalRows: data.length,
                    primaryTest
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Normality_Test_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedVars, data.length, primaryTest, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Please select at least one variable.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/normality-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
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
    }, [data, selectedVars, toast]);

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
            <NormalityGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Normality Test</h1>
                    <p className="text-muted-foreground mt-1">Check for normal distribution</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose numeric variables to test</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Numeric Variables ({selectedVars.length} selected)</Label>
                                <ScrollArea className="h-48 p-4 border rounded-xl bg-muted/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.map(h => (
                                            <div key={h} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <Checkbox id={`var-${h}`} checked={selectedVars.includes(h)} onCheckedChange={(c) => handleVarSelectionChange(h, c as boolean)} />
                                                <Label htmlFor={`var-${h}`} className="text-sm font-normal cursor-pointer truncate">{h}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {selectedVars.length > 0 && (
                                    <div className="flex flex-wrap gap-1">{selectedVars.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations | Primary test: <span className="font-semibold text-foreground">{primaryTest}</span></p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length === 0}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Test Settings</CardTitle><CardDescription>Review configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variables:</strong> {selectedVars.join(', ')}</p>
                                    <p>• <strong className="text-foreground">Sample Size:</strong> {data.length} observations</p>
                                    <p>• <strong className="text-foreground">Primary Test:</strong> {primaryTest}</p>
                                    <p>• <strong className="text-foreground">Significance Level:</strong> α = 0.05</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Test Selection Logic</h4>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className={`p-2 rounded border ${data.length < 50 ? 'bg-primary/10 border-primary' : 'bg-background'}`}><p className="font-medium">n &lt; 50</p><p className="text-muted-foreground">Shapiro-Wilk</p></div>
                                    <div className={`p-2 rounded border ${data.length >= 50 && data.length < 300 ? 'bg-primary/10 border-primary' : 'bg-background'}`}><p className="font-medium">50 ≤ n &lt; 300</p><p className="text-muted-foreground">K-S Test</p></div>
                                    <div className={`p-2 rounded border ${data.length >= 300 ? 'bg-primary/10 border-primary' : 'bg-background'}`}><p className="font-medium">n ≥ 300</p><p className="text-muted-foreground">Jarque-Bera</p></div>
                                </div>
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
                                <LineChart className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will test {selectedVars.length} variable(s) using {primaryTest} as the primary test.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run Tests<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const entries = Object.entries(results).filter(([_, r]) => !r.error);
                    const normalCount = entries.filter(([_, r]) => r.is_normal).length;
                    const totalCount = entries.length;
                    const allNormal = normalCount === totalCount;
                    const normalVars = entries.filter(([_, r]) => r.is_normal).map(([v]) => v);
                    const nonNormalVars = entries.filter(([_, r]) => !r.is_normal).map(([v]) => v);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Normality Test: {totalCount} variables</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${allNormal ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${allNormal ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${allNormal ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            <strong>{normalCount}</strong> of {totalCount} variables pass the normality test (p &gt; 0.05).
                                        </p></div>
                                        {normalVars.length > 0 && (
                                            <div className="flex items-start gap-3"><span className={`font-bold ${allNormal ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                                Normal: <strong>{normalVars.slice(0, 3).join(', ')}</strong>{normalVars.length > 3 && ` +${normalVars.length - 3} more`}
                                            </p></div>
                                        )}
                                        {nonNormalVars.length > 0 && (
                                            <div className="flex items-start gap-3"><span className={`font-bold ${allNormal ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                                Non-normal: <strong>{nonNormalVars.slice(0, 3).join(', ')}</strong>{nonNormalVars.length > 3 && ` +${nonNormalVars.length - 3} more`}
                                            </p></div>
                                        )}
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${allNormal ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {allNormal ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{allNormal ? "All Variables are Normally Distributed!" : normalCount > 0 ? "Mixed Results" : "Non-Normal Distribution Detected"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {allNormal ? "Parametric tests (t-test, ANOVA, regression) are appropriate." : "Consider non-parametric alternatives for non-normal variables."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Normality Score:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = Math.ceil((normalCount / totalCount) * 5);
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">View Details<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (() => {
                    const entries = Object.entries(results).filter(([_, r]) => !r.error);
                    const normalCount = entries.filter(([_, r]) => r.is_normal).length;
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding normality tests</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How Normality Tests Work</h4>
                                            <p className="text-sm text-muted-foreground">
                                                These tests compare your data's distribution to a theoretical normal distribution. 
                                                The null hypothesis is that data IS normal. If p &gt; 0.05, we fail to reject H₀ (data is likely normal).
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Test Results by Variable</h4>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                {entries.slice(0, 4).map(([variable, result]) => (
                                                    <p key={variable}>
                                                        <strong className="text-foreground">{variable}</strong>: {result.primary_test_name} p = {result.primary_test === 'shapiro_wilk' ? result.shapiro_wilk.p_value.toFixed(3) : result.primary_test === 'kolmogorov_smirnov' ? result.kolmogorov_smirnov.p_value.toFixed(3) : result.jarque_bera.p_value.toFixed(3)} 
                                                        → {result.is_normal ? '✓ Normal' : '✗ Non-normal'}
                                                    </p>
                                                ))}
                                                {entries.length > 4 && <p className="text-xs">... and {entries.length - 4} more</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Visual Inspection</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Q-Q plots show if data points follow the theoretical normal line. 
                                                Deviations at the tails indicate skewness or heavy tails. 
                                                Histograms should show a bell-shaped curve for normal data.
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
                                                {normalCount === entries.length 
                                                    ? 'All variables are normally distributed. Parametric tests (t-test, ANOVA, Pearson correlation, linear regression) are appropriate.' 
                                                    : normalCount > 0 
                                                    ? 'Mixed results. Use parametric tests for normal variables and non-parametric alternatives (Mann-Whitney, Kruskal-Wallis, Spearman) for non-normal ones.' 
                                                    : 'Consider data transformations (log, sqrt) or use non-parametric alternatives.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {normalCount} of {entries.length} variables pass the normality assumption (α = 0.05). 
                                        Primary test ({primaryTest}) was selected based on sample size n = {data.length}.
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />P-value Interpretation</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">p &gt; 0.05</p><p className="text-muted-foreground">Likely Normal</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg border-amber-200 border"><p className="font-medium text-amber-600">p ≤ 0.05</p><p className="text-muted-foreground">Non-Normal</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full test results and diagnostics</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileText className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                    <Code className="mr-2 h-4 w-4" />Python Code
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Normality Test Report</h2><p className="text-sm text-muted-foreground mt-1">Variables: {selectedVars.join(', ')} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* APA-style Summary */}
                        <Card>
                            <CardHeader><CardTitle>Statistical Summary</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Analysis Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Normality was assessed for {Object.keys(results).length} variables using {primaryTest} 
                                            (selected based on sample size <em>N</em> = {data.length}). 
                                            Results indicated that {Object.values(results).filter(r => !r.error && r.is_normal).length} variable(s) 
                                            met the assumption of normality (p &gt; .05).
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Individual Results */}
                        {Object.entries(results).map(([variable, result]) => (
                            <Card key={variable}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>{variable}</CardTitle>
                                        <div className="flex gap-2">
                                            <Badge variant="outline">n = {result.n}</Badge>
                                            <Badge variant={result.is_normal ? 'default' : 'destructive'}>{result.is_normal ? 'Normal' : 'Non-Normal'}</Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                {!result.error && (
                                    <CardContent className="grid lg:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Alert variant={result.is_normal ? 'default' : 'destructive'}>
                                                {result.is_normal ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
                                                <AlertTitle>{result.is_normal ? "Normally Distributed" : "Not Normally Distributed"}</AlertTitle>
                                                <AlertDescription>{result.interpretation}</AlertDescription>
                                            </Alert>
                                            
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-center">Result</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    <TableRow className={result.primary_test === 'shapiro_wilk' ? 'bg-primary/5' : ''}>
                                                        <TableCell><div className="flex items-center gap-2"><span className="font-medium">Shapiro-Wilk</span>{result.primary_test === 'shapiro_wilk' && <Badge variant="secondary" className="text-xs">Primary</Badge>}</div></TableCell>
                                                        <TableCell className="text-right font-mono">{result.shapiro_wilk.statistic.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right"><Badge variant={result.shapiro_wilk.p_value > 0.05 ? 'outline' : 'destructive'}>{result.shapiro_wilk.p_value < 0.001 ? '<.001' : result.shapiro_wilk.p_value.toFixed(4)}</Badge></TableCell>
                                                        <TableCell className="text-center">{result.is_normal_shapiro ? <CheckCircle className="h-4 w-4 text-green-600 mx-auto" /> : <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />}</TableCell>
                                                    </TableRow>
                                                    <TableRow className={result.primary_test === 'kolmogorov_smirnov' ? 'bg-primary/5' : ''}>
                                                        <TableCell><div className="flex items-center gap-2"><span className="font-medium">K-S</span>{result.primary_test === 'kolmogorov_smirnov' && <Badge variant="secondary" className="text-xs">Primary</Badge>}</div></TableCell>
                                                        <TableCell className="text-right font-mono">{result.kolmogorov_smirnov.statistic.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right"><Badge variant={result.kolmogorov_smirnov.p_value > 0.05 ? 'outline' : 'destructive'}>{result.kolmogorov_smirnov.p_value < 0.001 ? '<.001' : result.kolmogorov_smirnov.p_value.toFixed(4)}</Badge></TableCell>
                                                        <TableCell className="text-center">{result.is_normal_ks ? <CheckCircle className="h-4 w-4 text-green-600 mx-auto" /> : <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />}</TableCell>
                                                    </TableRow>
                                                    <TableRow className={result.primary_test === 'jarque_bera' ? 'bg-primary/5' : ''}>
                                                        <TableCell><div className="flex items-center gap-2"><span className="font-medium">Jarque-Bera</span>{result.primary_test === 'jarque_bera' && <Badge variant="secondary" className="text-xs">Primary</Badge>}</div></TableCell>
                                                        <TableCell className="text-right font-mono">{result.jarque_bera.statistic.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right"><Badge variant={result.jarque_bera.p_value > 0.05 ? 'outline' : 'destructive'}>{result.jarque_bera.p_value < 0.001 ? '<.001' : result.jarque_bera.p_value.toFixed(4)}</Badge></TableCell>
                                                        <TableCell className="text-center">{result.is_normal_jarque ? <CheckCircle className="h-4 w-4 text-green-600 mx-auto" /> : <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div>
                                            <Image src={result.plot} alt={`Plots for ${variable}`} width={800} height={400} className="w-full rounded-md border" />
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
            
            {/* Modals */}

            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
        </div>
    );
}

