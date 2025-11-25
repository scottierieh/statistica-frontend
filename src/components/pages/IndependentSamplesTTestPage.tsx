'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Users, BarChart, Settings, FileSearch, CheckCircle, XCircle, AlertTriangle, HelpCircle, TrendingUp, Target, Activity, Layers, BookOpen, FlaskConical, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '../ui/badge';

interface TTestResults {
    test_type: string;
    variable?: string;
    group_variable?: string;
    groups?: string[];
    n1?: number;
    n2?: number;
    mean1?: number;
    mean2?: number;
    mean_diff?: number;
    se_diff?: number;
    t_statistic: number;
    degrees_of_freedom: number;
    p_value: number;
    significant: boolean;
    cohens_d: number;
    interpretation: string;
    dropped_rows?: number[];
    n_dropped?: number;
    levene_test?: {
        statistic: number;
        p_value: number;
        assumption_met: boolean;
    };
    normality_test?: {
        [key: string]: {
            statistic: number;
            p_value: number;
            assumption_met: boolean;
        }
    };
    student_t?: {
        t_statistic: number;
        df: number;
        p_value: number;
        mean_diff: number;
        se_diff: number;
        ci: [number, number];
    };
    welch_t?: {
        t_statistic: number;
        df: number;
        p_value: number;
        mean_diff: number;
        se_diff: number;
        ci: [number, number];
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

// Generate interpretations for independent samples t-test (APA format)
const generateIndependentSamplesInterpretations = (results: TTestResults) => {
    const insights: string[] = [];
    
    const pValue = results.p_value;
    const tStat = results.t_statistic;
    const cohensD = results.cohens_d;
    const df = results.degrees_of_freedom;
    const isSignificant = pValue <= 0.05;
    const groups = results.groups || ['Group 1', 'Group 2'];
    const variable = results.variable || 'dependent variable';
    
    // Get descriptive stats
    const desc1 = results.descriptives?.[groups[0]];
    const desc2 = results.descriptives?.[groups[1]];
    const mean1 = desc1?.mean || results.mean1 || 0;
    const mean2 = desc2?.mean || results.mean2 || 0;
    const sd1 = desc1?.std_dev || 0;
    const sd2 = desc2?.std_dev || 0;
    const n1 = desc1?.n || results.n1 || 0;
    const n2 = desc2?.n || results.n2 || 0;
    const meanDiff = results.mean_diff || (mean1 - mean2);
    
    // Effect size interpretation
    const absD = Math.abs(cohensD);
    let effectLabel = 'negligible';
    if (absD >= 0.8) effectLabel = 'large';
    else if (absD >= 0.5) effectLabel = 'medium';
    else if (absD >= 0.2) effectLabel = 'small';
    
    // Format p-value for APA
    const pFormatted = pValue < .001 ? '< .001' : `= ${pValue.toFixed(3).replace(/^0/, '')}`;
    
    // Determine which test to report
    const useWelch = results.levene_test && !results.levene_test.assumption_met;
    const testName = useWelch ? "Welch's" : "Student's";
    const reportedTest = useWelch ? results.welch_t : results.student_t;
    const ci = reportedTest?.ci;
    const ciFormatted = ci ? `95% CI [${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]` : '';
    
    // APA-style report
    let overall = `An independent-samples <em>t</em>-test was conducted to compare <strong>${variable}</strong> between ${groups[0]} and ${groups[1]} groups. `;
    
    // Add Levene's test result
    if (results.levene_test) {
        const leveneP = results.levene_test.p_value;
        const levenePFormatted = leveneP < .001 ? '< .001' : `= ${leveneP.toFixed(3)}`;
        if (results.levene_test.assumption_met) {
            overall += `Levene's test indicated equal variances (<em>F</em> = ${results.levene_test.statistic.toFixed(2)}, <em>p</em> ${levenePFormatted}), so ${testName} <em>t</em>-test was used. `;
        } else {
            overall += `Levene's test indicated unequal variances (<em>F</em> = ${results.levene_test.statistic.toFixed(2)}, <em>p</em> ${levenePFormatted}), so Welch's <em>t</em>-test was used. `;
        }
    }
    
    if (isSignificant) {
        overall += `There was a significant difference in scores for ${groups[0]} (<em>M</em> = ${mean1.toFixed(2)}, <em>SD</em> = ${sd1.toFixed(2)}) and ${groups[1]} (<em>M</em> = ${mean2.toFixed(2)}, <em>SD</em> = ${sd2.toFixed(2)}); <em>t</em>(${df.toFixed(df % 1 === 0 ? 0 : 2)}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        overall += `The effect size was ${effectLabel}. `;
        if (ci) {
            overall += `The ${ciFormatted} for the mean difference did not include zero. `;
        }
        overall += `${groups[0]} scored ${meanDiff > 0 ? 'higher' : 'lower'} than ${groups[1]} by ${Math.abs(meanDiff).toFixed(2)} units on average.`;
    } else {
        overall += `There was no significant difference in scores for ${groups[0]} (<em>M</em> = ${mean1.toFixed(2)}, <em>SD</em> = ${sd1.toFixed(2)}) and ${groups[1]} (<em>M</em> = ${mean2.toFixed(2)}, <em>SD</em> = ${sd2.toFixed(2)}); <em>t</em>(${df.toFixed(df % 1 === 0 ? 0 : 2)}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        if (ci) {
            overall += `The ${ciFormatted} for the mean difference included zero. `;
        }
        overall += `The null hypothesis of no difference between groups cannot be rejected.`;
    }
    
    // Significance insight
    const pText = pValue < 0.001 ? '< .001' : pValue.toFixed(3);
    if (pValue < 0.001) {
        insights.push(`<strong>Significance:</strong> <em>p</em> < .001. The result is highly significant, providing strong evidence of a difference between groups.`);
    } else if (pValue < 0.01) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result is significant at the .01 level.`);
    } else if (pValue < 0.05) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result is significant at the .05 level.`);
    } else if (pValue < 0.10) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result approaches but does not reach conventional significance (α = .05).`);
    } else {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. The result is not statistically significant.`);
    }
    
    // Test statistic insight
    insights.push(`<strong>Test Statistic:</strong> <em>t</em>(${df.toFixed(df % 1 === 0 ? 0 : 2)}) = ${tStat.toFixed(2)}. ${useWelch ? "Welch's correction was applied due to unequal variances." : "Equal variances assumed."}`);
    
    // Effect size insight
    insights.push(`<strong>Effect Size:</strong> Cohen's <em>d</em> = ${cohensD.toFixed(2)} (${effectLabel}). ${absD < 0.2 ? 'The practical significance is minimal.' : absD < 0.5 ? 'A small but potentially meaningful effect.' : absD < 0.8 ? 'A moderate, practically meaningful effect.' : 'A large, practically significant effect.'}`);
    
    // Mean difference insight
    insights.push(`<strong>Mean Difference:</strong> ${meanDiff.toFixed(2)} units. ${groups[0]} ${meanDiff > 0 ? 'outperformed' : 'scored lower than'} ${groups[1]}.`);
    
    // Confidence interval insight
    if (ci) {
        const includesZero = ci[0] <= 0 && 0 <= ci[1];
        insights.push(`<strong>Confidence Interval:</strong> ${ciFormatted}. ${includesZero ? 'The interval includes zero, consistent with a non-significant result.' : 'The interval excludes zero, consistent with the significant result.'}`);
    }
    
    // Sample size insight
    const totalN = n1 + n2;
    insights.push(`<strong>Sample Size:</strong> <em>n</em><sub>1</sub> = ${n1}, <em>n</em><sub>2</sub> = ${n2} (total <em>N</em> = ${totalN}). ${totalN < 30 ? 'With smaller samples, verify normality assumption.' : 'Adequate for robust inference.'}`);
    
    // Normality check
    if (results.normality_test) {
        const normResults = Object.entries(results.normality_test);
        const allNormal = normResults.every(([_, test]) => test.assumption_met);
        if (allNormal) {
            insights.push(`<strong>Normality:</strong> Shapiro-Wilk tests indicated both groups are approximately normally distributed.`);
        } else {
            const violated = normResults.filter(([_, test]) => !test.assumption_met).map(([group, _]) => group);
            insights.push(`<strong>Normality:</strong> Shapiro-Wilk test suggests non-normality in: ${violated.join(', ')}. ${totalN >= 30 ? 'With adequate sample size, the t-test is robust to this violation.' : 'Consider non-parametric alternatives (Mann-Whitney U test).'}`);
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (!isSignificant) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The null hypothesis of no group difference cannot be rejected at α = .05</li>
                <li>Consider increasing sample size for greater statistical power</li>
                <li>Evaluate whether the observed difference is practically meaningful</li>
                ${pValue <= 0.10 ? '<li>The marginally significant trend may warrant further investigation</li>' : ''}
            </ul>
        `;
    } else if (absD < 0.2) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>Despite statistical significance, the effect size is negligible</li>
                <li>Consider whether this group difference has practical importance</li>
                <li>Large sample sizes can detect trivially small effects</li>
            </ul>
        `;
    } else {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The result shows both statistical and practical significance</li>
                <li>Consider replication to confirm the finding</li>
                <li>Examine potential confounding variables between groups</li>
                ${absD >= 0.8 ? '<li>The large effect size suggests meaningful real-world group differences</li>' : ''}
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
                        <p className="text-2xl font-semibold">{results.degrees_of_freedom.toFixed(results.degrees_of_freedom % 1 === 0 ? 0 : 2)}</p>
                        <p className="text-xs text-muted-foreground">df</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const IndependentSamplesOverview = ({ groupVar, valueVar, dataLength, data }: {
    groupVar: string | undefined;
    valueVar: string | undefined;
    dataLength: number;
    data: DataSet;
}) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (groupVar && valueVar) {
            overview.push(`Comparing ${valueVar} between groups in ${groupVar}`);
        } else {
            overview.push('Select both grouping and dependent variables');
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
        
        if (data && data.length > 0 && groupVar && valueVar) {
            const missingCount = data.filter((row: any) => 
                isMissing(row[groupVar]) || isMissing(row[valueVar])
            ).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        overview.push('Test type: Independent samples t-test');

        if (dataLength < 5) {
            overview.push('⚠ Minimum 5 observations recommended for t-tests');
        }

        return overview;
    }, [groupVar, valueVar, dataLength, data]);

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
const IndependentSamplesIntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Independent Samples T-Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare means between two independent groups
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Two Groups</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Compare outcomes between two independent, unrelated groups
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <FlaskConical className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">A/B Testing</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Perfect for comparing control vs treatment groups
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Group Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test if two group means are significantly different
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
                            Use this test when comparing outcomes between two independent groups. 
                            For example, comparing test scores between treatment and control groups,
                            or comparing sales performance between two different regions.
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
                                        <span><strong>Grouping variable:</strong> Two distinct groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Dependent variable:</strong> Numeric outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independence:</strong> Groups are unrelated</span>
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
                                        <span><strong>p-value:</strong> Significance of difference</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Levene's test:</strong> Variance equality check</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cohen's d:</strong> Practical significance</span>
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
const IndependentSamplesSetup = ({ 
    numericHeaders, 
    categoricalHeaders,
    data,
    groupVar, 
    setGroupVar, 
    valueVar, 
    setValueVar, 
    alternative, 
    setAlternative 
}: {
    numericHeaders: string[];
    categoricalHeaders: string[];
    data: DataSet;
    groupVar: string | undefined;
    setGroupVar: (v: string) => void;
    valueVar: string | undefined;
    setValueVar: (v: string) => void;
    alternative: string;
    setAlternative: (v: string) => void;
}) => {
    // Filter to only binary categorical variables
    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter((h: string) => 
            new Set(data.map((row: any) => row[h]).filter((v: any) => v != null && v !== '')).size === 2
        );
    }, [data, categoricalHeaders]);

    if (binaryCategoricalHeaders.length === 0) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Valid Grouping Variable</AlertTitle>
                <AlertDescription>
                    This test requires a categorical variable with exactly two groups. None found in your data.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="groupVar">Grouping Variable</Label>
                    <Select value={groupVar} onValueChange={setGroupVar}>
                        <SelectTrigger id="groupVar">
                            <SelectValue placeholder="Select grouping variable..." />
                        </SelectTrigger>
                        <SelectContent>
                            {binaryCategoricalHeaders.map((h: string) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="valueVar">Dependent Variable</Label>
                    <Select value={valueVar} onValueChange={setValueVar}>
                        <SelectTrigger id="valueVar">
                            <SelectValue placeholder="Select numeric variable..." />
                        </SelectTrigger>
                        <SelectContent>
                            {numericHeaders.map((h: string) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="alternative">Alternative Hypothesis</Label>
                    <Select value={alternative} onValueChange={setAlternative}>
                        <SelectTrigger id="alternative">
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

interface IndependentSamplesTTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function IndependentSamplesTTestPage({ 
    data, 
    numericHeaders, 
    categoricalHeaders,
    onLoadExample 
}: IndependentSamplesTTestPageProps) {
    const { toast } = useToast();
    
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [valueVar, setValueVar] = useState<string | undefined>();
    const [alternative, setAlternative] = useState('two-sided');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0;
    }, [data, numericHeaders]);

    useEffect(() => {
        setView(canRun ? 'main' : 'intro');
        setAnalysisResult(null);
        
        // Set defaults
        const binaryHeaders = categoricalHeaders.filter(h => 
            new Set(data.map(row => row[h])).size === 2
        );
        setGroupVar(binaryHeaders[0]);
        setValueVar(numericHeaders[0]);
    }, [data, numericHeaders, categoricalHeaders, canRun]);
    
    const handleAnalysis = useCallback(async () => {
        if (!groupVar || !valueVar) {
            toast({ variant: 'destructive', title: 'Please select both grouping and dependent variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/independent-samples-ttest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    params: { 
                        variable: valueVar, 
                        group_variable: groupVar, 
                        alternative: alternative 
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
    }, [data, groupVar, valueVar, alternative, toast]);

    if (!canRun || view === 'intro') {
        return <IndependentSamplesIntroPage onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Independent Samples T-Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <IndependentSamplesSetup 
                        numericHeaders={numericHeaders}
                        categoricalHeaders={categoricalHeaders}
                        data={data}
                        groupVar={groupVar}
                        setGroupVar={setGroupVar}
                        valueVar={valueVar}
                        setValueVar={setValueVar}
                        alternative={alternative}
                        setAlternative={setAlternative}
                    />
                    
                    <IndependentSamplesOverview 
                        groupVar={groupVar}
                        valueVar={valueVar}
                        dataLength={data.length}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</>
                        ) : (
                            <><Users className="mr-2 h-4 w-4"/>Run Test</>
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
                        const interpretations = generateIndependentSamplesInterpretations(results);
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
                                            <TableHead>Group</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Std. Deviation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.descriptives).map(([group, stats]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* T-Test Results Table */}
                    {results.student_t && results.welch_t && (
                        <Card>
                            <CardHeader>
                                <CardTitle>T-Test Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Test Type</TableHead>
                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                <TableHead className="text-right">SE Diff</TableHead>
                                                <TableHead className="text-right">t-statistic</TableHead>
                                                <TableHead className="text-right">df</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">95% CI</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">
                                                    Student's t-test
                                                    <div className="text-xs font-normal text-muted-foreground">Equal variances</div>
                                                </TableCell>
                                                <TableCell className="font-mono text-right">{results.student_t.mean_diff.toFixed(4)}</TableCell>
                                                <TableCell className="font-mono text-right">{results.student_t.se_diff.toFixed(4)}</TableCell>
                                                <TableCell className="font-mono text-right">{results.student_t.t_statistic.toFixed(4)}</TableCell>
                                                <TableCell className="font-mono text-right">{results.student_t.df.toFixed(0)}</TableCell>
                                                <TableCell className="font-mono text-right">
                                                    {results.student_t.p_value < 0.001 ? '<.001' : results.student_t.p_value.toFixed(4)}
                                                </TableCell>
                                                <TableCell className="font-mono text-right">
                                                    [{results.student_t.ci[0].toFixed(3)}, {results.student_t.ci[1].toFixed(3)}]
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">
                                                    Welch's t-test
                                                    <div className="text-xs font-normal text-muted-foreground">Unequal variances</div>
                                                </TableCell>
                                                <TableCell className="font-mono text-right">{results.welch_t.mean_diff.toFixed(4)}</TableCell>
                                                <TableCell className="font-mono text-right">{results.welch_t.se_diff.toFixed(4)}</TableCell>
                                                <TableCell className="font-mono text-right">{results.welch_t.t_statistic.toFixed(4)}</TableCell>
                                                <TableCell className="font-mono text-right">{results.welch_t.df.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-right">
                                                    {results.welch_t.p_value < 0.001 ? '<.001' : results.welch_t.p_value.toFixed(4)}
                                                </TableCell>
                                                <TableCell className="font-mono text-right">
                                                    [{results.welch_t.ci[0].toFixed(3)}, {results.welch_t.ci[1].toFixed(3)}]
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                                        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-muted-foreground">
                                            {results.levene_test?.assumption_met 
                                                ? "Since Levene's test was not significant (equal variances assumed), Student's t-test is recommended."
                                                : "Since Levene's test was significant (equal variances not assumed), Welch's t-test is recommended."}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Assumption Checks */}
                    {(results.normality_test || results.levene_test) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Assumption Checks</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Normality Test */}
                                {results.normality_test && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Normality (Shapiro-Wilk Test)</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Group</TableHead>
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
                                )}

                                {/* Equality of Variance */}
                                {results.levene_test && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Equality of Variance (Levene's Test)</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Statistic</TableHead>
                                                    <TableHead className="text-right">p-value</TableHead>
                                                    <TableHead className="text-right">Assumption</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-mono">{results.levene_test.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="font-mono text-right">
                                                        {results.levene_test.p_value < 0.001 ? '<.001' : results.levene_test.p_value.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {results.levene_test.assumption_met ? (
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
                                            </TableBody>
                                        </Table>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            * p &gt; 0.05 suggests equal variances (assumption met)
                                        </p>
                                    </div>
                                )}
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