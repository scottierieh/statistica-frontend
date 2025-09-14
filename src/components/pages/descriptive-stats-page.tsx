'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, UploadCloud, BarChart, BrainCircuit, Zap, Lightbulb, Brain, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { type ExampleDataSet } from '@/lib/example-datasets';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div> });

// --- Statistical Helper Functions ---
const getQuantile = (arr: number[], q: number) => {
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

    const cv = (stats.stdDev / Math.abs(stats.mean)) * 100;
    if (cv > 30) {
        insights.push(`The standard deviation (<strong>${stats.stdDev.toFixed(2)}</strong>) is relatively high compared to the mean, indicating <strong>high variability</strong> in the data.`);
    } else {
         insights.push(`The data shows <strong>low to moderate variability</strong> with a standard deviation of <strong>${stats.stdDev.toFixed(2)}</strong>.`);
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
                <div className="flex items-center justify-center">
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
    return (
      <AnalysisDisplayShell
        variableName={varName}
        chart={
          <Plot data={[{ ...chartData, type: 'pie', hole: 0.4, textinfo: 'label+percent', textposition: 'outside' }]}
            layout={{ showlegend: false, autosize: true, margin: { t: 20, b: 20, l: 20, r: 20 }, }}
            style={{ width: '100%', height: '300px' }} config={{ displayModeBar: false }}
          />
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
    return (
        <AnalysisDisplayShell
            variableName={varName}
            chart={
                 <Plot data={[{ x: chartData.values, type: 'histogram' }]} layout={{ title: 'Response Distribution', autosize: true, margin: { t: 40, b: 40, l: 40, r: 20 }, bargap: 0.1, }} style={{ width: '100%', height: '300px' }} config={{ displayModeBar: false }} />
            }
            table={
                <Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow><TableCell>Mean</TableCell><TableCell className="text-right">{tableData.mean.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Median</TableCell><TableCell className="text-right">{tableData.median}</TableCell></TableRow>
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
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DescriptiveStatisticsPage({ onLoadExample }: DescriptiveStatsPageProps) {
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [analysisData, setAnalysisData] = useState<any | null>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        Papa.parse(file, { header: true, skipEmptyLines: true, dynamicTyping: true, complete: (res: any) => handleDataLoad(res, res.meta.fields || []) });
    };

    const handleDataLoad = (results: any, fileHeaders: string[]) => {
        setData(results.data);
        setHeaders(fileHeaders);
        setSelectedVars(fileHeaders);
        setAnalysisData(null);
        toast({ title: "Success", description: `${results.data.length} rows loaded.` });
    };
    
    const handleVarSelectionChange = (varName: string, isChecked: boolean) => {
        setSelectedVars(prev => isChecked ? [...prev, varName] : prev.filter(v => v !== varName));
    };

    const runAnalysis = () => {
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

                const columnData = data.map((row: any) => row[varName]).filter((val: any) => val !== null && val !== undefined && val !== '');
                
                if (columnData.length === 0) {
                    results[varName] = { error: `No valid data for variable '${varName}'.`};
                    continue;
                }

                const isNumeric = columnData.every((val: any) => typeof val === 'number' && isFinite(val));
                
                if (isNumeric) {
                    const stats = getNumericStats(columnData as number[]);
                    results[varName] = {
                        type: 'numeric', stats: stats,
                        plotData: { values: columnData, type: 'histogram' },
                        insights: generateNumericInsights(stats),
                    };
                } else {
                    const stats = getCategoricalStats(columnData);
                    results[varName] = {
                        type: 'categorical', stats: stats,
                        plotData: { labels: stats.map(s => s.name), values: stats.map(s => s.count), },
                        insights: generateCategoricalInsights(stats),
                    };
                }
            }
            setAnalysisData(results);
            setIsLoading(false);
            toast({title: "Analysis Complete", description: `Descriptive statistics generated for ${selectedVars.length} variable(s).`});
        }, 500);
    };

    const renderResults = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="ml-4">Running analysis...</p>
                </div>
            )
        }

        if (!analysisData) return <div className="text-muted-foreground text-center py-12">
            {data.length > 0 ? "Select variables and run the analysis to see results." : "Upload data to begin."}
        </div>;

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


    return (
        <div className="space-y-6">
             <header className="flex items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Descriptive Statistics</h1>
            </header>

            <Card>
              <CardHeader><CardTitle>1. Data Input</CardTitle><CardDescription>Upload a CSV file to begin.</CardDescription></CardHeader>
              <CardContent>
                    <div 
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud className="w-12 h-12 text-muted-foreground" />
                        <p className="mt-4 text-lg font-semibold">Click to upload a CSV file</p>
                        <p className="text-sm text-muted-foreground">or drag and drop</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
              </CardContent>
              {data.length > 0 && headers && headers.length > 0 && (
                  <CardContent>
                    <h3 className="font-semibold mb-2">Data Preview ({data.length} rows)</h3>
                    <div className="overflow-auto max-h-60 border rounded-lg">
                        <Table><TableHeader><TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{data.slice(0, 5).map((row, i) => (<TableRow key={i}>{headers.map(h => <TableCell key={h}>{String(row[h])}</TableCell>)}</TableRow>))}</TableBody></Table>
                    </div>
                  </CardContent>
              )}
            </Card>

            {data.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle>2. Configure Analysis</CardTitle>
                        <CardDescription>Select the variables you want to analyze.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                            {headers.map(h => (
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
                    </CardContent>
                    <CardContent>
                       <Button onClick={runAnalysis} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>}
                            Run Analysis
                        </Button>
                    </CardContent>
                </Card>
            )}

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit /> Analysis Results</CardTitle>
                    <CardDescription>A summary of each selected variable in your dataset.</CardDescription>
                </CardHeader>
                <CardContent>{renderResults()}</CardContent>
            </Card>
        </div>
    );
}