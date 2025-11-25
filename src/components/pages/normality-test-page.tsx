'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, LineChart, HelpCircle, MoveRight, Zap, Settings, FileSearch, BarChart, BookOpen, CheckCircle, Activity, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface NormalityTestResult {
    shapiro_wilk: {
        statistic: number;
        p_value: number;
    };
    jarque_bera: {
        statistic: number;
        p_value: number;
    };
    is_normal_shapiro: boolean;
    is_normal_jarque: boolean;
    interpretation: string;
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: { [key: string]: NormalityTestResult };
}

// Overview component with clean design
const NormalityOverview = ({ selectedVars, numericHeaders, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedVars.length === 0) {
            overview.push('Select at least one numeric variable to test');
        } else if (selectedVars.length === 1) {
            overview.push(`Testing 1 variable: ${selectedVars[0]}`);
        } else {
            overview.push(`Testing ${selectedVars.length} variables: ${selectedVars.slice(0, 3).join(', ')}${selectedVars.length > 3 ? '...' : ''}`);
        }

        // Sample size analysis
        const n = data.length;
        if (n < 3) {
            overview.push(`Sample size: ${n} observations (⚠ Too small for testing)`);
        } else if (n < 20) {
            overview.push(`Sample size: ${n} observations (⚠ Very small - results may be unreliable)`);
        } else if (n < 50) {
            overview.push(`Sample size: ${n} observations (Small - Shapiro-Wilk preferred)`);
        } else if (n < 100) {
            overview.push(`Sample size: ${n} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${n} observations (Good - both tests reliable)`);
        }

        // Check for missing values
        const missingCount = selectedVars.reduce((count: number, varName: string) => {
            return count + data.filter((row: any) => row[varName] == null || row[varName] === '').length;
        }, 0);
        
        if (missingCount > 0) {
            overview.push(`⚠ ${missingCount} missing values will be excluded`);
        }

        // Test info
        overview.push('Tests: Shapiro-Wilk (preferred for n<50) and Jarque-Bera');
        overview.push('Null hypothesis: Data follows a normal distribution');

        return overview;
    }, [selectedVars, numericHeaders, data]);

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


const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const normalityExample = exampleDatasets.find(d => d.id === 'iris');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <LineChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Normality Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Check whether your data follows a normal (Gaussian) distribution
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Statistical Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Use Shapiro-Wilk and Jarque-Bera tests to assess normality
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual Diagnostics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Examine histograms and Q-Q plots for normality patterns
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Parametric Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Validate assumptions for t-tests, ANOVA, and regression
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
                            Use normality tests before applying parametric statistical methods like t-tests, ANOVA, 
                            or linear regression. These tests assume your data follows a normal distribution. If 
                            normality is violated, consider using non-parametric alternatives or data transformations.
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
                                        <span><strong>Data type:</strong> Continuous numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 3 observations (20+ recommended)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independence:</strong> Observations should be independent</span>
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
                                        <span><strong>P-value &gt; 0.05:</strong> Data is likely normally distributed</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Q-Q plot:</strong> Points follow diagonal line for normal data</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Histogram:</strong> Should show bell-shaped curve</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {normalityExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(normalityExample)} size="lg">
                                {normalityExample.icon && <normalityExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


interface NormalityTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NormalityTestPage({ data, numericHeaders, onLoadExample }: NormalityTestPageProps) {
    const { toast } = useToast();
    const [selectedVars, setSelectedVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    useEffect(() => {
        setSelectedVars(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);
    
    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one numeric variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/normality', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Normality Test error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast]);
    
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
                        <CardTitle className="font-headline">Normality Test Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select one or more numeric variables to test for normality.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Numeric Variables</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {numericHeaders.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`norm-${header}`}
                                            checked={selectedVars.includes(header)}
                                            onCheckedChange={(checked) => handleVarSelectionChange(header, checked as boolean)}
                                        />
                                        <label htmlFor={`norm-${header}`} className="text-sm font-medium leading-none">{header}</label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    
                    {/* Overview component */}
                    <NormalityOverview 
                        selectedVars={selectedVars}
                        numericHeaders={numericHeaders}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Zap className="mr-2 h-4 w-4"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    {Object.entries(analysisResult.results).map(([variable, result]) => (
                        <Card key={variable}>
                            <CardHeader>
                                <CardTitle className="font-headline">Results for: {variable}</CardTitle>
                                {result.error && <CardDescription className="text-destructive">{result.error}</CardDescription>}
                            </CardHeader>
                            {!result.error && (
                                <CardContent className="grid lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <Alert variant={result.is_normal_shapiro ? 'default' : 'destructive'}>
                                            {result.is_normal_shapiro ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
                                            <AlertTitle>Assumption of Normality ({result.is_normal_shapiro ? "Met" : "Not Met"})</AlertTitle>
                                            <AlertDescription>{result.interpretation}</AlertDescription>
                                        </Alert>
                                        
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Test</TableHead>
                                                    <TableHead className="text-right">Statistic</TableHead>
                                                    <TableHead className="text-right">p-value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell>Shapiro-Wilk</TableCell>
                                                    <TableCell className="text-right font-mono">{result.shapiro_wilk.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{result.shapiro_wilk.p_value < 0.001 ? '<.001' : result.shapiro_wilk.p_value.toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Jarque-Bera</TableCell>
                                                    <TableCell className="text-right font-mono">{result.jarque_bera.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{result.jarque_bera.p_value < 0.001 ? '<.001' : result.jarque_bera.p_value.toFixed(4)}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div>
                                        <Image src={result.plot} alt={`Plots for ${variable}`} width={800} height={400} className="w-full rounded-md border" />
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <LineChart className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Test' to check for normality.</p>
                </div>
            )}
        </div>
    );
}