'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sigma, Loader2, Scaling, HelpCircle, Settings, FileSearch, TrendingUp, CheckCircle, FileType, Target, BarChart, BookOpen, FileText, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, Info, ArrowRight, ChevronDown, AlertTriangle, Sparkles, Layers, Activity, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../../ui/checkbox';
import { ScrollArea } from '../../ui/scroll-area';
import { Label } from '../../ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/glm.py?alt=media";

interface SummaryTableData {
    caption: string | null;
    data: string[][];
}

interface GlmResults {
    model_summary_data: SummaryTableData[];
    aic: number;
    bic: number;
    log_likelihood: number;
    deviance: number;
    pseudo_r2: number;
    coefficients: {
        variable: string;
        coefficient: number;
        exp_coefficient?: number;
        p_value: number;
        conf_int_lower: number;
        conf_int_upper: number;
        exp_conf_int_lower?: number;
        exp_conf_int_upper?: number;
    }[];
    family: string;
    interpretation?: string;
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

const getSignificanceStars = (p: number) => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const getPseudoR2Interpretation = (r2: number) => {
    if (r2 >= 0.40) return { label: 'Excellent', desc: 'excellent fit' };
    if (r2 >= 0.20) return { label: 'Good', desc: 'good fit' };
    if (r2 >= 0.10) return { label: 'Moderate', desc: 'moderate fit' };
    return { label: 'Weak', desc: 'weak fit' };
};

const PythonCodeModal = ({ isOpen, onClose, codeUrl }: { isOpen: boolean; onClose: () => void; codeUrl: string }) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) fetchCode();
    }, [isOpen, code]);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) throw new Error(`Failed to fetch code: ${response.status}`);
            setCode(await response.text());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load Python code');
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Python code' });
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
        link.download = 'glm.py';
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
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Generalized Linear Model</DialogTitle>
                    <DialogDescription>View, copy, or download the Python code used for this analysis.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 py-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading || !!error}><Copy className="mr-2 h-4 w-4" />Copy Code</Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading || !!error}><Download className="mr-2 h-4 w-4" />Download .py</Button>
                    {error && <Button variant="outline" size="sm" onClick={fetchCode}><Loader2 className="mr-2 h-4 w-4" />Retry</Button>}
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 text-slate-300">Loading code...</span></div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center"><AlertTriangle className="h-10 w-10 text-amber-500 mb-3" /><p className="text-slate-300 mb-2">Failed to load code</p><p className="text-slate-500 text-sm">{error}</p></div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950"><pre className="p-4 text-sm text-slate-50 overflow-x-auto"><code className="language-python">{code}</code></pre></ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const StatisticalSummaryCards = ({ results }: { results: GlmResults }) => {
    const significantCount = results.coefficients.filter(c => c.p_value < 0.05).length;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Pseudo R²</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.pseudo_r2.toFixed(4)}</p><p className="text-xs text-muted-foreground">{getPseudoR2Interpretation(results.pseudo_r2).label}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">AIC</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.aic.toFixed(1)}</p><p className="text-xs text-muted-foreground">Lower is better</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">BIC</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.bic.toFixed(1)}</p><p className="text-xs text-muted-foreground">Lower is better</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Significant</p><CheckCircle className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{significantCount}/{results.coefficients.length}</p><p className="text-xs text-muted-foreground">p &lt; 0.05</p></div></CardContent></Card>
        </div>
    );
};


