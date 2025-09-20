
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, ThumbsUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MaxDiffResult {
    item: string;
    best_count: number;
    worst_count: number;
    best_pct: number;
    worst_pct: number;
    net_score: number;
}

interface FullAnalysisResponse {
    results: MaxDiffResult[];
    plot: string;
}

interface MaxDiffPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MaxDiffPage({ data, categoricalHeaders, onLoadExample }: MaxDiffPageProps) {
    const { toast } = useToast();
    const [bestCol, setBestCol] = useState<string | undefined>();
    const [worstCol, setWorstCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length >= 2, [data, categoricalHeaders]);
    
    useEffect(() => {
        setBestCol(categoricalHeaders.find(h => h.toLowerCase().includes('best')));
        setWorstCol(categoricalHeaders.find(h => h.toLowerCase().includes('worst')));
        setAnalysisResult(null);
    }, [data, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!bestCol || !worstCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both the Best and Worst choice columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/maxdiff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    bestCol,
                    worstCol
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "MaxDiff scores have been calculated." });

        } catch (e: any) {
            console.error('MaxDiff error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, bestCol, worstCol, toast]);

    if (!canRun) {
        const maxdiffExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('maxdiff'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">MaxDiff Analysis</CardTitle>
                        <CardDescription>
                           To perform this analysis, you need data with at least two categorical columns representing the 'best' and 'worst' choices from a set of items.
                        </CardDescription>
                    </CardHeader>
                    {maxdiffExamples.length > 0 && (
                        <CardContent>
                             <Button onClick={() => onLoadExample(maxdiffExamples[0])} className="w-full" size="sm">
                                Load {maxdiffExamples[0].name}
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
                    <CardTitle className="font-headline">MaxDiff Analysis Setup</CardTitle>
                    <CardDescription>Map the 'Best' and 'Worst' choice columns from your data.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Best Choice Column</Label>
                        <Select value={bestCol} onValueChange={setBestCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Worst Choice Column</Label>
                        <Select value={worstCol} onValueChange={setWorstCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoricalHeaders.filter(h => h !== bestCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !bestCol || !worstCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="font-headline">Net Preference Scores</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="MaxDiff Net Scores Plot" width={1000} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Detailed Scores</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Best %</TableHead>
                                        <TableHead className="text-right">Worst %</TableHead>
                                        <TableHead className="text-right">Net Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map(item => (
                                        <TableRow key={item.item}>
                                            <TableCell className="font-medium">{item.item}</TableCell>
                                            <TableCell className="text-right font-mono">{item.best_pct.toFixed(2)}%</TableCell>
                                            <TableCell className="text-right font-mono">{item.worst_pct.toFixed(2)}%</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{item.net_score.toFixed(2)}</TableCell>
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
