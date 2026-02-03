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
import { Loader2, HelpCircle, Users, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, BarChart3, Ruler, Search, TrendingUp, Activity, Hash, Info, Shield, FileType, FileCode, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/knn_analysis.py?alt=media";

// KNN metric definitions for glossary
const knnMetricDefinitions: Record<string, string> = {
    // Classification metrics
    accuracy: "The proportion of correct predictions out of all predictions made. Ranges from 0 to 1.",
    precision: "Of all positive predictions, the proportion that were actually correct. High precision means few false positives.",
    recall: "Of all actual positives, the proportion that were correctly identified. High recall means few false negatives.",
    f1_score: "The harmonic mean of precision and recall. Balances both metrics, useful when classes are imbalanced.",
    auc: "Area Under the ROC Curve. Measures the model's ability to distinguish between classes. 1.0 is perfect, 0.5 is random.",
    
    // Regression metrics
    r2: "R-squared (Coefficient of Determination). The proportion of variance in the target explained by the model. 1.0 is perfect.",
    rmse: "Root Mean Squared Error. Average prediction error in the same units as the target. Lower is better.",
    mae: "Mean Absolute Error. Average absolute difference between predictions and actual values. Lower is better.",
    mse: "Mean Squared Error. Average of squared differences between predictions and actual values.",
    
    // KNN-specific terms
    k_neighbors: "The number of nearest neighbors used for prediction. Odd numbers avoid ties in classification.",
    weights_uniform: "All K neighbors contribute equally to the prediction, regardless of distance.",
    weights_distance: "Closer neighbors have more influence on predictions (weighted by 1/distance).",
    euclidean: "Straight-line distance between two points. Most common distance metric.",
    manhattan: "Sum of absolute differences along each dimension. Also called city-block distance.",
    minkowski: "Generalized distance metric. With p=2, it equals Euclidean distance.",
    chebyshev: "Maximum absolute difference along any dimension. Also called chessboard distance.",
    
    // Cross-validation terms
    cv_score: "Cross-validation score. Average performance across multiple train/test splits.",
    cv_std: "Standard deviation of CV scores. Low values indicate stable, consistent model performance.",
    cv_folds: "Number of subsets the data is divided into for cross-validation.",
    
    // Feature importance
    permutation_importance: "Measures how much model performance decreases when a feature's values are randomly shuffled.",
    
    // General terms
    test_size: "Proportion of data held out for testing. Common values are 0.2 (20%) or 0.3 (30%).",
    scaling: "Standardizing features to have mean=0 and std=1. Essential for distance-based algorithms like KNN.",
    confusion_matrix: "A table showing correct and incorrect predictions for each class.",
    roc_curve: "Receiver Operating Characteristic curve. Plots true positive rate vs false positive rate."
};

interface FeatureImportance { feature: string; importance: number; std: number; }
interface ClassMetrics { class: string; precision: number; recall: number; f1_score: number; support: number; }
interface KScore { k: number; mean_score: number; std_score: number; }
interface KSearchResult { k_scores: KScore[]; optimal_k: number; optimal_score: number; }
interface CVResults { cv_scores: number[]; cv_mean: number; cv_std: number; cv_folds: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { task_type: string; n_samples: number; n_features: number; n_train: number; n_test: number; parameters: Record<string, any>; metrics: Record<string, number>; feature_importance: FeatureImportance[]; cv_results: CVResults; k_search_result: KSearchResult | null; importance_plot: string | null; k_plot?: string | null; cm_plot?: string | null; roc_plot?: string | null; decision_plot?: string | null; regression_plot?: string | null; per_class_metrics?: ClassMetrics[]; confusion_matrix?: number[][]; class_labels?: string[]; interpretation: Interpretation; }

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
        link.download = 'knn_analysis.py';
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
                        Python Code - KNN Analysis
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
                        KNN Statistical Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of metrics and terms used in K-Nearest Neighbors analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Classification Metrics */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Classification Metrics
                            </h3>
                            <div className="space-y-3">
                                {['accuracy', 'precision', 'recall', 'f1_score', 'auc'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace('_', ' ').replace('auc', 'AUC')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{knnMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Regression Metrics */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Regression Metrics
                            </h3>
                            <div className="space-y-3">
                                {['r2', 'rmse', 'mae', 'mse'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium uppercase">{term}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{knnMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* KNN-specific Terms */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                KNN Parameters
                            </h3>
                            <div className="space-y-3">
                                {['k_neighbors', 'weights_uniform', 'weights_distance'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{knnMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Distance Metrics */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Ruler className="w-4 h-4" />
                                Distance Metrics
                            </h3>
                            <div className="space-y-3">
                                {['euclidean', 'manhattan', 'minkowski', 'chebyshev'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{knnMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cross-validation Terms */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Cross-Validation
                            </h3>
                            <div className="space-y-3">
                                {['cv_score', 'cv_std', 'cv_folds'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{knnMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* General Terms */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                General Terms
                            </h3>
                            <div className="space-y-3">
                                {['permutation_importance', 'test_size', 'scaling', 'confusion_matrix', 'roc_curve'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{knnMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">K Neighbors</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.parameters.n_neighbors}</p><p className="text-xs text-muted-foreground">{results.k_search_result ? 'Optimal via CV' : 'User specified'}</p></div></CardContent></Card>
                </>
            ) : (
                <>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RMSE</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.rmse?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Root mean squared error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">MAE</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.mae?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Mean absolute error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">K Neighbors</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.parameters.n_neighbors}</p><p className="text-xs text-muted-foreground">{results.k_search_result ? 'Optimal via CV' : 'User specified'}</p></div></CardContent></Card>
                </>
            )}
        </div>
    );
};


const KNNGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">KNN Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is KNN */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                What is K-Nearest Neighbors?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                K-Nearest Neighbors (KNN) is a simple, intuitive <strong>instance-based learning</strong> algorithm. 
                Instead of building a model, it memorizes the training data and makes predictions based on 
                the <strong>K most similar examples</strong>.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>How it works:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Store all training data (no training phase)<br/>
                    2. For a new point, find K nearest neighbors<br/>
                    3. <strong>Classification:</strong> Majority vote among K neighbors<br/>
                    4. <strong>Regression:</strong> Average of K neighbors' values<br/>
                    <br/>
                    "Tell me who your neighbors are, and I'll tell you who you are"
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Choosing K */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Choosing K: The Critical Decision
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Small K (1-5)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • <strong>Low bias, high variance</strong><br/>
                    • Sensitive to noise and outliers<br/>
                    • Creates complex, irregular boundaries<br/>
                    • Risk of overfitting<br/>
                    • K=1: "1-NN" — predict same as single nearest neighbor
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Large K (15+)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • <strong>High bias, low variance</strong><br/>
                    • Smoother, more stable boundaries<br/>
                    • Less sensitive to noise<br/>
                    • Risk of underfitting<br/>
                    • May miss local patterns
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Moderate K (5-15)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Usually the sweet spot<br/>
                    • Balance between bias and variance<br/>
                    • Use cross-validation to find optimal K<br/>
                    • Common rule: K = √n (square root of sample size)
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Tip:</strong> Use <strong>odd K</strong> for binary classification to avoid ties. 
                  The "Find Optimal K" option tests multiple values and selects the best via cross-validation.
                </p>
              </div>
            </div>

            <Separator />

            {/* Distance Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Distance Metrics
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Euclidean Distance (L2)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Straight-line distance: √(Σ(xᵢ - yᵢ)²)
                    <br/>• Most common, intuitive
                    <br/>• Works well for continuous features
                    <br/>• Sensitive to scale — <strong>always standardize!</strong>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Manhattan Distance (L1)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    City-block distance: Σ|xᵢ - yᵢ|
                    <br/>• Sum of absolute differences
                    <br/>• Less sensitive to outliers than Euclidean
                    <br/>• Better for sparse, high-dimensional data
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Minkowski Distance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generalized: (Σ|xᵢ - yᵢ|^p)^(1/p)
                    <br/>• p=1: Manhattan, p=2: Euclidean
                    <br/>• Default in scikit-learn (p=2)
                    <br/>• Flexible — tune p for your data
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Chebyshev Distance (L∞)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum difference: max|xᵢ - yᵢ|
                    <br/>• "Chessboard distance"
                    <br/>• Good when any single feature can dominate
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Weighting */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Neighbor Weighting
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Uniform (Default)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All K neighbors vote equally.
                    <br/>• Simple, fast
                    <br/>• Good when neighbors are similarly relevant
                    <br/>• Can be influenced by distant neighbors
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Distance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Closer neighbors have more weight (1/distance).
                    <br/>• Nearby points matter more
                    <br/>• Reduces influence of far neighbors
                    <br/>• Better when locality is important
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>When to use distance weighting:</strong> When you expect closer points to be 
                  more predictive, or when K is large and you want to reduce the influence of 
                  distant neighbors.
                </p>
              </div>
            </div>

            <Separator />

            {/* Feature Scaling */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical: Feature Scaling
              </h3>
              <div className="p-4 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                <p className="text-sm text-rose-700 dark:text-rose-400 mb-2">
                  <strong>KNN REQUIRES scaled features!</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  KNN uses distances to find neighbors. Without scaling:
                  <br/>• Features with larger ranges dominate (e.g., salary vs. age)
                  <br/>• Distance calculations are meaningless
                  <br/>• Model performs poorly
                  <br/><br/>
                  <strong>Always use StandardScaler</strong> (mean=0, std=1) before training.
                  This is enabled by default in this tool.
                </p>
              </div>
            </div>

            <Separator />

            {/* Strengths & Weaknesses */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Strengths & Weaknesses
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Strengths</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Simple and intuitive</strong></li>
                    <li>• No training phase (lazy learning)</li>
                    <li>• Naturally handles multi-class</li>
                    <li>• Non-parametric (no assumptions)</li>
                    <li>• Adapts to new data easily</li>
                    <li>• Works well with non-linear boundaries</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Weaknesses</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Slow prediction</strong> (searches all training data)</li>
                    <li>• Memory-intensive (stores all data)</li>
                    <li>• Sensitive to irrelevant features</li>
                    <li>• "Curse of dimensionality"</li>
                    <li>• Requires feature scaling</li>
                    <li>• Struggles with imbalanced classes</li>
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
                  <p className="font-medium text-sm text-primary mb-1">Do</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Always scale features</strong></li>
                    <li>• Use CV to find optimal K</li>
                    <li>• Start with K = √n</li>
                    <li>• Use odd K for binary classification</li>
                    <li>• Try distance weighting</li>
                    <li>• Remove irrelevant features</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Skip feature scaling</li>
                    <li>• Use K=1 without reason</li>
                    <li>• Use with very large datasets</li>
                    <li>• Include many irrelevant features</li>
                    <li>• Expect fast predictions</li>
                    <li>• Use with very high dimensions</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When to Use KNN</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Small to medium datasets</li>
                    <li>• Need quick, simple baseline</li>
                    <li>• Data has local patterns</li>
                    <li>• Low to moderate dimensions</li>
                    <li>• Non-linear decision boundaries</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Large datasets (slow)</li>
                    <li>• High-dimensional data</li>
                    <li>• Need fast predictions</li>
                    <li>• Many irrelevant features</li>
                    <li>• Need model interpretability</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Curse of Dimensionality */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                The Curse of Dimensionality
              </h3>
              <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                  <strong>KNN struggles in high dimensions</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  In high-dimensional spaces:
                  <br/>• All points become equidistant (distances become meaningless)
                  <br/>• "Nearest" neighbors may not be very near
                  <br/>• Need exponentially more data to maintain density
                  <br/><br/>
                  <strong>Solutions:</strong> Feature selection, PCA/dimensionality reduction, 
                  or switch to algorithms designed for high dimensions.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> KNN is simple but powerful for the right problems. 
                Always scale your features, use cross-validation to find optimal K, and be mindful of dataset 
                size and dimensionality. It's a great baseline model and works well when similar examples 
                should have similar predictions. For large datasets or when prediction speed matters, 
                consider tree-based methods like Random Forest.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Users className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">K-Nearest Neighbors</CardTitle>
                    <CardDescription className="text-base mt-2">Instance-based learning using neighbor voting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Search className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Lazy Learning</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">No training phase</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Ruler className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Distance Metrics</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Euclidean, Manhattan</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Users className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">K Neighbors</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Majority voting</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use KNN</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use KNN when you need a simple, interpretable model that makes predictions based on similar examples. Works well for small to medium datasets with meaningful distance metrics.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Target:</strong> Classification or regression</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Features:</strong> 1+ numeric variables</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Sample size:</strong> 30+ observations</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Optimal K:</strong> Via cross-validation</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Feature importance:</strong> Permutation</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Metrics:</strong> Accuracy, F1, R², etc.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Users className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface KNNPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function KNNAnalysisPage({ data, allHeaders, onLoadExample }: KNNPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [taskType, setTaskType] = useState('auto');
    const [nNeighbors, setNNeighbors] = useState(5);
    const [weights, setWeights] = useState('uniform');
    const [metric, setMetric] = useState('minkowski');
    const [testSize, setTestSize] = useState(0.2);
    const [scaleFeatures, setScaleFeatures] = useState(true);
    const [findOptimalK, setFindOptimalK] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    
    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    
    const canRun = useMemo(() => data.length >= 30 && allHeaders.length >= 2, [data, allHeaders]);
    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== targetCol), [allHeaders, targetCol]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Target variable selected', passed: !!targetCol, detail: targetCol || 'Select target' });
        checks.push({ label: 'Features selected', passed: featureCols.length >= 1, detail: `${featureCols.length} features selected` });
        checks.push({ label: 'Sample size (n ≥ 30)', passed: data.length >= 30, detail: `n = ${data.length}` });
        const trainSize = Math.floor(data.length * (1 - testSize));
        checks.push({ label: 'Training samples', passed: trainSize >= 20, detail: `~${trainSize} training samples` });
        return checks;
    }, [targetCol, featureCols, data.length, testSize]);

    const allValidationsPassed = dataValidation.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        const potentialTarget = allHeaders.find(h => h.toLowerCase().includes('target') || h.toLowerCase().includes('class') || h.toLowerCase().includes('species'));
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
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `KNN_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `KNN ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nTask Type,${analysisResult.task_type}\nK,${analysisResult.parameters.n_neighbors}\nMetric,${analysisResult.parameters.metric}\n\nMETRICS\n`;
        csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nFEATURE IMPORTANCE\n` + Papa.unparse(analysisResult.feature_importance);
        if (analysisResult.k_search_result) { csv += `\n\nK SELECTION\n` + Papa.unparse(analysisResult.k_search_result.k_scores); }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `KNN_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/knn-docx', {
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
            link.download = `KNN_Report_${new Date().toISOString().split('T')[0]}.docx`;
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
            const res = await fetch(`${FASTAPI_URL}/api/analysis/knn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, task_type: taskType, test_size: testSize, n_neighbors: nNeighbors, weights, metric, scale_features: scaleFeatures, find_optimal_k: findOptimalK, k_range: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19] }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            const mainMetric = result.task_type === 'classification' ? `Acc: ${(result.metrics.accuracy * 100).toFixed(1)}%` : `R²: ${result.metrics.r2?.toFixed(3)}`;
            toast({ title: 'Training Complete', description: `K=${result.parameters.n_neighbors}, ${mainMetric}` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, taskType, testSize, nNeighbors, weights, metric, scaleFeatures, findOptimalK, toast]);

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

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <KNNGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">KNN Analysis</h1>
                    <p className="text-muted-foreground mt-1">K-Nearest Neighbors</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>KNN Parameters</CardTitle><CardDescription>Configure neighbors and distance</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label>Weights</Label><Select value={weights} onValueChange={setWeights}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="uniform">Uniform (equal weight)</SelectItem><SelectItem value="distance">Distance (1/d)</SelectItem></SelectContent></Select></div>
                                <div className="space-y-3"><Label>Distance Metric</Label><Select value={metric} onValueChange={setMetric}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minkowski">Minkowski (p=2 → Euclidean)</SelectItem><SelectItem value="euclidean">Euclidean</SelectItem><SelectItem value="manhattan">Manhattan</SelectItem><SelectItem value="chebyshev">Chebyshev</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><div className="flex justify-between"><Label>K (Neighbors)</Label><Badge variant="outline">{nNeighbors}</Badge></div><Slider value={[nNeighbors]} onValueChange={(v) => setNNeighbors(v[0])} min={1} max={21} step={2} /><p className="text-xs text-muted-foreground">Used if auto-selection disabled</p></div>
                                <div className="space-y-3"><div className="flex justify-between"><Label>Test Size</Label><Badge variant="outline">{(testSize * 100).toFixed(0)}%</Badge></div><Slider value={[testSize]} onValueChange={(v) => setTestSize(v[0])} min={0.1} max={0.4} step={0.05} /></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="flex items-center space-x-2"><Checkbox id="scale" checked={scaleFeatures} onCheckedChange={(c) => setScaleFeatures(!!c)} /><label htmlFor="scale" className="text-sm cursor-pointer">Scale features (StandardScaler)</label></div>
                                <div className="flex items-center space-x-2"><Checkbox id="optk" checked={findOptimalK} onCheckedChange={(c) => setFindOptimalK(!!c)} /><label htmlFor="optk" className="text-sm cursor-pointer">Find optimal K via CV</label></div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Small K: low bias, high variance. Large K: high bias, low variance. Distance weighting helps when neighbors vary in relevance.</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">KNN Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">K:</span> {findOptimalK ? 'Auto' : nNeighbors}</div><div><span className="text-muted-foreground">Weights:</span> {weights}</div><div><span className="text-muted-foreground">Metric:</span> {metric}</div><div><span className="text-muted-foreground">Scaled:</span> {scaleFeatures ? 'Yes' : 'No'}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Users className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">KNN will classify based on {findOptimalK ? 'optimal K found via cross-validation' : `K=${nNeighbors} nearest neighbors`}.</p></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>KNN with K={results.parameters.n_neighbors}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Model achieved <strong>{isClassification ? `${(mainMetric * 100).toFixed(1)}% accuracy` : `R² of ${mainMetric?.toFixed(3)}`}</strong> on test data ({results.n_test} samples).</p>
                                        <p className="text-sm">• Optimal K = <strong>{results.parameters.n_neighbors}</strong> {results.k_search_result ? '(found via cross-validation)' : '(user specified)'}.</p>
                                        <p className="text-sm">• Cross-validation: <strong>{(results.cv_results.cv_mean * 100).toFixed(1)}%</strong> ± {(results.cv_results.cv_std * 100).toFixed(1)}% ({results.cv_results.cv_folds}-fold).</p>
                                        {topFeature && <p className="text-sm">• Most important feature: <strong>{topFeature.feature}</strong> (importance: {topFeature.importance.toFixed(3)}).</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Predictive Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "KNN found good patterns in the data. Predictions are reliable." : "Consider trying different K values, distance metrics, or adding more informative features."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• {mainMetricLabel}: {isClassification ? `${(mainMetric * 100).toFixed(1)}%` : mainMetric?.toFixed(3)} — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• K value: {results.parameters.n_neighbors} — {results.parameters.n_neighbors <= 5 ? 'low K (captures local patterns)' : results.parameters.n_neighbors >= 15 ? 'high K (smoother boundaries)' : 'moderate K (balanced)'}</p><p>• CV stability: {results.cv_results.cv_std < 0.05 ? 'low variance, consistent' : 'some variance across folds'}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (mainMetric >= 0.9 ? 5 : mainMetric >= 0.8 ? 4 : mainMetric >= 0.7 ? 3 : mainMetric >= 0.6 ? 2 : 1) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const isClassification = results.task_type === 'classification';
                    const mainMetric = isClassification ? results.metrics.accuracy : results.metrics.r2;
                    const isGood = mainMetric >= 0.8;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding KNN performance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How KNN Works</h4><p className="text-sm text-muted-foreground">KNN is a "lazy learning" algorithm — it stores all training data and makes predictions by finding the K most similar examples. With K={results.parameters.n_neighbors}, each prediction considers {results.parameters.n_neighbors} nearest neighbors using {results.parameters.metric} distance.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">K Selection</h4><p className="text-sm text-muted-foreground">{results.k_search_result ? `Cross-validation tested K values from 1-19 and found K=${results.k_search_result.optimal_k} optimal with ${(results.k_search_result.optimal_score * 100).toFixed(1)}% CV score.` : `K=${results.parameters.n_neighbors} was specified manually.`} {results.parameters.n_neighbors % 2 === 1 ? 'Odd K avoids ties in voting.' : 'Even K may cause ties.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Distance Weighting ({results.parameters.weights})</h4><p className="text-sm text-muted-foreground">{results.parameters.weights === 'uniform' ? 'All K neighbors vote equally. Good when neighbors are similarly relevant.' : 'Closer neighbors have more influence (1/distance). Better when nearby points are more predictive.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `This KNN model is ready for use. Expected ${isClassification ? 'accuracy' : 'R²'} on new data: ~${(mainMetric * 100).toFixed(0)}%. Note: prediction time scales with training set size.` : `Consider: (1) trying different K values, (2) using distance weighting, (3) feature selection to reduce dimensionality.`}</p></div></div></div>
                                {results.k_search_result && (<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Search className="w-4 h-4 text-blue-600" />K Selection Results</h4><div className="grid grid-cols-5 gap-2 text-center">{results.k_search_result.k_scores.slice(0, 5).map((s, i) => (<div key={i} className={`p-2 rounded ${s.k === results.k_search_result!.optimal_k ? 'bg-blue-200 font-bold' : 'bg-white dark:bg-slate-800'}`}><p className="text-xs text-muted-foreground">K={s.k}</p><p className="text-sm">{(s.mean_score * 100).toFixed(1)}%</p></div>))}</div></div>)}
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Model</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Room for Improvement</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your KNN model achieves ${(mainMetric * 100).toFixed(1)}% ${isClassification ? 'accuracy' : 'R²'} with K=${results.parameters.n_neighbors}, indicating good pattern recognition.` : `Current ${isClassification ? 'accuracy' : 'R²'} of ${(mainMetric * 100).toFixed(1)}% suggests the model could benefit from parameter tuning or feature engineering.`}</p></div>
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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">KNN Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.task_type} | K={results.parameters.n_neighbors} | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
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
                                                A K-Nearest Neighbors model was trained to predict <em>{targetCol}</em> using {results.n_features} features.
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
                                                    MAE = <span className="font-mono">{results.metrics.mae?.toFixed(4)}</span>.</>
                                                )}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {results.k_search_result ? (
                                                    <>Cross-validation search over K ∈ {'{'}1, 3, 5, ..., 19{'}'} identified K = <span className="font-mono">{results.k_search_result.optimal_k}</span> as optimal 
                                                    (CV score = <span className="font-mono">{(results.k_search_result.optimal_score * 100).toFixed(2)}%</span>). </>
                                                ) : (
                                                    <>K = <span className="font-mono">{results.parameters.n_neighbors}</span> was specified by the user. </>
                                                )}
                                                {results.cv_results.cv_folds}-fold cross-validation yielded a mean score of <span className="font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</span> (SD = <span className="font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</span>), 
                                                indicating {results.cv_results.cv_std < 0.03 ? 'excellent' : results.cv_results.cv_std < 0.05 ? 'good' : 'moderate'} model stability.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue={results.k_plot ? "kselection" : "importance"} className="w-full"><TabsList className={`grid w-full ${results.task_type === 'classification' ? (results.k_plot ? 'grid-cols-5' : 'grid-cols-4') : (results.k_plot ? 'grid-cols-3' : 'grid-cols-2')}`}>{results.k_plot && <TabsTrigger value="kselection">K Selection</TabsTrigger>}<TabsTrigger value="importance">Importance</TabsTrigger>{results.task_type === 'classification' ? <><TabsTrigger value="confusion">Confusion</TabsTrigger><TabsTrigger value="roc">ROC</TabsTrigger><TabsTrigger value="decision">Decision</TabsTrigger></> : <TabsTrigger value="regression">Actual vs Pred</TabsTrigger>}</TabsList>{results.k_plot && <TabsContent value="kselection" className="mt-4"><Image src={`data:image/png;base64,${results.k_plot}`} alt="K Selection" width={700} height={400} className="w-full rounded-md border" /></TabsContent>}<TabsContent value="importance" className="mt-4">{results.importance_plot ? <Image src={`data:image/png;base64,${results.importance_plot}`} alt="Importance" width={700} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>{results.task_type === 'classification' ? (<><TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="roc" className="mt-4">{results.roc_plot ? <Image src={`data:image/png;base64,${results.roc_plot}`} alt="ROC" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="decision" className="mt-4">{results.decision_plot ? <Image src={`data:image/png;base64,${results.decision_plot}`} alt="Decision" width={700} height={600} className="w-full rounded-md border" /> : <p className="text-center py-8">2D visualization only</p>}</TabsContent></>) : (<TabsContent value="regression" className="mt-4">{results.regression_plot ? <Image src={`data:image/png;base64,${results.regression_plot}`} alt="Regression" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>)}</Tabs></CardContent></Card>

                            {results.k_search_result && (<Card><CardHeader><CardTitle>K Selection via Cross-Validation</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>K</TableHead><TableHead className="text-right">CV Score</TableHead><TableHead className="text-right">Std</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{results.k_search_result.k_scores.map((s, i) => (<TableRow key={i} className={s.k === results.k_search_result!.optimal_k ? 'bg-green-50 dark:bg-green-950/20' : ''}><TableCell className="font-mono">{s.k}</TableCell><TableCell className="text-right font-mono">{(s.mean_score * 100).toFixed(2)}%</TableCell><TableCell className="text-right font-mono text-muted-foreground">±{(s.std_score * 100).toFixed(2)}%</TableCell><TableCell>{s.k === results.k_search_result!.optimal_k ? <Badge className="bg-green-600">Optimal</Badge> : null}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Feature Importance</CardTitle><CardDescription>Permutation importance scores</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="text-right">Std</TableHead></TableRow></TableHeader><TableBody>{results.feature_importance.slice(0, 15).map((f, i) => (<TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{f.feature}</TableCell><TableCell className="text-right font-mono">{f.importance.toFixed(4)}</TableCell><TableCell className="text-right font-mono text-muted-foreground">{f.std.toFixed(4)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.task_type === 'classification' && results.per_class_metrics && (<Card><CardHeader><CardTitle>Per-Class Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader><TableBody>{results.per_class_metrics.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.class}</TableCell><TableCell className="text-right font-mono">{(c.precision * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.recall * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.f1_score * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{c.support}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-semibold">{String(v)}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Cross-Validation Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>CV Mean</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Average across {results.cv_results.cv_folds} folds</TableCell></TableRow><TableRow><TableCell>CV Std</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">{results.cv_results.cv_std < 0.03 ? 'Very stable' : results.cv_results.cv_std < 0.05 ? 'Stable' : 'Some variance'}</TableCell></TableRow><TableRow><TableCell>Folds</TableCell><TableCell className="text-right font-mono">{results.cv_results.cv_folds}</TableCell><TableCell className="text-muted-foreground">Number of CV iterations</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Training KNN model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
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