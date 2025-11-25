'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart, Settings, FileSearch, Users, Repeat, CheckCircle, XCircle, AlertTriangle, HelpCircle, Info, Lightbulb, TrendingUp, Target, Activity, Layers, BookOpen } from 'lucide-react';
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
    variable1?: string;
    variable2?: string;
    test_value?: number;
    n?: number;
    n1?: number;
    n2?: number;
    sample_mean?: number;
    mean_diff?: number;
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

// Generate interpretations for one-sample t-test
const generateOneSampleInterpretations = (results: TTestResults, variable: string, testValue: number) => {
    const insights: string[] = [];
    
    const pValue = results.p_value;
    const tStat = results.t_statistic;
    const cohensD = results.cohens_d;
    const sampleMean = results.sample_mean || 0;
    const isSignificant = pValue <= 0.05;
    
    // Overall analysis
    let overall = '';
    if (isSignificant && Math.abs(cohensD) >= 0.5) {
        overall = `<strong>Strong evidence of difference.</strong> The one-sample t-test revealed that ${variable} (M = ${sampleMean.toFixed(3)}) differs significantly from the hypothesized value of ${testValue}, t(${results.degrees_of_freedom}) = ${tStat.toFixed(3)}, p ${pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`}. With Cohen's d = ${cohensD.toFixed(3)}, this represents a ${Math.abs(cohensD) >= 0.8 ? 'large' : 'medium'} effect size, indicating a meaningful and statistically reliable difference from the test value.`;
    } else if (isSignificant) {
        overall = `<strong>Statistically significant difference detected.</strong> The analysis shows that ${variable} (M = ${sampleMean.toFixed(3)}) is significantly different from ${testValue}, t(${results.degrees_of_freedom}) = ${tStat.toFixed(3)}, p = ${pValue.toFixed(3)}. However, with Cohen's d = ${cohensD.toFixed(3)}, the effect size is small, suggesting the practical significance may be limited despite statistical significance.`;
    } else if (pValue <= 0.10) {
        overall = `<strong>Marginally non-significant result.</strong> The t-test shows a trend toward difference (p = ${pValue.toFixed(3)}), but does not reach conventional statistical significance (p < .05). The mean of ${variable} (M = ${sampleMean.toFixed(3)}) differs from ${testValue} by ${Math.abs(sampleMean - testValue).toFixed(3)} units. Consider collecting more data or examining if this trend has practical importance.`;
    } else {
        overall = `<strong>No significant difference detected.</strong> The one-sample t-test indicates that ${variable} (M = ${sampleMean.toFixed(3)}) does not significantly differ from the hypothesized value of ${testValue}, t(${results.degrees_of_freedom}) = ${tStat.toFixed(3)}, p = ${pValue.toFixed(3)}. The sample mean is consistent with the test value, suggesting no meaningful departure from the hypothesized population mean.`;
    }
    
    // P-value insight
    if (pValue < 0.001) {
        insights.push(`<strong>P-value:</strong> p < .001 (extremely significant). There is strong evidence against the null hypothesis. The probability of observing this difference (or more extreme) by chance alone is less than 0.1%. This provides compelling evidence that ${variable} differs from ${testValue}.`);
    } else if (pValue < 0.01) {
        insights.push(`<strong>P-value:</strong> p = ${pValue.toFixed(3)} (highly significant). Strong evidence that ${variable} differs from the test value of ${testValue}. The result would occur by chance less than 1% of the time if the null hypothesis were true.`);
    } else if (pValue < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${pValue.toFixed(3)} (significant at α = .05). Sufficient evidence to conclude that ${variable} differs from ${testValue}. This meets the conventional threshold for statistical significance.`);
    } else if (pValue < 0.10) {
        insights.push(`<strong>P-value:</strong> p = ${pValue.toFixed(3)} (marginally significant). While not reaching the conventional .05 threshold, this suggests a potential difference that may warrant further investigation with additional data. Some fields accept p < .10 as suggestive evidence.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${pValue.toFixed(3)} (not significant). Insufficient evidence to reject the null hypothesis. The observed difference could easily occur by chance. We fail to find convincing evidence that ${variable} differs from ${testValue}.`);
    }
    
    // T-statistic insight
    const absTStat = Math.abs(tStat);
    if (absTStat > 3) {
        insights.push(`<strong>T-statistic:</strong> t = ${tStat.toFixed(3)} (very large). The observed mean is ${absTStat.toFixed(1)} standard errors away from the hypothesized value, indicating a substantial departure. This large t-value contributes to the ${isSignificant ? 'significant' : ''} result.`);
    } else if (absTStat > 2) {
        insights.push(`<strong>T-statistic:</strong> t = ${tStat.toFixed(3)} (moderate to large). The sample mean deviates from the test value by ${absTStat.toFixed(1)} standard errors. ${absTStat > 2.5 ? 'This is a fairly strong signal of difference.' : 'This represents a moderate effect.'}`);
    } else if (absTStat > 1) {
        insights.push(`<strong>T-statistic:</strong> t = ${tStat.toFixed(3)} (small to moderate). The observed mean is ${absTStat.toFixed(1)} standard errors from ${testValue}. This relatively modest t-value suggests the difference is small or the variability is high.`);
    } else {
        insights.push(`<strong>T-statistic:</strong> t = ${tStat.toFixed(3)} (very small). The sample mean is less than one standard error away from the hypothesized value, indicating minimal departure. The data are very consistent with the null hypothesis.`);
    }
    
    // Cohen's d insight
    const absD = Math.abs(cohensD);
    if (absD < 0.2) {
        insights.push(`<strong>Effect Size (Cohen's d):</strong> d = ${cohensD.toFixed(3)} (negligible/very small effect). The difference between the sample mean and test value is less than 0.2 standard deviations. Even if statistically significant, this difference is too small to be practically meaningful in most contexts. Consider whether this tiny effect has any real-world importance.`);
    } else if (absD < 0.5) {
        insights.push(`<strong>Effect Size (Cohen's d):</strong> d = ${cohensD.toFixed(3)} (small effect). The sample mean differs from ${testValue} by approximately ${(absD * 100).toFixed(0)}% of a standard deviation. While statistically ${isSignificant ? 'significant' : 'not significant'}, this represents a subtle difference that may have limited practical impact.`);
    } else if (absD < 0.8) {
        insights.push(`<strong>Effect Size (Cohen's d):</strong> d = ${cohensD.toFixed(3)} (medium effect). The difference from the test value is about ${(absD * 100).toFixed(0)}% of a standard deviation. This is a moderate, noticeable effect that likely has practical significance. The ${cohensD > 0 ? 'sample mean exceeds' : 'sample mean falls below'} the hypothesized value by a meaningful amount.`);
    } else {
        insights.push(`<strong>Effect Size (Cohen's d):</strong> d = ${cohensD.toFixed(3)} (large effect). The sample mean differs from ${testValue} by ${(absD * 100).toFixed(0)}% of a standard deviation - a substantial and practically important difference. This large effect size indicates the observed difference is not only statistically significant but also highly meaningful in real-world terms.`);
    }
    
    // Confidence interval insight
    if (results.confidence_interval) {
        const [lower, upper] = results.confidence_interval;
        const ciWidth = upper - lower;
        const includesTestValue = lower <= testValue && testValue <= upper;
        
        if (includesTestValue) {
            insights.push(`<strong>Confidence Interval:</strong> 95% CI [${lower.toFixed(3)}, ${upper.toFixed(3)}] (width: ${ciWidth.toFixed(3)}). The interval contains the test value (${testValue}), which is consistent with the non-significant result. We can be 95% confident the true population mean lies within this range. ${ciWidth > Math.abs(sampleMean - testValue) * 2 ? 'The wide interval suggests substantial uncertainty.' : 'The relatively narrow interval provides good precision.'}`);
        } else {
            insights.push(`<strong>Confidence Interval:</strong> 95% CI [${lower.toFixed(3)}, ${upper.toFixed(3)}] (width: ${ciWidth.toFixed(3)}). The interval does not contain the test value (${testValue}), supporting the significant result. We can be 95% confident the true mean ${lower > testValue ? `exceeds ${testValue}` : `is less than ${testValue}`}. ${ciWidth < Math.abs(sampleMean - testValue) ? 'The narrow interval indicates good precision.' : 'Consider increasing sample size to narrow this interval.'}`);
        }
    }
    
    // Sample size and normality
    const n = results.n || 0;
    if (n < 15) {
        insights.push(`<strong>Sample Size:</strong> n = ${n} (small sample). With fewer than 15 observations, the t-test relies heavily on the normality assumption. ${results.normality_test ? (Object.values(results.normality_test)[0]?.assumption_met ? 'Fortunately, the Shapiro-Wilk test suggests the data are approximately normal.' : '⚠ Warning: The Shapiro-Wilk test indicates non-normality, which undermines the validity of the t-test with this small sample. Consider non-parametric alternatives (Wilcoxon signed-rank test) or collecting more data.') : 'Check for outliers and verify normality assumptions before trusting this result.'}`);
    } else if (n < 30) {
        insights.push(`<strong>Sample Size:</strong> n = ${n} (moderate sample). This sample size is adequate for the t-test when data are approximately normal. ${results.normality_test && !Object.values(results.normality_test)[0]?.assumption_met ? '⚠ However, the normality assumption is violated. With n < 30, consider non-parametric alternatives or transforming the data.' : 'The t-test is reasonably robust to minor deviations from normality at this sample size.'}`);
    } else {
        insights.push(`<strong>Sample Size:</strong> n = ${n} (good sample size). With 30+ observations, the Central Limit Theorem ensures the t-test is robust to moderate violations of normality. The test results are reliable even if the data are somewhat skewed or have outliers.`);
    }
    
    // Direction of effect
    const direction = sampleMean > testValue ? 'higher' : 'lower';
    const diff = Math.abs(sampleMean - testValue);
    insights.push(`<strong>Direction of Effect:</strong> The sample mean (${sampleMean.toFixed(3)}) is ${direction} than the test value (${testValue}) by ${diff.toFixed(3)} units. ${isSignificant ? `This ${direction === 'higher' ? 'increase' : 'decrease'} is statistically significant and ${absD >= 0.5 ? 'represents a meaningful departure' : 'may have limited practical importance'}.` : `While the mean is numerically ${direction}, this difference is within the range of random variation.`}`);
    
    // Recommendations
    let recommendations = '';
if (!isSignificant && pValue > 0.10) {
    recommendations = `
        <p class="mb-3">No significant difference found. Next steps:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
            <li><strong>Accept the null hypothesis</strong> - the data are consistent with ${variable} having a mean of ${testValue}</li>
            <li><strong>Check statistical power</strong> - a non-significant result with small n may indicate insufficient power to detect a true effect</li>
            <li><strong>Consider equivalence testing</strong> - if you want to prove the mean equals ${testValue} (rather than just failing to reject), use equivalence tests (TOST)</li>
            <li><strong>Examine practical equivalence</strong> - even if not statistically different, is the observed difference small enough to be unimportant?</li>
            <li><strong>Increase sample size</strong> - if you suspect a real effect, collect more data for adequate power</li>
            <li><strong>Check assumptions</strong> - verify your data meet t-test requirements (normality, no extreme outliers)</li>
        </ol>
    `;
} else if (!isSignificant && pValue <= 0.10) {
    recommendations = `
        <p class="mb-3">Marginally non-significant trend detected. Consider:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
            <li><strong>Collect more data</strong> - you may be underpowered to detect a real effect; a larger sample could push this to significance</li>
            <li><strong>Report as exploratory</strong> - acknowledge this as a suggestive trend requiring replication</li>
            <li><strong>Examine effect size</strong> - even without significance, Cohen's d = ${cohensD.toFixed(3)} may indicate ${absD >= 0.5 ? 'a meaningful effect worth investigating further' : 'a trivial effect not worth pursuing'}</li>
            <li><strong>Pre-register replication</strong> - avoid p-hacking by planning a confirmatory study with adequate power</li>
            <li><strong>Context matters</strong> - in exploratory research, p &lt; .10 may be acceptable; in confirmatory research, maintain strict α = .05</li>
        </ol>
    `;
} else if (isSignificant && absD < 0.2) {
    recommendations = `
        <p class="mb-3">Statistically significant but trivial effect size. Actions:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
            <li><strong>Question practical significance</strong> - Cohen's d = ${cohensD.toFixed(3)} suggests the effect is too small to matter in most real-world contexts</li>
            <li><strong>Consider ROPE analysis</strong> - define a Region of Practical Equivalence and test if the effect falls within it</li>
            <li><strong>Avoid over-interpretation</strong> - statistical significance with large n can detect meaningless differences</li>
            <li><strong>Report effect size prominently</strong> - emphasize that while significant, the effect is negligible</li>
            <li><strong>Check for confounds</strong> - could measurement error or bias be inflating the p-value?</li>
            <li><strong>Focus on CIs</strong> - examine whether the confidence interval includes practically important values</li>
        </ol>
    `;
} else if (isSignificant && absD >= 0.8) {
    recommendations = `
        <p class="mb-3">Strong, significant result with large effect. Next steps:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
            <li><strong>Replicate the finding</strong> - confirm this result with an independent sample to rule out Type I error or sampling anomalies</li>
            <li><strong>Examine practical implications</strong> - translate this statistical difference into real-world terms (e.g., cost savings, performance improvements)</li>
            <li><strong>Check for outliers</strong> - ensure the large effect is not driven by a few extreme values that inflate the mean</li>
            <li><strong>Report comprehensively</strong> - present p-value, effect size, and confidence interval for complete transparency</li>
            <li><strong>Consider mechanisms</strong> - investigate why ${variable} differs from ${testValue} - what causes this large deviation?</li>
            <li><strong>Assess generalizability</strong> - does this finding extend to other populations or contexts?</li>
        </ol>
    `;
} else {
    recommendations = `
        <p class="mb-3">Significant result with moderate effect. Recommendations:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
            <li><strong>Validate the finding</strong> - replicate with new data to confirm robustness</li>
            <li><strong>Assess practical importance</strong> - determine if this effect size (d = ${cohensD.toFixed(3)}) is meaningful for your specific application</li>
            <li><strong>Check assumptions</strong> - verify normality and look for influential outliers that could affect results</li>
            <li><strong>Narrow the CI</strong> - if precision is important, collect more data to reduce the confidence interval width</li>
            <li><strong>Contextualize the effect</strong> - compare this Cohen's d to benchmarks in your field</li>
            <li><strong>Explore moderators</strong> - investigate whether the effect varies across subgroups or conditions</li>
            <li><strong>Report transparently</strong> - present the full statistical picture including assumptions checks and effect sizes</li>
        </ol>
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
        if (absD < 0.2) return "Small effect";
        if (absD < 0.5) return "Medium effect";
        if (absD < 0.8) return "Large effect";
        return "Very large effect";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* T-Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                T-Statistic
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.t_statistic.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">Test Statistic</p>
                    </div>
                </CardContent>
            </Card>

            {/* P-value Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                P-value
                            </p>
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

            {/* Cohen's d Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Cohen's d
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.cohens_d.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.cohens_d)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Degrees of Freedom Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Degrees of Freedom
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.degrees_of_freedom.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            df
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with clean design
const TTestOverview = ({ activeTest, oneSampleVar, testValue, groupVar, valueVar, pairedVar1, pairedVar2, dataLength, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (activeTest === 'one-sample') {
            if (oneSampleVar && testValue !== '' && !isNaN(parseFloat(testValue))) {
                overview.push(`Testing if ${oneSampleVar} differs from ${testValue}`);
            } else {
                overview.push('Select a variable and enter a test value');
            }
        } else if (activeTest === 'independent-samples') {
            if (groupVar && valueVar) {
                overview.push(`Comparing ${valueVar} between groups in ${groupVar}`);
            } else {
                overview.push('Select both grouping and dependent variables');
            }
        } else if (activeTest === 'paired-samples') {
            if (pairedVar1 && pairedVar2 && pairedVar1 !== pairedVar2) {
                overview.push(`Comparing ${pairedVar1} vs ${pairedVar2} (paired)`);
            } else {
                overview.push('Select two different variables for comparison');
            }
        }

        // Sample size info with warnings
        if (dataLength < 5) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Very small - results unreliable)`);
        } else if (dataLength < 20) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Small - check normality)`);
        } else if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} observations (Good)`);
        }
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Missing value check
        if (data && data.length > 0) {
            let missingCount = 0;
            let totalCount = dataLength;
            let validCount = totalCount;
            
            if (activeTest === 'one-sample' && oneSampleVar) {
                missingCount = data.filter((row: any) => isMissing(row[oneSampleVar])).length;
                validCount = totalCount - missingCount;
            } else if (activeTest === 'independent-samples' && groupVar && valueVar) {
                missingCount = data.filter((row: any) => 
                    isMissing(row[groupVar]) || isMissing(row[valueVar])
                ).length;
                validCount = totalCount - missingCount;
            } else if (activeTest === 'paired-samples' && pairedVar1 && pairedVar2) {
                missingCount = data.filter((row: any) => 
                    isMissing(row[pairedVar1]) || isMissing(row[pairedVar2])
                ).length;
                validCount = totalCount - missingCount;
            }
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        // Test type info
        if (activeTest === 'one-sample') {
            overview.push('Test type: One-sample t-test (μ ≠ μ₀)');
        } else if (activeTest === 'independent-samples') {
            overview.push('Test type: Independent samples t-test');
        } else {
            overview.push('Test type: Paired samples t-test');
        }

        // Minimum sample requirements
        if (dataLength < 5) {
            overview.push('⚠ Minimum 5 observations recommended for t-tests');
        }

        return overview;
    }, [activeTest, oneSampleVar, testValue, groupVar, valueVar, pairedVar1, pairedVar2, dataLength, data]);

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

const OneSampleIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
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

const IndependentSamplesIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
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
                            One of the most common statistical tests for A/B testing and comparing outcomes between 
                            groups. For example, determining if a new drug results in different blood pressure levels 
                            compared to a placebo, or if two teaching methods produce different test scores.
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

const PairedSamplesIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Repeat className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Paired Samples T-Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare means of two related measurements
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Repeat className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Repeated Measures</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Same subjects measured twice under different conditions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Within-Subject</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Controls for individual differences between subjects
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Before/After</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Ideal for pre-test/post-test experimental designs
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
                            Used for within-subjects or repeated measures designs. By comparing measurements from 
                            the same subject, it controls for individual differences, making it more powerful than 
                            independent samples t-test when applicable. Perfect for pre/post intervention studies.
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
                                        <span><strong>Two variables:</strong> Related measurements</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Same subjects:</strong> Paired observations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 5 pairs</span>
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
                                        <span><strong>p-value:</strong> Significance of change</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Mean difference:</strong> Average change</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cohen's d:</strong> Effect size of change</span>
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

const OneSampleSetup = ({ numericHeaders, oneSampleVar, setOneSampleVar, testValue, setTestValue, oneSampleAlternative, setOneSampleAlternative }: any) => {
    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="oneSampleVar">Variable</Label>
                    <Select value={oneSampleVar} onValueChange={setOneSampleVar}>
                        <SelectTrigger id="oneSampleVar"><SelectValue placeholder="Select a numeric variable..." /></SelectTrigger>
                        <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="testValue">Test Value (μ₀)</Label>
                    <Input id="testValue" type="number" value={testValue} onChange={e => setTestValue(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="oneSampleAlternative">Alternative Hypothesis</Label>
                    <Select value={oneSampleAlternative} onValueChange={setOneSampleAlternative}>
                        <SelectTrigger id="oneSampleAlternative"><SelectValue /></SelectTrigger>
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

const IndependentSamplesSetup = ({ numericHeaders, categoricalHeaders, data, groupVar, setGroupVar, valueVar, setValueVar, independentSampleAlternative, setIndependentSampleAlternative }: any) => {
    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter((h: string) => new Set(data.map((row: any) => row[h]).filter((v: any) => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    if (binaryCategoricalHeaders.length === 0) {
        return <p className="text-destructive-foreground bg-destructive p-3 rounded-md">This test requires a categorical variable with exactly two groups. None found.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="groupVar">Grouping Variable</Label>
                    <Select value={groupVar} onValueChange={setGroupVar}>
                        <SelectTrigger id="groupVar"><SelectValue /></SelectTrigger>
                        <SelectContent>{binaryCategoricalHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="valueVar">Dependent Variable</Label>
                    <Select value={valueVar} onValueChange={setValueVar}>
                        <SelectTrigger id="valueVar"><SelectValue /></SelectTrigger>
                        <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="independentSampleAlternative">Alternative Hypothesis</Label>
                    <Select value={independentSampleAlternative} onValueChange={setIndependentSampleAlternative}>
                        <SelectTrigger id="independentSampleAlternative"><SelectValue /></SelectTrigger>
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

const PairedSamplesSetup = ({ numericHeaders, pairedVar1, setPairedVar1, pairedVar2, setPairedVar2, pairedSampleAlternative, setPairedSampleAlternative }: any) => {
    const availablePairedVar2 = numericHeaders.filter((h: string) => h !== pairedVar1);
    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="pairedVar1">Variable 1 (e.g., Pre-test)</Label>
                    <Select value={pairedVar1} onValueChange={setPairedVar1}>
                        <SelectTrigger id="pairedVar1"><SelectValue /></SelectTrigger>
                        <SelectContent>{numericHeaders.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="pairedVar2">Variable 2 (e.g., Post-test)</Label>
                    <Select value={pairedVar2} onValueChange={setPairedVar2} disabled={!pairedVar1}>
                        <SelectTrigger id="pairedVar2"><SelectValue /></SelectTrigger>
                        <SelectContent>{availablePairedVar2.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="pairedSampleAlternative">Alternative Hypothesis</Label>
                    <Select value={pairedSampleAlternative} onValueChange={setPairedSampleAlternative}>
                        <SelectTrigger id="pairedSampleAlternative"><SelectValue /></SelectTrigger>
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

interface TTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string;
}

export default function TTestPage({ data, numericHeaders, categoricalHeaders, onLoadExample, activeAnalysis }: TTestPageProps) {
    const { toast } = useToast();
    const [activeTest, setActiveTest] = useState(activeAnalysis.replace('t-test-', ''));
    
    // One-Sample State
    const [oneSampleVar, setOneSampleVar] = useState(numericHeaders[0]);
    const [testValue, setTestValue] = useState('0');
    const [oneSampleAlternative, setOneSampleAlternative] = useState('two-sided');

    // Independent Samples State
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [valueVar, setValueVar] = useState<string | undefined>();
    const [independentSampleAlternative, setIndependentSampleAlternative] = useState('two-sided');

    // Paired Samples State
    const [pairedVar1, setPairedVar1] = useState(numericHeaders[0]);
    const [pairedVar2, setPairedVar2] = useState(numericHeaders[1]);
    const [pairedSampleAlternative, setPairedSampleAlternative] = useState('two-sided');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0;
    }, [data, numericHeaders]);

    useEffect(() => {
        setActiveTest(activeAnalysis.replace('t-test-', ''));
        setView(canRun ? 'main' : 'intro');
        setAnalysisResult(null);

        // Set defaults when data changes
        const binaryHeaders = categoricalHeaders.filter(h => new Set(data.map(row => row[h])).size === 2);
        setGroupVar(binaryHeaders[0]);
        setValueVar(numericHeaders[0]);
        setOneSampleVar(numericHeaders[0]);
        setPairedVar1(numericHeaders[0]);
        setPairedVar2(numericHeaders[1]);

    }, [data, activeAnalysis, numericHeaders, categoricalHeaders, canRun]);
    
    const handleAnalysis = useCallback(async () => {
        let params;
        let testType;

        switch (activeTest) {
            case 'one-sample':
                if (!oneSampleVar || testValue === '') {
                    toast({ variant: 'destructive', title: 'Please select a variable and enter a test value.' });
                    return;
                }
                params = { variable: oneSampleVar, test_value: parseFloat(testValue), alternative: oneSampleAlternative };
                testType = 'one_sample';
                break;
            case 'independent-samples':
                if (!groupVar || !valueVar) {
                    toast({ variant: 'destructive', title: 'Please select group and value variables.' });
                    return;
                }
                params = { variable: valueVar, group_variable: groupVar, alternative: independentSampleAlternative };
                testType = 'independent_samples';
                break;
            case 'paired-samples':
                 if (!pairedVar1 || !pairedVar2 || pairedVar1 === pairedVar2) {
                    toast({ variant: 'destructive', title: 'Please select two different variables.' });
                    return;
                }
                params = { variable1: pairedVar1, variable2: pairedVar2, alternative: pairedSampleAlternative };
                testType = 'paired_samples';
                break;
            default:
                toast({ variant: 'destructive', title: 'Invalid test type selected.' });
                return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/t-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType, params })
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
    }, [activeTest, data, oneSampleVar, testValue, oneSampleAlternative, groupVar, valueVar, independentSampleAlternative, pairedVar1, pairedVar2, pairedSampleAlternative, toast]);

    const introPages: { [key: string]: React.FC<any> } = {
        'one-sample': OneSampleIntroPage,
        'independent-samples': IndependentSamplesIntroPage,
        'paired-samples': PairedSamplesIntroPage,
    };
    const IntroComponent = introPages[activeTest];

    if (!canRun || view === 'intro') {
        return <IntroComponent onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">{activeTest.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} T-Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activeTest === 'one-sample' && <OneSampleSetup {...{ numericHeaders, oneSampleVar, setOneSampleVar, testValue, setTestValue, oneSampleAlternative, setOneSampleAlternative }} />}
                    {activeTest === 'independent-samples' && <IndependentSamplesSetup {...{ numericHeaders, categoricalHeaders, data, groupVar, setGroupVar, valueVar, setValueVar, independentSampleAlternative, setIndependentSampleAlternative }} />}
                    {activeTest === 'paired-samples' && <PairedSamplesSetup {...{ numericHeaders, pairedVar1, setPairedVar1, pairedVar2, setPairedVar2, pairedSampleAlternative, setPairedSampleAlternative }} />}
                    
                    {/* Overview component */}
                    <TTestOverview 
                        activeTest={activeTest}
                        oneSampleVar={oneSampleVar}
                        testValue={testValue}
                        groupVar={groupVar}
                        valueVar={valueVar}
                        pairedVar1={pairedVar1}
                        pairedVar2={pairedVar2}
                        dataLength={data.length}
                        data={data}
                    />
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2 h-4 w-4"/>Run Test</>}
                    </Button>
                </CardFooter>
            </Card>
            
            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

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

                    {/* Interpretation */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={results.significant ? 'default' : 'destructive'}>
                                {results.significant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertTitle>
                                    {results.significant ? 'Statistically Significant Result' : 'Not Statistically Significant'}
                                </AlertTitle>
                                <AlertDescription className="whitespace-pre-line mt-2">
                                    {results.interpretation.replace(/\*\*/g, '')}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis - ONE-SAMPLE T-TEST */}
                    {results.test_type === 'one_sample' && activeTest === 'one-sample' && (() => {
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
                                    {/* Overall Analysis */}
                                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-primary/10 rounded-md">
                                                <BarChart className="h-4 w-4 text-primary" />
                                            </div>
                                            <h3 className="font-semibold text-base">Overall Analysis</h3>
                                        </div>
                                        <div 
                                            className="text-sm text-foreground/80 leading-relaxed"
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
                                            {Object.values(results.descriptives)[0]?.se_mean !== undefined && (
                                                <TableHead className="text-right">SE Mean</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.descriptives).filter(([key]) => key !== 'differences').map(([group, stats]) => (
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
                            {results.test_type === 'independent_samples' && results.student_t && results.welch_t ? (
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
                            ) : results.test_type === 'one_sample' ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
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
                                            <TableCell className="font-medium">Value</TableCell>
                                            {results.sample_mean !== undefined && <TableCell className="font-mono text-right">{results.sample_mean.toFixed(4)}</TableCell>}
                                            {results.test_value !== undefined && <TableCell className="font-mono text-right">{results.test_value.toFixed(4)}</TableCell>}
                                            {results.se_diff !== undefined && <TableCell className="font-mono text-right">{results.se_diff.toFixed(4)}</TableCell>}
                                            <TableCell className="font-mono text-right">{results.t_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono text-right">{results.degrees_of_freedom.toFixed(0)}</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="font-mono text-right">{results.cohens_d.toFixed(3)}</TableCell>
                                            {results.confidence_interval && <TableCell className="font-mono text-right">
                                                [{results.confidence_interval[0].toFixed(3)}, {results.confidence_interval[1].toFixed(3)}]
                                            </TableCell>}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            ) : results.test_type === 'paired_samples' ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            {results.mean_diff !== undefined && <TableHead className="text-right">Mean Diff</TableHead>}
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
                                            <TableCell className="font-medium">Value</TableCell>
                                            {results.mean_diff !== undefined && <TableCell className="font-mono text-right">{results.mean_diff.toFixed(4)}</TableCell>}
                                            {results.se_diff !== undefined && <TableCell className="font-mono text-right">{results.se_diff.toFixed(4)}</TableCell>}
                                            <TableCell className="font-mono text-right">{results.t_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono text-right">{results.degrees_of_freedom.toFixed(0)}</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="font-mono text-right">{results.cohens_d.toFixed(3)}</TableCell>
                                            {results.confidence_interval && <TableCell className="font-mono text-right">
                                                [{results.confidence_interval[0].toFixed(3)}, {results.confidence_interval[1].toFixed(3)}]
                                            </TableCell>}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* Assumption Checks */}
                    {(results.test_type === 'independent_samples' || results.test_type === 'one_sample' || results.test_type === 'paired_samples') && (
                        (results.normality_test || results.levene_test) && (
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
                                                        <TableHead>Group/Variable</TableHead>
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
                        )
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