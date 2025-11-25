'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, Layers, HelpCircle, MoveRight, Settings, FileSearch, BarChart, Activity, TrendingUp, Info, BookOpen, CheckCircle, Scale, Target } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface HomogeneityTestResult {
    levene_test: {
        statistic: number;
        p_value: number;
        df_between: number;
        df_within: number;
    };
    descriptives: {
        [group: string]: {
            n: number;
            mean: number;
            variance: number;
            std_dev: number;
        };
    };
    assumption_met: boolean;
    interpretation: string;
    plot: string;
    effect_size?: number;
    error?: string;
}

interface FullAnalysisResponse {
    results: HomogeneityTestResult;
}

// Statistical Summary Cards Component
// Overview component with clean design
const HomogeneityOverview = ({ valueVar, groupVar, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (valueVar) {
            overview.push(`Value variable: ${valueVar}`);
        } else {
            overview.push('Select a value variable to test');
        }

        if (groupVar) {
            const groups = new Set(data.map((row: any) => row[groupVar]).filter((v: any) => v != null)).size;
            overview.push(`Grouping variable: ${groupVar} with ${groups} groups`);
            
            // Check minimum samples per group
            const groupCounts = data.reduce((acc: any, row: any) => {
                const group = row[groupVar];
                if (group != null) {
                    acc[group] = (acc[group] || 0) + 1;
                }
                return acc;
            }, {});
            
            const minGroupSize = Math.min(...Object.values(groupCounts) as number[]);
            const maxGroupSize = Math.max(...Object.values(groupCounts) as number[]);
            
            if (minGroupSize < 3) {
                overview.push(`⚠ Smallest group has ${minGroupSize} observations (very small)`);
            } else if (minGroupSize < 10) {
                overview.push(`Smallest group has ${minGroupSize} observations (small)`);
            } else {
                overview.push(`Group sizes range from ${minGroupSize} to ${maxGroupSize} observations`);
            }
        } else {
            overview.push('Select a grouping variable');
        }

        // Sample size
        const n = data.length;
        if (n < 20) {
            overview.push(`Total sample size: ${n} observations (⚠ Very small)`);
        } else if (n < 50) {
            overview.push(`Total sample size: ${n} observations (Small)`);
        } else if (n < 100) {
            overview.push(`Total sample size: ${n} observations (Moderate)`);
        } else {
            overview.push(`Total sample size: ${n} observations (Good)`);
        }
        
        // Test info
        overview.push('Test: Levene\'s test for homogeneity of variances');

        return overview;
    }, [valueVar, groupVar, data]);

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

const StatisticalSummaryCards = ({ results }: { results: HomogeneityTestResult }) => {
    const getInterpretationStatus = (pValue: number) => {
        if (pValue > 0.05) return "Variances Equal";
        return "Variances Unequal";
    };

    const status = getInterpretationStatus(results.levene_test.p_value);
    const isSignificant = results.levene_test.p_value <= 0.05;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Levene's Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Levene's Statistic (F)
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.levene_test.statistic.toFixed(3)}
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
                        <p className={`text-2xl font-semibold ${isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {results.levene_test.p_value < 0.001 ? 
                                '<0.001' : 
                                results.levene_test.p_value.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">{status}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Total Sample Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Sample Size
                            </p>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {Object.values(results.descriptives).reduce((sum, group) => sum + group.n, 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {Object.keys(results.descriptives).length} Groups
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
                            {results.levene_test.df_between || Object.keys(results.descriptives).length - 1}
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
    const homogeneityExample = exampleDatasets.find(d => d.id === 'tips');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Scale className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Homogeneity of Variances</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test if variances are equal across groups using Levene's test
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Equal Variances</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Verify that groups have similar spread in their data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Robust Test</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Levene's test works well even with non-normal data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">ANOVA Assumption</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Essential check before running parametric tests
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
                            Use this test before running ANOVA or t-tests to verify that variance (spread) is similar 
                            across groups. If variances are unequal, the results of standard parametric tests may be 
                            unreliable. This test helps you choose between standard ANOVA and alternatives like 
                            Welch's ANOVA.
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
                                        <span><strong>Value variable:</strong> One continuous numeric variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Grouping variable:</strong> One categorical variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 2 observations per group</span>
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
                                        <span><strong>P &gt; 0.05:</strong> Variances are equal (assumption met)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>P ≤ 0.05:</strong> Variances differ (use Welch's test)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Box plot:</strong> Visual check of variance equality</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {homogeneityExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(homogeneityExample)} size="lg">
                                {homogeneityExample.icon && <homogeneityExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface HomogeneityTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function HomogeneityTestPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: HomogeneityTestPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [valueVar, setValueVar] = useState<string | undefined>(numericHeaders[0]);
    const [groupVar, setGroupVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setValueVar(numericHeaders[0]);
        setGroupVar(categoricalHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!valueVar || !groupVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a value and a group variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/homogeneity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, valueVar, groupVar })
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
                } catch (e) {
                    throw new Error(`Server returned non-JSON error: ${errorText}`);
                }
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Homogeneity Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, valueVar, groupVar, toast]);

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
                        <CardTitle className="font-headline">Homogeneity of Variances Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select a numeric variable and a categorical grouping variable to test if the variances are equal across groups.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Value Variable</Label>
                            <Select value={valueVar} onValueChange={setValueVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Grouping Variable</Label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <HomogeneityOverview 
                        valueVar={valueVar}
                        groupVar={groupVar}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !valueVar || !groupVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Test</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards Section */}
                    <StatisticalSummaryCards results={results} />
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Test Results & Visualization</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Alert variant={results.assumption_met ? 'default' : 'destructive'}>
                                    {results.assumption_met ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
                                    <AlertTitle>Assumption of Homogeneity {results.assumption_met ? "Met" : "Violated"}</AlertTitle>
                                    <AlertDescription>{results.interpretation}</AlertDescription>
                                </Alert>
                                
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Levene Statistic</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.statistic.toFixed(4)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>p-value</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.p_value < 0.001 ? '<.001' : results.levene_test.p_value.toFixed(4)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Degrees of Freedom (Between)</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.df_between || Object.keys(results.descriptives).length - 1}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Degrees of Freedom (Within)</TableCell>
                                            <TableCell className="font-mono text-right">{results.levene_test.df_within || Object.values(results.descriptives).reduce((sum, g) => sum + g.n, 0) - Object.keys(results.descriptives).length}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <Image src={results.plot} alt={`Box plot of ${valueVar} by ${groupVar}`} width={800} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Descriptive Statistics by Group</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Group</TableHead>
                                        <TableHead className="text-right">N</TableHead>
                                        <TableHead className="text-right">Mean</TableHead>
                                        <TableHead className="text-right">Variance</TableHead>
                                        <TableHead className="text-right">Std. Deviation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.descriptives).map(([group, stats]) => (
                                        <TableRow key={group}>
                                            <TableCell>{group}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.variance.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Test' to check for homogeneity of variances.</p>
                </div>
            )}
        </div>
    );
}
