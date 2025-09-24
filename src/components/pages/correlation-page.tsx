
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, TrendingUp, Zap, Lightbulb, Bot, AlertTriangle, MessageSquareQuote, Link2, HelpCircle, MoveRight, Settings, FileSearch, Handshake, TestTube } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const corrExample = exampleDatasets.find(d => d.id === 'iris');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Link2 size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Correlation Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Measure the strength and direction of the linear relationship between two or more numeric variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Correlation Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Correlation analysis is a fundamental statistical method used to understand how variables move in relation to one another. It helps identify patterns in data, informs predictive modeling, and guides further investigation. A positive correlation means variables increase together, a negative correlation means one increases as the other decreases, and a zero correlation indicates no linear relationship.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Select Variables:</strong> Choose two or more numeric variables from your dataset that you want to compare.
                                </li>
                                <li>
                                    <strong>Choose Method:</strong> Select the appropriate correlation method.
                                    <ul className="list-disc pl-5 mt-2 text-xs">
                                        <li><strong>Pearson:</strong> For linear relationships between normally distributed variables.</li>
                                        <li><strong>Spearman:</strong> For monotonic relationships (variables tend to move in the same direction, but not necessarily linearly). Works on ranked data and is robust to outliers.</li>
                                        <li><strong>Kendall's Tau:</strong> Also a rank-based measure, often used for smaller datasets or data with many tied ranks.</li>
                                    </ul>
                                </li>
                                 <li>
                                    <strong>Group By (Optional):</strong> Select a categorical variable to color-code the points in the pairs plot, helping to visualize relationships within different groups.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> Click the button to calculate the correlation matrix, p-values, and generate visualizations.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><BarChart className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Correlation Coefficient (r):</strong> Ranges from -1 to +1. Values near ±1 indicate a strong linear relationship, while values near 0 indicate a weak or non-existent linear relationship.
                                </li>
                                <li>
                                    <strong>p-value:</strong> Indicates the statistical significance of the correlation. A p-value less than 0.05 typically means the observed correlation is unlikely to have occurred by chance.
                                </li>
                                <li>
                                    <strong>Pairs Plot:</strong> Provides scatterplots for each pair of variables, allowing for a visual inspection of their relationship and distribution.
                                </li>
                                <li>
                                    <strong>Heatmap:</strong> Offers a color-coded overview of the entire correlation matrix, making it easy to spot strong and weak relationships at a glance.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                    {corrExample && <Button variant="outline" onClick={() => onLoadExample(corrExample)}>Load Sample Iris Data</Button>}
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

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
  const [view, setView] = useState('intro');
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(numericHeaders.slice(0, 8));
  const [groupVar, setGroupVar] = useState<string | undefined>();
  const [results, setResults] = useState<CorrelationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');

  useEffect(() => {
    setSelectedHeaders(numericHeaders.slice(0, 8));
    setGroupVar(undefined);
    setResults(null);
    setView(data.length > 0 ? 'main' : 'intro');
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

  if (!canRun && view === 'main') {
        const corrExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('correlation'));
        return (
             <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />
        )
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

  const heatmapPlotData = results ? JSON.parse(results.heatmap_plot || '{}') : null;
  const pairsPlotData = results ? JSON.parse(results.pairs_plot || '{}') : null;


  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline">Correlation Analysis Setup</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
          </div>
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
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pairs">Pairs Plot</TabsTrigger>
                    <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
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
                 <TabsContent value="table">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Correlation & P-Value Table</CardTitle>
                            <CardDescription>Correlation coefficients with their corresponding p-values in parentheses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        {selectedHeaders.map(header => <TableHead key={header} className="text-right">{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedHeaders.map(rowHeader => (
                                        <TableRow key={rowHeader}>
                                            <TableHead>{rowHeader}</TableHead>
                                            {selectedHeaders.map(colHeader => {
                                                const corr = results.correlation_matrix[rowHeader]?.[colHeader];
                                                const pVal = results.p_value_matrix[rowHeader]?.[colHeader];
                                                return (
                                                    <TableCell key={colHeader} className="text-right font-mono">
                                                        {corr !== undefined ? corr.toFixed(3) : 'N/A'}
                                                        <br/>
                                                        <span className="text-xs text-muted-foreground">
                                                            (p={pVal !== undefined ? pVal.toFixed(3) : 'N/A'})
                                                        </span>
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
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
        </div>
      )}
      {!results && !isLoading && (
        <div className="text-center text-muted-foreground py-10">
          <p>Select variables and click 'Run Analysis' to see the results.</p>
        </div>
      )}
    </div>
  );
}

