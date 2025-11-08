
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Brain, AlertTriangle, BookOpen, Coffee, Settings, MoveRight, BarChart as BarChartIcon, HelpCircle, Sparkles, Grid3x3, PieChart as PieChartIcon, FileSearch, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { type DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import dynamic from 'next/dynamic';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

const Plot = dynamic(() => import('react-plotly.js').then(mod => mod.default), { ssr: false });

interface NumericStats {
    count: number;
    missing: number;
    mean: number;
    stdDev: number;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    skewness: number;
    kurtosis: number;
}

interface CategoricalFreqItem {
    Value: string | number;
    Frequency: number;
    Percentage: number;
}

interface CategoricalStats {
    table: CategoricalFreqItem[];
    summary: {
        count: number;
        missing: number;
        unique: number;
        mode: string | number | null;
    };
}

interface VariableResult {
    type: 'numeric' | 'categorical';
    stats?: NumericStats;
    table?: CategoricalFreqItem[];
    summary?: CategoricalStats['summary'];
    plot?: string;
    insights?: string[];
    error?: string;
    groupedStats?: { [key: string]: NumericStats };
    groupedTable?: { [key: string]: CategoricalFreqItem[] };
}

interface FullAnalysisResponse {
    results: {
        [key: string]: VariableResult;
    };
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const irisExample = exampleDatasets.find(ex => ex.id === 'iris');
    const tipsExample = exampleDatasets.find(ex => ex.id === 'tips');

    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl shadow-2xl">
                 <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">                    <CardTitle className="font-headline text-4xl font-bold">Descriptive Statistics</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Summarize and describe the main features of a collection of data. This is the first step in any data analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Descriptive Statistics?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Descriptive statistics provide a simple summary of the sample and the measures. Together with simple graphics analysis, they form the basis of virtually every quantitative analysis of data. It is the first step in understanding and interpreting your dataset before moving on to more complex analyses.
                        </p>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tipsExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => onLoadExample(tipsExample)}>
                                <Coffee className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{tipsExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{tipsExample.description}</p>
                                </div>
                            </Card>
                        )}
                        {irisExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => onLoadExample(irisExample)}>
                                <irisExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{irisExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{irisExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Upload Data:</strong> Provide a dataset in a common format like CSV or Excel.
                                </li>
                                <li>
                                    <strong>Select Variables:</strong> Choose the variables (columns) you want to analyze. The tool will automatically detect if they are numeric or categorical.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> Click the 'Run Analysis' button to generate statistics and visualizations for your selected variables.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>For Numeric Data:</strong> Look at the mean and median to understand central tendency, and the standard deviation and range to understand variability and spread.</li>
                                <li><strong>For Categorical Data:</strong> Analyze the frequency counts and percentages to see the distribution across different categories. The mode is the most common category.</li>
                                <li><strong>Visualizations:</strong> Histograms show the shape of numeric data, while bar or pie charts effectively display the proportions of categorical data.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                </CardFooter>
            </Card>
        </div>
    );
};

interface DescriptiveStatsPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}


