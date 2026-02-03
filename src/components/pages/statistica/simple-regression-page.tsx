'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef, useReducer } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { 
    Sigma, BarChart as BarChartIcon, Settings, FileSearch, CheckCircle, AlertTriangle, 
    HelpCircle, Loader2, TrendingUp, Target, BookOpen, Lightbulb, Download, 
    FileSpreadsheet, ImageIcon, Database, Settings2, Shield, FileText, 
    ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, ArrowRight, ChevronDown, 
    FileCode, FileType, Info, ArrowUpRight, ArrowDownRight, Activity, Code, Copy
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/simple_regression.py?alt=media";

const metricDefinitions: Record<string, string> = {
    r_squared: "The proportion of variance in the dependent variable explained by the independent variable. Ranges from 0 to 1, where higher values indicate better fit.",
    adjusted_r_squared: "R-squared adjusted for the number of predictors. More reliable for comparing models with different numbers of predictors.",
    rmse: "Root Mean Square Error. The average prediction error in the same units as the dependent variable. Lower values indicate better predictions.",
    mae: "Mean Absolute Error. The average absolute difference between predicted and actual values. Less sensitive to outliers than RMSE.",
    f_statistic: "Tests whether the overall regression model is statistically significant. Higher values indicate stronger evidence against the null hypothesis.",
    p_value: "The probability of observing the data if there were no true relationship. Values below 0.05 are typically considered statistically significant.",
    slope: "The regression coefficient (β₁) indicating how much Y changes for each one-unit increase in X.",
    intercept: "The predicted value of Y when X equals zero (β₀). May not always have a meaningful interpretation.",
    standard_error: "The estimated standard deviation of the coefficient estimate. Used to calculate confidence intervals and t-tests.",
    t_value: "The coefficient divided by its standard error. Used to test if the coefficient is significantly different from zero.",
    confidence_interval: "A range of plausible values for the true coefficient. A 95% CI means we're 95% confident the true value lies within this range.",
    pearson_r: "The correlation coefficient measuring the strength and direction of the linear relationship. Ranges from -1 to +1.",
    durbin_watson: "Tests for autocorrelation in residuals. Values near 2 indicate no autocorrelation; <1.5 suggests positive, >2.5 suggests negative autocorrelation.",
    shapiro_wilk: "Tests if residuals are normally distributed. p > 0.05 suggests normality assumption is met.",
    breusch_pagan: "Tests for heteroscedasticity (non-constant variance). p > 0.05 suggests constant variance assumption is met.",
    residuals: "The differences between observed and predicted values. Used to check regression assumptions."
};

// =============================================================================
// Type Definitions
// =============================================================================

interface RegressionMetrics {
    r2: number;
    adj_r2: number;
    rmse: number;
    mae: number;
    mse: number;
    n_observations?: number;
}

interface CoefficientTests {
    params: Record<string, number>;
    pvalues: Record<string, number>;
    bse: Record<string, number>;
    tvalues: Record<string, number>;
    conf_int_lower?: Record<string, number>;
    conf_int_upper?: Record<string, number>;
}

interface RegressionDiagnostics {
    f_statistic?: number;
    f_pvalue?: number;
    durbin_watson?: number;
    coefficient_tests?: CoefficientTests;
    correlation?: { pearson_r: number; p_value: number };
    normality_tests?: {
        jarque_bera?: { statistic: number; p_value: number };
        shapiro_wilk?: { statistic: number; p_value: number };
    };
    heteroscedasticity_tests?: {
        breusch_pagan?: { statistic: number; p_value: number };
    };
    confidence_level?: number;
}

interface SimpleRegressionResults {
    model_name: string;
    model_type: string;
    features: string[];
    target?: string;
    metrics: { all_data: RegressionMetrics };
    diagnostics: RegressionDiagnostics;
    interpretation?: string;
    equation?: string;
    n_dropped?: number;
}

interface FullAnalysisResponse {
    results: SimpleRegressionResults;
    model_name: string;
    model_type: string;
    plot: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface SimpleRegressionConfig {
    targetVar: string;
    featureVar: string;
}

type ConfigAction =
    | { type: 'SET_TARGET'; payload: string }
    | { type: 'SET_FEATURE'; payload: string }
    | { type: 'RESET'; payload: { defaultTarget: string; defaultFeature: string } };

interface ValidationCheck {
    label: string;
    passed: boolean;
    detail: string;
    severity: 'critical' | 'warning' | 'info';
}

// =============================================================================
// Constants
// =============================================================================

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Preview' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// =============================================================================
// Python Code Modal Component
// =============================================================================

const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - Simple Linear Regression"
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
    title?: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen]);

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
        link.download = 'simple_regression.py';
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
                        {title}
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


// 👇 PythonCodeModal 컴포넌트 끝난 후에 추가
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Simple Regression Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in simple linear regression analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
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
// =============================================================================
// APA Interpretation Generator
// =============================================================================

