
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface FrequencyTableItem {
    Value: string | number;
    Frequency: number;
    Percentage: number;
    'Cumulative Percentage': number;
}

interface Insight {
    type: 'warning' | 'info';
    title: string;
    description: string;
}

interface VariableResult {
    table: FrequencyTableItem[];
    summary: {
        total_count: number;
        unique_categories: number;
        mode: string | number;
    };
    insights: Insight[];
    recommendations: string[];
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: { [key: string]: VariableResult };
}

interface FrequencyAnalysisPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function FrequencyAnalysisPage({ data, categoricalHeaders, onLoadExample }: FrequencyAnalysisPageProps) {
    const { toast } = useToast();
    const [selectedVars, setSelectedVars] = useState<string[]>(categoricalHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedVars(categoricalHeaders);
        setAnalysisResult(null);
    }, [data, categoricalHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one categorical variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/frequency', {
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
            console.error('Frequency Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast]);

    if (!canRun) {
        const freqExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('frequency'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Frequency Analysis</CardTitle>
                        <CardDescription>
                           To perform a frequency analysis, you need data with at least one categorical variable. Try one of our example datasets.
                        </CardDescription>
                    </CardHeader>
                    {freqExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {freqExamples.map((ex) => {
                                    const Icon = ex.icon;
                                    return (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <Icon className="h-6 w-6 text-secondary-foreground" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                                <CardDescription className="text-xs">{ex.description}</CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardFooter>
                                            <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                                Load this data
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                    )
                                })}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Frequency Analysis Setup</CardTitle>
                    <CardDescription>Select one or more categorical variables to analyze.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label>Categorical Variables</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {categoricalHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`freq-${header}`}
                                  checked={selectedVars.includes(header)}
                                  onCheckedChange={(checked) => handleVarSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`freq-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
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
                                <CardContent className="space-y-6">
                                     <div className="space-y-3">
                                        {result.insights.map((insight, i) => (
                                            <Alert key={i} variant={insight.type === 'warning' ? 'destructive' : 'default'} className={insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-500' : 'bg-blue-50 border-blue-200'}>
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle className="font-bold">{insight.title}</AlertTitle>
                                                <AlertDescription dangerouslySetInnerHTML={{ __html: insight.description }} />
                                            </Alert>
                                        ))}
                                    </div>
                                    <div className="grid lg:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                             <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-lg">Summary</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                        <dt className="text-muted-foreground">Total Count</dt>
                                                        <dd className="font-mono">{result.summary.total_count}</dd>
                                                        <dt className="text-muted-foreground">Unique Categories</dt>
                                                        <dd className="font-mono">{result.summary.unique_categories}</dd>
                                                        <dt className="text-muted-foreground">Mode</dt>
                                                        <dd className="font-mono">{String(result.summary.mode)}</dd>
                                                    </dl>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-lg flex items-center gap-2"><Lightbulb />Recommendations</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                                                        {result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                                        <li>Always consider the context and purpose of your analysis when interpreting results.</li>
                                                        <li>Visual inspection often provides better insight than statistics alone.</li>
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        </div>
                                        <div>
                                            <Image src={result.plot} alt={`Bar chart for ${variable}`} width={800} height={500} className="w-full rounded-md border" />
                                        </div>
                                    </div>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">Frequency Table</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-64">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Value</TableHead>
                                                            <TableHead className="text-right">Frequency</TableHead>
                                                            <TableHead className="text-right">%</TableHead>
                                                            <TableHead className="text-right">Cumulative %</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {result.table.map((row, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell>{String(row.Value)}</TableCell>
                                                                <TableCell className="text-right font-mono">{row.Frequency}</TableCell>
                                                                <TableCell className="text-right font-mono">{row.Percentage.toFixed(1)}%</TableCell>
                                                                <TableCell className="text-right font-mono">{row['Cumulative Percentage'].toFixed(1)}%</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

             {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the frequency distribution.</p>
                </div>
            )}
        </div>
    );
}
