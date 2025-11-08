
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, AlertTriangle, Lightbulb, CheckCircle, Bot, Zap, HelpCircle, MoveRight, Settings, FileSearch, Handshake, TestTube, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
}

interface FullAnalysisResponse {
    results: { [key: string]: VariableResult };
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const freqExample = exampleDatasets.find(d => d.id === 'crosstab');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <CardTitle className="font-headline text-4xl font-bold">Frequency Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Examine the distribution of categorical variables to understand counts and proportions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Frequency Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Frequency analysis is one of the most fundamental methods for inspecting and understanding your data. It summarizes the distribution of a categorical variable by showing how many times each category appears. This helps in identifying the most and least common categories, spotting data entry errors, and understanding the basic composition of your sample.
                        </p>
                    </div>
                     <div className="flex justify-center">
                            {freqExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(freqExample)}>
                                    <Users className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">Demographics</h4>
                                        <p className="text-xs text-muted-foreground">Example survey data including demographic variables like region.</p>
                                    </div>
                                </Card>
                            )}
                        </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Select Variables:</strong> Choose one or more categorical variables from your dataset. The analysis works best for variables with a manageable number of distinct categories (e.g., country, product type, satisfaction level).
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> Click the 'Run Analysis' button to generate frequency tables and visualizations for all selected variables.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Frequency Table:</strong> Shows the raw count, percentage, and cumulative percentage for each category. This helps you quickly identify the most common values (the mode).
                                </li>
                                <li>
                                    <strong>Bar Chart:</strong> Provides a quick visual summary of the distribution, making it easy to compare the frequencies of different categories.
                                </li>
                                <li>
                                    <strong>Key Insights:</strong> The tool automatically highlights key findings, such as highly skewed distributions or low diversity among categories, and offers recommendations for further analysis.
                                </li>
                            </ul>
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
    const [view, setView] = useState('intro');

    useEffect(() => {
        setSelectedVars(categoricalHeaders);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, categoricalHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const runAnalysis = useCallback(async () => {
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
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message})
        } finally {
            setIsLoading(false);
        }

    }, [data, selectedVars, toast]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const renderResults = () => {
        if (!analysisResult) return null;
        return (
            <div className="space-y-8">
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
                                <div className="grid lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                         <Card>
                                            <CardHeader className="pb-2"><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
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
                                        {result.insights && result.insights.length > 0 && (
                                            <Card>
                                                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                                                <CardContent>
                                                    <ul className="space-y-2 text-sm list-disc pl-4">
                                                        {result.insights.map((insight, i) => <li key={i}>{insight.description}</li>)}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                    <div>
                                        <Image src={`data:image/png;base64,${result.plot}`} alt={`Bar chart for ${header}`} width={800} height={500} className="w-full rounded-md border" />
                                    </div>
                                </div>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-lg">Frequency Table</CardTitle></CardHeader>
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
                                                            <TableCell className="text-right">{row.Frequency}</TableCell>
                                                            <TableCell className="text-right">{row.Percentage.toFixed(1)}%</TableCell>
                                                            <TableCell className="text-right">{row['Cumulative Percentage'].toFixed(1)}%</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
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
                 <div className="flex justify-between items-center">
                    <CardTitle>Frequency Analysis Setup</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                </div>
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
              <CardFooter className="flex justify-end">
                   <Button onClick={runAnalysis} disabled={isLoading || selectedVars.length === 0}>
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
