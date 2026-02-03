'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { 
    Sigma, BarChart as BarChartIcon, Settings, FileSearch, Users, CheckCircle, 
    AlertTriangle, HelpCircle, Bot, Loader2, TrendingUp, Target, Layers, BookOpen, 
    Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, 
    FileText, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, 
    ArrowRight, ChevronDown, FileType, Activity, Info, Code, Copy,
    ArrowUpRight, ArrowDownRight
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
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/multiple_regression.py?alt=media";

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
const PythonCodeModal = ({ isOpen, onClose, codeUrl, title = "Python Code - Multiple Regression" }: { isOpen: boolean; onClose: () => void; codeUrl: string; title?: string; }) => {
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
                    <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([code], { type: 'text/x-python' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'multiple_regression.py'; link.click(); toast({ title: 'Downloaded!' }); }} disabled={isLoading || !!error}><Download className="mr-2 h-4 w-4" />Download</Button>
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
const generateApaInterpretation = (results: RegressionResultsData, targetVar: string, features: string[], n: number) => {
    const r2 = results.metrics.all_data.r2;
    const adjR2 = results.metrics.all_data.adj_r2;
    const fStat = results.diagnostics?.f_statistic;
    const fPValue = results.diagnostics?.f_pvalue ?? 1;
    const isSignificant = fPValue < 0.05;
    const coeffTests = results.diagnostics?.coefficient_tests;
    const df1 = features.length, df2 = n - features.length - 1;
    
    let r2Label = r2 >= 0.26 ? 'large' : r2 >= 0.13 ? 'medium' : r2 >= 0.02 ? 'small' : 'negligible';
    const formatP = (p: number) => p < 0.001 ? '< .001' : `= ${p.toFixed(3).replace(/^0/, '')}`;
    
    let overall = `A multiple linear regression was conducted to predict <strong>${targetVar}</strong> from `;
    overall += features.length === 2 ? `<strong>${features[0]}</strong> and <strong>${features[1]}</strong>` : features.map(f => `<strong>${f}</strong>`).slice(0, -1).join(', ') + ', and <strong>' + features[features.length - 1] + '</strong>';
    overall += ` using <em>N</em> = ${n} observations. `;
    
    if (isSignificant) {
        overall += `The model was statistically significant, <em>F</em>(${df1}, ${df2}) = ${fStat?.toFixed(2)}, <em>p</em> ${formatP(fPValue)}, <em>R</em>² = ${r2.toFixed(3)}, adjusted <em>R</em>² = ${adjR2.toFixed(3)}. `;
        overall += `It explained ${(r2 * 100).toFixed(1)}% of variance (${r2Label} effect). `;
        if (coeffTests) {
            const sigPreds = features.filter(f => coeffTests.pvalues?.[f] < 0.05);
            if (sigPreds.length > 0) {
                overall += `Significant predictors: ${sigPreds.map(p => `${p} (<em>b</em> = ${coeffTests.params?.[p]?.toFixed(3)}, <em>p</em> ${formatP(coeffTests.pvalues?.[p] ?? 1)})`).join('; ')}.`;
            }
        }
    } else {
        overall += `The model was not significant, <em>F</em>(${df1}, ${df2}) = ${fStat?.toFixed(2)}, <em>p</em> ${formatP(fPValue)}.`;
    }
    
    const insights: string[] = [
        `<strong>Model:</strong> <em>p</em> ${formatP(fPValue)}. ${fPValue < 0.05 ? 'Significant.' : 'Not significant.'}`,
        `<strong>R²:</strong> ${r2.toFixed(3)} (${(r2 * 100).toFixed(1)}%) — ${r2Label} effect.`,
        `<strong>Adjusted R²:</strong> ${adjR2.toFixed(3)}. Shrinkage: ${((r2 - adjR2) * 100).toFixed(1)}%.`,
        `<strong>RMSE:</strong> ${results.metrics.all_data.rmse.toFixed(3)} average error.`,
    ];
    
    if (results.diagnostics?.vif) {
        const highVif = Object.entries(results.diagnostics.vif).filter(([k, v]) => k !== 'const' && v > 5);
        insights.push(highVif.length > 0 ? `<strong>VIF:</strong> High for ${highVif.map(([k]) => k).join(', ')}.` : `<strong>VIF:</strong> All acceptable.`);
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



const MultipleRegressionGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Multiple Regression Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Multiple Regression */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Multiple Linear Regression?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Multiple regression models the relationship between <strong>multiple predictor variables (X₁, X₂, ...)</strong> and 
                <strong> one outcome variable (Y)</strong>. It estimates each predictor's unique effect while controlling for the others.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The equation:</strong> Y = β₀ + β₁X₁ + β₂X₂ + ... + βₖXₖ + ε<br/>
                  <span className="text-muted-foreground text-xs">
                    Each β represents the change in Y for a 1-unit change in X, holding other variables constant.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Multiple Regression?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You have <strong>multiple potential predictors</strong></li>
                    <li>• You want to <strong>isolate each factor's effect</strong></li>
                    <li>• You need to <strong>control for confounding variables</strong></li>
                    <li>• You want to <strong>compare predictor importance</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Don't use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Sample size is too small (need 10-20 obs per predictor)</li>
                    <li>• Predictors are highly correlated (multicollinearity)</li>
                    <li>• Relationships are non-linear</li>
                    <li>• Outcome is categorical (use logistic regression)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChartIcon className="w-4 h-4" />
                Understanding Key Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">R² vs Adjusted R²</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>R²:</strong> Total variance explained. Can increase with any added variable.<br/>
                    <strong>Adjusted R²:</strong> Penalizes adding useless predictors. Use this for model comparison.<br/>
                    <strong>Rule:</strong> If Adj R² drops when adding a variable, that variable isn't helping.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">VIF (Variance Inflation Factor)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures multicollinearity — how much predictors are correlated with each other.
                    <br/><strong>VIF &lt; 5:</strong> Acceptable
                    <br/><strong>VIF 5-10:</strong> Moderate concern
                    <br/><strong>VIF &gt; 10:</strong> Serious problem — remove or combine predictors
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">F-test — Is the Model Significant?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if <em>at least one</em> predictor has a significant effect.<br/>
                    <strong>p &lt; 0.05:</strong> The model is significant.<br/>
                    <strong>p ≥ 0.05:</strong> No predictors significantly affect Y.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Coefficients */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sigma className="w-4 h-4" />
                Interpreting Coefficients
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Unstandardized (B)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Change in Y for 1-unit increase in X, <strong>holding other variables constant</strong>.
                    <br/><strong>Example:</strong> B = 0.5 for "experience" means each year adds 0.5 to salary, 
                    controlling for education, age, etc.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Standardized (Beta / β)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allows comparing predictors on different scales.
                    <br/><strong>Rule:</strong> Larger |β| = stronger effect.
                    <br/><strong>Example:</strong> If β(education) = 0.4 and β(experience) = 0.2, education 
                    has twice the relative impact.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Individual p-values</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each predictor has its own significance test.<br/>
                    <strong>p &lt; 0.05:</strong> Predictor significantly contributes.<br/>
                    <strong>p ≥ 0.05:</strong> Consider removing this predictor.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Variable Selection */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Variable Selection Methods
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Enter (Use All)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Include all predictors. Best when you have theoretical reasons for each variable.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Forward Selection</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start empty, add the most significant predictor at each step until none improve the model.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Backward Elimination</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start with all predictors, remove the least significant until all remaining are significant.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Stepwise</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Combines forward and backward — can add and remove at each step. Most flexible.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Caution:</strong> Automated selection can find spurious relationships. 
                    Always validate with theory and consider cross-validation.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Regression Assumptions
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">1. Linearity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Relationship between each X and Y should be linear.
                    <br/><strong>Check:</strong> Residual plots, partial regression plots.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Independence</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Observations should be independent.
                    <br/><strong>Check:</strong> Durbin-Watson ≈ 2.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Homoscedasticity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Constant variance of residuals.
                    <br/><strong>Check:</strong> Breusch-Pagan test p &gt; 0.05.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">4. Normality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Residuals approximately normal (less critical with n &gt; 30).
                    <br/><strong>Check:</strong> Shapiro-Wilk test, Q-Q plot.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">5. No Multicollinearity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Predictors shouldn't be highly correlated.
                    <br/><strong>Check:</strong> VIF &lt; 5 (or &lt; 10).
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
                  <p className="font-medium text-sm text-primary mb-1">Sample Size</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Minimum: 10-20 observations per predictor</li>
                    <li>• Better: 50+ total observations</li>
                    <li>• Watch Adj R² for overfitting signs</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Model Building</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with theory-driven predictors</li>
                    <li>• Check VIF before interpreting</li>
                    <li>• Compare R² vs Adj R²</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Focus on significant predictors</li>
                    <li>• Use standardized β for comparison</li>
                    <li>• Consider practical significance</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• F(df1, df2) = X.XX, p = .XXX</li>
                    <li>• R² = .XX, Adj R² = .XX</li>
                    <li>• B, SE, β, t, p for each predictor</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Multiple regression shows association, not causation. 
                Coefficients represent "controlling for other variables," but this statistical control is not the same 
                as experimental control. Consider confounding variables not in your model.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Statistical Terms Glossary for Multiple Regression
const regressionMetricDefinitions: Record<string, string> = {
  multiple_regression: "A statistical method that uses multiple predictor variables (X₁, X₂, ...) to explain or predict a single outcome variable (Y). Extends simple regression by controlling for multiple factors simultaneously.",
  r_squared: "Coefficient of determination (R²). The proportion of variance in Y explained by the predictors. Ranges from 0 to 1; higher values indicate better explanatory power.",
  adjusted_r_squared: "R² adjusted for the number of predictors. Penalizes adding variables that don't improve the model. Use this to compare models with different numbers of predictors.",
  coefficient: "The estimated effect of a predictor on Y, holding other variables constant. Also called B or unstandardized coefficient. Units are in the original scale of the variables.",
  standardized_coefficient: "Beta (β) coefficient. Effect size in standard deviation units. Allows comparing predictors on different scales. Larger |β| = stronger relative effect.",
  intercept: "The constant term (β₀). The predicted value of Y when all predictors equal zero. May not have meaningful interpretation if zero is outside the data range.",
  p_value: "Probability of observing the result (or more extreme) if the true effect is zero. p < 0.05 typically indicates statistical significance.",
  standard_error: "A measure of uncertainty in the coefficient estimate. Smaller SE = more precise estimate. Used to calculate confidence intervals and t-tests.",
  t_statistic: "Coefficient divided by its standard error. Tests whether a coefficient is significantly different from zero. |t| > ~2 usually indicates significance.",
  f_statistic: "Tests whether the overall model is significant — whether at least one predictor has a non-zero effect. F-test compares the model to a null model with only the intercept.",
  rmse: "Root Mean Square Error. Average prediction error in the original units of Y. Lower = better predictions. RMSE = √(MSE).",
  mae: "Mean Absolute Error. Average of absolute prediction errors. Less sensitive to outliers than RMSE. Lower = better.",
  mse: "Mean Squared Error. Average of squared prediction errors. Penalizes large errors more heavily than MAE.",
  vif: "Variance Inflation Factor. Measures multicollinearity — how much a predictor is correlated with other predictors. VIF > 5-10 indicates problematic collinearity.",
  multicollinearity: "When predictors are highly correlated with each other. Causes unstable coefficient estimates and inflated standard errors. Check VIF to detect.",
  degrees_of_freedom: "df for regression = number of predictors (k). df for residuals = n - k - 1. Used in F-test and t-tests.",
  residual: "The difference between observed and predicted values (Y - Ŷ). Residual analysis checks model assumptions.",
  durbin_watson: "Tests for autocorrelation in residuals. Values near 2 indicate no autocorrelation. < 1.5 or > 2.5 may indicate problems.",
  homoscedasticity: "Assumption that residual variance is constant across all levels of predicted values. Breusch-Pagan test checks this (p > 0.05 = assumption met).",
  normality_of_residuals: "Assumption that residuals are normally distributed. Less critical with large samples (n > 30). Shapiro-Wilk or Jarque-Bera tests check this.",
  ols: "Ordinary Least Squares. The most common method for estimating regression coefficients. Minimizes the sum of squared residuals.",
  forward_selection: "Start with no predictors, add the most significant one at each step until no more improve the model.",
  backward_elimination: "Start with all predictors, remove the least significant one at each step until all remaining are significant.",
  stepwise_selection: "Combines forward and backward — can add and remove predictors at each step. Most flexible but prone to overfitting.",
  overfitting: "When a model fits the training data too well but performs poorly on new data. Sign: large gap between R² and Adjusted R².",
  confidence_interval: "A range of plausible values for a coefficient. 95% CI means we're 95% confident the true value lies within this range. If CI excludes zero, the effect is significant."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Multiple Regression Glossary
                  </DialogTitle>
                  <DialogDescription>
                      Definitions of statistical terms used in multiple regression analysis
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                      {Object.entries(regressionMetricDefinitions).map(([term, definition]) => (
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

// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Layers className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="text-3xl">Multiple Linear Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Predict outcomes using several factors — find which matter most</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Users className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Multiple Factors</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Include several predictors for better forecasts</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Isolate Effects</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">See each factor's unique contribution</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Bot className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Auto Selection</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Let algorithm find best predictors</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use when many factors might affect your outcome. Example: What drives house prices?</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4><ul className="space-y-2 text-sm text-muted-foreground"><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Multiple predictors:</strong> 2+ numeric variables</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>One outcome:</strong> Variable to predict</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>More data:</strong> 10-20 obs per predictor</span></li></ul></div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />What You'll Learn</h4><ul className="space-y-2 text-sm text-muted-foreground"><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Key drivers:</strong> Which factors matter most</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Unique effects:</strong> Each factor's isolated impact</span></li><li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" /><span><strong>Better predictions:</strong> Combined accuracy</span></li></ul></div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Layers className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

// Main Component
interface Props { data: DataSet; numericHeaders: string[]; onLoadExample: (e: ExampleDataSet) => void; }

export default function MultipleRegressionPage({ data, numericHeaders, onLoadExample }: Props) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetVar, setTargetVar] = useState('');
    const [featureVars, setFeatureVars] = useState<string[]>([]);
    const [selectionMethod, setSelectionMethod] = useState('none');
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonModalOpen, setPythonModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false); 
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== targetVar), [numericHeaders, targetVar]);

    const dataValidation = useMemo((): ValidationCheck[] => {
        const checks: ValidationCheck[] = [];
        checks.push({ label: 'Target selected', passed: targetVar !== '', detail: targetVar ? `Target: ${targetVar}` : 'Select target', severity: 'critical' });
        checks.push({ label: 'Features selected', passed: featureVars.length >= 2, detail: featureVars.length >= 2 ? `${featureVars.length} features` : 'Select at least 2', severity: 'critical' });
        checks.push({ label: 'Sample size', passed: data.length >= 30, detail: `n = ${data.length} (30+ recommended)`, severity: data.length >= 20 ? 'warning' : 'critical' });
        if (featureVars.length > 0) { const ratio = Math.floor(data.length / featureVars.length); checks.push({ label: 'Obs per predictor', passed: ratio >= 10, detail: `${ratio} per predictor (10+ rec)`, severity: ratio >= 5 ? 'warning' : 'critical' }); }
        const allVars = [targetVar, ...featureVars].filter(v => v);
        if (allVars.length > 0) { const missing = data.filter((row: any) => allVars.some(v => row[v] == null || row[v] === '' || (typeof row[v] === 'number' && isNaN(row[v])))).length; checks.push({ label: 'Missing values', passed: missing === 0, detail: missing === 0 ? 'None detected' : `${missing} rows excluded`, severity: 'info' }); }
        return checks;
    }, [data, targetVar, featureVars]);

    const allCriticalPassed = dataValidation.filter(c => c.severity === 'critical').every(c => c.passed);

    useEffect(() => { if (numericHeaders.length > 0) { const t = numericHeaders[numericHeaders.length - 1]; if (!targetVar) setTargetVar(t); const f = numericHeaders.filter(h => h !== t); if (featureVars.length === 0 && f.length > 0) setFeatureVars(f); } }, [numericHeaders]);
    useEffect(() => { if (data.length === 0) setView('intro'); else if (canRun) { setView('main'); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1); } }, [data, numericHeaders, canRun]);

    const goToStep = useCallback((s: Step) => { setCurrentStep(s); setMaxReachedStep(p => Math.max(p, s) as Step); }, []);
    const nextStep = useCallback(() => { if (currentStep < 6) goToStep((currentStep + 1) as Step); }, [currentStep, goToStep]);
    const prevStep = useCallback(() => { if (currentStep > 1) goToStep((currentStep - 1) as Step); }, [currentStep, goToStep]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results' }); return; }
        setIsDownloading(true); toast({ title: "Generating..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' }); const link = document.createElement('a'); link.download = `Multiple_Regression_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Done" }); }
        catch { toast({ variant: 'destructive', title: "Failed" }); } finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const r = analysisResult.results, m = r.metrics.all_data;
        let csv = `MULTIPLE REGRESSION\nTarget: ${targetVar}\nFeatures: ${featureVars.join(', ')}\n\nMETRICS\n` + Papa.unparse([{ Metric: 'R²', Value: m.r2 }, { Metric: 'Adj R²', Value: m.adj_r2 }, { Metric: 'RMSE', Value: m.rmse }, { Metric: 'MAE', Value: m.mae }, { Metric: 'F p-value', Value: r.diagnostics?.f_pvalue }]) + '\n\n';
        if (r.diagnostics?.coefficient_tests) csv += 'COEFFICIENTS\n' + Papa.unparse(Object.entries(r.diagnostics.coefficient_tests.params).map(([k, v]) => ({ Variable: k, B: v, SE: r.diagnostics!.coefficient_tests!.bse?.[k], t: r.diagnostics!.coefficient_tests!.tvalues?.[k], p: r.diagnostics!.coefficient_tests!.pvalues?.[k] }))) + '\n';
        if (r.diagnostics?.vif) csv += '\nVIF\n' + Papa.unparse(Object.entries(r.diagnostics.vif).map(([k, v]) => ({ Variable: k, VIF: v })));
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `Multiple_Regression_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: 'Downloaded' });
    }, [analysisResult, targetVar, featureVars, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating..." });
        try { const res = await fetch('/api/export/regression-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results: analysisResult.results, targetVar, features: featureVars, modelType: 'multiple', sampleSize: data.length }) }); if (!res.ok) throw new Error(); const link = document.createElement('a'); link.href = URL.createObjectURL(await res.blob()); link.download = `Multiple_Regression_${new Date().toISOString().split('T')[0]}.docx`; link.click(); toast({ title: "Done" }); }
        catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetVar, featureVars, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetVar || featureVars.length < 2) { toast({ variant: 'destructive', title: 'Select variables' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/regression`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, targetVar, features: featureVars, modelType: 'multiple', selectionMethod, test_size: 0 }) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.error || `HTTP ${res.status}`); }
            const result: FullAnalysisResponse = await res.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result); goToStep(4); toast({ title: 'Complete' });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetVar, featureVars, selectionMethod, toast, goToStep]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult?.results;

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <MultipleRegressionGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <PythonCodeModal isOpen={pythonModalOpen} onClose={() => setPythonModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />


            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Multiple Linear Regression</h1>
                    <p className="text-muted-foreground mt-1">Predict outcomes using multiple predictors</p>
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
                            <div className="space-y-3"><Label>Feature Variables (X)</Label><ScrollArea className="h-48 border rounded-xl p-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{availableFeatures.map(h => <div key={h} className="flex items-center space-x-2"><Checkbox id={`f-${h}`} checked={featureVars.includes(h)} onCheckedChange={(c) => setFeatureVars(p => c ? [...p, h] : p.filter(v => v !== h))} /><label htmlFor={`f-${h}`} className="text-sm cursor-pointer">{h}</label></div>)}</div></ScrollArea><p className="text-xs text-muted-foreground">{featureVars.length} selected (min: 2)</p></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                            {targetVar && featureVars.length > 0 && <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Preview</h4><p className="text-sm font-mono text-muted-foreground">{targetVar} = β₀ + {featureVars.slice(0, 3).map((f, i) => `β${i + 1}×${f}`).join(' + ')}{featureVars.length > 3 ? ' + ...' : ''} + ε</p></div>}
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!targetVar || featureVars.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure variable selection</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label>Selection Method</Label><Select value={selectionMethod} onValueChange={setSelectionMethod}><SelectTrigger className="h-11 max-w-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Enter (Use All)</SelectItem><SelectItem value="forward">Forward</SelectItem><SelectItem value="backward">Backward</SelectItem><SelectItem value="stepwise">Stepwise</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">{selectionMethod === 'none' ? 'Include all' : selectionMethod === 'forward' ? 'Add significant' : selectionMethod === 'backward' ? 'Remove non-significant' : 'Combined approach'}</p></div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-4"><h4 className="font-medium text-sm">Configuration</h4><div className="grid md:grid-cols-2 gap-4 text-sm"><div className="space-y-2"><p className="text-muted-foreground"><strong className="text-foreground">Target:</strong> {targetVar}</p><p className="text-muted-foreground"><strong className="text-foreground">Features:</strong> {featureVars.length} variables</p></div><div className="space-y-2"><p className="text-muted-foreground"><strong className="text-foreground">Model:</strong> Multiple Linear (OLS)</p><p className="text-muted-foreground"><strong className="text-foreground">Sample:</strong> {data.length}</p></div></div></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-sky-600" />What It Does</h4><ul className="space-y-2 text-sm text-muted-foreground"><li>• Uses multiple predictors to explain Y</li><li>• Estimates each predictor's unique effect</li><li>• Checks multicollinearity (VIF)</li><li>• Measures R² and adjusted R²</li></ul></div>
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
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><TrendingUp className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Multiple regression with OLS will be performed.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={!allCriticalPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (() => {
                    const r2 = results.metrics.all_data.r2, adjR2 = results.metrics.all_data.adj_r2, r2I = getR2Interpretation(r2);
                    const fP = results.diagnostics?.f_pvalue ?? 1, isSig = fP < 0.05;
                    const coef = results.diagnostics?.coefficient_tests;
                    let topPred = featureVars[0], topEff = 0;
                    if (coef) { const sig = featureVars.filter(f => coef.pvalues?.[f] < 0.05).sort((a, b) => Math.abs(coef.params?.[b] || 0) - Math.abs(coef.params?.[a] || 0)); if (sig.length > 0) { topPred = sig[0]; topEff = coef.params?.[topPred] || 0; } }
                    const sigCount = coef ? featureVars.filter(f => coef.pvalues?.[f] < 0.05).length : 0;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings about {targetVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isSig && r2 >= 0.25 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : isSig ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700' : 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isSig && r2 >= 0.25 ? 'text-primary' : isSig ? 'text-amber-600' : 'text-destructive'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">{topEff > 0 ? <ArrowUpRight className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <ArrowDownRight className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}<p className="text-sm"><strong>{topPred}</strong> is strongest with <strong>{topEff > 0 ? 'positive' : 'negative'}</strong> effect.{sigCount > 1 && ` (${sigCount}/${featureVars.length} significant)`}</p></div>
                                        <div className="flex items-start gap-3"><Target className={`w-5 h-5 shrink-0 mt-0.5 ${r2 >= 0.25 ? 'text-primary' : 'text-muted-foreground'}`} /><p className="text-sm">Model explains <strong>{(r2 * 100).toFixed(1)}%</strong> (Adj: {(adjR2 * 100).toFixed(1)}%).{r2 >= 0.50 ? ' Substantial.' : r2 >= 0.25 ? ' Moderate.' : ' Limited.'}</p></div>
                                        <div className="flex items-start gap-3"><Sigma className={`w-5 h-5 shrink-0 mt-0.5 ${isSig ? 'text-primary' : 'text-destructive'}`} /><p className="text-sm">{isSig ? <><strong>Significant</strong> (p {formatPValue(fP)})</> : <><strong>NOT significant</strong> (p = {fP.toFixed(4)})</>}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isSig && r2 >= 0.25 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">{isSig && r2 >= 0.25 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Info className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{isSig && r2 >= 0.50 ? 'Strong Model!' : isSig && r2 >= 0.25 ? 'Moderate Model' : isSig ? 'Weak but Significant' : 'Not Significant'}</p><p className="text-sm text-muted-foreground mt-1">{isSig && r2 >= 0.25 ? 'Useful for prediction.' : isSig ? 'Relationships exist but limited.' : 'Try different predictors.'}</p></div></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricCard label="R²" value={`${(r2 * 100).toFixed(0)}%`} subtitle={r2I.label} icon={Target} highlight={r2 >= 0.25} />
                                    <MetricCard label="Adj R²" value={`${(adjR2 * 100).toFixed(0)}%`} subtitle="Penalized" icon={TrendingUp} />
                                    <MetricCard label="Error" value={`±${results.metrics.all_data.rmse.toFixed(2)}`} subtitle="RMSE" icon={Activity} />
                                    <MetricCard label="p-value" value={formatPValue(fP)} subtitle={isSig ? 'Significant' : 'Not sig'} icon={Sigma} warning={!isSig} />
                                </div>
                                <div className="flex items-center justify-center gap-2 py-2"><span className="text-sm text-muted-foreground">Quality:</span><StarRating value={isSig ? r2I.stars : Math.max(1, r2I.stars - 1)} /></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (() => {
                    const r2 = results.metrics.all_data.r2, adjR2 = results.metrics.all_data.adj_r2;
                    const fP = results.diagnostics?.f_pvalue ?? 1, isSig = fP < 0.05;
                    const coef = results.diagnostics?.coefficient_tests, vif = results.diagnostics?.vif;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding the results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What Multiple Regression Does</h4><p className="text-sm text-muted-foreground">Finds best combination of <strong className="text-foreground">{featureVars.length} predictors</strong> to explain <strong className="text-foreground">{targetVar}</strong>, controlling for each other.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">R² = {(r2 * 100).toFixed(0)}% vs Adj = {(adjR2 * 100).toFixed(0)}%</h4><p className="text-sm text-muted-foreground">Explains <strong className="text-foreground">{(r2 * 100).toFixed(0)}%</strong> of variation. Gap of {((r2 - adjR2) * 100).toFixed(1)}% {r2 - adjR2 > 0.05 ? 'suggests possible overfitting.' : 'shows good generalization.'}</p></div></div></div>
                                {coef && <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Individual Predictors</h4><div className="text-sm text-muted-foreground space-y-1">{featureVars.slice(0, 4).map(f => { const c = coef.params?.[f], p = coef.pvalues?.[f]; if (c === undefined) return null; return <p key={f}><strong className={p < 0.05 ? 'text-foreground' : 'text-muted-foreground'}>{f}:</strong> b = {formatCoef(c)}{p < 0.05 ? <Badge variant="outline" className="ml-2 text-xs">Sig</Badge> : <span className="text-xs ml-2">(ns)</span>}</p>; })}{featureVars.length > 4 && <p className="text-xs">...+{featureVars.length - 4} more</p>}</div></div></div></div>}
                                {vif && Object.keys(vif).length > 1 && <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Multicollinearity (VIF)</h4><p className="text-sm text-muted-foreground">{(() => { const high = Object.entries(vif).filter(([k, v]) => k !== 'const' && v > 5); return high.length > 0 ? <>⚠️ High VIF for <strong className="text-foreground">{high.map(([k]) => k).join(', ')}</strong>. May be too correlated.</> : <>✓ All VIF acceptable. No severe multicollinearity.</>; })()}</p></div></div></div>}
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">{vif && Object.keys(vif).length > 1 ? '5' : '4'}</div><div><h4 className="font-semibold mb-1">Significance</h4><p className="text-sm text-muted-foreground">{isSig ? <>F-test p = {formatPValue(fP)} &lt; 0.05: <strong className="text-foreground">Significant</strong>. At least one predictor has real effect.</> : <>p = {fP.toFixed(4)} &gt; 0.05. <strong className="text-foreground">Cannot conclude</strong> these predictors affect {targetVar}.</>}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isSig && r2 >= 0.25 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isSig && r2 >= 0.25 ? <><CheckCircle2 className="w-5 h-5 text-primary" />Useful Model</> : <><Info className="w-5 h-5 text-amber-600" />Limited</>}</h4><p className="text-sm text-muted-foreground">{isSig && r2 >= 0.50 ? 'Strong model for predictions.' : isSig && r2 >= 0.25 ? 'Useful but consider refinement.' : isSig ? 'Significant but explains little. Try different predictors.' : `Doesn't predict ${targetVar}. Try other variables.`}</p></div>
                                <div className="bg-muted/20 rounded-xl p-4"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />R² Guide</h4><div className="grid grid-cols-5 gap-2 text-xs"><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;10%</p><p className="text-muted-foreground">V.Weak</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">10-25%</p><p className="text-muted-foreground">Weak</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">25-50%</p><p className="text-muted-foreground">Moderate</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">50-75%</p><p className="text-muted-foreground">Good</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;75%</p><p className="text-muted-foreground">Excellent</p></div></div></div>
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
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Multiple Regression Report</h2><p className="text-sm text-muted-foreground mt-1">{targetVar} ~ {featureVars.join(' + ')} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <MetricCard label="R²" value={results.metrics.all_data.r2.toFixed(4)} subtitle={getR2Interpretation(results.metrics.all_data.r2).label} icon={Target} />
                                <MetricCard label="Adj R²" value={results.metrics.all_data.adj_r2.toFixed(4)} subtitle="Penalized" icon={TrendingUp} />
                                <MetricCard label="RMSE" value={results.metrics.all_data.rmse.toFixed(4)} subtitle="Error" icon={BarChartIcon} />
                                <MetricCard label="F p-value" value={formatPValue(results.diagnostics?.f_pvalue)} subtitle={results.diagnostics?.f_pvalue && results.diagnostics.f_pvalue < 0.05 ? 'Sig' : 'Not sig'} icon={Sigma} warning={results.diagnostics?.f_pvalue ? results.diagnostics.f_pvalue >= 0.05 : false} />
                            </div>

                            {/* APA Summary */}
                            {(() => { const apa = generateApaInterpretation(results, targetVar, featureVars, data.length); return (
                                <Card><CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader><CardContent className="space-y-6">
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700"><div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">APA Format Summary</h3></div><div className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: apa.overall_analysis }} /></div>
                                    <div className="space-y-3"><h4 className="font-medium text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />Statistical Insights</h4><div className="grid gap-2">{apa.statistical_insights.map((ins, i) => <div key={i} className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg" dangerouslySetInnerHTML={{ __html: ins }} />)}</div></div>
                                </CardContent></Card>
                            ); })()}

                            {analysisResult?.plot && <Card><CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader><CardContent><Image src={analysisResult.plot} alt="Diagnostics" width={1200} height={1000} className="w-full rounded-md border" /></CardContent></Card>}

                            <Card><CardHeader><CardTitle>Model Performance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">R²</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.r2.toFixed(4)}</TableCell><TableCell className="text-right">{getR2Interpretation(results.metrics.all_data.r2).desc}</TableCell></TableRow><TableRow><TableCell className="font-medium">Adj R²</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.adj_r2.toFixed(4)}</TableCell><TableCell className="text-right">Penalized</TableCell></TableRow><TableRow><TableCell className="font-medium">RMSE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.rmse.toFixed(4)}</TableCell><TableCell className="text-right">Avg error</TableCell></TableRow><TableRow><TableCell className="font-medium">MAE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.mae.toFixed(4)}</TableCell><TableCell className="text-right">Mean abs error</TableCell></TableRow><TableRow><TableCell className="font-medium">F-stat</TableCell><TableCell className="text-right font-mono">{results.diagnostics?.f_statistic?.toFixed(4) ?? 'N/A'}</TableCell><TableCell className="text-right">Model test</TableCell></TableRow><TableRow><TableCell className="font-medium">F p-value</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics?.f_pvalue)}</TableCell><TableCell className="text-right">{results.diagnostics?.f_pvalue && results.diagnostics.f_pvalue < 0.05 ? '✓ Sig' : '✗ Not sig'}</TableCell></TableRow></TableBody></Table></CardContent></Card>

                            {results.diagnostics?.coefficient_tests && <Card><CardHeader><CardTitle>Coefficients</CardTitle><CardDescription>*** p&lt;.001, ** p&lt;.01, * p&lt;.05</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">B</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">t</TableHead><TableHead className="text-right">p</TableHead></TableRow></TableHeader><TableBody>{Object.entries(results.diagnostics.coefficient_tests.params).map(([k, v]) => { const se = results.diagnostics!.coefficient_tests!.bse?.[k], t = results.diagnostics!.coefficient_tests!.tvalues?.[k], p = results.diagnostics!.coefficient_tests!.pvalues?.[k]; return <TableRow key={k}><TableCell className="font-medium">{k}</TableCell><TableCell className="text-right font-mono">{formatCoef(v)}</TableCell><TableCell className="text-right font-mono">{se ? formatCoef(se) : 'N/A'}</TableCell><TableCell className="text-right font-mono">{t?.toFixed(3) ?? 'N/A'}</TableCell><TableCell className="text-right font-mono">{formatPValue(p)}{getSignificanceStars(p)}</TableCell></TableRow>; })}</TableBody></Table></CardContent></Card>}

                            {results.diagnostics?.vif && Object.keys(results.diagnostics.vif).length > 0 && <Card><CardHeader><CardTitle>VIF (Multicollinearity)</CardTitle><CardDescription>Values &gt;5 indicate issues</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">VIF</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{Object.entries(results.diagnostics.vif).filter(([k]) => k !== 'const').map(([k, v]) => <TableRow key={k}><TableCell className="font-medium">{k}</TableCell><TableCell className="text-right font-mono">{v.toFixed(3)}</TableCell><TableCell className="text-right">{v > 10 ? <span className="text-destructive">⚠ High</span> : v > 5 ? <span className="text-amber-600">⚠ Moderate</span> : <span className="text-primary">✓ OK</span>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}

                            <Card><CardHeader><CardTitle>Assumption Diagnostics</CardTitle></CardHeader><CardContent className="space-y-4">
                                {results.diagnostics?.normality_tests && <div><h4 className="font-medium text-sm mb-2">Normality</h4><Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Stat</TableHead><TableHead className="text-right">p</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader><TableBody>{results.diagnostics.normality_tests.jarque_bera && <TableRow><TableCell>Jarque-Bera</TableCell><TableCell className="text-right font-mono">{results.diagnostics.normality_tests.jarque_bera.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.normality_tests.jarque_bera.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.normality_tests.jarque_bera.p_value > 0.05 ? <span className="text-primary">✓ Normal</span> : <span className="text-amber-600">⚠ Non-normal</span>}</TableCell></TableRow>}{results.diagnostics.normality_tests.shapiro_wilk && <TableRow><TableCell>Shapiro-Wilk</TableCell><TableCell className="text-right font-mono">{results.diagnostics.normality_tests.shapiro_wilk.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.normality_tests.shapiro_wilk.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.normality_tests.shapiro_wilk.p_value > 0.05 ? <span className="text-primary">✓ Normal</span> : <span className="text-amber-600">⚠ Non-normal</span>}</TableCell></TableRow>}</TableBody></Table></div>}
                                {results.diagnostics?.heteroscedasticity_tests?.breusch_pagan && <div><h4 className="font-medium text-sm mb-2">Homoscedasticity</h4><Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Stat</TableHead><TableHead className="text-right">p</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Breusch-Pagan</TableCell><TableCell className="text-right font-mono">{results.diagnostics.heteroscedasticity_tests.breusch_pagan.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value > 0.05 ? <span className="text-primary">✓ Homoscedastic</span> : <span className="text-amber-600">⚠ Heteroscedastic</span>}</TableCell></TableRow></TableBody></Table></div>}
                                {results.diagnostics?.durbin_watson !== undefined && <div><h4 className="font-medium text-sm mb-2">Independence</h4><Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Stat</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Durbin-Watson</TableCell><TableCell className="text-right font-mono">{results.diagnostics.durbin_watson.toFixed(4)}</TableCell><TableCell className="text-right">{results.diagnostics.durbin_watson >= 1.5 && results.diagnostics.durbin_watson <= 2.5 ? <span className="text-primary">✓ No autocorrelation</span> : results.diagnostics.durbin_watson < 1.5 ? <span className="text-amber-600">⚠ Positive</span> : <span className="text-amber-600">⚠ Negative</span>}</TableCell></TableRow></TableBody></Table><p className="text-xs text-muted-foreground mt-2">Values near 2 = no autocorrelation</p></div>}
                            </CardContent></Card>

                            {results.stepwise_log && results.stepwise_log.length > 0 && <Card><CardHeader><CardTitle>Selection Log</CardTitle></CardHeader><CardContent><ul className="space-y-1 text-sm">{results.stepwise_log.map((l, i) => <li key={i} className="font-mono text-muted-foreground">{l}</li>)}</ul></CardContent></Card>}
                            {results.n_dropped !== undefined && results.n_dropped > 0 && <Card><CardContent className="py-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="w-4 h-4" /><span>{results.n_dropped} rows excluded (missing values)</span></div></CardContent></Card>}
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
        </div>
    );
}