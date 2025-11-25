'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, HelpCircle, CheckCircle, AlertTriangle, TrendingUp, Target, Layers, BookOpen, BarChart3, Users, Activity, Info, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WilcoxonResults {
    statistic: number;
    p_value: number;
    effect_size: number;
    z_score?: number;
    effect_size_interpretation?: {
        text: string;
        magnitude: string;
    };
    W_plus?: number;
    W_minus?: number;
    n?: number;
    n_valid?: number;
    interpretation?: string | {
        decision?: string;
        conclusion?: string;
    };
    descriptive_stats?: {
        [key: string]: {
            n: number;
            mean: number;
            median: number;
            std: number;
        };
    };
}

interface FullAnalysisResponse {
    results: WilcoxonResults;
    plot?: string;
    interpretations?: {
        overall_analysis: string;
        statistical_insights: string[];
        recommendations: string;
    };
    n_dropped?: number;
    dropped_rows?: number[];
}

interface WilcoxonPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

// Generate interpretations
const generateWilcoxonInterpretations = (results: WilcoxonResults, var1: string, var2: string) => {
    const insights: string[] = [];
    
    const isSignificant = results.p_value < 0.05;
    const absEffectSize = Math.abs(results.effect_size);
    
    // Get sample size
    const n = results.n || results.n_valid || 0;
    
    // Overall analysis
    let overall = '';
    if (isSignificant) {
        if (absEffectSize >= 0.5) {
            overall = `<strong>Highly significant difference with large effect.</strong> The Wilcoxon Signed-Rank test revealed a statistically significant difference (W = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) between ${var1} and ${var2}. With an effect size of r = ${results.effect_size.toFixed(3)} (large), this represents a substantial and meaningful difference between the paired measurements.`;
        } else if (absEffectSize >= 0.3) {
            overall = `<strong>Significant difference with moderate effect.</strong> The Wilcoxon Signed-Rank test detected a statistically significant difference (W = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) between paired measurements. The effect size of r = ${results.effect_size.toFixed(3)} indicates a moderate, practically meaningful difference.`;
        } else {
            overall = `<strong>Statistically significant but small effect.</strong> While the Wilcoxon Signed-Rank test identified a statistically significant difference (W = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}), the small effect size (r = ${results.effect_size.toFixed(3)}) suggests the practical difference between paired measurements may be limited.`;
        }
    } else {
        overall = `<strong>No significant difference detected.</strong> The Wilcoxon Signed-Rank test found no statistically significant difference (W = ${results.statistic.toFixed(1)}, p = ${results.p_value.toFixed(3)}) between ${var1} and ${var2}. The paired measurements appear similar, though this could also reflect insufficient statistical power with the current sample size.`;
    }
    
    // W statistic insight
    insights.push(`<strong>W-Statistic:</strong> W = ${results.statistic.toFixed(1)}. This non-parametric test statistic is based on the ranks of absolute differences between pairs. ${results.p_value < 0.05 ? 'The observed rank sum is unlikely to have occurred by chance.' : 'The rank sum difference is not statistically significant.'}`);
    
    // P-value insight
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-value:</strong> p < 0.001 (highly significant). There is very strong evidence against the null hypothesis of no difference. The probability of observing this difference by chance alone is less than 0.1%.`);
    } else if (results.p_value < 0.01) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (highly significant at α = 0.01). Strong evidence of a true difference between the paired measurements.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (significant at α = 0.05). Evidence suggests a real difference exists between the paired observations.`);
    } else if (results.p_value < 0.10) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (marginally significant). Weak evidence of a difference. Consider collecting more data or examining contextual factors.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (not significant). No statistical evidence of a difference between paired measurements at conventional significance levels.`);
    }
    
    // Effect size insight
    if (absEffectSize >= 0.5) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (large effect). This substantial effect size indicates a meaningful real-world difference between the paired measurements. The change represents a strong practical significance.`);
    } else if (absEffectSize >= 0.3) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (medium effect). This moderate effect size suggests a noticeable, practically relevant difference between the paired observations.`);
    } else if (absEffectSize >= 0.1) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (small effect). While statistically detectable${isSignificant ? '' : ' if significant'}, the practical importance may be limited. Consider whether this difference matters in your context.`);
    } else {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (negligible effect). The difference between paired measurements is very small. Even if statistically significant, it may not be practically meaningful.`);
    }
    
    // Z-score insight (if available)
    if (results.z_score !== undefined && results.z_score !== null) {
        insights.push(`<strong>Z-Score:</strong> Z = ${results.z_score.toFixed(3)}. This standardized statistic helps assess the magnitude of the difference. ${Math.abs(results.z_score) > 2.576 ? 'A very large Z-score indicates a highly significant result.' : Math.abs(results.z_score) > 1.96 ? 'A moderate Z-score suggests a significant result at the 0.05 level.' : 'A small Z-score suggests the difference is not statistically significant.'}`);
    }
    
    // Directional information (if W+ and W- available)
    if (results.W_plus !== undefined && results.W_minus !== undefined) {
        const direction = results.W_plus > results.W_minus ? 'increase' : 'decrease';
        const dominant = results.W_plus > results.W_minus ? results.W_plus : results.W_minus;
        const subordinate = results.W_plus > results.W_minus ? results.W_minus : results.W_plus;
        insights.push(`<strong>Direction of Change:</strong> W+ = ${results.W_plus.toFixed(1)}, W- = ${results.W_minus.toFixed(1)}. The data shows a predominant ${direction} from ${var1} to ${var2}, with the dominant rank sum (${dominant.toFixed(1)}) being ${(dominant / (dominant + subordinate) * 100).toFixed(1)}% of the total ranks.`);
    }
    
    // Sample size considerations
    if (n < 10) {
        insights.push(`<strong>Sample Size Warning:</strong> Only ${n} paired observations were analyzed. With such a small sample, statistical power is very limited. Results should be interpreted with caution, and collecting more data is strongly recommended.`);
    } else if (n < 20) {
        insights.push(`<strong>Sample Size:</strong> ${n} paired observations were analyzed. While adequate for the Wilcoxon test, a larger sample would provide more precise estimates and better power to detect small effects.`);
    } else if (n < 30) {
        insights.push(`<strong>Sample Size:</strong> ${n} paired observations provide moderate statistical power. The test is reasonably reliable, though larger samples would increase confidence in the results.`);
    } else {
        insights.push(`<strong>Sample Size:</strong> Well-powered analysis with ${n} paired observations. This provides good confidence in the results and ability to detect meaningful differences.`);
    }
    
    // Descriptive statistics insight
    if (results.descriptive_stats) {
        const vars = Object.keys(results.descriptive_stats);
        if (vars.length === 2) {
            const stats1 = results.descriptive_stats[vars[0]];
            const stats2 = results.descriptive_stats[vars[1]];
            const medianDiff = Math.abs(stats2.median - stats1.median);
            const meanDiff = Math.abs(stats2.mean - stats1.mean);
            const direction = stats2.median > stats1.median ? 'increase' : 'decrease';
            
            insights.push(`<strong>Descriptive Summary:</strong> ${vars[0]} (median = ${stats1.median.toFixed(2)}) vs ${vars[1]} (median = ${stats2.median.toFixed(2)}) shows a ${direction} of ${medianDiff.toFixed(2)} units (median difference). The mean difference is ${meanDiff.toFixed(2)} units, suggesting ${medianDiff > meanDiff ? 'some asymmetry in the distribution of differences' : 'relatively symmetric differences'}.`);
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (!isSignificant && absEffectSize < 0.2) {
        recommendations = 'No meaningful difference detected between paired measurements. Consider: (1) The measurements may genuinely be similar - no real change occurred, (2) Increase sample size to detect smaller effects if they exist, (3) Check for measurement errors or inconsistencies in data collection, (4) Examine whether the pairing is appropriate - are observations truly related?, (5) Look for subgroups where effects might be present but masked in the overall analysis, (6) Consider that lack of significance doesn\'t prove no difference exists - it may reflect insufficient power, (7) Evaluate if the timing or conditions of measurements were appropriate to capture expected changes.';
    } else if (isSignificant && absEffectSize < 0.3) {
        recommendations = 'Statistically significant but small effect detected. Actions: (1) Assess practical significance - does this magnitude of change matter in your domain?, (2) Examine the distribution of differences - are there outliers or unusual patterns?, (3) Consider if the effect might be larger or more consistent in specific subgroups, (4) Replicate findings with independent paired samples to confirm the effect, (5) Investigate what drives the difference - look for mediating factors or confounds, (6) For decision-making, weigh statistical significance against practical importance and implementation costs, (7) Document the baseline variability to understand if the change is meaningful relative to typical fluctuation.';
    } else if (!isSignificant && absEffectSize >= 0.3) {
        recommendations = 'Large effect size but not statistically significant - likely a power issue. Recommendations: (1) Collect more paired observations to increase statistical power, (2) The effect may be real but your sample size is too small to detect it reliably, (3) Check for high variability in the differences that might be masking a consistent effect, (4) Look for and address outliers that may be inflating variance, (5) Consider if measurement error is excessive - can you improve measurement precision?, (6) Run a post-hoc power analysis to determine needed sample size for future studies, (7) Examine if the effect is present in some pairs but not others - heterogeneity of response.';
    } else {
        recommendations = 'Significant difference with meaningful effect size detected between paired measurements. Next steps: (1) Examine the practical implications of this change in your specific context, (2) Investigate what factors drive the difference - conduct follow-up analyses or qualitative investigations, (3) Check robustness by examining different subsets or time periods if applicable, (4) Look at individual differences - are some pairs showing much larger changes than others?, (5) Consider validation with an independent paired sample if available, (6) For causal claims about interventions, ensure measurements were taken under comparable conditions and rule out confounds, (7) Communicate findings with appropriate context about the magnitude of change, not just p-values, (8) If this represents a treatment effect, examine whether the effect is clinically or practically meaningful for decision-making.';
    }
    
    return {
        overall_analysis: overall,
        statistical_insights: insights,
        recommendations: recommendations
    };
};

const IntroPage = ({ onStart, onLoadExample }: { 
    onStart: () => void, 
    onLoadExample: (example: ExampleDataSet) => void 
}) => {
    const wilcoxonExample = exampleDatasets.find(d => d.analysisTypes?.includes('wilcoxon'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <FlaskConical className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Wilcoxon Signed-Rank Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Non-parametric test for comparing two related samples or paired observations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Paired Samples</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Compares two related measurements from the same subjects (e.g., before/after)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Rank-Based Test</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Uses ranks of differences, making it robust to non-normal distributions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Effect Size (r)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Provides effect size to measure the magnitude of the difference
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
                            Use the Wilcoxon Signed-Rank Test when you want to compare two related samples (like pre-test 
                            and post-test scores from the same individuals) but your data doesn't meet the normality assumption 
                            required for a paired t-test. It's ideal for ordinal data, skewed distributions, or when you have 
                            outliers. Common examples include comparing patient symptoms before and after treatment, or test 
                            scores before and after training.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Paired data:</strong> Two related measurements per subject</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variables:</strong> Both continuous or ordinal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Dependency:</strong> Observations are dependent within pairs</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>W-statistic:</strong> Sum of ranks for positive/negative differences</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p-value:</strong> Significance level (p &lt; 0.05 indicates differences)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>r:</strong> Effect size (0.1=small, 0.3=medium, 0.5=large)</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {wilcoxonExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(wilcoxonExample)} size="lg">
                                {wilcoxonExample.icon && <wilcoxonExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: WilcoxonResults }) => {
    const isSignificant = results.p_value < 0.05;
    
    const getEffectSizeInterpretation = (r: number) => {
        const absR = Math.abs(r);
        if (absR < 0.01) return "Negligible effect";
        if (absR < 0.3) return "Small effect";
        if (absR < 0.5) return "Medium effect";
        return "Large effect";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* W-Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                W-Statistic
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.statistic != null ? results.statistic.toFixed(1) : 'N/A'}
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
                        <p className={`text-2xl font-semibold ${results.p_value != null && !isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {results.p_value != null 
                                ? (results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4))
                                : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.p_value != null 
                                ? (isSignificant ? 'Significant' : 'Not Significant')
                                : 'Not available'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Effect Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Effect Size (r)
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.effect_size != null ? results.effect_size.toFixed(3) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.effect_size != null ? getEffectSizeInterpretation(results.effect_size) : 'Not available'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Z-Score / Sample Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                {results.z_score != null ? 'Z-Score' : 'Sample Size'}
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.z_score != null 
                                ? results.z_score.toFixed(3) 
                                : (results.n || results.n_valid || 'N/A')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.z_score != null 
                                ? 'Standardized statistic' 
                                : 'Paired observations'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with missing value check
const WilcoxonOverview = ({ var1, var2, dataLength, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Variable selection status
        if (var1 && var2) {
            if (var1 === var2) {
                overview.push('⚠ Selected variables must be different');
            } else {
                overview.push(`Comparing paired samples: ${var1} vs ${var2}`);
            }
        } else {
            overview.push('Select two different numeric variables for comparison');
        }

        // Missing value check
        if (data && data.length > 0 && var1 && var2) {
            const missingCount = data.filter((row: any) => 
                isMissing(row[var1]) || isMissing(row[var2])
            ).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid pairs)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }

        // Sample size
        if (dataLength < 10) {
            overview.push(`Sample size: ${dataLength} pairs (⚠ Very small - results unreliable)`);
        } else if (dataLength < 20) {
            overview.push(`Sample size: ${dataLength} pairs (⚠ Small - check assumptions)`);
        } else if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} pairs (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} pairs (Good)`);
        }
        
        // Test info
        overview.push('Test type: Wilcoxon Signed-Rank test');
        overview.push('Non-parametric alternative to paired t-test');

        return overview;
    }, [var1, var2, dataLength, data]);

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

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

export default function WilcoxonPage({ data, numericHeaders, onLoadExample }: WilcoxonPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [var1, setVar1] = useState(numericHeaders[0]);
    const [var2, setVar2] = useState(numericHeaders[1]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        setVar1(numericHeaders[0]);
        setVar2(numericHeaders[1]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders, data, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!var1 || !var2 || var1 === var2) {
            toast({ variant: "destructive", title: "Selection Error", description: "Please select two different variables." });
            return;
        }
        const params = { var1, var2 };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'wilcoxon', params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateWilcoxonInterpretations(result.results, var1, var2);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
            toast({ title: 'Wilcoxon Test Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, var1, var2, toast]);

    const handleLoadExampleData = () => {
        const wilcoxonExample = exampleDatasets.find(ex => ex.analysisTypes?.includes('wilcoxon'));
        if (wilcoxonExample) {
            onLoadExample(wilcoxonExample);
        }
    };

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }

    const results = analysisResult?.results;
    const isSignificant = results?.p_value && results.p_value < 0.05;
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Wilcoxon Signed-Rank Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Select two numeric variables representing paired measurements.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="var1">Variable 1 (e.g., Pre-test)</Label>
                            <Select value={var1} onValueChange={setVar1}>
                                <SelectTrigger id="var1">
                                    <SelectValue placeholder="Select first variable..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="var2">Variable 2 (e.g., Post-test)</Label>
                            <Select value={var2} onValueChange={setVar2}>
                                <SelectTrigger id="var2">
                                    <SelectValue placeholder="Select second variable..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.filter(h => h !== var1).map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <WilcoxonOverview 
                        var1={var1}
                        var2={var2}
                        dataLength={data.length}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sigma className="mr-2 h-4 w-4"/>
                                Run Analysis
                            </>
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

            {results && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Data Quality Information */}
                    {analysisResult.n_dropped !== undefined && analysisResult.n_dropped > 0 && (
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
                                            {analysisResult.n_dropped} row{analysisResult.n_dropped > 1 ? 's were' : ' was'} excluded from the analysis due to missing values.
                                        </p>
                                        {analysisResult.dropped_rows && analysisResult.dropped_rows.length > 0 && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer font-medium text-sm hover:underline">
                                                    View excluded row indices (0-based)
                                                </summary>
                                                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs font-mono">
                                                    {analysisResult.dropped_rows.length <= 20 
                                                        ? analysisResult.dropped_rows.join(', ')
                                                        : `${analysisResult.dropped_rows.slice(0, 20).join(', ')} ... and ${analysisResult.dropped_rows.length - 20} more`
                                                    }
                                                </div>
                                            </details>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Overall Wilcoxon Signed-Rank test results and significance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={isSignificant ? 'default' : 'destructive'}>
                                {isSignificant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertDescription>
                                    {isSignificant
                                        ? 'Wilcoxon Signed-Rank test results show a statistically significant difference between the paired measurements. The rank-based test indicates that the distributions of the differences differ significantly from zero.'
                                        : 'Wilcoxon Signed-Rank test results do not show a statistically significant difference between the paired measurements. The observed differences in ranks could be due to random variation.'
                                    }
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Sigma className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis */}
                            {analysisResult.interpretations?.overall_analysis && (
                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-primary/10 rounded-md">
                                            {isSignificant ? 
                                                <CheckCircle className="h-4 w-4 text-primary" /> : 
                                                <AlertTriangle className="h-4 w-4 text-primary" />
                                            }
                                        </div>
                                        <h3 className="font-semibold text-base">
                                            {isSignificant ? 'Statistically Significant Result' : 'Not Statistically Significant'}
                                        </h3>
                                    </div>
                                    <div 
                                        className="text-sm text-foreground/80 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: analysisResult.interpretations.overall_analysis.replace(/\*\*/g, '<strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>') }}
                                    />
                                </div>
                            )}

                            {/* Key Insights */}
                            {analysisResult.interpretations?.statistical_insights && analysisResult.interpretations.statistical_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Key Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.statistical_insights.map((insight: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*/g, '<strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>') }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Recommendations */}
                            {analysisResult.interpretations?.recommendations && (
                                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-amber-500/10 rounded-md">
                                            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Recommendations</h3>
                                    </div>
                                    <div className="text-sm text-foreground/80 leading-relaxed">
                                        {analysisResult.interpretations.recommendations.split(/\(\d+\)/).filter(Boolean).map((rec: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-3 mb-3 last:mb-0">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>{rec.trim()}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Descriptive Statistics */}
                    {results.descriptive_stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Descriptive Statistics</CardTitle>
                                <CardDescription>Summary statistics for paired measurements</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Median</TableHead>
                                            <TableHead className="text-right">Std. Dev</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.descriptive_stats).map(([variable, stats]: [string, any]) => (
                                            <TableRow key={variable}>
                                                <TableCell className="font-medium">{variable}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.n || 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean != null ? stats.mean.toFixed(3) : 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.median != null ? stats.median.toFixed(3) : 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.std != null ? stats.std.toFixed(3) : 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Visualization */}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Visualization</CardTitle>
                                <CardDescription>Distribution of paired differences</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Wilcoxon Test Visualization" 
                                    width={1500} 
                                    height={1200} 
                                    className="w-full rounded-sm border" 
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Wilcoxon Test Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Wilcoxon Signed-Rank Test Results</CardTitle>
                            <CardDescription>Complete test statistics and effect size measures</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>W-Statistic</TableHead>
                                            <TableHead>P-value</TableHead>
                                            {results.z_score !== undefined && results.z_score !== null && (
                                                <TableHead>Z-Score</TableHead>
                                            )}
                                            <TableHead>Effect Size (r)</TableHead>
                                            {results.effect_size_interpretation && (
                                                <TableHead>Effect Magnitude</TableHead>
                                            )}
                                            {results.W_plus !== undefined && results.W_plus !== null && (
                                                <TableHead>W+ (Positive)</TableHead>
                                            )}
                                            {results.W_minus !== undefined && results.W_minus !== null && (
                                                <TableHead>W- (Negative)</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono">
                                                {results.statistic != null ? results.statistic.toFixed(1) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                {results.p_value != null ? (results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)) : 'N/A'}
                                                {getSignificanceStars(results.p_value)}
                                            </TableCell>
                                            {results.z_score !== undefined && results.z_score !== null && (
                                                <TableCell className="font-mono">{results.z_score.toFixed(3)}</TableCell>
                                            )}
                                            <TableCell className="font-mono">
                                                {results.effect_size != null ? results.effect_size.toFixed(3) : 'N/A'}
                                            </TableCell>
                                            {results.effect_size_interpretation && (
                                                <TableCell>
                                                    <Badge variant={results.effect_size_interpretation?.magnitude === 'Large' ? 'default' : 'secondary'}>
                                                        {results.effect_size_interpretation?.text || 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                            )}
                                            {results.W_plus !== undefined && results.W_plus !== null && (
                                                <TableCell className="font-mono">{results.W_plus.toFixed(1)}</TableCell>
                                            )}
                                            {results.W_minus !== undefined && results.W_minus !== null && (
                                                <TableCell className="font-mono">{results.W_minus.toFixed(1)}</TableCell>
                                            )}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <p className='text-sm text-muted-foreground'>
                                Effect size r = Z / √N | Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Analysis' to perform Wilcoxon Signed-Rank test.</p>
                </div>
            )}
        </div>
    );
}
