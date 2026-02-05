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
import { Sigma, Loader2, HelpCircle, Settings, FileSearch, TrendingUp, Download, Activity, Info, BarChart3, CheckCircle, BookOpen, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, FileType, Sparkles, AlertTriangle, Lightbulb, FileSpreadsheet, ImageIcon, ChevronDown, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/exponential_smoothing.py?alt=media";

interface AnalysisResponse {
    results: {
        data: any[];
        model_params: any;
        aic: number;
        bic: number;
        aicc: number;
    };
    plot: string;
    interpretations?: {
        overall_analysis: string;
        model_insights: string[];
        recommendations: string;
    };
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

// Statistical Terms Glossary for Exponential Smoothing
const exponentialSmoothingMetricDefinitions: Record<string, string> = {
    exponential_smoothing: "A time series forecasting method that assigns exponentially decreasing weights to past observations. More recent data points have greater influence on forecasts than older ones.",
    simple_exponential_smoothing: "The basic form of exponential smoothing that models only the level component. Suitable for series without trend or seasonality. Also called Single Exponential Smoothing (SES).",
    holt_linear: "Holt's linear trend method (Double Exponential Smoothing). Extends simple smoothing by adding a trend component. Uses two smoothing equations for level and trend.",
    holt_winters: "Triple Exponential Smoothing that captures level, trend, and seasonal components. Can use additive or multiplicative seasonality depending on data characteristics.",
    alpha: "The level smoothing parameter (α). Controls how much weight is given to the most recent observation vs. historical data. Range: 0-1. Higher α = more reactive to recent changes.",
    beta: "The trend smoothing parameter (β). Used in Holt and Holt-Winters methods to smooth the trend component. Range: 0-1. Higher β = trend adapts faster to changes.",
    gamma: "The seasonal smoothing parameter (γ). Used only in Holt-Winters method to smooth seasonal components. Range: 0-1. Higher γ = seasonal patterns update faster.",
    level: "The baseline value of the series at a given time point, after removing trend and seasonal effects. It represents the 'typical' value the series centers around.",
    trend: "The rate of increase or decrease in the series over time. Can be additive (constant amount per period) or multiplicative (constant percentage per period).",
    seasonal_period: "The number of time periods in one complete seasonal cycle. For monthly data with yearly seasonality, period = 12. For quarterly data, period = 4.",
    additive_model: "A model where components add together: Y = Level + Trend + Seasonal + Error. Used when seasonal variation is constant regardless of level.",
    multiplicative_model: "A model where components multiply: Y = Level × Trend × Seasonal × Error. Used when seasonal variation is proportional to the level of the series.",
    aic: "Akaike Information Criterion. Measures model quality balancing fit and complexity. Lower AIC indicates better model. Useful for comparing different smoothing methods.",
    bic: "Bayesian Information Criterion. Similar to AIC but with stronger penalty for model complexity. Prefer when choosing between models with different numbers of parameters.",
    aicc: "Corrected AIC for small sample sizes. Provides a more accurate measure when the number of observations is small relative to the number of parameters."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Exponential Smoothing Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in exponential smoothing analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(exponentialSmoothingMetricDefinitions).map(([term, definition]) => (
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
        link.download = 'exponential_smoothing.py';
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
                        Python Code - Exponential Smoothing
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

const generateInterpretations = (results: AnalysisResponse['results'], smoothingType: string) => {
    const insights: string[] = [];
    const typeDescriptions: Record<string, string> = {
        'simple': 'Simple exponential smoothing applied. Suitable for series without trend or seasonality.',
        'holt': "Holt's linear trend method applied. Captures level and trend components.",
        'holt-winters': 'Holt-Winters method applied. Captures level, trend, and seasonal components.'
    };
    let overall = typeDescriptions[smoothingType] || 'Exponential smoothing applied.';
    
    insights.push(`AIC: ${results.aic.toFixed(2)} — Model fit indicator (lower is better)`);
    insights.push(`BIC: ${results.bic.toFixed(2)} — Information criterion with complexity penalty`);
    insights.push(`AICc: ${results.aicc.toFixed(2)} — Small-sample corrected AIC`);
    
    const paramNames: Record<string, string> = {
        'smoothing_level': 'Alpha (α) - Level smoothing',
        'smoothing_trend': 'Beta (β) - Trend smoothing',
        'smoothing_seasonal': 'Gamma (γ) - Seasonal smoothing',
    };
    
    Object.entries(results.model_params).forEach(([key, value]) => {
        if (typeof value === 'number' && key.includes('smoothing')) {
            const paramName = paramNames[key] || key;
            const weight = value > 0.7 ? 'High (sensitive to recent changes)' : value > 0.3 ? 'Medium (balanced)' : 'Low (stable, considers more history)';
            insights.push(`${paramName}: ${value.toFixed(4)} — ${weight}`);
        }
    });
    
    let recommendations = smoothingType === 'simple'
        ? 'If trend or seasonality is visible, upgrade to Holt or Holt-Winters.'
        : smoothingType === 'holt'
            ? 'If seasonal patterns exist, use Holt-Winters. Compare models using AIC/BIC.'
            : 'Verify seasonal period is correct. Compare with simpler models using AIC/BIC.';
    
    return { overall_analysis: overall, model_insights: insights, recommendations };
};


const ExponentialSmoothingGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Exponential Smoothing Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                What is Exponential Smoothing?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                <strong>Exponential Smoothing</strong> is a forecasting method that gives 
                <strong> more weight to recent observations</strong> and less weight to older ones. 
                The weights decrease exponentially as observations get older.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Idea:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Recent data matters more than old data.<br/>
                    α close to 1 = very reactive to recent changes<br/>
                    α close to 0 = very stable, slow to change
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Three Types of Exponential Smoothing
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Simple (Single)</p>
                  <p className="text-xs text-muted-foreground">
                    Models <strong>level only</strong>. Use when data has no trend or seasonality.<br/>
                    Parameter: α (alpha) for level smoothing.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Holt's Linear (Double)</p>
                  <p className="text-xs text-muted-foreground">
                    Models <strong>level + trend</strong>. Use when data has a trend but no seasonality.<br/>
                    Parameters: α (level), β (beta) for trend.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Holt-Winters (Triple)</p>
                  <p className="text-xs text-muted-foreground">
                    Models <strong>level + trend + seasonality</strong>. Use when data has all three components.<br/>
                    Parameters: α (level), β (trend), γ (gamma) for seasonality.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Understanding the Parameters
              </h3>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Alpha (α)</p>
                  <p className="text-xs text-muted-foreground">
                    Level smoothing<br/>
                    Range: 0 to 1<br/>
                    High α = reactive<br/>
                    Low α = stable
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Beta (β)</p>
                  <p className="text-xs text-muted-foreground">
                    Trend smoothing<br/>
                    Range: 0 to 1<br/>
                    High β = trend adapts fast<br/>
                    Low β = trend is stable
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-primary mb-1">Gamma (γ)</p>
                  <p className="text-xs text-muted-foreground">
                    Seasonal smoothing<br/>
                    Range: 0 to 1<br/>
                    High γ = seasons change fast<br/>
                    Low γ = seasons are stable
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Leave parameters empty for automatic optimization. 
                  The algorithm will find the best values by minimizing forecast errors.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Model Selection (AIC/BIC)
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  <strong>Lower AIC/BIC = Better model</strong><br/><br/>
                  • <strong>AIC:</strong> Balances fit and complexity<br/>
                  • <strong>BIC:</strong> Stronger penalty for complexity<br/>
                  • <strong>AICc:</strong> Corrected for small samples<br/><br/>
                  Compare Simple vs Holt vs Holt-Winters using these criteria.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When to Use Each Method
              </h3>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-muted/30 rounded border border-border">
                  <p className="font-bold text-primary mb-1">Simple</p>
                  <p className="text-muted-foreground">
                    • Flat data<br/>
                    • No trend<br/>
                    • No seasonality<br/>
                    • Short-term forecasts
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded border border-border">
                  <p className="font-bold text-primary mb-1">Holt</p>
                  <p className="text-muted-foreground">
                    • Trending data<br/>
                    • Growing or declining<br/>
                    • No clear seasons<br/>
                    • Medium-term forecasts
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded border border-border">
                  <p className="font-bold text-primary mb-1">Holt-Winters</p>
                  <p className="text-muted-foreground">
                    • Seasonal patterns<br/>
                    • With or without trend<br/>
                    • Repeating cycles<br/>
                    • Longer forecasts
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Exponential smoothing works best for 
                short to medium-term forecasts. It's simpler than ARIMA but can be very effective. 
                Always compare fitted values to original data to assess model quality.
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
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Exponential Smoothing</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Forecast time series by giving more weight to recent observations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Simple</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Level only, no trend/seasonality
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Holt's Linear</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Level and trend
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Holt-Winters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Level, trend, seasonality
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
                            Exponential smoothing is ideal for short-term forecasting with more importance on recent data.
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
                                        <span><strong>Sample size:</strong> 30+ observations</span>
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
                                        <span><strong>AIC/BIC:</strong> Lower = better fit</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Parameters:</strong> α, β, γ values</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <TrendingUp className="mr-2 h-5 w-5" />
                                Load Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ExponentialSmoothingPageProps { 
    data: DataSet; 
    allHeaders: string[]; 
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
}

export default function ExponentialSmoothingPage({ data, allHeaders, onLoadExample }: ExponentialSmoothingPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [smoothingType, setSmoothingType] = useState('simple');
    const [alpha, setAlpha] = useState<number | null>(null);
    const [beta, setBeta] = useState<number | null>(null);
    const [gamma, setGamma] = useState<number | null>(null);
    const [trendType, setTrendType] = useState('add');
    const [seasonalType, setSeasonalType] = useState('add');
    const [seasonalPeriods, setSeasonalPeriods] = useState<number | undefined>(12);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Modal states
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    const numericHeaders = useMemo(() => allHeaders.filter(h => { const sample = data[0]?.[h]; return typeof sample === 'number' || !isNaN(Number(sample)); }), [allHeaders, data]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Time column selected', passed: !!timeCol, message: timeCol ? `Selected: ${timeCol}` : 'Please select time column' });
        checks.push({ label: 'Value column selected', passed: !!valueCol, message: valueCol ? `Selected: ${valueCol}` : 'Please select value column' });
        checks.push({ label: 'Sufficient data', passed: data.length >= 30, message: `${data.length} observations (30+ recommended)` });
        if (smoothingType === 'holt-winters') {
            checks.push({ label: 'Seasonal period set', passed: seasonalPeriods && seasonalPeriods >= 2 && seasonalPeriods <= data.length / 2, message: `Period: ${seasonalPeriods || 'N/A'}` });
        }
        return checks;
    }, [timeCol, valueCol, data.length, smoothingType, seasonalPeriods]);

    const allChecksPassed = validationChecks.every(c => c.passed);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
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

    const handleAnalysis = useCallback(async () => {
        if (!timeCol || !valueCol) { toast({ variant: 'destructive', title: 'Error', description: 'Select columns.' }); return; }
        setIsLoading(true);
        setAnalysisResult(null);
        const analysisData = data.map(row => ({ [timeCol]: row[timeCol], [valueCol]: row[valueCol] }));
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/exponential-smoothing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: analysisData, timeCol, valueCol, smoothingType, alpha, beta, gamma, trendType: smoothingType !== 'simple' ? trendType : undefined, seasonalType: smoothingType === 'holt-winters' ? seasonalType : undefined, seasonalPeriods: smoothingType === 'holt-winters' ? seasonalPeriods : undefined })
            });
            if (!response.ok) throw new Error((await response.json()).detail || 'Analysis failed');
            const result: AnalysisResponse = await response.json();
            result.interpretations = generateInterpretations(result.results, smoothingType);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, timeCol, valueCol, smoothingType, trendType, seasonalType, seasonalPeriods, alpha, beta, gamma, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ExpSmoothing_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const r = analysisResult.results;
        const csvData = [['Exponential Smoothing Results'], [''], ['Configuration'], ['Model Type', smoothingType], ['Time Column', timeCol || ''], ['Value Column', valueCol || ''], [''], ['Information Criteria'], ['AIC', r.aic.toFixed(4)], ['BIC', r.bic.toFixed(4)], ['AICc', r.aicc.toFixed(4)], [''], ['Model Parameters'], ...Object.entries(r.model_params).map(([k, v]) => [k, typeof v === 'number' ? v.toFixed(6) : String(v)])];
        const csv = Papa.unparse(csvData);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `ExpSmoothing_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download started" });
    }, [analysisResult, smoothingType, timeCol, valueCol, toast]);


    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/exponential-smoothing-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                analysisResult,
                plot: analysisResult.plot,
                valueCol,
                timeCol,
                smoothingType,
                trendType,
                seasonalType,
                seasonalPeriods,
                sampleSize: data.length
            })
        });
        if (!response.ok) throw new Error('Failed');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ExpSmoothing_Report_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, valueCol, timeCol, smoothingType, trendType, seasonalType, seasonalPeriods, data.length, toast]);



    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;
    const modelTypeLabel = smoothingType === 'simple' ? 'Simple' : smoothingType === 'holt' ? "Holt's Linear" : 'Holt-Winters';

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
                            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
    <div><h1 className="text-2xl font-bold">Exponential Smoothing</h1><p className="text-muted-foreground mt-1">Time series forecasting</p></div>
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
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose time and value columns</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Time Column</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Value Column</Label><Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericHeaders.filter(h => h !== timeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground"><strong>{data.length}</strong> observations available</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure smoothing parameters</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2"><Label>Smoothing Type</Label><Select value={smoothingType} onValueChange={setSmoothingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="simple">Simple (level only)</SelectItem><SelectItem value="holt">Holt's Linear (level + trend)</SelectItem><SelectItem value="holt-winters">Holt-Winters (level + trend + seasonal)</SelectItem></SelectContent></Select></div>
                            {smoothingType !== 'simple' && (
                                <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                                    <div className="space-y-2"><Label>Trend Type</Label><Select value={trendType} onValueChange={setTrendType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="add">Additive</SelectItem><SelectItem value="mul">Multiplicative</SelectItem></SelectContent></Select></div>
                                    {smoothingType === 'holt-winters' && (<><div className="space-y-2"><Label>Seasonal Type</Label><Select value={seasonalType} onValueChange={setSeasonalType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="add">Additive</SelectItem><SelectItem value="mul">Multiplicative</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Seasonal Periods</Label><Input type="number" value={seasonalPeriods} onChange={e => setSeasonalPeriods(Number(e.target.value))} min={2} /></div></>)}
                                </div>
                            )}
                            <div className="p-4 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Smoothing Parameters (Optional)</h4><p className="text-xs text-muted-foreground">Leave empty for automatic optimization.</p>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label className="text-xs">Alpha (Level)</Label><Input type="number" value={alpha ?? ''} onChange={e => setAlpha(e.target.value ? parseFloat(e.target.value) : null)} min={0} max={1} step={0.01} placeholder="Auto" /></div>
                                    {smoothingType !== 'simple' && <div className="space-y-2"><Label className="text-xs">Beta (Trend)</Label><Input type="number" value={beta ?? ''} onChange={e => setBeta(e.target.value ? parseFloat(e.target.value) : null)} min={0} max={1} step={0.01} placeholder="Auto" /></div>}
                                    {smoothingType === 'holt-winters' && <div className="space-y-2"><Label className="text-xs">Gamma (Seasonal)</Label><Input type="number" value={gamma ?? ''} onChange={e => setGamma(e.target.value ? parseFloat(e.target.value) : null)} min={0} max={1} step={0.01} placeholder="Auto" /></div>}
                                </div>
                            </div>
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
                                        <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}<div><p className="font-medium text-sm">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                                        <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? 'Pass' : 'Fail'}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fitting...</> : <><Sigma className="mr-2 h-4 w-4" />Run Analysis</>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>{modelTypeLabel} smoothing for {valueCol}</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm"><strong>{modelTypeLabel}</strong> exponential smoothing applied. {smoothingType === 'simple' ? 'Models level component only.' : smoothingType === 'holt' ? 'Models level and trend components.' : 'Models level, trend, and seasonal components.'}</p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">Model fit: AIC = <strong>{results.aic.toFixed(2)}</strong>, BIC = <strong>{results.bic.toFixed(2)}</strong> (lower is better)</p></div>
                                    <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">{analysisResult?.interpretations?.recommendations}</p></div>
                                </div>
                            </div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <div className="flex items-start gap-3"><CheckCircle2 className="w-6 h-6 text-primary" /><div><p className="font-semibold">Model Fitted Successfully!</p><p className="text-sm text-muted-foreground mt-1">Exponentially decreasing weights give more importance to recent observations. Compare fitted vs original to assess model quality.</p></div></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">AIC</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.aic.toFixed(1)}</p><p className="text-xs text-muted-foreground">Lower is better</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">BIC</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.bic.toFixed(1)}</p><p className="text-xs text-muted-foreground">Penalizes complexity</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">AICc</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.aicc.toFixed(1)}</p><p className="text-xs text-muted-foreground">Small-sample corrected</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Alpha (α)</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.model_params.smoothing_level?.toFixed(3) || 'N/A'}</p><p className="text-xs text-muted-foreground">Level smoothing</p></div></CardContent></Card>
                            </div>
                            <div className="flex items-center justify-center gap-1 py-2"><span className="text-sm text-muted-foreground mr-2">Model Fit:</span>{[1,2,3,4,5].map(star => <span key={star} className={`text-lg ${star <= 4 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>)}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">How did we determine this?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>How Did We Determine This?</CardTitle><CardDescription>Understanding exponential smoothing</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">What is Exponential Smoothing?</h4><p className="text-sm text-muted-foreground">Assigns <strong className="text-foreground">exponentially decreasing weights</strong> to past observations. More recent data points have greater influence on forecasts.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Smoothing Parameters (α, β, γ)</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">Alpha (α):</strong> Level smoothing. Near 0 = stable, near 1 = reactive<br/><strong className="text-foreground">Beta (β):</strong> Trend smoothing. Used in Holt and Holt-Winters<br/><strong className="text-foreground">Gamma (γ):</strong> Seasonal smoothing. Holt-Winters only</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Information Criteria (AIC/BIC)</h4><p className="text-sm text-muted-foreground"><strong className="text-foreground">Lower AIC/BIC = better model fit.</strong> Use these to compare different model types (Simple vs Holt vs Holt-Winters). BIC penalizes complexity more heavily.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div><div><h4 className="font-semibold mb-1">Model Selection Guide</h4><p className="text-sm text-muted-foreground"><strong>Simple:</strong> Flat data, no trend/seasonality<br/><strong>Holt:</strong> Trending data, no seasonality<br/><strong>Holt-Winters:</strong> Both trend and seasonal patterns</p></div></div></div>
                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Bottom Line</h4><p className="text-sm text-muted-foreground">Your {modelTypeLabel} model achieved AIC={results.aic.toFixed(1)} and BIC={results.bic.toFixed(1)}. {results.aic < 500 ? 'Good fit for short-term forecasting.' : 'Consider comparing with other model types.'}</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && analysisResult && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full exponential smoothing analysis</p></div>
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
                            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Exponential Smoothing Report</h2><p className="text-sm text-muted-foreground mt-1">{modelTypeLabel} | {valueCol} | {data.length} observations | {new Date().toLocaleDateString()}</p></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">AIC</p><p className="text-lg font-bold font-mono">{results.aic.toFixed(2)}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">BIC</p><p className="text-lg font-bold font-mono">{results.bic.toFixed(2)}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">AICc</p><p className="text-lg font-bold font-mono">{results.aicc.toFixed(2)}</p></CardContent></Card>
                                <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Parameters</p><p className="text-lg font-bold">{Object.keys(results.model_params).length}</p></CardContent></Card>
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
                                            {modelTypeLabel} exponential smoothing was applied to {valueCol} across <em>N</em> = {data.length} observations. 
                                            {smoothingType === 'simple' 
                                                ? ' This method models only the level component, suitable for series without trend or seasonality.'
                                                : smoothingType === 'holt'
                                                    ? ` This method models both level and trend components using ${trendType === 'add' ? 'additive' : 'multiplicative'} trend.`
                                                    : ` This method models level, trend, and seasonal components using ${trendType === 'add' ? 'additive' : 'multiplicative'} trend and ${seasonalType === 'add' ? 'additive' : 'multiplicative'} seasonality with period ${seasonalPeriods}.`}
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Model fit was evaluated using information criteria: AIC = {results.aic.toFixed(2)}, BIC = {results.bic.toFixed(2)}, 
                                            and AICc = {results.aicc.toFixed(2)}. Lower values indicate better fit with appropriate complexity penalization. 
                                            {results.bic < results.aic + 10 
                                                ? ' The similar AIC and BIC values suggest the model complexity is appropriate for the sample size.'
                                                : ' The difference between AIC and BIC suggests careful consideration of model complexity.'}
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            The optimized smoothing parameter α (level) = {results.model_params.smoothing_level?.toFixed(4) || 'N/A'}
                                            {results.model_params.smoothing_level > 0.7 
                                                ? ', indicating high sensitivity to recent observations'
                                                : results.model_params.smoothing_level > 0.3 
                                                    ? ', indicating balanced weighting between recent and historical data'
                                                    : ', indicating stable forecasts with greater weight on historical patterns'}.
                                            {smoothingType !== 'simple' && results.model_params.smoothing_trend && 
                                                ` The trend smoothing parameter β = ${results.model_params.smoothing_trend.toFixed(4)}.`}
                                            {smoothingType === 'holt-winters' && results.model_params.smoothing_seasonal && 
                                                ` The seasonal smoothing parameter γ = ${results.model_params.smoothing_seasonal.toFixed(4)}.`}
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {smoothingType === 'simple' 
                                                ? 'Simple exponential smoothing is appropriate when the series exhibits no clear trend or seasonal patterns. For series with trends, consider Holt\'s method; for seasonal patterns, consider Holt-Winters.'
                                                : smoothingType === 'holt'
                                                    ? 'Holt\'s linear method captures trend dynamics in addition to level. If seasonal patterns are present, upgrading to Holt-Winters may improve forecast accuracy.'
                                                    : `The Holt-Winters model with ${trendType === 'add' ? 'additive' : 'multiplicative'} trend and ${seasonalType === 'add' ? 'additive' : 'multiplicative'} seasonality captures all major time series components. Model adequacy should be verified through residual analysis.`}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>


                            <Card><CardHeader><CardTitle>Fitted vs Original Series</CardTitle><CardDescription>Visual comparison of model fit</CardDescription></CardHeader><CardContent><Image src={analysisResult.plot} alt="Exponential Smoothing Plot" width={1200} height={600} className="w-full rounded-md border"/></CardContent></Card>
                            <Card><CardHeader><CardTitle>Model Parameters</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-2 gap-4">{Object.entries(results.model_params).map(([key, value]) => <div key={key} className="flex justify-between p-3 bg-muted/30 rounded-lg"><span className="text-sm font-medium">{key.replace(/_/g, ' ')}</span><span className="font-mono text-sm">{typeof value === 'number' ? value.toFixed(6) : String(value)}</span></div>)}</div></CardContent></Card>
                        </div>
                        <div className="mt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button variant="outline" onClick={() => { setCurrentStep(1); setMaxReachedStep(1); setAnalysisResult(null); }}>Start New Analysis</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Fitting exponential smoothing model...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>)}
            </div>
            
            {/* Modals */}
            <ExponentialSmoothingGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
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
