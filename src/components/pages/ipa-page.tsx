'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Flame, Star, Target, TrendingDown, Sparkles, BarChart3, TrendingUp, Award, Info, AlertCircle } from 'lucide-react';
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
    performance_gap?: number; // Performance - Average Performance
    improvement_priority_index?: number; // β × (Average - Performance)
    beta?: number; // Beta coefficient for this attribute
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

            // Calculate additional metrics
            // Calculate perfMean from the matrix data if means is not available
            const perfMean = result.results.means?.performance ?? 
                (result.results.ipa_matrix.reduce((sum: number, item: IpaMatrixItem) => sum + item.performance, 0) / result.results.ipa_matrix.length);
            
            const betaMap = new Map(
                result.results.regression_summary.beta_coefficients.map((item: any) => [item.attribute, item.beta])
            );

            result.results.ipa_matrix = result.results.ipa_matrix.map((item: IpaMatrixItem) => {
                const beta = betaMap.get(item.attribute) || 0;
                return {
                    ...item,
                    performance_gap: item.performance - perfMean,
                    beta: beta,
                    improvement_priority_index: beta * (perfMean - item.performance)
                };
            });

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

    // Calculate derived values outside of conditional rendering to follow React hooks rules
    const results = analysisResult?.results;
    const perfMean = results?.means?.performance ?? (results?.ipa_matrix.reduce((sum, item) => sum + item.performance, 0) / (results?.ipa_matrix.length || 1)) ?? 0;
    const impMean = results?.means?.importance ?? (results?.ipa_matrix.reduce((sum, item) => sum + item.importance, 0) / (results?.ipa_matrix.length || 1)) ?? 0;
    
    const totalItems = results?.ipa_matrix.length || 0;
    const quadrantCounts = {
        'Q2: Concentrate Here': results?.ipa_matrix.filter(i => i.quadrant === 'Q2: Concentrate Here').length || 0,
        'Q1: Keep Up Good Work': results?.ipa_matrix.filter(i => i.quadrant === 'Q1: Keep Up Good Work').length || 0,
        'Q3: Low Priority': results?.ipa_matrix.filter(i => i.quadrant === 'Q3: Low Priority').length || 0,
        'Q4: Possible Overkill': results?.ipa_matrix.filter(i => i.quadrant === 'Q4: Possible Overkill').length || 0,
    };

    // Calculate percentages
    const quadrantPercentages = {
        'Q2: Concentrate Here': totalItems > 0 ? ((quadrantCounts['Q2: Concentrate Here'] / totalItems) * 100).toFixed(1) : '0.0',
        'Q1: Keep Up Good Work': totalItems > 0 ? ((quadrantCounts['Q1: Keep Up Good Work'] / totalItems) * 100).toFixed(1) : '0.0',
        'Q3: Low Priority': totalItems > 0 ? ((quadrantCounts['Q3: Low Priority'] / totalItems) * 100).toFixed(1) : '0.0',
        'Q4: Possible Overkill': totalItems > 0 ? ((quadrantCounts['Q4: Possible Overkill'] / totalItems) * 100).toFixed(1) : '0.0',
    };

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

    if (!analysisResult || !results) {
        return (
            <Card className="shadow-lg">
                <CardContent className="p-12 text-center text-muted-foreground">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No analysis results to display.</p>
                </CardContent>
            </Card>
        );
    }

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

            {/* Response Distribution Summary */}
            <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                        <Info className="h-5 w-5" />
                        Response Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Q2: Concentrate Here */}
                        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <Flame className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                    <span className="text-red-600">Q2: Concentrate Here</span>
                                    <span className="text-gray-600 ml-2">
                                        ({quadrantCounts['Q2: Concentrate Here']} items, {quadrantPercentages['Q2: Concentrate Here']}%)
                                    </span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {results.ipa_matrix.filter(i => i.quadrant === 'Q2: Concentrate Here').length > 0 ? (
                                        <>
                                            High importance but low performance: {' '}
                                            <span className="font-semibold">
                                                {results.ipa_matrix
                                                    .filter(i => i.quadrant === 'Q2: Concentrate Here')
                                                    .sort((a, b) => b.priority_score - a.priority_score)
                                                    .slice(0, 3)
                                                    .map(i => i.attribute)
                                                    .join(', ')}
                                            </span>
                                        </>
                                    ) : 'No critical issues identified'}
                                </p>
                            </div>
                        </div>

                        {/* Q1: Keep Up Good Work */}
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <Star className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                    <span className="text-green-600">Q1: Keep Up Good Work</span>
                                    <span className="text-gray-600 ml-2">
                                        ({quadrantCounts['Q1: Keep Up Good Work']} items, {quadrantPercentages['Q1: Keep Up Good Work']}%)
                                    </span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {results.ipa_matrix.filter(i => i.quadrant === 'Q1: Keep Up Good Work').length > 0 ? (
                                        <>
                                            High importance and high performance: {' '}
                                            <span className="font-semibold">
                                                {results.ipa_matrix
                                                    .filter(i => i.quadrant === 'Q1: Keep Up Good Work')
                                                    .sort((a, b) => b.performance - a.performance)
                                                    .slice(0, 3)
                                                    .map(i => i.attribute)
                                                    .join(', ')}
                                            </span>
                                        </>
                                    ) : 'No strengths identified'}
                                </p>
                            </div>
                        </div>

                        {/* Q4: Possible Overkill */}
                        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <TrendingDown className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                    <span className="text-amber-600">Q4: Possible Overkill</span>
                                    <span className="text-gray-600 ml-2">
                                        ({quadrantCounts['Q4: Possible Overkill']} items, {quadrantPercentages['Q4: Possible Overkill']}%)
                                    </span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {results.ipa_matrix.filter(i => i.quadrant === 'Q4: Possible Overkill').length > 0 ? (
                                        <>
                                            Low importance but high performance: {' '}
                                            <span className="font-semibold">
                                                {results.ipa_matrix
                                                    .filter(i => i.quadrant === 'Q4: Possible Overkill')
                                                    .sort((a, b) => b.performance - a.performance)
                                                    .slice(0, 3)
                                                    .map(i => i.attribute)
                                                    .join(', ')}
                                            </span>
                                        </>
                                    ) : 'No over-investments identified'}
                                </p>
                            </div>
                        </div>

                        {/* Q3: Low Priority */}
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <Target className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                    <span className="text-gray-600">Q3: Low Priority</span>
                                    <span className="text-gray-600 ml-2">
                                        ({quadrantCounts['Q3: Low Priority']} items, {quadrantPercentages['Q3: Low Priority']}%)
                                    </span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {results.ipa_matrix.filter(i => i.quadrant === 'Q3: Low Priority').length > 0 ? (
                                        <>
                                            Low importance and low performance: {' '}
                                            <span className="font-semibold">
                                                {results.ipa_matrix
                                                    .filter(i => i.quadrant === 'Q3: Low Priority')
                                                    .slice(0, 3)
                                                    .map(i => i.attribute)
                                                    .join(', ')}
                                            </span>
                                        </>
                                    ) : 'No low priority items'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <Alert className="mt-6 border-2 border-indigo-200 bg-indigo-50">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <AlertTitle className="text-indigo-900">Key Insights</AlertTitle>
                        <AlertDescription className="text-indigo-700 space-y-1">
                            <p>
                                • <strong>Critical Actions:</strong> {quadrantCounts['Q2: Concentrate Here']} attributes require immediate improvement
                            </p>
                            <p>
                                • <strong>Competitive Strengths:</strong> {quadrantCounts['Q1: Keep Up Good Work']} attributes are performing well
                            </p>
                            <p>
                                • <strong>Resource Optimization:</strong> Consider reallocating resources from {quadrantCounts['Q4: Possible Overkill']} over-performing low-importance areas
                            </p>
                            <p>
                                • <strong>Model Fit:</strong> R² = {(results.regression_summary.r2 * 100).toFixed(1)}% - 
                                {results.regression_summary.r2 > 0.7 ? ' Excellent model fit' : results.regression_summary.r2 > 0.5 ? ' Good model fit' : ' Moderate model fit'}
                            </p>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(quadrantConfig).map(([quadrantName, config]) => {
                    const Icon = config.icon;
                    const count = quadrantCounts[quadrantName as keyof typeof quadrantCounts];
                    const percentage = quadrantPercentages[quadrantName as keyof typeof quadrantPercentages];
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
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-bold text-gray-900">{count}</p>
                                                <p className="text-lg font-semibold text-gray-600">({percentage}%)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{config.action}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* IPA Matrix Chart */}
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
                                                <p className="text-sm text-gray-600">GAP: {(data.performance_gap || 0).toFixed(2)}</p>
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
                        <div className="absolute top-12 left-40 bg-red-100 px-3 py-1 rounded text-xs font-semibold text-red-800 pointer-events-none">
                            Concentrate Here
                        </div>
                        <div className="absolute top-12 right-28 bg-green-100 px-3 py-1 rounded text-xs font-semibold text-green-800 pointer-events-none">
                            Keep Up
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

            {/* Quadrant Overview - Order matching IPA chart: Q2(top-left), Q1(top-right), Q3(bottom-left), Q4(bottom-right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['Q2: Concentrate Here', 'Q1: Keep Up Good Work', 'Q3: Low Priority', 'Q4: Possible Overkill'].map((quadrantName) => {
                    const config = quadrantConfig[quadrantName as keyof typeof quadrantConfig];
                    const items = results.ipa_matrix.filter(item => item.quadrant === quadrantName);
                    const Icon = config.icon;
                    const percentage = quadrantPercentages[quadrantName as keyof typeof quadrantPercentages];
                    return (
                        <Card key={quadrantName} className={`border-2 ${config.border} shadow-lg`}>
                            <CardHeader className={config.bg}>
                                <CardTitle className={`flex items-center justify-between ${config.color}`}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-5 w-5" />
                                        {quadrantName}
                                    </div>
                                    <Badge variant="secondary" className="text-sm">
                                        {percentage}%
                                    </Badge>
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
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-muted-foreground">GAP:</span>
                                                        <span className={`font-mono font-bold ${(item.performance_gap || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {(item.performance_gap || 0) >= 0 ? '+' : ''}{(item.performance_gap || 0).toFixed(2)}
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

            {/* Improvement Priority Index */}
            <Card className="shadow-lg border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                        <Flame className="h-5 w-5" />
                        Improvement Priority Index (IPI)
                    </CardTitle>
                    <CardDescription className="text-purple-700">
                        Formula: β × (Average Performance - Current Performance) - Identifies attributes with highest improvement impact
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Rank</TableHead>
                                    <TableHead className="font-bold">Attribute</TableHead>
                                    <TableHead className="text-right font-bold">IPI Score</TableHead>
                                    <TableHead className="text-right font-bold">Beta (β)</TableHead>
                                    <TableHead className="text-right font-bold">Performance GAP</TableHead>
                                    <TableHead className="font-bold">Quadrant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.ipa_matrix
                                    .sort((a, b) => (b.improvement_priority_index || 0) - (a.improvement_priority_index || 0))
                                    .map((item, idx) => {
                                        const config = quadrantConfig[item.quadrant as keyof typeof quadrantConfig];
                                        const ipi = item.improvement_priority_index || 0;
                                        const isHighPriority = ipi > 0.1;
                                        
                                        return (
                                            <TableRow 
                                                key={item.attribute}
                                                className={`hover:bg-muted/30 transition-colors ${isHighPriority ? 'bg-red-50/50' : ''}`}
                                            >
                                                <TableCell>
                                                    <Badge variant={idx < 3 ? "destructive" : "outline"}>
                                                        #{idx + 1}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    {item.attribute}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-mono font-bold text-lg ${isHighPriority ? 'text-red-600' : 'text-purple-600'}`}>
                                                        {ipi.toFixed(4)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-blue-600">
                                                    {(item.beta || 0).toFixed(3)}
                                                </TableCell>
                                                <TableCell className={`text-right font-mono ${(item.performance_gap || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {(item.performance_gap || 0) >= 0 ? '+' : ''}{(item.performance_gap || 0).toFixed(3)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={config.color}>
                                                        {item.quadrant.split(':')[0]}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </ScrollArea>

                    <Alert className="mt-6 border-2 border-purple-200 bg-purple-50">
                        <Info className="h-4 w-4 text-purple-600" />
                        <AlertTitle className="text-purple-900">Understanding IPI</AlertTitle>
                        <AlertDescription className="text-purple-700">
                            Higher IPI scores indicate attributes where improvement will have the greatest impact on overall satisfaction. 
                            IPI combines the statistical importance (β) with the gap between average and current performance.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* GAP Analysis */}
            <Card className="shadow-lg border-2 border-orange-200">
                <CardHeader className="bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardTitle className="flex items-center gap-2 text-orange-900">
                        <TrendingDown className="h-5 w-5" />
                        Performance GAP Analysis
                    </CardTitle>
                    <CardDescription className="text-orange-700">
                        Difference from average performance - Identifies underperforming attributes
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-gray-700">
                            <strong>Average Performance:</strong> <span className="font-mono text-lg text-orange-600">{perfMean.toFixed(3)}</span>
                        </p>
                    </div>

                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Attribute</TableHead>
                                    <TableHead className="text-right font-bold">Performance</TableHead>
                                    <TableHead className="text-right font-bold">GAP</TableHead>
                                    <TableHead className="text-right font-bold">Status</TableHead>
                                    <TableHead className="font-bold">Quadrant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.ipa_matrix
                                    .sort((a, b) => (a.performance_gap || 0) - (b.performance_gap || 0))
                                    .map((item) => {
                                        const config = quadrantConfig[item.quadrant as keyof typeof quadrantConfig];
                                        const gap = item.performance_gap || 0;
                                        const isBelow = gap < 0;
                                        
                                        return (
                                            <TableRow 
                                                key={item.attribute}
                                                className={`hover:bg-muted/30 transition-colors ${isBelow ? 'bg-red-50/30' : 'bg-green-50/30'}`}
                                            >
                                                <TableCell className="font-semibold">
                                                    {item.attribute}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-blue-600">
                                                    {item.performance.toFixed(3)}
                                                </TableCell>
                                                <TableCell className={`text-right font-mono font-bold text-lg ${isBelow ? 'text-red-600' : 'text-green-600'}`}>
                                                    {gap >= 0 ? '+' : ''}{gap.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={isBelow ? "destructive" : "default"}>
                                                        {isBelow ? 'Below Avg' : 'Above Avg'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={config.color}>
                                                        {item.quadrant.split(':')[0]}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </ScrollArea>

                    <Alert className="mt-6 border-2 border-orange-200 bg-orange-50">
                        <Info className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-900">Understanding GAP</AlertTitle>
                        <AlertDescription className="text-orange-700">
                            Negative GAP values indicate performance below average and may require attention. 
                            Combine GAP analysis with quadrant position to prioritize improvements.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Detailed Analysis Table */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-indigo-600" />
                        Detailed Analysis Table
                    </CardTitle>
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
                                    <TableHead className="text-right font-bold">GAP</TableHead>
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
                                                <TableCell className={`text-right font-mono font-bold ${(item.performance_gap || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {(item.performance_gap || 0) >= 0 ? '+' : ''}{(item.performance_gap || 0).toFixed(3)}
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

            {/* Statistical Validation */}
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
        </div>
    );
}