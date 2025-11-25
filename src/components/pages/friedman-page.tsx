'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, HelpCircle, CheckCircle, AlertTriangle, TrendingUp, Target, Layers, BookOpen, RefreshCw, Activity, Clock, Info, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FriedmanResults {
    statistic: number;
    p_value: number;
    effect_size: number;
    df: number;
    effect_size_interpretation?: {
        text: string;
        level?: string;
    };
    interpretation?: string | {
        decision?: string;
        conclusion?: string;
    };
    condition_stats?: {
        [key: string]: {
            count: number;
            mean: number;
            median: number;
            std: number;
            min?: number;
            max?: number;
        };
    };
}

interface FullAnalysisResponse {
    results: FriedmanResults;
    plot?: string;
    interpretations?: {
        overall_analysis: string;
        statistical_insights: string[];
        recommendations: string;
    };
    n_dropped?: number;
    dropped_rows?: number[];
}

interface FriedmanPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

// Generate interpretations
const generateFriedmanInterpretations = (results: FriedmanResults, selectedVars: string[]) => {
    const insights: string[] = [];
    
    const isSignificant = results.p_value < 0.05;
    const kendallW = results.effect_size;
    const numConditions = selectedVars.length;
    
    // Get condition information
    const conditionNames = results.condition_stats ? Object.keys(results.condition_stats) : [];
    const conditionStats = results.condition_stats ? Object.values(results.condition_stats) : [];
    
    // Overall analysis
    let overall = '';
    if (isSignificant) {
        if (kendallW >= 0.7) {
            overall = `<strong>Highly significant differences with very strong concordance.</strong> The Friedman test revealed statistically significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) across the ${numConditions} repeated conditions. With Kendall's W = ${results.effect_size.toFixed(3)} (very strong agreement), this represents substantial and consistent differences in how subjects responded across conditions.`;
        } else if (kendallW >= 0.5) {
            overall = `<strong>Significant differences with strong concordance.</strong> The Friedman test detected statistically significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) across conditions. Kendall's W = ${results.effect_size.toFixed(3)} indicates strong, meaningful concordance in how subjects ranked the conditions.`;
        } else if (kendallW >= 0.3) {
            overall = `<strong>Significant differences with moderate concordance.</strong> The Friedman test identified statistically significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) across the ${numConditions} conditions. The moderate Kendall's W = ${results.effect_size.toFixed(3)} suggests noticeable but not overwhelming agreement in rankings.`;
        } else {
            overall = `<strong>Statistically significant but weak concordance.</strong> While the Friedman test found statistically significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}), the weak Kendall's W = ${results.effect_size.toFixed(3)} suggests limited practical agreement in how subjects ranked conditions.`;
        }
    } else {
        overall = `<strong>No significant differences detected.</strong> The Friedman test found no statistically significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p = ${results.p_value.toFixed(3)}) across the ${numConditions} repeated conditions. Subjects' responses appear similar across conditions, though this could also reflect insufficient statistical power.`;
    }
    
    // Chi-squared statistic insight
    insights.push(`<strong>χ² Statistic:</strong> χ² = ${results.statistic.toFixed(3)}. This chi-squared distributed test statistic is based on comparing the ranks that each subject assigned to the ${numConditions} conditions. ${results.p_value < 0.05 ? 'The observed differences in within-subject rankings are unlikely to have occurred by chance.' : 'The differences in within-subject rankings are not statistically significant.'}`);
    
    // P-value insight
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-value:</strong> p < 0.001 (highly significant). There is very strong evidence against the null hypothesis that all conditions have the same distribution. The probability of observing these ranking differences by chance alone is less than 0.1%.`);
    } else if (results.p_value < 0.01) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (highly significant at α = 0.01). Strong evidence that at least one condition differs from the others in how subjects ranked it.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (significant at α = 0.05). Evidence suggests real differences exist among the repeated conditions.`);
    } else if (results.p_value < 0.10) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (marginally significant). Weak evidence of differences. Consider collecting more data or examining contextual factors.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (not significant). No statistical evidence of differences among the repeated conditions at conventional significance levels.`);
    }
    
    // Kendall's W insight
    if (kendallW >= 0.7) {
        insights.push(`<strong>Kendall's W (Concordance):</strong> W = ${results.effect_size.toFixed(3)} (very strong agreement). This indicates very high concordance in how subjects ranked the conditions. There's substantial consistency in the pattern of responses across subjects, suggesting a reliable and meaningful effect.`);
    } else if (kendallW >= 0.5) {
        insights.push(`<strong>Kendall's W (Concordance):</strong> W = ${results.effect_size.toFixed(3)} (strong agreement). This indicates strong concordance in rankings across subjects. The conditions are being evaluated consistently, showing a clear and reliable pattern.`);
    } else if (kendallW >= 0.3) {
        insights.push(`<strong>Kendall's W (Concordance):</strong> W = ${results.effect_size.toFixed(3)} (moderate agreement). This indicates moderate concordance in how subjects ranked conditions. There's some consistency in rankings, but also notable individual variation in preferences.`);
    } else if (kendallW >= 0.1) {
        insights.push(`<strong>Kendall's W (Concordance):</strong> W = ${results.effect_size.toFixed(3)} (weak agreement). This indicates weak concordance across subjects. While ${isSignificant ? 'statistically significant' : 'not significant'}, subjects showed considerable disagreement in how they ranked conditions, limiting practical interpretation.`);
    } else {
        insights.push(`<strong>Kendall's W (Concordance):</strong> W = ${results.effect_size.toFixed(3)} (very weak agreement). This indicates very little concordance in rankings across subjects. Individual preferences vary greatly, making it difficult to draw general conclusions about condition differences.`);
    }
    
    // Degrees of freedom insight
    insights.push(`<strong>Degrees of Freedom:</strong> df = ${results.df}. With ${numConditions} conditions, the test has ${results.df} degrees of freedom (number of conditions - 1). This determines the shape of the chi-squared distribution used for hypothesis testing.`);
    
    // Condition comparison insight
    if (conditionStats.length >= 2) {
        const means = conditionStats.map(s => s.mean);
        const medians = conditionStats.map(s => s.median);
        const maxMean = Math.max(...means);
        const minMean = Math.min(...means);
        const maxCondition = conditionNames[means.indexOf(maxMean)];
        const minCondition = conditionNames[means.indexOf(minMean)];
        const range = maxMean - minMean;
        
        insights.push(`<strong>Condition Comparison:</strong> Across ${numConditions} conditions, mean values range from ${minMean.toFixed(2)} (${minCondition}) to ${maxMean.toFixed(2)} (${maxCondition}), a span of ${range.toFixed(2)} units. ${isSignificant ? 'Post-hoc pairwise tests would identify which specific condition pairs differ significantly.' : 'Despite this range, the differences are not statistically significant.'}`);
    }
    
    // Sample size considerations
    const n = conditionStats.length > 0 ? conditionStats[0].count : 0;
    
    if (n < 6) {
        insights.push(`<strong>Sample Size Warning:</strong> Only ${n} subjects were analyzed. With such a small sample and ${numConditions} conditions, statistical power is severely limited. Results are highly unreliable. Collect substantially more data (at least 10-15 subjects) for trustworthy conclusions.`);
    } else if (n < 10) {
        insights.push(`<strong>Sample Size:</strong> ${n} subjects across ${numConditions} conditions. This small sample provides limited statistical power. While the Friedman test can handle small samples, results should be interpreted cautiously. Aim for at least 15-20 subjects for more reliable findings.`);
    } else if (n < 20) {
        insights.push(`<strong>Sample Size:</strong> Adequate sample with ${n} subjects measured across ${numConditions} conditions. The test should be reasonably reliable, though larger samples would improve precision and power to detect smaller effects.`);
    } else {
        insights.push(`<strong>Sample Size:</strong> Well-powered analysis with ${n} subjects across ${numConditions} repeated conditions. This provides good confidence in the results and ability to detect meaningful differences across conditions.`);
    }
    
    // Within-subject design insight
    insights.push(`<strong>Repeated Measures Design:</strong> This is a within-subjects design where each of the ${n} subjects was measured under all ${numConditions} conditions. The Friedman test ranks responses within each subject, making it robust to individual differences in baseline levels and response scales. This increases statistical power compared to between-subjects designs.`);
    
    // Distribution insight
    if (conditionStats.length >= 2) {
        const means = conditionStats.map(s => s.mean);
        const medians = conditionStats.map(s => s.median);
        const meanMedianDiffs = means.map((m, i) => Math.abs(m - medians[i]));
        const avgDiff = meanMedianDiffs.reduce((a, b) => a + b, 0) / meanMedianDiffs.length;
        
        if (avgDiff > 0.5) {
            insights.push(`<strong>Distribution Shape:</strong> Mean and median values differ notably within conditions (average difference: ${avgDiff.toFixed(2)}), suggesting skewed distributions. The Friedman test is particularly appropriate here as it uses ranks within subjects, making it robust to non-normality and outliers.`);
        } else {
            insights.push(`<strong>Distribution Shape:</strong> Mean and median values are relatively close within conditions (average difference: ${avgDiff.toFixed(2)}), suggesting reasonably symmetric distributions. The Friedman test remains valid regardless of distribution shape, providing robust results.`);
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (!isSignificant && kendallW < 0.3) {
        recommendations = 'No meaningful differences detected across repeated conditions. Consider: (1) The conditions may genuinely have similar effects—no real differences exist, (2) Increase the number of subjects to detect smaller effects if they exist, (3) Check for measurement errors or inconsistent administration across conditions, (4) Examine whether the conditions are truly distinct—are they differentiated enough to expect differences?, (5) Consider if order effects or practice effects might be masking true differences—was counterbalancing used?, (6) Look at individual subject patterns—some might show effects while others don\'t (heterogeneity of response), (7) Verify that subjects understood the task and conditions properly, (8) Remember that lack of significance doesn\'t prove conditions are identical—it may reflect insufficient power.';
    } else if (isSignificant && kendallW < 0.3) {
        recommendations = 'Statistically significant but weak concordance detected. Actions: (1) Assess practical significance—does this level of disagreement matter in your domain?, (2) Conduct post-hoc pairwise tests (e.g., Nemenyi test or Wilcoxon signed-rank with Bonferroni correction) to identify which specific condition pairs differ, (3) Examine individual subject patterns—are there subgroups showing different response patterns?, (4) Consider if weak concordance reflects meaningful individual differences in preferences or responses, (5) Look for moderating variables that might explain why some subjects rank conditions differently, (6) Visualize individual subject trajectories to understand heterogeneity, (7) If concordance is unexpectedly weak, check for data quality issues or misunderstandings of conditions, (8) For decision-making, consider that weak concordance may limit the generalizability of findings.';
    } else if (!isSignificant && kendallW >= 0.3) {
        recommendations = 'Moderate to strong concordance but not statistically significant—likely a power issue. Recommendations: (1) Collect data from more subjects to increase statistical power, (2) The effect may be real but your sample size is too small to detect it reliably—this is a Type II error risk, (3) Check if variability within conditions is high, potentially masking between-condition differences, (4) Look for and address outliers or unusual response patterns in specific subjects, (5) Ensure all subjects received all conditions in comparable circumstances, (6) Run a post-hoc power analysis to determine needed sample size for future studies (aim for 15-30 subjects typically), (7) Consider if condition order or sequence effects might be introducing noise, (8) Examine if practice or fatigue effects across conditions are adding variability.';
    } else {
        recommendations = 'Significant differences with meaningful concordance detected across repeated conditions. Next steps: (1) Conduct post-hoc pairwise comparisons (Nemenyi test or Wilcoxon signed-rank tests with Bonferroni correction) to identify which specific condition pairs differ significantly, (2) Examine the practical implications of these differences—what do the rankings mean in your context?, (3) Investigate what distinguishes the conditions that differ—look for mechanism or explanation, (4) Check for order effects by analyzing if condition sequence influenced results, (5) Look at individual subject patterns to understand variability—are some subjects driving the effect?, (6) Consider validation with an independent sample of subjects if possible, (7) Visualize mean ranks or median values across conditions to aid interpretation, (8) If this is a longitudinal study (time points), interpret in context of expected trajectories, (9) For intervention studies, assess clinical or practical significance beyond statistical significance, (10) Communicate findings with context about which conditions differ and the magnitude of differences, not just p-values.';
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
    const friedmanExample = exampleDatasets.find(d => d.analysisTypes?.includes('friedman'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <RefreshCw className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Friedman Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Non-parametric alternative to repeated measures ANOVA for comparing three or more related samples
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <RefreshCw className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Repeated Measures</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Tests differences across three or more related measurements from the same subjects
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Rank-Based Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Uses ranks within each subject, making it robust to outliers and non-normal data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Concordance (W)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Kendall's W coefficient measures agreement and strength of effect across conditions
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
                            Use Friedman test when you have three or more related measurements from the same subjects 
                            (repeated measures or matched groups) but your data doesn't meet the assumptions for repeated 
                            measures ANOVA. Common examples include comparing satisfaction ratings at three time points, 
                            evaluating multiple treatments on the same patients, or ranking preferences across conditions.
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
                                        <span><strong>Related samples:</strong> Same subjects measured 3+ times</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variables:</strong> At least 3 numeric/ordinal variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Format:</strong> Each row = one subject, columns = conditions</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>χ² statistic:</strong> Chi-squared distributed test statistic</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p-value:</strong> Significance (p &lt; 0.05 indicates differences)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>W:</strong> Concordance (0=no agreement, 1=perfect agreement)</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {friedmanExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(friedmanExample)} size="lg">
                                {friedmanExample.icon && <friedmanExample.icon className="mr-2 h-5 w-5" />}
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
const StatisticalSummaryCards = ({ results }: { results: FriedmanResults }) => {
    const isSignificant = results.p_value < 0.05;
    
    const getConcordanceInterpretation = (w: number) => {
        if (w < 0.1) return "Very weak agreement";
        if (w < 0.3) return "Weak agreement";
        if (w < 0.5) return "Moderate agreement";
        if (w < 0.7) return "Strong agreement";
        return "Very strong agreement";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chi-Squared Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                χ² Statistic
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.statistic.toFixed(3)}
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

            {/* Concordance (Kendall's W) Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Concordance (W)
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.effect_size.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getConcordanceInterpretation(results.effect_size)}
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
                            {results.df}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Number of conditions - 1
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const FriedmanOverview = ({ selectedVars, dataLength }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedVars.length >= 3) {
            overview.push(`Comparing ${selectedVars.length} related conditions across ${dataLength} subjects`);
        } else {
            overview.push('Select at least 3 numeric variables (conditions/time points)');
        }

        // Variable count status
        if (selectedVars.length < 3) {
            overview.push(`⚠ Only ${selectedVars.length} variable(s) selected (minimum 3 required)`);
        } else {
            overview.push(`Variables: ${selectedVars.join(', ')}`);
        }

        // Sample size
        if (dataLength < 6) {
            overview.push(`Sample size: ${dataLength} subjects (⚠ Very small - results unreliable)`);
        } else if (dataLength < 10) {
            overview.push(`Sample size: ${dataLength} subjects (⚠ Small - check assumptions)`);
        } else if (dataLength < 20) {
            overview.push(`Sample size: ${dataLength} subjects (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} subjects (Good)`);
        }
        
        // Test info
        overview.push('Test type: Friedman rank sum test');
        overview.push('Non-parametric alternative to repeated measures ANOVA');

        return overview;
    }, [selectedVars, dataLength]);

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

export default function FriedmanPage({ data, numericHeaders, onLoadExample }: FriedmanPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length >= 3;
    }, [data, numericHeaders]);

    useEffect(() => {
        setSelectedVars(numericHeaders.slice(0, Math.min(3, numericHeaders.length)));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders, data, canRun]);
    
    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length < 3) {
            toast({ 
                variant: "destructive", 
                title: "Selection Error", 
                description: "Please select at least 3 variables for Friedman test." 
            });
            return;
        }
        
        const params = { variables: selectedVars };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'friedman', params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateFriedmanInterpretations(result.results, selectedVars);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
            toast({ title: 'Friedman Test Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast]);

    const handleLoadExampleData = () => {
        const friedmanExample = exampleDatasets.find(ex => ex.analysisTypes?.includes('friedman'));
        if (friedmanExample) {
            onLoadExample(friedmanExample);
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
                        <CardTitle className="font-headline">Friedman Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Select three or more numeric variables representing related measurements or repeated conditions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Variables to Compare ({selectedVars.length} selected)</Label>
                        <ScrollArea className="h-40 p-3 border rounded-md bg-muted/30">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {numericHeaders.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`friedman-${header}`}
                                            checked={selectedVars.includes(header)}
                                            onCheckedChange={(checked) => handleVarSelectionChange(header, checked as boolean)}
                                        />
                                        <Label 
                                            htmlFor={`friedman-${header}`} 
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {header}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        {selectedVars.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {selectedVars.map(v => (
                                    <Badge key={v} variant="secondary">{v}</Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Overview component */}
                    <FriedmanOverview 
                        selectedVars={selectedVars}
                        dataLength={data.length}
                    />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button 
                        onClick={handleAnalysis} 
                        disabled={isLoading || selectedVars.length < 3}
                    >
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
                            <CardDescription>Overall Friedman test results and significance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={isSignificant ? 'default' : 'destructive'}>
                                {isSignificant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertDescription>
                                    {isSignificant
                                        ? 'Friedman test results show statistically significant differences across the repeated conditions. The rank-based test indicates that at least one condition\'s distribution differs significantly from the others within subjects.'
                                        : 'Friedman test results do not show statistically significant differences across the repeated conditions. The observed differences in within-subject rankings could be due to random variation.'
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
                    {results.condition_stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Descriptive Statistics</CardTitle>
                                <CardDescription>Summary statistics for each condition</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Condition</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Median</TableHead>
                                            <TableHead className="text-right">Std. Dev</TableHead>
                                            <TableHead className="text-right">Min</TableHead>
                                            <TableHead className="text-right">Max</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.condition_stats).map(([condition, stats]: [string, any]) => (
                                            <TableRow key={condition}>
                                                <TableCell className="font-medium">{condition}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.count}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.median.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.min != null ? stats.min.toFixed(3) : 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.max != null ? stats.max.toFixed(3) : 'N/A'}</TableCell>
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
                                <CardDescription>Distribution comparison across conditions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Friedman Test Visualization" 
                                    width={1800} 
                                    height={600} 
                                    className="w-full rounded-sm border" 
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Friedman Test Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Friedman Test Results</CardTitle>
                            <CardDescription>Complete test statistics and effect size measures</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>χ² Statistic</TableHead>
                                            <TableHead>Degrees of Freedom</TableHead>
                                            <TableHead>P-value</TableHead>
                                            <TableHead>Kendall's W</TableHead>
                                            <TableHead>Concordance Level</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono">{results.statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono">{results.df}</TableCell>
                                            <TableCell className="font-mono">
                                                {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                                {getSignificanceStars(results.p_value)}
                                            </TableCell>
                                            <TableCell className="font-mono">{results.effect_size.toFixed(3)}</TableCell>
                                            <TableCell>
                                                <Badge variant={results.effect_size_interpretation?.level === 'strong' ? 'default' : 'secondary'}>
                                                    {results.effect_size_interpretation?.text || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <p className='text-sm text-muted-foreground'>
                                Kendall's W ranges from 0 (no agreement) to 1 (complete agreement) | Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <RefreshCw className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select at least 3 variables and click 'Run Analysis' to perform Friedman test.</p>
                </div>
            )}
        </div>
    );
}