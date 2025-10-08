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
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Survey, SurveyResponse } from '@/types/survey';
import { ahpData } from '@/lib/example-datasets/ahp-data';


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
        try {
            const ahpQuestion = survey.questions.find(q => q.type === 'ahp');
            if (!ahpQuestion) {
                throw new Error("No AHP question found in this survey.");
            }

            // In a real scenario, you would process responses. Here we use example data for demonstration.
            const exampleData = JSON.parse(ahpData);

            const response = await fetch('/api/analysis/ahp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exampleData)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result.results);
            
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, toast]);

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

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Overall Priority Scores</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <ChartContainer config={chartConfig} className="w-full h-[300px]">
                        <ResponsiveContainer>
                            <BarChart data={analysisResult.final_scores}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="score" fill="var(--color-score)" radius={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                     <Table>
                        <TableHeader><TableRow><TableHead>Alternative</TableHead><TableHead className="text-right">Priority Score</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {analysisResult.final_scores.map((item: any) => (
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
