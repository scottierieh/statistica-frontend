'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Shield, TrendingUp, Target, BarChart, HelpCircle, Settings, FileSearch, FileType, CheckCircle, BookOpen, ShieldCheck, Activity, TrendingDown, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, CheckCircle2, Info, FileText, ArrowRight, ChevronDown, AlertTriangle, Sparkles, Layers, Check } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';


const metricDefinitions: Record<string, string> = {
    ols: "Ordinary Least Squares. Standard regression that minimizes squared errors. Sensitive to outliers because extreme values have disproportionate influence.",
    rlm: "Robust Linear Model. Regression method that downweights outliers automatically, providing estimates that represent the typical pattern in data.",
    m_estimator: "Maximum likelihood-type estimator that uses a robust loss function instead of squared errors. Different M-estimators (HuberT, Tukey, etc.) handle outliers differently.",
    hubert: "Huber's T estimator. Combines squared loss for small residuals with absolute loss for large residuals. Good default choice for moderate outliers.",
    tukey_biweight: "Tukey's biweight estimator. Completely ignores observations beyond a threshold. Best for severe outliers.",
    r_squared: "Coefficient of determination. The proportion of variance in Y explained by X. Ranges from 0 to 1.",
    pseudo_r_squared: "An approximation of R² for robust models. Not directly comparable to OLS R², but indicates relative fit quality.",
    coefficient: "The slope parameter showing how much Y changes for each unit increase in X.",
    standard_error: "The estimated uncertainty in the coefficient. Smaller SE means more precise estimates.",
    outlier: "An observation that lies far from the main data pattern. Can be a data error or a genuine extreme value.",
    influential_point: "An observation that strongly affects regression results. Often has high leverage (extreme X value) combined with unusual Y.",
    residual: "The difference between observed and predicted values. Large residuals may indicate outliers.",
    leverage: "How far an observation's X value is from the mean. High leverage points can strongly influence the regression line.",
    scale_estimate: "A robust measure of spread (like MAD) used to standardize residuals for outlier detection.",
    mad: "Median Absolute Deviation. A robust measure of variability that is resistant to outliers, unlike standard deviation."
};


interface RegressionResult {
    params: number[];
    bse: number[];
    r_squared?: number;
    pseudo_r_squared?: number;
    summary?: { [key: string]: string | number };
}

interface FullAnalysisResponse {
    results: {
        ols: RegressionResult;
        rlm: RegressionResult;
    };
    plot: string;
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
    if (r2 >= 0.75) return { label: 'Excellent', desc: 'excellent fit' };
    if (r2 >= 0.50) return { label: 'Good', desc: 'good fit' };
    if (r2 >= 0.25) return { label: 'Moderate', desc: 'moderate fit' };
    return { label: 'Weak', desc: 'weak fit' };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, mNorm }: { results: { ols: RegressionResult; rlm: RegressionResult }, mNorm: string }) => {
    const olsR2 = results.ols.r_squared || 0;
    const rlmPseudoR2 = results.rlm.pseudo_r_squared || 0;
    const coeffDiff = Math.abs(results.ols.params[1] - results.rlm.params[1]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">OLS R²</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{olsR2.toFixed(4)}</p><p className="text-xs text-muted-foreground">{getR2Interpretation(olsR2).label}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RLM Pseudo R²</p><Shield className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{rlmPseudoR2.toFixed(4)}</p><p className="text-xs text-muted-foreground">Robust fit</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Coeff. Diff</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{coeffDiff.toFixed(4)}</p><p className="text-xs text-muted-foreground">{coeffDiff > 0.1 ? 'Outliers present' : 'Minimal'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Method</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-xl font-semibold">{mNorm}</p><p className="text-xs text-muted-foreground">M-estimator</p></div></CardContent></Card>
        </div>
    );
};


const RobustRegressionGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Robust Regression Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Robust Regression */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                What is Robust Regression?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Robust regression is designed to be <strong>resistant to outliers</strong>. Unlike OLS which treats 
                all points equally, robust methods <strong>downweight extreme observations</strong> so they don't 
                distort your results. It's like getting a "typical" trend that isn't pulled by unusual data points.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The key idea:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    OLS minimizes squared errors (outliers have huge influence).<br/>
                    Robust methods use different loss functions that limit outlier influence.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Robust Regression?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You suspect <strong>outliers or extreme values</strong></li>
                    <li>• Data has <strong>heavy-tailed distributions</strong></li>
                    <li>• You want to <strong>compare OLS vs robust</strong> to detect outlier influence</li>
                    <li>• There may be <strong>measurement errors</strong></li>
                    <li>• You need results that represent the <strong>typical pattern</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Keep in mind:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Robust methods have <strong>less statistical power</strong> than OLS when data is clean</li>
                    <li>• Standard errors may be larger</li>
                    <li>• Different M-estimators can give different results</li>
                    <li>• If OLS and robust agree, your data is probably clean</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* M-Estimators Explained */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Understanding M-Estimators
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">HuberT (Recommended Default)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Combines OLS for small residuals with absolute deviation for large ones.
                    <br/><strong>Best for:</strong> General use, moderate outliers
                    <br/><strong>Behavior:</strong> Treats small errors normally, limits large error influence
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">TukeyBiweight</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Completely ignores observations beyond a threshold.
                    <br/><strong>Best for:</strong> Severe outliers, when you want to "reject" bad points
                    <br/><strong>Behavior:</strong> Zero weight for extreme observations
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Hampel</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Three-part function with different treatment zones.
                    <br/><strong>Best for:</strong> Fine control over outlier handling
                    <br/><strong>Behavior:</strong> Gradual downweighting then rejection
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">AndrewWave & RamsayE</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alternative smooth functions for outlier resistance.
                    <br/><strong>Best for:</strong> When HuberT or Tukey don't fit your needs
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Tip:</strong> Start with HuberT. If you suspect severe outliers, try TukeyBiweight. 
                    If results vary dramatically between methods, your data has significant outlier issues.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Interpreting OLS vs Robust Comparison
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Coefficient Difference</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How much the slope changes between OLS and robust.
                    <br/><strong>&lt; 0.1:</strong> Minimal outlier impact — OLS is fine
                    <br/><strong>0.1 - 0.5:</strong> Moderate impact — consider using robust
                    <br/><strong>&gt; 0.5:</strong> Substantial — definitely use robust estimates
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">R² vs Pseudo R²</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    OLS R² and robust Pseudo R² aren't directly comparable.
                    <br/>• OLS R² measures variance explained
                    <br/>• Pseudo R² is an approximation for robust models
                    <br/>• Focus on the <strong>coefficient difference</strong> for outlier detection
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">The Key Question</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Do OLS and robust give similar slopes?</strong>
                    <br/>• <strong>Yes:</strong> Your data is clean. Use OLS (more efficient).
                    <br/>• <strong>No:</strong> Outliers are affecting OLS. Use robust estimates.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Visual Interpretation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Reading the Comparison Plot
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">What to Look For</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Two lines close together:</strong> Good! Outliers aren't a problem.</li>
                    <li>• <strong>Lines diverging:</strong> Outliers are pulling the OLS line.</li>
                    <li>• <strong>Points far from both lines:</strong> These are your outliers.</li>
                    <li>• <strong>OLS line tilted toward distant points:</strong> Classic outlier influence.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Identifying Influential Points</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Look for observations that:
                    <br/>• Are far from the main data cloud
                    <br/>• Have high leverage (extreme X values)
                    <br/>• The OLS line bends toward them but robust doesn't
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
                    <li>• Visualize your data first (scatter plot)</li>
                    <li>• Check for obvious outliers</li>
                    <li>• Ensure sufficient sample size (30+)</li>
                    <li>• Understand why outliers might exist</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Choosing Results</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• If methods agree → use OLS</li>
                    <li>• If methods differ → investigate outliers</li>
                    <li>• Report both for transparency</li>
                    <li>• Justify your final choice</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Handling Outliers</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Data errors:</strong> Fix or remove them</li>
                    <li>• <strong>Real extremes:</strong> Use robust estimates</li>
                    <li>• <strong>Different population:</strong> Analyze separately</li>
                    <li>• Document your decisions</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report both OLS and robust results</li>
                    <li>• Note the M-estimator used</li>
                    <li>• State the coefficient difference</li>
                    <li>• Explain which you used and why</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Robust regression is a diagnostic tool as much 
                as an analysis method. The comparison between OLS and robust tells you about your data quality. 
                When they agree, trust OLS. When they differ, investigate why and consider using robust estimates 
                for more reliable conclusions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