const generateRegressionInterpretations = (
    results: SimpleRegressionResults,
    targetVar: string,
    featureVar: string,
    n: number
) => {
    const r2 = results.metrics.all_data.r2;
    const adjR2 = results.metrics.all_data.adj_r2;
    const rmse = results.metrics.all_data.rmse;
    const fStat = results.diagnostics?.f_statistic;
    const fPValue = results.diagnostics?.f_pvalue ?? 1;
    const correlation = results.diagnostics?.correlation?.pearson_r ?? 0;
    const corrPValue = results.diagnostics?.correlation?.p_value ?? 1;
    
    const coeffTests = results.diagnostics?.coefficient_tests;
    const intercept = coeffTests?.params?.['const'] ?? 0;
    const slope = coeffTests?.params?.[featureVar] ?? 0;
    const slopeSE = coeffTests?.bse?.[featureVar] ?? 0;
    const slopeT = coeffTests?.tvalues?.[featureVar] ?? 0;
    const slopePValue = coeffTests?.pvalues?.[featureVar] ?? 1;
    const ciLower = coeffTests?.conf_int_lower?.[featureVar];
    const ciUpper = coeffTests?.conf_int_upper?.[featureVar];
    
    const isSignificant = fPValue < 0.05;
    const isSlopeSignificant = slopePValue < 0.05;
    
    // Effect size interpretation for R²
    let r2Label = 'negligible';
    if (r2 >= 0.26) r2Label = 'large';
    else if (r2 >= 0.13) r2Label = 'medium';
    else if (r2 >= 0.02) r2Label = 'small';
    
    // Correlation strength
    const absR = Math.abs(correlation);
    let corrLabel = 'negligible';
    if (absR >= 0.7) corrLabel = 'strong';
    else if (absR >= 0.4) corrLabel = 'moderate';
    else if (absR >= 0.2) corrLabel = 'weak';
    
    const direction = slope > 0 ? 'positive' : 'negative';
    
    // Format p-values
    const formatP = (p: number) => p < 0.001 ? '< .001' : `= ${p.toFixed(3).replace(/^0/, '')}`;
    
    // Build APA summary
    let overall = '';
    overall = `A simple linear regression was conducted to examine the relationship between <strong>${featureVar}</strong> (predictor) and <strong>${targetVar}</strong> (outcome) using data from <em>N</em> = ${n} observations. `;
    
    if (isSignificant) {
        overall += `The overall regression model was statistically significant, <em>F</em>(1, ${n - 2}) = ${fStat?.toFixed(2)}, <em>p</em> ${formatP(fPValue)}, <em>R</em>² = ${r2.toFixed(3)}. `;
        overall += `The model explained ${(r2 * 100).toFixed(1)}% of the variance in ${targetVar}, representing a ${r2Label} effect size. `;
        
        if (isSlopeSignificant) {
            overall += `${featureVar} was a significant predictor of ${targetVar}, <em>b</em> = ${slope.toFixed(3)}, <em>SE</em> = ${slopeSE.toFixed(3)}, <em>t</em>(${n - 2}) = ${slopeT.toFixed(2)}, <em>p</em> ${formatP(slopePValue)}`;
            if (ciLower !== undefined && ciUpper !== undefined) {
                overall += `, 95% CI [${ciLower.toFixed(3)}, ${ciUpper.toFixed(3)}]`;
            }
            overall += `. `;
            overall += `For every one-unit increase in ${featureVar}, ${targetVar} ${slope > 0 ? 'increased' : 'decreased'} by ${Math.abs(slope).toFixed(3)} units on average.`;
        }
    } else {
        overall += `The overall regression model was not statistically significant, <em>F</em>(1, ${n - 2}) = ${fStat?.toFixed(2)}, <em>p</em> ${formatP(fPValue)}, <em>R</em>² = ${r2.toFixed(3)}. `;
        overall += `${featureVar} did not significantly predict ${targetVar}. `;
        overall += `The null hypothesis that there is no linear relationship between ${featureVar} and ${targetVar} cannot be rejected.`;
    }
    
    // Statistical insights
    const insights: string[] = [];
    
    // Model fit
    if (fPValue < 0.001) {
        insights.push(`<strong>Model Significance:</strong> <em>p</em> < .001. The regression model is highly significant.`);
    } else if (fPValue < 0.01) {
        insights.push(`<strong>Model Significance:</strong> <em>p</em> ${formatP(fPValue)}. Significant at the .01 level.`);
    } else if (fPValue < 0.05) {
        insights.push(`<strong>Model Significance:</strong> <em>p</em> ${formatP(fPValue)}. Significant at the .05 level.`);
    } else {
        insights.push(`<strong>Model Significance:</strong> <em>p</em> ${formatP(fPValue)}. Not statistically significant.`);
    }
    
    // R-squared
    insights.push(`<strong>Variance Explained:</strong> <em>R</em>² = ${r2.toFixed(3)} (${(r2 * 100).toFixed(1)}%). This is a ${r2Label} effect size according to Cohen's conventions.`);
    
    // Correlation
    insights.push(`<strong>Correlation:</strong> Pearson <em>r</em> = ${correlation.toFixed(3)}, indicating a ${corrLabel} ${direction} linear relationship.`);
    
    // Slope interpretation
    if (isSlopeSignificant) {
        insights.push(`<strong>Regression Coefficient:</strong> <em>b</em> = ${slope.toFixed(3)}. Each unit increase in ${featureVar} is associated with a ${Math.abs(slope).toFixed(3)} unit ${slope > 0 ? 'increase' : 'decrease'} in ${targetVar}.`);
    } else {
        insights.push(`<strong>Regression Coefficient:</strong> <em>b</em> = ${slope.toFixed(3)}, but not statistically significant (<em>p</em> ${formatP(slopePValue)}).`);
    }
    
    // Prediction error
    insights.push(`<strong>Prediction Accuracy:</strong> RMSE = ${rmse.toFixed(3)}. On average, predictions deviate from actual values by ±${rmse.toFixed(3)} units.`);
    
    // Sample size adequacy
    insights.push(`<strong>Sample Size:</strong> <em>N</em> = ${n}. ${n >= 50 ? 'Adequate for reliable inference.' : n >= 30 ? 'Acceptable, but more data would increase precision.' : 'Consider collecting more data for robust conclusions.'}`);
    
    return {
        overall_analysis: overall,
        statistical_insights: insights,
    };
};

// =============================================================================
// Config Reducer
// =============================================================================

function configReducer(state: SimpleRegressionConfig, action: ConfigAction): SimpleRegressionConfig {
    switch (action.type) {
        case 'SET_TARGET':
            return { ...state, targetVar: action.payload };
        case 'SET_FEATURE':
            return { ...state, featureVar: action.payload };
        case 'RESET':
            return { targetVar: action.payload.defaultTarget, featureVar: action.payload.defaultFeature };
        default:
            return state;
    }
}

// =============================================================================
// Utility Functions
// =============================================================================

const getSignificanceStars = (p: number | undefined): string => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const getR2Interpretation = (r2: number): { label: string; desc: string; stars: number } => {
    if (r2 >= 0.75) return { label: 'Excellent', desc: 'strong explanatory power', stars: 5 };
    if (r2 >= 0.50) return { label: 'Good', desc: 'substantial explanatory power', stars: 4 };
    if (r2 >= 0.25) return { label: 'Moderate', desc: 'moderate explanatory power', stars: 3 };
    if (r2 >= 0.10) return { label: 'Weak', desc: 'limited explanatory power', stars: 2 };
    return { label: 'Very Weak', desc: 'minimal explanatory power', stars: 1 };
};

