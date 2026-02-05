'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Percent, HelpCircle, Settings, FileSearch, TrendingUp, Target, BarChart, Layers, FileType, CheckCircle, AlertTriangle, BookOpen, PieChart, Activity, Sparkles, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, Info, ArrowRight, ChevronDown, FileText, Code, Copy } from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/relative_importance.py?alt=media";

const metricDefinitions: Record<string, string> = {
    relative_weight: "A measure of each predictor's proportional contribution to R², accounting for shared variance among predictors. Relative weights sum to total R².",
    relative_weight_pct: "The percentage of explained variance (R²) attributable to each predictor. Higher percentages indicate greater importance.",
    standardized_beta: "The standardized regression coefficient (β) showing the expected change in the outcome (in standard deviations) for a one standard deviation increase in the predictor.",
    semi_partial_r2: "The unique variance explained by a predictor after controlling for other predictors. Also called squared semi-partial correlation.",
    r_squared: "The proportion of variance in the dependent variable explained by all predictors together. Ranges from 0 to 1.",
    predictor_rank: "The ordinal position of each predictor based on its relative weight, with rank 1 being the most important.",
    variance_explained: "The amount of variability in the outcome that can be accounted for by the predictors in the model.",
    multicollinearity: "When predictors are highly correlated with each other, making it difficult to isolate individual effects. Relative weights help address this issue.",
    johnson_method: "A statistical technique (Johnson, 2000) that partitions R² among predictors to provide unbiased importance estimates even with correlated predictors."
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Relative Importance Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in relative importance analysis
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

interface ImportanceResult {
    predictor: string;
    standardized_beta: number;
    semi_partial_r2: number;
    relative_weight_pct: number;
    rank: number;
}

interface FullAnalysisResponse {
    results: ImportanceResult[];
    interpretation?: string;
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
    if (r2 >= 75) return { label: 'Excellent', desc: 'excellent explanatory power' };
    if (r2 >= 50) return { label: 'Good', desc: 'good explanatory power' };
    if (r2 >= 25) return { label: 'Moderate', desc: 'moderate explanatory power' };
    return { label: 'Weak', desc: 'weak explanatory power' };
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
        link.download = 'relative_importance.py';
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
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Relative Importance</DialogTitle>
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

const StatisticalSummaryCards = ({ results }: { results: ImportanceResult[] }) => {
    const topPredictor = results[0];
    const totalVarianceExplained = results.reduce((sum, r) => sum + r.relative_weight_pct, 0);
    const avgImportance = totalVarianceExplained / results.length;
    const importanceSpread = Math.max(...results.map(r => r.relative_weight_pct)) - Math.min(...results.map(r => r.relative_weight_pct));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Top Predictor</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-xl font-semibold truncate" title={topPredictor.predictor}>{topPredictor.predictor}</p><p className="text-xs text-muted-foreground">{topPredictor.relative_weight_pct.toFixed(1)}% contribution</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Total R²</p><Percent className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{totalVarianceExplained.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{getR2Interpretation(totalVarianceExplained).label}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Avg. Importance</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{avgImportance.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Per predictor</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Spread</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{importanceSpread.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{importanceSpread > 30 ? 'Clear hierarchy' : 'Similar importance'}</p></div></CardContent></Card>
        </div>
    );
};


// Relative Importance Analysis Guide Component
const RelativeImportanceGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Relative Importance Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Relative Importance */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                What is Relative Importance?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Relative importance analysis decomposes R² to determine <strong>how much each predictor contributes</strong> 
                to the total explained variance. Unlike standardized coefficients, it provides unbiased estimates 
                even when predictors are correlated.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Insight:</strong> Relative weights always sum to the total R², giving you a 
                  &quot;pie slice&quot; view of predictor contributions that adds up to 100% of explained variance.
                </p>
              </div>
            </div>

            <Separator />

            {/* Why Not Just Use Beta Coefficients */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Why Not Just Use Beta Coefficients?
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="font-medium text-sm">The Problem with Standardized Betas</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Multicollinearity:</strong> When predictors are correlated, betas can be misleading</li>
                  <li>• <strong>Suppression effects:</strong> A predictor may have small β but large importance</li>
                  <li>• <strong>Don&apos;t sum to R²:</strong> Can&apos;t tell proportional contribution</li>
                  <li>• <strong>Sign issues:</strong> Negative β doesn&apos;t mean negative importance</li>
                </ul>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm">Relative Weights Solution</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• Properly handles correlated predictors</li>
                  <li>• Always positive (contribution is always positive)</li>
                  <li>• Sums exactly to R² (interpretable percentages)</li>
                  <li>• Unbiased even with multicollinearity</li>
                </ul>
              </div>
            </div>

            <Separator />

            {/* Key Metrics Explained */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Key Metrics Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Relative Weight %</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The main importance metric. Shows what percentage of R² each predictor contributes.
                    <br/><strong>Example:</strong> If R² = 60% and X₁&apos;s relative weight = 25%, X₁ explains 
                    25% of that 60% (= 15 percentage points of total variance).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Standardized Beta (β)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Traditional regression coefficient. Shows expected change in Y (in SDs) for 1 SD change in X.
                    <br/><strong>Caution:</strong> Can be misleading with correlated predictors. Use relative weights instead.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Semi-Partial R²</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The unique variance explained by a predictor after controlling for others.
                    <br/>Often smaller than relative weight because it ignores shared variance.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Rank</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ordinal position based on relative weight. #1 = most important predictor.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting R² */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Interpreting Total R²
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">
                  Total R² tells you how much variance your predictors explain together.
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted border border-border text-center">
                    <p className="font-medium">&lt; 25%</p>
                    <p className="text-muted-foreground">Weak</p>
                  </div>
                  <div className="p-2 rounded bg-muted border border-border text-center">
                    <p className="font-medium">25-50%</p>
                    <p className="text-muted-foreground">Moderate</p>
                  </div>
                  <div className="p-2 rounded bg-muted border border-border text-center">
                    <p className="font-medium">50-75%</p>
                    <p className="text-muted-foreground">Good</p>
                  </div>
                  <div className="p-2 rounded bg-muted border border-border text-center">
                    <p className="font-medium">&gt; 75%</p>
                    <p className="text-muted-foreground">Excellent</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Note: &quot;Good&quot; R² varies by field. In social sciences, 25% may be excellent; 
                in physics, 95%+ is expected.
              </p>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                When to Use Relative Importance
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Use When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Predictors are correlated with each other</li>
                    <li>• You need to rank predictor importance</li>
                    <li>• Stakeholders want &quot;percentage contribution&quot;</li>
                    <li>• Resource allocation based on impact</li>
                    <li>• Comparing importance across models</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Consider Alternatives When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• You need causal inference (use experiments)</li>
                    <li>• Predictors are truly uncorrelated (β works fine)</li>
                    <li>• You need prediction, not explanation</li>
                    <li>• Non-linear relationships (consider ML methods)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Practical Tips */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Practical Tips
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Sample Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aim for at least 10-20 observations per predictor. With 5 predictors, 
                    you need minimum 50-100 observations for stable estimates.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Multicollinearity Check</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    While relative weights handle moderate correlation, extremely high collinearity 
                    (r &gt; 0.9) between predictors can still cause issues. Consider combining or removing 
                    redundant predictors.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">Reporting Results</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Report: (1) Total R², (2) Relative weight % for each predictor, (3) Rankings.
                    Optionally include standardized betas for comparison with other studies.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Relative importance tells you 
                <strong> how much</strong> each predictor matters, not <strong>why</strong> it matters. 
                It&apos;s descriptive, not causal. A predictor with high importance may be a proxy for an 
                unmeasured variable. Always combine with domain knowledge and theory.
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
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Percent className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Relative Importance Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Determine the true contribution of each predictor, even with multicollinearity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><PieChart className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Decompose R²</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Split total variance into predictor contributions</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Handle Correlation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Accurate importance despite multicollinearity</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Sparkles className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Clear Rankings</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Identify your most influential predictors</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use relative importance analysis when you need to understand which predictors matter most in your regression model, especially when predictors are correlated.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Dependent:</strong> One numeric outcome</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Predictors:</strong> At least 2 numeric variables</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Sample size:</strong> 10+ per predictor</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Understanding Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Relative Weight %:</strong> Main importance metric</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Sum to R²:</strong> Weights total to model R²</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong>Ranking:</strong> Compare predictor importance</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg"><Percent className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RelativeImportancePageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RelativeImportancePage({ data, numericHeaders, onLoadExample }: RelativeImportancePageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [dependentVar, setDependentVar] = useState<string>('');
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Dependent variable selected', passed: dependentVar !== '', detail: dependentVar ? `Y: ${dependentVar}` : 'Please select a dependent variable' });
        checks.push({ label: 'At least 2 predictors selected', passed: independentVars.length >= 2, detail: independentVars.length >= 2 ? `${independentVars.length} predictors selected` : 'Need at least 2 predictors for relative importance' });
        checks.push({ label: 'Sufficient sample size', passed: data.length >= 30, detail: `n = ${data.length} observations (minimum: 30)` });
        if (independentVars.length > 0) {
            const ratio = Math.floor(data.length / independentVars.length);
            checks.push({ label: 'Observations per predictor', passed: ratio >= 10, detail: `${ratio} observations per predictor (recommended: 10+)` });
        }
        return checks;
    }, [data, dependentVar, independentVars]);

    const allValidationsPassed = useMemo(() => {
        const criticalChecks = dataValidation.filter(c => c.label === 'Dependent variable selected' || c.label === 'At least 2 predictors selected');
        return criticalChecks.every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0) {
            setView('intro');
        } else if (canRun) {
            const defaultTarget = numericHeaders[numericHeaders.length - 1] || '';
            if (!dependentVar) setDependentVar(defaultTarget);
            if (independentVars.length === 0) setIndependentVars(numericHeaders.filter(h => h !== defaultTarget));
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleIVChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true); toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Relative_Importance_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image; link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        const totalVariance = results.reduce((sum, r) => sum + r.relative_weight_pct, 0);
        let csvContent = "RELATIVE IMPORTANCE ANALYSIS\n";
        csvContent += `Dependent: ${dependentVar}\nTotal R²: ${totalVariance.toFixed(1)}%\n\n`;
        const importanceData = results.map(row => ({ Predictor: row.predictor, Rank: row.rank, Relative_Weight: row.relative_weight_pct, Std_Beta: row.standardized_beta }));
        csvContent += Papa.unparse(importanceData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Relative_Importance_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: 'Download Started' });
    }, [analysisResult, dependentVar, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/relative-importance-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult.results, dependentVar, independentVars, sampleSize: data.length })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Relative_Importance_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, dependentVar, independentVars, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length < 2) { toast({ variant: 'destructive', title: 'Selection Error', description: 'Need at least 2 predictors.' }); return; }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/relative-importance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent_var: dependentVar, independent_vars: independentVars })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            goToStep(4);
        } catch (error: any) {
            const errorMsg = error.message || 'An unexpected error occurred';
            if (errorMsg.includes('multicollinearity') || errorMsg.includes('correlated')) {
                toast({ variant: 'destructive', title: 'Multicollinearity Detected', description: 'Please remove highly correlated variables.', duration: 10000 });
            } else {
                toast({ variant: 'destructive', title: 'Analysis Error', description: errorMsg });
            }
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;
    const totalVariance = results ? results.reduce((sum, r) => sum + r.relative_weight_pct, 0) : 0;
    const topPredictor = results?.[0];

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
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

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
    <div>
        <h1 className="text-2xl font-bold">Relative Importance Analysis</h1>
        <p className="text-muted-foreground mt-1">Decompose R² to find true predictor contributions</p>
    </div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose your dependent and independent variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Dependent Variable (Y)</Label>
                                    <Select value={dependentVar} onValueChange={setDependentVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Independent Variables (X)</Label>
                                    <ScrollArea className="h-40 border rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {availableIVs.map(h => (
                                                <div key={h} className="flex items-center space-x-2">
                                                    <Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIVChange(h, !!c)} />
                                                    <label htmlFor={`iv-${h}`} className="text-sm cursor-pointer">{h}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <p className="text-xs text-muted-foreground">{independentVars.length} predictors selected (minimum: 2)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Review your analysis configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Analysis Configuration</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Dependent Variable:</strong> {dependentVar || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Independent Variables:</strong> {independentVars.length > 0 ? independentVars.join(', ') : 'None'}</p>
                                    <p>• <strong className="text-foreground">Number of Predictors:</strong> {independentVars.length}</p>
                                    <p>• <strong className="text-foreground">Method:</strong> Relative weight analysis (Johnson, 2000)</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Method Information</h4>
                                <p className="text-sm text-muted-foreground">Relative importance analysis decomposes the total R² into additive contributions from each predictor. Unlike standardized coefficients, relative weights handle multicollinearity appropriately and always sum to the total variance explained.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Note: Predictors should not be perfectly correlated. If multicollinearity is detected, consider removing some variables.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const hasGoodFit = totalVariance >= 50;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Which predictors matter most for {dependentVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${hasGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm"><strong>{topPredictor?.predictor}</strong> is the most important predictor, contributing <strong>{topPredictor?.relative_weight_pct.toFixed(1)}%</strong> to the explained variance.</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">Together, all {results.length} predictors explain <strong>{totalVariance.toFixed(1)}%</strong> of what drives <strong>{dependentVar}</strong>.</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${hasGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{hasGoodFit ? "The model explains a substantial portion of the variance." : `The remaining ${(100 - totalVariance).toFixed(1)}% is due to factors not included in the model.`}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${hasGoodFit ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {hasGoodFit ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{hasGoodFit ? "Strong Predictive Model!" : "Room for Improvement"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{hasGoodFit ? `Focus on ${topPredictor?.predictor} for maximum impact on ${dependentVar}.` : "Consider adding more predictors to capture additional variance."}</p>
                                        </div>
                                    </div>
                                </div>
                                <StatisticalSummaryCards results={results} />
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Model Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => (<span key={star} className={`text-lg ${(totalVariance >= 75 && star <= 5) || (totalVariance >= 50 && star <= 4) || (totalVariance >= 25 && star <= 3) || (totalVariance >= 10 && star <= 2) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>))}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const topThree = results.slice(0, 3);
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of relative importance</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div><h4 className="font-semibold mb-1">What We Measured</h4><p className="text-sm text-muted-foreground">We decomposed the model's total explanatory power (<strong className="text-foreground">{totalVariance.toFixed(1)}%</strong>) into individual contributions from each predictor, accounting for correlations between them.</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div><h4 className="font-semibold mb-1">Why This Matters</h4><p className="text-sm text-muted-foreground">Regular regression coefficients can be misleading when predictors are correlated. Relative importance analysis gives you <strong className="text-foreground">unbiased</strong> importance rankings that properly attribute shared variance.</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div><h4 className="font-semibold mb-1">The Rankings</h4><p className="text-sm text-muted-foreground">Your top {Math.min(3, results.length)} predictors are:{topThree.map((r, i) => (<span key={r.predictor}><strong className="text-foreground"> #{i + 1} {r.predictor}</strong> ({r.relative_weight_pct.toFixed(1)}%){i < topThree.length - 1 ? ',' : '.'}</span>))}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div><h4 className="font-semibold mb-1">How to Use This</h4><p className="text-sm text-muted-foreground">Focus on the top-ranked predictors for maximum impact on <strong className="text-foreground">{dependentVar}</strong>. The relative weights tell you exactly how much each predictor contributes — percentages sum to the total R².</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${totalVariance >= 50 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">{totalVariance >= 50 ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Clear Winner</> : <><AlertTriangle className="w-5 h-5 text-amber-600" /> Bottom Line: Prioritize Top Predictors</>}</h4>
                                    <p className="text-sm text-muted-foreground">{totalVariance >= 50 ? `${topPredictor?.predictor} dominates the model. Invest resources here for maximum effect on ${dependentVar}.` : `With ${totalVariance.toFixed(1)}% explained, focus on top predictors while exploring additional variables.`}</p>
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
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (() => {
                    const n = data.length;
                    return (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Relative Importance Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">DV: {dependentVar} | Predictors: {independentVars.length} | R²: {totalVariance.toFixed(1)}% | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">A relative importance analysis was conducted to determine the unique contribution of {independentVars.length} predictors to the variance in {dependentVar}. The sample included <em>N</em> = {n} observations.</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">The full model explained <span className="font-mono"><em>R</em>² = {(totalVariance / 100).toFixed(4)}</span> ({totalVariance.toFixed(1)}%) of the variance in {dependentVar}. Using relative weight analysis (Johnson, 2000), this variance was partitioned among predictors to yield unbiased importance estimates.</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">The most important predictor was {topPredictor?.predictor}, accounting for {topPredictor?.relative_weight_pct.toFixed(1)}% of the explained variance (relative weight = {((topPredictor?.relative_weight_pct || 0) / 100).toFixed(4)}, standardized β = {topPredictor?.standardized_beta.toFixed(3)}).{results.length > 1 && ` The remaining ${results.length - 1} predictor${results.length > 2 ? 's' : ''} contributed ${(totalVariance - (topPredictor?.relative_weight_pct || 0)).toFixed(1)}% collectively.`}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader><CardTitle>Importance Rankings</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold">Visual Ranking</h4>
                                    {results.map((row, idx) => (
                                        <div key={row.predictor} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">#{idx + 1} {row.predictor}</span>
                                                <Badge variant={idx === 0 ? 'default' : 'secondary'}>{row.relative_weight_pct.toFixed(1)}%</Badge>
                                            </div>
                                            <Progress value={row.relative_weight_pct} className="h-2" />
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-3">Detailed Metrics</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Predictor</TableHead><TableHead className="text-right">Std. Beta</TableHead><TableHead className="text-right">Semi-Partial R²</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {results.map(row => (
                                                <TableRow key={row.predictor}>
                                                    <TableCell className="font-medium">{row.predictor}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm">{row.standardized_beta.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm">{row.semi_partial_r2?.toFixed(3) ?? '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Complete Analysis Table</CardTitle><CardDescription>All importance metrics for each predictor</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Predictor</TableHead>
                                            <TableHead className="text-right">Std. Beta</TableHead>
                                            <TableHead className="text-right">Semi-Partial R²</TableHead>
                                            <TableHead className="text-right">Relative Weight</TableHead>
                                            <TableHead className="text-right">Rank</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map(row => (
                                            <TableRow key={row.predictor}>
                                                <TableCell className="font-medium">{row.predictor}</TableCell>
                                                <TableCell className="text-right font-mono">{row.standardized_beta.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.semi_partial_r2?.toFixed(3) ?? '-'}</TableCell>
                                                <TableCell className="text-right font-mono font-semibold">{row.relative_weight_pct.toFixed(1)}%</TableCell>
                                                <TableCell className="text-right"><Badge variant={row.rank === 1 ? 'default' : 'outline'}>#{row.rank}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">Relative weights sum to total R² and provide unbiased importance estimates. Higher percentages = greater contribution.</p></CardFooter>
                        </Card>
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>

            <RelativeImportanceGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
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
