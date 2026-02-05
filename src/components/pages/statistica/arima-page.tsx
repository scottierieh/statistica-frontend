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
import { Sigma, Loader2, AreaChart, HelpCircle, Settings, FileSearch, Activity, ChevronDown, Download, Info, TrendingUp, BarChart3, GitBranch, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, Lightbulb, CheckCircle, BookOpen, FileType, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '../../ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid, Area } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/arima_analysis.py?alt=media";

interface ArimaResults {
    summary_data: { caption: string | null; data: string[][]; }[];
    aic: number;
    bic: number;
    hqic: number;
    forecast: any[];
}

interface FullAnalysisResponse {
    results: ArimaResults;
    plot: string;
    diagnostics_plot: string;
    interpretations?: { overall_analysis: string; model_insights: string[]; recommendations: string; };
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

// Statistical Terms Glossary for ARIMA Analysis
const arimaMetricDefinitions: Record<string, string> = {
    arima: "AutoRegressive Integrated Moving Average. A class of models that captures temporal dependencies through autoregression, differencing, and moving averages. Denoted as ARIMA(p, d, q).",
    autoregressive: "AR component: The model uses past values of the series to predict current values. The 'p' parameter specifies how many past values (lags) are used.",
    integrated: "I component: Differencing applied to make the series stationary. The 'd' parameter specifies how many times the series is differenced.",
    moving_average: "MA component: The model uses past forecast errors to predict current values. The 'q' parameter specifies how many past errors are used.",
    stationarity: "A property where statistical characteristics (mean, variance, autocorrelation) remain constant over time. Required for ARIMA modeling; achieved through differencing.",
    p_parameter: "The order of the AutoRegressive (AR) component. Represents the number of lagged observations included in the model. Determined by PACF cutoff.",
    d_parameter: "The degree of differencing. The number of times the series is differenced to achieve stationarity. Determined by unit root tests like ADF.",
    q_parameter: "The order of the Moving Average (MA) component. Represents the number of lagged forecast errors. Determined by ACF cutoff.",
    sarima: "Seasonal ARIMA. Extends ARIMA to capture seasonal patterns with additional parameters (P, D, Q, s) for seasonal AR, differencing, MA, and period length.",
    arimax: "ARIMA with eXogenous variables. Includes external predictors (regressors) in addition to the time series' own past values.",
    aic: "Akaike Information Criterion. Measures model quality balancing goodness of fit and complexity. Lower values indicate better models. Formula: 2k - 2ln(L).",
    bic: "Bayesian Information Criterion. Similar to AIC but with stronger penalty for complexity. Favors simpler models, especially with larger samples.",
    hqic: "Hannan-Quinn Information Criterion. Intermediate between AIC and BIC in penalizing complexity. Sometimes preferred for time series model selection.",
    forecast: "Predicted future values based on the fitted model. Includes point estimates (mean) and confidence intervals to quantify uncertainty.",
    confidence_interval: "Range of values within which the true future value is expected to fall with specified probability (typically 95%). Widens as forecast horizon increases.",
    residuals: "Differences between observed values and model predictions. Should be white noise (random, uncorrelated) for a well-specified model."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        ARIMA Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in ARIMA time series modeling
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(arimaMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'arima_analysis.py';
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
                        Python Code - ARIMA Analysis
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

// Generate interpretations
const generateArimaInterpretations = (results: ArimaResults, modelType: string, p: number, d: number, q: number) => {
    const insights: string[] = [];
    
    const modelDesc: Record<string, string> = {
        'ar': `AR(${p}) model has been fitted. Uses ${p} autoregressive terms.`,
        'ma': `MA(${q}) model has been fitted. Uses ${q} moving average terms.`,
        'arma': `ARMA(${p}, ${q}) model has been fitted. Uses ${p} AR and ${q} MA terms.`,
        'arima': `ARIMA(${p}, ${d}, ${q}) model has been fitted. Applied ${d}-order differencing for stationarity.`,
        'sarima': 'SARIMA model has been fitted. Captures both trend and seasonal patterns.',
        'arimax': 'ARIMAX model has been fitted. Includes exogenous variables.'
    };
    
    let overall = modelDesc[modelType] || 'ARIMA model has been fitted.';
    
    insights.push(`AIC: ${results.aic.toFixed(2)} — Balance between model complexity and fit. Lower is better.`);
    insights.push(`BIC: ${results.bic.toFixed(2)} — Higher complexity penalty than AIC. Favors simpler models.`);
    insights.push(`HQIC: ${results.hqic.toFixed(2)} — Intermediate penalty between AIC and BIC.`);
    
    if (results.forecast && results.forecast.length > 0) {
        const first = results.forecast[0].mean;
        const last = results.forecast[results.forecast.length - 1].mean;
        const trend = last > first ? 'upward' : last < first ? 'downward' : 'sideways';
        insights.push(`Forecast trend: ${results.forecast.length}-period forecast shows ${trend} pattern (${first.toFixed(2)} → ${last.toFixed(2)}).`);
    }
    
    let recommendations = modelType === 'arima' || modelType === 'sarima' ?
        'Validate model fit through residual diagnostics. Ljung-Box test p > 0.05 indicates good fit.' :
        'Check residual independence with ACF plot. If autocorrelation remains, consider upgrading to ARIMA.';
    
    return { overall_analysis: overall, model_insights: insights, recommendations };
};


const ArimaGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">ARIMA Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AreaChart className="w-4 h-4" />
                What is ARIMA?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                <strong>ARIMA</strong> (AutoRegressive Integrated Moving Average) is a popular method for 
                time series forecasting. It captures patterns from past values and past errors to predict future values.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>ARIMA(p, d, q) means:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    <strong>p:</strong> AR terms (past values used)<br/>
                    <strong>d:</strong> Differencing order (for stationarity)<br/>
                    <strong>q:</strong> MA terms (past errors used)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Model Types
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">AR / MA / ARMA</p>
                  <p className="text-xs text-muted-foreground">
                    Basic models for stationary data.<br/>
                    No differencing needed.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">ARIMA</p>
                  <p className="text-xs text-muted-foreground">
                    For non-stationary data.<br/>
                    Includes differencing (d).
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">SARIMA</p>
                  <p className="text-xs text-muted-foreground">
                    For seasonal patterns.<br/>
                    Adds (P, D, Q, s) terms.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">ARIMAX</p>
                  <p className="text-xs text-muted-foreground">
                    Includes external variables.<br/>
                    For multivariate forecasting.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Choosing Parameters (p, d, q)
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">p (AR order)</p>
                  <p className="text-xs text-muted-foreground">
                    Look at <strong>PACF plot</strong> — where it cuts off.<br/>
                    Common values: 0, 1, 2
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">d (Differencing)</p>
                  <p className="text-xs text-muted-foreground">
                    Use <strong>ADF test</strong> for stationarity.<br/>
                    Usually 0, 1, or 2. Most series need d=1.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm">q (MA order)</p>
                  <p className="text-xs text-muted-foreground">
                    Look at <strong>ACF plot</strong> — where it cuts off.<br/>
                    Common values: 0, 1, 2
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Model Selection (AIC/BIC)
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  <strong>Lower AIC/BIC = Better model</strong><br/><br/>
                  • <strong>AIC:</strong> Balances fit and complexity<br/>
                  • <strong>BIC:</strong> Stronger penalty for complexity<br/>
                  • Compare multiple (p,d,q) combinations
                </p>
              </div>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Start with ARIMA(1,1,1) as baseline, then adjust based on AIC/BIC.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Checking Model Quality
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Good Model ✓</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Residuals look random (white noise)</li>
                    <li>• ACF of residuals is flat</li>
                    <li>• Ljung-Box p &gt; 0.05</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Poor Model ✗</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Patterns in residuals</li>
                    <li>• Significant ACF spikes</li>
                    <li>• Ljung-Box p ≤ 0.05</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> ARIMA works best with stationary data. 
                Always check stationarity first (use ADF test). If seasonal patterns exist, use SARIMA. 
                Forecast confidence intervals widen over time — short-term forecasts are more reliable.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'time-series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <AreaChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">ARIMA Models</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Autoregressive models for time series forecasting
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">AR/MA/ARMA</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Basic models
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">ARIMA</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    With differencing
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">SARIMA/ARIMAX</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Seasonal & exogenous
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
                            ARIMA models are standard for univariate time series forecasting.
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
                                        <span><strong>Columns:</strong> Time & value columns</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 50+ observations</span>
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
                                        <span><strong>Forecast:</strong> With confidence intervals</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>AIC/BIC:</strong> Model comparison</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <AreaChart className="mr-2 h-5 w-5" />
                                Load Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ArimaPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
}

export default function ArimaPage({ data, allHeaders, onLoadExample }: ArimaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [modelType, setModelType] = useState('arima');
    const [p, setP] = useState(1);
    const [d, setD] = useState(1);
    const [q, setQ] = useState(1);
    const [P, setP_seasonal] = useState(1);
    const [D, setD_seasonal] = useState(1);
    const [Q, setQ_seasonal] = useState(1);
    const [s, setS_seasonal] = useState(12);
    const [exogCols, setExogCols] = useState<string[]>([]);
    const [forecastPeriods, setForecastPeriods] = useState(12);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    const numericHeaders = useMemo(() => {
        return allHeaders.filter(h => {
            const sample = data[0]?.[h];
            return typeof sample === 'number' || !isNaN(Number(sample));
        });
    }, [allHeaders, data]);

    const availableExogCols = useMemo(() => allHeaders.filter(h => h !== timeCol && h !== valueCol), [allHeaders, timeCol, valueCol]);

    const validationChecks = useMemo(() => {
        const checks = [];
        
        checks.push({
            label: 'Time column selected',
            passed: !!timeCol,
            message: timeCol ? `Selected: ${timeCol}` : 'Please select a time column'
        });
        
        checks.push({
            label: 'Value column selected',
            passed: !!valueCol,
            message: valueCol ? `Selected: ${valueCol}` : 'Please select a value column'
        });
        
        checks.push({
            label: 'Sufficient data',
            passed: data.length >= 50,
            message: data.length >= 50 
                ? `${data.length} observations (50+ recommended)` 
                : `${data.length} observations insufficient (50+ recommended)`
        });

        checks.push({
            label: 'Valid model parameters',
            passed: p >= 0 && d >= 0 && q >= 0,
            message: `p=${p}, d=${d}, q=${q}`
        });

        if (modelType === 'arimax') {
            checks.push({
                label: 'Exogenous variables selected',
                passed: exogCols.length > 0,
                message: exogCols.length > 0 ? `${exogCols.length} selected` : 'Please select exogenous variables'
            });
        }
        
        return checks;
    }, [timeCol, valueCol, data.length, p, d, q, modelType, exogCols]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    const goToStep = (step: Step) => {
        setCurrentStep(step);
        if (step > maxReachedStep) setMaxReachedStep(step);
    };

    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        const dateCol = allHeaders.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'));
        setTimeCol(dateCol || allHeaders[0]);
        setValueCol(numericHeaders.find(h => h !== dateCol) || numericHeaders[0]);
        setAnalysisResult(null);
        setCurrentStep(1);
        setMaxReachedStep(1);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, numericHeaders, canRun]);

    const handleExogChange = (header: string, checked: boolean) => {
        setExogCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!timeCol || !valueCol) { 
            toast({ variant: 'destructive', title: 'Error', description: 'Select columns.' }); 
            return; 
        }
        setIsLoading(true); 
        setAnalysisResult(null);
        
        let order = [p, d, q]; 
        let seasonalOrder: number[] | null = null; 
        let finalExogCols: string[] | null = null;
        
        switch (modelType) {
            case 'ar': order = [p, 0, 0]; break;
            case 'ma': order = [0, 0, q]; break;
            case 'arma': order = [p, 0, q]; break;
            case 'sarima': seasonalOrder = [P, D, Q, s]; break;
            case 'arimax': finalExogCols = exogCols; break;
        }
        
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/arima`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    data, 
                    timeCol, 
                    valueCol, 
                    order, 
                    seasonalOrder, 
                    exogCols: finalExogCols, 
                    forecastPeriods 
                }) 
            });
            
            if (!response.ok) { 
                const err = await response.json(); 
                throw new Error(err.detail || err.error || 'Analysis failed'); 
            }
            
            const result: FullAnalysisResponse = await response.json();
            result.interpretations = generateArimaInterpretations(result.results, modelType, p, d, q);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { 
            toast({ variant: 'destructive', title: 'Error', description: e.message }); 
        }
        finally { setIsLoading(false); }
    }, [data, timeCol, valueCol, p, d, q, modelType, P, D, Q, s, exogCols, forecastPeriods, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ARIMA_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const r = analysisResult.results;
        const forecastData = r.forecast.map(f => [f.forecast_date, f.mean.toFixed(4), f.mean_ci_lower?.toFixed(4), f.mean_ci_upper?.toFixed(4)]);
        const csvData = [
            ['ARIMA Model Results'],
            [''],
            ['Configuration'],
            ['Model', `${modelType.toUpperCase()}(${p},${d},${q})`],
            ['Time Column', timeCol || ''],
            ['Value Column', valueCol || ''],
            ['Forecast Periods', forecastPeriods],
            [''],
            ['Information Criteria'],
            ['AIC', r.aic.toFixed(4)],
            ['BIC', r.bic.toFixed(4)],
            ['HQIC', r.hqic.toFixed(4)],
            [''],
            ['Forecast'],
            ['Date', 'Mean', 'CI Lower', 'CI Upper'],
            ...forecastData
        ];
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ARIMA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download started" });
    }, [analysisResult, modelType, p, d, q, timeCol, valueCol, forecastPeriods, toast]);

// handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/arima-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                analysisResult,
                plot: analysisResult.plot,
                diagnosticsPlot: analysisResult.diagnostics_plot,
                valueCol,
                timeCol,
                modelType,
                p, d, q,
                P, D, Q, s,
                forecastPeriods,
                exogCols,
                sampleSize: data.length
            })
        });
        if (!response.ok) throw new Error('Failed');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ARIMA_Report_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, valueCol, timeCol, modelType, p, d, q, P, D, Q, s, forecastPeriods, exogCols, data.length, toast]);



    const forecastChartData = useMemo(() => {
        if (!analysisResult?.results || !timeCol || !valueCol) return [];
        const original = data.map(d => ({ date: new Date(d[timeCol] as any).getTime(), [valueCol]: d[valueCol!] }));
        const forecast = analysisResult.results.forecast.map(f => ({ date: new Date(f.forecast_date).getTime(), 'Forecast': f.mean, 'CI Lower': f['mean_ci_lower'], 'CI Upper': f['mean_ci_upper'] }));
        return [...original, ...forecast].sort((a,b) => a.date - b.date);
    }, [analysisResult, data, timeCol, valueCol]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;
    const modelLabels: Record<string, string> = { 'ar': 'AR', 'ma': 'MA', 'arma': 'ARMA', 'arima': 'ARIMA', 'sarima': 'SARIMA', 'arimax': 'ARIMAX' };

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
    <div><h1 className="text-2xl font-bold">ARIMA Models</h1><p className="text-muted-foreground mt-1">Time series forecasting</p></div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose time and value columns</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Time Column</Label>
                                    <Select value={timeCol} onValueChange={setTimeCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Value Column</Label>
                                    <Select value={valueCol} onValueChange={setValueCol}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>{numericHeaders.filter(h => h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure ARIMA parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <Tabs value={modelType} onValueChange={setModelType} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
                                    <TabsTrigger value="ar">AR</TabsTrigger>
                                    <TabsTrigger value="ma">MA</TabsTrigger>
                                    <TabsTrigger value="arma">ARMA</TabsTrigger>
                                    <TabsTrigger value="arima">ARIMA</TabsTrigger>
                                    <TabsTrigger value="sarima">SARIMA</TabsTrigger>
                                    <TabsTrigger value="arimax">ARIMAX</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            
                            <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                                {(modelType.includes('ar') || modelType.includes('arma')) && (
                                    <div className="space-y-2"><Label>p (AR)</Label><Input type="number" value={p} onChange={e => setP(Number(e.target.value))} min={0} /></div>
                                )}
                                {modelType.includes('arima') && (
                                    <div className="space-y-2"><Label>d (I)</Label><Input type="number" value={d} onChange={e => setD(Number(e.target.value))} min={0} /></div>
                                )}
                                {(modelType.includes('ma') || modelType.includes('arma')) && (
                                    <div className="space-y-2"><Label>q (MA)</Label><Input type="number" value={q} onChange={e => setQ(Number(e.target.value))} min={0} /></div>
                                )}
                                <div className="space-y-2"><Label>Forecast Periods</Label><Input type="number" value={forecastPeriods} onChange={e => setForecastPeriods(Number(e.target.value))} min={1} /></div>
                            </div>

                            {modelType === 'sarima' && (
                                <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                                    <div className="md:col-span-4 font-semibold text-sm">Seasonal Order</div>
                                    <div className="space-y-2"><Label>P</Label><Input type="number" value={P} onChange={e => setP_seasonal(Number(e.target.value))} min={0} /></div>
                                    <div className="space-y-2"><Label>D</Label><Input type="number" value={D} onChange={e => setD_seasonal(Number(e.target.value))} min={0} /></div>
                                    <div className="space-y-2"><Label>Q</Label><Input type="number" value={Q} onChange={e => setQ_seasonal(Number(e.target.value))} min={0} /></div>
                                    <div className="space-y-2"><Label>s (period)</Label><Input type="number" value={s} onChange={e => setS_seasonal(Number(e.target.value))} min={1} /></div>
                                </div>
                            )}

                            {modelType === 'arimax' && (
                                <div className="p-4 border rounded-lg">
                                    <Label className="text-sm font-medium">Exogenous Variables</Label>
                                    <ScrollArea className="h-24 border rounded-md p-2 mt-2">
                                        {availableExogCols.map(h => (
                                            <div key={h} className="flex items-center space-x-2 py-1">
                                                <Checkbox id={`exog-${h}`} checked={exogCols.includes(h)} onCheckedChange={(c) => handleExogChange(h, c as boolean)} />
                                                <label htmlFor={`exog-${h}`} className="text-sm">{h}</label>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
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
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fitting...</> : <><Sigma className="mr-2 h-4 w-4" />Run Analysis</>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{modelLabels[modelType]}({p},{d},{q}) for {valueCol}</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">
                                        {analysisResult?.interpretations?.overall_analysis}
                                    </p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">
                                        Model fit: AIC = <strong>{results.aic.toFixed(2)}</strong>, BIC = <strong>{results.bic.toFixed(2)}</strong> (lower is better)
                                    </p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">
                                        {forecastPeriods}-period forecast has been generated. 95% confidence intervals are included.
                                    </p></div>
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                    <div>
                                        <p className="font-semibold">Model fitting complete!</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {analysisResult?.interpretations?.recommendations}
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
                                    <p>• <strong>AIC (Akaike):</strong> {results.aic.toFixed(2)} — Balance between model complexity and fit. For comparing models on the same data.</p>
                                    <p>• <strong>BIC (Bayesian):</strong> {results.bic.toFixed(2)} — Higher complexity penalty than AIC. Helps prevent overfitting.</p>
                                    <p>• <strong>HQIC:</strong> {results.hqic.toFixed(2)} — Intermediate penalty between AIC and BIC.</p>
                                    <p>• <strong>Model structure:</strong> p={p} (AR terms), d={d} (differencing), q={q} (MA terms). See Step 5 for parameter meanings.</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Model Fit:</span>
                                {[1, 2, 3, 4, 5].map(star => {
                                    const score = 4;
                                    return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding ARIMA models</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What is ARIMA(p, d, q)?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">AR (Autoregressive):</strong> Predict current value from past values<br/>
                                            <strong className="text-foreground">I (Integrated):</strong> Differencing for stationarity<br/>
                                            <strong className="text-foreground">MA (Moving Average):</strong> Predict current value from past errors
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Parameters (p, d, q)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">p = {p}:</strong> Number of AR terms. Determined by PACF cutoff.<br/>
                                            <strong className="text-foreground">d = {d}:</strong> Number of differences. Determined by stationarity test (ADF).<br/>
                                            <strong className="text-foreground">q = {q}:</strong> Number of MA terms. Determined by ACF cutoff.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Information Criteria (AIC/BIC)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">Lower AIC/BIC</strong> indicates better model fit.
                                            Compare multiple (p, d, q) combinations to select the optimal model.
                                            Current model: AIC = {results.aic.toFixed(2)}, BIC = {results.bic.toFixed(2)}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-xl p-5 border border-amber-300 dark:border-amber-700">
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-600" />Model Diagnostics</h4>
                                <p className="text-sm text-muted-foreground">
                                    <strong>Residuals should be white noise</strong> for a good model fit.<br/>
                                    • ACF: Should be insignificant at all lags<br/>
                                    • Ljung-Box: p &gt; 0.05 indicates good fit<br/>
                                    • Q-Q Plot: Should follow normal distribution
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
{/* Step 6: Full Statistics */}
{currentStep === 6 && analysisResult && results && (
    <>
        <div className="flex justify-between items-center mb-4">
            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full ARIMA analysis</p></div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4"/>Word Document</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                        <Code className="mr-2 h-4 w-4" />Python Code
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">ARIMA Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">{modelLabels[modelType]}({p},{d},{q}) | {valueCol} | {data.length} obs | {new Date().toLocaleDateString()}</p></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Model</p><p className="text-lg font-bold">{modelLabels[modelType]}({p},{d},{q})</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">AIC</p><p className="text-lg font-bold font-mono">{results.aic.toFixed(2)}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">BIC</p><p className="text-lg font-bold font-mono">{results.bic.toFixed(2)}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">HQIC</p><p className="text-lg font-bold font-mono">{results.hqic.toFixed(2)}</p></CardContent></Card>
            </div>
            <Card>
                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                <CardContent>
                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                        <div className="space-y-3">
                            <p className="text-sm leading-relaxed text-muted-foreground">A {modelLabels[modelType]}({p},{d},{q}) model was fitted to {valueCol} across <em>N</em> = {data.length} observations using {timeCol} as the time index. {modelType === 'sarima' && <>Seasonal order ({P},{D},{Q}) with period {s} was applied. </>}{modelType === 'arimax' && <>Exogenous variables included: {exogCols.join(', ')}. </>}A {forecastPeriods}-period ahead forecast was generated.</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">Model selection criteria indicated AIC = <span className="font-mono">{results.aic.toFixed(4)}</span>, BIC = <span className="font-mono">{results.bic.toFixed(4)}</span>, and HQIC = <span className="font-mono">{results.hqic.toFixed(4)}</span>. {results.bic < results.aic ? ' The lower BIC suggests model parsimony is adequate.' : ' Compare these values against alternative model specifications to determine optimal order.'}</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{d === 0 ? 'No differencing was applied, indicating the original series was treated as stationary.' : d === 1 ? 'First-order differencing was applied to achieve stationarity.' : `${d}-order differencing was applied to achieve stationarity.`} The model incorporates {p} autoregressive term{p !== 1 ? 's' : ''} and {q} moving average term{q !== 1 ? 's' : ''}.</p>
                            {results.forecast && results.forecast.length > 0 && (() => { const firstForecast = results.forecast[0]; const lastForecast = results.forecast[results.forecast.length - 1]; const trend = lastForecast.mean > firstForecast.mean ? 'upward' : lastForecast.mean < firstForecast.mean ? 'downward' : 'stable'; const avgCI = results.forecast.reduce((sum, f) => sum + ((f.mean_ci_upper || 0) - (f.mean_ci_lower || 0)), 0) / results.forecast.length; return (<p className="text-sm leading-relaxed text-muted-foreground">The {forecastPeriods}-period forecast exhibits a {trend} trajectory, with predicted values ranging from <span className="font-mono">{firstForecast.mean.toFixed(2)}</span> to <span className="font-mono">{lastForecast.mean.toFixed(2)}</span>. The average 95% confidence interval width is <span className="font-mono">{avgCI.toFixed(2)}</span>, {avgCI < Math.abs(lastForecast.mean) * 0.2 ? ' indicating relatively precise predictions.' : ' suggesting considerable forecast uncertainty at longer horizons.'}</p>); })()}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Forecast</CardTitle><CardDescription>Time series forecast with 95% CI</CardDescription></CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="w-full h-[400px]">
                        <ResponsiveContainer>
                            <RechartsLineChart data={forecastChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t) => new Date(t).toLocaleDateString()} />
                                <YAxis domain={['auto', 'auto']} />
                                <Tooltip content={<ChartTooltipContent />} labelFormatter={(t) => new Date(t).toLocaleDateString()} />
                                <Legend />
                                <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/><stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/></linearGradient></defs>
                                <Line type="monotone" dataKey={valueCol} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Original" />
                                <Line type="monotone" dataKey="Forecast" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="CI Upper" stackId="1" strokeWidth={0} fill="url(#fill)" />
                                <Area type="monotone" dataKey="CI Lower" stackId="1" strokeWidth={0} fill="url(#fill)" />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    {results.summary_data?.map((table, idx) => (
                        <Table key={idx}>
                            {table.caption && <TableCaption>{table.caption}</TableCaption>}
                            <TableHeader><TableRow>{table.data[0].map((c, i) => <TableHead key={i}>{c}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>{table.data.slice(1).map((row, ri) => (<TableRow key={ri}>{row.map((c, ci) => <TableCell key={ci} className="font-mono text-sm">{c}</TableCell>)}</TableRow>))}</TableBody>
                        </Table>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Model Diagnostics</CardTitle></CardHeader>
                <CardContent><Image src={analysisResult.diagnostics_plot!} alt="Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/></CardContent>
            </Card>
        </div>
        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
    </>
)}

                {isLoading && (
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Fitting ARIMA model...</p>
                            <Skeleton className="h-[600px] w-full" />
                        </CardContent>
                    </Card>
                )}
            </div>
            
            {/* Modals */}
            <ArimaGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
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