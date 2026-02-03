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
import { Loader2, HelpCircle, TreeDeciduous, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, Gauge, Activity, Info, Shield, FileType, FileCode, Hash, GitBranch, Code, Copy } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/decision_tree.py?alt=media";

// Statistical terms definitions for Decision Tree
const metricDefinitions: Record<string, string> = {
    accuracy: "The proportion of correct predictions among the total number of cases examined. Ranges from 0 to 1, where 1 means perfect prediction.",
    precision: "The proportion of positive identifications that were actually correct. High precision means low false positive rate.",
    recall: "The proportion of actual positives that were identified correctly. Also known as sensitivity or true positive rate.",
    f1_score: "The harmonic mean of precision and recall. Useful when you need a balance between precision and recall.",
    r2: "R-squared (coefficient of determination): The proportion of variance in the dependent variable predictable from the independent variables. Ranges from 0 to 1.",
    rmse: "Root Mean Squared Error: The square root of the average of squared differences between predicted and actual values. Lower is better.",
    mae: "Mean Absolute Error: The average of absolute differences between predicted and actual values. Lower is better.",
    auc: "Area Under the ROC Curve: Measures the ability of the model to distinguish between classes. Ranges from 0.5 (random) to 1 (perfect).",
    gini: "Gini Impurity: A measure of how often a randomly chosen element would be incorrectly labeled. Used as a splitting criterion.",
    entropy: "Information Entropy: A measure of uncertainty or randomness in the data. Used as a splitting criterion in decision trees.",
    max_depth: "The maximum depth of the tree. Limiting depth helps prevent overfitting.",
    min_samples_split: "The minimum number of samples required to split an internal node. Higher values prevent overfitting.",
    min_samples_leaf: "The minimum number of samples required to be at a leaf node. Higher values create simpler models.",
    cv_score: "Cross-Validation Score: The average performance metric across multiple train/test splits, providing a more robust estimate.",
    cv_std: "Cross-Validation Standard Deviation: The variation in CV scores across folds. Lower values indicate more stable performance.",
    feature_importance: "A score indicating how useful each feature is in the construction of the decision tree. Higher values mean more important.",
    n_nodes: "The total number of nodes (decision points and leaves) in the tree.",
    n_leaves: "The number of leaf nodes (final decision nodes) in the tree.",
    support: "The number of samples of the true class that lie in a specific leaf or belong to a specific class."
};

