
'use client';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle, Award, MoveRight, Building, Hospital, Landmark, GraduationCap, BarChart as BarChartIcon, Image as ImageIcon, GitCommit, Network, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Trash2, Save } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { produce } from 'immer';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, ResponsiveContainer, ScatterChart, Scatter, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import type { DataSet } from '@/lib/stats';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import type { Survey, SurveyResponse, Question } from '@/types/survey';

interface AhpResults {
    criteria_weights: number[];
    alternative_weights_by_criterion: { [criterion: string]: number[] };
    final_scores: number[];
    ranking: [number, number][];
}

interface FullAhpResponse {
    results: AhpResults;
    plot: string;
}

interface AHPPageProps {
    survey: Survey | null;
    responses: SurveyResponse[];
}

export default function AhpPage({ survey, responses }: AHPPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAhpResponse | null>(null);

  const ahpQuestion = useMemo(() => survey?.questions.find((q: Question) => q.type === 'ahp'), [survey]);

  const handleAnalysis = useCallback(async () => {
    if (!ahpQuestion || responses.length === 0) {
      toast({ title: "No data", description: "AHP question or responses not available." });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    // Aggregate responses - for simplicity, we'll average the comparison values
    const aggregatedComparisons: { [key: string]: number[] } = {};
    responses.forEach(response => {
      const answers = response.answers[ahpQuestion.id];
      if (answers) {
        Object.entries(answers).forEach(([key, value]) => {
          if (!aggregatedComparisons[key]) {
            aggregatedComparisons[key] = [];
          }
          aggregatedComparisons[key].push(Number(value));
        });
      }
    });

    const finalComparisons: { [key: string]: number } = {};
    Object.keys(aggregatedComparisons).forEach(key => {
      const values = aggregatedComparisons[key];
      // Using geometric mean for aggregation
      finalComparisons[key] = Math.pow(values.reduce((prod, v) => prod * v, 1), 1 / values.length);
    });

    const criteriaMatrix = buildMatrix(ahpQuestion.criteria!, finalComparisons);
    const alternativeMatrices: { [key: string]: number[][] } = {};
    if (ahpQuestion.alternatives && ahpQuestion.alternatives.length > 0) {
      ahpQuestion.criteria?.forEach(criterion => {
        alternativeMatrices[criterion] = buildMatrix(ahpQuestion.alternatives!, finalComparisons, `[${criterion}] `);
      });
    }

    try {
      const response = await fetch('/api/analysis/ahp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: ahpQuestion.criteria,
          alternatives: ahpQuestion.alternatives,
          criteria_matrix: criteriaMatrix,
          alternative_matrices: alternativeMatrices,
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
      }

      const result: FullAhpResponse = await response.json();
      setAnalysisResult(result);

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [ahpQuestion, responses, toast]);

  const buildMatrix = (items: string[], comparisons: { [key: string]: number }, prefix = ''): number[][] => {
    const n = items.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(1));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const key = `${prefix}${items[i]} vs ${items[j]}`;
        const value = comparisons[key];
        if (value !== undefined) {
          matrix[i][j] = value;
          matrix[j][i] = 1 / value;
        }
      }
    }
    return matrix;
  };
  
  useEffect(() => {
    if (ahpQuestion && responses.length > 0) {
      handleAnalysis();
    } else {
        setIsLoading(false);
    }
  }, [ahpQuestion, responses, handleAnalysis]);
  

  if (isLoading) {
    return <div className="p-4"><Skeleton className="h-96" /></div>;
  }

  if (!analysisResult) {
     return <div className="p-4">No AHP data or responses to analyze.</div>;
  }

  const { results, plot } = analysisResult;
  
  const criteriaData = ahpQuestion?.criteria?.map((c, i) => ({ name: c, weight: results.criteria_weights[i] * 100 })) || [];

  const finalScoresData = ahpQuestion?.alternatives?.map((alt, i) => ({
      name: alt,
      score: results.final_scores[i] * 100,
  })).sort((a,b) => b.score - a.score) || [];


  return (
    <div className="space-y-4 p-4">
        <Card>
            <CardHeader><CardTitle>AHP Analysis Results</CardTitle></CardHeader>
            <CardContent>
                <Image src={`data:image/png;base64,${plot}`} alt="AHP Analysis Plots" width={1400} height={1000} className="w-full rounded-md border" />
            </CardContent>
        </Card>
      
        <div className="grid md:grid-cols-2 gap-4">
            <Card>
                <CardHeader><CardTitle>Criteria Weights</CardTitle></CardHeader>
                <CardContent>
                     <ChartContainer config={{}} className="w-full h-64">
                         <ResponsiveContainer>
                            <RechartsBarChart data={criteriaData} layout="vertical">
                                <XAxis type="number" unit="%" />
                                <YAxis type="category" dataKey="name" width={80} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                                <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Final Rankings</CardTitle></CardHeader>
                <CardContent>
                     <ChartContainer config={{}} className="w-full h-64">
                         <ResponsiveContainer>
                            <RechartsBarChart data={finalScoresData} layout="vertical">
                                <XAxis type="number" unit="%" />
                                <YAxis type="category" dataKey="name" width={80} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                                <Bar dataKey="score" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
