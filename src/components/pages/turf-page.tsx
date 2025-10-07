
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, ThumbsUp, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface TurfResults {
    individual_reach: { Product: string; 'Reach (%)': number }[];
    optimal_portfolios: { [key: string]: { combination: string; reach: number; frequency: number; } };
    incremental_reach: { Order: number; Product: string; 'Incremental Reach': number; 'Cumulative Reach': number; }[];
}

interface FullAnalysisResponse {
    results: TurfResults;
    plot: string;
}

interface TurfPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TurfPage({ data, categoricalHeaders, onLoadExample }: TurfPageProps) {
    const { toast } = useToast();
    const [selectionCol, setSelectionCol] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);

    useEffect(() => {
        setSelectionCol(categoricalHeaders[0]);
        setAnalysisResult(null);
    }, [data, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!selectionCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select the column containing preference selections.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/turf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, selectionCol })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('TURF Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectionCol, toast]);
    
    if (!canRun) {
        const turfExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('turf'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">TURF Analysis</CardTitle>
                        <CardDescription>To perform TURF analysis, you need data from a multiple-choice question where respondents select all items they would purchase.</CardDescription>
                    </CardHeader>
                    {turfExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(turfExamples[0])} className="w-full">
                                <ThumbsUp className="mr-2 h-4 w-4" /> Load {turfExamples[0].name}
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
                    <CardTitle className="font-headline">TURF Analysis Setup</CardTitle>
                    <CardDescription>Select the column containing the multiple-choice preference selections.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Selection Column</Label>
                        <Select value={selectionCol} onValueChange={setSelectionCol}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">This column should contain comma-separated values if a respondent chose multiple items.</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !selectionCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            
            {results && (
                <div className="space-y-4">
                    {analysisResult?.plot && (
                         <Card>
                            <CardHeader><CardTitle className="font-headline">TURF Analysis Dashboard</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="TURF Analysis Plots" width={2000} height={1200} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Optimal Portfolios</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Size</TableHead><TableHead>Best Combination</TableHead><TableHead className="text-right">Reach (%)</TableHead><TableHead className="text-right">Frequency</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.values(results.optimal_portfolios).map(p => (
                                            <TableRow key={p.n_products}>
                                                <TableCell>{p.n_products}</TableCell>
                                                <TableCell>{p.combination}</TableCell>
                                                <TableCell className="text-right font-mono">{p.reach.toFixed(2)}%</TableCell>
                                                <TableCell className="text-right font-mono">{p.frequency.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Incremental Reach</CardTitle></CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Incremental Reach</TableHead><TableHead className="text-right">Cumulative Reach</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {results.incremental_reach.map(r => (
                                            <TableRow key={r.Order}>
                                                <TableCell>{r.Order}. {r.Product}</TableCell>
                                                <TableCell className="text-right font-mono text-green-600">+{r['Incremental Reach'].toFixed(2)}%</TableCell>
                                                <TableCell className="text-right font-mono">{r['Cumulative Reach'].toFixed(2)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
