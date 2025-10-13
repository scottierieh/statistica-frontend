
      'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Loader2, AlertTriangle, Brain, TrendingUp, TrendingDown, Eye, Heart, Award, ShoppingCart, Target, Users, Zap, Lightbulb, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid, Cell, LineChart, Line, ScatterChart, Scatter, PieChart, Pie } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface TurfResults {
    individual_reach: { Product: string; 'Reach (%)': number; Count: number }[];
    optimal_portfolios: { [key: string]: { combination: string; reach: number; frequency: number; n_products: number } };
    top_combinations: { [key: string]: any[] };
    incremental_reach: { Order: number; Product: string; 'Incremental Reach (%)': number; 'Incremental Reach (count)': number; 'Cumulative Reach (%)': number }[];
    recommendation: { size: number; products: string[]; reach: number; frequency: number };
    overlap_matrix: { [key: string]: { [key: string]: number } };
    frequency_distribution: { n_products: number; count: number; percentage: number }[];
    product_contribution: { [key: string]: { appears_in_combinations: number; avg_reach_contribution: number; importance_score: number } };
    efficiency_metrics: { portfolio_size: number; reach: number; efficiency: number; reach_per_product: number }[];
    segment_analysis: { [key: string]: { [key: string]: any } };
    reach_target: number;
    total_respondents: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: TurfResults;
    plot: string;
    error?: string;
}

