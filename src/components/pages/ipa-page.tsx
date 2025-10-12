
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Flame, Star, Target, TrendingDown, Sparkles, Award } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';

interface IpaMatrixItem {
    attribute: string;
    importance: number;
    performance: number;
    quadrant: string;
    priority_score: number;
    gap: number;
    r_squared: number;
    relative_importance: number;
}

interface RegressionSummary {
    r2: number;
    adj_r2: number;
    beta_coefficients: { attribute: string, beta: number }[];
}

interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    means: {
        performance: number;
        importance: number;
    };
    regression_summary: RegressionSummary;
}

interface FullAnalysisResponse {
    results: IpaResults;
    main_plot: string;
    dashboard_plot: string;
}

interface IpaPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const quadrantConfig = {
    'Q2: Concentrate Here': {
        icon: Flame,
        color: "text-red-600",
        bg: "bg-gradient-to-br from-red-50 to-red-100",
        border: "border-red-300",
        description: "High importance but low performance. Critical areas requiring immediate improvement.",
        action: "🎯 Urgent: Immediate Action"
    },
    'Q1: Keep Up Good Work': {
        icon: Star,
        color: "text-green-600",
        bg: "bg-gradient-to-br from-green-50 to-green-100",
        border: "border-green-300",
        description: "High importance and high performance. Your competitive strengths.",
        action: "✨ Maintain: Keep Excellence"
    },
    'Q3: Low Priority': {
        icon: Target,
        color: "text-gray-600",
        bg: "bg-gradient-to-br from-gray-50 to-gray-100",
        border: "border-gray-300",
        description: "Low importance and low performance. Monitor but not urgent.",
        action: "📊 Monitor: Low Priority"
    },
    'Q4: Possible Overkill': {
        icon: TrendingDown,
        color: "text-amber-600",
        bg: "bg-gradient-to-br from-amber-50 to-amber-100",
        border: "border-amber-300",
        description: "Low importance but high performance. Consider resource reallocation.",
        action: "⚖️ Optimize: Reduce Investment"
    },
};