const SummaryTable = ({ results, selectedVars, numericHeaders, categoricalHeaders }: { results: FullAnalysisResponse['results'], selectedVars: string[], numericHeaders: string[], categoricalHeaders: string[] }) => {
    const numericVars = selectedVars.filter(v => numericHeaders.includes(v) && results[v]?.type === 'numeric' && !results[v].error);
    const categoricalVars = selectedVars.filter(v => categoricalHeaders.includes(v) && results[v]?.type === 'categorical' && !results[v].error);

    const numericMetrics: (keyof NumericStats)[] = ['count', 'mean', 'stdDev', 'min', 'q1', 'median', 'q3', 'max', 'skewness'];
    const categoricalMetrics: (keyof CategoricalStats['summary'])[] = ['count', 'unique', 'mode'];

    return (
        <div className="space-y-6">
            {numericVars.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Numeric Variables Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Statistic</TableHead>
                                    {numericVars.map(v => <TableHead key={v} className="text-right">{v}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {numericMetrics.map(metric => (
                                    <TableRow key={metric}>
                                        <TableCell className="font-medium capitalize">{metric.replace(/([A-Z])/g, ' $1').trim()}</TableCell>
                                        {numericVars.map(v => {
                                            const statValue = results[v]?.stats?.[metric as keyof NumericStats];
                                            return <TableCell key={`${metric}-${v}`} className="text-right font-mono">{typeof statValue === 'number' ? statValue.toFixed(2) : 'N/A'}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
             {categoricalVars.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Categorical Variables Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Statistic</TableHead>
                                    {categoricalVars.map(v => <TableHead key={v} className="text-right">{v}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {categoricalMetrics.map(metric => (
                                    <TableRow key={metric}>
                                        <TableCell className="font-medium capitalize">{metric}</TableCell>
                                        {categoricalVars.map(v => {
                                            const statValue = (results[v] as VariableResult)?.summary?.[metric];
                                            return <TableCell key={`${metric}-${v}`} className="text-right font-mono">{String(statValue ?? 'N/A')}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

const AnalysisDisplay = ({ result, varName }: { result: VariableResult, varName: string }) => {
    const isNumeric = result.type === 'numeric';
    const stats = result.stats;

    return (
        <Card>
            <CardHeader><CardTitle>{varName}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.plot && (
                    <div className="w-full h-full flex items-center justify-center">
                        <Image src={`data:image/png;base64,${result.plot}`} alt="Distribution Plot" width={600} height={400} className="rounded-md border" />
                    </div>
                )}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                        <CardContent>
                            {isNumeric && stats ? (
                                <Table>
                                    <TableBody>
                                        {(Object.keys(stats) as (keyof NumericStats)[]).map(key => (
                                            <TableRow key={key}><TableCell className="font-medium">{key.replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + key.replace(/([A-Z])/g, ' $1').slice(1)}</TableCell><TableCell className="text-right font-mono">{(stats as NumericStats)[key]?.toFixed(2) ?? 'N/A'}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : result.table && result.summary ? (
                                <ScrollArea className="h-64">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Value</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {result.table.map((item: any, i: number) => <TableRow key={i}><TableCell>{String(item.Value)}</TableCell><TableCell className="text-right">{item.Frequency}</TableCell><TableCell className="text-right">{item.Percentage.toFixed(1)}%</TableCell></TableRow>)}
                                    </TableBody>
                                </Table>
                                </ScrollArea>
                            ) : <p>No statistics available.</p>}
                        </CardContent>
                    </Card>
                     {result.insights && result.insights.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                            <CardContent>{ <ul className="space-y-2 text-sm list-disc pl-4">{result.insights.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul> }</CardContent>
                        </Card>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function DescriptiveStatisticsPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DescriptiveStatsPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedVars, setSelectedVars] = useState<string[]>(allHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [view, setView] = useState('intro');
    const [groupByVar, setGroupByVar] = useState<string | undefined>();
    const [activeTab, setActiveTab] = useState('individual');

    useEffect(() => {
        setSelectedVars(allHeaders);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [allHeaders, data]);
    
    const handleVarSelectionChange = (varName: string, isChecked: boolean) => {
        setSelectedVars(prev => isChecked ? [...prev, varName] : prev.filter(v => v !== varName));
    };

    const runAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ title: "No Variables Selected", description: "Please select at least one variable to analyze.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/descriptive-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars, groupBy: groupByVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({title: "Analysis Complete", description: `Descriptive statistics generated for ${selectedVars.length} variable(s).`});

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message})
        } finally {
            setIsLoading(false);
        }

    }, [data, selectedVars, groupByVar, toast]);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 0, [data, allHeaders]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Descriptive Statistics Analysis</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                </div>
                <CardDescription>Select the variables you want to analyze from your dataset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Variables for Analysis</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {allHeaders.filter(h => h).map(h => (
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
                    </div>
                    <div>
                        <Label>Group By (Optional)</Label>
                        <Select value={groupByVar} onValueChange={(v) => setGroupByVar(v === 'none' ? undefined : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="None"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {categoricalHeaders.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">Select a categorical variable to see statistics for each group.</p>
                    </div>
                </div>
              </CardContent>
              <CardFooter>
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

            {analysisResult ? (
                 <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="individual">Individual Analysis</TabsTrigger>
                        <TabsTrigger value="summary">Summary Table</TabsTrigger>
                    </TabsList>
                    <TabsContent value="individual" className="mt-4 space-y-4">
                        {selectedVars.map(header => {
                            const result = analysisResult.results[header];
                            if (!result || result.error) return (
                                <Alert key={header} variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error for: {header}</AlertTitle>
                                    <AlertDescription>{result?.error || 'Unknown error'}</AlertDescription>
                                </Alert>
                            );
                            return <AnalysisDisplay key={header} result={result} varName={header} />;
                        })}
                    </TabsContent>
                    <TabsContent value="summary" className="mt-4">
                         <SummaryTable 
                            results={analysisResult.results} 
                            selectedVars={selectedVars}
                            numericHeaders={numericHeaders}
                            categoricalHeaders={categoricalHeaders}
                        />
                    </TabsContent>
                </Tabs>
            ) : (
                 !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        <BarChartIcon className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                    </div>
                )
            )}
        </div>
    );
}

