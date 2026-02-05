'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, SplitSquareVertical, CheckCircle, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, Minus, BarChart3, Scissors, Shield, FileCode, Activity, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/regression_discontinuity.py?alt=media";

// RDD 관련 용어 정의
const rddTermDefinitions: Record<string, string> = {
    "Regression Discontinuity Design (RDD)": "A quasi-experimental design that estimates causal effects by exploiting a threshold (cutoff) in a running variable that determines treatment assignment.",
    "Sharp RDD": "A design where treatment is deterministically assigned based on the running variable crossing the cutoff. Everyone above (or below) the threshold receives treatment.",
    "Fuzzy RDD": "A design where crossing the threshold increases the probability of treatment but doesn't guarantee it. Requires IV estimation.",
    "Running Variable": "The continuous variable (also called forcing variable or assignment variable) that determines treatment assignment based on whether it crosses the cutoff.",
    "Cutoff (Threshold)": "The value of the running variable at which treatment assignment changes. The point where the discontinuity is estimated.",
    "Bandwidth": "The range of data around the cutoff used for estimation. Narrower bandwidths reduce bias but increase variance.",
    "Optimal Bandwidth": "A data-driven bandwidth choice that balances the bias-variance tradeoff, often computed using methods like Imbens-Kalyanaraman.",
    "Local Average Treatment Effect (LATE)": "The causal effect estimated at the cutoff point. RDD identifies the treatment effect for units exactly at the threshold.",
    "Local Linear Regression": "A regression method that fits linear functions separately on each side of the cutoff using observations within the bandwidth.",
    "Polynomial Order": "The degree of the polynomial used in the local regression. Linear (order 1) is most common; higher orders risk overfitting.",
    "Kernel Function": "A weighting function that gives more weight to observations closer to the cutoff. Common choices: uniform, triangular, Epanechnikov.",
    "Triangular Kernel": "A kernel that linearly decreases weight as observations move away from the cutoff. Often preferred for RDD.",
    "McCrary Density Test": "A test for manipulation of the running variable at the cutoff. Checks if there's bunching of observations just above or below the threshold.",
    "Manipulation": "When individuals can precisely control their running variable to be on a preferred side of the cutoff, violating the RDD identification assumption.",
    "Continuity Assumption": "The key RDD assumption: potential outcomes must be continuous at the cutoff. Any discontinuity in outcomes is attributed to treatment.",
    "Robustness Checks": "Sensitivity analyses using different bandwidths, polynomial orders, or specifications to verify that results are not driven by arbitrary choices.",
    "Placebo Tests": "Tests using fake cutoffs where no treatment effect should exist, to verify that the estimated discontinuity is not spurious.",
    "Covariate Balance": "Checking that predetermined covariates are balanced (no discontinuity) at the cutoff, supporting the validity of the design.",
    "Donut Hole RDD": "A specification that excludes observations very close to the cutoff to address concerns about manipulation or measurement error.",
    "Standard Error": "A measure of the precision of the RDD estimate. Clustered or robust standard errors may be used depending on data structure."
};