export default function IpaPage({ survey, responses }: IpaPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            if (!survey || !responses) {
                throw new Error("Survey or response data is not available.");
            }

            const overallQuestion = survey.questions.find(q =>
                q.type === 'matrix' && q.rows?.some(r => r.toLowerCase().includes('overall'))
            );
            if (!overallQuestion) {
                throw new Error("An 'Overall_Satisfaction' question (as a matrix type with a single row containing 'overall') is required for IPA.");
            }
            const overallQuestionId = overallQuestion.id;
            const overallRowName = overallQuestion.rows!.find(r => r.toLowerCase().includes('overall'))!;

            const attributeQuestions = survey.questions.filter(q => q.type === 'matrix' && q.id !== overallQuestionId);
            if (attributeQuestions.length === 0) {
                throw new Error("At least one attribute matrix question is required for IPA.");
            }
            
            const analysisData: any[] = responses.map(response => {
                const row: { [key: string]: number | string } = {};
                const overallAnswer = response.answers[overallQuestionId];
                if (overallAnswer && overallAnswer[overallRowName]) {
                    row['Overall_Satisfaction'] = Number(overallAnswer[overallRowName]);
                }
                
                attributeQuestions.forEach(q => {
                    const attrAnswers = response.answers[q.id];
                    if (q.rows && attrAnswers) {
                        q.rows.forEach(rowName => {
                            row[rowName] = attrAnswers[rowName] ? Number(attrAnswers[rowName]) : NaN;
                        });
                    }
                });
                return row;
            }).filter(row => row['Overall_Satisfaction'] && !isNaN(row['Overall_Satisfaction']));

            const dependentVar = 'Overall_Satisfaction';
            const independentVars = Array.from(new Set(attributeQuestions.flatMap(q => q.rows || [])));
            
            if (independentVars.length === 0) {
                throw new Error("No attribute variables found in the matrix questions.");
            }

            const response = await fetch('/api/analysis/ipa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: analysisData, dependentVar, independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
        } catch (e: any) {
            console.error('IPA Analysis error:', e);
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);
    
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-lg font-medium">Running Importance-Performance Analysis...</p>
                    <p className="text-sm text-muted-foreground mt-2">Analyzing {responses.length} responses</p>
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
        return (
            <Alert variant="destructive" className="shadow-lg border-2">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="text-lg font-bold">Analysis Failed</AlertTitle>
                <AlertDescription className="mt-2">{error}</AlertDescription>
            </Alert>
        );
    }

    if (!analysisResult) {
        return (
            <Card className="shadow-lg">
                <CardContent className="p-12 text-center text-muted-foreground">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No analysis results to display.</p>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;
    
    // Safe access to means with fallback
    const perfMean = results.means?.performance ?? results.ipa_matrix.reduce((sum, item) => sum + item.performance, 0) / results.ipa_matrix.length;
    const impMean = results.means?.importance ?? results.ipa_matrix.reduce((sum, item) => sum + item.importance, 0) / results.ipa_matrix.length;
    
    const quadrantData = useMemo(() => {
        if (!results) return {};
        const data: { [key: string]: IpaMatrixItem[] } = {
            'Q2: Concentrate Here': [],
            'Q1: Keep Up Good Work': [],
            'Q3: Low Priority': [],
            'Q4: Possible Overkill': [],
        };
        results.ipa_matrix.forEach(item => {
            if (data[item.quadrant]) {
                data[item.quadrant].push(item);
            }
        });
        return data;
    }, [results]);

    const quadrantCounts = useMemo(() => {
      return {
        'Q2: Concentrate Here': quadrantData['Q2: Concentrate Here']?.length || 0,
        'Q1: Keep Up Good Work': quadrantData['Q1: Keep Up Good Work']?.length || 0,
        'Q3: Low Priority': quadrantData['Q3: Low Priority']?.length || 0,
        'Q4: Possible Overkill': quadrantData['Q4: Possible Overkill']?.length || 0,
      };
    }, [quadrantData]);


    const renderQuadrantCards = () => {
         return (
            <div className="space-y-6">
                {Object.entries(quadrantConfig).map(([quadrantName, config]) => {
                    const Icon = config.icon;
                    const items = quadrantData[quadrantName] || [];
                    if (items.length === 0) return null;

                    return (
                        <Card key={quadrantName} className={`border-2 ${config.border}`}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-6 h-6 ${config.color}`} />
                                    <CardTitle className="text-xl">{quadrantName}</CardTitle>
                                    <Badge variant="secondary">{items.length} items</Badge>
                                </div>
                                <CardDescription>{config.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Attribute</TableHead>
                                            <TableHead className="text-right">Importance</TableHead>
                                            <TableHead className="text-right">Performance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => (
                                            <TableRow key={item.attribute}>
                                                <TableCell className="font-medium">{item.attribute}</TableCell>
                                                <TableCell className="text-right font-mono">{item.importance.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{item.performance.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">IPA Analysis</CardTitle>
                    <CardDescription>
                        Importance-Performance Analysis - Visualizing attributes in four quadrants based on their importance and current performance.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(quadrantConfig).map(([quadrantName, config]) => {
                    const Icon = config.icon;
                    const count = quadrantCounts[quadrantName as keyof typeof quadrantCounts];
                    return (
                        <Card 
                            key={quadrantName} 
                            className={`border-2 ${config.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                        >
                            <CardContent className="pt-6">
                                <div className={`${config.bg} rounded-xl p-4 mb-3`}>
                                    <div className="flex items-center gap-3">
                                        <Icon className={`h-6 w-6 ${config.color}`} />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-gray-600 mb-1">
                                                {quadrantName.split(':')[0]}
                                            </p>
                                            <p className="text-3xl font-bold text-gray-900">{count}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{config.action}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Detailed View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-4">
                     <Card>
                         <CardHeader>
                            <CardTitle>IPA Matrix &amp; Dashboard</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.main_plot} alt="IPA Main Plot" width={1000} height={800} className="w-full h-auto rounded-md border mb-4"/>
                            <Image src={analysisResult.dashboard_plot} alt="IPA Dashboard Plot" width={1800} height={800} className="w-full h-auto rounded-md border"/>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="details" className="mt-4">
                    {renderQuadrantCards()}
                </TabsContent>
            </Tabs>
        </div>
    );
}
