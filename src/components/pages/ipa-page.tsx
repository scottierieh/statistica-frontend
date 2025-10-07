'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { Survey, SurveyResponse } from '@/types/survey';

interface IpaMatrixItem {
    attribute: string;
    importance: number;
    performance: number;
    quadrant: string;
    priority_score: number;
    gap: number;
    r_squared: number;
    relative_importance: number;
}
interface RegressionSummary {
    r2: number;
    adj_r2: number;
    f_stat: number;
    f_pvalue: number;
}
interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
    advanced_metrics: {
        sensitivity: { [key: string]: { r2_change: number; relative_importance: number; } };
        outliers: { standardized_residuals: number[]; cooks_distance: number[]; };
    };
}
interface FullAnalysisResponse {
    results: IpaResults;
    plot: string;
}

interface IpaPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function IpaPage({ survey, responses }: IpaPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            // Find the Overall Satisfaction question (assuming it's a matrix question with a single row)
            const overallQuestion = survey.questions.find(q => q.type === 'matrix' && q.rows?.some(r => r.toLowerCase().includes('overall')));
            if (!overallQuestion) {
                throw new Error("An 'Overall_Satisfaction' question (as a matrix type) is required for IPA.");
            }
            const overallQuestionId = overallQuestion.id;
            const overallRowName = overallQuestion.rows![0];

            // Find attribute questions (matrix questions that are not the overall one)
            const attributeQuestions = survey.questions.filter(q => q.type === 'matrix' && q.id !== overallQuestionId);
            if (attributeQuestions.length === 0) {
                 throw new Error("At least one attribute matrix question is required for IPA.");
            }
            
            // Transform responses into a flat DataFrame-like structure
            const analysisData = responses.map(response => {
                const row: { [key: string]: number | string } = {};
                
                // Get overall satisfaction
                const overallAnswer = response.answers[overallQuestionId];
                row['Overall_Satisfaction'] = overallAnswer ? Number(overallAnswer[overallRowName]) : NaN;

                // Get attribute satisfactions
                attributeQuestions.forEach(q => {
                    const attrAnswers = response.answers[q.id];
                    if (q.rows && attrAnswers) {
                        q.rows.forEach(rowName => {
                             row[rowName] = attrAnswers[rowName] ? Number(attrAnswers[rowName]) : NaN;
                        });
                    }
                });
                return row;
            });

            const dependentVar = 'Overall_Satisfaction';
            const independentVars = Array.from(new Set(attributeQuestions.flatMap(q => q.rows || [])));
            
            if (independentVars.length === 0) {
                throw new Error("No attribute variables found in the matrix questions.");
            }

            const response = await fetch('/api/analysis/ipa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: analysisData, dependentVar, independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'IPA results generated successfully.' });

        } catch (e: any) {
            console.error('IPA Analysis error:', e);
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);
    
    useEffect(() => {
        if (survey && responses) {
            handleAnalysis();
        }
    }, [survey, responses, handleAnalysis]);
    

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Importance-Performance Analysis...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Analysis Failed</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    if (!analysisResult) {
        return (
             <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No analysis results to display.</p>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">IPA Dashboard</CardTitle>
                    <CardDescription>A comprehensive visual overview of the Importance-Performance Analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Image src={analysisResult.plot} alt="IPA Dashboard" width={1800} height={1200} className="w-full rounded-md border" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Quadrant Summary & Detailed Results</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Attribute</TableHead>
                                <TableHead>Quadrant</TableHead>
                                <TableHead className="text-right">Importance (Corr.)</TableHead>
                                <TableHead className="text-right">Performance (Mean)</TableHead>
                                <TableHead className="text-right">Priority Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.ipa_matrix.map(item => (
                                <TableRow key={item.attribute}>
                                    <TableCell className="font-semibold">{item.attribute}</TableCell>
                                    <TableCell>{item.quadrant}</TableCell>
                                    <TableCell className="text-right font-mono">{item.importance.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{item.performance.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{item.priority_score.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
