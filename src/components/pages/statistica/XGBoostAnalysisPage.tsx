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
import { Loader2, HelpCircle, Zap, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, TreeDeciduous, Gauge, Activity, Info, Shield, FileType, FileCode, Hash, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components//ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components//ui/badge';
import { ScrollArea } from '@/components//ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components//ui/input';
import { Slider } from '@/components//ui/slider';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components//ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/xgboost.py?alt=media";

// Statistical terms definitions for XGBoost
const metricDefinitions: Record<string, string> = {
    accuracy: "The proportion of correct predictions among the total number of cases examined. Ranges from 0 to 1, where 1 means perfect prediction.",
    precision: "The proportion of positive identifications that were actually correct. High precision means low false positive rate.",
    recall: "The proportion of actual positives that were identified correctly. Also known as sensitivity or true positive rate.",
    f1_score: "The harmonic mean of precision and recall. Useful when you need a balance between precision and recall.",
    r2: "R-squared (coefficient of determination): The proportion of variance in the dependent variable predictable from the independent variables. Ranges from 0 to 1.",
    rmse: "Root Mean Squared Error: The square root of the average of squared differences between predicted and actual values. Lower is better.",
    mae: "Mean Absolute Error: The average of absolute differences between predicted and actual values. Lower is better.",
    auc: "Area Under the ROC Curve: Measures the ability of the model to distinguish between classes. Ranges from 0.5 (random) to 1 (perfect).",
    n_estimators: "The number of boosting rounds (trees) to build. More trees can improve performance but increase training time and risk of overfitting.",
    max_depth: "Maximum depth of each tree. Deeper trees can capture more complex patterns but may overfit.",
    learning_rate: "Step size shrinkage used to prevent overfitting. Lower values require more trees but often achieve better performance.",
    subsample: "Fraction of samples used for training each tree. Values less than 1.0 help prevent overfitting through stochastic gradient boosting.",
    colsample_bytree: "Fraction of features used for training each tree. Reduces overfitting by introducing randomness in feature selection.",
    cv_score: "Cross-Validation Score: The average performance metric across multiple train/test splits, providing a more robust estimate.",
    cv_std: "Cross-Validation Standard Deviation: The variation in CV scores across folds. Lower values indicate more stable performance.",
    feature_importance: "A score indicating how useful each feature is in the construction of the boosted trees. Higher values mean more important.",
    gradient_boosting: "An ensemble technique that builds trees sequentially, with each tree correcting errors from previous trees using gradient descent.",
    regularization: "Techniques (L1/L2) that penalize model complexity to prevent overfitting. XGBoost has built-in regularization parameters.",
    support: "The number of samples of the true class that belong to a specific class in classification tasks."
};

interface FeatureImportance { feature: string; importance: number; }
interface ClassMetrics { class: string; precision: number; recall: number; f1_score: number; support: number; }
interface CVResults { cv_scores: number[]; cv_mean: number; cv_std: number; cv_folds: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { task_type: string; n_samples: number; n_features: number; n_train: number; n_test: number; parameters: Record<string, any>; metrics: Record<string, number>; feature_importance: FeatureImportance[]; cv_results: CVResults; importance_plot: string | null; learning_plot: string | null; cm_plot?: string | null; roc_plot?: string | null; regression_plot?: string | null; per_class_metrics?: ClassMetrics[]; confusion_matrix?: number[][]; class_labels?: string[]; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Parameters' }, { id: 3, label: 'Validation' },
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
        link.download = 'xgboost_analysis.py';
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
                        Python Code - XGBoost Analysis
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
                        XGBoost Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical measures and parameters used in XGBoost analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">
                                    {term.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
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
const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const isClassification = results.task_type === 'classification';
    const mainMetric = isClassification ? results.metrics.accuracy : results.metrics.r2;
    const getQuality = (m: number) => m >= 0.9 ? 'Excellent' : m >= 0.8 ? 'Good' : m >= 0.7 ? 'Fair' : 'Needs Work';
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{isClassification ? 'Accuracy' : 'R² Score'}</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{isClassification ? `${(mainMetric * 100).toFixed(1)}%` : mainMetric?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getQuality(mainMetric)} performance</p></div></CardContent></Card>
            {isClassification ? (
                <>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Precision</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.precision_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Recall</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.recall_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">F1 Score</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.f1_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
                </>
            ) : (
                <>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RMSE</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.rmse?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Root mean squared error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">MAE</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.mae?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Mean absolute error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">CV Score</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.cv_results.cv_mean * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">± {(results.cv_results.cv_std * 100).toFixed(1)}%</p></div></CardContent></Card>
                </>
            )}
        </div>
    );
};

const XGBoostGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">XGBoost Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is XGBoost */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                What is XGBoost?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                XGBoost (eXtreme Gradient Boosting) is a powerful <strong>gradient boosting</strong> algorithm
                that builds trees sequentially, where each tree corrects errors from previous trees.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>How it works:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Start with an initial prediction (average for regression, log-odds for classification)<br/>
                    2. Calculate residuals (errors)<br/>
                    3. Build a tree to predict these residuals<br/>
                    4. Add tree prediction (scaled by learning rate) to update model<br/>
                    5. Repeat steps 2-4 for n_estimators iterations<br/>
                    <br/>
                    Result: Sequential ensemble that learns from mistakes
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Key Parameters */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Key Parameters
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">n_estimators (Number of Trees)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How many boosting rounds (trees) to build.
                    <br/><strong>50-100:</strong> Good starting point
                    <br/><strong>100-500:</strong> Better performance
                    <br/>• More trees with lower learning rate often works best
                    <br/>• Use early stopping to find optimal number
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">learning_rate (eta)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Step size shrinkage to prevent overfitting.
                    <br/><strong>0.01-0.1:</strong> Lower values = slower but more robust
                    <br/><strong>0.1-0.3:</strong> Faster training, more risk of overfitting
                    <br/>• Trade-off: lower rate needs more trees
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">max_depth</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum depth of each tree.
                    <br/><strong>3-6:</strong> Typical range (XGBoost default is 6)
                    <br/><strong>1-3:</strong> Shallow trees (less overfitting)
                    <br/>• Deeper = more complex interactions captured
                    <br/>• Shallower = faster, more regularized
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">subsample & colsample_bytree</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fraction of samples/features used per tree.
                    <br/><strong>0.7-0.9:</strong> Good starting point
                    <br/>• Introduces randomness to reduce overfitting
                    <br/>• Similar to Random Forest's bootstrapping
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Regularization (reg_alpha, reg_lambda)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    L1 (alpha) and L2 (lambda) regularization on weights.
                    <br/>• Higher values = simpler model, less overfitting
                    <br/>• L1 can drive some weights to exactly 0
                    <br/>• Built-in feature of XGBoost (vs regular GBM)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Feature Importance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    XGBoost provides several importance metrics:
                    <br/>• <strong>Gain:</strong> Average improvement in accuracy from splits on this feature
                    <br/>• <strong>Cover:</strong> Number of samples affected by splits on this feature
                    <br/>• <strong>Frequency:</strong> How often the feature is used in splits
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cross-Validation Score</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    More reliable than single train/test split.
                    <br/>• CV mean: average performance across folds
                    <br/>• CV std: variability (lower = more stable)
                    <br/>• If CV std is high, model may be sensitive to data splits
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Training vs Test Gap</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <br/>• <strong>Small gap:</strong> Good generalization
                    <br/>• <strong>Large gap (train &gt;&gt; test):</strong> Overfitting
                    <br/>• <strong>Both low:</strong> Underfitting, need more complexity
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
                  <p className="font-medium text-sm text-primary mb-1">Getting Started</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with n_estimators=100, learning_rate=0.1</li>
                    <li>• max_depth=6 (XGBoost default)</li>
                    <li>• subsample=0.8, colsample_bytree=0.8</li>
                    <li>• Use cross-validation to evaluate</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Tuning Strategy</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• First tune n_estimators with fixed learning_rate</li>
                    <li>• Then tune max_depth and min_child_weight</li>
                    <li>• Then tune subsample and colsample_bytree</li>
                    <li>• Finally, reduce learning_rate, increase n_estimators</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Preventing Overfitting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use lower learning_rate with more trees</li>
                    <li>• Limit max_depth (3-6 typically)</li>
                    <li>• Use subsample and colsample_bytree &lt; 1</li>
                    <li>• Increase regularization (reg_alpha, reg_lambda)</li>
                    <li>• Use early stopping</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When to Use XGBoost</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Tabular/structured data</li>
                    <li>• When you need high accuracy</li>
                    <li>• Classification or regression</li>
                    <li>• Competition-winning solution</li>
                    <li>• Medium to large datasets</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> XGBoost is one of the most powerful
                algorithms for structured data and has won numerous Kaggle competitions. Start with default
                parameters, use cross-validation, and tune systematically. The key to good performance is
                balancing model complexity (n_estimators, max_depth) with regularization (learning_rate,
                subsample, L1/L2). Feature importance helps identify which variables drive predictions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'classification' || d.id === 'iris');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Zap className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">XGBoost Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Extreme Gradient Boosting for classification and regression</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><TreeDeciduous className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Gradient Boosting</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Sequential tree ensemble</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Regularization</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">L1/L2 prevents overfitting</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Gauge className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Fast & Scalable</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Parallel computation</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use XGBoost</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use XGBoost for structured/tabular data when you need high predictive accuracy. Excellent for classification and regression tasks with complex feature interactions.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Target:</strong> Classification or regression</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Features:</strong> 1+ numeric/categorical</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Sample size:</strong> 50+ observations</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Feature importance:</strong> Variable ranking</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>CV scores:</strong> Model stability</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Metrics:</strong> Accuracy, F1, R², etc.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Zap className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface XGBoostPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function XGBoostAnalysisPage({ data, allHeaders, onLoadExample }: XGBoostPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [taskType, setTaskType] = useState('auto');
    const [nEstimators, setNEstimators] = useState(100);
    const [maxDepth, setMaxDepth] = useState(6);
    const [learningRate, setLearningRate] = useState(0.1);
    const [subsample, setSubsample] = useState(0.8);
    const [colsampleBytree, setColsampleBytree] = useState(0.8);
    const [testSize, setTestSize] = useState(0.2);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length >= 50 && allHeaders.length >= 2, [data, allHeaders]);
    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== targetCol), [allHeaders, targetCol]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Target variable selected', passed: !!targetCol, detail: targetCol || 'Select target' });
        checks.push({ label: 'Features selected', passed: featureCols.length >= 1, detail: `${featureCols.length} features selected` });
        checks.push({ label: 'Sample size (n ≥ 50)', passed: data.length >= 50, detail: `n = ${data.length}` });
        const trainSize = Math.floor(data.length * (1 - testSize));
        checks.push({ label: 'Training samples', passed: trainSize >= 30, detail: `~${trainSize} training samples` });
        return checks;
    }, [targetCol, featureCols, data.length, testSize]);

    const allValidationsPassed = dataValidation.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        const potentialTarget = allHeaders.find(h => h.toLowerCase().includes('target') || h.toLowerCase().includes('class') || h.toLowerCase().includes('label') || h.toLowerCase() === 'y');
        setTargetCol(potentialTarget || allHeaders[allHeaders.length - 1]);
        setFeatureCols([]);
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, canRun]);

    useEffect(() => {
        if (targetCol && featureCols.length === 0) {
            setFeatureCols(availableFeatures.slice(0, Math.min(10, availableFeatures.length)));
        }
    }, [targetCol, availableFeatures]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `XGBoost_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `XGBOOST ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nTask Type,${analysisResult.task_type}\nN Samples,${analysisResult.n_samples}\nN Features,${analysisResult.n_features}\n\nMETRICS\n`;
        csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nFEATURE IMPORTANCE\n` + Papa.unparse(analysisResult.feature_importance);
        csv += `\n\nCV RESULTS\nMean,${analysisResult.cv_results.cv_mean}\nStd,${analysisResult.cv_results.cv_std}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `XGBoost_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/xgboost-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult,
                    targetCol,
                    featureCols,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `XGBoost_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, targetCol, featureCols, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetCol || featureCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select target and features.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/xgboost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, task_type: taskType, test_size: testSize, n_estimators: nEstimators, max_depth: maxDepth, learning_rate: learningRate, subsample, colsample_bytree: colsampleBytree }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            const mainMetric = result.task_type === 'classification' ? `Acc: ${(result.metrics.accuracy * 100).toFixed(1)}%` : `R²: ${result.metrics.r2?.toFixed(3)}`;
            toast({ title: 'Training Complete', description: mainMetric });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, taskType, testSize, nEstimators, maxDepth, learningRate, subsample, colsampleBytree, toast]);

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

    const ParamSlider = ({ label, value, onChange, min, max, step, unit = '' }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string }) => (
        <div className="space-y-2"><div className="flex justify-between"><Label className="text-sm">{label}</Label><Badge variant="outline">{value}{unit}</Badge></div><Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} /></div>
    );
    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <XGBoostGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />            
            <div className="mb-6 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">XGBoost Analysis</h1>
                <p className="text-muted-foreground mt-1">Extreme Gradient Boosting</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose target and feature variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Target Variable (Y)</Label><Select value={targetCol} onValueChange={(v) => { setTargetCol(v); setFeatureCols([]); }}><SelectTrigger className="h-11"><SelectValue placeholder="Select target..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-3"><Label>Task Type</Label><Select value={taskType} onValueChange={setTaskType}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto-detect</SelectItem><SelectItem value="classification">Classification</SelectItem><SelectItem value="regression">Regression</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Features (X)</Label>
                                <ScrollArea className="h-48 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableFeatures.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`feat-${h}`} checked={featureCols.includes(h)} onCheckedChange={(c) => { if (c) setFeatureCols(prev => [...prev, h]); else setFeatureCols(prev => prev.filter(x => x !== h)); }} /><label htmlFor={`feat-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}
                                    </div>
                                </ScrollArea>
                                <div className="flex justify-between items-center"><p className="text-xs text-muted-foreground">{featureCols.length} features selected</p><Button variant="outline" size="sm" onClick={() => setFeatureCols(availableFeatures)}>Select All</Button></div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample size: <strong>{data.length}</strong> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!targetCol || featureCols.length < 1}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>XGBoost Parameters</CardTitle><CardDescription>Configure hyperparameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <ParamSlider label="n_estimators (Trees)" value={nEstimators} onChange={setNEstimators} min={10} max={500} step={10} />
                                <ParamSlider label="max_depth" value={maxDepth} onChange={setMaxDepth} min={1} max={15} step={1} />
                                <ParamSlider label="learning_rate" value={learningRate} onChange={setLearningRate} min={0.01} max={0.5} step={0.01} />
                                <ParamSlider label="subsample" value={subsample} onChange={setSubsample} min={0.5} max={1} step={0.05} />
                                <ParamSlider label="colsample_bytree" value={colsampleBytree} onChange={setColsampleBytree} min={0.5} max={1} step={0.05} />
                                <ParamSlider label="test_size" value={testSize} onChange={setTestSize} min={0.1} max={0.4} step={0.05} unit="%" />
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Higher n_estimators = more complex model. Lower learning_rate with more trees often works better. Subsample &lt; 1 helps prevent overfitting.</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}<div><p className={`font-medium text-sm ${check.passed ? '' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></div>))}
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Training Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Trees:</span> {nEstimators}</div><div><span className="text-muted-foreground">Depth:</span> {maxDepth}</div><div><span className="text-muted-foreground">LR:</span> {learningRate}</div><div><span className="text-muted-foreground">Features:</span> {featureCols.length}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Zap className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">XGBoost will train {nEstimators} gradient boosted trees with max depth {maxDepth}.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Training...</> : <>Train Model<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const isClassification = results.task_type === 'classification';
                    const mainMetric = isClassification ? results.metrics.accuracy : results.metrics.r2;
                    const mainMetricLabel = isClassification ? 'Accuracy' : 'R² Score';
                    const isGood = mainMetric >= 0.8;
                    const topFeature = results.feature_importance[0];
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{results.task_type} with {results.n_features} features</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Model achieved <strong>{isClassification ? `${(mainMetric * 100).toFixed(1)}% accuracy` : `R² of ${mainMetric?.toFixed(3)}`}</strong> on test data ({results.n_test} samples).</p>
                                        <p className="text-sm">• Most important feature: <strong>{topFeature?.feature}</strong> ({(topFeature?.importance * 100).toFixed(1)}% importance).</p>
                                        <p className="text-sm">• Cross-validation: <strong>{(results.cv_results.cv_mean * 100).toFixed(1)}%</strong> ± {(results.cv_results.cv_std * 100).toFixed(1)}% ({results.cv_results.cv_folds}-fold).</p>
                                        {isClassification && results.metrics.f1_macro && <p className="text-sm">• F1 Score: <strong>{(results.metrics.f1_macro * 100).toFixed(1)}%</strong> (macro average).</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Predictive Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The model shows good generalization. You can confidently use it for predictions." : "Consider tuning hyperparameters, adding more features, or collecting more data."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• {mainMetricLabel}: {isClassification ? `${(mainMetric * 100).toFixed(1)}%` : mainMetric?.toFixed(3)} — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• CV stability: {results.cv_results.cv_std < 0.05 ? 'low variance, consistent' : 'some variance across folds'}</p><p>• Train vs Test gap: {results.metrics.train_r2 || results.metrics.train_accuracy ? `${((results.metrics.train_r2 || results.metrics.train_accuracy || 0) - mainMetric).toFixed(3)}` : 'N/A'} — {Math.abs((results.metrics.train_r2 || results.metrics.train_accuracy || 0) - mainMetric) < 0.1 ? 'good generalization' : 'possible overfitting'}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (mainMetric >= 0.9 ? 5 : mainMetric >= 0.8 ? 4 : mainMetric >= 0.7 ? 3 : mainMetric >= 0.6 ? 2 : 1) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const isClassification = results.task_type === 'classification';
                    const mainMetric = isClassification ? results.metrics.accuracy : results.metrics.r2;
                    const isGood = mainMetric >= 0.8;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding XGBoost performance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How XGBoost Works</h4><p className="text-sm text-muted-foreground">XGBoost builds {results.parameters.n_estimators} decision trees sequentially. Each tree corrects errors from previous trees using gradient descent. The final prediction is a weighted sum of all trees.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Feature Importance</h4><p className="text-sm text-muted-foreground">Top features: {results.feature_importance.slice(0, 3).map(f => f.feature).join(', ')}. These variables have the most predictive power. Consider focusing data collection and feature engineering on these.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Cross-Validation</h4><p className="text-sm text-muted-foreground">CV score of {(results.cv_results.cv_mean * 100).toFixed(1)}% ± {(results.cv_results.cv_std * 100).toFixed(1)}% shows {results.cv_results.cv_std < 0.05 ? 'stable performance across different data splits' : 'some variability — more data might help'}. This is more reliable than a single train/test split.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `This model is ready for production use. Expected accuracy on new data: ~${(mainMetric * 100).toFixed(0)}%.` : `Consider: (1) tuning n_estimators and learning_rate, (2) adding more informative features, (3) collecting more training data.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Model</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Room for Improvement</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your XGBoost model achieves ${(mainMetric * 100).toFixed(1)}% ${isClassification ? 'accuracy' : 'R²'}, indicating strong predictive capability.` : `Current ${isClassification ? 'accuracy' : 'R²'} of ${(mainMetric * 100).toFixed(1)}% suggests the model could benefit from hyperparameter tuning or additional features.`}</p></div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                        <Code className="mr-2 h-4 w-4" />Python Code
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">XGBoost Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.task_type} | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
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
                                                An XGBoost {results.task_type} model was trained to predict <em>{targetCol}</em> using {results.n_features} features.
                                                The dataset included <em>N</em> = {results.n_samples} observations, split into {results.n_train} training and {results.n_test} test samples
                                                ({((1 - testSize) * 100).toFixed(0)}%/{(testSize * 100).toFixed(0)}% split).
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {results.task_type === 'classification' ? (
                                                    <>The model achieved an accuracy of <span className="font-mono">{(results.metrics.accuracy * 100).toFixed(2)}%</span> on the test set, 
                                                    with precision = <span className="font-mono">{(results.metrics.precision_macro * 100).toFixed(2)}%</span>, 
                                                    recall = <span className="font-mono">{(results.metrics.recall_macro * 100).toFixed(2)}%</span>, 
                                                    and F1-score = <span className="font-mono">{(results.metrics.f1_macro * 100).toFixed(2)}%</span> (macro-averaged).
                                                    {results.metrics.auc && <> The ROC-AUC was <span className="font-mono">{results.metrics.auc.toFixed(3)}</span>.</>}</>
                                                ) : (
                                                    <>The model achieved R² = <span className="font-mono">{results.metrics.r2?.toFixed(4)}</span> on the test set, 
                                                    with RMSE = <span className="font-mono">{results.metrics.rmse?.toFixed(4)}</span> and 
                                                    MAE = <span className="font-mono">{results.metrics.mae?.toFixed(4)}</span>.
                                                    Training R² was <span className="font-mono">{results.metrics.train_r2?.toFixed(4)}</span>.</>
                                                )}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {results.cv_results.cv_folds}-fold cross-validation yielded a mean score of <span className="font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</span> (SD = <span className="font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</span>), 
                                                indicating {results.cv_results.cv_std < 0.03 ? 'excellent' : results.cv_results.cv_std < 0.05 ? 'good' : 'moderate'} model stability.
                                                The most important predictor was <em>{results.feature_importance[0]?.feature}</em> ({(results.feature_importance[0]?.importance * 100).toFixed(1)}% importance), 
                                                followed by <em>{results.feature_importance[1]?.feature}</em> ({(results.feature_importance[1]?.importance * 100).toFixed(1)}%) 
                                                and <em>{results.feature_importance[2]?.feature}</em> ({(results.feature_importance[2]?.importance * 100).toFixed(1)}%).
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="importance" className="w-full"><TabsList className={`grid w-full ${results.task_type === 'classification' ? 'grid-cols-4' : 'grid-cols-3'}`}><TabsTrigger value="importance">Feature Importance</TabsTrigger><TabsTrigger value="learning">Training</TabsTrigger>{results.task_type === 'classification' ? <><TabsTrigger value="confusion">Confusion</TabsTrigger><TabsTrigger value="roc">ROC</TabsTrigger></> : <TabsTrigger value="regression">Actual vs Pred</TabsTrigger>}</TabsList><TabsContent value="importance" className="mt-4">{results.importance_plot ? <Image src={`data:image/png;base64,${results.importance_plot}`} alt="Importance" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="learning" className="mt-4">{results.learning_plot ? <Image src={`data:image/png;base64,${results.learning_plot}`} alt="Learning" width={700} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>{results.task_type === 'classification' ? (<><TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="roc" className="mt-4">{results.roc_plot ? <Image src={`data:image/png;base64,${results.roc_plot}`} alt="ROC" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></>) : (<TabsContent value="regression" className="mt-4">{results.regression_plot ? <Image src={`data:image/png;base64,${results.regression_plot}`} alt="Regression" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>)}</Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="w-48">Bar</TableHead></TableRow></TableHeader><TableBody>{results.feature_importance.slice(0, 15).map((f, i) => (<TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{f.feature}</TableCell><TableCell className="text-right font-mono">{(f.importance * 100).toFixed(2)}%</TableCell><TableCell><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${f.importance * 100}%` }} /></div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.task_type === 'classification' && results.per_class_metrics && (<Card><CardHeader><CardTitle>Per-Class Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader><TableBody>{results.per_class_metrics.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.class}</TableCell><TableCell className="text-right font-mono">{(c.precision * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.recall * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.f1_score * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{c.support}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-semibold">{typeof v === 'number' ? (v % 1 === 0 ? v : v.toFixed(2)) : v}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Cross-Validation Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>CV Mean</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Average across {results.cv_results.cv_folds} folds</TableCell></TableRow><TableRow><TableCell>CV Std</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">{results.cv_results.cv_std < 0.03 ? 'Very stable' : results.cv_results.cv_std < 0.05 ? 'Stable' : 'Some variance'}</TableCell></TableRow><TableRow><TableCell>Folds</TableCell><TableCell className="text-right font-mono">{results.cv_results.cv_folds}</TableCell><TableCell className="text-muted-foreground">Number of CV iterations</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Training XGBoost model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>

            {/* Modals */}
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