'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Loader2, AlertTriangle, Filter } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, Cell, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface FunnelResults {
    funnel_data: { [key: string]: { [stage: string]: number } };
    conversion_rates: { [key: string]: { [stage: string]: number | null } };
    market_share: { [key: string]: { [stage: string]: number } };
    efficiency: { [key: string]: { funnel_efficiency: number, drop_off_rate: number } };
    bottlenecks: { brand: string; bottleneck_stage: string; conversion_rate: number }[];
    insights: { [key: string]: { brand?: string; efficiency?: number; awareness?: string; usage?: string; bottleneck?: string; rate?: number; description: string } };
}

interface FullAnalysisResponse {
    results: FunnelResults;
}

interface BrandFunnelPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function BrandFunnelPage({ survey, responses }: BrandFunnelPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const processAndAnalyzeData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            if (!survey || !responses) {
                throw new Error("Survey data or responses not available.");
            }

            const stageQuestions = {
                awareness: survey.questions.find(q => q.title.toLowerCase().includes('heard of')),
                consideration: survey.questions.find(q => q.title.toLowerCase().includes('consider purchasing')),
                preference: survey.questions.find(q => q.title.toLowerCase().includes('prefer')),
                usage: survey.questions.find(q => q.title.toLowerCase().includes('used or purchased')),
            };
            
            if (Object.values(stageQuestions).some(q => !q)) {
                throw new Error("Could not find all required brand funnel questions (awareness, consideration, preference, usage).");
            }
            
            const brands = stageQuestions.awareness?.options || [];
            if (brands.length === 0) {
                 throw new Error("No brands found in the awareness question options.");
            }

            const funnelCounts: { [brand: string]: { awareness: number; consideration: number; preference: number; usage: number } } = {};
            brands.forEach(brand => {
                funnelCounts[brand] = { awareness: 0, consideration: 0, preference: 0, usage: 0 };
            });
            
            responses.forEach(response => {
                const answers = response.answers as any;
                const awarenessAns = answers[stageQuestions.awareness!.id] as string[] || [];
                const considerationAns = answers[stageQuestions.consideration!.id] as string[] || [];
                const preferenceAns = answers[stageQuestions.preference!.id] as string;
                const usageAns = answers[stageQuestions.usage!.id] as string[] || [];

                brands.forEach(brand => {
                    if (awarenessAns.includes(brand)) funnelCounts[brand].awareness++;
                    if (considerationAns.includes(brand)) funnelCounts[brand].consideration++;
                    if (preferenceAns === brand) funnelCounts[brand].preference++;
                    if (usageAns.includes(brand)) funnelCounts[brand].usage++;
                });
            });

            const requestBody = {
                brands,
                funnel_data: funnelCounts,
                total_respondents: responses.length,
            };

            const apiResponse = await fetch('/api/analysis/brand-funnel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || 'Failed to fetch analysis results');
            }

            const data: FullAnalysisResponse = await apiResponse.json();
            if ((data as any).error) {
                throw new Error((data as any).error);
            }
            setAnalysisResult(data);
        } catch (err: any) {
            setError(err.message);
            toast({
                title: "Error fetching brand funnel results",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }

    }, [survey, responses, toast]);

    useEffect(() => {
        processAndAnalyzeData();
    }, [processAndAnalyzeData]);
    
    if (isLoading) {
        return <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>;
    }
    
    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    
    if (!analysisResult) return null;

    const { results } = analysisResult;
    
    const funnelDataForChart = useMemo(() => {
        if (!results?.funnel_data) return [];
        const stages = ['awareness', 'consideration', 'preference', 'usage'];
        const brands = Object.keys(results.funnel_data);

        return stages.map(stage => {
            const stageData: { [key: string]: string | number } = { name: stage };
            brands.forEach(brand => {
                stageData[brand] = results.funnel_data[brand][stage] || 0;
            });
            return stageData;
        });
    }, [results]);


    const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Brand Funnel Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="w-full h-[400px]">
                        <ResponsiveContainer>
                            <BarChart data={funnelDataForChart}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                {Object.keys(results.funnel_data).map((brand, i) => (
                                    <Bar key={brand} dataKey={brand} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Top Performer</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{results.insights.top_performer.brand}</p>
                        <p className="text-sm text-muted-foreground">Efficiency: {results.insights.top_performer.efficiency?.toFixed(1)}%</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Market Leader (Usage)</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{results.insights.market_leader.usage}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Best Overall Conversion</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{results.insights.conversion_champion.brand}</p>
                        <p className="text-sm text-muted-foreground">Rate: {results.insights.conversion_champion.rate?.toFixed(1)}%</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Biggest Opportunity</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{results.insights.biggest_opportunity.brand}</p>
                         <p className="text-sm text-muted-foreground">At: {results.insights.biggest_opportunity.bottleneck}</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Detailed Tables</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="funnel">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="funnel">Funnel Counts</TabsTrigger>
                            <TabsTrigger value="conversion">Conversion Rates</TabsTrigger>
                        </TabsList>
                        <TabsContent value="funnel" className="mt-4">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Brand</TableHead>
                                        {Object.keys(results.funnel_data[Object.keys(results.funnel_data)[0]]).map(stage => <TableHead key={stage} className="text-right">{stage.charAt(0).toUpperCase() + stage.slice(1)}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.funnel_data).map(([brand, stages]) => (
                                        <TableRow key={brand}>
                                            <TableCell>{brand}</TableCell>
                                            {Object.values(stages).map((value, i) => <TableCell key={i} className="text-right">{value}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="conversion" className="mt-4">
                              <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Brand</TableHead>
                                        {Object.keys(results.conversion_rates[Object.keys(results.conversion_rates)[0]]).map(stage => <TableHead key={stage} className="text-right">{stage.replace(/_/g, ' ')}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.conversion_rates).map(([brand, stages]) => (
                                        <TableRow key={brand}>
                                            <TableCell>{brand}</TableCell>
                                            {Object.values(stages).map((value, i) => <TableCell key={i} className="text-right">{(value ?? 0).toFixed(1)}%</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
