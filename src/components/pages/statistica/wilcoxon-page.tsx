'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, HelpCircle, CheckCircle, AlertTriangle, TrendingUp, Target, Layers, BookOpen, BarChart3, Users, Activity, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, FileType, FileCode, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/wilcoxon.py?alt=media";


const wilcoxonMetricDefinitions: Record<string, string> = {
    wilcoxon_signed_rank: "The Wilcoxon Signed-Rank test is a non-parametric test that compares two related samples (paired observations) using ranks of differences.",
    w_statistic: "The W statistic is the smaller of the positive rank sum (W+) or negative rank sum (W-). It measures the magnitude of differences between paired observations.",
    paired_samples: "Two measurements taken from the same subjects or matched pairs. Each observation in one sample corresponds to exactly one observation in the other sample.",
    rank_of_differences: "Differences between pairs are ranked by their absolute value, ignoring the sign. Signs are then reapplied to compute positive and negative rank sums.",
    p_value: "The probability of obtaining results at least as extreme as observed, assuming no true difference exists. Values below 0.05 typically indicate statistical significance.",
    effect_size_r: "Effect size r measures the strength of the relationship. Calculated as Z / √N, it ranges from -1 to 1 and indicates practical significance.",
    w_plus: "W+ is the sum of ranks for pairs where the second measurement is larger than the first (positive differences). Indicates upward changes.",
    w_minus: "W- is the sum of ranks for pairs where the first measurement is larger than the second (negative differences). Indicates downward changes.",
    z_score: "For large samples (n > 20), the W statistic can be converted to a Z-score following a standard normal distribution. Used to calculate p-values.",
    null_hypothesis: "H₀: The median difference between paired observations is zero. There is no systematic change from the first to second measurement.",
    alternative_hypothesis: "H₁: The median difference is not zero. There is a systematic change (increase or decrease) between measurements.",
    two_tailed_test: "Tests for differences in either direction (increase or decrease). Most commonly used when the direction of change is unknown.",
    one_tailed_test: "Tests for differences in only one direction (only increase or only decrease). Use with strong theoretical justification.",
    non_parametric: "Non-parametric tests make no assumptions about the underlying distribution of data. They work with ranks instead of assuming normality.",
    paired_t_test_alternative: "Wilcoxon Signed-Rank is the non-parametric equivalent of the paired t-test. Use when normality assumptions are violated.",
    median_comparison: "When distributions have similar shapes, Wilcoxon tests for differences in medians. It's often interpreted as comparing central tendencies.",
    tied_ranks: "When differences have equal absolute values, they receive the average of the ranks they would have occupied. Excessive ties reduce test power.",
    zero_differences: "Pairs with zero difference (no change) are excluded from the analysis. Only pairs showing some change contribute to the test.",
    assumptions: "Wilcoxon assumes: (1) Paired/dependent observations, (2) Differences are continuous or ordinal, (3) Differences are symmetrically distributed around the median.",
    symmetry_assumption: "For valid inference about medians, the distribution of differences should be approximately symmetric. Severe skewness can affect interpretation.",
    pre_post_design: "Common study design where measurements are taken before and after an intervention on the same subjects. Ideal for Wilcoxon test.",
    repeated_measures: "When the same variable is measured multiple times on the same subjects. Wilcoxon can compare any two time points.",
    sample_size: "Minimum 6 pairs recommended for valid results. With n > 20, the test uses normal approximation (Z-score). Larger samples increase power.",
    statistical_power: "The probability of correctly detecting a true change. Larger sample sizes and bigger effect sizes increase statistical power.",
    small_effect: "Effect size |r| between 0.1 and 0.3. Indicates a weak relationship between time and outcome.",
    medium_effect: "Effect size |r| between 0.3 and 0.5. Indicates a moderate, practically noticeable change over time.",
    large_effect: "Effect size |r| above 0.5. Indicates a strong, substantial change with clear practical significance.",
    negligible_effect: "Effect size |r| below 0.1. Even if statistically significant, the practical change is minimal.",
    robustness: "Wilcoxon is robust to outliers and non-normal distributions, making it more reliable than paired t-test when assumptions are violated.",
    type_i_error: "False positive - concluding there is a change when there actually isn't. Controlled by alpha level (typically 5%).",
    type_ii_error: "False negative - failing to detect a real change. Related to statistical power (1 - β).",
};



// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - Wilcoxon Signed-Rank Test"
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
        link.download = 'wilcoxon.py';
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


const WilcoxonGlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Wilcoxon Signed-Rank Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in non-parametric paired comparison
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(wilcoxonMetricDefinitions).map(([term, definition]) => (
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


interface WilcoxonResults {
    statistic: number;
    p_value: number;
    effect_size: number;
    z_score?: number;
    effect_size_interpretation?: { text: string; magnitude: string; };
    W_plus?: number;
    W_minus?: number;
    n?: number;
    n_valid?: number;
    interpretation?: string | { decision?: string; conclusion?: string; };
    descriptive_stats?: { [key: string]: { n: number; mean: number; median: number; std: number; }; };
}

interface FullAnalysisResponse {
    results: WilcoxonResults;
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

const getEffectSizeInterpretation = (r: number) => {
    const absR = Math.abs(r);
    if (absR < 0.1) return "Negligible";
    if (absR < 0.3) return "Small";
    if (absR < 0.5) return "Medium";
    return "Large";
};

// Generate interpretations
const generateWilcoxonInterpretations = (results: WilcoxonResults, var1: string, var2: string) => {
    const insights: string[] = [];
    const isSignificant = results.p_value < 0.05;
    const absEffectSize = Math.abs(results.effect_size);
    const n = results.n || results.n_valid || 0;
    
    let overall = '';
    if (isSignificant) {
        if (absEffectSize >= 0.5) {
            overall = `<strong>Highly significant difference with large effect.</strong> The Wilcoxon test revealed a significant difference (W = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) between ${var1} and ${var2}. Effect size r = ${results.effect_size.toFixed(3)} (large).`;
        } else if (absEffectSize >= 0.3) {
            overall = `<strong>Significant difference with moderate effect.</strong> The Wilcoxon test detected a significant difference (W = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}). Effect size r = ${results.effect_size.toFixed(3)} (medium).`;
        } else {
            overall = `<strong>Statistically significant but small effect.</strong> The test identified a significant difference (W = ${results.statistic.toFixed(1)}, p = ${results.p_value.toFixed(3)}), but the effect size (r = ${results.effect_size.toFixed(3)}) is small.`;
        }
    } else {
        overall = `<strong>No significant difference detected.</strong> The Wilcoxon test found no statistically significant difference (W = ${results.statistic.toFixed(1)}, p = ${results.p_value.toFixed(3)}) between ${var1} and ${var2}.`;
    }
    
    insights.push(`<strong>W-Statistic:</strong> W = ${results.statistic.toFixed(1)}. Based on ranks of absolute differences between pairs.`);
    
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-value:</strong> p < 0.001 (highly significant). Very strong evidence against the null hypothesis.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (significant at α = 0.05). Evidence suggests a real difference.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (not significant). No statistical evidence of a difference.`);
    }
    
    if (absEffectSize >= 0.5) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (large effect). Substantial, meaningful difference.`);
    } else if (absEffectSize >= 0.3) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (medium effect). Noticeable, practically relevant difference.`);
    } else if (absEffectSize >= 0.1) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (small effect). Limited practical importance.`);
    } else {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (negligible effect). Very small difference.`);
    }
    
    if (results.W_plus !== undefined && results.W_minus !== undefined) {
        const direction = results.W_plus > results.W_minus ? 'increase' : 'decrease';
        insights.push(`<strong>Direction:</strong> W+ = ${results.W_plus.toFixed(1)}, W- = ${results.W_minus.toFixed(1)}. Predominant ${direction} from ${var1} to ${var2}.`);
    }
    
    let recommendations = '';
    if (!isSignificant && absEffectSize < 0.2) {
        recommendations = 'No meaningful difference detected. Consider increasing sample size or examining other variables.';
    } else if (isSignificant && absEffectSize < 0.3) {
        recommendations = 'Statistically significant but small effect. Assess practical significance in your domain.';
    } else if (!isSignificant && absEffectSize >= 0.3) {
        recommendations = 'Large effect size but not significant - likely a power issue. Collect more data.';
    } else {
        recommendations = 'Significant difference with meaningful effect size. Investigate what drives the change.';
    }
    
    return { overall_analysis: overall, statistical_insights: insights, recommendations };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: WilcoxonResults }) => {
    const isSignificant = results.p_value < 0.05;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">W-Statistic</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.statistic?.toFixed(1) ?? 'N/A'}</p><p className="text-xs text-muted-foreground">Test Statistic</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${!isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>{results.p_value != null ? (results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)) : 'N/A'}</p><p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Effect Size (r)</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.effect_size?.toFixed(3) ?? 'N/A'}</p><p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(results.effect_size)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{results.z_score != null ? 'Z-Score' : 'Sample Size'}</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.z_score != null ? results.z_score.toFixed(3) : (results.n || results.n_valid || 'N/A')}</p><p className="text-xs text-muted-foreground">{results.z_score != null ? 'Standardized' : 'Paired observations'}</p></div></CardContent></Card>
        </div>
    );
};


// Wilcoxon Signed-Rank Analysis Guide Component
const WilcoxonGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Wilcoxon Signed-Rank Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Wilcoxon Signed-Rank */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                What is the Wilcoxon Signed-Rank Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The Wilcoxon Signed-Rank test is a <strong>non-parametric</strong> alternative to the paired t-test. 
                It compares <strong>two related measurements</strong> (e.g., pre-test vs post-test on the same subjects) 
                by analyzing the ranks of differences between pairs.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Insight:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Instead of comparing raw values, it ranks the absolute differences between pairs, 
                    then compares sums of positive vs negative ranks. This makes it robust to outliers and 
                    non-normal distributions.
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
                  <p className="font-medium text-sm text-primary">Use Wilcoxon When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Comparing <strong>2 related/paired measurements</strong></li>
                    <li>• Data is <strong>not normally distributed</strong></li>
                    <li>• You have <strong>outliers</strong> in your data</li>
                    <li>• Data is <strong>ordinal</strong> (rankings, Likert scales)</li>
                    <li>• Small sample sizes where normality is hard to assess</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Use Paired T-Test Instead When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Differences are normally distributed</li>
                    <li>• No significant outliers</li>
                    <li>• Large sample sizes (n &gt; 30)</li>
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
                    <p className="font-medium text-sm">Calculate Differences</p>
                    <p className="text-xs text-muted-foreground">For each pair, compute the difference: D = Measurement2 - Measurement1</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium text-sm">Rank Absolute Differences</p>
                    <p className="text-xs text-muted-foreground">Ignore zeros, rank the remaining |D| values from smallest to largest.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium text-sm">Sum Positive & Negative Ranks</p>
                    <p className="text-xs text-muted-foreground">W+ = sum of ranks where D &gt; 0; W- = sum of ranks where D &lt; 0</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium text-sm">Compare W+ and W-</p>
                    <p className="text-xs text-muted-foreground">W statistic = min(W+, W-). If p &lt; 0.05, the difference is significant.</p>
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
                  <p className="font-medium text-sm">W Statistic</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The smaller of W+ (positive rank sum) or W- (negative rank sum).
                    <br/><strong>Smaller W</strong> = stronger evidence that one direction dominates.
                    <br/>If W+ &gt;&gt; W-, values increased. If W- &gt;&gt; W+, values decreased.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Effect Size (r)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculated as r = Z / √N, measuring the magnitude of the change.
                    <br/>Ranges from -1 to 1. Direction indicates whether increase or decrease dominated.
                  </p>
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
                  <p className="font-medium text-sm">Z Score (for n &gt; 20)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For larger samples, W is converted to a Z score (standard normal distribution) 
                    to calculate the p-value more precisely.
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
                    Paired/Dependent Observations
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each observation in one group must be paired with exactly one observation in the other.
                    <br/><em>For independent groups, use Mann-Whitney U test.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Continuous or Ordinal Data
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Differences must be measurable and rankable. Works with Likert scales and ordinal data.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Symmetric Distribution of Differences
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For valid median interpretation, the distribution of differences should be 
                    approximately symmetric around the median. Severe skewness can affect interpretation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Zero Differences Excluded
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pairs with no difference (D = 0) are excluded from the analysis. 
                    Only pairs with actual change contribute to the test.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Use Cases */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Common Use Cases
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Pre-Post Studies</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measure outcomes before and after an intervention (training, treatment, therapy) 
                    on the same subjects.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Matched Pairs</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare matched subjects (twins, matched controls) under different conditions.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Repeated Measures</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Same subjects measured at two time points (e.g., baseline vs 6-month follow-up).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Crossover Designs</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each subject receives both treatments in different periods 
                    (e.g., drug A then drug B, or vice versa).
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
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA Style)</p>
                  <p className="text-xs text-muted-foreground">
                    Report: W, Z (if applicable), p-value, effect size r
                    <br/>Example: W = 15.5, Z = -2.34, p = .019, r = .52
                    <br/>Include medians for both measurements
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Sample Size</p>
                  <p className="text-xs text-muted-foreground">
                    Minimum: 6 pairs recommended
                    <br/>For n &gt; 20, normal approximation (Z) is used
                    <br/>More pairs = more power to detect change
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Handling Ties</p>
                  <p className="text-xs text-muted-foreground">
                    When differences have equal absolute values, they receive average ranks.
                    <br/>Many ties can reduce statistical power.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Independent groups → Mann-Whitney U</li>
                    <li>• 3+ related groups → Friedman test</li>
                    <li>• Normal differences → Paired t-test</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Wilcoxon Signed-Rank tests the <strong>median difference</strong>, 
                not the mean. It&apos;s ideal for pre-post comparisons when you can&apos;t assume normality. 
                Always report the effect size (r) alongside the p-value — a significant p-value with a small effect 
                size may not be practically meaningful. Check W+ vs W- to understand the direction of change.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (example: ExampleDataSet) => void }) => {
    const wilcoxonExample = exampleDatasets.find(d => d.analysisTypes?.includes('wilcoxon'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><FlaskConical className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Wilcoxon Signed-Rank Test</CardTitle>
                    <CardDescription className="text-base mt-2">Non-parametric test for comparing two related samples</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Users className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Paired Samples</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Two related measurements per subject</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChart3 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Rank-Based</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Robust to non-normal distributions</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Effect Size</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Measures magnitude of difference</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Non-parametric alternative to paired t-test. Use when data doesn't meet normality assumptions, is ordinal, or has outliers.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• Two related measurements per subject</li>
                                    <li>• Variables: continuous or ordinal</li>
                                    <li>• Observations are dependent within pairs</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• W-statistic (rank sum)</li>
                                    <li>• p &lt; 0.05 = Significant</li>
                                    <li>• Effect size r</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {wilcoxonExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(wilcoxonExample)} size="lg"><FlaskConical className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface WilcoxonPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function WilcoxonPage({ data, numericHeaders, onLoadExample }: WilcoxonPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [var1, setVar1] = useState<string>('');
    const [var2, setVar2] = useState<string>('');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false); 
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'Variable 1 selected', 
            passed: var1 !== '', 
            detail: var1 ? `Variable 1: ${var1}` : 'Select first variable' 
        });
        
        checks.push({ 
            label: 'Variable 2 selected', 
            passed: var2 !== '', 
            detail: var2 ? `Variable 2: ${var2}` : 'Select second variable' 
        });
        
        checks.push({ 
            label: 'Different variables', 
            passed: var1 !== var2 || (var1 === '' && var2 === ''), 
            detail: var1 !== var2 ? 'Variables are different' : 'Select two different variables' 
        });
        
        checks.push({ 
            label: 'Adequate sample size', 
            passed: data.length >= 10, 
            detail: `n = ${data.length} pairs (recommended: 10+)` 
        });
        
        return checks;
    }, [data, var1, var2]);

    const allValidationsPassed = useMemo(() => {
        return dataValidation.filter(c => c.label !== 'Adequate sample size').every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0 || !canRun) {
            setView('intro');
        } else {
            setVar1(numericHeaders[0] || '');
            setVar2(numericHeaders[1] || '');
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Wilcoxon_Test_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "WILCOXON SIGNED-RANK TEST\n";
        csvContent += `Variable 1: ${var1}\nVariable 2: ${var2}\n`;
        csvContent += `Sample Size: ${results.n || results.n_valid || 'N/A'}\n\n`;
        csvContent += `W Statistic: ${results.statistic}\nP-value: ${results.p_value}\nEffect Size: ${results.effect_size}\n`;
        if (results.descriptive_stats) {
            csvContent += "\nDESCRIPTIVE STATISTICS\n";
            const statsData = Object.entries(results.descriptive_stats).map(([v, s]) => ({ Variable: v, N: s.n, Mean: s.mean, Median: s.median, StdDev: s.std }));
            csvContent += Papa.unparse(statsData) + "\n";
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Wilcoxon_Test_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, var1, var2, toast]);


    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult?.results) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/wilcoxon-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult.results,
                var1,
                var2,
                sampleSize: data.length
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Wilcoxon_Test_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, var1, var2, data.length, toast]);


    const handleAnalysis = useCallback(async () => {
        if (!var1 || !var2 || var1 === var2) {
            toast({ variant: "destructive", title: "Please select two different variables." });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/wilcoxon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, var1, var2 })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            result.interpretations = generateWilcoxonInterpretations(result.results, var1, var2);
            setAnalysisResult(result);
            goToStep(4);

        } catch (e: any) {
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, var1, var2, toast]);

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
            <WilcoxonGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <WilcoxonGlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Wilcoxon Signed-Rank Test</h1>
                    <p className="text-muted-foreground mt-1">Non-parametric paired comparison</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose two paired numeric variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Variable 1 (e.g., Pre-test)</Label>
                                    <Select value={var1} onValueChange={setVar1}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select first variable..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Variable 2 (e.g., Post-test)</Label>
                                    <Select value={var2} onValueChange={setVar2}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select second variable..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.filter(h => h !== var1).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> paired observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Test Settings</CardTitle><CardDescription>Review Wilcoxon test configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variable 1:</strong> {var1 || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Variable 2:</strong> {var2 || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Test Type:</strong> Wilcoxon Signed-Rank</p>
                                    <p>• <strong className="text-foreground">Alternative:</strong> Two-sided</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About the Test</h4>
                                <p className="text-sm text-muted-foreground">Wilcoxon Signed-Rank compares paired observations using ranks of differences. It's the non-parametric alternative to the paired t-test.</p>
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
                                <FlaskConical className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">The test will rank differences and compare positive vs negative rank sums.</p>
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
                    const absR = Math.abs(results.effect_size);
                    const isGood = isSignificant && absR >= 0.3;
                    const pPct = (results.p_value * 100).toFixed(1);
                    const descStats = results.descriptive_stats ? Object.entries(results.descriptive_stats) : [];
                    const stat1 = descStats[0];
                    const stat2 = descStats[1];

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Comparison of {var1} vs {var2}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isSignificant 
                                                ? `A meaningful change was found between ${var1} and ${var2}. There is a pre-post difference.`
                                                : `No statistically significant change between ${var1} and ${var2}. The two time points are similar.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {stat1 && stat2 
                                                ? `${var1} (median: ${(stat1[1] as any).median?.toFixed(2)}) → ${var2} (median: ${(stat2[1] as any).median?.toFixed(2)})`
                                                : 'Compared the medians at both time points.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {absR >= 0.5 
                                                ? 'Effect size is large. The intervention/treatment had a substantial effect.'
                                                : absR >= 0.3 
                                                    ? 'Effect size is medium. There is a moderate practical change.'
                                                    : 'Effect size is small. Even if there is a change, practical impact is limited.'}
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Meaningful Change Confirmed!" : isSignificant ? "Change Exists but Small Effect" : "No Significant Change"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood ? "The intervention/treatment was effective. Continue applying the same strategy." : isSignificant ? "Statistical change exists but review the practical significance." : "No difference between time points. Consider a different approach."}
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
                                        <p>• <strong>W Statistic:</strong> {results.statistic.toFixed(1)} — The difference between rank sums of positive and negative changes. Extreme values indicate consistent change in one direction.</p>
                                        <p>• <strong>p-value:</strong> {results.p_value < 0.001 ? '< 0.001' : results.p_value.toFixed(4)} — {isSignificant 
                                            ? `Probability this change occurred by chance is only ${pPct}%. Below 5%, so statistically significant.`
                                            : `Probability this change occurred by chance is ${pPct}%. Above 5%, so cannot rule out chance.`}</p>
                                        <p>• <strong>Effect Size (r):</strong> {results.effect_size.toFixed(3)} — {absR >= 0.5 ? 'Above 0.5 is a large effect.' : absR >= 0.3 ? '0.3-0.5 is a medium effect.' : 'Below 0.3 is a small effect.'} (Range: -1 to 1)</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Effect Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = absR >= 0.5 ? 5 : absR >= 0.4 ? 4 : absR >= 0.3 ? 3 : absR >= 0.1 ? 2 : 1;
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
                    const descStats = results.descriptive_stats ? Object.entries(results.descriptive_stats) : [];
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding Wilcoxon results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How the Test Works</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Wilcoxon Signed-Rank computes the <strong className="text-foreground">difference for each pair</strong>, 
                                                ranks the absolute differences, then compares sums of positive vs negative ranks.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Your Variables Compared</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {descStats.map(([name, stats], i) => (
                                                    <span key={name}>
                                                        <strong className="text-foreground">{name}</strong>: median = {stats.median.toFixed(2)}, mean = {stats.mean.toFixed(2)}
                                                        {i < descStats.length - 1 ? ' vs. ' : '.'}
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
                                                r = {results.effect_size.toFixed(3)} is considered <strong className="text-foreground">{getEffectSizeInterpretation(results.effect_size).toLowerCase()}</strong>. 
                                                {Math.abs(results.effect_size) >= 0.3 
                                                    ? ' This represents a practically meaningful change.'
                                                    : ' The practical change may be limited.'}
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
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Effect Size Guide</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">r &lt; 0.1</p><p className="text-muted-foreground">Negligible</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.1-0.3</p><p className="text-muted-foreground">Small</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.3-0.5</p><p className="text-muted-foreground">Medium</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">r &gt; 0.5</p><p className="text-muted-foreground">Large</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && analysisResult && (() => {
                    const descStats = results.descriptive_stats ? Object.entries(results.descriptive_stats) : [];
                    
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
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                    <Code className="mr-2 h-4 w-4" />
                                    Python Code
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div> 
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Wilcoxon Signed-Rank Test Report</h2><p className="text-sm text-muted-foreground mt-1">{var1} vs {var2} | N = {results.n || results.n_valid || 'N/A'} | {new Date().toLocaleDateString()}</p></div>
                        
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
                                            A Wilcoxon Signed-Rank test was conducted to compare {var1} and {var2} in paired observations 
                                            (<em>N</em> = {results.n || results.n_valid || 'N/A'}).
                                            {descStats.length === 2 && (
                                                <> The median for {descStats[0][0]} was {descStats[0][1].median.toFixed(2)} 
                                                compared to {descStats[1][1].median.toFixed(2)} for {descStats[1][0]}.</>
                                            )}
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The test {results.p_value < 0.05 ? 'revealed a statistically significant difference' : 'did not reveal a statistically significant difference'} between the paired measurements, 
                                            <span className="font-mono"> W = {results.statistic.toFixed(1)}</span>, 
                                            {results.z_score != null && <><span className="font-mono"> Z = {results.z_score.toFixed(2)}</span>, </>}
                                            <em> p</em> {results.p_value < 0.001 ? '< .001' : `= ${results.p_value.toFixed(3)}`}, 
                                            <em> r</em> = {results.effect_size.toFixed(2)}.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The effect size (<em>r</em> = {results.effect_size.toFixed(2)}) indicates a {getEffectSizeInterpretation(results.effect_size).toLowerCase()} effect, 
                                            suggesting that the change between measurements {Math.abs(results.effect_size) >= 0.3 ? 'is practically meaningful' : 'has limited practical impact'}.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Descriptive Statistics Table */}
                        {results.descriptive_stats && (
                            <Card>
                                <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">N</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Std. Dev</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.descriptive_stats).map(([variable, stats]) => (
                                                <TableRow key={variable}>
                                                    <TableCell className="font-medium">{variable}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.n || 'N/A'}</TableCell>
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
                                <CardHeader><CardTitle>Visualization</CardTitle><CardDescription>Distribution of paired differences</CardDescription></CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={analysisResult.plot} alt="Wilcoxon Visualization" width={1500} height={1200} className="w-3/4 rounded-md border" />
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
                                            <TableHead className="text-right">W Value</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            {results.z_score != null && <TableHead className="text-right">Z Score</TableHead>}
                                            <TableHead className="text-right">Effect Size (r)</TableHead>
                                            <TableHead className="text-center">Magnitude</TableHead>
                                            {results.W_plus != null && <TableHead className="text-right">W+</TableHead>}
                                            {results.W_minus != null && <TableHead className="text-right">W-</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Wilcoxon</TableCell>
                                            <TableCell className="text-right font-mono">{results.statistic?.toFixed(1) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right"><Badge variant={results.p_value < 0.05 ? 'default' : 'outline'}>{results.p_value < 0.001 ? '<.001' : results.p_value?.toFixed(4)}</Badge></TableCell>
                                            {results.z_score != null && <TableCell className="text-right font-mono">{results.z_score.toFixed(3)}</TableCell>}
                                            <TableCell className="text-right font-mono">{results.effect_size?.toFixed(3) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-center"><Badge variant={Math.abs(results.effect_size) >= 0.3 ? 'default' : 'secondary'}>{results.effect_size_interpretation?.text || getEffectSizeInterpretation(results.effect_size)}</Badge></TableCell>
                                            {results.W_plus != null && <TableCell className="text-right font-mono">{results.W_plus.toFixed(1)}</TableCell>}
                                            {results.W_minus != null && <TableCell className="text-right font-mono">{results.W_minus.toFixed(1)}</TableCell>}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">Effect size r = Z / √N</p></CardFooter>
                        </Card>
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>
        </div>
    );
}
