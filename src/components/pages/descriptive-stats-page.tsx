

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Brain, AlertTriangle, BarChart as BarChartIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { type DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';


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

const getNumericStats = (data: number[]) => {
    if (data.length === 0) return { count: 0, mean: NaN, stdDev: NaN, min: NaN, q1: NaN, median: NaN, q3: NaN, max: NaN };
    
    const sortedData = [...data].sort((a, b) => a - b);
    const sum = data.reduce((acc, val) => acc + val, 0);
    const meanVal = sum / data.length;
    const stdDevVal = Math.sqrt(data.reduce((acc, val) => acc + (val - meanVal) ** 2, 0) / (data.length > 1 ? data.length - 1 : 1));

    const q1 = getQuantile(sortedData, 0.25);
    const medianVal = getQuantile(sortedData, 0.5);
    const q3 = getQuantile(sortedData, 0.75);

    return {
        count: data.length, mean: meanVal, stdDev: stdDevVal, min: sortedData[0], q1, median: medianVal, q3, max: sortedData[data.length - 1],
    };
};

const getCategoricalStats = (data: (string | number)[]) => {
    if (data.length === 0) return [];
    const counts: { [key: string]: number } = {};
    data.forEach(val => {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([value, count]) => ({ name: value, count, percentage: ((count / data.length) * 100).toFixed(1) }))
        .sort((a, b) => b.count - a.count);
};

const generateNumericInsights = (stats: ReturnType<typeof getNumericStats>) => {
    const insights: string[] = [];
    if (isNaN(stats.mean)) return ["Not enough data for insights."];

    const skewness = stats.mean - stats.median;
    const skewThreshold = stats.stdDev * 0.2;
    if (Math.abs(skewness) > skewThreshold) {
        insights.push(`The mean (<strong>${stats.mean.toFixed(2)}</strong>) is ${skewness > 0 ? 'higher' : 'lower'} than the median (<strong>${stats.median.toFixed(2)}</strong>), suggesting the data is <strong>${skewness > 0 ? 'right-skewed' : 'left-skewed'}</strong>.`);
    } else {
        insights.push(`The data appears to be roughly <strong>symmetrical</strong>, as the mean and median are very close.`);
    }

    if (stats.stdDev > 0) {
      const cv = (stats.stdDev / Math.abs(stats.mean)) * 100;
      if (cv > 30) {
          insights.push(`The standard deviation (<strong>${stats.stdDev.toFixed(2)}</strong>) is relatively high compared to the mean, indicating <strong>high variability</strong> in the data.`);
      } else {
          insights.push(`The data shows <strong>low to moderate variability</strong> with a standard deviation of <strong>${stats.stdDev.toFixed(2)}</strong>.`);
      }
    }
    
    return insights;
};

const generateCategoricalInsights = (stats: ReturnType<typeof getCategoricalStats>) => {
    if (stats.length === 0) return ["Not enough data for insights."];
    const mode = stats[0];
    return [`The most frequent category is <strong>"${mode.name}"</strong>, appearing in <strong>${mode.percentage}%</strong> of cases.`];
};

const AnalysisDisplayShell = ({ chart, table, insights, variableName }: { chart: React.ReactNode, table: React.ReactNode, insights: React.ReactNode, variableName: string }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{variableName}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="flex items-center justify-center min-h-[300px]">
                    {chart}
                </div>
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                        <CardContent className="max-h-[200px] overflow-y-auto">{table}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent>{insights}</CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
};
  
const ChoiceAnalysisDisplay = ({ chartData, tableData, insightsData, varName }: { chartData: any, tableData: any[], insightsData: string[], varName: string }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
    const chartConfig = {
      count: {
        label: 'Count',
      },
    };

    return (
      <AnalysisDisplayShell
        variableName={varName}
        chart={
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="count">
                    {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        }
        table={
          <Table><TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Percentage</TableHead></TableRow></TableHeader>
            <TableBody>{tableData.map((item, index) => ( <TableRow key={`${item.name}-${index}`}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.count}</TableCell><TableCell className="text-right">{item.percentage}%</TableCell></TableRow> ))}</TableBody>
          </Table>
        }
        insights={ <ul className="space-y-2 text-sm list-disc pl-4">{insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul> }
      />
    );
};
  
const NumberAnalysisDisplay = ({ chartData, tableData, insightsData, varName }: { chartData: any, tableData: any, insightsData: string[], varName: string }) => {
    const chartConfig = {
      count: {
        label: 'Frequency',
        color: 'hsl(var(--primary))',
      },
    };
    
    return (
        <AnalysisDisplayShell
            variableName={varName}
            chart={
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={chartData.bins}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            }
            table={
                <Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow><TableCell>Mean</TableCell><TableCell className="text-right">{tableData.mean.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Median</TableCell><TableCell className="text-right">{tableData.median.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Std. Deviation</TableCell><TableCell className="text-right">{tableData.stdDev.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Minimum</TableCell><TableCell className="text-right">{tableData.min}</TableCell></TableRow>
                        <TableRow><TableCell>Maximum</TableCell><TableCell className="text-right">{tableData.max}</TableCell></TableRow>
                        <TableRow><TableCell>Total Responses</TableCell><TableCell className="text-right">{tableData.count}</TableCell></TableRow>
                    </TableBody>
                </Table>
            }
            insights={ <ul className="space-y-2 text-sm list-disc pl-4">{insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul> }
        />
    );
};

interface DescriptiveStatsPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DescriptiveStatisticsPage({ data, allHeaders, onLoadExample }: DescriptiveStatsPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedVars, setSelectedVars] = useState<string[]>(allHeaders);
    const [analysisData, setAnalysisData] = useState<any | null>(null);
    
    useEffect(() => {
        setSelectedVars(allHeaders);
        setAnalysisData(null);
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
        
        // Use a timeout to simulate async work and prevent blocking the UI thread
        setTimeout(() => {
            const results: { [key: string]: any } = {};

            for (const varName of selectedVars) {
                if (!data[0] || !(varName in data[0])) {
                    results[varName] = { error: `Variable '${varName}' not found in data.` };
                    continue;
                }

                const columnData = data.map((row: any) => row[varName]).filter((val: any) => val !== null && val !== undefined && val !== '');
                
                if (columnData.length === 0) {
                    results[varName] = { error: `No valid data for variable '${varName}'.`};
                    continue;
                }

                const isNumeric = columnData.every((val: any) => typeof val === 'number' && isFinite(val));
                
                if (isNumeric) {
                    const stats = getNumericStats(columnData as number[]);
                    const binCount = 10;
                    const {min, max} = stats;
                    const binWidth = (max - min) / binCount;
                    const bins = Array.from({length: binCount}, (_, i) => {
                        const rangeStart = min + i * binWidth;
                        const rangeEnd = rangeStart + binWidth;
                        return {
                            range: `${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}`,
                            count: 0
                        };
                    });
                     columnData.forEach(val => {
                        let binIndex = Math.floor((val - min) / binWidth);
                        if (val === max) binIndex = binCount - 1; // Put max in last bin
                        if (bins[binIndex]) bins[binIndex].count++;
                    });

                    results[varName] = {
                        type: 'numeric', stats: stats,
                        plotData: { bins },
                        insights: generateNumericInsights(stats),
                    };
                } else {
                    const stats = getCategoricalStats(columnData);
                    results[varName] = {
                        type: 'categorical', stats: stats,
                        plotData: stats.map(s => ({ name: s.name, count: s.count })),
                        insights: generateCategoricalInsights(stats),
                    };
                }
            }
            setAnalysisData(results);
            setIsLoading(false);
            toast({title: "Analysis Complete", description: `Descriptive statistics generated for ${selectedVars.length} variable(s).`});
        }, 500);
    }, [data, selectedVars, toast]);

    const renderResults = () => {
        if (!analysisData) return null;
        return (
            <div className="space-y-8">
                {selectedVars.map(header => {
                    if(!analysisData[header] || analysisData[header].error) {
                        return (
                             <Card key={header}>
                                <CardHeader><CardTitle>{header}</CardTitle></CardHeader>
                                <CardContent>
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Analysis Error</AlertTitle>
                                        <AlertDescription>{analysisData[header]?.error || "An unknown error occurred."}</AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        )
                    }
                    const result = analysisData[header];
                    const displayProps = {
                        chartData: result.plotData,
                        tableData: result.stats,
                        insightsData: result.insights,
                        varName: header,
                    };
                    return (
                        <div key={header}>
                            {result.type === 'numeric' ? <NumberAnalysisDisplay {...displayProps} /> : <ChoiceAnalysisDisplay {...displayProps} />}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (data.length === 0) {
        const statsExamples = exampleDatasets.filter(ex => ['iris', 'tips'].includes(ex.id));
       return (
            <div className="flex flex-1 items-center justify-center">
               <Card className="w-full max-w-2xl text-center">
                   <CardHeader>
                       <CardTitle className="font-headline">Descriptive Statistics</CardTitle>
                       <CardDescription>
                          To get started, upload a data file or try one of our example datasets.
                       </CardDescription>
                   </CardHeader>
                   <CardContent>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {statsExamples.map((ex) => {
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
               </Card>
           </div>
       )
    }

    return (
        <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Descriptive Statistics Analysis</CardTitle>
                <CardDescription>Select the variables you want to analyze from your dataset.</CardDescription>
              </CardHeader>
              <CardContent>
                    <>
                        <Label>Variables</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {allHeaders.map(h => (
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

            {analysisData ? renderResults() : (
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
