'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Target, CheckCircle, AlertTriangle, HelpCircle, Settings, Binary, TrendingUp, BarChart3, Percent, Layers, BookOpen, FileText, Lightbulb, Info, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, Sparkles, ArrowRight, ChevronDown, FileCode, FileType } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/logistic_regression.py?alt=media";

// ============ TYPES ============
interface LogisticRegressionResults {
    metrics: {
        accuracy: number;
        confusion_matrix: number[][];
        classification_report: {
            [key: string]: {
                precision: number;
                recall: number;
                'f1-score': number;
                support: number;
            };
        };
    };
    coefficients: { [key: string]: number };
    odds_ratios: { [key: string]: number };
    odds_ratios_ci: { [key: string]: { '2.5%': number, '97.5%': number } };
    p_values: { [key: string]: number };
    std_errors: { [key: string]: number };
    z_values: { [key: string]: number };
    intercept: {
        coefficient: number;
        std_error: number;
        z_value: number;
        p_value: number;
    };
    model_summary: {
        llf: number;
        llnull: number;
        llr: number;
        llr_pvalue: number;
        prsquared: number;
        df_model: number;
        df_resid: number;
        aic: number;
        bic: number;
    };
    vif: { [key: string]: number };
    hosmer_lemeshow: {
        statistic: number;
        p_value: number;
        df: number;
        n_groups: number;
    } | null;
    roc_data: {
        fpr: number[];
        tpr: number[];
        auc: number;
    };
    dependent_classes: string[];
    interpretation: string;
    n_dropped?: number;
    dropped_rows?: number[];
}