const formatPValue = (p: number | undefined): string => {
    if (p === undefined) return 'N/A';
    if (p < 0.001) return '<.001';
    return p.toFixed(4);
};

const formatCoefficient = (value: number): string => {
    if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.001 && value !== 0)) {
        return value.toExponential(3);
    }
    return value.toFixed(4);
};

const getCorrelationStrength = (r: number): { label: string; color: string } => {
    const absR = Math.abs(r);
    if (absR >= 0.8) return { label: 'Very Strong', color: 'text-primary' };
    if (absR >= 0.6) return { label: 'Strong', color: 'text-primary' };
    if (absR >= 0.4) return { label: 'Moderate', color: 'text-amber-600' };
    if (absR >= 0.2) return { label: 'Weak', color: 'text-amber-600' };
    return { label: 'Very Weak', color: 'text-muted-foreground' };
};

// =============================================================================
// Reusable Components
// =============================================================================

const StarRating = ({ value, max = 5 }: { value: number; max?: number }) => (
    <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => (
            <span key={i} className={`text-lg ${i < value ? 'text-amber-400' : 'text-muted-foreground/30'}`}>★</span>
        ))}
    </div>
);

interface MetricCardProps {
    label: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    highlight?: boolean;
    warning?: boolean;
}

const MetricCard = ({ label, value, subtitle, icon: Icon, highlight, warning }: MetricCardProps) => (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}>
        <CardContent className="p-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={`text-2xl font-semibold ${warning ? 'text-amber-600 dark:text-amber-400' : ''}`}>{value}</p>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
        </CardContent>
    </Card>
);

