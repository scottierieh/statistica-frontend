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
import { Loader2, HelpCircle, Repeat, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, Gauge, Activity, Info, Shield, FileType, FileCode, Hash, Layers, Code, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/cross_validation_analysis.py?alt=media";

const metricDefinitions: Record<string, string> = {
    cv_mean: "Cross-validation mean: The average score across all cross-validation folds.",
    cv_std: "Cross-validation standard deviation: The variation in scores across folds, indicating model stability.",
    cv_min: "The minimum score observed across all folds.",
    cv_max: "The maximum score observed across all folds.",
    cv_median: "The median score across all folds.",
    accuracy: "The proportion of correct predictions among the total number of cases examined.",
    precision: "The proportion of positive identifications that were actually correct.",
    recall: "The proportion of actual positives that were identified correctly.",
    f1_score: "The harmonic mean of precision and recall.",
    r2: "R-squared: The proportion of variance in the dependent variable predictable from the independent variables.",
    rmse: "Root Mean Square Error: The square root of the average of squared differences.",
    mae: "Mean Absolute Error: The average of the absolute differences between predictions and actual values.",
    kfold: "K-Fold CV: Splits data into K equal parts, trains on K-1, tests on 1, repeats K times.",
    stratified: "Stratified K-Fold: Like K-Fold but preserves class proportions in each fold.",
    loocv: "Leave-One-Out CV: Uses N-1 samples for training, 1 for testing, repeated N times.",
    coefficient_of_variation: "CV coefficient (Std/Mean): Measures relative variability."
};

interface FoldDetail { fold: number; train_size: number; test_size: number; score: number | null; }
interface CVResults { scores: number[]; mean: number; std: number; min: number; max: number; median: number; n_folds: number; fold_details: FoldDetail[]; y_pred: number[] | null; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { task_type: string; n_samples: number; n_features: number; parameters: Record<string, any>; cv_results: CVResults; additional_metrics: Record<string, number>; scores_plot: string | null; stability_plot: string | null; cm_plot?: string | null; regression_plot?: string | null; class_labels?: string[]; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' }, { id: 2, label: 'Parameters' }, { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }
];

const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const isClassification = results.task_type === 'classification';
    const cvMean = results.cv_results.mean;
    const cvStd = results.cv_results.std;
    const getQuality = (m: number) => m >= 0.9 ? 'Excellent' : m >= 0.8 ? 'Good' : m >= 0.7 ? 'Fair' : 'Needs Work';
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">CV Mean</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{isClassification ? `${(cvMean * 100).toFixed(1)}%` : cvMean?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getQuality(cvMean)} performance</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">CV Std</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">±{isClassification ? `${(cvStd * 100).toFixed(1)}%` : cvStd?.toFixed(3)}</p><p className="text-xs text-muted-foreground">{cvStd < 0.03 ? 'Very stable' : cvStd < 0.05 ? 'Stable' : 'Some variance'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Min Score</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{isClassification ? `${(results.cv_results.min * 100).toFixed(1)}%` : results.cv_results.min?.toFixed(3)}</p><p className="text-xs text-muted-foreground">Worst fold</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Max Score</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{isClassification ? `${(results.cv_results.max * 100).toFixed(1)}%` : results.cv_results.max?.toFixed(3)}</p><p className="text-xs text-muted-foreground">Best fold</p></div></CardContent></Card>
        </div>
    );
};

