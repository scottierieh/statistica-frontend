'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart as BarChartIcon, Settings, FileSearch, Users, Coffee, Bot, CheckCircle, XCircle, AlertTriangle, HelpCircle, Info, Lightbulb, TrendingUp, Target, Layers, BookOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '../ui/badge';

interface AnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport: (stats: any, viz: string | null) => void;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: any }) => {
    const isSignificant = results.anova.p_value <= 0.05;
    
    const getEffectSizeInterpretation = (eta_squared: number) => {
        if (eta_squared < 0.01) return "Small effect";
        if (eta_squared < 0.06) return "Medium effect";
        if (eta_squared < 0.14) return "Large effect";
        return "Very large effect";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* F-Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                F-Statistic
                            </p>
                            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.anova.f_statistic.toFixed(3)}
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
                        <p className={`text-2xl font-semibold ${isSignificant ? '' : 'text-red-600 dark:text-red-400'}`}>
                            {results.anova.p_value < 0.001 ? '<0.001' : results.anova.p_value.toFixed(4)}
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
                                Effect Size (η²)
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.anova.eta_squared.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.anova.eta_squared)}
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
                            {results.anova.df_between}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Between Groups
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'one-way-anova');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Sigma className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">One-Way ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare means across three or more independent groups
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
                                    Test differences across three or more independent groups simultaneously
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">F-Test</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Uses F-statistic to compare between-group to within-group variance
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Post-Hoc Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identifies which specific group pairs differ significantly
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
                            Use One-Way ANOVA when comparing a continuous variable across three or more categories 
                            (e.g., test scores across three schools). It checks if observed differences are statistically 
                            significant, preventing errors from multiple t-tests while controlling Type I error rate.
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
                                        <span><strong>Independent variable:</strong> Categorical with 3+ groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Dependent variable:</strong> Continuous numeric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 5 per group</span>
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
                                        <span><strong>F-statistic:</strong> Between vs within group variance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p-value:</strong> Overall significance (p &lt; 0.05)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Tukey's HSD:</strong> Pairwise group comparisons</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {anovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(anovaExample)} size="lg">
                                {anovaExample.icon && <anovaExample.icon className="mr-2 h-5 w-5" />}
                                Load Coffee Tips Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with clean design
const AnovaOverview = ({ independentVar, dependentVar, numGroups, dataLength, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (independentVar && dependentVar) {
            overview.push(`Comparing ${dependentVar} across ${numGroups} groups in ${independentVar}`);
        } else {
            overview.push('Select both independent and dependent variables');
        }

        // Group count status
        if (numGroups >= 3) {
            overview.push(`Groups detected: ${numGroups}`);
        } else if (numGroups > 0) {
            overview.push(`⚠ Only ${numGroups} groups (minimum 3 required for ANOVA)`);
        }

        // Sample size with warnings
        if (dataLength < 10) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Very small - results unreliable)`);
        } else if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Small - check assumptions)`);
        } else if (dataLength < 50) {
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
        if (data && data.length > 0 && independentVar && dependentVar) {
            const missingCount = data.filter((row: any) => 
                isMissing(row[independentVar]) || isMissing(row[dependentVar])
            ).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        // Average per group warning
        if (numGroups > 0 && dataLength > 0) {
            const avgPerGroup = Math.floor(dataLength / numGroups);
            if (avgPerGroup < 5) {
                overview.push(`⚠ Average ${avgPerGroup} observations per group (very low)`);
            } else if (avgPerGroup < 10) {
                overview.push(`Average ${avgPerGroup} observations per group (low)`);
            }
        }
        
        // Test info
        overview.push('Test type: One-Way ANOVA with Tukey\'s HSD post-hoc');

        return overview;
    }, [independentVar, dependentVar, numGroups, dataLength, data]);

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

