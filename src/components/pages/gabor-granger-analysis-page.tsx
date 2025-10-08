
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface GaborGrangerResults {
    optimal_price: number;
    purchase_rate: number;
    demand_curve: { price: number; purchase_rate: number }[];
}

interface FullAnalysisResponse {
    results: GaborGrangerResults;
    plot: string;
}

interface GaborGrangerPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const StatCard = ({ title, value, unit = '₩' }: { title: string, value: number | undefined | null, unit?: string }) => (
    <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value !== undefined && value !== null ? `${unit}${value.toLocaleString()}` : 'N/A'}</p>
    </div>
);

export default function GaborGrangerAnalysisPage({ survey, responses }: GaborGrangerPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = useCallback(async () => {
        if (!survey || !responses || responses.length === 0) {
            setError("No response data available for this survey.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        const gaborGrangerQuestions = survey.questions.filter(q => q.type === 'single' && q.title.toLowerCase().includes('if this product was sold for'));

        if (gaborGrangerQuestions.length === 0) {
            setError("No Gabor-Granger style questions found in the survey.");
            setIsLoading(false);
            return;
        }

        const analysisData: { respondent_id: string; price: number; purchase_intent: number }[] = [];
        responses.forEach(resp => {
            gaborGrangerQuestions.forEach(q => {
                const answer = (resp.answers as any)[q.id];
                const priceMatch = q.title.match(/\$(\d+)/);
                if (answer && priceMatch) {
                    analysisData.push({
                        respondent_id: resp.id,
                        price: Number(priceMatch[1]),
                        purchase_intent: answer === 'Yes, I would buy' ? 1 : 0,
                    });
                }
            });
        });

        if (analysisData.length === 0) {
            setError("Could not extract valid data for Gabor-Granger analysis from responses.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/analysis/gabor-granger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    price_col: 'price',
                    purchase_intent_col: 'purchase_intent'
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Gabor-Granger analysis finished.' });

        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);
    
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    if (isLoading) {
        return <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p>Running Gabor-Granger analysis...</p></CardContent></Card>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    if (!analysisResult) {
        return <Card><CardContent className="p-6 text-center text-muted-foreground">No analysis results to display.</CardContent></Card>;
    }
    
    const { results, plot } = analysisResult;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Gabor-Granger Analysis Results</CardTitle>
                    <CardDescription>Analysis of price sensitivity and revenue optimization.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     <StatCard title="Optimal Price (Revenue)" value={results.optimal_revenue_price} />
                     <StatCard title="Optimal Price (Profit)" value={results.optimal_profit_price} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Demand & Revenue Curves</CardTitle></CardHeader>
                <CardContent>
                    <Image src={`data:image/png;base64,${plot}`} alt="Gabor-Granger Plot" width={1000} height={600} className="w-full rounded-md border" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Demand Curve Data</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Purchase Likelihood</TableHead>
                                <TableHead className="text-right">Expected Revenue Index</TableHead>
                                {results.max_profit !== undefined && <TableHead className="text-right">Expected Profit Index</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.demand_curve.map((row) => (
                                <TableRow key={row.price}>
                                    <TableCell>₩{row.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-mono">{(row.likelihood * 100).toFixed(1)}%</TableCell>
                                    <TableCell className="text-right font-mono">{row.revenue.toFixed(2)}</TableCell>
                                    {row.profit !== undefined && <TableCell className="text-right font-mono">{row.profit.toFixed(2)}</TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

