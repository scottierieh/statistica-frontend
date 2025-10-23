
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';

interface RfmResult {
    rfm_data: any[];
    segment_distribution: any[];
    plot: string;
}

interface RfmPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RfmPage({ data, allHeaders, onLoadExample }: RfmPageProps) {
    const { toast } = useToast();
    const [customerIdCol, setCustomerIdCol] = useState<string | undefined>();
    const [invoiceDateCol, setInvoiceDateCol] = useState<string | undefined>();
    const [monetaryCol, setMonetaryCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<RfmResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 3, [data, allHeaders]);
    
    useEffect(() => {
        setCustomerIdCol(allHeaders.find(h => h.toLowerCase().includes('customer')));
        setInvoiceDateCol(allHeaders.find(h => h.toLowerCase().includes('date')));
        setMonetaryCol(allHeaders.find(h => ['price', 'revenue', 'amount'].some(k => h.toLowerCase().includes(k))));
        setAnalysisResult(null);
    }, [data, allHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!customerIdCol || !invoiceDateCol || !monetaryCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required columns.' });
            return;
        }
        
        // Add invoice_no if it doesn't exist, as it's used for frequency
        let analysisData = [...data];
        if (!analysisData[0].hasOwnProperty('invoice_no')) {
            analysisData = data.map((row, index) => ({...row, invoice_no: `inv_${index}`}));
        }


        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/rfm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData, 
                    customer_id_col: customerIdCol, 
                    invoice_date_col: invoiceDateCol, 
                    monetary_col: monetaryCol 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: RfmResult = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('RFM Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, customerIdCol, invoiceDateCol, monetaryCol, toast]);
    
    const rfmExample = exampleDatasets.find(ex => ex.id === 'rfm-data');

    if (!canRun) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">RFM Analysis</CardTitle>
                        <CardDescription>
                           To perform RFM analysis, please upload transactional data with customer IDs, purchase dates, and monetary values.
                        </CardDescription>
                    </CardHeader>
                     {rfmExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(rfmExample)} className="w-full" size="sm">
                                Load Sample Transaction Data
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">RFM Analysis Setup</CardTitle>
                    <CardDescription>Map the columns for Recency, Frequency, and Monetary analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Customer ID Column</Label>
                            <Select value={customerIdCol} onValueChange={setCustomerIdCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Invoice Date Column</Label>
                            <Select value={invoiceDateCol} onValueChange={setInvoiceDateCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Monetary Value Column</Label>
                            <Select value={monetaryCol} onValueChange={setMonetaryCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !customerIdCol || !invoiceDateCol || !monetaryCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Customer Segmentation</CardTitle>
                            <CardDescription>Distribution of customers across different RFM segments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={results.plot} alt="RFM Segment Plots" width={1500} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">RFM Data</CardTitle>
                            <CardDescription>Individual customer RFM scores and segments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{customerIdCol}</TableHead>
                                        <TableHead className="text-right">Recency (Days)</TableHead>
                                        <TableHead className="text-right">Frequency</TableHead>
                                        <TableHead className="text-right">Monetary</TableHead>
                                        <TableHead>Segment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.rfm_data.slice(0, 100).map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row[customerIdCol!]}</TableCell>
                                            <TableCell className="text-right font-mono">{row.Recency}</TableCell>
                                            <TableCell className="text-right font-mono">{row.Frequency}</TableCell>
                                            <TableCell className="text-right font-mono">{row.Monetary.toFixed(2)}</TableCell>
                                            <TableCell>{row.Segment}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
