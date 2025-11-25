'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, TrendingUp, Target, CheckCircle, AlertTriangle, HelpCircle, Settings, FileSearch, BarChart3, Layers, Users, Bot, Download, Activity, Info, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';

interface MannWhitneyResults {
    test_type: string;
    statistic: number;
    p_value: number;
    effect_size: number;
    effect_size_interpretation: {
        text: string;
        magnitude: string;
    };
    interpretation: {
        decision: string;
        conclusion: string;
    };
    group_stats?: {
        [key: string]: {
            mean: number;
            median: number;
            std: number;
            count: number;
        };
    };
}

interface FullAnalysisResponse {
    results: MannWhitneyResults;
    plot: string;
    interpretations?: {
        overall_analysis: string;
        statistical_insights: string[];
        recommendations: string;
    };
    n_dropped?: number;
    dropped_rows?: number[];
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: MannWhitneyResults }) => {
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
            {/* U Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                U Statistic
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.statistic.toFixed(1)}
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
                                Effect Size (r)
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

            {/* Number of Groups Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Number of Groups
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            2
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Independent samples
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with clean design
const MannWhitneyOverview = ({ groupCol, valueCol, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (groupCol && valueCol) {
            overview.push(`Comparing ${valueCol} between groups defined by ${groupCol}`);
        } else {
            overview.push('⚠ Select group and value variables');
        }

        // Group information
        if (groupCol && data.length > 0) {
            const groups = new Set(data.map((row: any) => row[groupCol]).filter((v: any) => v != null));
            const groupCount = groups.size;
            
            if (groupCount !== 2) {
                overview.push(`⚠ Found ${groupCount} groups - need exactly 2 for Mann-Whitney U test`);
            } else {
                const groupArray = Array.from(groups);
                const counts = groupArray.map(g => 
                    data.filter((row: any) => row[groupCol] === g).length
                );
                overview.push(`Groups: ${groupArray[0]} (n=${counts[0]}), ${groupArray[1]} (n=${counts[1]})`);
                
                if (Math.min(...counts) < 5) {
                    overview.push('⚠ Very small group size - results may be unreliable');
                } else if (Math.min(...counts) < 20) {
                    overview.push('⚠ Small group sizes - consider exact p-values');
                }
            }
        }

        // Sample size
        if (data.length < 20) {
            overview.push(`Sample size: ${data.length} observations (⚠ Very small - results unreliable)`);
        } else if (data.length < 50) {
            overview.push(`Sample size: ${data.length} observations (⚠ Small - check assumptions)`);
        } else {
            overview.push(`Sample size: ${data.length} observations (Good)`);
        }
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Missing value check
        if (data && data.length > 0 && groupCol && valueCol) {
            const missingCount = data.filter((row: any) => 
                isMissing(row[groupCol]) || isMissing(row[valueCol])
            ).length;
            const validCount = data.length - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        // Test info
        overview.push('Test type: Mann-Whitney U (Wilcoxon rank-sum)');
        overview.push('Non-parametric alternative to t-test');

        return overview;
    }, [groupCol, valueCol, data]);

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

// Generate interpretations
const generateMannWhitneyInterpretations = (results: MannWhitneyResults, groupCol: string, valueCol: string) => {
    const insights: string[] = [];
    
    const isSignificant = results.p_value < 0.05;
    const absEffectSize = Math.abs(results.effect_size);
    
    // Get group names and stats
    const groupNames = results.group_stats ? Object.keys(results.group_stats) : [];
    const groupStats = results.group_stats ? Object.values(results.group_stats) : [];
    
    // Overall analysis
    let overall = '';
    if (isSignificant) {
        if (absEffectSize >= 0.5) {
            overall = `<strong>Highly significant difference with large effect.</strong> The Mann-Whitney U test revealed a statistically significant difference (U = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) between the two groups on ${valueCol}. With an effect size of r = ${results.effect_size.toFixed(3)} (large), this represents a substantial and meaningful difference in the distributions.`;
        } else if (absEffectSize >= 0.3) {
            overall = `<strong>Significant difference with moderate effect.</strong> The Mann-Whitney U test detected a statistically significant difference (U = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) between groups on ${valueCol}. The effect size of r = ${results.effect_size.toFixed(3)} indicates a moderate, practically meaningful difference.`;
        } else {
            overall = `<strong>Statistically significant but small effect.</strong> While the Mann-Whitney U test identified a statistically significant difference (U = ${results.statistic.toFixed(1)}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}), the small effect size (r = ${results.effect_size.toFixed(3)}) suggests the practical difference between groups may be limited.`;
        }
    } else {
        overall = `<strong>No significant difference detected.</strong> The Mann-Whitney U test found no statistically significant difference (U = ${results.statistic.toFixed(1)}, p = ${results.p_value.toFixed(3)}) between the two groups on ${valueCol}. The distributions appear similar, though this could also reflect insufficient statistical power with the current sample size.`;
    }
    
    // Test statistic insight
    insights.push(`<strong>U Statistic:</strong> U = ${results.statistic.toFixed(1)}. This non-parametric test statistic is based on ranking all observations and comparing rank sums between groups. ${results.p_value < 0.05 ? 'The observed difference in ranks is unlikely to have occurred by chance.' : 'The difference in ranks is not statistically significant.'}`);
    
    // P-value insight
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-value:</strong> p < 0.001 (highly significant). There is very strong evidence against the null hypothesis. The probability of observing this difference by chance alone is less than 0.1%.`);
    } else if (results.p_value < 0.01) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (highly significant at α = 0.01). Strong evidence of a true difference between groups.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (significant at α = 0.05). Evidence suggests a real difference exists between the groups.`);
    } else if (results.p_value < 0.10) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (marginally significant). Weak evidence of a difference. Consider collecting more data or examining contextual factors.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (not significant). No statistical evidence of a difference between groups at conventional significance levels.`);
    }
    
    // Effect size insight
    if (absEffectSize >= 0.5) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (large effect). This substantial effect size indicates a meaningful real-world difference. Approximately ${(absEffectSize * 100).toFixed(0)}% of the variance in ${valueCol} is associated with group membership.`);
    } else if (absEffectSize >= 0.3) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (medium effect). This moderate effect size suggests a noticeable, practically relevant difference between groups.`);
    } else if (absEffectSize >= 0.1) {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (small effect). While statistically detectable${isSignificant ? '' : ' if significant'}, the practical importance may be limited. Consider whether this difference matters in your context.`);
    } else {
        insights.push(`<strong>Effect Size:</strong> r = ${results.effect_size.toFixed(3)} (negligible effect). The difference between groups is very small. Even if statistically significant, it may not be practically meaningful.`);
    }
    
    // Group statistics insight
    if (groupStats.length === 2) {
        const [group1, group2] = groupStats;
        const [name1, name2] = groupNames;
        const medianDiff = Math.abs(group1.median - group2.median);
        const higherGroup = group1.median > group2.median ? name1 : name2;
        const lowerGroup = group1.median > group2.median ? name2 : name1;
        const higherMedian = Math.max(group1.median, group2.median);
        const lowerMedian = Math.min(group1.median, group2.median);
        const higherN = group1.median > group2.median ? group1.count : group2.count;
        const lowerN = group1.median > group2.median ? group2.count : group1.count;
        
        insights.push(`<strong>Group Comparison:</strong> ${higherGroup} (median = ${higherMedian.toFixed(2)}, n = ${higherN}) shows ${medianDiff > 0 ? 'higher' : 'similar'} values compared to ${lowerGroup} (median = ${lowerMedian.toFixed(2)}, n = ${lowerN}). The median difference is ${medianDiff.toFixed(2)} units.`);
    }
    
    // Sample size considerations
    const totalN = groupStats.reduce((sum, g) => sum + g.count, 0);
    const minN = Math.min(...groupStats.map(g => g.count));
    
    if (minN < 10) {
        insights.push(`<strong>Sample Size Warning:</strong> The smallest group has only ${minN} observations. With total N = ${totalN}, statistical power may be limited. Consider collecting more data for more reliable conclusions, especially if the effect is not significant.`);
    } else if (minN < 30) {
        insights.push(`<strong>Sample Size:</strong> Groups have ${groupStats.map(g => g.count).join(' and ')} observations (total N = ${totalN}). While adequate for the Mann-Whitney test, larger samples would provide more precise estimates and better power to detect small effects.`);
    } else {
        insights.push(`<strong>Sample Size:</strong> Well-powered analysis with ${totalN} total observations across groups (${groupStats.map(g => g.count).join(' and ')}). This provides good confidence in the results.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (!isSignificant && absEffectSize < 0.2) {
        recommendations = 'No meaningful difference detected. Consider: (1) The groups may genuinely be similar on this measure, (2) Increase sample size to detect smaller effects if they exist, (3) Check for measurement errors or data quality issues, (4) Examine if the grouping variable is truly capturing the distinction of interest, (5) Look for non-linear relationships or interactions with other variables that might mask group differences, (6) Consider that lack of significance doesn\'t prove groups are identical - it may reflect insufficient power.';
    } else if (isSignificant && absEffectSize < 0.3) {
        recommendations = 'Statistically significant but small effect detected. Actions: (1) Assess practical significance - does this difference matter in your domain?, (2) Examine group distributions visually for outliers or non-standard patterns, (3) Consider if the effect might be larger in specific subgroups, (4) Replicate findings with independent samples to confirm the effect, (5) Investigate what drives the difference - look for mediating or moderating factors, (6) For decision-making, weigh statistical significance against practical importance and costs.';
    } else if (!isSignificant && absEffectSize >= 0.3) {
        recommendations = 'Large effect size but not statistically significant - likely a power issue. Recommendations: (1) Collect more data to increase statistical power, (2) The effect may be real but your sample size is too small to detect it reliably, (3) Check for high variability within groups that might be masking differences, (4) Look for and address outliers that may be inflating variance, (5) Consider if unequal group sizes are affecting power, (6) Run a post-hoc power analysis to determine needed sample size for future studies.';
    } else {
        recommendations = 'Significant difference with meaningful effect size detected. Next steps: (1) Examine the practical implications of this difference in your context, (2) Investigate what factors distinguish the groups - conduct follow-up analyses, (3) Check robustness by testing with different subsets or time periods, (4) Look at effect heterogeneity - is the difference consistent across other variables?, (5) Consider validation with an independent dataset if available, (6) For causal claims, ensure groups were comparable at baseline and rule out confounders, (7) Communicate findings with appropriate context about effect magnitude, not just p-values.';
    }
    
    return {
        overall_analysis: overall,
        statistical_insights: insights,
        recommendations: recommendations
    };
};

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

// Intro page component
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const mannWhitneyExample = exampleDatasets.find(d => d.analysisTypes?.includes('mann-whitney'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <FlaskConical className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Mann-Whitney U Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Non-parametric test for comparing two independent groups
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Rank-Based</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Uses ranks, not raw values
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Robust</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Handles outliers well
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Two Groups</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Independent samples
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
                            The Mann-Whitney U test (Wilcoxon rank-sum test) is the non-parametric alternative to the 
                            independent samples t-test. Use it when comparing two independent groups and your data violates 
                            normality assumptions, contains outliers, is measured on an ordinal scale, or has unequal variances. 
                            The test compares the distributions of the two groups by ranking all observations together and 
                            comparing rank sums. It's more robust than t-tests and perfect for small samples or non-normal data.
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
                                        <span><strong>Groups:</strong> Exactly 2 independent groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variable:</strong> Numeric or ordinal measure</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Sample:</strong> 10+ per group recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independence:</strong> Groups must be independent</span>
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
                                        <span><strong>U Statistic:</strong> Based on rank sums</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p &lt; 0.05:</strong> Significant difference</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Effect size (r):</strong> 0.1/0.3/0.5 thresholds</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Medians:</strong> Compare group centers</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {mannWhitneyExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(mannWhitneyExample)} size="lg">
                                <FlaskConical className="mr-2 h-5 w-5" />
                                Load Mann-Whitney Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface MannWhitneyPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function MannWhitneyPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onGenerateReport }: MannWhitneyPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [groupCol, setGroupCol] = useState(categoricalHeaders.find(h => data.map(d => d[h]).filter(g => g != null).length === 2) || categoricalHeaders[0]);
    const [valueCol, setValueCol] = useState(numericHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && binaryCategoricalHeaders.length > 0, [data, numericHeaders, binaryCategoricalHeaders]);

    useEffect(() => {
        setGroupCol(categoricalHeaders.find(h => new Set(data.map(d => d[h]).filter(g => g != null)).size === 2) || categoricalHeaders[0]);
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders, categoricalHeaders, data, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!groupCol || !valueCol) {
            toast({ variant: "destructive", title: "Please select group and value columns." });
            return;
        }
        const groups = Array.from(new Set(data.map(d => d[groupCol]))).filter(g => g != null);
        if (groups.length !== 2) {
            toast({ variant: "destructive", title: `Mann-Whitney U test requires exactly 2 groups, but found ${groups.length} in '${groupCol}'.` });
            return;
        }
        const params = { group_col: groupCol, value_col: valueCol, groups };

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonparametric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: 'mann_whitney', params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateMannWhitneyInterpretations(result.results, groupCol, valueCol);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
            toast({ title: 'Mann-Whitney U Test Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupCol, valueCol, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const results = analysisResult.results;
        const exportData = [{
            u_statistic: results.statistic,
            p_value: results.p_value,
            effect_size_r: results.effect_size,
            effect_magnitude: results.effect_size_interpretation.magnitude,
            decision: results.interpretation.decision,
            ...(results.group_stats ? Object.fromEntries(
                Object.entries(results.group_stats).flatMap(([group, stats]) => [
                    [`${group}_n`, stats.count],
                    [`${group}_median`, stats.median],
                    [`${group}_mean`, stats.mean],
                    [`${group}_sd`, stats.std]
                ])
            ) : {})
        }];
        
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mann_whitney_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Mann-Whitney results are being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Mann-Whitney U Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Select a group variable (2 categories) and a numeric value variable to compare
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="groupCol">Group Variable (2 categories)</Label>
                            <Select value={groupCol} onValueChange={setGroupCol}>
                                <SelectTrigger id="groupCol"><SelectValue placeholder="Select grouping variable..." /></SelectTrigger>
                                <SelectContent>
                                    {binaryCategoricalHeaders.map(h => 
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valueCol">Value Variable</Label>
                            <Select value={valueCol} onValueChange={setValueCol}>
                                <SelectTrigger id="valueCol"><SelectValue placeholder="Select numeric variable..." /></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => 
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <MannWhitneyOverview 
                        groupCol={groupCol}
                        valueCol={valueCol}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? 
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : 
                            <><Sigma className="mr-2 h-4 w-4"/>Run Analysis</>
                        }
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
                            <CardDescription>Overall Mann-Whitney U test results and significance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={results.p_value <= 0.05 ? 'default' : 'destructive'}>
                                {results.p_value <= 0.05 ? 
                                    <CheckCircle className="h-4 w-4" /> : 
                                    <AlertTriangle className="h-4 w-4" />
                                }
                                <AlertDescription>
                                    {results.p_value <= 0.05
                                        ? 'Mann-Whitney U test results show a statistically significant difference between the two groups. The rank-based test indicates that the distributions of the two groups differ significantly.'
                                        : 'Mann-Whitney U test results do not show a statistically significant difference between the two groups. The observed differences in ranks could be due to random variation.'
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
                                            {results.p_value <= 0.05 ? 
                                                <CheckCircle className="h-4 w-4 text-primary" /> : 
                                                <AlertTriangle className="h-4 w-4 text-primary" />
                                            }
                                        </div>
                                        <h3 className="font-semibold text-base">
                                            {results.p_value <= 0.05 ? 'Statistically Significant Result' : 'Not Statistically Significant'}
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
                                            <TableHead className="text-right">Min</TableHead>
                                            <TableHead className="text-right">Max</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.group_stats).map(([group, stats]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Visualization</CardTitle>
                            <CardDescription>Distribution comparison across groups</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analysisResult.plot && (
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Mann-Whitney U Test Visualization" 
                                    width={1800} 
                                    height={600} 
                                    className="w-full rounded-sm border" 
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Mann-Whitney U Test Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Mann-Whitney U Test Results</CardTitle>
                            <CardDescription>Complete test statistics and effect size measures</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>U Statistic</TableHead>
                                            <TableHead>P-value</TableHead>
                                            <TableHead>Effect Size (r)</TableHead>
                                            <TableHead>Effect Magnitude</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono">{results.statistic.toFixed(1)}</TableCell>
                                            <TableCell className="font-mono">
                                                {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                                {getSignificanceStars(results.p_value)}
                                            </TableCell>
                                            <TableCell className="font-mono">{results.effect_size.toFixed(3)}</TableCell>
                                            <TableCell>
                                                <Badge variant={results.effect_size_interpretation.magnitude === 'Large' ? 'default' : 'secondary'}>
                                                    {results.effect_size_interpretation.text}
                                                </Badge>
                                            </TableCell>
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

            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click 'Run Analysis' to perform Mann-Whitney U test.</p>
                </div>
            )}
        </div>
    );
}