export default function AnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onGenerateReport }: AnovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[0]);
    const [independentVar, setIndependentVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const multiGroupCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size >= 3);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0 && multiGroupCategoricalHeaders.length > 0;
    }, [data, numericHeaders, multiGroupCategoricalHeaders]);

    const numGroups = useMemo(() => {
        if (!independentVar || data.length === 0) return 0;
        return new Set(data.map(row => row[independentVar]).filter(v => v != null && v !== '')).size;
    }, [data, independentVar]);

    useEffect(() => {
        setDependentVar(numericHeaders[0] || '');
        setIndependentVar(multiGroupCategoricalHeaders[0] || categoricalHeaders[0] || '');
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, multiGroupCategoricalHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!independentVar || !dependentVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both an independent and a dependent variable.' });
            return;
        }

        const groups = new Set(data.map(row => row[independentVar]));
        if (groups.size < 3) {
            toast({ variant: 'destructive', title: 'Invalid Grouping', description: `The variable '${independentVar}' must have at least 3 distinct groups for ANOVA.` });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, independentVar, dependentVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            toast({ title: 'ANOVA Complete', description: 'Results are ready.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, independentVar, dependentVar, toast]);

    const { results, plot } = analysisResult || {};
    const significant = results?.anova?.significant;

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">One-Way ANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select an independent (categorical, 3+ groups) and a dependent (numeric) variable.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="independentVar">Independent Variable (Group)</Label>
                            <Select value={independentVar} onValueChange={setIndependentVar}>
                                <SelectTrigger id="independentVar"><SelectValue placeholder="Select grouping variable..." /></SelectTrigger>
                                <SelectContent>{multiGroupCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                            {numGroups > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    <Badge variant="outline">{numGroups} groups</Badge>
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dependentVar">Dependent Variable (Value)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger id="dependentVar"><SelectValue placeholder="Select numeric variable..." /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <AnovaOverview 
                        independentVar={independentVar}
                        dependentVar={dependentVar}
                        numGroups={numGroups}
                        dataLength={data.length}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2 h-4 w-4"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
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

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Overall ANOVA results and significance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={significant ? 'default' : 'destructive'}>
                                {significant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertDescription>
                                    {significant 
                                        ? 'ANOVA results show statistically significant differences between groups. The F-test indicates that at least one group mean differs significantly from the others.'
                                        : 'ANOVA results do not show statistically significant differences between groups. The observed differences could be due to random variation.'
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
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        {significant ? <CheckCircle className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-primary" />}
                                    </div>
                                    <h3 className="font-semibold text-base">
                                        {significant ? 'Statistically Significant Result' : 'Not Statistically Significant'}
                                    </h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\*\*/g, '<strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>') }}
                                />
                            </div>

                            {/* Key Insights */}
                            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-blue-500/10 rounded-md">
                                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Key Insights</h3>
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                        <div>
                                            <strong>F-Statistic:</strong> {results.anova.f_statistic.toFixed(3)} - This measures the ratio of between-group variance to within-group variance. {results.anova.f_statistic > 10 ? 'A large F-statistic suggests substantial differences between groups.' : results.anova.f_statistic > 3 ? 'A moderate F-statistic indicates some differences between groups.' : 'A small F-statistic suggests minimal differences between groups.'}
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                        <div>
                                            <strong>P-value:</strong> {results.anova.p_value < 0.001 ? '<0.001' : results.anova.p_value.toFixed(4)} - {significant ? 'This indicates strong evidence that at least one group mean differs significantly from the others.' : 'This suggests insufficient evidence to conclude that group means differ significantly.'}
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                        <div>
                                            <strong>Effect Size (η²):</strong> {results.anova.eta_squared.toFixed(3)} - {results.anova.eta_squared >= 0.14 ? 'A very large effect size, indicating that group membership explains a substantial proportion of the variance.' : results.anova.eta_squared >= 0.06 ? 'A large effect size, showing that group membership explains a considerable amount of variance.' : results.anova.eta_squared >= 0.01 ? 'A medium effect size, suggesting moderate practical significance.' : 'A small effect size, indicating limited practical significance despite potential statistical significance.'}
                                        </div>
                                    </li>
                                    {results.post_hoc_tukey && results.post_hoc_tukey.length > 0 && (
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                            <div>
                                                <strong>Post-Hoc Tests:</strong> {(() => {
                                                    const significantPairs = results.post_hoc_tukey.filter((t: any) => t.reject === true || t.reject === 'True');
                                                    return significantPairs.length > 0 
                                                        ? `${significantPairs.length} of ${results.post_hoc_tukey.length} pairwise comparisons show significant differences. This identifies which specific groups differ from each other.`
                                                        : 'No pairwise comparisons reached statistical significance, suggesting differences may be subtle or inconsistent across group pairs.';
                                                })()}
                                            </div>
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-500/10 rounded-md">
                                        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Recommendations</h3>
                                </div>
                                <ul className="space-y-3">
                                    {significant ? (
                                        <>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Examine the post-hoc tests to identify which specific pairs of groups differ significantly</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Check the assumption tests to ensure the validity of your results - violations may require alternative approaches like Welch's ANOVA or non-parametric tests</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Consider the effect size (η²) alongside statistical significance to assess practical importance</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Visualize your data to identify patterns and potential outliers that might influence results</div>
                                            </li>
                                        </>
                                    ) : (
                                        <>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Consider whether your sample size is adequate for detecting the effect size of interest (insufficient statistical power)</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Examine whether groups are appropriately defined - high within-group variability may be masking between-group differences</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Check for outliers that might inflate error variance and reduce test sensitivity</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Use alternative analyses if assumptions are violated (e.g., Kruskal-Wallis test for non-normal data)</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Consider collecting more data if the true effect size is expected to be meaningful</div>
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={plot} 
                                alt="ANOVA Visualization" 
                                width={1500} 
                                height={1200} 
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
                                            <TableHead className="text-right">Std. Dev</TableHead>
                                            <TableHead className="text-right">SE</TableHead>
                                            <TableHead className="text-right">Min</TableHead>
                                            <TableHead className="text-right">Max</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.descriptives).map(([group, stats]: [string, any]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.se.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.min.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.max.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* ANOVA Table */}
                    {results.anova.ssb !== undefined && (
                        <Card>
                            <CardHeader>
                                <CardTitle>ANOVA Table</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Source</TableHead>
                                            <TableHead className="text-right">Sum of Squares</TableHead>
                                            <TableHead className="text-right">df</TableHead>
                                            <TableHead className="text-right">Mean Square</TableHead>
                                            <TableHead className="text-right">F</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Between Groups</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.ssb.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.df_between}</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.msb.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.f_statistic.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.anova.p_value < 0.001 ? '<.001' : results.anova.p_value.toFixed(3)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Within Groups</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.ssw.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.df_within}</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.msw.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">—</TableCell>
                                            <TableCell className="text-right font-mono">—</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Total</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.sst.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.anova.df_total}</TableCell>
                                            <TableCell className="text-right font-mono">—</TableCell>
                                            <TableCell className="text-right font-mono">—</TableCell>
                                            <TableCell className="text-right font-mono">—</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Post-Hoc Tests */}
                    {results.post_hoc_tukey && results.post_hoc_tukey.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Post-Hoc Tests (Tukey's HSD)</CardTitle>
                                <CardDescription>
                                    Pairwise comparisons to identify which specific groups differ significantly.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group 1</TableHead>
                                            <TableHead>Group 2</TableHead>
                                            <TableHead className="text-right">Mean Diff</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">Significant</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.post_hoc_tukey.map((test: any, idx: number) => {
                                            const significant = test.reject === true || test.reject === 'True';
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{test.group1}</TableCell>
                                                    <TableCell className="font-medium">{test.group2}</TableCell>
                                                    <TableCell className="text-right font-mono">{parseFloat(test.meandiff).toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {test.p_adj < 0.001 ? '<.001' : parseFloat(test.p_adj).toFixed(3)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {significant ? (
                                                            <Badge variant="default">Yes</Badge>
                                                        ) : (
                                                            <Badge variant="outline">No</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Assumption Checks */}
                    {results.assumptions && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Assumption Checks</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Normality Test */}
                                {results.assumptions.normality && (
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
                                                {Object.entries(results.assumptions.normality).map(([group, test]: [string, any]) => (
                                                    <TableRow key={group}>
                                                        <TableCell className="font-medium">{group}</TableCell>
                                                        <TableCell className="font-mono text-right">
                                                            {test.statistic != null ? test.statistic.toFixed(4) : 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-right">
                                                            {test.p_value != null ? (test.p_value < 0.001 ? '<.001' : test.p_value.toFixed(4)) : 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {test.normal === true ? (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Met
                                                                </Badge>
                                                            ) : test.normal === false ? (
                                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Not Met
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline">N/A</Badge>
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

                                {/* Homogeneity of Variance */}
                                {results.assumptions.homogeneity && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Homogeneity of Variance (Levene's Test)</h4>
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
                                                    <TableCell className="font-mono">
                                                        {results.assumptions.homogeneity.levene_statistic != null 
                                                            ? results.assumptions.homogeneity.levene_statistic.toFixed(4) 
                                                            : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-right">
                                                        {results.assumptions.homogeneity.levene_p_value != null 
                                                            ? (results.assumptions.homogeneity.levene_p_value < 0.001 
                                                                ? '<.001' 
                                                                : results.assumptions.homogeneity.levene_p_value.toFixed(4))
                                                            : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {results.assumptions.homogeneity.equal_variances === true ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                Met
                                                            </Badge>
                                                        ) : results.assumptions.homogeneity.equal_variances === false ? (
                                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Not Met
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline">N/A</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            * p &gt; 0.05 suggests equal variances across groups (assumption met)
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
                    <p className="mt-2">Select variables and click 'Run Analysis' to perform ANOVA.</p>
                </div>
            )}
        </div>
    );
}
