'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import {
    Loader2, Activity, AlertTriangle, Lightbulb, CheckCircle, HelpCircle, FileType, BookOpen, Download, FileSpreadsheet, ImageIcon, Target, BarChart2, TrendingUp, Shuffle, Award, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, Info, ArrowRight, ChevronDown, FileText, Sparkles, Layers, Play, Code, Copy
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/feature_importance.py?alt=media";

interface RankingItem { rank: number; feature: string; importance: number; std: number; relative_importance: number; }
interface Insight { type: 'warning' | 'info'; title: string; description: string; }
interface AnalysisResult { task_type: string; model_type: string; n_observations: number; n_train: number; n_test: number; n_features: number; n_repeats: number; feature_names: string[]; dependent_var: string; model_performance: { train_score: number; test_score: number; metric: string; }; feature_ranking: RankingItem[]; insights: Insight[]; recommendations: string[]; plots: { importance_bar: string; importance_box: string; cumulative: string; }; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [{ id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' }, { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }];

const MODEL_OPTIONS = {
    regression: [{ value: 'random_forest', label: 'Random Forest' }, { value: 'gradient_boosting', label: 'Gradient Boosting' }, { value: 'linear', label: 'Linear Regression' }, { value: 'ridge', label: 'Ridge' }, { value: 'decision_tree', label: 'Decision Tree' }],
    classification: [{ value: 'random_forest', label: 'Random Forest' }, { value: 'gradient_boosting', label: 'Gradient Boosting' }, { value: 'logistic', label: 'Logistic Regression' }, { value: 'decision_tree', label: 'Decision Tree' }]
};

const metricDefinitions: Record<string, string> = {
    permutation_importance: "A model-agnostic method that measures feature importance by randomly shuffling each feature and measuring how much the model's performance decreases.",
    importance_score: "The decrease in model performance when a feature's values are randomly shuffled. Higher values indicate more important features.",
    relative_importance: "The percentage contribution of each feature to the total importance, making it easier to compare features.",
    standard_deviation: "The variability of importance scores across multiple permutation repeats. Lower values indicate more stable/reliable importance estimates.",
    r2_score: "R-squared (coefficient of determination) measures how well the model explains variance in the target. Ranges from 0 to 1, where 1 is perfect.",
    accuracy: "The proportion of correct predictions made by the classification model. Ranges from 0 to 1 (or 0% to 100%).",
    test_score: "Model performance measured on held-out test data, providing an unbiased estimate of how well the model generalizes.",
    train_score: "Model performance on training data. Large gaps between train and test scores may indicate overfitting.",
    n_repeats: "Number of times each feature is shuffled to compute importance. More repeats give more stable estimates but take longer.",
    random_forest: "An ensemble method that builds multiple decision trees and averages their predictions. Robust and handles non-linear relationships well.",
    gradient_boosting: "An ensemble method that builds trees sequentially, each correcting errors of the previous. Often achieves high accuracy.",
    negative_importance: "When shuffling a feature improves model performance, suggesting the feature may add noise or the model learned spurious patterns."
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Feature Importance Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in permutation importance analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">
                                    {term.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
        link.download = 'feature_importance.py';
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
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Feature Importance</DialogTitle>
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

const getScoreInterpretation = (score: number, metric: string) => {
    if (metric === 'Accuracy') {
        if (score >= 0.9) return { label: 'Excellent', desc: 'excellent accuracy' };
        if (score >= 0.8) return { label: 'Good', desc: 'good accuracy' };
        if (score >= 0.7) return { label: 'Moderate', desc: 'moderate accuracy' };
        return { label: 'Weak', desc: 'needs improvement' };
    } else {
        if (score >= 0.75) return { label: 'Excellent', desc: 'excellent fit' };
        if (score >= 0.50) return { label: 'Good', desc: 'good fit' };
        if (score >= 0.25) return { label: 'Moderate', desc: 'moderate fit' };
        return { label: 'Weak', desc: 'weak fit' };
    }
};

const StatisticalSummaryCards = ({ result }: { result: AnalysisResult }) => {
    const topFeature = result.feature_ranking[0];
    const perf = result.model_performance;
    const avgImportance = result.feature_ranking.reduce((sum, r) => sum + r.relative_importance, 0) / result.feature_ranking.length;
    const importanceSpread = Math.max(...result.feature_ranking.map(r => r.relative_importance)) - Math.min(...result.feature_ranking.map(r => r.relative_importance));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Top Feature</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-xl font-semibold truncate" title={topFeature.feature}>{topFeature.feature}</p><p className="text-xs text-muted-foreground">{topFeature.relative_importance.toFixed(1)}% contribution</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Test {perf.metric}</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{perf.metric === 'Accuracy' ? `${(perf.test_score * 100).toFixed(1)}%` : perf.test_score.toFixed(4)}</p><p className="text-xs text-muted-foreground">{getScoreInterpretation(perf.test_score, perf.metric).label}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Avg. Importance</p><BarChart2 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{avgImportance.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Per feature</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Spread</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{importanceSpread.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{importanceSpread > 30 ? 'Clear hierarchy' : 'Similar importance'}</p></div></CardContent></Card>
        </div>
    );
};

const FeatureImportanceGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Feature Importance Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Permutation Importance */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                What is Permutation Importance?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Permutation importance measures how much a model's performance <strong>decreases when a feature 
                is randomly shuffled</strong>. If shuffling a feature causes a big drop in accuracy/R², that 
                feature is important. If performance stays the same, the feature doesn't matter much.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The process:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    1. Train model → 2. Measure baseline performance → 3. Shuffle one feature → 
                    4. Measure new performance → 5. Importance = Performance drop
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use This?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You want to know <strong>which features matter most</strong></li>
                    <li>• You need to <strong>simplify your model</strong> (feature selection)</li>
                    <li>• You want <strong>model-agnostic</strong> importance (works with any model)</li>
                    <li>• You need to <strong>explain your model</strong> to stakeholders</li>
                    <li>• You're deciding <strong>what data to collect</strong> in the future</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Limitations:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Can be slow with many features or large datasets</li>
                    <li>• Correlated features may share importance (both appear less important)</li>
                    <li>• Results depend on the model used</li>
                    <li>• Doesn't show direction of effect (use coefficients for that)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding the Output */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Understanding the Output
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Importance Score</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The decrease in model performance when that feature is shuffled.
                    <br/><strong>Higher score:</strong> More important feature
                    <br/><strong>Score ≈ 0:</strong> Feature doesn't help predictions
                    <br/><strong>Negative score:</strong> Shuffling actually improved performance (feature may add noise!)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Relative Importance (%)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each feature's contribution as a percentage of total importance.
                    Makes it easy to compare: "Feature A contributes 45% vs Feature B at 12%"
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Standard Deviation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Variability across multiple shuffling repeats.
                    <br/><strong>Low SD:</strong> Stable, reliable importance estimate
                    <br/><strong>High SD:</strong> Importance varies — interpret with caution
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Test vs Train Performance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Always look at <strong>test performance</strong> — it shows how the model generalizes.
                    <br/><strong>Large train-test gap:</strong> Model may be overfitting
                    <br/><strong>Similar scores:</strong> Model generalizes well
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Model Selection */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Choosing a Model
              </h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                    <p className="font-medium text-sm text-primary mb-1">Random Forest (Recommended)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Handles non-linear relationships</li>
                      <li>• Robust to outliers</li>
                      <li>• Good default choice</li>
                      <li>• Works well with many features</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm text-primary mb-1">Gradient Boosting</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Often highest accuracy</li>
                      <li>• Good with complex patterns</li>
                      <li>• May overfit small data</li>
                      <li>• Slower than Random Forest</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm text-primary mb-1">Linear/Logistic</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Assumes linear relationships</li>
                      <li>• Fast and interpretable</li>
                      <li>• Good baseline comparison</li>
                      <li>• May miss complex patterns</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm text-primary mb-1">Decision Tree</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Simple, interpretable</li>
                      <li>• Handles non-linear</li>
                      <li>• Can overfit easily</li>
                      <li>• Use for exploration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Settings Explained */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Settings Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Permutation Repeats</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How many times each feature is shuffled. More repeats = more stable estimates.
                    <br/><strong>5-10:</strong> Quick exploration
                    <br/><strong>20-30:</strong> Good balance (recommended)
                    <br/><strong>50+:</strong> Publication-quality, but slower
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Test Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Portion of data held out for testing. Importance is calculated on test data.
                    <br/><strong>20%:</strong> Standard choice for most datasets
                    <br/><strong>30-40%:</strong> When you need more reliable test estimates
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Standardize Features</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scales all features to have mean=0, std=1.
                    <br/><strong>Enable for:</strong> Linear models, features on different scales
                    <br/><strong>Disable for:</strong> Tree-based models (they don't need it)
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
                  <p className="font-medium text-sm">Clear Hierarchy (Large Spread)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When top features have much higher importance than others.
                    <br/><strong>Action:</strong> Focus on top features. Consider removing low-importance ones.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Similar Importance (Small Spread)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When many features have similar importance scores.
                    <br/><strong>Possible reasons:</strong> Features are correlated, or all contribute equally.
                    <br/><strong>Action:</strong> Check for multicollinearity; may need domain knowledge to prioritize.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Negative Importance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When shuffling a feature <strong>improves</strong> performance!
                    <br/><strong>Meaning:</strong> The feature may be adding noise or the model learned spurious patterns.
                    <br/><strong>Action:</strong> Consider removing these features.
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
                    <li>• Ensure you have enough data (50+ samples)</li>
                    <li>• Handle missing values first</li>
                    <li>• Consider feature correlations</li>
                    <li>• Choose appropriate model for your data</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Focus on test (not train) importance</li>
                    <li>• Consider standard deviation</li>
                    <li>• Look at relative % not just raw scores</li>
                    <li>• Combine with domain knowledge</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Taking Action</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Remove features with negative/zero importance</li>
                    <li>• Focus data collection on top features</li>
                    <li>• Use for model simplification</li>
                    <li>• Validate findings with different models</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report model type and performance</li>
                    <li>• Include number of repeats</li>
                    <li>• Show importance ± standard deviation</li>
                    <li>• Mention test/train split ratio</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Permutation importance shows which features 
                the model relies on, not necessarily causal relationships. A feature can be important for 
                prediction without causing the outcome. Always combine statistical findings with domain expertise.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><BarChart2 className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Feature Importance</CardTitle>
                    <CardDescription className="text-base mt-2">Understand which features matter most</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Shuffle className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Permutation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Shuffle each feature to measure impact</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Award className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Model-Agnostic</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Works with any model</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Reliable</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Confidence intervals from repeats</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Identify which features have the greatest impact on model predictions. Useful for feature selection, model interpretation, and understanding data relationships.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Dependent variable: Numeric (continuous)</li>
                                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Independent variables: Numeric features</li>
                                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Sample size: At least 50 observations</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-primary" />What You'll Learn</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Feature ranking by importance</li>
                                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Relative contribution of each feature</li>
                                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Model performance metrics</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(example)} size="lg"><BarChart2 className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface FeatureImportancePageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function FeatureImportancePage({ data, numericHeaders, onLoadExample }: FeatureImportancePageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVar, setDependentVar] = useState('');
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    const [taskType, setTaskType] = useState<'regression' | 'classification'>('regression');
    const [modelType, setModelType] = useState('random_forest');
    const [nRepeats, setNRepeats] = useState(10);
    const [testSize, setTestSize] = useState(0.2);
    const [standardize, setStandardize] = useState(false);

    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    const availableIndependents = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);

    const dataValidation = useMemo(() => [
        { label: 'Dependent variable selected', passed: dependentVar !== '', detail: dependentVar || 'Select Y variable' },
        { label: 'Independent variables selected', passed: independentVars.length >= 1, detail: `${independentVars.length} features` },
        { label: 'Sufficient sample size', passed: data.length >= 50, detail: `n = ${data.length}` },
        { label: 'Adequate test set', passed: Math.round(data.length * testSize) >= 20, detail: `${Math.round(data.length * testSize)} test samples` }
    ], [data, dependentVar, independentVars, testSize]);

    const allValidationsPassed = useMemo(() => dataValidation.slice(0, 2).every(c => c.passed), [dataValidation]);

    useEffect(() => { if (data.length === 0) setView('intro'); else if (canRun) { setView('main'); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1); } }, [data, canRun]);
    useEffect(() => { setModelType('random_forest'); }, [taskType]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return; setIsDownloading(true);
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `Feature_Importance_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL(); link.click(); }
        catch { toast({ variant: 'destructive', title: 'Download failed' }); } finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const csvData = analysisResult.feature_ranking.map(r => ({ Rank: r.rank, Feature: r.feature, Importance: r.importance, Std: r.std, Relative: r.relative_importance }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Feature_Importance_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    }, [analysisResult]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/feature-importance-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult, dependentVar, independentVars, modelType, taskType, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Feature_Importance_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, dependentVar, independentVars, modelType, taskType, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length === 0) { toast({ variant: 'destructive', title: 'Select variables' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/feature-importance`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent: dependentVar, independents: independentVars, task_type: taskType, model_type: modelType, n_repeats: nRepeats, test_size: testSize, standardize })
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
            setAnalysisResult(await res.json()); goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, dependentVar, independentVars, taskType, modelType, nRepeats, testSize, standardize, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const result = analysisResult;
    const topFeature = result?.feature_ranking[0];
    const perf = result?.model_performance;

