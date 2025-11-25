'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, AlertTriangle, BookOpen, Coffee, Settings, BarChart as BarChartIcon, HelpCircle, Sparkles, Grid3x3, PieChart as PieChartIcon, FileSearch, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { type DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    plot?: string; // Legacy support
    plots?: {
        histogram?: string;
        boxplot?: string;
        bar?: string;
        pie?: string;
        donut?: string;
    };
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

const metricDefinitions: Record<string, string> = {
    count: "The number of non-missing observations.",
    missing: "The number of missing (null or empty) values.",
    mean: "The arithmetic average of the data.",
    stdDev: "Standard Deviation: a measure of the amount of variation or dispersion of a set of values.",
    min: "The minimum value in the dataset.",
    q1: "The 25th percentile; 25% of data falls below this value.",
    median: "The middle value of the dataset, separating the higher half from the lower half.",
    q3: "The 75th percentile; 75% of data falls below this value.",
    max: "The maximum value in the dataset.",
    skewness: "A measure of the asymmetry of the probability distribution. A value of 0 indicates a symmetrical distribution.",
    kurtosis: "A measure of the 'tailedness' of the probability distribution. High kurtosis indicates heavy tails, or outliers.",
    unique: "The number of distinct categories in the variable.",
    mode: "The most frequently occurring value in the dataset."
};

