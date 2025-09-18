

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, AlertTriangle, Lightbulb, CheckCircle, Bot, Zap } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getFrequencyInterpretation } from '@/app/actions';

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
        entropy: number;
        max_entropy: number;
    };
    insights?: Insight[];
    recommendations?: string[];
    plot: string;
    error?: string;
    aiPromise: Promise<string | null> | null;
}

interface FullAnalysisResponse {
    results: { [key: string]: VariableResult };
}

const AIGeneratedInterpretation = ({ promise }: { promise: Promise<string | null> | null }) => {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promise) {
        setInterpretation(null);
        setLoading(false);
        return;
    };
    let isMounted = true;
    setLoading(true);
    promise.then((desc) => {
        if (isMounted) {
            setInterpretation(desc);
            setLoading(false);
        }
    });
    return () => { isMounted = false; };
  }, [promise]);
  
  const formattedInterpretation = useMemo(() => {
    if (!interpretation) return null;
    return interpretation
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>');
  }, [interpretation]);


  if (loading) return <Skeleton className="h-16 w-full" />;
  if (!interpretation) return null;

  return (
     <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Bot /> AI Interpretation</h4>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation || '' }} />
    </div>
  );
};


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

            // Fire off AI interpretation requests for each variable
            const resultsWithAIPromises = { ...result.results };
            for (const variable of Object.keys(resultsWithAIPromises)) {
                const varResult = resultsWithAIPromises[variable];
                if (varResult && !varResult.error) {
                    const topCat = varResult.table[0];
                    const promise = getFrequencyInterpretation({
                        variableName: variable,
                        totalCount: varResult.summary.total_count,
                        uniqueCategories: varResult.summary.unique_categories,
                        topCategory: String(topCat.Value),
                        topCategoryFrequency: topCat.Frequency,
                        topCategoryPercentage: topCat.Percentage,
                    }).then(res => res.success ? res.interpretation ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));
                    resultsWithAIPromises[variable].aiPromise = promise;
                }
            }
            
            setAnalysisResult({ results: resultsWithAIPromises });

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
    
    const renderResults = () => {
        if (!analysisResult) return null;
        return (
            <div className="space-y-4">
                {selectedVars.map(header => {
                    if(!analysisResult.results[header] || analysisResult.results[header].error) {
                        return (
                             <Card key={header}>
                                <CardHeader><CardTitle>{header}</CardTitle></CardHeader>
                                <CardContent>
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Analysis Error</AlertTitle>
                                        <AlertDescription>{analysisResult.results[header]?.error || "An unknown error occurred."}</AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        )
                    }
                    const result = analysisResult.results[header];
                    return (
                        <Card key={header}>
                            <CardHeader>
                                <CardTitle className="font-headline">Results for: {header}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <AIGeneratedInterpretation promise={result.aiPromise} />
                                 <div className="space-y-3">
                                    {result.insights && result.insights.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
                                            {result.insights.map((insight, i) => (
                                                <Alert key={i} variant={insight.type === 'warning' ? 'destructive' : 'default'} className={insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-500' : 'bg-blue-50 border-blue-200'}>
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertTitle className="font-bold">{insight.title}</AlertTitle>
                                                    <AlertDescription dangerouslySetInnerHTML={{ __html: insight.description }} />
                                                </Alert>
                                            ))}
                                        </div>
                                    )}
                                     {result.recommendations && result.recommendations.length > 0 && (
                                        <div className="mt-4">
                                             <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                                            <Alert>
                                                <Lightbulb className="h-4 w-4" />
                                                <AlertTitle>Suggestions</AlertTitle>
                                                <AlertDescription>
                                                    <ul className="list-disc pl-4 mt-2">
                                                        {result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                                    </ul>
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                     )}
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
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {result.table.map((row, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell>{String(row.Value)}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row.Frequency}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row.Percentage.toFixed(1)}%</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div>
                                        <Image src={result.plot} alt={`Bar chart for ${header}`} width={800} height={500} className="w-full rounded-md border" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Frequency Analysis Setup</CardTitle>
                <CardDescription>Select one or more categorical variables to analyze.</CardDescription>
              </CardHeader>
              <CardContent>
                    <>
                        <Label>Categorical Variables</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {categoricalHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`var-${h}`} 
                                            onCheckedChange={(checked) => handleVarSelectionChange(h, !!checked)} 
                                            checked={selectedVars.includes(h)} 
                                        />
                                        <Label htmlFor={`var-${h}`} className="font-medium">{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </>
              </CardContent>
              <CardFooter>
                   <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length === 0}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>}
                        Run Analysis
                    </Button>
              </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Running analysis...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {analysisResult ? renderResults() : (
                 !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        <BarChart className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-2">Select variables and click 'Run Analysis' to see the frequency distribution.</p>
                    </div>
                )
            )}
        </div>
    );
}
