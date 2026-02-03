'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AreaChart, HelpCircle, Settings, FileType, FileSearch, BookOpen, ChevronDown, BarChart3, Activity, Download, TrendingUp, GitBranch, Lightbulb, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, Info, AlertTriangle, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { CheckCircle } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/acf_pacf_analysis.py?alt=media";

interface CorrelationResults {
    acf: number[];
    pacf: number[];
    lags: number;
    significant_acf_lags: number[];
    significant_pacf_lags: number[];
    ar_order_suggestion: number;
    ma_order_suggestion: number;
    model_recommendation: string;
    interpretations?: {
        overall_analysis: string;
        correlation_patterns: string[];
        recommendations: string;
    };
}

interface AnalysisResponse {
    results: CorrelationResults;
    plot: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// Statistical Terms Glossary for ACF/PACF Analysis
const acfPacfMetricDefinitions: Record<string, string> = {
    acf: "Autocorrelation Function: Measures the correlation between a time series and its lagged values. Shows how current values relate to past values at different lags.",
    pacf: "Partial Autocorrelation Function: Measures the correlation between a time series and its lagged values after removing the effects of intermediate lags. Shows direct relationships only.",
    lag: "The number of time periods between the current observation and the past observation being compared. Lag 1 = previous period, Lag 2 = two periods ago, etc.",
    ar: "Autoregressive (AR): A model component where the current value depends on its own past values. AR order (p) indicates how many past values are used.",
    ma: "Moving Average (MA): A model component where the current value depends on past forecast errors. MA order (q) indicates how many past errors are used.",
    arima: "Autoregressive Integrated Moving Average: A model combining AR and MA components with differencing (d) for non-stationary data. Written as ARIMA(p, d, q).",
    confidence_interval: "The blue shaded region in ACF/PACF plots. Values outside this range are statistically significant (95% confidence). Formula: ±1.96/√n.",
    white_noise: "A random series with no predictable pattern. All ACF and PACF values fall within the confidence interval. No modeling needed.",
    stationarity: "A property where statistical characteristics (mean, variance) don't change over time. Required for ARIMA modeling. Achieved through differencing.",
    differencing: "Subtracting consecutive observations to remove trends and achieve stationarity. The 'd' parameter in ARIMA(p,d,q).",
    cutoff: "When ACF or PACF values drop sharply to near zero and stay within the confidence interval. Used to determine AR or MA order.",
    decay: "When ACF or PACF values gradually decrease toward zero over multiple lags, rather than cutting off sharply.",
    seasonal: "Repeating patterns at fixed intervals (e.g., every 12 months). Significant correlations at seasonal lags (12, 24, etc.) indicate seasonality.",
    aic_bic: "Akaike Information Criterion / Bayesian Information Criterion: Metrics for model selection. Lower values indicate better model fit with appropriate complexity."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        ACF/PACF Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in autocorrelation analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(acfPacfMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'acf_pacf_analysis.py';
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
                        Python Code - ACF/PACF Analysis
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

// Generate interpretations based on ACF/PACF results
const generateAcfPacfInterpretations = (results: CorrelationResults) => {
    const patterns: string[] = [];
    const arOrder = results.ar_order_suggestion || 0;
    const maOrder = results.ma_order_suggestion || 0;
    
    let overall = '';
    if (arOrder === 0 && maOrder === 0) {
        overall = 'White noise detected. No significant autocorrelation found, the series is already random noise.';
    } else if (arOrder > 0 && maOrder === 0) {
        overall = `Pure AR(${arOrder}) process detected. PACF cuts off at lag ${arOrder} while ACF decays gradually.`;
    } else if (arOrder === 0 && maOrder > 0) {
        overall = `Pure MA(${maOrder}) process detected. ACF cuts off at lag ${maOrder} while PACF decays gradually.`;
    } else {
        overall = `Mixed ARMA(${arOrder},${maOrder}) process detected. Both ACF and PACF show significant correlations.`;
    }
    
    if (results.significant_acf_lags && results.significant_acf_lags.length > 0) {
        const acfLags = results.significant_acf_lags.slice(0, 5).join(', ');
        patterns.push(`Significant ACF lags: ${acfLags}${results.significant_acf_lags.length > 5 ? '...' : ''}. Indicates temporal dependence in the series.`);
    }
    
    if (results.significant_pacf_lags && results.significant_pacf_lags.length > 0) {
        const pacfLags = results.significant_pacf_lags.slice(0, 5).join(', ');
        patterns.push(`Significant PACF lags: ${pacfLags}${results.significant_pacf_lags.length > 5 ? '...' : ''}. Shows direct relationships after removing intermediate effects.`);
    }
    
    const seasonalLags = [12, 24, 52];
    const hasSeasonality = results.significant_acf_lags?.some(lag => seasonalLags.includes(lag));
    if (hasSeasonality) {
        patterns.push('Seasonal pattern detected: Significant correlation at seasonal lags. Consider SARIMA model.');
    }
    
    let recommendations = '';
    if (arOrder === 0 && maOrder === 0) {
        recommendations = 'No modeling needed. This is white noise. Check if differencing has already been applied.';
    } else if (arOrder > 3 || maOrder > 3) {
        recommendations = `High-order ARIMA(${arOrder},d,${maOrder}) suggested. Consider simpler models or seasonal components.`;
    } else {
        recommendations = `Try ARIMA(${arOrder},d,${maOrder}). d is the differencing order. Use AIC/BIC for model selection.`;
    }
    
    return { overall_analysis: overall, correlation_patterns: patterns, recommendations };
};


// ACF/PACF Analysis Guide Component
const AcfPacfGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">ACF & PACF Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is ACF/PACF */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                What are ACF and PACF?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                ACF and PACF are diagnostic tools for identifying the <strong>correlation structure</strong> of 
                a time series, which helps determine the appropriate ARIMA model parameters.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="font-medium text-sm text-primary mb-2">ACF (Autocorrelation Function)</p>
                  <p className="text-xs text-muted-foreground">
                    Measures correlation between the series and its lagged values.
                    <br/>• Includes both direct and indirect effects
                    <br/>• Used to identify MA order (q)
                    <br/>• Cutoff pattern → MA process
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="font-medium text-sm text-primary mb-2">PACF (Partial ACF)</p>
                  <p className="text-xs text-muted-foreground">
                    Measures direct correlation after removing intermediate effects.
                    <br/>• Shows only direct relationships
                    <br/>• Used to identify AR order (p)
                    <br/>• Cutoff pattern → AR process
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Identifying ARIMA Parameters
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">AR(p) Process</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • ACF: <strong>Decays gradually</strong> (exponential or sinusoidal)
                    <br/>• PACF: <strong>Cuts off sharply</strong> after lag p
                    <br/>• Example: AR(2) → PACF significant at lags 1,2, then cuts off
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">MA(q) Process</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • ACF: <strong>Cuts off sharply</strong> after lag q
                    <br/>• PACF: <strong>Decays gradually</strong>
                    <br/>• Example: MA(1) → ACF significant at lag 1, then cuts off
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">ARMA(p,q) Process</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • ACF: <strong>Decays gradually</strong>
                    <br/>• PACF: <strong>Decays gradually</strong>
                    <br/>• Both show tailing off behavior → mixed process
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">White Noise</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    • ACF: All values within confidence bounds
                    <br/>• PACF: All values within confidence bounds
                    <br/>• No modeling needed — series is random
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Reading the Plots
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• <strong>Blue shaded area:</strong> 95% confidence interval (±1.96/√n)</li>
                  <li>• <strong>Bars outside shaded area:</strong> Statistically significant correlations</li>
                  <li>• <strong>Lag 0:</strong> Always 1.0 (correlation with itself)</li>
                  <li>• <strong>Cutoff:</strong> Values drop to within confidence bounds and stay there</li>
                  <li>• <strong>Decay:</strong> Values gradually decrease toward zero</li>
                  <li>• <strong>Seasonal lags (12, 24...):</strong> May indicate seasonality</li>
                </ul>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ensure data is stationary (difference if needed)</li>
                    <li>• Use at least 50 observations</li>
                    <li>• Check for seasonality first</li>
                    <li>• Remove obvious outliers</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Model Selection</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Start with suggested p and q</li>
                    <li>• Try nearby values (p±1, q±1)</li>
                    <li>• Use AIC/BIC to compare models</li>
                    <li>• Check residual diagnostics</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> ACF/PACF analysis provides initial guidance 
                for ARIMA parameters, but final model selection should be validated with AIC/BIC comparison 
                and residual diagnostics. The "d" parameter (differencing order) is determined separately 
                through stationarity tests like ADF, not from ACF/PACF plots.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

// Glossary Modal Component


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.analysisTypes?.includes('acf-pacf'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><AreaChart className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">ACF & PACF Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Identify ARIMA model parameters through autocorrelation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><BarChart3 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">ACF Plot</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Determines MA order (q)</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><GitBranch className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">PACF Plot</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Determines AR order (p)</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Model Selection</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">ARIMA(p,d,q) guidance</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use ACF/PACF</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use ACF/PACF when building ARIMA models. These reveal the correlation structure to determine optimal model parameters.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>Stationary time series</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>Single numeric variable</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>50+ observations</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>AR order (p) from PACF</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>MA order (q) from ACF</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /><span>Model recommendation</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg"><BarChart3 className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface AcfPacfPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
}

export default function AcfPacfPage({ data, numericHeaders, onLoadExample }: AcfPacfPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [lags, setLags] = useState<number>(40);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);
    const maxLags = useMemo(() => Math.floor(data.length / 2) - 1, [data.length]);

    const validationChecks = useMemo(() => {
        const checks = [];
        
        checks.push({
            label: 'Value column selected',
            passed: !!valueCol,
            message: valueCol ? `Selected: ${valueCol}` : 'Please select a variable to analyze'
        });
        
        checks.push({
            label: 'Sufficient data',
            passed: data.length >= 50,
            message: data.length >= 50 
                ? `${data.length} observations (50+ recommended)` 
                : `${data.length} observations (50+ recommended)`
        });
        
        checks.push({
            label: 'Appropriate lag count',
            passed: lags >= 10 && lags <= maxLags,
            message: `${lags} lags (recommended: 10~${maxLags})`
        });

        checks.push({
            label: 'Lags < half of data',
            passed: lags < data.length / 2,
            message: lags < data.length / 2 ? 'Condition met' : `Lags too large (max ${maxLags})`
        });
        
        return checks;
    }, [valueCol, data.length, lags, maxLags]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    const goToStep = (step: Step) => {
        setCurrentStep(step);
        if (step > maxReachedStep) setMaxReachedStep(step);
    };

    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    
    useEffect(() => {
        const initialValueCol = numericHeaders.find(h => !h.toLowerCase().includes('date')) || numericHeaders[0];
        setValueCol(initialValueCol);
        setAnalysisResult(null);
        setLags(Math.min(40, Math.max(10, maxLags)));
        setCurrentStep(1);
        setMaxReachedStep(1);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun, maxLags]);

    const handleAnalysis = useCallback(async () => {
        if (!valueCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a value column.' });
            return;
        }
    
        setIsLoading(true);
        setAnalysisResult(null);
    
        try {
            const seriesData = data.map(row => row[valueCol]).filter(v => typeof v === 'number');
    
            const response = await fetch(`${FASTAPI_URL}/api/analysis/acf-pacf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: seriesData, valueCol, lags })
            });
    
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || errorResult.error || `HTTP error! status: ${response.status}`);
            }
    
            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            const interpretations = generateAcfPacfInterpretations(result.results);
            result.results.interpretations = interpretations;
            
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) {
            console.error('ACF/PACF Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, valueCol, lags, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ACF_PACF_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        const csvData = [
            ['ACF/PACF Analysis Results'],
            [''],
            ['Configuration'],
            ['Variable', valueCol || ''],
            ['Lags', lags],
            ['Observations', data.length],
            [''],
            ['Results'],
            ['AR Order (p)', results.ar_order_suggestion],
            ['MA Order (q)', results.ma_order_suggestion],
            ['Significant ACF Lags', results.significant_acf_lags?.length || 0],
            ['Significant PACF Lags', results.significant_pacf_lags?.length || 0],
            ['Model Recommendation', results.model_recommendation || `ARIMA(${results.ar_order_suggestion},d,${results.ma_order_suggestion})`],
        ];
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ACF_PACF_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, valueCol, lags, data.length, toast]);


    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/acf-pacf-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                analysisResult,
                plot: analysisResult.plot,
                valueCol,
                lags,
                sampleSize: data.length
            })
        });
        if (!response.ok) throw new Error('Failed');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ACF_PACF_Report_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, valueCol, lags, data.length, toast]);


    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;
    const arOrder = results?.ar_order_suggestion || 0;
    const maOrder = results?.ma_order_suggestion || 0;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="mb-6 flex justify-between items-center">
    <div><h1 className="text-2xl font-bold">ACF & PACF Analysis</h1><p className="text-muted-foreground mt-1">Autocorrelation analysis for ARIMA</p></div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variable</CardTitle><CardDescription>Choose a numeric variable for autocorrelation</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Value Column</Label>
                                <Select value={valueCol} onValueChange={setValueCol}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Choose variable..." /></SelectTrigger>
                                    <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Data points: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Configure lag parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Number of Lags</Label>
                                <Input type="number" value={lags} onChange={e => setLags(Number(e.target.value))} min="10" max={maxLags} className="h-11"/>
                                <p className="text-xs text-muted-foreground">Recommended range: 10~{maxLags} (less than half of data length)</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variable:</strong> {valueCol || 'Not selected'}</p>
                                    <p>• <strong className="text-foreground">Lags:</strong> {lags}</p>
                                    <p>• <strong className="text-foreground">Confidence:</strong> 95%</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Lag Selection</h4>
                                <p className="text-sm text-muted-foreground">
                                    Typically use 20~40 lags. For seasonal data, use lags greater than the seasonal period (e.g., 12, 24).
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

              {/* Step 3: Validation */}
            {currentStep === 3 && (
                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements for ACF/PACF</CardDescription></div></div></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            {validationChecks.map((check, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${check.passed ? 'bg-primary/5 border-primary/30' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                    <div className="flex items-center gap-3">
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                                        <div>
                                            <p className="font-medium text-sm">{check.label}</p>
                                            <p className="text-xs text-muted-foreground">{check.message}</p>
                                        </div>
                                    </div>
                                    <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? 'Pass' : 'Fail'}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-4 flex justify-between">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                        <Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Sigma className="mr-2 h-4 w-4" />Run Analysis</>}
                        </Button>
                    </CardFooter>
                </Card>
            )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const isWhiteNoise = arOrder === 0 && maOrder === 0;
                    const isPureAR = arOrder > 0 && maOrder === 0;
                    const isPureMA = arOrder === 0 && maOrder > 0;
                    const isHighOrder = arOrder > 3 || maOrder > 3;
                    const isGood = !isHighOrder && !isWhiteNoise;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>ACF/PACF analysis for {valueCol}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isWhiteNoise 
                                                ? 'White noise detected. No significant autocorrelation found, ARIMA modeling is not needed.'
                                                : isPureAR
                                                    ? `Pure AR(${arOrder}) process. PACF cuts off at lag ${arOrder}.`
                                                    : isPureMA
                                                        ? `Pure MA(${maOrder}) process. ACF cuts off at lag ${maOrder}.`
                                                        : `Mixed ARMA(${arOrder},${maOrder}) process. Both AR and MA components are needed.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            <strong>Recommended model:</strong> ARIMA({arOrder}, d, {maOrder}) — d is the differencing order for stationarity.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Significant ACF lags: {results.significant_acf_lags?.length || 0}, 
                                            Significant PACF lags: {results.significant_pacf_lags?.length || 0}
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Clear pattern identified!" : isHighOrder ? "High-order model needed" : "No modeling needed"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood 
                                                    ? `Apply ARIMA(${arOrder},d,${maOrder}) model. Verify optimal order with AIC/BIC.`
                                                    : isHighOrder
                                                        ? "High-order models risk overfitting. Consider simpler models or seasonal components."
                                                        : "Data is already stationary. Additional modeling may not be necessary."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Rationale Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Rationale
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>AR order (p={arOrder}):</strong> PACF exceeds 95% confidence interval up to lag {arOrder} then cuts off. PACF cutoff determines AR order.</p>
                                        <p>• <strong>MA order (q={maOrder}):</strong> ACF exceeds 95% confidence interval up to lag {maOrder} then cuts off. ACF cutoff determines MA order.</p>
                                        <p>• <strong>Significant lags:</strong> ACF {results.significant_acf_lags?.length || 0}, PACF {results.significant_pacf_lags?.length || 0} — more lags indicate more complex dependence structure.</p>
                                        <p>• <strong>Interpretation:</strong> {isPureAR ? 'ACF decays gradually, PACF cuts off sharply = AR process' : isPureMA ? 'ACF cuts off sharply, PACF decays gradually = MA process' : 'Both decay gradually = Mixed ARMA process'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Model Clarity:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = isWhiteNoise ? 3 : isHighOrder ? 2 : (isPureAR || isPureMA) ? 5 : 4;
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

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding ACF and PACF</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">ACF (Autocorrelation Function)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Measures correlation between the series and its own past lags.
                                            <strong className="text-foreground"> The lag where ACF cuts off sharply determines MA order (q)</strong>.
                                            Gradual decay indicates AR component presence.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">PACF (Partial ACF)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Measures pure correlation after removing effects of intermediate lags.
                                            <strong className="text-foreground"> The lag where PACF cuts off sharply determines AR order (p)</strong>.
                                            Gradual decay indicates MA component presence.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">95% Confidence Interval</h4>
                                        <p className="text-sm text-muted-foreground">
                                            The blue shaded region represents the 95% confidence interval. Only lags outside this range are statistically significant.
                                            Confidence interval formula: ±1.96/√n ≈ ±{(1.96 / Math.sqrt(data.length)).toFixed(3)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-xl p-5 border border-amber-300 dark:border-amber-700">
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-amber-600" />Model Selection Guide</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong>AR(p):</strong> ACF decays gradually + PACF cuts off at lag p</p>
                                    <p>• <strong>MA(q):</strong> ACF cuts off at lag q + PACF decays gradually</p>
                                    <p>• <strong>ARMA(p,q):</strong> Both decay gradually</p>
                                    <p>• <strong>White noise:</strong> All lags within confidence interval</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

{/* Step 6: Full Statistics */}
{currentStep === 6 && analysisResult && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full ACF/PACF analysis</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                        <Code className="mr-2 h-4 w-4" />Python Code
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">ACF & PACF Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{valueCol} | {lags} lags | {data.length} observations | {new Date().toLocaleDateString()}</p></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">AR Order (p)</p><p className="text-2xl font-bold">{arOrder}</p><p className="text-xs text-muted-foreground">From PACF</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">MA Order (q)</p><p className="text-2xl font-bold">{maOrder}</p><p className="text-xs text-muted-foreground">From ACF</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Sig. ACF Lags</p><p className="text-2xl font-bold">{results.significant_acf_lags?.length || 0}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Sig. PACF Lags</p><p className="text-2xl font-bold">{results.significant_pacf_lags?.length || 0}</p></CardContent></Card>
                            </div>

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
                                                Autocorrelation analysis was conducted on {valueCol} across <em>N</em> = {data.length} observations 
                                                with {lags} lags examined. The 95% confidence interval was calculated as ±{(1.96 / Math.sqrt(data.length)).toFixed(4)}.
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The Autocorrelation Function (ACF) revealed {results.significant_acf_lags?.length || 0} significant lag(s)
                                                {results.significant_acf_lags && results.significant_acf_lags.length > 0 
                                                    ? ` at positions ${results.significant_acf_lags.slice(0, 5).join(', ')}${results.significant_acf_lags.length > 5 ? '...' : ''}`
                                                    : ', indicating no significant temporal dependence'}. 
                                                {maOrder > 0 
                                                    ? ` The ACF pattern suggests a Moving Average component of order q = ${maOrder}.`
                                                    : ' No clear MA component was identified.'}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The Partial Autocorrelation Function (PACF) identified {results.significant_pacf_lags?.length || 0} significant lag(s)
                                                {results.significant_pacf_lags && results.significant_pacf_lags.length > 0 
                                                    ? ` at positions ${results.significant_pacf_lags.slice(0, 5).join(', ')}${results.significant_pacf_lags.length > 5 ? '...' : ''}`
                                                    : ''}. 
                                                {arOrder > 0 
                                                    ? ` The PACF cutoff pattern indicates an Autoregressive component of order p = ${arOrder}.`
                                                    : ' No clear AR component was identified.'}
                                            </p>
                                            
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {arOrder === 0 && maOrder === 0 
                                                    ? 'The absence of significant correlations suggests the series is white noise. No ARIMA modeling is required; the series lacks predictable structure.'
                                                    : arOrder > 0 && maOrder === 0 
                                                        ? `The correlation structure is consistent with a pure AR(${arOrder}) process. The recommended model is ARIMA(${arOrder}, d, 0), where d represents the differencing order for stationarity.`
                                                        : arOrder === 0 && maOrder > 0 
                                                            ? `The correlation structure is consistent with a pure MA(${maOrder}) process. The recommended model is ARIMA(0, d, ${maOrder}), where d represents the differencing order.`
                                                            : `The correlation structure suggests a mixed ARMA process. The recommended model is ARIMA(${arOrder}, d, ${maOrder}), where d should be determined via stationarity testing. Model selection should be validated using AIC/BIC criteria.`}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            
                            <Card><CardHeader><CardTitle>ACF & PACF Plots</CardTitle><CardDescription>Autocorrelation functions with 95% confidence bands</CardDescription></CardHeader><CardContent><Image src={analysisResult.plot} alt="ACF and PACF Plots" width={1000} height={800} className="w-full rounded-md border"/></CardContent></Card>
                            <Card><CardHeader><CardTitle>Model Recommendation</CardTitle></CardHeader><CardContent><div className="p-4 bg-primary/5 rounded-lg"><p className="text-lg font-semibold text-primary">ARIMA({arOrder}, d, {maOrder})</p><p className="text-sm text-muted-foreground mt-2">{results.model_recommendation || results.interpretations?.recommendations}</p></div></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Calculating autocorrelations...</p>
                            <Skeleton className="h-[400px] w-full" />
                        </CardContent>
                    </Card>
                )}
            </div>
            
            {/* Modals */}
            <AcfPacfGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
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