'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}


interface CorrelationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CorrelationPage({ data, numericHeaders, onLoadExample }: CorrelationPageProps) {
  const { toast } = useToast();
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(numericHeaders.slice(0, 5));
  const [results, setResults] = useState<CorrelationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');

  useEffect(() => {
    setSelectedHeaders(numericHeaders.slice(0, 5));
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

  const resultHeaders = results ? Object.keys(results.correlation_matrix) : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Correlation Analysis Setup</CardTitle>
          <CardDescription>Select at least two numeric variables to analyze, choose a method, then click 'Run Analysis'.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <ScrollArea className="h-48 border rounded-md p-4">
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
      
      {isLoading && <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>}

      {results && !isLoading && (
        <>
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
                        <CardTitle className="text-sm font-medium">Strongest Effect</CardTitle>
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
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{correlationMethod.charAt(0).toUpperCase() + correlationMethod.slice(1)} Correlation Matrix</CardTitle>
                    <CardDescription>
                        <span>Each cell shows: Correlation (r) and p-value.
                        <Badge variant="outline" className="ml-2 border-green-500 text-green-500">p &lt; 0.05</Badge> indicates a statistically significant correlation.</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-auto max-h-[70vh] w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead></TableHead>
                                    {resultHeaders.map(h => <TableHead key={h} className="text-center">{h}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resultHeaders.map((h1, i) => (
                                    <TableRow key={h1}>
                                        <TableHead>{h1}</TableHead>
                                        {resultHeaders.map((h2, j) => {
                                            const corr = results.correlation_matrix[h1]?.[h2];
                                            const pValue = results.p_value_matrix[h1]?.[h2];
                                            const isSignificant = pValue !== undefined && pValue < 0.05;
                                            
                                            const colorClass = corr !== undefined && corr !== null
                                                ? corr > 0 ? `bg-sky-100/50 dark:bg-sky-900/50` : `bg-red-100/50 dark:bg-red-900/50`
                                                : '';
                                            const opacity = corr !== undefined && corr !== null ? Math.abs(corr) * 0.7 + 0.3 : 1;
                                            
                                            if (i === j) {
                                                return <TableCell key={h2} className="bg-muted/50 text-center font-mono">1.000</TableCell>
                                            }

                                            return (
                                                <TableCell key={h2} className={`text-center font-mono transition-colors ${colorClass}`} style={{opacity: opacity}}>
                                                <div className={cn("inline-block p-2 rounded-md", isSignificant && "ring-2 ring-green-500")}>
                                                    <div>r = {corr !== undefined ? corr.toFixed(3) : '-'}</div>
                                                    <div className="text-xs text-muted-foreground">p = {pValue !== undefined ? pValue.toFixed(3) : '-'}</div>
                                                </div>
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Strongest Correlations</CardTitle>
                        <CardDescription>Top 10 strongest relationships found in the data, sorted by absolute correlation value.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pair</TableHead>
                                    <TableHead className="text-right">Correlation (r)</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.strongest_correlations.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <div className="font-medium">{item.variable_1}</div>
                                            <div className="text-xs text-muted-foreground">vs. {item.variable_2}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{item.correlation.toFixed(3)}</TableCell>
                                        <TableCell className={cn("text-right font-mono", item.significant ? "text-green-600" : "")}>
                                            {item.p_value < 0.001 ? "<.001" : item.p_value.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
