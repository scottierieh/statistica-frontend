'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, HelpCircle, CheckCircle, AlertTriangle, TrendingUp, Target, Layers, BookOpen, BarChart3, Users, Activity, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, FileType, FileCode, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/kruskal_wallis.py?alt=media";

const kruskalWallisMetricDefinitions: Record<string, string> = {
    kruskal_wallis_test: "The Kruskal-Wallis test is a non-parametric method to compare three or more independent groups. It's the extension of the Mann-Whitney U test to multiple groups.",
    h_statistic: "The H statistic measures how much the rank sums differ across groups. It follows a chi-squared distribution with df = k-1, where k is the number of groups.",
    independent_groups: "Three or more groups where observations in one group do not influence observations in other groups. Each subject belongs to only one group.",
    rank_based_test: "Instead of using actual values, the test ranks all observations together, then compares how ranks are distributed across groups.",
    p_value: "The probability of obtaining results at least as extreme as observed, assuming all groups have the same distribution. Values below 0.05 indicate significant differences.",
    effect_size_epsilon_squared: "ε² measures the proportion of variance in ranks explained by group membership. It ranges from 0 to 1, indicating practical significance.",
    degrees_of_freedom: "df = k - 1, where k is the number of groups. For Kruskal-Wallis with 3 groups, df = 2. Used to determine critical values from chi-squared distribution.",
    chi_squared_distribution: "The H statistic approximately follows a chi-squared distribution, especially when each group has at least 5 observations.",
    null_hypothesis: "H₀: All groups come from the same distribution. There are no systematic differences in medians across groups.",
    alternative_hypothesis: "H₁: At least one group differs from the others. Not all groups have the same median.",
    non_parametric: "Makes no assumptions about data distribution (normality, equal variances). Works with ranks, so it's robust to outliers and skewed data.",
    anova_alternative: "Kruskal-Wallis is the non-parametric alternative to one-way ANOVA. Use when ANOVA assumptions (normality, homogeneity of variance) are violated.",
    median_comparison: "When group distributions have similar shapes, Kruskal-Wallis tests for differences in medians. It compares central tendencies without assuming normality.",
    tied_ranks: "When multiple observations have the same value, they receive the average of the ranks they would occupy. Excessive ties reduce test power.",
    post_hoc_tests: "If Kruskal-Wallis is significant, conduct pairwise comparisons (e.g., Dunn's test) to identify which specific groups differ.",
    assumptions: "Kruskal-Wallis assumes: (1) Independent observations, (2) Ordinal or continuous dependent variable, (3) Similar distribution shapes across groups (for median interpretation).",
    sample_size: "Minimum 5 observations per group recommended. With small samples (n < 5 per group), use exact tests. Larger samples increase statistical power.",
    statistical_power: "The probability of correctly detecting a true difference between groups. Larger sample sizes and bigger effect sizes increase power.",
    negligible_effect: "ε² < 0.01. Even if statistically significant, the practical difference between groups is minimal.",
    small_effect: "ε² between 0.01 and 0.06. Indicates weak practical differences between groups.",
    medium_effect: "ε² between 0.06 and 0.14. Noticeable, practically relevant differences between groups.",
    large_effect: "ε² > 0.14. Strong, substantial differences with clear practical significance.",
    robustness: "Kruskal-Wallis is robust to outliers, non-normality, and unequal variances, making it more reliable than ANOVA when assumptions are violated.",
    ordinal_data: "Data with ordered categories (e.g., Likert scales: strongly disagree to strongly agree). Kruskal-Wallis is appropriate for ordinal outcome variables.",
    multiple_comparisons: "Testing many pairwise comparisons increases Type I error risk. Use Bonferroni correction or Dunn's test to adjust p-values.",
    homogeneity_assumption: "For valid median interpretation, groups should have similar distribution shapes. If shapes differ, the test compares distributions broadly, not just medians.",
    type_i_error: "False positive - concluding groups differ when they actually don't. Controlled by alpha level (typically 5%).",
    type_ii_error: "False negative - failing to detect real group differences. Related to statistical power (1 - β).",
};



// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - Kruskal-Wallis Test"
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
        link.download = 'kruskal_wallis.py';
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


const KruskalWallisGlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Kruskal-Wallis Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in non-parametric multi-group comparison
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(kruskalWallisMetricDefinitions).map(([term, definition]) => (
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


interface KruskalWallisResults {
    statistic: number;
    p_value: number;
    effect_size: number;
    df: number;
    effect_size_interpretation?: { text: string; magnitude: string; };
    interpretation?: string | { decision?: string; conclusion?: string; };
    group_stats?: { [key: string]: { count?: number; n?: number; mean: number; median: number; std: number; }; };
}

interface FullAnalysisResponse {
    results: KruskalWallisResults;
    plot?: string;
    interpretations?: { overall_analysis: string; statistical_insights: string[]; recommendations: string; };
    n_dropped?: number;
    dropped_rows?: number[];
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

const getEffectSizeInterpretation = (epsilon_squared: number) => {
    if (epsilon_squared < 0.01) return "Negligible";
    if (epsilon_squared < 0.06) return "Small";
    if (epsilon_squared < 0.14) return "Medium";
    return "Large";
};

// Generate interpretations
const generateKruskalWallisInterpretations = (results: KruskalWallisResults, groupCol: string, valueCol: string) => {
    const insights: string[] = [];
    const isSignificant = results.p_value < 0.05;
    const effectSize = results.effect_size;
    const groupNames = results.group_stats ? Object.keys(results.group_stats) : [];
    const groupStats = results.group_stats ? Object.values(results.group_stats) : [];
    const numGroups = groupNames.length;
    
    let overall = '';
    if (isSignificant) {
        if (effectSize >= 0.14) {
            overall = `<strong>Highly significant differences with large effect.</strong> The Kruskal-Wallis test revealed significant differences (H = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) among ${numGroups} groups. Effect size ε² = ${results.effect_size.toFixed(3)} (large).`;
        } else if (effectSize >= 0.06) {
            overall = `<strong>Significant differences with medium effect.</strong> The Kruskal-Wallis test detected significant differences (H = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}). Effect size ε² = ${results.effect_size.toFixed(3)} (medium).`;
        } else {
            overall = `<strong>Statistically significant but small effect.</strong> The test identified significant differences (H = ${results.statistic.toFixed(3)}, p = ${results.p_value.toFixed(3)}), but the effect size (ε² = ${results.effect_size.toFixed(3)}) is small.`;
        }
    } else {
        overall = `<strong>No significant differences detected.</strong> The Kruskal-Wallis test found no significant differences (H = ${results.statistic.toFixed(3)}, df = ${results.df}, p = ${results.p_value.toFixed(3)}) among ${numGroups} groups.`;
    }
    
    insights.push(`<strong>H-Statistic:</strong> H = ${results.statistic.toFixed(3)}. Chi-squared distributed test statistic based on ranks across ${numGroups} groups.`);
    
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-value:</strong> p < 0.001 (highly significant). Very strong evidence against null hypothesis.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (significant at α = 0.05). Evidence suggests real differences.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (not significant). No statistical evidence of differences.`);
    }
    
    if (effectSize >= 0.14) {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (large effect). Substantial, meaningful differences.`);
    } else if (effectSize >= 0.06) {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (medium effect). Noticeable, practically relevant differences.`);
    } else if (effectSize >= 0.01) {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (small effect). Limited practical importance.`);
    } else {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (negligible effect). Very small differences.`);
    }
    
    if (groupStats.length >= 2) {
        const medians = groupStats.map(s => s.median);
        const maxMedian = Math.max(...medians);
        const minMedian = Math.min(...medians);
        const maxGroup = groupNames[medians.indexOf(maxMedian)];
        const minGroup = groupNames[medians.indexOf(minMedian)];
        insights.push(`<strong>Group Range:</strong> Medians range from ${minMedian.toFixed(2)} (${minGroup}) to ${maxMedian.toFixed(2)} (${maxGroup}).`);
    }
    
    let recommendations = '';
    if (!isSignificant && effectSize < 0.06) {
        recommendations = 'No meaningful differences detected. Consider increasing sample size or examining other grouping variables.';
    } else if (isSignificant && effectSize < 0.06) {
        recommendations = 'Statistically significant but small effect. Conduct post-hoc tests to identify which groups differ.';
    } else if (!isSignificant && effectSize >= 0.06) {
        recommendations = 'Medium to large effect but not significant - likely a power issue. Collect more data.';
    } else {
        recommendations = 'Significant differences with meaningful effect. Conduct post-hoc pairwise comparisons (Dunn\'s test).';
    }
    
    return { overall_analysis: overall, statistical_insights: insights, recommendations };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: KruskalWallisResults }) => {
    const isSignificant = results.p_value < 0.05;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">H-Statistic</p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.statistic.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">Test Statistic</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">P-value</p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!isSignificant ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            {results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Effect Size (ε²)</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.effect_size.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(results.effect_size)}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Degrees of Freedom</p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.df}</p>
                        <p className="text-xs text-muted-foreground">Groups - 1</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Kruskal-Wallis Analysis Guide Component
const KruskalWallisGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Kruskal-Wallis Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Kruskal-Wallis */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                What is the Kruskal-Wallis Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The Kruskal-Wallis test is a <strong>non-parametric</strong> alternative to one-way ANOVA. 
                It compares <strong>3 or more independent groups</strong> by ranking all observations together 
                and testing if rank distributions differ across groups.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Insight:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Think of it as an extension of the Mann-Whitney U test to multiple groups. 
                    Instead of comparing just 2 groups, you can compare 3, 4, 5, or more at once.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use This Test?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Use Kruskal-Wallis When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Comparing <strong>3+ independent groups</strong></li>
                    <li>• Data is <strong>not normally distributed</strong></li>
                    <li>• You have <strong>outliers</strong> in your data</li>
                    <li>• Data is <strong>ordinal</strong> (rankings, Likert scales)</li>
                    <li>• Sample sizes are unequal or small</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Use One-Way ANOVA Instead When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data is normally distributed in all groups</li>
                    <li>• Variances are similar across groups</li>
                    <li>• Large sample sizes (&gt;30 per group)</li>
                    <li>• You need maximum statistical power</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* How It Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                How the Test Works
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium text-sm">Combine & Rank All Data</p>
                    <p className="text-xs text-muted-foreground">Combine all observations from all groups and rank them from lowest to highest.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium text-sm">Sum Ranks per Group</p>
                    <p className="text-xs text-muted-foreground">Calculate the sum (or mean) of ranks for each group separately.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium text-sm">Calculate H Statistic</p>
                    <p className="text-xs text-muted-foreground">The H statistic (chi-squared distributed) compares observed vs expected rank distributions.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium text-sm">Determine Significance</p>
                    <p className="text-xs text-muted-foreground">If p &lt; 0.05, at least one group differs. Use post-hoc tests (Dunn&apos;s) to find which.</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Statistics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Key Statistics Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">H Statistic (Chi-squared)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The test statistic measuring how much rank sums deviate from expected values.
                    <br/><strong>Larger H</strong> = greater differences among groups.
                    <br/>df = k - 1 (where k = number of groups)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Effect Size (ε² - Epsilon Squared)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of variance in ranks explained by group membership.
                    <br/>Ranges from 0 to 1 — higher values = more variance explained.
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
                  <p className="font-medium text-sm">Median Comparison</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When groups have similarly shaped distributions, Kruskal-Wallis effectively 
                    compares medians. Report group medians alongside the test.
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
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Independence
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Observations must be independent. Each subject belongs to only one group.
                    <br/><em>For related/repeated measures, use Friedman test.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Ordinal or Continuous Data
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data must be at least ordinal (can be meaningfully ranked).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    3 or More Groups
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Need at least 3 independent groups.
                    <br/><em>For 2 groups, use Mann-Whitney U test.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Similar Distribution Shapes (for median interpretation)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If you want to interpret results as median differences, groups should have 
                    similarly shaped distributions. If shapes differ greatly, the test compares 
                    &quot;stochastic dominance&quot; rather than just medians.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Post-hoc Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Post-hoc Tests
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">If Kruskal-Wallis is Significant (p &lt; 0.05):</p>
                <p className="text-xs text-muted-foreground mt-2">
                  The test only tells you that <em>some</em> groups differ. To find out <em>which</em> ones:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Dunn&apos;s test:</strong> Most common post-hoc for Kruskal-Wallis</li>
                  <li>• <strong>Mann-Whitney U tests:</strong> Pairwise comparisons with Bonferroni correction</li>
                  <li>• <strong>Conover-Iman test:</strong> More powerful alternative to Dunn&apos;s</li>
                </ul>
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
                    Report: H, df, p-value, effect size (ε²)
                    <br/>Example: H(2) = 15.42, p = .001, ε² = .12
                    <br/>Include group medians and sample sizes
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Sample Size</p>
                  <p className="text-xs text-muted-foreground">
                    Minimum: 5 per group recommended
                    <br/>Ideal: 15+ total observations
                    <br/>More subjects = more power to detect differences
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Handling Ties</p>
                  <p className="text-xs text-muted-foreground">
                    When values are identical, they receive the average rank.
                    <br/>Many ties can reduce statistical power.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• 2 groups → Mann-Whitney U test</li>
                    <li>• Related samples → Friedman test</li>
                    <li>• Normal data, equal variances → ANOVA</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Kruskal-Wallis is about <strong>ranks</strong>, 
                not raw values. It&apos;s the go-to test when comparing 3+ groups with non-normal data or outliers. 
                Always report the effect size (ε²) alongside the p-value to show practical significance, 
                and use post-hoc tests (Dunn&apos;s) to identify which specific groups differ.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (example: ExampleDataSet) => void }) => {
    const kwExample = exampleDatasets.find(d => d.analysisTypes?.includes('kruskal-wallis'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <FlaskConical className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Kruskal-Wallis Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Non-parametric alternative to one-way ANOVA
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
                                    Compare 3+ independent groups
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Rank-Based</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Robust to outliers and skewed data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Effect Size (ε²)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Measures magnitude of differences
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
                            Non-parametric alternative to ANOVA. Use when data doesn't meet normality/homogeneity assumptions, is ordinal, or has outliers.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Grouping variable:</strong> Categorical with 3+ groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Outcome variable:</strong> Continuous or ordinal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independence:</strong> Observations are independent</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    What You'll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>H-statistic:</strong> Chi-squared based test statistic</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p-value:</strong> p &lt; 0.05 indicates significance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Effect size (ε²):</strong> Practical significance</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {kwExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(kwExample)} size="lg">
                                <FlaskConical className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


interface KruskalWallisPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function KruskalWallisPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: KruskalWallisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [groupCol, setGroupCol] = useState<string>('');
    const [valueCol, setValueCol] = useState<string>('');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
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
        if (!groupCol || data.length === 0) return 0;
        return new Set(data.map(row => row[groupCol]).filter(v => v != null && v !== '')).size;
    }, [data, groupCol]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'Group variable selected', 
            passed: groupCol !== '', 
            detail: groupCol ? `Group: ${groupCol}` : 'Select a grouping variable' 
        });
        
        checks.push({ 
            label: 'Value variable selected', 
            passed: valueCol !== '', 
            detail: valueCol ? `Value: ${valueCol}` : 'Select a value variable' 
        });
        
        checks.push({ 
            label: 'At least 3 groups', 
            passed: numGroups >= 3, 
            detail: `Found ${numGroups} groups (need at least 3)` 
        });
        
        checks.push({ 
            label: 'Adequate sample size', 
            passed: data.length >= 15, 
            detail: `n = ${data.length} (recommended: 15+)` 
        });
        
        return checks;
    }, [data, groupCol, valueCol, numGroups]);

    const allValidationsPassed = useMemo(() => {
        return dataValidation.filter(c => c.label !== 'Adequate sample size').every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0 || !canRun) {
            setView('intro');
        } else {
            setGroupCol(multiGroupCategoricalHeaders[0] || '');
            setValueCol(numericHeaders[0] || '');
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, multiGroupCategoricalHeaders, canRun]);

    const goToStep = (step: Step) => { 
        setCurrentStep(step); 
        if (step > maxReachedStep) setMaxReachedStep(step); 
    };
    
    const nextStep = () => { 
        if (currentStep === 3) { 
            handleAnalysis(); 
        } else if (currentStep < 6) { 
            goToStep((currentStep + 1) as Step); 
        } 
    };
    
    const prevStep = () => { 
        if (currentStep > 1) goToStep((currentStep - 1) as Step); 
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Kruskal_Wallis_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { 
            toast({ variant: 'destructive', title: "Download failed" }); 
        } finally { 
            setIsDownloading(false); 
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "KRUSKAL-WALLIS TEST\n";
        csvContent += `Group: ${groupCol}\nValue: ${valueCol}\n\n`;
        csvContent += `H Statistic: ${results.statistic}\ndf: ${results.df}\nP-value: ${results.p_value}\nEffect Size: ${results.effect_size}\n\n`;
        if (results.group_stats) {
            csvContent += "GROUP STATISTICS\n";
            const statsData = Object.entries(results.group_stats).map(([g, s]) => ({ Group: g, N: s.count || s.n, Mean: s.mean, Median: s.median, StdDev: s.std }));
            csvContent += Papa.unparse(statsData) + "\n";
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Kruskal_Wallis_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, groupCol, valueCol, toast]);

    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult?.results) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/kruskal-wallis-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult.results,
                groupCol,
                valueCol,
                sampleSize: data.length,
                numGroups
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Kruskal_Wallis_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, groupCol, valueCol, data.length, numGroups, toast]);



    const handleAnalysis = useCallback(async () => {
        if (!groupCol || !valueCol) {
            toast({ variant: "destructive", title: "Please select variables." });
            return;
        }
        
        const groups = new Set(data.map(row => row[groupCol]));
        if (groups.size < 3) {
            toast({ variant: 'destructive', title: 'Need at least 3 groups.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/kruskal-wallis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, group_col: groupCol, value_col: valueCol })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = 'Analysis failed';
                if (typeof errorResult.detail === 'string') {
                    errorMsg = errorResult.detail;
                } else if (Array.isArray(errorResult.detail)) {
                    errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                } else if (errorResult.error) {
                    errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                }
                throw new Error(errorMsg);
            }
            
            const result = await response.json();
            if (result.error) {
                const errMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
                throw new Error(errMsg);
            }
            
            result.interpretations = generateKruskalWallisInterpretations(result.results, groupCol, valueCol);
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Kruskal-Wallis Complete', description: 'Results are ready.' });

        } catch (e: any) {
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupCol, valueCol, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!analysisResult);
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
                    return (
                        <button 
                            key={step.id} 
                            onClick={() => isClickable && goToStep(step.id as Step)} 
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 transition-all ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 
                                ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
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
            <KruskalWallisGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <KruskalWallisGlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Kruskal-Wallis Test</h1>
                    <p className="text-muted-foreground mt-1">Non-parametric multi-group comparison</p>
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
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose group and value variables</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Group Variable (3+ categories)</Label>
                                    <Select value={groupCol} onValueChange={setGroupCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select grouping..." /></SelectTrigger>
                                        <SelectContent>{multiGroupCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    {numGroups > 0 && <Badge variant="outline">{numGroups} groups</Badge>}
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Value Variable (Numeric)</Label>
                                    <Select value={valueCol} onValueChange={setValueCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select value..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Test Settings</CardTitle>
                                    <CardDescription>Review Kruskal-Wallis configuration</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Group Variable:</strong> {groupCol || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Value Variable:</strong> {valueCol || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Number of Groups:</strong> {numGroups}</p>
                                    <p>• <strong className="text-foreground">Test Type:</strong> Kruskal-Wallis rank sum test</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />
                                    About the Test
                                </h4>
                                <p className="text-sm text-muted-foreground">Kruskal-Wallis is the non-parametric alternative to one-way ANOVA. It compares distributions across 3+ independent groups using ranks.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking if your data is ready</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
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
                                <FlaskConical className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">The test will rank all observations and compare rank distributions across groups.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run Test<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const isSignificant = results.p_value < 0.05;
                    const eps = results.effect_size;
                    const isGood = isSignificant && eps >= 0.06;
                    const groupStats = results.group_stats ? Object.entries(results.group_stats) : [];
                    
                    // Find highest and lowest median groups
                    let highestGroup = '', lowestGroup = '', highestMedian = -Infinity, lowestMedian = Infinity;
                    groupStats.forEach(([name, stats]) => {
                        if (stats.median > highestMedian) { highestMedian = stats.median; highestGroup = name; }
                        if (stats.median < lowestMedian) { lowestMedian = stats.median; lowestGroup = name; }
                    });
                    const medianDiff = highestMedian - lowestMedian;
                    const percentDiff = lowestMedian !== 0 ? ((medianDiff / lowestMedian) * 100).toFixed(0) : 'N/A';

                    // Business-friendly impact description
                    const getImpactDescription = () => {
                        if (eps >= 0.14) return "major";
                        if (eps >= 0.06) return "noticeable";
                        if (eps >= 0.01) return "minor";
                        return "minimal";
                    };

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>How {valueCol} differs across your {numGroups} groups</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : !isSignificant ? 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : !isSignificant ? 'text-rose-600' : 'text-amber-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : !isSignificant ? 'text-rose-600' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                {isSignificant 
                                                    ? <>Your groups show <strong>real differences</strong> in {valueCol} — this is not just random variation.</>
                                                    : <>Your groups appear <strong>similar</strong> in {valueCol} — any differences could be due to random chance.</>}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : !isSignificant ? 'text-rose-600' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>{highestGroup}</strong> has the highest typical value ({highestMedian.toFixed(1)}), 
                                                while <strong>{lowestGroup}</strong> has the lowest ({lowestMedian.toFixed(1)}) — 
                                                a gap of {percentDiff !== 'N/A' ? `${percentDiff}%` : medianDiff.toFixed(1)}.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : !isSignificant ? 'text-rose-600' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                The <strong>{getImpactDescription()}</strong> difference between groups means 
                                                {eps >= 0.06 
                                                    ? " the group you belong to makes a meaningful difference in outcomes."
                                                    : " knowing which group someone is in doesn't tell you much about their value."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : !isSignificant ? 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : !isSignificant ? <AlertTriangle className="w-6 h-6 text-rose-600" /> : <Info className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">
                                                {isGood 
                                                    ? "Group Matters! Take Action" 
                                                    : isSignificant 
                                                        ? "Small Differences — Consider Context" 
                                                        : "Groups Are Similar — No Action Needed"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? `The group someone belongs to significantly impacts their ${valueCol}. Consider tailoring strategies for each group.`
                                                    : isSignificant 
                                                        ? `While technically different, the gap between groups is small. A one-size-fits-all approach may still work.`
                                                        : `All groups perform similarly on ${valueCol}. Focus your attention on other factors that might make a difference.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Summary - kept simpler */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Confidence Level:</strong> {results.p_value < 0.001 ? 'Very High (99.9%+)' : results.p_value < 0.01 ? 'High (99%+)' : results.p_value < 0.05 ? 'Good (95%+)' : 'Low — differences may be random'}</p>
                                        <p>• <strong>Impact Size:</strong> {eps >= 0.14 ? 'Large — major practical importance' : eps >= 0.06 ? 'Medium — noticeable real-world effect' : eps >= 0.01 ? 'Small — limited practical impact' : 'Negligible — almost no practical difference'}</p>
                                        <p>• <strong>Groups Compared:</strong> {numGroups} groups with {data.length} total observations</p>
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Practical Impact:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = eps >= 0.14 ? 5 : eps >= 0.10 ? 4 : eps >= 0.06 ? 3 : eps >= 0.01 ? 2 : 1;
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
                {currentStep === 5 && results && analysisResult?.interpretations && (() => {
                    const groupStats = results.group_stats ? Object.entries(results.group_stats) : [];
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Lightbulb className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Why This Conclusion?</CardTitle>
                                        <CardDescription>Understanding Kruskal-Wallis results</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How the Test Works</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Kruskal-Wallis <strong className="text-foreground">ranks all observations</strong> across groups, 
                                                then tests if the rank distributions differ significantly. It's an extension of Mann-Whitney U to 3+ groups.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Your Groups Compared</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {groupStats.map(([name, stats], i) => (
                                                    <span key={name}>
                                                        <strong className="text-foreground">{name}</strong>: median = {stats.median.toFixed(2)}, n = {stats.count || stats.n}
                                                        {i < groupStats.length - 1 ? '; ' : '.'}
                                                    </span>
                                                ))}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Effect Size Interpretation</h4>
                                            <p className="text-sm text-muted-foreground">
                                                ε² = {results.effect_size.toFixed(3)} is considered <strong className="text-foreground">{getEffectSizeInterpretation(results.effect_size).toLowerCase()}</strong>. 
                                                {results.effect_size >= 0.06 
                                                    ? ' This represents practically meaningful differences.'
                                                    : ' The practical differences may be limited.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Recommendation</h4>
                                            <p className="text-sm text-muted-foreground">{analysisResult.interpretations.recommendations}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${results.p_value < 0.05 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: analysisResult.interpretations.overall_analysis }} />
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Effect Size Guide (ε²)</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt; 0.01</p><p className="text-muted-foreground">Negligible</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.01-0.06</p><p className="text-muted-foreground">Small</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.06-0.14</p><p className="text-muted-foreground">Medium</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt; 0.14</p><p className="text-muted-foreground">Large</p></div>
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

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && analysisResult && (() => {
                    const groupStats = results.group_stats ? Object.entries(results.group_stats) : [];
                    
                    return (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Statistical Details</h2>
                            <p className="text-sm text-muted-foreground">Full technical report</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    CSV Spreadsheet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                    PNG Image
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}>
                                    <FileType className="mr-2 h-4 w-4" />
                                    Word Document
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                    <Code className="mr-2 h-4 w-4" />
                                    Python Code
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Kruskal-Wallis Test Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">Group: {groupCol} | Value: {valueCol} | N = {data.length} | {new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Missing Values Alert */}
                        {analysisResult.n_dropped !== undefined && analysisResult.n_dropped > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Missing Values</AlertTitle>
                                <AlertDescription>{analysisResult.n_dropped} row(s) excluded due to missing values.</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Detailed Analysis - APA Format */}
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
                                            A Kruskal-Wallis test was conducted to compare {valueCol} across {numGroups} groups defined by {groupCol} 
                                            (<em>N</em> = {data.length}). The groups were: {groupStats.map(([name, stats], i) => (
                                                <span key={name}>{name} (<em>n</em> = {stats.count || stats.n}, <em>Mdn</em> = {stats.median.toFixed(2)}){i < groupStats.length - 1 ? ', ' : '.'}</span>
                                            ))}
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The test {results.p_value < 0.05 ? 'revealed statistically significant differences' : 'did not reveal statistically significant differences'} among the groups, 
                                            <span className="font-mono"> H({results.df}) = {results.statistic.toFixed(2)}</span>, 
                                            <em> p</em> {results.p_value < 0.001 ? '< .001' : `= ${results.p_value.toFixed(3)}`}, 
                                            <em> ε²</em> = {results.effect_size.toFixed(3)}.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The effect size (<em>ε²</em> = {results.effect_size.toFixed(3)}) indicates a {getEffectSizeInterpretation(results.effect_size).toLowerCase()} effect, 
                                            suggesting that group membership {results.effect_size >= 0.06 ? 'has a meaningful association with' : 'has limited practical impact on'} {valueCol}.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Descriptive Statistics Table */}
                        {results.group_stats && (
                            <Card>
                                <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Group</TableHead>
                                                <TableHead className="text-right">N</TableHead>
                                                <TableHead className="text-right">Mean</TableHead>
                                                <TableHead className="text-right">Median</TableHead>
                                                <TableHead className="text-right">Std. Dev</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.group_stats).map(([group, stats]) => (
                                                <TableRow key={group}>
                                                    <TableCell className="font-medium">{group}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.count || stats.n || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean?.toFixed(3) ?? 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.median?.toFixed(3) ?? 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std?.toFixed(3) ?? 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Visualization */}
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Visualization</CardTitle>
                                    <CardDescription>Distribution comparison</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={analysisResult.plot} alt="Kruskal-Wallis Visualization" width={1500} height={1200} className="w-3/4 rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

                        {/* Test Results Table */}
                        <Card>
                            <CardHeader><CardTitle>Test Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            <TableHead className="text-right">H Value</TableHead>
                                            <TableHead className="text-right">df</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">Effect Size (ε²)</TableHead>
                                            <TableHead className="text-center">Magnitude</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Kruskal-Wallis</TableCell>
                                            <TableCell className="text-right font-mono">{results.statistic.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.df}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={results.p_value < 0.05 ? 'default' : 'outline'}>
                                                    {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{results.effect_size.toFixed(3)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={results.effect_size >= 0.06 ? 'default' : 'secondary'}>
                                                    {results.effect_size_interpretation?.text || getEffectSizeInterpretation(results.effect_size)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">Effect size ε² = (H - k + 1) / (n - k)</p>
                            </CardFooter>
                        </Card>
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                    );
                })()}
            </div>
        </div>
    );
}