interface RDDEstimate { rdd_estimate: number; std_error: number; t_statistic: number; p_value: number; ci_lower: number; ci_upper: number; significant: boolean; n_left: number; n_right: number; n_total: number; mean_left: number; mean_right: number; r_squared: number; }
interface RobustnessResult { bandwidth: number; multiplier: number; estimate: number; std_error: number; p_value: number; n_obs: number; significant: boolean; }
interface ManipulationTest { left_density: number; right_density: number; density_ratio: number; chi_square: number; p_value: number; manipulation_detected: boolean; message: string; }
interface CovariateBalance { covariate: string; mean_left: number; mean_right: number; difference: number; t_statistic: number; p_value: number; balanced: boolean; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { rdd_estimate: RDDEstimate; bandwidth_used: number; cutoff: number; polynomial_order: number; kernel: string; robustness_checks: RobustnessResult[]; manipulation_test: ManipulationTest; covariate_balance: CovariateBalance[]; descriptive_stats: { n_total: number; n_below_cutoff: number; n_above_cutoff: number; running_var_mean: number; running_var_std: number; outcome_mean: number; outcome_std: number; }; rdd_plot: string | null; density_plot: string | null; robustness_plot: string | null; local_plot: string | null; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

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
        link.download = 'regression_discontinuity.py';
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
                        Python Code - Regression Discontinuity Design
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

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        RDD Statistical Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in Regression Discontinuity Design analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(rddTermDefinitions).map(([term, definition]) => (
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

const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const rdd = results.rdd_estimate;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RDD Effect</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${rdd.significant ? 'text-primary' : ''}`}>{rdd.rdd_estimate?.toFixed(3)}</p><p className="text-xs text-muted-foreground">SE: {rdd.std_error?.toFixed(3)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">p-value</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${rdd.p_value < 0.05 ? 'text-primary' : ''}`}>{rdd.p_value < 0.001 ? '< .001' : rdd.p_value?.toFixed(4)}</p><p className="text-xs text-muted-foreground">{rdd.significant ? 'Significant' : 'Not significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Bandwidth</p><Scissors className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.bandwidth_used?.toFixed(2)}</p><p className="text-xs text-muted-foreground">Optimal</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">N (in BW)</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{rdd.n_total}</p><p className="text-xs text-muted-foreground">{rdd.n_left} left, {rdd.n_right} right</p></div></CardContent></Card>
        </div>
    );
};

const RDDGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Regression Discontinuity Design Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is RDD */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4" />
                What is Regression Discontinuity Design?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Regression Discontinuity Design (RDD) is a <strong>quasi-experimental</strong> method that 
                estimates causal effects by exploiting a <strong>cutoff threshold</strong> in a running 
                variable that determines treatment assignment.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Key Insight:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Units just above and just below the cutoff are nearly identical except for treatment.
                    <br/><br/>
                    Any discontinuous jump in outcomes at the cutoff = treatment effect (LATE)
                    <br/><br/>
                    Example: Test scores → scholarship eligibility → future earnings
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Sharp vs Fuzzy */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Scissors className="w-4 h-4" />
                Sharp vs Fuzzy RDD
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Sharp RDD</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Treatment is <strong>deterministic</strong> at the cutoff.
                    <br/>• Score ≥ c → 100% treated
                    <br/>• Score &lt; c → 0% treated
                    <br/>• Clean jump in treatment probability
                    <br/>• Simpler estimation
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Fuzzy RDD</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Treatment probability <strong>changes</strong> at cutoff.
                    <br/>• Score ≥ c → Higher probability, not 100%
                    <br/>• Some non-compliance on both sides
                    <br/>• Requires IV estimation
                    <br/>• More complex analysis
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>This tool uses Sharp RDD.</strong> For Fuzzy RDD, additional instrumental 
                  variable methods are needed.
                </p>
              </div>
            </div>

            <Separator />

