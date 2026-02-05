'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, GitBranch, Terminal, HelpCircle, Settings, FileSearch, BarChart, BrainCircuit, CheckCircle, TrendingUp, BookOpen, Target, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, Info, ArrowRight, ChevronDown, FileText, Sparkles, AlertTriangle, BarChart3, FileType, FileCode, Code, Copy, Activity, Hash, Layers } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/gradient_boosting.py?alt=media";

// GBM metric definitions for glossary
const gbmMetricDefinitions: Record<string, string> = {
    // Regression metrics
    r2_score: "R-squared (Coefficient of Determination). The proportion of variance in the target explained by the model. Ranges from 0 to 1, where 1 is perfect.",
    mse: "Mean Squared Error. The average of squared differences between predictions and actual values. Lower is better.",
    rmse: "Root Mean Squared Error. Square root of MSE, in the same units as the target variable. Lower is better.",
    mae: "Mean Absolute Error. The average absolute difference between predictions and actual values. Lower is better.",
    
    // Classification metrics
    accuracy: "The proportion of correct predictions out of all predictions. Ranges from 0 to 1.",
    precision: "Of all positive predictions, the proportion that were actually correct. High precision means few false positives.",
    recall: "Of all actual positives, the proportion that were correctly identified. High recall means few false negatives.",
    f1_score: "The harmonic mean of precision and recall. Balances both metrics, useful for imbalanced classes.",
    
    // GBM-specific parameters
    n_estimators: "The number of boosting stages (trees) to perform. More trees can improve performance but increase training time and risk overfitting.",
    learning_rate: "Shrinks the contribution of each tree. Lower values require more trees but often achieve better generalization. Typical range: 0.01-0.3.",
    max_depth: "Maximum depth of individual trees. Controls model complexity. Shallow trees (2-5) reduce overfitting.",
    min_samples_split: "Minimum samples required to split a node. Higher values prevent learning overly specific patterns.",
    min_samples_leaf: "Minimum samples required in a leaf node. Acts as regularization.",
    subsample: "Fraction of samples used for fitting each tree. Values < 1.0 enable stochastic gradient boosting.",
    
    // Boosting concepts
    gradient_descent: "Optimization algorithm that minimizes loss by iteratively moving in the direction of steepest descent.",
    residuals: "The difference between actual and predicted values. Each new tree in GBM fits these residuals.",
    shrinkage: "Another term for learning rate. Reduces the impact of each tree to improve generalization.",
    ensemble: "A combination of multiple models (trees) whose predictions are aggregated for the final output.",
    
    // Feature importance
    feature_importance: "Measures how much each feature contributes to predictions. Based on how often features are used in splits and their impact on reducing loss.",
    gini_importance: "Importance based on the total reduction of the Gini impurity brought by that feature.",
    permutation_importance: "Measures the decrease in model performance when a feature's values are randomly shuffled.",
    
    // General terms
    overfitting: "When a model learns noise in training data and performs poorly on new data. Prevented by regularization and validation.",
    regularization: "Techniques to prevent overfitting by constraining model complexity (max_depth, min_samples, learning_rate).",
    cross_validation: "Technique to assess model performance by training on subsets of data and validating on held-out portions."
};

interface GbmResults {
    metrics: any;
    feature_importance: { [key: string]: number };
    prediction_examples: any[];
    interpretation?: string;
}

