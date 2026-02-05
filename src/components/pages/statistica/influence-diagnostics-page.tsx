'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, HelpCircle, Settings, FileSearch, BarChart, BookOpen, CheckCircle, Activity, TrendingUp, Target, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Crosshair, Eye, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";


// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/influence_diagnostics.py?alt=media";

// Statistical Terms Glossary for Influence Diagnostics
const influenceMetricDefinitions: Record<string, string> = {
    influential_observation: "A data point that has a disproportionately large effect on the regression results. If removed, the regression coefficients would change substantially.",
    cooks_distance: "Measures the overall influence of observation i on all fitted values. Combines leverage and residual magnitude. Formula: Dᵢ = (eᵢ²/p·MSE) × (hᵢᵢ/(1-hᵢᵢ)²). Common threshold: 4/n or 1.",
    leverage: "Measures how far an observation's X values are from the mean of X. High leverage points have unusual predictor values. Formula: hᵢᵢ = diagonal of hat matrix H = X(X'X)⁻¹X'. Threshold: 2(p+1)/n.",
    hat_matrix: "The matrix H that maps observed Y to fitted Ŷ: Ŷ = HY. Diagonal elements (hᵢᵢ) are leverage values. Off-diagonal elements show how observations influence each other's predictions.",
    studentized_residual: "Residual divided by its estimated standard error, computed with that observation excluded. Follows t-distribution. Used to identify outliers. |t| > 2 suggests outlier.",
    dffits: "Measures the change in fitted value when observation i is deleted. DFFITSᵢ = (ŷᵢ - ŷᵢ₍₋ᵢ₎)/√(s²₍₋ᵢ₎hᵢᵢ). Threshold: 2√((p+1)/n).",
    dfbetas: "Measures the change in each regression coefficient when observation i is deleted. DFBETASⱼᵢ = (βⱼ - βⱼ₍₋ᵢ₎)/(s₍₋ᵢ₎√cⱼⱼ). Threshold: 2/√n.",
    covratio: "Measures the change in the determinant of the covariance matrix when observation i is deleted. Values far from 1 indicate influence on precision of estimates.",
    outlier: "An observation with an unusually large residual (unusual Y given X). High studentized residual (|t| > 2) indicates potential outlier.",
    high_leverage_point: "An observation with unusual predictor values. Has hᵢᵢ greater than threshold. Can strongly influence the regression line even with moderate residual.",
    regression_influence: "The combination of leverage and residual magnitude. Influence = Leverage × Discrepancy. Points with both high leverage and large residuals are most influential.",
    deleted_residual: "The residual when observation i is predicted using a model fit without observation i. Used in studentized residuals and DFFITS calculations.",
    leave_one_out: "A diagnostic approach where the model is refit n times, each time leaving out one observation. Used to compute deleted residuals, Cook's D, DFFITS, etc.",
    masking_effect: "When multiple influential points together hide each other's influence. Individual diagnostics may not flag points that are jointly influential.",
    swamping_effect: "When influential points cause other normal points to appear influential. Can occur when outliers distort the regression fit.",
    sensitivity_analysis: "Running regression with and without flagged observations to assess how much results depend on these specific data points.",
    robust_regression: "Regression methods (e.g., M-estimation, LAD) that give less weight to outliers and influential points. Alternative when standard OLS is too sensitive.",
    hat_value_threshold: "Common threshold for leverage: 2(p+1)/n where p is number of predictors. Points exceeding this have unusual X values.",
    influence_plot: "Bubble plot with leverage on x-axis, studentized residual on y-axis, and bubble size proportional to Cook's Distance. Shows all three aspects of influence.",
    regression_diagnostics: "Post-estimation checks to verify model assumptions and identify problematic observations. Includes residual plots, influence measures, and normality tests."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Influence Diagnostics Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in influence diagnostics
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(influenceMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'influence_diagnostics.py';
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
                        Python Code - Influence Diagnostics
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

interface Insight {
    type: 'warning' | 'info';
    title: string;
    description: string;
}

interface DiagnosticDataItem {
    index: number;
    fitted: number;
    residual: number;
    studentized_residual: number;
    leverage: number;
    cooks_d: number;
    dffits: number;
    covratio: number;
    influential: boolean;
}

interface Metrics {
    n_observations: number;
    n_predictors: number;
    r_squared: number;
    max_cooks_d: number;
    max_leverage: number;
    n_high_cooks: number;
    n_high_leverage: number;
    n_outliers: number;
    n_highly_influential: number;
    highly_influential_indices: number[];
}

interface Thresholds {
    cooks_d: { moderate: number; high: number; rule: string };
    leverage: { moderate: number; high: number; rule: string };
    dffits: { moderate: number; rule: string };
    dfbetas: { moderate: number; rule: string };
    studentized_residual: { moderate: number; high: number; rule: string };
    covratio: { lower: number; upper: number; rule: string };
}

interface AnalysisResult {
    metrics: Metrics;
    thresholds: Thresholds;
    insights: Insight[];
    recommendations: string[];
    plots: {
        cooks_distance: string;
        leverage_residual: string;
        influence: string;
        dffits: string;
    };
    diagnostic_data: DiagnosticDataItem[];
    top_influential: DiagnosticDataItem[];
    model_summary: {
        dependent: string;
        independents: string[];
        coefficients: { [key: string]: number };
        intercept: number;
    };
    error?: string;
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

// Statistical Summary Cards
const StatisticalSummaryCards = ({ results }: { results: AnalysisResult }) => {
    const hasIssues = results.metrics.n_highly_influential > 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Max Cook's D</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${results.metrics.max_cooks_d > results.thresholds.cooks_d.moderate ? 'text-amber-600' : ''}`}>{results.metrics.max_cooks_d.toFixed(4)}</p><p className="text-xs text-muted-foreground">Threshold: {results.thresholds.cooks_d.moderate.toFixed(3)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">High Cook's D</p><AlertTriangle className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.n_high_cooks}</p><p className="text-xs text-muted-foreground">Above threshold</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">High Leverage</p><Eye className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.n_high_leverage}</p><p className="text-xs text-muted-foreground">Unusual X values</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Data Quality</p><CheckCircle2 className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${hasIssues ? 'text-amber-600' : 'text-green-600'}`}>{hasIssues ? 'Review Needed' : 'Good'}</p><p className="text-xs text-muted-foreground">{results.metrics.n_highly_influential} influential</p></div></CardContent></Card>
        </div>
    );
};


// Influence Diagnostics Analysis Guide Component
const InfluenceGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Influence Diagnostics Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Influence Diagnostics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Crosshair className="w-4 h-4" />
                What are Influence Diagnostics?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Influence diagnostics identify data points that have a <strong>disproportionately large effect</strong> on 
                your regression results. A single influential point can dramatically change your coefficients, 
                predictions, and conclusions.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Key Question:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    &quot;If I remove this one data point, would my regression results change substantially?&quot;
                    <br/>If yes — that point is influential and warrants investigation.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Two Components of Influence */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Two Components of Influence
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Influence = Leverage × Discrepancy</strong>. A point needs both unusual X values AND 
                a large residual to be truly influential.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Leverage (Unusual X)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how far a point&apos;s predictor values are from the mean of X.
                    <br/><strong>High leverage</strong> = unusual position in predictor space
                    <br/>Can &quot;pull&quot; the regression line toward itself
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Discrepancy (Outlier in Y)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measured by studentized residual — how unusual is Y given X?
                    <br/><strong>Large residual</strong> = point doesn&apos;t fit the model well
                    <br/>|t| &gt; 2 suggests an outlier
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Key Insight</p>
                <p className="text-xs text-muted-foreground mt-1">
                  • High leverage + small residual = not influential (the model fits it well)
                  <br/>• Low leverage + large residual = not very influential (can&apos;t move the line much)
                  <br/>• <strong>High leverage + large residual = VERY influential</strong> (danger zone!)
                </p>
              </div>
            </div>

            <Separator />

            {/* Key Measures */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Key Diagnostic Measures
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-primary">Cook&apos;s Distance</p>
                    <Badge variant="outline">Most Important</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures overall influence on <strong>all</strong> fitted values. Combines leverage and residual.
                    <br/><strong>Threshold:</strong> 4/n (conservative) or 1 (liberal)
                    <br/><em>Think of it as: &quot;How much would all predictions change if I removed this point?&quot;</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Leverage (h<sub>ii</sub>)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Diagonal of the hat matrix. Measures how far X values are from the centroid.
                    <br/><strong>Threshold:</strong> 2(p+1)/n where p = number of predictors
                    <br/>Range: 1/n to 1. Average leverage = (p+1)/n
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">DFFITS</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Change in the observation&apos;s own fitted value when deleted.
                    <br/><strong>Threshold:</strong> 2√((p+1)/n)
                    <br/><em>&quot;How much does deleting this point change its own prediction?&quot;</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Studentized Residual</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Residual divided by its standard error (computed without that observation).
                    <br/><strong>Threshold:</strong> |t| &gt; 2 suggests outlier
                    <br/>Follows t-distribution under normality assumption.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">DFBETAS</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Change in each coefficient when observation is deleted.
                    <br/><strong>Threshold:</strong> 2/√n
                    <br/><em>&quot;How much does each slope change without this point?&quot;</em>
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* The Influence Plot */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Reading the Influence Plot
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-sm text-muted-foreground">
                  The influence plot shows three dimensions at once:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>X-axis:</strong> Leverage (unusual predictor values)</li>
                  <li>• <strong>Y-axis:</strong> Studentized residual (unusual response)</li>
                  <li>• <strong>Bubble size:</strong> Cook&apos;s Distance (overall influence)</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Look for:</strong> Large bubbles in corners (especially upper-right and lower-right quadrants) — 
                  these are highly influential points that need investigation.
                </p>
              </div>
            </div>

            <Separator />

            {/* What To Do */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                What To Do With Influential Points?
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">1. Investigate — Don&apos;t Just Delete</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Is it a data entry error? A legitimate edge case? A different population?
                    <br/>Understanding <em>why</em> a point is influential is more valuable than removing it.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Run Sensitivity Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fit the model with and without flagged points. If conclusions change dramatically, 
                    report both results and discuss the sensitivity.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Consider Robust Regression</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Methods like M-estimation or LAD regression down-weight influential points automatically, 
                    providing results less sensitive to outliers.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">4. Report Transparently</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If you remove points, document which ones and why. If you keep them, acknowledge 
                    that results depend partly on these observations.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Scenarios */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Common Scenarios
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                  <p className="font-medium text-sm text-green-700 dark:text-green-400">No Influential Points</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Great! Your results reflect the overall pattern, not a few unusual observations.
                    Proceed with confidence.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Few Influential Points</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Investigate each one. Run sensitivity analysis. Results may be valid if points are 
                    legitimate, but warrant caution if they&apos;re errors or anomalies.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20">
                  <p className="font-medium text-sm text-red-700 dark:text-red-400">Many Influential Points</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Model may be misspecified. Consider: non-linear relationships, missing variables, 
                    heteroscedasticity, or need for transformation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">High Leverage, Low Residual</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unusual X but fits the model well. Not immediately problematic, but the point 
                    has potential to be influential if the relationship changes.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Influential points are <strong>diagnostic information</strong>, 
                not automatic deletions. They tell you where your data is fragile and where your conclusions depend on 
                specific observations. Use this information to understand your data better, run appropriate sensitivity 
                analyses, and report results transparently. A well-documented influential point analysis strengthens 
                rather than weakens your research.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'regression-suite' || d.id === 'linear');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Crosshair className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Influence Diagnostics</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Identify influential observations using Cook's Distance and related measures
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Cook's Distance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Overall influence on all fitted values
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Eye className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Leverage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Observations with unusual predictor values
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">DFFITS</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Effect on own fitted value
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
                            Identify data points that disproportionately affect regression results. 
                            They can be outliers (unusual Y), high leverage (unusual X), or both.
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
                                        <span><strong>Dependent variable:</strong> One numeric outcome (Y)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independent variables:</strong> One or more predictors (X)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 20 observations</span>
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
                                        <span><strong>Cook's D:</strong> Overall influence (threshold: 4/n)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Leverage:</strong> Unusual X values (threshold: 2p/n)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Flagged points:</strong> Warrant investigation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Crosshair className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface InfluenceDiagnosticsPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function InfluenceDiagnosticsPage({ data, numericHeaders, onLoadExample }: InfluenceDiagnosticsPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVar, setDependentVar] = useState<string | undefined>(undefined);
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const availableIndependents = useMemo(() => {
        return numericHeaders.filter(h => h !== dependentVar);
    }, [numericHeaders, dependentVar]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'Dependent variable selected', passed: !!dependentVar, detail: dependentVar || 'Not selected' });
        checks.push({ label: 'At least 1 independent variable', passed: independentVars.length >= 1, detail: `${independentVars.length} selected` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 20, detail: `n = ${data.length} (recommended: 20+)` });
        checks.push({ label: 'Sufficient observations per predictor', passed: data.length >= (independentVars.length + 1) * 10, detail: `${Math.floor(data.length / Math.max(1, independentVars.length + 1))} obs per parameter` });
        
        return checks;
    }, [dependentVar, independentVars, data]);

    const allValidationsPassed = useMemo(() => {
        return !!dependentVar && independentVars.length >= 1 && data.length >= 10;
    }, [dependentVar, independentVars, data]);

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            setDependentVar(numericHeaders[0]);
            setIndependentVars(numericHeaders.length > 1 ? [numericHeaders[1]] : []);
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const handleIndependentToggle = (varName: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, varName] : prev.filter(v => v !== varName));
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
            link.download = `Influence_Diagnostics_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csvContent = "INFLUENCE DIAGNOSTICS\n\n";
        csvContent += Papa.unparse(analysisResult.diagnostic_data.map(d => ({
            Index: d.index, Cooks_D: d.cooks_d.toFixed(4), Leverage: d.leverage.toFixed(4),
            Std_Residual: d.studentized_residual.toFixed(4), DFFITS: d.dffits.toFixed(4), Influential: d.influential ? 'Yes' : 'No'
        })));
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Influence_Diagnostics_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/influence-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult,
                    dependentVar,
                    independentVars
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Influence_Diagnostics_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, dependentVar, independentVars, toast]);




    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length === 0) {
            toast({ variant: 'destructive', title: 'Please select variables.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/outlier-influence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent: dependentVar, independents: independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }

            const result: AnalysisResult = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;

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
            <InfluenceGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Influence Diagnostics</h1>
                    <p className="text-muted-foreground mt-1">Identify influential observations</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose dependent and independent variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Dependent Variable (Y)</Label>
                                <Select value={dependentVar} onValueChange={(v) => { setDependentVar(v); setIndependentVars(prev => prev.filter(x => x !== v)); }}>
                                    <SelectTrigger className="h-12"><SelectValue placeholder="Select dependent variable" /></SelectTrigger>
                                    <SelectContent>
                                        {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Independent Variables (X) - {independentVars.length} selected</Label>
                                <ScrollArea className="h-40 p-4 border rounded-xl bg-muted/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableIndependents.map(h => (
                                            <div key={h} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <Checkbox id={`ind-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIndependentToggle(h, c as boolean)} />
                                                <Label htmlFor={`ind-${h}`} className="text-sm font-normal cursor-pointer truncate">{h}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {independentVars.length > 0 && (
                                    <div className="flex flex-wrap gap-1">{independentVars.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}</div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!dependentVar || independentVars.length === 0}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
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
                                    <p>• <strong className="text-foreground">Model:</strong> {dependentVar} ~ {independentVars.join(' + ')}</p>
                                    <p>• <strong className="text-foreground">Diagnostics:</strong> Cook's Distance, Leverage, DFFITS, Studentized Residuals</p>
                                    <p>• <strong className="text-foreground">Plots:</strong> Cook's D, Leverage vs Residual, Influence Plot, DFFITS</p>
                                    <p>• <strong className="text-foreground">Sample Size:</strong> {data.length} observations</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About Influence Diagnostics</h4>
                                <p className="text-sm text-muted-foreground">
                                    <strong>Cook's Distance</strong> measures overall influence (threshold: 4/n ≈ {(4/data.length).toFixed(3)}). 
                                    <strong> Leverage</strong> identifies unusual X values. 
                                    <strong> DFFITS</strong> shows effect on own prediction.
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
                                <Crosshair className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will identify influential observations in <strong>{dependentVar}</strong> ~ <strong>{independentVars.join(' + ')}</strong>.</p>
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
                    const hasIssues = results.metrics.n_highly_influential > 0;
                    const influentialCount = results.metrics.n_highly_influential;
                    const highCooksCount = results.metrics.n_high_cooks;
                    const highLeverageCount = results.metrics.n_high_leverage;
                    const outlierCount = results.metrics.n_outliers;
                    const isGood = !hasIssues;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Influence Diagnostics: {dependentVar} ~ {independentVars.join(' + ')}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Your data has <strong>{isGood ? 'no problematic' : influentialCount}</strong> {isGood ? 'influential points' : 'highly influential observation(s)'}.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isGood 
                                                ? 'Your model results are stable and not driven by individual data points.'
                                                : 'Some data points are disproportionately affecting your model results.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {highCooksCount > 0 ? `${highCooksCount} point(s) with high Cook's Distance detected.` : 'No points with unusually high influence on coefficients.'}
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Data Quality is Good" : "Data Quality Review Recommended"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? "No single observation is unduly affecting your analysis results."
                                                    : "Review flagged observations before making business decisions based on this model."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Business Implications */}
                                <div className="p-5 bg-muted/30 rounded-xl">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Business Implications</h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {isGood ? (
                                            <>
                                                <p>✓ <strong className="text-foreground">Robust Results:</strong> Your conclusions are based on the overall pattern, not outliers.</p>
                                                <p>✓ <strong className="text-foreground">Reliable Predictions:</strong> Forecasts won't be skewed by unusual historical data.</p>
                                                <p>✓ <strong className="text-foreground">Confident Decisions:</strong> You can trust the model coefficients for business decisions.</p>
                                            </>
                                        ) : (
                                            <>
                                                <p>⚠ <strong className="text-foreground">Check Unusual Cases:</strong> Are these influential points data errors, or legitimate edge cases?</p>
                                                <p>⚠ <strong className="text-foreground">Sensitivity Analysis:</strong> Re-run analysis excluding flagged points to see if conclusions change.</p>
                                                <p>⚠ <strong className="text-foreground">Model Stability:</strong> High influence means small data changes could significantly alter results.</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Data Quality Score:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const totalIssues = highCooksCount + highLeverageCount + outlierCount;
                                        const score = totalIssues === 0 ? 5 : totalIssues <= 2 ? 4 : totalIssues <= 5 ? 3 : totalIssues <= 10 ? 2 : 1;
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
                    const hasIssues = results.metrics.n_highly_influential > 0;
                    const maxCooksD = results.metrics.max_cooks_d;
                    const threshold = results.thresholds.cooks_d.moderate;
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding influence diagnostics</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Cook's Distance</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Max Cook's D = {maxCooksD.toFixed(4)} (threshold: {threshold.toFixed(3)}). 
                                                {maxCooksD > threshold 
                                                    ? ' Some observations exceed the threshold, indicating they significantly influence model coefficients.'
                                                    : ' All observations are below the threshold - no single point dominates the model.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Leverage Points</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {results.metrics.n_high_leverage} observation(s) with high leverage.
                                                High leverage means unusual X values - these points can strongly influence the regression line.
                                                {results.metrics.n_high_leverage > 0 ? ' Check if these are valid extreme cases or data entry errors.' : ' No concerning leverage points detected.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Outliers (Studentized Residuals)</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {results.metrics.n_outliers} outlier(s) detected (|studentized residual| &gt; 2).
                                                Outliers have unusual Y values given their X values.
                                                {results.metrics.n_outliers > 0 ? ' These may indicate special cases or measurement errors.' : ' No significant outliers in the response variable.'}
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
                                                {hasIssues 
                                                    ? `Investigate the ${results.metrics.n_highly_influential} flagged observation(s) at indices: ${results.metrics.highly_influential_indices.join(', ')}. Consider running sensitivity analysis with and without these points.`
                                                    : 'No action needed. Your model results are robust and not driven by individual observations.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${!hasIssues ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {!hasIssues ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />} Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {!hasIssues 
                                            ? `With ${results.metrics.n_observations} observations and no highly influential points, your regression results reflect the overall data pattern.`
                                            : `${results.metrics.n_highly_influential} observation(s) are flagged by multiple criteria. Results may change significantly if these are removed.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Influence Thresholds</h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Cook's D</p><p className="text-muted-foreground">&gt; {threshold.toFixed(3)}</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Leverage</p><p className="text-muted-foreground">&gt; {results.thresholds.leverage.moderate.toFixed(3)}</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">|Std Resid|</p><p className="text-muted-foreground">&gt; 2.0</p></div>
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
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full diagnostic results and plots</p></div>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Influence Diagnostics Report</h2><p className="text-sm text-muted-foreground mt-1">{dependentVar} ~ {independentVars.join(' + ')} | n = {results.metrics.n_observations} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Summary Badge */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Diagnostic Summary</CardTitle>
                                    {results.metrics.n_highly_influential > 0 ? (
                                        <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1"/>{results.metrics.n_highly_influential} Influential</Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle className="w-3 h-3 mr-1"/>No Issues</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {results.insights.map((insight, i) => (
                                        <div key={i} className="bg-muted/30 rounded-lg p-4">
                                            <div className="flex items-start gap-2">
                                                {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5"/> : <CheckCircle className="w-4 h-4 text-green-500 mt-0.5"/>}
                                                <div><strong className="text-sm">{insight.title}</strong><p className="text-xs text-muted-foreground mt-1">{insight.description}</p></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Diagnostic Plots */}
                        <Tabs defaultValue="cooks" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="cooks">Cook's D</TabsTrigger>
                                <TabsTrigger value="leverage">Leverage</TabsTrigger>
                                <TabsTrigger value="influence">Influence</TabsTrigger>
                                <TabsTrigger value="dffits">DFFITS</TabsTrigger>
                            </TabsList>
                            <TabsContent value="cooks">
                                <Card><CardHeader><CardTitle className="text-lg">Cook's Distance</CardTitle><CardDescription>Overall influence of each observation. Values above the threshold line are influential.</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${results.plots.cooks_distance}`} alt="Cook's Distance" className="w-full rounded-md border" /></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="leverage">
                                <Card><CardHeader><CardTitle className="text-lg">Leverage vs Residual</CardTitle><CardDescription>High leverage + high residual = high influence.</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${results.plots.leverage_residual}`} alt="Leverage vs Residual" className="w-full rounded-md border" /></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="influence">
                                <Card><CardHeader><CardTitle className="text-lg">Influence Plot</CardTitle><CardDescription>Bubble size represents Cook's Distance.</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${results.plots.influence}`} alt="Influence Plot" className="w-full rounded-md border" /></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="dffits">
                                <Card><CardHeader><CardTitle className="text-lg">DFFITS</CardTitle><CardDescription>Effect of each observation on its own fitted value.</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${results.plots.dffits}`} alt="DFFITS" className="w-full rounded-md border" /></CardContent></Card>
                            </TabsContent>
                        </Tabs>

                        {/* Top Influential Table */}
                        <Card>
                            <CardHeader><CardTitle>Top 10 Influential Observations</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Index</TableHead>
                                            <TableHead className="text-right">Cook's D</TableHead>
                                            <TableHead className="text-right">Leverage</TableHead>
                                            <TableHead className="text-right">Std Residual</TableHead>
                                            <TableHead className="text-right">DFFITS</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.top_influential.map((row) => (
                                            <TableRow key={row.index} className={row.influential ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                                                <TableCell className="font-medium">{row.index}</TableCell>
                                                <TableCell className={`text-right font-mono ${row.cooks_d > results.thresholds.cooks_d.moderate ? 'text-red-600 font-bold' : ''}`}>{row.cooks_d.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.leverage.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.studentized_residual.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.dffits.toFixed(4)}</TableCell>
                                                <TableCell className="text-center"><Badge variant={row.influential ? 'destructive' : 'outline'}>{row.influential ? 'Influential' : 'Normal'}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">Cook's D threshold: {results.thresholds.cooks_d.moderate.toFixed(3)} | Leverage threshold: {results.thresholds.leverage.moderate.toFixed(3)}</p>
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