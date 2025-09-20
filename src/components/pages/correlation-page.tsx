
'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, TrendingUp, Zap, Lightbulb, Bot, AlertTriangle, MessageSquareQuote } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '../ui/scroll-area';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import dynamic from 'next/dynamic';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';


const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[600px]" />,
});


interface CorrelationResults {
  correlation_matrix: { [key: string]: { [key: string]: number } };
  p_value_matrix: { [key: string]: { [key: string]: number } };
  summary_statistics: {
    mean_correlation: number;
    median_correlation: number;
    std_dev: number;
    range: [number, number];
    significant_correlations: number;
    total_pairs: number;
  };
  strongest_correlations: {
    variable_1: string;
    variable_2: string;
    correlation: number;
    p_value: number;
    significant: boolean;
  }[];
  interpretation: {
    title: string;
    body: string;
  };
  pairs_plot?: string;
  heatmap_plot?: string;
}

const InterpretationDisplay = ({ title, body }: { title: string, body: string }) => {
    if (!title || !body) return null;

    const formattedBody = useMemo(() => {
        return body
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>');
    }, [body]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Bot /> AI Interpretation
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert>
                    <MessageSquareQuote className="h-4 w-4" />
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap font-sans" dangerouslySetInnerHTML={{ __html: formattedBody }}/>
                </Alert>
            </CardContent>
        </Card>
    )
}

const StrongestCorrelationsChart = ({ data }: { data: CorrelationResults['strongest_correlations'] }) => {
    const chartData = data.map(item => ({
        name: `${item.variable_1.substring(0,10)} & ${item.variable_2.substring(0,10)}`,
        correlation: item.correlation
    })).reverse();
    
    const chartConfig = {
      correlation: {
        label: "Correlation",
        color: "hsl(var(--chart-1))"
      },
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Strongest Correlations</CardTitle>
                 <CardDescription>Top 10 strongest relationships found in the data.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="w-full h-[300px]">
                    <RechartsBarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" dataKey="correlation" domain={[-1, 1]}/>
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                        <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}} />
                        <ReferenceLine x={0} stroke="#666" />
                        <Bar dataKey="correlation">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.correlation > 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"} />
                            ))}
                        </Bar>
                    </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

interface CorrelationPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CorrelationPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: CorrelationPageProps) {
  const { toast } = useToast();
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(numericHeaders.slice(0, 8));
  const [groupVar, setGroupVar] = useState<string | undefined>();
  const [results, setResults] = useState<CorrelationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');

  useEffect(() => {
    setSelectedHeaders(numericHeaders.slice(0, 8));
    setGroupVar(undefined);
    setResults(null);
  }, [numericHeaders, data]);

  const handleSelectionChange = (header: string, checked: boolean) => {
    setSelectedHeaders(prev => 
      checked ? [...prev, header] : prev.filter(h => h !== header)
    );
  };
  
