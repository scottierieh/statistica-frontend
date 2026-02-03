'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Container, AlertTriangle, CheckCircle, TrendingUp, HelpCircle, Settings, BarChart, Target, Percent, BookOpen, Shield, Minimize2, LineChart, FileSearch, Lightbulb, Info, Download, FileSpreadsheet, ImageIcon, Database, Settings2, FileText, BarChart3, ChevronRight, ChevronLeft, Check, CheckCircle2, Sparkles, ArrowRight, ChevronDown, FileCode, FileType, Activity, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Slider } from '../../ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/ridge_regression.py?alt=media";


const metricDefinitions: Record<string, string> = {
    r2_score: "R-squared (coefficient of determination). The proportion of variance in the target variable explained by the model. Ranges from 0 to 1, where higher values indicate better fit.",
    adjusted_r2: "R-squared adjusted for the number of predictors. Penalizes model complexity to prevent overfitting.",
    rmse: "Root Mean Square Error. The average prediction error in the same units as the target variable. Lower values indicate better predictions.",
    mae: "Mean Absolute Error. The average absolute difference between predicted and actual values. Less sensitive to outliers than RMSE.",
    alpha: "The regularization parameter (λ or α). Controls the strength of the L2 penalty. Higher values shrink coefficients more toward zero.",
    l2_penalty: "L2 regularization adds α × Σβ² to the loss function. This shrinks coefficients but never sets them exactly to zero.",
    coefficient: "The estimated effect of each feature on the target. In Ridge, coefficients are shrunk toward zero but never eliminated.",
    intercept: "The predicted value of the target when all features equal zero. Also called the bias term.",
    regularization: "A technique to prevent overfitting by adding a penalty term to the loss function. Ridge uses L2 (squared) penalty.",
    overfitting: "When a model learns noise in the training data and performs poorly on new data. Indicated by train R² >> test R².",
    generalization: "The model's ability to perform well on unseen data. Good generalization means similar train and test performance.",
    train_test_split: "Dividing data into training set (to fit the model) and test set (to evaluate performance on unseen data).",
    multicollinearity: "When features are highly correlated with each other. Ridge regression handles this better than OLS by stabilizing coefficient estimates.",
    standardization: "Scaling features to have mean=0 and std=1. Required for Ridge so that the penalty affects all features equally.",
    coefficient_shrinkage: "The reduction in coefficient magnitude due to regularization. Larger alpha = more shrinkage."
};


interface RegressionMetrics {
    r2_score: number;
    rmse: number;
    mae: number;
}

interface RidgeRegressionResults {
    metrics: { test: RegressionMetrics; train: RegressionMetrics };
    coefficients: { [key: string]: number };
    intercept: number;
    alpha: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: RidgeRegressionResults;
    plot: string | null;
    path_plot: string | null;
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
        link.download = 'ridge_regression.py';
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
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Ridge Regression</DialogTitle>
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


const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Ridge Regression Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in Ridge regression analysis
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

const StatisticalSummaryCards = ({ results }: { results: RidgeRegressionResults }) => {
    const trainTestGap = Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score);
    const isOverfitting = trainTestGap > 0.1;
    const getR2Interpretation = (r2: number) => {
        if (r2 >= 0.75) return 'Excellent fit';
        if (r2 >= 0.50) return 'Good fit';
        if (r2 >= 0.25) return 'Moderate fit';
        return 'Weak fit';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Test R²</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.test.r2_score.toFixed(4)}</p><p className="text-xs text-muted-foreground">{getR2Interpretation(results.metrics.test.r2_score)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Test RMSE</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.test.rmse.toFixed(3)}</p><p className="text-xs text-muted-foreground">Prediction error</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Alpha (α)</p><Percent className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.alpha.toFixed(3)}</p><p className="text-xs text-muted-foreground">Regularization strength</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">R² Gap</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${isOverfitting ? 'text-rose-600 dark:text-rose-400' : ''}`}>{trainTestGap.toFixed(4)}</p><p className="text-xs text-muted-foreground">{isOverfitting ? 'Potential overfitting' : 'Good generalization'}</p></div></CardContent></Card>
        </div>
    );
};



const RidgeRegressionGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Ridge Regression Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Ridge */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Ridge Regression?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Ridge regression is a regularized version of linear regression that adds an <strong>L2 penalty</strong> 
                to prevent overfitting. Unlike Lasso, Ridge <strong>shrinks coefficients toward zero but never 
                eliminates them entirely</strong>. This makes it ideal when all features are potentially relevant.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The equation:</strong><br/>
                  <span className="font-mono text-xs">
                    Minimize: Σ(yᵢ - ŷᵢ)² + α × Σβⱼ²
                  </span><br/>
                  <span className="text-muted-foreground text-xs">
                    The L2 penalty (α × Σβⱼ²) shrinks coefficients but keeps all features in the model.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Ridge?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You have <strong>multicollinearity</strong> (correlated features)</li>
                    <li>• You want to <strong>keep all features</strong> in the model</li>
                    <li>• OLS regression is <strong>overfitting</strong></li>
                    <li>• You have <strong>more features than observations</strong></li>
                    <li>• You need <strong>stable coefficient estimates</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Consider Lasso instead when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You want <strong>automatic feature selection</strong></li>
                    <li>• You suspect many features are <strong>irrelevant</strong></li>
                    <li>• You prefer a <strong>sparse, interpretable model</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Alpha */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Understanding Alpha (α)
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">What Alpha Controls</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alpha controls how much coefficients are shrunk toward zero.
                    <br/><strong>Higher α:</strong> More shrinkage → simpler model, less overfitting
                    <br/><strong>Lower α:</strong> Less shrinkage → closer to regular OLS
                    <br/><strong>α = 0:</strong> No penalty → identical to OLS regression
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">How to Choose Alpha</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Start with α = 1.0</strong> as a reasonable default.
                    <br/><strong>If overfitting</strong> (train R² &gt; test R²): Increase alpha
                    <br/><strong>If underfitting</strong> (both R² low): Decrease alpha
                    <br/><strong>Best practice:</strong> Use the regularization path plot to visualize the effect
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-center">
                  <div className="p-2 bg-muted/30 rounded">
                    <p className="font-bold">α = 0.01 - 0.1</p>
                    <p className="text-muted-foreground">Light shrinkage</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded border border-primary/30">
                    <p className="font-bold">α = 0.5 - 2.0</p>
                    <p className="text-muted-foreground">Moderate (start here)</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <p className="font-bold">α = 5.0+</p>
                    <p className="text-muted-foreground">Strong shrinkage</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Key Metrics to Evaluate
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Test R² (Most Important)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How well the model predicts <strong>new, unseen data</strong>.
                    <br/><strong>&gt;75%:</strong> Excellent predictive power
                    <br/><strong>50-75%:</strong> Good
                    <br/><strong>25-50%:</strong> Moderate
                    <br/><strong>&lt;25%:</strong> Weak
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Train-Test R² Gap (Critical!)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The difference between training and test R².
                    <br/><strong>Gap &lt; 5%:</strong> Excellent generalization ✓
                    <br/><strong>Gap 5-10%:</strong> Good, but monitor
                    <br/><strong>Gap &gt; 10%:</strong> Overfitting! Increase alpha
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">RMSE (Root Mean Square Error)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average prediction error in the same units as your target.
                    <br/><strong>Example:</strong> If RMSE = 5 and target is "price in $", predictions are typically off by ±$5.
                    <br/>Lower is better. Compare to the standard deviation of your target.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Ridge vs Lasso vs OLS */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Ridge vs Lasso vs OLS
              </h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm text-primary mb-1">OLS (Regular)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• No penalty</li>
                      <li>• Can overfit</li>
                      <li>• Unstable with multicollinearity</li>
                      <li>• Best with few predictors</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                    <p className="font-medium text-sm text-primary mb-1">Ridge (L2)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• L2 penalty (β²)</li>
                      <li>• <strong>Shrinks all coefficients</strong></li>
                      <li>• Handles multicollinearity</li>
                      <li>• Keeps all features</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm text-primary mb-1">Lasso (L1)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• L1 penalty (|β|)</li>
                      <li>• <strong>Eliminates features</strong></li>
                      <li>• Creates sparse models</li>
                      <li>• Best for feature selection</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Tip:</strong> When in doubt, try both Ridge and Lasso. If they give similar results, 
                    your features are probably all relevant (use Ridge). If Lasso drops many features with similar 
                    R², those features weren't needed.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Handling Multicollinearity */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                Multicollinearity & Ridge
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">What is Multicollinearity?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When two or more features are highly correlated with each other.
                    <br/><strong>Problem:</strong> OLS coefficients become unstable and hard to interpret.
                    <br/><strong>Symptoms:</strong> Large coefficient changes when adding/removing features, 
                    high variance in estimates.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Why Ridge Helps</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ridge regression <strong>stabilizes</strong> coefficient estimates by shrinking them.
                    Instead of one correlated feature getting a huge coefficient and another getting zero,
                    both get moderate coefficients. This makes the model more robust.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-xs text-muted-foreground">
                    <strong>Example:</strong> If "height_cm" and "height_inches" are both in your model (perfectly correlated),
                    OLS might give coefficients like +500 and -498 (unstable). Ridge would give something like +1.2 and +1.1 (stable).
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
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Standardization:</strong> Done automatically</li>
                    <li>• Handle missing values first</li>
                    <li>• Have 10+ observations per feature</li>
                    <li>• Consider log-transforming skewed targets</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Tuning Alpha</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with α = 1.0</li>
                    <li>• Check train-test gap first</li>
                    <li>• Use regularization path plot</li>
                    <li>• Consider cross-validation for optimal α</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Coefficients are shrunk — magnitude matters less</li>
                    <li>• Compare relative importance, not absolute values</li>
                    <li>• Sign still indicates direction (+/-)</li>
                    <li>• Focus on test performance, not train</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report α value used</li>
                    <li>• Show both train and test R²</li>
                    <li>• Include RMSE for error context</li>
                    <li>• Note train-test gap for overfitting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Ridge regression trades a small amount of bias 
                for a large reduction in variance. The goal isn't to find the "true" coefficients, but to build 
                a model that predicts well on new data. When in doubt, trust the test set performance over 
                training performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Container className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Ridge Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Regularized regression to prevent overfitting and handle multicollinearity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Shield className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Overfitting Protection</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">L2 penalty prevents model from fitting noise in data</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Minimize2 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Coefficient Shrinkage</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Reduces coefficient magnitudes for stability</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><LineChart className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Multicollinearity Fix</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Handles correlated predictors effectively</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Ridge regression when you have many predictors, multicollinearity issues, or when ordinary least squares overfits.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Target:</strong> Continuous numeric variable</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Features:</strong> Numeric predictors</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Sample size:</strong> 10+ observations per feature</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Understanding Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>R²:</strong> % of variance explained (0-100%)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Alpha effect:</strong> Higher α = more shrinkage</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Coefficients:</strong> Shrunk toward zero, not eliminated</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg"><Container className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RidgeRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RidgeRegressionPage({ data, numericHeaders, onLoadExample }: RidgeRegressionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [alpha, setAlpha] = useState(1.0);
    const [testSize, setTestSize] = useState(0.2);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가
    
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Target variable selected', passed: !!target, detail: target ? `Predicting: ${target}` : 'Select a target variable' });
        checks.push({ label: 'Features selected', passed: features.length >= 1, detail: features.length >= 1 ? `${features.length} feature(s) selected` : 'Select at least one feature' });
        const trainSize = Math.round((1 - testSize) * data.length);
        const ratio = features.length > 0 ? Math.floor(trainSize / features.length) : 0;
        checks.push({ label: 'Observations per feature', passed: ratio >= 10 || features.length === 0, detail: features.length > 0 ? `${ratio} observations per feature (recommended: 10+)` : 'Select features first' });
        checks.push({ label: 'Sufficient sample size', passed: data.length >= 30, detail: `n = ${data.length} observations (minimum: 30)` });
        if (target && features.length > 0 && data.length > 0) {
            const isMissing = (value: any) => value == null || value === '' || (typeof value === 'number' && isNaN(value));
            const missingCount = data.filter((row: any) => isMissing(row[target]) || features.some((f: string) => isMissing(row[f]))).length;
            checks.push({ label: 'Missing values check', passed: missingCount === 0, detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} rows with missing values will be excluded` });
        }
        return checks;
    }, [data, target, features, testSize]);

    const allValidationsPassed = dataValidation.filter(c => c.label === 'Target variable selected' || c.label === 'Features selected').every(check => check.passed);

    useEffect(() => {
        if (canRun) {
            const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
            setTarget(defaultTarget);
            setFeatures(numericHeaders.filter(h => h !== defaultTarget));
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [data, numericHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    const handleFeatureChange = (header: string, checked: boolean) => { setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== header)); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Ridge_Regression_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image;
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "RIDGE REGRESSION RESULTS\n";
        csvContent += `Target Variable: ${target}\n`;
        csvContent += `Features: ${features.join(', ')}\n`;
        csvContent += `Alpha: ${results.alpha}\n\n`;
        const performanceData = [
            { metric: 'R²', train: results.metrics.train.r2_score, test: results.metrics.test.r2_score },
            { metric: 'RMSE', train: results.metrics.train.rmse, test: results.metrics.test.rmse },
            { metric: 'MAE', train: results.metrics.train.mae, test: results.metrics.test.mae }
        ];
        csvContent += "MODEL PERFORMANCE\n" + Papa.unparse(performanceData) + "\n\n";
        const coeffData = [{ feature: '(Intercept)', coefficient: results.intercept }, ...Object.entries(results.coefficients).map(([feature, coeff]) => ({ feature, coefficient: coeff }))];
        csvContent += "COEFFICIENTS\n" + Papa.unparse(coeffData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Ridge_Regression_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, target, features, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) { toast({ variant: 'destructive', title: 'Please select a target and at least one feature.' }); return; }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/ridge-regression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target, features, alpha, test_size: testSize })
            });
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') errorMsg = errorResult.detail;
                else if (Array.isArray(errorResult.detail)) errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                else if (errorResult.error) errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                throw new Error(errorMsg);
            }
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error(typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error));
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Ridge Regression Complete', description: 'Results are ready.' });
        } catch (e: any) {
            console.error('Ridge Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, alpha, testSize, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/ridge-regression-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult.results, target, features, sampleSize: data.length, testSize })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Ridge_Regression_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, target, features, data.length, testSize, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!analysisResult);
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable}
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
            <RidgeRegressionGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Ridge Regression</h1>
                    <p className="text-muted-foreground mt-1">Regularized regression with L2 penalty</p>
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
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Select Variables</CardTitle><CardDescription>Choose target and feature variables</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Target Variable (Y)</Label>
                                    <Select value={target} onValueChange={setTarget}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select target..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The continuous outcome to predict</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Feature Variables (X)</Label>
                                    <ScrollArea className="h-32 border rounded-xl p-3">
                                        {availableFeatures.map(h => (
                                            <div key={h} className="flex items-center space-x-2 py-1">
                                                <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                                <Label htmlFor={`feat-${h}`} className="text-sm cursor-pointer">{h}</Label>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                    <p className="text-xs text-muted-foreground">{features.length} feature(s) selected</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!target || features.length === 0}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Model Settings</CardTitle><CardDescription>Configure Ridge regression parameters</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Alpha (Regularization): {alpha.toFixed(2)}</Label>
                                    <Slider value={[alpha]} onValueChange={v => setAlpha(v[0])} min={0.01} max={10.0} step={0.01} className="mt-2" />
                                    <p className="text-xs text-muted-foreground">Higher values = stronger coefficient shrinkage</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Test Set Size: {Math.round(testSize*100)}%</Label>
                                    <Slider value={[testSize]} onValueChange={v => setTestSize(v[0])} min={0.1} max={0.5} step={0.05} className="mt-2" />
                                    <p className="text-xs text-muted-foreground">Data reserved for model evaluation</p>
                                </div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Model Configuration</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Target:</strong> {target}</p>
                                    <p>• <strong className="text-foreground">Features:</strong> {features.length} variable(s)</p>
                                    <p>• <strong className="text-foreground">Regularization:</strong> L2 (Ridge) with α = {alpha.toFixed(2)}</p>
                                    <p>• <strong className="text-foreground">Train/Test:</strong> {Math.round((1-testSize)*100)}% / {Math.round(testSize*100)}%</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About Alpha</h4>
                                <p className="text-sm text-muted-foreground">Ridge regression adds a penalty (α × Σcoef²) to the loss function. Higher alpha shrinks coefficients more, reducing overfitting but potentially increasing bias.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div>
                            </div>
                        </CardHeader>
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
                                <Container className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Ridge regression will standardize features automatically before fitting.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fitting...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const r2 = results.metrics.test.r2_score;
                    const trainTestGap = Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score);
                    const isGood = r2 >= 0.5 && trainTestGap <= 0.1;
                    const isOverfitting = trainTestGap > 0.1;
                    const sortedCoefs = Object.entries(results.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
                    const topFeature = sortedCoefs[0];

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
                                    <div><CardTitle>Result Summary</CardTitle><CardDescription>How well can we predict {target}?</CardDescription></div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : isOverfitting ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : isOverfitting ? 'text-amber-600' : 'text-rose-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : isOverfitting ? 'text-amber-600' : 'text-rose-600'}`}>•</span><p className="text-sm">The model explains <strong>{(r2 * 100).toFixed(0)}%</strong> of the variation in {target}.{r2 >= 0.75 ? " This is excellent explanatory power!" : r2 >= 0.5 ? " This is good predictive ability." : r2 >= 0.25 ? " There's moderate predictive ability." : " The model has limited predictive power."}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : isOverfitting ? 'text-amber-600' : 'text-rose-600'}`}>•</span><p className="text-sm">{topFeature && <>The strongest predictor is <strong>{topFeature[0]}</strong> with coefficient {topFeature[1].toFixed(3)}.</>}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : isOverfitting ? 'text-amber-600' : 'text-rose-600'}`}>•</span><p className="text-sm">{isOverfitting ? <>The model shows <strong>signs of overfitting</strong> (train-test gap: {(trainTestGap * 100).toFixed(1)}%). Try increasing alpha.</> : <>The model <strong>generalizes well</strong> — train and test performance are similar.</>}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : isOverfitting ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : isOverfitting ? <AlertTriangle className="w-6 h-6 text-amber-600" /> : <AlertTriangle className="w-6 h-6 text-rose-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Model Ready for Use!" : isOverfitting ? "Increase Regularization" : "Model Needs More Work"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{isGood ? `This Ridge model reliably predicts ${target}. The regularization effectively controls overfitting.` : isOverfitting ? `The model memorizes training data. Try increasing alpha from ${results.alpha.toFixed(2)} to reduce overfitting.` : "Consider adding more features, collecting more data, or trying a different model type."}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Explained</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${r2 < 0.25 ? 'text-rose-600' : ''}`}>{(r2 * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">of variance</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Avg Error</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">±{results.metrics.test.rmse.toFixed(2)}</p><p className="text-xs text-muted-foreground">RMSE</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Alpha</p><Percent className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.alpha.toFixed(2)}</p><p className="text-xs text-muted-foreground">regularization</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Features</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{features.length}</p><p className="text-xs text-muted-foreground">predictors</p></div></CardContent></Card>
                                </div>
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Model Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = r2 >= 0.75 && !isOverfitting ? 5 : r2 >= 0.6 && !isOverfitting ? 4 : r2 >= 0.5 ? 3 : r2 >= 0.25 ? 2 : 1;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const r2 = results.metrics.test.r2_score;
                    const trainTestGap = Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score);
                    const isOverfitting = trainTestGap > 0.1;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div>
                                    <div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding Ridge regression results</CardDescription></div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div><h4 className="font-semibold mb-1">What Ridge Regression Does</h4><p className="text-sm text-muted-foreground">Ridge regression finds the best linear relationship between your features and {target}, while adding a <strong className="text-foreground">penalty for large coefficients</strong>. This prevents the model from becoming too complex and fitting noise in the data.</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div><h4 className="font-semibold mb-1">What R² = {(r2 * 100).toFixed(0)}% Means</h4><p className="text-sm text-muted-foreground">Your features explain <strong className="text-foreground">{(r2 * 100).toFixed(0)}%</strong> of why {target} varies. The remaining {(100 - r2 * 100).toFixed(0)}% is due to factors not in your model.{r2 >= 0.75 ? " This is excellent — your features are highly predictive." : r2 >= 0.5 ? " This is good — your model captures the main patterns." : " There may be important factors you haven't measured."}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div><h4 className="font-semibold mb-1">About the Alpha Parameter</h4><p className="text-sm text-muted-foreground">You used <strong className="text-foreground">α = {results.alpha.toFixed(2)}</strong>.{results.alpha < 0.5 ? " This is light regularization — coefficients are only slightly shrunk." : results.alpha < 2 ? " This is moderate regularization — a good balance between fit and simplicity." : " This is strong regularization — coefficients are heavily shrunk toward zero."}{isOverfitting ? " Consider increasing alpha to reduce overfitting." : ""}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div><h4 className="font-semibold mb-1">Generalization Check</h4><p className="text-sm text-muted-foreground">{isOverfitting ? <><strong className="text-foreground">Warning: Train-test gap is {(trainTestGap * 100).toFixed(1)}%.</strong> The model performs much better on training data than test data. Increase alpha or collect more data.</> : <><strong className="text-foreground">Good: Train-test gap is only {(trainTestGap * 100).toFixed(1)}%.</strong> The model generalizes well — it should perform similarly on new data.</>}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${r2 >= 0.5 && !isOverfitting ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">{r2 >= 0.5 && !isOverfitting ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Model Works Well</> : <><Info className="w-5 h-5 text-amber-600" /> Bottom Line: Room for Improvement</>}</h4>
                                    <p className="text-sm text-muted-foreground">{r2 >= 0.5 && !isOverfitting ? `Your Ridge model reliably predicts ${target}. The regularization is working well to prevent overfitting.` : isOverfitting ? `Try increasing alpha to reduce overfitting, or collect more training data.` : `Consider adding more relevant features or trying polynomial terms to capture non-linear relationships.`}</p>
                                </div>
                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />R² Interpretation Guide</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;25%</p><p className="text-muted-foreground">Weak</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">25-50%</p><p className="text-muted-foreground">Moderate</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">50-75%</p><p className="text-muted-foreground">Good</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;75%</p><p className="text-muted-foreground">Excellent</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between">
                                <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                                <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && analysisResult && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Statistical Details</h2>
                            <p className="text-sm text-muted-foreground">Full technical report</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Ridge Regression Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">Target: {target} | Features: {features.length} | α = {results.alpha.toFixed(3)} | {new Date().toLocaleDateString()}</p>
                        </div>

                        <StatisticalSummaryCards results={results} />

                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        A Ridge regression model was fitted to predict <strong>{target}</strong> using {features.length} features with regularization parameter α = {results.alpha.toFixed(3)}. The model achieved <strong>R² = {results.metrics.test.r2_score.toFixed(4)}</strong> on the test set, explaining {(results.metrics.test.r2_score * 100).toFixed(1)}% of the variance. Test RMSE was {results.metrics.test.rmse.toFixed(3)} and MAE was {results.metrics.test.mae.toFixed(3)}. The train-test R² gap of {Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score).toFixed(4)}{Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score) > 0.1 ? " suggests some overfitting; consider increasing alpha." : " indicates good generalization."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Train vs. Test Performance</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Train</TableHead><TableHead className="text-right">Test</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell className="font-medium">R²</TableCell><TableCell className="text-right font-mono">{results.metrics.train.r2_score.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.metrics.test.r2_score.toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">RMSE</TableCell><TableCell className="text-right font-mono">{results.metrics.train.rmse.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{results.metrics.test.rmse.toFixed(3)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">MAE</TableCell><TableCell className="text-right font-mono">{results.metrics.train.mae.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{results.metrics.test.mae.toFixed(3)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {analysisResult.plot && (
                            <Card>
                                <CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader>
                                <CardContent><Image src={analysisResult.plot} alt="Ridge Regression Diagnostic Plots" width={1500} height={1200} className="w-full rounded-md border" /></CardContent>
                            </Card>
                        )}

                        {analysisResult.path_plot && (
                            <Card>
                                <CardHeader><CardTitle>Regularization Path</CardTitle><CardDescription>How coefficients shrink as alpha increases</CardDescription></CardHeader>
                                <CardContent><Image src={analysisResult.path_plot} alt="Ridge Coefficient Path" width={1500} height={1200} className="w-full max-w-3xl mx-auto rounded-md border" /></CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader><CardTitle>Model Coefficients</CardTitle><CardDescription>Sorted by absolute magnitude</CardDescription></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-80">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead className="text-right">Coefficient</TableHead><TableHead className="text-right">Magnitude</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow><TableCell className="font-semibold">(Intercept)</TableCell><TableCell className="text-right font-mono">{results.intercept.toFixed(4)}</TableCell><TableCell className="text-right"><Badge variant="outline">Intercept</Badge></TableCell></TableRow>
                                            {Object.entries(results.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([feature, coeff]) => {
                                                const absCoeff = Math.abs(coeff);
                                                return (
                                                    <TableRow key={feature}>
                                                        <TableCell>{feature}</TableCell>
                                                        <TableCell className="text-right font-mono">{coeff.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right"><Badge variant={absCoeff >= 1 ? 'default' : absCoeff >= 0.1 ? 'secondary' : 'outline'}>{absCoeff.toFixed(3)}</Badge></TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                )}
            </div>
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
        </div>
    );
}