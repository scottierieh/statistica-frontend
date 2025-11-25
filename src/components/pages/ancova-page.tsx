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
import { Sigma, Loader2, AlertTriangle, Layers, Settings, FileSearch, HelpCircle, BookOpen, TrendingUp, Target, CheckCircle, BarChart3, Activity, Filter, Info, Grid3x3 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';

interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    F: number;
    'p-value': number;
    'η²p': number;
}

interface AssumptionResult {
    met: boolean;
    p_value: number;
    statistic: number;
}

interface AncovaResults {
    anova_table: AnovaRow[];
    assumptions: {
        normality: AssumptionResult;
        homogeneity: AssumptionResult;
    };
    interpretation: string;
    n_dropped?: number;
    dropped_rows?: number[];
    adjusted_means?: {
        [group: string]: {
            adjusted_mean: number;
            se: number;
            n: number;
        };
    };
    covariate_means?: {
        [covariate: string]: number;
    };
    covariate_info?: {
        [covariate: string]: {
            coefficient: number;
            std_err: number;
            t_value: number;
            p_value: number;
        };
    };
    r_squared?: number;
    adj_r_squared?: number;
}

interface FullAnalysisResponse {
    results: AncovaResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: AncovaResults }) => {
    const factorRow = results.anova_table.find(row => !row.Source.includes('Residuals') && !row.Source.includes(':'));
    const covariateRows = results.anova_table.filter(row => 
        !row.Source.includes('Residuals') && 
        !row.Source.includes(':') && 
        row !== factorRow
    );
    
    const getEffectSizeInterpretation = (eta_squared: number) => {
        if (eta_squared >= 0.14) return 'Large effect';
        if (eta_squared >= 0.06) return 'Medium effect';
        if (eta_squared >= 0.01) return 'Small effect';
        return 'Negligible';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Main Effect Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Main Effect
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${factorRow && factorRow['p-value'] > 0.05 ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {factorRow ? (factorRow['p-value'] < 0.001 ? '<0.001' : factorRow['p-value'].toFixed(4)) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {factorRow ? (factorRow['p-value'] <= 0.05 ? 'Significant' : 'Not Significant') : 'Not available'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Covariate Effect Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Covariate Effect
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${covariateRows.length > 0 && covariateRows[0]['p-value'] > 0.05 ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {covariateRows.length > 0 ? (covariateRows[0]['p-value'] < 0.001 ? '<0.001' : covariateRows[0]['p-value'].toFixed(4)) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {covariateRows.length > 0 ? `${covariateRows.length} covariate${covariateRows.length > 1 ? 's' : ''}` : 'No covariates'}
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
                            {factorRow ? factorRow['η²p'].toFixed(3) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {factorRow ? getEffectSizeInterpretation(factorRow['η²p']) : 'Main effect'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Assumptions Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Assumptions
                            </p>
                            {results.assumptions.normality.met && results.assumptions.homogeneity.met ? 
                                <CheckCircle className="h-4 w-4 text-green-600" /> : 
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.assumptions.normality.met && results.assumptions.homogeneity.met ? 'Met' : 'Check'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {!results.assumptions.normality.met ? 'Normality issue' : 
                             !results.assumptions.homogeneity.met ? 'Homogeneity issue' : 'All passed'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with clean design and missing value check
const AncovaOverview = ({ dependentVar, factorVar, covariateVars, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (dependentVar && factorVar && covariateVars.length > 0) {
            overview.push(`Analyzing ${dependentVar} by ${factorVar} with ${covariateVars.length} covariate${covariateVars.length > 1 ? 's' : ''}`);
        } else {
            overview.push('Select dependent variable, factor, and at least one covariate');
        }

        // Factor levels
        if (factorVar && data.length > 0) {
            const levels = new Set(data.map((row: any) => row[factorVar]).filter((v: any) => v != null && v !== '')).size;
            overview.push(`Factor levels: ${levels} groups`);
            
            if (levels < 2) {
                overview.push('⚠ Need at least 2 groups for ANCOVA');
            } else if (levels > 10) {
                overview.push('⚠ Many groups - consider if all are necessary');
            }
        }

        // Covariate info
        if (covariateVars.length > 0) {
            overview.push(`Covariates: ${covariateVars.join(', ')}`);
            if (covariateVars.length > 3) {
                overview.push('⚠ Many covariates may reduce power');
            }
        }

        // Sample size with warnings
        if (data.length < 20) {
            overview.push(`Sample size: ${data.length} observations (⚠ Very small for ANCOVA)`);
        } else if (data.length < 50) {
            overview.push(`Sample size: ${data.length} observations (⚠ Small - check assumptions carefully)`);
        } else if (data.length < 100) {
            overview.push(`Sample size: ${data.length} observations (Moderate)`);
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
        if (data && data.length > 0 && dependentVar && factorVar && covariateVars.length > 0) {
            const allVars = [dependentVar, factorVar, ...covariateVars];
            const missingCount = data.filter((row: any) => 
                allVars.some(varName => isMissing(row[varName]))
            ).length;
            const validCount = data.length - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        // Test info
        overview.push('Test type: ANCOVA (Analysis of Covariance)');
        overview.push('Controls for continuous covariates while testing group differences');

        return overview;
    }, [dependentVar, factorVar, covariateVars, data]);

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
    const ancovaExample = exampleDatasets.find(d => d.id === 'manova-groups');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">ANCOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Analysis of Covariance - Control for continuous variables while testing group differences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Filter className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Statistical Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Remove effects of covariates to reveal true group differences
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Increased Power</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reduce error variance by accounting for continuous predictors
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Confound Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Eliminate confounding variables for clearer conclusions
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
                            Use ANCOVA to test group differences on a continuous outcome while controlling for other 
                            continuous variables (covariates). It increases statistical power by reducing within-group 
                            error variance and helps eliminate confounding variables. For example, compare test scores 
                            across teaching methods while controlling for students' prior knowledge.
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
                                        <span><strong>Dependent variable:</strong> Continuous outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Factor:</strong> Categorical grouping variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Covariates:</strong> One or more continuous predictors</span>
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
                                        <span><strong>Main effect:</strong> Group differences after adjustment</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Covariate effect:</strong> Predictor significance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>η²p:</strong> Variance explained after control</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {ancovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(ancovaExample)} size="lg">
                                {ancovaExample.icon && <ancovaExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface AncovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function AncovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: AncovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[0]);
    const [factorVar, setFactorVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [covariateVars, setCovariateVars] = useState<string[]>([numericHeaders[1]]);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1;
    }, [data, numericHeaders, categoricalHeaders]);

    useEffect(() => {
        setDependentVar(numericHeaders.find(h => h.toLowerCase().includes('score')) || numericHeaders[0]);
        setFactorVar(categoricalHeaders[0]);
        const initialCovariates = numericHeaders.filter(h => h !== (numericHeaders.find(h => h.toLowerCase().includes('score')) || numericHeaders[0]));
        setCovariateVars(initialCovariates.length > 0 ? [initialCovariates[0]] : []);
        setAnalysisResponse(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleCovariateChange = (header: string, checked: boolean) => {
        setCovariateVars(prev => 
            checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorVar || covariateVars.length === 0) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a dependent variable, a factor, and at least one covariate.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResponse(null);

        try {
            const response = await fetch('/api/analysis/ancova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorVar, covariateVars })
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
            toast({variant: 'destructive', title: 'ANCOVA Analysis Error', description: e.message || 'An unexpected error occurred.'})
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorVar, covariateVars, toast]);

    const availableNumeric = useMemo(() => {
        const selected = new Set([dependentVar, factorVar]);
        return numericHeaders.filter(h => !selected.has(h));
    }, [numericHeaders, dependentVar, factorVar]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResponse?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">ANCOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select your dependent variable, factor (grouping variable), and one or more covariates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Dependent Variable</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Factor</Label>
                            <Select value={factorVar} onValueChange={setFactorVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                             <Label>Covariate(s)</Label>
                             <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {availableNumeric.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`cov-${h}`} checked={covariateVars.includes(h)} onCheckedChange={(c) => handleCovariateChange(h, c as boolean)} />
                                            <Label htmlFor={`cov-${h}`}>{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <AncovaOverview 
                        dependentVar={dependentVar}
                        factorVar={factorVar}
                        covariateVars={covariateVars}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || !factorVar || covariateVars.length === 0 || isLoading}>
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

                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />
                    
                    {/* Detailed Analysis - EXACTLY like mediation/MANOVA */}
                    {results.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {(() => {
                                    const interpretation = results.interpretation;
                                    const sections: { title: string; content: string[]; icon: any }[] = [];
                                    
                                    const lines = interpretation.split('\n').filter(l => l.trim());
                                    let currentSection: typeof sections[0] | null = null;
                                    
                                    lines.forEach((line) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) return;
                                        
                                        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                                            const title = trimmed.replace(/\*\*/g, '').trim();
                                            
                                            let icon = Grid3x3;
                                            if (title.includes('Overall Analysis')) icon = Grid3x3;
                                            else if (title.includes('Statistical Insights')) icon = Info;
                                            else if (title.includes('Recommendations')) icon = TrendingUp;
                                            
                                            currentSection = { title, content: [], icon };
                                            sections.push(currentSection);
                                        } else if (currentSection) {
                                            currentSection.content.push(trimmed);
                                        } else {
                                            currentSection = { title: 'Analysis Overview', content: [trimmed], icon: Grid3x3 };
                                            sections.push(currentSection);
                                        }
                                    });
                                    
                                    return sections.map((section, idx) => {
                                        const Icon = section.icon;
                                        
                                        let gradientClass = '';
                                        let borderClass = '';
                                        let iconBgClass = '';
                                        let iconColorClass = '';
                                        let bulletColorClass = '';
                                        
                                        if (idx === 0) {
                                            gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                                            borderClass = 'border-primary/40';
                                            iconBgClass = 'bg-primary/10';
                                            iconColorClass = 'text-primary';
                                            bulletColorClass = 'text-primary';
                                        } else if (section.title.includes('Statistical Insights')) {
                                            gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                                            borderClass = 'border-blue-300 dark:border-blue-700';
                                            iconBgClass = 'bg-blue-500/10';
                                            iconColorClass = 'text-blue-600 dark:text-blue-400';
                                            bulletColorClass = 'text-blue-600 dark:text-blue-400';
                                        } else {
                                            gradientClass = 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10';
                                            borderClass = 'border-amber-300 dark:border-amber-700';
                                            iconBgClass = 'bg-amber-500/10';
                                            iconColorClass = 'text-amber-600 dark:text-amber-400';
                                            bulletColorClass = 'text-amber-600 dark:text-amber-400';
                                        }
                                        
                                        return (
                                            <div key={idx} className={`${gradientClass} rounded-lg p-6 border ${borderClass}`}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className={`p-2 ${iconBgClass} rounded-md`}>
                                                        <Icon className={`h-4 w-4 ${iconColorClass}`} />
                                                    </div>
                                                    <h3 className="font-semibold text-base">{section.title}</h3>
                                                </div>
                                                <div className="space-y-3">
                                                    {section.content.map((text, textIdx) => {
                                                        if (text.startsWith('→')) {
                                                            return (
                                                                <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                                    <span className={`${bulletColorClass} font-bold mt-0.5`}>→</span>
                                                                    <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim() }} />
                                                                </div>
                                                            );
                                                        } else if (text.startsWith('•')) {
                                                            return (
                                                                <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                                    <span className={`${bulletColorClass} font-bold mt-0.5`}>•</span>
                                                                    <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim() }} />
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <p key={textIdx} className="text-sm text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </CardContent>
                        </Card>
                    )}

                    {/* Adjusted Means Table */}
                    {results.adjusted_means && Object.keys(results.adjusted_means).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Adjusted Means (Estimated Marginal Means)</CardTitle>
                                <CardDescription>
                                    Group means after controlling for {covariateVars.join(', ')}
                                    {results.covariate_means && ` at mean value${Object.keys(results.covariate_means).length > 1 ? 's' : ''}: ${Object.entries(results.covariate_means).map(([k, v]) => `${k} = ${v.toFixed(2)}`).join(', ')}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group</TableHead>
                                            <TableHead className="text-right">Adjusted Mean</TableHead>
                                            <TableHead className="text-right">Standard Error</TableHead>
                                            <TableHead className="text-right">Sample Size</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.adjusted_means).map(([group, values]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{values.adjusted_mean.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{values.se.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{values.n}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">
                                    Adjusted means represent the expected outcome for each group if all groups had identical covariate values.
                                </p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Covariate Analysis */}
                    {results.covariate_info && Object.keys(results.covariate_info).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Covariate Analysis</CardTitle>
                                <CardDescription>
                                    Regression coefficients showing how covariates predict the dependent variable
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Covariate</TableHead>
                                            <TableHead className="text-right">Coefficient (b)</TableHead>
                                            <TableHead className="text-right">Std. Error</TableHead>
                                            <TableHead className="text-right">t-value</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.covariate_info).map(([covariate, info]) => (
                                            <TableRow key={covariate}>
                                                <TableCell className="font-medium">{covariate}</TableCell>
                                                <TableCell className="text-right font-mono">{info.coefficient.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{info.std_err.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{info.t_value.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {info.p_value < 0.001 ? '<.001' : info.p_value.toFixed(4)}
                                                    {info.p_value < 0.05 && ' *'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {results.r_squared !== undefined && (
                                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                                        <p className="text-sm">
                                            <strong>Model Fit:</strong> R² = {results.r_squared.toFixed(3)} 
                                            {results.adj_r_squared !== undefined && ` (Adjusted R² = ${results.adj_r_squared.toFixed(3)})`}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            The model explains {(results.r_squared * 100).toFixed(1)}% of the variance in {dependentVar}.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">
                                    The coefficient (b) represents the change in {dependentVar} for each 1-unit increase in the covariate.
                                </p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Visualization */}
                    {analysisResponse.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Visualization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResponse.plot} 
                                    alt="ANCOVA Visualization" 
                                    width={1400} 
                                    height={600} 
                                    className="w-full rounded-md border"
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Complete ANCOVA Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>ANCOVA Table</CardTitle>
                            <CardDescription>Complete analysis of covariance results</CardDescription>
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
                                        <TableHead className="text-right">η²p</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, index) => {
                                        const ms = row.sum_sq && row.df ? row.sum_sq / row.df : null;
                                        return (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{row.Source}</TableCell>
                                                <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.df}</TableCell>
                                                <TableCell className="text-right font-mono">{ms ? ms.toFixed(3) : '—'}</TableCell>
                                                <TableCell className="text-right font-mono">{row.F?.toFixed(3) ?? '—'}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {row['p-value'] ? (row['p-value'] < 0.001 ? '<.001' : row['p-value'].toFixed(4)) : '—'} 
                                                    {getSignificanceStars(row['p-value'])}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{row['η²p'] ? row['η²p'].toFixed(3) : '—'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-2">
                            <p className='text-sm text-muted-foreground'>
                                η²p: Partial Eta-Squared (Effect Size) | Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                            </p>
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2">
                                <p className="font-semibold mb-1">Understanding the Sources:</p>
                                <ul className="space-y-1 ml-4">
                                    <li><strong>Between Groups:</strong> Variance due to differences between group means (main effect of factor)</li>
                                    <li><strong>Covariate:</strong> Variance explained by the continuous predictor variable</li>
                                    <li><strong>Interaction:</strong> Tests if the covariate's effect differs across groups (homogeneity of slopes)</li>
                                    <li><strong>Within Groups (Error):</strong> Residual variance not explained by the model</li>
                                </ul>
                            </div>
                        </CardFooter>
                    </Card>

                    {/* Assumptions Check */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Assumption Checks</CardTitle>
                            <CardDescription>Statistical assumptions for ANCOVA validity</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Normality Test */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Normality of Residuals (Shapiro-Wilk Test)</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Test</TableHead>
                                            <TableHead className="text-right">Statistic</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">Assumption</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Shapiro-Wilk</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.assumptions.normality.statistic != null ? results.assumptions.normality.statistic.toFixed(4) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.assumptions.normality.p_value != null ? (results.assumptions.normality.p_value < 0.001 ? '<.001' : results.assumptions.normality.p_value.toFixed(4)) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {results.assumptions.normality.met === true ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Met
                                                    </Badge>
                                                ) : results.assumptions.normality.met === false ? (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
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
                                    * p &gt; 0.05 suggests residuals are normally distributed (assumption met)
                                </p>
                            </div>

                            {/* Homogeneity of Variance */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Homogeneity of Variances (Levene's Test)</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Test</TableHead>
                                            <TableHead className="text-right">Statistic</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">Assumption</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Levene's Test</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.assumptions.homogeneity.statistic != null 
                                                    ? results.assumptions.homogeneity.statistic.toFixed(4) 
                                                    : 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.assumptions.homogeneity.p_value != null 
                                                    ? (results.assumptions.homogeneity.p_value < 0.001 
                                                        ? '<.001' 
                                                        : results.assumptions.homogeneity.p_value.toFixed(4))
                                                    : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {results.assumptions.homogeneity.met === true ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Met
                                                    </Badge>
                                                ) : results.assumptions.homogeneity.met === false ? (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
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
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                {(!results.assumptions.normality.met || !results.assumptions.homogeneity.met) ?
                                    '⚠ One or more assumptions violated. Results should be interpreted with caution. Consider transforming data or using non-parametric alternatives.' :
                                    '✓ All assumptions met. Results are reliable.'}
                            </p>
                        </CardFooter>
                    </Card>
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

