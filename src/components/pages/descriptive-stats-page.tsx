'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsTrigger, TabsContent, TabsList } from '@/components/ui/tabs';


type NumericStats = {
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
    range: number;
    iqr: number;
    count: number;
    skewness: number;
    kurtosis: number;
};

type CategoricalSummary = {
    unique: number;
    mode: string | number | (string | number)[];
    count: number;
};

type CategoricalTable = {
    Value: string;
    Frequency: number;
    Percentage: number;
}[];

interface AnalysisResult {
    [variable: string]: {
        type: 'numeric' | 'categorical';
        stats?: NumericStats;
        summary?: CategoricalSummary;
        table?: CategoricalTable;
        plots: {
            histogram?: string;
            boxplot?: string;
            bar?: string;
            pie?: string;
            donut?: string;
        };
        insights?: string[];
        groupedStats?: { [group: string]: NumericStats };
        groupedTable?: { [group: string]: CategoricalTable };
        error?: string;
    };
}

interface FullAnalysisResponse {
    results: AnalysisResult;
}

const SummaryTable = ({ results, groupByVar }: { results: AnalysisResult | null, groupByVar?: string }) => {
    if (!results) return null;

    const allNumericStats: (NumericStats & { variable: string })[] = [];
    const allCategoricalSummaries: (CategoricalSummary & { variable: string })[] = [];

    for (const variable in results) {
        const res = results[variable];
        if (res.type === 'numeric' && res.stats) {
            allNumericStats.push({ variable, ...res.stats });
        } else if (res.type === 'categorical' && res.summary) {
            allCategoricalSummaries.push({ variable, ...res.summary });
        }
    }

    const numericStatKeys: (keyof NumericStats)[] = ['mean', 'median', 'stdDev', 'min', 'max', 'range', 'iqr', 'skewness', 'kurtosis', 'count'];
    const categoricalSummaryKeys: (keyof CategoricalSummary)[] = ['unique', 'mode', 'count'];

    const renderGroupedNumericTable = (variable: string) => {
        const groupedData = results[variable]?.groupedStats;
        if (!groupedData) return null;

        return (
            <div key={`${variable}-grouped`} className="mt-6">
                <h4 className="font-semibold mb-2">Grouped by {groupByVar} for: {variable}</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{groupByVar}</TableHead>
                            {numericStatKeys.map(key => <TableHead key={key} className="text-right">{key.replace(/([A-Z])/g, ' $1').trim()}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(groupedData).map(([group, stats]) => (
                            <TableRow key={group}>
                                <TableCell className="font-medium">{group}</TableCell>
                                {numericStatKeys.map(key => (
                                    <TableCell key={key} className="text-right font-mono">
                                        {stats[key] !== undefined && stats[key] !== null ? (stats[key] as number).toFixed(2) : 'N/A'}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader><CardTitle>Summary Statistics</CardTitle></CardHeader>
            <CardContent>
                {allNumericStats.length > 0 && (
                    <>
                        <h3 className="font-semibold text-lg mb-2">Numeric Variables</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variable</TableHead>
                                    {numericStatKeys.map(key => <TableHead key={key} className="text-right">{key.replace(/([A-Z])/g, ' $1').trim()}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allNumericStats.map(row => (
                                    <TableRow key={row.variable}>
                                        <TableCell className="font-medium">{row.variable}</TableCell>
                                        {numericStatKeys.map(key => (
                                            <TableCell key={key} className="text-right font-mono">
                                                {row[key] !== undefined && row[key] !== null ? (row[key] as number).toFixed(2) : 'N/A'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}

                {allCategoricalSummaries.length > 0 && (
                     <>
                        <h3 className="font-semibold text-lg mt-6 mb-2">Categorical Variables</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variable</TableHead>
                                    {categoricalSummaryKeys.map(key => <TableHead key={key} className="text-right">{key}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {allCategoricalSummaries.map(row => (
                                    <TableRow key={row.variable}>
                                        <TableCell className="font-medium">{row.variable}</TableCell>
                                        {categoricalSummaryKeys.map(key => (
                                            <TableCell key={key} className="text-right font-mono">
                                                {Array.isArray(row[key]) ? (row[key] as any[]).join(', ') : String(row[key])}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}
                 {groupByVar && allNumericStats.map(stat => renderGroupedNumericTable(stat.variable))}
            </CardContent>
        </Card>
    );
};

const AnalysisDisplay = ({ variable, result, groupByVar }: { variable: string; result: AnalysisResult[string], groupByVar?: string }) => {
    const isNumeric = result.type === 'numeric';
    const stats = result.stats as NumericStats;
    const summary = result.summary as CategoricalSummary;
    const table = result.table as CategoricalTable;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{variable}</CardTitle>
                <CardDescription>{isNumeric ? "Numeric Analysis" : "Categorical Analysis"}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        {isNumeric && stats && (
                            <>
                                {result.insights && result.insights.length > 0 && (
                                     <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Key Insights</AlertTitle>
                                        <AlertDescription>
                                            <ul className="list-disc pl-5">
                                                {result.insights.map((insight, i) => <li key={i}>{insight}</li>)}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Table>
                                    <TableBody>
                                        {(Object.keys(stats) as (keyof NumericStats)[]).map(key => (
                                            <TableRow key={key}><TableCell className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}</TableCell><TableCell className="text-right font-mono">{(stats as NumericStats)[key]?.toFixed(2) ?? 'N/A'}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                        {!isNumeric && summary && table && (
                             <>
                                {result.insights && result.insights.length > 0 && (
                                     <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Key Insights</AlertTitle>
                                        <AlertDescription>
                                            <ul className="list-disc pl-5">
                                                {result.insights.map((insight, i) => <li key={i}>{insight}</li>)}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Value</TableHead>
                                            <TableHead className="text-right">Frequency</TableHead>
                                            <TableHead className="text-right">Percentage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {table.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{String(row.Value)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.Frequency}</TableCell>
                                                <TableCell className="text-right font-mono">{row.Percentage.toFixed(2)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                    </div>
                     <div className="grid grid-cols-1 gap-4">
                        {isNumeric && result.plots.histogram && <Image src={`data:image/png;base64,${result.plots.histogram}`} alt="Histogram" width={400} height={300} className="w-full rounded-md border" />}
                        {isNumeric && result.plots.boxplot && <Image src={`data:image/png;base64,${result.plots.boxplot}`} alt="Box Plot" width={400} height={300} className="w-full rounded-md border" />}
                        {!isNumeric && result.plots.bar && <Image src={`data:image/png;base64,${result.plots.bar}`} alt="Bar Chart" width={400} height={300} className="w-full rounded-md border" />}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface DescriptiveStatsPageProps {
  data: DataSet;
  numericHeaders: string[];
  categoricalHeaders: string[];
  allHeaders: string[];
  onLoadExample: (example: ExampleDataSet) => void;
}

export default function DescriptiveStatsPage({ data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample }: DescriptiveStatsPageProps) {
    const { toast } = useToast();
    const [selectedVars, setSelectedVars] = useState<string[]>(numericHeaders.concat(categoricalHeaders));
    const [groupByVar, setGroupByVar] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0, [data]);

    useEffect(() => {
        setSelectedVars(numericHeaders.concat(categoricalHeaders));
        setGroupByVar(undefined);
        setAnalysisResult(null);
    }, [numericHeaders, categoricalHeaders]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one variable to analyze.' });
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

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, groupByVar, toast]);

    if (!canRun) {
        const statsExample = exampleDatasets.find(ex => ex.analysisTypes.includes('stats'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Descriptive Statistics</CardTitle>
                        <CardDescription>
                            To begin, please load a dataset. You can upload your own file or use one of our examples.
                        </CardDescription>
                    </CardHeader>
                    {statsExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(statsExample)}>
                                <BarChart className="mr-2 h-4 w-4" />
                                Load Sample Data
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Descriptive Statistics Setup</CardTitle>
                    <CardDescription>Select variables to analyze and an optional grouping variable.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables to Analyze</Label>
                        <ScrollArea className="h-40 border rounded-md p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {allHeaders.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`var-${header}`}
                                            checked={selectedVars.includes(header)}
                                            onCheckedChange={(checked) => handleVarSelectionChange(header, checked as boolean)}
                                        />
                                        <label htmlFor={`var-${header}`} className="text-sm font-medium leading-none">{header}</label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                     <div>
                        <Label>Group By (Optional)</Label>
                         <Select value={groupByVar} onValueChange={(v) => setGroupByVar(v === 'none' ? undefined : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {categoricalHeaders.filter(h => h !== groupByVar).map(header => (
                                    <SelectItem key={header} value={header}>{header}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <Tabs defaultValue="individual" className="w-full">
                    <TabsList>
                        <TabsTrigger value="individual">Individual Analysis</TabsTrigger>
                        <TabsTrigger value="summary">Summary Table</TabsTrigger>
                    </TabsList>
                    <TabsContent value="individual" className="space-y-4">
                        {Object.entries(analysisResult.results).map(([variable, result]) => {
                            if (result.error) {
                                return <Card key={variable}><CardHeader><CardTitle>{variable}</CardTitle></CardHeader><CardContent><p className="text-destructive">{result.error}</p></CardContent></Card>
                            }
                            return <AnalysisDisplay key={variable} variable={variable} result={result} groupByVar={groupByVar} />
                        })}
                    </TabsContent>
                    <TabsContent value="summary">
                         <SummaryTable results={analysisResult.results} groupByVar={groupByVar} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
