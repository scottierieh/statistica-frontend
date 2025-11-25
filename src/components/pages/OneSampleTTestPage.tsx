'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, BarChart, Settings, FileSearch, CheckCircle, XCircle, AlertTriangle, HelpCircle, TrendingUp, Target, Activity, Layers, BookOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface TTestResults {
    test_type: string;
    variable?: string;
    test_value?: number;
    n?: number;
    sample_mean?: number;
    se_diff?: number;
    t_statistic: number;
    degrees_of_freedom: number;
    p_value: number;
    significant: boolean;
    cohens_d: number;
    confidence_interval?: [number, number];
    interpretation: string;
    dropped_rows?: number[];
    n_dropped?: number;
    normality_test?: {
        [key: string]: {
            statistic: number;
            p_value: number;
            assumption_met: boolean;
        }
    };
    descriptives?: {
        [key: string]: {
            n: number;
            mean: number;
            std_dev: number;
            se_mean?: number;
        }
    }
}

interface FullAnalysisResponse {
    results: TTestResults;
    plot: string;
}

// Generate interpretations for one-sample t-test (APA format)
const generateOneSampleInterpretations = (results: TTestResults, variable: string, testValue: number) => {
    const insights: string[] = [];
    
    const pValue = results.p_value;
    const tStat = results.t_statistic;
    const cohensD = results.cohens_d;
    const sampleMean = results.sample_mean || 0;
    const sd = results.descriptives?.[variable]?.std_dev || 0;
    const n = results.n || 0;
    const df = results.degrees_of_freedom;
    const ci = results.confidence_interval;
    const isSignificant = pValue <= 0.05;
    
    // Effect size interpretation
    const absD = Math.abs(cohensD);
    let effectLabel = 'negligible';
    if (absD >= 0.8) effectLabel = 'large';
    else if (absD >= 0.5) effectLabel = 'medium';
    else if (absD >= 0.2) effectLabel = 'small';
    
    // Format p-value for APA
    const pFormatted = pValue < .001 ? '< .001' : `= ${pValue.toFixed(3).replace(/^0/, '')}`;
    
    // Format CI for APA
    const ciFormatted = ci ? `95% CI [${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]` : '';
    
    // Overall analysis in APA format
    let overall = '';
    
    // APA-style report
    overall = `A one-sample <em>t</em>-test was conducted to determine whether the mean of <strong>${variable}</strong> significantly differed from the test value of ${testValue}. `;
    
    if (isSignificant) {
        overall += `Results indicated that the sample mean (<em>M</em> = ${sampleMean.toFixed(2)}, <em>SD</em> = ${sd.toFixed(2)}) was significantly different from the test value, <em>t</em>(${df}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        overall += `The effect size was ${effectLabel}. `;
        if (ci) {
            overall += `The ${ciFormatted} for the mean difference did not include zero, confirming the statistical significance. `;
        }
        if (sampleMean > testValue) {
            overall += `The sample mean was ${(sampleMean - testValue).toFixed(2)} units higher than the hypothesized value.`;
        } else {
            overall += `The sample mean was ${(testValue - sampleMean).toFixed(2)} units lower than the hypothesized value.`;
        }
    } else {
        overall += `Results indicated that the sample mean (<em>M</em> = ${sampleMean.toFixed(2)}, <em>SD</em> = ${sd.toFixed(2)}) was not significantly different from the test value, <em>t</em>(${df}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        if (ci) {
            overall += `The ${ciFormatted} for the mean included the test value, indicating no reliable difference. `;
        }
        overall += `The null hypothesis that the population mean equals ${testValue} cannot be rejected.`;
    }
    
    // P-value insight
    const pText = pValue < 0.001 ? '< .001' : pValue.toFixed(3);
    if (pValue < 0.001) {
        insights.push(`<strong>Significance:</strong> <em>p</em> < .001. The result is highly significant, providing strong evidence against the null hypothesis.`);
    } else if (pValue < 0.01) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result is significant at the .01 level.`);
    } else if (pValue < 0.05) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result is significant at the .05 level.`);
    } else if (pValue < 0.10) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result approaches but does not reach conventional significance (α = .05).`);
    } else {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result is not statistically significant.`);
    }
    
    // T-statistic insight
    const absTStat = Math.abs(tStat);
    insights.push(`<strong>Test Statistic:</strong> <em>t</em>(${df}) = ${tStat.toFixed(2)}. The observed mean is ${absTStat.toFixed(2)} standard errors ${sampleMean > testValue ? 'above' : 'below'} the hypothesized value.`);
    
    // Cohen's d insight
    insights.push(`<strong>Effect Size:</strong> Cohen's <em>d</em> = ${cohensD.toFixed(2)} (${effectLabel}). ${absD < 0.2 ? 'The practical significance is minimal.' : absD < 0.5 ? 'A small but potentially meaningful effect.' : absD < 0.8 ? 'A moderate, practically meaningful effect.' : 'A large, practically significant effect.'}`);
    
    // Confidence interval insight
    if (ci) {
        const includesTestValue = ci[0] <= testValue && testValue <= ci[1];
        insights.push(`<strong>Confidence Interval:</strong> ${ciFormatted}. ${includesTestValue ? `The interval includes the test value (${testValue}), consistent with a non-significant result.` : `The interval excludes the test value (${testValue}), consistent with the significant result.`}`);
    }
    
    // Sample size insight
    insights.push(`<strong>Sample Size:</strong> <em>n</em> = ${n}. ${n < 30 ? 'With smaller samples, verify normality assumption.' : 'Adequate for robust inference.'}`);
    
    // Normality check
    if (results.normality_test) {
        const normTest = Object.values(results.normality_test)[0];
        if (normTest) {
            const normP = normTest.p_value < .001 ? '< .001' : `= ${normTest.p_value.toFixed(3)}`;
            insights.push(`<strong>Normality:</strong> Shapiro-Wilk <em>W</em> = ${normTest.statistic.toFixed(3)}, <em>p</em> ${normP}. ${normTest.assumption_met ? 'Normality assumption is satisfied.' : 'Normality assumption may be violated; consider non-parametric alternatives if <em>n</em> < 30.'}`);
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (!isSignificant) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The null hypothesis cannot be rejected at α = .05</li>
                <li>Consider increasing sample size for greater statistical power</li>
                <li>Evaluate whether the observed difference is practically meaningful</li>
                ${pValue <= 0.10 ? '<li>The marginally significant trend may warrant further investigation</li>' : ''}
            </ul>
        `;
    } else if (absD < 0.2) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>Despite statistical significance, the effect size is negligible</li>
                <li>Consider whether this difference has practical importance</li>
                <li>Large sample sizes can detect trivially small effects</li>
            </ul>
        `;
    } else {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The result shows both statistical and practical significance</li>
                <li>Consider replication to confirm the finding</li>
                <li>Examine potential confounding variables</li>
                ${absD >= 0.8 ? '<li>The large effect size suggests meaningful real-world implications</li>' : ''}
            </ul>
        `;
    }
    
    return {
        overall_analysis: overall,
        statistical_insights: insights,
        recommendations: recommendations
    };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: TTestResults }) => {
    const isSignificant = results.p_value <= 0.05;
    
    const getEffectSizeInterpretation = (cohensD: number) => {
        const absD = Math.abs(cohensD);
        if (absD < 0.2) return "Negligible";
        if (absD < 0.5) return "Small";
        if (absD < 0.8) return "Medium";
        return "Large";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">T-Statistic</p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.t_statistic.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">Test Statistic</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">P-value</p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isSignificant ? 'Significant' : 'Not Significant'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Cohen's d</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.cohens_d.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.cohens_d)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Degrees of Freedom</p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.degrees_of_freedom.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">df</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const OneSampleOverview = ({ oneSampleVar, testValue, dataLength, data }: {
    oneSampleVar: string;
    testValue: string;
    dataLength: number;
    data: DataSet;
}) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (oneSampleVar && testValue !== '' && !isNaN(parseFloat(testValue))) {
            overview.push(`Testing if ${oneSampleVar} differs from ${testValue}`);
        } else {
            overview.push('Select a variable and enter a test value');
        }

        if (dataLength < 5) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Very small - results unreliable)`);
        } else if (dataLength < 20) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Small - check normality)`);
        } else if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} observations (Good)`);
        }
        
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        if (data && data.length > 0 && oneSampleVar) {
            const missingCount = data.filter((row: any) => isMissing(row[oneSampleVar])).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        overview.push('Test type: One-sample t-test (μ ≠ μ₀)');

        if (dataLength < 5) {
            overview.push('⚠ Minimum 5 observations recommended for t-tests');
        }

        return overview;
    }, [oneSampleVar, testValue, dataLength, data]);

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