const PythonCodeModal = ({ isOpen, onClose, codeUrl }: { isOpen: boolean; onClose: () => void; codeUrl: string; }) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { if (isOpen && !code) { fetchCode(); } }, [isOpen, code]);

    const fetchCode = async () => {
        setIsLoading(true); setError(null);
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) throw new Error(`Failed to fetch code: ${response.status}`);
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Python code' });
        } finally { setIsLoading(false); }
    };

    const handleCopy = () => { navigator.clipboard.writeText(code); toast({ title: 'Copied!', description: 'Code copied to clipboard' }); };
    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = 'cross_validation_analysis.py';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!', description: 'Python file saved' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Cross-Validation Analysis</DialogTitle>
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
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950"><pre className="p-4 text-sm text-slate-50 overflow-x-auto"><code>{code}</code></pre></ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Cross-Validation Terms Glossary</DialogTitle>
                <DialogDescription>Definitions of metrics and parameters used in this analysis</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                    {Object.entries(metricDefinitions).map(([term, definition]) => (
                        <div key={term} className="border-b pb-3">
                            <h4 className="font-semibold capitalize">{term.replace(/_/g, ' ')}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
);


const CrossValidationGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Cross-Validation Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is CV */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                What is Cross-Validation?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Cross-validation (CV) is a technique to <strong>reliably estimate</strong> how well your model 
                will perform on unseen data. Instead of a single train-test split, CV tests the model 
                on <strong>multiple different splits</strong> and averages the results.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why use CV instead of a single train-test split?</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    • Single split can be "lucky" or "unlucky"<br/>
                    • CV uses ALL data for both training AND testing<br/>
                    • Gives mean AND standard deviation of performance<br/>
                    • More reliable estimate of generalization<br/>
                    • Essential for model selection and hyperparameter tuning
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* CV Methods */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Cross-Validation Methods
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">K-Fold Cross-Validation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Splits data into K equal parts (folds).
                    <br/>• Train on K-1 folds, test on 1 fold
                    <br/>• Repeat K times (each fold is test set once)
                    <br/>• Report mean and std of K scores
                    <br/>• <strong>Most common choice</strong> — typically K=5 or K=10
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Stratified K-Fold</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Like K-Fold but <strong>preserves class proportions</strong> in each fold.
                    <br/>• Essential for imbalanced classification
                    <br/>• Each fold has same % of each class as full data
                    <br/>• Reduces variance in scores
                    <br/>• <strong>Recommended default</strong> for classification
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Repeated K-Fold</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Runs K-Fold multiple times with different random splits.
                    <br/>• e.g., 5-fold × 3 repeats = 15 total evaluations
                    <br/>• More robust estimate, reduces variance
                    <br/>• Takes longer but worth it for final evaluation
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Leave-One-Out (LOOCV)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extreme case: K = N (number of samples).
                    <br/>• Train on N-1 samples, test on 1
                    <br/>• Very expensive for large datasets
                    <br/>• Low bias, high variance
                    <br/>• Use only for very small datasets (&lt;100)
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Rule of thumb:</strong> Use <strong>Stratified K-Fold (K=5)</strong> for classification, 
                  <strong> K-Fold (K=5 or 10)</strong> for regression. Use Repeated K-Fold for final model evaluation.
                </p>
              </div>
            </div>

            <Separator />

            {/* Choosing K */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Choosing K (Number of Folds)
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Small K (2-5)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • More training data per fold
                    <br/>• Higher bias (smaller test sets)
                    <br/>• Lower variance
                    <br/>• Faster computation
                    <br/>• Use when: Large datasets, quick iterations
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Large K (10-20)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • Less training data per fold
                    <br/>• Lower bias (larger test sets)
                    <br/>• Higher variance
                    <br/>• Slower computation
                    <br/>• Use when: Small datasets, final evaluation
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Common choices:</strong><br/>
                  • <strong>K=5:</strong> Good balance, standard choice<br/>
                  • <strong>K=10:</strong> More reliable, slightly slower<br/>
                  • <strong>K=N (LOOCV):</strong> Only for very small datasets
                </p>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interpreting CV Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">CV Mean (Average Score)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The expected performance on new data.
                    <br/>• Your best estimate of generalization performance
                    <br/>• Report this as your model's performance
                    <br/>• Compare this across different models
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">CV Standard Deviation (Stability)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How consistent the model performs across folds.
                    <br/>• <strong>&lt;3%:</strong> Very stable, reliable model
                    <br/>• <strong>3-5%:</strong> Stable, acceptable
                    <br/>• <strong>5-10%:</strong> Some variance, investigate
                    <br/>• <strong>&gt;10%:</strong> Unstable, may have issues
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Min/Max Scores</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Range of performance across folds.
                    <br/>• Large range = some data subsets harder to predict
                    <br/>• Look for outlier folds (much worse than others)
                    <br/>• May indicate data quality issues or distribution shift
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Coefficient of Variation (CV/Mean)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Relative variability: Std / Mean
                    <br/>• <strong>&lt;10%:</strong> Excellent stability
                    <br/>• <strong>10-20%:</strong> Good stability
                    <br/>• <strong>&gt;20%:</strong> Concerning variance
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Pitfalls */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Common Pitfalls
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Data Leakage</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preprocessing BEFORE splitting causes leakage!
                    <br/>• Wrong: Scale all data → then split into folds
                    <br/>• Right: Split → scale training fold → apply to test fold
                    <br/>• This tool handles preprocessing correctly inside CV
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Tuning on CV Score</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Using CV to select hyperparameters, then reporting same CV score.
                    <br/>• This gives optimistic estimates
                    <br/>• Solution: Nested CV (inner for tuning, outer for evaluation)
                    <br/>• Or: Use separate holdout set for final evaluation
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Ignoring Std</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only reporting mean without standard deviation.
                    <br/>• Model A: 85% ± 2% vs Model B: 86% ± 8%
                    <br/>• Model A is likely better despite lower mean!
                    <br/>• Always report mean ± std
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
                  <p className="font-medium text-sm text-primary mb-1">Do</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use <strong>Stratified K-Fold</strong> for classification</li>
                    <li>• Report <strong>mean ± std</strong></li>
                    <li>• Use <strong>Repeated K-Fold</strong> for final eval</li>
                    <li>• Shuffle data before splitting</li>
                    <li>• Keep preprocessing inside CV loop</li>
                    <li>• Compare models using CV scores</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Don't preprocess before splitting</li>
                    <li>• Don't only report mean score</li>
                    <li>• Don't use same CV for tuning AND eval</li>
                    <li>• Don't use LOOCV on large datasets</li>
                    <li>• Don't ignore high variance across folds</li>
                    <li>• Don't use K=2 (too few folds)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Comparing multiple models</li>
                    <li>• Hyperparameter tuning</li>
                    <li>• Final performance estimate</li>
                    <li>• Small to medium datasets</li>
                    <li>• When you need reliable estimates</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Alternatives</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Hold-out:</strong> Large datasets, quick iterations</li>
                    <li>• <strong>Bootstrap:</strong> Confidence intervals</li>
                    <li>• <strong>Time-series CV:</strong> Temporal data</li>
                    <li>• <strong>Group K-Fold:</strong> Grouped data</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Model Selection */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Using CV for Model Selection
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Compare models fairly using CV:</strong>
                </p>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Run CV on each model with <strong>same K and random seed</strong></li>
                  <li>Compare <strong>mean scores AND standard deviations</strong></li>
                  <li>Prefer model with <strong>higher mean AND lower std</strong></li>
                  <li>If close, prefer <strong>simpler model</strong> (Occam's razor)</li>
                  <li>Use <strong>statistical test</strong> (e.g., paired t-test) if needed</li>
                </ol>
                <div className="mt-3 p-2 rounded bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary">
                    <strong>Example:</strong> Model A: 85% ± 2%, Model B: 87% ± 5%<br/>
                    Model A might be better — more reliable despite slightly lower mean.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Cross-validation is your best friend 
                for reliable model evaluation. Always use Stratified K-Fold for classification. 
                Report mean ± std, not just the mean. Be careful of data leakage — keep preprocessing 
                inside the CV loop. When comparing models, consider both performance AND stability.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Repeat className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Cross-Validation Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Robust model evaluation through repeated train-test splits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Layers className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Multiple Folds</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Test on every data point</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Shield className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Reliable Estimates</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Reduce variance in evaluation</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Gauge className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Detect Overfitting</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Identify generalization issues</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use Cross-Validation</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Cross-Validation when you need reliable performance estimates. Essential for model selection and hyperparameter tuning.</p>
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
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Mean score:</strong> Average performance</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Std deviation:</strong> Model stability</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Fold details:</strong> Per-fold analysis</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Repeat className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface CrossValidationPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function CrossValidationAnalysisPage({ data, allHeaders, onLoadExample }: CrossValidationPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [taskType, setTaskType] = useState('auto');
    const [cvMethod, setCvMethod] = useState('kfold');
    const [nFolds, setNFolds] = useState(5);
    const [nRepeats, setNRepeats] = useState(3);
    const [shuffle, setShuffle] = useState(true);
    const [modelType, setModelType] = useState('auto');
    const [scoring, setScoring] = useState('auto');
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
        checks.push({ label: 'Sample size (n ≥ 50)', passed: data.length >= 50, detail: `n = ${data.length}` });
        const samplesPerFold = Math.floor(data.length / nFolds);
        checks.push({ label: 'Samples per fold', passed: samplesPerFold >= 10, detail: `~${samplesPerFold} samples/fold` });
        return checks;
    }, [targetCol, featureCols, data.length, nFolds]);

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
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `CrossValidation_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `CROSS-VALIDATION ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nTask Type,${analysisResult.task_type}\nN Samples,${analysisResult.n_samples}\nN Features,${analysisResult.n_features}\n`;
        csv += `\nCV RESULTS\nMean,${analysisResult.cv_results.mean}\nStd,${analysisResult.cv_results.std}\nMin,${analysisResult.cv_results.min}\nMax,${analysisResult.cv_results.max}\nMedian,${analysisResult.cv_results.median}\nN Folds,${analysisResult.cv_results.n_folds}\n`;
        csv += `\nFOLD SCORES\n` + analysisResult.cv_results.scores.map((s, i) => `Fold ${i + 1},${s}`).join('\n');
        if (analysisResult.additional_metrics && Object.keys(analysisResult.additional_metrics).length > 0) {
            csv += `\n\nADDITIONAL METRICS\n`;
            csv += Object.entries(analysisResult.additional_metrics).map(([k, v]) => `${k},${v}`).join('\n');
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `CrossValidation_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/cross-validation-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results: analysisResult, targetCol, featureCols, sampleSize: data.length }) });
            const blob = await response.blob();
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `CrossValidation_Report_${new Date().toISOString().split('T')[0]}.docx`; link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetCol, featureCols, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetCol || featureCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select target and features.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/cross-validation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, task_type: taskType, cv_method: cvMethod, n_folds: nFolds, n_repeats: nRepeats, shuffle, model_type: modelType, scoring }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            const mainMetric = result.task_type === 'classification' ? `Mean: ${(result.cv_results.mean * 100).toFixed(1)}%` : `R²: ${result.cv_results.mean?.toFixed(3)}`;
            toast({ title: 'CV Complete', description: mainMetric });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, taskType, cvMethod, nFolds, nRepeats, shuffle, modelType, scoring, toast]);

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
            <CrossValidationGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Cross-Validation Analysis</h1>
                    <p className="text-muted-foreground mt-1">Robust model evaluation</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Cross-Validation Parameters</CardTitle><CardDescription>Configure CV settings</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label>CV Method</Label><Select value={cvMethod} onValueChange={setCvMethod}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kfold">K-Fold</SelectItem><SelectItem value="stratified">Stratified K-Fold</SelectItem><SelectItem value="repeated_kfold">Repeated K-Fold</SelectItem><SelectItem value="repeated_stratified">Repeated Stratified</SelectItem><SelectItem value="loocv">Leave-One-Out</SelectItem></SelectContent></Select></div>
                                <div className="space-y-3"><Label>Model Type</Label><Select value={modelType} onValueChange={setModelType}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto (Random Forest)</SelectItem><SelectItem value="logistic">Logistic Regression</SelectItem><SelectItem value="decision_tree">Decision Tree</SelectItem><SelectItem value="random_forest">Random Forest</SelectItem><SelectItem value="gradient_boosting">Gradient Boosting</SelectItem><SelectItem value="svm">SVM</SelectItem><SelectItem value="knn">K-Nearest Neighbors</SelectItem><SelectItem value="naive_bayes">Naive Bayes</SelectItem><SelectItem value="ridge">Ridge (Regression)</SelectItem><SelectItem value="lasso">Lasso (Regression)</SelectItem></SelectContent></Select></div>
                                {cvMethod !== 'loocv' && <ParamSlider label="Number of Folds (K)" value={nFolds} onChange={setNFolds} min={2} max={20} step={1} />}
                                {(cvMethod === 'repeated_kfold' || cvMethod === 'repeated_stratified') && <ParamSlider label="Number of Repeats" value={nRepeats} onChange={setNRepeats} min={2} max={10} step={1} />}
                                <div className="space-y-3"><Label>Scoring Metric</Label><Select value={scoring} onValueChange={setScoring}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto</SelectItem><SelectItem value="accuracy">Accuracy</SelectItem><SelectItem value="f1">F1 Score</SelectItem><SelectItem value="precision">Precision</SelectItem><SelectItem value="recall">Recall</SelectItem><SelectItem value="r2">R² (Regression)</SelectItem><SelectItem value="rmse">RMSE (Regression)</SelectItem><SelectItem value="mae">MAE (Regression)</SelectItem></SelectContent></Select></div>
                                <div className="flex items-center space-x-2 pt-6"><Checkbox id="shuffle" checked={shuffle} onCheckedChange={(c) => setShuffle(!!c)} /><label htmlFor="shuffle" className="text-sm">Shuffle data before splitting</label></div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span>Stratified K-Fold is recommended for imbalanced classification. Use more folds for smaller datasets.</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">CV Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">Method:</span> {cvMethod}</div><div><span className="text-muted-foreground">Folds:</span> {cvMethod === 'loocv' ? data.length : nFolds}</div><div><span className="text-muted-foreground">Model:</span> {modelType}</div><div><span className="text-muted-foreground">Features:</span> {featureCols.length}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Repeat className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Cross-validation will split your data into {cvMethod === 'loocv' ? data.length : nFolds} folds.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running CV...</> : <>Run Cross-Validation<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const isClassification = results.task_type === 'classification';
                    const cvMean = results.cv_results.mean;
                    const cvStd = results.cv_results.std;
                    const isGood = cvMean >= 0.8;
                    const isStable = cvStd < 0.05;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{results.task_type} with {results.n_features} features</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Cross-validation achieved <strong>{isClassification ? `${(cvMean * 100).toFixed(1)}% mean accuracy` : `mean R² of ${cvMean?.toFixed(3)}`}</strong> across {results.cv_results.n_folds} folds.</p>
                                        <p className="text-sm">• Standard deviation: <strong>±{isClassification ? `${(cvStd * 100).toFixed(1)}%` : cvStd?.toFixed(3)}</strong> — {isStable ? 'very stable' : 'some variance between folds'}.</p>
                                        <p className="text-sm">• Score range: <strong>{isClassification ? `${(results.cv_results.min * 100).toFixed(1)}%` : results.cv_results.min?.toFixed(3)}</strong> to <strong>{isClassification ? `${(results.cv_results.max * 100).toFixed(1)}%` : results.cv_results.max?.toFixed(3)}</strong>.</p>
                                        <p className="text-sm">• Model: <strong>{results.parameters.model_type?.replace('_', ' ')}</strong> with {results.parameters.cv_method} validation.</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood && isStable ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood && isStable ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood && isStable ? "Reliable Model Performance!" : "Room for Improvement"}</p><p className="text-sm text-muted-foreground mt-1">{isGood && isStable ? "The model shows consistent performance across all folds." : "Consider trying different models or adding features."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Mean score: {isClassification ? `${(cvMean * 100).toFixed(1)}%` : cvMean?.toFixed(3)} — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• CV stability: {isStable ? 'low variance, consistent across folds' : 'some variance across folds'}</p><p>• Coefficient of variation: {((cvStd / cvMean) * 100).toFixed(1)}%</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (cvMean >= 0.9 ? 5 : cvMean >= 0.8 ? 4 : cvMean >= 0.7 ? 3 : cvMean >= 0.6 ? 2 : 1) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const isClassification = results.task_type === 'classification';
                    const cvMean = results.cv_results.mean;
                    const cvStd = results.cv_results.std;
                    const isGood = cvMean >= 0.8;
                    const isStable = cvStd < 0.05;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding Cross-Validation</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How Cross-Validation Works</h4><p className="text-sm text-muted-foreground">Cross-validation splits your data into {results.cv_results.n_folds} parts. Each part takes a turn being the test set while the others train the model. This gives {results.cv_results.n_folds} different performance estimates.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Why Mean & Std Matter</h4><p className="text-sm text-muted-foreground">The mean score ({isClassification ? `${(cvMean * 100).toFixed(1)}%` : cvMean?.toFixed(3)}) represents expected performance. The std (±{isClassification ? `${(cvStd * 100).toFixed(1)}%` : cvStd?.toFixed(3)}) shows consistency. {isStable ? 'Low variance means reliable predictions.' : 'Higher variance suggests the model may perform differently on different data samples.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Interpreting the Range</h4><p className="text-sm text-muted-foreground">Scores ranged from {isClassification ? `${(results.cv_results.min * 100).toFixed(1)}%` : results.cv_results.min?.toFixed(3)} to {isClassification ? `${(results.cv_results.max * 100).toFixed(1)}%` : results.cv_results.max?.toFixed(3)}. {results.cv_results.max - results.cv_results.min < 0.1 ? 'Narrow range indicates consistent model behavior.' : 'Wider range suggests some data subsets are harder to predict.'}</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood && isStable ? `This CV score suggests the model will achieve approximately ${isClassification ? `${(cvMean * 100).toFixed(0)}%` : cvMean?.toFixed(2)} performance on new data.` : `Current performance could be improved. Consider: different models, feature engineering, or more data.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood && isStable ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood && isStable ? <><CheckCircle2 className="w-5 h-5 text-primary" />Robust & Reliable</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Consider Improvements</>}</h4><p className="text-sm text-muted-foreground">{isGood && isStable ? `Cross-validation confirms strong, stable performance.` : `Cross-validation reveals opportunities for improvement.`}</p></div>
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
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Cross-Validation Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.task_type} | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A {results.parameters.cv_method?.replace('_', ' ')} cross-validation was performed to evaluate the {results.parameters.model_type?.replace('_', ' ')} model 
                                                for {results.task_type} of <em>{targetCol}</em> using {results.n_features} features.
                                                The dataset included <em>N</em> = {results.n_samples} observations.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The cross-validation yielded a mean score of <span className="font-mono">{results.task_type === 'classification' ? `${(results.cv_results.mean * 100).toFixed(2)}%` : results.cv_results.mean?.toFixed(4)}</span> (SD = <span className="font-mono">{results.task_type === 'classification' ? `${(results.cv_results.std * 100).toFixed(2)}%` : results.cv_results.std?.toFixed(4)}</span>) 
                                                across {results.cv_results.n_folds} folds. Scores ranged from <span className="font-mono">{results.task_type === 'classification' ? `${(results.cv_results.min * 100).toFixed(2)}%` : results.cv_results.min?.toFixed(4)}</span> to 
                                                <span className="font-mono"> {results.task_type === 'classification' ? `${(results.cv_results.max * 100).toFixed(2)}%` : results.cv_results.max?.toFixed(4)}</span>, 
                                                with a median of <span className="font-mono">{results.task_type === 'classification' ? `${(results.cv_results.median * 100).toFixed(2)}%` : results.cv_results.median?.toFixed(4)}</span>.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The coefficient of variation (CV = SD/Mean) was <span className="font-mono">{((results.cv_results.std / results.cv_results.mean) * 100).toFixed(2)}%</span>, 
                                                indicating {results.cv_results.std / results.cv_results.mean < 0.1 ? 'excellent' : results.cv_results.std / results.cv_results.mean < 0.2 ? 'good' : 'moderate'} model stability across different data partitions.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="scores" className="w-full"><TabsList className={`grid w-full ${results.task_type === 'classification' ? 'grid-cols-3' : 'grid-cols-3'}`}><TabsTrigger value="scores">CV Scores</TabsTrigger><TabsTrigger value="stability">Stability</TabsTrigger>{results.task_type === 'classification' ? <TabsTrigger value="confusion">Confusion</TabsTrigger> : <TabsTrigger value="regression">Actual vs Pred</TabsTrigger>}</TabsList><TabsContent value="scores" className="mt-4">{results.scores_plot ? <Image src={`data:image/png;base64,${results.scores_plot}`} alt="CV Scores" width={900} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="stability" className="mt-4">{results.stability_plot ? <Image src={`data:image/png;base64,${results.stability_plot}`} alt="Stability" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>{results.task_type === 'classification' ? (<TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>) : (<TabsContent value="regression" className="mt-4">{results.regression_plot ? <Image src={`data:image/png;base64,${results.regression_plot}`} alt="Regression" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent>)}</Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Fold-by-Fold Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Fold</TableHead><TableHead className="text-right">Score</TableHead><TableHead className="w-48">Bar</TableHead><TableHead className="text-right">vs Mean</TableHead></TableRow></TableHeader><TableBody>{results.cv_results.scores.map((score, i) => (<TableRow key={i}><TableCell className="font-medium">Fold {i + 1}</TableCell><TableCell className="text-right font-mono">{results.task_type === 'classification' ? `${(score * 100).toFixed(2)}%` : score?.toFixed(4)}</TableCell><TableCell><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${(score / results.cv_results.max) * 100}%` }} /></div></TableCell><TableCell className={`text-right font-mono ${score >= results.cv_results.mean ? 'text-green-600' : 'text-amber-600'}`}>{score >= results.cv_results.mean ? '+' : ''}{results.task_type === 'classification' ? `${((score - results.cv_results.mean) * 100).toFixed(2)}%` : (score - results.cv_results.mean).toFixed(4)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            {results.additional_metrics && Object.keys(results.additional_metrics).length > 0 && (<Card><CardHeader><CardTitle>Additional Metrics (from CV Predictions)</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.additional_metrics).map(([k, v]) => (<div key={k} className="p-3 bg-muted/50 rounded-lg text-center"><p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p><p className="font-mono font-semibold text-lg">{typeof v === 'number' ? (v < 1 && v > -1 ? (results.task_type === 'classification' ? `${(v * 100).toFixed(1)}%` : v.toFixed(4)) : v.toFixed(2)) : v}</p></div>))}</div></CardContent></Card>)}

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).filter(([_, v]) => v !== null).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}</p><p className="font-mono font-semibold">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}</p></div>))}</div></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running cross-validation...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
            </div>
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
        </div>
    );
}
