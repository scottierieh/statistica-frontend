'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import Image from 'next/image';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import {
    Loader2, AlertTriangle, Layers, HelpCircle, TrendingUp, CheckCircle, Target, Lightbulb, BarChart3, BookOpen, Activity, Filter, Info, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Play, Code, Copy, Settings, FileSearch
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// Firebase Storage URL for ANCOVA Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/ancova_improved.py?alt=media";

const metricDefinitions: Record<string, string> = {
    "ANCOVA": "Analysis of Covariance combines ANOVA and regression. Tests group differences while statistically controlling for continuous covariates. Increases statistical power by reducing error variance.",
    "Covariate": "Continuous variable correlated with the dependent variable but not of primary interest. Statistically controlled to reduce error variance and increase precision of group comparisons.",
    "Adjusted Means": "Group means after statistically removing the effect of covariates. Represents what group means would be if all groups had the same covariate values.",
    "F-Statistic": "Ratio of between-group variance to within-group (error) variance after adjusting for covariates. Larger F indicates stronger evidence of group differences.",
    "P-Value": "Probability of obtaining results at least as extreme if groups truly don't differ (after covariate adjustment). p < .05 indicates statistical significance.",
    "Partial Eta-Squared (η²p)": "Proportion of variance in DV explained by IV, excluding variance explained by covariates. 0.01 = small, 0.06 = medium, 0.14 = large effect.",
    "Homogeneity of Regression Slopes": "Assumption that relationship between covariate and DV is the same across all groups. Interaction between group and covariate should be non-significant.",
    "Linearity": "Assumption that relationship between covariate and dependent variable is linear. Assessed via scatterplots. Violations reduce statistical power and can bias results.",
    "Independence of Covariate and IV": "Covariate should not be affected by the independent variable. Ideally measured before group assignment. Violations can lead to spurious results.",
    "Homogeneity of Variance": "Assumption that groups have equal variances on the dependent variable. Tested by Levene's test. ANCOVA is robust to moderate violations with equal sample sizes.",
    "Normality": "Residuals (not raw scores) should be normally distributed within each group. Assessed via Q-Q plots or Shapiro-Wilk test. ANCOVA is robust with n > 30 per group.",
    "Type I Sum of Squares": "Sequential sum of squares. Order of terms matters. Each effect adjusted only for terms entered before it. Rarely used in ANCOVA.",
    "Type II Sum of Squares": "Each main effect adjusted for other main effects but not interactions. Appropriate when no significant interactions exist.",
    "Type III Sum of Squares": "Each effect adjusted for all other effects including interactions. Default in most software. Appropriate for unbalanced designs or when testing interactions.",
    "Adjusted R-Squared": "Proportion of variance in DV explained by model (groups + covariates), adjusted for number of predictors. Accounts for model complexity.",
    "Regression Coefficient (β)": "Change in DV for one-unit increase in covariate, holding group constant. Indicates strength of covariate-DV relationship.",
    "Levene's Test": "Tests homogeneity of variance assumption. Non-significant (p > .05) indicates assumption is met. Very sensitive with large samples.",
    "Residual": "Difference between observed and predicted DV value. Should be normally distributed and have equal variance across groups for valid ANCOVA.",
    "Statistical Power": "Probability of detecting true group differences. ANCOVA increases power by removing covariate variance from error term. Gain depends on covariate-DV correlation.",
    "Effect Size": "Standardized measure of group difference magnitude. Unlike p-values, independent of sample size. Indicates practical significance beyond statistical significance.",
    "Bonferroni Correction": "Adjusts significance level for multiple pairwise comparisons. Divides alpha by number of tests. Controls family-wise error rate but reduces power.",
    "Pairwise Comparisons": "Follow-up tests comparing adjusted means between specific group pairs. Essential after significant omnibus test to identify which groups differ.",
    "Covariate Adjustment": "Statistical process of removing covariate effects from DV before comparing groups. Equivalent to comparing groups at the same covariate value.",
    "ANCOVA vs ANOVA": "ANCOVA controls for covariates, ANOVA does not. ANCOVA has greater power if covariate correlates with DV. Use ANCOVA when you have relevant continuous predictors.",
    "ANCOVA vs Regression": "Both use regression framework. ANCOVA focuses on categorical predictors (groups) while controlling continuous variables. Regression treats all predictors equally.",
    "Baseline Control": "Using pretest/baseline as covariate in pre-post designs. Accounts for initial individual differences. More powerful than simple change scores.",
    "Propensity Score": "Probability of group membership based on observed characteristics. Can be used as covariate to reduce selection bias in quasi-experimental designs.",
    "Interaction Term": "Tests whether covariate-DV relationship differs across groups. Significant interaction violates homogeneity of slopes assumption, invalidating standard ANCOVA.",
    "Grand Mean": "Overall average of DV across all subjects and groups. Used as reference point in calculating sum of squares and effect sizes.",
    "Error Term": "Residual variance not explained by groups or covariates. Smaller error = greater statistical power. ANCOVA reduces error by removing covariate variance.",
    "Degrees of Freedom": "Number of independent values free to vary. df(error) reduces by 1 for each covariate added. Affects critical F-value and statistical power.",
    "Multiple Covariates": "ANCOVA can include multiple covariates simultaneously. Each additional covariate removes more error variance but costs degrees of freedom. Use only theoretically justified covariates."
};