            {/* Key Components */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Key Components
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Running Variable (X)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The continuous variable that determines treatment assignment.
                    <br/>• Also called: forcing variable, assignment variable
                    <br/>• Examples: test scores, age, income, distance
                    <br/>• Must be measured precisely (ideally pre-determined)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cutoff (c)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The threshold value where treatment assignment changes.
                    <br/>• Known and fixed (not data-driven)
                    <br/>• Examples: passing score, eligibility age, poverty line
                    <br/>• Must be credibly exogenous
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Bandwidth (h)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The window around the cutoff used for estimation.
                    <br/>• Smaller h → less bias, more variance
                    <br/>• Larger h → more bias, less variance
                    <br/>• Optimal bandwidth balances this trade-off
                    <br/>• Always check robustness to bandwidth choice
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">LATE (Local Average Treatment Effect)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The estimated causal effect <strong>at the cutoff</strong>.
                    <br/>• Only valid for units near the threshold
                    <br/>• Cannot extrapolate to units far from cutoff
                    <br/>• External validity is limited
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Estimation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Estimation Method
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-foreground mb-3">
                  <strong>Local Linear Regression:</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  1. Select observations within bandwidth of cutoff<br/>
                  2. Fit separate regressions on each side of cutoff:<br/>
                  <span className="font-mono ml-4">Y = α + β(X - c) + ε  (left side)</span><br/>
                  <span className="font-mono ml-4">Y = γ + δ(X - c) + ε  (right side)</span><br/>
                  3. RDD effect = <strong>γ - α</strong> (jump at cutoff)<br/><br/>
                  Observations closer to cutoff receive more weight (kernel weighting).
                </p>
              </div>
              
              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Kernel Functions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Triangular:</strong> Linear decay from cutoff (recommended)
                    <br/><strong>Uniform:</strong> Equal weights within bandwidth
                    <br/><strong>Epanechnikov:</strong> Quadratic decay
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Polynomial Order</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Linear (p=1):</strong> Standard choice, recommended
                    <br/><strong>Quadratic (p=2):</strong> More flexible, risk of overfitting
                    <br/>Higher orders rarely justified
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Assumption */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Assumptions
              </h3>
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                    <strong>1. No Manipulation (Continuity)</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Units cannot <strong>precisely control</strong> their running variable to be on a 
                    preferred side of the cutoff.
                    <br/><br/>
                    <strong>Test:</strong> McCrary density test — checks for bunching at the cutoff
                    <br/><strong>If violated:</strong> Results are biased (selection into treatment)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Continuity of Potential Outcomes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In the absence of treatment, outcomes would be continuous at the cutoff.
                    <br/>• No other intervention changes at the cutoff
                    <br/>• Only the treatment causes the discontinuity
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Local Randomization</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Near the cutoff, treatment assignment is "as-if random."
                    <br/>• Units just above ≈ units just below (in expectation)
                    <br/>• Baseline covariates should be balanced at the cutoff
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Validity Checks */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Validity Checks
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">McCrary Density Test</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests for manipulation by checking if the density of the running variable 
                    is continuous at the cutoff.
                    <br/>• Significant jump → possible manipulation
                    <br/>• Look at density ratio (should be ≈ 1)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Covariate Balance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pre-determined covariates should NOT show a discontinuity at the cutoff.
                    <br/>• If they do → suggests manipulation or violation
                    <br/>• Run RDD on each covariate as outcome
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Robustness Checks</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Results should be robust to:
                    <br/>• Different bandwidths (50%, 100%, 150% of optimal)
                    <br/>• Different polynomial orders
                    <br/>• Including/excluding covariates
                    <br/>• Placebo cutoffs (where no effect expected)
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
                  <p className="font-medium text-sm text-primary mb-1">Do</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Show the RDD plot (scatter + fit)</li>
                    <li>• Run McCrary density test</li>
                    <li>• Check covariate balance</li>
                    <li>• Report multiple bandwidths</li>
                    <li>• Use triangular kernel + local linear</li>
                    <li>• Discuss external validity limits</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ignore manipulation concerns</li>
                    <li>• Use high-order polynomials</li>
                    <li>• Choose bandwidth based on results</li>
                    <li>• Extrapolate far from cutoff</li>
                    <li>• Skip robustness checks</li>
                    <li>• Use global (not local) polynomial</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• RDD estimate with SE, CI, p-value</li>
                    <li>• Bandwidth used (and how chosen)</li>
                    <li>• Sample size in bandwidth</li>
                    <li>• McCrary test result</li>
                    <li>• Robustness table</li>
                    <li>• RDD plot visualization</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Applications</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Test scores → program eligibility</li>
                    <li>• Age → legal rights (drinking, voting)</li>
                    <li>• Income → benefit eligibility</li>
                    <li>• Election margins → policy outcomes</li>
                    <li>• Pollution thresholds → regulations</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Limitations */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Limitations
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li><strong>Local effect only:</strong> LATE applies only at the cutoff, not to entire population</li>
                  <li><strong>External validity:</strong> Cannot generalize to units far from threshold</li>
                  <li><strong>Requires sharp cutoff:</strong> Fuzzy designs need different methods</li>
                  <li><strong>Manipulation sensitivity:</strong> Results invalid if running variable is manipulated</li>
                  <li><strong>Bandwidth sensitivity:</strong> Different bandwidths can give different results</li>
                  <li><strong>Sample size:</strong> Need sufficient observations near the cutoff</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> RDD provides credible causal estimates 
                when the cutoff is not manipulated and the design assumptions hold. Always visualize 
                the data, run the McCrary test, and check robustness. The estimated effect is 
                <strong> local to the cutoff</strong> — be cautious about generalizing to units 
                far from the threshold.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const rddExample = exampleDatasets.find(d => d.id === 'rdd-data' || d.id === 'causal');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><SplitSquareVertical className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Regression Discontinuity Design</CardTitle>
                    <CardDescription className="text-base mt-2">Estimate causal effects at a threshold/cutoff point</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Scissors className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Sharp Cutoff</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Treatment assigned at threshold</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Local Regression</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Estimate jump at discontinuity</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Causal Effect</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">LATE at the cutoff</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use RDD</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Running var:</strong> Continuous score</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Cutoff:</strong> Known threshold</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Outcome:</strong> Numeric variable</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>LATE:</strong> Effect at cutoff</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>McCrary:</strong> Manipulation test</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Robustness:</strong> Bandwidth checks</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {rddExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(rddExample)} size="lg"><SplitSquareVertical className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface RDDAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function RDDAnalysisPage({ data, allHeaders, onLoadExample }: RDDAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [outcomeCol, setOutcomeCol] = useState<string | undefined>();
    const [runningCol, setRunningCol] = useState<string | undefined>();
    const [cutoff, setCutoff] = useState<number>(0);
    const [bandwidth, setBandwidth] = useState<number | undefined>();
    const [polynomialOrder, setPolynomialOrder] = useState(1);
    const [kernel, setKernel] = useState('triangular');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length >= 20 && allHeaders.length >= 2, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const runningVarStats = useMemo(() => {
        if (!runningCol) return { min: 0, max: 100, mean: 50 };
        const values = data.map(r => Number(r[runningCol])).filter(v => !isNaN(v));
        return { min: Math.min(...values), max: Math.max(...values), mean: values.reduce((a, b) => a + b, 0) / values.length };
    }, [data, runningCol]);

    const dataValidation = useMemo(() => {
        const cutoffValid = cutoff > runningVarStats.min && cutoff < runningVarStats.max;
        return [
            { label: 'Outcome variable selected', passed: !!outcomeCol, detail: outcomeCol || 'Select outcome variable' },
            { label: 'Running variable selected', passed: !!runningCol, detail: runningCol || 'Select running variable' },
            { label: 'Cutoff within data range', passed: cutoffValid, detail: cutoffValid ? `c = ${cutoff}` : `Must be between ${runningVarStats.min?.toFixed(1)} and ${runningVarStats.max?.toFixed(1)}` },
            { label: 'Sufficient sample size (≥20)', passed: data.length >= 20, detail: `n = ${data.length}` },
        ];
    }, [outcomeCol, runningCol, cutoff, runningVarStats, data.length]);

    const allValidationsPassed = dataValidation.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setOutcomeCol(numericHeaders.find(h => h.toLowerCase().includes('outcome') || h.toLowerCase().includes('y') || h.toLowerCase().includes('score')));
        setRunningCol(numericHeaders.find(h => h.toLowerCase().includes('running') || h.toLowerCase().includes('x') || h.toLowerCase().includes('test') || h.toLowerCase().includes('age')));
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    useEffect(() => {
        if (runningCol && runningVarStats.mean) setCutoff(Math.round(runningVarStats.mean));
    }, [runningCol, runningVarStats.mean]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `RDD_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const rdd = analysisResult.rdd_estimate;
        let csv = `RDD ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nCutoff,${analysisResult.cutoff}\nBandwidth,${analysisResult.bandwidth_used}\n\nMAIN ESTIMATE\nRDD Effect,${rdd.rdd_estimate?.toFixed(4)}\nSE,${rdd.std_error?.toFixed(4)}\np-value,${rdd.p_value?.toFixed(4)}\n95% CI,[${rdd.ci_lower?.toFixed(3)}, ${rdd.ci_upper?.toFixed(3)}]\n\n`;
        csv += `ROBUSTNESS CHECKS\n` + Papa.unparse(analysisResult.robustness_checks);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `RDD_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!outcomeCol || !runningCol) { toast({ variant: 'destructive', title: 'Error', description: 'Select required variables.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/regression-discontinuity`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, outcome_col: outcomeCol, running_col: runningCol, cutoff, bandwidth: bandwidth || null, polynomial_order: polynomialOrder, kernel }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `Jump = ${result.rdd_estimate.rdd_estimate?.toFixed(3)}` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, outcomeCol, runningCol, cutoff, bandwidth, polynomialOrder, kernel, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

    const ProgressBar = () => (
        <div className="mb-8"><div className="flex items-center justify-between w-full gap-2">
            {STEPS.map((step) => {
                const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                const isCurrent = currentStep === step.id;
                const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                return (
                    <button key={step.id} onClick={() => isAccessible && goToStep(step.id)} disabled={!isAccessible} className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                            {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                        </div>
                        <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                    </button>
                );
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <RDDGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Regression Discontinuity</h1>
                    <p className="text-muted-foreground mt-1">Causal effect at threshold</p>
                </div>
                {/* 👇 버튼 수정 */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
                        <HelpCircle className="w-5 h-5" />
                    </Button>
                </div>
            </div>
            <ProgressBar />

            
            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose outcome and running variable</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Outcome Variable (Y)</Label><Select value={outcomeCol} onValueChange={setOutcomeCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select outcome..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Minus className="w-4 h-4 text-primary" />Running Variable (X)</Label><Select value={runningCol} onValueChange={setRunningCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select running var..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            {runningCol && <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm"><strong>{runningCol}:</strong> Range [{runningVarStats.min?.toFixed(1)}, {runningVarStats.max?.toFixed(1)}], Mean = {runningVarStats.mean?.toFixed(1)}</p></div>}
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!outcomeCol || !runningCol}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>RDD Settings</CardTitle><CardDescription>Configure cutoff and bandwidth</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label>Cutoff Value (c)</Label><Input type="number" value={cutoff} onChange={(e) => setCutoff(parseFloat(e.target.value) || 0)} className="h-11" /><p className="text-xs text-muted-foreground">Range: {runningVarStats.min?.toFixed(1)} to {runningVarStats.max?.toFixed(1)}</p></div>
                                <div className="space-y-3"><Label>Bandwidth (optional)</Label><Input type="number" value={bandwidth || ''} onChange={(e) => setBandwidth(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Auto-calculate" className="h-11" /><p className="text-xs text-muted-foreground">Leave empty for optimal bandwidth</p></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label>Polynomial Order</Label><Select value={String(polynomialOrder)} onValueChange={(v) => setPolynomialOrder(Number(v))}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Linear (1)</SelectItem><SelectItem value="2">Quadratic (2)</SelectItem></SelectContent></Select></div>
                                <div className="space-y-3"><Label>Kernel</Label><Select value={kernel} onValueChange={setKernel}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="uniform">Uniform</SelectItem><SelectItem value="triangular">Triangular</SelectItem><SelectItem value="epanechnikov">Epanechnikov</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Bandwidth determines data range around cutoff. Smaller = less bias, more variance. Triangular kernel weights observations closer to cutoff more heavily.</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking RDD requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}<div><p className={`font-medium text-sm ${check.passed ? '' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></div>))}
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Cutoff:</span> {cutoff}</div><div><span className="text-muted-foreground">Bandwidth:</span> {bandwidth || 'Auto'}</div><div><span className="text-muted-foreground">Polynomial:</span> {polynomialOrder}</div><div><span className="text-muted-foreground">Kernel:</span> {kernel}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><SplitSquareVertical className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">RDD will estimate the discontinuous jump in {outcomeCol} at {runningCol} = {cutoff}.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run RDD<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const rdd = results.rdd_estimate;
                    const isSignificant = rdd.significant;
                    const robustCount = results.robustness_checks.filter(r => r.significant).length;
                    const totalRobust = results.robustness_checks.length;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Discontinuity estimate at cutoff = {results.cutoff}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isSignificant ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• RDD Effect: <strong>{rdd.rdd_estimate?.toFixed(3)}</strong> (SE = {rdd.std_error?.toFixed(3)})</p>
                                        <p className="text-sm">• 95% CI: [{rdd.ci_lower?.toFixed(2)}, {rdd.ci_upper?.toFixed(2)}]</p>
                                        <p className="text-sm">• p-value: <strong>{rdd.p_value < 0.001 ? '< .001' : rdd.p_value?.toFixed(4)}</strong> — {isSignificant ? 'significant discontinuity' : 'no significant jump'}</p>
                                        <p className="text-sm">• Mean below cutoff: {rdd.mean_left?.toFixed(2)} | Mean above: {rdd.mean_right?.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isSignificant ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isSignificant ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isSignificant ? "Significant Discontinuity!" : "No Significant Discontinuity"}</p><p className="text-sm text-muted-foreground mt-1">{isSignificant ? `Treatment at the cutoff causes a ${rdd.rdd_estimate > 0 ? 'positive' : 'negative'} jump of ${Math.abs(rdd.rdd_estimate).toFixed(3)} units.` : 'The outcome does not show a significant jump at the threshold.'}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><Target className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Bandwidth used: {results.bandwidth_used?.toFixed(2)}</p><p>• N in bandwidth: {rdd.n_total} ({rdd.n_left} left, {rdd.n_right} right)</p><p>• Robustness: {robustCount}/{totalRobust} bandwidth checks significant</p><p>• McCrary test: {results.manipulation_test.manipulation_detected ? '⚠️ Potential manipulation' : '✓ No manipulation detected'}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Confidence:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (isSignificant && !results.manipulation_test.manipulation_detected && robustCount >= totalRobust/2 ? 5 : isSignificant ? 4 : 2) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                                {results.manipulation_test.manipulation_detected && (
                                    <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-300"><p className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-600" /><strong>Warning:</strong> Potential manipulation detected at cutoff. Results should be interpreted with caution.</p></div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding RDD results</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">What is RDD?</h4><p className="text-sm text-muted-foreground">Regression Discontinuity Design exploits a cutoff in a running variable where treatment is assigned. By comparing units just above and below the threshold, we estimate the local average treatment effect (LATE).</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">The Discontinuity</h4><p className="text-sm text-muted-foreground">We fit separate local regressions on each side of the cutoff ({results.cutoff}). The estimated jump is {results.rdd_estimate.rdd_estimate?.toFixed(3)}. Mean below: {results.rdd_estimate.mean_left?.toFixed(2)}, mean above: {results.rdd_estimate.mean_right?.toFixed(2)}.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">McCrary Density Test</h4><p className="text-sm text-muted-foreground">This test checks for manipulation of the running variable. Density ratio: {results.manipulation_test.density_ratio?.toFixed(3)}. {results.manipulation_test.manipulation_detected ? 'Warning: Potential manipulation detected!' : 'No evidence of manipulation at the cutoff.'}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Robustness</h4><p className="text-sm text-muted-foreground">We check estimates across different bandwidths. {results.robustness_checks.filter(r => r.significant).length}/{results.robustness_checks.length} show significant effects. {results.robustness_checks.filter(r => r.significant).length >= results.robustness_checks.length/2 ? 'Results are robust to bandwidth choice.' : 'Results are sensitive to bandwidth selection.'}</p></div></div></div>
                            <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl p-5 border border-sky-300"><h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-sky-600" />Key RDD Assumptions</h4><ul className="text-sm text-muted-foreground space-y-1"><li>• No manipulation of running variable at cutoff</li><li>• Continuity of potential outcomes at threshold</li><li>• Local randomization around cutoff</li><li>• Correct functional form specification</li></ul></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 6 && results && (() => {
                    const rdd = results.rdd_estimate;
                    const sig = rdd.significant;
                    const handleDownloadWord = () => {
                        const content = `Regression Discontinuity Design Report\nGenerated: ${new Date().toLocaleString()}\n\nSUMMARY\nRDD Estimate: ${rdd.rdd_estimate?.toFixed(3)}\nStandard Error: ${rdd.std_error?.toFixed(3)}\nt-statistic: ${rdd.t_statistic?.toFixed(2)}\np-value: ${rdd.p_value < 0.001 ? '< .001' : rdd.p_value?.toFixed(4)}\n95% CI: [${rdd.ci_lower?.toFixed(2)}, ${rdd.ci_upper?.toFixed(2)}]\nCutoff: ${results.cutoff}\nBandwidth: ${results.bandwidth_used?.toFixed(2)}\nResult: ${sig ? 'Significant discontinuity' : 'No significant discontinuity'}\n\nSAMPLE\nTotal in bandwidth: ${rdd.n_total}\nLeft of cutoff: ${rdd.n_left}\nRight of cutoff: ${rdd.n_right}`;
                        const blob = new Blob([content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'rdd_report.doc'; a.click();
                        URL.revokeObjectURL(url);
                    };
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadWord}><FileText className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Regression Discontinuity Report</h2><p className="text-sm text-muted-foreground mt-1">Cutoff = {results.cutoff} | Bandwidth = {results.bandwidth_used?.toFixed(2)} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            {/* Detailed Analysis - APA Format */}
                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-semibold">Statistical Summary</h3>
                                        </div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A sharp regression discontinuity design (RDD) was employed to estimate the causal effect of treatment at the cutoff threshold of <span className="font-mono">{results.cutoff}</span>. 
                                                The analysis used <em>N</em> = {rdd.n_total} observations within the optimal bandwidth of <span className="font-mono">{results.bandwidth_used?.toFixed(2)}</span>, 
                                                with {rdd.n_left} observations below and {rdd.n_right} observations above the cutoff.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                Local {polynomialOrder === 1 ? 'linear' : 'polynomial'} regression with a {kernel} kernel was fitted separately on each side of the cutoff. 
                                                The mean outcome just below the threshold was <span className="font-mono">{rdd.mean_left?.toFixed(2)}</span>, 
                                                while the mean just above was <span className="font-mono">{rdd.mean_right?.toFixed(2)}</span>. 
                                                The estimated discontinuity (local average treatment effect at the cutoff) was <span className="font-mono">{rdd.rdd_estimate?.toFixed(3)}</span> 
                                                (<em>SE</em> = <span className="font-mono">{rdd.std_error?.toFixed(3)}</span>), 
                                                95% CI [<span className="font-mono">{rdd.ci_lower?.toFixed(2)}</span>, <span className="font-mono">{rdd.ci_upper?.toFixed(2)}</span>].
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The treatment effect was {sig ? 'statistically significant' : 'not statistically significant'}, 
                                                <em>t</em> = <span className="font-mono">{rdd.t_statistic?.toFixed(2)}</span>, 
                                                <em>p</em> {rdd.p_value < 0.001 ? '< .001' : `= ${rdd.p_value?.toFixed(3)}`}. 
                                                {sig 
                                                    ? ` Crossing the threshold of ${results.cutoff} resulted in a ${rdd.rdd_estimate > 0 ? 'significant increase' : 'significant decrease'} in the outcome by ${Math.abs(rdd.rdd_estimate).toFixed(3)} units.` 
                                                    : ' There was no evidence of a discontinuous jump in outcomes at the threshold.'}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The McCrary density test {results.manipulation_test.manipulation_detected ? 'suggested potential manipulation of the running variable' : 'showed no evidence of manipulation'} 
                                                (<em>p</em> = <span className="font-mono">{results.manipulation_test.p_value?.toFixed(3)}</span>), 
                                                with density ratio = <span className="font-mono">{results.manipulation_test.density_ratio?.toFixed(3)}</span>. 
                                                Robustness checks across alternative bandwidths ({results.robustness_checks.map(r => r.bandwidth?.toFixed(1)).join(', ')}) showed 
                                                {results.robustness_checks.filter(r => r.significant).length === results.robustness_checks.length 
                                                    ? ' consistent significant effects' 
                                                    : results.robustness_checks.filter(r => r.significant).length === 0 
                                                        ? ' consistently non-significant effects' 
                                                        : ' mixed results'}, 
                                                supporting the {results.robustness_checks.filter(r => r.significant).length >= results.robustness_checks.length / 2 ? 'robustness' : 'sensitivity'} of the findings.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="rdd" className="w-full"><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="rdd">RDD Plot</TabsTrigger><TabsTrigger value="density">Density Test</TabsTrigger><TabsTrigger value="local">Local Fit</TabsTrigger><TabsTrigger value="robust">Robustness</TabsTrigger></TabsList><TabsContent value="rdd" className="mt-4">{results.rdd_plot ? <Image src={`data:image/png;base64,${results.rdd_plot}`} alt="RDD Plot" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="density" className="mt-4">{results.density_plot ? <Image src={`data:image/png;base64,${results.density_plot}`} alt="Density" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="local" className="mt-4">{results.local_plot ? <Image src={`data:image/png;base64,${results.local_plot}`} alt="Local Fit" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent><TabsContent value="robust" className="mt-4">{results.robustness_plot ? <Image src={`data:image/png;base64,${results.robustness_plot}`} alt="Robustness" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>Robustness Checks</CardTitle><CardDescription>Sensitivity to bandwidth choice</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Bandwidth</TableHead><TableHead className="text-right">Estimate</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">N</TableHead><TableHead>Sig</TableHead></TableRow></TableHeader><TableBody>{results.robustness_checks.map((r, i) => (<TableRow key={i} className={r.multiplier === 1.0 ? 'bg-primary/5 font-semibold' : ''}><TableCell>{r.bandwidth?.toFixed(2)} {r.multiplier === 1.0 && <Badge variant="outline" className="ml-2">Base</Badge>}</TableCell><TableCell className="text-right font-mono">{r.estimate?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{r.std_error?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{r.p_value?.toFixed(4)}</TableCell><TableCell className="text-right">{r.n_obs}</TableCell><TableCell>{r.significant ? <Badge className="bg-primary">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                            
                            <Card><CardHeader><CardTitle>McCrary Density Test</CardTitle><CardDescription>Testing for manipulation at cutoff</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{label: 'Left Density', value: results.manipulation_test.left_density?.toFixed(2)}, {label: 'Right Density', value: results.manipulation_test.right_density?.toFixed(2)}, {label: 'Ratio', value: results.manipulation_test.density_ratio?.toFixed(3)}, {label: 'p-value', value: results.manipulation_test.p_value?.toFixed(4)}].map((item, i) => (<div key={i} className="p-3 bg-muted/50 rounded-lg text-center"><p className="text-xs text-muted-foreground">{item.label}</p><p className="font-semibold">{item.value}</p></div>))}</div><p className={`mt-4 text-sm ${results.manipulation_test.manipulation_detected ? 'text-rose-600' : 'text-green-600'}`}>{results.manipulation_test.message}</p></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Estimating discontinuity...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>

            {/* Python Code Modal */}
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
        </div>
    );
}

