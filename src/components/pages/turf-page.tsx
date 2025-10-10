

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ThumbsUp, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { Survey, SurveyResponse, Question } from '@/types/survey';

interface TurfResults {
    individual_reach: { Product: string; 'Reach (%)': number }[];
    optimal_portfolios: { [key: string]: { combination: string; reach: number; frequency: number; n_products: number } };
    top_combinations: { [key: string]: any[] };
    incremental_reach: { Order: number; Product: string; 'Incremental Reach (%)': number; 'Incremental Reach (count)': number; 'Cumulative Reach (%)': number }[];
    recommendation: { size: number; products: string[]; reach: number; };
    overlap_matrix: { [key: string]: { [key: string]: number } };
    reach_target: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: TurfResults;
    plot: string;
}

interface TurfPageProps {
    survey: Survey;
    responses: SurveyResponse[];
    turfQuestion: Question;
}

export default function TurfPage({ survey, responses, turfQuestion }: TurfPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        if (!turfQuestion) {
            setError("TURF question not found in the survey.");
            setIsLoading(false);
            return;
        }

        const analysisData = responses.map(r => ({ selection: (r.answers as any)[turfQuestion.id] })).filter(r => r.selection && r.selection.length > 0);

        if (analysisData.length === 0) {
            setError("No valid response data found for TURF analysis.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/analysis/turf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: analysisData, selectionCol: 'selection' })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "TURF analysis finished successfully." });

        } catch (e: any) {
            console.error('TURF Analysis error:', e);
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [turfQuestion, responses, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    if (isLoading) {
        return <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>;
    }
    
    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    if (!analysisResult) {
        return (
             <div className="text-center text-muted-foreground py-10">
                <p>No analysis results to display.</p>
            </div>
        )
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            {analysisResult?.plot && (
                 <Card>
                    <CardHeader><CardTitle className="font-headline">TURF Analysis Dashboard</CardTitle></CardHeader>
                    <CardContent>
                        <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="TURF Analysis Plots" width={1600} height={1200} className="w-full rounded-md border" />
                    </CardContent>
                </Card>
            )}
            {results.interpretation && (
                <Card>
                    <CardHeader><CardTitle className="font-headline">Strategic Recommendations</CardTitle></CardHeader>
                    <CardContent>
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Key Insights</AlertTitle>
                            <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />') }} />
                        </Alert>
                    </CardContent>
                </Card>
            )}
            <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Optimal Portfolios by Size</CardTitle></CardHeader>
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
                    <CardHeader><CardTitle>Incremental Reach Analysis</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Incremental Reach</TableHead><TableHead className="text-right">Cumulative Reach</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {results.incremental_reach.map(r => (
                                    <TableRow key={r.Order}>
                                        <TableCell>{r.Order}. {r.Product}</TableCell>
                                        <TableCell className="text-right font-mono text-green-600">+{r['Incremental Reach (%)'].toFixed(2)}% ({r['Incremental Reach (count)']})</TableCell>
                                        <TableCell className="text-right font-mono">{r['Cumulative Reach (%)'].toFixed(2)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Top 10 Three-Product Combinations</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Combination</TableHead><TableHead className="text-right">Reach (%)</TableHead><TableHead className="text-right">Frequency</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {results.top_combinations['3']?.map((c: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell>{c.combination}</TableCell>
                                    <TableCell className="text-right font-mono">{c.reach.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right font-mono">{c.frequency.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