// Intro Page
const OneSampleIntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Sigma className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">One-Sample T-Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test if a sample mean differs from a hypothesized population mean
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Single Sample</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Compare your sample's average against a known benchmark value
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Hypothesis Testing</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Determine if observed differences are statistically significant
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Effect Size</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Cohen's d quantifies the magnitude of the difference
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use this test when comparing your sample's average against a benchmark, standard value, 
                            or previously established mean. For example, testing if the average IQ score of students 
                            differs from the national average of 100.
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
                                        <span><strong>One numeric variable</strong> to test</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Test value:</strong> Hypothesized mean (μ₀)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 5 observations</span>
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
                                        <span><strong>p-value:</strong> Significance (p &lt; 0.05)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>t-statistic:</strong> Test statistic value</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cohen's d:</strong> Effect size measure</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {ttestExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(ttestExample)} size="lg">
                                {ttestExample.icon && <ttestExample.icon className="mr-2 h-5 w-5" />}
                                Load T-Test Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Setup Component
const OneSampleSetup = ({ 
    numericHeaders, 
    oneSampleVar, 
    setOneSampleVar, 
    testValue, 
    setTestValue, 
    oneSampleAlternative, 
    setOneSampleAlternative 
}: {
    numericHeaders: string[];
    oneSampleVar: string;
    setOneSampleVar: (v: string) => void;
    testValue: string;
    setTestValue: (v: string) => void;
    oneSampleAlternative: string;
    setOneSampleAlternative: (v: string) => void;
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="oneSampleVar">Variable</Label>
                    <Select value={oneSampleVar} onValueChange={setOneSampleVar}>
                        <SelectTrigger id="oneSampleVar">
                            <SelectValue placeholder="Select a numeric variable..." />
                        </SelectTrigger>
                        <SelectContent>
                            {numericHeaders.map((h: string) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="testValue">Test Value (μ₀)</Label>
                    <Input 
                        id="testValue" 
                        type="number" 
                        value={testValue} 
                        onChange={e => setTestValue(e.target.value)} 
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="oneSampleAlternative">Alternative Hypothesis</Label>
                    <Select value={oneSampleAlternative} onValueChange={setOneSampleAlternative}>
                        <SelectTrigger id="oneSampleAlternative">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="two-sided">Two-sided (≠)</SelectItem>
                            <SelectItem value="greater">Greater (&gt;)</SelectItem>
                            <SelectItem value="less">Less (&lt;)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};

interface OneSampleTTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function OneSampleTTestPage({ data, numericHeaders, onLoadExample }: OneSampleTTestPageProps) {
    const { toast } = useToast();
    
    const [oneSampleVar, setOneSampleVar] = useState(numericHeaders[0] || '');
    const [testValue, setTestValue] = useState('0');
    const [oneSampleAlternative, setOneSampleAlternative] = useState('two-sided');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0;
    }, [data, numericHeaders]);

    useEffect(() => {
        setView(canRun ? 'main' : 'intro');
        setAnalysisResult(null);
        setOneSampleVar(numericHeaders[0] || '');
    }, [data, numericHeaders, canRun]);
    
    const handleAnalysis = useCallback(async () => {
        if (!oneSampleVar || testValue === '') {
            toast({ variant: 'destructive', title: 'Please select a variable and enter a test value.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/one-sample-ttest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    params: { 
                        variable: oneSampleVar, 
                        test_value: parseFloat(testValue), 
                        alternative: oneSampleAlternative 
                    }
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: 'T-Test Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, oneSampleVar, testValue, oneSampleAlternative, toast]);

    if (!canRun || view === 'intro') {
        return <OneSampleIntroPage onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">One-Sample T-Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <OneSampleSetup 
                        numericHeaders={numericHeaders}
                        oneSampleVar={oneSampleVar}
                        setOneSampleVar={setOneSampleVar}
                        testValue={testValue}
                        setTestValue={setTestValue}
                        oneSampleAlternative={oneSampleAlternative}
                        setOneSampleAlternative={setOneSampleAlternative}
                    />
                    
                    <OneSampleOverview 
                        oneSampleVar={oneSampleVar}
                        testValue={testValue}
                        dataLength={data.length}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</>
                        ) : (
                            <><Sigma className="mr-2 h-4 w-4"/>Run Test</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-96 w-full"/>
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Data Quality Information */}
                    {results.n_dropped !== undefined && results.n_dropped > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Data Quality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Missing Values Detected</AlertTitle>
                                    <AlertDescription>
                                        <p className="mb-2">
                                            {results.n_dropped} row{results.n_dropped > 1 ? 's were' : ' was'} excluded from the analysis due to missing values.
                                        </p>
                                        {results.dropped_rows && results.dropped_rows.length > 0 && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer font-medium text-sm hover:underline">
                                                    View excluded row indices (0-based)
                                                </summary>
                                                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs font-mono">
                                                    {results.dropped_rows.length <= 20 
                                                        ? results.dropped_rows.join(', ')
                                                        : `${results.dropped_rows.slice(0, 20).join(', ')} ... and ${results.dropped_rows.length - 20} more`
                                                    }
                                                </div>
                                            </details>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* Detailed Analysis */}
                    {(() => {
                        const interpretations = generateOneSampleInterpretations(
                            results, 
                            oneSampleVar || '', 
                            parseFloat(testValue) || 0
                        );
                        return (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        Detailed Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* APA-Style Report */}
                                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-primary/10 rounded-md">
                                                <BookOpen className="h-4 w-4 text-primary" />
                                            </div>
                                            <h3 className="font-semibold text-base">APA-Style Report</h3>
                                        </div>
                                        <div 
                                            className="text-sm text-foreground/80 leading-relaxed prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: interpretations.overall_analysis }}
                                        />
                                    </div>

                                    {/* Statistical Insights */}
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-blue-500/10 rounded-md">
                                                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <h3 className="font-semibold text-base">Statistical Insights</h3>
                                        </div>
                                        <ul className="space-y-3">
                                            {interpretations.statistical_insights.map((insight, idx) => (
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

                                    {/* Recommendations */}
                                    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-amber-500/10 rounded-md">
                                                <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <h3 className="font-semibold text-base">Recommendations</h3>
                                        </div>
                                        <div 
                                            className="text-sm text-foreground/80 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: interpretations.recommendations }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })()}
                    
                    {/* Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={analysisResult.plot} 
                                alt="T-Test Visualization" 
                                width={500} 
                                height={400} 
                                className="w-3/4 mx-auto rounded-sm border"
                            />
                        </CardContent>
                    </Card>

                    {/* Descriptive Statistics */}
                    {results.descriptives && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Descriptive Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Std. Deviation</TableHead>
                                            {Object.values(results.descriptives)[0]?.se_mean !== undefined && (
                                                <TableHead className="text-right">SE Mean</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.descriptives).map(([group, stats]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                                {stats.se_mean !== undefined && (
                                                    <TableCell className="text-right font-mono">{stats.se_mean.toFixed(3)}</TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* T-Test Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>T-Test Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {results.sample_mean !== undefined && <TableHead className="text-right">Sample Mean</TableHead>}
                                        {results.test_value !== undefined && <TableHead className="text-right">Test Value</TableHead>}
                                        {results.se_diff !== undefined && <TableHead className="text-right">SE Diff</TableHead>}
                                        <TableHead className="text-right">t-statistic</TableHead>
                                        <TableHead className="text-right">df</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">Cohen's d</TableHead>
                                        {results.confidence_interval && <TableHead className="text-right">95% CI</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        {results.sample_mean !== undefined && (
                                            <TableCell className="font-mono text-right">{results.sample_mean.toFixed(4)}</TableCell>
                                        )}
                                        {results.test_value !== undefined && (
                                            <TableCell className="font-mono text-right">{results.test_value.toFixed(4)}</TableCell>
                                        )}
                                        {results.se_diff !== undefined && (
                                            <TableCell className="font-mono text-right">{results.se_diff.toFixed(4)}</TableCell>
                                        )}
                                        <TableCell className="font-mono text-right">{results.t_statistic.toFixed(4)}</TableCell>
                                        <TableCell className="font-mono text-right">{results.degrees_of_freedom.toFixed(0)}</TableCell>
                                        <TableCell className="font-mono text-right">
                                            {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="font-mono text-right">{results.cohens_d.toFixed(3)}</TableCell>
                                        {results.confidence_interval && (
                                            <TableCell className="font-mono text-right">
                                                [{results.confidence_interval[0].toFixed(3)}, {results.confidence_interval[1].toFixed(3)}]
                                            </TableCell>
                                        )}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Assumption Checks */}
                    {results.normality_test && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Assumption Checks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Normality (Shapiro-Wilk Test)</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Variable</TableHead>
                                                <TableHead className="text-right">Statistic</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">Assumption</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.normality_test).map(([group, test]: [string, any]) => (
                                                <TableRow key={group}>
                                                    <TableCell className="font-medium">{group}</TableCell>
                                                    <TableCell className="font-mono text-right">{test.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="font-mono text-right">
                                                        {test.p_value < 0.001 ? '<.001' : test.p_value.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {test.assumption_met ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                Met
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Not Met
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        * p &gt; 0.05 suggests data is normally distributed (assumption met)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Test' to perform the analysis.</p>
                </div>
            )}
        </div>
    );
}
