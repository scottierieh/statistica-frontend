'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { 
    Sigma, BarChart as BarChartIcon, Settings, FileSearch, CheckCircle, 
    AlertTriangle, HelpCircle, Loader2, TrendingUp, Target, BookOpen, 
    Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, 
    FileText, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, 
    ArrowRight, ChevronDown, FileType, Activity, Info, Code, Copy, Waves
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/polynomial_regression.py?alt=media";

// Types
interface RegressionMetrics { r2: number; adj_r2: number; rmse: number; mae: number; mse: number; }
interface CoefficientTests { params: Record<string, number>; pvalues: Record<string, number>; bse: Record<string, number>; tvalues: Record<string, number>; }
interface RegressionDiagnostics { f_statistic?: number; f_pvalue?: number; durbin_watson?: number; vif?: Record<string, number>; coefficient_tests?: CoefficientTests; standardized_coefficients?: CoefficientTests; normality_tests?: { jarque_bera?: { statistic: number; p_value: number }; shapiro_wilk?: { statistic: number; p_value: number }; }; heteroscedasticity_tests?: { breusch_pagan?: { statistic: number; p_value: number }; }; }
interface RegressionResultsData { model_name: string; model_type: string; features: string[]; target?: string; metrics: { all_data: RegressionMetrics }; diagnostics: RegressionDiagnostics; stepwise_log?: string[]; interpretation?: any; n_dropped?: number; }
interface FullAnalysisResponse { results: RegressionResultsData; model_name: string; model_type: string; plot: string; }
type Step = 1 | 2 | 3 | 4 | 5 | 6;
interface ValidationCheck { label: string; passed: boolean; detail: string; severity: 'critical' | 'warning' | 'info'; }

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

// Python Code Modal
const PythonCodeModal = ({ isOpen, onClose, codeUrl, title = "Python Code - Polynomial Regression" }: { isOpen: boolean; onClose: () => void; codeUrl: string; title?: string; }) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { if (isOpen && !code) fetchCode(); }, [isOpen]);

    const fetchCode = async () => {
        setIsLoading(true); setError(null);
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) throw new Error(`Failed: ${response.status}`);
            setCode(await response.text());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load');
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Python code' });
        } finally { setIsLoading(false); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />{title}</DialogTitle>
                    <DialogDescription>View, copy, or download the Python code.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 py-2">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(code); toast({ title: 'Copied!' }); }} disabled={isLoading || !!error}><Copy className="mr-2 h-4 w-4" />Copy</Button>
                    <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([code], { type: 'text/x-python' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'polynomial_regression.py'; link.click(); toast({ title: 'Downloaded!' }); }} disabled={isLoading || !!error}><Download className="mr-2 h-4 w-4" />Download</Button>
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 text-slate-300">Loading...</span></div>
                    : error ? <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg"><AlertTriangle className="h-10 w-10 text-amber-500 mb-3" /><p className="text-slate-300">{error}</p></div>
                    : <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950"><pre className="p-4 text-sm text-slate-50"><code>{code}</code></pre></ScrollArea>}
                </div>
            </DialogContent>
        </Dialog>
    );
};

// APA Interpretation Generator
const generateApaInterpretation = (results: RegressionResultsData, targetVar: string, features: string[], degree: number, n: number) => {
    const r2 = results.metrics.all_data.r2;
    const adjR2 = results.metrics.all_data.adj_r2;
    const fStat = results.diagnostics?.f_statistic;
    const fPValue = results.diagnostics?.f_pvalue ?? 1;
    const isSignificant = fPValue < 0.05;
    const numTerms = results.diagnostics?.coefficient_tests ? Object.keys(results.diagnostics.coefficient_tests.params).length - 1 : degree;
    const df1 = numTerms, df2 = n - numTerms - 1;
    
    let r2Label = r2 >= 0.26 ? 'large' : r2 >= 0.13 ? 'medium' : r2 >= 0.02 ? 'small' : 'negligible';
    const formatP = (p: number) => p < 0.001 ? '< .001' : `= ${p.toFixed(3).replace(/^0/, '')}`;
    
    let overall = `A polynomial regression of degree ${degree} was conducted to model the relationship between <strong>${features.join(', ')}</strong> and <strong>${targetVar}</strong> using <em>N</em> = ${n} observations. `;
    overall += `This approach allows for capturing non-linear (curved) relationships in the data. `;
    
    if (isSignificant) {
        overall += `The polynomial model was statistically significant, <em>F</em>(${df1}, ${df2}) = ${fStat?.toFixed(2)}, <em>p</em> ${formatP(fPValue)}, <em>R</em>² = ${r2.toFixed(3)}, adjusted <em>R</em>² = ${adjR2.toFixed(3)}. `;
        overall += `The model explained ${(r2 * 100).toFixed(1)}% of the variance in ${targetVar}, representing a ${r2Label} effect size. `;
        overall += `The polynomial terms successfully captured the non-linear pattern in the data.`;
    } else {
        overall += `The polynomial model was not statistically significant, <em>F</em>(${df1}, ${df2}) = ${fStat?.toFixed(2)}, <em>p</em> ${formatP(fPValue)}. `;
        overall += `The polynomial relationship did not significantly predict ${targetVar}. Consider a simpler linear model or different predictors.`;
    }
    
    const insights: string[] = [
        `<strong>Model:</strong> Polynomial degree ${degree} with <em>p</em> ${formatP(fPValue)}. ${fPValue < 0.05 ? 'Significant non-linear fit.' : 'Not significant.'}`,
        `<strong>R²:</strong> ${r2.toFixed(3)} (${(r2 * 100).toFixed(1)}%) — ${r2Label} effect.`,
        `<strong>Adjusted R²:</strong> ${adjR2.toFixed(3)}. Shrinkage: ${((r2 - adjR2) * 100).toFixed(1)}%.${(r2 - adjR2) > 0.1 ? ' ⚠️ High shrinkage suggests overfitting.' : ''}`,
        `<strong>RMSE:</strong> ${results.metrics.all_data.rmse.toFixed(3)} average prediction error.`,
        `<strong>Polynomial Terms:</strong> ${numTerms} terms (including squared${degree >= 3 ? ', cubic' : ''}${degree >= 4 ? ', etc.' : ''} terms).`,
    ];
    
    // Overfitting warning
    if (r2 - adjR2 > 0.1) {
        insights.push(`<strong>⚠️ Overfitting Warning:</strong> Large gap between R² and Adjusted R². Consider reducing polynomial degree.`);
    }
    
    return { overall_analysis: overall, statistical_insights: insights };
};

