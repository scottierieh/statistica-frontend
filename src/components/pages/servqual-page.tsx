
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { Loader2, Zap, Brain, BarChart as BarChartIcon } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid, Cell } from 'recharts';

interface ServqualResults {
    dimensionScores: {
        name: string;
        gap?: number;
        expectation?: number;
        perception: number;
    }[];
    overallGap: number;
    analysisType: 'SERVQUAL' | 'SERVPERF';
}

interface FullAnalysisResponse {
    results: ServqualResults;
    error?: string;
}

interface ServqualPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];


export default function ServqualPage({ survey, responses }: ServqualPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            if (!survey || !responses || responses.length === 0) {
                throw new Error("No survey data or responses available.");
            }

            const response = await fetch('/api/analysis/servqual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ survey_questions: survey.questions, responses })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            
            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch (err: any) {
            setError(err.message);
            toast({ title: "Analysis Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    if (isLoading) {
        return <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    if (!analysisResult) {
        return <Card><CardContent className="p-6 text-center text-muted-foreground">No results to display.</CardContent></Card>;
    }
    
    const { results } = analysisResult;
    const isServperf = results.analysisType === 'SERVPERF';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{isServperf ? 'SERVPERF' : 'SERVQUAL'} Analysis Results</CardTitle>
                    <CardDescription>
                        {isServperf 
                            ? "Measuring service quality based on customer perceptions of performance."
                            : "Measuring service quality by comparing customer expectations vs. perceptions."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Overall {isServperf ? 'Performance Score' : 'Gap Score'}</p>
                            <p className="text-5xl font-bold text-primary">{results.overallGap.toFixed(2)}</p>
                            <p className={`text-sm font-semibold ${results.overallGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {results.overallGap >= 0 ? 'Positive Perception' : 'Service Gap'}
                            </p>
                        </div>
                        <ChartContainer config={{}} className="w-full h-80">
                           <ResponsiveContainer>
                                <BarChart data={results.dimensionScores} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey={isServperf ? 'perception' : 'gap'} name={isServperf ? 'Performance' : 'Gap'} fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Dimension</TableHead>
                        {!isServperf && <TableHead className="text-right">Avg. Expectation</TableHead>}
                        <TableHead className="text-right">Avg. Perception</TableHead>
                        {!isServperf && <TableHead className="text-right">Gap (Perception - Expectation)</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.dimensionScores.map(score => (
                        <TableRow key={score.name}>
                            <TableCell className="font-semibold">{score.name}</TableCell>
                            {!isServperf && <TableCell className="text-right font-mono">{score.expectation?.toFixed(2)}</TableCell>}
                            <TableCell className="text-right font-mono">{score.perception.toFixed(2)}</TableCell>
                            {!isServperf && (
                                <TableCell className={`text-right font-mono font-bold ${score.gap && score.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {score.gap?.toFixed(2)}
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
