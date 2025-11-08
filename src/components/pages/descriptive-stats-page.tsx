

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Brain, AlertTriangle, BookOpen, Coffee, Settings, MoveRight, BarChart as BarChartIcon, HelpCircle, Sparkles, Grid3x3, PieChart as PieChartIcon, FileSearch } from 'lucide-react';
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


const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// --- Statistical Helper Functions ---
const getQuantile = (arr: number[], q: number) => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
};

const getNumericStats = (data: (number | undefined | null)[]) => {
    const cleanData = data.filter((val): val is number => typeof val === 'number' && isFinite(val));
    if (cleanData.length === 0) return { count: 0, missing: data.length, mean: NaN, stdDev: NaN, min: NaN, q1: NaN, median: NaN, q3: NaN, max: NaN, mode: NaN, skewness: NaN };
    
    const sortedData = [...cleanData].sort((a, b) => a - b);
    const sum = cleanData.reduce((acc, val) => acc + val, 0);
    const meanVal = sum / cleanData.length;
    const stdDevVal = Math.sqrt(cleanData.reduce((acc, val) => acc + (val - meanVal) ** 2, 0) / (cleanData.length > 1 ? cleanData.length - 1 : 1));

    const q1 = getQuantile(sortedData, 0.25);
    const medianVal = getQuantile(sortedData, 0.5);
    const q3 = getQuantile(sortedData, 0.75);

    const counts: { [key: string]: number } = {};
    cleanData.forEach(val => {
      const key = String(val);
      counts[key] = (counts[key] || 0) + 1;
    });
    let modeVal: number | null = null;
    let maxCount = 0;
    Object.entries(counts).forEach(([val, count]) => {
      if (count > maxCount) {
        maxCount = count;
        modeVal = parseFloat(val);
      }
    });

    const n = cleanData.length;
    const skew = n > 2 && stdDevVal > 0 ? (n / ((n - 1) * (n - 2))) * cleanData.reduce((acc, val) => acc + Math.pow((val - meanVal) / stdDevVal, 3), 0) : NaN;


    return {
        count: n, missing: data.length - n, mean: meanVal, stdDev: stdDevVal, min: sortedData[0], q1, median: medianVal, q3, max: sortedData[n - 1], mode: modeVal, skewness: skew,
    };
};

const getCategoricalStats = (data: (string | number)[]) => {
    if (data.length === 0) return [];
    const counts: { [key: string]: number } = {};
    let validCount = 0;
    data.forEach(val => {
        if(val === null || val === undefined || val === '') return;
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
        validCount++;
    });

    return Object.entries(counts)
        .map(([value, count]) => ({ name: value, count, percentage: ((count / validCount) * 100) }))
        .sort((a, b) => b.count - a.count);
};

const generateNumericInsights = (stats: ReturnType<typeof getNumericStats>) => {
    const insights: string[] = [];
    if (isNaN(stats.mean)) return ["Not enough data for insights."];

    const skewness = stats.skewness;
    if (!isNaN(skewness)) {
      if (Math.abs(skewness) > 1) {
          insights.push(`The distribution is <strong>highly ${skewness > 0 ? 'right-skewed' : 'left-skewed'}</strong> (skewness = ${skewness.toFixed(2)}).`);
      } else if (Math.abs(skewness) > 0.5) {
          insights.push(`The data is <strong>moderately ${skewness > 0 ? 'right-skewed' : 'left-skewed'}</strong> (skewness = ${skewness.toFixed(2)}).`);
      } else {
          insights.push(`The data appears to be roughly <strong>symmetrical</strong> (skewness = ${skewness.toFixed(2)}).`);
      }
    }

    if (stats.stdDev > 0) {
      const cv = (stats.stdDev / Math.abs(stats.mean)) * 100;
      if (cv > 30) {
          insights.push(`The standard deviation (<strong>${stats.stdDev.toFixed(2)}</strong>) is relatively high compared to the mean, indicating <strong>high variability</strong>.`);
      } else {
          insights.push(`The data shows <strong>low to moderate variability</strong> with a standard deviation of <strong>${stats.stdDev.toFixed(2)}</strong>.`);
      }
    }
    
    return insights;
};

