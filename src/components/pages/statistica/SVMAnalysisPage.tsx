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
import { Loader2, HelpCircle, Circle, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, BarChart3, Layers, SeparatorHorizontal, TrendingUp, Activity, Hash, Info, Shield, FileType, FileCode, Code, Copy } from 'lucide-react';
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
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/svm.py?alt=media";

// Statistical terms definitions for SVM
const metricDefinitions: Record<string, string> = {
    accuracy: "The proportion of correct predictions among the total number of cases examined. Ranges from 0 to 1, where 1 means perfect prediction.",
    precision: "The proportion of positive identifications that were actually correct. High precision means low false positive rate.",
    recall: "The proportion of actual positives that were identified correctly. Also known as sensitivity or true positive rate.",
    f1_score: "The harmonic mean of precision and recall. Useful when you need a balance between precision and recall.",
    r2: "R-squared (coefficient of determination): The proportion of variance in the dependent variable predictable from the independent variables.",
    rmse: "Root Mean Squared Error: The square root of the average of squared differences between predicted and actual values. Lower is better.",
    mae: "Mean Absolute Error: The average of absolute differences between predicted and actual values. Lower is better.",
    auc: "Area Under the ROC Curve: Measures the ability of the model to distinguish between classes. Ranges from 0.5 (random) to 1 (perfect).",
    support_vectors: "Data points that lie closest to the decision boundary and define the hyperplane. These are the critical elements of the SVM model.",
    kernel: "A function that transforms the input data into a higher-dimensional space where a linear separator can be found. Common kernels: linear, RBF, polynomial.",
    rbf_kernel: "Radial Basis Function kernel: A popular kernel that can handle non-linear relationships. Creates smooth, circular decision boundaries.",
    linear_kernel: "Creates a straight-line (or hyperplane) decision boundary. Best for linearly separable data.",
    polynomial_kernel: "Creates polynomial decision boundaries. The degree parameter controls the flexibility.",
    C_parameter: "Regularization parameter: Controls the trade-off between achieving a low training error and a low testing error (generalization). Higher C = less regularization.",
    gamma: "Kernel coefficient for RBF, polynomial, and sigmoid kernels. Higher gamma = more complex decision boundary, risk of overfitting.",
    margin: "The distance between the decision boundary and the nearest data points (support vectors). SVM maximizes this margin.",
    hyperplane: "The decision boundary that separates different classes. In 2D it's a line, in 3D it's a plane, in higher dimensions it's a hyperplane.",
    cv_score: "Cross-Validation Score: The average performance metric across multiple train/test splits, providing a more robust estimate.",
    cv_std: "Cross-Validation Standard Deviation: The variation in CV scores across folds. Lower values indicate more stable performance.",
    support: "The number of samples of the true class that belong to a specific class in classification tasks."
};

interface FeatureImportance { feature: string; importance: number; std: number; }
interface ClassMetrics { class: string; precision: number; recall: number; f1_score: number; support: number; }
interface SupportPerClass { class: string; n_support_vectors: number; }
interface CVResults { cv_scores: number[]; cv_mean: number; cv_std: number; cv_folds: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { task_type: string; n_samples: number; n_features: number; n_train: number; n_test: number; parameters: Record<string, any>; metrics: Record<string, number>; feature_importance: FeatureImportance[]; cv_results: CVResults; importance_plot: string | null; cm_plot?: string | null; roc_plot?: string | null; sv_plot?: string | null; decision_plot?: string | null; regression_plot?: string | null; per_class_metrics?: ClassMetrics[]; confusion_matrix?: number[][]; class_labels?: string[]; support_per_class?: SupportPerClass[]; interpretation: Interpretation; }

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
        link.download = 'svm_analysis.py';
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
                        Python Code - SVM Analysis
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
                        SVM Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical measures and parameters used in Support Vector Machine analysis
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
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Support Vectors</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.n_support_vectors}</p><p className="text-xs text-muted-foreground">Boundary points</p></div></CardContent></Card>
                </>
            ) : (
                <>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RMSE</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.rmse?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Root mean squared error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">MAE</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.mae?.toFixed(4)}</p><p className="text-xs text-muted-foreground">Mean absolute error</p></div></CardContent></Card>
                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Support Vectors</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.n_support_vectors}</p><p className="text-xs text-muted-foreground">Boundary points</p></div></CardContent></Card>
                </>
            )}
        </div>
    );
};

const SVMGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">SVM Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is SVM */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <SeparatorHorizontal className="w-4 h-4" />
                What is Support Vector Machine?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Support Vector Machine (SVM) is a powerful supervised learning algorithm that finds the 
                <strong> optimal hyperplane</strong> to separate classes. It maximizes the <strong>margin</strong> — 
                the distance between the decision boundary and the nearest data points (support vectors).
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Concepts:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • <strong>Hyperplane:</strong> Decision boundary separating classes<br/>
                    • <strong>Margin:</strong> Distance from hyperplane to nearest points<br/>
                    • <strong>Support Vectors:</strong> Critical points that define the boundary<br/>
                    • <strong>Kernel Trick:</strong> Maps data to higher dimensions for non-linear separation
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Kernels */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Understanding Kernels
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Linear Kernel</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creates a straight line (or hyperplane) decision boundary.
                    <br/>• Best for <strong>linearly separable</strong> data
                    <br/>• Fast training and prediction
                    <br/>• Feature coefficients are interpretable
                    <br/>• Use when: High-dimensional data, text classification
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">RBF (Gaussian) Kernel</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creates smooth, non-linear decision boundaries.
                    <br/>• Most popular kernel for general use
                    <br/>• Handles <strong>non-linear relationships</strong>
                    <br/>• Controlled by gamma parameter
                    <br/>• Use when: Complex patterns, unknown data structure
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Polynomial Kernel</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creates polynomial decision boundaries.
                    <br/>• Degree controls complexity
                    <br/>• Good for image classification
                    <br/>• Can be computationally expensive
                    <br/>• Use when: Feature interactions are important
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Sigmoid Kernel</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Similar to neural network activation.
                    <br/>• Less commonly used
                    <br/>• Can behave like linear or RBF depending on params
                    <br/>• Use when: Neural network-like behavior desired
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Quick Guide:</strong> Start with RBF kernel (default). If data is high-dimensional 
                  or text-based, try Linear. Only use Polynomial if you have domain knowledge suggesting it.
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
                  <p className="font-medium text-sm text-primary">C (Regularization Parameter)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls the trade-off between margin width and classification errors.
                    <br/><strong>Low C (0.01-0.1):</strong> Wide margin, more misclassifications allowed
                    <br/><strong>Medium C (1-10):</strong> Balanced (recommended start)
                    <br/><strong>High C (100+):</strong> Narrow margin, fewer errors, risk of overfitting
                    <br/>• Higher C = more complex boundary
                    <br/>• If overfitting, decrease C
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Gamma (RBF/Poly/Sigmoid)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Defines how far the influence of a single training example reaches.
                    <br/><strong>'scale' (1/(n·var)):</strong> Default, adapts to data (recommended)
                    <br/><strong>'auto' (1/n):</strong> Simpler scaling
                    <br/><strong>Low gamma:</strong> Smooth boundary, underfitting risk
                    <br/><strong>High gamma:</strong> Complex boundary, overfitting risk
                    <br/>• High gamma = each point has limited influence
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Degree (Polynomial Kernel Only)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Degree of the polynomial.
                    <br/><strong>2:</strong> Quadratic boundaries
                    <br/><strong>3:</strong> Cubic boundaries (default)
                    <br/><strong>4+:</strong> Very complex (usually overfits)
                    <br/>• Higher degree = more flexible but slower
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Support Vectors */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Understanding Support Vectors
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Support vectors</strong> are the data points closest to the decision boundary. 
                  They "support" the hyperplane — only these points matter for the model.
                </p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• <strong>Few SVs (&lt;30% of data):</strong> Clear class separation, efficient model</li>
                  <li>• <strong>Many SVs (&gt;50% of data):</strong> Complex boundary, possible overfitting</li>
                  <li>• Removing non-support vectors doesn't change the model</li>
                  <li>• More SVs = slower prediction (especially RBF)</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary">
                    <strong>Insight:</strong> If you have too many support vectors, try increasing C 
                    or using a simpler kernel. This can improve both generalization and speed.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Feature Scaling */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Important: Feature Scaling
              </h3>
              <div className="p-4 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                <p className="text-sm text-rose-700 dark:text-rose-400 mb-2">
                  <strong>SVM requires scaled features!</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  SVM is sensitive to feature scales. Without scaling:
                  <br/>• Features with larger ranges dominate
                  <br/>• Distance calculations are skewed
                  <br/>• Model performance degrades significantly
                  <br/><br/>
                  <strong>Always use StandardScaler</strong> (mean=0, std=1) before training.
                  This tool applies scaling automatically when enabled.
                </p>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Decision Boundary Plot</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows how SVM separates classes in 2D space.
                    <br/>• Colored regions = predicted class
                    <br/>• Support vectors often highlighted
                    <br/>• Only shows first 2 features (projection)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Feature Importance (Permutation)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    SVM doesn't have built-in feature importance.
                    <br/>• Uses <strong>permutation importance</strong>
                    <br/>• Measures performance drop when feature is shuffled
                    <br/>• Higher = more important
                    <br/>• For linear kernel, coefficients are interpretable
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Support Vector Ratio</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Percentage of training data that are support vectors.
                    <br/>• <strong>&lt;20%:</strong> Good — clear separation
                    <br/>• <strong>20-40%:</strong> Acceptable — moderate complexity
                    <br/>• <strong>&gt;50%:</strong> Warning — may need tuning
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tuning Strategy */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Tuning Strategy
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                    Start with defaults
                  </p>
                  <p className="text-xs text-muted-foreground">
                    RBF kernel, C=1.0, gamma='scale'
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                    If underfitting
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Increase C, increase gamma (for RBF), or try polynomial kernel
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                    If overfitting
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Decrease C, decrease gamma, or try linear kernel
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">4</span>
                    Grid search
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try C: [0.1, 1, 10, 100] × gamma: ['scale', 0.1, 0.01, 0.001]
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
                  <p className="font-medium text-sm text-primary mb-1">When to Use SVM</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Clear margin between classes</li>
                    <li>• High-dimensional data (text, images)</li>
                    <li>• Medium-sized datasets (&lt;10K)</li>
                    <li>• Binary or small multiclass</li>
                    <li>• Need robust decision boundary</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use SVM</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Very large datasets (&gt;100K) — too slow</li>
                    <li>• Need probability estimates (calibration needed)</li>
                    <li>• Noisy data with overlapping classes</li>
                    <li>• Need interpretable model (use linear)</li>
                    <li>• Real-time prediction (RBF is slow)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Do</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Always scale features</li>
                    <li>• Start with RBF kernel</li>
                    <li>• Use cross-validation</li>
                    <li>• Monitor support vector count</li>
                    <li>• Try linear for high dimensions</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Skip feature scaling</li>
                    <li>• Use very high C without reason</li>
                    <li>• Ignore support vector ratio</li>
                    <li>• Use polynomial degree &gt; 4</li>
                    <li>• Expect fast training on large data</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> SVM excels at finding optimal decision 
                boundaries with clear margins. Feature scaling is mandatory. Start with RBF kernel and 
                default parameters, then tune C and gamma based on validation performance. Monitor the 
                support vector ratio — too many SVs indicates overfitting or noisy data. For large 
                datasets or when speed matters, consider Random Forest or Gradient Boosting instead.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><SeparatorHorizontal className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Support Vector Machine</CardTitle>
                    <CardDescription className="text-base mt-2">Maximum margin classifier with kernel methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Layers className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Kernel Trick</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Non-linear boundaries</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Maximum Margin</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Optimal hyperplane</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Circle className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Support Vectors</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Key boundary points</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use SVM</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use SVM for classification tasks with clear margins between classes. Excellent for high-dimensional data and when you need robust decision boundaries.</p>
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
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Decision boundary:</strong> Optimal hyperplane</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Support vectors:</strong> Key data points</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Metrics:</strong> Accuracy, F1, R², etc.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><SeparatorHorizontal className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface SVMPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function SVMAnalysisPage({ data, allHeaders, onLoadExample }: SVMPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [taskType, setTaskType] = useState('auto');
    const [kernel, setKernel] = useState('rbf');
    const [C, setC] = useState(1.0);
    const [gamma, setGamma] = useState('scale');
    const [degree, setDegree] = useState(3);
    const [testSize, setTestSize] = useState(0.2);
    const [scaleFeatures, setScaleFeatures] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  


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
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `SVM_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `SVM ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nTask Type,${analysisResult.task_type}\nKernel,${analysisResult.parameters.kernel}\nC,${analysisResult.parameters.C}\nSupport Vectors,${analysisResult.metrics.n_support_vectors}\n\nMETRICS\n`;
        csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nFEATURE IMPORTANCE\n` + Papa.unparse(analysisResult.feature_importance);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `SVM_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/svm-docx', {
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
            link.download = `SVM_Report_${new Date().toISOString().split('T')[0]}.docx`;
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
            const res = await fetch(`${FASTAPI_URL}/api/analysis/svm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, task_type: taskType, test_size: testSize, kernel, C, gamma, degree, scale_features: scaleFeatures }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            const mainMetric = result.task_type === 'classification' ? `Acc: ${(result.metrics.accuracy * 100).toFixed(1)}%` : `R²: ${result.metrics.r2?.toFixed(3)}`;
            toast({ title: 'Training Complete', description: `${mainMetric}, ${result.metrics.n_support_vectors} SVs` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, taskType, testSize, kernel, C, gamma, degree, scaleFeatures, toast]);

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
            <SVMGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">SVM Analysis</h1>
                    <p className="text-muted-foreground mt-1">Support Vector Machine</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>SVM Parameters</CardTitle><CardDescription>Configure kernel and regularization</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label>Kernel</Label><Select value={kernel} onValueChange={setKernel}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="linear">Linear</SelectItem><SelectItem value="rbf">RBF (Gaussian)</SelectItem><SelectItem value="poly">Polynomial</SelectItem><SelectItem value="sigmoid">Sigmoid</SelectItem></SelectContent></Select></div>
                                <div className="space-y-3"><Label>Gamma</Label><Select value={gamma} onValueChange={setGamma}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scale">Scale (1/n·var)</SelectItem><SelectItem value="auto">Auto (1/n)</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><div className="flex justify-between"><Label>C (Regularization)</Label><Badge variant="outline">{C}</Badge></div><Slider value={[C]} onValueChange={(v) => setC(v[0])} min={0.01} max={100} step={0.1} /><p className="text-xs text-muted-foreground">Higher C = less regularization</p></div>
                                {kernel === 'poly' && <div className="space-y-3"><div className="flex justify-between"><Label>Polynomial Degree</Label><Badge variant="outline">{degree}</Badge></div><Slider value={[degree]} onValueChange={(v) => setDegree(v[0])} min={2} max={5} step={1} /></div>}
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><div className="flex justify-between"><Label>Test Size</Label><Badge variant="outline">{(testSize * 100).toFixed(0)}%</Badge></div><Slider value={[testSize]} onValueChange={(v) => setTestSize(v[0])} min={0.1} max={0.4} step={0.05} /></div>
                                <div className="space-y-3 flex items-center pt-6"><Checkbox id="scale" checked={scaleFeatures} onCheckedChange={(c) => setScaleFeatures(!!c)} /><label htmlFor="scale" className="text-sm cursor-pointer ml-2">Scale features (StandardScaler)</label></div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span><strong>Linear:</strong> Fast, interpretable. <strong>RBF:</strong> Flexible, handles non-linearity. <strong>Poly:</strong> Good for image data.</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">SVM Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Kernel:</span> {kernel}</div><div><span className="text-muted-foreground">C:</span> {C}</div><div><span className="text-muted-foreground">Gamma:</span> {gamma}</div><div><span className="text-muted-foreground">Scaled:</span> {scaleFeatures ? 'Yes' : 'No'}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><SeparatorHorizontal className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">SVM will find the optimal hyperplane with maximum margin using {kernel} kernel.</p></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>SVM {results.parameters.kernel} kernel</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Model achieved <strong>{isClassification ? `${(mainMetric * 100).toFixed(1)}% accuracy` : `R² of ${mainMetric?.toFixed(3)}`}</strong> on test data ({results.n_test} samples).</p>
                                        <p className="text-sm">• Found <strong>{results.metrics.n_support_vectors} support vectors</strong> ({((results.metrics.n_support_vectors / results.n_train) * 100).toFixed(1)}% of training data).</p>
                                        <p className="text-sm">• Cross-validation: <strong>{(results.cv_results.cv_mean * 100).toFixed(1)}%</strong> ± {(results.cv_results.cv_std * 100).toFixed(1)}% ({results.cv_results.cv_folds}-fold).</p>
                                        {topFeature && <p className="text-sm">• Most important feature: <strong>{topFeature.feature}</strong> (importance: {topFeature.importance.toFixed(3)}).</p>}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Classification Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The SVM found a good decision boundary. Support vectors indicate clear class separation." : "Consider tuning C/gamma, trying different kernels, or adding more features."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• {mainMetricLabel}: {isClassification ? `${(mainMetric * 100).toFixed(1)}%` : mainMetric?.toFixed(3)} — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• Support vector ratio: {((results.metrics.n_support_vectors / results.n_train) * 100).toFixed(1)}% — {(results.metrics.n_support_vectors / results.n_train) < 0.3 ? 'efficient model' : 'complex boundary'}</p><p>• CV stability: {results.cv_results.cv_std < 0.05 ? 'low variance, consistent' : 'some variance across folds'}</p></div></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding SVM performance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How SVM Works</h4><p className="text-sm text-muted-foreground">SVM finds the optimal hyperplane that maximizes the margin between classes. With {results.parameters.kernel} kernel, it {results.parameters.kernel === 'linear' ? 'creates a linear decision boundary' : 'maps data to a higher-dimensional space for non-linear separation'}.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Support Vectors</h4><p className="text-sm text-muted-foreground">{results.metrics.n_support_vectors} support vectors define the decision boundary. {(results.metrics.n_support_vectors / results.n_train) < 0.3 ? 'This low ratio indicates clear class separation and an efficient model.' : 'A higher ratio suggests complex boundaries — consider simplifying with different kernel or C.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Regularization (C = {results.parameters.C})</h4><p className="text-sm text-muted-foreground">{results.parameters.C > 10 ? 'High C prioritizes correct classification of training points, risking overfitting.' : results.parameters.C < 0.1 ? 'Low C allows more margin violations for better generalization.' : 'Moderate C balances margin width and classification accuracy.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `This SVM model is ready for production. Expected ${isClassification ? 'accuracy' : 'R²'} on new data: ~${(mainMetric * 100).toFixed(0)}%.` : `Consider: (1) grid search for C/gamma, (2) trying different kernels, (3) feature engineering.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Strong Model</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Room for Improvement</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your SVM achieves ${(mainMetric * 100).toFixed(1)}% ${isClassification ? 'accuracy' : 'R²'} with ${results.parameters.kernel} kernel, indicating effective class separation.` : `Current ${isClassification ? 'accuracy' : 'R²'} of ${(mainMetric * 100).toFixed(1)}% suggests the model could benefit from hyperparameter tuning.`}</p></div>
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
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">SVM Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.task_type} | {results.parameters.kernel} kernel | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
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
                                                A Support Vector Machine with {results.parameters.kernel} kernel was trained to predict <em>{targetCol}</em> using {results.n_features} features.
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
                                                The model identified <span className="font-mono">{results.metrics.n_support_vectors}</span> support vectors 
                                                ({((results.metrics.n_support_vectors / results.n_train) * 100).toFixed(1)}% of training samples), 
                                                indicating {(results.metrics.n_support_vectors / results.n_train) < 0.3 ? 'clear class separation' : 'a complex decision boundary'}.
                                                {' '}{results.cv_results.cv_folds}-fold cross-validation yielded a mean score of <span className="font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</span> (SD = <span className="font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</span>), 
                                                indicating {results.cv_results.cv_std < 0.03 ? 'excellent' : results.cv_results.cv_std < 0.05 ? 'good' : 'moderate'} model stability.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="importance" className="w-full"><TabsList className={`grid w-full ${results.task_type === 'classification' ? 'grid-cols-5' : 'grid-cols-2'}`}><TabsTrigger value="importance">Importance</TabsTrigger>{results.task_type === 'classification' ? <><TabsTrigger value="confusion">Confusion</TabsTrigger><TabsTrigger value="roc">ROC</TabsTrigger><TabsTrigger value="sv">Support Vectors</TabsTrigger><TabsTrigger value="decision">Decision</TabsTrigger></> : <TabsTrigger value="regression">Actual vs Pred</TabsTrigger>}</TabsList><TabsContent value="importance" className="mt-4">{results.importance_plot ? <Image src={`data:image/png;base64,${results.importance_plot}`} alt="Importance" width={700} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>{results.task_type === 'classification' ? (<><TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="roc" className="mt-4">{results.roc_plot ? <Image src={`data:image/png;base64,${results.roc_plot}`} alt="ROC" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="sv" className="mt-4">{results.sv_plot ? <Image src={`data:image/png;base64,${results.sv_plot}`} alt="Support Vectors" width={600} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="decision" className="mt-4">{results.decision_plot ? <Image src={`data:image/png;base64,${results.decision_plot}`} alt="Decision" width={700} height={600} className="w-full rounded-md border" /> : <p className="text-center py-8">Only 2D visualization available</p>}</TabsContent></>) : (<TabsContent value="regression" className="mt-4">{results.regression_plot ? <Image src={`data:image/png;base64,${results.regression_plot}`} alt="Regression" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>)}</Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Feature Importance</CardTitle><CardDescription>Permutation importance scores</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="text-right">Std</TableHead></TableRow></TableHeader><TableBody>{results.feature_importance.slice(0, 15).map((f, i) => (<TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{f.feature}</TableCell><TableCell className="text-right font-mono">{f.importance.toFixed(4)}</TableCell><TableCell className="text-right font-mono text-muted-foreground">{f.std.toFixed(4)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.task_type === 'classification' && results.per_class_metrics && (<Card><CardHeader><CardTitle>Per-Class Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader><TableBody>{results.per_class_metrics.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.class}</TableCell><TableCell className="text-right font-mono">{(c.precision * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.recall * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.f1_score * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{c.support}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            {results.task_type === 'classification' && results.support_per_class && (<Card><CardHeader><CardTitle>Support Vectors per Class</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-4">{results.support_per_class.map((s, i) => (<div key={i} className="p-4 bg-muted/50 rounded-lg text-center"><p className="text-xs text-muted-foreground">Class {s.class}</p><p className="text-2xl font-bold">{s.n_support_vectors}</p><p className="text-xs text-muted-foreground">SVs</p></div>))}</div></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-semibold">{String(v)}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Cross-Validation Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>CV Mean</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Average across {results.cv_results.cv_folds} folds</TableCell></TableRow><TableRow><TableCell>CV Std</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">{results.cv_results.cv_std < 0.03 ? 'Very stable' : results.cv_results.cv_std < 0.05 ? 'Stable' : 'Some variance'}</TableCell></TableRow><TableRow><TableCell>Folds</TableCell><TableCell className="text-right font-mono">{results.cv_results.cv_folds}</TableCell><TableCell className="text-muted-foreground">Number of CV iterations</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Training SVM model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
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
