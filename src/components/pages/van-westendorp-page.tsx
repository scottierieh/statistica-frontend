
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface AnalysisResponse {
    results: {
        prices: {
            too_cheap: number | null;
            cheap: number | null;
            expensive: number | null;
            too_expensive: number | null;
            optimal: number | null;
            indifference: number | null;
        };
        acceptable_range: (number | null)[];
    };
    plot: string;
}

interface VanWestendorpPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function VanWestendorpPage({ data, numericHeaders, onLoadExample }: VanWestendorpPageProps) {
    const { toast } = useToast();
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
    }, [data, numericHeaders]);

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
    
    const results = analysisResult?.results;

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

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Price Sensitivity Meter</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Van Westendorp Plot" width={1000} height={700} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Key Price Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                                    <dt className="text-sm font-medium">Optimal Price</dt>
                                    <dd className="text-3xl font-bold">${results.prices.optimal?.toFixed(2) ?? 'N/A'}</dd>
                                </div>
                                 <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                                    <dt className="text-sm font-medium">Indifference Price</dt>
                                    <dd className="text-3xl font-bold">${results.prices.indifference?.toFixed(2) ?? 'N/A'}</dd>
                                </div>
                                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg">
                                    <dt className="text-sm font-medium">Marginal Cheapness</dt>
                                    <dd className="text-3xl font-bold">${results.prices.too_cheap?.toFixed(2) ?? 'N/A'}</dd>
                                </div>
                                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                                    <dt className="text-sm font-medium">Marginal Expensiveness</dt>
                                    <dd className="text-3xl font-bold">${results.prices.expensive?.toFixed(2) ?? 'N/A'}</dd>
                                </div>
                            </dl>
                            {results.acceptable_range && results.acceptable_range[0] != null && results.acceptable_range[1] != null && (
                                 <Alert className="mt-4">
                                    <AlertTitle>Acceptable Price Range</AlertTitle>
                                    <AlertDescription>
                                        The data suggests an acceptable price range for your product is between <strong>${results.acceptable_range[0].toFixed(2)}</strong> and <strong>${results.acceptable_range[1].toFixed(2)}</strong>.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
