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
import { AlertTriangle, HelpCircle, Settings, FileSearch, BarChart, BookOpen, CheckCircle, Activity, TrendingUp, Target, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Scale, Layers, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/homogeneity_test.py?alt=media";

interface HomogeneityTestResult {
    levene_test: {
        statistic: number;
        p_value: number;
        df_between: number;
        df_within: number;
    };
    bartlett_test: {
        statistic: number;
        p_value: number;
        df: number;
    };
    descriptives: {
        [group: string]: {
            n: number;
            mean: number;
            variance: number;
            std_dev: number;
        };
    };
    assumption_met: boolean;
    interpretation: string;
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: HomogeneityTestResult;
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

// Statistical Terms Glossary for Homogeneity Test
const homogeneityMetricDefinitions: Record<string, string> = {
    homogeneity_of_variance: "The assumption that different groups have equal variances. Also called homoscedasticity. Required for valid ANOVA and t-test results.",
    heteroscedasticity: "The condition where groups have unequal variances. Violates assumptions of standard ANOVA and may require alternative tests like Welch's ANOVA.",
    variance: "A measure of data spread calculated as the average squared deviation from the mean. Larger variance indicates more dispersed data. Formula: σ² = Σ(x - μ)²/N.",
    standard_deviation: "The square root of variance, expressed in the same units as the original data. More interpretable than variance for understanding data spread.",
    levene_test: "A robust test for equality of variances that is less sensitive to departures from normality. Uses absolute deviations from group medians. Preferred when data may not be normally distributed.",
    bartlett_test: "A more powerful test for equality of variances that assumes data is normally distributed. Uses the χ² distribution. More sensitive to non-normality than Levene's test.",
    f_statistic: "The test statistic for Levene's test, calculated as the ratio of between-group variance to within-group variance of absolute deviations. Larger values indicate greater differences in variances.",
    chi_square: "The test statistic (χ²) for Bartlett's test. Based on the ratio of pooled variance to individual group variances. Follows a chi-square distribution under the null hypothesis.",
    degrees_of_freedom: "The number of independent values that can vary in a calculation. For Levene's test: df₁ = k-1 (between groups), df₂ = N-k (within groups), where k is number of groups.",
    p_value: "The probability of observing the test result (or more extreme) if variances are truly equal. p > 0.05 suggests equal variances; p ≤ 0.05 suggests unequal variances.",
    null_hypothesis: "H₀: All group variances are equal (σ₁² = σ₂² = ... = σₖ²). We fail to reject H₀ when p > α, concluding variances are homogeneous.",
    alternative_hypothesis: "H₁: At least one group variance differs from the others. We reject H₀ when p ≤ α, concluding variances are heterogeneous.",
    significance_level: "Alpha (α), typically 0.05. The threshold for deciding whether to reject the null hypothesis of equal variances.",
    variance_ratio: "The ratio of the largest group variance to the smallest. A common rule of thumb: ratios > 4 may indicate problematic heteroscedasticity.",
    welch_anova: "A modified ANOVA that does not assume equal variances. Uses weighted group means and adjusted degrees of freedom. Recommended when homogeneity assumption is violated.",
    pooled_variance: "A weighted average of group variances, used when variances are assumed equal. Gives more weight to larger groups.",
    box_plot: "A visual display showing median, quartiles, and outliers for each group. Useful for visually comparing spread (variance) across groups. Unequal box heights suggest unequal variances.",
    anova_assumption: "ANOVA assumes: (1) independence of observations, (2) normality of residuals, and (3) homogeneity of variances. Violation of #3 is tested by Levene's and Bartlett's tests.",
    robust_statistics: "Methods that are not heavily influenced by outliers or violations of assumptions. Levene's test is more robust than Bartlett's test to non-normality."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Homogeneity of Variances Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in variance homogeneity testing
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(homogeneityMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'homogeneity_test.py';
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
                        Python Code - Homogeneity of Variances Test
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
const StatisticalSummaryCards = ({ results }: { results: HomogeneityTestResult }) => {
    const isLeveneSignificant = results.levene_test.p_value <= 0.05;
    const totalN = Object.values(results.descriptives).reduce((sum, g) => sum + g.n, 0);
    const numGroups = Object.keys(results.descriptives).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Levene's F</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.levene_test.statistic.toFixed(3)}</p><p className={`text-xs ${isLeveneSignificant ? 'text-red-600' : 'text-muted-foreground'}`}>p = {results.levene_test.p_value < 0.001 ? '<.001' : results.levene_test.p_value.toFixed(4)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Bartlett's χ²</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.bartlett_test.statistic.toFixed(3)}</p><p className={`text-xs ${results.bartlett_test.p_value <= 0.05 ? 'text-red-600' : 'text-muted-foreground'}`}>p = {results.bartlett_test.p_value < 0.001 ? '<.001' : results.bartlett_test.p_value.toFixed(4)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Sample Size</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{totalN}</p><p className="text-xs text-muted-foreground">{numGroups} Groups</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Assumption</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${results.assumption_met ? 'text-green-600' : 'text-red-600'}`}>{results.assumption_met ? 'Met' : 'Violated'}</p><p className="text-xs text-muted-foreground">Homogeneity</p></div></CardContent></Card>
        </div>
    );
};

// Homogeneity of Variances Analysis Guide Component
// Homogeneity of Variances Analysis Guide Component
const HomogeneityGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Homogeneity of Variances Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Homogeneity of Variances */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                What is Homogeneity of Variances?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Homogeneity of variances (also called <strong>homoscedasticity</strong>) is the assumption that 
                different groups have <strong>equal variances</strong> — their data is spread out similarly.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why It Matters:</strong> ANOVA and t-tests assume equal variances. If violated, standard tests may give incorrect p-values. 
                  Use robust alternatives (Welch&apos;s ANOVA) when variances differ significantly.
                </p>
              </div>
            </div>

            <Separator />

            {/* The Two Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Two Homogeneity Tests
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Levene&apos;s Test (Recommended)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uses absolute deviations from group <strong>medians</strong>. 
                    Robust to non-normality — works well even if data isn&apos;t normally distributed.
                    F statistic: larger values indicate greater differences in variances.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Bartlett&apos;s Test</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uses the ratio of pooled variance to individual group variances.
                    More powerful when data is normally distributed, but sensitive to non-normality.
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <strong>When to use which?</strong> Default to <strong>Levene&apos;s test</strong> — it&apos;s more robust.
                  Use Bartlett&apos;s only if you&apos;re confident data is normally distributed.
                </p>
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
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    p &gt; 0.05 → Equal Variances
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fail to reject H₀. Variances are <strong>homogeneous</strong>.
                    Proceed with standard ANOVA or t-test.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    p ≤ 0.05 → Unequal Variances
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reject H₀. Variances are <strong>heterogeneous</strong>.
                    Use Welch&apos;s ANOVA or non-parametric tests.
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Unlike most hypothesis tests, we often <em>want</em> to fail to reject H₀ here.
                  Equal variances (p &gt; 0.05) is the desirable outcome for using standard parametric tests.
                </p>
              </div>
            </div>

            <Separator />

            {/* What If Violated */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                What If Homogeneity Is Violated?
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Option 1: Welch&apos;s ANOVA (Recommended)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A modified ANOVA that doesn&apos;t assume equal variances. Uses weighted group means 
                    and adjusted degrees of freedom. Often recommended by default.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Option 2: Non-Parametric Tests</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kruskal-Wallis test (for 3+ groups) or Mann-Whitney U (for 2 groups). 
                    These rank-based tests don&apos;t assume equal variances or normality.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Option 3: Data Transformation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Log, square root, or Box-Cox transformations may stabilize variances. 
                    Re-test homogeneity after transformation.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Variance Ratio Rule of Thumb */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Variance Ratio Rule of Thumb
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  <strong>Variance Ratio</strong> = Largest Group Variance / Smallest Group Variance
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted border border-border text-center">
                    <p className="font-medium">Ratio &lt; 2</p>
                    <p className="text-muted-foreground">No concern</p>
                  </div>
                  <div className="p-2 rounded bg-muted border border-border text-center">
                    <p className="font-medium">Ratio 2-4</p>
                    <p className="text-muted-foreground">Monitor</p>
                  </div>
                  <div className="p-2 rounded bg-muted border border-border text-center">
                    <p className="font-medium">Ratio &gt; 4</p>
                    <p className="text-muted-foreground">Problematic</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This heuristic complements formal tests. Even with non-significant p-values, 
                ratios &gt; 4 suggest caution is warranted.
              </p>
            </div>

            <Separator />

            {/* Visual Inspection */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Visual Inspection
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="font-medium text-sm">Box Plots</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Compare the <strong>height of boxes</strong> (IQR) across groups.
                  Similar heights → similar variances (homogeneous).
                  Very different heights → unequal variances (heterogeneous).
                  Also check for outliers that might inflate variance in some groups.
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Run This Test */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                When to Run This Test
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Run Before:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Independent samples t-test</li>
                    <li>• One-way ANOVA</li>
                    <li>• Two-way ANOVA</li>
                    <li>• ANCOVA</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Not Needed For:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Welch&apos;s t-test (already robust)</li>
                    <li>• Welch&apos;s ANOVA (already robust)</li>
                    <li>• Non-parametric tests (no assumption)</li>
                    <li>• Paired/repeated measures designs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Homogeneity of variances is a prerequisite assumption 
                for standard ANOVA and t-tests. If violated, don&apos;t panic — simply use Welch&apos;s version or 
                non-parametric alternatives. Many statisticians now recommend using Welch&apos;s ANOVA by default.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'iris');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Scale className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Homogeneity of Variances</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test if variances are equal across groups using Levene's and Bartlett's tests
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Equal Variances</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Verify groups have similar spread of data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Two Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Levene's (robust) & Bartlett's (powerful)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">ANOVA Assumption</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Essential check for parametric tests
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
                            Use before ANOVA or t-tests to verify variance equality across groups. 
                            If variances are unequal, use Welch's ANOVA instead of standard ANOVA.
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
                                        <span><strong>Numeric variable:</strong> One continuous measure</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Grouping variable:</strong> Categorical with 2+ groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Group size:</strong> At least 2 per group</span>
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
                                        <span><strong>p &gt; 0.05:</strong> Variances are equal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p ≤ 0.05:</strong> Variances differ</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Box plots:</strong> Visual comparison</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Scale className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface HomogeneityTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function HomogeneityTestPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: HomogeneityTestPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [valueVar, setValueVar] = useState<string | undefined>(undefined);
    const [groupVar, setGroupVar] = useState<string | undefined>(undefined);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    const groupInfo = useMemo(() => {
        if (!groupVar) return null;
        const groupCounts: Record<string, number> = {};
        data.forEach((row: any) => {
            const group = row[groupVar];
            if (group != null && group !== '') {
                groupCounts[group] = (groupCounts[group] || 0) + 1;
            }
        });
        return {
            count: Object.keys(groupCounts).length,
            sizes: groupCounts,
            minSize: Math.min(...Object.values(groupCounts)),
            maxSize: Math.max(...Object.values(groupCounts))
        };
    }, [data, groupVar]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'Value variable selected', passed: !!valueVar, detail: valueVar || 'Not selected' });
        checks.push({ label: 'Grouping variable selected', passed: !!groupVar, detail: groupVar || 'Not selected' });
        
        if (groupInfo) {
            checks.push({ label: 'At least 2 groups', passed: groupInfo.count >= 2, detail: `${groupInfo.count} group(s) found` });
            checks.push({ label: 'Minimum group size ≥ 2', passed: groupInfo.minSize >= 2, detail: `Smallest group has ${groupInfo.minSize} observations` });
        }
        
        checks.push({ label: 'Adequate sample size', passed: data.length >= 10, detail: `n = ${data.length} (recommended: 10+)` });
        
        return checks;
    }, [valueVar, groupVar, groupInfo, data]);

    const allValidationsPassed = useMemo(() => {
        return !!valueVar && !!groupVar && (groupInfo?.count ?? 0) >= 2 && (groupInfo?.minSize ?? 0) >= 2;
    }, [valueVar, groupVar, groupInfo]);

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            setValueVar(numericHeaders[0]);
            setGroupVar(categoricalHeaders[0]);
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Homogeneity_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const r = analysisResult.results;
        let csvContent = "HOMOGENEITY OF VARIANCES TEST\n\n";
        csvContent += "Test Results\n";
        csvContent += `Test,Statistic,p-value\n`;
        csvContent += `Levene's Test,${r.levene_test.statistic.toFixed(4)},${r.levene_test.p_value.toFixed(4)}\n`;
        csvContent += `Bartlett's Test,${r.bartlett_test.statistic.toFixed(4)},${r.bartlett_test.p_value.toFixed(4)}\n\n`;
        csvContent += "Descriptive Statistics\n";
        const tableData = Object.entries(r.descriptives).map(([group, stats]) => ({
            Group: group, N: stats.n, Mean: stats.mean.toFixed(3), Variance: stats.variance.toFixed(3), StdDev: stats.std_dev.toFixed(3)
        }));
        csvContent += Papa.unparse(tableData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Homogeneity_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/homogeneity-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    valueVar,
                    groupVar,
                    totalRows: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Homogeneity_Test_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, valueVar, groupVar, data.length, toast]);



    const handleAnalysis = useCallback(async () => {
        if (!valueVar || !groupVar) {
            toast({ variant: 'destructive', title: 'Please select both variables.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/homogeneity-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, valueVar, groupVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Analysis failed');
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
    }, [data, valueVar, groupVar, toast]);

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
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable}
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
            <HomogeneityGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Homogeneity of Variances</h1>
                    <p className="text-muted-foreground mt-1">Test if variances are equal across groups</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose value and grouping variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Value Variable (Numeric)</Label>
                                    <Select value={valueVar} onValueChange={setValueVar}>
                                        <SelectTrigger className="h-12"><SelectValue placeholder="Select variable" /></SelectTrigger>
                                        <SelectContent>
                                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The continuous variable to test for equal variances</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Grouping Variable (Categorical)</Label>
                                    <Select value={groupVar} onValueChange={setGroupVar}>
                                        <SelectTrigger className="h-12"><SelectValue placeholder="Select variable" /></SelectTrigger>
                                        <SelectContent>
                                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The categorical variable defining the groups</p>
                                </div>
                            </div>
                            
                            {groupInfo && (
                                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                                    <h4 className="font-medium text-sm flex items-center gap-2"><Layers className="w-4 h-4" />Group Information</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(groupInfo.sizes).map(([group, count]) => (
                                            <Badge key={group} variant="secondary">{group}: n={count}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!valueVar || !groupVar}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Review configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Value Variable:</strong> {valueVar}</p>
                                    <p>• <strong className="text-foreground">Grouping Variable:</strong> {groupVar} ({groupInfo?.count} groups)</p>
                                    <p>• <strong className="text-foreground">Tests:</strong> Levene's Test, Bartlett's Test</p>
                                    <p>• <strong className="text-foreground">Sample Size:</strong> {data.length} observations</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About These Tests</h4>
                                <p className="text-sm text-muted-foreground">
                                    <strong>Levene's Test</strong> is robust to non-normality - use when data may not be normally distributed. 
                                    <strong> Bartlett's Test</strong> is more powerful but assumes normality - use with normally distributed data.
                                </p>
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
                                <Scale className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will test if variance of <strong>{valueVar}</strong> is equal across <strong>{groupInfo?.count}</strong> groups of <strong>{groupVar}</strong>.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const isHomogeneous = results.assumption_met;
                    const levenePValue = results.levene_test.p_value;
                    const numGroups = Object.keys(results.descriptives).length;
                    const variances = Object.values(results.descriptives).map(g => g.variance);
                    const maxVar = Math.max(...variances);
                    const minVar = Math.min(...variances);
                    const varianceRatio = maxVar / minVar;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Homogeneity Test: {valueVar} by {groupVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isHomogeneous ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isHomogeneous ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isHomogeneous ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            The {numGroups} groups show <strong>{isHomogeneous ? 'similar' : 'different'}</strong> levels of variability.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isHomogeneous ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isHomogeneous 
                                                ? 'You can fairly compare these groups as they have consistent data spread.'
                                                : 'Comparisons between groups should account for their different variability levels.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isHomogeneous ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Variance ratio: <strong>{varianceRatio.toFixed(1)}x</strong> (largest vs smallest group).
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isHomogeneous ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isHomogeneous ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isHomogeneous ? "Groups Are Comparable" : "Caution Advised"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isHomogeneous 
                                                    ? "The data spread is consistent across groups. Standard ANOVA can be used safely."
                                                    : "Groups have unequal spread. Consider using Welch's ANOVA or non-parametric tests."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Business Implications */}
                                <div className="p-5 bg-muted/30 rounded-xl">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Business Implications</h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {isHomogeneous ? (
                                            <>
                                                <p>✓ <strong className="text-foreground">Reliable Comparisons:</strong> You can confidently compare average {valueVar} across different {groupVar} categories.</p>
                                                <p>✓ <strong className="text-foreground">Consistent Performance:</strong> All groups show similar consistency/predictability in their {valueVar} values.</p>
                                                <p>✓ <strong className="text-foreground">Fair Benchmarking:</strong> Setting uniform targets or thresholds across groups is appropriate.</p>
                                            </>
                                        ) : (
                                            <>
                                                <p>⚠ <strong className="text-foreground">Variable Performance:</strong> Some {groupVar} categories show more unpredictable {valueVar} than others.</p>
                                                <p>⚠ <strong className="text-foreground">Risk Assessment:</strong> Groups with higher variance may need different management strategies.</p>
                                                <p>⚠ <strong className="text-foreground">Tailored Targets:</strong> Consider setting group-specific benchmarks rather than uniform standards.</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Consistency Confidence:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = isHomogeneous ? (levenePValue > 0.2 ? 5 : levenePValue > 0.1 ? 4 : 3) : (levenePValue > 0.01 ? 2 : 1);
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
                    const isHomogeneous = results.assumption_met;
                    const levenePValue = results.levene_test.p_value;
                    const bartlettPValue = results.bartlett_test.p_value;
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding the test results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What We Tested</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We tested whether the spread (variance) of {valueVar} is the same across all {groupVar} categories.
                                                If P &gt; 0.05, variances are considered equal.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Levene's Test Result</h4>
                                            <p className="text-sm text-muted-foreground">
                                                F = {results.levene_test.statistic.toFixed(3)}, p = {levenePValue < 0.001 ? '<0.001' : levenePValue.toFixed(4)}.
                                                {levenePValue > 0.05 
                                                    ? ' Since p > 0.05, variances are statistically equal.'
                                                    : ' Since p ≤ 0.05, variances differ significantly.'}
                                                This test is robust even if data isn't perfectly normal.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Bartlett's Test Result</h4>
                                            <p className="text-sm text-muted-foreground">
                                                χ² = {results.bartlett_test.statistic.toFixed(3)}, p = {bartlettPValue < 0.001 ? '<0.001' : bartlettPValue.toFixed(4)}.
                                                {bartlettPValue > 0.05 
                                                    ? ' Confirms that variances are equal.'
                                                    : ' Confirms that variances differ.'}
                                                This test is more powerful but requires normally distributed data.
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
                                                {isHomogeneous 
                                                    ? 'Homogeneity assumption is met. You can proceed with standard ANOVA or t-tests for comparing group means.' 
                                                    : 'Homogeneity assumption is violated. Use Welch\'s ANOVA or Kruskal-Wallis test instead of standard ANOVA.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isHomogeneous ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {isHomogeneous ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />} Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isHomogeneous 
                                            ? `Both tests confirm equal variances (Levene p=${levenePValue.toFixed(3)}, Bartlett p=${bartlettPValue.toFixed(3)}). Standard parametric tests are appropriate.`
                                            : `Tests indicate unequal variances. Consider robust alternatives like Welch's ANOVA for reliable group comparisons.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />P-value Interpretation</h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">p &gt; 0.05</p><p className="text-muted-foreground">Equal Variances</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">p ≤ 0.05</p><p className="text-muted-foreground">Unequal Variances</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">p ≤ 0.01</p><p className="text-muted-foreground">Strong Evidence</p></div>
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
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full test results and visualization</p></div>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Homogeneity of Variances Report</h2><p className="text-sm text-muted-foreground mt-1">{valueVar} by {groupVar} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Assumption Status */}
                        <Alert variant={results.assumption_met ? 'default' : 'destructive'}>
                            {results.assumption_met ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
                            <AlertTitle>Assumption of Homogeneity {results.assumption_met ? "Met" : "Violated"}</AlertTitle>
                            <AlertDescription>{results.interpretation}</AlertDescription>
                        </Alert>

                        {/* Test Results */}
                        <Card>
                            <CardHeader><CardTitle>Test Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Test</TableHead>
                                            <TableHead className="text-right">Statistic</TableHead>
                                            <TableHead className="text-right">df</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-center">Significant?</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>
                                                <div><span className="font-medium">Levene's Test</span><p className="text-xs text-muted-foreground">Robust to non-normality</p></div>
                                            </TableCell>
                                            <TableCell className="font-mono text-right">F = {results.levene_test.statistic.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono text-right">({results.levene_test.df_between}, {results.levene_test.df_within})</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.p_value < 0.001 ? '<.001' : results.levene_test.p_value.toFixed(4)}</TableCell>
                                            <TableCell className="text-center"><Badge variant={results.levene_test.p_value <= 0.05 ? 'destructive' : 'outline'}>{results.levene_test.p_value <= 0.05 ? 'Yes' : 'No'}</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>
                                                <div><span className="font-medium">Bartlett's Test</span><p className="text-xs text-muted-foreground">More powerful for normal data</p></div>
                                            </TableCell>
                                            <TableCell className="font-mono text-right">χ² = {results.bartlett_test.statistic.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono text-right">{results.bartlett_test.df}</TableCell>
                                            <TableCell className="font-mono text-right">{results.bartlett_test.p_value < 0.001 ? '<.001' : results.bartlett_test.p_value.toFixed(4)}</TableCell>
                                            <TableCell className="text-center"><Badge variant={results.bartlett_test.p_value <= 0.05 ? 'destructive' : 'outline'}>{results.bartlett_test.p_value <= 0.05 ? 'Yes' : 'No'}</Badge></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        {results.plot && (
                            <Card>
                                <CardHeader><CardTitle>Box Plot Visualization</CardTitle></CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={results.plot} alt={`Box plot of ${valueVar} by ${groupVar}`} width={800} height={600} className="max-w-full rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

                        {/* Descriptive Statistics */}
                        <Card>
                            <CardHeader><CardTitle>Descriptive Statistics by Group</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Variance</TableHead>
                                            <TableHead className="text-right">Std. Deviation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.descriptives).map(([group, stats]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.variance.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">If p &gt; 0.05, variances are considered equal (homogeneous). Use standard ANOVA. If p ≤ 0.05, consider Welch's ANOVA.</p>
                            </CardFooter>
                        </Card>
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