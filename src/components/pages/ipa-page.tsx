'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Flame, Star, Target, TrendingDown, Sparkles, BarChart3, TrendingUp, Award, Info } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

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
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Importance-Performance Analysis...</p>
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
    
    // Safe access to means
    const perfMean = results.means?.performance ?? results.ipa_matrix.reduce((sum, item) => sum + item.performance, 0) / results.ipa_matrix.length;
    const impMean = results.means?.importance ?? results.ipa_matrix.reduce((sum, item) => sum + item.importance, 0) / results.ipa_matrix.length;
    
    const quadrantCounts = {
        'Q2: Concentrate Here': results.ipa_matrix.filter(i => i.quadrant === 'Q2: Concentrate Here').length,
        'Q1: Keep Up Good Work': results.ipa_matrix.filter(i => i.quadrant === 'Q1: Keep Up Good Work').length,
        'Q3: Low Priority': results.ipa_matrix.filter(i => i.quadrant === 'Q3: Low Priority').length,
        'Q4: Possible Overkill': results.ipa_matrix.filter(i => i.quadrant === 'Q4: Possible Overkill').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">IPA Analysis</CardTitle>
                    <CardDescription>
                        Importance-Performance Analysis - Visualizing attributes in four quadrants based on their importance and current performance.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(quadrantConfig).map(([quadrantName, config]) => {
                    const Icon = config.icon;
                    const count = quadrantCounts[quadrantName as keyof typeof quadrantCounts];
                    return (
                        <Card 
                            key={quadrantName} 
                            className={`border-2 ${config.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 bg-muted p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="matrix" className="rounded-lg">
                        <Target className="h-4 w-4 mr-2" />
                        Matrix
                    </TabsTrigger>
                    <TabsTrigger value="details" className="rounded-lg">
                        <Award className="h-4 w-4 mr-2" />
                        Details
                    </TabsTrigger>
                    <TabsTrigger value="validation" className="rounded-lg">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Validation
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(quadrantConfig).map(([quadrantName, config]) => {
                            const items = results.ipa_matrix.filter(item => item.quadrant === quadrantName);
                            const Icon = config.icon;
                            return (
                                <Card key={quadrantName} className={`border-2 ${config.border} shadow-lg`}>
                                    <CardHeader className={config.bg}>
                                        <CardTitle className={`flex items-center gap-2 ${config.color}`}>
                                            <Icon className="h-5 w-5" />
                                            {quadrantName}
                                        </CardTitle>
                                        <CardDescription className="text-gray-700">
                                            {config.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {items.length > 0 ? (
                                            <ul className="space-y-3">
                                                {items.map(item => (
                                                    <li 
                                                        key={item.attribute}
                                                        className="p-3 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-semibold text-gray-900">{item.attribute}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                Priority: {item.priority_score.toFixed(1)}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-muted-foreground">Performance:</span>
                                                                <span className="font-mono font-bold text-green-600">
                                                                    {item.performance.toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-muted-foreground">Importance:</span>
                                                                <span className="font-mono font-bold text-blue-600">
                                                                    {item.importance.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Target className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                                <p className="text-sm">No items in this quadrant</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Matrix Tab */}
                <TabsContent value="matrix">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-indigo-600" />
                                IPA Matrix
                            </CardTitle>
                            <CardDescription>
                                Strategic framework to identify improvement priorities
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full h-[600px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 80, bottom: 60, left: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            type="number" 
                                            dataKey="performance"
                                            domain={[
                                                (dataMin: number) => Math.floor(dataMin * 10) / 10 - 0.5,
                                                (dataMax: number) => Math.ceil(dataMax * 10) / 10 + 0.5
                                            ]}
                                            label={{ value: 'Performance', position: 'bottom', offset: 40 }}
                                            tickFormatter={(value) => value.toFixed(1)}
                                        />
                                        <YAxis 
                                            type="number" 
                                            dataKey="importance"
                                            domain={[
                                                (dataMin: number) => Math.floor(dataMin * 10) / 10 - 0.5,
                                                (dataMax: number) => Math.ceil(dataMax * 10) / 10 + 0.5
                                            ]}
                                            label={{ value: 'Importance', angle: -90, position: 'left', offset: 60 }}
                                            tickFormatter={(value) => value.toFixed(1)}
                                        />
                                        
                                        {/* Average lines */}
                                        <ReferenceLine 
                                            x={perfMean}
                                            stroke="#6b7280"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                        />
                                        <ReferenceLine 
                                            y={impMean}
                                            stroke="#6b7280"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                        />
                                        
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-gray-200">
                                                        <p className="font-bold text-gray-900 mb-2">{data.attribute}</p>
                                                        <p className="text-sm text-gray-600">Importance: {data.importance.toFixed(2)}</p>
                                                        <p className="text-sm text-gray-600">Performance: {data.performance.toFixed(2)}</p>
                                                        <p className="text-xs text-gray-500 mt-2 font-semibold">{data.quadrant}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        
                                        <Scatter data={results.ipa_matrix} fill="#8884d8">
                                            {results.ipa_matrix.map((entry, index) => {
                                                let color = '#9ca3af'; // Gray for Q3
                                                if (entry.quadrant === 'Q1: Keep Up Good Work') color = '#10b981'; // Green
                                                else if (entry.quadrant === 'Q2: Concentrate Here') color = '#ef4444'; // Red
                                                else if (entry.quadrant === 'Q4: Possible Overkill') color = '#f59e0b'; // Orange
                                                
                                                return (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={color}
                                                    />
                                                );
                                            })}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>

                                {/* Quadrant Labels positioned inside chart area */}
                                <div className="absolute top-12 left-40 bg-green-100 px-3 py-1 rounded text-xs font-semibold text-green-800 pointer-events-none">
                                    Keep Up
                                </div>
                                <div className="absolute top-12 right-28 bg-red-100 px-3 py-1 rounded text-xs font-semibold text-red-800 pointer-events-none">
                                    Concentrate Here
                                </div>
                                <div className="absolute bottom-28 left-40 bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-800 pointer-events-none">
                                    Low Priority
                                </div>
                                <div className="absolute bottom-28 right-28 bg-amber-100 px-3 py-1 rounded text-xs font-semibold text-amber-800 pointer-events-none">
                                    Possible Overkill
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    <strong>How to read:</strong> The matrix is divided by average importance and performance. 
                                    Items in different quadrants require different strategic actions.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Detailed Analysis Table</CardTitle>
                            <CardDescription>Complete attribute metrics and classifications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-bold">Attribute</TableHead>
                                            <TableHead className="font-bold">Quadrant</TableHead>
                                            <TableHead className="text-right font-bold">Performance</TableHead>
                                            <TableHead className="text-right font-bold">Importance</TableHead>
                                            <TableHead className="text-right font-bold">Relative Imp.</TableHead>
                                            <TableHead className="text-right font-bold">Priority</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.ipa_matrix
                                            .sort((a, b) => b.priority_score - a.priority_score)
                                            .map((item, idx) => {
                                                const config = quadrantConfig[item.quadrant as keyof typeof quadrantConfig];
                                                return (
                                                    <TableRow 
                                                        key={item.attribute}
                                                        className="hover:bg-muted/30 transition-colors"
                                                    >
                                                        <TableCell className="font-semibold">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                                                                {item.attribute}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge 
                                                                variant="secondary"
                                                                className={config.color}
                                                            >
                                                                {item.quadrant.split(':')[0]}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-green-600 font-bold">
                                                            {item.performance.toFixed(3)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-blue-600 font-bold">
                                                            {item.importance.toFixed(3)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {item.relative_importance.toFixed(2)}%
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-bold text-purple-600">
                                                            {item.priority_score.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Validation Tab */}
                <TabsContent value="validation">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                Statistical Validation
                            </CardTitle>
                            <CardDescription>
                                Multiple regression analysis to validate importance measurements
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Model Fit */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-gray-600 mb-1">R-squared</p>
                                        <p className="text-4xl font-bold text-green-600">
                                            {results.regression_summary.r2.toFixed(4)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {(results.regression_summary.r2 * 100).toFixed(1)}% variance explained
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-gray-600 mb-1">Adjusted R-squared</p>
                                        <p className="text-4xl font-bold text-blue-600">
                                            {results.regression_summary.adj_r2.toFixed(4)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Adjusted for model complexity
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Beta Coefficients */}
                            <div>
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Award className="h-5 w-5 text-purple-600" />
                                    Standardized Beta Coefficients (β)
                                </h3>
                                <ScrollArea className="h-96">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="font-bold">Attribute</TableHead>
                                                <TableHead className="text-right font-bold">Beta (β)</TableHead>
                                                <TableHead className="text-right font-bold">Impact</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.regression_summary.beta_coefficients
                                                .sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta))
                                                .map((item, idx) => (
                                                    <TableRow key={item.attribute} className="hover:bg-muted/30">
                                                        <TableCell className="font-semibold">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                                                                {item.attribute}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-purple-600 font-bold">
                                                            {item.beta.toFixed(4)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={Math.abs(item.beta) > 0.3 ? "default" : "secondary"}>
                                                                {Math.abs(item.beta) > 0.3 ? 'High' : Math.abs(item.beta) > 0.15 ? 'Medium' : 'Low'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>

                            {/* Interpretation */}
                            <Alert className="border-2 border-indigo-200 bg-indigo-50">
                                <Info className="h-4 w-4 text-indigo-600" />
                                <AlertTitle className="text-indigo-900">Model Interpretation</AlertTitle>
                                <AlertDescription className="text-indigo-700">
                                    The R² of {(results.regression_summary.r2 * 100).toFixed(1)}% indicates that 
                                    these attributes explain {(results.regression_summary.r2 * 100).toFixed(1)}% of 
                                    the variance in overall satisfaction. Higher beta coefficients indicate attributes 
                                    with stronger influence on overall satisfaction.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}