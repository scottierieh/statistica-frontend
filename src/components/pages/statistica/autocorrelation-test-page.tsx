'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, HelpCircle, Settings, FileSearch, BarChart, BookOpen, Filter, CheckCircle, Activity, TrendingUp, Target, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Waves, BarChart3, Code, Copy } from 'lucide-react';
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
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/autocorrelation_test.py?alt=media";

// Statistical Terms Glossary for Autocorrelation Test
const autocorrelationMetricDefinitions: Record<string, string> = {
    autocorrelation: "The correlation of a time series with its own lagged values. Positive autocorrelation means similar values tend to follow each other; negative means values tend to alternate.",
    serial_correlation: "Another term for autocorrelation. Indicates that consecutive observations are not independent, violating a key OLS regression assumption.",
    durbin_watson: "A test statistic for first-order autocorrelation in residuals. Ranges from 0 to 4: DW ≈ 2 indicates no autocorrelation, DW → 0 indicates positive, DW → 4 indicates negative autocorrelation.",
    first_order_autocorrelation: "Correlation between consecutive residuals (ρ₁). Measures how strongly today's error relates to yesterday's error. Formula: ρ₁ = Cov(eₜ, eₜ₋₁) / Var(e).",
    ljung_box_test: "A portmanteau test that checks for autocorrelation at multiple lags simultaneously. Tests H₀: all autocorrelations up to lag k are zero. More powerful than testing individual lags.",
    q_statistic: "The test statistic for Ljung-Box test. Q = n(n+2)Σ(ρₖ²/(n-k)). Follows χ² distribution under H₀. Larger values suggest significant autocorrelation.",
    breusch_godfrey: "The Lagrange Multiplier (LM) test for serial correlation. More general than Durbin-Watson as it tests higher-order autocorrelation and works with lagged dependent variables.",
    lm_statistic: "The test statistic for Breusch-Godfrey test. Calculated as nR² from auxiliary regression of residuals on original regressors and lagged residuals.",
    acf: "Autocorrelation Function. Shows correlation at each lag. ACF at lag k = Corr(eₜ, eₜ₋ₖ). Bars exceeding confidence bounds indicate significant autocorrelation.",
    pacf: "Partial Autocorrelation Function. Correlation at lag k after controlling for shorter lags. Helps identify the order of autoregressive (AR) processes.",
    lag: "The time gap between observations being compared. Lag 1 compares consecutive observations, lag 2 compares observations two periods apart, etc.",
    residual: "The difference between observed and predicted values (eₜ = yₜ - ŷₜ). In time series context, residuals should be independent (no autocorrelation) for valid inference.",
    independence_assumption: "OLS assumes errors are independent. Violation (autocorrelation) leads to inefficient estimates and biased standard errors, making hypothesis tests unreliable.",
    positive_autocorrelation: "When DW < 2 or ρ > 0. Errors tend to have the same sign consecutively - if one error is positive, the next is likely positive too. Common in trending data.",
    negative_autocorrelation: "When DW > 2 or ρ < 0. Errors tend to alternate signs - a positive error is likely followed by a negative one. Less common, may indicate over-differencing.",
    critical_values: "DW test uses bounds (dL, dU). If DW < dL: positive autocorrelation. If DW > 4-dL: negative. If dL < DW < dU or 4-dU < DW < 4-dL: inconclusive.",
    newey_west: "A method for computing heteroskedasticity and autocorrelation consistent (HAC) standard errors. Use when autocorrelation is present but coefficient estimates are still needed.",
    arima: "AutoRegressive Integrated Moving Average. A time series model that explicitly accounts for autocorrelation. Consider when autocorrelation is detected in residuals.",
    white_noise: "A sequence of uncorrelated random variables with zero mean and constant variance. Ideal residuals should resemble white noise - no patterns or autocorrelation.",
    confidence_bounds: "In ACF/PACF plots, typically ±1.96/√n. Autocorrelations exceeding these bounds are considered statistically significant at α = 0.05."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Autocorrelation Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in autocorrelation testing
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(autocorrelationMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'autocorrelation_test.py';
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
                        Python Code - Autocorrelation Test
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

interface DWInterpretation {
    conclusion: string;
    description: string;
    dl: number;
    du: number;
    critical_region: string;
}

interface Metrics {
    durbin_watson: number;
    dw_interpretation: DWInterpretation;
    first_order_autocorr: number;
    n_observations: number;
    n_predictors: number;
    r_squared: number;
    residual_mean: number;
    residual_std: number;
}

interface LjungBoxResult {
    lag: number;
    q_statistic: number;
    p_value: number;
    significant: boolean;
}

interface BreuschGodfreyResult {
    lm_statistic: number | null;
    p_value: number | null;
    lag_order: number;
    significant: boolean | null;
}

interface ACFDataItem {
    lag: number;
    acf: number;
    significant: boolean;
}

interface AnalysisResult {
    metrics: Metrics;
    ljung_box: LjungBoxResult[];
    breusch_godfrey: BreuschGodfreyResult;
    acf_data: ACFDataItem[];
    insights: { type: string; title: string; description: string }[];
    recommendations: string[];
    plots: {
        residual_sequence: string;
        acf: string;
        lagged_residual: string;
        pacf: string;
    };
    residual_data: { index: number; fitted: number; residual: number }[];
    model_summary: {
        dependent: string;
        independents: string[];
        equation: string;
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

const formatPValue = (p: number | null): string => {
    if (p === null) return 'N/A';
    if (p < 0.001) return '< 0.001';
    return p.toFixed(4);
};

// Statistical Summary Cards
const StatisticalSummaryCards = ({ results }: { results: AnalysisResult }) => {
    const dw = results.metrics.durbin_watson;
    const hasAutocorr = results.metrics.dw_interpretation.conclusion !== 'no_autocorrelation';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Durbin-Watson</p><Waves className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{dw.toFixed(4)}</p><p className="text-xs text-muted-foreground">Ideal ≈ 2.0</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">First-Order ρ</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.first_order_autocorr.toFixed(4)}</p><p className="text-xs text-muted-foreground">{Math.abs(results.metrics.first_order_autocorr) < 0.2 ? 'Low' : Math.abs(results.metrics.first_order_autocorr) < 0.4 ? 'Moderate' : 'High'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Observations</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.n_observations}</p><p className="text-xs text-muted-foreground">{results.metrics.n_predictors} predictor(s)</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Independence</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${hasAutocorr ? 'text-red-600' : 'text-green-600'}`}>{hasAutocorr ? 'Violated' : 'Met'}</p><p className="text-xs text-muted-foreground">Assumption</p></div></CardContent></Card>
        </div>
    );
};




const AutocorrelationGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Autocorrelation Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Autocorrelation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4" />
                What is Autocorrelation?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Autocorrelation (serial correlation) occurs when regression <strong>residuals are correlated 
                with their own lagged values</strong>. This violates the independence assumption of OLS.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why It Matters:</strong> When errors are autocorrelated, standard errors are 
                  underestimated, leading to inflated t-statistics and potentially false conclusions 
                  about statistical significance.
                </p>
              </div>
            </div>

            <Separator />

            {/* Durbin-Watson Test */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Durbin-Watson Test
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">DW Statistic Interpretation</p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-center">
                      <p className="font-medium">0 - 1.5</p>
                      <p className="text-muted-foreground">Positive autocorr</p>
                    </div>
                    <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 text-center border-2 border-green-500">
                      <p className="font-medium">1.5 - 2.5</p>
                      <p className="text-muted-foreground">No autocorr ✓</p>
                    </div>
                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-center">
                      <p className="font-medium">2.5 - 4</p>
                      <p className="text-muted-foreground">Negative autocorr</p>
                    </div>
                    <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-center">
                      <p className="font-medium">≈ 2.0</p>
                      <p className="text-muted-foreground">Ideal</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Positive autocorrelation (DW → 0):</strong> Errors of the same sign cluster together.<br/>
                  <strong>Negative autocorrelation (DW → 4):</strong> Errors alternate in sign.
                </p>
              </div>
            </div>

            <Separator />

            {/* Other Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Additional Tests
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Ljung-Box Test</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests for autocorrelation at <strong>multiple lags simultaneously</strong>. 
                    More powerful than testing individual lags. 
                    H₀: All autocorrelations up to lag k are zero.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Breusch-Godfrey Test</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    LM test for serial correlation. More general than DW — works with 
                    <strong> lagged dependent variables</strong> and tests higher-order autocorrelation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">ACF/PACF Plots</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visual tools to identify autocorrelation structure. Bars exceeding 
                    confidence bounds (dashed lines) indicate significant correlation at that lag.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Solutions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                What to Do If Autocorrelation Is Detected
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">1. Add Lagged Variables</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Include lagged values of Y or X as predictors. This often captures 
                    the serial dependence explicitly.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">2. Use Newey-West Standard Errors</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    HAC (heteroskedasticity and autocorrelation consistent) standard errors 
                    remain valid even with autocorrelation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">3. Time Series Models (ARIMA)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If data is inherently time-ordered, consider ARIMA or other time series 
                    models that explicitly model autocorrelation.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">4. Check for Missing Variables</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Autocorrelation sometimes signals omitted variables (e.g., seasonality, 
                    trends) that should be included in the model.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                When to Test for Autocorrelation
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Always Test When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Time series data (sequential observations)</li>
                    <li>• Panel/longitudinal data</li>
                    <li>• Spatial data (geographic ordering)</li>
                    <li>• Any ordered data</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Less Critical When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Cross-sectional data (no natural order)</li>
                    <li>• Random sampling</li>
                    <li>• Independent observations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Autocorrelation doesn't bias OLS 
                coefficient estimates, but it does invalidate standard errors and significance tests. 
                DW ≈ 2 is ideal. If autocorrelation is detected, use robust standard errors or 
                re-specify the model to account for serial dependence.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Waves className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Autocorrelation Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test for serial correlation in regression residuals
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Durbin-Watson</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Tests first-order autocorrelation (DW ≈ 2 is ideal)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">ACF/PACF</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Visualize autocorrelation at multiple lags
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Ljung-Box</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Tests higher-order autocorrelation
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
                            Use when residuals may be correlated with their lagged values (common in time series). 
                            Autocorrelation violates OLS assumptions, leading to unreliable standard errors.
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
                                        <span><strong>Data order:</strong> Sequential/time-ordered preferred</span>
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
                                        <span><strong>DW ≈ 2:</strong> No autocorrelation</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>DW → 0:</strong> Positive autocorrelation</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>DW → 4:</strong> Negative autocorrelation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Waves className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface AutocorrelationTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function AutocorrelationTestPage({ data, numericHeaders, onLoadExample }: AutocorrelationTestPageProps) {
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
            link.download = `Autocorrelation_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const r = analysisResult;
        let csvContent = "AUTOCORRELATION TEST RESULTS\n\n";
        csvContent += `Dependent Variable,${r.model_summary.dependent}\n`;
        csvContent += `Independent Variables,${r.model_summary.independents.join('; ')}\n`;
        csvContent += `Observations,${r.metrics.n_observations}\n`;
        csvContent += `R-squared,${r.metrics.r_squared.toFixed(4)}\n\n`;
        csvContent += "DURBIN-WATSON TEST\n";
        csvContent += `DW Statistic,${r.metrics.durbin_watson.toFixed(4)}\n`;
        csvContent += `Conclusion,${r.metrics.dw_interpretation.description}\n`;
        csvContent += `First-Order Autocorr,${r.metrics.first_order_autocorr.toFixed(4)}\n\n`;
        csvContent += "LJUNG-BOX TEST\n";
        csvContent += Papa.unparse(r.ljung_box.map(lb => ({ Lag: lb.lag, Q_Statistic: lb.q_statistic.toFixed(4), P_Value: lb.p_value.toFixed(4), Significant: lb.significant ? 'Yes' : 'No' }))) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Autocorrelation_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);


    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/autocorrelation-docx', {
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
            link.download = `Autocorrelation_Test_${new Date().toISOString().split('T')[0]}.docx`;
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
            const response = await fetch(`${FASTAPI_URL}/api/analysis/independence-test`, {
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
<div className="mb-6 flex justify-between items-center">
                <div><h1 className="text-2xl font-bold">Autocorrelation Test</h1><p className="text-muted-foreground mt-1">Test for serial correlation in residuals</p></div>
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
                                    <p>• <strong className="text-foreground">Tests:</strong> Durbin-Watson, Ljung-Box, Breusch-Godfrey</p>
                                    <p>• <strong className="text-foreground">Plots:</strong> Residual sequence, ACF, PACF, Lagged scatter</p>
                                    <p>• <strong className="text-foreground">Sample Size:</strong> {data.length} observations</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About Autocorrelation</h4>
                                <p className="text-sm text-muted-foreground">
                                    Autocorrelation occurs when residuals are correlated with their lagged values. 
                                    <strong> DW ≈ 2</strong> indicates no autocorrelation. 
                                    <strong> DW → 0</strong> indicates positive, <strong>DW → 4</strong> indicates negative autocorrelation.
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
                                <Waves className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will test if residuals from <strong>{dependentVar}</strong> ~ <strong>{independentVars.join(' + ')}</strong> are independent.</p>
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
                    const dw = results.metrics.durbin_watson;
                    const hasAutocorr = results.metrics.dw_interpretation.conclusion !== 'no_autocorrelation';
                    const rho = results.metrics.first_order_autocorr;
                    const ljungBoxSig = results.ljung_box.some(lb => lb.significant);
                    const isGood = !hasAutocorr && !ljungBoxSig;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Autocorrelation Test: {dependentVar} ~ {independentVars.join(' + ')}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Your model's predictions are <strong>{isGood ? 'reliable over time' : 'showing patterns in errors'}</strong>.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isGood 
                                                ? 'Sequential predictions don\'t influence each other - each forecast is independent.'
                                                : 'Errors from one period carry over to the next - forecasts may be systematically off.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Durbin-Watson = <strong>{dw.toFixed(2)}</strong> (ideal is 2.0).
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Model is Trustworthy for Forecasting" : "Forecasting Accuracy May Be Compromised"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? "Your predictions are independent and unbiased over time."
                                                    : "Systematic patterns in errors suggest the model is missing important time-related factors."}
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
                                                <p>✓ <strong className="text-foreground">Reliable Forecasting:</strong> Your model can be trusted for sequential predictions (e.g., monthly sales, weekly demand).</p>
                                                <p>✓ <strong className="text-foreground">Valid Confidence Intervals:</strong> The uncertainty estimates around predictions are accurate.</p>
                                                <p>✓ <strong className="text-foreground">No Hidden Trends:</strong> The model captures the underlying patterns well.</p>
                                            </>
                                        ) : (
                                            <>
                                                <p>⚠ <strong className="text-foreground">Forecast Drift:</strong> Predictions may consistently over- or under-estimate for extended periods.</p>
                                                <p>⚠ <strong className="text-foreground">Missing Seasonality:</strong> Consider if there are weekly, monthly, or yearly patterns not captured.</p>
                                                <p>⚠ <strong className="text-foreground">Trend Momentum:</strong> Past errors affect future predictions - consider adding lag variables.</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Forecast Reliability:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = isGood ? (Math.abs(dw - 2) < 0.3 ? 5 : Math.abs(dw - 2) < 0.5 ? 4 : 3) : (Math.abs(rho) < 0.3 ? 2 : 1);
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
                    const dw = results.metrics.durbin_watson;
                    const hasAutocorr = results.metrics.dw_interpretation.conclusion !== 'no_autocorrelation';
                    const rho = results.metrics.first_order_autocorr;
                    const ljungBoxSig = results.ljung_box.filter(lb => lb.significant);
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding the test results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Durbin-Watson Test</h4>
                                            <p className="text-sm text-muted-foreground">
                                                DW = {dw.toFixed(4)} (range 0-4, ideal = 2). 
                                                {dw < 1.5 ? ' Value below 1.5 suggests positive autocorrelation - consecutive errors tend to have the same sign.' 
                                                : dw > 2.5 ? ' Value above 2.5 suggests negative autocorrelation - consecutive errors tend to alternate signs.'
                                                : ' Value near 2 indicates no significant first-order autocorrelation.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">First-Order Correlation (ρ₁)</h4>
                                            <p className="text-sm text-muted-foreground">
                                                ρ₁ = {rho.toFixed(4)}. This measures correlation between consecutive residuals.
                                                {Math.abs(rho) < 0.2 ? ' Very low - residuals are essentially independent.' 
                                                : Math.abs(rho) < 0.4 ? ' Moderate - some serial correlation present.'
                                                : ' High - substantial autocorrelation detected.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Ljung-Box Test</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Tests for autocorrelation at multiple lags simultaneously.
                                                {ljungBoxSig.length > 0 
                                                    ? ` Significant at lag(s) ${ljungBoxSig.map(l => l.lag).join(', ')} - higher-order autocorrelation detected.`
                                                    : ' No significant autocorrelation detected at tested lags.'}
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
                                                {hasAutocorr 
                                                    ? 'Consider: (1) Adding lagged variables, (2) Using Newey-West standard errors, (3) Trying ARIMA models for time series, or (4) Checking for missing seasonal patterns.' 
                                                    : 'Independence assumption is satisfied. Standard OLS inference is valid. Proceed with confidence intervals and hypothesis tests.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${!hasAutocorr ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {!hasAutocorr ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />} Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {!hasAutocorr 
                                            ? `DW = ${dw.toFixed(2)} is within acceptable range. Residuals are independent - OLS estimates and standard errors are reliable.`
                                            : `DW = ${dw.toFixed(2)} indicates ${dw < 2 ? 'positive' : 'negative'} autocorrelation. Standard errors may be underestimated, leading to inflated significance.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />DW Interpretation Guide</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0 - 1.5</p><p className="text-muted-foreground">Positive</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg border-2 border-green-500"><p className="font-medium">1.5 - 2.5</p><p className="text-muted-foreground">No Autocorr</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">2.5 - 4</p><p className="text-muted-foreground">Negative</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">≈ 2.0</p><p className="text-muted-foreground">Ideal</p></div>
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
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full test results and diagnostic plots</p></div>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Autocorrelation Test Report</h2><p className="text-sm text-muted-foreground mt-1">{results.model_summary.dependent} ~ {results.model_summary.independents.join(' + ')} | n = {results.metrics.n_observations} | DW = {results.metrics.durbin_watson.toFixed(4)} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Model Summary */}
                        <Card>
                            <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Table>
                                        <TableBody>
                                            <TableRow><TableCell className="font-medium">Dependent Variable</TableCell><TableCell>{results.model_summary.dependent}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">Independent Variables</TableCell><TableCell>{results.model_summary.independents.join(', ')}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">Observations</TableCell><TableCell className="font-mono">{results.metrics.n_observations}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">R²</TableCell><TableCell className="font-mono">{results.metrics.r_squared.toFixed(4)}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                    <div className="space-y-3">
                                        <div className="bg-muted/50 rounded-lg p-4">
                                            <p className="text-xs text-muted-foreground mb-1">Durbin-Watson Statistic</p>
                                            <p className="text-3xl font-bold">{results.metrics.durbin_watson.toFixed(4)}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Ideal value ≈ 2.0</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-4">
                                            <p className="text-xs text-muted-foreground mb-1">First-Order Autocorrelation (ρ₁)</p>
                                            <p className="text-xl font-mono">{results.metrics.first_order_autocorr.toFixed(4)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Diagnostic Plots */}
                        <Tabs defaultValue="sequence" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="sequence">Sequence</TabsTrigger>
                                <TabsTrigger value="acf">ACF</TabsTrigger>
                                <TabsTrigger value="pacf">PACF</TabsTrigger>
                                <TabsTrigger value="lagged">Lagged</TabsTrigger>
                            </TabsList>
                            <TabsContent value="sequence">
                                <Card><CardHeader><CardTitle className="text-lg">Residual Sequence Plot</CardTitle><CardDescription>Residuals plotted in order. Look for patterns or trends.</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${results.plots.residual_sequence}`} alt="Residual Sequence" className="w-full rounded-md border" /></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="acf">
                                <Card><CardHeader><CardTitle className="text-lg">Autocorrelation Function (ACF)</CardTitle><CardDescription>Bars exceeding dashed lines indicate significant autocorrelation.</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${results.plots.acf}`} alt="ACF" className="w-full rounded-md border" /></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="pacf">
                                <Card><CardHeader><CardTitle className="text-lg">Partial ACF (PACF)</CardTitle><CardDescription>Direct correlation at each lag, controlling for shorter lags.</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${results.plots.pacf}`} alt="PACF" className="w-full rounded-md border" /></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="lagged">
                                <Card><CardHeader><CardTitle className="text-lg">Residual vs Lagged Residual</CardTitle><CardDescription>Slope indicates first-order autocorrelation.</CardDescription></CardHeader><CardContent className="flex justify-center"><img src={`data:image/png;base64,${results.plots.lagged_residual}`} alt="Lagged Residual" className="max-w-lg rounded-md border" /></CardContent></Card>
                            </TabsContent>
                        </Tabs>

                        {/* Test Results */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Ljung-Box Test</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Lag</TableHead><TableHead className="text-right">Q-Stat</TableHead><TableHead className="text-right">P-Value</TableHead><TableHead className="text-center">Sig?</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {results.ljung_box.map(lb => (
                                                <TableRow key={lb.lag}>
                                                    <TableCell>{lb.lag}</TableCell>
                                                    <TableCell className="font-mono text-right">{lb.q_statistic.toFixed(3)}</TableCell>
                                                    <TableCell className="font-mono text-right">{formatPValue(lb.p_value)}</TableCell>
                                                    <TableCell className="text-center"><Badge variant={lb.significant ? 'destructive' : 'outline'}>{lb.significant ? 'Yes' : 'No'}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg">ACF Values</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-48">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Lag</TableHead><TableHead className="text-right">ACF</TableHead><TableHead className="text-center">Sig?</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {results.acf_data.slice(0, 15).map(acf => (
                                                    <TableRow key={acf.lag}>
                                                        <TableCell>{acf.lag}</TableCell>
                                                        <TableCell className="font-mono text-right">{acf.acf.toFixed(4)}</TableCell>
                                                        <TableCell className="text-center">{acf.lag > 0 && acf.significant ? <Badge variant="destructive">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Breusch-Godfrey */}
                        {results.breusch_godfrey.lm_statistic !== null && (
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Breusch-Godfrey Test</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableBody>
                                            <TableRow><TableCell className="font-medium">LM Statistic</TableCell><TableCell className="font-mono">{results.breusch_godfrey.lm_statistic?.toFixed(4)}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">P-Value</TableCell><TableCell className="font-mono">{formatPValue(results.breusch_godfrey.p_value)}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">Lag Order</TableCell><TableCell className="font-mono">{results.breusch_godfrey.lag_order}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">Significant?</TableCell><TableCell><Badge variant={results.breusch_godfrey.significant ? 'destructive' : 'outline'}>{results.breusch_godfrey.significant ? 'Yes' : 'No'}</Badge></TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter><p className="text-sm text-muted-foreground">Tests for serial correlation up to specified lag order. P &lt; 0.05 indicates significant autocorrelation.</p></CardFooter>
                            </Card>
                        )}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
            
            {/* Modals */}
            <AutocorrelationGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
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
