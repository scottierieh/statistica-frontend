
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Target, Package, AlertTriangle } from 'lucide-react';
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
    LineChart,
    Line,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';

interface TurfResults {
    individual_reach: { Product: string; 'Reach (%)': number }[];
    optimal_portfolios: { [key: string]: { combination: string; reach: number; frequency: number; n_products: number } };
    top_combinations: { [key: string]: any[] };
    incremental_reach: { Order: number; Product: string; 'Incremental Reach (%)': number; 'Incremental Reach (count)': number; 'Cumulative Reach (%)': number }[];
    recommendation: { size: number; products: string[]; reach: number; };
    overlap_matrix: { [key: string]: { [key: string]: number } };
    reach_target: number;
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

const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

export default function TurfPage({ survey, responses, turfQuestion }: TurfPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState('overview');

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        if (!turfQuestion) {
            setError("TURF question not found in the survey.");
            setIsLoading(false);
            return;
        }

        // Extract and properly format the selection data
        const analysisData = responses
            .map(r => {
                const answer = (r.answers as any)[turfQuestion.id];
                // Ensure answer is an array
                let selection = [];
                if (Array.isArray(answer)) {
                    selection = answer;
                } else if (typeof answer === 'string') {
                    // Handles comma-separated string from older data format
                    selection = answer.split(',').map(s => s.trim());
                } else if (answer) {
                    selection = [String(answer)];
                }
                return { selection };
            })
            .filter(r => r.selection && r.selection.length > 0);

        if (analysisData.length === 0) {
            setError("No valid response data found for TURF analysis.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/analysis/turf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: analysisData, selectionCol: 'selection' })
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
    }, [turfQuestion, responses, toast]);
  
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
            .replace(/:\s*A\s+/g, ': ')
            .trim();
    };

    const portfolioChartData = useMemo(() => {
        if (!analysisResult?.results.optimal_portfolios) return [];
        return Object.values(analysisResult.results.optimal_portfolios).map(p => ({
            size: `${p.n_products} Products`,
            reach: p.reach,
            frequency: p.frequency
        }));
    }, [analysisResult]);

    const radarChartData = useMemo(() => {
        if (!analysisResult?.results.individual_reach) return [];
        return analysisResult.results.individual_reach.map(item => ({
            product: item.Product.replace('Product ', ''),
            reach: item['Reach (%)']
        }));
    }, [analysisResult]);
    
    const results = analysisResult?.results;
    
    const formattedInterpretation = useMemo(() => {
        if (!results?.interpretation) return null;
        return results.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }, [results]);

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

    if (!analysisResult || !results) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>No analysis results to display.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Optimal Reach
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {results.recommendation.reach.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {results.recommendation.products.map(p => cleanCombination(p)).join(' + ')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Recommended Size
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {results.recommendation.size}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Products in optimal portfolio
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Average Frequency
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">
                            {Object.values(results.optimal_portfolios)
                                .find(p => p.n_products === results.recommendation.size)
                                ?.frequency.toFixed(2) || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Products per reached customer
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="charts">Interactive Charts</TabsTrigger>
                    <TabsTrigger value="tables">Detailed Tables</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <div className="space-y-6">
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Analysis Visualization</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Image 
                                        src={`data:image/png;base64,${analysisResult.plot}`} 
                                        alt="TURF Analysis Plots" 
                                        width={1600} 
                                        height={1200} 
                                        className="w-full rounded-lg border shadow-sm" 
                                    />
                                </CardContent>
                            </Card>
                        )}
                        {formattedInterpretation && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Strategic Recommendations</AlertTitle>
                                <AlertDescription 
                                    dangerouslySetInnerHTML={{ 
                                        __html: formattedInterpretation
                                    }} 
                                />
                            </Alert>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="charts" className="mt-4">
                     <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Portfolio Performance by Size</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={portfolioChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="size" />
                                    <YAxis yAxisId="left" label={{ value: 'Reach (%)', angle: -90, position: 'insideLeft' }} />
                                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Frequency', angle: 90, position: 'insideRight' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="reach" stroke="#3b82f6" strokeWidth={2} name="Reach (%)" />
                                    <Line yAxisId="right" type="monotone" dataKey="frequency" stroke="#10b981" strokeWidth={2} name="Frequency" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4">Individual Product Reach Comparison</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <RadarChart data={radarChartData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="product" />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                    <Radar name="Reach %" dataKey="reach" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="tables" className="mt-4">
                    <div className="space-y-6">
                        <div className="grid lg:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Optimal Portfolios by Size</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Best Combination</TableHead>
                                                <TableHead className="text-right">Reach (%)</TableHead>
                                                <TableHead className="text-right">Frequency</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.values(results.optimal_portfolios).map(p => (
                                                <TableRow key={p.n_products}>
                                                    <TableCell className="font-medium">{p.n_products}</TableCell>
                                                    <TableCell>{cleanCombination(p.combination)}</TableCell>
                                                    <TableCell className="text-right font-mono">{p.reach.toFixed(2)}%</TableCell>
                                                    <TableCell className="text-right font-mono">{p.frequency.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Incremental Reach Analysis</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">Incremental</TableHead>
                                                <TableHead className="text-right">Cumulative</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.incremental_reach.map(r => (
                                                <TableRow key={r.Order}>
                                                    <TableCell className="font-medium">{r.Order}. {r.Product}</TableCell>
                                                    <TableCell className="text-right font-mono text-green-600">
                                                        +{r['Incremental Reach (%)'].toFixed(2)}% ({r['Incremental Reach (count)']})
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{r['Cumulative Reach (%)'].toFixed(2)}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3">Top 10 Three-Product Combinations</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Rank</TableHead>
                                            <TableHead>Combination</TableHead>
                                            <TableHead className="text-right">Reach (%)</TableHead>
                                            <TableHead className="text-right">Frequency</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.top_combinations['3']?.slice(0, 10).map((c: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{i + 1}</TableCell>
                                                <TableCell>{cleanCombination(c.combination)}</TableCell>
                                                <TableCell className="text-right font-mono">{c.reach.toFixed(2)}%</TableCell>
                                                <TableCell className="text-right font-mono">{c.frequency.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
