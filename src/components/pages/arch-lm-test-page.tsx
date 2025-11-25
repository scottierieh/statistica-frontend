'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, LineChart as LineChartIcon, Bot, Download, Activity, Info, TrendingUp, BarChart3 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';

interface ArchLmResult {
    lm_statistic: number;
    p_value: number;
    f_statistic: number;
    f_p_value: number;
    lags: number;
    is_significant: boolean;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: ArchLmResult;
    interpretations?: {
        overall_analysis: string;
        test_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: ArchLmResult }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Test Result Status Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Test Result
                            </p>
                            {!results.is_significant ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.is_significant ? 'ARCH Effects' : 'Homoscedastic'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.is_significant ? 'Volatility clustering detected' : 'Constant variance'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* LM Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                LM Statistic
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.lm_statistic.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Chi-square test statistic
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* P-Value Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                P-Value (LM)
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold font-mono ${results.p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                            {results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Significance level: 0.05
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* F-Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                F-Statistic
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.f_statistic.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            p = {results.f_p_value < 0.001 ? '<0.001' : results.f_p_value.toFixed(4)}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const ArchLmOverview = ({ valueCol, lags, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!valueCol) {
            overview.push('Select a value column to test');
        } else {
            overview.push(`Testing column: ${valueCol}`);
        }

        // Parameters
        overview.push(`Number of lags: ${lags}`);

        // Data characteristics
        if (data.length < 30) {
            overview.push(`⚠ Limited data (${data.length} points) - test may be less reliable`);
        } else {
            overview.push(`${data.length} data points available`);
        }

        // Test information
        overview.push('Null hypothesis: No ARCH effects (homoscedasticity)');
        overview.push('Alternative: ARCH effects present (heteroscedasticity)');
        overview.push('Significance level: α = 0.05');
        overview.push('Common use: Testing residuals from ARIMA models');
        overview.push('Best for: Detecting volatility clustering in financial data');

        return overview;
    }, [valueCol, lags, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Generate interpretations based on ARCH-LM test results
const generateArchLmInterpretations = (results: ArchLmResult) => {
    const insights: string[] = [];
    
    let overall = '';
    if (results.is_significant) {
        overall = '<strong>ARCH effects detected (Heteroscedasticity).</strong> The test rejects the null hypothesis of constant variance, indicating that volatility is not constant over time. This phenomenon, known as volatility clustering, is common in financial time series where periods of high volatility are followed by high volatility, and calm periods by calm periods. Standard models like ARIMA may not be appropriate without accounting for these effects.';
    } else {
        overall = '<strong>No ARCH effects detected (Homoscedasticity).</strong> The test fails to reject the null hypothesis, suggesting that the variance of the series is constant over time. This indicates that your residuals or time series do not exhibit volatility clustering, and standard forecasting models should be adequate.';
    }
    
    // LM test insight
    insights.push(`<strong>LM Statistic:</strong> ${results.lm_statistic.toFixed(4)} (follows a chi-square distribution with ${results.lags} degrees of freedom). This tests whether lagged squared residuals have explanatory power for current squared residuals.`);
    
    // P-value insight
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-Value (LM Test):</strong> p < 0.001 (highly significant). Very strong evidence of ARCH effects.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-Value (LM Test):</strong> p = ${results.p_value.toFixed(4)} (significant at α = 0.05). Evidence suggests ARCH effects are present.`);
    } else if (results.p_value < 0.10) {
        insights.push(`<strong>P-Value (LM Test):</strong> p = ${results.p_value.toFixed(4)} (marginally significant). Weak evidence of ARCH effects.`);
    } else {
        insights.push(`<strong>P-Value (LM Test):</strong> p = ${results.p_value.toFixed(4)} (not significant). No evidence of ARCH effects at the 5% level.`);
    }
    
    // F-test insight
    insights.push(`<strong>F-Statistic:</strong> ${results.f_statistic.toFixed(4)} with p-value = ${results.f_p_value < 0.001 ? '<0.001' : results.f_p_value.toFixed(4)}. This is an alternative test statistic that adjusts for degrees of freedom. ${results.f_p_value < 0.05 ? 'Confirms the presence of ARCH effects.' : 'Supports the conclusion of no ARCH effects.'}`);
    
    // Lags insight
    insights.push(`<strong>Lags Tested:</strong> The test examined ${results.lags} lagged squared residuals. A higher number of lags captures longer-term volatility patterns.`);
    
    // Recommendations
    let recommendations = '';
    if (results.is_significant) {
        recommendations = 'Consider using volatility models to capture the heteroscedasticity: (1) ARCH models: Model variance as a function of past squared errors, (2) GARCH models: Extend ARCH by including past variance terms (more common), (3) EGARCH or GJR-GARCH: Capture asymmetric volatility (leverage effects), (4) Check if transformation (e.g., log returns) reduces heteroscedasticity. After fitting a volatility model, re-run this test on the standardized residuals to verify improvement.';
    } else {
        recommendations = 'Your series exhibits constant variance (homoscedasticity), which is ideal for standard forecasting models. No volatility modeling is necessary. You can proceed with ARIMA or other models that assume constant variance. Continue to monitor new data for any emerging volatility patterns, especially if working with financial or economic time series.';
    }
    
    return {
        overall_analysis: overall,
        test_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const archExample = exampleDatasets.find(d => d.id === 'time-series');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <LineChartIcon className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">ARCH-LM Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test for Autoregressive Conditional Heteroscedasticity in time series
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Volatility Clustering</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Detects non-constant variance
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">ARCH Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Tests heteroscedasticity
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Model Validation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Checks residual variance
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use the ARCH-LM Test
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            In financial and economic time series, volatility often clusters—high volatility periods 
                            follow high volatility, and calm periods follow calm periods. The ARCH-LM test detects 
                            this phenomenon. It's crucial for model validation: if ARCH effects exist in your residuals, 
                            standard models like ARIMA assume constant variance and may produce unreliable forecasts. 
                            Use this test to determine if you need volatility models like GARCH.
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
                                        <span><strong>Value Column:</strong> Time series or residuals</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Lags:</strong> Number of periods to test</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Points:</strong> 30+ recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Typical Use:</strong> Financial residuals</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p &gt; 0.05:</strong> No ARCH effects (good)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p &lt; 0.05:</strong> ARCH effects present</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>LM & F:</strong> Two test statistics agree</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Significant:</strong> Consider GARCH models</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {archExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(archExample)} size="lg">
                                <LineChartIcon className="mr-2 h-5 w-5" />
                                Load Time Series Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ArchLmTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function ArchLmTestPage({ data, numericHeaders, onLoadExample, onGenerateReport }: ArchLmTestPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [valueCol, setValueCol] = useState<string | undefined>();
    const [lags, setLags] = useState<number>(10);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);
    
    useEffect(() => {
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!valueCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a value column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const seriesData = data.map(row => row[valueCol]).filter(v => typeof v === 'number');

            const response = await fetch('/api/analysis/arch-lm-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: seriesData, 
                    valueCol, 
                    lags
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Generate interpretations
            const interpretations = generateArchLmInterpretations(result.results);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('ARCH-LM Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, valueCol, lags, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Test results are not available." });
            return;
        }
        
        const testData = [{
            test: 'ARCH-LM',
            lm_statistic: analysisResult.results.lm_statistic,
            lm_p_value: analysisResult.results.p_value,
            f_statistic: analysisResult.results.f_statistic,
            f_p_value: analysisResult.results.f_p_value,
            lags: analysisResult.results.lags,
            is_significant: analysisResult.results.is_significant,
            interpretation: analysisResult.results.interpretation
        }];
        
        const csv = Papa.unparse(testData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'arch_lm_test_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Test results are being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">ARCH-LM Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Test for Autoregressive Conditional Heteroscedasticity (ARCH effects).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Value Column (e.g., Residuals)</Label>
                            <Select value={valueCol} onValueChange={setValueCol}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Number of Lags</Label>
                            <Input type="number" value={lags} onChange={e => setLags(Number(e.target.value))} min="1" />
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <ArchLmOverview 
                        valueCol={valueCol}
                        lags={lags}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(analysisResult, null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleDownloadResults}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Results
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Testing...</> : <><Sigma className="mr-2"/>Run Test</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running ARCH-LM test...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>ARCH effects test results and volatility assessment</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={results.is_significant ? 'destructive' : 'default'}>
                                {results.is_significant ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                <AlertTitle>{results.is_significant ? "ARCH Effects Detected (Heteroscedasticity)" : "No ARCH Effects Detected (Homoscedasticity)"}</AlertTitle>
                                <AlertDescription>{results.interpretation}</AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <LineChartIcon className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Heteroscedasticity Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Test Insights */}
                            {analysisResult.interpretations?.test_insights && analysisResult.interpretations.test_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Test Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.test_insights.map((insight, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Recommendations */}
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-500/10 rounded-md">
                                        <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Recommendations</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                >
                                    {analysisResult.interpretations?.recommendations}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Test Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Test Results Summary</CardTitle>
                            <CardDescription>
                                ARCH-LM test statistics for detecting heteroscedasticity
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="text-right">Interpretation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-semibold">LM Statistic</TableCell>
                                        <TableCell className="font-mono text-right">{results.lm_statistic.toFixed(4)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">Chi-square distributed</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">P-Value (LM)</TableCell>
                                        <TableCell className={`font-mono text-right ${results.p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                                            {results.p_value < 0.001 ? "< 0.001" : results.p_value.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={results.is_significant ? 'destructive' : 'default'}>
                                                {results.is_significant ? 'Significant' : 'Not Significant'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">F-Statistic</TableCell>
                                        <TableCell className="font-mono text-right">{results.f_statistic.toFixed(4)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">F-distribution</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">P-Value (F)</TableCell>
                                        <TableCell className={`font-mono text-right ${results.f_p_value < 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                                            {results.f_p_value < 0.001 ? "< 0.001" : results.f_p_value.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">Alternative test</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">Lags</TableCell>
                                        <TableCell className="font-mono text-right">{results.lags}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">Degrees of freedom</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">
                                Significance level: α = 0.05 | p &lt; 0.05 indicates ARCH effects (heteroscedasticity)
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <LineChartIcon className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure parameters and click &apos;Run Test&apos; to check for ARCH effects.</p>
                </div>
            )}
        </div>
    );
}