interface AnovaRow { 
    Source: string; 
    sum_sq: number; 
    df: number; 
    F: number; 
    'p-value': number; 
    'η²p': number; 
}

interface AssumptionResult { 
    met: boolean; 
    p_value: number; 
    statistic: number; 
}

interface HomogeneityOfSlopesResult {
    testable: boolean;
    test_results?: { [key: string]: { F_statistic: number | null; p_value: number | null; significant: boolean | null; } };
    assumption_met: boolean | null;
    interpretation: string;
    critical_warning?: boolean;
}

interface MulticollinearityResult {
    variable: string;
    VIF: number | null;
    interpretation: string;
    severity: string;
}

interface AncovaResults { 
    homogeneity_of_slopes?: HomogeneityOfSlopesResult;
    multicollinearity?: MulticollinearityResult[] | null;
    anova_table: AnovaRow[]; 
    assumptions: { 
        normality: AssumptionResult; 
        homogeneity?: AssumptionResult;
        homoscedasticity?: AssumptionResult;
        independence?: { durbin_watson: number; met: boolean; interpretation: string; };
        outliers?: { n_outliers: number; percent: number; met: boolean; };
    }; 
    interpretation: string; 
    n_dropped?: number; 
    adjusted_means?: { 
        [group: string]: { 
            adjusted_mean: number; 
            se: number; 
            n: number; 
            ci_lower?: number;
            ci_upper?: number;
        }; 
    }; 
    covariate_info?: { 
        [covariate: string]: { 
            coefficient: number; 
            std_err: number; 
            t_value: number; 
            p_value: number; 
        }; 
    }; 
    r_squared?: number; 
    adj_r_squared?: number; 
}

interface FullAnalysisResponse { 
    results: AncovaResults; 
    plot: string;
    warnings?: string[];
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [
    { id: 1, label: 'Variables' }, 
    { id: 2, label: 'Settings' }, 
    { id: 3, label: 'Validation' }, 
    { id: 4, label: 'Summary' }, 
    { id: 5, label: 'Reasoning' }, 
    { id: 6, label: 'Statistics' }
];

const getEffectSizeInterpretation = (eta: number) => eta >= 0.14 ? 'Large' : eta >= 0.06 ? 'Medium' : eta >= 0.01 ? 'Small' : 'Negligible';

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
        link.download = 'ancova_improved.py';
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
                        Python Code - ANCOVA Analysis
                    </DialogTitle>
                    <DialogDescription>
                        View, copy, or download the improved ANCOVA Python code with homogeneity of slopes testing.
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

// ANCOVA Analysis Guide Component
const AncovaGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">ANCOVA Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is ANCOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                What is ANCOVA?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                ANCOVA (Analysis of Covariance) combines <strong>ANOVA and regression</strong>. It tests 
                group differences on a continuous outcome while <strong>statistically controlling for 
                continuous covariates</strong>. This increases statistical power and helps eliminate confounding.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Common Use Cases:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Pre-post designs: Control for baseline scores<br/>
                    • Treatment studies: Remove effects of confounding variables<br/>
                    • Educational research: Control for prior achievement<br/>
                    • Medical studies: Adjust for age, weight, or other demographics
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* ANCOVA vs ANOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                ANCOVA vs ANOVA
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">ANOVA</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Tests group differences only</li>
                    <li>• No control for other variables</li>
                    <li>• All variance attributed to groups + error</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">ANCOVA</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Tests group differences after controlling covariates</li>
                    <li>• Removes covariate effects from analysis</li>
                    <li>• Reduces error variance → more power</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Statistics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Key Statistics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">F-Statistic & P-value</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if groups differ <strong>after removing covariate effects</strong>.
                    <br/><strong>p &lt; 0.05:</strong> Significant group differences remain after adjustment
                    <br/><strong>p ≥ 0.05:</strong> No significant differences after adjustment
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Partial Eta-Squared (η²p) — Effect Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of variance explained by groups, <strong>excluding covariate variance</strong>.
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&lt;0.01</p>
                      <p className="text-muted-foreground">Negligible</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.01-0.06</p>
                      <p className="text-muted-foreground">Small</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.06-0.14</p>
                      <p className="text-muted-foreground">Medium</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&gt;0.14</p>
                      <p className="text-muted-foreground">Large</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Adjusted Means</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Group means <strong>after statistically removing covariate effects</strong>.
                    <br/>Represents what means would be if all groups had equal covariate values.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">R² (Model Fit)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total variance explained by the complete model (groups + covariates).
                    <br/>Higher R² indicates better overall model fit.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Critical Assumption */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Assumption: Homogeneity of Regression Slopes
              </h3>
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Most Important Assumption</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The relationship between covariate and outcome must be <strong>the same across all groups</strong>.
                  <br/><br/>
                  <strong>If violated:</strong> Standard ANCOVA is inappropriate. The covariate affects groups 
                  differently, meaning you cannot simply &quot;adjust&quot; for it. Consider:
                  <br/>• Running separate analyses per group
                  <br/>• Using moderation analysis instead
                  <br/>• Including interaction terms
                </p>
              </div>
            </div>

            <Separator />

