'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, BarChart as BarChartIcon, Settings, FileSearch, Users, CheckCircle, AlertTriangle, HelpCircle, Lightbulb, TrendingUp, Target, Layers, BookOpen, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, XCircle, Code, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../../ui/label';
import { Skeleton } from '../../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { BarChart3 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';



const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/anova.py?alt=media";



const metricDefinitions: Record<string, string> = {
    "F-Statistic": "The F-statistic is the ratio of between-group variance to within-group variance. Larger values indicate that group means differ more than would be expected by chance alone.",
    "P-Value": "The probability of observing an F-statistic this large (or larger) if there were no true differences between groups. Values below 0.05 typically indicate statistical significance.",
    "Degrees of Freedom": "df represents the number of independent values that can vary. For ANOVA: df_between = k-1 (groups minus one), df_within = N-k (total observations minus groups).",
    "Eta-Squared (η²)": "Proportion of total variance in the dependent variable explained by group membership. 0.01 = small, 0.06 = medium, 0.14 = large effect.",
    "Omega-Squared (ω²)": "An unbiased estimate of effect size that corrects for sample size inflation. More conservative than eta-squared and preferred for population estimates.",
    "Sum of Squares (SS)": "Total variation in the data. SSB (between) measures variation due to group differences, SSW (within) measures variation within groups, SST (total) = SSB + SSW.",
    "Mean Square (MS)": "Average squared deviation. MS = SS/df. MSB measures between-group variance, MSW measures within-group (error) variance. F = MSB/MSW.",
    "Between-Group Variance": "Variation in the dependent variable explained by differences between group means. Large between-group variance relative to within-group variance indicates real group differences.",
    "Within-Group Variance": "Variation in the dependent variable within each group (error variance). Represents individual differences and measurement error.",
    "Homogeneity of Variance": "Assumption that all groups have equal population variances. Tested using Levene's or Brown-Forsythe tests. Violation suggests using Welch's ANOVA.",
    "Levene's Test": "Tests whether group variances are equal. Non-significant result (p > .05) supports homogeneity assumption. Sensitive to non-normality.",
    "Brown-Forsythe Test": "A robust variant of Levene's test that uses medians instead of means. Less sensitive to non-normality, preferred over standard Levene's test.",
    "Welch's ANOVA": "A robust alternative to standard ANOVA that does not assume equal variances. Uses adjusted degrees of freedom. Recommended when homogeneity is violated.",
    "Normality Assumption": "ANOVA assumes the dependent variable is normally distributed within each group. With large samples (n > 30 per group), ANOVA is robust to violations.",
    "Shapiro-Wilk Test": "Tests whether data within each group is normally distributed. Non-significant result (p > .05) supports normality. Note: Very sensitive with large samples.",
    "Post-Hoc Tests": "Follow-up pairwise comparisons performed after a significant ANOVA to determine which specific groups differ. Control for inflated Type I error from multiple tests.",
    "Tukey's HSD": "Post-hoc test for all pairwise comparisons. Assumes equal variances. Controls family-wise error rate. Honest Significant Difference = honestly reports which pairs differ.",
    "Games-Howell": "Post-hoc test that does not assume equal variances or equal sample sizes. Recommended when homogeneity assumption is violated. More conservative than Tukey.",
    "Null Hypothesis": "H₀: μ₁ = μ₂ = μ₃ = ... = μₖ. All group population means are equal. ANOVA tests whether to reject this hypothesis.",
    "Alternative Hypothesis": "H₁: At least one group mean differs from the others. Does not specify which groups differ (that's what post-hoc tests determine).",
    "Alpha Level": "Significance threshold (typically α = 0.05). The probability of Type I error. With multiple groups, post-hoc tests use adjusted alpha to control family-wise error.",
    "Type I Error": "False positive - concluding groups differ when they actually don't. ANOVA controls this better than multiple t-tests. Post-hoc corrections further control error rate.",
    "Type II Error": "False negative - failing to detect real group differences. Related to statistical power. Increases with small effect sizes or small sample sizes.",
    "Statistical Power": "Probability of detecting true group differences. Affected by effect size, sample size, and alpha level. Aim for 80%+ power in study design.",
    "Effect Size": "Standardized measure of difference magnitude independent of sample size. For ANOVA: η² and ω². Unlike p-values, indicates practical significance.",
    "Multiple Comparisons": "When comparing many group pairs, the chance of finding at least one false positive increases. Post-hoc tests adjust p-values to control this inflation.",
    "Family-Wise Error Rate": "Probability of making at least one Type I error across all comparisons. Post-hoc tests (Tukey, Games-Howell) control this rate at the desired alpha level.",
    "Bonferroni Correction": "Conservative method that divides alpha by number of comparisons. Controls family-wise error but may be too stringent, reducing power.",
    "Pairwise Comparisons": "Individual comparisons between two groups. ANOVA with k groups yields k(k-1)/2 possible pairs. Post-hoc tests determine which pairs significantly differ.",
    "Confidence Interval": "Range of plausible values for the true mean difference between groups. 95% CI that excludes zero indicates significant difference at α = 0.05.",
    "Robust Statistics": "Methods less sensitive to assumption violations. Examples: Welch's ANOVA (unequal variances), Games-Howell (unequal variances), trimmed means (outliers).",
    "Variance Components": "ANOVA partitions total variance into between-group and within-group components. Helps understand how much variation is explained by grouping variable vs. individual differences."
};


// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - One-Way ANOVA"
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
        link.download = 'anova.py';
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

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        One-Way ANOVA Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in one-way ANOVA analysis
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


interface AnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
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

const getEffectSizeInterpretation = (eta_squared: number) => {
    if (eta_squared >= 0.14) return 'Large';
    if (eta_squared >= 0.06) return 'Medium';
    if (eta_squared >= 0.01) return 'Small';
    return 'Negligible';
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: any }) => {
    const isSignificant = results.anova.p_value <= 0.05;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">F-Statistic</p><BarChartIcon className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.anova.f_statistic.toFixed(3)}</p><p className="text-xs text-muted-foreground">Test Statistic</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${isSignificant ? '' : 'text-red-600 dark:text-red-400'}`}>{results.anova.p_value < 0.001 ? '<0.001' : results.anova.p_value.toFixed(4)}</p><p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">η² (Eta)</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.anova.eta_squared.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(results.anova.eta_squared)} effect</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">ω² (Omega)</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.anova.omega_squared?.toFixed(3) ?? 'N/A'}</p><p className="text-xs text-muted-foreground">Unbiased effect</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">df (Between)</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.anova.df_between}</p><p className="text-xs text-muted-foreground">Degrees of Freedom</p></div></CardContent></Card>
        </div>
    );
};


// One-Way ANOVA Analysis Guide Component
const AnovaGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">One-Way ANOVA Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is One-Way ANOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sigma className="w-4 h-4" />
                What is One-Way ANOVA?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                One-Way ANOVA (Analysis of Variance) compares the <strong>means of three or more independent groups</strong> 
                to determine if at least one group mean is significantly different from the others. It's an extension of the 
                independent samples t-test for multiple groups.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Common Use Cases:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Compare test scores across 3+ teaching methods<br/>
                    • Compare sales performance across multiple regions<br/>
                    • Compare customer satisfaction across different products<br/>
                    • Compare treatment outcomes across multiple drug dosages
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Hypotheses */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Hypotheses
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Null Hypothesis (H₀)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All group population means are equal: <strong>μ₁ = μ₂ = μ₃ = ... = μₖ</strong>
                    <br/>Example: &quot;Average satisfaction is the same across all product lines&quot;
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Alternative Hypothesis (H₁)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    At least one group mean differs from the others.
                    <br/><strong>Note:</strong> ANOVA doesn't tell you which groups differ — that's what post-hoc tests are for.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* How ANOVA Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChartIcon className="w-4 h-4" />
                How ANOVA Works
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Variance Partitioning</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ANOVA partitions total variance into two components:
                    <br/>• <strong>Between-group variance (SSB):</strong> Variation due to group differences
                    <br/>• <strong>Within-group variance (SSW):</strong> Variation within groups (error)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">F-Statistic</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Formula:</strong> F = MSB / MSW (Mean Square Between / Mean Square Within)
                    <br/>• Large F → Groups differ more than expected by chance
                    <br/>• F ≈ 1 → Between-group variance similar to within-group variance
                  </p>
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
                  <p className="font-medium text-sm">P-value</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Probability of observing this F-statistic if H₀ is true.
                    <br/><strong>p &lt; 0.05:</strong> Significant — at least one group differs
                    <br/><strong>p ≥ 0.05:</strong> Not significant — no evidence groups differ
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Eta-Squared (η²) — Effect Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of total variance explained by group membership.
                    <br/><strong>Formula:</strong> η² = SSB / SST
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
                  <p className="font-medium text-sm">Omega-Squared (ω²)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unbiased estimate of effect size (less prone to overestimation than η²).
                    <br/>Preferred for population estimates, especially with small samples.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Assumptions
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">1. Independence</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Observations must be independent within and between groups.
                    <br/>Each participant/unit appears in only one group.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Continuous Dependent Variable</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The outcome variable should be measured on an interval or ratio scale.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">3. Normality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each group should be approximately normally distributed.
                    <br/><strong>However:</strong> Robust with n ≥ 30 per group (Central Limit Theorem).
                    <br/><strong>Check:</strong> Shapiro-Wilk test (p &gt; 0.05 = assumption met)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">4. Homogeneity of Variance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All groups should have equal population variances.
                    <br/><strong>Check:</strong> Levene&apos;s or Brown-Forsythe test (p &gt; 0.05 = equal variances)
                    <br/><strong>If violated:</strong> Use Welch&apos;s ANOVA and Games-Howell post-hoc
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Post-Hoc Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Post-Hoc Tests
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                After a significant ANOVA, post-hoc tests determine <strong>which specific groups</strong> differ.
                They control for inflated Type I error from multiple comparisons.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Tukey&apos;s HSD</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Assumes equal variances
                    <br/>• All pairwise comparisons
                    <br/>• Controls family-wise error rate
                    <br/>• Use when: Levene&apos;s p &gt; 0.05
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Games-Howell</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Does NOT assume equal variances
                    <br/>• More conservative
                    <br/>• Use when: Levene&apos;s p ≤ 0.05
                    <br/>• Recommended with unequal n
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Standard vs Welch's ANOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Standard vs Welch&apos;s ANOVA
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Standard ANOVA</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Assumes equal variances
                    <br/>• More statistical power when assumption met
                    <br/>• Use with: Tukey&apos;s HSD post-hoc
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Welch&apos;s ANOVA</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Does NOT assume equal variances
                    <br/>• Adjusts degrees of freedom
                    <br/>• Use with: Games-Howell post-hoc
                    <br/>• Recommended when variances unequal
                  </p>
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
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ensure groups are truly independent</li>
                    <li>• Aim for n ≥ 20 per group</li>
                    <li>• Check for outliers</li>
                    <li>• Verify measurement scale is continuous</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA Style)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <em>F</em>(df<sub>b</sub>, df<sub>w</sub>) = X.XX, <em>p</em> = .XXX, η² = .XX</li>
                    <li>• Include M and SD for each group</li>
                    <li>• Report post-hoc results for significant pairs</li>
                    <li>• Note if Welch&apos;s correction was used</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Running multiple t-tests instead (inflates Type I error)</li>
                    <li>• Ignoring assumption violations</li>
                    <li>• Only reporting p-value without effect size</li>
                    <li>• Not conducting post-hoc tests after significant ANOVA</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Only 2 groups → Independent T-Test</li>
                    <li>• Same subjects in all conditions → Repeated Measures ANOVA</li>
                    <li>• Multiple independent variables → Two-Way ANOVA</li>
                    <li>• Non-normal data with small n → Kruskal-Wallis</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> A significant ANOVA only tells you that 
                <strong> at least one group differs</strong> — it doesn&apos;t tell you which ones. Always follow up with 
                post-hoc tests (Tukey or Games-Howell) to identify specific group differences. Report both 
                statistical significance (p-value) and practical significance (η² or ω²).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};
// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'one-way-anova');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Sigma className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">One-Way ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare means across three or more independent groups
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Groups</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test 3+ groups simultaneously
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">F-Test & Welch</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Standard & robust alternatives
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Post-Hoc Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Tukey HSD & Games-Howell
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
                            Compare a continuous variable across 3+ categories. Controls Type I error better than multiple t-tests.
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
                                        <span><strong>Independent variable:</strong> Categorical (3+ groups)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Dependent variable:</strong> Continuous numeric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 5 per group</span>
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
                                        <span><strong>F-statistic:</strong> Variance ratio between groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Effect sizes:</strong> η² and ω²</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Post-hoc:</strong> Which pairs differ</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {anovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(anovaExample)} size="lg">
                                <Sigma className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default function AnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onGenerateReport }: AnovaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVar, setDependentVar] = useState<string>('');
    const [independentVar, setIndependentVar] = useState<string>('');
    
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const multiGroupCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size >= 3);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && multiGroupCategoricalHeaders.length > 0, [data, numericHeaders, multiGroupCategoricalHeaders]);

    const numGroups = useMemo(() => {
        if (!independentVar || data.length === 0) return 0;
        return new Set(data.map(row => row[independentVar]).filter(v => v != null && v !== '')).size;
    }, [data, independentVar]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'Independent variable selected', passed: independentVar !== '', detail: independentVar || 'Select a grouping variable' });
        checks.push({ label: 'Dependent variable selected', passed: dependentVar !== '', detail: dependentVar || 'Select a numeric variable' });
        checks.push({ label: 'At least 3 groups', passed: numGroups >= 3, detail: `${numGroups} groups found` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 15, detail: `n = ${data.length} (recommended: 15+)` });
        
        const avgPerGroup = numGroups > 0 ? Math.floor(data.length / numGroups) : 0;
        checks.push({ label: 'Sufficient per group', passed: avgPerGroup >= 5, detail: `~${avgPerGroup} per group (recommended: 5+)` });
        
        return checks;
    }, [independentVar, dependentVar, numGroups, data]);

    const allValidationsPassed = useMemo(() => {
        return independentVar !== '' && dependentVar !== '' && numGroups >= 3;
    }, [independentVar, dependentVar, numGroups]);

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            setDependentVar(numericHeaders[0] || '');
            setIndependentVar(multiGroupCategoricalHeaders[0] || categoricalHeaders[0] || '');
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, categoricalHeaders, multiGroupCategoricalHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ANOVA_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const results = analysisResult.results;
        let csvContent = "ONE-WAY ANOVA RESULTS\n";
        csvContent += `Independent: ${independentVar}\nDependent: ${dependentVar}\n\n`;
        csvContent += Papa.unparse([{ 
            F: results.anova.f_statistic, 
            p: results.anova.p_value, 
            eta_sq: results.anova.eta_squared, 
            omega_sq: results.anova.omega_squared,
            df_between: results.anova.df_between, 
            df_within: results.anova.df_within 
        }]) + "\n\n";
        if (results.descriptives) {
            csvContent += "DESCRIPTIVES\n";
            const descData = Object.entries(results.descriptives).map(([g, s]: [string, any]) => ({ 
                group: g, n: s.n, mean: s.mean, std: s.std, se: s.se, 
                ci_lower: s.ci_lower, ci_upper: s.ci_upper 
            }));
            csvContent += Papa.unparse(descData) + "\n";
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ANOVA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, independentVar, dependentVar, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!independentVar || !dependentVar) {
            toast({ variant: 'destructive', title: 'Please select both variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/anova`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, independentVar, dependentVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, independentVar, dependentVar, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/anova-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    independentVar,
                    dependentVar,
                    numGroups,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `ANOVA_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, independentVar, dependentVar, numGroups, data.length, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const { results, plot } = analysisResult || {};

    // Helper to get post-hoc data (new structure)
    const getPostHocTukey = () => results?.post_hoc?.tukey || results?.post_hoc_tukey || [];
    const getPostHocGamesHowell = () => results?.post_hoc?.games_howell || [];
    const getRecommendedPostHoc = () => results?.post_hoc?.recommended || 'tukey';

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
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">One-Way ANOVA</h1>
                    <p className="text-muted-foreground mt-1">Compare means across groups</p>
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
            
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
            
            <AnovaGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    
            <ProgressBar />
            
            <div className="min-h-[500px]">
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose independent and dependent variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Independent Variable (Groups)</Label>
                                    <Select value={independentVar} onValueChange={setIndependentVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select grouping variable..." /></SelectTrigger>
                                        <SelectContent>{multiGroupCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    {numGroups > 0 && <Badge variant="outline">{numGroups} groups</Badge>}
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Dependent Variable (Values)</Label>
                                    <Select value={dependentVar} onValueChange={setDependentVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select numeric variable..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Review ANOVA configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Independent Variable:</strong> {independentVar || 'Not selected'} ({numGroups} groups)</p>
                                    <p>• <strong className="text-foreground">Dependent Variable:</strong> {dependentVar || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Test Type:</strong> One-Way ANOVA + Welch's ANOVA</p>
                                    <p>• <strong className="text-foreground">Post-Hoc:</strong> Tukey's HSD + Games-Howell</p>
                                    <p>• <strong className="text-foreground">Effect Sizes:</strong> η² (Eta-squared) + ω² (Omega-squared)</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About This Analysis</h4>
                                <p className="text-sm text-muted-foreground">This analysis includes both standard ANOVA and Welch's ANOVA (robust to unequal variances). Post-hoc tests include Tukey HSD (equal variances) and Games-Howell (unequal variances). The recommended test is automatically selected based on homogeneity of variance.</p>
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
                                <Sigma className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">ANOVA will test if there are significant differences among the {numGroups} group means.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run ANOVA<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const isSignificant = results.anova.p_value < 0.05;
                    const effectSize = results.anova.eta_squared;
                    const omegaSq = results.anova.omega_squared;
                    const isGood = isSignificant && effectSize >= 0.06;
                    const postHocData = getPostHocTukey();
                    const sigPairs = postHocData.filter((t: any) => t.reject === true || t.reject === 'True').length || 0;
                    const totalPairs = postHocData.length || 0;
                    const pPct = (results.anova.p_value * 100).toFixed(1);
                    const effectPct = (effectSize * 100).toFixed(1);
                    
                    // 그룹별 통계
                    const groupStats = results.descriptives ? Object.entries(results.descriptives) : [];
                    const means = groupStats.map(([, s]: [string, any]) => s.mean);
                    const maxMean = Math.max(...means);
                    const minMean = Math.min(...means);
                    const highestGroup = groupStats.find(([, s]: [string, any]) => s.mean === maxMean)?.[0];
                    const lowestGroup = groupStats.find(([, s]: [string, any]) => s.mean === minMean)?.[0];

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>ANOVA: {dependentVar} by {independentVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings */}
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isSignificant 
                                                ? `Meaningful differences were found between groups. ${dependentVar} varies depending on ${independentVar}.`
                                                : `No statistically significant differences between groups. ${independentVar} and ${dependentVar} appear unrelated.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {effectSize >= 0.14 
                                                ? `The effect size is large (η² = ${effectSize.toFixed(3)}). ${independentVar} has a substantial practical impact on ${dependentVar}.`
                                                : effectSize >= 0.06 
                                                    ? `The effect size is medium (η² = ${effectSize.toFixed(3)}). ${independentVar} has a moderate impact on ${dependentVar}.`
                                                    : `The effect size is small (η² = ${effectSize.toFixed(3)}). Even if differences exist, practical significance is limited.`}
                                        </p></div>
                                        {highestGroup && lowestGroup && (
                                            <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                                <strong>{highestGroup}</strong> has the highest mean ({maxMean.toFixed(2)}), while <strong>{lowestGroup}</strong> has the lowest ({minMean.toFixed(2)}).
                                            </p></div>
                                        )}
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {sigPairs > 0 
                                                ? `Post-hoc tests found ${sigPairs} out of ${totalPairs} comparisons showed significant differences.`
                                                : `Post-hoc tests found no significant differences between any group pairs.`}
                                        </p></div>
                                    </div>
                                </div>

                                {/* Conclusion Card */}
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Group Differences Confirmed!" : isSignificant ? "Differences Exist but Effect is Small" : "No Significant Differences"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood ? "Consider different strategies or approaches for each group." : isSignificant ? "Statistically significant but review practical implications." : "All groups can be treated similarly."}
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
                                        <p>• <strong>F-statistic:</strong> {results.anova.f_statistic.toFixed(2)} — Indicates how much between-group variation exceeds within-group variation. Larger values mean clearer group differences.</p>
                                        <p>• <strong>p-value:</strong> {results.anova.p_value < 0.001 ? '< 0.001' : results.anova.p_value.toFixed(4)} — {isSignificant 
                                            ? `The probability this difference occurred by chance is only ${pPct}%. Below 5%, so statistically significant.`
                                            : `The probability this difference occurred by chance is ${pPct}%. Above 5%, so cannot rule out chance.`}</p>
                                        <p>• <strong>Effect Size (η²):</strong> {effectSize.toFixed(3)} — {independentVar} explains {effectPct}% of variance in {dependentVar}. {effectSize >= 0.14 ? 'Above 14% is a large effect.' : effectSize >= 0.06 ? '6-14% is a medium effect.' : 'Below 6% is a small effect.'}</p>
                                        {omegaSq !== undefined && <p>• <strong>Omega-squared (ω²):</strong> {omegaSq.toFixed(3)} — Unbiased estimate of effect size (less prone to overestimation than η²).</p>}
                                    </div>
                                </div>

                                {/* Effect Quality Stars */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Effect Quality:</span>
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

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (() => {
                    const isSignificant = results.anova.p_value < 0.05;
                    const effectSize = results.anova.eta_squared;
                    const postHocData = getPostHocTukey();
                    const sigPairs = postHocData.filter((t: any) => t.reject === true || t.reject === 'True') || [];
                    const recommendedTest = getRecommendedPostHoc();
                    
                    // 가정 검정 결과
                    const normalityResults = results.assumptions?.normality || {};
                    const normalityPassed = Object.values(normalityResults).every((n: any) => n.normal === true || n.normal === null);
                    const homogeneityLevene = results.assumptions?.homogeneity?.levene || results.assumptions?.homogeneity;
                    const homogeneityBF = results.assumptions?.homogeneity?.brown_forsythe;
                    const variancesEqual = homogeneityBF?.equal_variances ?? homogeneityLevene?.equal_variances ?? true;
                    
                    // Welch's ANOVA 결과
                    const welchAnova = results.welch_anova;
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding ANOVA results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                {/* 1. How ANOVA Works */}
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How ANOVA Works</h4>
                                            <p className="text-sm text-muted-foreground">
                                                ANOVA compares the <strong className="text-foreground">variance between groups</strong> to the <strong className="text-foreground">variance within groups</strong>. 
                                                If between-group variance is much larger, groups likely have different means.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Assumption Tests */}
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div className="w-full">
                                            <h4 className="font-semibold mb-2">Assumption Checks</h4>
                                            <div className="space-y-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    {normalityPassed ? (
                                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                    )}
                                                    <span>
                                                        <strong className="text-foreground">Normality:</strong> {normalityPassed 
                                                            ? 'Data appears normally distributed within groups (Shapiro-Wilk p > .05).' 
                                                            : 'Some groups may not be normally distributed. ANOVA is robust to minor violations with large samples.'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {variancesEqual ? (
                                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                    )}
                                                    <span>
                                                        <strong className="text-foreground">Homogeneity of Variance:</strong> {variancesEqual 
                                                            ? `Group variances are equal (Brown-Forsythe p = ${homogeneityBF?.p_value?.toFixed(3) ?? homogeneityLevene?.levene_p_value?.toFixed(3) ?? 'N/A'} > .05). Standard ANOVA is appropriate.`
                                                            : `Group variances are unequal (Brown-Forsythe p = ${homogeneityBF?.p_value?.toFixed(3) ?? 'N/A'} < .05). Welch's ANOVA and Games-Howell are recommended.`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. F-Statistic Interpretation */}
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">F-Statistic & p-value</h4>
                                            <p className="text-sm text-muted-foreground">
                                                <strong className="text-foreground">F = {results.anova.f_statistic.toFixed(2)}</strong> (ratio of between/within variance). 
                                                {results.anova.f_statistic > 10 ? ' This large F indicates substantial group differences.' : results.anova.f_statistic > 3 ? ' This moderate F suggests some differences.' : ' This small F suggests minimal differences.'}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                <strong className="text-foreground">p = {results.anova.p_value < 0.001 ? '< .001' : results.anova.p_value.toFixed(4)}</strong> — 
                                                {isSignificant 
                                                    ? ' Below .05 threshold, meaning group differences are statistically significant.'
                                                    : ' Above .05 threshold, meaning we cannot conclude groups differ.'}
                                            </p>
                                            {!variancesEqual && welchAnova && (
                                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                                                    <strong>Welch's ANOVA:</strong> F = {welchAnova.f_statistic?.toFixed(2)}, p = {welchAnova.p_value < 0.001 ? '< .001' : welchAnova.p_value?.toFixed(4)} 
                                                    (robust to unequal variances)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Effect Size */}
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Effect Size Interpretation</h4>
                                            <p className="text-sm text-muted-foreground">
                                                <strong className="text-foreground">η² = {effectSize.toFixed(3)}</strong> — {independentVar} explains <strong className="text-foreground">{(effectSize * 100).toFixed(1)}%</strong> of the variance in {dependentVar}. 
                                                This is a <strong className="text-foreground">{getEffectSizeInterpretation(effectSize).toLowerCase()}</strong> effect.
                                            </p>
                                            {results.anova.omega_squared !== undefined && (
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    <strong className="text-foreground">ω² = {results.anova.omega_squared.toFixed(3)}</strong> — Unbiased estimate (corrects for sample size inflation).
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Post-Hoc Comparisons */}
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">5</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Post-Hoc Comparisons</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {sigPairs.length > 0 ? (
                                                    <>Significant pairs: {sigPairs.slice(0, 3).map((t: any, i: number) => (
                                                        <span key={i}><strong className="text-foreground">{t.group1} vs {t.group2}</strong>{i < Math.min(2, sigPairs.length - 1) ? ', ' : ''}</span>
                                                    ))}{sigPairs.length > 3 && ` and ${sigPairs.length - 3} more`}.</>
                                                ) : 'No individual pairs showed significant differences after correction for multiple comparisons.'}
                                            </p>
                                            <p className={`text-xs mt-2 ${recommendedTest === 'games_howell' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                                {recommendedTest === 'games_howell' 
                                                    ? '⚠ Games-Howell test recommended due to unequal variances.'
                                                    : "Tukey's HSD is appropriate for equal variances."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Line */}
                                <div className={`rounded-xl p-5 border ${isSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        The one-way ANOVA {isSignificant ? 'revealed significant' : 'did not reveal significant'} differences 
                                        among the {numGroups} groups (F({results.anova.df_between}, {results.anova.df_within}) = {results.anova.f_statistic.toFixed(2)}, 
                                        p {results.anova.p_value < 0.001 ? '< .001' : `= ${results.anova.p_value.toFixed(3)}`}, η² = {results.anova.eta_squared.toFixed(3)}, ω² = {results.anova.omega_squared?.toFixed(3) ?? 'N/A'}).
                                    </p>
                                </div>

                                {/* Effect Size Guide */}
                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Effect Size Guide (η²)</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt; 0.01</p><p className="text-muted-foreground">Negligible</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.01-0.06</p><p className="text-muted-foreground">Small</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.06-0.14</p><p className="text-muted-foreground">Medium</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt; 0.14</p><p className="text-muted-foreground">Large</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (() => {
                    const postHocTukey = getPostHocTukey();
                    const postHocGamesHowell = getPostHocGamesHowell();
                    const recommendedTest = getRecommendedPostHoc();
                    
                    return (
                    <>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">One-Way ANOVA Report</h2><p className="text-sm text-muted-foreground mt-1">IV: {independentVar} | DV: {dependentVar} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Missing Values Alert */}
                        {results.n_dropped !== undefined && results.n_dropped > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Missing Values</AlertTitle>
                                <AlertDescription>{results.n_dropped} row(s) excluded due to missing values.</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Detailed Analysis */}
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            A one-way analysis of variance (ANOVA) was conducted to compare the effect of {independentVar} on {dependentVar}. 
                                            The sample consisted of <em>N</em> = {data.length} observations across {numGroups} groups.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The main effect of {independentVar} was {results.anova.p_value < 0.05 ? 'statistically significant' : 'not statistically significant'}, 
                                            <span className="font-mono"> F({results.anova.df_between}, {results.anova.df_within}) = {results.anova.f_statistic.toFixed(2)}</span>, 
                                            <em> p</em> {results.anova.p_value < 0.001 ? '< .001' : `= ${results.anova.p_value.toFixed(3)}`}, 
                                            <em> η²</em> = {results.anova.eta_squared.toFixed(3)}, 
                                            <em> ω²</em> = {results.anova.omega_squared?.toFixed(3) ?? 'N/A'}.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The effect size (η² = {results.anova.eta_squared.toFixed(3)}) indicates a {getEffectSizeInterpretation(results.anova.eta_squared).toLowerCase()} effect, 
                                            suggesting that group membership explains {(results.anova.eta_squared * 100).toFixed(1)}% of the variance in {dependentVar}.
                                        </p>

                                        {results.assumptions?.homogeneity?.brown_forsythe && !results.assumptions.homogeneity.brown_forsythe.equal_variances && (
                                            <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400 mt-3">
                                                <strong>Note:</strong> Homogeneity of variances assumption was violated (Brown-Forsythe p = {results.assumptions.homogeneity.brown_forsythe.p_value?.toFixed(3)}). 
                                                Consider using Welch's ANOVA and Games-Howell post-hoc test results.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        {plot && (
                            <Card>
                                <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={plot} alt="ANOVA Visualization" width={1500} height={1200} className="w-3/4 rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

                        {/* Descriptive Statistics with 95% CI */}
                        {results.descriptives && (
                            <Card>
                                <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Group</TableHead><TableHead className="text-right">N</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">SD</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">95% CI</TableHead><TableHead className="text-right">Min</TableHead><TableHead className="text-right">Max</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.descriptives).map(([group, stats]: [string, any]) => (
                                                <TableRow key={group}>
                                                    <TableCell className="font-medium">{group}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.se.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">[{stats.ci_lower?.toFixed(2)}, {stats.ci_upper?.toFixed(2)}]</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.min.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.max.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* ANOVA Table */}
                        {results.anova.ssb !== undefined && (
                            <Card>
                                <CardHeader><CardTitle>ANOVA Table</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Source</TableHead><TableHead className="text-right">SS</TableHead><TableHead className="text-right">df</TableHead><TableHead className="text-right">MS</TableHead><TableHead className="text-right">F</TableHead><TableHead className="text-right">p</TableHead><TableHead className="text-right">η²</TableHead><TableHead className="text-right">ω²</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Between Groups</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.ssb.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.df_between}</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.msb.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.f_statistic.toFixed(3)}</TableCell>
                                                <TableCell className="text-right"><Badge variant={results.anova.p_value < 0.05 ? 'default' : 'outline'}>{results.anova.p_value < 0.001 ? '<.001' : results.anova.p_value.toFixed(3)}</Badge></TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.eta_squared.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.omega_squared?.toFixed(3) ?? 'N/A'}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Within Groups</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.ssw.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.df_within}</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.msw.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Total</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.sst.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.anova.df_total}</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Welch's ANOVA */}
                        {results.welch_anova && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        Welch's ANOVA
                                        <Badge variant="outline" className="text-xs">Robust to unequal variances</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>F</TableHead><TableHead className="text-right">df1</TableHead><TableHead className="text-right">df2</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-center">Sig.</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-mono">{results.welch_anova.f_statistic.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.welch_anova.df1.toFixed(0)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.welch_anova.df2.toFixed(2)}</TableCell>
                                                <TableCell className="text-right"><Badge variant={results.welch_anova.p_value < 0.05 ? 'default' : 'outline'}>{results.welch_anova.p_value < 0.001 ? '<.001' : results.welch_anova.p_value.toFixed(3)}</Badge></TableCell>
                                                <TableCell className="text-center">{results.welch_anova.significant ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">Use Welch's ANOVA when homogeneity of variance assumption is violated.</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Post-Hoc Tests */}
                        {(postHocTukey.length > 0 || postHocGamesHowell.length > 0) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        Post-Hoc Tests
                                        <Badge variant="secondary" className="text-xs">
                                            Recommended: {recommendedTest === 'games_howell' ? 'Games-Howell' : "Tukey's HSD"}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Tukey HSD */}
                                    {postHocTukey.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                Tukey's HSD
                                                <span className="text-xs font-normal text-muted-foreground">(assumes equal variances)</span>
                                                {recommendedTest === 'tukey' && <Badge variant="default" className="text-xs">Recommended</Badge>}
                                            </h4>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Group 1</TableHead><TableHead>Group 2</TableHead><TableHead className="text-right">Mean Diff</TableHead><TableHead className="text-right">95% CI</TableHead><TableHead className="text-right">p-adj</TableHead><TableHead className="text-center">Sig.</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {postHocTukey.map((test: any, idx: number) => {
                                                        const sig = test.reject === true || test.reject === 'True';
                                                        return (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-medium">{test.group1}</TableCell>
                                                                <TableCell className="font-medium">{test.group2}</TableCell>
                                                                <TableCell className="text-right font-mono">{parseFloat(test.meandiff).toFixed(3)}</TableCell>
                                                                <TableCell className="text-right font-mono">[{test.lower?.toFixed(2)}, {test.upper?.toFixed(2)}]</TableCell>
                                                                <TableCell className="text-right"><Badge variant={sig ? 'default' : 'outline'}>{test.p_adj < 0.001 ? '<.001' : parseFloat(test.p_adj).toFixed(3)}</Badge></TableCell>
                                                                <TableCell className="text-center">{sig ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                    
                                    {/* Games-Howell */}
                                    {postHocGamesHowell.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                Games-Howell
                                                <span className="text-xs font-normal text-muted-foreground">(does not assume equal variances)</span>
                                                {recommendedTest === 'games_howell' && <Badge variant="default" className="text-xs">Recommended</Badge>}
                                            </h4>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Group 1</TableHead><TableHead>Group 2</TableHead><TableHead className="text-right">Mean Diff</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">95% CI</TableHead><TableHead className="text-right">p-adj</TableHead><TableHead className="text-center">Sig.</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {postHocGamesHowell.map((test: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">{test.group1}</TableCell>
                                                            <TableCell className="font-medium">{test.group2}</TableCell>
                                                            <TableCell className="text-right font-mono">{test.meandiff.toFixed(3)}</TableCell>
                                                            <TableCell className="text-right font-mono">{test.se.toFixed(3)}</TableCell>
                                                            <TableCell className="text-right font-mono">[{test.ci_lower?.toFixed(2)}, {test.ci_upper?.toFixed(2)}]</TableCell>
                                                            <TableCell className="text-right"><Badge variant={test.reject ? 'default' : 'outline'}>{test.p_adj < 0.001 ? '<.001' : test.p_adj.toFixed(3)}</Badge></TableCell>
                                                            <TableCell className="text-center">{test.reject ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Assumption Checks */}
                        {results.assumptions && (
                            <Card>
                                <CardHeader><CardTitle>Assumption Checks</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Normality */}
                                    {results.assumptions.normality && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Normality (Shapiro-Wilk)</h4>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Group</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {Object.entries(results.assumptions.normality).map(([group, test]: [string, any]) => (
                                                        <TableRow key={group}>
                                                            <TableCell className="font-medium">{group}</TableCell>
                                                            <TableCell className="text-right font-mono">{test.statistic?.toFixed(4) ?? 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-mono">{test.p_value < 0.001 ? '<.001' : test.p_value?.toFixed(4)}</TableCell>
                                                            <TableCell className="text-center"><Badge variant={test.normal ? 'outline' : 'destructive'}>{test.normal ? 'Met' : 'Violated'}</Badge></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <p className="text-xs text-muted-foreground mt-2">p &gt; .05 indicates normality assumption is met.</p>
                                        </div>
                                    )}
                                    
                                    {/* Homogeneity of Variance */}
                                    {results.assumptions.homogeneity && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Homogeneity of Variance</h4>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {/* Levene's Test */}
                                                    {results.assumptions.homogeneity.levene && (
                                                        <TableRow>
                                                            <TableCell className="font-medium">Levene's Test</TableCell>
                                                            <TableCell className="text-right font-mono">{results.assumptions.homogeneity.levene.statistic?.toFixed(4) ?? 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-mono">{results.assumptions.homogeneity.levene.p_value < 0.001 ? '<.001' : results.assumptions.homogeneity.levene.p_value?.toFixed(4)}</TableCell>
                                                            <TableCell className="text-center"><Badge variant={results.assumptions.homogeneity.levene.equal_variances ? 'outline' : 'destructive'}>{results.assumptions.homogeneity.levene.equal_variances ? 'Met' : 'Violated'}</Badge></TableCell>
                                                        </TableRow>
                                                    )}
                                                    {/* Brown-Forsythe Test */}
                                                    {results.assumptions.homogeneity.brown_forsythe && (
                                                        <TableRow>
                                                            <TableCell className="font-medium">Brown-Forsythe</TableCell>
                                                            <TableCell className="text-right font-mono">{results.assumptions.homogeneity.brown_forsythe.statistic?.toFixed(4) ?? 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-mono">{results.assumptions.homogeneity.brown_forsythe.p_value < 0.001 ? '<.001' : results.assumptions.homogeneity.brown_forsythe.p_value?.toFixed(4)}</TableCell>
                                                            <TableCell className="text-center"><Badge variant={results.assumptions.homogeneity.brown_forsythe.equal_variances ? 'outline' : 'destructive'}>{results.assumptions.homogeneity.brown_forsythe.equal_variances ? 'Met' : 'Violated'}</Badge></TableCell>
                                                        </TableRow>
                                                    )}
                                                    {/* Legacy format support */}
                                                    {results.assumptions.homogeneity.levene_statistic !== undefined && !results.assumptions.homogeneity.levene && (
                                                        <TableRow>
                                                            <TableCell className="font-medium">Levene's Test</TableCell>
                                                            <TableCell className="text-right font-mono">{results.assumptions.homogeneity.levene_statistic?.toFixed(4) ?? 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-mono">{results.assumptions.homogeneity.levene_p_value < 0.001 ? '<.001' : results.assumptions.homogeneity.levene_p_value?.toFixed(4)}</TableCell>
                                                            <TableCell className="text-center"><Badge variant={results.assumptions.homogeneity.equal_variances ? 'outline' : 'destructive'}>{results.assumptions.homogeneity.equal_variances ? 'Met' : 'Violated'}</Badge></TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                p &gt; .05 indicates equal variances. If violated, use Welch's ANOVA and Games-Howell post-hoc test.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>
            
            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
                title="Python Code - One-Way ANOVA"
            />
        </div>
    );
}