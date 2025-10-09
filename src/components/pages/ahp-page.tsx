
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, HelpCircle, MoveRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { Skeleton } from '../ui/skeleton';

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ahpExample = exampleDatasets.find(d => d.id === 'ahp-smartphone');

    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader className="text-center p-8">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Analytic Hierarchy Process (AHP)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Make complex decisions by breaking them down into a hierarchy and evaluating components through pairwise comparisons.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use AHP?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            AHP is a structured technique for organizing and analyzing complex decisions, based on mathematics and psychology. It provides a comprehensive and rational framework for structuring a decision problem, representing and quantifying its elements, relating those elements to overall goals, and evaluating alternative solutions.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


interface AhpPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function AhpPage({ survey, responses }: AhpPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [view, setView] = useState('main');

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const ahpQuestion = survey.questions.find(q => q.type === 'ahp');
            if (!ahpQuestion || !ahpQuestion.criteria) {
                throw new Error("No AHP question with criteria found in this survey.");
            }

            const { criteria, alternatives } = ahpQuestion;
            const hasAlternatives = alternatives && alternatives.length > 0;
            
            const allRespondentMatrices: { [key: string]: number[][][] } = {};
            const initMatrix = (size: number) => Array(size).fill(0).map(() => Array(size).fill(1));

            // Initialize collectors
            allRespondentMatrices['goal'] = [];
            if(hasAlternatives) {
                criteria.forEach(c => {
                    const matrixKey = `goal.${c.name}`;
                    allRespondentMatrices[matrixKey] = [];
                });
            }

            // Process each survey response
            responses.forEach(response => {
                const answer = response.answers[ahpQuestion.id];
                if (!answer) return;

                // Process criteria matrix for this respondent
                if (answer['criteria']) {
                    const criteriaMatrix = initMatrix(criteria.length);
                    for (let i = 0; i < criteria.length; i++) {
                        for (let j = i; j < criteria.length; j++) {
                             if (i === j) continue; // Already 1
                            const pairKey = `${criteria[i].name} vs ${criteria[j].name}`;
                            const reversePairKey = `${criteria[j].name} vs ${criteria[i].name}`;
                            let value = answer['criteria'][pairKey] ?? (answer['criteria'][reversePairKey] ? 1 / answer['criteria'][reversePairKey] : 1);
                            if (value < 0) value = 1 / Math.abs(value);
                            criteriaMatrix[i][j] = value;
                            criteriaMatrix[j][i] = 1 / value;
                        }
                    }
                    allRespondentMatrices['goal'].push(criteriaMatrix);
                }

                // Process alternative matrices for this respondent
                if (hasAlternatives) {
                    criteria.forEach(c => {
                        const matrixKey = `alt_${c.id}`;
                         if (answer[matrixKey]) {
                            const altMatrix = initMatrix(alternatives.length);
                             for (let i = 0; i < alternatives.length; i++) {
                                for (let j = i; j < alternatives.length; j++) {
                                    if (i === j) continue;
                                    const pairKey = `${alternatives[i]} vs ${alternatives[j]}`;
                                    const reversePairKey = `${alternatives[j]} vs ${alternatives[i]}`;
                                    let value = answer[matrixKey][pairKey] ?? (answer[matrixKey][reversePairKey] ? 1 / answer[matrixKey][reversePairKey] : 1);
                                    if (value < 0) value = 1 / Math.abs(value);
                                    altMatrix[i][j] = value;
                                    altMatrix[j][i] = 1 / value;
                                }
                            }
                            const backendKey = `goal.${c.name}`;
                            if(allRespondentMatrices[backendKey]) {
                                allRespondentMatrices[backendKey].push(altMatrix);
                            }
                        }
                    });
                }
            });

            const payload = {
                goal: survey.title,
                hasAlternatives,
                alternatives,
                hierarchy: [{ id: 'level-0', name: 'Criteria', nodes: criteria.map(c => ({ id: c.id, name: c.name })) }],
                matrices: allRespondentMatrices,
            };

            const apiResponse = await fetch('/api/analysis/ahp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!apiResponse.ok) {
                const errorResult = await apiResponse.json();
                throw new Error(errorResult.error || `HTTP error! status: ${apiResponse.status}`);
            }

            const result = await apiResponse.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result.results);
            
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const chartConfig = {
        score: { label: 'Score', color: 'hsl(var(--chart-1))' },
    };

    if (isLoading || !analysisResult) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running AHP analysis...</p>
                </CardContent>
            </Card>
        );
    }
    
    const isAlternativeAnalysis = !!analysisResult.final_scores;
    const finalScores = isAlternativeAnalysis ? analysisResult.final_scores : Object.entries(analysisResult.criteria_analysis.weights).map(([name, score]) => ({ name, score }));
    const dataForChart = finalScores.sort((a:any, b:any) => b.score - a.score);


    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Overall Priority Scores</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <ChartContainer config={chartConfig} className="w-full h-[300px]">
                        <ResponsiveContainer>
                            <BarChart data={dataForChart} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" dataKey="score" />
                                <YAxis type="category" dataKey="name" width={100} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="score" fill="var(--color-score)" radius={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                     <Table>
                        <TableHeader><TableRow><TableHead>{isAlternativeAnalysis ? 'Alternative' : 'Criterion'}</TableHead><TableHead className="text-right">Priority Score</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dataForChart.map((item: any) => (
                                <TableRow key={item.name}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-right font-mono">{item.score.toFixed(4)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