// Utility Functions
const getSignificanceStars = (p?: number) => !p ? '' : p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '';
const getR2Interpretation = (r2: number) => r2 >= 0.75 ? { label: 'Excellent', desc: 'strong power', stars: 5 } : r2 >= 0.50 ? { label: 'Good', desc: 'substantial', stars: 4 } : r2 >= 0.25 ? { label: 'Moderate', desc: 'moderate', stars: 3 } : r2 >= 0.10 ? { label: 'Weak', desc: 'limited', stars: 2 } : { label: 'Very Weak', desc: 'minimal', stars: 1 };
const formatPValue = (p?: number) => p === undefined ? 'N/A' : p < 0.001 ? '<.001' : p.toFixed(4);
const formatCoef = (v: number) => Math.abs(v) >= 1000 || (Math.abs(v) < 0.001 && v !== 0) ? v.toExponential(3) : v.toFixed(4);

// Reusable Components
const StarRating = ({ value, max = 5 }: { value: number; max?: number }) => <div className="flex gap-0.5">{Array.from({ length: max }, (_, i) => <span key={i} className={`text-lg ${i < value ? 'text-amber-400' : 'text-muted-foreground/30'}`}>★</span>)}</div>;
const MetricCard = ({ label, value, subtitle, icon: Icon, highlight, warning }: { label: string; value: string | number; subtitle?: string; icon: React.ElementType; highlight?: boolean; warning?: boolean }) => (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${warning ? 'text-amber-600' : ''}`}>{value}</p>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div></CardContent></Card>
);
const ValidationCheckItem = ({ check }: { check: ValidationCheck }) => {
    const bg = check.passed ? 'bg-primary/5' : check.severity === 'critical' ? 'bg-destructive/10' : 'bg-amber-50/50 dark:bg-amber-950/20';
    const icon = check.passed ? 'text-primary' : check.severity === 'critical' ? 'text-destructive' : 'text-amber-600';
    const text = check.passed ? 'text-foreground' : check.severity === 'critical' ? 'text-destructive' : 'text-amber-700';
    return <div className={`flex items-start gap-4 p-4 rounded-xl ${bg}`}>{check.passed ? <CheckCircle2 className={`w-5 h-5 ${icon} shrink-0 mt-0.5`} /> : <AlertTriangle className={`w-5 h-5 ${icon} shrink-0 mt-0.5`} />}<div><p className={`font-medium text-sm ${text}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div></div>;
};
const ProgressBar = ({ currentStep, maxReachedStep, hasResults, onStepClick }: { currentStep: Step; maxReachedStep: Step; hasResults: boolean; onStepClick: (s: Step) => void }) => (
    <div className="w-full mb-8"><div className="flex items-center justify-between">{STEPS.map(step => {
        const done = step.id < currentStep || (step.id >= 4 && hasResults), curr = step.id === currentStep, click = step.id <= maxReachedStep || (step.id >= 4 && hasResults);
        return <button key={step.id} onClick={() => click && onStepClick(step.id)} disabled={!click} className={`flex flex-col items-center gap-2 flex-1 ${click ? 'cursor-pointer' : 'cursor-not-allowed'}`}><div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${curr ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : done ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>{done && !curr ? <Check className="w-5 h-5" /> : step.id}</div><span className={`text-xs font-medium ${curr ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span></button>;
    })}</div></div>
);


// Statistical Terms Glossary for Polynomial Regression
const polynomialMetricDefinitions: Record<string, string> = {
  polynomial_regression: "Regression that models curved (non-linear) relationships by adding polynomial terms (X², X³, etc.). Extends linear regression to capture U-shapes, S-curves, and other non-linear patterns.",
  polynomial_degree: "The highest power of X in the model. Degree 2 = quadratic (X²), Degree 3 = cubic (X³), etc. Higher degree = more flexible curve, but higher risk of overfitting.",
  quadratic: "Polynomial of degree 2 (Y = β₀ + β₁X + β₂X²). Creates a parabola — either U-shaped or inverted U. Good for modeling diminishing returns or optimal points.",
  cubic: "Polynomial of degree 3 (Y = β₀ + β₁X + β₂X² + β₃X³). Creates an S-curve with one inflection point where the curve changes direction. Good for growth curves.",
  inflection_point: "The point where a curve changes from concave up to concave down (or vice versa). Cubic and higher polynomials can have inflection points.",
  turning_point: "A local maximum or minimum in the curve — where the slope equals zero and the trend reverses. A degree-n polynomial can have up to n-1 turning points.",
  r_squared: "Coefficient of determination. Proportion of variance explained. Always increases with higher polynomial degree, which can be misleading.",
  adjusted_r_squared: "R² adjusted for model complexity. Penalizes adding polynomial terms that don't improve fit. Use this to compare different degrees — choose the degree where Adj R² peaks.",
  overfitting: "When a model captures noise instead of the true pattern. High-degree polynomials can 'connect the dots' perfectly on training data but fail on new data. Signs: large gap between R² and Adj R².",
  shrinkage: "The difference between R² and Adjusted R². Large shrinkage (>10%) indicates overfitting. The model explains less variance than R² suggests.",
  coefficient: "The estimated effect of each polynomial term. In polynomial regression, individual coefficients are hard to interpret — focus on the overall curve shape instead.",
  polynomial_term: "Each power of X in the model: X (linear), X² (quadratic), X³ (cubic), etc. Together they define the curve shape.",
  f_statistic: "Tests if the polynomial model is significant overall — whether any polynomial terms have a non-zero effect. Significant F means the curved relationship is real.",
  rmse: "Root Mean Square Error. Average prediction error in original units. Lower = better fit. Compare RMSE across different polynomial degrees.",
  extrapolation: "Predicting beyond the range of observed data. Polynomial models are especially unreliable for extrapolation — curves can shoot off dramatically outside the data range.",
  parsimony: "The principle of choosing the simplest adequate model. Start with degree 2; only increase if there's clear evidence of more complex curvature.",
  diminishing_returns: "A pattern where additional X produces smaller and smaller increases in Y. Classic example of quadratic relationship (inverted U).",
  growth_curve: "An S-shaped pattern common in biology and economics. Slow start, rapid growth, then leveling off. Typically modeled with cubic or logistic functions.",
  residual_plot: "Plot of residuals vs. fitted values. For polynomial regression, look for patterns — if you see a curve in residuals, the polynomial degree may be too low.",
  model_comparison: "Comparing polynomial models of different degrees. Use Adjusted R², AIC, or BIC. The best degree balances fit and complexity.",
  basis_functions: "The polynomial terms (1, X, X², X³...) that form the building blocks of the model. Linear regression with polynomial basis functions = polynomial regression."
};

// Glossary Modal Component  
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Polynomial Regression Glossary
                  </DialogTitle>
                  <DialogDescription>
                      Definitions of statistical terms used in polynomial regression analysis
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                      {Object.entries(polynomialMetricDefinitions).map(([term, definition]) => (
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

const PolynomialRegressionGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Polynomial Regression Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Polynomial Regression */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Polynomial Regression?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Polynomial regression extends linear regression to capture <strong>curved (non-linear) relationships</strong>. 
                Instead of fitting a straight line, it fits a curve by adding squared, cubed, or higher-power terms.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The equation:</strong><br/>
                  <span className="font-mono text-xs">
                    Degree 2: Y = β₀ + β₁X + β₂X² + ε (parabola)<br/>
                    Degree 3: Y = β₀ + β₁X + β₂X² + β₃X³ + ε (S-curve)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Polynomial Regression?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Data shows a <strong>curved pattern</strong> (not straight line)</li>
                    <li>• You observe <strong>diminishing returns</strong> (more X → less additional Y)</li>
                    <li>• There's an <strong>optimal point</strong> (U-shape or inverted U)</li>
                    <li>• <strong>Growth curves</strong> that level off or accelerate</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Don't use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• A straight line fits well (use simple regression)</li>
                    <li>• Sample size is small (high risk of overfitting)</li>
                    <li>• You need to extrapolate beyond data range</li>
                    <li>• The relationship is truly linear</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Degree */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4" />
                Understanding Polynomial Degree
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Degree 2 (Quadratic)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Shape:</strong> Parabola (U or inverted U)<br/>
                    <strong>Use for:</strong> Diminishing returns, optimal points, single peak/valley<br/>
                    <strong>Example:</strong> Happiness vs. income (increases then plateaus)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Degree 3 (Cubic)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Shape:</strong> S-curve with one inflection point<br/>
                    <strong>Use for:</strong> Growth curves, learning curves, saturation<br/>
                    <strong>Example:</strong> Skill acquisition over practice time
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Degree 4+ (Higher Order)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Shape:</strong> More complex curves with multiple turning points<br/>
                    <strong>Warning:</strong> High risk of overfitting!<br/>
                    <strong>Rule:</strong> Rarely needed in practice. Start with degree 2.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Golden Rule:</strong> Start with the simplest model (degree 2). 
                    Only increase degree if there's clear evidence of a more complex pattern 
                    and you have enough data (10+ observations per polynomial term).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChartIcon className="w-4 h-4" />
                Key Metrics to Watch
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">R² vs Adjusted R² — Overfitting Check</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Key insight:</strong> R² always increases with higher degree, but Adj R² penalizes complexity.<br/>
                    <strong>Healthy gap:</strong> R² - Adj R² &lt; 0.05 (5%)<br/>
                    <strong>Warning sign:</strong> R² - Adj R² &gt; 0.10 suggests overfitting — reduce degree!
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Coefficient Significance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check if higher-order terms (X², X³) are significant (p &lt; 0.05).<br/>
                    <strong>If X² is not significant:</strong> Linear model may be sufficient.<br/>
                    <strong>If X³ is not significant but X² is:</strong> Use quadratic (degree 2).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Visual Inspection</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Always look at the fitted curve plot! The curve should follow the data pattern 
                    without excessive wiggling. If the curve oscillates wildly, reduce the degree.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Overfitting */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Understanding Overfitting
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">What is Overfitting?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a model captures noise (random fluctuations) instead of the true pattern.
                    High-degree polynomials can "connect the dots" perfectly but fail on new data.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Signs of Overfitting</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Large gap between R² and Adjusted R²</li>
                    <li>• Curve oscillates wildly between data points</li>
                    <li>• Extreme predictions outside the data range</li>
                    <li>• Very large coefficient values</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">How to Avoid</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Start with low degree, increase only if needed</li>
                    <li>• Ensure 10+ observations per polynomial term</li>
                    <li>• Compare models using Adjusted R² (not R²)</li>
                    <li>• Visually inspect the fitted curve</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Real-World Examples */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Real-World Examples
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Economics</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Cost vs. production (economies of scale)</li>
                    <li>• Price vs. demand (quadratic demand curve)</li>
                    <li>• Utility vs. consumption (diminishing returns)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Biology/Medicine</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Dose-response curves</li>
                    <li>• Growth curves (population, tumor)</li>
                    <li>• Age vs. physical performance</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Psychology</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Yerkes-Dodson law (arousal vs. performance)</li>
                    <li>• Learning curves</li>
                    <li>• Satisfaction vs. choice options</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Engineering</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Temperature vs. material strength</li>
                    <li>• Speed vs. fuel efficiency</li>
                    <li>• Load vs. deflection</li>
                  </ul>
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
                  <p className="font-medium text-sm text-primary mb-1">Model Selection</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Plot data first — does it look curved?</li>
                    <li>• Start with degree 2</li>
                    <li>• Compare using Adjusted R²</li>
                    <li>• Check if higher terms are significant</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Sample Size</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Degree 2: need 30+ observations</li>
                    <li>• Degree 3: need 40+ observations</li>
                    <li>• Higher: need much more data</li>
                    <li>• Rule: 10 observations per term</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Focus on the overall curve shape</li>
                    <li>• Individual coefficients hard to interpret</li>
                    <li>• Find turning points (where slope = 0)</li>
                    <li>• Don't extrapolate beyond data range</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Specify polynomial degree used</li>
                    <li>• Report R², Adjusted R², F-test</li>
                    <li>• Show the fitted curve visually</li>
                    <li>• Justify why polynomial over linear</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Polynomial regression is a powerful tool for curved 
                relationships, but simplicity is key. A well-fitting quadratic (degree 2) is usually better than an 
                overfitted higher-degree polynomial. Always visualize your results and validate with domain knowledge.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Waves className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="text-3xl">Polynomial Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Capture curved relationships — when straight lines don't fit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Waves className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Curved Patterns</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Model U-shapes, S-curves, and complex trends</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Flexible Fit</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Adjust degree to match data complexity</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Better Predictions</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Often outperforms linear models</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use when your data shows curved patterns. Example: Diminishing returns, growth curves, seasonal trends.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4><ul className="space-y-2 text-sm text-muted-foreground"><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Numeric variables:</strong> Both X and Y must be numeric</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Curved pattern:</strong> Data should show non-linear trend</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Sample size:</strong> 10+ observations per polynomial term</span></li></ul></div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />What You'll Learn</h4><ul className="space-y-2 text-sm text-muted-foreground"><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Curve shape:</strong> Is it U-shaped, inverted U, etc.?</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Turning points:</strong> Where does the trend change?</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Fit improvement:</strong> How much better than linear?</span></li></ul></div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Waves className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

// Main Component
interface Props { data: DataSet; numericHeaders: string[]; onLoadExample: (e: ExampleDataSet) => void; }

export default function PolynomialRegressionPage({ data, numericHeaders, onLoadExample }: Props) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetVar, setTargetVar] = useState('');
    const [featureVars, setFeatureVars] = useState<string[]>([]);
    const [degree, setDegree] = useState(2);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonModalOpen, setPythonModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== targetVar), [numericHeaders, targetVar]);

    const dataValidation = useMemo((): ValidationCheck[] => {
        const checks: ValidationCheck[] = [];
        checks.push({ label: 'Target selected', passed: targetVar !== '', detail: targetVar ? `Target: ${targetVar}` : 'Select target', severity: 'critical' });
        checks.push({ label: 'Features selected', passed: featureVars.length >= 1, detail: featureVars.length >= 1 ? `${featureVars.length} feature(s)` : 'Select at least 1', severity: 'critical' });
        
        const numTerms = degree * featureVars.length + (featureVars.length > 1 ? Math.pow(featureVars.length, 2) : 0);
        const ratio = Math.floor(data.length / Math.max(numTerms, 1));
        checks.push({ label: 'Sample size', passed: data.length >= 30, detail: `n = ${data.length} (30+ recommended)`, severity: data.length >= 20 ? 'warning' : 'critical' });
        checks.push({ label: 'Obs per term', passed: ratio >= 10, detail: `~${ratio} per polynomial term (10+ rec)`, severity: ratio >= 5 ? 'warning' : 'critical' });
        
        // Overfitting warning for high degree
        if (degree >= 4) {
            checks.push({ label: 'Overfitting risk', passed: data.length >= degree * 20, detail: `Degree ${degree} may overfit with n=${data.length}`, severity: 'warning' });
        }
        
        const allVars = [targetVar, ...featureVars].filter(v => v);
        if (allVars.length > 0) { const missing = data.filter((row: any) => allVars.some(v => row[v] == null || row[v] === '' || (typeof row[v] === 'number' && isNaN(row[v])))).length; checks.push({ label: 'Missing values', passed: missing === 0, detail: missing === 0 ? 'None detected' : `${missing} rows excluded`, severity: 'info' }); }
        return checks;
    }, [data, targetVar, featureVars, degree]);

    const allCriticalPassed = dataValidation.filter(c => c.severity === 'critical').every(c => c.passed);

    useEffect(() => { if (numericHeaders.length > 0) { const t = numericHeaders[numericHeaders.length - 1]; if (!targetVar) setTargetVar(t); const f = numericHeaders.filter(h => h !== t); if (featureVars.length === 0 && f.length > 0) setFeatureVars([f[0]]); } }, [numericHeaders]);
    useEffect(() => { if (data.length === 0) setView('intro'); else if (canRun) { setView('main'); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1); } }, [data, numericHeaders, canRun]);

    const goToStep = useCallback((s: Step) => { setCurrentStep(s); setMaxReachedStep(p => Math.max(p, s) as Step); }, []);
    const nextStep = useCallback(() => { if (currentStep < 6) goToStep((currentStep + 1) as Step); }, [currentStep, goToStep]);
    const prevStep = useCallback(() => { if (currentStep > 1) goToStep((currentStep - 1) as Step); }, [currentStep, goToStep]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results' }); return; }
        setIsDownloading(true); toast({ title: "Generating..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' }); const link = document.createElement('a'); link.download = `Polynomial_Regression_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Done" }); }
        catch { toast({ variant: 'destructive', title: "Failed" }); } finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const r = analysisResult.results, m = r.metrics.all_data;
        let csv = `POLYNOMIAL REGRESSION (Degree ${degree})\nTarget: ${targetVar}\nFeatures: ${featureVars.join(', ')}\n\nMETRICS\n` + Papa.unparse([{ Metric: 'R²', Value: m.r2 }, { Metric: 'Adj R²', Value: m.adj_r2 }, { Metric: 'RMSE', Value: m.rmse }, { Metric: 'MAE', Value: m.mae }, { Metric: 'F p-value', Value: r.diagnostics?.f_pvalue }]) + '\n\n';
        if (r.diagnostics?.coefficient_tests) csv += 'COEFFICIENTS\n' + Papa.unparse(Object.entries(r.diagnostics.coefficient_tests.params).map(([k, v]) => ({ Term: k, B: v, SE: r.diagnostics!.coefficient_tests!.bse?.[k], t: r.diagnostics!.coefficient_tests!.tvalues?.[k], p: r.diagnostics!.coefficient_tests!.pvalues?.[k] }))) + '\n';
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `Polynomial_Regression_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: 'Downloaded' });
    }, [analysisResult, targetVar, featureVars, degree, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating..." });
        try { const res = await fetch('/api/export/regression-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results: analysisResult.results, targetVar, features: featureVars, modelType: 'polynomial', degree, sampleSize: data.length }) }); if (!res.ok) throw new Error(); const link = document.createElement('a'); link.href = URL.createObjectURL(await res.blob()); link.download = `Polynomial_Regression_${new Date().toISOString().split('T')[0]}.docx`; link.click(); toast({ title: "Done" }); }
        catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetVar, featureVars, degree, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetVar || featureVars.length < 1) { toast({ variant: 'destructive', title: 'Select variables' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/regression`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, targetVar, features: featureVars, modelType: 'polynomial', degree, selectionMethod: 'none', test_size: 0 }) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.error || `HTTP ${res.status}`); }
            const result: FullAnalysisResponse = await res.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result); goToStep(4); toast({ title: 'Complete' });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetVar, featureVars, degree, toast, goToStep]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult?.results;

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <PolynomialRegressionGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />            
            <PythonCodeModal isOpen={pythonModalOpen} onClose={() => setPythonModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />


            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Polynomial Regression</h1>
                    <p className="text-muted-foreground mt-1">Model curved relationships</p>
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
            <ProgressBar currentStep={currentStep} maxReachedStep={maxReachedStep} hasResults={!!results} onStepClick={goToStep} />

            
            <div className="min-h-[500px]">
                {/* Step 1 */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose target and predictors</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label>Target Variable (Y)</Label><Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Variable to predict</p></div>
                            <div className="space-y-3"><Label>Feature Variables (X)</Label><ScrollArea className="h-48 border rounded-xl p-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{availableFeatures.map(h => <div key={h} className="flex items-center space-x-2"><Checkbox id={`f-${h}`} checked={featureVars.includes(h)} onCheckedChange={(c) => setFeatureVars(p => c ? [...p, h] : p.filter(v => v !== h))} /><label htmlFor={`f-${h}`} className="text-sm cursor-pointer">{h}</label></div>)}</div></ScrollArea><p className="text-xs text-muted-foreground">{featureVars.length} selected</p></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                            {targetVar && featureVars.length > 0 && <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Preview</h4><p className="text-sm font-mono text-muted-foreground">{targetVar} = β₀ + β₁×{featureVars[0]} + β₂×{featureVars[0]}² + ... + ε</p></div>}
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!targetVar || featureVars.length < 1}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure polynomial degree</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <Label>Polynomial Degree: <span className="font-bold text-primary">{degree}</span></Label>
                                <Slider value={[degree]} onValueChange={(v) => setDegree(v[0])} min={2} max={5} step={1} className="w-full max-w-md" />
                                <div className="flex justify-between text-xs text-muted-foreground max-w-md">
                                    <span>2 (Quadratic)</span>
                                    <span>3 (Cubic)</span>
                                    <span>4</span>
                                    <span>5</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {degree === 2 ? 'Quadratic: Models U-shaped or inverted U patterns' : 
                                     degree === 3 ? 'Cubic: Models S-curves with one inflection point' :
                                     degree === 4 ? 'Quartic: More complex curves, watch for overfitting' :
                                     'Quintic: Very complex, high risk of overfitting'}
                                </p>
                            </div>
                            
                            <div className="p-5 bg-muted/50 rounded-xl space-y-4"><h4 className="font-medium text-sm">Configuration</h4><div className="grid md:grid-cols-2 gap-4 text-sm"><div className="space-y-2"><p className="text-muted-foreground"><strong className="text-foreground">Target:</strong> {targetVar}</p><p className="text-muted-foreground"><strong className="text-foreground">Features:</strong> {featureVars.join(', ')}</p></div><div className="space-y-2"><p className="text-muted-foreground"><strong className="text-foreground">Degree:</strong> {degree}</p><p className="text-muted-foreground"><strong className="text-foreground">Sample:</strong> {data.length}</p></div></div></div>
                            
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-sky-600" />Understanding Polynomial Degree</h4><ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• <strong>Degree 2:</strong> y = ax² + bx + c — parabola (one bend)</li>
                                <li>• <strong>Degree 3:</strong> y = ax³ + bx² + cx + d — S-curve (two bends)</li>
                                <li>• <strong>Higher degrees:</strong> More flexible but risk overfitting</li>
                                <li>• <strong>Rule of thumb:</strong> Start with degree 2, increase only if needed</li>
                            </ul></div>
                            
                            {degree >= 4 && <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-xl"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" /><p className="text-sm text-amber-700 dark:text-amber-300">High degree ({degree}) may lead to overfitting. Ensure you have enough data.</p></div></div>}
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking data readiness</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{dataValidation.map((c, i) => <ValidationCheckItem key={i} check={c} />)}</div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Waves className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Polynomial regression (degree {degree}) with OLS will be performed.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={!allCriticalPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (() => {
                    const r2 = results.metrics.all_data.r2, adjR2 = results.metrics.all_data.adj_r2, r2I = getR2Interpretation(r2);
                    const fP = results.diagnostics?.f_pvalue ?? 1, isSig = fP < 0.05;
                    const shrinkage = r2 - adjR2;
                    const hasOverfitting = shrinkage > 0.1;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Polynomial fit for {targetVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isSig && r2 >= 0.25 && !hasOverfitting ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : isSig ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700' : 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isSig && r2 >= 0.25 ? 'text-primary' : isSig ? 'text-amber-600' : 'text-destructive'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><Waves className={`w-5 h-5 shrink-0 mt-0.5 ${isSig ? 'text-primary' : 'text-muted-foreground'}`} /><p className="text-sm">Polynomial degree <strong>{degree}</strong> model {isSig ? 'successfully captures' : 'does not capture'} the curved relationship.</p></div>
                                        <div className="flex items-start gap-3"><Target className={`w-5 h-5 shrink-0 mt-0.5 ${r2 >= 0.25 ? 'text-primary' : 'text-muted-foreground'}`} /><p className="text-sm">Model explains <strong>{(r2 * 100).toFixed(1)}%</strong> (Adj: {(adjR2 * 100).toFixed(1)}%) of variance.{r2 >= 0.50 ? ' Substantial.' : r2 >= 0.25 ? ' Moderate.' : ' Limited.'}</p></div>
                                        <div className="flex items-start gap-3"><Sigma className={`w-5 h-5 shrink-0 mt-0.5 ${isSig ? 'text-primary' : 'text-destructive'}`} /><p className="text-sm">{isSig ? <><strong>Significant</strong> (p {formatPValue(fP)})</> : <><strong>NOT significant</strong> (p = {fP.toFixed(4)})</>}</p></div>
                                        {hasOverfitting && <div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" /><p className="text-sm text-amber-700 dark:text-amber-300">⚠️ Large R² shrinkage ({(shrinkage * 100).toFixed(1)}%) suggests overfitting. Consider lower degree.</p></div>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isSig && r2 >= 0.25 && !hasOverfitting ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">{isSig && r2 >= 0.25 && !hasOverfitting ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Info className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{isSig && r2 >= 0.50 && !hasOverfitting ? 'Strong Curved Fit!' : isSig && r2 >= 0.25 ? 'Moderate Curved Fit' : isSig ? 'Weak but Significant' : 'Linear May Be Better'}</p><p className="text-sm text-muted-foreground mt-1">{isSig && !hasOverfitting ? 'Polynomial captures the curve well.' : hasOverfitting ? 'Try reducing polynomial degree.' : 'Consider simpler linear model.'}</p></div></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricCard label="R²" value={`${(r2 * 100).toFixed(0)}%`} subtitle={r2I.label} icon={Target} highlight={r2 >= 0.25} />
                                    <MetricCard label="Adj R²" value={`${(adjR2 * 100).toFixed(0)}%`} subtitle={hasOverfitting ? '⚠️ Shrinkage' : 'OK'} icon={TrendingUp} warning={hasOverfitting} />
                                    <MetricCard label="Error" value={`±${results.metrics.all_data.rmse.toFixed(2)}`} subtitle="RMSE" icon={Activity} />
                                    <MetricCard label="p-value" value={formatPValue(fP)} subtitle={isSig ? 'Significant' : 'Not sig'} icon={Sigma} warning={!isSig} />
                                </div>
                                <div className="flex items-center justify-center gap-2 py-2"><span className="text-sm text-muted-foreground">Quality:</span><StarRating value={isSig && !hasOverfitting ? r2I.stars : Math.max(1, r2I.stars - 1)} /></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (() => {
                    const r2 = results.metrics.all_data.r2, adjR2 = results.metrics.all_data.adj_r2;
                    const fP = results.diagnostics?.f_pvalue ?? 1, isSig = fP < 0.05;
                    const shrinkage = r2 - adjR2;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding polynomial regression</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What Polynomial Regression Does</h4><p className="text-sm text-muted-foreground">Fits a curved line (degree {degree}) to capture non-linear patterns. Unlike simple regression which fits a straight line, polynomial regression can model U-shapes, S-curves, and more complex patterns.</p></div></div></div>
                                
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Why Degree {degree}?</h4><p className="text-sm text-muted-foreground">
                                    {degree === 2 ? 'Quadratic (degree 2) models one curve — either U-shaped or inverted U. Best for diminishing returns or optimal points.' : 
                                     degree === 3 ? 'Cubic (degree 3) allows for an inflection point where the curve changes direction. Good for S-shaped growth.' :
                                     `Degree ${degree} can model ${degree - 1} turning points. More flexible but higher risk of overfitting.`}
                                </p></div></div></div>
                                
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">R² = {(r2 * 100).toFixed(0)}% vs Adj R² = {(adjR2 * 100).toFixed(0)}%</h4><p className="text-sm text-muted-foreground">The polynomial explains <strong className="text-foreground">{(r2 * 100).toFixed(0)}%</strong> of variance. The {(shrinkage * 100).toFixed(1)}% shrinkage {shrinkage > 0.1 ? '⚠️ is large — the model may be overfitting (capturing noise rather than signal).' : 'is acceptable — the model generalizes well.'}</p></div></div></div>
                                
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Statistical Significance</h4><p className="text-sm text-muted-foreground">{isSig ? <>F-test p = {formatPValue(fP)} &lt; 0.05: The curved relationship is <strong className="text-foreground">real</strong>, not due to chance.</> : <>p = {fP.toFixed(4)} &gt; 0.05. The polynomial fit is <strong className="text-foreground">not significant</strong>. A simpler model may be better.</>}</p></div></div></div>
                                
                                <div className={`rounded-xl p-5 border ${isSig && r2 >= 0.25 && shrinkage <= 0.1 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isSig && r2 >= 0.25 && shrinkage <= 0.1 ? <><CheckCircle2 className="w-5 h-5 text-primary" />Good Polynomial Fit</> : <><Info className="w-5 h-5 text-amber-600" />Consider Alternatives</>}</h4><p className="text-sm text-muted-foreground">{isSig && shrinkage <= 0.1 ? 'The polynomial captures the curve without overfitting.' : shrinkage > 0.1 ? `High shrinkage suggests overfitting. Try degree ${Math.max(2, degree - 1)}.` : 'Consider whether a simple linear model might suffice.'}</p></div>
                                
                                <div className="bg-muted/20 rounded-xl p-4"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Polynomial Degree Guide</h4><div className="grid grid-cols-4 gap-2 text-xs"><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">2</p><p className="text-muted-foreground">U-shape</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">3</p><p className="text-muted-foreground">S-curve</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">4-5</p><p className="text-muted-foreground">Complex</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;5</p><p className="text-muted-foreground">⚠️ Risky</p></div></div></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setPythonModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                        </div>

                        <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Polynomial Regression Report</h2><p className="text-sm text-muted-foreground mt-1">{targetVar} ~ poly({featureVars.join(', ')}, {degree}) | n = {data.length} | {new Date().toLocaleDateString()}</p></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <MetricCard label="R²" value={results.metrics.all_data.r2.toFixed(4)} subtitle={getR2Interpretation(results.metrics.all_data.r2).label} icon={Target} />
                                <MetricCard label="Adj R²" value={results.metrics.all_data.adj_r2.toFixed(4)} subtitle="Penalized" icon={TrendingUp} />
                                <MetricCard label="RMSE" value={results.metrics.all_data.rmse.toFixed(4)} subtitle="Error" icon={BarChartIcon} />
                                <MetricCard label="F p-value" value={formatPValue(results.diagnostics?.f_pvalue)} subtitle={results.diagnostics?.f_pvalue && results.diagnostics.f_pvalue < 0.05 ? 'Sig' : 'Not sig'} icon={Sigma} warning={results.diagnostics?.f_pvalue ? results.diagnostics.f_pvalue >= 0.05 : false} />
                            </div>

                            {/* APA Summary */}
                            {(() => { const apa = generateApaInterpretation(results, targetVar, featureVars, degree, data.length); return (
                                <Card><CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader><CardContent className="space-y-6">
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700"><div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">APA Format Summary</h3></div><div className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: apa.overall_analysis }} /></div>
                                    <div className="space-y-3"><h4 className="font-medium text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />Statistical Insights</h4><div className="grid gap-2">{apa.statistical_insights.map((ins, i) => <div key={i} className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg" dangerouslySetInnerHTML={{ __html: ins }} />)}</div></div>
                                </CardContent></Card>
                            ); })()}

                            {analysisResult?.plot && <Card><CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader><CardContent><Image src={analysisResult.plot} alt="Diagnostics" width={1200} height={1000} className="w-full rounded-md border" /></CardContent></Card>}

                            <Card><CardHeader><CardTitle>Model Performance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">R²</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.r2.toFixed(4)}</TableCell><TableCell className="text-right">{getR2Interpretation(results.metrics.all_data.r2).desc}</TableCell></TableRow><TableRow><TableCell className="font-medium">Adj R²</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.adj_r2.toFixed(4)}</TableCell><TableCell className="text-right">Penalized for {degree > 2 ? 'high' : ''} complexity</TableCell></TableRow><TableRow><TableCell className="font-medium">RMSE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.rmse.toFixed(4)}</TableCell><TableCell className="text-right">Avg error</TableCell></TableRow><TableRow><TableCell className="font-medium">MAE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.mae.toFixed(4)}</TableCell><TableCell className="text-right">Mean abs error</TableCell></TableRow><TableRow><TableCell className="font-medium">F-stat</TableCell><TableCell className="text-right font-mono">{results.diagnostics?.f_statistic?.toFixed(4) ?? 'N/A'}</TableCell><TableCell className="text-right">Model test</TableCell></TableRow><TableRow><TableCell className="font-medium">F p-value</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics?.f_pvalue)}</TableCell><TableCell className="text-right">{results.diagnostics?.f_pvalue && results.diagnostics.f_pvalue < 0.05 ? '✓ Sig' : '✗ Not sig'}</TableCell></TableRow><TableRow><TableCell className="font-medium">Degree</TableCell><TableCell className="text-right font-mono">{degree}</TableCell><TableCell className="text-right">{degree === 2 ? 'Quadratic' : degree === 3 ? 'Cubic' : `Degree ${degree}`}</TableCell></TableRow></TableBody></Table></CardContent></Card>

                            {results.diagnostics?.coefficient_tests && <Card><CardHeader><CardTitle>Polynomial Coefficients</CardTitle><CardDescription>*** p&lt;.001, ** p&lt;.01, * p&lt;.05</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Term</TableHead><TableHead className="text-right">B</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">t</TableHead><TableHead className="text-right">p</TableHead></TableRow></TableHeader><TableBody>{Object.entries(results.diagnostics.coefficient_tests.params).map(([k, v]) => { const se = results.diagnostics!.coefficient_tests!.bse?.[k], t = results.diagnostics!.coefficient_tests!.tvalues?.[k], p = results.diagnostics!.coefficient_tests!.pvalues?.[k]; return <TableRow key={k}><TableCell className="font-medium font-mono text-xs">{k}</TableCell><TableCell className="text-right font-mono">{formatCoef(v)}</TableCell><TableCell className="text-right font-mono">{se ? formatCoef(se) : 'N/A'}</TableCell><TableCell className="text-right font-mono">{t?.toFixed(3) ?? 'N/A'}</TableCell><TableCell className="text-right font-mono">{formatPValue(p)}{getSignificanceStars(p)}</TableCell></TableRow>; })}</TableBody></Table></CardContent></Card>}

                            <Card><CardHeader><CardTitle>Assumption Diagnostics</CardTitle></CardHeader><CardContent className="space-y-4">
                                {results.diagnostics?.normality_tests && <div><h4 className="font-medium text-sm mb-2">Normality</h4><Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Stat</TableHead><TableHead className="text-right">p</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader><TableBody>{results.diagnostics.normality_tests.jarque_bera && <TableRow><TableCell>Jarque-Bera</TableCell><TableCell className="text-right font-mono">{results.diagnostics.normality_tests.jarque_bera.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.normality_tests.jarque_bera.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.normality_tests.jarque_bera.p_value > 0.05 ? <span className="text-primary">✓ Normal</span> : <span className="text-amber-600">⚠ Non-normal</span>}</TableCell></TableRow>}{results.diagnostics.normality_tests.shapiro_wilk && <TableRow><TableCell>Shapiro-Wilk</TableCell><TableCell className="text-right font-mono">{results.diagnostics.normality_tests.shapiro_wilk.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.normality_tests.shapiro_wilk.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.normality_tests.shapiro_wilk.p_value > 0.05 ? <span className="text-primary">✓ Normal</span> : <span className="text-amber-600">⚠ Non-normal</span>}</TableCell></TableRow>}</TableBody></Table></div>}
                                {results.diagnostics?.heteroscedasticity_tests?.breusch_pagan && <div><h4 className="font-medium text-sm mb-2">Homoscedasticity</h4><Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Stat</TableHead><TableHead className="text-right">p</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Breusch-Pagan</TableCell><TableCell className="text-right font-mono">{results.diagnostics.heteroscedasticity_tests.breusch_pagan.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value > 0.05 ? <span className="text-primary">✓ Homoscedastic</span> : <span className="text-amber-600">⚠ Heteroscedastic</span>}</TableCell></TableRow></TableBody></Table></div>}
                                {results.diagnostics?.durbin_watson !== undefined && <div><h4 className="font-medium text-sm mb-2">Independence</h4><Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Stat</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Durbin-Watson</TableCell><TableCell className="text-right font-mono">{results.diagnostics.durbin_watson.toFixed(4)}</TableCell><TableCell className="text-right">{results.diagnostics.durbin_watson >= 1.5 && results.diagnostics.durbin_watson <= 2.5 ? <span className="text-primary">✓ No autocorrelation</span> : results.diagnostics.durbin_watson < 1.5 ? <span className="text-amber-600">⚠ Positive</span> : <span className="text-amber-600">⚠ Negative</span>}</TableCell></TableRow></TableBody></Table><p className="text-xs text-muted-foreground mt-2">Values near 2 = no autocorrelation</p></div>}
                            </CardContent></Card>

                            {results.n_dropped !== undefined && results.n_dropped > 0 && <Card><CardContent className="py-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="w-4 h-4" /><span>{results.n_dropped} rows excluded (missing values)</span></div></CardContent></Card>}
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
        </div>
    );
}