interface TurfPageProps {
    survey: Survey;
    responses: SurveyResponse[];
    turfQuestion: Question;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function TurfPage({ survey, responses, turfQuestion }: TurfPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        if (!turfQuestion) {
            setError("TURF question not found in the survey.");
            setIsLoading(false);
            return;
        }

        const validResponses = responses.filter(r => {
            const answer = (r.answers as any)[turfQuestion.id];
            return answer && (Array.isArray(answer) ? answer.length > 0 : String(answer).trim() !== '');
        });

        if (validResponses.length === 0) {
            setError("No valid response data found for TURF analysis.");
            setIsLoading(false);
            return;
        }

        const analysisData = validResponses.map(r => {
            const answer = (r.answers as any)[turfQuestion.id];
            let selection = [];
            if (Array.isArray(answer)) {
                selection = answer;
            } else if (typeof answer === 'string') {
                selection = answer.split(',').map(s => s.trim());
            } else if (answer) {
                selection = [String(answer)];
            }
            return { selection };
        });

        const demographics = validResponses.map(r => {
            const demo: any = {};
            Object.keys(r.answers).forEach(key => {
                const question = survey.questions.find(q => q.id === key);
                if (question && question.id !== turfQuestion.id) {
                    demo[question.title || key] = (r.answers as any)[key];
                }
            });
            return demo;
        });

        try {
            const response = await fetch('/api/analysis/turf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData, 
                    selectionCol: 'selection',
                    demographics: demographics
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "TURF analysis finished successfully." });

        } catch (err: any) {
            setError(err.message);
            toast({ title: "Analysis Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [turfQuestion, responses, survey, toast]);
  
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const cleanCombination = (combo: string) => {
        return combo
            .replace(/\['/g, '')
            .replace(/'\]/g, '')
            .replace(/'/g, '')
            .replace(/\[/g, '')
            .replace(/\]/g, '')
            .replace(/\s*\+\s*/g, ' + ')
            .trim();
    };
    
    if (isLoading) {
        return (
            <div className="space-y-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center h-96">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2 text-muted-foreground">Analyzing TURF data...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!analysisResult || !analysisResult.results) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>No analysis results to display.</p>
            </div>
        );
    }
    
    const results = analysisResult.results;

    const individualReachData = results.individual_reach.map(item => ({ name: item.Product, reach: item['Reach (%)'] }));
    const optimalPortfolioData = Object.values(results.optimal_portfolios).map(p => ({ products: p.n_products, reach: p.reach }));
    const incrementalReachData = results.incremental_reach;
    const overlapData = Object.entries(results.overlap_matrix)
        .flatMap(([prod1, overlaps]) => Object.entries(overlaps)
            .filter(([prod2, _]) => prod1 < prod2)
            .map(([prod2, value]) => ({ pair: `${prod1} & ${prod2}`, overlap: value }))
        )
        .sort((a,b) => b.overlap - a.overlap)
        .slice(0, 10);
    const segmentKeys = Object.keys(results.segment_analysis);


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">TURF Analysis Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Brain className="h-4 w-4" />
                        <AlertTitle>AI-Powered Insights</AlertTitle>
                        <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />') }} />
                    </Alert>
                </CardContent>
            </Card>

             <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="combos">Combinations</TabsTrigger>
                    <TabsTrigger value="overlap">Overlap</TabsTrigger>
                    <TabsTrigger value="segments">Segments</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Incremental Reach</CardTitle>
                                <CardDescription>How much new reach each product adds when added sequentially.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={incrementalReachData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="Product" angle={-45} textAnchor="end" height={60} />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="Cumulative Reach (%)" name="Cumulative Reach" fill={COLORS[0]} />
                                        <Bar yAxisId="right" dataKey="Incremental Reach (%)" name="Incremental Reach" fill={COLORS[1]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Reach Saturation Curve</CardTitle>
                                <CardDescription>The point of diminishing returns for adding more products.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={optimalPortfolioData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="products" label={{ value: 'Number of Products', position: 'insideBottom', offset: -5 }}/>
                                        <YAxis domain={[0, 100]} label={{ value: 'Max Reach (%)', angle: -90, position: 'insideLeft' }}/>
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Line type="monotone" dataKey="reach" stroke={COLORS[2]} strokeWidth={3} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="products" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Individual Product Performance</CardTitle>
                            <CardDescription>Reach and selection frequency for each product alone.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Reach (%)</TableHead>
                                        <TableHead className="text-right">Selection Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.individual_reach.map(item => (
                                        <TableRow key={item.Product}>
                                            <TableCell className="font-medium">{item.Product}</TableCell>
                                            <TableCell className="text-right font-mono">{item['Reach (%)'].toFixed(1)}%</TableCell>
                                            <TableCell className="text-right font-mono">{item.Count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 <TabsContent value="combos" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Top Product Combinations</CardTitle>
                            <CardDescription>The best performing product portfolios for each size.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(results.top_combinations).map(([size, combos]) => (
                                <div key={size}>
                                    <h3 className="font-semibold mb-2">Top Combinations of {size}</h3>
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Combination</TableHead>
                                                <TableHead className="text-right">Reach</TableHead>
                                                <TableHead className="text-right">Frequency</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {combos.map((c: any, i: number) => (
                                                <TableRow key={i}>
                                                    <TableCell>{cleanCombination(c.combination)}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.reach.toFixed(1)}%</TableCell>
                                                    <TableCell className="text-right font-mono">{c.frequency.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="overlap" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Product Overlap Analysis</CardTitle>
                            <CardDescription>Percentage of customers who chose one product that also chose another.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={overlapData} layout="vertical" margin={{ left: 150 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" unit="%" />
                                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10 }} />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />} />
                                    <Bar dataKey="value" name="Overlap">
                                        {overlapData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="segments" className="mt-4">
                     <div className="space-y-4">
                        {segmentKeys.map(key => (
                             <Card key={key}>
                                <CardHeader><CardTitle>Analysis by {key}</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                         <TableHeader>
                                            <TableRow>
                                                <TableHead>Segment</TableHead>
                                                <TableHead>Sample Size</TableHead>
                                                <TableHead>Top Products</TableHead>
                                                <TableHead>Optimal Combo</TableHead>
                                                <TableHead className="text-right">Optimal Reach</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.segment_analysis[key]).map(([segValue, segData]: [string, any]) => (
                                                <TableRow key={segValue}>
                                                    <TableCell className="font-medium">{segValue}</TableCell>
                                                    <TableCell>{segData.size}</TableCell>
                                                    <TableCell>{segData.top_products.map((p:any) => p.product).join(', ')}</TableCell>
                                                    <TableCell>{segData.optimal_combination.join(' + ')}</TableCell>
                                                    <TableCell className="text-right font-mono">{segData.optimal_reach.toFixed(1)}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    