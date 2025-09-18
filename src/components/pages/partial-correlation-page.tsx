
'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { ScrollArea } from '../ui/scroll-area';

interface CorrelationResults {
  correlation_matrix: { [key: string]: { [key: string]: number } };
  p_value_matrix: { [key: string]: { [key: string]: number } };
  heatmap_plot?: string;
}

interface PartialCorrelationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: any) => void;
}

export default function PartialCorrelationPage({ data, numericHeaders, onLoadExample }: PartialCorrelationPageProps) {
  const { toast } = useToast();
  const [selectedVars, setSelectedVars] = useState<string[]>(numericHeaders.slice(0, 4));
  const [controlVars, setControlVars] = useState<string[]>([numericHeaders[4]].filter(Boolean));
  const [results, setResults] = useState<CorrelationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');

  const availableForSelection = useMemo(() => numericHeaders.filter(h => !controlVars.includes(h)), [numericHeaders, controlVars]);
  const availableForControl = useMemo(() => numericHeaders.filter(h => !selectedVars.includes(h)), [numericHeaders, selectedVars]);
  
  useEffect(() => {
    setSelectedVars(numericHeaders.slice(0, 4));
    setControlVars([numericHeaders[4]].filter(Boolean));
    setResults(null);
  }, [numericHeaders, data]);


  const handleSelectionChange = (header: string, checked: boolean, type: 'main' | 'control') => {
      if (type === 'main') {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
      } else {
        setControlVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
      }
  };
  
  const handleAnalysis = useCallback(async () => {
    if (selectedVars.length < 2) {
      toast({variant: 'destructive', title: 'Selection Error', description: "Please select at least two main variables for correlation analysis."});
      return;
    }
    if (controlVars.length < 1) {
        toast({variant: 'destructive', title: 'Selection Error', description: "Please select at least one control variable."});
        return;
    }
    setIsLoading(true);
    setResults(null);
    
    try {
        const response = await fetch('/api/analysis/partial-correlation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: data,
                variables: selectedVars,
                controlVars: controlVars,
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
        toast({variant: 'destructive', title: 'Partial Correlation Error', description: e.message || 'An unexpected error occurred.'})
        setResults(null);
    } finally {
        setIsLoading(false);
    }
  }, [data, selectedVars, controlVars, toast, correlationMethod]);
  
  const canRun = useMemo(() => {
    return data.length > 0 && numericHeaders.length >= 3;
  }, [data, numericHeaders]);

  if (!canRun) {
    return (
      <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-lg text-center">
              <CardHeader>
                  <CardTitle className="font-headline">Partial Correlation Analysis</CardTitle>
                  <CardDescription>
                      To perform this analysis, you need to upload data with at least three numeric variables.
                  </CardDescription>
              </CardHeader>
          </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Partial Correlation Setup</CardTitle>
          <CardDescription>Select variables for analysis and variables to control for.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Variables to Correlate</Label>
                    <ScrollArea className="h-40 border rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4">
                        {availableForSelection.map(header => (
                        <div key={header} className="flex items-center space-x-2">
                            <Checkbox id={`corr-${header}`} checked={selectedVars.includes(header)} onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean, 'main')} />
                            <label htmlFor={`corr-${header}`} className="text-sm font-medium leading-none">{header}</label>
                        </div>
                        ))}
                    </div>
                    </ScrollArea>
                </div>
                <div>
                    <Label>Control Variables</Label>
                    <ScrollArea className="h-40 border rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4">
                        {availableForControl.map(header => (
                        <div key={header} className="flex items-center space-x-2">
                            <Checkbox id={`ctrl-${header}`} checked={controlVars.includes(header)} onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean, 'control')} />
                            <label htmlFor={`ctrl-${header}`} className="text-sm font-medium leading-none">{header}</label>
                        </div>
                        ))}
                    </div>
                    </ScrollArea>
                </div>
            </div>
           <div className="flex flex-wrap items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                    <Label>Method:</Label>
                    <Select value={correlationMethod} onValueChange={(v) => setCorrelationMethod(v as any)}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pearson">Pearson</SelectItem>
                            <SelectItem value="spearman">Spearman</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleAnalysis} className="w-full md:w-auto" disabled={selectedVars.length < 2 || controlVars.length < 1 || isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                </Button>
           </div>
        </CardContent>
      </Card>
      
      {isLoading && <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>}

      {results && !isLoading && (
        <>
            {results.heatmap_plot && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Partial Correlation Heatmap</CardTitle>
                        <CardDescription>Visual representation of the partial correlation matrix, controlling for selected variables.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src={`data:image/png;base64,${results.heatmap_plot}`} alt="Partial Correlation Heatmap" width={1000} height={800} className="w-full rounded-md border" />
                    </CardContent>
                </Card>
            )}
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
