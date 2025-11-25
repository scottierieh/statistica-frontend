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

interface KruskalWallisResults {
    statistic: number;
    p_value: number;
    effect_size: number;
    df: number;
    effect_size_interpretation?: {
        text: string;
        magnitude: string;
    };
    interpretation?: string | {
        decision?: string;
        conclusion?: string;
    };
    group_stats?: {
        [key: string]: {
            count?: number;
            n?: number;
            mean: number;
            median: number;
            std: number;
        };
    };
}

interface FullAnalysisResponse {
    results: KruskalWallisResults;
    plot?: string;
    interpretations?: {
        overall_analysis: string;
        statistical_insights: string[];
        recommendations: string;
    };
    n_dropped?: number;
    dropped_rows?: number[];
}

interface KruskalWallisPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

// Generate interpretations
const generateKruskalWallisInterpretations = (results: KruskalWallisResults, groupCol: string, valueCol: string) => {
    const insights: string[] = [];
    
    const isSignificant = results.p_value < 0.05;
    const effectSize = results.effect_size;
    
    // Get group information
    const groupNames = results.group_stats ? Object.keys(results.group_stats) : [];
    const groupStats = results.group_stats ? Object.values(results.group_stats) : [];
    const numGroups = groupNames.length;
    
    // Overall analysis
    let overall = '';
    if (isSignificant) {
        if (effectSize >= 0.14) {
            overall = `<strong>Highly significant differences with large effect.</strong> The Kruskal-Wallis test revealed statistically significant differences (H = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) among the ${numGroups} groups on ${valueCol}. With an effect size of ε² = ${results.effect_size.toFixed(3)} (large), this represents substantial and meaningful differences in the distributions across groups.`;
        } else if (effectSize >= 0.06) {
            overall = `<strong>Significant differences with medium effect.</strong> The Kruskal-Wallis test detected statistically significant differences (H = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) among groups on ${valueCol}. The effect size of ε² = ${results.effect_size.toFixed(3)} indicates moderate, practically meaningful differences.`;
        } else {
            overall = `<strong>Statistically significant but small effect.</strong> While the Kruskal-Wallis test identified statistically significant differences (H = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}), the small effect size (ε² = ${results.effect_size.toFixed(3)}) suggests the practical differences between groups may be limited.`;
        }
    } else {
        overall = `<strong>No significant differences detected.</strong> The Kruskal-Wallis test found no statistically significant differences (H = ${results.statistic.toFixed(3)}, df = ${results.df}, p = ${results.p_value.toFixed(3)}) among the ${numGroups} groups on ${valueCol}. The distributions appear similar across groups, though this could also reflect insufficient statistical power with the current sample size.`;
    }
    
    // H statistic insight
    insights.push(`<strong>H-Statistic:</strong> H = ${results.statistic.toFixed(3)}. This chi-squared distributed test statistic is based on comparing the ranks across ${numGroups} groups. ${results.p_value < 0.05 ? 'The observed differences in rank distributions are unlikely to have occurred by chance.' : 'The differences in rank distributions are not statistically significant.'}`);
    
    // P-value insight
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-value:</strong> p < 0.001 (highly significant). There is very strong evidence against the null hypothesis of equal distributions. The probability of observing these differences by chance alone is less than 0.1%.`);
    } else if (results.p_value < 0.01) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (highly significant at α = 0.01). Strong evidence that at least one group differs from the others.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (significant at α = 0.05). Evidence suggests real differences exist among the groups.`);
    } else if (results.p_value < 0.10) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (marginally significant). Weak evidence of differences. Consider collecting more data or examining contextual factors.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (not significant). No statistical evidence of differences among groups at conventional significance levels.`);
    }
    
    // Effect size insight
    if (effectSize >= 0.14) {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (large effect). This substantial effect size indicates meaningful real-world differences among the groups. The grouping variable explains a considerable proportion of the variance in ${valueCol}.`);
    } else if (effectSize >= 0.06) {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (medium effect). This moderate effect size suggests noticeable, practically relevant differences among groups.`);
    } else if (effectSize >= 0.01) {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (small effect). While statistically detectable${isSignificant ? '' : ' if significant'}, the practical importance may be limited. Consider whether these differences matter in your context.`);
    } else {
        insights.push(`<strong>Effect Size:</strong> ε² = ${results.effect_size.toFixed(3)} (negligible effect). The differences among groups are very small. Even if statistically significant, they may not be practically meaningful.`);
    }
    
    // Degrees of freedom insight
    insights.push(`<strong>Degrees of Freedom:</strong> df = ${results.df}. With ${numGroups} groups, the test has ${results.df} degrees of freedom (number of groups - 1). This determines the shape of the chi-squared distribution used for hypothesis testing.`);
    
    // Group comparison insight
    if (groupStats.length >= 2) {
        const medians = groupStats.map(s => s.median);
        const maxMedian = Math.max(...medians);
        const minMedian = Math.min(...medians);
        const maxGroup = groupNames[medians.indexOf(maxMedian)];
        const minGroup = groupNames[medians.indexOf(minMedian)];
        const range = maxMedian - minMedian;
        
        insights.push(`<strong>Group Comparison:</strong> Across ${numGroups} groups, medians range from ${minMedian.toFixed(2)} (${minGroup}) to ${maxMedian.toFixed(2)} (${maxGroup}), a span of ${range.toFixed(2)} units. ${isSignificant ? 'Post-hoc pairwise tests would identify which specific group pairs differ significantly.' : 'The groups show similar central tendencies despite the range.'}`);
    }
    
    // Sample size considerations
    const totalN = groupStats.reduce((sum, g) => sum + (g.count || g.n || 0), 0);
    const minN = Math.min(...groupStats.map(g => g.count || g.n || 0));
    const groupSizes = groupStats.map(g => g.count || g.n || 0);
    
    if (minN < 5) {
        insights.push(`<strong>Sample Size Warning:</strong> The smallest group has only ${minN} observations. With total N = ${totalN} across ${numGroups} groups, statistical power may be severely limited. Groups with very small sample sizes (${groupSizes.join(', ')}) make results unreliable. Collect more data for trustworthy conclusions.`);
    } else if (minN < 10) {
        insights.push(`<strong>Sample Size:</strong> Groups have ${groupSizes.join(', ')} observations (total N = ${totalN}). The smallest group has ${minN} observations. While the Kruskal-Wallis test can handle small samples, larger groups would provide more reliable results and better power to detect differences.`);
    } else if (totalN < 30) {
        insights.push(`<strong>Sample Size:</strong> Adequate sample with ${totalN} total observations across ${numGroups} groups (${groupSizes.join(', ')}). The test should be reasonably reliable, though larger samples would improve precision.`);
    } else {
        insights.push(`<strong>Sample Size:</strong> Well-powered analysis with ${totalN} total observations across ${numGroups} groups (${groupSizes.join(', ')}). This provides good confidence in the results and ability to detect meaningful differences.`);
    }
    
    // Distribution insight
    if (groupStats.length >= 2) {
        const means = groupStats.map(s => s.mean);
        const medians = groupStats.map(s => s.median);
        const meanMedianDiffs = means.map((m, i) => Math.abs(m - medians[i]));
        const avgDiff = meanMedianDiffs.reduce((a, b) => a + b, 0) / meanMedianDiffs.length;
        
        if (avgDiff > 0.5) {
            insights.push(`<strong>Distribution Shape:</strong> Mean and median values differ notably within groups (average difference: ${avgDiff.toFixed(2)}), suggesting skewed distributions. This is why the Kruskal-Wallis test is appropriate—it handles non-normal data by using ranks instead of raw values.`);
        } else {
            insights.push(`<strong>Distribution Shape:</strong> Mean and median values are relatively close within groups (average difference: ${avgDiff.toFixed(2)}), suggesting reasonably symmetric distributions. The Kruskal-Wallis test remains valid and provides robust results regardless of distribution shape.`);
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (!isSignificant && effectSize < 0.06) {
        recommendations = 'No meaningful differences detected among groups. Consider: (1) The groups may genuinely be similar on this measure—no real differences exist, (2) Increase sample size in each group to detect smaller effects if they exist, (3) Check for measurement errors or data quality issues that might be adding noise, (4) Examine whether the grouping variable is truly capturing the distinction of interest—are groups well-defined?, (5) Look for non-linear relationships or interactions with other variables that might mask group differences, (6) Consider if the timing or conditions of measurements were consistent across groups, (7) Remember that lack of significance doesn\'t prove groups are identical—it may reflect insufficient power.';
    } else if (isSignificant && effectSize < 0.06) {
        recommendations = 'Statistically significant but small effect detected. Actions: (1) Assess practical significance—does this magnitude of difference matter in your domain?, (2) Conduct post-hoc pairwise tests (e.g., Dunn\'s test with Bonferroni correction) to identify which specific groups differ, (3) Examine distributions visually for outliers or unusual patterns in specific groups, (4) Consider if the effect might be larger or more consistent in specific subgroups not captured by the current grouping, (5) Replicate findings with independent samples to confirm the effect is real, (6) Investigate what drives the differences—look for mediating or moderating factors, (7) For decision-making, weigh statistical significance against practical importance and costs of acting on small differences.';
    } else if (!isSignificant && effectSize >= 0.06) {
        recommendations = 'Medium to large effect size but not statistically significant—likely a power issue. Recommendations: (1) Collect more data to increase statistical power, especially in smaller groups, (2) The effect may be real but your sample size is too small to detect it reliably—this is a Type II error risk, (3) Check for high variability within groups that might be masking between-group differences, (4) Look for and address outliers in specific groups that may be inflating variance, (5) Consider if unequal or very small group sizes are affecting power, (6) Run a post-hoc power analysis to determine needed sample size for future studies, (7) Examine if certain groups show the effect while others don\'t—heterogeneity might require different grouping.';
    } else {
        recommendations = 'Significant differences with meaningful effect size detected among groups. Next steps: (1) Conduct post-hoc pairwise comparisons (Dunn\'s test or Mann-Whitney U with Bonferroni correction) to identify which specific group pairs differ significantly, (2) Examine the practical implications of these differences in your specific context—what do the differences mean?, (3) Investigate what factors distinguish the groups—conduct follow-up analyses or qualitative investigations, (4) Check robustness by examining different subsets or time periods if applicable, (5) Look at effect heterogeneity—are differences consistent across other variables?, (6) Consider validation with an independent dataset if available, (7) For causal claims about group membership causing differences, ensure groups were comparable at baseline and rule out confounders, (8) Communicate findings with appropriate context about effect magnitude and which specific groups differ, not just p-values, (9) Create visualizations showing the distributions for each group to support your findings.';
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
    const kwExample = exampleDatasets.find(d => d.analysisTypes?.includes('kruskal-wallis'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <FlaskConical className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Kruskal-Wallis Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Non-parametric alternative to one-way ANOVA for comparing three or more independent groups
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Groups</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Tests differences across three or more independent groups without normality assumption
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
                                    Uses ranks instead of raw values, making it robust to outliers and skewed data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Effect Size (ε²)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Provides epsilon-squared to measure the magnitude of group differences
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
                            Use Kruskal-Wallis when you want to compare a continuous variable across three or more 
                            independent groups but your data doesn't meet ANOVA assumptions (normality, equal variances). 
                            It's ideal for ordinal data, skewed distributions, or when you have outliers. Common examples 
                            include comparing customer satisfaction ratings across regions or test scores across multiple teaching methods.
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
                                        <span><strong>Independent variable:</strong> Categorical with 3+ groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Dependent variable:</strong> Continuous or ordinal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independence:</strong> Observations within groups are independent</span>
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
                                        <span><strong>H-statistic:</strong> Chi-squared distributed test statistic</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p-value:</strong> Significance level (p &lt; 0.05 indicates differences)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>ε²:</strong> Effect size (0.01=small, 0.06=medium, 0.14=large)</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {kwExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(kwExample)} size="lg">
                                {kwExample.icon && <kwExample.icon className="mr-2 h-5 w-5" />}
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
const StatisticalSummaryCards = ({ results }: { results: KruskalWallisResults }) => {
    const isSignificant = results.p_value < 0.05;
    
    const getEffectSizeInterpretation = (epsilon_squared: number) => {
        if (epsilon_squared < 0.01) return "Negligible effect";
        if (epsilon_squared < 0.06) return "Small effect";
        if (epsilon_squared < 0.14) return "Medium effect";
        return "Large effect";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* H-Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                H-Statistic
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
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

            {/* Effect Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Effect Size (ε²)
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.effect_size.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.effect_size)}
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
                            Number of groups - 1
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with missing value check
const KruskalWallisOverview = ({ groupCol, valueCol, numGroups, dataLength, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Variable selection status
        if (groupCol && valueCol) {
            overview.push(`Comparing ${valueCol} across ${numGroups} groups in ${groupCol}`);
        } else {
            overview.push('Select group variable (categorical) and value variable (numeric)');
        }

        // Group count status
        if (numGroups >= 3) {
            overview.push(`Groups detected: ${numGroups}`);
        } else if (numGroups > 0) {
            overview.push(`⚠ Only ${numGroups} groups (minimum 3 required)`);
        }

        // Missing value check
        if (data && data.length > 0 && groupCol && valueCol) {
            const missingCount = data.filter((row: any) => 
                isMissing(row[groupCol]) || isMissing(row[valueCol])
            ).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }

        // Sample size
        if (dataLength < 15) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Very small - results unreliable)`);
        } else if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Small - check assumptions)`);
        } else if (dataLength < 50) {
            overview.push(`Sample size: ${dataLength} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} observations (Good)`);
        }
        
        // Test info
        overview.push('Test type: Kruskal-Wallis rank sum test');
        overview.push('Non-parametric alternative to one-way ANOVA');

        return overview;
    }, [groupCol, valueCol, numGroups, dataLength, data]);

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

export default function KruskalWallisPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: KruskalWallisPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [groupCol, setGroupCol] = useState<string | undefined>(categoricalHeaders[0]);
    const [valueCol, setValueCol] = useState<string | undefined>(numericHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const multiGroupCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size >= 3);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0 && multiGroupCategoricalHeaders.length > 0;
    }, [data, numericHeaders, multiGroupCategoricalHeaders]);

    const numGroups = useMemo(() => {
        if (!groupCol || data.length === 0) return 0;
        return new Set(data.map(row => row[groupCol]).filter(v => v != null && v !== '')).size;
    }, [data, groupCol]);

    useEffect(() => {
        setGroupCol(multiGroupCategoricalHeaders[0] || categoricalHeaders[0]);
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders, categoricalHeaders, multiGroupCategoricalHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!groupCol || !valueCol) {
            toast({ variant: "destructive", title: "Selection Error", description: "Please select both group and value columns." });
            return;
        }
        
        const groups = new Set(data.map(row => row[groupCol]));
        if (groups.size < 3) {
            toast({ variant: 'destructive', title: 'Invalid Grouping', description: `The variable '${groupCol}' must have at least 3 distinct groups.` });
            return;
        }

        const params = { group_col: groupCol, value_col: valueCol };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'kruskal_wallis', params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateKruskalWallisInterpretations(result.results, groupCol, valueCol);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
            toast({ title: 'Kruskal-Wallis Test Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupCol, valueCol, toast]);

    const handleLoadExampleData = () => {
        const kwExample = exampleDatasets.find(ex => ex.analysisTypes?.includes('kruskal-wallis'));
        if (kwExample) {
            onLoadExample(kwExample);
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
                        <CardTitle className="font-headline">Kruskal-Wallis Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Select a categorical grouping variable (3+ groups) and a numeric value variable.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="groupCol">Group Variable (Categorical)</Label>
                            <Select value={groupCol} onValueChange={setGroupCol}>
                                <SelectTrigger id="groupCol">
                                    <SelectValue placeholder="Select grouping variable..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {multiGroupCategoricalHeaders.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {numGroups > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    <Badge variant="outline">{numGroups} groups</Badge>
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valueCol">Value Variable (Numeric)</Label>
                            <Select value={valueCol} onValueChange={setValueCol}>
                                <SelectTrigger id="valueCol">
                                    <SelectValue placeholder="Select numeric variable..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <KruskalWallisOverview 
                        groupCol={groupCol}
                        valueCol={valueCol}
                        numGroups={numGroups}
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
                            <CardDescription>Overall Kruskal-Wallis test results and significance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={isSignificant ? 'default' : 'destructive'}>
                                {isSignificant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertDescription>
                                    {isSignificant
                                        ? 'Kruskal-Wallis test results show statistically significant differences among the groups. The rank-based test indicates that at least one group\'s distribution differs significantly from the others.'
                                        : 'Kruskal-Wallis test results do not show statistically significant differences among the groups. The observed differences in rank distributions could be due to random variation.'
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
                    {results.group_stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Descriptive Statistics</CardTitle>
                                <CardDescription>Summary statistics for each group</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Median</TableHead>
                                            <TableHead className="text-right">Std. Dev</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.group_stats).map(([group, stats]: [string, any]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.count || stats.n || 'N/A'}</TableCell>
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
                                <CardDescription>Distribution comparison across groups</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Kruskal-Wallis Visualization" 
                                    width={1500} 
                                    height={1200} 
                                    className="w-full rounded-sm border" 
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Kruskal-Wallis Test Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Kruskal-Wallis Test Results</CardTitle>
                            <CardDescription>Complete test statistics and effect size measures</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>H-Statistic</TableHead>
                                            <TableHead>Degrees of Freedom</TableHead>
                                            <TableHead>P-value</TableHead>
                                            <TableHead>Effect Size (ε²)</TableHead>
                                            <TableHead>Effect Magnitude</TableHead>
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
                                                <Badge variant={results.effect_size_interpretation?.magnitude === 'Large' ? 'default' : 'secondary'}>
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
                                Effect size ε² = (H - k + 1) / (n - k) | Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Analysis' to perform Kruskal-Wallis test.</p>
                </div>
            )}
        </div>
    );
}