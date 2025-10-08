'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sigma, Brain, LineChart as LineChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface EpaScores {
    evaluation: { mean: number };
    potency: { mean: number };
    activity: { mean: number };
}
interface AnalysisResults {
    statistics: { [key: string]: { scale: string; mean: number; std: number } };
    epa_scores: EpaScores;
    profile: { left: string; right: string; mean: number }[];
    overall_mean: number;
}
interface FullAnalysisResponse {
    results: AnalysisResults;
    plot: string;
    error?: string;
}

interface SemanticDifferentialPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function SemanticDifferentialPage({ survey, responses }: SemanticDifferentialPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const sdQuestion = survey.questions.find(q => q.type === 'semantic-differential' || q.type === 'likert');
            if (!sdQuestion) {
                throw new Error("No Semantic Differential or Likert question found.");
            }

            const scales = (sdQuestion.rows || []).map((row, index) => {
                const [left, right] = row.split(' vs ');
                // Simple dimension assignment logic
                let dimension = 'evaluation';
                if (['강한', '큰', '튼튼한'].some(k => left.includes(k) || right.includes(k))) dimension = 'potency';
                if (['빠른', '간단한', '혁신적인'].some(k => left.includes(k) || right.includes(k))) dimension = 'activity';
                
                return {
                    scale_id: `scale_${index}`,
                    left_adjective: left,
                    right_adjective: right,
                    dimension,
                };
            });
            
            const responseData = responses.map((resp, respIndex) => {
                const ratings: {[key: string]: number} = { respondent_id: resp.id };
                const answer = resp.answers[sdQuestion.id];
                if(answer && typeof answer === 'object') {
                    (sdQuestion.rows || []).forEach((row, rowIndex) => {
                        ratings[`scale_${rowIndex}`] = answer[row];
                    });
                }
                return ratings;
            });


            const response = await fetch('/api/analysis/semantic-differential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemName: survey.title,
                    scales: scales,
                    responses: responseData
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Semantic Differential analysis finished.' });

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
        return <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p>Running analysis...</p></CardContent></Card>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    if (!analysisResult) {
        return <Card><CardContent className="p-6 text-center text-muted-foreground">No results to display.</CardContent></Card>;
    }
    
    const { results, plot } = analysisResult;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Semantic Differential Profile</CardTitle>
                    <CardDescription>Visual summary of brand perception and EPA dimension scores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Image src={plot} alt="Semantic Differential Analysis Plot" width={1600} height={1200} className="w-full h-auto rounded-md border" />
                </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>EPA Dimension Scores</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Dimension</TableHead>
                                    <TableHead className="text-right">Mean Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Evaluation (평가)</TableCell>
                                    <TableCell className="text-right font-mono">{results.epa_scores.evaluation.mean.toFixed(2)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>Potency (힘)</TableCell>
                                    <TableCell className="text-right font-mono">{results.epa_scores.potency.mean.toFixed(2)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>Activity (활동)</TableCell>
                                    <TableCell className="text-right font-mono">{results.epa_scores.activity.mean.toFixed(2)}</TableCell>
                                </TableRow>
                                 <TableRow className="font-bold bg-muted/50">
                                    <TableCell>Overall Average</TableCell>
                                    <TableCell className="text-right font-mono">{results.overall_mean.toFixed(2)} / 7.00</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Semantic Profile</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Left</TableHead>
                                    <TableHead className="text-center">Mean</TableHead>
                                    <TableHead className="text-right">Right</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.profile.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{p.left}</TableCell>
                                        <TableCell className="text-center font-mono">{p.mean.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{p.right}</TableCell>
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