const ValidationCheckItem = ({ check }: { check: ValidationCheck }) => {
    const bgClass = check.passed ? 'bg-primary/5' : check.severity === 'critical' ? 'bg-destructive/10' : 'bg-amber-50/50 dark:bg-amber-950/20';
    const iconClass = check.passed ? 'text-primary' : check.severity === 'critical' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400';
    const textClass = check.passed ? 'text-foreground' : check.severity === 'critical' ? 'text-destructive' : 'text-amber-700 dark:text-amber-300';
    
    return (
        <div className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${bgClass}`}>
            {check.passed ? <CheckCircle2 className={`w-5 h-5 ${iconClass} shrink-0 mt-0.5`} /> : <AlertTriangle className={`w-5 h-5 ${iconClass} shrink-0 mt-0.5`} />}
            <div>
                <p className={`font-medium text-sm ${textClass}`}>{check.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
            </div>
        </div>
    );
};

const ProgressBar = ({ currentStep, maxReachedStep, hasResults, onStepClick }: { currentStep: Step; maxReachedStep: Step; hasResults: boolean; onStepClick: (step: Step) => void }) => (
    <div className="w-full mb-8">
        <div className="flex items-center justify-between">
            {STEPS.map((step) => {
                const isCompleted = step.id < currentStep || (step.id >= 4 && hasResults);
                const isCurrent = step.id === currentStep;
                const isClickable = step.id <= maxReachedStep || (step.id >= 4 && hasResults);
                return (
                    <button key={step.id} onClick={() => isClickable && onStepClick(step.id)} disabled={!isClickable} className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
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

const SimpleRegressionGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Simple Linear Regression Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Simple Regression */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Simple Linear Regression?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Simple linear regression models the relationship between <strong>one predictor variable (X)</strong> and 
                <strong> one outcome variable (Y)</strong> using a straight line. It finds the best-fitting line that 
                minimizes the distance from each data point to the line.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The equation:</strong> Y = β₀ + β₁X + ε<br/>
                  <span className="text-muted-foreground text-xs">
                    β₀ = intercept (Y when X = 0), β₁ = slope (change in Y per unit X), ε = error
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Simple Regression?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You have <strong>one continuous predictor</strong> and <strong>one continuous outcome</strong></li>
                    <li>• You want to <strong>predict Y from X</strong></li>
                    <li>• You suspect a <strong>linear (straight-line) relationship</strong></li>
                    <li>• You want to <strong>quantify the effect</strong> of X on Y</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Don't use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• The relationship is clearly curved (use polynomial regression)</li>
                    <li>• You have multiple predictors (use multiple regression)</li>
                    <li>• Your outcome is categorical (use logistic regression)</li>
                    <li>• Sample size is very small (n &lt; 20)</li>
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
                  <p className="font-medium text-sm">R-squared (R²) — How Much Is Explained</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of variance in Y explained by X. Ranges from 0 to 1.
                  </p>
                  <div className="grid grid-cols-5 gap-2 mt-2 text-xs text-center">
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">R² &lt; 0.10</p>
                      <p className="text-muted-foreground">Very Weak</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.10 - 0.25</p>
                      <p className="text-muted-foreground">Weak</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.25 - 0.50</p>
                      <p className="text-muted-foreground">Moderate</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.50 - 0.75</p>
                      <p className="text-muted-foreground">Good</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">R² &gt; 0.75</p>
                      <p className="text-muted-foreground">Excellent</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Slope (β₁) — The Effect Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For every 1-unit increase in X, Y changes by β₁ units on average.
                    <br/><strong>Positive slope:</strong> X ↑ → Y ↑ (variables move together)
                    <br/><strong>Negative slope:</strong> X ↑ → Y ↓ (variables move opposite)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">RMSE — Prediction Accuracy</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Root Mean Square Error — average prediction error in the same units as Y.
                    <br/><strong>Example:</strong> RMSE = 5 means predictions are typically off by ±5 units.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">F-test p-value — Is the Model Significant?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>p &lt; 0.05:</strong> The relationship is statistically significant.<br/>
                    <strong>p ≥ 0.05:</strong> Cannot conclude a real relationship exists.<br/>
                    In simple regression, F-test = t-test for the slope.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Coefficients */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sigma className="w-4 h-4" />
                Interpreting the Coefficients
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Intercept (β₀ or "const")</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The predicted value of Y when X = 0. Often not meaningful if X = 0 doesn't 
                    make sense in your context (e.g., height = 0 is impossible).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Slope (β₁)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The change in Y for each 1-unit increase in X, holding all else constant.
                    <br/><strong>Example:</strong> If slope = 2.5 for "study hours → test score", 
                    each additional hour of study is associated with 2.5 more points on average.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Confidence Intervals for Slope</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The 95% CI gives a range of plausible values for the true slope.
                    <br/><strong>CI excludes zero:</strong> The effect is significantly different from zero.
                    <br/><strong>CI includes zero:</strong> The effect may not be real.
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
                    The relationship between X and Y should be linear.
                    <br/><strong>Check:</strong> Scatter plot should show a straight-line pattern.
                    <br/><strong>Violated?</strong> Try polynomial regression or transform variables.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Independence</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Observations should be independent of each other.
                    <br/><strong>Check:</strong> Durbin-Watson statistic ≈ 2 is ideal.
                    <br/><strong>Violated?</strong> Consider time-series methods.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Homoscedasticity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The variance of residuals should be constant across all X values.
                    <br/><strong>Check:</strong> Breusch-Pagan test p &gt; 0.05.
                    <br/><strong>Violated?</strong> Use robust standard errors or transform Y.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">4. Normality of Residuals</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Residuals should be approximately normally distributed.
                    <br/><strong>Check:</strong> Shapiro-Wilk test p &gt; 0.05, or Q-Q plot.
                    <br/><strong>Violated?</strong> Less critical with n &gt; 30 (Central Limit Theorem).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Tip:</strong> This tool automatically checks these assumptions and shows 
                    diagnostic tests in the Statistics section.
                  </p>
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
                  <p className="font-medium text-sm text-primary mb-1">Business</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ad spending → Sales revenue</li>
                    <li>• Price → Units sold</li>
                    <li>• Employee experience → Salary</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Healthcare</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Dosage → Blood pressure</li>
                    <li>• Age → Cholesterol level</li>
                    <li>• Exercise minutes → Weight loss</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Education</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Study hours → Test score</li>
                    <li>• Class size → Performance</li>
                    <li>• Attendance → Final grade</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Science</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Temperature → Reaction rate</li>
                    <li>• Fertilizer amount → Crop yield</li>
                    <li>• Altitude → Boiling point</li>
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
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Always plot your data first (scatter plot)</li>
                    <li>• Check for outliers that might skew results</li>
                    <li>• Ensure n ≥ 20 (preferably 30+)</li>
                    <li>• Verify both variables are continuous</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting Results</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Focus on R² for practical significance</li>
                    <li>• Check if slope's CI excludes zero</li>
                    <li>• Review assumption diagnostics</li>
                    <li>• Consider domain knowledge</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report: β, SE, t, p, R², F, n</li>
                    <li>• Include 95% CI for slope</li>
                    <li>• Show the regression equation</li>
                    <li>• APA: F(1, n-2) = X.XX, p = .XXX, R² = .XX</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Pitfalls</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Confusing correlation with causation</li>
                    <li>• Extrapolating beyond data range</li>
                    <li>• Ignoring assumption violations</li>
                    <li>• Over-relying on p-values alone</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Simple regression shows association, not causation. 
                A significant relationship means X is associated with Y, but doesn't prove X causes Y. 
                Consider confounding variables, reverse causation, and experimental design.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};
// =============================================================================
// Intro Page Component
// =============================================================================

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><TrendingUp className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Simple Linear Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Predict one thing from another — find the formula that connects them</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Find the Pattern</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Discover if X goes up when Y goes up (or down)</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Make Predictions</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Forecast future values based on the relationship</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChartIcon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Measure Impact</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">See how much X affects Y quantitatively</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-5 h-5" />When to Use This Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Simple Regression when you want to understand if one variable can predict another. For example: Does ad spending predict sales? Does study time predict test scores?</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Two numeric variables:</strong> One predictor (X), one outcome (Y)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Linear pattern:</strong> The relationship should be roughly straight-line</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Enough data:</strong> At least 20+ observations recommended</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />What You'll Learn</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Direction:</strong> Positive or negative relationship?</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Strength:</strong> How much does X explain Y?</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Formula:</strong> Exact equation to predict Y from X</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {regressionExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(regressionExample)} size="lg"><TrendingUp className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

// =============================================================================
// Custom Hooks
// =============================================================================

function useSimpleRegressionAnalysis({ data, config }: { data: DataSet; config: SimpleRegressionConfig }) {
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = useCallback(async (): Promise<boolean> => {
        if (!config.targetVar || !config.featureVar) {
            setError('Please select both target and feature variables.');
            return false;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/simple-regression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, targetVar: config.targetVar, feature: config.featureVar })
            });
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                throw new Error(errorResult.detail || errorResult.error || `HTTP error: ${response.status}`);
            }
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            return true;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error occurred';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [data, config]);

    const resetAnalysis = useCallback(() => {
        setAnalysisResult(null);
        setError(null);
    }, []);

    return { analysisResult, isLoading, error, runAnalysis, resetAnalysis };
}

function useDataValidation(data: DataSet, config: SimpleRegressionConfig): { checks: ValidationCheck[]; allCriticalPassed: boolean } {
    return useMemo(() => {
        const checks: ValidationCheck[] = [];
        checks.push({ label: 'Target variable selected', passed: config.targetVar !== '', detail: config.targetVar ? `Target: ${config.targetVar}` : 'Please select a target variable', severity: 'critical' });
        checks.push({ label: 'Feature variable selected', passed: config.featureVar !== '', detail: config.featureVar ? `Feature: ${config.featureVar}` : 'Please select a feature variable', severity: 'critical' });
        checks.push({ label: 'Sufficient sample size', passed: data.length >= 20, detail: `n = ${data.length} observations (recommended: 20+)`, severity: data.length >= 10 ? 'warning' : 'critical' });
        if (config.targetVar && config.featureVar) {
            const isMissing = (value: unknown): boolean => value == null || value === '' || (typeof value === 'number' && isNaN(value));
            const missingCount = data.filter((row) => isMissing(row[config.targetVar as keyof typeof row]) || isMissing(row[config.featureVar as keyof typeof row])).length;
            checks.push({ label: 'Missing values check', passed: missingCount === 0, detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} row(s) with missing values will be excluded`, severity: 'info' });
        }
        const allCriticalPassed = checks.filter(c => c.severity === 'critical').every(c => c.passed);
        return { checks, allCriticalPassed };
    }, [data, config]);
}

