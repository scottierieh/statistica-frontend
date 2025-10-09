
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { 
    ResponsiveContainer, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Legend, 
    Bar, 
    CartesianGrid, 
    Cell,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from 'recharts';

interface ServqualResults {
    dimensionScores: {
        name: string;
        gap?: number;
        expectation?: number;
        perception: number;
    }[];
    overallGap: number;
    analysisType: 'SERVQUAL' | 'SERVPERF';
}

interface ServqualPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

export default function ServqualPage({ survey, responses }: ServqualPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<ServqualResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/analysis/servqual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ survey_questions: survey.questions, responses })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch (err: any) {
            setError(err.message);
            toast({ title: "Analysis Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    if (isLoading) {
        return <Card><CardContent className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" /><p className="text-lg font-medium">Running SERVQUAL Analysis...</p><p className="text-sm text-muted-foreground mt-2">Analyzing {responses.length} responses</p></CardContent></Card>;
    }

    if (error || !analysisResult) {
        return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error || "Could not load analysis results."}</AlertDescription></Alert>;
    }
    
    const results = analysisResult;
    const isServperf = results.analysisType === 'SERVPERF';
    
    const priorityData = [...results.dimensionScores].sort((a, b) => (a.gap || 0) - (b.gap || 0));

    const comparisonData = results.dimensionScores.map(d => ({
        name: d.name,
        Expectation: d.expectation,
        Perception: d.perception
    }));

    const getSeverity = (gap: number) => {
        const absGap = Math.abs(gap);
        if (absGap > 1.0) return { label: 'Critical', color: 'destructive' };
        if (absGap > 0.5) return { label: 'warning', color: 'orange' };
        return { label: 'Minor', color: 'default' };
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        {isServperf ? 'SERVPERF' : 'SERVQUAL'} Analysis Results
                    </CardTitle>
                    <CardDescription>
                        {isServperf 
                            ? "Measuring service quality based on customer perceptions of performance."
                            : "Measuring service quality by comparing customer expectations vs. perceptions."
                        }
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Overall Gap Score</p>
                            <p className="text-4xl font-bold text-red-600">{results.overallGap.toFixed(2)}</p>
                             <div className="flex items-center justify-center gap-2 mt-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-semibold text-red-600">Service Gap</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                             <p className="text-sm text-gray-600 mb-1">Sample Size</p>
                            <p className="text-4xl font-bold text-blue-600">{responses.length}</p>
                            <p className="text-xs text-gray-500 mt-2">Customer responses</p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Dimensions Analyzed</p>
                            <p className="text-4xl font-bold text-green-600">{results.dimensionScores.length}</p>
                            <p className="text-xs text-gray-500 mt-2">SERVQUAL model</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="gaps" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
                    <TabsTrigger value="comparison">Comparison</TabsTrigger>
                    <TabsTrigger value="radar">Radar View</TabsTrigger>
                    <TabsTrigger value="priority">Priority</TabsTrigger>
                </TabsList>

                <TabsContent value="gaps">
                    <Card>
                        <CardHeader>
                            <CardTitle>Service Quality Gap Scores</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{ gap: { label: 'Gap' } }} className="w-full h-96">
                                <ResponsiveContainer>
                                    <BarChart data={results.dimensionScores} layout="vertical" margin={{ left: 120 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" domain={[-1.5, 0.5]} />
                                        <YAxis type="category" dataKey="name" width={110} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="gap" name="Gap Score">
                                            {results.dimensionScores.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={(entry.gap || 0) < 0 ? '#ef4444' : '#10b981'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            <div className="mt-4 p-4 bg-red-50 rounded">
                                <p className="text-sm text-gray-700">
                                    <strong>Gap Score Formula:</strong> Perception - Expectation<br/>
                                    <strong>Negative gaps</strong> (red) indicate expectations exceed perceptions, requiring improvement.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="comparison">
                    <Card>
                        <CardHeader>
                            <CardTitle>Expectation vs Perception</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{ Expectation: { label: 'Expectation', color: '#3b82f6' }, Perception: { label: 'Perception', color: '#ef4444' } }} className="w-full h-96">
                                <ResponsiveContainer>
                                    <BarChart data={comparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis domain={[0, 7]} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Bar dataKey="Expectation" fill="#3b82f6" />
                                        <Bar dataKey="Perception" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 <TabsContent value="radar">
                    <Card>
                        <CardHeader>
                            <CardTitle>SERVQUAL Radar Comparison</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <ChartContainer config={{ expectation: { label: 'Expectation' }, perception: { label: 'Perception' } }} className="w-full h-[500px]">
                                <ResponsiveContainer>
                                    <RadarChart data={results.dimensionScores}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="name" />
                                        <PolarRadiusAxis domain={[0, 7]} />
                                        <Radar name="Expectation" dataKey="expectation" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                        <Radar name="Perception" dataKey="perception" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                                        <Legend />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 <TabsContent value="priority">
                    <Card>
                        <CardHeader>
                            <CardTitle>Improvement Priority Ranking</CardTitle>
                            <CardDescription>Ranked by gap size. Larger negative gaps indicate higher priority.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Dimension</TableHead>
                                        <TableHead className="text-right">Expectation</TableHead>
                                        <TableHead className="text-right">Perception</TableHead>
                                        <TableHead className="text-right">Gap Score</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {priorityData.map((item, index) => {
                                         const severity = getSeverity(item.gap || 0);
                                         return (
                                            <TableRow key={item.name}>
                                                <TableCell><Badge variant="outline">#{index + 1}</Badge></TableCell>
                                                <TableCell className="font-semibold">{item.name}</TableCell>
                                                <TableCell className="text-right font-mono">{item.expectation?.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{item.perception.toFixed(2)}</TableCell>
                                                <TableCell className={`text-right font-mono font-bold ${(item.gap || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {item.gap?.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={severity.color as any}>{severity.label}</Badge>
                                                </TableCell>
                                            </TableRow>
                                         );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
