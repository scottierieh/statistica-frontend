'use client';

import { useState, useMemo, useCallback, useEffect, useRef, useReducer } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Container, AlertTriangle, CheckCircle, TrendingUp, HelpCircle, Settings, BarChart, Target, Percent, Layers, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, Sparkles, ArrowRight, ChevronDown, FileText, FileType, Info, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import Image from 'next/image';
import { Slider } from '../../ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/lasso_regression.py?alt=media";

interface RegressionMetrics {
    r2_score: number;
    rmse: number;
    mae: number;
    n_samples: number;
}

interface FeatureSelection {
    n_total: number;
    n_selected: number;
    n_excluded: number;
    selected: string[];
    excluded: string[];
}

interface LassoRegressionResults {
    metrics: { test: RegressionMetrics; train: RegressionMetrics };
    coefficients: Record<string, number>;
    intercept: number;
    alpha: number;
    alpha_source?: 'cross_validation' | 'user_specified';
    cv_folds?: number | null;
    interpretation: string;
    n_dropped?: number;
    feature_selection?: FeatureSelection;
    vif?: Record<string, number | null> | null;
}

interface FullAnalysisResponse {
    results: LassoRegressionResults;
    plot: string | null;
    path_plot: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface LassoConfig {
    target: string;
    features: string[];
    alpha: number;
    testSize: number;
    useCv: boolean;
    cvFolds: number;
}

type ConfigAction =
    | { type: 'SET_TARGET'; payload: string }
    | { type: 'SET_FEATURES'; payload: string[] }
    | { type: 'TOGGLE_FEATURE'; payload: { feature: string; checked: boolean } }
    | { type: 'SET_ALPHA'; payload: number }
    | { type: 'SET_TEST_SIZE'; payload: number }
    | { type: 'SET_USE_CV'; payload: boolean }
    | { type: 'SET_CV_FOLDS'; payload: number }
    | { type: 'RESET'; payload: { defaultTarget: string; defaultFeatures: string[] } };

interface ValidationCheck {
    label: string;
    passed: boolean;
    detail: string;
    severity: 'critical' | 'warning' | 'info';
}

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const INITIAL_CONFIG: LassoConfig = {
    target: '',
    features: [],
    alpha: 0.1,
    testSize: 0.2,
    useCv: false,
    cvFolds: 5
};

function configReducer(state: LassoConfig, action: ConfigAction): LassoConfig {
    switch (action.type) {
        case 'SET_TARGET': return { ...state, target: action.payload };
        case 'SET_FEATURES': return { ...state, features: action.payload };
        case 'TOGGLE_FEATURE': {
            const { feature, checked } = action.payload;
            const newFeatures = checked ? [...state.features, feature] : state.features.filter(f => f !== feature);
            return { ...state, features: newFeatures };
        }
        case 'SET_ALPHA': return { ...state, alpha: action.payload };
        case 'SET_TEST_SIZE': return { ...state, testSize: action.payload };
        case 'SET_USE_CV': return { ...state, useCv: action.payload };
        case 'SET_CV_FOLDS': return { ...state, cvFolds: action.payload };
        case 'RESET': return { ...INITIAL_CONFIG, target: action.payload.defaultTarget, features: action.payload.defaultFeatures };
        default: return state;
    }
}

const getR2Interpretation = (r2: number): { label: string; desc: string; stars: number } => {
    if (r2 >= 0.75) return { label: 'Excellent', desc: 'excellent fit', stars: 5 };
    if (r2 >= 0.50) return { label: 'Good', desc: 'good fit', stars: 4 };
    if (r2 >= 0.25) return { label: 'Moderate', desc: 'moderate fit', stars: 3 };
    if (r2 >= 0.10) return { label: 'Weak', desc: 'weak fit', stars: 2 };
    return { label: 'Very Weak', desc: 'very weak fit', stars: 1 };
};

const formatCoefficient = (value: number): string => {
    if (Math.abs(value) < 1e-6) return '0.0000';
    if (Math.abs(value) >= 1000) return value.toExponential(3);
    return value.toFixed(4);
};

const isFeatureSelected = (coef: number): boolean => Math.abs(coef) >= 1e-6;

const getFeatureSelectionInfo = (results: LassoRegressionResults): { n_selected: number; n_total: number; n_excluded: number } => {
    if (results.feature_selection) return results.feature_selection;
    const coeffs = Object.values(results.coefficients);
    const n_total = coeffs.length;
    const n_selected = coeffs.filter(c => isFeatureSelected(c)).length;
    return { n_total, n_selected, n_excluded: n_total - n_selected };
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
        link.download = 'lasso_regression.py';
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
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Lasso Regression</DialogTitle>
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

const StarRating = ({ value, max = 5 }: { value: number; max?: number }) => (
    <div className="flex items-center gap-0.5">{Array.from({ length: max }, (_, i) => (<span key={i} className={`text-lg ${i < value ? 'text-amber-400' : 'text-muted-foreground/30'}`}>★</span>))}</div>
);

interface MetricCardProps { label: string; value: string | number; subtitle?: string; icon: React.ElementType }
const MetricCard = ({ label, value, subtitle, icon: Icon }: MetricCardProps) => (
    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{value}</p>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div></CardContent></Card>
);

const StatisticalSummaryCards = ({ results }: { results: LassoRegressionResults }) => {
    const { n_selected, n_total } = getFeatureSelectionInfo(results);
    const r2Interp = getR2Interpretation(results.metrics.test.r2_score);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Test R²" value={results.metrics.test.r2_score.toFixed(4)} subtitle={r2Interp.label} icon={Target} />
            <MetricCard label="Test RMSE" value={results.metrics.test.rmse.toFixed(3)} subtitle="Prediction error" icon={BarChart} />
            <MetricCard label="Alpha (α)" value={results.alpha.toFixed(3)} subtitle={results.alpha_source === 'cross_validation' ? 'CV-optimized' : 'User specified'} icon={Percent} />
            <MetricCard label="Selected" value={`${n_selected}/${n_total}`} subtitle="Non-zero features" icon={Layers} />
        </div>
    );
};

const ValidationCheckItem = ({ check }: { check: ValidationCheck }) => {
    const bgClass = check.passed ? 'bg-primary/5' : check.severity === 'critical' ? 'bg-destructive/10' : 'bg-amber-50/50 dark:bg-amber-950/20';
    const iconClass = check.passed ? 'text-primary' : check.severity === 'critical' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400';
    const textClass = check.passed ? 'text-foreground' : check.severity === 'critical' ? 'text-destructive' : 'text-amber-700 dark:text-amber-300';
    return (
        <div className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${bgClass}`}>
            {check.passed ? <CheckCircle2 className={`w-5 h-5 ${iconClass} shrink-0 mt-0.5`} /> : <AlertTriangle className={`w-5 h-5 ${iconClass} shrink-0 mt-0.5`} />}
            <div><p className={`font-medium text-sm ${textClass}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div>
        </div>
    );
};

interface ProgressBarProps { currentStep: Step; maxReachedStep: Step; onStepClick: (step: Step) => void }
const ProgressBar = ({ currentStep, maxReachedStep, onStepClick }: ProgressBarProps) => (
    <div className="w-full mb-8">
        <div className="flex items-center justify-between">
            {STEPS.map((step) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                const isClickable = step.id <= maxReachedStep;
                return (
                    <button key={step.id} onClick={() => isClickable && onStepClick(step.id)} disabled={!isClickable}
                        className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        aria-label={`Step ${step.id}: ${step.label}`} aria-current={isCurrent ? 'step' : undefined}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                            {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                        </div>
                        <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                    </button>
                );
            })}
        </div>
    </div>
);

// Statistical Terms Glossary for Lasso Regression
const lassoMetricDefinitions: Record<string, string> = {
    lasso: "Least Absolute Shrinkage and Selection Operator. A regularized regression method that uses L1 penalty to shrink coefficients, with some becoming exactly zero (automatic feature selection).",
    regularization: "A technique that adds a penalty term to prevent overfitting by constraining coefficient values. Lasso uses L1 regularization; Ridge uses L2.",
    l1_penalty: "The sum of absolute values of coefficients (Σ|βⱼ|). Unique property: can shrink coefficients to exactly zero, enabling automatic feature selection.",
    alpha: "The regularization strength parameter (α or λ). Higher α = more aggressive shrinkage and more coefficients become zero. α = 0 equals ordinary least squares.",
    coefficient: "The estimated effect of a feature on the target. In Lasso, coefficients can be shrunk to zero, effectively removing that feature from the model.",
    feature_selection: "Lasso's ability to automatically identify important predictors by setting irrelevant feature coefficients to exactly zero. A key advantage over Ridge regression.",
    sparsity: "A solution with many zero coefficients. Lasso produces sparse models, making them easier to interpret. Sparsity increases with higher α.",
    shrinkage: "The reduction of coefficient magnitudes toward zero. Lasso shrinks less important coefficients more aggressively, some all the way to zero.",
    cross_validation: "A technique to find optimal α by testing different values on held-out data folds. CV-optimized α balances model complexity and predictive accuracy.",
    regularization_path: "A plot showing how coefficients change as α varies. Features that become zero first are less important. Helps visualize feature importance.",
    r_squared: "Coefficient of determination. Proportion of variance in Y explained by the model. Compare train vs test R² to assess overfitting.",
    test_r_squared: "R² on held-out test data. More reliable than training R² because it measures how well the model generalizes to new, unseen data.",
    train_test_split: "Dividing data into training (to fit model) and test (to evaluate) sets. Typical splits: 70/30 or 80/20. Prevents overfitting assessment bias.",
    rmse: "Root Mean Square Error. Average prediction error in original units. √(Σ(yᵢ - ŷᵢ)²/n). Lower = better predictions.",
    mae: "Mean Absolute Error. Average of absolute prediction errors. Less sensitive to outliers than RMSE. Σ|yᵢ - ŷᵢ|/n.",
    overfitting: "When a model fits training data too well but performs poorly on new data. Signs: high train R², much lower test R². Regularization helps prevent this.",
    underfitting: "When a model is too simple to capture patterns. Signs: low R² on both train and test. May need more features or lower α.",
    bias_variance_tradeoff: "Higher α → more bias (simpler model) but less variance (more stable). Lower α → less bias but more variance. Optimal α balances both.",
    standardization: "Scaling features to have mean=0 and std=1 before Lasso. Essential because L1 penalty treats all features equally regardless of scale.",
    intercept: "The constant term (β₀). The predicted Y when all features equal zero. Usually not regularized in Lasso.",
    vif: "Variance Inflation Factor. Measures multicollinearity. High VIF (>5-10) indicates correlated predictors. Lasso can handle some collinearity by selecting one of correlated features.",
    multicollinearity: "When predictors are highly correlated. Unlike Ridge, Lasso tends to select one feature from a correlated group and zero out the others.",
    elastic_net: "A combination of Lasso (L1) and Ridge (L2) penalties. Useful when you want some feature selection but also want to keep correlated features together.",
    coordinate_descent: "The optimization algorithm typically used to solve Lasso. Updates one coefficient at a time while holding others fixed.",
    cv_folds: "Number of data partitions in cross-validation. Common choices: 5 or 10 folds. More folds = more reliable but slower α selection."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Lasso Regression Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in Lasso regression analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(lassoMetricDefinitions).map(([term, definition]) => (
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


// IntroPage 위에 추가
const LassoRegressionGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Lasso Regression Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Lasso */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Lasso Regression?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Lasso (Least Absolute Shrinkage and Selection Operator) is a regularized regression that 
                <strong> automatically selects important features</strong> by shrinking unimportant coefficients 
                to exactly zero. It's ideal when you have many predictors and want to identify which ones matter.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The equation:</strong><br/>
                  <span className="font-mono text-xs">
                    Minimize: Σ(yᵢ - ŷᵢ)² + α × Σ|βⱼ|
                  </span><br/>
                  <span className="text-muted-foreground text-xs">
                    The L1 penalty (α × Σ|βⱼ|) forces some coefficients to become exactly zero.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Lasso?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You have <strong>many potential predictors</strong></li>
                    <li>• You want <strong>automatic feature selection</strong></li>
                    <li>• You suspect many features are <strong>irrelevant</strong></li>
                    <li>• You need a <strong>simpler, interpretable model</strong></li>
                    <li>• You want to <strong>prevent overfitting</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Consider alternatives when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You need to keep correlated features (use Ridge or Elastic Net)</li>
                    <li>• All features are theoretically important</li>
                    <li>• You have very few predictors</li>
                    <li>• Sample size is very small</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Alpha */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Understanding Alpha (α)
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">What Alpha Controls</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alpha controls the strength of regularization (penalty).
                    <br/><strong>Higher α:</strong> More aggressive feature elimination → simpler model
                    <br/><strong>Lower α:</strong> Fewer features eliminated → closer to regular regression
                    <br/><strong>α = 0:</strong> No penalty → identical to OLS regression
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Choosing Alpha</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Cross-validation (recommended):</strong> Automatically finds optimal α by testing many values.
                    <br/><strong>Manual selection:</strong> Use the coefficient path plot to see how features drop out.
                    <br/><strong>Rule of thumb:</strong> Start with CV, then adjust based on domain knowledge.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Coefficient Path</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The regularization path plot shows how coefficients shrink as α increases. 
                    Features that become zero first are less important. The optimal α balances 
                    model simplicity with predictive accuracy.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Key Metrics to Evaluate
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Test R² (Most Important)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How well the model predicts <strong>new, unseen data</strong>. 
                    This is more reliable than training R² because it tests generalization.
                    <br/><strong>&gt;50%:</strong> Good predictive power
                    <br/><strong>25-50%:</strong> Moderate
                    <br/><strong>&lt;25%:</strong> Weak
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Train vs Test Gap</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Small gap (&lt;10%):</strong> Good generalization, model isn't overfitting.
                    <br/><strong>Large gap (&gt;10%):</strong> Possible overfitting — increase α or get more data.
                    <br/>Lasso naturally reduces this gap through regularization.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Feature Selection Ratio</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How many features were selected vs. eliminated.
                    <br/>A good Lasso model typically eliminates 50%+ of weak predictors.
                    <br/>If most features are kept, consider increasing α.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Lasso vs Ridge vs OLS */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Lasso vs Ridge vs OLS
              </h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm text-primary mb-1">OLS (Regular)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• No penalty</li>
                      <li>• Keeps all features</li>
                      <li>• Can overfit</li>
                      <li>• Best with few predictors</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                    <p className="font-medium text-sm text-primary mb-1">Lasso (L1)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• L1 penalty (|β|)</li>
                      <li>• <strong>Eliminates features</strong></li>
                      <li>• Sparse solutions</li>
                      <li>• Best for feature selection</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm text-primary mb-1">Ridge (L2)</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• L2 penalty (β²)</li>
                      <li>• Shrinks but keeps all</li>
                      <li>• Handles collinearity</li>
                      <li>• Best when all matter</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Tip:</strong> If you have correlated features that are all theoretically important, 
                    Lasso may arbitrarily select one and drop others. Consider Ridge or Elastic Net in that case.
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
                  <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Standardize features</strong> (done automatically)</li>
                    <li>• Handle missing values first</li>
                    <li>• Consider log-transforming skewed variables</li>
                    <li>• Have 10+ observations per feature</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Model Selection</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use <strong>cross-validation</strong> for α</li>
                    <li>• Check the regularization path plot</li>
                    <li>• Compare train vs test performance</li>
                    <li>• Validate selected features make sense</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Zero coefficient = feature eliminated</li>
                    <li>• Larger |coefficient| = stronger effect</li>
                    <li>• Sign indicates direction (±)</li>
                    <li>• Focus on selected features only</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report α value used</li>
                    <li>• List selected vs eliminated features</li>
                    <li>• Show train/test R² and RMSE</li>
                    <li>• Include coefficient path plot</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Lasso is particularly powerful for high-dimensional 
                data where you suspect many features are irrelevant. The automatic feature selection can dramatically 
                simplify your model while maintaining (or improving) predictive accuracy. Always validate that 
                the selected features make domain sense.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Container className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Lasso Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Regularized regression with automatic feature selection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Feature Selection</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Automatically identifies important predictors by shrinking irrelevant ones to zero</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Layers className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Regularization</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">L1 penalty prevents overfitting and creates simpler, interpretable models</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Path Analysis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Visualize how coefficients change with regularization strength</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Lasso regression is ideal when you have many potential predictors and want to identify the most important ones.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Target:</strong> Continuous numeric variable</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Features:</strong> One or more numeric predictors</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Sample:</strong> 10+ observations per feature</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Understanding Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>R²:</strong> Model's explanatory power (0-1)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Zero coefficients:</strong> Features eliminated</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Alpha:</strong> Controls selection strictness</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg"><TrendingUp className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

function useLassoAnalysis({ data, config }: { data: DataSet; config: LassoConfig }) {
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = useCallback(async (): Promise<boolean> => {
        if (!config.target || config.features.length === 0) {
            setError('Please select target and feature variables.');
            return false;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const requestBody: Record<string, unknown> = {
                data,
                target: config.target,
                features: config.features,
                alpha: config.alpha,
                test_size: config.testSize
            };
            if (config.useCv) {
                requestBody.use_cv = config.useCv;
                requestBody.cv_folds = config.cvFolds;
            }
            const response = await fetch(`${FASTAPI_URL}/api/analysis/lasso-regression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || errorResult.error || `HTTP error: ${response.status}`);
            }
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            return true;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error occurred';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [data, config]);

    const resetAnalysis = useCallback(() => {
        setAnalysisResult(null);
        setError(null);
    }, []);

    return { analysisResult, isLoading, error, runAnalysis, resetAnalysis };
}

function useDataValidation(data: DataSet, config: LassoConfig): { checks: ValidationCheck[]; allCriticalPassed: boolean } {
    return useMemo(() => {
        const checks: ValidationCheck[] = [];
        checks.push({ label: 'Target variable selected', passed: config.target !== '', detail: config.target ? `Target: ${config.target}` : 'Please select a target variable', severity: 'critical' });
        checks.push({ label: 'Feature variables selected', passed: config.features.length >= 1, detail: config.features.length >= 1 ? `${config.features.length} feature(s) selected` : 'Select at least one feature', severity: 'critical' });
        const trainSize = Math.round((1 - config.testSize) * data.length);
        checks.push({ label: 'Sufficient training size', passed: trainSize >= 30, detail: `Training: ${trainSize} observations (minimum: 30)`, severity: trainSize >= 20 ? 'warning' : 'critical' });
        if (config.features.length > 0) {
            const ratio = Math.floor(trainSize / config.features.length);
            checks.push({ label: 'Observations per feature', passed: ratio >= 10, detail: `${ratio} observations per feature (recommended: 10+)`, severity: ratio >= 5 ? 'warning' : 'critical' });
        }
        const allVars = [config.target, ...config.features].filter(Boolean);
        if (allVars.length > 0) {
            const isMissing = (value: unknown): boolean => value == null || value === '' || (typeof value === 'number' && isNaN(value));
            const missingCount = data.filter((row) => allVars.some(v => isMissing(row[v as keyof typeof row]))).length;
            checks.push({ label: 'Missing values check', passed: missingCount === 0, detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} row(s) with missing values will be excluded`, severity: 'info' });
        }
        const allCriticalPassed = checks.filter(c => c.severity === 'critical').every(c => c.passed);
        return { checks, allCriticalPassed };
    }, [data, config]);
}

function useExportHandlers({ analysisResult, config, data, resultsRef }: { analysisResult: FullAnalysisResponse | null; config: LassoConfig; data: DataSet; resultsRef: React.RefObject<HTMLDivElement | null> }) {
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "LASSO REGRESSION RESULTS\n";
        csvContent += `Target Variable: ${config.target}\n`;
        csvContent += `Features: ${config.features.join(', ')}\n`;
        csvContent += `Alpha: ${results.alpha}\n`;
        csvContent += `Alpha Source: ${results.alpha_source}\n\n`;
        const performanceData = [
            { Metric: 'R²', Train: results.metrics.train.r2_score, Test: results.metrics.test.r2_score },
            { Metric: 'RMSE', Train: results.metrics.train.rmse, Test: results.metrics.test.rmse },
            { Metric: 'MAE', Train: results.metrics.train.mae, Test: results.metrics.test.mae }
        ];
        csvContent += "MODEL PERFORMANCE\n" + Papa.unparse(performanceData) + "\n\n";
        const coeffData = Object.entries(results.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([f, c]) => ({ Feature: f, Coefficient: c, Status: isFeatureSelected(c) ? 'Selected' : 'Excluded' }));
        csvContent += "COEFFICIENTS\n" + Papa.unparse(coeffData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Lasso_Regression_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: 'CSV Downloaded' });
    }, [analysisResult, config, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Lasso_Regression_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image;
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [resultsRef, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word document..." });
        try {
            const response = await fetch('/api/export/lasso-regression-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult.results, target: config.target, features: config.features, sampleSize: data.length, testSize: config.testSize })
            });
            if (!response.ok) throw new Error('Failed to generate document');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Lasso_Regression_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed to generate document" }); }
    }, [analysisResult, config, data.length, toast]);

    return { handleDownloadCSV, handleDownloadPNG, handleDownloadDOCX, isDownloading };
}

interface LassoRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function LassoRegressionPage({ data, numericHeaders, onLoadExample }: LassoRegressionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);

    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [config, dispatch] = useReducer(configReducer, INITIAL_CONFIG);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== config.target), [numericHeaders, config.target]);

    const { analysisResult, isLoading, error, runAnalysis, resetAnalysis } = useLassoAnalysis({ data, config });
    const { checks: dataValidation, allCriticalPassed } = useDataValidation(data, config);
    const exportHandlers = useExportHandlers({ analysisResult, config, data, resultsRef });

    useEffect(() => {
        if (data.length === 0) {
            setView('intro');
        } else if (canRun) {
            const defaultTarget = numericHeaders[numericHeaders.length - 1] || '';
            const defaultFeatures = numericHeaders.filter(h => h !== defaultTarget);
            dispatch({ type: 'RESET', payload: { defaultTarget, defaultFeatures } });
            setView('main');
            resetAnalysis();
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun, resetAnalysis]);

    useEffect(() => {
        if (error) toast({ variant: 'destructive', title: 'Analysis Error', description: error });
    }, [error, toast]);

    const goToStep = useCallback((step: Step) => {
        setCurrentStep(step);
        setMaxReachedStep(prev => Math.max(prev, step) as Step);
    }, []);

    const nextStep = useCallback(() => { if (currentStep < 6) goToStep((currentStep + 1) as Step); }, [currentStep, goToStep]);
    const prevStep = useCallback(() => { if (currentStep > 1) goToStep((currentStep - 1) as Step); }, [currentStep, goToStep]);

    const handleAnalysis = useCallback(async () => {
        const success = await runAnalysis();
        if (success) goToStep(4);
    }, [runAnalysis, goToStep]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 👇 Guide 컴포넌트 추가 */}
            <LassoRegressionGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />

            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Lasso Regression</h1>
                    <p className="text-muted-foreground mt-1">Regularized regression with automatic feature selection</p>
                </div>
                {/* 👇 버튼 수정 */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)} aria-label="Glossary">
                        <HelpCircle className="w-5 h-5" />
                    </Button>
                </div>
            </div>
    
            <ProgressBar currentStep={currentStep} maxReachedStep={maxReachedStep} onStepClick={goToStep} />


            <div className="min-h-[500px]">
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Select Variables</CardTitle><CardDescription>Choose your target and feature variables</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Target Variable (Y)</Label>
                                <Select value={config.target} onValueChange={(v) => dispatch({ type: 'SET_TARGET', payload: v })}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Select target variable" /></SelectTrigger>
                                    <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Feature Variables (X)</Label>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_FEATURES', payload: availableFeatures })} disabled={config.features.length === availableFeatures.length}>Select All</Button>
                                        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_FEATURES', payload: [] })} disabled={config.features.length === 0}>Clear</Button>
                                    </div>
                                </div>
                                <ScrollArea className="h-40 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableFeatures.map(h => (
                                            <div key={h} className="flex items-center space-x-2">
                                                <Checkbox id={`feat-${h}`} checked={config.features.includes(h)} onCheckedChange={(checked) => dispatch({ type: 'TOGGLE_FEATURE', payload: { feature: h, checked: !!checked } })} />
                                                <label htmlFor={`feat-${h}`} className="text-sm cursor-pointer truncate">{h}</label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">{config.features.length} of {availableFeatures.length} features selected</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!config.target || config.features.length === 0}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Model Settings</CardTitle><CardDescription>Configure Lasso regularization parameters</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                                <div className="space-y-1"><Label className="text-sm font-medium">Use Cross-Validation</Label><p className="text-xs text-muted-foreground">Automatically find optimal alpha value</p></div>
                                <Switch checked={config.useCv} onCheckedChange={(checked) => dispatch({ type: 'SET_USE_CV', payload: checked })} />
                            </div>
                            {config.useCv ? (
                                <div className="space-y-4 p-4 border rounded-xl">
                                    <div>
                                        <Label className="text-sm font-medium">CV Folds: {config.cvFolds}</Label>
                                        <Slider value={[config.cvFolds]} onValueChange={(v) => dispatch({ type: 'SET_CV_FOLDS', payload: v[0] })} min={3} max={10} step={1} className="mt-2" />
                                        <p className="text-xs text-muted-foreground mt-1">Number of folds for cross-validation (3-10)</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium">Alpha (Regularization Strength): {config.alpha.toFixed(3)}</Label>
                                        <Slider value={[config.alpha]} onValueChange={(v) => dispatch({ type: 'SET_ALPHA', payload: v[0] })} min={0.001} max={10.0} step={0.001} className="mt-2" />
                                        <p className="text-xs text-muted-foreground mt-1">Higher values increase feature selection (more coefficients → 0)</p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <Label className="text-sm font-medium">Test Set Size: {Math.round(config.testSize * 100)}%</Label>
                                <Slider value={[config.testSize]} onValueChange={(v) => dispatch({ type: 'SET_TEST_SIZE', payload: v[0] })} min={0.1} max={0.5} step={0.05} className="mt-2" />
                                <p className="text-xs text-muted-foreground mt-1">Proportion reserved for model evaluation</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Model Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Target:</strong> {config.target || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Features:</strong> {config.features.length > 0 ? `${config.features.length} selected` : 'None'}</p>
                                    <p>• <strong className="text-foreground">Alpha:</strong> {config.useCv ? 'Auto (CV)' : config.alpha.toFixed(3)}</p>
                                    <p>• <strong className="text-foreground">Train/Test Split:</strong> {Math.round((1 - config.testSize) * 100)}% / {Math.round(config.testSize * 100)}%</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{dataValidation.map((check, idx) => <ValidationCheckItem key={idx} check={check} />)}</div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Container className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Lasso regression with L1 regularization {config.useCv ? `(CV with ${config.cvFolds} folds)` : `(α = ${config.alpha.toFixed(3)})`} will be performed.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={handleAnalysis} disabled={!allCriticalPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const testR2 = results.metrics.test.r2_score;
                    const trainR2 = results.metrics.train.r2_score;
                    const explainedPct = (testR2 * 100).toFixed(0);
                    const { n_selected, n_total } = getFeatureSelectionInfo(results);
                    const trainTestGap = Math.abs(trainR2 - testR2);
                    const isOverfitting = trainTestGap > 0.1;
                    const r2Interp = getR2Interpretation(testR2);
                    const isGoodModel = testR2 >= 0.25 && !isOverfitting;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
                                    <div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings about predicting {config.target}</CardDescription></div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGoodModel ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGoodModel ? 'text-primary' : 'text-destructive'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGoodModel ? 'text-primary' : 'text-destructive'}`}>•</span><p className="text-sm">The model explains <strong>{explainedPct}%</strong> of the variation in <strong>{config.target}</strong> on new data. {testR2 >= 0.5 ? 'This indicates good predictive power.' : testR2 >= 0.25 ? 'This is an acceptable level.' : 'Improvement is needed.'}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGoodModel ? 'text-primary' : 'text-destructive'}`}>•</span><p className="text-sm">Lasso selected <strong>{n_selected} out of {n_total}</strong> variables as important predictors. {n_total - n_selected > 0 && `(${n_total - n_selected} were excluded as non-influential)`}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGoodModel ? 'text-primary' : 'text-destructive'}`}>•</span><p className="text-sm">{isOverfitting ? `There is a gap between training (${(trainR2 * 100).toFixed(0)}%) and test (${explainedPct}%) performance. Possible overfitting.` : `Training and test performance are similar. The model should generalize well to new data.`}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isGoodModel ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGoodModel ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-destructive" />}
                                        <div>
                                            <p className="font-semibold">{testR2 >= 0.5 ? "Ready for Prediction!" : testR2 >= 0.25 ? "Useful Model" : "Model Needs Improvement"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{testR2 >= 0.5 ? `The model explains more than half of ${config.target}'s variation. Use it for predictions.` : testR2 >= 0.25 ? `Meaningful patterns were captured. Additional variables could improve it.` : `The selected variables don't explain ${config.target} well. Try different predictors.`}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><BarChart className="w-4 h-4 text-slate-600" />Evidence</h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Test R²:</strong> {testR2.toFixed(4)} — {r2Interp.desc}.</p>
                                        <p>• <strong>Train vs Test:</strong> {(trainR2 * 100).toFixed(0)}% vs {explainedPct}% — {trainTestGap < 0.1 ? 'Small gap indicates low risk of overfitting.' : 'Gap suggests possible overfitting.'}</p>
                                        <p>• <strong>RMSE:</strong> {results.metrics.test.rmse.toFixed(4)} — Average prediction error.</p>
                                        <p>• <strong>Alpha (α):</strong> {results.alpha.toFixed(4)} {results.alpha_source === 'cross_validation' ? '(CV-optimized)' : '(user specified)'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricCard label="Test R²" value={`${explainedPct}%`} subtitle={r2Interp.label} icon={Target} />
                                    <MetricCard label="Selected" value={`${n_selected}/${n_total}`} subtitle="Features kept" icon={Layers} />
                                    <MetricCard label="RMSE" value={results.metrics.test.rmse.toFixed(2)} subtitle="Typical error" icon={BarChart} />
                                    <MetricCard label="Alpha" value={results.alpha.toFixed(3)} subtitle={results.alpha_source === 'cross_validation' ? 'CV-optimized' : 'User set'} icon={Percent} />
                                </div>
                                <div className="flex items-center justify-center gap-2 py-2">
                                    <span className="text-sm text-muted-foreground">Prediction Power:</span>
                                    <StarRating value={r2Interp.stars} />
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const testR2 = results.metrics.test.r2_score;
                    const trainR2 = results.metrics.train.r2_score;
                    const { n_selected, n_total } = getFeatureSelectionInfo(results);
                    const isOverfitting = Math.abs(trainR2 - testR2) > 0.1;
                    const isGoodModel = testR2 >= 0.25;
                    const topFeatures = Object.entries(results.coefficients).filter(([_, c]) => isFeatureSelected(c)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div>
                                    <div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of how Lasso works</CardDescription></div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div><h4 className="font-semibold mb-1">What Lasso Does</h4><p className="text-sm text-muted-foreground">Lasso adds a penalty that forces unimportant feature coefficients to become <strong className="text-foreground">exactly zero</strong>. This automatically selects the most important predictors for {config.target}.</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div><h4 className="font-semibold mb-1">What Got Selected</h4><p className="text-sm text-muted-foreground">With α = {results.alpha.toFixed(3)}, Lasso kept <strong className="text-foreground">{n_selected}</strong> features and eliminated <strong className="text-foreground">{n_total - n_selected}</strong>.{topFeatures.length > 0 && <> Top predictors: <strong className="text-foreground">{topFeatures.map(([f]) => f).join(', ')}</strong>.</>}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div><h4 className="font-semibold mb-1">How Well Does It Predict?</h4><p className="text-sm text-muted-foreground">The model explains <strong className="text-foreground">{(testR2 * 100).toFixed(0)}%</strong> of {config.target}'s variation on new (test) data. {isOverfitting ? `Training R² (${(trainR2 * 100).toFixed(0)}%) is notably higher — consider increasing alpha.` : `Training (${(trainR2 * 100).toFixed(0)}%) and test performance are similar — good generalization!`}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div><h4 className="font-semibold mb-1">Adjusting Alpha</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">Higher alpha</strong> = more aggressive feature elimination (simpler model). <strong className="text-foreground">Lower alpha</strong> = keeps more features (closer to regular regression).</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isGoodModel ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">{isGoodModel ? <><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line: Model Is Useful</> : <><AlertTriangle className="w-5 h-5 text-destructive" />Bottom Line: Needs More Work</>}</h4>
                                    <p className="text-sm text-muted-foreground">{isGoodModel ? `Lasso identified ${n_selected} key predictors for ${config.target}. Use the coefficient path plot to explore different alpha values.` : `The selected features don't explain much. Try different variables or explore the regularization path for insights.`}</p>
                                </div>
                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />R² Interpretation Guide</h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;25%</p><p className="text-muted-foreground">Weak</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">25-50%</p><p className="text-muted-foreground">Moderate</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">50-75%</p><p className="text-muted-foreground">Good</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;75%</p><p className="text-muted-foreground">Excellent</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between">
                                <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                                <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4 w-full">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={exportHandlers.handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={exportHandlers.handleDownloadPNG} disabled={exportHandlers.isDownloading}>{exportHandlers.isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={exportHandlers.handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Lasso Regression Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">{config.target} ~ {config.features.length > 3 ? `${config.features.slice(0, 3).join(' + ')} + ${config.features.length - 3} more` : config.features.join(' + ')} | α = {results.alpha.toFixed(3)} {results.alpha_source === 'cross_validation' && '(CV)'} | {new Date().toLocaleDateString()}</p>
                            </div>

                            <StatisticalSummaryCards results={results} />

                            {(results.n_dropped ?? 0) > 0 && (
                                <Card><CardContent className="pt-6"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Missing Values</AlertTitle><AlertDescription>{results.n_dropped} row(s) excluded due to missing values.</AlertDescription></Alert></CardContent></Card>
                            )}

                            {results.vif && Object.entries(results.vif).some(([_, v]) => v !== null && v > 5) && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <Alert>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Multicollinearity Detected</AlertTitle>
                                            <AlertDescription>
                                                Some features have high VIF values, indicating potential multicollinearity.
                                                {Object.entries(results.vif).filter(([_, v]) => v !== null && v > 5).slice(0, 3).map(([f, v]) => (
                                                    <span key={f} className="block text-xs mt-1">{f}: VIF = {v!.toFixed(2)} ({v! > 10 ? 'severe' : 'moderate'})</span>
                                                ))}
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                A Lasso regression (L1-regularized) was performed to predict {config.target} from {config.features.length} candidate predictor{config.features.length > 1 ? 's' : ''}.
                                                The data were split into training (<em>n</em> = {Math.round((1 - config.testSize) * data.length)}) and test (<em>n</em> = {data.length - Math.round((1 - config.testSize) * data.length)}) sets using a {Math.round((1 - config.testSize) * 100)}/{Math.round(config.testSize * 100)} split.
                                                {results.alpha_source === 'cross_validation' ? ` The optimal regularization parameter α = ${results.alpha.toFixed(4)} was selected via ${results.cv_folds}-fold cross-validation.` : ` The regularization parameter was set to α = ${results.alpha.toFixed(3)}.`}
                                            </p>
                                            {(() => {
                                                const fsInfo = getFeatureSelectionInfo(results);
                                                return (
                                                    <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                        The Lasso procedure selected {fsInfo.n_selected} of {fsInfo.n_total} features by shrinking {fsInfo.n_excluded} coefficient{fsInfo.n_excluded !== 1 ? 's' : ''} to zero.
                                                        The model achieved <span className="font-mono"><em>R</em>² = {results.metrics.test.r2_score.toFixed(3)}</span> on the test set, explaining {(results.metrics.test.r2_score * 100).toFixed(1)}% of the variance in {config.target}.
                                                        Training performance was <span className="font-mono"><em>R</em>² = {results.metrics.train.r2_score.toFixed(3)}</span>,
                                                        {Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score) > 0.1 ? ` indicating a gap of ${(Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score) * 100).toFixed(1)} percentage points that suggests some overfitting.` : ` with a train-test gap of only ${(Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score) * 100).toFixed(1)} percentage points, indicating good generalization.`}
                                                    </p>
                                                );
                                            })()}
                                            {(() => {
                                                const topFeatures = Object.entries(results.coefficients).filter(([_, c]) => isFeatureSelected(c)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
                                                return topFeatures.length > 0 && (
                                                    <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                        The most influential predictors were: {topFeatures.slice(0, 5).map(([f, c], idx) => (<span key={f}>{idx > 0 && ', '}{f} (<span className="font-mono"><em>b</em> = {c.toFixed(3)}</span>)</span>))}{topFeatures.length > 5 && `, and ${topFeatures.length - 5} others`}.
                                                    </p>
                                                );
                                            })()}
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                The root mean square error on the test set was RMSE = {results.metrics.test.rmse.toFixed(3)}, with mean absolute error MAE = {results.metrics.test.mae.toFixed(3)}.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {analysisResult?.plot && (
                                <Card>
                                    <CardHeader><CardTitle>Diagnostic Plots</CardTitle><CardDescription>Visual assessment of model fit and residual patterns</CardDescription></CardHeader>
                                    <CardContent><Image src={analysisResult.plot} alt="Lasso Regression Diagnostic Plots" width={1500} height={1200} className="w-full h-auto rounded-md border" /></CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Train vs. Test Performance</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Train</TableHead><TableHead className="text-right">Test</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow><TableCell className="font-medium">R²</TableCell><TableCell className="text-right font-mono">{results.metrics.train.r2_score.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.metrics.test.r2_score.toFixed(4)}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">RMSE</TableCell><TableCell className="text-right font-mono">{results.metrics.train.rmse.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.metrics.test.rmse.toFixed(4)}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">MAE</TableCell><TableCell className="text-right font-mono">{results.metrics.train.mae.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.metrics.test.mae.toFixed(4)}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {analysisResult?.path_plot && (
                                <Card>
                                    <CardHeader><CardTitle>Regularization Path</CardTitle><CardDescription>Shows how coefficients shrink toward zero as alpha increases</CardDescription></CardHeader>
                                    <CardContent><Image src={analysisResult.path_plot} alt="Lasso Coefficient Path" width={1500} height={1200} className="w-full h-auto rounded-md border" /></CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Model Coefficients</CardTitle><CardDescription>Features with coefficients near zero have been eliminated by Lasso</CardDescription></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-96">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead className="text-right">Coefficient</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                <TableRow><TableCell className="font-semibold">(Intercept)</TableCell><TableCell className="text-right font-mono">{results.intercept.toFixed(4)}</TableCell><TableCell className="text-right"><Badge variant="outline">Intercept</Badge></TableCell></TableRow>
                                                {Object.entries(results.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([feature, coeff]) => {
                                                    const isZero = !isFeatureSelected(coeff);
                                                    return (
                                                        <TableRow key={feature}>
                                                            <TableCell className={isZero ? 'text-muted-foreground' : ''}>{feature}</TableCell>
                                                            <TableCell className={`text-right font-mono ${isZero ? 'text-muted-foreground' : ''}`}>{formatCoefficient(coeff)}</TableCell>
                                                            <TableCell className="text-right"><Badge variant={isZero ? 'secondary' : 'default'}>{isZero ? 'Excluded' : 'Selected'}</Badge></TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                                <CardFooter><p className="text-sm text-muted-foreground">Lasso automatically performs feature selection by shrinking coefficients to exactly zero.</p></CardFooter>
                            </Card>
                        </div>

                        <div className="mt-4 flex justify-start">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                        </div>
                    </>
                )}
            </div>

            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
        </div>
    );
}