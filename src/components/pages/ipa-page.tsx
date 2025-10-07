'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, AlertTriangle, BadgeHelp, Bot, Flame, Star, ThumbsDown, TrendingDown } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

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
    beta_coefficients: { attribute: string, beta: number }[];
}
interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
}
interface FullAnalysisResponse {
    results: IpaResults;
    plot: string;
}

interface IpaPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const quadrantConfig = {
    'Q1: Keep Up Good Work': {
        icon: Star,
        color: "text-green-600",
        description: "High importance and high performance. These are your key strengths. Continue to invest in these areas to maintain your competitive advantage."
    },
    'Q2: Concentrate Here': {
        icon: Flame,
        color: "text-red-600",
        description: "High importance but low performance. These are critical weaknesses and should be your top priority for improvement."
    },
    'Q3: Low Priority': {
        icon: ThumbsDown,
        color: "text-gray-500",
        description: "Low importance and low performance. These are minor weaknesses. Fix them if you have spare resources, but they are not urgent."
    },
    'Q4: Possible Overkill': {
        icon: TrendingDown,
        color: "text-orange-500",
        description: "Low importance but high performance. You may be investing too many resources here. Consider reallocating some to 'Concentrate Here' areas."
    },
};


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
            // Find the Overall Satisfaction question
            const overallQuestion = survey.questions.find(q =>
                q.type === 'matrix' && q.rows?.some(r => r.toLowerCase().includes('overall'))
            );
            if (!overallQuestion) {
                throw new Error("An 'Overall_Satisfaction' question (as a matrix type) is required for IPA.");
            }
            const overallQuestionId = overallQuestion.id;
            const overallRowName = overallQuestion.rows!.find(r => r.toLowerCase().includes('overall'))!;

            // Find attribute questions
            const attributeQuestions = survey.questions.filter(q => q.type === 'matrix' && q.id !== overallQuestionId);
            if (attributeQuestions.length === 0) {
                 throw new Error("At least one attribute matrix question is required for IPA.");
            }
            
            const analysisData = responses.map(response => {
                const row: { [key: string]: number | string } = {};
                const overallAnswer = response.answers[overallQuestionId];
                row['Overall_Satisfaction'] = overallAnswer ? Number(overallAnswer[overallRowName]) : NaN;
                
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
    const quadrants: { [key: string]: IpaMatrixItem[] } = {
        'Q1: Keep Up Good Work': [],
        'Q2: Concentrate Here': [],
        'Q3: Low Priority': [],
        'Q4: Possible Overkill': [],
    };
    results.ipa_matrix.forEach(item => {
        if (quadrants[item.quadrant]) {
            quadrants[item.quadrant].push(item);
        }
    });

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">IPA Matrix Dashboard</CardTitle>
                    <CardDescription>A comprehensive visual overview of the Importance-Performance Analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Image src={analysisResult.plot} alt="IPA Dashboard" width={1800} height={1200} className="w-full rounded-md border" />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(quadrants).map(([quadrantName, items]) => {
                     const config = quadrantConfig[quadrantName as keyof typeof quadrantConfig];
                     if (!config) return null;
                     const Icon = config.icon;
                    return (
                        <Card key={quadrantName}>
                            <CardHeader>
                                <CardTitle className={`flex items-center gap-2 ${config.color}`}>
                                    <Icon className="h-6 w-6"/> {quadrantName}
                                </CardTitle>
                                <CardDescription>{config.description}</CardDescription>
                            </CardHeader>
                             <CardContent>
                                {items.length > 0 ? (
                                    <ul className="space-y-2">
                                        {items.map(item => (
                                            <li key={item.attribute} className="text-sm p-2 bg-muted/50 rounded-md">
                                                <strong>{item.attribute}</strong> (Perf: {item.performance.toFixed(2)}, Imp: {item.importance.toFixed(2)})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No items in this quadrant.</p>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
             <Card>
                <CardHeader><CardTitle>Detailed Results Table</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Attribute</TableHead>
                                    <TableHead>Quadrant</TableHead>
                                    <TableHead className="text-right">Performance</TableHead>
                                    <TableHead className="text-right">Importance (Corr)</TableHead>
                                    <TableHead className="text-right">Relative Imp. (%)</TableHead>
                                    <TableHead className="text-right">Priority Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.ipa_matrix.map(item => (
                                    <TableRow key={item.attribute}>
                                        <TableCell className="font-semibold">{item.attribute}</TableCell>
                                        <TableCell><Badge variant="secondary">{item.quadrant.split(':')[0]}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{item.performance.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{item.importance.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{item.relative_importance.toFixed(2)}%</TableCell>
                                        <TableCell className="text-right font-mono">{item.priority_score.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Statistical Validation</CardTitle>
                    <CardDescription>Results from a multiple regression model to cross-validate importance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <strong>Model Fit:</strong> R-squared = {results.regression_summary.r2.toFixed(4)}, Adjusted R-squared = {results.regression_summary.adj_r2.toFixed(4)}
                    </div>
                     <Table>
                        <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Standardized Beta (β)</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {results.regression_summary.beta_coefficients.map(item => (
                                <TableRow key={item.attribute}>
                                    <TableCell>{item.attribute}</TableCell>
                                    <TableCell className="text-right font-mono">{item.beta.toFixed(4)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
