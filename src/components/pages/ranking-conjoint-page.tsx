
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, PieChart as PieIcon, BarChart as BarIcon, Network, TrendingUp, Sparkles, CheckCircle, Info } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Survey, SurveyResponse, Question } from '@/entities/Survey';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface RankingConjointResults {
    part_worths: { [attribute: string]: { [level: string]: number } };
    attribute_importance: { [attribute: string]: number };
    coefficients: { [feature: string]: number };
    log_likelihood: number;
}

interface FullAnalysisResponse {
    results: RankingConjointResults;
    error?: string;
}

interface RankingConjointPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

export default function RankingConjointPage({ survey, responses }: RankingConjointPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const conjointQuestion = useMemo(() => survey.questions.find(q => q.type === 'ranking-conjoint'), [survey]);
    const allAttributes = useMemo(() => {
        if (!conjointQuestion || !conjointQuestion.attributes) return {};
        const attributesObj: any = {};
        conjointQuestion.attributes.forEach(attr => {
            attributesObj[attr.name] = attr.levels;
        });
        return attributesObj;
    }, [conjointQuestion]);

    const handleAnalysis = useCallback(async () => {
        if (!conjointQuestion || !responses || responses.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No ranking conjoint question or responses found for this survey.' });
            setIsLoading(false);
            return;
        }

        const analysisData: any[] = [];
        responses.forEach(resp => {
            const answerBlock = (resp.answers as any)[conjointQuestion.id];
            if (!answerBlock || typeof answerBlock !== 'object') return;
            
            Object.entries(answerBlock).forEach(([taskId, rankedProfileIds]) => {
                if (Array.isArray(rankedProfileIds)) {
                     rankedProfileIds.forEach((profileId, index) => {
                        const profile = conjointQuestion.profiles?.find((p: any) => p.id === profileId);
                        if(profile) {
                            analysisData.push({
                                respondent_id: resp.id,
                                task_id: taskId,
                                profile_id: profile.id,
                                ...profile.attributes,
                                rank: index + 1
                            });
                        }
                    });
                }
            });
        });

        if (analysisData.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No valid rankings found in responses.' });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const attributesForBackend = Object.fromEntries(Object.entries(allAttributes));

        try {
            const response = await fetch('/api/analysis/ranking-conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    attributes: attributesForBackend,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Ranking-based conjoint analysis finished.' });

        } catch (e: any) {
            console.error('Ranking Conjoint error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [conjointQuestion, responses, toast, allAttributes]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const importanceData = useMemo(() => {
        if (!analysisResult?.results.attribute_importance) return [];
        return Object.entries(analysisResult.results.attribute_importance)
            .map(([attribute, importance]) => ({ name: attribute, value: importance }))
            .sort((a,b) => b.value - a.value);
    }, [analysisResult]);

    const partWorthsData = useMemo(() => {
        if (!analysisResult?.results.part_worths) return [];
        return analysisResult.results.part_worths;
    }, [analysisResult]);
    
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Exploded Logit model for Ranking Conjoint...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!analysisResult?.results) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <p>No analysis results to display. This may be due to a lack of data or an error during analysis.</p>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;

    return (
        <div className="space-y-4">
             <Alert>
                <Network className="h-4 w-4" />
                <AlertTitle>Exploded Logit Model</AlertTitle>
                <AlertDescription>
                    This analysis uses an Exploded Logit model, which transforms rankings into a sequence of choices to estimate part-worth utilities.
                </AlertDescription>
            </Alert>
            <div className="grid md:grid-cols-2 gap-4">
                 <Card>
                    <CardHeader><CardTitle className='flex items-center gap-2'><PieIcon/>Relative Importance of Attributes</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={importanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={p => `${p.name} (${p.value.toFixed(1)}%)`}>
                                        {importanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Model Fit</CardTitle></CardHeader>
                    <CardContent>
                        <div className="p-4 bg-muted rounded-lg">
                            <p>Log-Likelihood</p>
                            <p className="text-3xl font-bold">{results.log_likelihood?.toFixed(2)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle className='flex items-center gap-2'><BarIcon/>Part-Worth Utilities</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        {Object.keys(partWorthsData).map(attr => (
                            <div key={attr}>
                                <h3 className="font-semibold mb-2">{attr}</h3>
                                <ChartContainer config={{ value: { label: "Part-Worth" } }} className="w-full h-[200px]">
                                    <ResponsiveContainer>
                                        <BarChart data={Object.entries(partWorthsData[attr]).map(([level, value]) => ({name: level, value: value}))} layout="vertical" margin={{ left: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={80} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="value" name="Part-Worth" fill="hsl(var(--primary))" barSize={30}/>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