interface FeatureImportance { feature: string; importance: number; }
interface ClassMetrics { class: string; precision: number; recall: number; f1_score: number; support: number; }
interface CVResults { cv_scores: number[]; cv_mean: number; cv_std: number; cv_folds: number; }
interface TreeStats { n_nodes: number; max_depth_actual: number; n_leaves: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { task_type: string; n_samples: number; n_features: number; n_train: number; n_test: number; parameters: Record<string, any>; metrics: Record<string, number>; feature_importance: FeatureImportance[]; cv_results: CVResults; tree_stats?: TreeStats; importance_plot: string | null; tree_plot: string | null; cm_plot?: string | null; roc_plot?: string | null; regression_plot?: string | null; per_class_metrics?: ClassMetrics[]; confusion_matrix?: number[][]; class_labels?: string[]; interpretation: Interpretation; }

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
        link.download = 'decision_tree.py';
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
                        Python Code - Decision Tree Analysis
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
                        Decision Tree Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical measures and parameters used in Decision Tree analysis
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

const DecisionTreeGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Decision Tree Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Decision Tree */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TreeDeciduous className="w-4 h-4" />
                What is a Decision Tree?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                A Decision Tree is a <strong>flowchart-like model</strong> that makes predictions by learning 
                simple if-then decision rules from data. It recursively splits data based on feature values 
                to create homogeneous groups. The result is highly <strong>interpretable</strong> — you can 
                trace exactly why any prediction was made.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>How it works:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Start with all data at the root<br/>
                    2. Find the best feature and threshold to split<br/>
                    3. Create child nodes for each split<br/>
                    4. Repeat until stopping criteria met<br/>
                    5. Make predictions based on majority class (or mean) at leaf nodes
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Classification vs Regression */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Classification vs Regression Trees
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Classification</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Predicts <strong>categories/classes</strong></li>
                    <li>• Uses Gini impurity or Entropy</li>
                    <li>• Leaf = majority class vote</li>
                    <li>• Metrics: Accuracy, F1, Precision, Recall</li>
                    <li>• Example: Spam vs Not Spam</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Regression</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Predicts <strong>continuous values</strong></li>
                    <li>• Uses Mean Squared Error</li>
                    <li>• Leaf = mean of training samples</li>
                    <li>• Metrics: R², RMSE, MAE</li>
                    <li>• Example: House prices</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Parameters */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Key Parameters (Hyperparameters)
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">max_depth (Most Important!)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum depth of the tree.
                    <br/><strong>None:</strong> Tree grows until leaves are pure (risk of overfitting)
                    <br/><strong>3-5:</strong> Simple, interpretable tree
                    <br/><strong>5-10:</strong> Good balance
                    <br/><strong>10+:</strong> Complex, may overfit
                    <br/>• Start with 5 and adjust based on performance
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">min_samples_split</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum samples required to split a node.
                    <br/><strong>2:</strong> Default, allows very small splits
                    <br/><strong>5-10:</strong> Prevents tiny splits, reduces overfitting
                    <br/><strong>20+:</strong> Very conservative, simpler trees
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">min_samples_leaf</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum samples required at each leaf node.
                    <br/><strong>1:</strong> Default, allows single-sample leaves
                    <br/><strong>5-10:</strong> More robust predictions
                    <br/>• Higher values = smoother decision boundaries
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">criterion</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measure of split quality.
                    <br/><strong>Gini:</strong> Faster, works well in most cases
                    <br/><strong>Entropy:</strong> Slightly more balanced splits, slower
                    <br/>• Usually makes little difference in practice
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">splitter</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Strategy to choose the split.
                    <br/><strong>Best:</strong> Choose the best split (default)
                    <br/><strong>Random:</strong> Choose the best random split (faster, adds randomness)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Overfitting */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Avoiding Overfitting
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Warning Signs of Overfitting:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Training accuracy much higher than test accuracy</li>
                    <li>• Very deep tree with many leaves</li>
                    <li>• High CV standard deviation</li>
                    <li>• Tree memorizes training data instead of learning patterns</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">How to Prevent Overfitting:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Limit max_depth</strong> — most effective</li>
                    <li>• <strong>Increase min_samples_split</strong> — prevents small splits</li>
                    <li>• <strong>Increase min_samples_leaf</strong> — ensures robust leaves</li>
                    <li>• <strong>Pruning:</strong> Remove branches that don't improve validation</li>
                    <li>• <strong>Use ensemble methods</strong> (Random Forest, Gradient Boosting)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Check the Gap:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Train-Test gap should be small.
                    <br/><strong>&lt;5%:</strong> Good generalization
                    <br/><strong>5-10%:</strong> Acceptable, monitor carefully
                    <br/><strong>&gt;10%:</strong> Likely overfitting, adjust parameters
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
                  <p className="font-medium text-sm">Tree Visualization</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Read from top (root) to bottom (leaves).
                    <br/>• Each node shows: feature, threshold, samples, class distribution
                    <br/>• Left branch = condition is True
                    <br/>• Right branch = condition is False
                    <br/>• Darker colors = higher purity
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Feature Importance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how much each feature reduces impurity.
                    <br/>• Higher = more important for predictions
                    <br/>• Features near root are most important
                    <br/>• Features with 0 importance were never used
                    <br/>• Use for feature selection in other models
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Tree Statistics</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Nodes:</strong> Total decision points + leaves
                    <br/><strong>Leaves:</strong> Final prediction nodes
                    <br/><strong>Depth:</strong> Longest path from root to leaf
                    <br/>• Simpler trees (fewer nodes) are often better
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cross-Validation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>CV Mean:</strong> Expected real-world performance
                    <br/><strong>CV Std &lt;3%:</strong> Very stable model
                    <br/><strong>CV Std 3-5%:</strong> Reasonably stable
                    <br/><strong>CV Std &gt;5%:</strong> Performance varies significantly
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
                  <p className="font-medium text-sm text-primary mb-1">When to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Need <strong>interpretability</strong></li>
                    <li>• Want to <strong>explain predictions</strong></li>
                    <li>• Data has <strong>non-linear patterns</strong></li>
                    <li>• Mixed feature types (numeric + categorical)</li>
                    <li>• Quick baseline model</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Limitations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Can <strong>overfit</strong> easily</li>
                    <li>• <strong>Unstable</strong> — small data changes can change tree</li>
                    <li>• <strong>Axis-aligned splits</strong> only (can't capture diagonal patterns)</li>
                    <li>• Often <strong>outperformed by ensembles</strong></li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Parameter Tuning</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with max_depth=5</li>
                    <li>• Increase if underfitting (low train score)</li>
                    <li>• Decrease if overfitting (big train-test gap)</li>
                    <li>• Use cross-validation to compare</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Next Steps</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• If tree overfits → try Random Forest</li>
                    <li>• If need better accuracy → try Gradient Boosting</li>
                    <li>• Use feature importance for feature engineering</li>
                    <li>• Extract rules for business documentation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Decision Trees are excellent for 
                interpretability but prone to overfitting. Always check the train-test gap and CV scores. 
                A simpler tree that generalizes well is better than a complex tree that memorizes training data. 
                Consider Random Forest or Gradient Boosting if you need better predictive performance.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><TreeDeciduous className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Decision Tree Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Interpretable tree-based model for classification and regression</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><GitBranch className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Simple Rules</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">If-then decision rules</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Interpretable</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Easy to understand & explain</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Gauge className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Fast Training</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">No feature scaling needed</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use Decision Trees</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Decision Trees when you need interpretable models with clear decision rules. Great for understanding feature interactions and explaining predictions to stakeholders.</p>
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
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Tree visualization:</strong> Decision rules</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Metrics:</strong> Accuracy, F1, R², etc.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><TreeDeciduous className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface DecisionTreePageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function DecisionTreeAnalysisPage({ data, allHeaders, onLoadExample }: DecisionTreePageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [taskType, setTaskType] = useState('auto');
    const [maxDepth, setMaxDepth] = useState<number | null>(null);
    const [minSamplesSplit, setMinSamplesSplit] = useState(2);
    const [minSamplesLeaf, setMinSamplesLeaf] = useState(1);
    const [criterion, setCriterion] = useState('gini');
    const [splitter, setSplitter] = useState('best');
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
    }, [targetCol, availableFeatures, featureCols.length]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `DecisionTree_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

const handleDownloadCSV = useCallback(() => {
    if (!analysisResult) return;
    let csv = `DECISION TREE ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nTask Type,${analysisResult.task_type}\nN Samples,${analysisResult.n_samples}\nN Features,${analysisResult.n_features}\n`;
    
    if (analysisResult.tree_stats) {
        csv += `\nTREE STATS\nNodes,${analysisResult.tree_stats.n_nodes}\nLeaves,${analysisResult.tree_stats.n_leaves}\nMax Depth,${analysisResult.tree_stats.max_depth_actual}\n`;
    }
    
    csv += `\nMETRICS\n`;
    csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
    csv += `\n\nFEATURE IMPORTANCE\n` + Papa.unparse(analysisResult.feature_importance);
    csv += `\n\nCV RESULTS\nMean,${analysisResult.cv_results.cv_mean}\nStd,${analysisResult.cv_results.cv_std}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DecisionTree_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "CSV Downloaded" });
}, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/decision-tree-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult, targetCol, featureCols, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `DecisionTree_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetCol, featureCols, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetCol || featureCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select target and features.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/decision-tree`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, task_type: taskType, test_size: testSize, max_depth: maxDepth, min_samples_split: minSamplesSplit, min_samples_leaf: minSamplesLeaf, criterion, splitter }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            const mainMetric = result.task_type === 'classification' ? `Acc: ${(result.metrics.accuracy * 100).toFixed(1)}%` : `R²: ${result.metrics.r2?.toFixed(3)}`;
            toast({ title: 'Training Complete', description: mainMetric });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, taskType, testSize, maxDepth, minSamplesSplit, minSamplesLeaf, criterion, splitter, toast]);

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
            <DecisionTreeGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Decision Tree Analysis</h1>
                    <p className="text-muted-foreground mt-1">Interpretable tree-based prediction</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Decision Tree Parameters</CardTitle><CardDescription>Configure hyperparameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm">max_depth</Label>
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="limit-depth" checked={maxDepth !== null} onCheckedChange={(c) => setMaxDepth(c ? 5 : null)} />
                                        <label htmlFor="limit-depth" className="text-sm">Limit depth</label>
                                        {maxDepth !== null && (<div className="flex-1 ml-4"><Slider value={[maxDepth]} onValueChange={(v) => setMaxDepth(v[0])} min={1} max={20} step={1} /></div>)}
                                        <Badge variant="outline">{maxDepth ?? 'None'}</Badge>
                                    </div>
                                </div>
                                <ParamSlider label="min_samples_split" value={minSamplesSplit} onChange={setMinSamplesSplit} min={2} max={20} step={1} />
                                <ParamSlider label="min_samples_leaf" value={minSamplesLeaf} onChange={setMinSamplesLeaf} min={1} max={20} step={1} />
                                <ParamSlider label="test_size" value={testSize} onChange={setTestSize} min={0.1} max={0.4} step={0.05} unit="%" />
                                <div className="space-y-3"><Label>Criterion</Label><Select value={criterion} onValueChange={setCriterion}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gini">Gini Impurity</SelectItem><SelectItem value="entropy">Entropy</SelectItem></SelectContent></Select></div>
                                <div className="space-y-3"><Label>Splitter</Label><Select value={splitter} onValueChange={setSplitter}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="best">Best</SelectItem><SelectItem value="random">Random</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Limiting max_depth prevents overfitting. Higher min_samples_split/leaf values create simpler trees. Gini is faster; entropy may give slightly better splits.</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Training Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Max Depth:</span> {maxDepth ?? 'None'}</div><div><span className="text-muted-foreground">Min Split:</span> {minSamplesSplit}</div><div><span className="text-muted-foreground">Criterion:</span> {criterion}</div><div><span className="text-muted-foreground">Features:</span> {featureCols.length}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><TreeDeciduous className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Decision Tree will learn if-then rules from your data using {criterion === 'gini' ? 'Gini impurity' : 'entropy'} for splitting.</p></div>
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
                                        {results.tree_stats && <p className="text-sm">• Tree structure: <strong>{results.tree_stats.n_nodes}</strong> nodes, <strong>{results.tree_stats.n_leaves}</strong> leaves, depth <strong>{results.tree_stats.max_depth_actual}</strong>.</p>}
                                        <p className="text-sm">• Most important feature: <strong>{topFeature?.feature}</strong> ({(topFeature?.importance * 100).toFixed(1)}% importance).</p>
                                        <p className="text-sm">• Cross-validation: <strong>{(results.cv_results.cv_mean * 100).toFixed(1)}%</strong> ± {(results.cv_results.cv_std * 100).toFixed(1)}% ({results.cv_results.cv_folds}-fold).</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Predictive Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The model shows good generalization. Decision rules are interpretable and reliable." : "Consider limiting tree depth, adjusting min_samples parameters, or using ensemble methods."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• {isClassification ? 'Accuracy' : 'R² Score'}: {isClassification ? `${(mainMetric * 100).toFixed(1)}%` : mainMetric?.toFixed(3)} — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• CV stability: {results.cv_results.cv_std < 0.05 ? 'low variance, consistent' : 'some variance across folds'}</p><p>• Train vs Test gap: {results.metrics.train_r2 || results.metrics.train_accuracy ? `${((results.metrics.train_r2 || results.metrics.train_accuracy || 0) - mainMetric).toFixed(3)}` : 'N/A'} — {Math.abs((results.metrics.train_r2 || results.metrics.train_accuracy || 0) - mainMetric) < 0.1 ? 'good generalization' : 'possible overfitting'}</p></div></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding Decision Tree performance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How Decision Trees Work</h4><p className="text-sm text-muted-foreground">Decision Trees learn if-then rules by recursively splitting data based on feature values. Each split aims to create groups that are as pure as possible (using {criterion === 'gini' ? 'Gini impurity' : 'entropy'}). {results.tree_stats && <>The final tree has {results.tree_stats.n_nodes} nodes and {results.tree_stats.n_leaves} leaf nodes.</>}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Feature Importance</h4><p className="text-sm text-muted-foreground">Top features: {results.feature_importance.slice(0, 3).map(f => f.feature).join(', ')}. These variables provide the most information for making predictions. Features closer to the root of the tree have higher importance.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Cross-Validation</h4><p className="text-sm text-muted-foreground">CV score of {(results.cv_results.cv_mean * 100).toFixed(1)}% ± {(results.cv_results.cv_std * 100).toFixed(1)}% shows {results.cv_results.cv_std < 0.05 ? 'stable performance across different data splits' : 'some variability — the tree may be sensitive to specific data points'}. This is more reliable than a single train/test split.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `This model is ready for use. You can trace any prediction by following the tree's decision rules. Expected accuracy on new data: ~${(mainMetric * 100).toFixed(0)}%.` : `Consider: (1) limiting max_depth to prevent overfitting, (2) increasing min_samples_split/leaf, (3) using ensemble methods like Random Forest for better performance.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Interpretable & Reliable</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Room for Improvement</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your Decision Tree achieves ${(mainMetric * 100).toFixed(1)}% ${isClassification ? 'accuracy' : 'R²'} with clear, explainable decision rules.` : `Current ${isClassification ? 'accuracy' : 'R²'} of ${(mainMetric * 100).toFixed(1)}% suggests the model could benefit from pruning or ensemble methods.`}</p></div>
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
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Decision Tree Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.task_type} | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            {results.tree_stats && <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><TreeDeciduous className="w-5 h-5" />Tree Structure</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.tree_stats.n_nodes}</p><p className="text-sm text-muted-foreground">Total Nodes</p></div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.tree_stats.n_leaves}</p><p className="text-sm text-muted-foreground">Leaf Nodes</p></div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-primary">{results.tree_stats.max_depth_actual}</p><p className="text-sm text-muted-foreground">Max Depth</p></div>
                                    </div>
                                </CardContent>
                            </Card>}

                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A Decision Tree {results.task_type} model was trained to predict <em>{targetCol}</em> using {results.n_features} features.
                                                The dataset included <em>N</em> = {results.n_samples} observations, split into {results.n_train} training and {results.n_test} test samples
                                                ({((1 - testSize) * 100).toFixed(0)}%/{(testSize * 100).toFixed(0)}% split).
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                {results.tree_stats && <>The resulting tree has {results.tree_stats.n_nodes} nodes, {results.tree_stats.n_leaves} leaf nodes, and a maximum depth of {results.tree_stats.max_depth_actual}. </>}
                                                {results.task_type === 'classification' ? (
                                                    <> The model achieved an accuracy of <span className="font-mono">{(results.metrics.accuracy * 100).toFixed(2)}%</span> on the test set, 
                                                    with precision = <span className="font-mono">{(results.metrics.precision_macro * 100).toFixed(2)}%</span>, 
                                                    recall = <span className="font-mono">{(results.metrics.recall_macro * 100).toFixed(2)}%</span>, 
                                                    and F1-score = <span className="font-mono">{(results.metrics.f1_macro * 100).toFixed(2)}%</span> (macro-averaged).
                                                    {results.metrics.auc && <> The ROC-AUC was <span className="font-mono">{results.metrics.auc.toFixed(3)}</span>.</>}</>
                                                ) : (
                                                    <> The model achieved R² = <span className="font-mono">{results.metrics.r2?.toFixed(4)}</span> on the test set, 
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
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="tree" className="w-full"><TabsList className={`grid w-full ${results.task_type === 'classification' ? 'grid-cols-4' : 'grid-cols-3'}`}><TabsTrigger value="tree">Tree Structure</TabsTrigger><TabsTrigger value="importance">Feature Importance</TabsTrigger>{results.task_type === 'classification' ? <><TabsTrigger value="confusion">Confusion</TabsTrigger><TabsTrigger value="roc">ROC</TabsTrigger></> : <TabsTrigger value="regression">Actual vs Pred</TabsTrigger>}</TabsList><TabsContent value="tree" className="mt-4">{results.tree_plot ? <Image src={`data:image/png;base64,${results.tree_plot}`} alt="Tree" width={900} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="importance" className="mt-4">{results.importance_plot ? <Image src={`data:image/png;base64,${results.importance_plot}`} alt="Importance" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>{results.task_type === 'classification' ? (<><TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="roc" className="mt-4">{results.roc_plot ? <Image src={`data:image/png;base64,${results.roc_plot}`} alt="ROC" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></>) : (<TabsContent value="regression" className="mt-4">{results.regression_plot ? <Image src={`data:image/png;base64,${results.regression_plot}`} alt="Regression" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>)}</Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="w-48">Bar</TableHead></TableRow></TableHeader><TableBody>{results.feature_importance.slice(0, 15).map((f, i) => (<TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{f.feature}</TableCell><TableCell className="text-right font-mono">{(f.importance * 100).toFixed(2)}%</TableCell><TableCell><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${f.importance * 100}%` }} /></div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.task_type === 'classification' && results.per_class_metrics && (<Card><CardHeader><CardTitle>Per-Class Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader><TableBody>{results.per_class_metrics.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.class}</TableCell><TableCell className="text-right font-mono">{(c.precision * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.recall * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.f1_score * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{c.support}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-semibold">{v === null ? 'None' : typeof v === 'number' ? (v % 1 === 0 ? v : v.toFixed(2)) : v}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Cross-Validation Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>CV Mean</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Average across {results.cv_results.cv_folds} folds</TableCell></TableRow><TableRow><TableCell>CV Std</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">{results.cv_results.cv_std < 0.03 ? 'Very stable' : results.cv_results.cv_std < 0.05 ? 'Stable' : 'Some variance'}</TableCell></TableRow><TableRow><TableCell>Folds</TableCell><TableCell className="text-right font-mono">{results.cv_results.cv_folds}</TableCell><TableCell className="text-muted-foreground">Number of CV iterations</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Training Decision Tree model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
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

