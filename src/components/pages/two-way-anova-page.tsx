'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, AlertCircle, Loader2, Copy, Users, Settings, FileSearch, BarChart as BarChartIcon, HelpCircle, MoveRight, TrendingUp, Target, Layers, CheckCircle, AlertTriangle, Lightbulb, BookOpen, Activity } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';

interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    MS: number;
    F: number;
    'p-value': number;
    'η²p': number;
}

interface MarginalMeansRow {
    [key: string]: string | number;
    mean: number;
    std: number;
    sem: number;
    count: number;
}

interface NormalityResult {
    statistic: number | null;
    p_value: number | null;
    normal: boolean | null;
}

interface AssumptionResult {
    test: string;
    statistic: number;
    p_value: number;
    assumption_met: boolean;
}

interface PostHocResult {
    group1: string;
    group2: string;
    meandiff: number;
    p_adj: number;
    lower: number;
    upper: number;
    reject: boolean;
}

interface SimpleMainEffect {
    effect: string;
    factor_varied: string;
    factor_fixed: string;
    fixed_level: string;
    f_statistic: number;
    p_value: number;
    eta_squared: number;
    significant: boolean;
}

interface TwoWayAnovaResults {
    anova_table: AnovaRow[];
    descriptive_stats_table: { [key: string]: { [key: string]: number } };
    marginal_means: {
        factor_a: MarginalMeansRow[];
        factor_b: MarginalMeansRow[];
    };
    assumptions: {
        normality: { [key: string]: NormalityResult };
        homogeneity: AssumptionResult;
    };
    posthoc_results?: PostHocResult[];
    simple_main_effects?: SimpleMainEffect[];
    interpretation: string;
    dropped_rows?: number[];
    n_dropped?: number;
    n_used?: number;
    n_original?: number;
}

