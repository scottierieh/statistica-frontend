'use client';
import { useState, useMemo, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';

interface CorrelationResult {
    correlation: number;
    p_value: number;
}

interface CorrelationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CorrelationPage({ data, numericHeaders, onLoadExample }: CorrelationPageProps) {
  const { toast } = useToast();
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(numericHeaders.slice(0, 5));
  const [results, setResults] = useState<{ headers: string[], matrix: (CorrelationResult | null)[][] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
                method: 'pearson' 
            })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();

        // Reconstruct the matrix for the UI
        const matrix: (CorrelationResult | null)[][] = Array(selectedHeaders.length).fill(null).map(() => Array(selectedHeaders.length).fill(null));
        result.forEach((item: any) => {
            const i = selectedHeaders.indexOf(item.variable_1);
            const j = selectedHeaders.indexOf(item.variable_2);
            if (i > -1 && j > -1) {
                const corrData = { correlation: item.correlation, p_value: item.p_value };
                matrix[i][j] = corrData;
                matrix[j][i] = corrData;
            }
        });
        // Fill diagonal
        for (let i=0; i < selectedHeaders.length; i++) {
            matrix[i][i] = { correlation: 1, p_value: 0 };
        }

        setResults({ headers: selectedHeaders, matrix });

    } catch (e: any) {
        console.error('Analysis error:', e);
        toast({variant: 'destructive', title: 'Correlation Analysis Error', description: e.message || 'An unexpected error occurred.'})
        setResults(null);
    } finally {
        setIsLoading(false);
    }
  }, [data, selectedHeaders, toast]);
  
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
          <CardDescription>Select at least two numeric variables to analyze, then click 'Run Analysis'.</CardDescription>
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
           <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={selectedHeaders.length < 2 || isLoading}>
              {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
            </Button>
        </CardContent>
      </Card>
      
      {isLoading && <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>}

      {results && !isLoading && (
        <Card>
          <CardHeader>
              <CardTitle className="font-headline">Pearson Correlation Matrix</CardTitle>
              <CardDescription>
                Each cell shows: Correlation (r) and p-value.
                <Badge variant="outline" className="ml-2 border-green-500 text-green-500">p &lt; 0.05</Badge> indicates a statistically significant correlation.
              </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-auto max-h-[70vh] w-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead></TableHead>
                            {results.headers.map(h => <TableHead key={h} className="text-center">{h}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.headers.map((h1, i) => (
                            <TableRow key={h1}>
                                <TableHead>{h1}</TableHead>
                                {results.headers.map((h2, j) => {
                                    const value = results.matrix[i]?.[j];
                                    const corr = value?.correlation;
                                    const pValue = value?.p_value;

                                    const isSignificant = pValue !== undefined && pValue < 0.05;
                                    
                                    const colorClass = corr !== undefined && corr !== null
                                        ? corr > 0 ? `bg-sky-100/50 dark:bg-sky-900/50` : `bg-red-100/50 dark:bg-red-900/50`
                                        : '';
                                    const opacity = corr !== undefined && corr !== null ? Math.abs(corr) * 0.7 + 0.3 : 1;
                                    
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
      )}
      {!results && !isLoading && (
        <div className="text-center text-muted-foreground py-10">
          <p>Select variables and click 'Run Analysis' to see the results.</p>
        </div>
      )}
    </div>
  )
}
