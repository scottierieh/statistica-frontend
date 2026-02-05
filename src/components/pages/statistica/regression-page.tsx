'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, BarChart as BarChartIcon, Settings, FileSearch, Users, Repeat, CheckCircle, AlertTriangle, HelpCircle, Bot, Loader2, TrendingUp, Target, Layers, BookOpen, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, FileText, BarChart3, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType, Activity, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Label } from '../../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import Papa from 'papaparse';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';

interface RegressionMetrics {
    r2: number;
    adj_r2: number;
    rmse: number;
    mae: number;
    mse: number;
}

interface RegressionResultsData {
    model_name: string;
    model_type: string;
    features: string[];
    metrics: { all_data: RegressionMetrics; };
    diagnostics: {
        f_statistic?: number;
        f_pvalue?: number;
        durbin_watson?: number;
        vif?: { [key: string]: number };
        coefficient_tests?: { params: { [key: string]: number }; pvalues: { [key: string]: number }; bse: { [key: string]: number }; tvalues: { [key: string]: number }; };
        standardized_coefficients?: { params: { [key: string]: number }; pvalues: { [key: string]: number }; bse: { [key: string]: number }; tvalues: { [key: string]: number }; };
        normality_tests?: { jarque_bera: { statistic: number; p_value: number; }; shapiro_wilk: { statistic: number; p_value: number; }; };
        heteroscedasticity_tests?: { breusch_pagan: { statistic: number; p_value: number; }; };
        specification_tests?: { reset: { statistic: number; p_value: number; }; };
    };
    interpretation?: { overall_analysis: string; key_insights: string; recommendations: string; } | string;
    n_dropped?: number;
    dropped_rows?: number[];
}

interface FullAnalysisResponse {
    results: RegressionResultsData;
    model_name: string;
    model_type: string;
    plot: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Data' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' },
];

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const getR2Interpretation = (r2: number) => {
    if (r2 >= 0.75) return { label: 'Excellent', desc: 'strong explanatory power' };
    if (r2 >= 0.50) return { label: 'Good', desc: 'substantial explanatory power' };
    if (r2 >= 0.25) return { label: 'Moderate', desc: 'moderate explanatory power' };
    return { label: 'Weak', desc: 'limited explanatory power' };
};

const StatisticalSummaryCards = ({ results, modelType }: { results: RegressionResultsData, modelType: string }) => {
    const metrics = results.metrics.all_data;
    const fTestPValue = results.diagnostics?.f_pvalue;
    const isModelSignificant = fTestPValue !== undefined && fTestPValue < 0.05;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">R-squared</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{metrics.r2.toFixed(4)}</p><p className="text-xs text-muted-foreground">{getR2Interpretation(metrics.r2).label}</p></div></CardContent></Card>
            {modelType !== 'simple' && <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Adjusted R²</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{metrics.adj_r2.toFixed(4)}</p><p className="text-xs text-muted-foreground">For predictors</p></div></CardContent></Card>}
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">RMSE</p><BarChartIcon className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{metrics.rmse.toFixed(4)}</p><p className="text-xs text-muted-foreground">Prediction error</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Model Sig.</p><Sigma className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${!isModelSignificant ? 'text-rose-600 dark:text-rose-400' : ''}`}>{fTestPValue !== undefined ? (fTestPValue < 0.001 ? '<0.001' : fTestPValue.toFixed(4)) : 'N/A'}</p><p className="text-xs text-muted-foreground">{fTestPValue !== undefined ? (isModelSignificant ? 'Significant' : 'Not Sig.') : 'p-value'}</p></div></CardContent></Card>
        </div>
    );
};

const SimpleLinearIntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><TrendingUp className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Simple Linear Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Predict one thing from another — find the formula that connects them</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Find the Pattern</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Discover if X goes up when Y goes up (or down)</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Make Predictions</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Forecast future values based on the relationship</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChartIcon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Measure Impact</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">See how much X affects Y</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-5 h-5" />When to Use This Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Simple Regression when you want to understand if one variable can predict another. For example: Does ad spending predict sales? Does study time predict test scores?</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Two numeric variables:</strong> One predictor (X), one outcome (Y)</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Linear pattern:</strong> The relationship should be roughly straight-line</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Enough data:</strong> At least 20+ observations recommended</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />What You'll Learn</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Direction:</strong> Positive or negative relationship?</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Strength:</strong> How much does X explain Y?</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Formula:</strong> Exact equation to predict Y from X</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {regressionExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(regressionExample)} size="lg">{regressionExample.icon && <regressionExample.icon className="mr-2 h-5 w-5" />}Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

const MultipleLinearIntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Layers className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Multiple Linear Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Predict outcomes using several factors at once — find which ones matter most</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Users className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Multiple Factors</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Include several predictors to get better forecasts</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Isolate Effects</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">See each factor's unique contribution</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Bot className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Auto Selection</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Let the algorithm find the best predictors</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-5 h-5" />When to Use This Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Multiple Regression when many factors might affect your outcome.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Multiple predictors:</strong> 2+ numeric variables</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>One outcome:</strong> The variable to predict</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>More data:</strong> 10-20 observations per predictor</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />What You'll Learn</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Key drivers:</strong> Which factors matter most?</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Unique effects:</strong> Each factor's isolated impact</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Better predictions:</strong> Combining factors improves accuracy</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {regressionExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(regressionExample)} size="lg">{regressionExample.icon && <regressionExample.icon className="mr-2 h-5 w-5" />}Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

const PolynomialIntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Repeat className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Polynomial Regression</CardTitle>
                    <CardDescription className="text-base mt-2">Capture curved relationships — when a straight line isn't enough</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Repeat className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Curved Patterns</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Model U-shapes, peaks, and complex curves</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><TrendingUp className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Diminishing Returns</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Capture when more of X has less effect</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChartIcon className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Optimal Points</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Find sweet spots and turning points</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-5 h-5" />When to Use This Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use Polynomial Regression when the relationship isn't straight.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Curved scatter plot:</strong> Linear regression doesn't fit</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Choose degree:</strong> 2 = parabola, 3 = S-curve</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Enough data:</strong> More data for higher degrees</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />What You'll Learn</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Curve shape:</strong> Rising, falling, or both?</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Turning points:</strong> Where does the effect reverse?</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Better fit:</strong> Captures patterns linear can't</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {regressionExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(regressionExample)} size="lg">{regressionExample.icon && <regressionExample.icon className="mr-2 h-5 w-5" />}Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface RegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string;
    restoredState?: any;
}

