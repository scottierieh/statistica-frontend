
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';
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

interface ServperfResults {
    dimensionScores: {
        name: string;
        perception: number;
    }[];
    overallScore: number;
    analysisType: 'SERVPERF';
}

interface ServperfPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

const getSeverityServperf = (perception: number) => {
    // 5점 척도 기준
    if (perception >= 4.5) return { 
        label: 'Excellent', 
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        action: 'Maintain excellence'
    };
    if (perception >= 4.0) return { 
        label: 'Good', 
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        action: 'Minor improvements'
    };
    if (perception >= 3.5) return { 
        label: 'Acceptable', 
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        action: 'Improvement needed'
    };
    if (perception >= 3.0) return { 
        label: 'Poor', 
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        action: 'Significant improvement required'
    };
    return { 
        label: 'Critical', 
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        action: 'Urgent intervention needed'
    };
};

export default function ServperfPage({ survey, responses }: ServperfPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<ServperfResults | null>(null);
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
            setAnalysisResult({
                dimensionScores: result.dimensionScores,
                overallScore: result.overallGap, // In SERVPERF, 'gap' is the perception score
                analysisType: 'SERVPERF'
            });

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
        return <Card><CardContent className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" /><p className="text-lg font-medium">Running SERVPERF Analysis...</p></CardContent></Card>;
    }

    if (error || !analysisResult) {
        return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error || "Could not load analysis results."}</AlertDescription></Alert>;
    }
    
    const results = analysisResult;
    const priorityData = [...results.dimensionScores].sort((a, b) => a.perception - b.perception);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">SERVPERF Analysis Dashboard</CardTitle>
                    <CardDescription>Measuring service quality based on customer perceptions of performance.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Overall Performance Score</p>
                            <p className="text-4xl font-bold text-primary">{results.overallScore.toFixed(2)}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-semibold text-green-600">Average Performance</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600 mb-1">Sample Size</p><p className="text-4xl font-bold text-blue-600">{responses.length}</p><p className="text-xs text-gray-500 mt-2">Customer responses</p></div></CardContent></Card>
                
                <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600 mb-1">Dimensions Analyzed</p><p className="text-4xl font-bold text-green-600">{results.dimensionScores.length}</p><p className="text-xs text-gray-500 mt-2">Quality Factors</p></div></CardContent></Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Performance Overview</TabsTrigger>
                    <TabsTrigger value="radar">Radar View</TabsTrigger>
                    <TabsTrigger value="priority">Priority Matrix</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardHeader><CardTitle>Dimension Performance Scores</CardTitle></CardHeader>
                        <CardContent>
                             <ChartContainer config={{ perception: { label: 'Performance' } }} className="w-full h-96">
                                <ResponsiveContainer>
                                    <BarChart data={results.dimensionScores} layout="vertical" margin={{ left: 120 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" domain={[0, 7]} />
                                        <YAxis type="category" dataKey="name" width={110} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="perception" name="Performance Score">
                                            {results.dimensionScores.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="radar">
                    <Card>
                        <CardHeader><CardTitle>Performance Radar</CardTitle></CardHeader>
                        <CardContent className="flex justify-center">
                            <ChartContainer config={{ perception: { label: 'Perception' } }} className="w-full h-[500px]">
                                <ResponsiveContainer>
                                    <RadarChart data={results.dimensionScores}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="name" />
                                        <PolarRadiusAxis domain={[0, 7]} />
                                        <Radar name="Perception" dataKey="perception" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
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
                            <CardDescription>Ranked by performance score. Lower scores indicate higher priority for improvement.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Dimension</TableHead>
                                        <TableHead className="text-right">Performance Score</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                        <TableHead>Recommended Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {priorityData.map((item, index) => {
                                         const severity = getSeverityServperf(item.perception);
                                         return (
                                            <TableRow key={item.name}>
                                                <TableCell><Badge variant="outline">#{index + 1}</Badge></TableCell>
                                                <TableCell className="font-semibold">{item.name}</TableCell>
                                                <TableCell className="text-right font-mono">{item.perception.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${severity.bgColor} ${severity.textColor}`}>{severity.label}</span>
                                                </TableCell>
                                                <TableCell>{severity.action}</TableCell>
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
