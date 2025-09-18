

'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, TrendingUp, Zap, Lightbulb, Bot, AlertTriangle, MessageSquareQuote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import Image from 'next/image';

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
  effect_sizes: {
    distribution: { [key: string]: number };
    strongest_effect: string;
  };
  strongest_correlations: {
    variable_1: string;
    variable_2: string;
    correlation: number;
    p_value: number;
    significant: boolean;
  }[];
  pairs_plot?: string;
  heatmap_plot?: string;
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
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CorrelationPage({ data, numericHeaders, onLoadExample }: CorrelationPageProps) {
  const { toast } = useToast();
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(numericHeaders.slice(0, 8));
  const [results, setResults] = useState<CorrelationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');

  useEffect(() => {
    setSelectedHeaders(numericHeaders.slice(0, 8));
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
  }, [data, selectedHeaders, toast, correlationMethod]);
  
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
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Correlation Analysis Setup</CardTitle>
          <CardDescription>Select variables and choose a correlation method.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <div>
                <Label>Variables for Correlation</Label>
                <ScrollArea className="h-40 border rounded-md p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <>
             {results.pairs_plot && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Pairs Plot</CardTitle>
                        <CardDescription>A matrix of scatterplots for each variable pair, distributions for each variable, and correlation coefficients.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src={`data:image/png;base64,${results.pairs_plot}`} alt="Pairs Plot" width={800} height={800} className="w-full rounded-md border" />
                    </CardContent>
                </Card>
            )}
            {results.heatmap_plot && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Correlation Matrix Heatmap</CardTitle>
                        <CardDescription>Visual representation of the correlation matrix. Warmer colors indicate positive correlation, cooler colors indicate negative.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src={`data:image/png;base64,${results.heatmap_plot}`} alt="Correlation Heatmap" width={1000} height={800} className="w-full rounded-md border" />
                    </CardContent>
                </Card>
            )}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mean Correlation</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{results.summary_statistics.mean_correlation.toFixed(3)}</div>
                        <p className="text-xs text-muted-foreground">across all pairs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Significant Pairs</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {results.summary_statistics.significant_correlations} / {results.summary_statistics.total_pairs}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ({((results.summary_statistics.significant_correlations / results.summary_statistics.total_pairs) * 100 || 0).toFixed(1)}%)
                            at p &lt; 0.05
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Strongest Effect Size</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{results.effect_sizes.strongest_effect}</div>
                         <p className="text-xs text-muted-foreground">
                            {results.effect_sizes.distribution[results.effect_sizes.strongest_effect] || 0} pairs
                        </p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-1">
                 <StrongestCorrelationsChart data={results.strongest_correlations} />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Detailed Correlation Pairs</CardTitle>
                    <CardDescription>All analyzed correlation pairs sorted by absolute strength.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Variable 1</TableHead>
                                    <TableHead>Variable 2</TableHead>
                                    <TableHead className="text-right">Correlation (r)</TableHead>
                                    <TableHead className="text-right">P-value</TableHead>
                                    <TableHead className="text-center">Significant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.strongest_correlations.map((corr, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{corr.variable_1}</TableCell>
                                        <TableCell>{corr.variable_2}</TableCell>
                                        <TableCell className="text-right font-mono">{corr.correlation.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{corr.p_value < 0.001 ? "<.001" : corr.p_value.toFixed(3)}</TableCell>
                                        <TableCell className="text-center">
                                            {corr.significant ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
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
