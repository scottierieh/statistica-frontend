
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, LineChart, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const normalityExample = exampleDatasets.find(d => d.id === 'iris');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <CheckCircle2 size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Normality Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Check whether your data has a Gaussian (normal) distribution, a key assumption for many statistical tests.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Test for Normality?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Many parametric statistical tests, such as the t-test and ANOVA, assume that the data is normally distributed. If this assumption is violated, the results of these tests may be unreliable. Testing for normality helps you choose the appropriate statistical methods for your analysis—parametric tests for normal data and non-parametric tests for non-normal data.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Select Variables:</strong> Choose one or more numeric variables from your dataset that you want to test for normality.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will perform statistical tests (Shapiro-Wilk and Jarque-Bera) and generate visualizations (histogram and Q-Q plot) for each selected variable.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Shapiro-Wilk Test:</strong> This is a powerful test for normality, especially for smaller sample sizes. If the p-value is greater than 0.05, the data is considered normally distributed.
                                </li>
                                 <li>
                                    <strong>Histogram:</strong> For normal data, the histogram should approximate a bell shape.
                                </li>
                                <li>
                                    <strong>Q-Q Plot:</strong> For normal data, the points should fall closely along the straight red line.
                                </li>
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">Load Example Data</h3>
                        <div className="flex justify-center">
                            {normalityExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(normalityExample)}>
                                    <normalityExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{normalityExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{normalityExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
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

    useEffect(() => {
        setSelectedVars(numericHeaders);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

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
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (!canRun) {
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
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    <div className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length === 0}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Test</>}
                        </Button>
                    </div>
                </CardContent>
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
