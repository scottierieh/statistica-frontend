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
import { Loader2, HelpCircle, Zap, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, Gauge, Activity, Info, Shield, FileType, FileCode, Hash, Trees, Shuffle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components//ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components//ui/badge';
import { ScrollArea } from '@/components//ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components//ui/slider';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components//ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Code, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/random_forest.py?alt=media";

// Metric definitions for Random Forest
const metricDefinitions: Record<string, string> = {
    accuracy: "The proportion of correctly classified samples out of all samples.",
    precision: "The proportion of true positive predictions among all positive predictions. High precision means few false positives.",
    recall: "The proportion of actual positives that were correctly identified. Also called sensitivity or true positive rate.",
    f1_score: "The harmonic mean of precision and recall, providing a balanced measure of both metrics.",
    auc: "Area Under the ROC Curve. Measures the model's ability to distinguish between classes. 1.0 is perfect, 0.5 is random.",
    r2: "R-squared (coefficient of determination). The proportion of variance in the target explained by the model. 1.0 is perfect.",
    rmse: "Root Mean Squared Error. The square root of the average squared differences between predicted and actual values.",
    mae: "Mean Absolute Error. The average absolute difference between predicted and actual values.",
    oob_score: "Out-of-Bag Score. An unbiased estimate of generalization error using samples not included in bootstrap samples.",
    n_estimators: "The number of decision trees in the forest. More trees generally improve performance but increase computation time.",
    max_depth: "Maximum depth of each tree. Limiting depth can prevent overfitting. 'None' means nodes expand until all leaves are pure.",
    min_samples_split: "Minimum samples required to split an internal node. Higher values prevent learning overly specific patterns.",
    min_samples_leaf: "Minimum samples required at a leaf node. Higher values create smoother decision boundaries.",
    max_features: "Number of features considered at each split. 'sqrt' and 'log2' add randomness to reduce correlation between trees.",
    bootstrap: "Whether to use bootstrap sampling (sampling with replacement) to train each tree.",
    feature_importance: "The relative importance of each feature in making predictions, measured by decrease in impurity (Gini or entropy).",
    cv_mean: "The average score across all cross-validation folds, indicating expected performance on new data.",
    cv_std: "Standard deviation of cross-validation scores. Lower values indicate more stable/consistent model performance."
};

// Python Code Modal Component
const PythonCodeModal = ({ isOpen, onClose, codeUrl }: { isOpen: boolean; onClose: () => void; codeUrl: string; }) => {
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
            if (!response.ok) throw new Error(`Failed to fetch code: ${response.status}`);
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
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
        link.download = 'random_forest.py';
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
                        Python Code - Random Forest
                    </DialogTitle>
                    <DialogDescription>
                        View, copy, or download the Python code used for this analysis.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 py-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading || !!error}>
                        <Copy className="mr-2 h-4 w-4" />Copy Code
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading || !!error}>
                        <Download className="mr-2 h-4 w-4" />Download .py
                    </Button>
                    {error && <Button variant="outline" size="sm" onClick={fetchCode}><Loader2 className="mr-2 h-4 w-4" />Retry</Button>}
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 text-slate-300">Loading code...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center">
                            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                            <p className="text-slate-300 mb-2">Failed to load code</p><p className="text-slate-500 text-sm">{error}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950">
                            <pre className="p-4 text-sm text-slate-50 overflow-x-auto"><code className="language-python">{code}</code></pre>
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
                        Random Forest Glossary
                    </DialogTitle>
                    <DialogDescription>Key terms and concepts used in this analysis</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">{term.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

