'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lightbulb, CheckCircle, Zap, HelpCircle, Settings, FileSearch, BarChart3, BookOpen, Download, FileSpreadsheet, ImageIcon, Info, XCircle, TrendingUp, ScatterChart, LineChart, Target, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, BarChart, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Label } from '../../ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/linearity_test.py?alt=media";

// Statistical Terms Glossary for Linearity Check
const linearityMetricDefinitions: Record<string, string> = {
    linearity_assumption: "The assumption that the relationship between independent and dependent variables can be approximated by a straight line. Violations lead to biased estimates and poor predictions.",
    residual: "The difference between an observed value and the model's predicted value (eᵢ = yᵢ - ŷᵢ). Residuals should be randomly scattered around zero if linearity holds.",
    fitted_value: "The predicted value from the regression model (ŷ). Also called predicted value or y-hat. Used in diagnostic plots to assess model assumptions.",
    residual_vs_fitted_plot: "A diagnostic plot with fitted values on x-axis and residuals on y-axis. Random scatter indicates linearity; curves or patterns suggest non-linearity.",
    lowess_smoother: "Locally Weighted Scatterplot Smoothing. A non-parametric method that fits a smooth curve to data points. In residual plots, should stay near zero if linearity holds.",
    runs_test: "Tests whether residual signs are randomly distributed. A 'run' is a sequence of consecutive same-sign residuals. Too few runs suggests systematic patterns.",
    curvature_test: "Tests whether adding a quadratic (X²) term significantly improves the model. Significant result (p < 0.05) indicates the relationship may be curved, not linear.",
    rainbow_test: "Tests model stability by fitting the model to a subset of data and comparing to the full model. Significant result suggests the model doesn't fit equally well across the range.",
    residual_fitted_correlation: "Correlation between residuals and fitted values. Should be near zero if linearity holds. Non-zero correlation indicates model misspecification.",
    r_squared: "Coefficient of determination. The proportion of variance in the dependent variable explained by the model. R² = 1 - (SS_res / SS_tot). Ranges from 0 to 1.",
    scale_location_plot: "A diagnostic plot showing √|standardized residuals| vs fitted values. Used to check homoscedasticity (constant variance). Horizontal band indicates equal spread.",
    standardized_residual: "Residual divided by its estimated standard deviation: (eᵢ - mean(e)) / sd(e). Values beyond ±2 may indicate outliers.",
    polynomial_regression: "Regression including higher-order terms (X², X³, etc.) to model curved relationships. Consider when linearity assumption is violated.",
    log_transformation: "Taking the natural logarithm of a variable. Often used when relationship is multiplicative or when data shows exponential patterns. log(Y) ~ X linearizes exponential relationships.",
    quadratic_coefficient: "The coefficient on the X² term in a polynomial model. Significant quadratic coefficient indicates curvature in the relationship.",
    f_statistic: "Test statistic comparing model fits. In curvature test, compares linear vs quadratic model. Larger F suggests the additional term improves fit significantly.",
    p_value: "Probability of observing the test result (or more extreme) if the null hypothesis is true. For linearity tests, p > 0.05 typically suggests linearity is acceptable.",
    homoscedasticity: "The assumption that residuals have constant variance across all levels of fitted values. Related to linearity - both are checked via residual plots.",
    specification_error: "Occurs when the model form is incorrect (e.g., using linear when relationship is non-linear). Leads to biased and inconsistent estimates.",
    partial_residual_plot: "Also called component-plus-residual plot. Shows the relationship between one predictor and the response, controlling for other predictors. Helps identify non-linearity in specific variables."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Linearity Check Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in linearity diagnostics
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(linearityMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'linearity_test.py';
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
                        Python Code - Linearity Check
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

interface Insight { type: 'warning' | 'info'; title: string; description: string; }
interface Metrics { residual_fitted_corr: number; residual_fitted_corr_pvalue: number; runs_observed: number; runs_expected: number; runs_z_statistic: number; runs_p_value: number; rainbow_f_statistic: number; rainbow_p_value: number; residual_mean: number; residual_std: number; curvature_f_statistic: number; curvature_p_value: number; quadratic_coef: number; n_observations: number; n_predictors: number; r_squared: number; coefficients: { [key: string]: number }; intercept: number; }
interface ResidualDataItem { index: number; fitted: number; residual: number; std_residual: number; }
interface AnalysisResult { metrics: Metrics; insights: Insight[]; recommendations: string[]; plots: { residual_vs_fitted: string; scale_location: string; residual_histogram: string; component_residual?: { [key: string]: string }; }; residual_data: ResidualDataItem[]; model_summary: { dependent: string; independents: string[]; equation: string; }; error?: string; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const formatPValue = (p: number): string => p < 0.001 ? '< .001' : p.toFixed(4);
const getPValueBadge = (p: number) => {
    if (p < 0.01) return <Badge variant="destructive">p {'<'} .01</Badge>;
    if (p < 0.05) return <Badge variant="destructive">p {'<'} .05</Badge>;
    if (p < 0.1) return <Badge variant="secondary">p {'<'} .1</Badge>;
    return <Badge variant="outline">p ≥ .1</Badge>;
};

// Statistical Summary Cards
const StatisticalSummaryCards = ({ result }: { result: AnalysisResult }) => {
    const hasNonLinearity = result.insights.some(i => i.type === 'warning' && (i.title.toLowerCase().includes('curvature') || i.title.toLowerCase().includes('correlation') || i.title.toLowerCase().includes('pattern')));
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">R-squared</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{result.metrics.r_squared.toFixed(4)}</p><p className="text-xs text-muted-foreground">{result.metrics.r_squared >= 0.7 ? 'Strong' : result.metrics.r_squared >= 0.4 ? 'Moderate' : 'Weak'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Curvature Test</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">F = {result.metrics.curvature_f_statistic.toFixed(2)}</p><p className={`text-xs ${result.metrics.curvature_p_value < 0.05 ? 'text-red-600' : 'text-muted-foreground'}`}>p = {formatPValue(result.metrics.curvature_p_value)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Sample Size</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{result.metrics.n_observations}</p><p className="text-xs text-muted-foreground">{result.metrics.n_predictors} predictor(s)</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Linearity</p>{hasNonLinearity ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-600" />}</div><p className="text-2xl font-semibold">{hasNonLinearity ? 'Issue' : 'OK'}</p><p className="text-xs text-muted-foreground">{hasNonLinearity ? 'Non-linearity detected' : 'Assumption met'}</p></div></CardContent></Card>
        </div>
    );
};


// Linearity Check Analysis Guide Component
const LinearityGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Linearity Check Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Linearity */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <ScatterChart className="w-4 h-4" />
                What is the Linearity Assumption?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The linearity assumption states that the relationship between independent variables (X) and 
                the dependent variable (Y) can be well-approximated by a <strong>straight line</strong>. 
                This is fundamental to linear regression.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>In Simple Terms:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    If linearity holds, your prediction errors (residuals) should scatter randomly 
                    around zero — no curves, no U-shapes, no patterns.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Why It Matters */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Why Linearity Matters
              </h3>
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">If Linearity is Violated:</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Biased estimates:</strong> Coefficients don&apos;t reflect true relationships</li>
                  <li>• <strong>Poor predictions:</strong> Model over/under-predicts systematically</li>
                  <li>• <strong>Invalid inference:</strong> p-values and confidence intervals are wrong</li>
                  <li>• <strong>Misleading R²:</strong> May appear good but model is fundamentally flawed</li>
                </ul>
              </div>
            </div>

            <Separator />

            {/* The Primary Diagnostic: Residual vs Fitted Plot */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                The Primary Diagnostic: Residual vs Fitted Plot
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Linearity OK ✓</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Points scatter <strong>randomly</strong> around zero</li>
                    <li>• No visible curves or patterns</li>
                    <li>• LOWESS smoother stays near the zero line</li>
                    <li>• Approximately equal spread across all fitted values</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-amber-600">Linearity Violated ✗</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>U-shape or ∩-shape:</strong> Quadratic relationship</li>
                    <li>• <strong>S-curve:</strong> Cubic or higher-order relationship</li>
                    <li>• <strong>Funnel shape:</strong> Heteroscedasticity (related issue)</li>
                    <li>• <strong>LOWESS deviates</strong> significantly from zero</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Diagnostic Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Diagnostic Tests Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Curvature Test (RESET-like)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if adding a quadratic term (X²) significantly improves the model.
                    <br/><strong>p ≥ 0.05:</strong> No significant curvature → linearity OK
                    <br/><strong>p &lt; 0.05:</strong> Significant curvature → consider polynomial terms
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Runs Test</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if residual signs (+/-) are randomly distributed.
                    <br/><strong>p ≥ 0.05:</strong> Random pattern → linearity OK
                    <br/><strong>p &lt; 0.05:</strong> Non-random pattern → systematic bias
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Residual-Fitted Correlation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Correlation between residuals and predicted values.
                    <br/><strong>r ≈ 0:</strong> No relationship → linearity OK
                    <br/><strong>|r| &gt; 0.1:</strong> Residuals depend on predictions → model misspecification
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Rainbow Test</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if the model fits equally well across the range of X.
                    <br/><strong>p ≥ 0.05:</strong> Model is stable → linearity OK
                    <br/><strong>p &lt; 0.05:</strong> Model unstable → different relationship in different ranges
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Solutions for Non-Linearity */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Solutions When Linearity is Violated
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">1. Polynomial Terms</p>
                  <p className="text-xs text-muted-foreground">
                    Add X², X³ to capture curves.
                    <br/>Model: Y ~ X + X²
                    <br/><em>Best for: U-shaped relationships</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">2. Log Transformation</p>
                  <p className="text-xs text-muted-foreground">
                    Transform Y or X using natural log.
                    <br/>Model: log(Y) ~ X or Y ~ log(X)
                    <br/><em>Best for: Exponential or multiplicative relationships</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">3. Square Root/Power</p>
                  <p className="text-xs text-muted-foreground">
                    Transform variables with √X or X^0.5.
                    <br/><em>Best for: Count data, moderate non-linearity</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">4. Non-Linear Models</p>
                  <p className="text-xs text-muted-foreground">
                    Use GAM, splines, or non-linear regression.
                    <br/><em>Best for: Complex, unknown functional forms</em>
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpretation Guide */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Quick Interpretation Guide
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">All p &gt; 0.05</Badge>
                  <span className="text-sm text-muted-foreground">Linearity assumption met. Proceed with regression.</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Curvature p &lt; 0.05</Badge>
                  <span className="text-sm text-muted-foreground">Try adding polynomial terms (X²).</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Runs p &lt; 0.05</Badge>
                  <span className="text-sm text-muted-foreground">Check residual plot for patterns. Consider transformations.</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Multiple violations</Badge>
                  <span className="text-sm text-muted-foreground">Serious non-linearity. Consider non-linear models.</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Visual inspection of the residual vs fitted plot 
                is often more informative than statistical tests alone. Tests can be overly sensitive with large 
                samples or miss subtle patterns with small samples. Always combine visual and statistical diagnostics.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite' || d.id === 'linear');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ScatterChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Linearity Check</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Assess the linearity assumption using Residual vs Fitted plots
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <ScatterChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Residual Patterns</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Detect systematic patterns indicating non-linearity
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <LineChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">LOWESS Smoother</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Smooth curve reveals deviations from linearity
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Statistical Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Runs, curvature, and correlation tests
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
                            The linearity assumption states that the relationship between predictors and response is linear. 
                            Violations can lead to biased estimates and poor predictions.
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
                                        <span><strong>Numeric data:</strong> Continuous dependent variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Predictors:</strong> One or more independent variables</span>
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
                                        <span><strong>Linear OK:</strong> Random scatter around zero</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Non-linear:</strong> U-shapes or curved patterns</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Solutions:</strong> Transformation suggestions</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg">
                                <ScatterChart className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface LinearityCheckPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function LinearityCheckPage({ data, numericHeaders, onLoadExample }: LinearityCheckPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVar, setDependentVar] = useState<string>('');
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    const availableIndependents = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Dependent variable selected', passed: !!dependentVar, detail: dependentVar || 'Not selected' });
        checks.push({ label: 'Independent variable(s) selected', passed: independentVars.length > 0, detail: `${independentVars.length} variable(s)` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 20, detail: `n = ${data.length} (recommended: 20+)` });
        checks.push({ label: 'Minimum observations per predictor', passed: data.length >= (independentVars.length + 1) * 10, detail: `${Math.floor(data.length / Math.max(independentVars.length + 1, 1))} per predictor` });
        return checks;
    }, [dependentVar, independentVars, data]);

    const allValidationsPassed = useMemo(() => !!dependentVar && independentVars.length > 0 && data.length >= 10, [dependentVar, independentVars, data]);

    useEffect(() => {
        setDependentVar('');
        setIndependentVars([]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [data, numericHeaders, canRun]);

    const handleIndependentToggle = (varName: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, varName] : prev.filter(v => v !== varName));
    };

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { runAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Linearity_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csvContent = "LINEARITY CHECK SUMMARY\n";
        csvContent += `Dependent,${analysisResult.model_summary.dependent}\nIndependents,${analysisResult.model_summary.independents.join('; ')}\n`;
        csvContent += `R-squared,${analysisResult.metrics.r_squared.toFixed(4)}\nn,${analysisResult.metrics.n_observations}\n\n`;
        csvContent += "DIAGNOSTIC TESTS\n";
        csvContent += Papa.unparse([
            { Test: 'Residual-Fitted Corr', Statistic: analysisResult.metrics.residual_fitted_corr.toFixed(4), PValue: formatPValue(analysisResult.metrics.residual_fitted_corr_pvalue) },
            { Test: 'Runs Test', Statistic: analysisResult.metrics.runs_z_statistic.toFixed(4), PValue: formatPValue(analysisResult.metrics.runs_p_value) },
            { Test: 'Curvature Test', Statistic: analysisResult.metrics.curvature_f_statistic.toFixed(4), PValue: formatPValue(analysisResult.metrics.curvature_p_value) },
            { Test: 'Rainbow Test', Statistic: analysisResult.metrics.rainbow_f_statistic.toFixed(4), PValue: formatPValue(analysisResult.metrics.rainbow_p_value) }
        ]) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Linearity_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/linearity-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    result: analysisResult,
                    dependentVar,
                    independentVars
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Linearity_Check_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, dependentVar, independentVars, toast]);

    const runAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length === 0) {
            toast({ variant: 'destructive', title: 'Please select dependent and independent variables.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/linearity-test`, {
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

    const result = analysisResult;

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
        <h1 className="text-2xl font-bold">Linearity Check</h1>
        <p className="text-muted-foreground mt-1">Assess the linearity assumption</p>
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
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Dependent Variable (Y)</Label>
                                    <Select value={dependentVar} onValueChange={setDependentVar}>
                                        <SelectTrigger className="h-12"><SelectValue placeholder="Select dependent variable" /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The outcome variable to predict</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Independent Variables (X) ({independentVars.length} selected)</Label>
                                    <ScrollArea className="h-40 p-4 border rounded-xl bg-muted/30">
                                        <div className="space-y-2">
                                            {availableIndependents.map(h => (
                                                <div key={h} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                    <Checkbox id={`ind-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIndependentToggle(h, c as boolean)} />
                                                    <Label htmlFor={`ind-${h}`} className="text-sm font-normal cursor-pointer">{h}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    {independentVars.length > 0 && <div className="flex flex-wrap gap-1">{independentVars.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}</div>}
                                </div>
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
                                    <p>• <strong className="text-foreground">Dependent (Y):</strong> {dependentVar}</p>
                                    <p>• <strong className="text-foreground">Independents (X):</strong> {independentVars.join(', ')}</p>
                                    <p>• <strong className="text-foreground">Sample Size:</strong> {data.length} observations</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Diagnostic Tests</h4>
                                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div><strong className="text-foreground">Runs Test:</strong> Tests randomness of residual signs</div>
                                    <div><strong className="text-foreground">Curvature Test:</strong> Detects quadratic patterns</div>
                                    <div><strong className="text-foreground">Rainbow Test:</strong> Tests model stability</div>
                                    <div><strong className="text-foreground">Residual-Fitted Correlation:</strong> Should be near 0</div>
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
                                <ScatterChart className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will fit: {dependentVar} ~ {independentVars.join(' + ')}</p>
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
                {currentStep === 4 && result && (() => {
                    const hasNonLinearity = result.insights.some(i => i.type === 'warning' && (i.title.toLowerCase().includes('curvature') || i.title.toLowerCase().includes('correlation') || i.title.toLowerCase().includes('pattern')));
                    const explainedPct = (result.metrics.r_squared * 100).toFixed(1);
                    const curvaturePPct = (result.metrics.curvature_p_value * 100).toFixed(1);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Linearity Check: {dependentVar} ~ {independentVars.join(' + ')}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${!hasNonLinearity ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${!hasNonLinearity ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasNonLinearity ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {!hasNonLinearity 
                                                ? `The relationship between variables is well explained by a linear form. A linear model is appropriate.`
                                                : `The relationship between variables shows a curved pattern. A straight line is insufficient.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasNonLinearity ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            The model explains <strong>{explainedPct}%</strong> of the variance in the outcome. 
                                            {parseFloat(explainedPct) >= 70 ? ' (Strong explanatory power)' : parseFloat(explainedPct) >= 50 ? ' (Moderate level)' : ' (Room for improvement)'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasNonLinearity ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {!hasNonLinearity 
                                                ? `Prediction errors are randomly distributed, indicating no systematic bias.`
                                                : `Prediction errors show a pattern, suggesting over/under-prediction in certain ranges.`}
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${!hasNonLinearity ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {!hasNonLinearity ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{!hasNonLinearity ? "Linear Model Appropriate!" : "Non-linear Pattern Detected"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {!hasNonLinearity 
                                                    ? "Data follows a linear relationship. Regression results can be trusted." 
                                                    : "Curved pattern detected. Consider adding polynomial terms, log transformation, or non-linear models."}
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
                                        <p>• <strong>R-squared:</strong> {result.metrics.r_squared.toFixed(4)} — Independent variables explain {explainedPct}% of the dependent variable's variance. {parseFloat(explainedPct) >= 50 ? 'Explains more than half, which is good.' : 'Low explanatory power, consider adding more variables.'}</p>
                                        <p>• <strong>Curvature Test:</strong> F = {result.metrics.curvature_f_statistic.toFixed(3)}, p = {formatPValue(result.metrics.curvature_p_value)} — {result.metrics.curvature_p_value >= 0.05 
                                            ? `The probability of curved pattern being random is ${curvaturePPct}%, above 5%, so linearity is assumed.`
                                            : `The probability of curved pattern being random is only ${curvaturePPct}%, indicating significant non-linearity.`}</p>
                                        <p>• <strong>Residual-Fitted Correlation:</strong> r = {result.metrics.residual_fitted_corr.toFixed(4)} — {Math.abs(result.metrics.residual_fitted_corr) < 0.1 
                                            ? 'Close to 0, prediction errors are random (good).' 
                                            : 'Deviates from 0, indicating relationship between predictions and errors (problem).'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Model Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = !hasNonLinearity ? (result.metrics.r_squared >= 0.7 ? 5 : result.metrics.r_squared >= 0.5 ? 4 : 3) : (result.metrics.curvature_p_value > 0.01 ? 2 : 1);
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
                {currentStep === 5 && result && (() => {
                    const hasNonLinearity = result.insights.some(i => i.type === 'warning');
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding linearity diagnostics</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What is Linearity?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                The linearity assumption means the relationship between X and Y can be well-approximated by a straight line. 
                                                Residuals (actual - predicted) should scatter randomly around zero with no patterns.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Residual vs Fitted Plot</h4>
                                            <p className="text-sm text-muted-foreground">
                                                This is the primary diagnostic tool. Random scatter = linearity OK. 
                                                U-shapes, curves, or funnel patterns indicate problems.
                                                The LOWESS smoother (red line) should stay near zero.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Statistical Tests</h4>
                                            <p className="text-sm text-muted-foreground">
                                                <strong>Curvature Test (p = {formatPValue(result.metrics.curvature_p_value)}):</strong> {result.metrics.curvature_p_value < 0.05 ? 'Significant quadratic pattern detected.' : 'No significant curvature.'}<br/>
                                                <strong>Runs Test (p = {formatPValue(result.metrics.runs_p_value)}):</strong> {result.metrics.runs_p_value < 0.05 ? 'Non-random pattern in residuals.' : 'Residuals appear random.'}
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
                                                {!hasNonLinearity 
                                                    ? 'Proceed with linear regression. Check other assumptions (normality, homoscedasticity).' 
                                                    : 'Consider: (1) Adding polynomial terms (X²), (2) Log transformation, (3) Splines or GAMs.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {!hasNonLinearity 
                                            ? `The linear model appears appropriate for predicting ${result.model_summary.dependent}. R² = ${result.metrics.r_squared.toFixed(4)} indicates ${result.metrics.r_squared >= 0.7 ? 'strong' : result.metrics.r_squared >= 0.4 ? 'moderate' : 'weak'} explanatory power.`
                                            : `Evidence suggests non-linear relationship. The model may be improved with polynomial terms or transformations.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />P-value Interpretation</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">p &gt; 0.05</p><p className="text-muted-foreground">Linear OK</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg border-amber-200 border"><p className="font-medium text-amber-600">p ≤ 0.05</p><p className="text-muted-foreground">Non-linear</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && result && (
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Linearity Check Report</h2><p className="text-sm text-muted-foreground mt-1">{result.model_summary.dependent} ~ {result.model_summary.independents.join(' + ')} | n = {result.metrics.n_observations} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards result={result} />
                        
                        {/* APA-style Summary */}
                        <Card>
                            <CardHeader><CardTitle>Statistical Summary</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">APA Format Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Linearity was assessed using residual diagnostics for the model {result.model_summary.dependent} ~ {result.model_summary.independents.join(' + ')} 
                                            (<em>N</em> = {result.metrics.n_observations}). The curvature test yielded 
                                            <em>F</em>({result.metrics.n_predictors}, {result.metrics.n_observations - result.metrics.n_predictors - 2}) = {result.metrics.curvature_f_statistic.toFixed(2)}, 
                                            <em>p</em> = {formatPValue(result.metrics.curvature_p_value)},
                                            {result.metrics.curvature_p_value >= 0.05 ? ' suggesting no significant departure from linearity.' : ' indicating potential non-linearity.'} 
                                            The model explained {(result.metrics.r_squared * 100).toFixed(1)}% of the variance (<em>R</em>² = {result.metrics.r_squared.toFixed(4)}).
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Diagnostic Plots */}
                        <Tabs defaultValue="residual_fitted" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="residual_fitted">Residual vs Fitted</TabsTrigger>
                                <TabsTrigger value="scale_location">Scale-Location</TabsTrigger>
                                <TabsTrigger value="histogram">Distribution</TabsTrigger>
                            </TabsList>
                            <TabsContent value="residual_fitted">
                                <Card><CardHeader><CardTitle className="text-lg">Residual vs Fitted Plot</CardTitle><CardDescription>Look for random scatter around zero</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${result.plots.residual_vs_fitted}`} alt="Residual vs Fitted" className="w-full rounded-md border"/></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="scale_location">
                                <Card><CardHeader><CardTitle className="text-lg">Scale-Location Plot</CardTitle><CardDescription>Check for homoscedasticity</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${result.plots.scale_location}`} alt="Scale-Location" className="w-full rounded-md border"/></CardContent></Card>
                            </TabsContent>
                            <TabsContent value="histogram">
                                <Card><CardHeader><CardTitle className="text-lg">Residual Distribution</CardTitle><CardDescription>Histogram with normal overlay</CardDescription></CardHeader><CardContent><img src={`data:image/png;base64,${result.plots.residual_histogram}`} alt="Residual Histogram" className="w-full rounded-md border"/></CardContent></Card>
                            </TabsContent>
                        </Tabs>

                        {/* Diagnostic Tests Table */}
                        <Card>
                            <CardHeader><CardTitle>Diagnostic Tests</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">P-Value</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell><div><p className="font-medium">Residual-Fitted Correlation</p><p className="text-xs text-muted-foreground">Should be near 0</p></div></TableCell>
                                            <TableCell className="text-right font-mono">r = {result.metrics.residual_fitted_corr.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatPValue(result.metrics.residual_fitted_corr_pvalue)}</TableCell>
                                            <TableCell className="text-right">{getPValueBadge(result.metrics.residual_fitted_corr_pvalue)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell><div><p className="font-medium">Runs Test</p><p className="text-xs text-muted-foreground">Tests randomness</p></div></TableCell>
                                            <TableCell className="text-right font-mono">z = {result.metrics.runs_z_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatPValue(result.metrics.runs_p_value)}</TableCell>
                                            <TableCell className="text-right">{getPValueBadge(result.metrics.runs_p_value)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell><div><p className="font-medium">Curvature Test</p><p className="text-xs text-muted-foreground">Tests quadratic pattern</p></div></TableCell>
                                            <TableCell className="text-right font-mono">F = {result.metrics.curvature_f_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatPValue(result.metrics.curvature_p_value)}</TableCell>
                                            <TableCell className="text-right">{getPValueBadge(result.metrics.curvature_p_value)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell><div><p className="font-medium">Rainbow Test</p><p className="text-xs text-muted-foreground">Tests stability</p></div></TableCell>
                                            <TableCell className="text-right font-mono">F = {result.metrics.rainbow_f_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatPValue(result.metrics.rainbow_p_value)}</TableCell>
                                            <TableCell className="text-right">{getPValueBadge(result.metrics.rainbow_p_value)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Residual Data */}
                        <Card>
                            <CardHeader><CardTitle>Residual Data</CardTitle><CardDescription>First 50 observations</CardDescription></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Index</TableHead><TableHead className="text-right">Fitted</TableHead><TableHead className="text-right">Residual</TableHead><TableHead className="text-right">Std. Residual</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {result.residual_data.slice(0, 50).map((row) => (
                                                <TableRow key={row.index}>
                                                    <TableCell>{row.index}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.fitted.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.residual.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono"><span className={Math.abs(row.std_residual) > 2 ? 'text-red-500 font-bold' : ''}>{row.std_residual.toFixed(4)}</span></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
            
            {/* Modals */}
            <LinearityGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
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
