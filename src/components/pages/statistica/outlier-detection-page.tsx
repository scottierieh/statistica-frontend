'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, HelpCircle, Settings, FileSearch, Filter, BookOpen, CheckCircle, Target, Activity, Zap, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, Lightbulb, BarChart, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/outlier_detection.py?alt=media";

interface OutlierResult {
    z_score_outliers: { index: number; value: number; z_score: number }[];
    iqr_outliers: { index: number; value: number }[];
    summary: { total_count: number; z_score_count: number; iqr_count: number; };
    plot: string;
}

interface FullAnalysisResponse {
    results: { [variable: string]: OutlierResult | { error: string } };
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

// Statistical Terms Glossary for Outlier Detection
const outlierMetricDefinitions: Record<string, string> = {
    outlier: "A data point that differs significantly from other observations. May indicate measurement error, data entry error, or genuine extreme values. Can significantly affect statistical analyses.",
    z_score: "A standardized score measuring how many standard deviations a value is from the mean. Formula: Z = (x - μ) / σ. Values with |Z| > 3 are typically considered outliers.",
    standard_deviation: "A measure of data spread around the mean. About 68% of data falls within ±1 SD, 95% within ±2 SD, and 99.7% within ±3 SD for normal distributions.",
    mean: "The arithmetic average of all values. Calculated as the sum of values divided by the count. Sensitive to outliers, which can pull it toward extreme values.",
    iqr: "Interquartile Range. The difference between the 75th percentile (Q3) and 25th percentile (Q1). Represents the middle 50% of data and is robust to outliers.",
    quartile: "Values that divide data into four equal parts. Q1 (25th percentile), Q2 (median, 50th), Q3 (75th percentile). Used in IQR outlier detection.",
    iqr_method: "Outlier detection using IQR. Points below Q1 - 1.5×IQR or above Q3 + 1.5×IQR are flagged as outliers. Robust to non-normal distributions.",
    lower_fence: "The lower boundary for IQR outlier detection. Calculated as Q1 - 1.5 × IQR. Values below this are considered outliers.",
    upper_fence: "The upper boundary for IQR outlier detection. Calculated as Q3 + 1.5 × IQR. Values above this are considered outliers.",
    box_plot: "A graphical display showing the median, quartiles, and outliers. The box spans Q1 to Q3, whiskers extend to the fences, and outliers are shown as individual points.",
    robust_statistics: "Methods that are not heavily influenced by outliers. Examples: median (vs mean), IQR (vs standard deviation), trimmed means.",
    winsorization: "A technique to handle outliers by replacing extreme values with less extreme ones (e.g., replacing values below the 5th percentile with the 5th percentile value).",
    trimming: "Removing a percentage of extreme values from both ends of the distribution before analysis. More aggressive than winsorization.",
    data_quality: "The accuracy, completeness, and reliability of data. Outlier detection is a key step in assessing and improving data quality.",
    extreme_value: "A legitimate data point that happens to be very different from the majority. Unlike errors, extreme values are valid observations that may carry important information.",
    leverage: "In regression, the influence a data point has on the fitted model due to its position in predictor space. High-leverage outliers can dramatically affect results.",
    influence: "The overall effect a data point has on statistical results. Combines both how unusual the point is (outlier status) and its leverage.",
    mahalanobis_distance: "A multivariate measure of how far a point is from the center of the data, accounting for correlations. Useful for detecting outliers in multiple dimensions.",
    normal_distribution: "A symmetric, bell-shaped probability distribution. Z-score outlier detection assumes data follows this distribution; violations can affect detection accuracy.",
    skewness: "A measure of distribution asymmetry. Positively skewed data has a long right tail; negatively skewed has a long left tail. Skewed data may have more apparent outliers on one side."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Outlier Detection Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in outlier detection analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(outlierMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'outlier_detection.py';
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
                        Python Code - Outlier Detection
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
const StatisticalSummaryCards = ({ results, selectedVars }: { results: { [variable: string]: OutlierResult | { error: string } }; selectedVars: string[] }) => {
    const validResults = Object.entries(results).filter(([_, r]) => !("error" in r)) as [string, OutlierResult][];
    const totalZScore = validResults.reduce((sum, [_, r]) => sum + r.summary.z_score_count, 0);
    const totalIQR = validResults.reduce((sum, [_, r]) => sum + r.summary.iqr_count, 0);
    const totalObs = validResults.reduce((sum, [_, r]) => sum + r.summary.total_count, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Variables</p><Filter className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{selectedVars.length}</p><p className="text-xs text-muted-foreground">Analyzed</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Z-Score Outliers</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold text-amber-600">{totalZScore}</p><p className="text-xs text-muted-foreground">|Z| &gt; 3</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">IQR Outliers</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold text-amber-600">{totalIQR}</p><p className="text-xs text-muted-foreground">Beyond 1.5×IQR</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Total Obs</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{totalObs}</p><p className="text-xs text-muted-foreground">Data points</p></div></CardContent></Card>
        </div>
    );
};

// Outlier Detection Analysis Guide Component
const OutlierGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Outlier Detection Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What are Outliers */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                What are Outliers?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Outliers are data points that differ significantly from other observations. They may represent 
                <strong> measurement errors</strong>, <strong>data entry mistakes</strong>, or <strong>genuine extreme values</strong>.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why Detection Matters:</strong> Outliers can significantly skew means, inflate variances, 
                  and distort regression coefficients. Identifying them is essential for data quality and valid analysis.
                </p>
              </div>
            </div>

            <Separator />

            {/* Two Detection Methods */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Two Detection Methods
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Z-Score Method</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how many standard deviations a value is from the mean.
                    <br/><strong>Formula:</strong> Z = (x - μ) / σ
                    <br/><strong>Threshold:</strong> |Z| &gt; 3 (only 0.3% of normal data exceeds this)
                    <br/><strong>Best for:</strong> Normally distributed data
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">IQR Method (Interquartile Range)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uses quartiles instead of mean/SD — robust to existing outliers.
                    <br/><strong>Lower fence:</strong> Q1 - 1.5 × IQR
                    <br/><strong>Upper fence:</strong> Q3 + 1.5 × IQR
                    <br/><strong>Best for:</strong> Skewed or non-normal data
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* When to Use Which */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                When to Use Which Method
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Use Z-Score When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data is approximately normal</li>
                    <li>• Sample size is large (n &gt; 30)</li>
                    <li>• You want parametric detection</li>
                    <li>• Mean and SD are meaningful</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Use IQR When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data is skewed or non-normal</li>
                    <li>• Sample size is small</li>
                    <li>• You suspect existing outliers</li>
                    <li>• Robust detection is needed</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <strong>Best Practice:</strong> Use both methods together. Points flagged by both are 
                  strong outlier candidates. Points flagged by only one warrant closer inspection.
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
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Z-Score Values</p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">|Z| &lt; 2</p>
                      <p className="text-muted-foreground">Normal</p>
                    </div>
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">|Z| 2-3</p>
                      <p className="text-muted-foreground">Unusual</p>
                    </div>
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">|Z| &gt; 3</p>
                      <p className="text-muted-foreground">Outlier</p>
                    </div>
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">|Z| &gt; 4</p>
                      <p className="text-muted-foreground">Extreme</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">IQR Classifications</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">1.5 × IQR</p>
                      <p className="text-muted-foreground">Mild outlier</p>
                    </div>
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">3 × IQR</p>
                      <p className="text-muted-foreground">Extreme outlier</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* What to Do with Outliers */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                What to Do with Outliers
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Step 1: Investigate First</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check if outliers are data entry errors, measurement problems, or legitimate extreme values.
                    Never blindly remove outliers without understanding their source.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Step 2: Choose an Action</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Keep:</strong> If legitimate extreme values (document the decision)</li>
                    <li>• <strong>Remove:</strong> If clearly errors (after verification)</li>
                    <li>• <strong>Winsorize:</strong> Replace with less extreme values (e.g., 5th/95th percentile)</li>
                    <li>• <strong>Transform:</strong> Log or square root to reduce impact</li>
                    <li>• <strong>Use robust methods:</strong> Median instead of mean, MAD instead of SD</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Step 3: Report Transparently</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Always document: how many outliers found, what method detected them, 
                    what action taken, and results with/without outliers if they were removed.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Causes */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Causes of Outliers
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Error-Based</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data entry mistakes (typos)</li>
                    <li>• Measurement equipment failure</li>
                    <li>• Recording in wrong units</li>
                    <li>• Sampling errors</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Natural/Legitimate</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Natural variability (rare events)</li>
                    <li>• Special population members</li>
                    <li>• Novel or interesting cases</li>
                    <li>• Different subgroup behavior</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Outliers are not always bad! They may contain 
                valuable information about rare events, errors in your process, or distinct subgroups. 
                The goal is to <strong>understand</strong> outliers, not automatically remove them.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.analysisTypes.includes('stats'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Filter className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Outlier Detection</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Identify data points that deviate significantly from the norm
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Z-Score Method</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find points &gt; 3 standard deviations from mean
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">IQR Method</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Robust detection using interquartile range
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Data Quality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify errors or unusual values
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
                            Identify unusual data points that could be errors, rare events, or special cases. 
                            Outliers can significantly affect statistical analyses and should be investigated.
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
                                        <span><strong>Numeric data:</strong> Continuous variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 10 observations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Multiple variables:</strong> Analyze several at once</span>
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
                                        <span><strong>Z-score:</strong> |Z| &gt; 3 = extreme value</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>IQR:</strong> Beyond 1.5×IQR from quartiles</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Box plots:</strong> Visual outlier identification</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Filter className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface OutlierDetectionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function OutlierDetectionPage({ data, numericHeaders, onLoadExample }: OutlierDetectionPageProps) {
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

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'Variables selected', passed: selectedVars.length > 0, detail: `${selectedVars.length} variable(s) selected` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 10, detail: `n = ${data.length} (recommended: 10+)` });
        checks.push({ label: 'Minimum sample size', passed: data.length >= 3, detail: data.length >= 3 ? 'At least 3 observations' : 'Need at least 3' });
        
        return checks;
    }, [selectedVars, data]);

    const allValidationsPassed = useMemo(() => {
        return selectedVars.length > 0 && data.length >= 3;
    }, [selectedVars, data]);

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            setSelectedVars(numericHeaders.slice(0, Math.min(5, numericHeaders.length)));
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
            link.download = `Outlier_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const results = analysisResult.results;
        let csvContent = "OUTLIER DETECTION SUMMARY\n";
        const summaryData = Object.entries(results).filter(([_, r]) => !("error" in r)).map(([variable, result]) => {
            const r = result as OutlierResult;
            return { Variable: variable, Total: r.summary.total_count, ZScore_Outliers: r.summary.z_score_count, IQR_Outliers: r.summary.iqr_count };
        });
        csvContent += Papa.unparse(summaryData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Outlier_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/outlier-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedVars,
                    totalRows: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Outlier_Detection_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedVars, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Please select at least one variable.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/outlier-influence`, {
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
<div className="mb-6 flex justify-between items-center">
    <div>
        <h1 className="text-2xl font-bold">Outlier Detection</h1>
        <p className="text-muted-foreground mt-1">Identify unusual data points</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose numeric variables to check for outliers</CardDescription></div></div></CardHeader>
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
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length === 0}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Detection Settings</CardTitle><CardDescription>Review methods configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variables:</strong> {selectedVars.join(', ')}</p>
                                    <p>• <strong className="text-foreground">Methods:</strong> Z-Score and IQR</p>
                                    <p>• <strong className="text-foreground">Sample Size:</strong> {data.length} observations</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-sky-600" />Z-Score Method</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Identifies points more than 3 standard deviations from the mean. 
                                        Best for normally distributed data.
                                    </p>
                                </div>
                                <div className="p-5 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-amber-600" />IQR Method</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Points below Q1 - 1.5×IQR or above Q3 + 1.5×IQR. 
                                        Robust to non-normal distributions.
                                    </p>
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
                                <Filter className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will detect outliers in {selectedVars.length} variable(s) using Z-Score and IQR methods.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Detect Outliers<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const validResults = Object.entries(results).filter(([_, r]) => !("error" in r)) as [string, OutlierResult][];
                    const totalZScore = validResults.reduce((sum, [_, r]) => sum + r.summary.z_score_count, 0);
                    const totalIQR = validResults.reduce((sum, [_, r]) => sum + r.summary.iqr_count, 0);
                    const hasOutliers = totalZScore > 0 || totalIQR > 0;
                    const varsWithOutliers = validResults.filter(([_, r]) => r.summary.z_score_count > 0 || r.summary.iqr_count > 0);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Outlier Detection: {selectedVars.length} variables</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${!hasOutliers ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${!hasOutliers ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasOutliers ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Found <strong>{totalZScore}</strong> Z-Score outliers (|Z| &gt; 3) across all variables.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasOutliers ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Found <strong>{totalIQR}</strong> IQR outliers (beyond 1.5×IQR) across all variables.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasOutliers ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            <strong>{varsWithOutliers.length}</strong> of {validResults.length} variables contain outliers.
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${!hasOutliers ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {!hasOutliers ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{!hasOutliers ? "No Outliers Detected!" : "Outliers Detected"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {!hasOutliers ? "Your data appears clean with no extreme values." : "Review the outliers to determine if they are errors or legitimate extreme values."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} selectedVars={selectedVars} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Data Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const outlierRatio = (totalZScore + totalIQR) / (validResults.reduce((s, [_, r]) => s + r.summary.total_count, 0) || 1);
                                        const score = outlierRatio < 0.01 ? 5 : outlierRatio < 0.03 ? 4 : outlierRatio < 0.05 ? 3 : outlierRatio < 0.1 ? 2 : 1;
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
                    const validResults = Object.entries(results).filter(([_, r]) => !("error" in r)) as [string, OutlierResult][];
                    const totalZScore = validResults.reduce((sum, [_, r]) => sum + r.summary.z_score_count, 0);
                    const totalIQR = validResults.reduce((sum, [_, r]) => sum + r.summary.iqr_count, 0);
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding outlier detection</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Z-Score Method</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Measures how many standard deviations a point is from the mean. 
                                                |Z| &gt; 3 means the value is extremely unlikely under a normal distribution (0.3% chance).
                                                Found <strong className="text-foreground">{totalZScore}</strong> such extreme values.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">IQR Method</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Uses the interquartile range (middle 50% of data). Points below Q1 - 1.5×IQR or above Q3 + 1.5×IQR 
                                                are flagged. This method is robust to non-normal distributions.
                                                Found <strong className="text-foreground">{totalIQR}</strong> such values.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Why Two Methods?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Z-score assumes normality and works well for bell-shaped distributions.
                                                IQR is distribution-free and better for skewed data. Using both gives a comprehensive view.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What to Do with Outliers?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {(totalZScore + totalIQR) === 0 
                                                    ? 'No outliers found! Your data is clean and ready for analysis.' 
                                                    : 'Investigate before removing: Are they data entry errors? Genuine extreme values? Consider winsorizing, transformation, or robust methods.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Analyzed {validResults.length} variables. Found {totalZScore} Z-score outliers and {totalIQR} IQR outliers. 
                                        {(totalZScore + totalIQR) > 0 ? ' Review these points before proceeding with statistical analysis.' : ' Data appears clean.'}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Outlier Actions</h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Investigate</p><p className="text-muted-foreground">Check if error</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Transform</p><p className="text-muted-foreground">Log, winsorize</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Robust</p><p className="text-muted-foreground">Use median</p></div>
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
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full outlier details and visualizations</p></div>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Outlier Detection Report</h2><p className="text-sm text-muted-foreground mt-1">Variables: {selectedVars.join(', ')} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} selectedVars={selectedVars} />
                        
                        {/* APA-style Summary */}
                        <Card>
                            <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Outlier detection was performed on {selectedVars.length} numeric variables 
                                            (<em>N</em> = {data.length}) using two methods: Z-score (threshold: |Z| &gt; 3) 
                                            and IQR (threshold: 1.5 × IQR beyond quartiles).
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Individual Variable Results */}
                        {Object.entries(results).map(([variable, result]) => (
                            "error" in result ? (
                                <Card key={variable}>
                                    <CardHeader><CardTitle>{variable}</CardTitle></CardHeader>
                                    <CardContent><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{result.error}</AlertDescription></Alert></CardContent>
                                </Card>
                            ) : (
                                <Card key={variable}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>{variable}</CardTitle>
                                            <div className="flex gap-2">
                                                <Badge variant={result.summary.z_score_count > 0 ? 'destructive' : 'outline'}>Z: {result.summary.z_score_count}</Badge>
                                                <Badge variant={result.summary.iqr_count > 0 ? 'destructive' : 'outline'}>IQR: {result.summary.iqr_count}</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <Image src={`data:image/png;base64,${result.plot}`} alt={`Box plot for ${variable}`} width={600} height={400} className="w-full rounded-md border"/>
                                            </div>
                                            <div className="space-y-4">
                                                <Alert>
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertTitle>Summary</AlertTitle>
                                                    <AlertDescription>
                                                        Found <strong>{result.summary.z_score_count}</strong> Z-score outliers and <strong>{result.summary.iqr_count}</strong> IQR outliers out of {result.summary.total_count} observations.
                                                    </AlertDescription>
                                                </Alert>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="font-semibold mb-2 text-sm">Z-Score Outliers</h4>
                                                        <ScrollArea className="h-36 border rounded-md">
                                                            <Table>
                                                                <TableHeader><TableRow><TableHead>Value</TableHead><TableHead className="text-right">Z</TableHead></TableRow></TableHeader>
                                                                <TableBody>
                                                                    {result.z_score_outliers.map(o => <TableRow key={o.index}><TableCell className="font-mono">{o.value.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{o.z_score.toFixed(2)}</TableCell></TableRow>)}
                                                                    {result.z_score_outliers.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">None</TableCell></TableRow>}
                                                                </TableBody>
                                                            </Table>
                                                        </ScrollArea>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold mb-2 text-sm">IQR Outliers</h4>
                                                        <ScrollArea className="h-36 border rounded-md">
                                                            <Table>
                                                                <TableHeader><TableRow><TableHead>Value</TableHead></TableRow></TableHeader>
                                                                <TableBody>
                                                                    {result.iqr_outliers.map(o => <TableRow key={o.index}><TableCell className="font-mono">{o.value.toFixed(2)}</TableCell></TableRow>)}
                                                                    {result.iqr_outliers.length === 0 && <TableRow><TableCell className="text-center text-muted-foreground">None</TableCell></TableRow>}
                                                                </TableBody>
                                                            </Table>
                                                        </ScrollArea>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        ))}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
            
            {/* Modals */}
            <OutlierGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
        </div>
    );
}