const generateCategoricalInsights = (stats: ReturnType<typeof getCategoricalStats>) => {
    if (stats.length === 0) return ["Not enough data for insights."];
    const mode = stats[0];
    return [`The most frequent category is <strong>"${mode.name}"</strong>, appearing in <strong>${mode.percentage.toFixed(1)}%</strong> of cases.`];
};

const AnalysisDisplayShell = ({ children, varName }: { children: React.ReactNode, varName: string }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{varName}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
};
  
const ChoiceAnalysisDisplay = ({ chartData, tableData, insightsData, varName }: { chartData: any, tableData: any[], insightsData: string[], varName: string }) => {
    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'treemap'>('bar');

    return (
        <AnalysisDisplayShell varName={varName}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex justify-between items-center">
                            Distribution
                             <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)}><TabsList>
                                <TabsTrigger value="bar"><BarChartIcon className="w-4 h-4" /></TabsTrigger>
                                <TabsTrigger value="pie"><PieChartIcon className="w-4 h-4" /></TabsTrigger>
                                <TabsTrigger value="treemap"><Grid3x3 className="w-4 h-4" /></TabsTrigger>
                            </TabsList></Tabs>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                       <ChartContainer config={{}} className="w-full h-[300px]">
                         <ResponsiveContainer>
                           {chartType === 'bar' ? (
                               <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                 <XAxis type="number" dataKey="count" />
                                 <YAxis dataKey="name" type="category" width={100} />
                                 <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}} />
                                 <Bar dataKey="count" name="Frequency" radius={4}>
                                   <LabelList dataKey="count" position="insideRight" style={{ fill: 'hsl(var(--primary-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                                   {chartData.map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                 </Bar>
                               </RechartsBarChart>
                           ) : (
                               <PieChart>
                                 <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={p => `${p.name} (${p.percentage.toFixed(1)}%)`}>
                                   {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                 </Pie>
                                 <Tooltip content={<ChartTooltipContent />} />
                               </PieChart>
                           )}
                         </ResponsiveContainer>
                       </ChartContainer>
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                        <CardContent className="max-h-[200px] overflow-y-auto">{
                            <Table>
                                <TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Percentage</TableHead></TableRow></TableHeader>
                                <TableBody>{tableData.map((item, index) => ( <TableRow key={`${item.name}-${index}`}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.count}</TableCell><TableCell className="text-right">{item.percentage}%</TableCell></TableRow> ))}</TableBody>
                            </Table>
                        }</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>{ <ul className="space-y-2 text-sm list-disc pl-4">{insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul> }</CardContent>
                    </Card>
                </div>
            </div>
        </AnalysisDisplayShell>
    );
};
  
const NumberAnalysisDisplay = ({ chartData, tableData, insightsData, varName, comparisonData }: { chartData: any, tableData: any, insightsData: string[], varName: string, comparisonData?: any }) => {
     const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    return (
      <AnalysisDisplayShell varName={varName}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Response Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        <Plot
                            data={comparisonData ? [
                                { x: chartData.values, type: 'histogram', name: 'Overall', opacity: 0.7, marker: {color: COLORS[0]} },
                                { x: comparisonData.chartData.values, type: 'histogram', name: comparisonData.filterValue, opacity: 0.7, marker: {color: COLORS[1]} }
                            ] : [{ x: chartData.values, type: 'histogram', marker: {color: COLORS[0]} }]}
                            layout={{
                                autosize: true,
                                margin: { t: 40, b: 40, l: 40, r: 20 },
                                bargap: 0.1,
                                barmode: 'overlay'
                            }}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                            useResizeHandler
                        />
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                         <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Overall</TableHead>
                                        {comparisonData && <TableHead className="text-right">{comparisonData.filterValue}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Mean</TableCell><TableCell className="text-right">{tableData.mean.toFixed(3)}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.mean.toFixed(3)}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Median</TableCell><TableCell className="text-right">{tableData.median}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.median}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Mode</TableCell><TableCell className="text-right">{tableData.mode}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.mode}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Std. Deviation</TableCell><TableCell className="text-right">{tableData.stdDev.toFixed(3)}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.stdDev.toFixed(3)}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Total Responses</TableCell><TableCell className="text-right">{tableData.count}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.count}</TableCell>}</TableRow>
                                </TableBody>
                            </Table>
                         </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>{ <ul className="space-y-2 text-sm list-disc pl-4">{insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul> }</CardContent>
                    </Card>
                </div>
            </div>
      </AnalysisDisplayShell>
    );
};

