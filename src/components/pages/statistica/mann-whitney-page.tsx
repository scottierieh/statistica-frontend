'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, TrendingUp, Target, CheckCircle, AlertTriangle, HelpCircle, Settings, FileSearch, BarChart3, Layers, Download, Activity, Info, Lightbulb, BookOpen, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, FileType, FileCode, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/mann_whitney.py?alt=media";

const mannWhitneyMetricDefinitions: Record<string, string> = {
    mann_whitney_u_test: "The Mann-Whitney U test (also called Wilcoxon rank-sum test) is a non-parametric test that compares two independent groups using ranks instead of raw values.",
    u_statistic: "The U statistic represents the number of times observations from one group precede observations from the other group in the combined ranking. Smaller U values indicate greater separation.",
    rank_sum: "All observations from both groups are ranked together from lowest to highest. The test compares the sum of ranks between the two groups.",
    p_value: "The probability of obtaining results at least as extreme as observed, assuming no true difference exists. Values below 0.05 typically indicate statistical significance.",
    effect_size_r: "Effect size r (correlation coefficient) measures the strength of the relationship between group membership and the outcome. Calculated as Z / √N, ranges from -1 to 1.",
    median: "The median is the middle value when data is sorted. Mann-Whitney U test compares the distributions of ranks, which is often interpreted through medians.",
    non_parametric: "Non-parametric tests make no assumptions about the underlying distribution of data. They work with ranks or ordinal data instead of assuming normality.",
    rank_based_test: "Rather than using actual values, the test converts all observations to ranks and analyzes these ranks. This makes the test robust to outliers and non-normality.",
    independent_samples: "The two groups being compared must consist of different, unrelated observations. For related/paired data, use the Wilcoxon signed-rank test instead.",
    wilcoxon_rank_sum: "Another name for the Mann-Whitney U test. The two tests are mathematically equivalent and test the same hypothesis.",
    null_hypothesis: "H₀: The distributions of the two groups are identical. There is no systematic difference in ranks between groups.",
    alternative_hypothesis: "H₁: One group tends to have higher values than the other. The distributions differ in location (median/mean rank).",
    two_tailed_test: "Tests whether groups differ in either direction (Group 1 > Group 2 or Group 1 < Group 2). Most commonly used when direction is unknown.",
    robustness: "Mann-Whitney U is robust to violations of normality and is less affected by outliers compared to the independent t-test.",
    ordinal_data: "Data with meaningful order but without equal intervals (e.g., rankings, Likert scales). Mann-Whitney U can analyze ordinal data, unlike the t-test.",
    sample_size: "Minimum 10 observations per group recommended. With very large samples (n > 100), the U statistic follows a normal distribution.",
    z_score: "For large samples, the U statistic can be converted to a Z-score, which follows a standard normal distribution and is used to calculate the p-value.",
    ties: "When observations have identical values, they receive the average of the ranks they would have occupied. Excessive ties reduce test power.",
    assumptions: "Mann-Whitney U assumes: (1) Independent observations, (2) Ordinal or continuous data, (3) Similar distribution shapes (for median comparison interpretation).",
    distribution_shapes: "If groups have similarly shaped distributions, Mann-Whitney U tests for differences in medians. If shapes differ greatly, it tests for stochastic dominance.",
    stochastic_dominance: "When distributions have different shapes, the test determines if observations from one group tend to be larger than those from the other group overall.",
    small_effect: "Effect size |r| between 0.1 and 0.3. Indicates a weak relationship between group membership and the outcome variable.",
    medium_effect: "Effect size |r| between 0.3 and 0.5. Indicates a moderate, practically noticeable difference between groups.",
    large_effect: "Effect size |r| above 0.5. Indicates a strong, substantial difference with clear practical significance.",
    negligible_effect: "Effect size |r| below 0.1. Even if statistically significant, the practical difference is minimal.",
    statistical_power: "The probability of correctly detecting a true difference. Larger sample sizes and bigger effect sizes increase statistical power.",
    type_i_error: "False positive - concluding groups differ when they actually don't. Controlled by alpha level (typically 5%).",
    type_ii_error: "False negative - failing to detect a real difference. Related to statistical power (1 - β).",
};


// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - Mann-Whitney U Test"
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
        link.download = 'mann_whitney.py';
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

const MannWhitneyGlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Mann-Whitney U Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in non-parametric two-group comparison
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(mannWhitneyMetricDefinitions).map(([term, definition]) => (
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

interface MannWhitneyResults {
    test_type: string;
    statistic: number;
    p_value: number;
    effect_size: number;
    effect_size_interpretation: { text: string; magnitude: string; };
    interpretation: { decision: string; conclusion: string; };
    group_stats?: { [key: string]: { mean: number; median: number; std: number; count: number; min?: number; max?: number; }; };
}

interface FullAnalysisResponse {
    results: MannWhitneyResults;
    plot: string;
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

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: MannWhitneyResults }) => {
    const isSignificant = results.p_value < 0.05;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">U Statistic</p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.statistic.toFixed(1)}</p>
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
                        <p className={`text-2xl font-semibold ${!isSignificant ? 'text-amber-600' : ''}`}>
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
                            <p className="text-sm font-medium text-muted-foreground">Effect Size (r)</p>
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
                            <p className="text-sm font-medium text-muted-foreground">Groups</p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">2</p>
                        <p className="text-xs text-muted-foreground">Independent samples</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Generate interpretations
const generateMannWhitneyInterpretations = (results: MannWhitneyResults, groupCol: string, valueCol: string) => {
    const insights: string[] = [];
    const isSignificant = results.p_value < 0.05;
    const absEffectSize = Math.abs(results.effect_size);
    const groupNames = results.group_stats ? Object.keys(results.group_stats) : [];
    const groupStats = results.group_stats ? Object.values(results.group_stats) : [];
    
    let overall = '';
    if (isSignificant) {
        if (absEffectSize >= 0.5) {
            overall = `<strong>Highly significant difference with large effect.</strong> The Mann-Whitney U test revealed a statistically significant difference (U = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) between groups on ${valueCol}. Effect size r = ${results.effect_size.toFixed(3)} (large).`;
        } else if (absEffectSize >= 0.3) {
            overall = `<strong>Significant difference with moderate effect.</strong> The Mann-Whitney U test detected a significant difference (U = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) between groups. Effect size r = ${results.effect_size.toFixed(3)} (medium).`;
        } else {
            overall = `<strong>Statistically significant but small effect.</strong> The test identified a significant difference (U = ${results.statistic.toFixed(1)}, p = ${results.p_value.toFixed(3)}), but the effect size (r = ${results.effect_size.toFixed(3)}) is small.`;
        }
    } else {
        overall = `<strong>No significant difference detected.</strong> The Mann-Whitney U test found no statistically significant difference (U = ${results.statistic.toFixed(1)}, p = ${results.p_value.toFixed(3)}) between groups on ${valueCol}.`;
    }
    
    insights.push(`<strong>U Statistic:</strong> U = ${results.statistic.toFixed(1)}. Based on ranking all observations and comparing rank sums between groups.`);
    
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
    
    if (groupStats.length === 2) {
        const [group1, group2] = groupStats;
        const [name1, name2] = groupNames;
        const medianDiff = Math.abs(group1.median - group2.median);
        insights.push(`<strong>Group Comparison:</strong> ${name1} (median = ${group1.median.toFixed(2)}, n = ${group1.count}) vs ${name2} (median = ${group2.median.toFixed(2)}, n = ${group2.count}). Median difference = ${medianDiff.toFixed(2)}.`);
    }
    
    let recommendations = '';
    if (!isSignificant && absEffectSize < 0.2) {
        recommendations = 'No meaningful difference detected. Consider increasing sample size or examining other variables.';
    } else if (isSignificant && absEffectSize < 0.3) {
        recommendations = 'Statistically significant but small effect. Assess practical significance in your domain.';
    } else if (!isSignificant && absEffectSize >= 0.3) {
        recommendations = 'Large effect size but not significant - likely a power issue. Collect more data.';
    } else {
        recommendations = 'Significant difference with meaningful effect size. Investigate what factors distinguish the groups.';
    }
    
    return { overall_analysis: overall, statistical_insights: insights, recommendations };
};


// Mann-Whitney U Analysis Guide Component
const MannWhitneyGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Mann-Whitney U Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Mann-Whitney U */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                What is Mann-Whitney U Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The Mann-Whitney U test (also called Wilcoxon rank-sum test) is a <strong>non-parametric</strong> test 
                that compares two independent groups. Instead of comparing means, it compares the <strong>ranks</strong> of 
                observations to determine if one group tends to have higher values.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Advantage:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Unlike the t-test, Mann-Whitney U doesn&apos;t assume normality. It&apos;s robust to outliers 
                    and works with ordinal data (rankings, Likert scales).
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
                  <p className="font-medium text-sm text-primary">Use Mann-Whitney U When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data is <strong>not normally distributed</strong></li>
                    <li>• You have <strong>outliers</strong> in your data</li>
                    <li>• Data is <strong>ordinal</strong> (rankings, scales)</li>
                    <li>• <strong>Sample sizes are small</strong> (n &lt; 30)</li>
                    <li>• Comparing <strong>exactly 2 independent groups</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Use Independent T-Test Instead When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data is normally distributed</li>
                    <li>• No significant outliers</li>
                    <li>• Large sample sizes (n &gt; 30 per group)</li>
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
                    <p className="font-medium text-sm">Combine & Rank</p>
                    <p className="text-xs text-muted-foreground">All observations from both groups are combined and ranked from lowest to highest.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium text-sm">Sum Ranks</p>
                    <p className="text-xs text-muted-foreground">Calculate the sum of ranks for each group separately.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium text-sm">Calculate U</p>
                    <p className="text-xs text-muted-foreground">The U statistic measures how often values from one group precede values from the other in the ranking.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium text-sm">Determine Significance</p>
                    <p className="text-xs text-muted-foreground">Compare U to critical values or convert to a p-value. p &lt; 0.05 indicates significant difference.</p>
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
                  <p className="font-medium text-sm">U Statistic</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The number of times an observation from Group 1 precedes an observation from Group 2 in the combined ranking.
                    <br/><strong>Lower U</strong> = more separation between groups.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Effect Size (r)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Formula:</strong> r = Z / √N
                    <br/>Measures the strength of the relationship. Ranges from -1 to 1.
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
                  <p className="font-medium text-sm">Median vs Mean</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mann-Whitney compares <strong>distributions</strong>, often interpreted through medians.
                    <br/>Report medians (not means) when presenting results.
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
                    Observations must be independent. Different subjects in each group.
                    <br/><em>For paired/related samples, use Wilcoxon signed-rank test.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Ordinal or Continuous Data
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data must be at least ordinal (can be ranked meaningfully).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Similar Distribution Shapes (for median interpretation)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If you want to interpret results as median differences, both groups should have similarly 
                    shaped distributions. If shapes differ, the test is about &quot;stochastic dominance&quot; 
                    (one group tending to have higher values overall).
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
                    Report: U, p-value, effect size r, medians
                    <br/>Example: <em>U</em> = 145.5, <em>p</em> = .023, <em>r</em> = .34
                    <br/>Include group medians and sample sizes
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Sample Size</p>
                  <p className="text-xs text-muted-foreground">
                    Minimum: 10 per group recommended
                    <br/>With n &gt; 20 per group, the test has good power
                    <br/>Very small samples may lack power to detect differences
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
                    <li>• 3+ groups → Kruskal-Wallis test</li>
                    <li>• Paired data → Wilcoxon signed-rank</li>
                    <li>• Normal data, large n → T-test (more power)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Mann-Whitney U is about <strong>ranks</strong>, 
                not raw values. It&apos;s the go-to test when your data violates normality assumptions or contains 
                outliers. Always report the effect size (r) alongside the p-value to show practical significance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const mannWhitneyExample = exampleDatasets.find(d => d.analysisTypes?.includes('wilcoxon'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <FlaskConical className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Mann-Whitney U Test</CardTitle>
                    <CardDescription className="text-base mt-2">Non-parametric test for comparing two independent groups</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Rank-Based</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Uses ranks, not raw values</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Robust</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Handles outliers well</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Two Groups</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Independent samples</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">Non-parametric alternative to independent t-test. Use when data violates normality, contains outliers, or is ordinal.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• Exactly 2 independent groups</li>
                                    <li>• Numeric or ordinal measure</li>
                                    <li>• 10+ per group recommended</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Results
                                </h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• U Statistic (rank sums)</li>
                                    <li>• p &lt; 0.05 = Significant</li>
                                    <li>• Effect size r</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {mannWhitneyExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(mannWhitneyExample)} size="lg">
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

interface MannWhitneyPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MannWhitneyPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: MannWhitneyPageProps) {
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

    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && binaryCategoricalHeaders.length > 0, [data, numericHeaders, binaryCategoricalHeaders]);

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
        
        if (groupCol) {
            const groups = new Set(data.map(row => row[groupCol]).filter(v => v != null));
            checks.push({ 
                label: 'Exactly 2 groups', 
                passed: groups.size === 2, 
                detail: `Found ${groups.size} groups (need exactly 2)` 
            });
            
            const groupArray = Array.from(groups);
            const counts = groupArray.map(g => data.filter(row => row[groupCol] === g).length);
            const minN = Math.min(...counts);
            checks.push({ 
                label: 'Adequate group sizes', 
                passed: minN >= 10, 
                detail: `Smallest group: n = ${minN} (recommended: 10+)` 
            });
        }
        
        return checks;
    }, [data, groupCol, valueCol]);

    const allValidationsPassed = useMemo(() => {
        return dataValidation.filter(c => c.label === 'Group variable selected' || c.label === 'Value variable selected' || c.label === 'Exactly 2 groups').every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0 || !canRun) {
            setView('intro');
        } else {
            const defaultGroup = binaryCategoricalHeaders[0] || '';
            const defaultValue = numericHeaders[0] || '';
            setGroupCol(defaultGroup);
            setValueCol(defaultValue);
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, binaryCategoricalHeaders, canRun]);

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
            link.download = `Mann_Whitney_U_${new Date().toISOString().split('T')[0]}.png`;
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
        if (!analysisResult) return;
        const results = analysisResult.results;
        let csvContent = "MANN-WHITNEY U TEST\n";
        csvContent += `Group: ${groupCol}\nValue: ${valueCol}\n\n`;
        csvContent += `U Statistic: ${results.statistic}\nP-value: ${results.p_value}\nEffect Size: ${results.effect_size}\n\n`;
        if (results.group_stats) {
            csvContent += "GROUP STATISTICS\n";
            const statsData = Object.entries(results.group_stats).map(([g, s]) => ({ Group: g, N: s.count, Mean: s.mean, Median: s.median, StdDev: s.std }));
            csvContent += Papa.unparse(statsData) + "\n";
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Mann_Whitney_U_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, groupCol, valueCol, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!groupCol || !valueCol) {
            toast({ variant: "destructive", title: "Please select variables." });
            return;
        }
        const groups = Array.from(new Set(data.map(d => d[groupCol]))).filter(g => g != null);
        if (groups.length !== 2) {
            toast({ variant: "destructive", title: `Need exactly 2 groups, found ${groups.length}.` });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/mann-whitney`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, group_col: groupCol, value_col: valueCol })
            });
        
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || result.error || 'Analysis failed');
            if (result.error) throw new Error(result.error);
            
            result.interpretations = generateMannWhitneyInterpretations(result.results, groupCol, valueCol);
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Mann-Whitney U Complete', description: 'Results are ready.' });

        } catch (e: any) {
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupCol, valueCol, toast]);


    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult?.results) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/mann-whitney-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult.results,
                groupCol,
                valueCol,
                sampleSize: data.length
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Mann_Whitney_U_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, groupCol, valueCol, data.length, toast]);


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
            <MannWhitneyGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <MannWhitneyGlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Mann-Whitney U Test</h1>
                    <p className="text-muted-foreground mt-1">Non-parametric two-group comparison</p>
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
                                    <Label className="text-sm font-medium">Group Variable (2 categories)</Label>
                                    <Select value={groupCol} onValueChange={setGroupCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select grouping..." /></SelectTrigger>
                                        <SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Value Variable (Numeric)</Label>
                                    <Select value={valueCol} onValueChange={setValueCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select value..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {groupCol && (
                                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                    <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                    <p className="text-sm text-muted-foreground">
                                        Groups: {Array.from(new Set(data.map(row => row[groupCol]).filter(v => v != null))).join(', ')} | 
                                        Sample size: <span className="font-semibold text-foreground">{data.length}</span>
                                    </p>
                                </div>
                            )}
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
                                    <CardDescription>Review Mann-Whitney U configuration</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Group Variable:</strong> {groupCol || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Value Variable:</strong> {valueCol || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Test Type:</strong> Mann-Whitney U (Wilcoxon rank-sum)</p>
                                    <p>• <strong className="text-foreground">Alternative:</strong> Two-sided</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />
                                    About the Test
                                </h4>
                                <p className="text-sm text-muted-foreground">Mann-Whitney U compares two independent groups using ranks. It's robust to non-normality and outliers.</p>
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
                                <p className="text-sm text-muted-foreground">The test will rank all observations and compare rank sums between groups.</p>
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
                    const groupStats = results.group_stats ? Object.entries(results.group_stats) : [];
                    const group1 = groupStats[0];
                    const group2 = groupStats[1];

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>Comparison of {valueCol} between groups</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
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
                                                    ? `A meaningful difference was found between the two groups. ${valueCol} varies depending on ${groupCol}.`
                                                    : `No statistically significant difference between the two groups. ${groupCol} and ${valueCol} appear unrelated.`}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                {group1 && group2 
                                                    ? `Comparing ${group1[0]} group (median: ${(group1[1] as any).median?.toFixed(2)}) with ${group2[0]} group (median: ${(group2[1] as any).median?.toFixed(2)}).`
                                                    : 'Comparing medians between groups.'}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                {absR >= 0.5 
                                                    ? 'Large effect size. This is a practically meaningful difference.'
                                                    : absR >= 0.3 
                                                        ? 'Medium effect size. There is a moderate practical difference.'
                                                        : 'Small effect size. Even if significant, practical implications are limited.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">
                                                {isGood ? "Meaningful Difference Found!" : isSignificant ? "Difference Exists, But Small Effect" : "No Significant Difference"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? "Consider different approaches for each group." 
                                                    : isSignificant 
                                                        ? "Statistical difference exists but re-evaluate practical significance." 
                                                        : "Both groups can be treated similarly."}
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
                                        <p>• <strong>U Statistic:</strong> {results.statistic.toFixed(1)} — Compares ranks between the two groups. Extreme U values indicate one group consistently ranks higher.</p>
                                        <p>• <strong>p-value:</strong> {results.p_value < 0.001 ? '< 0.001' : results.p_value.toFixed(4)} — {isSignificant 
                                            ? `Only ${pPct}% chance this difference occurred by random chance. Below 5%, so statistically significant.`
                                            : `${pPct}% chance this occurred randomly. Above 5%, so we cannot rule out chance.`}</p>
                                        <p>• <strong>Effect size (r):</strong> {results.effect_size.toFixed(3)} — {absR >= 0.5 ? 'Above 0.5 is a large effect.' : absR >= 0.3 ? '0.3–0.5 is a medium effect.' : 'Below 0.3 is a small effect.'} (Range: -1 to 1)</p>
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
                                        <CardDescription>Understanding Mann-Whitney U results</CardDescription>
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
                                                Mann-Whitney U <strong className="text-foreground">ranks all observations</strong> from both groups together, 
                                                then compares the sum of ranks between groups. A significant difference means one group tends to have higher ranks.
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
                                                        <strong className="text-foreground">{name}</strong>: median = {stats.median.toFixed(2)}, n = {stats.count}
                                                        {i < groupStats.length - 1 ? ' vs. ' : '.'}
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
                                                    ? ' This represents a practically meaningful difference.'
                                                    : ' The practical difference may be limited.'}
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
                            <h2 className="text-2xl font-bold">Mann-Whitney U Test Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">Group: {groupCol} | Value: {valueCol} | {new Date().toLocaleDateString()}</p>
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
                                            A Mann-Whitney U test was conducted to compare {valueCol} between two groups defined by {groupCol}. 
                                            {groupStats.length === 2 && (
                                                <> The {groupStats[0][0]} group (<em>Mdn</em> = {groupStats[0][1].median.toFixed(2)}, <em>n</em> = {groupStats[0][1].count}) 
                                                was compared with the {groupStats[1][0]} group (<em>Mdn</em> = {groupStats[1][1].median.toFixed(2)}, <em>n</em> = {groupStats[1][1].count}).</>
                                            )}
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The test {results.p_value < 0.05 ? 'revealed a statistically significant difference' : 'did not reveal a statistically significant difference'} between the groups, 
                                            <span className="font-mono"> U = {results.statistic.toFixed(1)}</span>, 
                                            <em> p</em> {results.p_value < 0.001 ? '< .001' : `= ${results.p_value.toFixed(3)}`}, 
                                            <em> r</em> = {results.effect_size.toFixed(2)}.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The effect size (<em>r</em> = {results.effect_size.toFixed(2)}) indicates a {getEffectSizeInterpretation(results.effect_size).toLowerCase()} effect, 
                                            suggesting that group membership {Math.abs(results.effect_size) >= 0.3 ? 'has a meaningful association with' : 'has limited practical impact on'} {valueCol}.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Visualization</CardTitle>
                                    <CardDescription>Distribution comparison</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={analysisResult.plot} alt="Mann-Whitney U Visualization" width={1500} height={1200} className="w-3/4 rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

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
                                                <TableHead className="text-right">Min</TableHead>
                                                <TableHead className="text-right">Max</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.group_stats).map(([group, stats]) => (
                                                <TableRow key={group}>
                                                    <TableCell className="font-medium">{group}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.count}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.median.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.min?.toFixed(3) ?? '—'}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.max?.toFixed(3) ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
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
                                            <TableHead className="text-right">U Value</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">Effect Size (r)</TableHead>
                                            <TableHead className="text-center">Magnitude</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Mann-Whitney U</TableCell>
                                            <TableCell className="text-right font-mono">{results.statistic.toFixed(1)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={results.p_value < 0.05 ? 'default' : 'outline'}>
                                                    {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{results.effect_size.toFixed(3)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={Math.abs(results.effect_size) >= 0.3 ? 'default' : 'secondary'}>
                                                    {results.effect_size_interpretation.text}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">Effect size r = Z / √N</p>
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