interface FullAnalysisResponse {
    results: GbmResults;
    plot: string;
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

const getR2Interpretation = (r2: number) => {
    if (r2 >= 0.90) return { label: 'Excellent', desc: 'excellent fit' };
    if (r2 >= 0.70) return { label: 'Good', desc: 'good fit' };
    if (r2 >= 0.50) return { label: 'Moderate', desc: 'moderate fit' };
    return { label: 'Weak', desc: 'weak fit' };
};

const getAccuracyInterpretation = (acc: number) => {
    if (acc >= 0.90) return { label: 'Excellent', desc: 'excellent classification' };
    if (acc >= 0.80) return { label: 'Good', desc: 'good classification' };
    if (acc >= 0.70) return { label: 'Fair', desc: 'fair classification' };
    return { label: 'Poor', desc: 'poor classification' };
};

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
        link.download = 'gradient_boosting.py';
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
                        Python Code - Gradient Boosting Machine
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
                        GBM Statistical Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of metrics and terms used in Gradient Boosting Machine analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Regression Metrics */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Regression Metrics
                            </h3>
                            <div className="space-y-3">
                                {['r2_score', 'mse', 'rmse', 'mae'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium uppercase">{term.replace('_', ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{gbmMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Classification Metrics */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Classification Metrics
                            </h3>
                            <div className="space-y-3">
                                {['accuracy', 'precision', 'recall', 'f1_score'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace('_', ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{gbmMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* GBM Parameters */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                GBM Parameters
                            </h3>
                            <div className="space-y-3">
                                {['n_estimators', 'learning_rate', 'max_depth', 'min_samples_split', 'min_samples_leaf', 'subsample'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium">{term}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{gbmMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Boosting Concepts */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Boosting Concepts
                            </h3>
                            <div className="space-y-3">
                                {['gradient_descent', 'residuals', 'shrinkage', 'ensemble'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace('_', ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{gbmMetricDefinitions[term]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Feature Importance */}
                        <div>
                            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                                <BarChart className="w-4 h-4" />
                                Feature Importance
                            </h3>
                            <div className="space-y-3">
                                {['feature_importance', 'gini_importance', 'permutation_importance'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{gbmMetricDefinitions[term]}</p>
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
                                {['overfitting', 'regularization', 'cross_validation'].map(term => (
                                    <div key={term} className="border-b pb-2">
                                        <h4 className="font-medium capitalize">{term.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{gbmMetricDefinitions[term]}</p>
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

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, problemType, nEstimators }: { results: GbmResults; problemType: string; nEstimators: number }) => {
    if (problemType === 'regression') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">R²</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.r2_score?.toFixed(4)}</p><p className="text-xs text-muted-foreground">{getR2Interpretation(results.metrics.r2_score).label}</p></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">MSE</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.mse?.toFixed(2)}</p><p className="text-xs text-muted-foreground">Mean squared error</p></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RMSE</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.rmse?.toFixed(2)}</p><p className="text-xs text-muted-foreground">Root MSE</p></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Trees</p><GitBranch className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{nEstimators}</p><p className="text-xs text-muted-foreground">Ensemble size</p></div></CardContent></Card>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Accuracy</p><CheckCircle className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.metrics.accuracy * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">{getAccuracyInterpretation(results.metrics.accuracy).label}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Precision</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.classification_report ? (Object.values(results.metrics.classification_report).filter((v: any) => typeof v === 'object' && v.precision).reduce((s: number, v: any) => s + v.precision, 0) / Object.values(results.metrics.classification_report).filter((v: any) => typeof v === 'object').length * 100).toFixed(1) : 'N/A'}%</p><p className="text-xs text-muted-foreground">Avg precision</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Recall</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.metrics.classification_report ? (Object.values(results.metrics.classification_report).filter((v: any) => typeof v === 'object' && v.recall).reduce((s: number, v: any) => s + v.recall, 0) / Object.values(results.metrics.classification_report).filter((v: any) => typeof v === 'object').length * 100).toFixed(1) : 'N/A'}%</p><p className="text-xs text-muted-foreground">Avg recall</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Trees</p><GitBranch className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{nEstimators}</p><p className="text-xs text-muted-foreground">Ensemble size</p></div></CardContent></Card>
        </div>
    );
};


const GradientBoostingGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Gradient Boosting Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is GBM */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" />
                What is Gradient Boosting?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Gradient Boosting Machine (GBM) is a powerful <strong>ensemble learning</strong> method that 
                builds models <strong>sequentially</strong>. Each new tree corrects the errors (residuals) 
                of the previous trees using gradient descent optimization.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>How it works:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Fit a simple model (tree) to the data<br/>
                    2. Calculate residuals (errors)<br/>
                    3. Fit a new tree to predict the residuals<br/>
                    4. Add new tree to ensemble (scaled by learning rate)<br/>
                    5. Repeat for n_estimators iterations<br/>
                    <br/>
                    Final prediction = sum of all tree predictions
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* GBM vs Random Forest */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                GBM vs Random Forest
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Gradient Boosting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Trees built <strong>sequentially</strong></li>
                    <li>• Each tree corrects previous errors</li>
                    <li>• Uses <strong>gradient descent</strong></li>
                    <li>• Shallow trees (depth 3-5)</li>
                    <li>• Learning rate controls contribution</li>
                    <li>• Often <strong>higher accuracy</strong></li>
                    <li>• Slower, more prone to overfitting</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Random Forest</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Trees built <strong>in parallel</strong></li>
                    <li>• Each tree is independent</li>
                    <li>• Uses <strong>bagging + random features</strong></li>
                    <li>• Deeper trees (unrestricted)</li>
                    <li>• Averaging reduces variance</li>
                    <li>• More <strong>robust to overfitting</strong></li>
                    <li>• Faster, easier to tune</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>When to choose:</strong> Use GBM when you need maximum accuracy and have time 
                  to tune. Use Random Forest for a quick, robust baseline that's less sensitive to hyperparameters.
                </p>
              </div>
            </div>

            <Separator />

            {/* Key Parameters */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Key Parameters
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">n_estimators (Number of Trees)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How many boosting stages (trees) to train.
                    <br/><strong>50-100:</strong> Good starting point
                    <br/><strong>100-500:</strong> More complex patterns
                    <br/><strong>500+:</strong> Diminishing returns, risk of overfitting
                    <br/>• More trees = longer training time
                    <br/>• Use early stopping to find optimal number
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">learning_rate (Shrinkage)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scales the contribution of each tree. <strong>Most important parameter!</strong>
                    <br/><strong>0.01-0.05:</strong> Conservative, needs many trees
                    <br/><strong>0.05-0.1:</strong> Good balance (recommended start)
                    <br/><strong>0.1-0.3:</strong> Faster learning, fewer trees needed
                    <br/>• Lower rate + more trees = better generalization
                    <br/>• Trade-off: lower rate needs more training time
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">max_depth (Tree Depth)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum depth of each tree. GBM works best with <strong>shallow trees</strong>.
                    <br/><strong>2-3:</strong> Simple interactions
                    <br/><strong>3-5:</strong> Typical choice
                    <br/><strong>5-8:</strong> Complex interactions (risk of overfitting)
                    <br/>• Deeper trees can capture more complex patterns
                    <br/>• But also memorize noise more easily
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">subsample (Stochastic GBM)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fraction of samples used for each tree.
                    <br/><strong>1.0:</strong> Use all samples (deterministic)
                    <br/><strong>0.5-0.8:</strong> Stochastic gradient boosting
                    <br/>• Values &lt; 1.0 add randomness, reduce overfitting
                    <br/>• Also speeds up training
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">min_samples_split / min_samples_leaf</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Regularization through minimum sample requirements.
                    <br/><strong>min_samples_split:</strong> Min samples to split a node (default: 2)
                    <br/><strong>min_samples_leaf:</strong> Min samples in leaf nodes (default: 1)
                    <br/>• Higher values = more regularization, simpler trees
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
                    n_estimators=100, learning_rate=0.1, max_depth=3
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                    Fix learning_rate, tune n_estimators
                  </p>
                  <p className="text-xs text-muted-foreground">
                    With fixed learning_rate, find optimal n_estimators using cross-validation or early stopping.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                    Tune tree parameters
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adjust max_depth, min_samples_split, min_samples_leaf to control complexity.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">4</span>
                    Lower learning_rate, increase n_estimators
                  </p>
                  <p className="text-xs text-muted-foreground">
                    For final improvement: halve learning_rate, double n_estimators. Repeat if beneficial.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Overfitting */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Preventing Overfitting
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Warning Signs:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Training score much higher than validation score</li>
                    <li>• Performance degrades with more trees</li>
                    <li>• High variance in cross-validation scores</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Solutions:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Lower learning_rate</strong> — most effective</li>
                    <li>• <strong>Reduce max_depth</strong> — simpler trees</li>
                    <li>• <strong>Use subsample &lt; 1.0</strong> — adds randomness</li>
                    <li>• <strong>Increase min_samples_split/leaf</strong></li>
                    <li>• <strong>Early stopping</strong> — stop when validation stops improving</li>
                    <li>• <strong>Fewer n_estimators</strong> — less complex model</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Feature Importance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how much each feature reduces the loss function.
                    <br/>• Based on how often a feature is used in splits
                    <br/>• And how much it improves predictions
                    <br/>• Sum of all importances = 1.0
                    <br/>• Higher = more important for predictions
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Learning Curve</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows error vs number of trees.
                    <br/>• Training error should decrease steadily
                    <br/>• Validation error should decrease, then plateau
                    <br/>• If validation rises while training falls → overfitting
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Performance Metrics</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Regression:</strong> R² (explained variance), RMSE (error magnitude)
                    <br/><strong>Classification:</strong> Accuracy, Precision, Recall, F1
                    <br/>• Compare train vs test performance
                    <br/>• Large gap indicates overfitting
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
                    <li>• Use cross-validation for tuning</li>
                    <li>• Start with lower learning_rate</li>
                    <li>• Monitor train vs validation gap</li>
                    <li>• Consider early stopping</li>
                    <li>• Handle missing values first</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Set n_estimators too high without early stopping</li>
                    <li>• Use very deep trees (max_depth &gt; 8)</li>
                    <li>• Ignore feature scaling (usually OK, but check)</li>
                    <li>• Forget to shuffle data</li>
                    <li>• Tune on test set (use validation set)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> GBM is powerful but requires careful tuning. 
                The learning_rate is the most important parameter — lower rates with more trees generally 
                give better results but take longer to train. Always use cross-validation to evaluate 
                performance and watch for overfitting. For a quick, robust model, start with Random Forest; 
                for maximum accuracy with tuning time, use GBM.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const gbmExample = exampleDatasets.find(d => d.id === 'gbm-regression');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><BrainCircuit className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Gradient Boosting Machine</CardTitle>
                    <CardDescription className="text-base mt-2">Build powerful ensemble models with sequential decision trees</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Sequential Learning</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Each tree learns from previous trees' mistakes</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChart className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">High Accuracy</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Often outperforms other algorithms</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Settings className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Flexible</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Works for regression and classification</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />How It Works</h3>
                        <p className="text-sm text-muted-foreground mb-4">GBM builds trees sequentially, where each tree focuses on correcting errors from previous trees through gradient descent optimization.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Key Parameters</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• <strong>n_estimators:</strong> Number of trees</li>
                                    <li>• <strong>learning_rate:</strong> Shrinkage factor</li>
                                    <li>• <strong>max_depth:</strong> Tree depth limit</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Output</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• Model performance metrics</li>
                                    <li>• Feature importance rankings</li>
                                    <li>• Prediction examples</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {gbmExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(gbmExample)} size="lg"><TrendingUp className="mr-2" />Load Sample Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface GbmPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GbmPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: GbmPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [problemType, setProblemType] = useState<'regression' | 'classification'>('regression');
    const [target, setTarget] = useState<string>('');
    const [features, setFeatures] = useState<string[]>([]);
    
    const [nEstimators, setNEstimators] = useState(100);
    const [learningRate, setLearningRate] = useState(0.1);
    const [maxDepth, setMaxDepth] = useState(3);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => {
            const uniqueValues = new Set(data.map(row => row[h]).filter(v => v != null && v !== ''));
            return uniqueValues.size === 2;
        });
    }, [data, allHeaders]);

    const targetOptions = useMemo(() => {
        return problemType === 'regression' ? numericHeaders : binaryCategoricalHeaders;
    }, [problemType, numericHeaders, binaryCategoricalHeaders]);
    
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== target), [allHeaders, target]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'Target variable selected', 
            passed: target !== '', 
            detail: target ? `Target: ${target}` : 'Please select a target variable' 
        });
        
        checks.push({ 
            label: 'Feature variables selected', 
            passed: features.length >= 1, 
            detail: features.length >= 1 ? `${features.length} features selected` : 'Select at least one feature' 
        });
        
        checks.push({ 
            label: 'Sufficient sample size', 
            passed: data.length >= 50, 
            detail: `n = ${data.length} observations (recommended: 50+)` 
        });
        
        checks.push({ 
            label: 'Adequate samples per tree', 
            passed: data.length / nEstimators >= 0.5, 
            detail: `${(data.length / nEstimators).toFixed(1)} samples per tree` 
        });
        
        return checks;
    }, [data, target, features, nEstimators]);

    const allValidationsPassed = useMemo(() => {
        const criticalChecks = dataValidation.filter(c => 
            c.label === 'Target variable selected' || c.label === 'Feature variables selected'
        );
        return criticalChecks.every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0) {
            setView('intro');
        } else if (canRun) {
            const newTargetOptions = problemType === 'regression' ? numericHeaders : binaryCategoricalHeaders;
            if (!target || !newTargetOptions.includes(target)) {
                const defaultTarget = newTargetOptions[0] || '';
                setTarget(defaultTarget);
                if (defaultTarget) setFeatures(allHeaders.filter(h => h !== defaultTarget));
            }
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, allHeaders, problemType, numericHeaders, binaryCategoricalHeaders, canRun]);

    const goToStep = (step: Step) => { 
        setCurrentStep(step); 
        if (step > maxReachedStep) setMaxReachedStep(step); 
    };
    
    const nextStep = () => { 
        if (currentStep === 3) { 
            handleAnalysis(); 
        } else if (currentStep < 6) { 
            goToStep((currentStep + 1) as Step); 
        } 
    };
    
    const prevStep = () => { 
        if (currentStep > 1) goToStep((currentStep - 1) as Step); 
    };

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== header));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `GBM_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { 
            toast({ variant: 'destructive', title: "Download failed" }); 
        } finally { 
            setIsDownloading(false); 
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "GRADIENT BOOSTING MACHINE\n";
        csvContent += `Target: ${target}\nType: ${problemType}\nTrees: ${nEstimators}\n\n`;
        if (problemType === 'regression') {
            csvContent += `R²: ${results.metrics.r2_score}\nRMSE: ${results.metrics.rmse}\n\n`;
        } else {
            csvContent += `Accuracy: ${results.metrics.accuracy}\n\n`;
        }
        csvContent += "FEATURE IMPORTANCE\n";
        const featureData = Object.entries(results.feature_importance).map(([f, i]) => ({ Feature: f, Importance: i }));
        csvContent += Papa.unparse(featureData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `GBM_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, target, problemType, nEstimators, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Please select target and features.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/gradient-boosting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target, features, problemType, nEstimators, learningRate, maxDepth })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') {
                    errorMsg = errorResult.detail;
                } else if (Array.isArray(errorResult.detail)) {
                    errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                } else if (errorResult.error) {
                    errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                }
                throw new Error(errorMsg);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) {
                const errMsg = typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error);
                throw new Error(errMsg);
            }
            
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'GBM Training Complete', description: 'Results are ready.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, problemType, nEstimators, learningRate, maxDepth, toast]);

    const handleLoadExample = (example: ExampleDataSet) => {
        onLoadExample(example);
        if (example.id.includes('regression')) setProblemType('regression');
        else setProblemType('classification');
    };

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={handleLoadExample} />;
    }

    const results = analysisResult?.results;
    const topFeatures = results ? Object.entries(results.feature_importance).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3) : [];

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!analysisResult);
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
                    return (
                        <button 
                            key={step.id} 
                            onClick={() => isClickable && goToStep(step.id as Step)} 
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 transition-all ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 
                                ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
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
            <GradientBoostingGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Gradient Boosting Machine</h1>
                    <p className="text-muted-foreground mt-1">Sequential ensemble learning</p>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose target and feature variables</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Problem Type</Label>
                                    <Select value={problemType} onValueChange={(v) => setProblemType(v as 'regression' | 'classification')}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="regression">Regression</SelectItem>
                                            <SelectItem value="classification">Classification</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Target Variable</Label>
                                    <Select value={target} onValueChange={setTarget}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select target" /></SelectTrigger>
                                        <SelectContent>{targetOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Feature Variables</Label>
                                    <ScrollArea className="h-40 border rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {featureOptions.map(h => (
                                                <div key={h} className="flex items-center space-x-2">
                                                    <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, !!c)} />
                                                    <label htmlFor={`feat-${h}`} className="text-sm cursor-pointer">{h}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <p className="text-xs text-muted-foreground">{features.length} features selected</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Model Settings</CardTitle>
                                    <CardDescription>Configure GBM hyperparameters</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Number of Estimators</Label>
                                    <Input type="number" value={nEstimators} onChange={(e) => setNEstimators(Number(e.target.value))} className="h-11" />
                                    <p className="text-xs text-muted-foreground">Sequential trees to build</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Learning Rate</Label>
                                    <Input type="number" value={learningRate} step="0.01" onChange={(e) => setLearningRate(Number(e.target.value))} className="h-11" />
                                    <p className="text-xs text-muted-foreground">Shrinkage factor (0.01-1.0)</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Max Depth</Label>
                                    <Input type="number" value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} className="h-11" />
                                    <p className="text-xs text-muted-foreground">Maximum tree depth</p>
                                </div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Target:</strong> {target || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Features:</strong> {features.length} selected</p>
                                    <p>• <strong className="text-foreground">Type:</strong> {problemType}</p>
                                    <p>• <strong className="text-foreground">Ensemble:</strong> {nEstimators} trees, depth {maxDepth}, η = {learningRate}</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />
                                    Tips
                                </h4>
                                <p className="text-sm text-muted-foreground">Lower learning rate + more trees = better generalization but slower training. Start with defaults and tune based on results.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking if your data is ready for analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <BrainCircuit className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">GBM will train {nEstimators} sequential trees with learning rate {learningRate} and max depth {maxDepth}.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Training...</> : <>Train Model<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const isGoodModel = problemType === 'regression' 
                        ? results.metrics.r2_score >= 0.70 
                        : results.metrics.accuracy >= 0.80;
                    const r2 = results.metrics.r2_score;
                    const accuracy = results.metrics.accuracy;
                    const rmse = results.metrics.rmse;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>GBM performance for predicting {target}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGoodModel ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isGoodModel ? 'text-primary' : 'text-amber-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGoodModel ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                {problemType === 'regression' 
                                                    ? <>The model explains <strong>{(r2 * 100).toFixed(0)}%</strong> of {target} variation. {r2 >= 0.8 ? 'Excellent predictive power!' : r2 >= 0.6 ? 'Good predictive ability.' : 'Room for improvement.'}</>
                                                    : <>The model correctly classifies <strong>{(accuracy * 100).toFixed(0)}%</strong> of cases. {accuracy >= 0.85 ? 'Excellent performance!' : accuracy >= 0.7 ? 'Good performance.' : 'Needs improvement.'}</>}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGoodModel ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                The most important variable is <strong>{topFeatures[0]?.[0]}</strong> (importance: {((topFeatures[0]?.[1] as number) * 100).toFixed(1)}%). This variable has the biggest impact on predictions.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isGoodModel ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                            <p className="text-sm">
                                                {nEstimators} trees were trained sequentially, each learning from previous errors.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGoodModel ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGoodModel ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGoodModel ? "Strong Model Performance!" : "Model Needs Tuning"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGoodModel 
                                                    ? "GBM learned the data patterns well. Ready for predictions."
                                                    : "Consider adjusting hyperparameters or adding more features."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Summary */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {problemType === 'regression' ? (
                                            <>
                                                <p>• <strong>Explanatory Power (R²):</strong> {r2?.toFixed(4)} — explains {(r2 * 100).toFixed(1)}% of {target} variation</p>
                                                <p>• <strong>Average Error (RMSE):</strong> {rmse?.toFixed(4)} — typical prediction error</p>
                                            </>
                                        ) : (
                                            <>
                                                <p>• <strong>Accuracy:</strong> {(accuracy * 100).toFixed(1)}% — correctly classified cases</p>
                                                {results.metrics.precision && <p>• <strong>Precision/Recall:</strong> {(results.metrics.precision * 100).toFixed(1)}% / {(results.metrics.recall * 100).toFixed(1)}%</p>}
                                            </>
                                        )}
                                        <p>• <strong>Model Complexity:</strong> {nEstimators} trees, learning rate {learningRate}, max depth {maxDepth}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Model Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = problemType === 'regression' 
                                            ? (r2 >= 0.9 ? 5 : r2 >= 0.8 ? 4 : r2 >= 0.7 ? 3 : r2 >= 0.5 ? 2 : 1)
                                            : (accuracy >= 0.9 ? 5 : accuracy >= 0.8 ? 4 : accuracy >= 0.7 ? 3 : accuracy >= 0.6 ? 2 : 1);
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Why This Conclusion?</CardTitle>
                                    <CardDescription>Understanding how gradient boosting works</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">How GBM Works</h4>
                                        <p className="text-sm text-muted-foreground">
                                            GBM builds <strong className="text-foreground">{nEstimators} decision trees</strong> one after another. 
                                            Each new tree focuses on the <strong className="text-foreground">errors</strong> made by previous trees, gradually improving predictions.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Learning Rate Effect</h4>
                                        <p className="text-sm text-muted-foreground">
                                            With learning rate <strong className="text-foreground">{learningRate}</strong>, each tree contributes a fraction of its prediction. 
                                            {learningRate <= 0.1 ? " This conservative approach helps prevent overfitting." : " Higher values learn faster but risk overfitting."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Most Important Features</h4>
                                        <p className="text-sm text-muted-foreground">
                                            The model relies most on:
                                            {topFeatures.map((f, i) => (
                                                <span key={f[0] as string}><strong className="text-foreground"> {f[0]}</strong> ({((f[1] as number) * 100).toFixed(1)}%){i < topFeatures.length - 1 ? ',' : '.'}</span>
                                            ))}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Practical Use</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {problemType === 'regression' 
                                                ? `The model explains ${(results.metrics.r2_score * 100).toFixed(0)}% of ${target} variance. Use it to predict values for new observations.`
                                                : `The model correctly classifies ${(results.metrics.accuracy * 100).toFixed(0)}% of cases. Use it to predict ${target} for new data.`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Focus on <strong>{topFeatures[0]?.[0]}</strong> for maximum impact on {target}. 
                                    {problemType === 'regression' && results.metrics.r2_score < 0.7 
                                        ? " Consider adding more features or tuning parameters to improve performance."
                                        : " The model is ready for production use."}
                                </p>
                            </div>

                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><Info className="w-4 h-4" />Performance Guide</h4>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;60%</p><p className="text-muted-foreground">Weak</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">60-70%</p><p className="text-muted-foreground">Fair</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">70-85%</p><p className="text-muted-foreground">Good</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;85%</p><p className="text-muted-foreground">Excellent</p></div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && analysisResult && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Statistical Details</h2>
                            <p className="text-sm text-muted-foreground">Full technical report</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    CSV Spreadsheet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                    PNG Image
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                    <Code className="mr-2 h-4 w-4" />
                                    Python Code
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF Report
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    <FileType className="mr-2 h-4 w-4" />
                                    Word Document
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Gradient Boosting Machine Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Target: {target} | Type: {problemType} | Trees: {nEstimators} | {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        
                        <StatisticalSummaryCards results={results} problemType={problemType} nEstimators={nEstimators} />
                        
                        {/* Detailed Analysis */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary</h3>
                                    </div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        A gradient boosting machine was trained to {problemType === 'regression' ? 'predict' : 'classify'} {target} using {features.length} predictor variables. 
                                        The model consisted of {nEstimators} sequential trees with learning rate η = {learningRate} and maximum depth = {maxDepth}.
                                    </p>
                                    
                                    {problemType === 'regression' ? (
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The model achieved <span className="font-mono"><em>R</em>² = {results.metrics.r2_score?.toFixed(4)}</span> on the test set, 
                                            indicating {getR2Interpretation(results.metrics.r2_score).desc}. 
                                            The root mean squared error was <span className="font-mono">RMSE = {results.metrics.rmse?.toFixed(4)}</span>.
                                        </p>
                                    ) : (
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The model achieved accuracy = {(results.metrics.accuracy * 100).toFixed(1)}% on the test set, 
                                            indicating {getAccuracyInterpretation(results.metrics.accuracy).desc}.
                                        </p>
                                    )}
                                    
                                    <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                        Feature importance analysis revealed that {topFeatures[0]?.[0]} was the most influential predictor, 
                                        contributing {((topFeatures[0]?.[1] as number) * 100).toFixed(1)}% to the model's predictions.
                                        {topFeatures.length > 1 && ` This was followed by ${topFeatures[1]?.[0]} (${((topFeatures[1]?.[1] as number) * 100).toFixed(1)}%).`}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Analysis Plots */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Analysis Plots</CardTitle>
                                <CardDescription>Feature importance and learning curves</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="GBM Analysis Plots" width={1500} height={1200} className="w-full h-auto rounded-md border" />
                            </CardContent>
                        </Card>

                        {/* Feature Importance Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Feature Importance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Rank</TableHead>
                                            <TableHead>Feature</TableHead>
                                            <TableHead className="text-right">Importance</TableHead>
                                            <TableHead className="text-right">Percentage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.feature_importance).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([f, i], idx) => (
                                            <TableRow key={f}>
                                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                                <TableCell>{f}</TableCell>
                                                <TableCell className="text-right font-mono">{(i as number).toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{((i as number) * 100).toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Prediction Examples */}
                        {results.prediction_examples && results.prediction_examples.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Terminal className="w-5 h-5" />
                                        Prediction Examples
                                    </CardTitle>
                                    <CardDescription>Sample predictions from the test set</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {problemType === 'regression' ? (
                                                    <>
                                                        <TableHead>Actual</TableHead>
                                                        <TableHead>Predicted</TableHead>
                                                        <TableHead>Error</TableHead>
                                                        <TableHead>Error %</TableHead>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Actual</TableHead>
                                                        <TableHead>Predicted</TableHead>
                                                        <TableHead>Confidence</TableHead>
                                                    </>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.prediction_examples.map((ex, i) => (
                                                <TableRow key={i}>
                                                    {problemType === 'regression' ? (
                                                        <>
                                                            <TableCell>{ex.actual?.toFixed(2)}</TableCell>
                                                            <TableCell>{ex.predicted?.toFixed(2)}</TableCell>
                                                            <TableCell>{ex.error?.toFixed(2)}</TableCell>
                                                            <TableCell>{ex.error_percent?.toFixed(2)}%</TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell>{ex.status}</TableCell>
                                                            <TableCell>{ex.actual}</TableCell>
                                                            <TableCell>{ex.predicted}</TableCell>
                                                            <TableCell>{(ex.confidence * 100)?.toFixed(1)}%</TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                )}
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

