
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { Loader2, Zap, Brain, BarChart as BarChartIcon, DollarSign, LineChart, Users, Star, ThumbsDown, GitCommit } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface FullAnalysisResponse {
    results: ServqualResults;
    error?: string;
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
    const [activeTab, setActiveTab] = useState('comparison');

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!survey || !responses || responses.length === 0) {
                throw new Error("No survey data or responses available.");
            }

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
        return <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p>Running analysis...</p></CardContent></Card>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    if (!analysisResult) {
        return <Card><CardContent className="p-6 text-center text-muted-foreground">No results to display.</CardContent></Card>;
    }
    
    const results = analysisResult;
    const isServperf = results.analysisType === 'SERVPERF';

    const priorityData = [...results.dimensionScores].sort((a, b) => (isServperf ? a.perception - b.perception : (a.gap ?? 0) - (b.gap ?? 0)));
    
    const chartDataKey = isServperf ? 'perception' : 'gap';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{isServperf ? 'SERVPERF' : 'SERVQUAL'} Analysis Dashboard</h1>
              <p className="text-gray-600">Service Quality Gap Analysis</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Overall {isServperf ? 'Performance' : 'Gap'} Score</div>
                <div className={`text-3xl font-bold ${results.overallGap < 0 && !isServperf ? 'text-red-600' : 'text-green-600'}`}>{results.overallGap.toFixed(3)}</div>
                {!isServperf && <div className="text-xs text-gray-500 mt-2">Perception - Expectation</div>}
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Sample Size</div>
                <div className="text-3xl font-bold text-blue-600">{responses.length}</div>
                <div className="text-xs text-gray-500 mt-2">Customer responses</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Dimensions Analyzed</div>
                <div className="text-3xl font-bold text-green-600">{results.dimensionScores.length}</div>
                <div className="text-xs text-gray-500 mt-2">{isServperf ? 'SERVPERF' : 'SERVQUAL'} model</div>
              </div>
            </div>

            <Tabs defaultValue="comparison" className="w-full bg-white rounded-lg shadow-lg mb-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="comparison">Expectation vs Perception</TabsTrigger>
                    <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
                    <TabsTrigger value="radar">Radar Chart</TabsTrigger>
                    <TabsTrigger value="priority">Priority</TabsTrigger>
                </TabsList>
                <TabsContent value="comparison" className="p-6">
                    <h3 className="text-xl font-bold mb-4">Expectation vs Perception by Dimension</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={results.dimensionScores}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={isServperf ? [0, 'auto'] : [0, 7]} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        {!isServperf && <Bar dataKey="expectation" fill="#3b82f6" name="Expectation" />}
                        <Bar dataKey="perception" fill="#ef4444" name="Perception" />
                      </BarChart>
                    </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="gaps" className="p-6">
                     <h3 className="text-xl font-bold mb-4">Service Quality Gap Scores</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={priorityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={isServperf ? [0, 'auto'] : [-1.5, 0.5]} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip content={<ChartTooltipContent />}/>
                        <Bar dataKey={chartDataKey} name={isServperf ? 'Performance Score' : 'Gap Score'}>
                          {priorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={(isServperf ? entry.perception > 4 : (entry.gap ?? 0) >= 0) ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {!isServperf &&
                      <div className="mt-4 p-4 bg-red-50 rounded">
                        <p className="text-sm text-gray-700">
                          <strong>Gap Score Formula:</strong> Perception - Expectation<br/>
                          <strong>Negative gaps</strong> (red) indicate expectations exceed perceptions, requiring improvement.
                        </p>
                      </div>
                    }
                </TabsContent>
                <TabsContent value="radar" className="p-6">
                    <h3 className="text-xl font-bold mb-4">SERVQUAL Radar Comparison</h3>
                    <ResponsiveContainer width="100%" height={450}>
                      <RadarChart data={results.dimensionScores}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" />
                        <PolarRadiusAxis domain={[0, isServperf ? 'auto' : 7]} />
                        {!isServperf && <Radar name="Expectation" dataKey="expectation" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />}
                        <Radar name="Perception" dataKey="perception" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                </TabsContent>
                 <TabsContent value="priority" className="p-6">
                     <h3 className="text-xl font-bold mb-4">Improvement Priority Ranking</h3>
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Priority</TableHead>
                                <TableHead>Dimension</TableHead>
                                {!isServperf && <TableHead>Expectation</TableHead>}
                                <TableHead>Perception</TableHead>
                                <TableHead>{isServperf ? 'Performance' : 'Gap Score'}</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {priorityData.map((item, index) => {
                                const dim = results.dimensionScores.find(d => d.name === item.name);
                                return (
                                  <TableRow key={item.name}>
                                    <TableCell>
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        #{index + 1}
                                      </span>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                                    {!isServperf && <TableCell className="text-gray-700">{dim?.expectation?.toFixed(2)}</TableCell>}
                                    <TableCell className="text-gray-700">{dim?.perception?.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <span className={`font-bold ${(item.gap ?? 0) < 0 && !isServperf ? 'text-red-600' : 'text-green-600'}`}>
                                        {(isServperf ? item.perception : item.gap ?? 0).toFixed(2)}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        isServperf ? (item.perception > 4 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') :
                                        Math.abs(item.gap ?? 0) > 0.8 ? 'bg-red-100 text-red-800' : 
                                        Math.abs(item.gap ?? 0) > 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-green-100 text-green-800'
                                      }`}>
                                         {isServperf ? (item.perception > 4 ? 'Strong' : 'Okay') : (Math.abs(item.gap ?? 0) > 0.8 ? 'Critical' : Math.abs(item.gap ?? 0) > 0.5 ? 'Moderate' : 'Minor')}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
    );
}
