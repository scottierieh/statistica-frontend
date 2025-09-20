
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface PsmPrices {
    too_cheap: number;
    cheap: number;
    expensive: number;
    too_expensive: number;
    optimal: number;
}

interface AnalysisResponse {
    results: {
        prices: PsmPrices;
        acceptable_range: [number, number];
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
        const findCol = (keywords: string[]) => numericHeaders.find(h => keywords.some(k => h.toLowerCase().includes(k)));
        
        setTooCheapCol(findCol(['too cheap', 'toocheap']));
        setCheapCol(findCol(['cheap', 'bargain']));
        setExpensiveCol(findCol(['expensive', 'costly']));
        setTooExpensiveCol(findCol(['too expensive', 'tooexpensive']));
        
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
                    too_expensive_col: tooExpensiveCol
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "PSM analysis finished successfully." });

        } catch (e: any) {
            console.error('PSM Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, tooCheapCol, cheapCol, expensiveCol, tooExpensiveCol, toast]);

    if (!canRun) {
        // In a real app, you might suggest loading an example dataset here
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Van Westendorp Price Sensitivity Meter</CardTitle>
                        <CardDescription>
                           To perform this analysis, you need data with four numeric columns representing price perceptions (Too Cheap, Cheap, Expensive, Too Expensive).
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Van Westendorp PSM Setup</CardTitle>
                    <CardDescription>Map the four price perception questions from your survey.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><Label>"Too Cheap" Column</Label><Select value={tooCheapCol} onValueChange={setTooCheapCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>"Cheap" Column</Label><Select value={cheapCol} onValueChange={setCheapCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>"Expensive" Column</Label><Select value={expensiveCol} onValueChange={setExpensiveCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>"Too Expensive" Column</Label><Select value={tooExpensiveCol} onValueChange={setTooExpensiveCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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
                            <CardTitle className="font-headline">Price Perception Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Van Westendorp Plot" width={1000} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Key Price Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Alert>
                                <DollarSign className="h-4 w-4" />
                                <AlertTitle>Optimal Price Point (OPP)</AlertTitle>
                                <AlertDescription>
                                    The price at which an equal number of customers find the product 'too cheap' and 'too expensive'. This is often considered the ideal price.
                                    <p className="text-2xl font-bold mt-2">${results.prices.optimal.toFixed(2)}</p>
                                </AlertDescription>
                            </Alert>
                             <Table className="mt-4">
                                <TableBody>
                                    <TableRow><TableCell>Point of Marginal Cheapness (PMC)</TableCell><TableCell className="font-mono text-right">${results.prices.cheap.toFixed(2)}</TableCell></TableRow>
                                    <TableRow><TableCell>Point of Marginal Expensiveness (PME)</TableCell><TableCell className="font-mono text-right">${results.prices.expensive.toFixed(2)}</TableCell></TableRow>
                                    <TableRow><TableCell>Indifference Price Point (IPP)</TableCell><TableCell className="font-mono text-right">${results.prices.too_cheap.toFixed(2)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                             <Alert className="mt-4" variant="default">
                                <AlertTitle>Acceptable Price Range</AlertTitle>
                                <AlertDescription>
                                    The acceptable range of prices for most customers is between the PMC and PME.
                                    <p className="text-xl font-bold mt-2">${results.acceptable_range[0].toFixed(2)} - ${results.acceptable_range[1].toFixed(2)}</p>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
