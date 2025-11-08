
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, HelpCircle, MoveRight, Settings, FileSearch, BarChart as BarChartIcon, Lightbulb, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
interface CategoricalTableItem { Value: string | number; Frequency: number; Percentage: number; 'Cumulative Percentage': number; }

interface VariableResult {
    type: 'numeric' | 'categorical';
    stats?: NumericStats;
    groupedStats?: { [groupValue: string]: NumericStats };
    table?: CategoricalTableItem[];
    groupedTable?: { [groupValue: string]: CategoricalTableItem[] };
    summary?: CategoricalSummary;
    plot?: string;
    error?: string;
    insights?: string[];
}

interface AnalysisResult {
    [key: string]: VariableResult;
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
const AnalysisDisplayShell = ({ children, varName, groupByVar }: { children: React.ReactNode, varName: string, groupByVar?: string }) => ( <Card><CardHeader><CardTitle>{varName}{groupByVar && <span className="text-sm text-muted-foreground ml-2"> (Grouped by {groupByVar})</span>}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card> );
const ChoiceAnalysisDisplay = ({ tableData, groupedTable, plotData, summaryData, insights, varName, groupByVar }: { tableData?: CategoricalTableItem[], groupedTable?: { [groupValue: string]: CategoricalTableItem[] }, plotData?: string, summaryData?: CategoricalSummary, insights?: string[], varName: string, groupByVar?: string }) => (
    <AnalysisDisplayShell varName={varName} groupByVar={groupByVar}>
        <div className="space-y-6">
            {plotData && <Image src={`data:image/png;base64,${plotData}`} alt={`${varName} plot`} width={500} height={400} className="rounded-md border" />}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {insights && insights.length > 0 && (
                        <Card className="border-l-4 border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-none">
                            <CardHeader className="flex flex-row items-center space-y-0 p-4"><Lightbulb className="h-5 w-5 text-primary mr-2" />
                            <CardTitle className="text-lg font-semibold text-primary">Key Insights</CardTitle></CardHeader>
                            <CardContent className="pt-0 pb-4">
                                <ul className="list-disc pl-4">
                                    {insights?.map((insight, i) => <li key={i}>{insight}</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
                {groupedTable ? (
                    <div className="space-y-4">
                        {Object.entries(groupedTable).map(([groupValue, groupTableData]) => (
                            <div key={groupValue} className="space-y-2 border p-4 rounded-md">
                                <h4 className="text-md font-semibold text-primary">{groupByVar}: {groupValue}</h4>
                                <Table className="border-none">
                                    <TableHeader><TableRow className="border-b"><TableHead className="p-2">Option</TableHead><TableHead className="text-right p-2">Count</TableHead><TableHead className="text-right p-2">Percentage</TableHead></TableRow></TableHeader>
                                    <TableBody>{groupTableData.map((item) => ( <TableRow key={String(item.Value)} className="border-b hover:bg-transparent"><TableCell className="p-2">{String(item.Value)}</TableCell><TableCell className="text-right p-2">{item.Frequency}</TableCell><TableCell className="text-right p-2">{item.Percentage.toFixed(1)}%</TableCell></TableRow> ))}</TableBody>
                                </Table>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2"><h3 className="text-lg font-semibold">Summary Statistics</h3><Table className="border-none"><TableHeader><TableRow className="border-b"><TableHead className="p-2">Option</TableHead><TableHead className="text-right p-2">Count</TableHead><TableHead className="text-right p-2">Percentage</TableHead></TableRow></TableHeader><TableBody>{tableData?.map((item) => ( <TableRow key={String(item.Value)} className="border-b hover:bg-transparent"><TableCell className="p-2">{String(item.Value)}</TableCell><TableCell className="text-right p-2">{item.Frequency}</TableCell><TableCell className="text-right p-2">{item.Percentage.toFixed(1)}%</TableCell></TableRow> ))}</TableBody></Table></div>
                )}
            </div>
        </div>
    </AnalysisDisplayShell>
);
const NumberAnalysisDisplay = ({ plotData, tableData, groupedStats, insights, varName, groupByVar }: { plotData?: string, tableData?: NumericStats, groupedStats?: { [groupValue: string]: NumericStats }, insights?: string[], varName: string, groupByVar?: string }) => (
    <AnalysisDisplayShell varName={varName} groupByVar={groupByVar}>
        <div className="space-y-6">
            {plotData && <Image src={`data:image/png;base64,${plotData}`} alt={`${varName} plot`} width={500} height={400} className="rounded-md border" />}
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-4">
                     {insights && insights.length > 0 && (
                        <Card className="border-l-4 border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-none">
                            <CardHeader className="flex flex-row items-center space-y-0 p-4"><Lightbulb className="h-5 w-5 text-primary mr-2" />
                            <CardTitle className="text-lg font-semibold text-primary">Key Insights</CardTitle></CardHeader>
                            <CardContent className="pt-0 pb-4">
                                <ul className="list-disc pl-4">
                                    {insights?.map((insight, i) => <li key={i}>{insight}</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
                {groupedStats ? (
                    <div className="space-y-4">
                        {Object.entries(groupedStats).map(([groupValue, groupStatsData]) => (
                            <div key={groupValue} className="space-y-2 border p-4 rounded-md">
                                <h4 className="text-md font-semibold text-primary">{groupByVar}: {groupValue}</h4>
                                <Table className="border-none">
                                    <TableHeader><TableRow className="border-b"><TableHead className="p-2">Statistic</TableHead><TableHead className="text-right p-2">Value</TableHead></TableRow></TableHeader>
                                    <TableBody>{Object.entries(groupStatsData).map(([key, value]) => (<TableRow key={key} className="border-b hover:bg-transparent"><TableCell className="capitalize p-2">{key.replace(/([A-Z])/g, ' $1').trim()}</TableCell><TableCell className="text-right font-mono p-2">{typeof value === 'number' ? value.toFixed(3) : value}</TableCell></TableRow>))}</TableBody>
                                </Table>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2"><h3 className="text-lg font-semibold">Summary Statistics</h3><Table className="border-none"><TableHeader><TableRow className="border-b"><TableHead className="p-2">Statistic</TableHead><TableHead className="text-right p-2">Value</TableHead></TableRow></TableHeader><TableBody>{tableData && Object.entries(tableData).map(([key, value]) => (<TableRow key={key} className="border-b hover:bg-transparent"><TableCell className="capitalize p-2">{key.replace(/([A-Z])/g, ' $1').trim()}</TableCell><TableCell className="text-right font-mono p-2">{typeof value === 'number' ? value.toFixed(3) : value}</TableCell></TableRow>))}</TableBody></Table></div>
                )}
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
    const [groupByVar, setGroupByVar] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => data.length > 0, [data]);

    useEffect(() => {
        setSelectedVars(allHeaders);
        setAnalysisData(null);
        setView(canRun ? 'main' : 'intro');
    }, [allHeaders, data, canRun]);

    const handleVarSelectionChange = (varName: string, isChecked: boolean) => { setSelectedVars(prev => isChecked ? [...prev, varName] : prev.filter(v => v !== varName)); };
    const handleGroupByChange = (value: string) => { setGroupByVar(value === 'None' ? null : value); };

    const runAnalysis = useCallback(async () => {
        if (groupByVar && selectedVars.includes(groupByVar)) {
            toast({ title: "Invalid Selection", description: "Group By variable cannot be one of the selected analysis variables.", variant: "destructive" });
            return;
        }
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
                body: JSON.stringify({ data, variables: selectedVars, groupBy: groupByVar })
            });
            if (!response.ok) { 
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            const results = await response.json();
            if (results.error) { throw new Error(results.error); }
            setAnalysisData(results.results);
            toast({ title: "Analysis Complete", description: `Descriptive statistics generated for ${selectedVars.length} variable(s).` });
        } catch (error: any) {
            toast({ title: "Analysis Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast, groupByVar]);
    
    const renderIndividualResults = () => {
        if (!analysisData) return null;
        return (
            <div className="space-y-8">
                {selectedVars.map(header => {
                    const result = analysisData[header];
                    if(!result || result.error) return <Card key={header}><CardHeader><CardTitle>{header}</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{result?.error || "Unknown error"}</AlertDescription></Alert></CardContent></Card>;
                    if(result.type === 'numeric' && (result.stats || result.groupedStats)) { return <NumberAnalysisDisplay key={header} plotData={result.plot} tableData={result.stats} groupedStats={result.groupedStats} insights={result.insights} varName={header} groupByVar={groupByVar || undefined} /> }
                    if(result.type === 'categorical' && (result.table || result.groupedTable)) { return <ChoiceAnalysisDisplay key={header} plotData={result.plot} tableData={result.table} groupedTable={result.groupedTable} summaryData={result.summary} insights={result.insights} varName={header} groupByVar={groupByVar || undefined} /> }
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <Label className="text-lg font-semibold mb-2 block">Variables for Analysis</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {allHeaders.map((h: string) => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`var-${h}`} onCheckedChange={(checked) => handleVarSelectionChange(h, !!checked)} checked={selectedVars.includes(h)} />
                                        <Label htmlFor={`var-${h}`} className="font-medium">{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="md:col-span-1">
                        <Label className="text-lg font-semibold mb-2 block">Group By (Optional)</Label>
                        <Select onValueChange={handleGroupByChange} value={groupByVar || 'None'}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">None</SelectItem>
                                {categoricalHeaders.map((header: string) => (
                                    <SelectItem key={header} value={header} disabled={selectedVars.includes(header)}>
                                        {header}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-2">Select a categorical variable to see statistics for each group.</p>
                    </div>
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
