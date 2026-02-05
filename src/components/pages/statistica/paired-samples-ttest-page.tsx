'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Repeat, BarChart, Settings, FileSearch, Lightbulb, CheckCircle, XCircle, AlertTriangle, HelpCircle, TrendingUp, Target, Activity, Layers, BookOpen, Users, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, FileText, BarChart3, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType, Info, Code, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Label } from '../../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '../../ui/badge';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '@/components/ui/separator';


// ✅ FastAPI Cloud Run URL
const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/paired_ttest.py?alt=media";

// Statistical terms glossary for Paired Samples T-Test
const pairedTTestTermDefinitions: Record<string, string> = {
    "Paired Samples T-Test": "A statistical test used to compare two related measurements from the same subjects. It determines whether the mean difference between paired observations is significantly different from zero.",
    "Paired Observations": "Two measurements taken from the same subject or matched pairs. Examples include before/after measurements, left/right comparisons, or matched case-control pairs.",
    "Mean Difference": "The average of all individual differences between paired measurements (Variable 1 - Variable 2). A positive value indicates Variable 1 is higher on average.",
    "T-Statistic": "The test statistic calculated as the mean difference divided by the standard error of the differences. Larger absolute values indicate stronger evidence against the null hypothesis.",
    "Degrees of Freedom (df)": "For paired t-test, df = n - 1, where n is the number of pairs. It determines the shape of the t-distribution used for calculating p-values.",
    "P-Value": "The probability of observing a result as extreme as the current one, assuming no true difference exists. P < 0.05 is typically considered statistically significant.",
    "Statistical Significance": "When p < α (usually 0.05), we conclude the observed difference is unlikely due to chance alone. This doesn't measure the size or importance of the effect.",
    "Cohen's d": "A standardized measure of effect size. Calculated as mean difference divided by standard deviation of differences. Values of 0.2, 0.5, and 0.8 represent small, medium, and large effects.",
    "Effect Size": "A quantitative measure of the magnitude of a phenomenon. Unlike p-values, effect sizes are independent of sample size and indicate practical significance.",
    "Confidence Interval (CI)": "A range of values that likely contains the true population mean difference. A 95% CI means if we repeated the study many times, 95% of intervals would contain the true value.",
    "Standard Error (SE)": "The standard deviation of the sampling distribution of the mean difference. It measures the precision of the sample mean difference as an estimate of the population mean difference.",
    "Standard Deviation (SD)": "A measure of the spread or variability of the differences. Larger SD indicates more variability in how individuals respond to the treatment or intervention.",
    "Null Hypothesis (H₀)": "The assumption that there is no true difference between the paired measurements (mean difference = 0). The t-test evaluates evidence against this hypothesis.",
    "Alternative Hypothesis (H₁)": "The hypothesis that there is a true difference. Can be two-sided (≠ 0), or one-sided (> 0 or < 0) depending on the research question.",
    "Two-Tailed Test": "Tests whether the mean difference is different from zero in either direction. Use when you don't have a specific directional prediction.",
    "One-Tailed Test": "Tests whether the mean difference is specifically greater than or less than zero. Use only when you have a strong directional hypothesis before seeing the data.",
    "Normality Assumption": "The paired t-test assumes the differences are approximately normally distributed. With large samples (n > 30), the test is robust to violations of this assumption.",
    "Shapiro-Wilk Test": "A statistical test for normality. P > 0.05 suggests the data are approximately normal. Used to check the normality assumption of the differences.",
    "Type I Error (α)": "The probability of rejecting a true null hypothesis (false positive). Typically set at 0.05, meaning a 5% chance of concluding there's an effect when there isn't one.",
    "Type II Error (β)": "The probability of failing to reject a false null hypothesis (false negative). Related to statistical power, which is 1 - β.",
    "Statistical Power": "The probability of detecting a true effect when it exists (1 - β). Higher power reduces the chance of missing real effects. Typically aim for 80% power.",
    "Sample Size (n)": "The number of paired observations. Larger samples provide more precise estimates and greater statistical power to detect true effects.",
    "Dependent Variable": "The variable being measured at two time points or under two conditions. Must be continuous (interval or ratio scale) for the paired t-test.",
    "Within-Subjects Design": "An experimental design where the same subjects are measured under multiple conditions. Reduces variability due to individual differences, increasing statistical power."
};