function useExportHandlers({ analysisResult, config, data, resultsRef }: { analysisResult: FullAnalysisResponse | null; config: SimpleRegressionConfig; data: DataSet; resultsRef: React.RefObject<HTMLDivElement | null> }) {
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        const metrics = results.metrics.all_data;
        let csvContent = "SIMPLE LINEAR REGRESSION RESULTS\n";
        csvContent += `Target Variable: ${config.targetVar}\nFeature Variable: ${config.featureVar}\nEquation: ${results.equation || 'N/A'}\n\n`;
        const performanceData = [{ Metric: 'R²', Value: metrics.r2 }, { Metric: 'Adjusted R²', Value: metrics.adj_r2 }, { Metric: 'RMSE', Value: metrics.rmse }, { Metric: 'MAE', Value: metrics.mae }, { Metric: 'F-test p-value', Value: results.diagnostics?.f_pvalue }];
        csvContent += "MODEL PERFORMANCE\n" + Papa.unparse(performanceData) + "\n\n";
        if (results.diagnostics?.coefficient_tests) {
            const coeffData = Object.entries(results.diagnostics.coefficient_tests.params).map(([name, coef]) => ({ Variable: name, Coefficient: coef, 'Std Error': results.diagnostics!.coefficient_tests!.bse?.[name], 't-value': results.diagnostics!.coefficient_tests!.tvalues?.[name], 'p-value': results.diagnostics!.coefficient_tests!.pvalues?.[name] }));
            csvContent += "COEFFICIENTS\n" + Papa.unparse(coeffData) + "\n";
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Simple_Regression_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: 'CSV Downloaded' });
    }, [analysisResult, config, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Simple_Regression_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image;
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [resultsRef, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word document..." });
        try {
            const response = await fetch('/api/export/simple-regression-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results: analysisResult.results, targetVar: config.targetVar, featureVar: config.featureVar, sampleSize: data.length }) });
            if (!response.ok) throw new Error('Failed to generate document');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Simple_Regression_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed to generate document" }); }
    }, [analysisResult, config, data.length, toast]);

    return { handleDownloadCSV, handleDownloadPNG, handleDownloadDOCX, isDownloading };
}

// =============================================================================
// Main Component
// =============================================================================

interface SimpleRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SimpleRegressionPage({ data, numericHeaders, onLoadExample }: SimpleRegressionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [config, dispatch] = useReducer(configReducer, { targetVar: '', featureVar: '' });
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== config.targetVar), [numericHeaders, config.targetVar]);

    const { analysisResult, isLoading, error, runAnalysis, resetAnalysis } = useSimpleRegressionAnalysis({ data, config });
    const { checks: dataValidation, allCriticalPassed } = useDataValidation(data, config);
    const exportHandlers = useExportHandlers({ analysisResult, config, data, resultsRef });

    useEffect(() => {
        if (data.length === 0) { setView('intro'); }
        else if (canRun) {
            const defaultTarget = numericHeaders[numericHeaders.length - 1] || '';
            const defaultFeature = numericHeaders.filter(h => h !== defaultTarget)[0] || '';
            dispatch({ type: 'RESET', payload: { defaultTarget, defaultFeature } });
            setView('main');
            resetAnalysis();
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun, resetAnalysis]);

    useEffect(() => { if (error) toast({ variant: 'destructive', title: 'Analysis Error', description: error }); }, [error, toast]);

    const goToStep = useCallback((step: Step) => { setCurrentStep(step); setMaxReachedStep(prev => Math.max(prev, step) as Step); }, []);
    const nextStep = useCallback(() => { if (currentStep < 6) goToStep((currentStep + 1) as Step); }, [currentStep, goToStep]);
    const prevStep = useCallback(() => { if (currentStep > 1) goToStep((currentStep - 1) as Step); }, [currentStep, goToStep]);
    const handleAnalysis = useCallback(async () => { const success = await runAnalysis(); if (success) goToStep(4); }, [runAnalysis, goToStep]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;

    return (
        <div className="w-full max-w-5xl mx-auto">
        <SimpleRegressionGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
        <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        <PythonCodeModal 
            isOpen={pythonCodeModalOpen} 
            onClose={() => setPythonCodeModalOpen(false)}
            codeUrl={PYTHON_CODE_URL}
        />

            
            <div className="mb-6 flex justify-between items-center">
    <div>
        <h1 className="text-2xl font-bold">Simple Linear Regression</h1>
        <p className="text-muted-foreground mt-1">Model the relationship between two variables</p>
    </div>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose your target (Y) and predictor (X) variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Target Variable (Y)</Label>
                                    <Select value={config.targetVar} onValueChange={(v) => dispatch({ type: 'SET_TARGET', payload: v })}><SelectTrigger className="h-11"><SelectValue placeholder="Select target..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                                    <p className="text-xs text-muted-foreground">The variable you want to predict</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Feature Variable (X)</Label>
                                    <Select value={config.featureVar} onValueChange={(v) => dispatch({ type: 'SET_FEATURE', payload: v })}><SelectTrigger className="h-11"><SelectValue placeholder="Select feature..." /></SelectTrigger><SelectContent>{availableFeatures.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                                    <p className="text-xs text-muted-foreground">The variable used for prediction</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p></div>
                            {config.targetVar && config.featureVar && (<div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Model Preview</h4><p className="text-sm font-mono text-muted-foreground">{config.targetVar} = β₀ + β₁ × {config.featureVar} + ε</p></div>)}
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!config.targetVar || !config.featureVar}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Preview */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Preview</CardTitle><CardDescription>Review your model configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-4">
                                <h4 className="font-medium text-sm">Model Configuration</h4>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2"><p className="text-muted-foreground"><strong className="text-foreground">Target (Y):</strong> {config.targetVar}</p><p className="text-muted-foreground"><strong className="text-foreground">Feature (X):</strong> {config.featureVar}</p></div>
                                    <div className="space-y-2"><p className="text-muted-foreground"><strong className="text-foreground">Model Type:</strong> Simple Linear (OLS)</p><p className="text-muted-foreground"><strong className="text-foreground">Sample Size:</strong> {data.length}</p></div>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-sky-600" />What Simple Regression Does</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground"><li>• Fits a straight line through your data points</li><li>• Finds the equation: Y = intercept + slope × X</li><li>• Tests if the relationship is statistically significant</li><li>• Measures how much X explains variation in Y (R²)</li></ul>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{dataValidation.map((check, idx) => <ValidationCheckItem key={idx} check={check} />)}</div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" /><p className="text-sm text-muted-foreground">Ordinary Least Squares (OLS) regression will be performed.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={!allCriticalPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (() => {
                    const r2 = results.metrics.all_data.r2;
                    const r2Interp = getR2Interpretation(r2);
                    const fPValue = results.diagnostics?.f_pvalue ?? 1;
                    const isSignificant = fPValue < 0.05;
                    const correlation = results.diagnostics?.correlation?.pearson_r ?? 0;
                    const corrStrength = getCorrelationStrength(correlation);
                    const slope = results.diagnostics?.coefficient_tests?.params?.[config.featureVar] ?? 0;
                    const isPositive = slope > 0;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>How well does {config.featureVar} predict {config.targetVar}?</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isSignificant && r2 >= 0.25 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : isSignificant ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700' : 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isSignificant && r2 >= 0.25 ? 'text-primary' : isSignificant ? 'text-amber-600' : 'text-destructive'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">{isPositive ? <ArrowUpRight className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <ArrowDownRight className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}<p className="text-sm"><strong>{config.featureVar}</strong> has a <strong>{isPositive ? 'positive' : 'negative'}</strong> relationship with <strong>{config.targetVar}</strong>.{isPositive ? ` As ${config.featureVar} increases, ${config.targetVar} tends to increase.` : ` As ${config.featureVar} increases, ${config.targetVar} tends to decrease.`}</p></div>
                                        <div className="flex items-start gap-3"><Target className={`w-5 h-5 shrink-0 mt-0.5 ${r2 >= 0.25 ? 'text-primary' : 'text-muted-foreground'}`} /><p className="text-sm">The model explains <strong>{(r2 * 100).toFixed(1)}%</strong> of the variation in {config.targetVar}.{r2 >= 0.50 ? " This is substantial explanatory power." : r2 >= 0.25 ? " This is moderate explanatory power." : " Other factors likely play a larger role."}</p></div>
                                        <div className="flex items-start gap-3"><Sigma className={`w-5 h-5 shrink-0 mt-0.5 ${isSignificant ? 'text-primary' : 'text-destructive'}`} /><p className="text-sm">{isSignificant ? <>The relationship is <strong>statistically significant</strong> (p {formatPValue(fPValue)}).</> : <>The relationship is <strong>NOT statistically significant</strong> (p = {fPValue.toFixed(4)}).</>}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isSignificant && r2 >= 0.25 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">{isSignificant && r2 >= 0.25 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Info className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{isSignificant && r2 >= 0.50 ? "Strong Predictive Relationship!" : isSignificant && r2 >= 0.25 ? "Moderate Predictive Relationship" : isSignificant ? "Weak but Significant Relationship" : "No Significant Relationship Found"}</p><p className="text-sm text-muted-foreground mt-1">{isSignificant && r2 >= 0.25 ? `${config.featureVar} is a useful predictor of ${config.targetVar}.` : isSignificant ? `The relationship exists but other factors are more important.` : `Consider trying different predictors or collecting more data.`}</p></div></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricCard label="Explained" value={`${(r2 * 100).toFixed(0)}%`} subtitle={r2Interp.label} icon={Target} highlight={r2 >= 0.25} />
                                    <MetricCard label="Correlation" value={correlation.toFixed(3)} subtitle={`${corrStrength.label} ${correlation > 0 ? '(+)' : '(-)'}`} icon={TrendingUp} />
                                    <MetricCard label="Avg Error" value={`±${results.metrics.all_data.rmse.toFixed(2)}`} subtitle="RMSE" icon={Activity} />
                                    <MetricCard label="p-value" value={formatPValue(fPValue)} subtitle={isSignificant ? 'Significant' : 'Not significant'} icon={Sigma} warning={!isSignificant} />
                                </div>
                                {results.equation && (<div className="p-4 bg-muted/50 rounded-xl text-center"><p className="text-xs text-muted-foreground mb-1">Prediction Equation</p><p className="font-mono text-sm">{results.equation}</p></div>)}
                                <div className="flex items-center justify-center gap-2 py-2"><span className="text-sm text-muted-foreground">Model Quality:</span><StarRating value={isSignificant ? r2Interp.stars : Math.max(1, r2Interp.stars - 1)} /></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (() => {
                    const r2 = results.metrics.all_data.r2;
                    const fPValue = results.diagnostics?.f_pvalue ?? 1;
                    const isSignificant = fPValue < 0.05;
                    const slope = results.diagnostics?.coefficient_tests?.params?.[config.featureVar] ?? 0;
                    const slopePValue = results.diagnostics?.coefficient_tests?.pvalues?.[config.featureVar] ?? 1;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding simple regression results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What Simple Regression Does</h4><p className="text-sm text-muted-foreground">It finds the best straight line through your data points, minimizing the distance from each point to the line. This line represents the relationship between<strong className="text-foreground"> {config.featureVar}</strong> and<strong className="text-foreground"> {config.targetVar}</strong>.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">What R² = {(r2 * 100).toFixed(0)}% Means</h4><p className="text-sm text-muted-foreground">{config.featureVar} explains <strong className="text-foreground">{(r2 * 100).toFixed(0)}%</strong> of why {config.targetVar} varies. The remaining {(100 - r2 * 100).toFixed(0)}% is due to other factors not included in this model.{r2 >= 0.50 ? " This is substantial — your predictor captures a major portion of the variation." : r2 >= 0.25 ? " This is moderate — your predictor is useful but not the whole story." : " This is limited — other factors are likely more important."}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">The Slope ({formatCoefficient(slope)})</h4><p className="text-sm text-muted-foreground">For each 1-unit increase in {config.featureVar}, {config.targetVar} changes by<strong className="text-foreground"> {formatCoefficient(slope)}</strong> units on average.{slopePValue < 0.05 ? " This effect is statistically significant (unlikely due to chance)." : " However, this effect is NOT statistically significant."}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Statistical Significance</h4><p className="text-sm text-muted-foreground">{isSignificant ? (<>The F-test p-value ({formatPValue(fPValue)}) is less than 0.05, meaning the relationship is <strong className="text-foreground">statistically significant</strong>. We're confident this isn't just random noise.</>) : (<>The F-test p-value ({fPValue.toFixed(4)}) is greater than 0.05, meaning we<strong className="text-foreground"> cannot conclude</strong> the relationship is real. The pattern might be due to chance.</>)}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isSignificant && r2 >= 0.25 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">{isSignificant && r2 >= 0.25 ? <><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line: Useful Predictor</> : <><Info className="w-5 h-5 text-amber-600" />Bottom Line: Limited Usefulness</>}</h4>
                                    <p className="text-sm text-muted-foreground">{isSignificant && r2 >= 0.50 ? `${config.featureVar} is a strong predictor of ${config.targetVar}. You can use this model for predictions with reasonable confidence.` : isSignificant && r2 >= 0.25 ? `${config.featureVar} helps predict ${config.targetVar}, but consider adding more predictors for better accuracy.` : isSignificant ? `While statistically significant, ${config.featureVar} explains little variance. Look for better predictors.` : `${config.featureVar} doesn't significantly predict ${config.targetVar}. Try other variables or collect more data.`}</p>
                                </div>
                                <div className="bg-muted/20 rounded-xl p-4"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />R² Interpretation Guide</h4><div className="grid grid-cols-5 gap-2 text-xs"><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;10%</p><p className="text-muted-foreground">Very Weak</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">10-25%</p><p className="text-muted-foreground">Weak</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">25-50%</p><p className="text-muted-foreground">Moderate</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">50-75%</p><p className="text-muted-foreground">Good</p></div><div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;75%</p><p className="text-muted-foreground">Excellent</p></div></div></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={exportHandlers.handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={exportHandlers.handleDownloadPNG} disabled={exportHandlers.isDownloading}>{exportHandlers.isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={exportHandlers.handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Simple Linear Regression Report</h2><p className="text-sm text-muted-foreground mt-1">{config.targetVar} ~ {config.featureVar} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <MetricCard label="R-squared" value={results.metrics.all_data.r2.toFixed(4)} subtitle={getR2Interpretation(results.metrics.all_data.r2).label} icon={Target} />
                                <MetricCard label="RMSE" value={results.metrics.all_data.rmse.toFixed(4)} subtitle="Prediction error" icon={BarChartIcon} />
                                <MetricCard label="Correlation (r)" value={(results.diagnostics?.correlation?.pearson_r ?? 0).toFixed(4)} subtitle="Pearson" icon={TrendingUp} />
                                <MetricCard label="F-test p-value" value={formatPValue(results.diagnostics?.f_pvalue)} subtitle={results.diagnostics?.f_pvalue && results.diagnostics.f_pvalue < 0.05 ? 'Significant' : 'Not significant'} icon={Sigma} warning={results.diagnostics?.f_pvalue ? results.diagnostics.f_pvalue >= 0.05 : false} />
                            </div>

                            {results.equation && (<Card><CardHeader><CardTitle>Regression Equation</CardTitle></CardHeader><CardContent><p className="font-mono text-lg text-center p-4 bg-muted/50 rounded-lg">{results.equation}</p></CardContent></Card>)}

                            {/* APA Format Summary */}
                            {(() => {
                                const interpretations = generateRegressionInterpretations(
                                    results,
                                    config.targetVar,
                                    config.featureVar,
                                    data.length
                                );
                                return (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Detailed Analysis</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    <h3 className="font-semibold">APA Format Summary</h3>
                                                </div>
                                                <div 
                                                    className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                                                    dangerouslySetInnerHTML={{ __html: interpretations.overall_analysis }}
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="font-medium text-sm flex items-center gap-2">
                                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                                    Statistical Insights
                                                </h4>
                                                <div className="grid gap-2">
                                                    {interpretations.statistical_insights.map((insight, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg"
                                                            dangerouslySetInnerHTML={{ __html: insight }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })()}

                            {analysisResult?.plot && (<Card><CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader><CardContent><Image src={analysisResult.plot} alt="Simple Regression Diagnostics" width={1200} height={1000} className="w-full rounded-md border" /></CardContent></Card>)}

                            <Card>
                                <CardHeader><CardTitle>Model Performance</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Interpretation</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow><TableCell className="font-medium">R-squared (R²)</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.r2.toFixed(4)}</TableCell><TableCell className="text-right">{getR2Interpretation(results.metrics.all_data.r2).desc}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">Adjusted R²</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.adj_r2.toFixed(4)}</TableCell><TableCell className="text-right">Penalized for complexity</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">RMSE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.rmse.toFixed(4)}</TableCell><TableCell className="text-right">Average prediction error</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">MAE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.mae.toFixed(4)}</TableCell><TableCell className="text-right">Mean absolute error</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">F-statistic</TableCell><TableCell className="text-right font-mono">{results.diagnostics?.f_statistic?.toFixed(4) ?? 'N/A'}</TableCell><TableCell className="text-right">Model significance test</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">F-test p-value</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics?.f_pvalue)}</TableCell><TableCell className="text-right">{results.diagnostics?.f_pvalue && results.diagnostics.f_pvalue < 0.05 ? '✓ Significant' : '✗ Not significant'}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {results.diagnostics?.coefficient_tests && (
                                <Card>
                                    <CardHeader><CardTitle>Coefficients</CardTitle><CardDescription>Significance: *** p&lt;0.001, ** p&lt;0.01, * p&lt;0.05</CardDescription></CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">B</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">t</TableHead><TableHead className="text-right">p</TableHead><TableHead className="text-right">95% CI</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {Object.entries(results.diagnostics.coefficient_tests.params).map(([key, value]) => {
                                                    const se = results.diagnostics!.coefficient_tests!.bse?.[key];
                                                    const t = results.diagnostics!.coefficient_tests!.tvalues?.[key];
                                                    const p = results.diagnostics!.coefficient_tests!.pvalues?.[key];
                                                    const ciLower = results.diagnostics!.coefficient_tests!.conf_int_lower?.[key];
                                                    const ciUpper = results.diagnostics!.coefficient_tests!.conf_int_upper?.[key];
                                                    return (<TableRow key={key}><TableCell className="font-medium">{key}</TableCell><TableCell className="text-right font-mono">{formatCoefficient(value)}</TableCell><TableCell className="text-right font-mono">{se ? formatCoefficient(se) : 'N/A'}</TableCell><TableCell className="text-right font-mono">{t?.toFixed(3) ?? 'N/A'}</TableCell><TableCell className="text-right font-mono">{formatPValue(p)}{getSignificanceStars(p)}</TableCell><TableCell className="text-right font-mono text-xs">{ciLower !== undefined && ciUpper !== undefined ? `[${formatCoefficient(ciLower)}, ${formatCoefficient(ciUpper)}]` : 'N/A'}</TableCell></TableRow>);
                                                })}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {results.diagnostics?.correlation && (
                                <Card>
                                    <CardHeader><CardTitle>Correlation Analysis</CardTitle></CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Measure</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Interpretation</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                <TableRow><TableCell className="font-medium">Pearson r</TableCell><TableCell className="text-right font-mono">{results.diagnostics.correlation.pearson_r.toFixed(4)}</TableCell><TableCell className="text-right">{getCorrelationStrength(results.diagnostics.correlation.pearson_r).label} {results.diagnostics.correlation.pearson_r > 0 ? 'positive' : 'negative'}</TableCell></TableRow>
                                                <TableRow><TableCell className="font-medium">Correlation p-value</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.correlation.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.correlation.p_value < 0.05 ? '✓ Significant correlation' : '✗ Not significant'}</TableCell></TableRow>
                                                <TableRow><TableCell className="font-medium">R² (Coefficient of Determination)</TableCell><TableCell className="text-right font-mono">{(Math.pow(results.diagnostics.correlation.pearson_r, 2) * 100).toFixed(1)}%</TableCell><TableCell className="text-right">Variance explained</TableCell></TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Assumption Diagnostics</CardTitle><CardDescription>Tests for regression assumptions</CardDescription></CardHeader>
                                <CardContent className="space-y-4">
                                    {results.diagnostics?.normality_tests && (
                                        <div>
                                            <h4 className="font-medium text-sm mb-2">Normality of Residuals</h4>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {results.diagnostics.normality_tests.jarque_bera && (<TableRow><TableCell className="font-medium">Jarque-Bera</TableCell><TableCell className="text-right font-mono">{results.diagnostics.normality_tests.jarque_bera.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.normality_tests.jarque_bera.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.normality_tests.jarque_bera.p_value > 0.05 ? <span className="text-primary">✓ Normal</span> : <span className="text-amber-600">⚠ Non-normal</span>}</TableCell></TableRow>)}
                                                    {results.diagnostics.normality_tests.shapiro_wilk && (<TableRow><TableCell className="font-medium">Shapiro-Wilk</TableCell><TableCell className="text-right font-mono">{results.diagnostics.normality_tests.shapiro_wilk.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.normality_tests.shapiro_wilk.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.normality_tests.shapiro_wilk.p_value > 0.05 ? <span className="text-primary">✓ Normal</span> : <span className="text-amber-600">⚠ Non-normal</span>}</TableCell></TableRow>)}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                    {results.diagnostics?.heteroscedasticity_tests?.breusch_pagan && (
                                        <div>
                                            <h4 className="font-medium text-sm mb-2">Homoscedasticity (Constant Variance)</h4>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader>
                                                <TableBody><TableRow><TableCell className="font-medium">Breusch-Pagan</TableCell><TableCell className="text-right font-mono">{results.diagnostics.heteroscedasticity_tests.breusch_pagan.statistic.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{formatPValue(results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value)}</TableCell><TableCell className="text-right">{results.diagnostics.heteroscedasticity_tests.breusch_pagan.p_value > 0.05 ? <span className="text-primary">✓ Homoscedastic</span> : <span className="text-amber-600">⚠ Heteroscedastic</span>}</TableCell></TableRow></TableBody>
                                            </Table>
                                        </div>
                                    )}
                                    {results.diagnostics?.durbin_watson !== undefined && (
                                        <div>
                                            <h4 className="font-medium text-sm mb-2">Independence of Residuals</h4>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Statistic</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader>
                                                <TableBody><TableRow><TableCell className="font-medium">Durbin-Watson</TableCell><TableCell className="text-right font-mono">{results.diagnostics.durbin_watson.toFixed(4)}</TableCell><TableCell className="text-right">{results.diagnostics.durbin_watson >= 1.5 && results.diagnostics.durbin_watson <= 2.5 ? <span className="text-primary">✓ No autocorrelation</span> : results.diagnostics.durbin_watson < 1.5 ? <span className="text-amber-600">⚠ Positive autocorrelation</span> : <span className="text-amber-600">⚠ Negative autocorrelation</span>}</TableCell></TableRow></TableBody>
                                            </Table>
                                            <p className="text-xs text-muted-foreground mt-2">Values close to 2 indicate no autocorrelation. Values &lt;1.5 suggest positive autocorrelation, &gt;2.5 suggest negative.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {results.n_dropped !== undefined && results.n_dropped > 0 && (<Card><CardContent className="py-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="w-4 h-4" /><span>{results.n_dropped} row(s) with missing values were excluded from the analysis.</span></div></CardContent></Card>)}
                        </div>

                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
        </div>
    );
}