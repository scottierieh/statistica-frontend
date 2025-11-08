
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, HelpCircle, MoveRight, Settings, FileSearch, BarChart as BarChartIcon, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import type { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

// --- Type Definitions ---
interface NumericStats {
    count: number; missing: number; mean: number; stdDev: number;
    min: number; q1: number; median: number; q3: number; max: number;
    skewness: number;
    kurtosis: number;
}
interface CategoricalSummary { count: number; missing: number; unique: number; mode: string | number; }
interface CategoricalTableItem { Value: string | number; Frequency: number; Percentage: number; }

interface AnalysisResult {
    [key: string]: {
        type: 'numeric' | 'categorical';
        stats?: NumericStats;
        table?: CategoricalTableItem[];
        summary?: CategoricalSummary;
        plot?: string;
        error?: string;
        insights?: string[];
    };
}

// --- Intro Page ---
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const statsExample = exampleDatasets.find(d => d.id === 'iris');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-4xl">
            <CardHeader className="text-center p-8"><CardTitle className="font-headline text-4xl font-bold">Descriptive Statistics</CardTitle><CardDescription className="text-xl pt-2 text-muted-foreground">Get a quick and comprehensive summary of your dataset's main characteristics.</CardDescription></CardHeader>
            <CardContent className="space-y-10 px-8 py-10">
              <div className="text-center"><h2 className="text-2xl font-semibold mb-4">Why Use Descriptive Statistics?</h2><p className="max-w-3xl mx-auto text-muted-foreground">Before diving into complex modeling, it's crucial to understand the basics of your data. Descriptive statistics provide a simple summary about the sample and the measures. Together with simple graphics analysis, they form the basis of virtually every quantitative analysis of data.</p></div>
              {statsExample && <div className="flex justify-center"><Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(statsExample)}><statsExample.icon className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">{statsExample.name}</h4><p className="text-xs text-muted-foreground">{statsExample.description}</p></div></Card></div>}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6"><h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3><ol className="list-decimal list-inside space-y-4 text-muted-foreground"><li><strong>Upload Data:</strong> Provide your dataset in CSV or Excel format.</li><li><strong>Select Variables:</strong> Choose the variables you want to summarize. You can select both numeric and categorical variables.</li><li><strong>Run Analysis:</strong> The tool will automatically detect the variable type and generate appropriate statistics and visualizations.</li></ol></div>
                <div className="space-y-6"><h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Key Metrics</h3><ul className="list-disc pl-5 space-y-4 text-muted-foreground"><li><strong>For Numeric Data:</strong> Mean, median, standard deviation, min, max, and quartiles to understand central tendency and dispersion.</li><li><strong>For Categorical Data:</strong> Frequency counts, percentages, and the mode to understand the distribution across categories.</li></ul></div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg"><Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button></CardFooter>
          </Card>
        </div>
    );
};