    const ProgressBar = () => (
        <div className="w-full mb-8"><div className="flex items-center justify-between">
            {STEPS.map((step) => {
                const isCompleted = step.id < currentStep; const isCurrent = step.id === currentStep; const isClickable = step.id <= maxReachedStep;
                return (<button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable} className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>{isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}</div>
                    <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                </button>);
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 👇 Guide 컴포넌트 추가 */}
            <FeatureImportanceGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Feature Importance</h1>
                    <p className="text-muted-foreground mt-1">Permutation Importance Analysis</p>
                </div>
                {/* 👇 버튼 수정 */}
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose dependent and independent variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Dependent Variable (Y)</Label><Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center"><Label>Independent Variables (X)</Label><Button variant="ghost" size="sm" onClick={() => setIndependentVars(availableIndependents)}>Select All</Button></div>
                                    <ScrollArea className="h-40 border rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {availableIndependents.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => setIndependentVars(prev => c ? [...prev, h] : prev.filter(v => v !== h))} /><label htmlFor={`iv-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}
                                        </div>
                                    </ScrollArea>
                                    <p className="text-xs text-muted-foreground">{independentVars.length} features selected</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure analysis parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Task Type</Label><Select value={taskType} onValueChange={(v: any) => setTaskType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="regression">Regression</SelectItem><SelectItem value="classification">Classification</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Model</Label><Select value={modelType} onValueChange={setModelType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MODEL_OPTIONS[taskType].map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Permutation Repeats: {nRepeats}</Label><Slider value={[nRepeats]} onValueChange={([v]) => setNRepeats(v)} min={5} max={50} step={5} /></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Test Size: {(testSize * 100).toFixed(0)}%</Label><Slider value={[testSize]} onValueChange={([v]) => setTestSize(v)} min={0.1} max={0.4} step={0.05} /></div>
                                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Switch id="std" checked={standardize} onCheckedChange={setStandardize} /><Label htmlFor="std" className="cursor-pointer">Standardize Features</Label></div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent><div className="space-y-3">{dataValidation.map((c, i) => (<div key={i} className={`flex items-start gap-4 p-4 rounded-xl ${c.passed ? 'bg-primary/5' : 'bg-red-50/50'}`}>{c.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}<div><p className="font-medium text-sm">{c.label}</p><p className="text-xs text-muted-foreground">{c.detail}</p></div></div>))}</div></CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={isLoading || !allValidationsPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Play className="mr-2 h-4 w-4" />Run Analysis</>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && result && (() => {
                    const hasGoodFit = perf && (perf.metric === 'Accuracy' ? perf.test_score >= 0.8 : perf.test_score >= 0.5);
                    return (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Which features matter most for {dependentVar}</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${hasGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className={`font-bold ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm"><strong>{topFeature?.feature}</strong> is the most important feature, contributing <strong>{topFeature?.relative_importance.toFixed(1)}%</strong> to predictions.</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Model achieves <strong>{perf?.metric === 'Accuracy' ? `${(perf.test_score * 100).toFixed(1)}%` : perf?.test_score.toFixed(4)}</strong> {perf?.metric} on test data.</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Analyzed <strong>{result.n_features}</strong> features with <strong>{result.n_repeats}</strong> permutation repeats for stability.</p></div>
                                </div>
                            </div>
                            <div className={`rounded-xl p-5 border ${hasGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <div className="flex items-start gap-3">
                                    {hasGoodFit ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div>
                                        <p className="font-semibold">{hasGoodFit ? "Strong Model Performance!" : "Room for Improvement"}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{hasGoodFit ? `Focus on ${topFeature?.feature} for maximum impact on ${dependentVar}.` : "Consider different features or model type to improve performance."}</p>
                                    </div>
                                </div>
                            </div>
                            <StatisticalSummaryCards result={result} />
                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Model Quality:</span>
                                {[1, 2, 3, 4, 5].map(star => {
                                    const score = perf?.metric === 'Accuracy' ? perf.test_score * 100 : perf?.test_score ? perf.test_score * 100 : 0;
                                    return (<span key={star} className={`text-lg ${(score >= 90 && star <= 5) || (score >= 80 && star <= 4) || (score >= 70 && star <= 3) || (score >= 50 && star <= 2) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>);
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                    );
                })()}

                {currentStep === 5 && result && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Understanding Results</CardTitle><CardDescription>Permutation importance explained</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">How Permutation Works</h4><p className="text-sm text-muted-foreground">For each feature, we shuffle its values and measure how much predictions get worse. Bigger drops = more important.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Top 3 Features</h4><p className="text-sm text-muted-foreground">{result.feature_ranking.slice(0, 3).map((f, i) => `#${i+1} ${f.feature} (${f.relative_importance.toFixed(1)}%)`).join(', ')}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Practical Use</h4><p className="text-sm text-muted-foreground">Focus on top features for data collection. Features with low/negative importance can be removed.</p></div></div></div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4><p className="text-sm text-muted-foreground">{topFeature?.feature} is the key driver for predicting {dependentVar}.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Full Report<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 6 && result && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Full Statistics</h2><p className="text-sm text-muted-foreground">Importance ranking, plots</p></div>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Feature Importance Report</h2><p className="text-sm text-muted-foreground">{result.model_type.replace('_', ' ')} | {result.n_features} features | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards result={result} />
                        
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">A permutation importance analysis was conducted using a {result.model_type.replace('_', ' ')} model to determine the relative importance of {result.n_features} features in predicting {dependentVar}. The sample was split into training (<em>n</em> = {result.n_train}) and test (<em>n</em> = {result.n_test}) sets.</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">The model achieved a {perf?.metric} of <span className="font-mono">{perf?.metric === 'Accuracy' ? `${(perf.test_score * 100).toFixed(1)}%` : perf?.test_score.toFixed(4)}</span> on the test set (training {perf?.metric}: {perf?.metric === 'Accuracy' ? `${((perf?.train_score || 0) * 100).toFixed(1)}%` : perf?.train_score.toFixed(4)}). Feature importance was assessed using {result.n_repeats} permutation repeats to ensure stability.</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">The most important feature was {topFeature?.feature}, with a mean importance score of {topFeature?.importance.toFixed(4)} (SD = {topFeature?.std.toFixed(4)}), accounting for {topFeature?.relative_importance.toFixed(1)}% of the total importance.{result.feature_ranking.length > 1 && ` The remaining ${result.feature_ranking.length - 1} feature${result.feature_ranking.length > 2 ? 's' : ''} contributed ${(100 - (topFeature?.relative_importance || 0)).toFixed(1)}% collectively.`}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" />Top 5 Features</CardTitle></CardHeader><CardContent><div className="space-y-3">{result.feature_ranking.slice(0, 5).map((item, i) => (<div key={item.feature} className="flex items-center gap-4"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>{i + 1}</div><div className="flex-1"><div className="flex justify-between items-center mb-1"><span className="font-medium">{item.feature}</span><span className="text-sm text-muted-foreground">{item.importance.toFixed(4)} ± {item.std.toFixed(4)}</span></div><Progress value={item.relative_importance} className="h-2" /></div></div>))}</div></CardContent></Card>
                        
                        <Tabs defaultValue="bar"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="bar">Bar Chart</TabsTrigger><TabsTrigger value="box">Box Plot</TabsTrigger><TabsTrigger value="cumulative">Cumulative</TabsTrigger></TabsList>
                            <TabsContent value="bar"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.importance_bar}`} alt="Importance Bar" className="w-full rounded border" /></CardContent></Card></TabsContent>
                            <TabsContent value="box"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.importance_box}`} alt="Importance Box" className="w-full rounded border" /></CardContent></Card></TabsContent>
                            <TabsContent value="cumulative"><Card><CardContent className="pt-4"><img src={`data:image/png;base64,${result.plots.cumulative}`} alt="Cumulative" className="w-full rounded border" /></CardContent></Card></TabsContent>
                        </Tabs>
                        
                        <Card><CardHeader><CardTitle>Complete Feature Ranking</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-16">Rank</TableHead><TableHead>Feature</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="text-right">Std</TableHead><TableHead className="text-right">Relative %</TableHead></TableRow></TableHeader><TableBody>{result.feature_ranking.map(item => (<TableRow key={item.feature} className={item.importance < 0 ? 'bg-red-50' : ''}><TableCell>{item.rank}</TableCell><TableCell>{item.feature}</TableCell><TableCell className={`text-right font-mono ${item.importance < 0 ? 'text-red-600' : ''}`}>{item.importance.toFixed(6)}</TableCell><TableCell className="text-right font-mono">{item.std.toFixed(6)}</TableCell><TableCell className="text-right">{item.relative_importance.toFixed(1)}%</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                        
                        {result.insights.length > 0 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" />Insights</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-2 gap-4">{result.insights.map((ins, i) => (<div key={i} className="bg-muted/50 rounded-lg p-4"><div className="flex items-start gap-2">{ins.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-primary" />}<div><strong>{ins.title}</strong><p className="text-sm text-muted-foreground mt-1">{ins.description}</p></div></div></div>))}</div></CardContent></Card>}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running permutation importance...</p><Skeleton className="h-[300px] w-full" /></CardContent></Card>}
            </div>

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
