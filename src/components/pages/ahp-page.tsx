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
import type { Survey, SurveyResponse } from '@/types/survey';
import { Skeleton } from '../ui/skeleton';


interface AhpPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function AhpPage({ survey, responses }: AhpPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

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

            const allMatrices: { [key: string]: number[][][] } = {};

            // Initialize matrix structures
            const initMatrix = (size: number) => Array(size).fill(0).map(() => Array(size).fill(0));

            allMatrices['goal'] = [];
            if(hasAlternatives) {
                criteria.forEach(c => {
                    allMatrices[`goal.${c.name}`] = [];
                });
            }

            // Process each survey response
            responses.forEach(response => {
                const answer = response.answers[ahpQuestion.id];
                if (!answer) return;

                // Process criteria matrix
                if (answer['criteria']) {
                    const criteriaMatrix = initMatrix(criteria.length);
                    for (let i = 0; i < criteria.length; i++) {
                        for (let j = i; j < criteria.length; j++) {
                            if (i === j) {
                                criteriaMatrix[i][j] = 1;
                            } else {
                                const pairKey = `${criteria[i].name} vs ${criteria[j].name}`;
                                const reversePairKey = `${criteria[j].name} vs ${criteria[i].name}`;
                                let value = answer['criteria'][pairKey] ?? (answer['criteria'][reversePairKey] ? 1 / answer['criteria'][reversePairKey] : 1);
                                if (value < 0) value = 1 / Math.abs(value);
                                criteriaMatrix[i][j] = value;
                                criteriaMatrix[j][i] = 1 / value;
                            }
                        }
                    }
                    allMatrices['goal'].push(criteriaMatrix);
                }

                // Process alternative matrices
                if (hasAlternatives) {
                    criteria.forEach(c => {
                        const matrixKey = `alt_${c.id.replace('c', 'node-0-')}`;
                        if (answer[matrixKey]) {
                            const altMatrix = initMatrix(alternatives.length);
                             for (let i = 0; i < alternatives.length; i++) {
                                for (let j = i; j < alternatives.length; j++) {
                                    if (i === j) {
                                        altMatrix[i][j] = 1;
                                    } else {
                                        const pairKey = `${alternatives[i]} vs ${alternatives[j]}`;
                                        const reversePairKey = `${alternatives[j]} vs ${alternatives[i]}`;
                                        let value = answer[matrixKey][pairKey] ?? (answer[matrixKey][reversePairKey] ? 1 / answer[matrixKey][reversePairKey] : 1);
                                        if (value < 0) value = 1 / Math.abs(value);
                                        altMatrix[i][j] = value;
                                        altMatrix[j][i] = 1 / value;
                                    }
                                }
                            }
                            allMatrices[`goal.${c.name}`].push(altMatrix);
                        }
                    });
                }
            });
            
            // Calculate geometric mean for each matrix
            const finalMatrices: { [key: string]: number[][] } = {};
            for (const key in allMatrices) {
                const matrixList = allMatrices[key];
                if (matrixList.length > 0) {
                    const matrixStack = np.array(matrixList);
                    // Use scipy's gmean for geometric mean calculation
                    const geoMeanMatrix = matrixStack.reduce((acc, m) => acc * m, np.ones_like(matrixStack[0])) ** (1/matrixStack.length);
                    finalMatrices[key] = geoMeanMatrix;
                }
            }
            
             // Fallback for numpy import in browser
            const np = {
                array: (arr: any) => arr,
                ones_like: (arr: any) => arr.map((row: any) => row.map(() => 1))
            };

            const payload = {
                goal: survey.title,
                hasAlternatives,
                alternatives,
                hierarchy: [{ id: 'level-0', name: 'Criteria', nodes: criteria.map(c => ({ id: c.id, name: c.name })) }],
                matrices: finalMatrices,
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
    
    const finalScores = analysisResult.final_scores || analysisResult.criteria_analysis.weights;
    const isAlternativeAnalysis = !!analysisResult.final_scores;
    const dataForChart = isAlternativeAnalysis ? finalScores : Object.entries(finalScores).map(([name, score]) => ({ name, score }));


    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Overall Priority Scores</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <ChartContainer config={chartConfig} className="w-full h-[300px]">
                        <ResponsiveContainer>
                            <BarChart data={dataForChart}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
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