            {/* Other Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Other Assumptions
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">1. Independence of Covariate and IV</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The covariate should NOT be affected by group membership.
                    <br/>Ideally, measure covariate before group assignment (e.g., pretest before treatment).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Linearity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Relationship between covariate and DV should be linear.
                    <br/>Check with scatterplots. Violations reduce power.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">3. Normality of Residuals</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Residuals (not raw scores) should be normally distributed.
                    <br/><strong>However:</strong> Robust with n ≥ 30 per group.
                    <br/><strong>Check:</strong> Shapiro-Wilk test (p &gt; 0.05 = assumption met)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">4. Homogeneity of Variance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Groups should have equal variances on the DV.
                    <br/><strong>Check:</strong> Levene&apos;s test (p &gt; 0.05 = assumption met)
                    <br/>ANCOVA is robust to moderate violations with equal sample sizes.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Covariate Selection */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Choosing Covariates
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Good Covariates</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Strongly correlated with DV</li>
                    <li>• Measured before treatment/grouping</li>
                    <li>• Theoretically justified</li>
                    <li>• Not collinear with other covariates</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Avoid as Covariates</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Variables affected by treatment</li>
                    <li>• Mediators of the effect</li>
                    <li>• Variables with no DV correlation</li>
                    <li>• Too many covariates (loses df)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-muted/50 border border-border text-xs text-muted-foreground">
                <strong>Rule of thumb:</strong> Each covariate costs 1 degree of freedom. Use only covariates 
                that correlate r ≥ 0.3 with the DV.
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
                    <li>• Verify covariate measured before treatment</li>
                    <li>• Check covariate-DV correlation</li>
                    <li>• Test homogeneity of slopes FIRST</li>
                    <li>• Check for multicollinearity (VIF &lt; 5)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA Style)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• State covariates used</li>
                    <li>• Report homogeneity of slopes test</li>
                    <li>• <em>F</em>(df<sub>b</sub>, df<sub>e</sub>) = X.XX, <em>p</em> = .XXX, η²p = .XX</li>
                    <li>• Include adjusted means with SE/CI</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Using post-treatment measures as covariates</li>
                    <li>• Ignoring homogeneity of slopes</li>
                    <li>• Adding irrelevant covariates</li>
                    <li>• Confusing adjusted with raw means</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Covariate affected by treatment → wrong model</li>
                    <li>• Slopes differ across groups → moderation</li>
                    <li>• No covariate-DV correlation → use ANOVA</li>
                    <li>• Categorical covariate → use factorial ANOVA</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> ANCOVA is only valid when the 
                <strong> homogeneity of regression slopes</strong> assumption is met. Always test this 
                first! Report adjusted means (not raw means) when discussing group differences. The 
                covariate should be measured <strong>before</strong> group assignment to avoid bias.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const ancovaExample = exampleDatasets.find(d => d.id === 'manova-groups');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">ANCOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Analysis of Covariance - Control for continuous covariates
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Filter className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Statistical Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Remove covariate effects from analysis
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Increased Power</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reduce error variance for better detection
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Confound Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Eliminate confounding variables
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
                            Test group differences on a continuous outcome while statistically controlling for continuous covariates.
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
                                        <span><strong>Dependent variable:</strong> Continuous numeric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Factor:</strong> Categorical grouping variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Covariate(s):</strong> Continuous control variables</span>
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
                                        <span><strong>F-statistic:</strong> Group effect after control</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Adjusted means:</strong> Group means controlling for covariates</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Effect size (η²p):</strong> Partial eta squared</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {ancovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(ancovaExample)} size="lg">
                                <Layers className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        ANCOVA Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in Analysis of Covariance
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
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


interface AncovaPageProps { 
    data: DataSet; 
    numericHeaders: string[]; 
    categoricalHeaders: string[]; 
    onLoadExample: (example: ExampleDataSet) => void; 
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;  
}

export default function AncovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onGenerateReport }: AncovaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVar, setDependentVar] = useState('');
    const [factorVar, setFactorVar] = useState('');
    const [covariateVars, setCovariateVars] = useState<string[]>([]);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Python code modal state
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);
    const availableNumeric = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    const numGroups = useMemo(() => { 
        if (!factorVar || data.length === 0) return 0; 
        return new Set(data.map(row => row[factorVar]).filter(v => v != null && v !== '')).size; 
    }, [data, factorVar]);

    const dataValidation = useMemo(() => [
        { label: 'Dependent variable selected', passed: dependentVar !== '', detail: dependentVar || 'Select a dependent variable' },
        { label: 'Factor selected', passed: factorVar !== '', detail: factorVar ? `${factorVar} (${numGroups} groups)` : 'Select a factor' },
        { label: 'At least one covariate', passed: covariateVars.length > 0, detail: covariateVars.length > 0 ? covariateVars.join(', ') : 'Select covariate(s)' },
        { label: 'At least 2 groups', passed: numGroups >= 2, detail: `${numGroups} groups found` },
        { label: 'Adequate sample size', passed: data.length >= 20, detail: `n = ${data.length}` }
    ], [dependentVar, factorVar, covariateVars, numGroups, data]);

    const allValidationsPassed = useMemo(() => dataValidation.filter(c => c.label !== 'Adequate sample size').every(check => check.passed), [dataValidation]);

    useEffect(() => {
        if (data.length === 0 || !canRun) { 
            setView('intro'); 
        } else {
            setDependentVar(numericHeaders.find(h => h.toLowerCase().includes('score')) || numericHeaders[0] || '');
            setFactorVar(categoricalHeaders[0] || '');
            const initialCov = numericHeaders.filter(h => h !== (numericHeaders.find(h => h.toLowerCase().includes('score')) || numericHeaders[0]));
            setCovariateVars(initialCov.length > 0 ? [initialCov[0]] : []);
            setView('main'); 
            setAnalysisResponse(null); 
            setCurrentStep(1); 
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const goToStep = (step: Step) => { 
        setCurrentStep(step); 
        if (step > maxReachedStep) setMaxReachedStep(step); 
    };
    const nextStep = () => { 
        if (currentStep < 6) goToStep((currentStep + 1) as Step); 
    };
    const prevStep = () => { 
        if (currentStep > 1) goToStep((currentStep - 1) as Step); 
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return; 
        setIsDownloading(true);
        try { 
            const canvas = await html2canvas(resultsRef.current, { scale: 2, backgroundColor: '#ffffff' }); 
            const link = document.createElement('a'); 
            link.download = `ANCOVA_${new Date().toISOString().split('T')[0]}.png`; 
            link.href = canvas.toDataURL(); 
            link.click(); 
        } catch { 
            toast({ variant: 'destructive', title: 'Download failed' }); 
        } finally { 
            setIsDownloading(false); 
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResponse?.results) return;
        const anovaData = analysisResponse.results.anova_table.map(row => ({ 
            Source: row.Source, 
            SS: row.sum_sq, 
            df: row.df, 
            F: row.F, 
            p: row['p-value'], 
            eta_sq_p: row['η²p'] 
        }));
        const csv = Papa.unparse(anovaData);
        const blob = new Blob([csv], { type: 'text/csv' }); 
        const link = document.createElement('a'); 
        link.href = URL.createObjectURL(blob); 
        link.download = `ANCOVA_${new Date().toISOString().split('T')[0]}.csv`; 
        link.click();
    }, [analysisResponse]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorVar || covariateVars.length === 0) { 
            toast({ variant: 'destructive', title: 'Select all required variables.' }); 
            return; 
        }
        setIsLoading(true); 
        setAnalysisResponse(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/ancova`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    dependentVar, 
                    factorVar, 
                    covariateVars,
                    alpha: 0.05,
                    performPosthoc: false
                })
            });
            if (!res.ok) { 
                const err = await res.json(); 
                throw new Error(err.detail || 'Failed'); 
            }
            setAnalysisResponse(await res.json()); 
            goToStep(4);
        } catch (e: any) { 
            toast({ variant: 'destructive', title: 'Error', description: e.message }); 
        } finally { 
            setIsLoading(false); 
        }
    }, [data, dependentVar, factorVar, covariateVars, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResponse?.results;
    const factorRow = results?.anova_table.find(row => !row.Source.includes('Residual') && !row.Source.includes('Error') && !row.Source.includes('Covariate'));

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep; 
                    const isCurrent = step.id === currentStep; 
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button 
                            key={step.id} 
                            onClick={() => isClickable && goToStep(step.id as Step)} 
                            disabled={!isClickable} 
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2 ${
                                isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' 
                                : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' 
                                : 'bg-background border-muted-foreground/30 text-muted-foreground'
                            }`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">ANCOVA</h1>
                    <p className="text-muted-foreground mt-1">Analysis of Covariance</p>
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
            
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
            
            <AncovaGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <ProgressBar />
            
            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose DV, factor, and covariates</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Dependent Variable</Label>
                                    <Select value={dependentVar} onValueChange={setDependentVar}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select DV..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Factor (Grouping)</Label>
                                    <Select value={factorVar} onValueChange={setFactorVar}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select factor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {numGroups > 0 && <Badge variant="outline">{numGroups} groups</Badge>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Covariate(s) ({covariateVars.length} selected)</Label>
                                <ScrollArea className="h-32 p-4 border rounded-xl bg-muted/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableNumeric.map(h => (
                                            <div key={h} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                                                <Checkbox 
                                                    id={`cov-${h}`} 
                                                    checked={covariateVars.includes(h)} 
                                                    onCheckedChange={(c) => setCovariateVars(prev => c ? [...prev, h] : prev.filter(x => x !== h))} 
                                                />
                                                <Label htmlFor={`cov-${h}`} className="text-sm cursor-pointer">{h}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {covariateVars.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {covariateVars.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    Sample size: <span className="font-semibold text-foreground">{data.length}</span>
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Model Settings</CardTitle>
                                    <CardDescription>Review configuration</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-2 text-sm">
                                <p>• <strong>DV:</strong> {dependentVar || 'Not selected'}</p>
                                <p>• <strong>Factor:</strong> {factorVar || 'Not selected'} ({numGroups} groups)</p>
                                <p>• <strong>Covariates:</strong> {covariateVars.join(', ') || 'None'}</p>
                                <p>• <strong>Model:</strong> ANCOVA (Type II SS)</p>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <p className="text-sm text-muted-foreground">
                                    ANCOVA tests group differences while statistically controlling for continuous covariates.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking requirements</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {dataValidation.map((c, i) => (
                                    <div key={i} className={`flex items-start gap-4 p-4 rounded-xl ${c.passed ? 'bg-primary/5' : 'bg-red-50/50'}`}>
                                        {c.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                                        <div>
                                            <p className="font-medium text-sm">{c.label}</p>
                                            <p className="text-xs text-muted-foreground">{c.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={handleAnalysis} disabled={isLoading || !allValidationsPassed} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <><Play className="mr-2 h-4 w-4" />Run ANCOVA</>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const factorRow = results.anova_table.find((row: any) => !row.Source.includes('Residual') && !row.Source.includes('Error') && !row.Source.includes('Covariate'));
                    const isSignificant = factorRow && factorRow['p-value'] < 0.05;
                    const effectSize = factorRow?.['η²p'] || 0;
                    const isGood = isSignificant && effectSize >= 0.06;
                    const pPct = factorRow ? (factorRow['p-value'] * 100).toFixed(1) : '0';
                    const effectPct = (effectSize * 100).toFixed(1);
                    const homogeneityMet = results.homogeneity_of_slopes?.assumption_met !== false;
                    
                    // Get adjusted means for comparison
                    const adjustedMeans = results.adjusted_means ? Object.entries(results.adjusted_means) : [];
                    const means = adjustedMeans.map(([, stats]: [string, any]) => stats.adjusted_mean);
                    const maxMean = Math.max(...means);
                    const minMean = Math.min(...means);
                    const highestGroup = adjustedMeans.find(([, stats]: [string, any]) => stats.adjusted_mean === maxMean)?.[0];
                    const lowestGroup = adjustedMeans.find(([, stats]: [string, any]) => stats.adjusted_mean === minMean)?.[0];
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>{dependentVar} by {factorVar} (controlling for {covariateVars.join(', ')})</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Critical Warning if homogeneity violated */}
                                {!homogeneityMet && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Important Warning</AlertTitle>
                                        <AlertDescription>
                                            The relationship between covariates and outcome differs across groups. ANCOVA results may be misleading.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                
                                {/* Key Findings - Business Friendly */}
                                <div className={`rounded-xl p-6 space-y-4 border ${
                                    isGood && homogeneityMet 
                                        ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                                        : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                                }`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isGood && homogeneityMet ? 'text-primary' : 'text-amber-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood && homogeneityMet ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                After accounting for {covariateVars.join(' and ')}, {
                                                    isSignificant 
                                                        ? `meaningful differences were found between ${factorVar} groups. The groups differ in ${dependentVar} even after controlling for other factors.`
                                                        : `no significant differences were found between ${factorVar} groups. Once we account for ${covariateVars.join(' and ')}, groups perform similarly.`
                                                }
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood && homogeneityMet ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                {effectSize >= 0.14 
                                                    ? `The effect is large. ${factorVar} has substantial impact on ${dependentVar} beyond what the covariates explain.`
                                                    : effectSize >= 0.06 
                                                        ? `The effect is moderate. ${factorVar} has meaningful impact on ${dependentVar} after controlling for covariates.`
                                                        : `The effect is small. Even if differences exist, they have limited practical importance.`}
                                            </p>
                                        </div>
                                        
                                        {highestGroup && lowestGroup && (
                                            <div className="flex items-start gap-3">
                                                <span className={`font-bold ${isGood && homogeneityMet ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                                <p className="text-sm">
                                                    After adjusting for covariates, <strong>{highestGroup}</strong> shows the highest {dependentVar} ({maxMean.toFixed(2)}), 
                                                    while <strong>{lowestGroup}</strong> shows the lowest ({minMean.toFixed(2)}).
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGood && homogeneityMet ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                The covariates explain additional variance, helping to isolate the true effect of {factorVar}. 
                                                The total model explains {((results.r_squared || 0) * 100).toFixed(1)}% of variance in {dependentVar}.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Conclusion Card */}
                                <div className={`rounded-xl p-5 border ${
                                    isGood && homogeneityMet 
                                        ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                                        : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {isGood && homogeneityMet ? (
                                            <CheckCircle2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">
                                                {isGood && homogeneityMet 
                                                    ? "Group Differences Confirmed After Adjustment!" 
                                                    : isSignificant 
                                                        ? "Differences Exist but Effect is Small or Assumptions Violated" 
                                                        : "No Significant Differences After Adjustment"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood && homogeneityMet 
                                                    ? `The ${factorVar} groups truly differ in ${dependentVar}. Consider tailored strategies for each group.`
                                                    : isSignificant 
                                                        ? "Review practical implications and check assumption violations before making decisions."
                                                        : `The apparent differences are explained by ${covariateVars.join(' and ')}. Groups can be treated similarly.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Statistical Evidence
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>F-statistic:</strong> {factorRow?.F?.toFixed(2) || 'N/A'} — 
                                            Tests if group differences remain after removing covariate effects. 
                                            {factorRow?.F !== undefined ? 
                                                (factorRow.F > 10 ? ' This large value indicates clear differences.' : 
                                                 factorRow.F > 3 ? ' This moderate value suggests some differences.' : 
                                                 ' This small value suggests minimal differences.') : ''}
                                        </p>
                                        <p>• <strong>p-value:</strong> {factorRow ? (factorRow['p-value'] < 0.001 ? '< 0.001' : factorRow['p-value'].toFixed(4)) : 'N/A'} — 
                                            {isSignificant 
                                                ? ` Less than ${pPct}% chance these adjusted differences are due to random variation.`
                                                : ` ${pPct}% chance these differences are just random variation.`}
                                        </p>
                                        <p>• <strong>Effect Size (η²p):</strong> {effectSize.toFixed(3)} — 
                                            {factorVar} uniquely explains {effectPct}% of variance in {dependentVar} after removing covariate effects. 
                                            {effectSize >= 0.14 ? ' This is a large effect.' : effectSize >= 0.06 ? ' This is a medium effect.' : ' This is a small effect.'}
                                        </p>
                                        <p>• <strong>Model R²:</strong> {results.r_squared?.toFixed(3) || 'N/A'} — 
                                            The entire model (groups + covariates) explains {((results.r_squared || 0) * 100).toFixed(1)}% of total variance.
                                        </p>
                                    </div>
                                </div>

                                {/* Summary Statistics Cards - ANOVA와 완전히 동일한 스타일 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">F-Statistic</p>
                                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{factorRow?.F?.toFixed(3) || 'N/A'}</p>
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
                                                <p className={`text-2xl font-semibold ${isSignificant ? '' : 'text-red-600 dark:text-red-400'}`}>
                                                    {factorRow ? (factorRow['p-value'] < 0.001 ? '<0.001' : factorRow['p-value'].toFixed(4)) : 'N/A'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">η²p (Partial Eta)</p>
                                                    <Target className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{factorRow?.['η²p'].toFixed(3) || 'N/A'}</p>
                                                <p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(factorRow?.['η²p'] || 0)} effect</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">R²</p>
                                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.r_squared?.toFixed(3) || 'N/A'}</p>
                                                <p className="text-xs text-muted-foreground">Model fit</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                </div>

                                {/* Effect Quality Stars */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Analysis Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = 
                                            (effectSize >= 0.14 && homogeneityMet) ? 5 : 
                                            (effectSize >= 0.10 && homogeneityMet) ? 4 : 
                                            (effectSize >= 0.06 && homogeneityMet) ? 3 : 
                                            (effectSize >= 0.01 || !homogeneityMet) ? 2 : 1;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">
                                    View Details<ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Understanding Results</CardTitle>
                                    <CardDescription>ANCOVA interpretation</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">How ANCOVA Works</h4>
                                        <p className="text-sm text-muted-foreground">
                                            ANCOVA statistically removes the effect of covariates before testing group differences.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Critical: Homogeneity of Slopes</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {results.homogeneity_of_slopes?.assumption_met 
                                                ? "✓ The assumption is met - the relationship between covariates and DV is similar across groups."
                                                : "✗ The assumption is violated - covariates affect groups differently. ANCOVA may be inappropriate."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Effect Size Interpretation</h4>
                                        <p className="text-sm text-muted-foreground">
                                            η²p = {factorRow?.['η²p'].toFixed(3)} indicates a <strong>{getEffectSizeInterpretation(factorRow?.['η²p'] || 0).toLowerCase()}</strong> effect.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Other Assumptions</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Normality: {results.assumptions.normality?.met ? '✓ Met' : '✗ Not met'} (p = {results.assumptions.normality?.p_value.toFixed(4)})<br/>
                                            {results.assumptions.homoscedasticity 
                                                ? <>Homoscedasticity: {results.assumptions.homoscedasticity.met ? '✓ Met' : '✗ Not met'} (p = {results.assumptions.homoscedasticity.p_value.toFixed(4)})</>
                                                : results.assumptions.homogeneity 
                                                    ? <>Homogeneity: {results.assumptions.homogeneity.met ? '✓ Met' : '✗ Not met'} (p = {results.assumptions.homogeneity.p_value.toFixed(4)})</>
                                                    : null}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bottom Line */}
                            <div className={`rounded-xl p-5 border ${
                                results.homogeneity_of_slopes?.assumption_met !== false && factorRow && factorRow['p-value'] < 0.05 
                                    ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                                    : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                            }`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    Bottom Line
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    The one-way ANCOVA {factorRow && factorRow['p-value'] < 0.05 ? 'revealed significant' : 'did not reveal significant'} differences 
                                    among the {numGroups} groups after controlling for {covariateVars.join(', ')} 
                                    (F({factorRow?.df || 'N/A'}, {results.anova_table.find((r: any) => r.Source.includes('Error') || r.Source.includes('Residual'))?.df || 'N/A'}) = {factorRow?.F?.toFixed(2) || 'N/A'}, 
                                    p {factorRow && factorRow['p-value'] < 0.001 ? '< .001' : `= ${factorRow?.['p-value']?.toFixed(3) || 'N/A'}`}, η²p = {factorRow?.['η²p']?.toFixed(3) || 'N/A'}).
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                Full Report<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 6 && results && analysisResponse && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Full Statistics</h2>
                                <p className="text-sm text-muted-foreground">ANCOVA table, adjusted means</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                        PNG Image
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                        <Code className="mr-2 h-4 w-4" />
                                        Python Code
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        
                        <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
                            {/* Report Header */}
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">ANCOVA Report</h2>
                                <p className="text-sm text-muted-foreground">
                                    DV: {dependentVar} | Factor: {factorVar} | {new Date().toLocaleDateString()}
                                </p>
                            </div>
                            
                            {/* Warnings */}
                            {analysisResponse.warnings && analysisResponse.warnings.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Important Warnings</AlertTitle>
                                    <AlertDescription>
                                        {analysisResponse.warnings.map((w, i) => (
                                            <p key={i} className="mt-1">{w}</p>
                                        ))}
                                    </AlertDescription>
                                </Alert>
                            )}
                            
                            {/* Multicollinearity Check */}
                            {results.multicollinearity && results.multicollinearity.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Multicollinearity Assessment (VIF)</CardTitle>
                                        <CardDescription>Checking independence of covariates</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Covariate</TableHead>
                                                    <TableHead className="text-right">VIF</TableHead>
                                                    <TableHead>Interpretation</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.multicollinearity.map((vif, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{vif.variable}</TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {vif.VIF?.toFixed(2) ?? 'N/A'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={
                                                                vif.severity === 'good' ? 'outline' 
                                                                : vif.severity === 'warning' ? 'secondary' 
                                                                : 'destructive'
                                                            }>
                                                                {vif.interpretation}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            
                            {/* Summary Statistics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">F-Statistic</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{factorRow?.F?.toFixed(3) || 'N/A'}</p><p className="text-xs text-muted-foreground">Test Statistic</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${factorRow && factorRow['p-value'] < 0.05 ? '' : 'text-red-600 dark:text-red-400'}`}>{factorRow ? (factorRow['p-value'] < 0.001 ? '<0.001' : factorRow['p-value'].toFixed(4)) : 'N/A'}</p><p className="text-xs text-muted-foreground">{factorRow && factorRow['p-value'] < 0.05 ? 'Significant' : 'Not Significant'}</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">η²p (Partial)</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{factorRow?.['η²p']?.toFixed(3) || 'N/A'}</p><p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(factorRow?.['η²p'] || 0)} effect</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">R² (Model)</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.r_squared?.toFixed(3) || 'N/A'}</p><p className="text-xs text-muted-foreground">Total variance</p></div></CardContent></Card>
                            </div>

                            {/* Statistical Summary - APA Format */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Detailed Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-semibold">Statistical Summary</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A one-way Analysis of Covariance (ANCOVA) was conducted to examine the effect of {factorVar} on {dependentVar}, 
                                                controlling for {covariateVars.length === 1 ? `the covariate ${covariateVars[0]}` : `the covariates ${covariateVars.join(', ')}`}. 
                                                The analysis included <em>N</em> = {data.length}{results.n_dropped ? ` (${results.n_dropped} cases excluded due to missing data)` : ''} participants 
                                                across {numGroups} groups.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {factorRow && (
                                                    <>
                                                        After controlling for {covariateVars.length === 1 ? 'the covariate' : 'the covariates'}, 
                                                        {factorRow['p-value'] < 0.05 
                                                            ? ` there was a statistically significant effect of ${factorVar} on ${dependentVar}, F(${factorRow?.df || 'N/A'}, ${results.anova_table.find(r => r.Source.includes('Error') || r.Source.includes('Residual'))?.df || 'N/A'}) = ${factorRow?.F?.toFixed(2) || 'N/A'}, p ${factorRow['p-value'] < 0.001 ? '< .001' : `= ${factorRow['p-value'].toFixed(3)}`}, partial η² = ${factorRow?.['η²p']?.toFixed(3) || 'N/A'}.`
                                                            : ` the effect of ${factorVar} on ${dependentVar} was not statistically significant, F(${factorRow?.df || 'N/A'}, ${results.anova_table.find(r => r.Source.includes('Error') || r.Source.includes('Residual'))?.df || 'N/A'}) = ${factorRow?.F?.toFixed(2) || 'N/A'}, p = ${factorRow['p-value'].toFixed(3)}, partial η² = ${factorRow?.['η²p']?.toFixed(3) || 'N/A'}.`}
                                                    </>
                                                )}
                                                {` The effect size (partial η² = ${factorRow?.['η²p'].toFixed(3)}) indicates a ${getEffectSizeInterpretation(factorRow?.['η²p'] || 0).toLowerCase()} effect.`}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {results.covariate_info && Object.entries(results.covariate_info).map(([cov, info], idx) => (
                                                    <span key={cov}>
                                                        {idx === 0 ? 'The covariate ' : ', and '}{cov} was 
                                                        {info.p_value < 0.05 
                                                            ? ` significantly related to ${dependentVar} (B = ${info.coefficient.toFixed(3)}, t = ${info.t_value.toFixed(2)}, p ${info.p_value < 0.001 ? '< .001' : `= ${info.p_value.toFixed(3)}`})`
                                                            : ` not significantly related to ${dependentVar} (B = ${info.coefficient.toFixed(3)}, t = ${info.t_value.toFixed(2)}, p = ${info.p_value.toFixed(3)})`}
                                                    </span>
                                                ))}
                                                . The overall model explained {((results.r_squared || 0) * 100).toFixed(1)}% of the variance in {dependentVar} 
                                                (R² = {results.r_squared?.toFixed(3)}, adjusted R² = {results.adj_r_squared?.toFixed(3)}).
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {results.homogeneity_of_slopes && (
                                                    <>
                                                        The critical assumption of homogeneity of regression slopes was 
                                                        {results.homogeneity_of_slopes.assumption_met 
                                                            ? ' satisfied, supporting the validity of the ANCOVA results.' 
                                                            : ' violated, indicating that the covariates affect groups differently. Results should be interpreted with caution.'}
                                                    </>
                                                )}
                                                {' '}Assumption testing indicated that {results.assumptions.normality?.met && (results.assumptions.homoscedasticity?.met || results.assumptions.homogeneity?.met)
                                                    ? 'both normality of residuals and homogeneity of variance assumptions were satisfied'
                                                    : results.assumptions.normality?.met 
                                                        ? `normality was satisfied but homogeneity of variance was violated`
                                                        : (results.assumptions.homoscedasticity?.met || results.assumptions.homogeneity?.met)
                                                            ? `homogeneity of variance was satisfied but normality was violated`
                                                            : `both normality and homogeneity assumptions were violated; results should be interpreted with caution`}.
                                                {results.adjusted_means && Object.keys(results.adjusted_means).length > 0 && 
                                                    ' Adjusted means are provided to facilitate interpretation of group differences after covariate adjustment.'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {results.n_dropped && results.n_dropped > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Missing Values</AlertTitle>
                                    <AlertDescription>{results.n_dropped} rows excluded.</AlertDescription>
                                </Alert>
                            )}
                            
                            {/* Adjusted Means */}
                            {results.adjusted_means && Object.keys(results.adjusted_means).length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Adjusted Means</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Group</TableHead>
                                                    <TableHead className="text-right">Adjusted Mean</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                    <TableHead className="text-right">95% CI</TableHead>
                                                    <TableHead className="text-right">n</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(results.adjusted_means).map(([g, v]) => (
                                                    <TableRow key={g}>
                                                        <TableCell>{g}</TableCell>
                                                        <TableCell className="text-right font-mono">{v.adjusted_mean.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{v.se.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            [{v.ci_lower?.toFixed(3) || '—'}, {v.ci_upper?.toFixed(3) || '—'}]
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">{v.n}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            
                            {/* Covariate Info */}
                            {results.covariate_info && Object.keys(results.covariate_info).length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Covariate Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Covariate</TableHead>
                                                    <TableHead className="text-right">B</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                    <TableHead className="text-right">t</TableHead>
                                                    <TableHead className="text-right">p</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(results.covariate_info).map(([c, info]) => (
                                                    <TableRow key={c}>
                                                        <TableCell>{c}</TableCell>
                                                        <TableCell className="text-right font-mono">{info.coefficient.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right font-mono">{info.std_err.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right font-mono">{info.t_value.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={info.p_value < 0.05 ? 'default' : 'outline'}>
                                                                {info.p_value < 0.001 ? '<.001' : info.p_value.toFixed(4)}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            
                            {/* Plot */}
                            {analysisResponse.plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Visualization</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center">
                                        <Image 
                                            src={analysisResponse.plot} 
                                            alt="ANCOVA Plot" 
                                            width={1200} 
                                            height={500} 
                                            className="w-full max-w-4xl rounded border" 
                                        />
                                    </CardContent>
                                </Card>
                            )}
                            
                            {/* ANOVA Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>ANCOVA Table</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Source</TableHead>
                                                <TableHead className="text-right">SS</TableHead>
                                                <TableHead className="text-right">df</TableHead>
                                                <TableHead className="text-right">F</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-right">η²p</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.anova_table.map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{row.Source}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.df}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.F?.toFixed(3) ?? '—'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={row['p-value'] && row['p-value'] < 0.05 ? 'default' : 'outline'}>
                                                            {row['p-value'] ? (row['p-value'] < 0.001 ? '<.001' : row['p-value'].toFixed(4)) : '—'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{row['η²p']?.toFixed(3) ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            
                            {/* Assumptions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assumption Checks</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Test</TableHead>
                                                <TableHead className="text-right">Statistic</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Normality (Shapiro-Wilk)</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.assumptions.normality?.statistic?.toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.assumptions.normality?.p_value?.toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={results.assumptions.normality?.met ? 'outline' : 'destructive'}>
                                                        {results.assumptions.normality?.met ? 'Met' : 'Not Met'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                            {results.assumptions.homoscedasticity && (
                                                <TableRow>
                                                    <TableCell>Homoscedasticity (Levene)</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {results.assumptions.homoscedasticity.statistic?.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {results.assumptions.homoscedasticity.p_value?.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={results.assumptions.homoscedasticity.met ? 'outline' : 'destructive'}>
                                                            {results.assumptions.homoscedasticity.met ? 'Met' : 'Not Met'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {results.assumptions.homogeneity && (
                                                <TableRow>
                                                    <TableCell>Homogeneity (Levene)</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {results.assumptions.homogeneity.statistic?.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {results.assumptions.homogeneity.p_value?.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={results.assumptions.homogeneity.met ? 'outline' : 'destructive'}>
                                                            {results.assumptions.homogeneity.met ? 'Met' : 'Not Met'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {results.assumptions.independence && (
                                                <TableRow>
                                                    <TableCell>Independence (Durbin-Watson)</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {results.assumptions.independence.durbin_watson?.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right">—</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={results.assumptions.independence.met ? 'outline' : 'destructive'}>
                                                            {results.assumptions.independence.met ? 'Met' : 'Not Met'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {results.assumptions.outliers && (
                                                <TableRow>
                                                    <TableCell>Outliers</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {results.assumptions.outliers.n_outliers} ({results.assumptions.outliers.percent.toFixed(1)}%)
                                                    </TableCell>
                                                    <TableCell className="text-right">—</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={results.assumptions.outliers.met ? 'outline' : 'destructive'}>
                                                            {results.assumptions.outliers.met ? 'Acceptable' : 'Check'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="mt-4 flex justify-start">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                        </div>
                    </>
                )}
                
                {isLoading && (
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Running ANCOVA...</p>
                            <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                    </Card>
                )}
            </div>
            
            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />

        </div>
    );
}