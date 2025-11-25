'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Link2, HelpCircle, Settings, FileSearch, TrendingUp, Bot, Download, Activity, Info, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';

interface RegressionResult {
    model: string;
    coefficients: number[];
    std_errors: number[];
    t_statistics: number[];
    p_values: number[];
    variable_names: string[];
}

interface FullAnalysisResponse {
    ols: RegressionResult;
    tsls: RegressionResult;
    plot?: string;
    interpretations?: {
        overall_analysis: string;
        model_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ ols, tsls, xEndogCols }: { ols: RegressionResult, tsls: RegressionResult, xEndogCols: string[] }) => {
    // Find the coefficient for the main endogenous variable
    const endogVarName = xEndogCols[0];
    const olsEndogIdx = ols.variable_names.findIndex(v => v === endogVarName);
    const tslsEndogIdx = tsls.variable_names.findIndex(v => v === endogVarName);
    
    const olsCoef = olsEndogIdx >= 0 ? ols.coefficients[olsEndogIdx] : 0;
    const tslsCoef = tslsEndogIdx >= 0 ? tsls.coefficients[tslsEndogIdx] : 0;
    const difference = Math.abs(tslsCoef - olsCoef);
    const percentChange = olsCoef !== 0 ? ((tslsCoef - olsCoef) / Math.abs(olsCoef)) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* OLS Coefficient Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                OLS Estimate
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {olsCoef.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Potentially biased
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 2SLS Coefficient Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                2SLS Estimate
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {tslsCoef.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Causal estimate
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Difference Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Difference
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {difference.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Absolute change
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Percent Change Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                % Change
                            </p>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Bias correction
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const IVOverview = ({ yCol, xEndogCols, xExogCols, zCols, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!yCol) {
            overview.push('Select dependent variable (Y)');
        } else {
            overview.push(`Dependent variable: ${yCol}`);
        }
        
        if (xEndogCols.length === 0) {
            overview.push('⚠ Select at least one endogenous variable');
        } else {
            overview.push(`Endogenous variables: ${xEndogCols.join(', ')}`);
        }
        
        if (xExogCols.length > 0) {
            overview.push(`Exogenous variables: ${xExogCols.join(', ')}`);
        }
        
        if (zCols.length === 0) {
            overview.push('⚠ Select at least one instrumental variable');
        } else {
            overview.push(`Instrumental variables: ${zCols.join(', ')}`);
        }

        // Data characteristics
        overview.push(`${data.length} observations available`);

        // Method information
        overview.push('Method: Two-Stage Least Squares (2SLS)');
        overview.push('Stage 1: Regress endogenous vars on instruments');
        overview.push('Stage 2: Regress Y on predicted values');
        overview.push('Corrects for endogeneity bias in OLS');
        overview.push('Best for: Causal inference with observational data');

        return overview;
    }, [yCol, xEndogCols, xExogCols, zCols, data]);

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

// Generate interpretations based on IV regression results
const generateIVInterpretations = (ols: RegressionResult, tsls: RegressionResult, xEndogCols: string[], zCols: string[]) => {
    const insights: string[] = [];
    
    // Compare OLS and 2SLS estimates
    const endogVarName = xEndogCols[0];
    const olsIdx = ols.variable_names.findIndex(v => v === endogVarName);
    const tslsIdx = tsls.variable_names.findIndex(v => v === endogVarName);
    
    const olsCoef = olsIdx >= 0 ? ols.coefficients[olsIdx] : 0;
    const tslsCoef = tslsIdx >= 0 ? tsls.coefficients[tslsIdx] : 0;
    const difference = tslsCoef - olsCoef;
    const percentChange = olsCoef !== 0 ? (difference / Math.abs(olsCoef)) * 100 : 0;
    
    let overall = '';
    if (Math.abs(percentChange) < 10) {
        overall = `<strong>Small bias correction detected.</strong> The 2SLS estimate (${tslsCoef.toFixed(4)}) differs from the OLS estimate (${olsCoef.toFixed(4)}) by only ${Math.abs(percentChange).toFixed(1)}%. This suggests that endogeneity may not be a major concern in your data, or the instruments may not be capturing the endogenous variation effectively.`;
    } else if (Math.abs(percentChange) < 50) {
        overall = `<strong>Moderate bias correction applied.</strong> The 2SLS estimate (${tslsCoef.toFixed(4)}) differs from the OLS estimate (${olsCoef.toFixed(4)}) by ${Math.abs(percentChange).toFixed(1)}%. This indicates that the naive OLS regression was moderately biased, and the instrumental variable approach has corrected for endogeneity.`;
    } else {
        overall = `<strong>Substantial bias correction detected.</strong> The 2SLS estimate (${tslsCoef.toFixed(4)}) differs dramatically from the OLS estimate (${olsCoef.toFixed(4)}) by ${Math.abs(percentChange).toFixed(1)}%. This suggests significant endogeneity in the OLS model that the IV approach has corrected. The true causal effect is notably different from the naive estimate.`;
    }
    
    // OLS results insight
    const olsSignificant = olsIdx >= 0 && ols.p_values[olsIdx] < 0.05;
    insights.push(`<strong>OLS Results (Potentially Biased):</strong> Coefficient = ${olsCoef.toFixed(4)}, p-value = ${olsIdx >= 0 ? (ols.p_values[olsIdx] < 0.001 ? '<0.001' : ols.p_values[olsIdx].toFixed(3)) : 'N/A'}. ${olsSignificant ? 'Statistically significant, but may be biased due to endogeneity.' : 'Not statistically significant at the 5% level.'}`);
    
    // 2SLS results insight
    const tslsSignificant = tslsIdx >= 0 && tsls.p_values[tslsIdx] < 0.05;
    insights.push(`<strong>2SLS Results (Causal Estimate):</strong> Coefficient = ${tslsCoef.toFixed(4)}, p-value = ${tslsIdx >= 0 ? (tsls.p_values[tslsIdx] < 0.001 ? '<0.001' : tsls.p_values[tslsIdx].toFixed(3)) : 'N/A'}. ${tslsSignificant ? 'Statistically significant - this is your causal effect estimate.' : 'Not statistically significant, suggesting the causal effect may be weak or instruments may be weak.'}`);
    
    // Interpretation of difference
    if (difference > 0) {
        insights.push(`<strong>Direction of Bias:</strong> The OLS estimate underestimated the true causal effect. After correcting for endogeneity, the effect of ${endogVarName} on the outcome is stronger (more positive) than the naive OLS suggested.`);
    } else if (difference < 0) {
        insights.push(`<strong>Direction of Bias:</strong> The OLS estimate overestimated the true causal effect. After correcting for endogeneity, the effect of ${endogVarName} on the outcome is weaker (less positive or more negative) than the naive OLS suggested.`);
    }
    
    // Instruments insight
    insights.push(`<strong>Instrumental Variables Used:</strong> ${zCols.join(', ')}. These instruments should be correlated with the endogenous variable(s) but not directly affect the outcome. Weak instruments can lead to biased 2SLS estimates.`);
    
    // Standard errors comparison
    if (tslsIdx >= 0 && olsIdx >= 0) {
        const olsSE = ols.std_errors[olsIdx];
        const tslsSE = tsls.std_errors[tslsIdx];
        if (tslsSE > olsSE * 1.5) {
            insights.push(`<strong>Precision Loss:</strong> The 2SLS standard error (${tslsSE.toFixed(4)}) is notably larger than the OLS standard error (${olsSE.toFixed(4)}). This is expected with IV estimation but indicates less precise estimates. Larger sample sizes or stronger instruments can improve precision.`);
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (!tslsSignificant && olsSignificant) {
        recommendations = 'The 2SLS estimate is not statistically significant while OLS was. This could indicate: (1) Weak instruments - check first-stage F-statistic (>10 rule of thumb), (2) The true causal effect is actually weak, (3) Large standard errors due to instrument weakness. Consider: finding stronger instruments, increasing sample size, or using alternative identification strategies (e.g., difference-in-differences, regression discontinuity).';
    } else if (tslsSignificant) {
        recommendations = 'Your IV regression has successfully identified a causal effect. To strengthen your analysis: (1) Test instrument validity using overidentification tests if you have more instruments than endogenous variables, (2) Check first-stage F-statistic to ensure instruments are strong (F > 10), (3) Consider robustness checks with alternative instrument sets, (4) Examine whether the Local Average Treatment Effect (LATE) estimated by IV is the parameter of interest for your research question.';
    } else {
        recommendations = 'Neither OLS nor 2SLS estimates are statistically significant. This suggests: (1) The effect may truly be negligible, (2) Instruments are too weak to provide identification, (3) Sample size may be insufficient. Consider: collecting more data, finding better instruments, or reconsidering whether IV is the appropriate method for your research question.';
    }
    
    return {
        overall_analysis: overall,
        model_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Link2 className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Instrumental Variable Regression</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Estimate causal effects when standard regression would be biased
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <AlertTriangle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Endogeneity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Corrects biased estimates
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Link2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Instruments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    External sources of variation
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Causality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identifies causal effects
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use IV Regression
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use IV regression when your predictor variable is correlated with the error term (endogeneity), 
                            leading to biased OLS estimates. Common sources of endogeneity include omitted variables, 
                            measurement error, or simultaneity. The instrumental variable approach uses external variation 
                            to isolate the causal effect. Your instrument must be: (1) relevant - correlated with the 
                            endogenous variable, and (2) valid - not correlated with the error term.
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
                                        <span><strong>Dependent (Y):</strong> Outcome variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Endogenous (X):</strong> Biased predictors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Instruments (Z):</strong> Valid instruments</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Observations:</strong> 100+ recommended</span>
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
                                        <span><strong>OLS:</strong> Potentially biased estimate</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>2SLS:</strong> Causal effect estimate</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Difference:</strong> Magnitude of bias</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>First-stage F:</strong> Instrument strength</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button 
                            onClick={() => {
                                const example = exampleDatasets.find(d => d.id === 'regression-suite') || exampleDatasets[0];
                                onLoadExample(example);
                            }} 
                            size="lg"
                        >
                            <Link2 className="mr-2 h-5 w-5" />
                            Load Example Dataset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

interface IVRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function InstrumentalVariableRegressionPage({ data, numericHeaders, onLoadExample, onGenerateReport }: IVRegressionPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [yCol, setYCol] = useState<string | undefined>();
    const [xEndogCols, setXEndogCols] = useState<string[]>([]);
    const [xExogCols, setXExogCols] = useState<string[]>([]);
    const [zCols, setZCols] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 4, [data, numericHeaders]);

    useEffect(() => {
        if (canRun) {
            setYCol(numericHeaders[0]);
            setXEndogCols([numericHeaders[1]]);
            setXExogCols([numericHeaders[2]]);
            setZCols([numericHeaders[3]]);
            setView('main');
        } else {
            setView('intro');
        }
    }, [canRun, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!yCol || xEndogCols.length === 0 || zCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select Y, at least one Endogenous X, and at least one Instrument Z.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/instrumental-variable-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, y_col: yCol, x_endog_cols: xEndogCols, x_exog_cols: xExogCols, z_cols: zCols })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateIVInterpretations(result.ols, result.tsls, xEndogCols, zCols);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, yCol, xEndogCols, xExogCols, zCols, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const resultsData = [
            { model: 'OLS', ...analysisResult.ols },
            { model: '2SLS', ...analysisResult.tsls }
        ];
        
        const csv = Papa.unparse(resultsData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'iv_regression_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Regression results are being downloaded." });
    }, [analysisResult, toast]);

    const renderResultsTable = (result: RegressionResult) => (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{result.model}</CardTitle>
                <CardDescription>
                    {result.model === 'OLS' ? 'Naive regression (potentially biased)' : 'Two-Stage Least Squares (causal estimate)'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Variable</TableHead>
                            <TableHead className="text-right">Coefficient</TableHead>
                            <TableHead className="text-right">Std. Error</TableHead>
                            <TableHead className="text-right">t-statistic</TableHead>
                            <TableHead className="text-right">p-value</TableHead>
                            <TableHead className="text-center">Sig.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.variable_names.map((name, i) => {
                            const isSignificant = result.p_values[i] < 0.05;
                            return (
                                <TableRow key={name}>
                                    <TableCell className="font-semibold">{name}</TableCell>
                                    <TableCell className="font-mono text-right">{result.coefficients[i]?.toFixed(4)}</TableCell>
                                    <TableCell className="font-mono text-right">{result.std_errors[i]?.toFixed(4)}</TableCell>
                                    <TableCell className="font-mono text-right">{result.t_statistics[i]?.toFixed(3)}</TableCell>
                                    <TableCell className={`font-mono text-right ${isSignificant ? 'text-green-600' : ''}`}>
                                        {result.p_values[i] < 0.001 ? '<0.001' : result.p_values[i]?.toFixed(3)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={isSignificant ? 'default' : 'outline'}>
                                            {isSignificant ? '***' : 'ns'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">IV Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select dependent, endogenous, exogenous, and instrumental variables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label>Dependent (Y)</Label>
                            <Select value={yCol} onValueChange={v => setYCol(v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Endogenous (X)</Label>
                            <Select value={xEndogCols[0]} onValueChange={v => setXEndogCols([v])}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.filter(h=>h!==yCol).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Exogenous (X)</Label>
                            <Select value={xExogCols[0]} onValueChange={v => setXExogCols([v])}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.filter(h=>h!==yCol && !xEndogCols.includes(h)).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Instruments (Z)</Label>
                            <Select value={zCols[0]} onValueChange={v => setZCols([v])}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.filter(h=>h!==yCol && !xEndogCols.includes(h) && !xExogCols.includes(h)).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <IVOverview 
                        yCol={yCol}
                        xEndogCols={xEndogCols}
                        xExogCols={xExogCols}
                        zCols={zCols}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {analysisResult && (
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
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running IV regression analysis...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards ols={analysisResult.ols} tsls={analysisResult.tsls} xEndogCols={xEndogCols} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Bias correction and causal effect estimation</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    IV regression successfully estimated. The 2SLS approach corrects for endogeneity bias present in OLS estimates.
                                </AlertDescription>
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
                                        <Link2 className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Bias Correction Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Model Insights */}
                            {analysisResult.interpretations?.model_insights && analysisResult.interpretations.model_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Model Comparison</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.model_insights.map((insight, idx) => (
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

                    {/* Regression Results Tables */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        {analysisResult.ols && renderResultsTable(analysisResult.ols)}
                        {analysisResult.tsls && renderResultsTable(analysisResult.tsls)}
                    </div>
                    
                    {/* Visualization */}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Coefficient Comparison
                                </CardTitle>
                                <CardDescription>
                                    Visual comparison of OLS and 2SLS coefficients with standard errors
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <img 
                                    src={`data:image/png;base64,${analysisResult.plot}`}
                                    alt="IV Regression Results Visualization"
                                    className="w-full rounded-md border"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Link2 className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure variables and click &apos;Run Analysis&apos; to estimate causal effects.</p>
                </div>
            )}
        </div>
    );
}