// Glossary Modal Component for Paired T-Test
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Paired Samples T-Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in paired samples t-test analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(pairedTTestTermDefinitions).map(([term, definition]) => (
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

interface TTestResults {
    test_type: string;
    variable1?: string;
    variable2?: string;
    n?: number;
    mean_diff?: number;
    se_diff?: number;
    t_statistic: number;
    degrees_of_freedom: number;
    p_value: number;
    significant: boolean;
    cohens_d: number;
    confidence_interval?: [number, number];
    interpretation: string;
    dropped_rows?: number[];
    n_dropped?: number;
    normality_test?: {
        [key: string]: {
            statistic: number;
            p_value: number;
            assumption_met: boolean;
        }
    };
    descriptives?: {
        [key: string]: {
            n: number;
            mean: number;
            std_dev: number;
            se_mean?: number;
        }
    }
}

interface FullAnalysisResponse {
    results: TTestResults;
    plot: string;
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

// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - Paired Samples T-Test"
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
        link.download = 'paired_ttest.py';
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

// Generate interpretations for paired samples t-test (APA format)
const generatePairedSamplesInterpretations = (results: TTestResults) => {
    const insights: string[] = [];
    
    const pValue = results.p_value;
    const tStat = results.t_statistic;
    const cohensD = results.cohens_d;
    const df = results.degrees_of_freedom;
    const n = results.n || (df + 1);
    const isSignificant = pValue <= 0.05;
    const var1 = results.variable1 || 'Variable 1';
    const var2 = results.variable2 || 'Variable 2';
    
    const desc1 = results.descriptives?.[var1];
    const desc2 = results.descriptives?.[var2];
    const descDiff = results.descriptives?.['differences'];
    const mean1 = desc1?.mean || 0;
    const mean2 = desc2?.mean || 0;
    const sd1 = desc1?.std_dev || 0;
    const sd2 = desc2?.std_dev || 0;
    const meanDiff = results.mean_diff || (mean1 - mean2);
    const sdDiff = descDiff?.std_dev || 0;
    const ci = results.confidence_interval;
    
    const absD = Math.abs(cohensD);
    let effectLabel = 'negligible';
    if (absD >= 0.8) effectLabel = 'large';
    else if (absD >= 0.5) effectLabel = 'medium';
    else if (absD >= 0.2) effectLabel = 'small';
    
    const pFormatted = pValue < .001 ? '< .001' : `= ${pValue.toFixed(3).replace(/^0/, '')}`;
    const ciFormatted = ci ? `95% CI [${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]` : '';
    
    let overall = `A paired-samples <em>t</em>-test was conducted to compare <strong>${var1}</strong> and <strong>${var2}</strong>. `;
    
    if (isSignificant) {
        overall += `There was a significant difference in the scores for ${var1} (<em>M</em> = ${mean1.toFixed(2)}, <em>SD</em> = ${sd1.toFixed(2)}) and ${var2} (<em>M</em> = ${mean2.toFixed(2)}, <em>SD</em> = ${sd2.toFixed(2)}); <em>t</em>(${df}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        overall += `The mean difference was ${meanDiff.toFixed(2)} (${ciFormatted}), indicating a ${effectLabel} effect. `;
        overall += `${var1} was ${meanDiff > 0 ? 'higher' : 'lower'} than ${var2} on average.`;
    } else {
        overall += `There was no significant difference in the scores for ${var1} (<em>M</em> = ${mean1.toFixed(2)}, <em>SD</em> = ${sd1.toFixed(2)}) and ${var2} (<em>M</em> = ${mean2.toFixed(2)}, <em>SD</em> = ${sd2.toFixed(2)}); <em>t</em>(${df}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        if (ci) {
            overall += `The ${ciFormatted} for the mean difference included zero. `;
        }
        overall += `The null hypothesis of no difference between conditions cannot be rejected.`;
    }
    
    const pText = pValue < 0.001 ? '< .001' : pValue.toFixed(3);
    if (pValue < 0.001) {
        insights.push(`<strong>Significance:</strong> <em>p</em> < .001. Highly significant.`);
    } else if (pValue < 0.01) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Significant at .01 level.`);
    } else if (pValue < 0.05) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Significant at .05 level.`);
    } else if (pValue < 0.10) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Marginally significant.`);
    } else {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Not statistically significant.`);
    }
    
    insights.push(`<strong>Test Statistic:</strong> <em>t</em>(${df}) = ${tStat.toFixed(2)}. Based on ${n} paired observations.`);
    
    insights.push(`<strong>Effect Size:</strong> Cohen's <em>d</em> = ${cohensD.toFixed(2)} (${effectLabel}).`);
    
    insights.push(`<strong>Mean Difference:</strong> ${meanDiff.toFixed(2)} units (SD = ${sdDiff.toFixed(2)}).`);
    
    if (ci) {
        const includesZero = ci[0] <= 0 && 0 <= ci[1];
        insights.push(`<strong>Confidence Interval:</strong> ${ciFormatted}. ${includesZero ? 'Includes zero.' : 'Excludes zero.'}`);
    }
    
    insights.push(`<strong>Sample Size:</strong> <em>n</em> = ${n} pairs.`);
    
    if (results.normality_test?.differences) {
        const normTest = results.normality_test.differences;
        insights.push(`<strong>Normality:</strong> Shapiro-Wilk <em>W</em> = ${normTest.statistic.toFixed(3)}. ${normTest.assumption_met ? 'Differences are normally distributed.' : 'Non-normality detected.'}`);
    }
    
    let recommendations = '';
    if (!isSignificant) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The null hypothesis cannot be rejected at α = .05</li>
                <li>Consider increasing sample size for greater power</li>
                <li>Evaluate practical significance of observed change</li>
            </ul>
        `;
    } else if (absD < 0.2) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>Despite significance, the effect size is negligible</li>
                <li>Consider practical importance of this change</li>
            </ul>
        `;
    } else {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The result shows statistical and practical significance</li>
                <li>Consider replication to confirm the finding</li>
                ${absD >= 0.8 ? '<li>Large effect suggests meaningful change</li>' : ''}
            </ul>
        `;
    }
    
    return {
        overall_analysis: overall,
        statistical_insights: insights,
        recommendations: recommendations
    };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: TTestResults }) => {
    const isSignificant = results.p_value <= 0.05;
    
    const getEffectSizeInterpretation = (cohensD: number) => {
        const absD = Math.abs(cohensD);
        if (absD < 0.2) return "Negligible";
        if (absD < 0.5) return "Small";
        if (absD < 0.8) return "Medium";
        return "Large";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">T-Statistic</p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.t_statistic.toFixed(3)}</p>
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
                        <p className="text-xs text-muted-foreground">
                            {isSignificant ? 'Significant' : 'Not Significant'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Cohen's d</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.cohens_d.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.cohens_d)}
                        </p>
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
                        <p className="text-2xl font-semibold">{results.degrees_of_freedom.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">df = n - 1</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Paired Samples T-Test Analysis Guide Component
const PairedTTestGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Paired Samples T-Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Paired Samples T-Test */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                What is a Paired Samples T-Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                A paired samples t-test compares <strong>two related measurements from the same subjects</strong> 
                to determine if the mean difference is significantly different from zero. This design controls 
                for individual differences, making it more powerful than independent samples tests.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Common Use Cases:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Before/After: Blood pressure before vs after treatment<br/>
                    • Pre-test/Post-test: Scores at beginning vs end of course<br/>
                    • Matched pairs: Twin studies, left/right comparisons<br/>
                    • Repeated measures: Same subjects under two conditions
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
                    The mean difference between paired observations equals zero: <strong>μ<sub>d</sub> = 0</strong>
                    <br/>Example: &quot;There is no change from pre-test to post-test&quot;
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Alternative Hypothesis (H₁)</p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <p><strong>Two-sided:</strong> μ<sub>d</sub> ≠ 0 (any change)</p>
                    <p><strong>One-sided (greater):</strong> μ<sub>d</sub> &gt; 0 (Variable 1 higher)</p>
                    <p><strong>One-sided (less):</strong> μ<sub>d</sub> &lt; 0 (Variable 1 lower)</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Why Paired Design */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Why Use Paired Design?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Advantages</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Controls individual differences:</strong> Each subject is their own control</li>
                    <li>• <strong>More statistical power:</strong> Needs fewer subjects</li>
                    <li>• <strong>Reduced variability:</strong> Eliminates between-subject variation</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Considerations</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Order effects:</strong> May need counterbalancing</li>
                    <li>• <strong>Carryover effects:</strong> First condition may affect second</li>
                    <li>• <strong>Practice effects:</strong> Performance may improve over time</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Statistics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Key Statistics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">T-Statistic</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how many standard errors the mean difference is from zero.
                    <br/><strong>Formula:</strong> t = M<sub>d</sub> / SE<sub>d</sub>, where SE<sub>d</sub> = SD<sub>d</sub> / √n
                    <br/>Larger |t| → stronger evidence against H₀
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">P-value</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Probability of observing this difference (or more extreme) if H₀ is true.
                    <br/><strong>p &lt; 0.05:</strong> Significant — reject H₀
                    <br/><strong>p ≥ 0.05:</strong> Not significant — fail to reject H₀
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cohen&apos;s d (Effect Size)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Standardized measure of the change magnitude.
                    <br/><strong>Formula:</strong> d = M<sub>d</sub> / SD<sub>d</sub>
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&lt;0.2</p>
                      <p className="text-muted-foreground">Negligible</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.2-0.5</p>
                      <p className="text-muted-foreground">Small</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.5-0.8</p>
                      <p className="text-muted-foreground">Medium</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&gt;0.8</p>
                      <p className="text-muted-foreground">Large</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">95% Confidence Interval</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Range of plausible values for the true mean difference.
                    <br/>If CI <strong>excludes zero</strong> → significant at α = 0.05
                    <br/>If CI <strong>includes zero</strong> → not significant
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
                  <p className="font-medium text-sm text-primary">1. Paired Observations</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each row represents two measurements from the same subject or matched pair.
                    <br/>The pairing must be meaningful (not random).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Continuous Data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Both variables should be measured on an interval or ratio scale.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Independence of Pairs</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each pair of observations should be independent of other pairs.
                    <br/>Different subjects should not influence each other.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">4. Normality of Differences</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The <strong>differences</strong> (not the original variables) should be approximately normal.
                    <br/><strong>However:</strong> Robust with n ≥ 30 pairs (Central Limit Theorem).
                    <br/><strong>Check:</strong> Shapiro-Wilk test on differences (p &gt; 0.05 = assumption met)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Significant Result (p &lt; 0.05)</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Reject H₀: Evidence that μ<sub>d</sub> ≠ 0</li>
                    <li>• There is a significant change between conditions</li>
                    <li>• Check Cohen&apos;s d for practical importance</li>
                    <li>• Large d with significant p → meaningful intervention effect</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Non-Significant Result (p ≥ 0.05)</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Fail to reject H₀: No evidence that μ<sub>d</sub> ≠ 0</li>
                    <li>• The change could be due to chance</li>
                    <li>• Does NOT prove no change occurred</li>
                    <li>• Consider: Is sample size adequate?</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Decision Matrix</p>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1">P-value</th>
                          <th className="text-left p-1">Cohen&apos;s d</th>
                          <th className="text-left p-1">Interpretation</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="p-1">&lt; 0.05</td>
                          <td className="p-1">≥ 0.5</td>
                          <td className="p-1">Meaningful change — intervention worked</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-1">&lt; 0.05</td>
                          <td className="p-1">&lt; 0.5</td>
                          <td className="p-1">Real but small change — limited impact</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-1">≥ 0.05</td>
                          <td className="p-1">Any</td>
                          <td className="p-1">No reliable change detected</td>
                        </tr>
                      </tbody>
                    </table>
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
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ensure pairing is meaningful and correct</li>
                    <li>• Choose hypothesis direction before seeing data</li>
                    <li>• Check for missing pairs</li>
                    <li>• Aim for n ≥ 30 pairs for robustness</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA Style)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <em>t</em>(df) = X.XX, <em>p</em> = .XXX, <em>d</em> = X.XX</li>
                    <li>• Include M and SD for both conditions</li>
                    <li>• Report 95% CI for mean difference</li>
                    <li>• Describe direction of change</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Using independent test for paired data</li>
                    <li>• Ignoring effect size (only reporting p)</li>
                    <li>• Not checking normality of differences</li>
                    <li>• Concluding &quot;no change&quot; from non-significant p</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Different subjects → Independent T-Test</li>
                    <li>• More than 2 time points → Repeated Measures ANOVA</li>
                    <li>• Non-normal differences with small n → Wilcoxon Signed-Rank</li>
                    <li>• Categorical outcome → McNemar&apos;s Test</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> The paired samples t-test answers 
                &quot;Is there a significant change from condition 1 to condition 2?&quot; The key assumption 
                is that the <strong>differences</strong> are normally distributed (not the original variables). 
                Always report both statistical significance (p-value) and practical significance (Cohen&apos;s d).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const PairedSamplesIntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Repeat className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Paired Samples T-Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare two related measurements from the same subjects
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Repeat className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Before/After</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Compare pre-test and post-test measurements
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Same Subjects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Controls for individual differences
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">More Powerful</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Higher statistical power than independent test
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use This Test
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Paired Samples T-Test when you have two measurements from the same subjects. For example, comparing blood pressure before and after treatment, or test scores at the beginning vs end of a course.
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
                                        <span><strong>Two numeric variables:</strong> Related measurements</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Paired observations:</strong> Same subjects measured twice</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Normal differences:</strong> Or large sample (n &gt; 30)</span>
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
                                        <span><strong>t-statistic & p-value:</strong> Statistical significance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Mean difference:</strong> Average change</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>95% CI:</strong> Range of plausible change</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {ttestExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(ttestExample)} size="lg">
                                {ttestExample.icon && <ttestExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface PairedSamplesTTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    restoredState?: any;
}

export default function PairedSamplesTTestPage({ 
    data, 
    numericHeaders, 
    onLoadExample,
    restoredState
}: PairedSamplesTTestPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    // Wizard state
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Form state
    const [pairedVar1, setPairedVar1] = useState<string>('');
    const [pairedVar2, setPairedVar2] = useState<string>('');
    const [alternative, setAlternative] = useState('two-sided');
    
    // Results state
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    
    // Glossary modal state
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length >= 2;
    }, [data, numericHeaders]);

    const availablePairedVar2 = useMemo(() => 
        numericHeaders.filter(h => h !== pairedVar1),
        [numericHeaders, pairedVar1]
    );

    // Data validation checks
    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        if (pairedVar1 && pairedVar2) {
            const validPairs = data.filter(row => 
                row[pairedVar1] != null && !isNaN(Number(row[pairedVar1])) && row[pairedVar1] !== '' &&
                row[pairedVar2] != null && !isNaN(Number(row[pairedVar2])) && row[pairedVar2] !== ''
            );
            
            const totalRows = data.length;
            const missingCount = totalRows - validPairs.length;
            
            checks.push({ 
                label: 'Sufficient sample size', 
                passed: validPairs.length >= 2, 
                detail: `n = ${validPairs.length} valid pairs (minimum: 2)` 
            });
            checks.push({ 
                label: 'Two different variables', 
                passed: pairedVar1 !== pairedVar2, 
                detail: pairedVar1 !== pairedVar2 ? `Comparing ${pairedVar1} vs ${pairedVar2}` : 'Select two different variables' 
            });
            checks.push({ 
                label: 'Missing values check', 
                passed: missingCount === 0, 
                detail: missingCount === 0 
                    ? 'No missing values detected' 
                    : `${missingCount} pair${missingCount > 1 ? 's' : ''} with missing values will be excluded`
            });
            checks.push({ 
                label: 'Variables selected', 
                passed: pairedVar1 !== '' && pairedVar2 !== '', 
                detail: pairedVar1 && pairedVar2 ? 'Both variables selected' : 'Please select both variables' 
            });
        }
        return checks;
    }, [data, pairedVar1, pairedVar2]);

    const allValidationsPassed = dataValidation.every(check => check.passed);

    useEffect(() => {
        if (numericHeaders.length > 0 && !pairedVar1) {
            setPairedVar1(numericHeaders[0]);
        }
        if (numericHeaders.length > 1 && !pairedVar2) {
            setPairedVar2(numericHeaders[1]);
        }
    }, [numericHeaders, pairedVar1, pairedVar2]);

    useEffect(() => {
        if (restoredState) {
            setPairedVar1(restoredState.params.pairedVar1 || numericHeaders[0] || '');
            setPairedVar2(restoredState.params.pairedVar2 || numericHeaders[1] || '');
            setAlternative(restoredState.params.alternative || 'two-sided');
            setAnalysisResult({ results: restoredState.results, plot: '' });
            setView('main');
            setCurrentStep(4);
            setMaxReachedStep(6);
        } else {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
        }
    }, [restoredState, canRun, numericHeaders]);

    useEffect(() => {
        if (!restoredState) {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

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

    const getEffectSizeInterpretation = (d: number) => {
        const absD = Math.abs(d);
        if (absD >= 0.8) return { label: 'Large', color: 'text-foreground' };
        if (absD >= 0.5) return { label: 'Medium', color: 'text-foreground' };
        if (absD >= 0.2) return { label: 'Small', color: 'text-foreground' };
        return { label: 'Negligible', color: 'text-muted-foreground' };
    };

    const getPercentageChange = () => {
        if (!analysisResult?.results) return null;
        const results = analysisResult.results;
        if (results.descriptives && results.variable1 && results.variable2) {
            const mean1 = results.descriptives[results.variable1]?.mean;
            const mean2 = results.descriptives[results.variable2]?.mean;
            if (mean2 && mean2 !== 0) {
                return ((mean1 - mean2) / Math.abs(mean2) * 100).toFixed(1);
            }
        }
        return null;
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) {
            toast({ variant: 'destructive', title: 'No results to download' });
            return;
        }

        setIsDownloading(true);
        toast({ title: "Generating image..." });

        try {
            const canvas = await html2canvas(resultsRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            link.download = `Paired_Samples_TTest_Report_${date}.png`;
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
        if (!analysisResult) return;
        
        const results = analysisResult.results;
        
        const mainResults = [{
            test_type: results.test_type,
            variable1: results.variable1 || pairedVar1,
            variable2: results.variable2 || pairedVar2,
            t_statistic: results.t_statistic,
            degrees_of_freedom: results.degrees_of_freedom,
            p_value: results.p_value,
            significant: results.significant,
            cohens_d: results.cohens_d,
            mean_diff: results.mean_diff,
            ci_lower: results.confidence_interval?.[0],
            ci_upper: results.confidence_interval?.[1],
        }];
        
        let csvContent = "PAIRED SAMPLES T-TEST RESULTS\n";
        csvContent += Papa.unparse(mainResults) + "\n\n";
        
        if (results.descriptives) {
            csvContent += "DESCRIPTIVE STATISTICS\n";
            const descData = Object.entries(results.descriptives).map(([variable, stats]: [string, any]) => ({
                variable, n: stats.n, mean: stats.mean, std_dev: stats.std_dev
            }));
            csvContent += Papa.unparse(descData) + "\n\n";
        }
        
        csvContent += "INTERPRETATION\n";
        csvContent += `"${results.interpretation}"\n`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `Paired_Samples_TTest_Results_${date}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, pairedVar1, pairedVar2, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/paired-ttest-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    plot: analysisResult.plot,
                    variable1: pairedVar1,
                    variable2: pairedVar2,
                    alternative,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Paired_TTest_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, pairedVar1, pairedVar2, alternative, data.length, toast]);
    
    const handleAnalysis = useCallback(async () => {
        if (!pairedVar1 || !pairedVar2 || pairedVar1 === pairedVar2) {
            toast({ variant: 'destructive', title: 'Please select two different variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/paired-ttest`, {

                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    params: { 
                        variable1: pairedVar1, 
                        variable2: pairedVar2, 
                        alternative: alternative 
                    }
                })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                throw new Error(errorResult.detail || errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Paired T-Test Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, pairedVar1, pairedVar2, alternative, toast]);

    if (!canRun || view === 'intro') {
        return <PairedSamplesIntroPage onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    // Progress Bar Component
    const ProgressBar = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between w-full gap-2">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!analysisResult);
                    const isCurrent = currentStep === step.id;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
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
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen} 
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
            
            {/* Glossary Modal */}
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
            
            {/* 👇 Guide 컴포넌트 추가 */}
            <PairedTTestGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Paired Samples T-Test</h1>
                    <p className="text-muted-foreground mt-1">
                        Compare two related measurements from the same subjects.
                    </p>
                </div>
                {/* 👇 버튼 수정 */}
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
                {/* Step 1: Data Selection */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Your Data</CardTitle>
                                    <CardDescription>Choose the two variables to compare</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Variable 1 (e.g., Before)</Label>
                                    <Select value={pairedVar1} onValueChange={setPairedVar1}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select first variable" /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">First measurement (e.g., pre-test)</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Variable 2 (e.g., After)</Label>
                                    <Select value={pairedVar2} onValueChange={setPairedVar2}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select second variable" /></SelectTrigger>
                                        <SelectContent>{availablePairedVar2.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Second measurement (e.g., post-test)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> pairs</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Comparison Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Comparison Settings</CardTitle>
                                    <CardDescription>Configure your hypothesis test</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Hypothesis Direction</Label>
                                <Select value={alternative} onValueChange={setAlternative}>
                                    <SelectTrigger className="h-11 max-w-md"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="two-sided">Two-Sided (≠) - Detect any change</SelectItem>
                                        <SelectItem value="greater">One-Sided (&gt;) - Variable 1 higher than Variable 2</SelectItem>
                                        <SelectItem value="less">One-Sided (&lt;) - Variable 1 lower than Variable 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Why Paired Samples?</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Same subjects:</strong> Each row represents one person measured twice</p>
                                    <p>• <strong className="text-foreground">Controls variation:</strong> Individual differences don't affect results</p>
                                    <p>• <strong className="text-foreground">More powerful:</strong> Needs fewer subjects than independent test</p>
                                </div>
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
                                <Repeat className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">The test analyzes the differences between paired measurements.</p>
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

                {/* Step 4: Result Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Result Summary</CardTitle>
                                    <CardDescription>Key findings from your analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${results.significant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${results.significant ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className={`font-bold ${results.significant ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                        <p className="text-sm">
                                            {(() => {
                                                const meanDiff = results.mean_diff || 0;
                                                const pctChange = getPercentageChange();
                                                if (pctChange) {
                                                    return `The change from ${pairedVar1} to ${pairedVar2} is ${Math.abs(parseFloat(pctChange))}% ${meanDiff >= 0 ? 'increase' : 'decrease'}.`;
                                                }
                                                return `The average change is ${Math.abs(meanDiff).toFixed(2)} units ${meanDiff >= 0 ? 'increase' : 'decrease'}.`;
                                            })()}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className={`font-bold ${results.significant ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                        <p className="text-sm">
                                            {results.significant 
                                                ? "This change is real and consistent — not just random fluctuation in your data."
                                                : "This change could simply be normal variation — we can't confirm it's a real trend."}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className={`font-bold ${results.significant ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                        <p className="text-sm">
                                            {(() => {
                                                const absD = Math.abs(results.cohens_d);
                                                if (absD >= 0.8) return "The impact is substantial — this change will likely affect your outcomes.";
                                                if (absD >= 0.5) return "The impact is moderate — worth paying attention to and potentially acting on.";
                                                if (absD >= 0.2) return "The impact is minor — may or may not be worth addressing.";
                                                return "The impact is minimal — unlikely to meaningfully affect your outcomes.";
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 border ${results.significant && Math.abs(results.cohens_d) >= 0.2 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <div className="flex items-start gap-3">
                                    {results.significant && Math.abs(results.cohens_d) >= 0.2 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div>
                                        <p className="font-semibold">
                                            {results.significant && Math.abs(results.cohens_d) >= 0.2 
                                                ? "Meaningful Change Detected" 
                                                : results.significant 
                                                    ? "Small Change Detected" 
                                                    : "No Significant Change"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {results.significant && Math.abs(results.cohens_d) >= 0.2 
                                                ? "There's a meaningful change between the two measurements. This intervention or treatment appears to have an effect." 
                                                : results.significant 
                                                    ? "There's a confirmed change, but it's small. The effect may not be practically significant." 
                                                    : "No reliable change detected. The measurements are similar."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Mean Change</p>
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{(results.mean_diff || 0).toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {getPercentageChange() ? `${parseFloat(getPercentageChange()!) >= 0 ? '+' : ''}${getPercentageChange()}%` : 'Var1 - Var2'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">P-value</p>
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className={`text-2xl font-semibold ${!results.significant ? 'text-amber-600' : ''}`}>
                                                {results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {results.significant ? 'Significant' : 'Not Significant'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Cohen's d</p>
                                                <Target className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{results.cohens_d.toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {getEffectSizeInterpretation(results.cohens_d).label}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">T-Statistic</p>
                                                <BarChart className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{results.t_statistic.toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                df = {results.degrees_of_freedom}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Confidence:</span>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span key={star} className={`text-lg ${(results.p_value < 0.001 && star <= 5) || (results.p_value < 0.01 && star <= 4) || (results.p_value < 0.05 && star <= 3) || (results.p_value < 0.1 && star <= 2) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Why This Conclusion?</CardTitle>
                                    <CardDescription>Simple explanation of how we reached this result</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What We Measured</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We compared <strong className="text-foreground">{pairedVar1}</strong> vs <strong className="text-foreground">{pairedVar2}</strong> from the same subjects to see if there was a meaningful change.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">The Change</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {(() => {
                                                    const desc1 = results.descriptives?.[pairedVar1];
                                                    const desc2 = results.descriptives?.[pairedVar2];
                                                    if (desc1 && desc2) {
                                                        const diff = desc1.mean - desc2.mean;
                                                        return <><strong className="text-foreground">{pairedVar1}</strong> averaged <strong className="text-foreground">{desc1.mean.toFixed(2)}</strong> while <strong className="text-foreground">{pairedVar2}</strong> averaged <strong className="text-foreground">{desc2.mean.toFixed(2)}</strong>. That's a change of <strong className="text-foreground">{Math.abs(diff).toFixed(2)}</strong> units.</>;
                                                    }
                                                    return `The mean difference was ${Math.abs(results.mean_diff || 0).toFixed(2)} units.`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Is It Real or Just Noise?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {results.significant
                                                    ? <>We're <strong className="text-foreground">confident this change is real</strong>. Based on your data, there's less than 5% chance this is just random fluctuation.</>
                                                    : <>We <strong className="text-foreground">can't be sure this change is real</strong>. It could easily be normal variation rather than a genuine effect.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Does It Matter?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {(() => {
                                                    const absD = Math.abs(results.cohens_d);
                                                    if (absD >= 0.8) return <>Yes — this is a <strong className="text-foreground">large change</strong> that's likely to have real impact.</>;
                                                    if (absD >= 0.5) return <>Probably — this is a <strong className="text-foreground">moderate change</strong>. Worth considering.</>;
                                                    if (absD >= 0.2) return <>Maybe — this is a <strong className="text-foreground">small change</strong>. Consider if it's worth the effort.</>;
                                                    return <>Not really — even if real, this change is <strong className="text-foreground">too small</strong> to matter practically.</>;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 border ${results.significant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    {results.significant && Math.abs(results.cohens_d) >= 0.5 
                                        ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: The Change Worked</> 
                                        : results.significant 
                                            ? <><Info className="w-5 h-5 text-primary" /> Bottom Line: Small Effect</> 
                                            : <><AlertTriangle className="w-5 h-5 text-amber-600" /> Bottom Line: No Clear Change</>}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {results.significant && Math.abs(results.cohens_d) >= 0.5 
                                        ? "The intervention or treatment produced a meaningful change. This result supports its effectiveness." 
                                        : results.significant 
                                            ? "There's a real but small change. It may or may not be worth the investment." 
                                            : "No reliable change detected. The two measurements are essentially the same."}
                                </p>
                            </div>

                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Impact Scale Reference</h4>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Minimal</p><p className="text-muted-foreground">No action</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Small</p><p className="text-muted-foreground">Optional</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Moderate</p><p className="text-muted-foreground">Consider</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Large</p><p className="text-muted-foreground">Act now</p></div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (
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
                            <h2 className="text-2xl font-bold">Paired Samples T-Test Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {pairedVar1} vs {pairedVar2} | {new Date().toLocaleDateString()}
                            </p>
                        </div>

                        <StatisticalSummaryCards results={results} />

                        {results.n_dropped !== undefined && results.n_dropped > 0 && (
                            <Card>
                                <CardContent className="pt-6">
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Missing Values</AlertTitle>
                                        <AlertDescription>
                                            {results.n_dropped} pairs excluded due to missing values.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        )}

                        {(() => {
                            const interpretations = generatePairedSamplesInterpretations(results);
                            return (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Detailed Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                      <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                                <BookOpen className="h-4 w-4 text-primary" />
                                                <h3 className="font-semibold">APA Format Summary</h3>
                                                </div>                
                                            <div 
                                                className="text-sm leading-relaxed prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: interpretations.overall_analysis }}
                                            />
                                        </div>
                                        
                                    </CardContent>
                                </Card>
                            );
                        })()}
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Visualization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Paired T-Test Visualization" 
                                    width={1500} 
                                    height={1200} 
                                    className="w-3/4 mx-auto rounded-sm border"
                                />
                            </CardContent>
                        </Card>

                        {results.descriptives && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Descriptive Statistics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Variable</TableHead>
                                                <TableHead className="text-right">N</TableHead>
                                                <TableHead className="text-right">Mean</TableHead>
                                                <TableHead className="text-right">SD</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.descriptives).map(([variable, stats]) => (
                                                <TableRow key={variable}>
                                                    <TableCell className="font-medium">{variable}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Paired T-Test Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mean Diff</TableHead>
                                            <TableHead className="text-right">SE</TableHead>
                                            <TableHead className="text-right">t</TableHead>
                                            <TableHead className="text-right">df</TableHead>
                                            <TableHead className="text-right">p</TableHead>
                                            <TableHead className="text-right">Cohen's d</TableHead>
                                            {results.confidence_interval && <TableHead className="text-right">95% CI</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono">{results.mean_diff?.toFixed(4) || '—'}</TableCell>
                                            <TableCell className="font-mono text-right">{results.se_diff?.toFixed(4) || '—'}</TableCell>
                                            <TableCell className="font-mono text-right">{results.t_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono text-right">{results.degrees_of_freedom.toFixed(0)}</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="font-mono text-right">{results.cohens_d.toFixed(3)}</TableCell>
                                            {results.confidence_interval && (
                                                <TableCell className="font-mono text-right">
                                                    [{results.confidence_interval[0].toFixed(3)}, {results.confidence_interval[1].toFixed(3)}]
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {results.normality_test && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assumption Checks</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <h4 className="text-sm font-semibold mb-2">Normality of Differences (Shapiro-Wilk)</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Variable</TableHead>
                                                <TableHead className="text-right">W</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.normality_test).map(([variable, test]: [string, any]) => (
                                                <TableRow key={variable}>
                                                    <TableCell className="font-medium">{variable}</TableCell>
                                                    <TableCell className="font-mono text-right">{test.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="font-mono text-right">
                                                        {test.p_value < 0.001 ? '<.001' : test.p_value.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {test.assumption_met ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                                                <CheckCircle className="h-3 w-3 mr-1" />Met
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-red-50 text-red-700">
                                                                <XCircle className="h-3 w-3 mr-1" />Violated
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">p &gt; .05 indicates normality</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}