interface FullAnalysisResponse {
    results: TwoWayAnovaResults;
    plot: string; // base64 image string
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: TwoWayAnovaResults }) => {
    const interactionRow = results.anova_table.find(row => row.Source.includes('*'));
    const factorARow = results.anova_table.find(row => !row.Source.includes('*') && !row.Source.includes('Residuals'));
    const factorBRow = results.anova_table.find(row => !row.Source.includes('*') && !row.Source.includes('Residuals') && row !== factorARow);
    
    const isInteractionSignificant = interactionRow && interactionRow['p-value'] <= 0.05;
    
    const getEffectSizeInterpretation = (eta_squared: number) => {
        if (eta_squared >= 0.14) return 'Large effect';
        if (eta_squared >= 0.06) return 'Medium effect';
        if (eta_squared >= 0.01) return 'Small effect';
        return 'Negligible';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Interaction Effect Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Interaction Effect
                            </p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${interactionRow && !isInteractionSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {interactionRow ? (interactionRow['p-value'] < 0.001 ? '<0.001' : interactionRow['p-value'].toFixed(4)) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {interactionRow ? (isInteractionSignificant ? 'Significant' : 'Not Significant') : 'Not available'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Main Effect A Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Main Effect A
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${factorARow && factorARow['p-value'] > 0.05 ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {factorARow ? (factorARow['p-value'] < 0.001 ? '<0.001' : factorARow['p-value'].toFixed(4)) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            F = {factorARow ? factorARow.F.toFixed(2) : 'N/A'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Main Effect B Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Main Effect B
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${factorBRow && factorBRow['p-value'] > 0.05 ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {factorBRow ? (factorBRow['p-value'] < 0.001 ? '<0.001' : factorBRow['p-value'].toFixed(4)) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            F = {factorBRow ? factorBRow.F.toFixed(2) : 'N/A'}
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
                                Effect Size (η²p)
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {interactionRow ? interactionRow['η²p'].toFixed(3) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {interactionRow ? getEffectSizeInterpretation(interactionRow['η²p']) : 'Interaction'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with missing data display
const TwoWayAnovaOverview = ({ dependentVar, factorA, factorB, data, results }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (dependentVar && factorA && factorB) {
            if (factorA === factorB) {
                overview.push('⚠ Factor A and Factor B must be different');
            } else {
                overview.push(`Analyzing ${dependentVar} by ${factorA} and ${factorB}`);
            }
        } else {
            overview.push('Select dependent variable and two factors');
        }

        // Factor levels and cell sizes
        if (factorA && factorB && data.length > 0 && factorA !== factorB) {
            const levelsA = new Set(data.map((row: any) => row[factorA]).filter((v: any) => v != null)).size;
            const levelsB = new Set(data.map((row: any) => row[factorB]).filter((v: any) => v != null)).size;
            overview.push(`Factor A levels: ${levelsA}, Factor B levels: ${levelsB}`);
            
            // Check cell sizes
            const totalCells = levelsA * levelsB;
            if (totalCells > 0) {
                const avgPerCell = Math.floor(data.length / totalCells);
                if (avgPerCell < 3) {
                    overview.push(`⚠ Average ${avgPerCell} observations per cell (very low)`);
                } else if (avgPerCell < 5) {
                    overview.push(`⚠ Average ${avgPerCell} observations per cell (low)`);
                } else {
                    overview.push(`Average ${avgPerCell} observations per cell`);
                }
            }
        }

        // Missing data information
        if (results && results.n_dropped !== undefined && results.n_dropped > 0) {
            overview.push(`⚠ ${results.n_dropped} row(s) with missing data excluded`);
            overview.push(`Used ${results.n_used} of ${results.n_original} observations`);
            if (results.dropped_rows && results.dropped_rows.length > 0) {
                const droppedList = results.dropped_rows.slice(0, 10).map((r: number) => `#${r + 1}`).join(', ');
                const moreText = results.dropped_rows.length > 10 ? ` and ${results.dropped_rows.length - 10} more` : '';
                overview.push(`Dropped rows: ${droppedList}${moreText}`);
            }
        } else if (results && results.n_dropped === 0) {
            overview.push(`✓ No missing data - using all ${results.n_original} observations`);
        } else {
            // Before analysis, check for missing data
            const originalSize = data.length;
            if (dependentVar && factorA && factorB) {
                const cleanCount = data.filter((row: any) => 
                    row[dependentVar] != null && row[factorA] != null && row[factorB] != null
                ).length;
                const missingCount = originalSize - cleanCount;
                
                if (missingCount > 0) {
                    overview.push(`⚠ Detected ${missingCount} row(s) with missing values`);
                } else {
                    // Sample size
                    if (originalSize < 20) {
                        overview.push(`Sample size: ${originalSize} observations (⚠ Very small for 2-way ANOVA)`);
                    } else if (originalSize < 40) {
                        overview.push(`Sample size: ${originalSize} observations (⚠ Small - check assumptions)`);
                    } else if (originalSize < 60) {
                        overview.push(`Sample size: ${originalSize} observations (Moderate)`);
                    } else {
                        overview.push(`Sample size: ${originalSize} observations (Good)`);
                    }
                }
            } else {
                // Can't check - variables not selected yet
                if (originalSize < 20) {
                    overview.push(`Sample size: ${originalSize} observations (⚠ Very small for 2-way ANOVA)`);
                } else if (originalSize < 40) {
                    overview.push(`Sample size: ${originalSize} observations (⚠ Small - check assumptions)`);
                } else if (originalSize < 60) {
                    overview.push(`Sample size: ${originalSize} observations (Moderate)`);
                } else {
                    overview.push(`Sample size: ${originalSize} observations (Good)`);
                }
            }
        }
        
        // Test info
        overview.push('Test type: Two-Way ANOVA with interaction effects');

        return overview;
    }, [dependentVar, factorA, factorB, data, results]);

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'two-way-anova');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Two-Way ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Examine effects of two factors and their interaction on a continuous outcome
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Two Factors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Analyze effects of two independent categorical variables simultaneously
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interaction Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Discover if the effect of one factor depends on the other
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Main Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test overall effect of each factor across all levels
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
                            Use Two-Way ANOVA to test effects of two categorical factors on a continuous outcome. 
                            It reveals not only main effects but also interaction effects, where the impact of one 
                            factor depends on the level of the other. This provides deeper insights than separate 
                            one-way tests.
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
                                        <span><strong>Dependent variable:</strong> Continuous numeric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Two factors:</strong> Different categorical variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cell size:</strong> At least 3 per combination</span>
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
                                        <span><strong>Main effects:</strong> Overall factor impact</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Interaction:</strong> Non-parallel line patterns</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>η²p:</strong> Proportion of variance explained</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {anovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(anovaExample)} size="lg">
                                {anovaExample.icon && <anovaExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface TwoWayAnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TwoWayAnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: TwoWayAnovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState(numericHeaders[0]);
    const [factorA, setFactorA] = useState(categoricalHeaders[0]);
    const [factorB, setFactorB] = useState(categoricalHeaders.length > 1 ? categoricalHeaders[1] : undefined);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 2;
    }, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setDependentVar(numericHeaders[0] || '');
        setFactorA(categoricalHeaders[0] || '');
        setFactorB(categoricalHeaders[1] || '');
        setAnalysisResponse(null);
        setView(canRun ? 'main' : 'intro');
    }, [categoricalHeaders, numericHeaders, data, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorA || !factorB) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a dependent variable and two factor variables.'});
            return;
        };
        if (factorA === factorB) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Factor A and Factor B must be different variables.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResponse(null);
        
        try {
            const response = await fetch('/api/analysis/two-way-anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorA, factorB })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: FullAnalysisResponse = await response.json();
             if ((result as any).error) {
                throw new Error((result as any).error);
            }
            setAnalysisResponse(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'ANOVA Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResponse(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorA, factorB, toast]);

    const availableFactorB = useMemo(() => categoricalHeaders.filter(h => h !== factorA), [categoricalHeaders, factorA]);
    
    const results = analysisResponse?.results;
    const interactionRow = results?.anova_table.find(row => row.Source.includes('*'));
    const factorARow = results?.anova_table.find(row => !row.Source.includes('*') && !row.Source.includes('Residuals'));
    const factorBRow = results?.anova_table.find(row => !row.Source.includes('*') && !row.Source.includes('Residuals') && row !== factorARow);
    const isInteractionSignificant = interactionRow && interactionRow['p-value'] <= 0.05;
    const interactionPValue = interactionRow?.['p-value'];

    const descriptiveTable = useMemo(() => {
        if (!results?.descriptive_stats_table) return null;
        const data = results.descriptive_stats_table;
        const rowLabels = Object.keys(data.mean);
        const colLabels = Object.keys(data.mean[rowLabels[0]]);
        return {
            rowLabels,
            colLabels,
            data
        };
    }, [results]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Two-Way ANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select a dependent variable (numeric) and two factor variables (categorical), then click 'Run Analysis'.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Dependent Variable</label>
                            <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Factor A</label>
                            <Select value={factorA} onValueChange={setFactorA}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Factor B</label>
                            <Select value={factorB} onValueChange={setFactorB} disabled={availableFactorB.length === 0}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableFactorB.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                    
                    {/* Overview component with results for missing data display */}
                    <TwoWayAnovaOverview 
                        dependentVar={dependentVar}
                        factorA={factorA}
                        factorB={factorB}
                        data={data}
                        results={results}
                    />
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || !factorA || !factorB || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResponse && results ? (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />
                    
                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Overall Two-Way ANOVA results and significance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={interactionPValue !== undefined && interactionPValue <= 0.05 ? 'default' : 'destructive'}>
                                {interactionPValue !== undefined && interactionPValue <= 0.05 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertDescription>
                                    {interactionPValue !== undefined && interactionPValue <= 0.05
                                        ? 'Two-Way ANOVA results show a statistically significant interaction effect. The effect of one factor depends on the level of the other factor.'
                                        : 'Two-Way ANOVA results do not show a statistically significant interaction effect. Main effects can be interpreted independently.'
                                    }
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
                                        {interactionPValue !== undefined && interactionPValue <= 0.05 ? <CheckCircle className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-primary" />}
                                    </div>
                                    <h3 className="font-semibold text-base">
                                        {interactionPValue !== undefined && interactionPValue <= 0.05 ? 'Significant Interaction Effect' : 'Main Effects Analysis'}
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
                                        <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Key Insights</h3>
                                </div>
                                <ul className="space-y-3">
                                    {/* Interaction Effect */}
                                    {interactionRow && (
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                            <div>
                                                <strong>Interaction Effect ({factorA} × {factorB}):</strong> F = {interactionRow.F.toFixed(2)}, p = {interactionRow['p-value'] < 0.001 ? '<0.001' : interactionRow['p-value'].toFixed(4)}, η²p = {interactionRow['η²p'].toFixed(3)}. {isInteractionSignificant ? 'The interaction is statistically significant, meaning the effect of one factor depends on the level of the other factor. This is the most important finding.' : 'No significant interaction detected. Main effects can be interpreted independently without considering how factors combine.'}
                                            </div>
                                        </li>
                                    )}
                                    
                                    {/* Main Effect A */}
                                    {factorARow && (
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                            <div>
                                                <strong>Main Effect of {factorA}:</strong> F = {factorARow.F.toFixed(2)}, p = {factorARow['p-value'] < 0.001 ? '<0.001' : factorARow['p-value'].toFixed(4)}, η²p = {factorARow['η²p'].toFixed(3)}. {factorARow['p-value'] <= 0.05 ? `There is a significant main effect of ${factorA}. Different levels of this factor produce different outcomes on average.` : `No significant main effect of ${factorA} was detected.`}
                                            </div>
                                        </li>
                                    )}
                                    
                                    {/* Main Effect B */}
                                    {factorBRow && (
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                            <div>
                                                <strong>Main Effect of {factorB}:</strong> F = {factorBRow.F.toFixed(2)}, p = {factorBRow['p-value'] < 0.001 ? '<0.001' : factorBRow['p-value'].toFixed(4)}, η²p = {factorBRow['η²p'].toFixed(3)}. {factorBRow['p-value'] <= 0.05 ? `There is a significant main effect of ${factorB}. Different levels of this factor produce different outcomes on average.` : `No significant main effect of ${factorB} was detected.`}
                                            </div>
                                        </li>
                                    )}
                                    
                                    {/* Effect Size Interpretation */}
                                    {interactionRow && (
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                            <div>
                                                <strong>Effect Size Interpretation:</strong> The partial eta-squared (η²p) for the interaction is {interactionRow['η²p'].toFixed(3)}, which represents {(interactionRow['η²p'] * 100).toFixed(1)}% of the variance explained. {interactionRow['η²p'] >= 0.14 ? 'This is a large effect size, indicating substantial practical significance.' : interactionRow['η²p'] >= 0.06 ? 'This is a medium effect size, suggesting moderate practical importance.' : interactionRow['η²p'] >= 0.01 ? 'This is a small effect size, indicating limited but detectable practical significance.' : 'This is a negligible effect size, suggesting minimal practical importance despite statistical significance.'}
                                            </div>
                                        </li>
                                    )}
                                    
                                    {/* Simple Main Effects */}
                                    {results.simple_main_effects && results.simple_main_effects.length > 0 && (
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                            <div>
                                                <strong>Simple Main Effects:</strong> {(() => {
                                                    const significantEffects = results.simple_main_effects.filter((e: any) => e.significant);
                                                    return significantEffects.length > 0 
                                                        ? `${significantEffects.length} of ${results.simple_main_effects.length} simple main effects are significant. These show how one factor's effect varies at specific levels of the other factor.`
                                                        : 'No simple main effects reached statistical significance, suggesting uniform effects across factor levels.';
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
                                    {isInteractionSignificant ? (
                                        <>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Focus on interpreting the interaction effect rather than main effects alone, as the effect of one factor depends on the other</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Examine the interaction plot carefully to understand how the factors combine to influence the outcome</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Review simple main effects to determine at which levels of one factor the other factor has a significant effect</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Use post-hoc tests to identify specific group combinations that differ significantly</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Check assumption tests (normality and homogeneity) to ensure result validity</div>
                                            </li>
                                        </>
                                    ) : (
                                        <>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Focus on interpreting main effects independently since no interaction was detected</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Examine marginal means to understand the overall effect of each factor across all levels of the other</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>If main effects are non-significant, consider whether sample size is adequate or if factors truly have no effect</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Review assumption tests and consider alternative analyses if assumptions are violated (e.g., non-parametric tests)</div>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div>Consider practical significance alongside statistical significance using effect size measures (η²p)</div>
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
                            <CardDescription>Interaction plot, distributions, and diagnostic plots</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={analysisResponse.plot} 
                                alt="Two-Way ANOVA Plots" 
                                width={1400} 
                                height={1200} 
                                className="w-3/4 mx-auto rounded-sm border"
                            />
                        </CardContent>
                    </Card>

                    {/* ANOVA Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>ANOVA Table</CardTitle>
                            <CardDescription>Complete analysis of variance results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">SS</TableHead>
                                        <TableHead className="text-right">df</TableHead>
                                        <TableHead className="text-right">MS</TableHead>
                                        <TableHead className="text-right">F</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">η²p</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, index) => (
                                        <TableRow key={index} className={row.Source.includes('Residuals') ? 'bg-muted/30' : ''}>
                                            <TableCell className="font-medium">{row.Source}</TableCell>
                                            <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.df}</TableCell>
                                            <TableCell className="text-right font-mono">{row.MS?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">{row.F?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {row['p-value'] !== null && row['p-value'] !== undefined ? (
                                                    <>
                                                        {row['p-value'] < 0.001 ? '<.001' : row['p-value'].toFixed(4)}
                                                        {getSignificanceStars(row['p-value'])}
                                                    </>
                                                ) : ''}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{row['η²p']?.toFixed(3) ?? ''}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className='text-sm text-muted-foreground'>
                                SS: Sum of Squares, df: Degrees of Freedom, MS: Mean Square, η²p: Partial Eta-Squared | *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                            </p>
                        </CardFooter>
                    </Card>

                    {/* Marginal Means */}
                    {results.marginal_means && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Marginal Means</CardTitle>
                                <CardDescription>Average effects across each factor with 95% confidence intervals</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Factor A Marginal Means */}
                                <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                        {factorA} (Marginal Means)
                                    </h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Level</TableHead>
                                                <TableHead className="text-right">Marginal Mean</TableHead>
                                                <TableHead className="text-right">Lower (95% CI)</TableHead>
                                                <TableHead className="text-right">Upper (95% CI)</TableHead>
                                                <TableHead className="text-right">SE</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.marginal_means.factor_a.map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{row.group}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.mean?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.lower?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.upper?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.sem?.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Factor B Marginal Means */}
                                <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                        {factorB} (Marginal Means)
                                    </h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Level</TableHead>
                                                <TableHead className="text-right">Marginal Mean</TableHead>
                                                <TableHead className="text-right">Lower (95% CI)</TableHead>
                                                <TableHead className="text-right">Upper (95% CI)</TableHead>
                                                <TableHead className="text-right">SE</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.marginal_means.factor_b.map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{row.group}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.mean?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.lower?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.upper?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.sem?.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <p className='text-sm text-muted-foreground'>
                                    Lower and Upper represent 95% confidence interval bounds. SE: Standard Error of the Mean
                                </p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Simple Main Effects */}
                    {results.simple_main_effects && results.simple_main_effects.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Simple Main Effects</CardTitle>
                                <CardDescription>Effect of one factor at each level of the other factor</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Effect</TableHead>
                                            <TableHead className="text-right">F-statistic</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">η²</TableHead>
                                            <TableHead className="text-right">Significant</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.simple_main_effects.map((effect, index) => (
                                            <TableRow key={index} className={effect.significant ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                <TableCell className="font-medium">{effect.effect}</TableCell>
                                                <TableCell className="text-right font-mono">{effect.f_statistic?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {effect.p_value < 0.001 ? '<.001' : effect.p_value?.toFixed(4)}
                                                    {effect.p_value < 0.05 ? (effect.p_value < 0.01 ? (effect.p_value < 0.001 ? '***' : '**') : '*') : ''}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{effect.eta_squared?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right">
                                                    {effect.significant ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">No</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className='text-sm text-muted-foreground'>
                                    Simple main effects test the effect of one factor at specific levels of the other factor. Significant effects highlighted in blue.
                                </p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Assumptions Testing */}
                    {results.assumptions && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Assumption Tests</CardTitle>
                                <CardDescription>Normality and homogeneity of variance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Normality Tests */}
                                <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-primary" />
                                        Normality Tests (Shapiro-Wilk)
                                    </h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Group</TableHead>
                                                <TableHead className="text-right">Statistic</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">Result</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.assumptions.normality).map(([group, test]: [string, any]) => (
                                                <TableRow key={group}>
                                                    <TableCell className="font-medium">{group}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {test.statistic !== null ? test.statistic.toFixed(4) : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {test.p_value !== null ? (
                                                            test.p_value < 0.001 ? '<.001' : test.p_value.toFixed(4)
                                                        ) : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {test.normal === null ? (
                                                            <Badge variant="outline">Insufficient data</Badge>
                                                        ) : test.normal ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Normal
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                                Non-normal
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        p &gt; 0.05 suggests data is normally distributed
                                    </p>
                                </div>

                                {/* Homogeneity Test */}
                                <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <Target className="h-4 w-4 text-primary" />
                                        Homogeneity of Variance (Levene's Test)
                                    </h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Test</TableHead>
                                                <TableHead className="text-right">F</TableHead>
                                                <TableHead className="text-right">df1</TableHead>
                                                <TableHead className="text-right">df2</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">Assumption Met</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Levene's Test</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.assumptions.homogeneity.f_statistic !== null && results.assumptions.homogeneity.f_statistic !== undefined && !isNaN(results.assumptions.homogeneity.f_statistic)
                                                        ? results.assumptions.homogeneity.f_statistic.toFixed(4) 
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.assumptions.homogeneity.df1 !== null && results.assumptions.homogeneity.df1 !== undefined && !isNaN(results.assumptions.homogeneity.df1)
                                                        ? results.assumptions.homogeneity.df1 
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.assumptions.homogeneity.df2 !== null && results.assumptions.homogeneity.df2 !== undefined && !isNaN(results.assumptions.homogeneity.df2)
                                                        ? results.assumptions.homogeneity.df2 
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.assumptions.homogeneity.p_value !== null && results.assumptions.homogeneity.p_value !== undefined && !isNaN(results.assumptions.homogeneity.p_value) ? (
                                                        results.assumptions.homogeneity.p_value < 0.001 ? '<.001' : results.assumptions.homogeneity.p_value.toFixed(4)
                                                    ) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {results.assumptions.homogeneity.assumption_met === null ? (
                                                        <Badge variant="outline">Unknown</Badge>
                                                    ) : results.assumptions.homogeneity.assumption_met ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            No
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        F-statistic with df1 (between groups) and df2 (within groups) degrees of freedom. p &gt; 0.05 suggests equal variances across groups
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Post-hoc Tests */}
                    {results.posthoc_results && results.posthoc_results.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Post-hoc Analysis (Tukey HSD)</CardTitle>
                                <CardDescription>Pairwise comparisons between group combinations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group 1</TableHead>
                                            <TableHead>Group 2</TableHead>
                                            <TableHead className="text-right">Mean Diff</TableHead>
                                            <TableHead className="text-right">p-adj</TableHead>
                                            <TableHead className="text-right">95% CI Lower</TableHead>
                                            <TableHead className="text-right">95% CI Upper</TableHead>
                                            <TableHead className="text-right">Significant</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.posthoc_results.map((row, index) => (
                                            <TableRow key={index} className={row.reject ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                <TableCell className="font-medium">{row.group1}</TableCell>
                                                <TableCell className="font-medium">{row.group2}</TableCell>
                                                <TableCell className="text-right font-mono">{row.meandiff?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {row.p_adj < 0.001 ? '<.001' : row.p_adj?.toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{row.lower?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.upper?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right">
                                                    {row.reject ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">No</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className='text-sm text-muted-foreground'>
                                    Tukey's HSD controls family-wise error rate. Significant differences highlighted in blue.
                                </p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Descriptive Statistics */}
                    {descriptiveTable && (
                        <Card>
                             <CardHeader>
                                <CardTitle>Descriptive Statistics</CardTitle>
                                <CardDescription>Mean (±SD) for each combination of factors</CardDescription>
                             </CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{factorA} / {factorB}</TableHead>
                                            {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(col => 
                                                <TableHead key={col} className="text-center">{col}</TableHead>
                                            )}
                                            <TableHead className="text-right font-medium">Row Mean</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {descriptiveTable.rowLabels.filter(r => r !== 'Column Mean').map(rowLabel => (
                                            <TableRow key={rowLabel}>
                                                <TableCell className="font-medium">{rowLabel}</TableCell>
                                                {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(colLabel => (
                                                    <TableCell key={colLabel} className="text-center font-mono">
                                                        {descriptiveTable.data.mean[rowLabel][colLabel]?.toFixed(2)} 
                                                        <span className="text-muted-foreground text-xs">
                                                            {' '}(±{descriptiveTable.data.std[rowLabel][colLabel]?.toFixed(2)})
                                                        </span>
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-mono">
                                                    {descriptiveTable.data.mean[rowLabel]['Row Mean']?.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                         <TableRow className="font-medium bg-muted/50">
                                            <TableCell>Column Mean</TableCell>
                                            {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(colLabel => (
                                                <TableCell key={colLabel} className="text-center font-mono">
                                                    {descriptiveTable.data.mean['Column Mean'][colLabel]?.toFixed(2)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-mono">
                                                {descriptiveTable.data.mean['Column Mean']['Row Mean']?.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                 !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        <Layers className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                    </div>
                )
            )}
        </div>
    );
}