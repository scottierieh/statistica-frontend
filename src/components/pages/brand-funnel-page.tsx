
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Button } from '../ui/button';
import { Loader2, AlertTriangle, BarChart, Users, TrendingUp, Filter } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Image from 'next/image';

interface FunnelResults {
    funnel_data: { [key: string]: { [stage: string]: number } };
    conversion_rates: { [key: string]: { [stage: string]: number } };
    market_share: { [key: string]: { [stage: string]: number } };
    efficiency: { [key: string]: { funnel_efficiency: number, drop_off_rate: number } };
    bottlenecks: { brand: string; bottleneck_stage: string; conversion_rate: number }[];
    insights: { [key: string]: { brand?: string; efficiency?: number; awareness?: string; usage?: string; bottleneck?: string; rate?: number; description: string } };
}

interface FullAnalysisResponse {
    results: FunnelResults;
    plot: string;
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
                const awarenessAns = response.answers[stageQuestions.awareness!.id] as string[] || [];
                const considerationAns = response.answers[stageQuestions.consideration!.id] as string[] || [];
                const preferenceAns = response.answers[stageQuestions.preference!.id] as string[] || [];
                const usageAns = response.answers[stageQuestions.usage!.id] as string[] || [];

                brands.forEach(brand => {
                    if (awarenessAns.includes(brand)) funnelCounts[brand].awareness++;
                    if (considerationAns.includes(brand)) funnelCounts[brand].consideration++;
                    if (preferenceAns.includes(brand)) funnelCounts[brand].preference++;
                    if (usageAns.includes(brand)) funnelCounts[brand].usage++;
                });
            });

            const requestBody = {
                brands,
                funnel_data: funnelCounts,
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

    const { results, plot } = analysisResult;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Brand Funnel Visualization</CardTitle></CardHeader>
                <CardContent>
                    <Image src={`data:image/png;base64,${plot}`} alt="Brand Funnel Analysis" width={1600} height={1000} className="w-full rounded-md border" />
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
                        <TabsList>
                            <TabsTrigger value="funnel">Funnel Counts</TabsTrigger>
                            <TabsTrigger value="conversion">Conversion Rates</TabsTrigger>
                            <TabsTrigger value="share">Market Share</TabsTrigger>
                            <TabsTrigger value="bottleneck">Bottlenecks</TabsTrigger>
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
                                            {Object.values(stages).map((value, i) => <TableCell key={i} className="text-right">{(value as number).toFixed(1)}%</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                         <TabsContent value="share" className="mt-4">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Brand</TableHead>
                                        {Object.keys(results.market_share[Object.keys(results.market_share)[0]]).map(stage => <TableHead key={stage} className="text-right">{stage.replace(/_/g, ' ')}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.market_share).map(([brand, stages]) => (
                                        <TableRow key={brand}>
                                            <TableCell>{brand}</TableCell>
                                            {Object.values(stages).map((value, i) => <TableCell key={i} className="text-right">{(value as number).toFixed(1)}%</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                         <TabsContent value="bottleneck" className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Bottleneck Stage</TableHead>
                                        <TableHead className="text-right">Conversion Rate (%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.bottlenecks.map(item => (
                                        <TableRow key={item.brand}>
                                            <TableCell>{item.brand}</TableCell>
                                            <TableCell>{item.bottleneck_stage}</TableCell>
                                            <TableCell className="text-right">{item.conversion_rate.toFixed(1)}%</TableCell>
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

