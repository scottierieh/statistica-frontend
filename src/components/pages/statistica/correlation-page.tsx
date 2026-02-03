'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart, TrendingUp, Lightbulb, AlertTriangle, HelpCircle, XCircle, Link2, Settings, FileSearch, TestTube, Layers, Target, CheckCircle, BookOpen, Activity, Info, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, FileText, BarChart3, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType, GitBranch, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import Papa from 'papaparse';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/correlation_analysis.py?alt=media";

// ============ TYPES ============
interface CorrelationPair {
    variable_1: string;
    variable_2: string;
    correlation: number;
    r_squared: number;
    p_value: number;
    significant: boolean;
    significant_bonferroni: boolean;
    ci_lower: number | null;
    ci_upper: number | null;
    magnitude: string;
}

interface PartialCorrelationPair {
    variable_1: string;
    variable_2: string;
    partial_r: number;
    p_value: number;
    controlled_for: string[];
    significant: boolean;
    magnitude: string;
}

interface PartialCorrelationData {
    matrix: { [key: string]: { [key: string]: number } };
    p_matrix: { [key: string]: { [key: string]: number } };
    pairs: PartialCorrelationPair[];
    control_variables?: string[];
}

interface CorrelationResults {
    correlation_matrix: { [key: string]: { [key: string]: number } };
    p_value_matrix: { [key: string]: { [key: string]: number } };
    summary_statistics: {
        mean_correlation: number;
        median_correlation: number;
        std_dev: number;
        range: [number, number];
        significant_correlations: number;
        significant_after_bonferroni: number;
        total_pairs: number;
        bonferroni_alpha: number;
    };
    strongest_correlations: CorrelationPair[];
    interpretation: {
        title: string;
        body: string;
    };
    pairs_plot?: string;
    pairs_plot_note?: string;
    heatmap_plot?: string;
    partial_correlations?: PartialCorrelationData;
    partial_heatmap?: string;
    n_dropped?: number;
    dropped_rows?: number[];
    sample_size: number;
    method: string;
    alpha: number;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Data' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' },
];

// ============ HELPER FUNCTIONS ============
const getCorrelationInterpretation = (r: number) => {
    const absR = Math.abs(r);
    if (absR >= 0.7) return { label: 'Very Strong', color: 'text-foreground' };
    if (absR >= 0.5) return { label: 'Strong', color: 'text-foreground' };
    if (absR >= 0.3) return { label: 'Moderate', color: 'text-foreground' };
    if (absR >= 0.1) return { label: 'Weak', color: 'text-muted-foreground' };
    return { label: 'Negligible', color: 'text-muted-foreground' };
};