const SummaryTable = ({ analysisData, selectedVars, numericHeaders, categoricalHeaders }: { analysisData: any, selectedVars: string[], numericHeaders: string[], categoricalHeaders: string[]}) => {
    const numericStatsOrder: (keyof ReturnType<typeof getNumericStats>)[] = ['count', 'missing', 'mean', 'stdDev', 'min', 'q1', 'median', 'q3', 'max', 'skewness'];
    const categoricalStatsOrder = ['count', 'missing', 'unique', 'mode'];

    const numericSelected = selectedVars.filter(v => numericHeaders.includes(v));
    const categoricalSelected = selectedVars.filter(v => categoricalHeaders.includes(v));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Summary Table</CardTitle>
                <CardDescription>A consolidated view of descriptive statistics for all selected variables.</CardDescription>
            </CardHeader>
            <CardContent>
                {numericSelected.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-semibold mb-2">Numeric Variables</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Statistic</TableHead>
                                    {numericSelected.map(header => <TableHead key={header} className="text-right">{header}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {numericStatsOrder.map(statKey => (
                                    <TableRow key={statKey}>
                                        <TableCell className="font-medium capitalize">{statKey.replace(/([A-Z])/g, ' $1').trim()}</TableCell>
                                        {numericSelected.map(header => {
                                            const value = analysisData[header]?.stats?.[statKey];
                                            return <TableCell key={header} className="text-right font-mono">{typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A'}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                 {categoricalSelected.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Categorical Variables</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Statistic</TableHead>
                                    {categoricalSelected.map(header => <TableHead key={header} className="text-right">{header}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categoricalStatsOrder.map(statKey => (
                                    <TableRow key={statKey}>
                                        <TableCell className="font-medium capitalize">{statKey}</TableCell>
                                        {categoricalSelected.map(header => {
                                            const value = analysisData[header]?.stats?.[statKey];
                                            return <TableCell key={header} className="text-right font-mono">{Array.isArray(value) ? value.join(', ') : value}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}

interface DescriptiveStatsPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

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

export default function DescriptiveStatisticsPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DescriptiveStatsPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedVars, setSelectedVars] = useState<string[]>(allHeaders);
    const [analysisData, setAnalysisData] = useState<any | null>(null);
    const [view, setView] = useState('intro');
    const [groupByVar, setGroupByVar] = useState<string | undefined>();

    useEffect(() => {
        setSelectedVars(allHeaders);
        setAnalysisData(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [allHeaders, data]);
    
    const handleVarSelectionChange = (varName: string, isChecked: boolean) => {
        setSelectedVars(prev => isChecked ? [...prev, varName] : prev.filter(v => v !== varName));
    };

    const runAnalysis = useCallback(() => {
        if (selectedVars.length === 0) {
            toast({ title: "No Variables Selected", description: "Please select at least one variable to analyze.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        
        setTimeout(() => {
            const results: { [key: string]: any } = {};

            for (const varName of selectedVars) {
                if (!data[0] || !(varName in data[0])) {
                    results[varName] = { error: `Variable '${varName}' not found in data.` };
                    continue;
                }

                const columnData = data.map((row: any) => row[varName]);
                
                const isNumeric = numericHeaders.includes(varName);
                
                if (isNumeric) {
                    const stats = getNumericStats(columnData);
                    results[varName] = {
                        type: 'numeric', stats: stats,
                        plotData: { values: columnData.filter(v => typeof v === 'number') },
                        insights: generateNumericInsights(stats),
                    };
                } else {
                    const stats = getCategoricalStats(columnData);
                    const mode = stats.length > 0 ? stats[0].name : 'N/A';
                    results[varName] = {
                        type: 'categorical',
                        table: stats,
                        stats: {
                            count: stats.reduce((sum, item) => sum + item.count, 0),
                            missing: data.length - stats.reduce((sum, item) => sum + item.count, 0),
                            unique: stats.length,
                            mode: mode,
                        },
                        plotData: stats.map(s => ({ name: String(s.name), count: s.count, percentage: parseFloat(s.percentage as any) })),
                        insights: generateCategoricalInsights(stats),
                    };
                }
            }
            setAnalysisData(results);
            setIsLoading(false);
            toast({title: "Analysis Complete", description: `Descriptive statistics generated for ${selectedVars.length} variable(s).`});
        }, 500);
    }, [data, selectedVars, toast, numericHeaders]);
    
    const renderIndividualResults = () => {
        if (!analysisData) return null;
        return (
            <div className="space-y-8">
                {selectedVars.filter(h => numericHeaders.includes(h)).map(header => {
                    if(!analysisData[header] || analysisData[header].error) return null;
                    const result = analysisData[header];
                    return (
                        <div key={header}>
                           <NumberAnalysisDisplay
                                chartData={result.plotData}
                                tableData={result.stats}
                                insightsData={result.insights}
                                varName={header}
                            />
                        </div>
                    );
                })}
                {selectedVars.filter(h => categoricalHeaders.includes(h)).map(header => {
                    if(!analysisData[header] || analysisData[header].error) return null;
                    const result = analysisData[header];
                    return (
                        <div key={header}>
                           <ChoiceAnalysisDisplay
                                chartData={result.plotData}
                                tableData={result.table}
                                insightsData={result.insights}
                                varName={header}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    if (view === 'intro') {
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

            {analysisData ? (
                groupByVar ? (
                    <GroupedStatisticsTable data={data} selectedVars={selectedVars.filter(v => numericHeaders.includes(v))} groupVar={groupByVar} />
                ) : (
                    <Tabs defaultValue="individual" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="individual">Individual Analysis</TabsTrigger>
                            <TabsTrigger value="summary">Summary Table</TabsTrigger>
                        </TabsList>
                        <TabsContent value="individual" className="mt-6">
                            {renderIndividualResults()}
                        </TabsContent>
                        <TabsContent value="summary" className="mt-6">
                            <SummaryTable analysisData={analysisData} selectedVars={selectedVars} numericHeaders={numericHeaders} categoricalHeaders={categoricalHeaders} />
                        </TabsContent>
                    </Tabs>
                )
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

```
- src/lib/stats.ts:
```ts


import Papa from 'papaparse';

export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    console.error("Parsing errors:", result.errors);
    // Optionally throw an error for the first critical error
    const firstError = result.errors[0];
    if (firstError && firstError.code !== 'UndetectableDelimiter') {
       throw new Error(`CSV Parsing Error: ${firstError.message} on row ${firstError.row}`);
    }
  }

  if (!result.data || result.data.length === 0) {
    throw new Error("No parsable data rows found in the file.");
  }
  
  const rawHeaders = (result.meta.fields || []).filter(h => h && h.trim() !== '');
  const data: DataSet = result.data as DataSet;

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    if (!header) return;
    const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    
    if (values.length === 0) {
        categoricalHeaders.push(header); // Default to categorical if all empty
        return;
    }

    const isNumericColumn = values.every(val => typeof val === 'number' && isFinite(val));

    if (isNumericColumn) {
        numericHeaders.push(header);
    } else {
        categoricalHeaders.push(header);
    }
  });

  // Ensure types are correct, PapaParse does a good job but we can enforce it.
  const sanitizedData = data.map(row => {
    const newRow: DataPoint = {};
    rawHeaders.forEach(header => {
      if (!header) return;
      const value = row[header];
      if (numericHeaders.includes(header)) {
        if (typeof value === 'number' && isFinite(value)) {
            newRow[header] = value;
        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
            newRow[header] = parseFloat(value);
        } else {
            newRow[header] = NaN; // Use NaN for non-numeric values in numeric columns
        }
      } else { // Categorical
        newRow[header] = (value === null || value === undefined) ? '' : String(value);
      }
    });
    return newRow;
  });

  return { headers: rawHeaders, data: sanitizedData, numericHeaders, categoricalHeaders };
};

export const unparseData = (
    { headers, data }: { headers: string[]; data: DataSet }
): string => {
    return Papa.unparse(data, {
        columns: headers,
        header: true,
    });
};
```
- src/lib/survey-templates.ts:
```ts
import { Question } from "@/entities/Survey";

export const choiceBasedConjointTemplate = {
  title: 'Smartphone Choice Survey (CBC)',
  description: 'Help us understand your preferences for a new smartphone.',
  questions: [
    {
      id: 'cbc_intro',
      type: 'description',
      title: 'Choice Task Instructions',
      content: 'In the following screens, you will be presented with a set of smartphones. From each set, please choose the one you would be most likely to purchase.'
    },
    {
      id: 'conjoint_1',
      type: 'conjoint',
      title: 'Which smartphone would you choose?',
      required: true,
      attributes: [
        { id: 'attr1', name: 'Brand', levels: ['Apple', 'Samsung', 'Google'] },
        { id: 'attr2', name: 'Price', levels: ['$699', '$899', '$1099'] },
        { id: 'attr3', name: 'Camera', levels: ['Dual-lens', 'Triple-lens'] },
        { id: 'attr4', name: 'Battery', levels: ['Standard', 'Extended'] }
      ],
      designMethod: 'balanced-overlap',
      sets: 8,
      cardsPerSet: 3,
    }
  ]
};

export const ratingBasedConjointTemplate = {
  title: 'Laptop Feature Rating (Conjoint)',
  description: 'Please rate your interest in the following laptop configurations on a scale of 1 to 10.',
  questions: [
    {
      id: 'rating_conjoint_intro',
      type: 'description',
      title: 'Rating Task Instructions',
      content: 'On the next screens, you will see several different laptop configurations. Please rate each one based on how likely you would be to purchase it, where 1 is "Not at all likely" and 10 is "Extremely likely".'
    },
    {
      id: 'rating_conjoint_1',
      type: 'rating-conjoint',
      title: 'Rate this Laptop Configuration',
      required: true,
      attributes: [
        { id: 'attr1', name: 'Brand', levels: ['Brand A', 'Brand B', 'Brand C'] },
        { id: 'attr2', name: 'Screen Size', levels: ['13-inch', '15-inch'] },
        { id: 'attr3', name: 'RAM', levels: ['8GB', '16GB', '32GB'] },
        { id: 'attr4', name: 'Storage', levels: ['256GB SSD', '512GB SSD', '1TB SSD'] }
      ],
      designMethod: 'full-factorial', // Full factorial can be used if total profiles are manageable
      sets: 1, // Only one 'set' for rating-based, showing one profile at a time
    }
  ]
};

export const rankingConjointTemplate = {
  title: 'Coffee Blend Preferences (Ranking Conjoint)',
  description: 'Please rank the following coffee blends from most to least preferred.',
  questions: [
    {
      id: 'ranking_conjoint_intro',
      type: 'description',
      title: 'Ranking Task Instructions',
      content: 'On the next screen, you will see a set of coffee blend profiles. Please rank them from 1 (Most Preferred) to 4 (Least Preferred) by dragging and dropping them into your preferred order.'
    },
    {
      id: 'ranking_conjoint_1',
      type: 'ranking-conjoint',
      title: 'Rank these Coffee Blends',
      required: true,
      attributes: [
        { id: 'attr1', name: 'Roast', levels: ['Light', 'Medium', 'Dark'] },
        { id: 'attr2', name: 'Origin', levels: ['Single Origin', 'Blend'] },
        { id: 'attr3', name: 'Price', levels: ['$12', '$16'] }
      ],
      designMethod: 'randomized',
      sets: 1, // Typically one set is shown for ranking
      cardsPerSet: 4 // The number of profiles to be ranked
    }
  ]
};


export const ipaTemplate = {
  title: 'Restaurant Experience Survey',
  description: 'Please rate your experience with our restaurant.',
  questions: [
    {
      id: 'ipa_matrix',
      type: 'matrix',
      title: 'Please rate your satisfaction with the following aspects of your visit (1=Very Dissatisfied, 7=Very Satisfied):',
      required: true,
      rows: ['Food Quality', 'Service Speed', 'Ambiance', 'Price', 'Overall Satisfaction'],
      scale: ['1', '2', '3', '4', '5', '6', '7']
    },
  ]
};

export const vanWestendorpTemplate = {
    title: "Product Pricing Survey",
    description: "We'd like to get your opinion on the pricing for our new product.",
    questions: [
        {
            id: 'q_too_cheap',
            type: 'number',
            title: 'Too Cheap',
            text: 'At what price would you consider the product to be so cheap that you would question its quality?',
            required: true
        },
        {
            id: 'q_cheap',
            type: 'number',
            title: 'Cheap',
            text: 'At what price would you consider the product to be a bargain—a great buy for the money?',
            required: true
        },
        {
            id: 'q_expensive',
            type: 'number',
            title: 'Expensive',
            text: 'At what price would you consider the product to be getting expensive, but you would still consider buying it?',
            required: true
        },
        {
            id: 'q_too_expensive',
            type: 'number',
            title: 'Too Expensive',
            text: 'At what price would you consider the product to be so expensive that you would not consider buying it?',
            required: true
        }
    ]
}

export const turfTemplate = {
    title: "Soda Flavor Preference",
    description: "Please select all the soda flavors you would be interested in purchasing.",
    questions: [
        {
            id: 'turf_flavors',
            type: 'multiple',
            title: 'Which of these flavors appeal to you?',
            required: true,
            options: ['Classic Cola', 'Lemon Lime', 'Orange Soda', 'Grape Soda', 'Root Beer', 'Ginger Ale', 'Cherry Cola', 'Cream Soda']
        }
    ]
};

export const gaborGrangerTemplate1 = {
  title: "Willingness to Pay (Single Price)",
  description: "Please let us know if you would purchase this product at the following price.",
  questions: [
    {
      id: 'gg_q1',
      type: 'single',
      title: 'If this product was sold for $15, how likely would you be to purchase it?',
      required: true,
      options: ['Definitely would not buy', 'Probably would not buy', 'Might or might not buy', 'Probably would buy', 'Definitely would buy']
    }
  ]
};

export const gaborGrangerTemplate2 = {
  title: "Willingness to Pay (Multiple Prices)",
  description: "Please let us know if you would purchase this product at each of the following prices.",
  questions: [
    { id: 'gg_intro', type: 'description', title: 'Pricing Questions', content: 'For each price point shown below, please indicate your likelihood of purchasing the product.'},
    { id: 'gg_q_price1', type: 'single', title: 'If the price was $10, would you buy it?', required: true, options: ['Yes', 'No'] },
    { id: 'gg_q_price2', type: 'single', title: 'If the price was $15, would you buy it?', required: true, options: ['Yes', 'No'] },
    { id: 'gg_q_price3', type: 'single', title: 'If the price was $20, would you buy it?', required: true, options: ['Yes', 'No'] },
    { id: 'gg_q_price4', type: 'single', title: 'If the price was $25, would you buy it?', required: true, options: ['Yes', 'No'] },
  ]
};

export const ahpCriteriaOnlyTemplate = {
    title: "Smartphone Feature Prioritization (AHP)",
    description: "Help us decide which features are most important for our next smartphone.",
    questions: [
        { id: 'ahp_1', type: 'ahp', title: 'Which feature is more important?', required: true, criteria: [{id: 'c1', name: 'Price'}, {id: 'c2', name:'Performance'}, {id: 'c3', name:'Design'}] }
    ]
}

export const ahpWithAlternativesTemplate = {
    title: "New Car Selection (AHP)",
    description: "Help us select the best new car model to launch based on your preferences.",
    questions: [
        { id: 'ahp_1', type: 'ahp', title: 'Which CRITERION is more important for choosing a car?', required: true, criteria: [{id: 'c1', name: 'Price'}, {id: 'c2', name:'Fuel Economy'}, {id: 'c3', name:'Safety'}] },
        { id: 'ahp_2', type: 'ahp', title: 'Which car is better in terms of PRICE?', required: true, alternatives: ['Sedan', 'SUV', 'Hatchback'], criteria: [{id: 'c1', name: 'Price'}] },
        { id: 'ahp_3', type: 'ahp', title: 'Which car is better in terms of FUEL ECONOMY?', required: true, alternatives: ['Sedan', 'SUV', 'Hatchback'], criteria: [{id: 'c2', name: 'Fuel Economy'}] },
        { id: 'ahp_4', type: 'ahp', title: 'Which car is better in terms of SAFETY?', required: true, alternatives: ['Sedan', 'SUV', 'Hatchback'], criteria: [{id: 'c3', name: 'Safety'}] }
    ]
}

export const csatTemplate = {
  title: "Customer Satisfaction Survey",
  description: "Please rate your overall satisfaction with our service.",
  questions: [
    {
      id: 'csat_q1',
      type: 'rating',
      title: 'Overall, how satisfied are you with our service?',
      scale: ['1', '2', '3', '4', '5'],
      leftLabel: 'Very Dissatisfied',
      rightLabel: 'Very Satisfied',
      required: true
    },
     {
      id: 'csat_open_ended',
      type: 'text',
      title: 'Please provide any additional feedback.',
      required: false
    }
  ]
};

export const semanticDifferentialTemplate = {
    title: "Brand Perception Study",
    description: "Please rate our brand on the following scales.",
    questions: [
        {
            id: 'sd_1',
            type: 'semantic-differential',
            title: 'Our Brand is:',
            required: true,
            rows: ['Modern vs. Traditional', 'Simple vs. Complex', 'Affordable vs. Luxurious'],
            numScalePoints: 7,
        }
    ]
};

export const brandFunnelTemplate = {
    title: "Brand Funnel Survey",
    description: "Please answer a few questions about your awareness and perception of different brands.",
    questions: [
        {
            id: 'q_awareness',
            type: 'multiple',
            title: 'Which of the following brands have you heard of?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D']
        },
        {
            id: 'q_consideration',
            type: 'multiple',
            title: 'Which of these brands would you consider purchasing?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D']
        },
         {
            id: 'q_preference',
            type: 'single',
            title: 'Which of the following is your most preferred brand?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D']
        },
        {
            id: 'q_usage',
            type: 'single',
            title: 'Which brand have you purchased most recently?',
            required: false,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D', 'None of these']
        }
    ]
};

export const servqualTemplate = {
    title: "Service Quality Assessment (SERVQUAL)",
    description: "Please rate your expectations and perceptions of our service.",
    questions: [
        {
            id: 'sq_tangibles',
            type: 'servqual',
            title: 'Tangibles',
            required: true,
            rows: ['Modern equipment', 'Visually appealing facilities', 'Neat employees'],
            scale: ['1', '2', '3', '4', '5', '6', '7']
        },
         {
            id: 'sq_reliability',
            type: 'servqual',
            title: 'Reliability',
            required: true,
            rows: ['Promises to do something by a certain time', 'Performs the service right the first time'],
            scale: ['1', '2', '3', '4', '5', '6', '7']
        },
    ]
};

export const servperfTemplate = {
    title: "Service Performance Assessment (SERVPERF)",
    description: "Please rate your perception of our service performance.",
    questions: [
        {
            id: 'sp_tangibles',
            type: 'servqual',
            title: 'Tangibles',
            servqualType: 'Perception',
            required: true,
            rows: ['Modern equipment', 'Visually appealing facilities', 'Neat employees'],
            scale: ['1', '2', '3', '4', '5', '6', '7']
        },
         {
            id: 'sp_reliability',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Reliability',
            required: true,
            rows: ['Promises to do something by a certain time', 'Performs the service right the first time'],
            scale: ['1', '2', '3', '4', '5', '6', '7']
        },
    ]
};

```
- src/lib/utils.ts:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```
- tailwind.config.ts:
```ts
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
       fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        headline: ['var(--font-headline)', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
         chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```
- next.config.mjs:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
       {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      }
    ],
  },
   async rewrites() {
    return [
      {
        source: '/api/analysis/:path*',
        destination: `http://127.0.0.1:3400/api/analysis/:path*`,
      },
      {
        source: '/api/generate-qr-code',
        destination: `http://127.0.0.1:3400/api/generate-qr-code`,
      },
    ];
  },
};

export default nextConfig;
```
- README.md:
```md
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

```
- public/placeholder-user.jpg: ""
- public/vercel.svg:
```svg
<svg width="76" height="65" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.5255 0L75.051 65H0L37.5255 0Z" fill="#000000"/></svg>
```