interface FullAnalysisResponse {
    results: LogisticRegressionResults;
    plot: string;
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

// ============ HELPER FUNCTIONS ============
const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const getAUCInterpretation = (auc: number) => {
    if (auc >= 0.9) return { label: 'Excellent', desc: 'outstanding discrimination' };
    if (auc >= 0.8) return { label: 'Good', desc: 'strong discrimination' };
    if (auc >= 0.7) return { label: 'Fair', desc: 'acceptable discrimination' };
    if (auc >= 0.6) return { label: 'Poor', desc: 'weak discrimination' };
    return { label: 'Fail', desc: 'no discrimination' };
};

const getVIFInterpretation = (vif: number) => {
    if (vif >= 10) return { label: 'Severe', color: 'text-red-600 dark:text-red-400' };
    if (vif >= 5) return { label: 'Moderate', color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'OK', color: 'text-green-600 dark:text-green-400' };
};

// ============ SUB COMPONENTS ============
const StatisticalSummaryCards = ({ results }: { results: LogisticRegressionResults }) => {
    const isModelSignificant = results.model_summary.llr_pvalue < 0.05;
    const hlGoodFit = results.hosmer_lemeshow ? results.hosmer_lemeshow.p_value > 0.05 : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Accuracy</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.accuracy * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Overall correctness</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">AUC</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.roc_data.auc.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getAUCInterpretation(results.roc_data.auc).label}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Pseudo R²</p><Percent className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.model_summary.prsquared.toFixed(3)}</p><p className="text-xs text-muted-foreground">Model fit</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">H-L Test</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${hlGoodFit === false ? 'text-rose-600 dark:text-rose-400' : ''}`}>{results.hosmer_lemeshow ? (results.hosmer_lemeshow.p_value < 0.001 ? '<0.001' : results.hosmer_lemeshow.p_value.toFixed(3)) : 'N/A'}</p><p className="text-xs text-muted-foreground">{hlGoodFit === null ? 'Not available' : hlGoodFit ? 'Good fit' : 'Poor fit'}</p></div></CardContent></Card>
        </div>
    );
};


// Statistical Terms Glossary for Logistic Regression
const logisticMetricDefinitions: Record<string, string> = {
    logistic_regression: "A statistical method for predicting binary outcomes (0/1, yes/no) by modeling the probability of an event using the logistic (sigmoid) function. Ensures predictions stay between 0 and 1.",
    odds: "The ratio of the probability of an event occurring to the probability of it not occurring. If P = 0.75, odds = 0.75/0.25 = 3 (3:1 in favor).",
    odds_ratio: "How much the odds change for a 1-unit increase in the predictor. OR = 1 means no effect; OR > 1 means increased odds; OR < 1 means decreased odds.",
    log_odds: "The natural logarithm of the odds. Also called the logit. Logistic regression directly estimates log-odds, which are then converted to odds ratios.",
    coefficient: "The estimated log-odds change for a 1-unit increase in the predictor. Exponentiate (e^β) to get the odds ratio.",
    intercept: "The log-odds when all predictors equal zero. Often not meaningfully interpretable if zero is outside the data range.",
    maximum_likelihood: "The estimation method used in logistic regression. Finds coefficients that make the observed data most probable.",
    likelihood_ratio_test: "Tests if the model with predictors is significantly better than a null model (intercept only). Significant LLR means predictors matter.",
    pseudo_r_squared: "McFadden's R². Measures model fit but typically much lower than linear R². Values of 0.2-0.4 are considered excellent in logistic regression.",
    auc_roc: "Area Under the ROC Curve. Measures discrimination ability — how well the model separates classes. Ranges from 0.5 (random) to 1.0 (perfect).",
    roc_curve: "Receiver Operating Characteristic curve. Plots true positive rate vs. false positive rate at different classification thresholds.",
    sensitivity: "True positive rate (recall). Proportion of actual positives correctly identified. Sensitivity = TP / (TP + FN).",
    specificity: "True negative rate. Proportion of actual negatives correctly identified. Specificity = TN / (TN + FP).",
    precision: "Positive predictive value. Of those predicted positive, how many are actually positive? Precision = TP / (TP + FP).",
    recall: "Same as sensitivity. Of actual positives, how many did we catch? Recall = TP / (TP + FN).",
    f1_score: "Harmonic mean of precision and recall. Balances both metrics. F1 = 2 × (precision × recall) / (precision + recall).",
    confusion_matrix: "A 2×2 table showing true positives (TP), true negatives (TN), false positives (FP), and false negatives (FN).",
    accuracy: "Proportion of correct predictions. (TP + TN) / Total. Can be misleading with imbalanced classes.",
    hosmer_lemeshow: "Goodness-of-fit test comparing predicted and observed probabilities. p > 0.05 indicates good fit; p < 0.05 suggests poor fit.",
    vif: "Variance Inflation Factor. Detects multicollinearity. VIF > 5-10 indicates problematic correlation between predictors.",
    multicollinearity: "When predictors are highly correlated with each other. Causes unstable coefficient estimates. Check VIF to detect.",
    confidence_interval: "Range of plausible values for the odds ratio. If 95% CI includes 1, the effect is not statistically significant.",
    wald_test: "Tests if individual coefficients are significantly different from zero. Uses z-statistic (coefficient / SE).",
    z_statistic: "Coefficient divided by standard error. Tests significance of individual predictors. |z| > 1.96 typically indicates p < 0.05.",
    standard_error: "Measure of uncertainty in coefficient estimates. Smaller SE = more precise estimate.",
    p_value: "Probability of observing the result if the true effect is zero. p < 0.05 typically indicates statistical significance.",
    aic: "Akaike Information Criterion. Balances fit and complexity. Lower AIC = better model. Use to compare models.",
    bic: "Bayesian Information Criterion. Similar to AIC but penalizes complexity more. Lower BIC = better model.",
    complete_separation: "When a predictor perfectly predicts the outcome. Causes infinite coefficients. Remove variable or use penalized regression.",
    classification_threshold: "The probability cutoff for classifying as positive (default 0.5). Adjust based on the cost of false positives vs. false negatives."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Logistic Regression Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in logistic regression analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(logisticMetricDefinitions).map(([term, definition]) => (
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

// IntroPage 위에 추가
const LogisticRegressionGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Logistic Regression Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Logistic Regression */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Logistic Regression?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Logistic regression predicts <strong>binary outcomes</strong> (yes/no, pass/fail, 0/1) by modeling 
                the probability of an event occurring. Unlike linear regression, it uses the logistic (sigmoid) 
                function to ensure predictions stay between 0 and 1.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The equation:</strong><br/>
                  <span className="font-mono text-xs">
                    P(Y=1) = 1 / (1 + e^-(β₀ + β₁X₁ + β₂X₂ + ...))
                  </span><br/>
                  <span className="text-muted-foreground text-xs">
                    Outputs a probability between 0 and 1
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Logistic Regression?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Outcome is <strong>binary</strong> (two categories)</li>
                    <li>• You want to know <strong>probability</strong> of an event</li>
                    <li>• You need to identify <strong>risk factors</strong></li>
                    <li>• Classification is the goal (not prediction of a continuous value)</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Don't use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Outcome has more than 2 categories (use multinomial)</li>
                    <li>• Outcome is continuous (use linear regression)</li>
                    <li>• Sample size is too small (&lt;10 events per predictor)</li>
                    <li>• Complete separation exists (perfect prediction)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Odds Ratios */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Understanding Odds Ratios (OR)
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">What is an Odds Ratio?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The odds ratio tells you how the odds of the outcome change for a 1-unit increase in the predictor.
                    <br/><strong>OR = 1:</strong> No effect
                    <br/><strong>OR &gt; 1:</strong> Increased odds (e.g., OR = 2 means 2× higher odds)
                    <br/><strong>OR &lt; 1:</strong> Decreased odds (e.g., OR = 0.5 means 50% lower odds)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Example Interpretation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If predicting disease and "smoking" has OR = 3.5:<br/>
                    "Smokers have 3.5 times higher odds of disease compared to non-smokers, 
                    controlling for other factors."
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Confidence Intervals Matter</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>If 95% CI includes 1:</strong> Effect is NOT statistically significant.<br/>
                    <strong>If 95% CI excludes 1:</strong> Effect IS statistically significant.<br/>
                    Example: OR = 2.5, 95% CI [1.3, 4.8] → Significant (doesn't include 1)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Key Metrics to Evaluate
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">AUC-ROC (Area Under Curve)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures discrimination ability — how well the model separates classes.
                    <br/><strong>0.9+:</strong> Excellent
                    <br/><strong>0.8-0.9:</strong> Good
                    <br/><strong>0.7-0.8:</strong> Fair/Acceptable
                    <br/><strong>&lt;0.7:</strong> Poor
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Accuracy</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Percentage of correct predictions. Simple but can be misleading with imbalanced data.
                    <br/>If 90% of cases are "No", always predicting "No" gives 90% accuracy but is useless.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Pseudo R² (McFadden's)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlike linear R², values are typically lower.
                    <br/><strong>0.2-0.4:</strong> Considered excellent fit in logistic regression
                    <br/>Don't expect values close to 1.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Likelihood Ratio Test (LLR)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if the model is significantly better than a null model (intercept only).
                    <br/><strong>p &lt; 0.05:</strong> Model is significant — predictors matter.
                    <br/><strong>p ≥ 0.05:</strong> Model is not significant — predictors don't help.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Diagnostic Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Important Diagnostic Tests
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Hosmer-Lemeshow Test</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests if predicted probabilities match observed outcomes.
                    <br/><strong>p &gt; 0.05:</strong> Good fit — model calibrates well
                    <br/><strong>p &lt; 0.05:</strong> Poor fit — model may need modification
                    <br/><em>Note: Sensitive to large samples; consider other diagnostics too.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">VIF (Variance Inflation Factor)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detects multicollinearity among predictors.
                    <br/><strong>VIF &lt; 5:</strong> Acceptable
                    <br/><strong>VIF 5-10:</strong> Moderate concern
                    <br/><strong>VIF &gt; 10:</strong> Serious — remove or combine predictors
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Classification Metrics</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Precision:</strong> Of predicted positives, how many are correct?<br/>
                    <strong>Recall (Sensitivity):</strong> Of actual positives, how many did we catch?<br/>
                    <strong>F1-Score:</strong> Harmonic mean of precision and recall.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Issues */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Issues & Solutions
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Complete Separation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Occurs when a predictor perfectly predicts the outcome. 
                    Coefficients become infinite. Remove the problematic variable or use Firth's penalized regression.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Imbalanced Classes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When one outcome is rare (&lt;10%), accuracy is misleading.
                    Focus on AUC, precision, recall, and F1 instead. Consider oversampling or different thresholds.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Sample Size Rule:</strong> Need at least 10 events (minority class) per predictor variable. 
                    With 5 predictors and 30% event rate, need at least 5 × 10 / 0.30 ≈ 167 observations.
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
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check outcome is truly binary</li>
                    <li>• Verify sufficient sample size</li>
                    <li>• Handle missing values</li>
                    <li>• Check for multicollinearity</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Model Building</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with theory-driven predictors</li>
                    <li>• Consider interactions if justified</li>
                    <li>• Check for non-linear relationships</li>
                    <li>• Don't overfit with too many variables</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting Results</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Focus on significant predictors (p &lt; 0.05)</li>
                    <li>• Use CIs to assess effect precision</li>
                    <li>• Consider practical significance</li>
                    <li>• Look at multiple metrics, not just accuracy</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• χ²(df) = X.XX, p = .XXX</li>
                    <li>• McFadden's R² = .XX</li>
                    <li>• OR with 95% CI for each predictor</li>
                    <li>• Classification accuracy and AUC</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Logistic regression shows association, not causation. 
                A significant odds ratio means there's a relationship, but doesn't prove the predictor causes the outcome. 
                Also, odds ratios are not the same as relative risk — be careful when communicating to non-statisticians.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const admissionExample = exampleDatasets.find(d => d.id === 'admission-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Binary className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Logistic Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Predict binary outcomes using statistical modeling of probabilities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Binary Classification</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Models the probability of binary outcomes like yes/no, pass/fail, or true/false</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Percent className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Odds Ratios</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Quantifies how each predictor affects the odds of the outcome occurring</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChart3 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Model Evaluation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Comprehensive metrics including AUC, accuracy, and significance tests</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />How It Works</h3>
                        <p className="text-sm text-muted-foreground mb-4">Logistic regression uses the logistic (sigmoid) function to model the probability of a binary outcome. Unlike linear regression, it ensures predictions are bounded between 0 and 1, making it ideal for classification.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Required Setup</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Dependent variable:</strong> Binary categorical outcome</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Independent variables:</strong> Numeric or categorical predictors</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Sample size:</strong> 10+ observations per predictor</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Understanding Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Odds ratios:</strong> Effect size of predictors</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Hosmer-Lemeshow:</strong> Model goodness of fit</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>VIF:</strong> Multicollinearity check</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {admissionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(admissionExample)} size="lg"><Binary className="mr-2 h-5 w-5" />Load Sample Admission Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface LogisticRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    allHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}


export default function LogisticRegressionPage({ data, numericHeaders, allHeaders, categoricalHeaders, onLoadExample }: LogisticRegressionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVar, setDependentVar] = useState<string>('');
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    // ============ MEMOS ============
    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => {
            const values = new Set(data.map(row => row[h]).filter(v => v != null && v !== ''));
            return values.size === 2;
        });
    }, [data, allHeaders]);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2 && binaryCategoricalHeaders.length >= 1, [data, allHeaders, binaryCategoricalHeaders]);
    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== dependentVar), [allHeaders, dependentVar]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'Dependent variable selected', 
            passed: dependentVar !== '', 
            detail: dependentVar ? `Outcome: ${dependentVar}` : 'Please select a binary outcome variable' 
        });
        
        if (dependentVar) {
            const depValues = new Set(data.map(row => row[dependentVar]).filter(v => v != null && v !== ''));
            const isBinary = depValues.size === 2;
            checks.push({ 
                label: 'Binary outcome', 
                passed: isBinary, 
                detail: isBinary ? `Two classes: ${Array.from(depValues).join(' vs ')}` : `Found ${depValues.size} classes (requires exactly 2)` 
            });
        }
        
        checks.push({ 
            label: 'Predictor variables selected', 
            passed: independentVars.length >= 1, 
            detail: independentVars.length >= 1 ? `${independentVars.length} predictors selected` : 'Select at least one predictor' 
        });
        
        checks.push({ 
            label: 'Sufficient sample size', 
            passed: data.length >= 30, 
            detail: `n = ${data.length} observations (minimum: 30)` 
        });
        
        if (independentVars.length > 0 && dependentVar) {
            const ratio = Math.floor(data.length / independentVars.length);
            checks.push({ 
                label: 'Events per predictor', 
                passed: ratio >= 10, 
                detail: `${ratio} observations per predictor (recommended: 10+)` 
            });
        }
        
        const allVars = [dependentVar, ...independentVars].filter(v => v);
        if (allVars.length > 0) {
            const isMissing = (value: any) => value == null || value === '' || (typeof value === 'number' && isNaN(value));
            const missingCount = data.filter((row: any) => allVars.some(v => isMissing(row[v]))).length;
            checks.push({ 
                label: 'Missing values check', 
                passed: missingCount === 0, 
                detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} rows with missing values will be excluded` 
            });
        }
        
        return checks;
    }, [data, dependentVar, independentVars]);

    const allValidationsPassed = useMemo(() => {
        const criticalChecks = dataValidation.filter(c => 
            c.label === 'Dependent variable selected' || 
            c.label === 'Binary outcome' || 
            c.label === 'Predictor variables selected'
        );
        return criticalChecks.every(check => check.passed);
    }, [dataValidation]);

    // ============ EFFECTS ============
    useEffect(() => {
        if (data.length === 0) {
            setView('intro');
        } else if (canRun) {
            const defaultDepVar = binaryCategoricalHeaders[0] || '';
            if (!dependentVar && defaultDepVar) setDependentVar(defaultDepVar);
            if (independentVars.length === 0) {
                const initialIndepVars = allHeaders.filter(h => h !== defaultDepVar);
                setIndependentVars(initialIndepVars);
            }
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, allHeaders, binaryCategoricalHeaders, canRun]);

    // ============ HANDLERS ============
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    
    const handleIndepVarChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true); toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Logistic_Regression_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image; link.click();
            toast({ title: "Download complete" });
        } catch (error) { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const results = analysisResult.results;
        const modelSummary = [{ 
            dependent_variable: dependentVar, 
            independent_variables: independentVars.join(', '), 
            accuracy: results.metrics.accuracy, 
            auc: results.roc_data.auc, 
            pseudo_r_squared: results.model_summary.prsquared, 
            log_likelihood: results.model_summary.llf, 
            llr_pvalue: results.model_summary.llr_pvalue,
            aic: results.model_summary.aic,
            bic: results.model_summary.bic,
            hosmer_lemeshow_stat: results.hosmer_lemeshow?.statistic || 'N/A',
            hosmer_lemeshow_pvalue: results.hosmer_lemeshow?.p_value || 'N/A',
            n_dropped: results.n_dropped || 0 
        }];
        const coefficientsData: any[] = [];
        Object.entries(results.coefficients).forEach(([varName, coef]) => {
            coefficientsData.push({ 
                variable: varName, 
                coefficient: coef, 
                std_error: results.std_errors[varName],
                z_value: results.z_values[varName],
                odds_ratio: results.odds_ratios[varName], 
                ci_lower: results.odds_ratios_ci[varName]['2.5%'], 
                ci_upper: results.odds_ratios_ci[varName]['97.5%'], 
                p_value: results.p_values[varName],
                vif: results.vif[varName] || 'N/A'
            });
        });
        let csvContent = "LOGISTIC REGRESSION MODEL SUMMARY\n";
        csvContent += Papa.unparse(modelSummary) + "\n\n";
        csvContent += "COEFFICIENTS & ODDS RATIOS\n";
        csvContent += Papa.unparse(coefficientsData) + "\n\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Logistic_Regression_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, dependentVar, independentVars, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/logistic-regression-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    dependentVar,
                    independentVars,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Logistic_Regression_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, dependentVar, independentVars, data.length, toast]);

    const handleDownloadPython = useCallback(async () => {
        toast({ title: "Preparing Download..." });
        try {
            const response = await fetch(PYTHON_CODE_URL);
            if (!response.ok) throw new Error('Failed to fetch');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'logistic_regression.py';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast({ title: "Download Started" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Download Failed", description: error.message });
        }
    }, [toast]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select variables.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/logistic-regression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, independentVars, standardize: false })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') {
                    errorMsg = errorResult.detail;
                } else if (Array.isArray(errorResult.detail)) {
                    errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                } else if (errorResult.error) {
                    errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();
            if (result.error) {
                const errMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
                throw new Error(errMsg);
            }

            setAnalysisResult(result);
            goToStep(4);

        } catch (e: any) {
            console.error('Logistic Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    // ============ EARLY RETURNS ============
    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const isModelSignificant = (results?.model_summary?.llr_pvalue ?? 1) < 0.05;
    const hlGoodFit = results?.hosmer_lemeshow ? results.hosmer_lemeshow.p_value > 0.05 : null;

    // ============ PROGRESS BAR COMPONENT ============
    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 transition-all ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
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
            {/* 👇 Guide 컴포넌트 추가 */}
            <LogisticRegressionGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />


            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Logistic Regression</h1>
                    <p className="text-muted-foreground mt-1">Binary classification with probability modeling</p>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose your outcome and predictor variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Dependent Variable (Binary Outcome)</Label>
                                <Select value={dependentVar} onValueChange={setDependentVar}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Select outcome variable" /></SelectTrigger>
                                    <SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                                {dependentVar && (
                                    <p className="text-xs text-muted-foreground">
                                        Classes: {Array.from(new Set(data.map(row => row[dependentVar]).filter(v => v != null && v !== ''))).join(' vs ')}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Independent Variables (Predictors)</Label>
                                <ScrollArea className="h-40 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableFeatures.map(h => (
                                            <div key={h} className="flex items-center space-x-2">
                                                <Checkbox id={`feat-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIndepVarChange(h, !!c)} />
                                                <label htmlFor={`feat-${h}`} className="text-sm cursor-pointer">{h}</label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">{independentVars.length} predictors selected</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Review your logistic regression configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Model Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Outcome:</strong> {dependentVar || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Predictors:</strong> {independentVars.length > 0 ? independentVars.join(', ') : 'None'}</p>
                                    <p>• <strong className="text-foreground">Type:</strong> Binary Logistic Regression</p>
                                    <p>• <strong className="text-foreground">Estimation:</strong> Maximum Likelihood</p>
                                </div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Diagnostic Tests Included</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Hosmer-Lemeshow:</strong> Goodness of fit test</p>
                                    <p>• <strong className="text-foreground">VIF:</strong> Multicollinearity detection</p>
                                    <p>• <strong className="text-foreground">ROC/AUC:</strong> Discrimination ability</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Binary className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Results will include odds ratios with 95% confidence intervals.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div></div></CardHeader>
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
                                <Binary className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Logistic regression with maximum likelihood estimation will be performed.</p>
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


                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const accuracy = results.metrics.accuracy;
                    const auc = results.roc_data.auc;
                    const accuracyPct = (accuracy * 100).toFixed(0);
                    const sigPredictors = Object.entries(results.p_values).filter(([k, p]) => k !== 'const' && p < 0.05);
                    const llrPvalue = results.model_summary.llr_pvalue;
                    const highVifVars = Object.entries(results.vif).filter(([k, v]) => v > 5);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings about predicting {dependentVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isModelSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isModelSignificant ? 'text-primary' : 'text-rose-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isModelSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">
                                            The model correctly predicts <strong>{accuracyPct}%</strong> of all outcomes.
                                            {accuracy >= 0.8 ? ' This is high accuracy.' : accuracy >= 0.7 ? ' This is good accuracy.' : ' Improvement is needed.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isModelSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">
                                            {isModelSignificant 
                                                ? `The predictors do affect ${dependentVar}. This relationship is not due to chance.`
                                                : `We cannot confirm the predictors affect ${dependentVar}.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isModelSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">
                                            {sigPredictors.length > 0 
                                                ? <>{sigPredictors.length} variable(s) ({sigPredictors.slice(0, 3).map(([k]) => k).join(', ')}{sigPredictors.length > 3 ? '...' : ''}) significantly affect {dependentVar}.</>
                                                : `None of the individual variables significantly affect ${dependentVar}.`}
                                        </p></div>
                                        {results.hosmer_lemeshow && (
                                            <div className="flex items-start gap-3"><span className={`font-bold ${hlGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                                {hlGoodFit 
                                                    ? 'Hosmer-Lemeshow test indicates good model fit.'
                                                    : 'Hosmer-Lemeshow test suggests the model may not fit well. Consider model modifications.'}
                                            </p></div>
                                        )}
                                        {highVifVars.length > 0 && (
                                            <div className="flex items-start gap-3"><span className="font-bold text-amber-600">•</span><p className="text-sm">
                                                <strong>Multicollinearity warning:</strong> {highVifVars.slice(0, 3).map(([k]) => k).join(', ')} have high VIF values. Consider removing correlated predictors.
                                            </p></div>
                                        )}
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isModelSignificant && auc >= 0.7 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isModelSignificant && auc >= 0.7 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-rose-600" />}
                                        <div>
                                            <p className="font-semibold">{auc >= 0.8 ? "Excellent Classification Model!" : auc >= 0.7 ? "Good Classification Model" : auc >= 0.6 ? "Moderate Classification Model" : "Classification Improvement Needed"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {auc >= 0.8 
                                                    ? `The model has excellent ability to distinguish between classes. Predictions can be trusted.`
                                                    : auc >= 0.7 
                                                    ? `The model has good class discrimination ability. It can be used in practice.`
                                                    : auc >= 0.6 
                                                    ? `Discrimination ability is limited. Consider adding more predictors.`
                                                    : `The model struggles to separate classes. Reconsider the model.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Accuracy:</strong> {accuracyPct}% — Proportion of correctly classified cases.</p>
                                        <p>• <strong>AUC:</strong> {auc.toFixed(3)} — {getAUCInterpretation(auc).label} discrimination.</p>
                                        <p>• <strong>Model Significance:</strong> p = {llrPvalue < 0.001 ? '< 0.001' : llrPvalue.toFixed(4)} — {isModelSignificant ? 'Significant' : 'Not significant'}.</p>
                                        {results.hosmer_lemeshow && (
                                            <p>• <strong>Hosmer-Lemeshow:</strong> χ² = {results.hosmer_lemeshow.statistic.toFixed(2)}, p = {results.hosmer_lemeshow.p_value.toFixed(4)} — {hlGoodFit ? 'Good fit' : 'Poor fit'}.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Accuracy</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{accuracyPct}%</p><p className="text-xs text-muted-foreground">{accuracy >= 0.8 ? 'High' : accuracy >= 0.6 ? 'Moderate' : 'Low'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">AUC</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{auc.toFixed(2)}</p><p className="text-xs text-muted-foreground">{getAUCInterpretation(auc).label}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Significant?</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${!isModelSignificant ? 'text-rose-600 dark:text-rose-400' : ''}`}>{isModelSignificant ? 'Yes' : 'No'}</p><p className="text-xs text-muted-foreground">{isModelSignificant ? 'Confirmed' : 'Uncertain'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Predictors</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{independentVars.length}</p><p className="text-xs text-muted-foreground">{sigPredictors.length} significant</p></div></CardContent></Card>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Classification Power:</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-lg ${(auc >= 0.9 && star <= 5) || (auc >= 0.8 && star <= 4) || (auc >= 0.7 && star <= 3) || (auc >= 0.6 && star <= 2) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (() => {
                    const auc = results.roc_data.auc;
                    const sigPredictors = Object.entries(results.p_values).filter(([k, p]) => k !== 'const' && p < 0.05);
                    const topPredictor = sigPredictors.length > 0 
                        ? sigPredictors.reduce((max, curr) => Math.abs(results.odds_ratios[curr[0]] - 1) > Math.abs(results.odds_ratios[max[0]] - 1) ? curr : max)
                        : null;
                    const highVifVars = Object.entries(results.vif).filter(([k, v]) => v > 5);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of how we reached this result</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What We Checked</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We analyzed <strong className="text-foreground">{data.length} cases</strong> to find which factors predict <strong className="text-foreground">{dependentVar}</strong>. 
                                                Specifically, we tested if {independentVars.length} predictor{independentVars.length > 1 ? 's' : ''} can distinguish between the two outcome classes.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How Odds Ratios Work</h4>
                                            <p className="text-sm text-muted-foreground">
                                                An odds ratio tells you how much a predictor changes the odds of the outcome.
                                                <strong className="text-foreground"> OR &gt; 1</strong> means higher odds; <strong className="text-foreground">OR &lt; 1</strong> means lower odds.
                                                {topPredictor && (
                                                    <> For example, <strong className="text-foreground">{topPredictor[0]}</strong> has an OR of <strong className="text-foreground">{results.odds_ratios[topPredictor[0]].toFixed(2)}</strong>.</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Is the Model Reliable?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {isModelSignificant
                                                    ? <>The likelihood ratio test confirms this model is <strong className="text-foreground">statistically significant</strong>. The predictors genuinely improve classification.</>
                                                    : <>The model is <strong className="text-foreground">not statistically significant</strong>. We can't confirm these predictors reliably affect the outcome.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Goodness of Fit (Hosmer-Lemeshow)</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {results.hosmer_lemeshow ? (
                                                    hlGoodFit 
                                                        ? <>The Hosmer-Lemeshow test (p = {results.hosmer_lemeshow.p_value.toFixed(3)}) indicates <strong className="text-foreground">good model fit</strong>. The predicted probabilities match observed outcomes well.</>
                                                        : <>The Hosmer-Lemeshow test (p = {results.hosmer_lemeshow.p_value.toFixed(3)}) suggests <strong className="text-foreground">poor fit</strong>. Consider adding interactions or transforming predictors.</>
                                                ) : (
                                                    <>Hosmer-Lemeshow test could not be computed.</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">5</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Multicollinearity (VIF)</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {highVifVars.length > 0 ? (
                                                    <><strong className="text-amber-600">Warning:</strong> {highVifVars.map(([k]) => k).join(', ')} have VIF &gt; 5, indicating multicollinearity. Coefficients may be unstable. Consider removing correlated predictors.</>
                                                ) : (
                                                    <>All VIF values are below 5, indicating <strong className="text-foreground">no significant multicollinearity</strong>. Coefficient estimates are reliable.</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isModelSignificant && auc >= 0.7 && hlGoodFit !== false ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {isModelSignificant && auc >= 0.7 && hlGoodFit !== false
                                            ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Useful Model</>
                                            : isModelSignificant 
                                            ? <><Info className="w-5 h-5 text-amber-600" /> Bottom Line: Needs Improvement</>
                                            : <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: Not Reliable</>}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isModelSignificant && auc >= 0.7 && hlGoodFit !== false
                                            ? `You can use this model to predict ${dependentVar}. Focus on the significant predictors for decision-making.`
                                            : isModelSignificant 
                                            ? `The model is significant but has issues (${auc < 0.7 ? 'low AUC' : ''}${hlGoodFit === false ? ', poor fit' : ''}${highVifVars.length > 0 ? ', multicollinearity' : ''}). Address these before relying on predictions.`
                                            : `These predictors don't reliably predict ${dependentVar}. Try different variables or collect more data.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Diagnostic Guide</h4>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <p className="font-medium mb-1">AUC Interpretation</p>
                                            <div className="space-y-1">
                                                <p><span className="font-mono">0.9+</span> Excellent</p>
                                                <p><span className="font-mono">0.8-0.9</span> Good</p>
                                                <p><span className="font-mono">0.7-0.8</span> Fair</p>
                                                <p><span className="font-mono">&lt;0.7</span> Poor</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-medium mb-1">VIF Interpretation</p>
                                            <div className="space-y-1">
                                                <p><span className="font-mono">&lt;5</span> OK</p>
                                                <p><span className="font-mono">5-10</span> Moderate concern</p>
                                                <p><span className="font-mono">&gt;10</span> Severe issue</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}


                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (() => {
                    const accuracy = results.metrics.accuracy;
                    const auc = results.roc_data.auc;
                    const pseudoR2 = results.model_summary.prsquared;
                    const llrPValue = results.model_summary.llr_pvalue;
                    const n = data.length - (results.n_dropped || 0);
                    const sigPredictors = Object.entries(results.p_values).filter(([k, p]) => k !== 'const' && p < 0.05);
                    
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
                                <DropdownMenuItem onClick={handleDownloadPython}><FileCode className="mr-2 h-4 w-4" />Python Script</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Logistic Regression Report</h2><p className="text-sm text-muted-foreground mt-1">{dependentVar} ~ {independentVars.join(' + ')} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {results.n_dropped !== undefined && results.n_dropped > 0 && (
                            <Card><CardContent className="pt-6"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Missing Values</AlertTitle><AlertDescription>{results.n_dropped} rows excluded due to missing values.</AlertDescription></Alert></CardContent></Card>
                        )}
                        
                        {/* Detailed Analysis - APA Format */}
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            A binary logistic regression was performed to examine the effects of {independentVars.length === 1 ? independentVars[0] : `${independentVars.slice(0, -1).join(', ')} and ${independentVars[independentVars.length - 1]}`} on {dependentVar}. 
                                            The analysis included {n} observations. 
                                            {isModelSignificant ? (
                                                <>
                                                    The overall model was statistically significant, <span className="font-mono">χ²({independentVars.length}) = {results.model_summary.llr?.toFixed(2) || 'N/A'}, <em>p</em> {llrPValue < 0.001 ? '< .001' : `= ${llrPValue.toFixed(3)}`}</span>. 
                                                    The model explained {(pseudoR2 * 100).toFixed(1)}% of the variance (McFadden's <em>R</em>² = {pseudoR2.toFixed(3)}) and correctly classified {(accuracy * 100).toFixed(1)}% of cases.
                                                </>
                                            ) : (
                                                <>
                                                    The overall model was not statistically significant, <span className="font-mono">χ²({independentVars.length}) = {results.model_summary.llr?.toFixed(2) || 'N/A'}, <em>p</em> = {llrPValue.toFixed(3)}</span>. 
                                                    McFadden's <em>R</em>² was {pseudoR2.toFixed(3)}, and classification accuracy was {(accuracy * 100).toFixed(1)}%.
                                                </>
                                            )}
                                        </p>
                                        
                                        {results.hosmer_lemeshow && (
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The Hosmer-Lemeshow goodness-of-fit test yielded <span className="font-mono">χ²({results.hosmer_lemeshow.df}) = {results.hosmer_lemeshow.statistic.toFixed(2)}, <em>p</em> = {results.hosmer_lemeshow.p_value.toFixed(3)}</span>, 
                                                {hlGoodFit ? ' indicating adequate model fit.' : ' suggesting potential lack of fit.'}
                                            </p>
                                        )}
                                        
                                        {sigPredictors.length > 0 && (
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {sigPredictors.map(([varName, pVal], idx) => {
                                                    const or = results.odds_ratios[varName];
                                                    const ci = results.odds_ratios_ci[varName];
                                                    const b = results.coefficients[varName];
                                                    const se = results.std_errors?.[varName];
                                                    const z = results.z_values?.[varName];
                                                    
                                                    return (
                                                        <span key={varName}>
                                                            {idx > 0 && ' '}
                                                            {varName} was a significant predictor, <span className="font-mono"><em>b</em> = {b.toFixed(3)}{se ? <>, <em>SE</em> = {se.toFixed(3)}</> : ''}{z ? <>, <em>z</em> = {z.toFixed(2)}</> : ''}, <em>p</em> {pVal < 0.001 ? '< .001' : `= ${pVal.toFixed(3)}`}, OR = {or.toFixed(2)}, 95% CI [{ci['2.5%'].toFixed(2)}, {ci['97.5%'].toFixed(2)}]</span>.
                                                        </span>
                                                    );
                                                })}
                                            </p>
                                        )}
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The area under the ROC curve (AUC) was {auc.toFixed(3)}, indicating {getAUCInterpretation(auc).desc}. 
                                            {auc >= 0.7 
                                                ? ` This suggests the model has ${auc >= 0.8 ? 'good to excellent' : 'acceptable'} discriminative ability between the two outcome classes.`
                                                : ` This indicates limited discriminative ability, suggesting additional predictors may be needed.`}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {/* Visualization */}
                        {analysisResult?.plot && (
                            <Card>
                                <CardHeader><CardTitle>Model Visualization</CardTitle><CardDescription>ROC curve and confusion matrix</CardDescription></CardHeader>
                                <CardContent><Image src={analysisResult.plot} alt="Logistic Regression Plots" width={1400} height={600} className="w-full h-auto rounded-md border" /></CardContent>
                            </Card>
                        )}

                        {/* Model Performance */}
                        <Card>
                            <CardHeader><CardTitle>Model Performance</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell className="font-medium">Accuracy</TableCell><TableCell className="text-right font-mono">{(accuracy * 100).toFixed(1)}%</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">AUC-ROC</TableCell><TableCell className="text-right font-mono">{auc.toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">McFadden's R²</TableCell><TableCell className="text-right font-mono">{pseudoR2.toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Log-Likelihood</TableCell><TableCell className="text-right font-mono">{results.model_summary.llf.toFixed(2)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">AIC</TableCell><TableCell className="text-right font-mono">{results.model_summary.aic.toFixed(2)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">BIC</TableCell><TableCell className="text-right font-mono">{results.model_summary.bic.toFixed(2)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">LLR Chi-Square</TableCell><TableCell className="text-right font-mono">{results.model_summary.llr?.toFixed(2) || 'N/A'}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">LLR p-value</TableCell><TableCell className="text-right font-mono">{llrPValue < 0.001 ? '<.001' : llrPValue.toFixed(4)}{getSignificanceStars(llrPValue)}</TableCell></TableRow>
                                        {results.hosmer_lemeshow && (
                                            <>
                                                <TableRow><TableCell className="font-medium">Hosmer-Lemeshow χ²</TableCell><TableCell className="text-right font-mono">{results.hosmer_lemeshow.statistic.toFixed(2)}</TableCell></TableRow>
                                                <TableRow><TableCell className="font-medium">Hosmer-Lemeshow p-value</TableCell><TableCell className="text-right font-mono">{results.hosmer_lemeshow.p_value.toFixed(4)}</TableCell></TableRow>
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Coefficients & Odds Ratios with VIF */}
                        <Card>
                            <CardHeader><CardTitle>Coefficients & Odds Ratios</CardTitle><CardDescription>Effect of each predictor on the outcome probability</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            <TableHead className="text-right">B</TableHead>
                                            <TableHead className="text-right">SE</TableHead>
                                            <TableHead className="text-right">z</TableHead>
                                            <TableHead className="text-right">OR</TableHead>
                                            <TableHead className="text-right">95% CI</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">VIF</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.coefficients).map(([variable, coeff]) => {
                                            const vifVal = results.vif[variable];
                                            const vifInterp = vifVal ? getVIFInterpretation(vifVal) : null;
                                            return (
                                                <TableRow key={variable}>
                                                    <TableCell className="font-medium">{variable}</TableCell>
                                                    <TableCell className="text-right font-mono">{coeff.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.std_errors[variable]?.toFixed(4) || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.z_values[variable]?.toFixed(2) || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.odds_ratios[variable].toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">[{results.odds_ratios_ci[variable]['2.5%'].toFixed(3)}, {results.odds_ratios_ci[variable]['97.5%'].toFixed(3)}]</TableCell>
                                                    <TableCell className="text-right font-mono">{results.p_values[variable] < 0.001 ? '<.001' : results.p_values[variable].toFixed(4)}{getSignificanceStars(results.p_values[variable])}</TableCell>
                                                    <TableCell className={`text-right font-mono ${vifInterp?.color || ''}`}>{vifVal ? vifVal.toFixed(2) : 'N/A'}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">OR &gt; 1: increased odds | OR &lt; 1: decreased odds | VIF &gt; 5: multicollinearity concern | *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05</p></CardFooter>
                        </Card>

                        {/* Classification Report */}
                        <Card>
                            <CardHeader><CardTitle>Classification Report</CardTitle><CardDescription>Per-class performance metrics</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Class</TableHead>
                                            <TableHead className="text-right">Precision</TableHead>
                                            <TableHead className="text-right">Recall</TableHead>
                                            <TableHead className="text-right">F1-Score</TableHead>
                                            <TableHead className="text-right">Support</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.dependent_classes.map(cls => {
                                            const report = results.metrics.classification_report[cls];
                                            return (
                                                <TableRow key={cls}>
                                                    <TableCell className="font-medium">{cls}</TableCell>
                                                    <TableCell className="text-right font-mono">{report.precision.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{report.recall.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{report['f1-score'].toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{report.support}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">Precision: accuracy of positive predictions | Recall: coverage of actual positives | F1: harmonic mean</p></CardFooter>
                        </Card>
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>
        </div>
    );
}