  const handleAnalysis = useCallback(async () => {
    if (selectedHeaders.length < 2) {
      toast({variant: 'destructive', title: 'Selection Error', description: "Please select at least two numeric variables for correlation analysis."});
      return;
    }
    setIsLoading(true);
    setResults(null);
    
    try {
        const response = await fetch('/api/analysis/correlation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: data,
                variables: selectedHeaders,
                groupVar: groupVar,
                method: correlationMethod, 
            })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
        }
        
        const result: CorrelationResults = await response.json();
        setResults(result);

    } catch (e: any) {
        console.error('Analysis error:', e);
        toast({variant: 'destructive', title: 'Correlation Analysis Error', description: e.message || 'An unexpected error occurred.'})
        setResults(null);
    } finally {
        setIsLoading(false);
    }
  }, [data, selectedHeaders, groupVar, toast, correlationMethod]);
  
  const canRun = useMemo(() => {
    return data.length > 0 && numericHeaders.length >= 2;
  }, [data, numericHeaders]);

  if (!canRun) {
    const corrExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('correlation'));
    return (
      <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-2xl text-center">
              <CardHeader>
                  <CardTitle className="font-headline">Correlation Analysis</CardTitle>
                  <CardDescription>
                      To perform a correlation analysis, you need to upload data with at least two numeric variables. Try one of our example datasets.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {corrExamples.map((ex) => {
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
    );
  }

  const heatmapPlotData = results ? JSON.parse(results.heatmap_plot || '{}') : null;
  const pairsPlotData = results ? JSON.parse(results.pairs_plot || '{}') : null;


  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Correlation Analysis Setup</CardTitle>
          <CardDescription>Select variables and choose a correlation method.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <div className="grid md:grid-cols-2 gap-4">
                 <div>
                    <Label>Variables for Correlation</Label>
                    <ScrollArea className="h-40 border rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4">
                        {numericHeaders.map(header => (
                        <div key={header} className="flex items-center space-x-2">
                            <Checkbox
                            id={`corr-${header}`}
                            checked={selectedHeaders.includes(header)}
                            onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean)}
                            />
                            <label htmlFor={`corr-${header}`} className="text-sm font-medium leading-none">
                            {header}
                            </label>
                        </div>
                        ))}
                    </div>
                    </ScrollArea>
                </div>
                 <div>
                    <Label>Group By (for coloring)</Label>
                    <Select value={groupVar} onValueChange={(v) => setGroupVar(v === 'none' ? undefined : v)}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
           <div className="flex flex-wrap items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                    <Label>Method:</Label>
                    <Select value={correlationMethod} onValueChange={(v) => setCorrelationMethod(v as any)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pearson">Pearson</SelectItem>
                            <SelectItem value="spearman">Spearman</SelectItem>
                            <SelectItem value="kendall">Kendall's Tau</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleAnalysis} className="w-full md:w-auto" disabled={selectedHeaders.length < 2 || isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                </Button>
           </div>
        </CardContent>
      </Card>
      
      {isLoading && <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>}

      {results && !isLoading && (
        <div className="space-y-4">
            {results.interpretation && <InterpretationDisplay title={results.interpretation.title} body={results.interpretation.body} />}

            <Tabs defaultValue="pairs">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pairs">Pairs Plot</TabsTrigger>
                    <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                </TabsList>
                <TabsContent value="pairs">
                    {pairsPlotData ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Pairs Plot</CardTitle>
                                <CardDescription>A matrix of scatterplots to visualize pairwise relationships, colored by group if specified.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Plot
                                    data={pairsPlotData.data}
                                    layout={pairsPlotData.layout}
                                    useResizeHandler={true}
                                    className="w-full h-[800px]"
                                />
                            </CardContent>
                        </Card>
                    ): (
                         <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                                Pairs plot could not be generated. This can happen with a large number of variables.
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="heatmap">
                    {heatmapPlotData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Correlation Matrix Heatmap</CardTitle>
                                <CardDescription>Visual representation of the correlation matrix. Warmer colors indicate positive correlation, cooler colors indicate negative.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Plot
                                    data={heatmapPlotData.data}
                                    layout={heatmapPlotData.layout}
                                    useResizeHandler={true}
                                    className="w-full h-[600px]"
                                />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
            
            <div className="grid gap-4 md:grid-cols-2">
                 <StrongestCorrelationsChart data={results.strongest_correlations} />
                  <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Summary Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground">Mean Correlation</p>
                                <p className="text-2xl font-bold">{results.summary_statistics.mean_correlation.toFixed(3)}</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground">Significant Pairs</p>
                                <p className="text-2xl font-bold">
                                    {results.summary_statistics.significant_correlations} / {results.summary_statistics.total_pairs}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
            </div>
        </>
      )}
      {!results && !isLoading && (
        <div className="text-center text-muted-foreground py-10">
          <p>Select variables and click 'Run Analysis' to see the results.</p>
        </div>
      )}
    </div>
  )
}