// --- Display Components ---
const AnalysisDisplayShell = ({ children, varName }: { children: React.ReactNode, varName: string }) => ( <Card><CardHeader><CardTitle>{varName}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card> );
const ChoiceAnalysisDisplay = ({ tableData, plotData, summaryData, insights, varName }: { tableData: CategoricalTableItem[], plotData?: string, summaryData?: CategoricalSummary, insights?: string[], varName: string }) => (
    <AnalysisDisplayShell varName={varName}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {plotData && <Image src={`data:image/png;base64,${plotData}`} alt={`${varName} plot`} width={500} height={400} className="rounded-md border" />}
            <div className="space-y-4">
                {insights && insights.length > 0 && (
                    <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>Key Insights</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-4">
                                {insights.map((insight, i) => <li key={i}>{insight}</li>)}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
                <Table><TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Percentage</TableHead></TableRow></TableHeader><TableBody>{tableData.map((item) => ( <TableRow key={String(item.Value)}><TableCell>{String(item.Value)}</TableCell><TableCell className="text-right">{item.Frequency}</TableCell><TableCell className="text-right">{item.Percentage.toFixed(1)}%</TableCell></TableRow> ))}</TableBody></Table>
            </div>
        </div>
    </AnalysisDisplayShell>
);
const NumberAnalysisDisplay = ({ plotData, tableData, insights, varName }: { plotData?: string, tableData: NumericStats, insights?: string[], varName: string }) => (
    <AnalysisDisplayShell varName={varName}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {plotData && <Image src={`data:image/png;base64,${plotData}`} alt={`${varName} plot`} width={500} height={400} className="rounded-md border" />}
             <div className="space-y-4">
                {insights && insights.length > 0 && (
                    <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>Key Insights</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-4">
                                {insights.map((insight, i) => <li key={i}>{insight}</li>)}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
                <Table><TableHeader><TableRow><TableHead>Statistic</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader><TableBody>{Object.entries(tableData).map(([key, value]) => (<TableRow key={key}><TableCell className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</TableCell><TableCell className="text-right font-mono">{typeof value === 'number' ? value.toFixed(2) : value}</TableCell></TableRow>))}</TableBody></Table>
            </div>
        </div>
    </AnalysisDisplayShell>
);
const SummaryTable = ({ analysisData, selectedVars, numericHeaders, categoricalHeaders }: { analysisData: { [key: string]: VariableResult }, selectedVars: string[], numericHeaders: string[], categoricalHeaders: string[]}) => {
    const numericStatsOrder: (keyof NumericStats)[] = ['count', 'missing', 'mean', 'stdDev', 'min', 'q1', 'median', 'q3', 'max', 'skewness'];
    const categoricalStatsOrder: (keyof CategoricalSummary)[] = ['count', 'missing', 'unique', 'mode'];

    const numericSelected = selectedVars.filter(v => numericHeaders.includes(v));
    const categoricalSelected = selectedVars.filter(v => categoricalHeaders.includes(v));

    return (
        <Card>
            <CardHeader><CardTitle>Summary Table</CardTitle><CardDescription>A consolidated view of descriptive statistics for all selected variables.</CardDescription></CardHeader>
            <CardContent>
                {numericSelected.length > 0 && (<div className="mb-6"><h3 className="font-semibold mb-2">Numeric Variables</h3><Table><TableHeader><TableRow><TableHead>Statistic</TableHead>{numericSelected.map(header => <TableHead key={header} className="text-right">{header}</TableHead>)}</TableRow></TableHeader><TableBody>{numericStatsOrder.map(statKey => (<TableRow key={statKey}><TableCell className="font-medium capitalize">{statKey.replace(/([A-Z])/g, ' $1').trim()}</TableCell>{numericSelected.map(header => { const value = analysisData[header]?.stats?.[statKey]; return <TableCell key={header} className="text-right font-mono">{typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A'}</TableCell> })}</TableRow>))}</TableBody></Table></div>)}
                {categoricalSelected.length > 0 && (<div><h3 className="font-semibold mb-2">Categorical Variables</h3><Table><TableHeader><TableRow><TableHead>Statistic</TableHead>{categoricalSelected.map(header => <TableHead key={header} className="text-right">{header}</TableHead>)}</TableRow></TableHeader><TableBody>{categoricalStatsOrder.map(statKey => (<TableRow key={statKey}><TableCell className="font-medium capitalize">{statKey}</TableCell>{categoricalSelected.map(header => { const value = analysisData[header]?.summary?.[statKey as keyof typeof analysisData[typeof header]['summary']]; return <TableCell key={header} className="text-right font-mono">{Array.isArray(value) ? value.join(', ') : value}</TableCell> })}</TableRow>))}</TableBody></Table></div>)}
            </CardContent>
        </Card>
    );
}

// --- Main Page Component ---
export default function DescriptiveStatisticsPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: any) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedVars, setSelectedVars] = useState<string[]>(allHeaders);
    const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => data.length > 0, [data]);

    useEffect(() => {
        setSelectedVars(allHeaders);
        setAnalysisData(null);
        setView(canRun ? 'main' : 'intro');
    }, [allHeaders, data, canRun]);

    const handleVarSelectionChange = (varName: string, isChecked: boolean) => { setSelectedVars(prev => isChecked ? [...prev, varName] : prev.filter(v => v !== varName)); };

    const runAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ title: "No Variables Selected", description: "Please select at least one variable to analyze.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setAnalysisData(null);

        try {
            const response = await fetch('/api/analysis/descriptive-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
            });
            if (!response.ok) { throw new Error('Analysis failed'); }
            const results = await response.json();
            if (results.error) { throw new Error(results.error); }
            setAnalysisData(results.results);
            toast({ title: "Analysis Complete", description: `Descriptive statistics generated for ${selectedVars.length} variable(s).` });
        } catch (error: any) {
            toast({ title: "Analysis Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast]);
    
    const renderIndividualResults = () => {
        if (!analysisData) return null;
        return (
            <div className="space-y-8">
                {selectedVars.map(header => {
                    const result = analysisData[header];
                    if(!result || result.error) return <Card key={header}><CardHeader><CardTitle>{header}</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{result?.error || "Unknown error"}</AlertDescription></Alert></CardContent></Card>;
                    if(result.type === 'numeric' && result.stats) { return <NumberAnalysisDisplay key={header} plotData={result.plot} tableData={result.stats} insights={result.insights} varName={header} /> }
                    if(result.type === 'categorical' && result.table) { return <ChoiceAnalysisDisplay key={header} plotData={result.plot} tableData={result.table} summaryData={result.summary} insights={result.insights} varName={header} /> }
                    return null;
                })}
            </div>
        );
    };

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-6">
            <Card>
              <CardHeader><div className="flex justify-between items-center"><CardTitle>Descriptive Statistics</CardTitle><Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button></div><CardDescription>Select variables to analyze.</CardDescription></CardHeader>
              <CardContent>
                <div>
                  <Label>Variables for Analysis</Label>
                  <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {allHeaders.map(h => (
                        <div key={h} className="flex items-center space-x-2">
                          <Checkbox id={`var-${h}`} onCheckedChange={(checked) => handleVarSelectionChange(h, !!checked)} checked={selectedVars.includes(h)} />
                          <Label htmlFor={`var-${h}`} className="font-medium">{h}</Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
              <CardFooter><Button onClick={runAnalysis} disabled={isLoading || selectedVars.length === 0}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>}Run Analysis</Button></CardFooter>
            </Card>
            {isLoading && <Card><CardContent className="p-6"><div className="flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running analysis...</p></div></CardContent></Card>}
            {analysisData ? (
                <Tabs defaultValue="individual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="individual">Individual Analysis</TabsTrigger><TabsTrigger value="summary">Summary Table</TabsTrigger></TabsList>
                    <TabsContent value="individual" className="mt-6">{renderIndividualResults()}</TabsContent>
                    <TabsContent value="summary" className="mt-6"><SummaryTable analysisData={analysisData} selectedVars={selectedVars} numericHeaders={numericHeaders} categoricalHeaders={categoricalHeaders} /></TabsContent>
                </Tabs>
            ) : ( !isLoading && <div className="text-center text-muted-foreground py-10"><BarChartIcon className="mx-auto h-12 w-12 text-gray-400"/><p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p></div> )}
        </div>
    );
}

```
- src/lib/stats.ts:
```ts


import Papa from 'papaparse';

export type DataPoint = Record<string, number | string | null>;
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
    
    const isNumericColumn = values.length > 0 && values.every(val => typeof val === 'number' && isFinite(val));

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
            newRow[header] = null; // Use null for non-numeric values in numeric columns
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


const getColumn = (data: DataSet, column: string): (number | string)[] => {
    return data.map(row => row[column]).filter(val => val !== undefined && val !== null && val !== '');
};

const getNumericColumn = (data: DataSet, column: string): number[] => {
    return data.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val)) as number[];
}

const mean = (arr: number[]): number => arr.length === 0 ? NaN : arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[]): number => {
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    if(isNaN(m)) return NaN;
    return mean(arr.map(x => Math.pow(x - m, 2)));
};

const stdDev = (arr: number[]): number => Math.sqrt(variance(arr));

const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    if(sorted[lower] === undefined || sorted[upper] === undefined) return NaN;
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

const mode = (arr: (number|string)[]): (number|string)[] => {
    if (arr.length === 0) return [];
    const counts: {[key: string]: number} = {};
    arr.forEach(val => {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });

    let maxFreq = 0;
    for (const key in counts) {
        if (counts[key] > maxFreq) {
            maxFreq = counts[key];
        }
    }

    if (maxFreq <= 1 && new Set(arr).size === arr.length) return []; // No mode if all unique

    const modes = Object.keys(counts)
        .filter(key => counts[key] === maxFreq)
        .map(key => {
            const num = parseFloat(key);
            return isNaN(num) ? key : num;
        });
    
    return modes;
}

const skewness = (arr: number[]): number => {
    if (arr.length < 3) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    return (n / ((n - 1) * (n - 2))) * arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
};

const kurtosis = (arr: number[]): number => {
    if (arr.length < 4) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
    const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return term1 * term2 - term3; // Excess kurtosis
};

export const findIntersection = (x1: number[], y1: number[], x2: number[], y2: number[]): number | null => {
    for (let i = 0; i < x1.length - 1; i++) {
        for (let j = 0; j < x2.length - 1; j++) {
            const p1 = { x: x1[i], y: y1[i] };
            const p2 = { x: x1[i+1], y: y1[i+1] };
            const p3 = { x: x2[j], y: y2[j] };
            const p4 = { x: x2[j+1], y: y2[j+1] };

            const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
            if (denominator === 0) continue;

            const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
            const ub = -((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                return p1.x + ua * (p2.x - p1.x); // Return intersection X value
            }
        }
    }
    return null;
};


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        if (!header) return;
        const numericColumn = data.every(row => typeof row[header] === 'number');

        if (numericColumn) {
            const columnData = getNumericColumn(data, header);
            if (columnData.length > 0) {
                const p25 = percentile(columnData, 25);
                const p75 = percentile(columnData, 75);
                stats[header] = {
                    mean: mean(columnData),
                    median: median(columnData),
                    stdDev: stdDev(columnData),
                    variance: variance(columnData),
                    min: Math.min(...columnData),
                    max: Math.max(...columnData),
                    range: Math.max(...columnData) - Math.min(...columnData),
                    iqr: p75 - p25,
                    count: columnData.length,
                    mode: mode(columnData),
                    skewness: skewness(columnData),
                    kurtosis: kurtosis(columnData),
                    p25: p25,
                    p75: p75,
                };
            }
        } else {
             const catColumnData = getColumn(data, header);
             if(catColumnData.length > 0) {
                 stats[header] = {
                     count: catColumnData.length,
                     unique: new Set(catColumnData).size,
                     mode: mode(catColumnData),
                 }
             }
        }
    });
    return stats;
};

// Deprecated: Correlation calculation is now handled by the Python backend.
export const calculateCorrelationMatrix = (data: DataSet, headers: string[]) => {
    return [];
};
