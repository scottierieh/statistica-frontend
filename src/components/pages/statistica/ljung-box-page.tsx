'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, CheckSquare, Download, Activity, Info, TrendingUp, FileSpreadsheet, ImageIcon, CheckCircle, BookOpen, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, ArrowRight, ChevronDown, FileText, Sparkles, BarChart, Layers, Target, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';



const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/ljung_box_test.py?alt=media";

interface LjungBoxResult { lb_statistic: number; p_value: number; lags: number; is_significant: boolean; interpretation: string; }
interface FullAnalysisResponse { results: LjungBoxResult; plot: string; interpretations?: { overall_analysis: string; test_insights: string[]; recommendations: string; }; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [
    { id: 1, label: 'Variable' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// Statistical Terms Glossary for Ljung-Box Test
const ljungBoxMetricDefinitions: Record<string, string> = {
    ljung_box_test: "A statistical test that checks whether any of a group of autocorrelations of a time series are different from zero. Used primarily to test model residuals for remaining autocorrelation.",
    autocorrelation: "The correlation of a time series with a lagged version of itself. Positive autocorrelation means high values tend to follow high values; negative means high follows low.",
    white_noise: "A sequence of random variables with zero mean, constant variance, and no autocorrelation. Model residuals should ideally be white noise, indicating the model captured all patterns.",
    q_statistic: "The Ljung-Box test statistic (Q). Measures the overall magnitude of autocorrelations up to a specified lag. Calculated as a weighted sum of squared autocorrelations.",
    p_value: "The probability of observing a Q statistic at least as extreme as calculated, assuming no autocorrelation exists. Values below 0.05 suggest significant autocorrelation.",
    lag: "The number of time periods separating two observations being compared. Lag 1 compares consecutive observations; Lag 12 compares observations one year apart (for monthly data).",
    degrees_of_freedom: "For Ljung-Box test, equals the number of lags tested (minus any estimated parameters). Determines the chi-square distribution used for p-value calculation.",
    chi_square_distribution: "The probability distribution used to determine significance of the Q statistic. As lags increase, critical values increase, making the test more conservative.",
    null_hypothesis: "The assumption being tested: that no autocorrelation exists at any of the specified lags. A p-value > 0.05 means we fail to reject this null hypothesis.",
    residuals: "The differences between observed values and model predictions. Analyzing residuals helps determine if a model has captured all systematic patterns in the data.",
    portmanteau_test: "A class of tests (including Ljung-Box) that jointly test multiple autocorrelations. More powerful than testing individual lags separately.",
    model_adequacy: "Whether a time series model sufficiently captures the data's patterns. Ljung-Box tests this by checking if residuals are random (white noise).",
    arima: "AutoRegressive Integrated Moving Average model. A common time series model whose residuals are often tested with Ljung-Box to verify model adequacy.",
    significance_level: "The threshold (typically α = 0.05) below which the p-value must fall to reject the null hypothesis. Represents the acceptable false positive rate.",
    box_pierce_test: "An earlier version of the autocorrelation test. Ljung-Box is a modified version with better small-sample properties and is generally preferred."
};



// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Ljung-Box Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in autocorrelation testing
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(ljungBoxMetricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold uppercase">
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

const LjungBoxGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Ljung-Box Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                What is the Ljung-Box Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The Ljung-Box test checks whether <strong>autocorrelations in a time series are significantly different from zero</strong>. 
                It's primarily used to validate time series models by testing if residuals behave like <strong>white noise</strong> (random errors).
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Q Statistic:</strong><br/>
                  <span className="font-mono text-xs">Q = n(n+2) × Σ(ρ²ₖ / (n-k))</span><br/>
                  <span className="text-muted-foreground text-xs">
                    Weighted sum of squared autocorrelations. Follows χ² distribution with k degrees of freedom.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                When Should You Use This Test?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Validating <strong>ARIMA model residuals</strong></li>
                    <li>• Checking if a time series is <strong>white noise</strong></li>
                    <li>• Testing for <strong>remaining autocorrelation</strong> after modeling</li>
                    <li>• Assessing <strong>model adequacy</strong> before forecasting</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Important:</strong> Apply this test to model residuals, not raw data. 
                    Raw time series often have autocorrelation by nature.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Interpreting Results
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                  <p className="font-medium text-sm text-green-700 dark:text-green-400 mb-1">p &gt; 0.05: No Autocorrelation ✓</p>
                  <p className="text-xs text-muted-foreground">Fail to reject H₀</p>
                  <p className="text-xs text-muted-foreground mt-1">→ Residuals are white noise. Model is adequate.</p>
                </div>
                
                <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400 mb-1">p ≤ 0.05: Autocorrelation Exists ✗</p>
                  <p className="text-xs text-muted-foreground">Reject H₀</p>
                  <p className="text-xs text-muted-foreground mt-1">→ Model needs improvement.</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Choosing Number of Lags
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Common Rules of Thumb</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>√n:</strong> Square root of sample size</li>
                    <li>• <strong>n/4:</strong> Quarter of sample size</li>
                    <li>• <strong>10-20:</strong> Common default range</li>
                    <li>• <strong>Seasonal period:</strong> e.g., 12 for monthly data</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Too few lags may miss long-range correlations. 
                    Too many lags reduce test power. Start with 10-20 and adjust based on your data's seasonality.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                What To Do If Test Fails
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Model Adjustments</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Increase AR order (p)</li>
                    <li>• Increase MA order (q)</li>
                    <li>• Add seasonal components (P, D, Q)</li>
                    <li>• Check for structural breaks</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Considerations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Add external regressors</li>
                    <li>• Transform the data (log, diff)</li>
                    <li>• Check for outliers</li>
                    <li>• Consider regime changes</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> The Ljung-Box test is a diagnostic tool, not a definitive verdict. 
                A passing test doesn't guarantee good forecasts, and a failing test at borderline p-values 
                might still produce reasonable predictions. Always combine with visual inspection of residuals.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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
        link.download = 'ljung_box_test.py';
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
                        Python Code - Ljung-Box Test
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

const StatisticalSummaryCards = ({ results }: { results: LjungBoxResult }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Test Result</p>{!results.is_significant ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}</div><p className="text-2xl font-semibold">{results.is_significant ? 'Significant' : 'No Corr.'}</p><p className="text-xs text-muted-foreground">{results.is_significant ? 'Model may need refinement' : 'Residuals are random'}</p></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">LB Statistic</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold font-mono">{results.lb_statistic.toFixed(3)}</p><p className="text-xs text-muted-foreground">Chi-square statistic</p></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-Value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold font-mono ${results.p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>{results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}</p><p className="text-xs text-muted-foreground">α = 0.05</p></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Lags Tested</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.lags}</p><p className="text-xs text-muted-foreground">Autocorrelation periods</p></div></CardContent></Card>
    </div>
);

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'time-series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <CheckSquare className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Ljung-Box Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test for autocorrelation in time series residuals
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <CheckCircle2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Autocorrelation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Detects patterns in residuals
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <AlertTriangle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Model Validation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Checks model adequacy
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">White Noise</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Confirms random residuals
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Essential for validating ARIMA models. Tests whether residuals are white noise.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Data:</strong> Time series or residuals</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Lags:</strong> Number of lags to test</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 30+ recommended</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You'll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p &gt; 0.05:</strong> No autocorrelation</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p &lt; 0.05:</strong> Autocorrelation exists</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Plot:</strong> Lag-specific p-values</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <CheckSquare className="mr-2 h-5 w-5" />
                                Load Time Series Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface LjungBoxPageProps { data: DataSet; numericHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function LjungBoxPage({ data, numericHeaders, onLoadExample }: LjungBoxPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [valueCol, setValueCol] = useState<string>('');
    const [lags, setLags] = useState<number>(10);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Variable selected', passed: !!valueCol, detail: valueCol || 'Not selected' });
        checks.push({ label: 'Valid number of lags', passed: lags >= 1, detail: `${lags} lag(s)` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 30, detail: `n = ${data.length} (recommended: 30+)` });
        checks.push({ label: 'Lags less than sample size', passed: lags < data.length, detail: `${lags} < ${data.length}` });
        return checks;
    }, [valueCol, lags, data]);

    const allValidationsPassed = useMemo(() => !!valueCol && lags >= 1 && lags < data.length, [valueCol, lags, data]);

    useEffect(() => { setValueCol(numericHeaders[0] || ''); setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1); }, [data, numericHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `LjungBox_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csvContent = "LJUNG-BOX TEST RESULTS\n";
        csvContent += `Variable,${valueCol}\nLags,${lags}\n\n`;
        csvContent += Papa.unparse([{ 'LB Statistic': analysisResult.results.lb_statistic.toFixed(4), 'P-Value': analysisResult.results.p_value.toFixed(4), 'Lags': analysisResult.results.lags, 'Significant': analysisResult.results.is_significant ? 'Yes' : 'No' }]);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `LjungBox_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, valueCol, lags, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!valueCol) { toast({ variant: 'destructive', title: 'Please select a variable.' }); return; }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const seriesData = data.map(row => row[valueCol]).filter(v => typeof v === 'number');
            const response = await fetch(`${FASTAPI_URL}/api/analysis/ljung-box`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: seriesData, valueCol, lags }) });
            if (!response.ok) throw new Error((await response.json()).detail || 'Analysis failed');
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, valueCol, lags, toast]);


    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult?.results) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/ljung-box-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult.results,
                valueCol,
                lags,
                sampleSize: data.length
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Ljung_Box_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, valueCol, lags, data.length, toast]);



    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = step.id === currentStep;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button key={step.id} onClick={() => isAccessible && goToStep(step.id as Step)} disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
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
    <div><h1 className="text-2xl font-bold">Ljung-Box Test</h1><p className="text-muted-foreground mt-1">Test for autocorrelation in time series</p></div>
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
                {/* Step 1 */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variable</CardTitle><CardDescription>Choose the time series or residuals to test</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2"><Label className="text-sm font-medium">Value Column</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger className="h-12"><SelectValue placeholder="Select variable" /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Time series values or model residuals</p></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!valueCol}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Test Settings</CardTitle><CardDescription>Configure number of lags</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2"><Label htmlFor="lags">Number of Lags</Label><Input id="lags" type="number" value={lags} onChange={e => setLags(Number(e.target.value))} min="1" max={data.length - 1} className="h-12 max-w-xs" /><p className="text-xs text-muted-foreground">Common values: 10-20 or √n ({Math.round(Math.sqrt(data.length))})</p></div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Variable:</strong> {valueCol}</p><p>• <strong className="text-foreground">Lags:</strong> {lags}</p><p>• <strong className="text-foreground">Sample size:</strong> {data.length}</p><p>• <strong className="text-foreground">Significance level:</strong> α = 0.05</p></div></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Info className="w-4 h-4 text-sky-600" />About the Test</h4><p className="text-sm text-muted-foreground"><strong>Null hypothesis:</strong> No autocorrelation exists (white noise).<br/><strong>Alternative:</strong> At least one autocorrelation coefficient is non-zero.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg" disabled={lags < 1}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><CheckSquare className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" /><p className="text-sm text-muted-foreground">Will test {valueCol} for autocorrelation up to lag {lags}.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (() => {
                    const isGood = !results.is_significant;
                    const modelQuality = isGood ? (results.p_value >= 0.2 ? 'Excellent' : results.p_value >= 0.1 ? 'Good' : 'Acceptable') : (results.p_value >= 0.01 ? 'Needs Work' : 'Poor');
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Ljung-Box Test: {valueCol}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{isGood ? "Your forecasting model is working properly. It has captured the patterns in your data well." : "Your forecasting model has issues. There are still patterns in the data that it hasn't captured."}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{isGood ? "The residuals (prediction errors) are randomly distributed, meaning the model isn't making systematic mistakes." : "The residuals (prediction errors) show patterns, meaning past values are influencing future errors."}</p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">{isGood ? "You can proceed with forecasting using this model." : "Improving the model could increase prediction accuracy."}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">{isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}<div><p className="font-semibold">{isGood ? "Model Validation Passed! ✓" : "Model Needs Improvement"}</p><p className="text-sm text-muted-foreground mt-1">{isGood ? 'Prediction errors are random (White Noise). You can trust and use this model.' : 'Prediction errors show autocorrelation. Try adjusting AR/MA terms or adding seasonality.'}</p></div></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Model Quality</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{modelQuality}</p><p className="text-xs text-muted-foreground">{isGood ? 'Residuals OK' : 'Needs work'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-Value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${results.p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>{results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(3)}</p><p className="text-xs text-muted-foreground">{results.p_value >= 0.05 ? '> 0.05 ✓' : '< 0.05'}</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Lags Tested</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.lags}</p><p className="text-xs text-muted-foreground">Time periods</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Sample Size</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{data.length}</p><p className="text-xs text-muted-foreground">Observations</p></div></CardContent></Card>
                                </div>
                                <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Model Quality:</span>{[1,2,3,4,5].map(star => { const score = results.p_value >= 0.2 ? 5 : results.p_value >= 0.1 ? 4 : results.p_value >= 0.05 ? 3 : results.p_value >= 0.01 ? 2 : 1; return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;})}</div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Info className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Understanding the Ljung-Box test</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What is the Ljung-Box Test?</h4><p className="text-sm text-muted-foreground">Tests whether autocorrelations of residuals are significantly different from zero. It's a portmanteau test that considers multiple lags simultaneously.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">The Q Statistic ({results.lb_statistic.toFixed(3)})</h4><p className="text-sm text-muted-foreground">Sum of squared autocorrelations weighted by sample size. Follows χ²({results.lags}) distribution under null hypothesis.{results.lb_statistic > 2 * results.lags ? ' Your Q is high, suggesting autocorrelation.' : ' Your Q is reasonable.'}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">P-value Interpretation</h4><p className="text-sm text-muted-foreground">Your p-value is <strong>{results.p_value < 0.001 ? '< .001' : results.p_value.toFixed(4)}</strong>.{results.p_value >= 0.05 ? ' This means we cannot reject the null hypothesis of no autocorrelation (white noise).' : ' This is below α = 0.05, so we reject the null hypothesis - autocorrelation exists.'}</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">What to Do Next</h4><p className="text-sm text-muted-foreground">{!results.is_significant ? 'Model is well-specified! Proceed with forecasting. Monitor with out-of-sample validation.' : 'Consider: (1) Increase AR/MA order, (2) Add seasonal terms, (3) Check for missing explanatory variables.'}</p></div></div></div>
                            <div className={`rounded-xl p-5 border ${!results.is_significant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}><h4 className="font-semibold mb-2 flex items-center gap-2">{!results.is_significant ? <><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line: Model is Valid</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Bottom Line: Model Needs Work</>}</h4><p className="text-sm text-muted-foreground">{!results.is_significant ? 'Residuals behave like white noise. Your time series model has adequately captured the underlying patterns.' : 'Residuals show systematic patterns. Your model is missing some structure in the data.'}</p></div>
                            <div className="bg-muted/20 rounded-xl p-4"><h4 className="font-medium text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" />P-value Reference</h4><div className="grid grid-cols-2 gap-2 text-xs"><div className="text-center p-2 bg-background rounded-lg border-green-200 border"><p className="font-medium text-green-600">p &gt; 0.05</p><p className="text-muted-foreground">No autocorrelation</p></div><div className="text-center p-2 bg-background rounded-lg border-red-200 border"><p className="font-medium text-red-600">p ≤ 0.05</p><p className="text-muted-foreground">Autocorrelation exists</p></div></div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full test results and p-value plot</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileText className="mr-2 h-4 w-4" /> Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                    <Code className="mr-2 h-4 w-4" />Python Code
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Ljung-Box Test Report</h2><p className="text-sm text-muted-foreground mt-1">{valueCol} | Lags = {lags} | {new Date().toLocaleDateString()}</p></div>
                        <StatisticalSummaryCards results={results} />

                        {/* Statistical Summary - APA Format */}
                    <Card>
                        <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                        <CardContent>
                            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <h3 className="font-semibold">Statistical Summary</h3>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        A Ljung-Box test was conducted to assess autocorrelation in {valueCol} across <em>N</em> = {data.length} observations, 
                                        examining autocorrelations up to lag {results.lags}. The test evaluates whether the residuals behave as white noise, 
                                        which is essential for validating time series model adequacy.
                                    </p>
                                    
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        The Ljung-Box Q statistic was {results.lb_statistic.toFixed(4)}, following a chi-square distribution with {results.lags} degrees of freedom. 
                                        The associated <em>p</em>-value was {results.p_value < 0.001 ? '< .001' : results.p_value.toFixed(4)}, 
                                        which is {results.p_value >= 0.05 ? 'greater than' : 'less than'} the conventional significance level of α = 0.05.
                                    </p>
                                    
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {!results.is_significant 
                                            ? `The null hypothesis of no autocorrelation could not be rejected (Q = ${results.lb_statistic.toFixed(2)}, p = ${results.p_value < 0.001 ? '< .001' : results.p_value.toFixed(3)}). This indicates that the residuals are consistent with white noise, suggesting the time series model has adequately captured the underlying autocorrelation structure.`
                                            : `The null hypothesis was rejected (Q = ${results.lb_statistic.toFixed(2)}, p = ${results.p_value < 0.001 ? '< .001' : results.p_value.toFixed(3)}), indicating significant autocorrelation remains in the residuals. This suggests the current model specification may be inadequate and requires refinement.`}
                                    </p>
                                    
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {!results.is_significant 
                                            ? 'Based on these results, the model can be considered valid for forecasting purposes. The absence of significant residual autocorrelation supports the reliability of model-based predictions and confidence intervals.'
                                            : 'Model improvements are recommended. Consider increasing the order of AR or MA terms, incorporating seasonal components, or examining potential structural breaks in the series. Re-testing after model modifications is advised.'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                        <Card><CardHeader><CardTitle>Test Results</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Interpretation</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-semibold">Ljung-Box Q</TableCell><TableCell className="font-mono text-right">{results.lb_statistic.toFixed(4)}</TableCell><TableCell className="text-right text-muted-foreground">χ²({results.lags})</TableCell></TableRow><TableRow><TableCell className="font-semibold">P-Value</TableCell><TableCell className={`font-mono text-right ${results.p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>{results.p_value < 0.001 ? '< .001' : results.p_value.toFixed(4)}</TableCell><TableCell className="text-right"><Badge variant={results.is_significant ? 'destructive' : 'default'}>{results.is_significant ? 'Significant' : 'Not Significant'}</Badge></TableCell></TableRow><TableRow><TableCell className="font-semibold">Lags</TableCell><TableCell className="font-mono text-right">{results.lags}</TableCell><TableCell className="text-right text-muted-foreground">Degrees of freedom</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        <Card><CardHeader><CardTitle>P-Values by Lag</CardTitle><CardDescription>Values below red line (0.05) indicate significant autocorrelation</CardDescription></CardHeader><CardContent><Image src={analysisResult?.plot || ''} alt="Ljung-Box p-values" width={1200} height={600} className="w-full rounded-md border"/></CardContent></Card>
                    </div>
                    <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}
            </div>
            
            {/* Modals */}
            <LjungBoxGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
        </div>
    );
}