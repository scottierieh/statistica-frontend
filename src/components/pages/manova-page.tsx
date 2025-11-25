'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sigma, Loader2, Users, FileSearch, Settings, HelpCircle, Layers, TrendingUp, Target, BarChart, CheckCircle, AlertTriangle, BookOpen, Activity, Grid3x3 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface TestStatistic {
    statistic: number;
    F: number;
    df1: number;
    df2: number;
    p_value: number;
}

interface ManovaResults {
    factor: string;
    test_statistics: {
        pillai: TestStatistic;
        wilks: TestStatistic;
        hotelling: TestStatistic;
        roy: TestStatistic;
    };
    univariate_results: {
        [dv: string]: {
            f_statistic: number;
            p_value: number;
            eta_squared: number;
            significant: boolean;
        };
    };
    significant: boolean;
    interpretation?: string;
    n_dropped?: number;
    dropped_rows?: number[];
}

interface FullAnalysisResponse {
    results: ManovaResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: ManovaResults }) => {
    const pillaiPValue = results.test_statistics.pillai.p_value;
    const isSignificant = pillaiPValue <= 0.05;
    const significantUnivariate = Object.values(results.univariate_results).filter(r => r.significant).length;
    
    const getEffectSizeInterpretation = (statistic: number) => {
        // For Pillai's trace
        if (statistic >= 0.5) return 'Large effect';
        if (statistic >= 0.3) return 'Medium effect';
        if (statistic >= 0.1) return 'Small effect';
        return 'Negligible';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillai's Trace Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Pillai's Trace
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.test_statistics.pillai.statistic.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.test_statistics.pillai.statistic)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* P-value Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                P-value (Pillai)
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {pillaiPValue < 0.001 ? '<0.001' : pillaiPValue.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isSignificant ? 'Significant' : 'Not Significant'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* F-Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                F-Statistic
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.test_statistics.pillai.F.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            df({results.test_statistics.pillai.df1}, {results.test_statistics.pillai.df2})
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Significant DVs Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Significant DVs
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {significantUnivariate} / {Object.keys(results.univariate_results).length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Variables affected
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with clean design and missing data detection
const ManovaOverview = ({ dependentVars, factorVar, data, numericHeaders }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (dependentVars.length === 0) {
            overview.push('Select at least 2 dependent variables');
        } else if (dependentVars.length === 1) {
            overview.push('⚠ Only 1 dependent variable selected (need at least 2)');
        } else {
            overview.push(`Testing ${dependentVars.length} dependent variables: ${dependentVars.slice(0, 3).join(', ')}${dependentVars.length > 3 ? '...' : ''}`);
        }

        if (factorVar) {
            const groups = new Set(data.map((row: any) => row[factorVar]).filter((v: any) => v != null && v !== '')).size;
            overview.push(`Factor: ${factorVar} with ${groups} groups`);
        } else {
            overview.push('Select a factor (grouping) variable');
        }

        // Sample size warnings
        const n = data.length;
        const minSamplePerGroup = factorVar ? 
            Math.floor(n / new Set(data.map((row: any) => row[factorVar]).filter((v: any) => v != null && v !== '')).size) : 0;
        
        if (n < 20) {
            overview.push(`Sample size: ${n} observations (⚠ Very small for MANOVA)`);
        } else if (n < 40) {
            overview.push(`Sample size: ${n} observations (⚠ Small - check assumptions)`);
        } else if (n < 60) {
            overview.push(`Sample size: ${n} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${n} observations (Good)`);
        }

        // Sample per group check
        if (minSamplePerGroup > 0 && minSamplePerGroup < dependentVars.length + 1) {
            overview.push(`⚠ Average ${minSamplePerGroup} per group (should exceed number of DVs)`);
        }
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Missing value check
        if (data && data.length > 0 && dependentVars.length > 0 && factorVar) {
            const allVars = [...dependentVars, factorVar];
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
        overview.push('Test type: One-Way MANOVA with multivariate test statistics');

        return overview;
    }, [dependentVars, factorVar, data]);

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
    const manovaExample = exampleDatasets.find(d => d.id === 'manova-groups');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">MANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Multivariate Analysis of Variance - Test group differences across multiple outcomes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Grid3x3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Outcomes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test differences across two or more dependent variables simultaneously
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Correlation Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Accounts for correlations between dependent variables
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Type I Error Control</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reduces false positives compared to multiple ANOVAs
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
                            Use MANOVA to test if groups differ across multiple dependent variables. It's more powerful 
                            than separate ANOVAs because it accounts for correlations between outcomes and controls 
                            Type I error rate. For example, compare teaching methods on both test scores and completion 
                            times simultaneously.
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
                                        <span><strong>Dependent variables:</strong> Two or more continuous</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Factor:</strong> One categorical grouping variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> More cases than DVs per group</span>
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
                                        <span><strong>Multivariate tests:</strong> Overall group difference</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Pillai's Trace:</strong> Robust multivariate statistic</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Univariate tests:</strong> Which DVs differ</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {manovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(manovaExample)} size="lg">
                                {manovaExample.icon && <manovaExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ManovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ManovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: ManovaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVars, setDependentVars] = useState<string[]>([]);
    const [factorVar, setFactorVar] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setDependentVars(numericHeaders.slice(0, 2));
        setFactorVar(categoricalHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleDepVarChange = (header: string, checked: boolean) => {
        setDependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (dependentVars.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two dependent variables.' });
            return;
        }
        if (!factorVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a factor variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/manova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVars, factorVars: [factorVar] })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('MANOVA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVars, factorVar, toast]);
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">MANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select two or more dependent variables and one factor (grouping variable).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Dependent Variables (Select 2+)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {numericHeaders.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`dv-${h}`} checked={dependentVars.includes(h)} onCheckedChange={(c) => handleDepVarChange(h, c as boolean)} />
                                            <Label htmlFor={`dv-${h}`}>{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div>
                            <Label>Factor (Grouping Variable)</Label>
                            <Select value={factorVar} onValueChange={setFactorVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <ManovaOverview 
                        dependentVars={dependentVars}
                        factorVar={factorVar}
                        data={data}
                        numericHeaders={numericHeaders}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || dependentVars.length < 2 || !factorVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
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
                    
                    {/* Detailed Analysis */}
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
                                            
                                            let icon = FileSearch;
                                            if (title.includes('Overall Analysis')) icon = Grid3x3;
                                            else if (title.includes('Statistical Insights')) icon = BarChart;
                                            else if (title.includes('Recommendations')) icon = TrendingUp;
                                            
                                            currentSection = { title, content: [], icon };
                                            sections.push(currentSection);
                                        } else if (currentSection) {
                                            currentSection.content.push(trimmed);
                                        } else {
                                            currentSection = { title: 'Analysis Overview', content: [trimmed], icon: FileSearch };
                                            sections.push(currentSection);
                                        }
                                    });
                                    
                                    return sections.map((section, idx) => {
                                        const Icon = section.icon;
                                        
                                        // Different gradient styles for different sections
                                        let gradientClass = '';
                                        let borderClass = '';
                                        let iconBgClass = '';
                                        let iconColorClass = '';
                                        let bulletColorClass = '';
                                        
                                        if (idx === 0) {
                                            // First section (Overall Analysis) - primary gradient
                                            gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                                            borderClass = 'border-primary/40';
                                            iconBgClass = 'bg-primary/10';
                                            iconColorClass = 'text-primary';
                                            bulletColorClass = 'text-primary';
                                        } else if (section.title.includes('Statistical Insights')) {
                                            // Statistical Insights section - blue gradient
                                            gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                                            borderClass = 'border-blue-300 dark:border-blue-700';
                                            iconBgClass = 'bg-blue-500/10';
                                            iconColorClass = 'text-blue-600 dark:text-blue-400';
                                            bulletColorClass = 'text-blue-600 dark:text-blue-400';
                                        } else {
                                            // Recommendations section - amber gradient
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
                                                                    <span>{text.substring(1).trim()}</span>
                                                                </div>
                                                            );
                                                        } else if (text.startsWith('•')) {
                                                            return (
                                                                <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                                    <span className={`${bulletColorClass} font-bold mt-0.5`}>•</span>
                                                                    <span>{text.substring(1).trim()}</span>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <p key={textIdx} className="text-sm text-foreground/80 leading-relaxed">
                                                                {text}
                                                            </p>
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

                    {/* Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visualization</CardTitle>
                            <CardDescription>Multivariate analysis plots</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={analysisResult.plot} 
                                alt="MANOVA visualization" 
                                width={1500} 
                                height={1200} 
                                className="w-3/4 mx-auto rounded-sm border"
                            />
                        </CardContent>
                    </Card>
                    
                    {/* Multivariate Test Statistics Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Multivariate Test Statistics</CardTitle>
                            <CardDescription>Overall tests for differences between groups across all dependent variables</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Test</TableHead>
                                        <TableHead className="text-right">Statistic</TableHead>
                                        <TableHead className="text-right">F-value</TableHead>
                                        <TableHead className="text-right">df1</TableHead>
                                        <TableHead className="text-right">df2</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.test_statistics).map(([name, stat]) => (
                                        <TableRow key={name}>
                                            <TableCell className="font-medium">
                                                {name.charAt(0).toUpperCase() + name.slice(1)}'s {name === 'wilks' ? 'Lambda' : name === 'roy' ? 'Largest Root' : 'Trace'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{stat.statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{stat.F.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{stat.df1}</TableCell>
                                            <TableCell className="text-right font-mono">{stat.df2}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {stat.p_value < 0.001 ? '<.001' : stat.p_value.toFixed(4)} {getSignificanceStars(stat.p_value)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className='text-sm text-muted-foreground'>
                                Pillai's Trace is generally recommended for robustness. *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                            </p>
                        </CardFooter>
                    </Card>
                    
                    {/* Univariate ANOVA Results */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Univariate Follow-up Tests (ANOVA)</CardTitle>
                            <CardDescription>Individual ANOVA test for each dependent variable</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dependent Variable</TableHead>
                                        <TableHead className="text-right">F-value</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">η²</TableHead>
                                        <TableHead className="text-right">Significant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.univariate_results).map(([dv, res]) => (
                                        <TableRow key={dv} className={res.significant ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                            <TableCell className="font-medium">{dv}</TableCell>
                                            <TableCell className="text-right font-mono">{res.f_statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {res.p_value < 0.001 ? '<.001' : res.p_value.toFixed(4)} {getSignificanceStars(res.p_value)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{res.eta_squared.toFixed(4)}</TableCell>
                                            <TableCell className="text-right">
                                                {res.significant ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
                                Significant results highlighted in blue. η²: Eta-squared (effect size)
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Analysis' to perform MANOVA.</p>
                </div>
            )}
        </div>
    );
}

