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
import { Loader2, HelpCircle, Zap, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, Gauge, Activity, Info, Shield, FileType, FileCode, Hash, Layers, GitBranch } from 'lucide-react';
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
import { Code, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/discriminant_analysis.py?alt=media";

// Metric definitions for Discriminant Analysis
const metricDefinitions: Record<string, string> = {
    accuracy: "The proportion of correctly classified samples out of all samples.",
    precision: "The proportion of true positive predictions among all positive predictions. High precision means few false positives.",
    recall: "The proportion of actual positives that were correctly identified. Also called sensitivity or true positive rate.",
    f1_score: "The harmonic mean of precision and recall, providing a balanced measure of both metrics.",
    auc: "Area Under the ROC Curve. Measures the model's ability to distinguish between classes. 1.0 is perfect, 0.5 is random.",
    support: "The number of actual occurrences of each class in the test set.",
    cv_mean: "The average accuracy across all cross-validation folds, indicating expected performance on new data.",
    cv_std: "Standard deviation of cross-validation scores. Lower values indicate more stable/consistent model performance.",
    lda: "Linear Discriminant Analysis assumes all classes share the same covariance matrix, creating linear decision boundaries.",
    qda: "Quadratic Discriminant Analysis allows each class to have its own covariance matrix, creating curved decision boundaries.",
    explained_variance: "The proportion of total variance in the data explained by each discriminant function.",
    class_means: "The centroid (average feature values) for each class, used to classify new observations.",
    priors: "The prior probability of each class, typically estimated from training data proportions.",
    shrinkage: "A regularization technique that shrinks the covariance estimate toward a diagonal matrix, useful for high-dimensional data.",
    solver: "The algorithm used to compute the LDA solution: SVD, LSQR, or Eigenvalue decomposition."
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
        link.download = 'discriminant_analysis.py';
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
                        Python Code - Discriminant Analysis
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
                        Discriminant Analysis Glossary
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
interface LDAInfo { scalings?: number[][]; explained_variance_ratio?: number[]; class_means?: number[][]; priors?: number[]; }
interface AnalysisResults { method: string; n_samples: number; n_features: number; n_classes: number; n_train: number; n_test: number; parameters: Record<string, any>; metrics: Record<string, number>; feature_importance: FeatureImportance[]; cv_results: CVResults; importance_plot: string | null; cm_plot?: string | null; roc_plot?: string | null; lda_projection_plot?: string | null; class_separation_plot?: string | null; per_class_metrics?: ClassMetrics[]; confusion_matrix?: number[][]; class_labels?: string[]; interpretation: Interpretation; lda_info?: LDAInfo; qda_info?: Record<string, any>; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Parameters' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const mainMetric = results.metrics.accuracy;
    const getQuality = (m: number) => m >= 0.9 ? 'Excellent' : m >= 0.8 ? 'Good' : m >= 0.7 ? 'Fair' : 'Needs Work';
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Accuracy</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(mainMetric * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">{getQuality(mainMetric)} performance</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Precision</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.precision_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Recall</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.recall_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">F1 Score</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.f1_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
        </div>
    );
};

const DiscriminantAnalysisGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Discriminant Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Discriminant Analysis */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                What is Discriminant Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Discriminant Analysis is a classification technique based on <strong>Bayes' theorem</strong>. 
                It finds linear or quadratic combinations of features that best separate classes by maximizing 
                the ratio of <strong>between-class variance</strong> to <strong>within-class variance</strong>.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The goal:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Find decision boundaries that best separate groups based on feature values.
                    Also performs dimensionality reduction (LDA can project to n-1 dimensions for n classes).
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* LDA vs QDA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                LDA vs QDA: When to Use Each
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Linear Discriminant Analysis (LDA)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Assumes <strong>equal covariance</strong> across classes</li>
                    <li>• Creates <strong>linear</strong> decision boundaries</li>
                    <li>• More stable with <strong>small samples</strong></li>
                    <li>• Provides <strong>dimensionality reduction</strong></li>
                    <li>• Better when classes have similar spread</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Quadratic Discriminant Analysis (QDA)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Allows <strong>different covariance</strong> per class</li>
                    <li>• Creates <strong>curved</strong> decision boundaries</li>
                    <li>• Needs <strong>more samples</strong> per class</li>
                    <li>• More flexible but can overfit</li>
                    <li>• Better when classes have different spreads</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Rule of thumb:</strong> Start with LDA. If performance is poor and you have 
                  enough samples (50+ per class), try QDA to capture non-linear boundaries.
                </p>
              </div>
            </div>

            <Separator />

            {/* Key Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Assumptions to Check
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">1. Multivariate Normality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Features should be approximately normally distributed within each class.
                    <br/><strong>Violation impact:</strong> Moderate — DA is fairly robust to this
                    <br/><strong>Check:</strong> Histograms per class, Shapiro-Wilk tests
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Homogeneity of Covariance (LDA only)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    LDA assumes all classes share the same covariance matrix.
                    <br/><strong>Violation impact:</strong> High — use QDA instead
                    <br/><strong>Check:</strong> Box's M test, visual inspection of scatter plots
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. No Multicollinearity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Features should not be highly correlated with each other.
                    <br/><strong>Violation impact:</strong> Can cause unstable estimates
                    <br/><strong>Solution:</strong> Remove redundant features or use regularization
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">4. Adequate Sample Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Need enough samples per class, especially for QDA.
                    <br/><strong>LDA:</strong> 20+ per class minimum, 50+ recommended
                    <br/><strong>QDA:</strong> 50+ per class minimum (estimates more parameters)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Key Metrics to Evaluate
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Accuracy (Primary Metric)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of correct predictions.
                    <br/><strong>&gt;90%:</strong> Excellent
                    <br/><strong>80-90%:</strong> Good
                    <br/><strong>70-80%:</strong> Fair
                    <br/><strong>&lt;70%:</strong> Needs improvement
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Precision, Recall, F1-Score</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Precision:</strong> Of predicted positives, how many are correct?
                    <br/><strong>Recall:</strong> Of actual positives, how many did we find?
                    <br/><strong>F1:</strong> Harmonic mean of precision and recall
                    <br/>• Useful when classes are imbalanced
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cross-Validation Score</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average accuracy across multiple train/test splits.
                    <br/><strong>CV Mean:</strong> Expected performance on new data
                    <br/><strong>CV Std:</strong> Model stability (lower is better)
                    <br/>• CV Std &lt; 3%: Very stable
                    <br/>• CV Std 3-5%: Stable
                    <br/>• CV Std &gt; 5%: Some instability
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">ROC-AUC</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Area under the ROC curve — measures discrimination ability.
                    <br/><strong>&gt;0.9:</strong> Excellent discrimination
                    <br/><strong>0.8-0.9:</strong> Good
                    <br/><strong>0.7-0.8:</strong> Fair
                    <br/><strong>0.5:</strong> No discrimination (random)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* LDA Parameters */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Understanding Parameters
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Solver (LDA)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>SVD:</strong> Default, works with any data, no matrix inversion
                    <br/><strong>LSQR:</strong> More efficient for large datasets
                    <br/><strong>Eigen:</strong> Traditional method, computes explicit eigenvalues
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Shrinkage (LDA)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Regularizes the covariance estimate toward a diagonal matrix.
                    <br/><strong>None:</strong> Use empirical covariance (default)
                    <br/><strong>Auto:</strong> Ledoit-Wolf automatic shrinkage
                    <br/>• Use shrinkage with high-dimensional data (features &gt; samples)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">reg_param (QDA)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Regularization parameter for QDA (0 to 1).
                    <br/><strong>0:</strong> No regularization (pure QDA)
                    <br/><strong>1:</strong> Maximum regularization (approaches LDA)
                    <br/>• Increase if you have limited samples per class
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">test_size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proportion of data held out for testing.
                    <br/><strong>20%:</strong> Standard choice
                    <br/><strong>30%:</strong> More reliable test estimate, less training data
                    <br/>• Cross-validation provides more robust estimates
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting Your Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Feature Importance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows which features best separate the classes.
                    <br/>• Higher importance = more discriminative power
                    <br/>• Based on LDA coefficients or permutation importance
                    <br/>• Use to identify key distinguishing variables
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">LDA Projection Plot</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects data onto discriminant axes (LD1, LD2, ...).
                    <br/>• Good separation: Classes form distinct clusters
                    <br/>• Poor separation: Classes overlap significantly
                    <br/>• Number of axes = min(n_classes - 1, n_features)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Confusion Matrix</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows actual vs predicted class labels.
                    <br/>• Diagonal = correct predictions
                    <br/>• Off-diagonal = misclassifications
                    <br/>• Identify which classes are commonly confused
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Per-Class Metrics</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Performance breakdown by class.
                    <br/>• Identify if some classes are harder to predict
                    <br/>• Low recall = many false negatives for that class
                    <br/>• Low precision = many false positives for that class
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
                    <li>• Check class balance (stratified splitting)</li>
                    <li>• Remove or impute missing values</li>
                    <li>• Consider feature scaling (usually not needed)</li>
                    <li>• Remove highly correlated features</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Model Selection</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with LDA (simpler, more stable)</li>
                    <li>• Try QDA if classes have different spreads</li>
                    <li>• Use shrinkage for high-dimensional data</li>
                    <li>• Compare with other classifiers (RF, SVM)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Evaluation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Always use cross-validation</li>
                    <li>• Check per-class metrics, not just accuracy</li>
                    <li>• Look at the confusion matrix</li>
                    <li>• Compare train vs test performance</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report accuracy AND CV score</li>
                    <li>• Include precision/recall for all classes</li>
                    <li>• Show the LDA projection plot</li>
                    <li>• List most important features</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Discriminant Analysis works best when 
                features are approximately normally distributed within classes. Unlike logistic regression, 
                DA explicitly models the distribution of features, which can be advantageous when assumptions 
                are met but problematic when they're violated. Cross-validation scores are more reliable 
                than single train/test splits for estimating real-world performance.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Layers className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Discriminant Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Linear and Quadratic Discriminant Analysis for classification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><GitBranch className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Class Separation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Maximizes between-class variance</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Dimensionality</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Reduces to discriminant axes</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Gauge className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Probabilistic</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Based on Bayes' theorem</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use Discriminant Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Discriminant Analysis for classification when you assume normally distributed features within each class. LDA assumes equal covariance matrices; QDA allows different covariances per class.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Target:</strong> Categorical (2+ classes)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Features:</strong> Continuous/numeric</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Sample size:</strong> 50+ observations</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>LDA projection:</strong> Visualize separation</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>CV scores:</strong> Model stability</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Metrics:</strong> Accuracy, F1, AUC</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Layers className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface DiscriminantAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function DiscriminantAnalysisPage({ data, allHeaders, onLoadExample }: DiscriminantAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [method, setMethod] = useState('lda');
    const [solver, setSolver] = useState('svd');
    const [shrinkage, setShrinkage] = useState<string>('None');
    const [nComponents, setNComponents] = useState<number | undefined>(undefined);
    const [regParam, setRegParam] = useState(0.0);
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
        const potentialTarget = allHeaders.find(h => h.toLowerCase().includes('target') || h.toLowerCase().includes('class') || h.toLowerCase().includes('label') || h.toLowerCase().includes('species') || h.toLowerCase() === 'y');
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
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `DiscriminantAnalysis_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `DISCRIMINANT ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nMethod,${analysisResult.method}\nN Samples,${analysisResult.n_samples}\nN Features,${analysisResult.n_features}\nN Classes,${analysisResult.n_classes}\n\nMETRICS\n`;
        csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nFEATURE IMPORTANCE\n` + Papa.unparse(analysisResult.feature_importance);
        csv += `\n\nCV RESULTS\nMean,${analysisResult.cv_results.cv_mean}\nStd,${analysisResult.cv_results.cv_std}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `DiscriminantAnalysis_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/discriminant-docx', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult, targetCol, featureCols, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `DiscriminantAnalysis_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetCol, featureCols, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetCol || featureCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select target and features.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/lda`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, method, solver, shrinkage: shrinkage === 'None' ? null : shrinkage, n_components: nComponents, reg_param: regParam, test_size: testSize }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Training Complete', description: `Acc: ${(result.metrics.accuracy * 100).toFixed(1)}%` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, method, solver, shrinkage, nComponents, regParam, testSize, toast]);

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
            <DiscriminantAnalysisGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Discriminant Analysis</h1>
                    <p className="text-muted-foreground mt-1">LDA / QDA for classification</p>
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
                                <div className="space-y-3"><Label>Method</Label><Select value={method} onValueChange={setMethod}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lda">LDA (Linear)</SelectItem><SelectItem value="qda">QDA (Quadratic)</SelectItem></SelectContent></Select></div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Discriminant Analysis Parameters</CardTitle><CardDescription>Configure {method.toUpperCase()} settings</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            {method === 'lda' ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label>Solver</Label>
                                        <Select value={solver} onValueChange={setSolver}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="svd">SVD (default)</SelectItem>
                                                <SelectItem value="lsqr">Least Squares</SelectItem>
                                                <SelectItem value="eigen">Eigenvalue Decomposition</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label>Shrinkage</Label>
                                        <Select value={shrinkage} onValueChange={setShrinkage}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="None">None</SelectItem>
                                                <SelectItem value="auto">Auto (Ledoit-Wolf)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <ParamSlider label="test_size" value={testSize} onChange={setTestSize} min={0.1} max={0.4} step={0.05} unit="%" />
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-6">
                                    <ParamSlider label="reg_param (Regularization)" value={regParam} onChange={setRegParam} min={0} max={1} step={0.05} />
                                    <ParamSlider label="test_size" value={testSize} onChange={setTestSize} min={0.1} max={0.4} step={0.05} unit="%" />
                                </div>
                            )}
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>{method === 'lda' ? 'LDA assumes equal covariance matrices across classes. Use shrinkage for high-dimensional data.' : 'QDA allows different covariance matrices per class. Use regularization if you have limited samples per class.'}</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Training Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Method:</span> {method.toUpperCase()}</div><div><span className="text-muted-foreground">Solver:</span> {method === 'lda' ? solver : 'N/A'}</div><div><span className="text-muted-foreground">Shrinkage:</span> {method === 'lda' ? shrinkage : 'N/A'}</div><div><span className="text-muted-foreground">Features:</span> {featureCols.length}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Layers className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">{method === 'lda' ? 'LDA will find linear decision boundaries maximizing class separation.' : 'QDA will fit quadratic decision boundaries with class-specific covariances.'}</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Training...</> : <>Train Model<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const mainMetric = results.metrics.accuracy;
                    const isGood = mainMetric >= 0.8;
                    const topFeature = results.feature_importance[0];
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{results.method} with {results.n_classes} classes</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Model achieved <strong>{(mainMetric * 100).toFixed(1)}% accuracy</strong> on test data ({results.n_test} samples).</p>
                                        <p className="text-sm">• Most discriminative feature: <strong>{topFeature?.feature}</strong> ({(topFeature?.importance * 100).toFixed(1)}% importance).</p>
                                        <p className="text-sm">• Cross-validation: <strong>{(results.cv_results.cv_mean * 100).toFixed(1)}%</strong> ± {(results.cv_results.cv_std * 100).toFixed(1)}% ({results.cv_results.cv_folds}-fold).</p>
                                        {results.metrics.f1_macro && <p className="text-sm">• F1 Score: <strong>{(results.metrics.f1_macro * 100).toFixed(1)}%</strong> (macro average).</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Classification Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The model shows good class separation. You can confidently use it for predictions." : "Consider trying QDA if classes have different variances, or add more discriminative features."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Accuracy: {(mainMetric * 100).toFixed(1)}% — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• CV stability: {results.cv_results.cv_std < 0.05 ? 'low variance, consistent' : 'some variance across folds'}</p><p>• Train vs Test gap: {results.metrics.train_accuracy ? `${((results.metrics.train_accuracy - mainMetric) * 100).toFixed(1)}%` : 'N/A'} — {Math.abs((results.metrics.train_accuracy || 0) - mainMetric) < 0.1 ? 'good generalization' : 'possible overfitting'}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (mainMetric >= 0.9 ? 5 : mainMetric >= 0.8 ? 4 : mainMetric >= 0.7 ? 3 : mainMetric >= 0.6 ? 2 : 1) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const mainMetric = results.metrics.accuracy;
                    const isGood = mainMetric >= 0.8;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding Discriminant Analysis performance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How {results.method} Works</h4><p className="text-sm text-muted-foreground">{results.method === 'LDA' ? 'LDA finds linear combinations of features that maximize the ratio of between-class variance to within-class variance. It assumes all classes share the same covariance matrix.' : 'QDA relaxes the equal covariance assumption, fitting a separate covariance matrix for each class. This allows for more flexible, quadratic decision boundaries.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Feature Importance</h4><p className="text-sm text-muted-foreground">Top features: {results.feature_importance.slice(0, 3).map(f => f.feature).join(', ')}. These variables best separate the classes. Features with higher importance have greater discriminative power.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Cross-Validation</h4><p className="text-sm text-muted-foreground">CV score of {(results.cv_results.cv_mean * 100).toFixed(1)}% ± {(results.cv_results.cv_std * 100).toFixed(1)}% shows {results.cv_results.cv_std < 0.05 ? 'stable performance across different data splits' : 'some variability — more data might help'}. This is more reliable than a single train/test split.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `This model is ready for production use. Expected accuracy on new data: ~${(mainMetric * 100).toFixed(0)}%.` : `Consider: (1) trying ${results.method === 'LDA' ? 'QDA for non-linear boundaries' : 'LDA if overfitting'}, (2) adding more informative features, (3) collecting more training data.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Model</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Room for Improvement</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your ${results.method} model achieves ${(mainMetric * 100).toFixed(1)}% accuracy, indicating effective class separation.` : `Current accuracy of ${(mainMetric * 100).toFixed(1)}% suggests the model could benefit from different method choice or additional features.`}</p></div>
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
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Discriminant Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.method} | n = {results.n_samples} | {results.n_classes} classes | {new Date().toLocaleDateString()}</p></div>
                            
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
                                                A {results.method === 'LDA' ? 'Linear Discriminant Analysis' : 'Quadratic Discriminant Analysis'} was conducted to classify <em>{targetCol}</em> ({results.n_classes} classes) using {results.n_features} features.
                                                The dataset included <em>N</em> = {results.n_samples} observations, split into {results.n_train} training and {results.n_test} test samples
                                                ({((1 - testSize) * 100).toFixed(0)}%/{(testSize * 100).toFixed(0)}% split).
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The model achieved an accuracy of <span className="font-mono">{(results.metrics.accuracy * 100).toFixed(2)}%</span> on the test set, 
                                                with precision = <span className="font-mono">{(results.metrics.precision_macro * 100).toFixed(2)}%</span>, 
                                                recall = <span className="font-mono">{(results.metrics.recall_macro * 100).toFixed(2)}%</span>, 
                                                and F1-score = <span className="font-mono">{(results.metrics.f1_macro * 100).toFixed(2)}%</span> (macro-averaged).
                                                {results.metrics.auc && <> The ROC-AUC was <span className="font-mono">{results.metrics.auc.toFixed(3)}</span>.</>}
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {results.cv_results.cv_folds}-fold cross-validation yielded a mean accuracy of <span className="font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</span> (SD = <span className="font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</span>), 
                                                indicating {results.cv_results.cv_std < 0.03 ? 'excellent' : results.cv_results.cv_std < 0.05 ? 'good' : 'moderate'} model stability.
                                                The most discriminative feature was <em>{results.feature_importance[0]?.feature}</em> ({(results.feature_importance[0]?.importance * 100).toFixed(1)}% importance), 
                                                followed by <em>{results.feature_importance[1]?.feature}</em> ({(results.feature_importance[1]?.importance * 100).toFixed(1)}%) 
                                                and <em>{results.feature_importance[2]?.feature}</em> ({(results.feature_importance[2]?.importance * 100).toFixed(1)}%).
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="importance" className="w-full"><TabsList className={`grid w-full ${results.lda_projection_plot ? 'grid-cols-4' : 'grid-cols-3'}`}><TabsTrigger value="importance">Feature Importance</TabsTrigger>{results.lda_projection_plot && <TabsTrigger value="projection">LDA Projection</TabsTrigger>}<TabsTrigger value="confusion">Confusion Matrix</TabsTrigger><TabsTrigger value="roc">ROC Curve</TabsTrigger></TabsList><TabsContent value="importance" className="mt-4">{results.importance_plot ? <Image src={`data:image/png;base64,${results.importance_plot}`} alt="Importance" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>{results.lda_projection_plot && <TabsContent value="projection" className="mt-4"><Image src={`data:image/png;base64,${results.lda_projection_plot}`} alt="LDA Projection" width={700} height={500} className="w-full rounded-md border" /></TabsContent>}<TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="roc" className="mt-4">{results.roc_plot ? <Image src={`data:image/png;base64,${results.roc_plot}`} alt="ROC" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="w-48">Bar</TableHead></TableRow></TableHeader><TableBody>{results.feature_importance.slice(0, 15).map((f, i) => (<TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{f.feature}</TableCell><TableCell className="text-right font-mono">{(f.importance * 100).toFixed(2)}%</TableCell><TableCell><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${f.importance * 100}%` }} /></div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.per_class_metrics && (<Card><CardHeader><CardTitle>Per-Class Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader><TableBody>{results.per_class_metrics.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.class}</TableCell><TableCell className="text-right font-mono">{(c.precision * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.recall * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.f1_score * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{c.support}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-semibold">{typeof v === 'number' ? (v % 1 === 0 ? v : v.toFixed(2)) : String(v)}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Cross-Validation Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>CV Mean</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Average across {results.cv_results.cv_folds} folds</TableCell></TableRow><TableRow><TableCell>CV Std</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">{results.cv_results.cv_std < 0.03 ? 'Very stable' : results.cv_results.cv_std < 0.05 ? 'Stable' : 'Some variance'}</TableCell></TableRow><TableRow><TableCell>Folds</TableCell><TableCell className="text-right font-mono">{results.cv_results.cv_folds}</TableCell><TableCell className="text-muted-foreground">Number of CV iterations</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Training {method.toUpperCase()} model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>

            {/* Modals */}
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        </div>
    );
}