const DescriptiveOverview = ({ selectedVars, numericHeaders, categoricalHeaders, data, groupByVar }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (selectedVars.length === 0) {
            overview.push('Select at least one variable to analyze');
        } else {
            const numericCount = selectedVars.filter((v: string) => numericHeaders.includes(v)).length;
            const categoricalCount = selectedVars.filter((v: string) => categoricalHeaders.includes(v)).length;
            
            if (numericCount > 0 && categoricalCount > 0) {
                overview.push(`Analyzing ${numericCount} numeric and ${categoricalCount} categorical variables`);
            } else if (numericCount > 0) {
                overview.push(`Analyzing ${numericCount} numeric variable${numericCount > 1 ? 's' : ''}`);
            } else {
                overview.push(`Analyzing ${categoricalCount} categorical variable${categoricalCount > 1 ? 's' : ''}`);
            }
        }

        if (groupByVar) {
            const groups = new Set(data.map((row: any) => row[groupByVar]).filter((v: any) => v != null)).size;
            overview.push(`Grouped by: ${groupByVar} (${groups} groups)`);
        } else {
            overview.push('No grouping applied (overall statistics)');
        }

        overview.push(`Total observations: ${data.length}`);
        overview.push('Generating summary statistics and visualizations');

        return overview;
    }, [selectedVars, numericHeaders, categoricalHeaders, data, groupByVar]);

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
    const irisExample = exampleDatasets.find(ex => ex.id === 'iris');
    const tipsExample = exampleDatasets.find(ex => ex.id === 'tips');

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BarChartIcon className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Descriptive Statistics</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Summarize and describe the main features of your data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Grid3x3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Central Tendency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Calculate mean, median, and mode to understand typical values
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Variability</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Measure spread with standard deviation, range, and quartiles
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <PieChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Visualize data patterns with histograms and frequency tables
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
                            Use descriptive statistics as the first step in any data analysis. It helps you understand 
                            the basic features of your dataset, identify patterns, detect outliers, and prepare for 
                            more advanced statistical tests. Essential for both numeric and categorical data.
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
                                        <span><strong>Data types:</strong> Works with numeric and categorical variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> Any size, though larger samples give clearer patterns</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Grouping:</strong> Optional - analyze by categories</span>
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
                                        <span><strong>Numeric:</strong> Mean, median for center; SD for spread</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Categorical:</strong> Frequency counts and percentages</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Charts:</strong> Visual patterns in your data</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-2">
                        {tipsExample && (
                            <Button onClick={() => onLoadExample(tipsExample)} size="lg" variant="outline">
                                <Coffee className="mr-2 h-5 w-5" />
                                Load Tips Dataset
                            </Button>
                        )}
                        {irisExample && (
                            <Button onClick={() => onLoadExample(irisExample)} size="lg">
                                {irisExample.icon && <irisExample.icon className="mr-2 h-5 w-5" />}
                                Load Iris Dataset
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const SummaryTable = ({ results, selectedVars, numericHeaders, categoricalHeaders, groupByVar }: { 
    results: FullAnalysisResponse['results'], 
    selectedVars: string[], 
    numericHeaders: string[], 
    categoricalHeaders: string[], 
    groupByVar?: string 
}) => {
    const numericVars = selectedVars.filter(v => numericHeaders.includes(v) && results[v]?.type === 'numeric' && !results[v].error);
    const categoricalVars = selectedVars.filter(v => categoricalHeaders.includes(v) && results[v]?.type === 'categorical' && !results[v].error);

    const numericMetrics: (keyof NumericStats)[] = ['count', 'mean', 'stdDev', 'min', 'q1', 'median', 'q3', 'max', 'skewness', 'kurtosis'];
    const categoricalMetrics: (keyof CategoricalStats['summary'])[] = ['count', 'unique', 'mode'];

    return (
        <div className="space-y-6">
            <TooltipProvider>
                <Card>
                    <CardHeader>
                        <CardTitle>Overall Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {numericVars.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">Numeric Variables</h3>
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
                                                <TableCell className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help border-b border-dashed border-muted-foreground">
                                                                {metric.replace(/([A-Z])/g, ' $1').replace('q1', '25th Percentile').replace('q3', '75th Percentile').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{metricDefinitions[metric]}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                {numericVars.map(v => {
                                                    const statValue = results[v]?.stats?.[metric];
                                                    return <TableCell key={`${metric}-${v}`} className="text-right font-mono">{typeof statValue === 'number' ? statValue.toFixed(2) : 'N/A'}</TableCell>
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {categoricalVars.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Categorical Variables</h3>
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
                                                <TableCell className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                             <span className="cursor-help border-b border-dashed border-muted-foreground">
                                                                {metric.replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{metricDefinitions[metric]}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                {categoricalVars.map(v => {
                                                    const statValue = (results[v] as VariableResult)?.summary?.[metric];
                                                    return <TableCell key={`${metric}-${v}`} className="text-right font-mono">{String(statValue ?? 'N/A')}</TableCell>
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TooltipProvider>

            {groupByVar && (
                <Card>
                    <CardHeader>
                        <CardTitle>Grouped Summary by '{groupByVar}'</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {numericVars.map(v => (
                            <div key={`grouped-${v}`}>
                                <h4 className="font-semibold text-lg mb-2">{v}</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{groupByVar}</TableHead>
                                            <TableHead className="text-right">Count</TableHead>
                                            <TableHead className="text-right">Mean</TableHead>
                                            <TableHead className="text-right">Std. Dev.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results[v].groupedStats || {}).map(([group, stats]) => (
                                            <TableRow key={group}>
                                                <TableCell>{group}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.count}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.mean.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{stats.stdDev.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

const AnalysisDisplay = ({ result, varName }: { result: VariableResult, varName: string }) => {
    const isNumeric = result.type === 'numeric';
    const stats = result.stats;
    
    // Check for plots
    const plots = result.plots || {};
    const legacyPlot = result.plot; // Legacy single plot field
    const hasPlots = plots && Object.keys(plots).length > 0;
    
    // Get available chart types
    const availableCharts = Object.keys(plots).filter(key => plots[key as keyof typeof plots]);
    
    // Use legacy plot if no new plots available
    const showLegacyPlot = !hasPlots && legacyPlot;
    
    // Default to first available chart
    const [activeChartTab, setActiveChartTab] = useState(availableCharts[0] || 'none');

    console.log(`Charts for ${varName}:`, {
        availableCharts,
        hasPlots,
        hasLegacyPlot: !!legacyPlot,
        showLegacyPlot
    });

    return (
        <Card>
            <CardHeader><CardTitle>{varName}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visualization Section */}
                {showLegacyPlot ? (
                    // Show legacy single plot without tabs
                    <div className="w-full">
                        <div className="w-full h-full flex items-center justify-center">
                            <Image 
                                src={`data:image/png;base64,${legacyPlot}`} 
                                alt="Distribution Chart" 
                                width={600} 
                                height={400} 
                                className="rounded-md border" 
                            />
                        </div>
                    </div>
                ) : hasPlots && availableCharts.length > 0 ? (
                    // Show new plots with tabs
                    <div className="w-full">
                        {availableCharts.length > 1 ? (
                            <Tabs value={activeChartTab} onValueChange={setActiveChartTab}>
                                <TabsList className={`grid w-full mb-4 ${
                                    availableCharts.length === 2 ? 'grid-cols-2' :
                                    availableCharts.length === 3 ? 'grid-cols-3' :
                                    availableCharts.length === 4 ? 'grid-cols-4' :
                                    'grid-cols-5'
                                }`}>
                                    {availableCharts.map(chartType => (
                                        <TabsTrigger key={chartType} value={chartType}>
                                            {chartType === 'histogram' ? 'Histogram' :
                                             chartType === 'boxplot' ? 'Box Plot' :
                                             chartType === 'bar' ? 'Bar Chart' :
                                             chartType === 'pie' ? 'Pie Chart' :
                                             chartType === 'donut' ? 'Donut Chart' :
                                             chartType.charAt(0).toUpperCase() + chartType.slice(1)}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                
                                {availableCharts.map(chartType => (
                                    <TabsContent key={chartType} value={chartType} className="mt-0">
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Image 
                                                src={`data:image/png;base64,${plots[chartType as keyof typeof plots]}`} 
                                                alt={`${chartType} chart`} 
                                                width={600} 
                                                height={400} 
                                                className="rounded-md border" 
                                            />
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        ) : (
                            // Single chart - no tabs needed
                            <div className="w-full h-full flex items-center justify-center">
                                <Image 
                                    src={`data:image/png;base64,${plots[availableCharts[0] as keyof typeof plots]}`} 
                                    alt="Chart" 
                                    width={600} 
                                    height={400} 
                                    className="rounded-md border" 
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full flex items-center justify-center p-8 border rounded-lg bg-muted/20">
                        <p className="text-muted-foreground">No visualization available</p>
                    </div>
                )}
                
                {/* Statistics and Insights Section */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                        <CardContent>
                            <TooltipProvider>
                                {isNumeric && stats ? (
                                    <Table>
                                        <TableBody>
                                            {(Object.keys(stats) as (keyof NumericStats)[]).map(key => (
                                                <TableRow key={key}>
                                                    <TableCell className="font-medium">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help">{key.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{metricDefinitions[key]}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{(stats as NumericStats)[key]?.toFixed(2) ?? 'N/A'}</TableCell>
                                                </TableRow>
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
                            </TooltipProvider>
                        </CardContent>
                    </Card>
                     {result.insights && result.insights.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                            <CardContent><ul className="space-y-2 text-sm list-disc pl-4">{result.insights.map((insight, i) => <li key={i}>{insight}</li>)}</ul></CardContent>
                        </Card>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

interface DescriptiveStatsPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DescriptiveStatisticsPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DescriptiveStatsPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedVars, setSelectedVars] = useState<string[]>(allHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [view, setView] = useState('intro');
    const [groupByVar, setGroupByVar] = useState<string | undefined>();
    const [activeTab, setActiveTab] = useState('individual');

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 0, [data, allHeaders]);

    useEffect(() => {
        setSelectedVars(allHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [allHeaders, data, canRun]);
    
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
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="font-headline">Descriptive Statistics Setup</CardTitle>
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
                
                <DescriptiveOverview 
                    selectedVars={selectedVars}
                    numericHeaders={numericHeaders}
                    categoricalHeaders={categoricalHeaders}
                    data={data}
                    groupByVar={groupByVar}
                />
              </CardContent>
              <CardFooter>
                   <Button onClick={runAnalysis} disabled={isLoading || selectedVars.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Running...</> : <><Zap className="mr-2 h-4 w-4"/>Run Analysis</>}
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
                            groupByVar={groupByVar}
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