// Statistical Terms Glossary for GLM
const glmMetricDefinitions: Record<string, string> = {
    glm: "Generalized Linear Model. A flexible extension of linear regression that allows response variables to have non-normal distributions through link functions.",
    family: "The probability distribution assumed for the response variable. Common families: Gaussian (continuous), Binomial (binary), Poisson (counts), Gamma (positive continuous).",
    link_function: "A function that connects the linear predictor to the expected value of the response. Examples: identity (Gaussian), logit (Binomial), log (Poisson).",
    logit: "The log-odds link function: logit(p) = log(p/(1-p)). Used for binary outcomes. Maps probabilities (0-1) to (-∞, +∞).",
    odds_ratio: "The ratio of odds for two groups. OR > 1 indicates increased odds; OR < 1 indicates decreased odds. Calculated as exp(coefficient) in logistic regression.",
    coefficient: "The estimated effect of a predictor on the linear predictor scale. For logistic regression, exp(coefficient) gives the odds ratio.",
    pseudo_r2: "An analog to R² for GLMs. McFadden's pseudo R² compares the fitted model to a null model. Values 0.2-0.4 typically indicate good fit.",
    aic: "Akaike Information Criterion. Balances model fit and complexity. Lower values indicate better models. Used for model comparison.",
    bic: "Bayesian Information Criterion. Similar to AIC but penalizes complexity more heavily. Preferred for larger samples.",
    deviance: "A measure of goodness of fit comparing the fitted model to a saturated model. Lower deviance indicates better fit.",
    log_likelihood: "The log of the likelihood function at the maximum likelihood estimates. Higher (less negative) values indicate better fit.",
    maximum_likelihood: "The estimation method for GLMs. Finds parameter values that maximize the probability of observing the data.",
    confidence_interval: "A range of plausible values for the true coefficient. 95% CI means we're 95% confident the true value lies within this range.",
    p_value: "The probability of observing this coefficient (or more extreme) if the true effect is zero. p < 0.05 is typically considered significant.",
    overdispersion: "When variance exceeds what's expected under the assumed distribution. Common in Poisson models. May require quasi-Poisson or negative binomial.",
    rate_ratio: "For Poisson models, exp(coefficient) gives the multiplicative change in the expected count for a one-unit increase in the predictor."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        GLM Statistical Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in Generalized Linear Models
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(glmMetricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold uppercase text-xs tracking-wide">
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

// GLM Analysis Guide Component
const GlmGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Generalized Linear Models Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is GLM */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Scaling className="w-4 h-4" />
                What is a Generalized Linear Model?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                GLM is a <strong>flexible extension of linear regression</strong> that can handle outcomes 
                that aren&apos;t normally distributed. It uses a <strong>link function</strong> to connect 
                predictors to different types of outcomes.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Insight:</strong> While linear regression assumes Y is continuous and normally distributed, 
                  GLM can model binary outcomes (yes/no), counts, proportions, and more.
                </p>
              </div>
            </div>

            <Separator />

            {/* Choosing a Family */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Choosing the Right Family
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Gaussian (identity link)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Use when:</strong> Outcome is continuous (e.g., income, temperature, scores).
                    <br/>Same as ordinary linear regression.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Binomial (logit link) — Logistic Regression</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Use when:</strong> Outcome is binary (yes/no, 0/1, success/failure).
                    <br/>Coefficients interpreted as log-odds; exp(coef) = odds ratio.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Poisson (log link)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Use when:</strong> Outcome is a count (e.g., number of events, visits, accidents).
                    <br/>exp(coef) = rate ratio (multiplicative effect on count).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Gamma (log link)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Use when:</strong> Outcome is continuous but right-skewed and always positive 
                    (e.g., costs, durations, insurance claims).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Coefficients */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Interpreting Coefficients
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Gaussian (identity)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coefficient = direct change in Y for 1-unit increase in X.
                    <br/><strong>Example:</strong> β = 2.5 means Y increases by 2.5 units when X increases by 1.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Binomial (logit) — Most Common</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coefficient = change in log-odds. <strong>exp(coef) = Odds Ratio (OR)</strong>
                    <br/><strong>OR &gt; 1:</strong> Higher odds of outcome
                    <br/><strong>OR &lt; 1:</strong> Lower odds of outcome
                    <br/><strong>OR = 1:</strong> No effect
                    <br/><strong>Example:</strong> OR = 1.5 means 50% higher odds per 1-unit increase.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Poisson (log)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    exp(coef) = Rate Ratio (RR). Multiplier on expected count.
                    <br/><strong>Example:</strong> RR = 1.2 means 20% more events per 1-unit increase in X.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Model Fit Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Model Fit Metrics
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Pseudo R²</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analog to R² for GLMs. Compares fitted model to null model.
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">&lt; 0.10</p>
                      <p className="text-muted-foreground">Weak</p>
                    </div>
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">0.10-0.20</p>
                      <p className="text-muted-foreground">Moderate</p>
                    </div>
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">0.20-0.40</p>
                      <p className="text-muted-foreground">Good</p>
                    </div>
                    <div className="p-2 rounded bg-muted border border-border text-center">
                      <p className="font-medium">&gt; 0.40</p>
                      <p className="text-muted-foreground">Excellent</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">AIC / BIC</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Information criteria for model comparison. <strong>Lower is better.</strong>
                    <br/>AIC: Balances fit and complexity.
                    <br/>BIC: Penalizes complexity more (prefer simpler models).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Deviance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures lack of fit compared to saturated model. Lower = better fit.
                    Large deviance relative to degrees of freedom may indicate poor fit.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Issues */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Issues
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Overdispersion (Poisson)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When variance exceeds the mean (Poisson assumes they&apos;re equal).
                    <br/><strong>Solution:</strong> Use quasi-Poisson or negative binomial.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Complete Separation (Logistic)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a predictor perfectly predicts the outcome. Causes infinite coefficients.
                    <br/><strong>Solution:</strong> Remove predictor or use penalized regression.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Multicollinearity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Highly correlated predictors inflate standard errors.
                    <br/><strong>Solution:</strong> Remove redundant predictors or use VIF diagnostics.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* When to Use GLM */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                When to Use GLM vs Linear Regression
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Use GLM When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Outcome is binary (0/1)</li>
                    <li>• Outcome is a count (0, 1, 2, ...)</li>
                    <li>• Outcome is always positive and skewed</li>
                    <li>• Variance depends on the mean</li>
                    <li>• Need interpretable odds/rate ratios</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Stick with Linear Regression When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Outcome is continuous and ~normal</li>
                    <li>• Residuals are reasonably symmetric</li>
                    <li>• Variance is approximately constant</li>
                    <li>• Simple interpretation is priority</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> GLM is a <strong>powerful framework</strong> 
                that unifies many regression types. The key is choosing the right family and link function 
                for your outcome variable. When in doubt, plot your data and residuals!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const glmExample = exampleDatasets.find(d => d.id === 'admission-data');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Scaling className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Generalized Linear Models</CardTitle>
                    <CardDescription className="text-base mt-2">Flexible extension of linear regression for various outcome distributions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Scaling className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Multiple Distributions</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Model binary, count, or continuous outcomes using appropriate distributions</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Link Functions</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Connect linear predictors to outcome variables via link functions</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><CheckCircle className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Interpretable Results</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Clear coefficient interpretation with odds ratios for logistic models</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">GLMs extend standard linear regression to handle different types of dependent variables using link functions.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Required Setup</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Model family:</strong> Choose distribution</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Link function:</strong> Set automatically or customize</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Variables:</strong> Target and predictor features</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Understanding Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Coefficients:</strong> Effect sizes and significance</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>AIC/BIC:</strong> Model comparison (lower = better)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Pseudo R²:</strong> Variance explained</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {glmExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(glmExample)} size="lg"><TrendingUp className="mr-2" />Load Admission Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface GlmPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GlmPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: GlmPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [family, setFamily] = useState('gaussian');
    const [linkFunction, setLinkFunction] = useState<string | undefined>();
    const [targetVar, setTargetVar] = useState<string>('');
    const [features, setFeatures] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<GlmResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    const targetOptions = useMemo(() => {
        const binaryCategoricalHeaders = categoricalHeaders.filter(h => {
            const uniqueValues = new Set(data.map(row => row[h]));
            return uniqueValues.size === 2;
        });
        if (family === 'binomial') return [...binaryCategoricalHeaders];
        return numericHeaders;
    }, [family, numericHeaders, categoricalHeaders, data]);
    
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== targetVar), [allHeaders, targetVar]);

    const linkFunctionOptions = useMemo(() => {
        switch (family) {
            case 'binomial': return ['logit', 'probit', 'cloglog', 'log'];
            case 'gamma': return ['log', 'inverse_power'];
            case 'gaussian': return ['identity', 'log'];
            default: return [];
        }
    }, [family]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Target variable selected', passed: targetVar !== '', detail: targetVar ? `Target: ${targetVar}` : 'Please select a target variable' });
        checks.push({ label: 'Feature variables selected', passed: features.length >= 1, detail: features.length >= 1 ? `${features.length} features selected` : 'Select at least one feature' });
        checks.push({ label: 'Sufficient sample size', passed: data.length >= 30, detail: `n = ${data.length} observations (minimum: 30)` });
        if (features.length > 0) {
            const ratio = Math.floor(data.length / features.length);
            checks.push({ label: 'Observations per predictor', passed: ratio >= 10, detail: `${ratio} observations per predictor (recommended: 10+)` });
        }
        return checks;
    }, [data, targetVar, features]);

    const allValidationsPassed = useMemo(() => {
        const criticalChecks = dataValidation.filter(c => c.label === 'Target variable selected' || c.label === 'Feature variables selected');
        return criticalChecks.every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0) {
            setView('intro');
        } else if (canRun) {
            const newTarget = targetOptions[0] || '';
            if (!targetVar) setTargetVar(newTarget);
            if (features.length === 0) setFeatures(allHeaders.filter(h => h !== newTarget));
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, allHeaders, targetOptions, canRun]);

    useEffect(() => {
        if (linkFunctionOptions.length > 0 && !linkFunctionOptions.includes(linkFunction || '')) {
            setLinkFunction(linkFunctionOptions[0]);
        } else if (linkFunctionOptions.length === 0) {
            setLinkFunction(undefined);
        }
    }, [linkFunctionOptions, linkFunction]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true); toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `GLM_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image; link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const results = analysisResult;
        let csvContent = "GENERALIZED LINEAR MODEL RESULTS\n";
        csvContent += `Target: ${targetVar}\nFamily: ${family}\nLink: ${linkFunction || 'default'}\n\n`;
        const fitData = [{ Statistic: 'Pseudo R²', Value: results.pseudo_r2 }, { Statistic: 'AIC', Value: results.aic }, { Statistic: 'BIC', Value: results.bic }];
        csvContent += "MODEL FIT\n" + Papa.unparse(fitData) + "\n\n";
        const coeffData = results.coefficients.map(c => ({ Variable: c.variable.replace(/Q\("([^"]+)"\)/g, '$1'), Coefficient: c.coefficient, P_Value: c.p_value }));
        csvContent += "COEFFICIENTS\n" + Papa.unparse(coeffData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `GLM_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: 'Download Started' });
    }, [analysisResult, targetVar, family, linkFunction, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/glm-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult, targetVar, features, family, linkFunction, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `GLM_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetVar, features, family, linkFunction, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetVar || features.length === 0) { toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select variables.' }); return; }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/glm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target_var: targetVar, features, family, link_function: linkFunction })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            const result: GlmResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) {
            console.error('GLM Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, features, family, linkFunction, toast]);

    const mainSummaryData = useMemo(() => {
        if (!analysisResult?.model_summary_data?.[0]?.data) return [];
        const summaryTable = analysisResult.model_summary_data[0].data;
        const items = [];
        const cleanValue = (val: string) => val.replace(/Q\("([^"]+)"\)/g, '$1');
        for (let i = 0; i < summaryTable.length; i++) {
            for (let j = 0; j < summaryTable[i].length; j += 2) {
                const key = summaryTable[i][j].replace(':', '');
                const value = summaryTable[i][j+1];
                if (key && value && key.trim() !== '') {
                    items.push({ key: key.trim(), value: cleanValue(value.trim()) });
                }
            }
        }
        return items;
    }, [analysisResult]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult;
    const significantCoefficients = results?.coefficients.filter(c => c.p_value < 0.05) || [];
    const pseudoR2 = results?.pseudo_r2 || 0;

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
        <h1 className="text-2xl font-bold">Generalized Linear Models</h1>
        <p className="text-muted-foreground mt-1">Flexible modeling for various outcome distributions</p>
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
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose your target and feature variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Target Variable</Label>
                                    <Select value={targetVar} onValueChange={setTargetVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select target" /></SelectTrigger>
                                        <SelectContent>{targetOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Feature Variables</Label>
                                    <ScrollArea className="h-40 border rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {featureOptions.map(h => (
                                                <div key={h} className="flex items-center space-x-2">
                                                    <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, !!c)} />
                                                    <label htmlFor={`feat-${h}`} className="text-sm cursor-pointer">{h}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <p className="text-xs text-muted-foreground">{features.length} features selected</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure GLM family and link function</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Model Family</Label>
                                    <Select value={family} onValueChange={setFamily}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gaussian">Gaussian (Linear)</SelectItem>
                                            <SelectItem value="binomial">Binomial (Logit/Probit)</SelectItem>
                                            <SelectItem value="poisson">Poisson (Count)</SelectItem>
                                            <SelectItem value="gamma">Gamma (Skewed)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {linkFunctionOptions.length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Link Function</Label>
                                        <Select value={linkFunction} onValueChange={setLinkFunction}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>{linkFunctionOptions.map(link => <SelectItem key={link} value={link}>{link}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Model Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Target:</strong> {targetVar || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Features:</strong> {features.length > 0 ? features.join(', ') : 'None'}</p>
                                    <p>• <strong className="text-foreground">Family:</strong> {family}</p>
                                    <p>• <strong className="text-foreground">Link:</strong> {linkFunction || 'default'}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Scaling className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">{family} GLM with {linkFunction || 'default'} link will be fitted using maximum likelihood.</p>
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

                {currentStep === 4 && results && (() => {
                    const hasSignificant = significantCoefficients.length > 0;
                    const explainedPct = (pseudoR2 * 100).toFixed(0);
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings about predicting {targetVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${hasSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${hasSignificant ? 'text-primary' : 'text-rose-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${hasSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">Your model explains approximately <strong>{explainedPct}%</strong> of the variation in <strong>{targetVar}</strong>.</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${hasSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">{hasSignificant ? <><strong>{significantCoefficients.length}</strong> predictor{significantCoefficients.length > 1 ? 's have' : ' has'} significant influence on {targetVar}.</> : `No predictors show significant influence on ${targetVar}.`}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${hasSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">Model family: <strong>{family}</strong> with <strong>{linkFunction || 'default'}</strong> link function.</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${hasSignificant && pseudoR2 >= 0.1 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {hasSignificant && pseudoR2 >= 0.1 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-rose-600" />}
                                        <div>
                                            <p className="font-semibold">{pseudoR2 >= 0.2 ? "Good Model Fit!" : pseudoR2 >= 0.1 ? "Moderate Fit" : "Weak Model"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{pseudoR2 >= 0.2 ? "The model captures meaningful patterns in the data." : pseudoR2 >= 0.1 ? "The model explains some variation. Consider additional predictors." : "The current predictors don't explain much variation. Try different variables."}</p>
                                        </div>
                                    </div>
                                </div>
                                <StatisticalSummaryCards results={results} />
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Model Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => (<span key={star} className={`text-lg ${(pseudoR2 >= 0.40 && star <= 5) || (pseudoR2 >= 0.20 && star <= 4) || (pseudoR2 >= 0.10 && star <= 3) || (pseudoR2 >= 0.05 && star <= 2) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>))}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const topPredictors = significantCoefficients.slice(0, 3);
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of GLM results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div><h4 className="font-semibold mb-1">What GLM Does</h4><p className="text-sm text-muted-foreground">GLM extends linear regression to handle different types of outcomes. The <strong className="text-foreground">{family}</strong> family with <strong className="text-foreground">{linkFunction || 'default'}</strong> link is appropriate for your data type.</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div><h4 className="font-semibold mb-1">What We Found</h4><p className="text-sm text-muted-foreground">{significantCoefficients.length > 0 ? (<>The significant predictors are: <strong className="text-foreground">{topPredictors.map(c => c.variable.replace(/Q\("([^"]+)"\)/g, '$1')).join(', ')}</strong>{significantCoefficients.length > 3 && ` and ${significantCoefficients.length - 3} more`}.</>) : (<>No predictors reached statistical significance. The relationship between predictors and {targetVar} may be weak or require more data.</>)}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div><h4 className="font-semibold mb-1">How to Interpret Coefficients</h4><p className="text-sm text-muted-foreground">{family === 'binomial' ? (<>For logistic models, exp(coefficient) gives the <strong className="text-foreground">odds ratio</strong>. An OR &gt; 1 means higher odds of the outcome; OR &lt; 1 means lower odds.</>) : family === 'poisson' ? (<>For count models, exp(coefficient) gives the <strong className="text-foreground">rate ratio</strong>. A one-unit increase in the predictor multiplies the expected count by this factor.</>) : (<>For linear models, coefficients show the change in {targetVar} for a one-unit increase in each predictor, holding others constant.</>)}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div><h4 className="font-semibold mb-1">Model Comparison</h4><p className="text-sm text-muted-foreground">AIC = <strong className="text-foreground">{results.aic.toFixed(1)}</strong>, BIC = <strong className="text-foreground">{results.bic.toFixed(1)}</strong>. Lower values indicate better fit when comparing different models for the same data.</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${significantCoefficients.length > 0 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">{significantCoefficients.length > 0 ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Useful Model</> : <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: Needs More Work</>}</h4>
                                    <p className="text-sm text-muted-foreground">{significantCoefficients.length > 0 ? `You've identified ${significantCoefficients.length} significant predictor${significantCoefficients.length > 1 ? 's' : ''} for ${targetVar}. Focus on these for decision-making.` : `Consider trying different predictors, collecting more data, or checking if the model family is appropriate.`}</p>
                                </div>
                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Pseudo R² Interpretation</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;10%</p><p className="text-muted-foreground">Weak</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">10-20%</p><p className="text-muted-foreground">Moderate</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">20-40%</p><p className="text-muted-foreground">Good</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;40%</p><p className="text-muted-foreground">Excellent</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (() => {
                    const n = data.length;
                    return (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Generalized Linear Model Report</h2><p className="text-sm text-muted-foreground mt-1">{targetVar} | Family: {family} | Link: {linkFunction || 'default'} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">A generalized linear model with {family} distribution and {linkFunction || 'default'} link function was fitted to predict {targetVar} from {features.length} predictor{features.length > 1 ? 's' : ''}. The sample included <em>N</em> = {n} observations.</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">The model achieved a pseudo <span className="font-mono"><em>R</em>² = {pseudoR2.toFixed(4)}</span>, indicating {getPseudoR2Interpretation(pseudoR2).desc}. Model comparison criteria were <span className="font-mono">AIC = {results.aic.toFixed(2)}</span> and <span className="font-mono">BIC = {results.bic.toFixed(2)}</span>. The log-likelihood was {results.log_likelihood.toFixed(2)} with deviance of {results.deviance.toFixed(2)}.</p>
                                        {significantCoefficients.length > 0 && (
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {significantCoefficients.slice(0, 3).map((c, idx) => {
                                                    const varName = c.variable.replace(/Q\("([^"]+)"\)/g, '$1');
                                                    return (<span key={c.variable}>{idx > 0 && ' '}{varName} was a significant predictor, <span className="font-mono"><em>b</em> = {c.coefficient.toFixed(3)}, <em>p</em> {c.p_value < 0.001 ? '< .001' : `= ${c.p_value.toFixed(3)}`}, 95% CI [{c.conf_int_lower.toFixed(3)}, {c.conf_int_upper.toFixed(3)}]</span>.</span>);
                                                })}
                                                {significantCoefficients.length > 3 && ` An additional ${significantCoefficients.length - 3} predictor${significantCoefficients.length - 3 > 1 ? 's were' : ' was'} also significant.`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Coefficients</CardTitle><CardDescription>Effect estimates with confidence intervals</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            <TableHead className="text-right">Coefficient</TableHead>
                                            {results.family !== 'gaussian' && <TableHead className="text-right">Exp(Coef)</TableHead>}
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">95% CI</TableHead>
                                            <TableHead className="text-center">Sig.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.coefficients.map(c => {
                                            const isSignificant = c.p_value < 0.05;
                                            return (
                                                <TableRow key={c.variable}>
                                                    <TableCell className="font-medium">{c.variable.replace(/Q\("([^"]+)"\)/g, '$1')}</TableCell>
                                                    <TableCell className="font-mono text-right">{c.coefficient.toFixed(4)}</TableCell>
                                                    {results.family !== 'gaussian' && <TableCell className="font-mono text-right">{c.exp_coefficient?.toFixed(4)}</TableCell>}
                                                    <TableCell className="font-mono text-right">{c.p_value < 0.001 ? '<.001' : c.p_value.toFixed(4)}{getSignificanceStars(c.p_value)}</TableCell>
                                                    <TableCell className="font-mono text-right text-xs">[{c.conf_int_lower.toFixed(3)}, {c.conf_int_upper.toFixed(3)}]</TableCell>
                                                    <TableCell className="text-center"><Badge variant={isSignificant ? "default" : "secondary"}>{isSignificant ? "Yes" : "No"}</Badge></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">*** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05{family === 'binomial' && ' | Exp(Coef) = Odds Ratio'}</p></CardFooter>
                        </Card>

                        {mainSummaryData.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Model Information</CardTitle></CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
                                        {mainSummaryData.map(item => (
                                            <div key={item.key} className="flex justify-between border-b py-1">
                                                <dt className="text-muted-foreground">{item.key}</dt>
                                                <dd className="font-mono">{item.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </CardContent>
                            </Card>
                        )}

                        {results.model_summary_data?.[1] && (
                            <Card>
                                <CardHeader><CardTitle>Detailed Coefficient Table</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {results.model_summary_data[1].data[0].map((header, i) => (
                                                    <TableHead key={i} className={i > 0 ? "text-right" : ""}>{header}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.model_summary_data[1].data.slice(1).map((row, i) => (
                                                <TableRow key={i}>
                                                    {row.map((cell, j) => (
                                                        <TableCell key={j} className={`font-mono ${j > 0 ? "text-right" : ""}`}>{cell.replace(/Q\("([^"]+)"\)/g, '$1')}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>

            <GlmGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
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