export default function RegressionPage({ data, numericHeaders, onLoadExample, activeAnalysis, restoredState }: RegressionPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [targetVar, setTargetVar] = useState<string>('');
    const [simpleFeatureVar, setSimpleFeatureVar] = useState<string>('');
    const [multipleFeatureVars, setMultipleFeatureVars] = useState<string[]>([]);
    const [polyDegree, setPolyDegree] = useState(2);
    const [selectionMethod, setSelectionMethod] = useState('none');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const modelType = useMemo(() => activeAnalysis.replace('regression-', ''), [activeAnalysis]);
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== targetVar), [numericHeaders, targetVar]);
    const currentFeatures = useMemo(() => modelType === 'simple' ? (simpleFeatureVar ? [simpleFeatureVar] : []) : multipleFeatureVars, [modelType, simpleFeatureVar, multipleFeatureVars]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Target variable selected', passed: targetVar !== '', detail: targetVar ? `Target: ${targetVar}` : 'Please select a target variable' });
        if (modelType === 'simple') {
            checks.push({ label: 'Feature variable selected', passed: simpleFeatureVar !== '', detail: simpleFeatureVar ? `Feature: ${simpleFeatureVar}` : 'Please select a feature variable' });
        } else {
            checks.push({ label: 'Feature variables selected', passed: multipleFeatureVars.length >= 1, detail: multipleFeatureVars.length >= 1 ? `${multipleFeatureVars.length} features selected` : 'Select at least one feature' });
        }
        checks.push({ label: 'Sufficient sample size', passed: data.length >= 30, detail: `n = ${data.length} observations (minimum: 30)` });
        if (modelType === 'multiple' && multipleFeatureVars.length > 0) {
            const ratio = Math.floor(data.length / multipleFeatureVars.length);
            checks.push({ label: 'Sample per predictor', passed: ratio >= 10, detail: `${ratio} observations per predictor (recommended: 10+)` });
        }
        const allVars = [targetVar, ...currentFeatures].filter(v => v);
        if (allVars.length > 0) {
            const isMissing = (value: any) => value == null || value === '' || (typeof value === 'number' && isNaN(value));
            const missingCount = data.filter((row: any) => allVars.some(v => isMissing(row[v]))).length;
            checks.push({ label: 'Missing values check', passed: missingCount === 0, detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} rows with missing values will be excluded` });
        }
        return checks;
    }, [data, targetVar, simpleFeatureVar, multipleFeatureVars, modelType, currentFeatures]);

    const allValidationsPassed = dataValidation.filter(c => c.label === 'Target variable selected' || c.label === 'Feature variable selected' || c.label === 'Feature variables selected').every(check => check.passed);

    useEffect(() => {
        if (numericHeaders.length > 0) {
            const newTarget = numericHeaders[numericHeaders.length - 1];
            if (!targetVar) setTargetVar(newTarget);
            const initialFeatures = numericHeaders.filter(h => h !== newTarget);
            if (!simpleFeatureVar && initialFeatures.length > 0) setSimpleFeatureVar(initialFeatures[0]);
            if (multipleFeatureVars.length === 0 && initialFeatures.length > 0) setMultipleFeatureVars(initialFeatures);
        }
    }, [numericHeaders]);

    useEffect(() => {
        if (restoredState) {
            setTargetVar(restoredState.params.targetVar || '');
            setSimpleFeatureVar(restoredState.params.simpleFeatureVar || '');
            setMultipleFeatureVars(restoredState.params.multipleFeatureVars || []);
            setPolyDegree(restoredState.params.polyDegree || 2);
            setSelectionMethod(restoredState.params.selectionMethod || 'none');
            setAnalysisResult({ results: restoredState.results, plot: '', model_name: '', model_type: modelType });
            setView('main'); setCurrentStep(4); setMaxReachedStep(6);
        } else {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
        }
    }, [restoredState, canRun, modelType]);

    useEffect(() => {
        if (!restoredState) { setView(canRun ? 'main' : 'intro'); setAnalysisResult(null); setCurrentStep(1); setMaxReachedStep(1); }
    }, [data, numericHeaders, canRun, modelType]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };
    const handleMultiFeatureSelectionChange = (header: string, checked: boolean) => { setMultipleFeatureVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header)); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true); toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `${modelType}_Regression_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image; link.click();
            toast({ title: "Download complete" });
        } catch (error) { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast, modelType]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const results = analysisResult.results;
        const metrics = results.metrics.all_data;
        const mainResults = [{ model_type: modelType, target_variable: targetVar, features: currentFeatures.join(', '), r_squared: metrics.r2, adj_r_squared: metrics.adj_r2, rmse: metrics.rmse, mae: metrics.mae, f_pvalue: results.diagnostics?.f_pvalue }];
        const coefficientsData: any[] = [];
        if (results.diagnostics?.coefficient_tests) {
            Object.entries(results.diagnostics.coefficient_tests.params).forEach(([varName, coef]) => {
                coefficientsData.push({ variable: varName, coefficient: coef, std_error: results.diagnostics!.coefficient_tests!.bse?.[varName], t_value: results.diagnostics!.coefficient_tests!.tvalues?.[varName], p_value: results.diagnostics!.coefficient_tests!.pvalues?.[varName] });
            });
        }
        let csvContent = "REGRESSION MODEL RESULTS\n" + Papa.unparse(mainResults) + "\n\n";
        if (coefficientsData.length > 0) { csvContent += "COEFFICIENTS\n" + Papa.unparse(coefficientsData) + "\n\n"; }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `${modelType}_Regression_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click(); URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, targetVar, modelType, currentFeatures, toast]);
    
// handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult?.results) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/regression-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult.results,
                targetVar,
                features: currentFeatures,
                modelType,
                sampleSize: data.length,
                polyDegree: modelType === 'polynomial' ? polyDegree : undefined
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${modelType.charAt(0).toUpperCase() + modelType.slice(1)}_Regression_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, targetVar, currentFeatures, modelType, data.length, polyDegree, toast]);




    const handleAnalysis = useCallback(async () => {
        if (!targetVar) { toast({ variant: 'destructive', title: 'Please select a target variable.' }); return; }
        let features: string[] = [];
        let params: any = { data, targetVar, modelType, selectionMethod, test_size: 0 };
        switch (modelType) {
            case 'simple':
                if (!simpleFeatureVar) { toast({ variant: 'destructive', title: 'Please select a feature variable.' }); return; }
                features = [simpleFeatureVar]; break;
            case 'multiple': case 'polynomial':
                if (multipleFeatureVars.length < 1) { toast({ variant: 'destructive', title: 'Please select at least one feature.' }); return; }
                features = multipleFeatureVars;
                if (modelType === 'polynomial') params.degree = polyDegree; break;
        }
        params.features = features;
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/regression`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
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
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Regression Complete', description: 'Results are ready.' });
        } catch (e: any) { console.error('Analysis error:', e); toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, targetVar, modelType, simpleFeatureVar, multipleFeatureVars, polyDegree, selectionMethod, toast]);

    const introPages: { [key: string]: React.FC<any> } = { simple: SimpleLinearIntroPage, multiple: MultipleLinearIntroPage, polynomial: PolynomialIntroPage };
    const IntroComponent = introPages[modelType];
    if (!IntroComponent || view === 'intro' || !canRun) { return <IntroComponent onLoadExample={onLoadExample} />; }
    
    const results = analysisResult?.results;
    const modelLabel = modelType.charAt(0).toUpperCase() + modelType.slice(1);

    const ProgressBar = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between w-full gap-2">
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
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <div><h1 className="text-2xl font-bold">{modelLabel} Regression</h1><p className="text-muted-foreground mt-1">{modelType === 'simple' ? 'Model the relationship between two variables.' : modelType === 'multiple' ? 'Predict outcomes using multiple predictors.' : 'Model non-linear relationships.'}</p></div>
                <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
            </div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {/* Step 1-6 content continues... Due to length this is a simplified version */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose your target and feature variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label className="text-sm font-medium">Target Variable (Y)</Label><Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger className="h-11"><SelectValue placeholder="Select target" /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            {modelType === 'simple' ? (
                                <div className="space-y-3"><Label className="text-sm font-medium">Feature Variable (X)</Label><Select value={simpleFeatureVar} onValueChange={setSimpleFeatureVar}><SelectTrigger className="h-11"><SelectValue placeholder="Select feature" /></SelectTrigger><SelectContent>{availableFeatures.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            ) : (
                                <div className="space-y-3"><Label className="text-sm font-medium">Feature Variables (X)</Label><ScrollArea className="h-40 border rounded-xl p-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{availableFeatures.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`feat-${h}`} checked={multipleFeatureVars.includes(h)} onCheckedChange={(c) => handleMultiFeatureSelectionChange(h, !!c)} /><label htmlFor={`feat-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}</div></ScrollArea><p className="text-xs text-muted-foreground">{multipleFeatureVars.length} features selected</p></div>
                            )}
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Model Settings</CardTitle><CardDescription>Configure your regression model</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            {modelType === 'multiple' && (<div className="space-y-3"><Label className="text-sm font-medium">Variable Selection Method</Label><Select value={selectionMethod} onValueChange={setSelectionMethod}><SelectTrigger className="h-11 max-w-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Enter (Use All)</SelectItem><SelectItem value="forward">Forward Selection</SelectItem><SelectItem value="backward">Backward Elimination</SelectItem><SelectItem value="stepwise">Stepwise</SelectItem></SelectContent></Select></div>)}
                            {modelType === 'polynomial' && (<div className="space-y-3"><Label className="text-sm font-medium">Polynomial Degree</Label><Input type="number" value={polyDegree} onChange={e => setPolyDegree(Number(e.target.value))} min="2" max="5" className="h-11 max-w-32"/><p className="text-xs text-muted-foreground">Higher degrees may overfit</p></div>)}
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Model Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Target:</strong> {targetVar || 'Not selected'}</p><p>• <strong className="text-foreground">Features:</strong> {currentFeatures.length > 0 ? currentFeatures.join(', ') : 'None'}</p><p>• <strong className="text-foreground">Type:</strong> {modelLabel} Regression</p>{modelType === 'polynomial' && <p>• <strong className="text-foreground">Degree:</strong> {polyDegree}</p>}</div></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{dataValidation.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div></div>))}</div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" /><p className="text-sm text-muted-foreground">{modelLabel} regression with OLS estimation will be performed.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key findings about what drives {targetVar}</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <StatisticalSummaryCards results={results} modelType={modelType} />
                            <div className="text-center py-4"><p className="text-muted-foreground">R² = {results.metrics.all_data.r2.toFixed(4)} | Model explains {(results.metrics.all_data.r2 * 100).toFixed(1)}% of variance</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of how we reached this result</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <p className="text-sm text-muted-foreground">The model explains {(results.metrics.all_data.r2 * 100).toFixed(1)}% of variance. {results.diagnostics?.f_pvalue !== undefined && results.diagnostics.f_pvalue < 0.05 ? 'The relationship is statistically significant.' : 'The relationship is not statistically significant.'}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" /> Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileType className="mr-2 h-4 w-4" />Word Document<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileCode className="mr-2 h-4 w-4" />Python Script<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">{modelLabel} Regression Report</h2><p className="text-sm text-muted-foreground mt-1">{targetVar} ~ {currentFeatures.join(' + ')} | {new Date().toLocaleDateString()}</p></div>
                        <StatisticalSummaryCards results={results} modelType={modelType} />
                        {analysisResult?.plot && (<Card><CardHeader><CardTitle>Visualization</CardTitle></CardHeader><CardContent><Image src={analysisResult.plot} alt="Regression Diagnostics" width={1000} height={833} className="w-full h-auto rounded-md border" /></CardContent></Card>)}
                        <Card><CardHeader><CardTitle>Model Performance</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">R-squared</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.r2.toFixed(4)}</TableCell></TableRow>{modelType !== 'simple' && <TableRow><TableCell className="font-medium">Adjusted R²</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.adj_r2.toFixed(4)}</TableCell></TableRow>}<TableRow><TableCell className="font-medium">RMSE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.rmse.toFixed(4)}</TableCell></TableRow><TableRow><TableCell className="font-medium">MAE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.mae.toFixed(4)}</TableCell></TableRow></TableBody></Table></CardContent></Card>
                        {results.diagnostics?.coefficient_tests && (<Card><CardHeader><CardTitle>Coefficients</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">B</TableHead><TableHead className="text-right">SE</TableHead><TableHead className="text-right">t</TableHead><TableHead className="text-right">p</TableHead></TableRow></TableHeader><TableBody>{Object.entries(results.diagnostics.coefficient_tests.params).map(([key, value]) => { const se = results.diagnostics!.coefficient_tests!.bse?.[key]; const t = results.diagnostics!.coefficient_tests!.tvalues?.[key]; const p = results.diagnostics!.coefficient_tests!.pvalues?.[key]; return (<TableRow key={key}><TableCell className="font-medium">{key}</TableCell><TableCell className="text-right font-mono">{value.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{se?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{t?.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{p < 0.001 ? '<.001' : p?.toFixed(4)}{getSignificanceStars(p)}</TableCell></TableRow>); })}</TableBody></Table></CardContent></Card>)}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>
        </div>
    );
}