interface FeatureImportance { feature: string; importance: number; }
interface ClassMetrics { class: string; precision: number; recall: number; f1_score: number; support: number; }
interface CVResults { cv_scores: number[]; cv_mean: number; cv_std: number; cv_folds: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { task_type: string; n_samples: number; n_features: number; n_train: number; n_test: number; parameters: Record<string, any>; metrics: Record<string, number>; feature_importance: FeatureImportance[]; cv_results: CVResults; importance_plot: string | null; tree_count_plot: string | null; cm_plot?: string | null; roc_plot?: string | null; regression_plot?: string | null; per_class_metrics?: ClassMetrics[]; confusion_matrix?: number[][]; class_labels?: string[]; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Parameters' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

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
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{results.metrics.oob_score ? 'OOB Score' : 'F1 Score'}</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.oob_score ? `${(results.metrics.oob_score * 100).toFixed(1)}%` : `${(results.metrics.f1_macro * 100).toFixed(1)}%`}</p><p className="text-xs text-muted-foreground">{results.metrics.oob_score ? 'Out-of-bag estimate' : 'Macro average'}</p></div></CardContent></Card>
                </>
            ) : (
                <>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RMSE</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.rmse?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Root mean squared error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">MAE</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.mae?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Mean absolute error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{results.metrics.oob_score ? 'OOB Score' : 'CV Score'}</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.oob_score ? `${(results.metrics.oob_score * 100).toFixed(1)}%` : `${(results.cv_results.cv_mean * 100).toFixed(1)}%`}</p><p className="text-xs text-muted-foreground">{results.metrics.oob_score ? 'Out-of-bag estimate' : `± ${(results.cv_results.cv_std * 100).toFixed(1)}%`}</p></div></CardContent></Card>
                </>
            )}
        </div>
    );
};


const RandomForestGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Random Forest Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Random Forest */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Trees className="w-4 h-4" />
                What is Random Forest?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Random Forest is an <strong>ensemble learning</strong> method that builds multiple 
                decision trees and combines their predictions. It uses two key techniques:
                <strong> Bagging</strong> (bootstrap aggregating) and <strong>random feature selection</strong>.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>How it works:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Draw bootstrap samples (sample with replacement)<br/>
                    2. For each sample, build a decision tree<br/>
                    3. At each split, consider only a random subset of features<br/>
                    4. Aggregate predictions: majority vote (classification) or average (regression)<br/>
                    <br/>
                    Result: Many diverse trees → robust ensemble
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Why Use Random Forest */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Why Use Random Forest?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Advantages</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Robust to overfitting</strong> — ensemble averages out noise</li>
                    <li>• <strong>Handles non-linear relationships</strong></li>
                    <li>• <strong>Works with mixed feature types</strong></li>
                    <li>• <strong>No feature scaling needed</strong></li>
                    <li>• <strong>Provides feature importance</strong></li>
                    <li>• <strong>Built-in OOB validation</strong></li>
                    <li>• <strong>Few hyperparameters to tune</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Limitations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Black box</strong> — harder to interpret than single tree</li>
                    <li>• <strong>Slower training</strong> than single models</li>
                    <li>• <strong>Memory intensive</strong> for many trees</li>
                    <li>• <strong>Cannot extrapolate</strong> beyond training data range</li>
                    <li>• <strong>Biased toward high-cardinality features</strong></li>
                  </ul>
                </div>
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
                    How many trees to build in the forest.
                    <br/><strong>50-100:</strong> Good starting point
                    <br/><strong>100-500:</strong> Better performance, slower training
                    <br/><strong>500+:</strong> Diminishing returns
                    <br/>• More trees = more stable but slower
                    <br/>• Usually more is better (no overfitting risk)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">max_features (Features per Split)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of features considered at each split.
                    <br/><strong>sqrt:</strong> √n features (default for classification)
                    <br/><strong>log2:</strong> log₂(n) features
                    <br/><strong>None/All:</strong> All features (reduces diversity)
                    <br/>• Lower values → more diverse trees → less overfitting
                    <br/>• sqrt is usually optimal
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">max_depth (Tree Depth)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum depth of each tree.
                    <br/><strong>None:</strong> Trees grow until leaves are pure (default)
                    <br/><strong>5-20:</strong> Limit depth to reduce overfitting
                    <br/>• Unlike single trees, RF is robust even with unlimited depth
                    <br/>• Limiting can speed up training
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">min_samples_split / min_samples_leaf</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum samples to split a node / be in a leaf.
                    <br/><strong>split = 2, leaf = 1:</strong> Defaults (very flexible)
                    <br/><strong>Higher values:</strong> More regularization
                    <br/>• Usually leave at default for RF
                    <br/>• Increase if trees are too complex
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">bootstrap</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Whether to use bootstrap sampling.
                    <br/><strong>True (default):</strong> Sample with replacement
                    <br/><strong>False:</strong> Use entire dataset for each tree
                    <br/>• True enables OOB score and reduces correlation
                    <br/>• Keep True unless you have a specific reason not to
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">oob_score (Out-of-Bag Score)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compute OOB error estimate.
                    <br/>• Uses samples NOT in bootstrap sample to validate each tree
                    <br/>• Free validation estimate (no separate test set needed)
                    <br/>• Only available when bootstrap=True
                    <br/>• Similar accuracy to cross-validation
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* OOB Score */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Understanding OOB Score
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Out-of-Bag (OOB) Score</strong> is a unique feature of Random Forest:
                </p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• Each tree is trained on ~63% of data (bootstrap sample)</li>
                  <li>• Remaining ~37% are "out-of-bag" samples for that tree</li>
                  <li>• Each sample is predicted by trees that DIDN'T train on it</li>
                  <li>• OOB score aggregates these predictions</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary">
                    <strong>Benefit:</strong> Free validation estimate without needing a separate test set 
                    or cross-validation. Typically very close to CV score.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Feature Importance */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting Feature Importance
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Gini Importance (Default)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures total decrease in node impurity from splits on that feature.
                    <br/>• Averaged across all trees
                    <br/>• Higher = more important
                    <br/>• Sum of all importances = 1.0
                    <br/>• Fast to compute (computed during training)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Caution with Gini Importance:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Biased toward <strong>high-cardinality features</strong> (many unique values)</li>
                    <li>• Can give high importance to <strong>random ID columns</strong></li>
                    <li>• Doesn't account for <strong>feature correlations</strong></li>
                    <li>• Consider <strong>permutation importance</strong> for more reliable estimates</li>
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
                  <p className="font-medium text-sm text-primary mb-1">Getting Started</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with n_estimators=100</li>
                    <li>• Keep max_features='sqrt'</li>
                    <li>• Enable bootstrap and oob_score</li>
                    <li>• Leave max_depth unlimited initially</li>
                    <li>• Use default min_samples parameters</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Tuning</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Increase n_estimators until OOB plateaus</li>
                    <li>• Try max_features: sqrt, log2, 0.3</li>
                    <li>• Limit max_depth if trees are too slow</li>
                    <li>• Use OOB score for quick validation</li>
                    <li>• Compare OOB vs CV for sanity check</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Evaluation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check OOB score (free validation)</li>
                    <li>• Compare train vs test performance</li>
                    <li>• Use cross-validation for final estimate</li>
                    <li>• Examine feature importance</li>
                    <li>• Check per-class metrics for imbalanced data</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Tabular data with mixed features</li>
                    <li>• Need robust, out-of-the-box performance</li>
                    <li>• Feature importance is useful</li>
                    <li>• Don't need highly interpretable model</li>
                    <li>• Quick baseline before trying GBM/XGBoost</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* RF vs Decision Tree */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Random Forest vs Single Decision Tree
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Random Forest</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Many trees → <strong>more robust</strong></li>
                    <li>• <strong>Less overfitting</strong></li>
                    <li>• <strong>Higher accuracy</strong> typically</li>
                    <li>• Harder to interpret</li>
                    <li>• Slower training</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Single Tree</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• One tree → <strong>simple, interpretable</strong></li>
                    <li>• <strong>Prone to overfitting</strong></li>
                    <li>• Lower accuracy typically</li>
                    <li>• Easy to visualize and explain</li>
                    <li>• Fast training</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Rule of thumb:</strong> Use single Decision Tree when interpretability is critical. 
                  Use Random Forest when you want best predictive performance with minimal tuning.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Random Forest is one of the most 
                reliable algorithms for tabular data. It's hard to break, requires minimal tuning, 
                and provides good performance out of the box. The OOB score is a valuable free 
                validation estimate. Start with defaults, check OOB score, and only tune if needed. 
                For interpretability, examine feature importance, but be cautious of biases toward 
                high-cardinality features.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Trees className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Random Forest</CardTitle>
                    <CardDescription className="text-base mt-2">Ensemble of decision trees for classification and regression</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Trees className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Ensemble Method</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Combines multiple decision trees</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Shuffle className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Bagging</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Bootstrap aggregating for stability</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Gauge className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">OOB Score</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Built-in validation estimate</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use Random Forest</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Random Forest for robust predictions on tabular data. It handles non-linear relationships, feature interactions, and is resistant to overfitting. Great for both classification and regression.</p>
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
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>OOB score:</strong> Unbiased estimate</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Metrics:</strong> Accuracy, F1, R², etc.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Trees className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface RandomForestPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function RandomForestPage({ data, allHeaders, onLoadExample }: RandomForestPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [taskType, setTaskType] = useState('auto');
    const [nEstimators, setNEstimators] = useState(100);
    const [maxDepth, setMaxDepth] = useState<number | undefined>(undefined);
    const [minSamplesSplit, setMinSamplesSplit] = useState(2);
    const [minSamplesLeaf, setMinSamplesLeaf] = useState(1);
    const [maxFeatures, setMaxFeatures] = useState('sqrt');
    const [bootstrap, setBootstrap] = useState(true);
    const [oobScore, setOobScore] = useState(true);
    const [testSize, setTestSize] = useState(0.2);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  


    const canRun = useMemo(() => data.length >= 50 && allHeaders.length >= 2, [data, allHeaders]);
    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== targetCol), [allHeaders, targetCol]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Target variable selected', passed: !!targetCol, detail: targetCol || 'Select target' });
        checks.push({ label: 'Features selected', passed: featureCols.length >= 1, detail: `${featureCols.length} features selected` });
        checks.push({ label: 'Sample size (n >= 50)', passed: data.length >= 50, detail: `n = ${data.length}` });
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
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `RandomForest_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `RANDOM FOREST REPORT\nGenerated,${new Date().toISOString()}\nTask Type,${analysisResult.task_type}\nN Samples,${analysisResult.n_samples}\nN Features,${analysisResult.n_features}\n\nMETRICS\n`;
        csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nFEATURE IMPORTANCE\n` + Papa.unparse(analysisResult.feature_importance);
        csv += `\n\nCV RESULTS\nMean,${analysisResult.cv_results.cv_mean}\nStd,${analysisResult.cv_results.cv_std}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `RandomForest_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/randomforest-docx', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult, targetCol, featureCols, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `RandomForest_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetCol, featureCols, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetCol || featureCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select target and features.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/random-forest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, task_type: taskType, test_size: testSize, n_estimators: nEstimators, max_depth: maxDepth, min_samples_split: minSamplesSplit, min_samples_leaf: minSamplesLeaf, max_features: maxFeatures, bootstrap, oob_score: oobScore }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            const mainMetric = result.task_type === 'classification' ? `Acc: ${(result.metrics.accuracy * 100).toFixed(1)}%` : `R²: ${result.metrics.r2?.toFixed(3)}`;
            toast({ title: 'Training Complete', description: mainMetric });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, taskType, testSize, nEstimators, maxDepth, minSamplesSplit, minSamplesLeaf, maxFeatures, bootstrap, oobScore, toast]);

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
            <RandomForestGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Random Forest</h1>
                    <p className="text-muted-foreground mt-1">Ensemble of decision trees</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Random Forest Parameters</CardTitle><CardDescription>Configure hyperparameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <ParamSlider label="n_estimators (Trees)" value={nEstimators} onChange={setNEstimators} min={10} max={500} step={10} />
                                <div className="space-y-3">
                                    <Label>max_features</Label>
                                    <Select value={maxFeatures} onValueChange={setMaxFeatures}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sqrt">sqrt (default)</SelectItem>
                                            <SelectItem value="log2">log2</SelectItem>
                                            <SelectItem value="None">All features</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <ParamSlider label="min_samples_split" value={minSamplesSplit} onChange={setMinSamplesSplit} min={2} max={20} step={1} />
                                <ParamSlider label="min_samples_leaf" value={minSamplesLeaf} onChange={setMinSamplesLeaf} min={1} max={10} step={1} />
                                <ParamSlider label="test_size" value={testSize} onChange={setTestSize} min={0.1} max={0.4} step={0.05} unit="%" />
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Bootstrap sampling</Label>
                                        <Switch checked={bootstrap} onCheckedChange={setBootstrap} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">OOB Score</Label>
                                        <Switch checked={oobScore} onCheckedChange={setOobScore} disabled={!bootstrap} />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>More trees = more stable but slower. sqrt(features) at each split prevents overfitting. OOB score provides free validation estimate.</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Training Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Trees:</span> {nEstimators}</div><div><span className="text-muted-foreground">Max Features:</span> {maxFeatures}</div><div><span className="text-muted-foreground">Bootstrap:</span> {bootstrap ? 'Yes' : 'No'}</div><div><span className="text-muted-foreground">Features:</span> {featureCols.length}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Trees className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Random Forest will train {nEstimators} independent decision trees and aggregate their predictions.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Training...</> : <>Train Model<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const isClassification = results.task_type === 'classification';
                    const mainMetric = isClassification ? results.metrics.accuracy : results.metrics.r2;
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
                                        {results.metrics.oob_score && <p className="text-sm">• OOB Score: <strong>{(results.metrics.oob_score * 100).toFixed(1)}%</strong> (out-of-bag estimate).</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Predictive Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The ensemble shows good generalization. Random Forest is robust to overfitting." : "Consider adding more trees, tuning max_depth, or engineering new features."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• {isClassification ? 'Accuracy' : 'R²'}: {isClassification ? `${(mainMetric * 100).toFixed(1)}%` : mainMetric?.toFixed(3)} — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• CV stability: {results.cv_results.cv_std < 0.05 ? 'low variance, consistent' : 'some variance across folds'}</p><p>• Train vs Test gap: {(results.metrics.train_accuracy || results.metrics.train_r2) ? `${(((results.metrics.train_accuracy || results.metrics.train_r2 || 0) - mainMetric) * 100).toFixed(1)}%` : 'N/A'} — {Math.abs((results.metrics.train_accuracy || results.metrics.train_r2 || 0) - mainMetric) < 0.1 ? 'good generalization' : 'possible overfitting'}</p></div></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding Random Forest performance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How Random Forest Works</h4><p className="text-sm text-muted-foreground">Random Forest builds {results.parameters.n_estimators} independent decision trees using bootstrap samples. Each tree sees a random subset of features at each split. Final prediction is the majority vote (classification) or average (regression).</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Feature Importance</h4><p className="text-sm text-muted-foreground">Top features: {results.feature_importance.slice(0, 3).map(f => f.feature).join(', ')}. Importance is measured by how much each feature decreases impurity across all trees. Focus on these for insights.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Cross-Validation & OOB</h4><p className="text-sm text-muted-foreground">CV score of {(results.cv_results.cv_mean * 100).toFixed(1)}% ± {(results.cv_results.cv_std * 100).toFixed(1)}% shows {results.cv_results.cv_std < 0.05 ? 'stable performance' : 'some variability'}. {results.metrics.oob_score ? `OOB score of ${(results.metrics.oob_score * 100).toFixed(1)}% provides an additional unbiased estimate.` : ''}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `This model is ready for production use. Expected ${isClassification ? 'accuracy' : 'R²'} on new data: ~${(mainMetric * 100).toFixed(0)}%.` : `Consider: (1) increasing n_estimators, (2) tuning max_depth to prevent overfitting, (3) adding more informative features.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Model</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Room for Improvement</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your Random Forest model achieves ${(mainMetric * 100).toFixed(1)}% ${isClassification ? 'accuracy' : 'R²'}, indicating strong predictive capability with ensemble robustness.` : `Current ${isClassification ? 'accuracy' : 'R²'} of ${(mainMetric * 100).toFixed(1)}% suggests the model could benefit from hyperparameter tuning or additional features.`}</p></div>
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
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator /><DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileCode className="mr-2 h-4 w-4" />R Code<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Random Forest Report</h2><p className="text-sm text-muted-foreground mt-1">{results.task_type} | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

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
                                                A Random Forest {results.task_type} model was trained to predict <em>{targetCol}</em> using {results.n_features} features.
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
                                                {results.metrics.oob_score && <> The out-of-bag score was <span className="font-mono">{(results.metrics.oob_score * 100).toFixed(2)}%</span>.</>}
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
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="importance" className="w-full"><TabsList className={`grid w-full ${results.task_type === 'classification' ? 'grid-cols-4' : 'grid-cols-3'}`}><TabsTrigger value="importance">Feature Importance</TabsTrigger><TabsTrigger value="trees">Tree Count</TabsTrigger>{results.task_type === 'classification' ? <><TabsTrigger value="confusion">Confusion</TabsTrigger><TabsTrigger value="roc">ROC</TabsTrigger></> : <TabsTrigger value="regression">Actual vs Pred</TabsTrigger>}</TabsList><TabsContent value="importance" className="mt-4">{results.importance_plot ? <Image src={`data:image/png;base64,${results.importance_plot}`} alt="Importance" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="trees" className="mt-4">{results.tree_count_plot ? <Image src={`data:image/png;base64,${results.tree_count_plot}`} alt="Tree Count" width={700} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>{results.task_type === 'classification' ? (<><TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="roc" className="mt-4">{results.roc_plot ? <Image src={`data:image/png;base64,${results.roc_plot}`} alt="ROC" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></>) : (<TabsContent value="regression" className="mt-4">{results.regression_plot ? <Image src={`data:image/png;base64,${results.regression_plot}`} alt="Regression" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>)}</Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="w-48">Bar</TableHead></TableRow></TableHeader><TableBody>{results.feature_importance.slice(0, 15).map((f, i) => (<TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{f.feature}</TableCell><TableCell className="text-right font-mono">{(f.importance * 100).toFixed(2)}%</TableCell><TableCell><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${f.importance * 100}%` }} /></div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.task_type === 'classification' && results.per_class_metrics && (<Card><CardHeader><CardTitle>Per-Class Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader><TableBody>{results.per_class_metrics.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.class}</TableCell><TableCell className="text-right font-mono">{(c.precision * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.recall * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.f1_score * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{c.support}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-semibold">{typeof v === 'number' ? (v % 1 === 0 ? v : v.toFixed(2)) : String(v)}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Cross-Validation Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>CV Mean</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Average across {results.cv_results.cv_folds} folds</TableCell></TableRow><TableRow><TableCell>CV Std</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">{results.cv_results.cv_std < 0.03 ? 'Very stable' : results.cv_results.cv_std < 0.05 ? 'Stable' : 'Some variance'}</TableCell></TableRow><TableRow><TableCell>Folds</TableCell><TableCell className="text-right font-mono">{results.cv_results.cv_folds}</TableCell><TableCell className="text-muted-foreground">Number of CV iterations</TableCell></TableRow>{results.metrics.oob_score && <TableRow><TableCell>OOB Score</TableCell><TableCell className="text-right font-mono">{(results.metrics.oob_score * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Out-of-bag estimate (unbiased)</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Training Random Forest model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>

            {/* Modals */}
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        </div>
    );
}