const getSignificanceStars = (p: number, bonferroniSig?: boolean) => {
    if (bonferroniSig) return '***';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

// ============ SUMMARY CARDS COMPONENT ============
const StatisticalSummaryCards = ({ results }: { results: CorrelationResults }) => {
    const significantRate = results.summary_statistics.total_pairs > 0 
        ? (results.summary_statistics.significant_correlations / results.summary_statistics.total_pairs) * 100 
        : 0;
    const hasSignificant = results.summary_statistics.significant_correlations > 0;
    const strongestCorr = results.strongest_correlations[0];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Mean |r|</p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {Math.abs(results.summary_statistics.mean_correlation).toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getCorrelationInterpretation(results.summary_statistics.mean_correlation).label}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Significant Pairs</p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!hasSignificant ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            {results.summary_statistics.significant_correlations}/{results.summary_statistics.total_pairs}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {significantRate.toFixed(0)}% significant (α = 0.05)
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Strongest |r|</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {strongestCorr ? Math.abs(strongestCorr.correlation).toFixed(3) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {strongestCorr ? `r² = ${(strongestCorr.r_squared * 100).toFixed(1)}%` : 'No correlations'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Bonferroni Sig.</p>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.summary_statistics.significant_after_bonferroni}/{results.summary_statistics.total_pairs}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            α = {results.summary_statistics.bonferroni_alpha.toFixed(4)}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const correlationMetricDefinitions: Record<string, string> = {
    correlation_coefficient: "A measure of the strength and direction of the linear relationship between two variables, ranging from -1 to +1. Also called Pearson's r.",
    pearson_r: "The most common correlation coefficient. Measures the linear relationship between two continuous variables. Assumes normality and is sensitive to outliers.",
    spearman_rho: "A rank-based correlation coefficient (ρ). Measures monotonic relationships and is more robust to outliers and non-normality than Pearson's r.",
    kendall_tau: "A rank-based correlation coefficient (τ). More robust than Spearman for small samples or data with many tied values. Measures concordance between rankings.",
    r_squared: "The coefficient of determination (r²). The proportion of variance in one variable that is predictable from the other. r² = 0.64 means 64% shared variance.",
    p_value: "The probability of observing a correlation this strong (or stronger) if the true correlation were zero. p < 0.05 is typically considered statistically significant.",
    confidence_interval: "A range of plausible values for the true correlation. A 95% CI means we're 95% confident the true correlation lies within this range.",
    bonferroni_correction: "A multiple testing correction that divides α by the number of tests. Controls the family-wise error rate but is conservative (may miss real correlations).",
    partial_correlation: "The correlation between two variables after removing (controlling for) the effect of one or more other variables. Reveals 'pure' relationships.",
    zero_order_correlation: "The simple bivariate correlation between two variables without controlling for any other variables. Also called the Pearson correlation.",
    confounding_variable: "A third variable that influences both variables being correlated, potentially creating a spurious relationship. Partial correlations help detect confounding.",
    multicollinearity: "When predictor variables are highly correlated with each other. Can cause problems in regression analysis. Correlation matrices help detect this.",
    effect_size: "The magnitude of the correlation, regardless of statistical significance. Small: |r| < 0.3, Medium: 0.3-0.5, Large: |r| > 0.5 (Cohen's guidelines).",
    statistical_significance: "Whether a correlation is unlikely to have occurred by chance (typically p < 0.05). Does not indicate practical importance or effect size.",
    family_wise_error_rate: "The probability of making at least one Type I error (false positive) when performing multiple statistical tests. Bonferroni correction controls this.",
    monotonic_relationship: "A relationship where as one variable increases, the other consistently increases (or decreases), but not necessarily at a constant rate. Spearman captures this.",
    linear_relationship: "A relationship that can be described by a straight line. Pearson's r specifically measures linear relationships.",
    outlier: "An extreme data point that lies far from other observations. Can dramatically affect Pearson's r. Consider Spearman if outliers are present.",
    sample_size: "The number of observations (n) in the analysis. Larger samples provide more precise correlation estimates and narrower confidence intervals.",
    degrees_of_freedom: "For correlation, df = n - 2. Used to determine the critical value for significance testing and confidence interval calculation."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Correlation Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in correlation analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(correlationMetricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">
                                    {term.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

// ============ PYTHON CODE MODAL COMPONENT ============
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
        link.download = 'correlation_analysis.py';
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
                        Python Code - Correlation Analysis
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

const CorrelationGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Correlation Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Correlation Analysis */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Correlation Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Correlation analysis measures the strength and direction of the linear relationship between two 
                continuous variables. The correlation coefficient (r) ranges from -1 to +1, where values closer 
                to ±1 indicate stronger relationships.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Real-world example:</strong> Testing if advertising spend is related to sales revenue. 
                  A positive correlation (r = 0.75) would mean higher ad spend tends to accompany higher sales.
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use It */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Correlation Analysis?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You have <strong>two or more continuous numeric variables</strong></li>
                    <li>• You want to explore <strong>relationships before building models</strong></li>
                    <li>• You need to identify <strong>redundant or highly related variables</strong></li>
                    <li>• You want to understand <strong>which factors move together</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                    Don't use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Your variables are categorical (use Chi-square or Cramér's V)</li>
                    <li>• You need to establish causation (use experiments or causal inference)</li>
                    <li>• Your data has severe non-linear relationships (consider transformation)</li>
                    <li>• Sample size is very small (n &lt; 10)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* How It Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                How Correlation Analysis Works
              </h3>
              <div className="space-y-4">
                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">1. Pearson Correlation (r)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Measures linear relationships between continuous variables. Assumes normality and is 
                    sensitive to outliers. Best for: normally distributed continuous data.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">2. Spearman Correlation (ρ)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on ranks rather than raw values. Captures monotonic relationships (consistently 
                    increasing or decreasing). More robust to outliers and non-normality.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">3. Kendall's Tau (τ)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Also rank-based, but more robust for small samples. Better for ordinal data or when 
                    there are many tied values.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">4. Coefficient of Determination (r²)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The square of the correlation coefficient. Represents the proportion of variance in one 
                    variable that is predictable from the other. r² = 0.64 means 64% shared variance.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Interpreting Your Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Correlation Strength</p>
                  <div className="grid grid-cols-5 gap-2 mt-2 text-xs text-center">
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">|r| &lt; 0.1</p>
                      <p className="text-muted-foreground">Negligible</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.1 - 0.3</p>
                      <p className="text-muted-foreground">Weak</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.3 - 0.5</p>
                      <p className="text-muted-foreground">Moderate</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.5 - 0.7</p>
                      <p className="text-muted-foreground">Strong</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">|r| &gt; 0.7</p>
                      <p className="text-muted-foreground">Very Strong</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Direction of Relationship</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Positive (r &gt; 0):</strong> As X increases, Y tends to increase.<br/>
                    <strong>Negative (r &lt; 0):</strong> As X increases, Y tends to decrease.<br/>
                    <strong>Zero (r ≈ 0):</strong> No linear relationship between X and Y.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">95% Confidence Intervals — Key for Interpretation!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>CI doesn't include zero:</strong> The correlation is reliably different from zero.<br/>
                    <strong>CI includes zero:</strong> The true correlation might be zero — be cautious.<br/>
                    <strong>Narrow CI:</strong> More precise estimate (usually from larger samples).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Partial Correlations */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Understanding Partial Correlations
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Partial correlation measures the relationship between two variables while <strong>controlling for</strong> 
                  (holding constant) one or more other variables. This reveals the "pure" relationship after removing 
                  confounding effects.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-foreground">
                    <strong>Example:</strong> The correlation between ice cream sales and drowning incidents is high (r = 0.8). 
                    But when you control for temperature, the partial correlation drops to near zero — because hot weather 
                    causes both, not ice cream causing drowning!
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">When to use partial correlations:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                    <li>• When you suspect a third variable might explain the relationship</li>
                    <li>• To test if a relationship is direct or mediated by other variables</li>
                    <li>• When building theories about causation (though this doesn't prove causation)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Practical Applications */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Real-World Applications
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Business & Finance</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Identify which marketing channels correlate with sales</li>
                    <li>• Find relationships between economic indicators</li>
                    <li>• Detect multicollinearity before regression analysis</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Healthcare & Research</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Explore relationships between health metrics</li>
                    <li>• Identify risk factors associated with outcomes</li>
                    <li>• Validate measurement instruments (reliability)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Education</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Relate study habits to academic performance</li>
                    <li>• Explore factors affecting test scores</li>
                    <li>• Validate assessments and surveys</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Science</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Feature selection for machine learning</li>
                    <li>• Exploratory data analysis (EDA)</li>
                    <li>• Detect redundant variables in datasets</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Multiple Testing */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Bonferroni Correction for Multiple Testing
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  When testing many correlations at once, some will appear "significant" just by chance. 
                  With 10 variables (45 pairs), you'd expect about 2-3 false positives at α = 0.05!
                </p>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">How Bonferroni works:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Divides your significance threshold by the number of tests.<br/>
                    Example: With 45 tests and α = 0.05, the adjusted threshold is 0.05/45 = 0.0011.<br/>
                    <strong>Only correlations with p &lt; 0.0011 are considered "Bonferroni significant."</strong>
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Trade-off:</strong> Bonferroni is conservative — it reduces false positives but may 
                    miss some real correlations (increases false negatives). Report both corrected and 
                    uncorrected results for transparency.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Mistakes */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Mistakes to Avoid
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-300">Correlation ≠ Causation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Just because two variables correlate doesn't mean one causes the other. 
                    There could be a third variable (confounder), reverse causation, or coincidence.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Ignoring Outliers</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A single outlier can dramatically change Pearson's r. Always visualize your data 
                    with scatter plots and consider Spearman if outliers are present.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Restricted Range</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If your sample doesn't cover the full range of possible values, correlations will 
                    appear weaker than they truly are. Example: Studying IQ-performance correlation only 
                    among PhD students.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Over-interpreting Non-significant Results</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A non-significant correlation doesn't prove "no relationship" — it might just mean 
                    insufficient sample size. Check the confidence interval and statistical power.
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
                    <li>• Visualize data with scatter plots first</li>
                    <li>• Check for outliers and consider their impact</li>
                    <li>• Verify data is continuous (not categorical)</li>
                    <li>• Ensure adequate sample size (n ≥ 30 preferred)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Choosing a Method</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Pearson: Normal data, linear relationships</li>
                    <li>• Spearman: Non-normal, monotonic, or ordinal</li>
                    <li>• Kendall: Small samples, many ties</li>
                    <li>• When in doubt, report both Pearson and Spearman</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting Results</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report r, p-value, and 95% CI</li>
                    <li>• Include r² for practical significance</li>
                    <li>• Mention sample size (N or df)</li>
                    <li>• APA format: r(148) = .45, p &lt; .001, 95% CI [.31, .57]</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Focus on effect size (r), not just p-value</li>
                    <li>• Consider practical significance, not just statistical</li>
                    <li>• Acknowledge limitations and alternative explanations</li>
                    <li>• Use partial correlations to explore confounds</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Correlation is a tool for exploration and hypothesis 
                generation, not proof of causation. Use it alongside domain knowledge, visualizations, and other 
                statistical methods to build a complete picture of your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// ============ INTRO PAGE COMPONENT ============
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const corrExample = exampleDatasets.find(d => d.id === 'iris');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Link2 className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Correlation Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Measure the strength and direction of relationships between variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Link2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Relationship Strength</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Quantify how strongly variables are related (r from -1 to +1)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TestTube className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Methods</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Pearson, Spearman, or Kendall based on your data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Confidence Intervals</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    95% CI for each correlation with Bonferroni correction
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use correlation analysis to explore relationships between numeric variables before building predictive models, understand which factors are associated, or identify redundant variables.
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
                                        <span><strong>Two+ numeric variables:</strong> Continuous measurements</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 10 observations (30+ recommended)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Method:</strong> Pearson for linear, Spearman for monotonic</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>r near ±1:</strong> Strong linear relationship</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>r²:</strong> Proportion of shared variance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>95% CI:</strong> Range of plausible r values</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {corrExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(corrExample)} size="lg">
                                {corrExample.icon && <corrExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface CorrelationPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
    restoredState?: any;
}

export default function CorrelationPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onGenerateReport, restoredState }: CorrelationPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
    const [controlVariables, setControlVariables] = useState<string[]>([]);
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');
    
    const [results, setResults] = useState<CorrelationResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    // ============ MEMOS ============
    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length >= 2;
    }, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'Sufficient variables selected', 
            passed: selectedHeaders.length >= 2, 
            detail: `${selectedHeaders.length} variables selected (minimum: 2)` 
        });
        
        checks.push({ 
            label: 'Sufficient sample size', 
            passed: data.length >= 10, 
            detail: `n = ${data.length} observations (minimum: 10, recommended: 30+)` 
        });
        
        if (selectedHeaders.length > 0) {
            const isMissing = (value: any) => value == null || value === '' || (typeof value === 'number' && isNaN(value));
            const missingCount = data.filter((row: any) => 
                selectedHeaders.some((varName: string) => isMissing(row[varName]))
            ).length;
            
            checks.push({ 
                label: 'Missing values check', 
                passed: missingCount === 0, 
                detail: missingCount === 0 
                    ? 'No missing values detected' 
                    : `${missingCount} rows with missing values will be excluded`
            });
        }
        
        const numPairs = (selectedHeaders.length * (selectedHeaders.length - 1)) / 2;
        checks.push({ 
            label: 'Correlation pairs', 
            passed: numPairs > 0, 
            detail: `Will calculate ${numPairs} correlation coefficients` 
        });
        
        return checks;
    }, [data, selectedHeaders]);

    const allValidationsPassed = dataValidation.every(check => check.passed);

    // ============ EFFECTS ============
    useEffect(() => {
        setSelectedHeaders(numericHeaders.slice(0, 8));
    }, [numericHeaders]);

    useEffect(() => {
        if (restoredState) {
            setSelectedHeaders(restoredState.params.selectedHeaders || numericHeaders.slice(0, 8));
            setCorrelationMethod(restoredState.params.correlationMethod || 'pearson');
            setGroupVar(restoredState.params.groupVar);
            setResults(restoredState.results);
            setView('main');
            setCurrentStep(4);
            setMaxReachedStep(6);
        } else {
            setView(canRun ? 'main' : 'intro');
            setResults(null);
        }
    }, [restoredState, canRun, numericHeaders]);

    useEffect(() => {
        if (!restoredState) {
            setView(canRun ? 'main' : 'intro');
            setResults(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    // ============ HANDLERS ============
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

    const handleSelectionChange = (header: string, checked: boolean) => {
        setSelectedHeaders(prev => 
            checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) {
            toast({ variant: 'destructive', title: 'No results to download' });
            return;
        }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Correlation_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image;
            link.click();
            toast({ title: "Download complete" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Download failed" });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!results) return;
        
        const summaryData = [{
            mean_correlation: results.summary_statistics.mean_correlation,
            median_correlation: results.summary_statistics.median_correlation,
            std_dev: results.summary_statistics.std_dev,
            range_min: results.summary_statistics.range[0],
            range_max: results.summary_statistics.range[1],
            significant_correlations: results.summary_statistics.significant_correlations,
            significant_after_bonferroni: results.summary_statistics.significant_after_bonferroni,
            total_pairs: results.summary_statistics.total_pairs,
            bonferroni_alpha: results.summary_statistics.bonferroni_alpha,
            method: correlationMethod,
            sample_size: results.sample_size
        }];
        
        const correlationPairsData = results.strongest_correlations.map(pair => ({
            variable_1: pair.variable_1,
            variable_2: pair.variable_2,
            correlation: pair.correlation,
            r_squared: pair.r_squared,
            p_value: pair.p_value,
            significant: pair.significant,
            significant_bonferroni: pair.significant_bonferroni,
            ci_lower: pair.ci_lower,
            ci_upper: pair.ci_upper,
            magnitude: pair.magnitude
        }));
        
        let csvContent = "CORRELATION ANALYSIS SUMMARY\n";
        csvContent += Papa.unparse(summaryData) + "\n\n";
        csvContent += "CORRELATION PAIRS (with 95% CI)\n";
        csvContent += Papa.unparse(correlationPairsData) + "\n\n";
        
        if (results.interpretation) {
            csvContent += "INTERPRETATION\n";
            csvContent += `"${results.interpretation.title}"\n`;
            csvContent += `"${results.interpretation.body.replace(/"/g, '""')}"\n`;
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Correlation_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [results, correlationMethod, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/correlation-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results,
                    selectedHeaders,
                    correlationMethod,
                    sampleSize: data.length,
                    groupVar
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Correlation_Analysis_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [results, selectedHeaders, correlationMethod, data.length, groupVar, toast]);
    
    const handleAnalysis = useCallback(async () => {
        if (selectedHeaders.length < 2) {
            toast({ variant: 'destructive', title: 'Please select at least two variables.' });
            return;
        }
        
        setIsLoading(true);
        setResults(null);
        
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/correlation`, {       
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data,
                    variables: selectedHeaders,
                    controlVariables: controlVariables,
                    groupVar: groupVar,
                    method: correlationMethod, 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') {
                    errorMsg = errorResult.detail;
                } else if (Array.isArray(errorResult.detail)) {
                    errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                } else if (errorResult.error) {
                    errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                }
                throw new Error(errorMsg);
            }
            
            const result: CorrelationResults = await response.json();
            if ((result as any).error) {
                throw new Error(typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error));
            }
            setResults(result);
            goToStep(4);
            toast({ title: 'Correlation Analysis Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedHeaders, groupVar, correlationMethod, toast]);

    // ============ EARLY RETURN ============
    if (!canRun || view === 'intro') {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    // ============ PROGRESS BAR COMPONENT ============
    const ProgressBar = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between w-full gap-2">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = currentStep === step.id;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button 
                            key={step.id}
                            onClick={() => isAccessible && goToStep(step.id)} 
                            disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
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
            <CorrelationGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
                

            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Correlation Analysis</h1>
                    <p className="text-muted-foreground mt-1">Measure relationships between numeric variables</p>
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
                {/* Step 1: Variable Selection */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose which variables to analyze for correlations</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Numeric Variables</Label>
                                <ScrollArea className="h-48 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {numericHeaders.map(header => (
                                            <div key={header} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`corr-${header}`}
                                                    checked={selectedHeaders.includes(header)}
                                                    onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean)}
                                                />
                                                <label htmlFor={`corr-${header}`} className="text-sm font-medium leading-none cursor-pointer">
                                                    {header}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">{selectedHeaders.length} variables selected</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedHeaders.length < 2}>
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Method Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Analysis Settings</CardTitle>
                                    <CardDescription>Configure the correlation method and control variables</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Correlation Method</Label>
                                    <Select value={correlationMethod} onValueChange={(v) => setCorrelationMethod(v as any)}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pearson">Pearson (linear relationships)</SelectItem>
                                            <SelectItem value="spearman">Spearman (monotonic relationships)</SelectItem>
                                            <SelectItem value="kendall">Kendall's Tau (ordinal data)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Group By (Optional)</Label>
                                    <Select value={groupVar || 'none'} onValueChange={(v) => setGroupVar(v === 'none' ? undefined : v)}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="None" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Control Variables for Partial Correlation */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium">Control Variables (for Partial Correlation)</Label>
                                    <Badge variant="outline" className="text-xs">Optional</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Select variables to hold constant when calculating partial correlations. 
                                    This reveals the "pure" relationship between variables after removing the effect of confounders.
                                </p>
                                {numericHeaders.filter(h => !selectedHeaders.includes(h)).length > 0 ? (
                                    <ScrollArea className="h-32 border rounded-xl p-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {numericHeaders.filter(h => !selectedHeaders.includes(h)).map(header => (
                                                <div key={header} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`control-${header}`}
                                                        checked={controlVariables.includes(header)}
                                                        onCheckedChange={(checked) => {
                                                            setControlVariables(prev => 
                                                                checked ? [...prev, header] : prev.filter(h => h !== header)
                                                            );
                                                        }}
                                                    />
                                                    <label htmlFor={`control-${header}`} className="text-sm leading-none cursor-pointer">
                                                        {header}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="p-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">
                                        All numeric variables are already selected for analysis. To use control variables, 
                                        go back and deselect some variables from the analysis.
                                    </div>
                                )}
                                {controlVariables.length > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg">
                                        <GitBranch className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                        <p className="text-sm text-muted-foreground">
                                            Partial correlations will control for: <strong className="text-foreground">{controlVariables.join(', ')}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Method Guide:</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Pearson:</strong> Best for linear relationships between continuous variables</p>
                                    <p>• <strong className="text-foreground">Spearman:</strong> Works for monotonic relationships, robust to outliers</p>
                                    <p>• <strong className="text-foreground">Kendall:</strong> Good for small samples or ordinal data</p>
                                </div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-foreground">Features:</strong> 95% confidence intervals, Bonferroni correction, and partial correlations (when control variables are selected).
                                </p>
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
                                    <CardDescription>Checking if your data is ready for analysis</CardDescription>
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
                                <Link2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Using {correlationMethod.charAt(0).toUpperCase() + correlationMethod.slice(1)} correlation with 95% CI and Bonferroni correction.
                                    {controlVariables.length > 0 && (
                                        <span className="block mt-1">
                                            <strong>Partial correlations</strong> will control for: {controlVariables.join(', ')}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Result Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const sigCount = results.summary_statistics.significant_correlations;
                    const sigBonf = results.summary_statistics.significant_after_bonferroni;
                    const totalPairs = results.summary_statistics.total_pairs;
                    const strongest = results.strongest_correlations[0];

                    return (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Result Summary</CardTitle>
                                    <CardDescription>How your variables relate to each other</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${sigCount > 0 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${sigCount > 0 ? 'text-primary' : 'text-rose-600'}`} />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className={`font-bold ${sigCount > 0 ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                        <p className="text-sm">
                                            {sigCount > 0 
                                                ? <>Found <strong>{sigCount} meaningful connection{sigCount !== 1 ? 's' : ''}</strong> between your variables!</>
                                                : <>No reliable connections found between your variables.</>}
                                        </p>
                                    </div>
                                    {strongest && (
                                        <>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${sigCount > 0 ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                <strong>{strongest.variable_1}</strong> and <strong>{strongest.variable_2}</strong> show a <strong>{strongest.magnitude}</strong> {strongest.correlation > 0 ? 'positive' : 'negative'} relationship (r = {strongest.correlation.toFixed(3)}).
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${sigCount > 0 ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                This explains <strong>{(strongest.r_squared * 100).toFixed(1)}%</strong> of the variance between them.
                                                {strongest.ci_lower !== null && <> 95% CI: [{strongest.ci_lower.toFixed(3)}, {strongest.ci_upper?.toFixed(3)}]</>}
                                            </p>
                                        </div>
                                        </>
                                    )}
                                    {sigBonf < sigCount && (
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-amber-600">•</span>
                                            <p className="text-sm">
                                                <strong>Note:</strong> After Bonferroni correction, only <strong>{sigBonf}</strong> correlation{sigBonf !== 1 ? 's remain' : ' remains'} significant.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 border ${strongest && Math.abs(strongest.correlation) >= 0.5 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : sigCount > 0 ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <div className="flex items-start gap-3">
                                    {strongest && Math.abs(strongest.correlation) >= 0.5 
                                        ? <CheckCircle2 className="w-6 h-6 text-primary" /> 
                                        : sigCount > 0 
                                            ? <Info className="w-6 h-6 text-amber-600" />
                                            : <AlertTriangle className="w-6 h-6 text-rose-600" />}
                                    <div>
                                        <p className="font-semibold">
                                            {strongest && Math.abs(strongest.correlation) >= 0.7 
                                                ? "Strong Connections Found!" 
                                                : strongest && Math.abs(strongest.correlation) >= 0.5 
                                                    ? "Useful Connections Found"
                                                    : sigCount > 0 
                                                        ? "Weak-to-Moderate Connections" 
                                                        : "No Reliable Connections"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {strongest && Math.abs(strongest.correlation) >= 0.5 
                                                ? "These variables move together predictably. Use this insight for forecasting or decision-making."
                                                : sigCount > 0 
                                                    ? "Some patterns exist, but they're not very strong. Consider alongside other factors."
                                                    : "Your variables appear to move independently."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Connections</p>
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className={`text-2xl font-semibold ${sigCount === 0 ? 'text-rose-600' : ''}`}>{sigCount}</p>
                                            <p className="text-xs text-muted-foreground">of {totalPairs} pairs (p &lt; .05)</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Strongest r</p>
                                                <Target className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{strongest ? strongest.correlation.toFixed(3) : 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">{strongest ? strongest.magnitude : '—'}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">r² (Variance)</p>
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{strongest ? `${(strongest.r_squared * 100).toFixed(1)}%` : 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">Shared variance</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Bonferroni</p>
                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className={`text-2xl font-semibold ${sigBonf === 0 && sigCount > 0 ? 'text-amber-600' : ''}`}>{sigBonf}</p>
                                            <p className="text-xs text-muted-foreground">After correction</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Overall Strength:</span>
                                {[1, 2, 3, 4, 5].map(star => {
                                    const strongestR = strongest ? Math.abs(strongest.correlation) : 0;
                                    const filled = (strongestR >= 0.7 && star <= 5) || (strongestR >= 0.5 && star <= 4) || (strongestR >= 0.3 && star <= 3) || (strongestR >= 0.1 && star <= 2) || star <= 1;
                                    return <span key={star} className={`text-lg ${filled ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button onClick={nextStep} size="lg">Why These Results?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                    );
                })()}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (() => {
                    const sigCount = results.summary_statistics.significant_correlations;
                    const sigBonf = results.summary_statistics.significant_after_bonferroni;
                    const strongest = results.strongest_correlations[0];

                    return (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Why This Conclusion?</CardTitle>
                                    <CardDescription>Understanding what correlations mean for your decisions</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What Does "Correlation" Mean?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Correlation (r) measures how two variables move together. <strong className="text-foreground">r = 1</strong> means perfect positive relationship; 
                                            <strong className="text-foreground"> r = -1</strong> means perfect negative; <strong className="text-foreground">r = 0</strong> means no relationship.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What Does r² Tell You?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {strongest ? (
                                                <><strong className="text-foreground">r² = {(strongest.r_squared * 100).toFixed(1)}%</strong> means that knowing {strongest.variable_1} explains {(strongest.r_squared * 100).toFixed(1)}% of the variation in {strongest.variable_2}. The remaining {(100 - strongest.r_squared * 100).toFixed(1)}% is explained by other factors.</>
                                            ) : 'r² shows the percentage of variance shared between two variables.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Why Confidence Intervals?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {strongest && strongest.ci_lower !== null ? (
                                                <>The 95% CI [{strongest.ci_lower.toFixed(3)}, {strongest.ci_upper?.toFixed(3)}] means we're 95% confident the true correlation falls in this range. <strong className="text-foreground">{strongest.ci_lower > 0 || strongest.ci_upper! < 0 ? "The CI doesn't include zero, confirming a real relationship." : "The CI includes zero, so the relationship may not be reliable."}</strong></>
                                            ) : 'Confidence intervals show the range of plausible values for the true correlation.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Why Bonferroni Correction?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            When testing many correlations, some may appear significant by chance. Bonferroni correction adjusts for this. 
                                            {sigBonf < sigCount 
                                                ? <> <strong className="text-foreground">{sigCount - sigBonf} of your {sigCount} significant correlations may be false positives.</strong> Only {sigBonf} survive stricter testing.</>
                                                : sigBonf > 0 
                                                    ? <> <strong className="text-foreground">All {sigBonf} significant correlations remain after correction</strong> — these are likely real relationships.</>
                                                    : ' No correlations survived correction.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">5</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Correlation ≠ Causation</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">Just because two things correlate doesn't mean one causes the other.</strong> Ice cream sales and drowning incidents both increase in summer — but ice cream doesn't cause drowning. Always consider confounding factors.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 border ${strongest && Math.abs(strongest.correlation) >= 0.5 && sigBonf > 0 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : sigCount > 0 ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    {strongest && Math.abs(strongest.correlation) >= 0.5 && sigBonf > 0
                                        ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Reliable Connections Found</> 
                                        : sigCount > 0 
                                            ? <><Info className="w-5 h-5 text-amber-600" /> Bottom Line: Some Patterns Worth Noting</>
                                            : <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: Variables Are Independent</>}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {strongest && Math.abs(strongest.correlation) >= 0.5 && sigBonf > 0
                                        ? "Use these relationships for forecasting. When one variable changes, expect related ones to shift predictably." 
                                        : sigCount > 0 
                                            ? "Patterns exist but may not be strong enough to rely on alone. Consider alongside other information."
                                            : "Your variables don't show reliable patterns together."}
                                </p>
                            </div>

                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Correlation Strength Guide</h4>
                                <div className="grid grid-cols-5 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;0.1</p><p className="text-muted-foreground">Negligible</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.1-0.3</p><p className="text-muted-foreground">Weak</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.3-0.5</p><p className="text-muted-foreground">Moderate</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.5-0.7</p><p className="text-muted-foreground">Strong</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;0.7</p><p className="text-muted-foreground">Very Strong</p></div>
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
                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Statistical Details</h2>
                            <p className="text-sm text-muted-foreground">Full technical report with confidence intervals</p>
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
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileText className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Correlation Analysis Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Method: {results.method.charAt(0).toUpperCase() + results.method.slice(1)} | N = {results.sample_size} | Variables: {selectedHeaders.length} | {new Date().toLocaleDateString()}
                            </p>
                        </div>

                        <StatisticalSummaryCards results={results} />

                        {results.n_dropped !== undefined && results.n_dropped > 0 && (
                            <Card>
                                <CardContent className="pt-6">
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Missing Values</AlertTitle>
                                        <AlertDescription>{results.n_dropped} rows excluded due to missing values.</AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        )}

                        {results.pairs_plot_note && (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Note</AlertTitle>
                                <AlertDescription>{results.pairs_plot_note}</AlertDescription>
                            </Alert>
                        )}

                        {/* Detailed Analysis - APA Format */}
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary (APA Format)</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {results.method.charAt(0).toUpperCase() + results.method.slice(1)} correlation coefficients were computed to assess the relationships among {selectedHeaders.length} variables 
                                            (<em>N</em> = {results.sample_size}). 
                                            {results.summary_statistics.significant_correlations > 0 ? (
                                                <>
                                                    Of the {results.summary_statistics.total_pairs} possible pairings, {results.summary_statistics.significant_correlations} ({((results.summary_statistics.significant_correlations / results.summary_statistics.total_pairs) * 100).toFixed(1)}%) reached statistical significance at <em>α</em> = .05.
                                                    {results.summary_statistics.significant_after_bonferroni < results.summary_statistics.significant_correlations && (
                                                        <> After Bonferroni correction (<em>α</em><sub>adjusted</sub> = {results.summary_statistics.bonferroni_alpha.toFixed(4)}), {results.summary_statistics.significant_after_bonferroni} correlations remained significant.</>
                                                    )}
                                                </>
                                            ) : (
                                                <>None of the {results.summary_statistics.total_pairs} correlations reached statistical significance at <em>α</em> = .05.</>
                                            )}
                                        </p>
                                        {results.strongest_correlations[0] && (
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The strongest correlation was observed between {results.strongest_correlations[0].variable_1} and {results.strongest_correlations[0].variable_2}, 
                                                <span className="font-mono"> <em>r</em>({results.sample_size - 2}) = {results.strongest_correlations[0].correlation.toFixed(3)}, 
                                                <em>p</em> {results.strongest_correlations[0].p_value < 0.001 ? '< .001' : `= ${results.strongest_correlations[0].p_value.toFixed(3)}`}</span>
                                                {results.strongest_correlations[0].ci_lower !== null && (
                                                    <>, 95% CI [{results.strongest_correlations[0].ci_lower.toFixed(3)}, {results.strongest_correlations[0].ci_upper?.toFixed(3)}]</>
                                                )}.
                                                This represents a {results.strongest_correlations[0].magnitude} {results.strongest_correlations[0].correlation > 0 ? 'positive' : 'negative'} relationship, 
                                                accounting for {(results.strongest_correlations[0].r_squared * 100).toFixed(1)}% of the variance (<em>r</em>² = {results.strongest_correlations[0].r_squared.toFixed(3)}).
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {results.interpretation && (
                                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Lightbulb className="h-4 w-4 text-primary" />
                                            <h3 className="font-semibold">{results.interpretation.title}</h3>
                                        </div>
                                        <div className="text-sm leading-relaxed text-muted-foreground">{results.interpretation.body}</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-4">
                            {results.heatmap_plot && (
                                <Card>
                                    <CardHeader><CardTitle>Correlation Heatmap</CardTitle></CardHeader>
                                    <CardContent>
                                        <Image src={results.heatmap_plot} alt="Correlation Heatmap" width={800} height={500} className="w-full rounded-md border" />
                                    </CardContent>
                                </Card>
                            )}
                            {results.pairs_plot && (
                                <Card>
                                    <CardHeader><CardTitle>Pairs Plot</CardTitle></CardHeader>
                                    <CardContent>
                                        <Image src={results.pairs_plot} alt="Pairs Plot" width={800} height={500} className="w-full rounded-md border" />
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Correlation Pairs Table with CI */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Correlation Pairs Table</CardTitle>
                                <CardDescription>Sorted by absolute correlation strength, with 95% confidence intervals</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable 1</TableHead>
                                            <TableHead>Variable 2</TableHead>
                                            <TableHead className="text-right">r</TableHead>
                                            <TableHead className="text-right">r²</TableHead>
                                            <TableHead className="text-right">95% CI</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-center">Magnitude</TableHead>
                                            <TableHead className="text-center">Sig</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.strongest_correlations.map((pair, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{pair.variable_1}</TableCell>
                                                <TableCell className="font-medium">{pair.variable_2}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {pair.correlation.toFixed(3)}{getSignificanceStars(pair.p_value, pair.significant_bonferroni)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{(pair.r_squared * 100).toFixed(1)}%</TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {pair.ci_lower !== null ? `[${pair.ci_lower.toFixed(3)}, ${pair.ci_upper?.toFixed(3)}]` : '—'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {pair.p_value < 0.001 ? '<.001' : pair.p_value.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={`text-xs ${Math.abs(pair.correlation) >= 0.5 ? 'bg-primary/10' : ''}`}>
                                                        {pair.magnitude}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {pair.significant_bonferroni ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                                                            <CheckCircle className="w-3 h-3 mr-1" />Bonf
                                                        </Badge>
                                                    ) : pair.significant ? (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                            <CheckCircle className="w-3 h-3 mr-1" />Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">No</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <p className="text-xs text-muted-foreground">
                                    *** Bonferroni significant | ** p &lt; .01 | * p &lt; .05 | 
                                    <span className="ml-2">Bonf = significant after Bonferroni correction (α = {results.summary_statistics.bonferroni_alpha.toFixed(4)})</span>
                                </p>
                            </CardFooter>
                        </Card>

                        {/* Correlation Matrix */}
                        <Card>
                            <CardHeader><CardTitle>Correlation Matrix</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Variable</TableHead>
                                                {selectedHeaders.map(header => <TableHead key={header} className="text-right text-xs">{header}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedHeaders.map(rowHeader => (
                                                <TableRow key={rowHeader}>
                                                    <TableHead className="text-xs">{rowHeader}</TableHead>
                                                    {selectedHeaders.map(colHeader => {
                                                        const corr = results.correlation_matrix[rowHeader]?.[colHeader];
                                                        const isStrong = corr !== undefined && Math.abs(corr) >= 0.5 && rowHeader !== colHeader;
                                                        return (
                                                            <TableCell key={colHeader} className={`text-right font-mono text-xs ${isStrong ? 'font-bold text-primary' : ''}`}>
                                                                {corr !== undefined ? corr.toFixed(2) : '—'}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Partial Correlations Section */}
                        {results.partial_correlations && results.partial_correlations.pairs && results.partial_correlations.pairs.length > 0 && (
                            <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <GitBranch className="w-5 h-5" />
                                        Partial Correlations
                                    </CardTitle>
                                    <CardDescription>
                                        Correlation between each pair after controlling for: <strong>{results.partial_correlations.control_variables?.join(', ') || 'selected variables'}</strong>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/10 dark:to-purple-950/10 rounded-lg p-4 border border-violet-300 dark:border-violet-700">
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">What this shows:</strong> The relationship between each pair of variables after removing the influence of 
                                            <strong className="text-foreground"> {results.partial_correlations.control_variables?.join(', ')}</strong>. 
                                            This reveals the "pure" relationship, helping you identify whether correlations are direct or mediated by the control variables.
                                        </p>
                                    </div>

                                    {results.partial_heatmap && (
                                        <div className="flex justify-center">
                                            <Image src={results.partial_heatmap} alt="Partial Correlation Heatmap" width={600} height={500} className="rounded-md border" />
                                        </div>
                                    )}

                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Variable 1</TableHead>
                                                    <TableHead>Variable 2</TableHead>
                                                    <TableHead className="text-right">Partial r</TableHead>
                                                    <TableHead className="text-right">Zero-order r</TableHead>
                                                    <TableHead className="text-right">Change</TableHead>
                                                    <TableHead className="text-right">p-value</TableHead>
                                                    <TableHead className="text-center">Magnitude</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.partial_correlations.pairs.slice(0, 15).map((pair, idx) => {
                                                    // Find corresponding zero-order correlation
                                                    const zeroOrder = results.strongest_correlations.find(
                                                        c => (c.variable_1 === pair.variable_1 && c.variable_2 === pair.variable_2) ||
                                                             (c.variable_1 === pair.variable_2 && c.variable_2 === pair.variable_1)
                                                    );
                                                    const zeroOrderR = zeroOrder?.correlation || 0;
                                                    const change = pair.partial_r - zeroOrderR;
                                                    const changePercent = zeroOrderR !== 0 ? ((change / Math.abs(zeroOrderR)) * 100) : 0;
                                                    
                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">{pair.variable_1}</TableCell>
                                                            <TableCell className="font-medium">{pair.variable_2}</TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {pair.partial_r.toFixed(3)}
                                                                {pair.significant && <span className="text-primary">*</span>}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                                {zeroOrderR.toFixed(3)}
                                                            </TableCell>
                                                            <TableCell className={`text-right font-mono text-xs ${Math.abs(change) > 0.1 ? (change < 0 ? 'text-rose-600' : 'text-green-600') : ''}`}>
                                                                {change >= 0 ? '+' : ''}{change.toFixed(3)}
                                                                {Math.abs(changePercent) > 10 && <span className="ml-1">({changePercent > 0 ? '+' : ''}{changePercent.toFixed(0)}%)</span>}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {pair.p_value < 0.001 ? '<.001' : pair.p_value.toFixed(3)}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {pair.magnitude}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    
                                    {results.partial_correlations.pairs.length > 15 && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            Showing top 15 of {results.partial_correlations.pairs.length} partial correlations
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <p className="text-xs text-muted-foreground">
                                        <strong>Change column:</strong> Difference between partial and zero-order correlation. 
                                        Large negative changes suggest the relationship was partly due to confounding variables.
                                    </p>
                                </CardFooter>
                            </Card>

                            {/* Partial vs Zero-order comparison insight */}
                            {(() => {
                                const biggestDrop = results.partial_correlations.pairs.reduce((max, pair) => {
                                    const zeroOrder = results.strongest_correlations.find(
                                        c => (c.variable_1 === pair.variable_1 && c.variable_2 === pair.variable_2) ||
                                             (c.variable_1 === pair.variable_2 && c.variable_2 === pair.variable_1)
                                    ) || null;
                                    const change = Math.abs(zeroOrder?.correlation || 0) - Math.abs(pair.partial_r);
                                    return change > max.change ? { pair, zeroOrder, change } : max;
                                }, { pair: null as PartialCorrelationPair | null, zeroOrder: null as CorrelationPair | null, change: 0 });

                                if (biggestDrop.change > 0.15 && biggestDrop.pair && biggestDrop.zeroOrder) {
                                    return (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Confounding Detected</AlertTitle>
                                            <AlertDescription>
                                                The correlation between <strong>{biggestDrop.pair.variable_1}</strong> and <strong>{biggestDrop.pair.variable_2}</strong> dropped 
                                                from {Math.abs(biggestDrop.zeroOrder.correlation).toFixed(3)} to {Math.abs(biggestDrop.pair.partial_r).toFixed(3)} after 
                                                controlling for other variables. This suggests their relationship may be partly explained by confounding factors.
                                            </AlertDescription>
                                        </Alert>
                                    );
                                }
                                return null;
                            })()}
                            </>
                        )}

                        {/* Multiple Comparison Note */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Multiple Comparison Correction</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm text-muted-foreground">
                                    <p>
                                        When testing {results.summary_statistics.total_pairs} correlations simultaneously, the probability of at least one false positive increases substantially 
                                        (family-wise error rate = {(1 - Math.pow(0.95, results.summary_statistics.total_pairs)) * 100 > 100 ? '>99' : (1 - Math.pow(0.95, results.summary_statistics.total_pairs) * 100).toFixed(1)}% at α = .05).
                                    </p>
                                    <p>
                                        <strong className="text-foreground">Bonferroni correction</strong> adjusts the significance threshold to α = {results.summary_statistics.bonferroni_alpha.toFixed(4)} 
                                        ({results.alpha || 0.05} / {results.summary_statistics.total_pairs} tests), reducing false positives but potentially increasing false negatives.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-foreground">Without Correction</p>
                                            <p className="text-2xl font-bold text-foreground">{results.summary_statistics.significant_correlations}</p>
                                            <p className="text-xs">significant at p &lt; .05</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">With Bonferroni</p>
                                            <p className="text-2xl font-bold text-foreground">{results.summary_statistics.significant_after_bonferroni}</p>
                                            <p className="text-xs">significant at p &lt; {results.summary_statistics.bonferroni_alpha.toFixed(4)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                )}
            </div>

            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
            <GlossaryModal 
                isOpen={glossaryModalOpen} 
                onClose={() => setGlossaryModalOpen(false)} 
            />
        </div>
        
    );
}
