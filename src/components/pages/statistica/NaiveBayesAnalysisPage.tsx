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
import { Loader2, HelpCircle, Brain, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, BarChart3, Gauge, Activity, Info, Shield, FileType, FileCode, Hash, Percent, Code, Copy, Calculator, Sigma } from 'lucide-react';
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
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/naive_bayes.py?alt=media";

// Naive Bayes metric definitions for glossary
const nbMetricDefinitions: Record<string, string> = {
    // Classification metrics
    accuracy: "The proportion of correct predictions out of all predictions. Ranges from 0 to 1, where 1 is perfect.",
    precision: "Of all positive predictions, the proportion that were actually correct. High precision means few false positives.",
    recall: "Of all actual positives, the proportion that were correctly identified. Also called sensitivity or true positive rate.",
    f1_score: "The harmonic mean of precision and recall. Balances both metrics, useful when classes are imbalanced.",
    auc: "Area Under the ROC Curve. Measures the model's ability to distinguish between classes. 1.0 is perfect, 0.5 is random.",
    
    // Naive Bayes specific
    prior_probability: "P(class) - The probability of each class before observing any features. Calculated from class frequencies in training data.",
    posterior_probability: "P(class|features) - The probability of a class given the observed features. This is what Naive Bayes calculates.",
    likelihood: "P(features|class) - The probability of observing features given a class. Estimated differently by each NB variant.",
    bayes_theorem: "P(class|features) = P(features|class) × P(class) / P(features). The foundation of Naive Bayes classification.",
    conditional_independence: "The 'naive' assumption that features are independent given the class. Simplifies probability calculations.",
    
    // NB Types
    gaussian_nb: "Assumes continuous features follow a normal (Gaussian) distribution within each class. Best for real-valued features.",
    multinomial_nb: "Models features as counts or frequencies. Ideal for text classification with word counts or TF-IDF values.",
    bernoulli_nb: "Assumes binary features (0/1). Good for document classification with word presence/absence indicators.",
    
    // Parameters
    var_smoothing: "Added to variances in Gaussian NB to prevent division by zero. Larger values = more smoothing.",
    alpha: "Laplace/additive smoothing parameter for Multinomial/Bernoulli NB. Prevents zero probabilities for unseen features.",
    fit_prior: "Whether to learn class prior probabilities from data (True) or use uniform priors (False).",
    
    // General terms
    class_priors: "The prior probability distribution over classes. Reflects how common each class is in the training data.",
    log_probability: "Probabilities converted to log scale to prevent numerical underflow when multiplying many small probabilities.",
    smoothing: "Technique to handle zero probabilities for unseen feature values. Essential for robust probability estimation.",
    cross_validation: "Technique to assess model performance by training on subsets of data and validating on held-out portions.",
    confusion_matrix: "A table showing correct and incorrect predictions for each class combination.",
    roc_curve: "Receiver Operating Characteristic curve. Plots true positive rate vs false positive rate at various thresholds."
};

