
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
        demand_curve: { price: number; likelihood: number; revenue: number }[];
        optimal_price: number;
        max_revenue: number;
    };
    plot: string;
}

interface GaborGrangerPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GaborGrangerPage({ data, numericHeaders, onLoadExample }: GaborGrangerPageProps) {
    const { toast } = useToast();
    const [priceCol, setPriceCol] = useState<string | undefined>();
    const [purchaseIntentCol, setPurchaseIntentCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    useEffect(() => {
        setPriceCol(numericHeaders.find(h => h.toLowerCase().includes('price')));
        setPurchaseIntentCol(numericHeaders.find(h => h.toLowerCase().includes('intent') || h.toLowerCase().includes('purchase')));
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!priceCol || !purchaseIntentCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both the price and purchase intent columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/gabor-granger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    price_col: priceCol,
                    purchase_intent_col: purchaseIntentCol
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "Gabor-Granger analysis finished successfully." });

        } catch (e: any) {
            console.error('Gabor-Granger error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, priceCol, purchaseIntentCol, toast]);

    if (!canRun) {
        const psmExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('gabor-granger'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Gabor-Granger Pricing</CardTitle>
                        <CardDescription>
                           To perform this analysis, you need data with a price column and a purchase intent column (e.g., a 1-5 scale).
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
                    <CardTitle className="font-headline">Gabor-Granger Setup</CardTitle>
                    <CardDescription>Map the price and purchase intent columns from your data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>How to Set Up Your Data</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5 mt-2 text-xs">
                                <li><strong>Price Column:</strong> Should contain the different price points presented to respondents (e.g., $10, $15, $20).</li>
                                <li><strong>Purchase Intent Column:</strong> Should contain the respondent's likelihood to purchase at a given price, typically on a scale (e.g., a 1-5 Likert scale where 5 is 'Definitely would buy').</li>
                                <li><strong>Data Format:</strong> Each row should represent one respondent's answer to one price point. If a respondent sees 5 price points, they will have 5 rows in the data.</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Price Column</Label>
                            <Select value={priceCol} onValueChange={setPriceCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Purchase Intent Column</Label>
                            <Select value={purchaseIntentCol} onValueChange={setPurchaseIntentCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !priceCol || !purchaseIntentCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Demand and Revenue Curves</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Gabor-Granger Plot" width={1000} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Key Price Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted rounded-lg">
                                    <dt className="text-sm font-medium text-muted-foreground">Optimal Price (Max Revenue)</dt>
                                    <dd className="text-3xl font-bold">${results.optimal_price.toFixed(2)}</dd>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                    <dt className="text-sm font-medium text-muted-foreground">Maximum Potential Revenue</dt>
                                    <dd className="text-3xl font-bold">${results.max_revenue.toFixed(2)}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

