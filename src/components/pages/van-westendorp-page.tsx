'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign, Info, Brain, LineChart, AlertTriangle, HelpCircle, MoveRight } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[500px]" />,
});


interface AnalysisResponse {
    results: {
        opp: number | null;
        pme: number | null;
        mdp: number | null;
        ipp: number | null;
    };
    plotData: any; // Keep this flexible for plotly data structure
}

interface VanWestendorpPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const StatCard = ({ title, value, unit = '$' }: { title: string, value: number | undefined | null, unit?: string }) => (
    <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value !== undefined && value !== null ? `${unit}${value.toFixed(2)}` : 'N/A'}</p>
    </div>
);

export default function VanWestendorpPage({ data, numericHeaders, onLoadExample }: VanWestendorpPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [tooCheapCol, setTooCheapCol] = useState<string | undefined>();
    const [cheapCol, setCheapCol] = useState<string | undefined>();
    const [expensiveCol, setExpensiveCol] = useState<string | undefined>();
    const [tooExpensiveCol, setTooExpensiveCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 4, [data, numericHeaders]);
    
    useEffect(() => {
        setTooCheapCol(numericHeaders.find(h => h.toLowerCase().includes('toocheap')));
        setCheapCol(numericHeaders.find(h => h.toLowerCase().includes('cheap')));
        setExpensiveCol(numericHeaders.find(h => h.toLowerCase().includes('expensive')));
        setTooExpensiveCol(numericHeaders.find(h => h.toLowerCase().includes('tooexpensive')));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!tooCheapCol || !cheapCol || !expensiveCol || !tooExpensiveCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all four price perception columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/van-westendorp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    too_cheap_col: tooCheapCol,
                    cheap_col: cheapCol,
                    expensive_col: expensiveCol,
                    too_expensive_col: tooExpensiveCol,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "Van Westendorp analysis finished successfully." });

        } catch (e: any) {
            console.error('Van Westendorp error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, tooCheapCol, cheapCol, expensiveCol, tooExpensiveCol, toast]);
    
    const results = analysisResult?.results;
    
    const plotData = useMemo(() => {
        if (!analysisResult?.plotData) return null;
        try {
            const { prices, too_cheap, cheap, expensive, too_expensive } = analysisResult.plotData;
            
            const traces = [
                { x: prices, y: too_expensive, mode: 'lines', name: 'Too Expensive', line: { color: 'red'} },
                { x: prices, y: expensive, mode: 'lines', name: 'Expensive', line: { color: 'orange'} },
                { x: prices, y: cheap.map((v: number) => 100 - v), mode: 'lines', name: 'Not Cheap', line: { color: 'blue'} },
                { x: prices, y: too_cheap.map((v: number) => 100 - v), mode: 'lines', name: 'Not Too Cheap', line: { color: 'skyblue', dash: 'dash' } }
            ];

            return { data: traces };
        } catch(e) {
            console.error("Failed to parse plot data", e);
            return null;
        }
    }, [analysisResult]);


    const layout = useMemo(() => {
      if (!results) return {};
      
      const shapes: any[] = [];
      const annotations: any[] = [];
      const addAnnotation = (x: number | null, y: number, text: string) => {
        if(x === null) return;
        annotations.push({ x: x, y: y, text: text, showarrow: true, arrowhead: 4, ax: 0, ay: -40, bgcolor: 'rgba(255, 255, 255, 0.7)' });
      };

      if (results.pme) {
          shapes.push({ type: 'line', x0: results.pme, x1: results.pme, y0: 0, y1: 100, line: { color: 'grey', width: 1, dash: 'dot' } });
          addAnnotation(results.pme, 95, 'PME');
      }
      if (results.ipp) {
          shapes.push({ type: 'line', x0: results.ipp, x1: results.ipp, y0: 0, y1: 100, line: { color: 'grey', width: 1, dash: 'dot' } });
          addAnnotation(results.ipp, 85, 'IPP');
      }
       if (results.mdp) {
          shapes.push({ type: 'line', x0: results.mdp, x1: results.mdp, y0: 0, y1: 100, line: { color: 'purple', width: 2, dash: 'dash' } });
           addAnnotation(results.mdp, 75, 'Point of Marginal<br>Cheapness');
      }
      if (results.opp) {
          shapes.push({ type: 'line', x0: results.opp, x1: results.opp, y0: 0, y1: 100, line: { color: 'green', width: 2, dash: 'dash' } });
           addAnnotation(results.opp, 65, 'Optimal Price Point');
      }
      
      return {
        title: 'Van Westendorp Price Sensitivity Meter',
        xaxis: { title: 'Price' },
        yaxis: { title: 'Percentage of Respondents (%)', range: [0, 100] },
        shapes: shapes,
        annotations: annotations,
        legend: { x: 0.01, y: 0.99 },
        autosize: true
      };
    }, [results]);

    useEffect(() => {
        setTooCheapCol(numericHeaders.find(h => h.toLowerCase().includes('toocheap')));
        setCheapCol(numericHeaders.find(h => h.toLowerCase().includes('cheap')));
        setExpensiveCol(numericHeaders.find(h => h.toLowerCase().includes('expensive')));
        setTooExpensiveCol(numericHeaders.find(h => h.toLowerCase().includes('tooexpensive')));
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    if (!canRun) {
        const psmExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('van-westendorp'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Van Westendorp Price Sensitivity Meter</CardTitle>
                        <CardDescription>
                           To perform this analysis, you need data with four price perception columns (Too Cheap, Cheap, Expensive, Too Expensive).
                        </CardDescription>
                    </CardHeader>
                    {psmExamples.length > 0 && (
                        <CardContent>
                             <Button onClick={() => onLoadExample(psmExamples[0])} className="w-full" size="sm">
                                Load {psmExamples[0].name}
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
                    <CardTitle className="font-headline">Van Westendorp Analysis Setup</CardTitle>
                    <CardDescription>Map the four price perception columns from your data.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>How to Set Up Your Data</AlertTitle>
                        <AlertDescription>
                            Each row should represent a single respondent. The four selected columns should contain the price points they indicated for each category: 'Too Cheap', 'Cheap', 'Expensive', and 'Too Expensive'.
                        </AlertDescription>
                    </Alert>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <div>
                            <Label>Too Cheap Column</Label>
                            <Select value={tooCheapCol} onValueChange={setTooCheapCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <Label>Cheap Column</Label>
                            <Select value={cheapCol} onValueChange={setCheapCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <Label>Expensive Column</Label>
                            <Select value={expensiveCol} onValueChange={setExpensiveCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Too Expensive Column</Label>
                            <Select value={tooExpensiveCol} onValueChange={setTooExpensiveCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !tooCheapCol || !cheapCol || !expensiveCol || !tooExpensiveCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && plotData && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Price Sensitivity Meter</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Plot
                                data={plotData.data}
                                layout={layout}
                                useResizeHandler={true}
                                className="w-full h-[500px]"
                                config={{ scrollZoom: true }}
                            />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Key Price Points</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <StatCard title="Optimal Price (OPP)" value={results.opp} />
                             <StatCard title="Indifference Price (IPP)" value={results.ipp} />
                             <StatCard title="Marginal Cheapness (PMC)" value={results.mdp} />
                             <StatCard title="Marginal Expensiveness (PME)" value={results.pme} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