interface FeatureImportance { feature: string; importance: number; }
interface ClassMetrics { class: string; precision: number; recall: number; f1_score: number; support: number; }
interface CVResults { cv_scores: number[]; cv_mean: number; cv_std: number; cv_folds: number; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { task_type: string; n_samples: number; n_features: number; n_train: number; n_test: number; n_classes: number; parameters: Record<string, any>; metrics: Record<string, number>; feature_importance: FeatureImportance[]; cv_results: CVResults; class_priors: Record<string, number>; importance_plot: string | null; cm_plot: string | null; roc_plot: string | null; prior_plot: string | null; prob_dist_plot: string | null; per_class_metrics: ClassMetrics[]; confusion_matrix: number[][]; class_labels: string[]; interpretation: Interpretation; }

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
        link.download = 'naive_bayes.py';
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
                        Python Code - Naive Bayes Analysis
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
                        Naive Bayes Statistical Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of metrics and terms used in Naive Bayes classification
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
                                        <h4 className="font-medium capitalize">{term.replace('_', ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{nbMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bayesian Concepts */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                Bayesian Concepts
                            </h3>
                            <div className="space-y-3">
                                {['prior_probability', 'posterior_probability', 'likelihood', 'bayes_theorem', 'conditional_independence'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{nbMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* NB Types */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Brain className="w-4 h-4" />
                                Naive Bayes Variants
                            </h3>
                            <div className="space-y-3">
                                {['gaussian_nb', 'multinomial_nb', 'bernoulli_nb'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{nbMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Parameters */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Settings2 className="w-4 h-4" />
                                Parameters
                            </h3>
                            <div className="space-y-3">
                                {['var_smoothing', 'alpha', 'fit_prior'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium">{term}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{nbMetricDefinitions[term]}</p>
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
                                {['class_priors', 'log_probability', 'smoothing', 'cross_validation', 'confusion_matrix', 'roc_curve'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{nbMetricDefinitions[term]}</p>
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
    const getQuality = (m: number) => m >= 0.9 ? 'Excellent' : m >= 0.8 ? 'Good' : m >= 0.7 ? 'Fair' : 'Needs Work';
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Accuracy</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.accuracy * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">{getQuality(results.metrics.accuracy)} performance</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Precision</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.precision_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Recall</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.recall_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">F1 Score</p><Hash className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.f1_macro * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Macro average</p></div></CardContent></Card>
        </div>
    );
};


const NaiveBayesGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Naive Bayes Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Naive Bayes */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                What is Naive Bayes?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Naive Bayes is a <strong>probabilistic classifier</strong> based on Bayes' theorem. 
                It's called "naive" because it assumes features are <strong>conditionally independent</strong> 
                given the class — a simplification that works surprisingly well in practice.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Bayes' Theorem:</strong><br/>
                  <span className="font-mono text-xs">
                    P(class|features) = P(features|class) × P(class) / P(features)
                  </span><br/>
                  <span className="text-muted-foreground text-xs mt-1 block">
                    Posterior = Likelihood × Prior / Evidence
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* NB Types */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Naive Bayes Variants: Which to Choose?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Gaussian NB (Most Common)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assumes continuous features follow a <strong>normal distribution</strong> within each class.
                    <br/><strong>Best for:</strong> General numeric features, sensor data, measurements
                    <br/><strong>Use when:</strong> Features are continuous and roughly bell-shaped
                    <br/><strong>Parameter:</strong> var_smoothing (prevents division by zero)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Multinomial NB</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Models features as <strong>counts or frequencies</strong>.
                    <br/><strong>Best for:</strong> Text classification, word counts, TF-IDF
                    <br/><strong>Use when:</strong> Features represent counts (must be non-negative)
                    <br/><strong>Parameter:</strong> alpha (Laplace smoothing)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Bernoulli NB</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assumes <strong>binary features</strong> (0/1, present/absent).
                    <br/><strong>Best for:</strong> Document classification with word presence indicators
                    <br/><strong>Use when:</strong> Features are binary or can be binarized
                    <br/><strong>Parameter:</strong> alpha (smoothing), binarize threshold
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Quick Guide:</strong> Numeric data → Gaussian. Text counts → Multinomial. 
                    Binary features → Bernoulli. When in doubt, start with Gaussian.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Concepts */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Key Concepts
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Prior Probability P(class)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The probability of each class <strong>before seeing any features</strong>.
                    <br/>• Learned from training data class frequencies
                    <br/>• If classes are 70/30 → priors are 0.7 and 0.3
                    <br/>• Set fit_prior=False for uniform priors (equal weight to all classes)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Likelihood P(features|class)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The probability of observing the features <strong>given the class</strong>.
                    <br/>• Gaussian: Based on mean and variance per class
                    <br/>• Multinomial: Based on feature frequencies per class
                    <br/>• This is where the "naive" assumption is applied
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Posterior Probability P(class|features)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The probability of the class <strong>given the observed features</strong>.
                    <br/>• This is what we want to compute!
                    <br/>• Use predict_proba() to get these values
                    <br/>• Prediction = class with highest posterior
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Conditional Independence (The "Naive" Part)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    NB assumes features are <strong>independent given the class</strong>.
                    <br/>• Allows multiplying individual feature probabilities
                    <br/>• Often violated in practice, but still works well!
                    <br/>• Speeds up computation significantly
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Parameters */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Understanding Parameters
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">var_smoothing (Gaussian NB)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added to variances to prevent division by zero.
                    <br/><strong>Default:</strong> 1e-9 (0.000000001)
                    <br/><strong>Higher values:</strong> More smoothing, more stable but less precise
                    <br/><strong>Typical range:</strong> 1e-12 to 1e-6
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">alpha (Multinomial/Bernoulli NB)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Laplace/additive smoothing parameter.
                    <br/><strong>Default:</strong> 1.0 (Laplace smoothing)
                    <br/><strong>alpha = 0:</strong> No smoothing (can cause zero probabilities!)
                    <br/><strong>alpha &gt; 1:</strong> More smoothing, handles rare features better
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">fit_prior</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Whether to learn class priors from data.
                    <br/><strong>True (default):</strong> Use class frequencies as priors
                    <br/><strong>False:</strong> Use uniform priors (equal probability for all classes)
                    <br/>• Use False if you want to ignore class imbalance
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Strengths and Weaknesses */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Strengths and Weaknesses
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Strengths</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Fast</strong> training and prediction</li>
                    <li>• Works well with <strong>small datasets</strong></li>
                    <li>• Handles <strong>high-dimensional data</strong> well</li>
                    <li>• Outputs <strong>probability estimates</strong></li>
                    <li>• <strong>No tuning needed</strong> in many cases</li>
                    <li>• Works with <strong>missing data</strong> (just ignore that feature)</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Weaknesses</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Independence assumption often <strong>violated</strong></li>
                    <li>• <strong>Probability estimates</strong> can be poorly calibrated</li>
                    <li>• <strong>Zero frequency problem</strong> (needs smoothing)</li>
                    <li>• May underperform on <strong>complex relationships</strong></li>
                    <li>• Gaussian NB assumes <strong>normal distributions</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When to Use Naive Bayes
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Great for:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                    <li>• <strong>Text classification</strong> (spam, sentiment, topics)</li>
                    <li>• <strong>Real-time prediction</strong> (very fast)</li>
                    <li>• <strong>Baseline model</strong> to beat</li>
                    <li>• <strong>Small training sets</strong></li>
                    <li>• When you need <strong>probability outputs</strong></li>
                    <li>• <strong>Multi-class problems</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Consider alternatives when:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                    <li>• Features are <strong>highly correlated</strong></li>
                    <li>• You need <strong>calibrated probabilities</strong></li>
                    <li>• Relationships are <strong>complex/non-linear</strong></li>
                    <li>• <strong>Accuracy is critical</strong> (try Random Forest, Gradient Boosting)</li>
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
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check feature distributions (for Gaussian)</li>
                    <li>• Handle missing values appropriately</li>
                    <li>• Consider feature selection to reduce correlation</li>
                    <li>• Standardization usually not needed</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Model Selection</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Match NB type to your feature type</li>
                    <li>• Try different alpha values if using Multinomial/Bernoulli</li>
                    <li>• Use cross-validation to compare</li>
                    <li>• Consider as baseline before complex models</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Evaluation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check per-class metrics (precision, recall)</li>
                    <li>• Use cross-validation for stability</li>
                    <li>• Examine confusion matrix for error patterns</li>
                    <li>• Don't fully trust probability outputs</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report NB type used</li>
                    <li>• Include class priors</li>
                    <li>• Show CV mean and std</li>
                    <li>• Note any smoothing parameters</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Naive Bayes is remarkably effective 
                despite its "naive" assumption. It excels as a fast, simple baseline and often performs 
                surprisingly well on text classification. While the probability estimates may not be 
                perfectly calibrated, the rankings (which class is most likely) are usually reliable. 
                When NB works well on your data, it's hard to beat for simplicity and speed.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Brain className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Naive Bayes Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Probabilistic classifier based on Bayes' theorem</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Percent className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Probabilistic</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Outputs class probabilities</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Fast & Simple</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Efficient training & prediction</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Gauge className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Works Well</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Great with small datasets</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use Naive Bayes</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Naive Bayes for fast, probabilistic classification. Works well for text classification, spam filtering, and when features are conditionally independent given the class.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Target:</strong> Classification only</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Features:</strong> 1+ numeric/categorical</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Sample size:</strong> 50+ observations</span></li>
                                </ul>
                            </div>
                            <div><h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Class probabilities:</strong> P(class|features)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Prior probabilities:</strong> P(class)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span><strong>Metrics:</strong> Accuracy, F1, AUC, etc.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><Brain className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface NaiveBayesPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function NaiveBayesAnalysisPage({ data, allHeaders, onLoadExample }: NaiveBayesPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [targetCol, setTargetCol] = useState<string | undefined>();
    const [featureCols, setFeatureCols] = useState<string[]>([]);
    const [nbType, setNbType] = useState('gaussian');
    const [varSmoothing, setVarSmoothing] = useState(-9); // log10 scale
    const [alpha, setAlpha] = useState(1.0);
    const [fitPrior, setFitPrior] = useState(true);
    const [testSize, setTestSize] = useState(0.2);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    // Modal states
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
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `NaiveBayes_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csv = `NAIVE BAYES ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\nNB Type,${analysisResult.parameters.nb_type}\nN Samples,${analysisResult.n_samples}\nN Features,${analysisResult.n_features}\nN Classes,${analysisResult.n_classes}\n\nCLASS PRIORS\n`;
        csv += Object.entries(analysisResult.class_priors).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nMETRICS\n`;
        csv += Object.entries(analysisResult.metrics).map(([k, v]) => `${k},${v}`).join('\n');
        csv += `\n\nFEATURE IMPORTANCE\n` + Papa.unparse(analysisResult.feature_importance);
        csv += `\n\nCV RESULTS\nMean,${analysisResult.cv_results.cv_mean}\nStd,${analysisResult.cv_results.cv_std}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `NaiveBayes_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/naive-bayes-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult, targetCol, featureCols, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `NaiveBayes_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, targetCol, featureCols, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!targetCol || featureCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select target and features.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/naive-bayes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target_col: targetCol, feature_cols: featureCols, test_size: testSize, nb_type: nbType, var_smoothing: Math.pow(10, varSmoothing), alpha, fit_prior: fitPrior }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Training Complete', description: `Acc: ${(result.metrics.accuracy * 100).toFixed(1)}%` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetCol, featureCols, testSize, nbType, varSmoothing, alpha, fitPrior, toast]);

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

    const ParamSlider = ({ label, value, onChange, min, max, step, unit = '', displayValue }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string; displayValue?: string }) => (
        <div className="space-y-2"><div className="flex justify-between"><Label className="text-sm">{label}</Label><Badge variant="outline">{displayValue ?? value}{unit}</Badge></div><Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} /></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <NaiveBayesGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Naive Bayes Analysis</h1>
                    <p className="text-muted-foreground mt-1">Probabilistic classification</p>
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
                                <div className="space-y-3"><Label>Naive Bayes Type</Label><Select value={nbType} onValueChange={setNbType}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gaussian">Gaussian NB</SelectItem><SelectItem value="multinomial">Multinomial NB</SelectItem><SelectItem value="bernoulli">Bernoulli NB</SelectItem></SelectContent></Select></div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Naive Bayes Parameters</CardTitle><CardDescription>Configure hyperparameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {nbType === 'gaussian' ? (
                                    <ParamSlider label="var_smoothing (log₁₀)" value={varSmoothing} onChange={setVarSmoothing} min={-15} max={-1} step={1} displayValue={`1e${varSmoothing}`} />
                                ) : (
                                    <ParamSlider label="alpha (Laplace smoothing)" value={alpha} onChange={setAlpha} min={0} max={10} step={0.1} />
                                )}
                                <ParamSlider label="test_size" value={testSize} onChange={setTestSize} min={0.1} max={0.4} step={0.05} unit="%" />
                                <div className="space-y-3">
                                    <Label>Fit Prior</Label>
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="fit-prior" checked={fitPrior} onCheckedChange={(c) => setFitPrior(!!c)} />
                                        <label htmlFor="fit-prior" className="text-sm">Learn class prior probabilities from data</label>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label>NB Type</Label>
                                    <Select value={nbType} onValueChange={setNbType}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gaussian">Gaussian NB</SelectItem>
                                            <SelectItem value="multinomial">Multinomial NB</SelectItem>
                                            <SelectItem value="bernoulli">Bernoulli NB</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><p className="text-sm text-muted-foreground flex items-start gap-2"><Lightbulb className="w-4 h-4 text-sky-600 mt-0.5" /><span><strong>Gaussian:</strong> For continuous features. <strong>Multinomial:</strong> For count data (text). <strong>Bernoulli:</strong> For binary features. Alpha controls smoothing to prevent zero probabilities.</span></p></div>
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
                            <div className="p-4 bg-muted/50 rounded-xl"><h4 className="font-medium text-sm mb-2">Training Configuration</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div><span className="text-muted-foreground">NB Type:</span> {nbType}</div><div><span className="text-muted-foreground">{nbType === 'gaussian' ? 'Smoothing:' : 'Alpha:'}</span> {nbType === 'gaussian' ? `1e${varSmoothing}` : alpha}</div><div><span className="text-muted-foreground">Fit Prior:</span> {fitPrior ? 'Yes' : 'No'}</div><div><span className="text-muted-foreground">Features:</span> {featureCols.length}</div></div></div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><Brain className="w-5 h-5 text-sky-600" /><p className="text-sm text-muted-foreground">Naive Bayes will calculate P(class|features) using Bayes' theorem with conditional independence assumption.</p></div>
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
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{results.n_classes}-class classification with {results.n_features} features</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• Model achieved <strong>{(mainMetric * 100).toFixed(1)}% accuracy</strong> on test data ({results.n_test} samples).</p>
                                        <p className="text-sm">• Detected <strong>{results.n_classes}</strong> classes with {results.parameters.nb_type} Naive Bayes.</p>
                                        <p className="text-sm">• Most discriminative feature: <strong>{topFeature?.feature}</strong> ({(topFeature?.importance * 100).toFixed(1)}% importance).</p>
                                        <p className="text-sm">• Cross-validation: <strong>{(results.cv_results.cv_mean * 100).toFixed(1)}%</strong> ± {(results.cv_results.cv_std * 100).toFixed(1)}% ({results.cv_results.cv_folds}-fold).</p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div><p className="font-semibold">{isGood ? "Strong Probabilistic Model!" : "Moderate Performance"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? "The model shows good classification ability. Probability outputs can be used for decision thresholds." : "Consider checking feature independence, trying different NB types, or adding more features."}</p></div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• Accuracy: {(mainMetric * 100).toFixed(1)}% — {isGood ? 'strong performance' : 'room for improvement'}</p><p>• CV stability: {results.cv_results.cv_std < 0.05 ? 'low variance, consistent' : 'some variance across folds'}</p><p>• Train vs Test gap: {((results.metrics.train_accuracy || 0) - mainMetric).toFixed(3)} — {Math.abs((results.metrics.train_accuracy || 0) - mainMetric) < 0.1 ? 'good generalization' : 'possible overfitting'}</p></div></div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Quality:</span>{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (mainMetric >= 0.9 ? 5 : mainMetric >= 0.8 ? 4 : mainMetric >= 0.7 ? 3 : mainMetric >= 0.6 ? 2 : 1) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const mainMetric = results.metrics.accuracy;
                    const isGood = mainMetric >= 0.8;
                    const nbTypeDesc: Record<string, string> = {
                        gaussian: 'assumes features follow a Gaussian (normal) distribution within each class',
                        multinomial: 'models features as counts, ideal for text classification with word frequencies',
                        bernoulli: 'treats features as binary indicators, good for document presence/absence features'
                    };
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding Naive Bayes performance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div><div><h4 className="font-semibold mb-1">How Naive Bayes Works</h4><p className="text-sm text-muted-foreground">Naive Bayes applies Bayes' theorem with a "naive" assumption that features are conditionally independent given the class. It calculates P(class|features) ∝ P(class) × ∏P(feature|class). Your {results.parameters.nb_type} NB {nbTypeDesc[results.parameters.nb_type]}.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div><div><h4 className="font-semibold mb-1">Class Prior Probabilities</h4><p className="text-sm text-muted-foreground">Prior probabilities: {Object.entries(results.class_priors).map(([cls, prior]) => `P(${cls}) = ${(prior * 100).toFixed(1)}%`).join(', ')}. These represent the baseline likelihood of each class before seeing any features.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div><div><h4 className="font-semibold mb-1">Cross-Validation</h4><p className="text-sm text-muted-foreground">CV score of {(results.cv_results.cv_mean * 100).toFixed(1)}% ± {(results.cv_results.cv_std * 100).toFixed(1)}% shows {results.cv_results.cv_std < 0.05 ? 'stable performance across different data splits' : 'some variability — may be sensitive to specific samples'}. This validates the model's reliability.</p></div></div></div>
                                <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div><div><h4 className="font-semibold mb-1">Practical Application</h4><p className="text-sm text-muted-foreground">{isGood ? `This model can reliably classify new instances. Use predict_proba() to get probability estimates for each class, useful for setting decision thresholds.` : `Consider: (1) checking if feature independence assumption holds, (2) trying different NB types (${results.parameters.nb_type === 'gaussian' ? 'multinomial or bernoulli' : 'gaussian'}), (3) feature engineering to reduce correlations.`}</p></div></div></div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Fast & Probabilistic</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Room for Improvement</>}</h4><p className="text-sm text-muted-foreground">{isGood ? `Your Naive Bayes model achieves ${(mainMetric * 100).toFixed(1)}% accuracy with probabilistic outputs for confident predictions.` : `Current accuracy of ${(mainMetric * 100).toFixed(1)}% suggests the independence assumption may be violated or features need transformation.`}</p></div>
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
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Naive Bayes Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{results.parameters.nb_type} | {results.n_classes} classes | n = {results.n_samples} | {new Date().toLocaleDateString()}</p></div>
                            
                            <StatisticalSummaryCards results={results} />

                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="w-5 h-5" />Class Prior Probabilities</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(results.class_priors).map(([cls, prior]) => (
                                            <div key={cls} className="text-center p-4 bg-muted/50 rounded-lg">
                                                <p className="text-2xl font-bold text-primary">{(prior * 100).toFixed(1)}%</p>
                                                <p className="text-sm text-muted-foreground">P({cls})</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A {results.parameters.nb_type} Naive Bayes classifier was trained to predict <em>{targetCol}</em> using {results.n_features} features.
                                                The dataset included <em>N</em> = {results.n_samples} observations with {results.n_classes} classes, split into {results.n_train} training and {results.n_test} test samples
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
                                                The most discriminative predictor was <em>{results.feature_importance[0]?.feature}</em> ({(results.feature_importance[0]?.importance * 100).toFixed(1)}% importance).
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card><CardHeader><CardTitle>Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="confusion" className="w-full"><TabsList className="grid w-full grid-cols-5"><TabsTrigger value="confusion">Confusion</TabsTrigger><TabsTrigger value="roc">ROC</TabsTrigger><TabsTrigger value="importance">Importance</TabsTrigger><TabsTrigger value="priors">Priors</TabsTrigger><TabsTrigger value="distribution">Distribution</TabsTrigger></TabsList><TabsContent value="confusion" className="mt-4">{results.cm_plot ? <Image src={`data:image/png;base64,${results.cm_plot}`} alt="Confusion" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="roc" className="mt-4">{results.roc_plot ? <Image src={`data:image/png;base64,${results.roc_plot}`} alt="ROC" width={600} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="importance" className="mt-4">{results.importance_plot ? <Image src={`data:image/png;base64,${results.importance_plot}`} alt="Importance" width={700} height={500} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="priors" className="mt-4">{results.prior_plot ? <Image src={`data:image/png;base64,${results.prior_plot}`} alt="Priors" width={700} height={400} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent><TabsContent value="distribution" className="mt-4">{results.prob_dist_plot ? <Image src={`data:image/png;base64,${results.prob_dist_plot}`} alt="Distribution" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center py-8">No chart</p>}</TabsContent></Tabs></CardContent></Card>

                            <Card><CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="w-48">Bar</TableHead></TableRow></TableHeader><TableBody>{results.feature_importance.slice(0, 15).map((f, i) => (<TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{f.feature}</TableCell><TableCell className="text-right font-mono">{(f.importance * 100).toFixed(2)}%</TableCell><TableCell><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${f.importance * 100}%` }} /></div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            <Card><CardHeader><CardTitle>Per-Class Metrics</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Precision</TableHead><TableHead className="text-right">Recall</TableHead><TableHead className="text-right">F1</TableHead><TableHead className="text-right">Support</TableHead></TableRow></TableHeader><TableBody>{results.per_class_metrics.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.class}</TableCell><TableCell className="text-right font-mono">{(c.precision * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.recall * 100).toFixed(1)}%</TableCell><TableCell className="text-right font-mono">{(c.f1_score * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{c.support}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(results.parameters).map(([k, v]) => (<div key={k} className="p-2 bg-muted/50 rounded text-center"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-semibold">{v === null ? 'None' : typeof v === 'number' ? (v < 0.001 ? v.toExponential(1) : v % 1 === 0 ? v : v.toFixed(4)) : String(v)}</p></div>))}</div></CardContent></Card>

                            <Card><CardHeader><CardTitle>Cross-Validation Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>CV Mean</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_mean * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">Average across {results.cv_results.cv_folds} folds</TableCell></TableRow><TableRow><TableCell>CV Std</TableCell><TableCell className="text-right font-mono">{(results.cv_results.cv_std * 100).toFixed(2)}%</TableCell><TableCell className="text-muted-foreground">{results.cv_results.cv_std < 0.03 ? 'Very stable' : results.cv_results.cv_std < 0.05 ? 'Stable' : 'Some variance'}</TableCell></TableRow><TableRow><TableCell>Folds</TableCell><TableCell className="text-right font-mono">{results.cv_results.cv_folds}</TableCell><TableCell className="text-muted-foreground">Number of CV iterations</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Training Naive Bayes model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
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