// 👇 RobustRegressionGuide 끝난 후에 추가
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Robust Regression Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in robust regression analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">
                                    {term.replace(/_/g, ' ')}
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


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Shield className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Robust Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Regression analysis resistant to outliers and influential observations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><ShieldCheck className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Outlier Resistance</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Downweights extreme values automatically</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">M-Estimators</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Multiple robust methods for different data patterns</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingDown className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">OLS Comparison</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Shows how outliers affect standard regression</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use robust regression when your data may contain outliers, measurement errors, or follows a heavy-tailed distribution.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Variables:</strong> One X and one Y (numeric)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Sample size:</strong> Minimum 30 observations</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>M-estimator:</strong> HuberT for most cases</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Understanding Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>OLS vs RLM:</strong> Large differences = outliers</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Pseudo R²:</strong> Robust fit measure</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Visual:</strong> Compare regression lines</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg"><Shield className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RobustRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RobustRegressionPage({ data, numericHeaders, onLoadExample }: RobustRegressionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [xCol, setXCol] = useState<string>('');
    const [yCol, setYCol] = useState<string>('');
    const [mNorm, setMNorm] = useState('HuberT');
    const [missing, setMissing] = useState('drop');
    const [scaleEst, setScaleEst] = useState('mad');
    const [initMethod, setInitMethod] = useState('ls');

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'X variable selected', 
            passed: xCol !== '', 
            detail: xCol ? `X: ${xCol}` : 'Please select an X variable' 
        });
        
        checks.push({ 
            label: 'Y variable selected', 
            passed: yCol !== '', 
            detail: yCol ? `Y: ${yCol}` : 'Please select a Y variable' 
        });
        
        checks.push({ 
            label: 'Sufficient sample size', 
            passed: data.length >= 30, 
            detail: `n = ${data.length} observations (minimum: 30)` 
        });
        
        const allVars = [xCol, yCol].filter(v => v);
        if (allVars.length > 0) {
            const isMissing = (value: any) => value == null || value === '' || (typeof value === 'number' && isNaN(value));
            const missingCount = data.filter((row: any) => allVars.some(v => isMissing(row[v]))).length;
            checks.push({ 
                label: 'Missing values check', 
                passed: missingCount === 0, 
                detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} rows with missing values will be excluded` 
            });
        }
        
        return checks;
    }, [data, xCol, yCol]);

    const allValidationsPassed = useMemo(() => {
        const criticalChecks = dataValidation.filter(c => 
            c.label === 'X variable selected' || c.label === 'Y variable selected'
        );
        return criticalChecks.every(check => check.passed);
    }, [dataValidation]);

    useEffect(() => {
        if (data.length === 0) {
            setView('intro');
        } else if (canRun) {
            if (!xCol) setXCol(numericHeaders[0] || '');
            if (!yCol) setYCol(numericHeaders[1] || '');
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true); toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Robust_Regression_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image; link.click();
            toast({ title: "Download complete" });
        } catch (error) { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const results = analysisResult.results;
        let csvContent = "ROBUST REGRESSION ANALYSIS\n";
        csvContent += `X Variable: ${xCol}\nY Variable: ${yCol}\nM-Estimator: ${mNorm}\n\n`;
        const olsResults = [{ model: 'OLS', intercept: results.ols.params[0], slope: results.ols.params[1], r_squared: results.ols.r_squared }];
        const rlmResults = [{ model: `RLM (${mNorm})`, intercept: results.rlm.params[0], slope: results.rlm.params[1], pseudo_r_squared: results.rlm.pseudo_r_squared }];
        csvContent += "OLS RESULTS\n" + Papa.unparse(olsResults) + "\n\nRLM RESULTS\n" + Papa.unparse(rlmResults) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Robust_Regression_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: 'Download Started' });
    }, [analysisResult, xCol, yCol, mNorm, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/robust-regression-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    xCol,
                    yCol,
                    mNorm,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Robust_Regression_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, xCol, yCol, mNorm, data.length, toast]);

    
    const handleAnalysis = useCallback(async () => {
        if (!xCol || !yCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both X and Y columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/robust-regression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, x_col: xCol, y_col: yCol, M: mNorm, missing, scale_est: scaleEst, init: initMethod })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            goToStep(4);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xCol, yCol, mNorm, missing, scaleEst, initMethod, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;
    const coeffDiff = results ? Math.abs(results.ols.params[1] - results.rlm.params[1]) : 0;
    const olsR2 = results?.ols.r_squared || 0;
    const rlmPseudoR2 = results?.rlm.pseudo_r_squared || 0;
    const hasOutlierImpact = coeffDiff > 0.1;

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
            {/* 👇 Guide 컴포넌트 추가 */}
            <RobustRegressionGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
  
            <div className="mb-6 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">Robust Regression</h1>
                <p className="text-muted-foreground mt-1">Compare OLS with outlier-resistant methods</p>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose your X and Y variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Independent Variable (X)</Label>
                                    <Select value={xCol} onValueChange={setXCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select X" /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Dependent Variable (Y)</Label>
                                    <Select value={yCol} onValueChange={setYCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select Y" /></SelectTrigger>
                                        <SelectContent>{numericHeaders.filter(h => h !== xCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure robust regression parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Robust Norm (M)</Label>
                                    <Select value={mNorm} onValueChange={setMNorm}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HuberT">HuberT</SelectItem>
                                            <SelectItem value="TukeyBiweight">TukeyBiweight</SelectItem>
                                            <SelectItem value="RamsayE">RamsayE</SelectItem>
                                            <SelectItem value="AndrewWave">AndrewWave</SelectItem>
                                            <SelectItem value="Hampel">Hampel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Missing Values</Label>
                                    <Select value={missing} onValueChange={setMissing}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="drop">Drop</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Scale Estimation</Label>
                                    <Select value={scaleEst} onValueChange={setScaleEst}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mad">MAD</SelectItem>
                                            <SelectItem value="HuberScale">HuberScale</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Initial Values</Label>
                                    <Select value={initMethod} onValueChange={setInitMethod}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ls">Least Squares</SelectItem>
                                            <SelectItem value="median">Median</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Model Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">X:</strong> {xCol || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Y:</strong> {yCol || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">M-Estimator:</strong> {mNorm}</p>
                                    <p>• <strong className="text-foreground">Comparison:</strong> OLS vs RLM</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div></div></CardHeader>
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
                                <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Both OLS and {mNorm} robust regression will be performed for comparison.</p>
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

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const explainedPct = (olsR2 * 100).toFixed(0);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Comparing standard vs robust regression</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${!hasOutlierImpact ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${!hasOutlierImpact ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasOutlierImpact ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            <strong>{xCol}</strong> explains <strong>{explainedPct}%</strong> of what drives <strong>{yCol}</strong> (OLS).
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasOutlierImpact ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {hasOutlierImpact 
                                                ? `Outliers are affecting your results — the slope differs by ${coeffDiff.toFixed(3)} between OLS and robust.`
                                                : "Your data appears clean — OLS and robust methods give similar results."}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasOutlierImpact ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {hasOutlierImpact 
                                                ? "Consider using the robust (RLM) estimates for more reliable conclusions."
                                                : "Standard OLS results are trustworthy for this data."}
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${!hasOutlierImpact ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {!hasOutlierImpact ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{!hasOutlierImpact ? "Clean Data!" : "Outlier Impact Detected"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {!hasOutlierImpact 
                                                    ? "Both methods agree, indicating your data doesn't have influential outliers."
                                                    : "The robust method downweighted some observations. Check the visualization to identify outliers."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">OLS R²</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{explainedPct}%</p><p className="text-xs text-muted-foreground">{getR2Interpretation(olsR2).label}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Robust R²</p><Shield className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(rlmPseudoR2 * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">Pseudo</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Outliers?</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${hasOutlierImpact ? 'text-amber-600 dark:text-amber-400' : ''}`}>{hasOutlierImpact ? 'Yes' : 'No'}</p><p className="text-xs text-muted-foreground">{hasOutlierImpact ? 'Detected' : 'Clean'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Method</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-xl font-semibold">{mNorm}</p><p className="text-xs text-muted-foreground">M-estimator</p></div></CardContent></Card>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Data Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-lg ${(!hasOutlierImpact && star <= 5) || (hasOutlierImpact && coeffDiff < 0.5 && star <= 3) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (() => {
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of robust regression</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What We Did</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We ran <strong className="text-foreground">two regressions</strong> on the same data: standard OLS and robust ({mNorm}). 
                                                The robust method automatically reduces the influence of unusual data points.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Why Compare?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                If outliers exist, OLS gets "pulled" toward them, distorting your results. 
                                                The robust method resists this pull, giving you a clearer picture of the <strong className="text-foreground">typical relationship</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How to Interpret the Difference</h4>
                                            <p className="text-sm text-muted-foreground">
                                                The slope changed by <strong className="text-foreground">{coeffDiff.toFixed(4)}</strong> between methods.
                                                {hasOutlierImpact 
                                                    ? " This is substantial — some observations are pulling the OLS line."
                                                    : " This is small — your data is well-behaved without major outliers."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Which Result to Use?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {hasOutlierImpact 
                                                    ? <>Use the <strong className="text-foreground">robust (RLM) estimates</strong> for conclusions. They better represent the typical pattern in your data.</>
                                                    : <>Either result works since they agree. The <strong className="text-foreground">OLS estimates</strong> are fine for this clean dataset.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${!hasOutlierImpact ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {!hasOutlierImpact 
                                            ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Data Looks Clean</>
                                            : <><AlertTriangle className="w-5 h-5 text-amber-600" /> Bottom Line: Check Your Outliers</>}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {!hasOutlierImpact 
                                            ? "Standard OLS is appropriate for your analysis. The robust check confirms no unusual observations are distorting results."
                                            : "Identify the outlying observations in the plot. Decide if they're errors to remove or genuine extremes to keep (then use robust estimates)."}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Coefficient Difference Guide</h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;0.1</p><p className="text-muted-foreground">Minimal</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.1-0.5</p><p className="text-muted-foreground">Moderate</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;0.5</p><p className="text-muted-foreground">Substantial</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (() => {
                    const n = data.length;
                    
                    return (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Robust Regression Report</h2><p className="text-sm text-muted-foreground mt-1">{yCol} ~ {xCol} | Method: {mNorm} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} mNorm={mNorm} />
                        
                        {/* Detailed Analysis - APA Format */}
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            A robust regression analysis was conducted to examine the relationship between {xCol} and {yCol}, comparing ordinary least squares (OLS) with a robust linear model using the {mNorm} M-estimator. 
                                            The sample included <em>N</em> = {n} observations.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The OLS model yielded <span className="font-mono"><em>R</em>² = {olsR2.toFixed(3)}</span>, indicating that {xCol} explains {(olsR2 * 100).toFixed(1)}% of the variance in {yCol}. 
                                            The slope coefficient was <span className="font-mono"><em>b</em> = {results.ols.params[1].toFixed(4)}, <em>SE</em> = {results.ols.bse[1].toFixed(4)}</span>. 
                                            The robust model produced a pseudo <span className="font-mono"><em>R</em>² = {rlmPseudoR2.toFixed(3)}</span> with slope <span className="font-mono"><em>b</em> = {results.rlm.params[1].toFixed(4)}, <em>SE</em> = {results.rlm.bse[1].toFixed(4)}</span>.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The difference in slope estimates between OLS and robust regression was {coeffDiff.toFixed(4)}. 
                                            {hasOutlierImpact 
                                                ? `This substantial difference suggests the presence of influential observations that disproportionately affect the OLS estimates. The robust estimates should be preferred for inference.`
                                                : `This minimal difference indicates that outliers do not substantially influence the regression estimates, supporting the use of standard OLS results.`}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {/* Visualization */}
                        {analysisResult?.plot && (
                            <Card>
                                <CardHeader><CardTitle>OLS vs Robust Regression Comparison</CardTitle></CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold">Coefficient Comparison</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Parameter</TableHead>
                                                    <TableHead className="text-right">OLS</TableHead>
                                                    <TableHead className="text-right">RLM</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-medium">Intercept</TableCell>
                                                    <TableCell className="text-right font-mono">{results.ols.params[0].toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.rlm.params[0].toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">{xCol} (Slope)</TableCell>
                                                    <TableCell className="text-right font-mono">{results.ols.params[1].toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.rlm.params[1].toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow className="border-t-2">
                                                    <TableCell className="font-semibold">Difference</TableCell>
                                                    <TableCell className="text-right font-mono font-semibold">{Math.abs(results.ols.params[0] - results.rlm.params[0]).toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono font-semibold">{coeffDiff.toFixed(4)}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <img src={`data:image/png;base64,${analysisResult.plot}`} alt="Robust Regression vs OLS" className="w-full h-auto rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

                        {/* Detailed Results Tables */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>OLS Results</CardTitle><CardDescription>Standard Ordinary Least Squares</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead className="text-right">Coeff</TableHead><TableHead className="text-right">SE</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow><TableCell className="font-medium">Intercept</TableCell><TableCell className="text-right font-mono">{results.ols.params[0].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.ols.bse[0].toFixed(4)}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">{xCol}</TableCell><TableCell className="text-right font-mono">{results.ols.params[1].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.ols.bse[1].toFixed(4)}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 p-3 bg-muted/50 rounded-md"><p className="text-sm"><strong>R²:</strong> {results.ols.r_squared?.toFixed(4)}</p></div>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>RLM Results ({mNorm})</CardTitle><CardDescription>Robust Linear Model</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead className="text-right">Coeff</TableHead><TableHead className="text-right">SE</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            <TableRow><TableCell className="font-medium">Intercept</TableCell><TableCell className="text-right font-mono">{results.rlm.params[0].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.rlm.bse[0].toFixed(4)}</TableCell></TableRow>
                                            <TableRow><TableCell className="font-medium">{xCol}</TableCell><TableCell className="text-right font-mono">{results.rlm.params[1].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.rlm.bse[1].toFixed(4)}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 p-3 bg-muted/50 rounded-md"><p className="text-sm"><strong>Pseudo R²:</strong> {results.rlm.pseudo_r_squared?.toFixed(4)}</p></div>
                                </CardContent>
                            </Card>
                        </div>

                        {results.rlm.summary && (
                            <Card>
                                <CardHeader><CardTitle>Robust Model Summary Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(results.rlm.summary).map(([key, value]) => (
                                            <div key={key} className="p-3 bg-muted/50 rounded-md"><p className="text-xs font-medium text-muted-foreground">{key}</p><p className="font-semibold text-sm">{value}</p></div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>
        </div>
    );
}
