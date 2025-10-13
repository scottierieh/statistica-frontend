'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, AlertTriangle, Award, Lightbulb, Target, TrendingUp, TrendingDown, Zap, Brain } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid, Bar, BarChart, Cell, Area, ComposedChart } from 'recharts';

interface GaborGrangerResults {
    optimal_revenue_price: number;
    optimal_profit_price?: number;
    max_revenue: number;
    max_profit?: number;
    demand_curve: { price: number; likelihood: number; revenue: number; profit?: number }[];
    cliff_price: number;
    acceptable_range: [number, number] | null;
    price_elasticity: { price_from: number, price_to: number, elasticity: number }[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: GaborGrangerResults;
    error?: string;
}

interface GaborGrangerPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function GaborGrangerAnalysisPage({ survey, responses }: GaborGrangerPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unitCost, setUnitCost] = useState<number | undefined>();

    const handleAnalysis = useCallback(async (cost?: number) => {
        if (!survey || !responses || responses.length === 0) {
            setError("No response data available for this survey.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        if (cost === undefined) {
            setAnalysisResult(null);
        }

        const gaborGrangerQuestions = survey.questions.filter(q => 
            q.type === 'single' && 
            q.title.toLowerCase().includes('if this product was sold for')
        );

        if (gaborGrangerQuestions.length === 0) {
            setError("No Gabor-Granger style questions found in the survey. Questions should include 'if this product was sold for' in the title.");
            setIsLoading(false);
            return;
        }

        const analysisData: { respondent_id: string; price: number; purchase_intent: number }[] = [];
        
        responses.forEach(resp => {
            gaborGrangerQuestions.forEach(q => {
                const answer = (resp.answers as any)[q.id];
                const priceMatch = q.title.match(/\$?([\d,]+)/);
                
                if (answer && priceMatch) {
                    const priceValue = Number(priceMatch[1].replace(/,/g, ''));
                    const intentValue = answer === 'Yes, I would buy' ? 1 : 0;
                    
                    analysisData.push({
                        respondent_id: resp.id,
                        price: priceValue,
                        purchase_intent: intentValue,
                    });
                }
            });
        });

        if (analysisData.length === 0) {
            setError("Could not extract valid data for Gabor-Granger analysis from responses. Please ensure questions have prices in format '$XXX' and answers include 'Yes, I would buy'.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/analysis/gabor-granger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    price_col: 'price',
                    purchase_intent_col: 'purchase_intent',
                    unit_cost: cost
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            if (cost !== undefined) {
                toast({ title: 'Analysis Updated', description: 'Profit calculations have been added.' });
            } else {
                toast({ title: 'Analysis Complete', description: 'Gabor-Granger analysis finished.' });
            }
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);
    
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    const handleUnitCostAnalysis = () => {
        handleAnalysis(unitCost);
    };

    const chartData = useMemo(() => {
        if (!analysisResult?.results.demand_curve) return [];
        return analysisResult.results.demand_curve.map(d => ({
            ...d,
            likelihood_pct: d.likelihood * 100
        }));
    }, [analysisResult]);

    const elasticityData = useMemo(() => {
        if (!analysisResult?.results.price_elasticity) return [];
        return analysisResult.results.price_elasticity.map(e => ({
            ...e,
            range: `$${e.price_from}-${e.price_to}`
        }));
    }, [analysisResult]);

    if (isLoading && !analysisResult) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Gabor-Granger Analysis...</p>
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

    const { results } = analysisResult;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="shadow-lg border-2 border-indigo-200">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="text-3xl font-bold flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-indigo-600" />
                        Gabor-Granger Price Sensitivity Analysis
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        Demand Curve & Optimal Pricing Strategy • {responses.length} Respondents
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Unit Cost Configuration */}
            <Card className="shadow-lg border-2 border-blue-200">
                <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Analysis Configuration
                    </CardTitle>
                    <CardDescription>Add unit cost to calculate profit-optimal pricing</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="flex items-end gap-4">
                        <div className="flex-1 max-w-xs">
                            <Label htmlFor="unit-cost" className="text-sm font-semibold">Unit Cost (Optional)</Label>
                            <Input 
                                id="unit-cost"
                                type="number"
                                placeholder="Enter cost per unit"
                                value={unitCost === undefined ? '' : unitCost}
                                onChange={e => setUnitCost(e.target.value === '' ? undefined : Number(e.target.value))}
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Provide unit cost to see profit maximization analysis
                            </p>
                        </div>
                        <Button 
                            onClick={handleUnitCostAnalysis} 
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    Recalculating...
                                </>
                            ) : (
                                <>Recalculate with Cost</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-2 border-green-200 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-semibold text-gray-600">Optimal Price</span>
                        </div>
                        <p className="text-4xl font-bold text-green-600">
                            ${results.optimal_revenue_price.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Revenue Maximization</p>
                    </CardContent>
                </Card>
                
                <Card className="border-2 border-blue-200 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-600">Max Revenue</span>
                        </div>
                        <p className="text-4xl font-bold text-blue-600">
                            {results.max_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Revenue Index</p>
                    </CardContent>
                </Card>
                
                {results.optimal_profit_price && (
                    <Card className="border-2 border-purple-200 shadow-lg">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Award className="h-5 w-5 text-purple-600" />
                                <span className="text-sm font-semibold text-gray-600">Optimal Price (Profit)</span>
                            </div>
                            <p className="text-4xl font-bold text-purple-600">
                                ${results.optimal_profit_price.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Profit Maximization</p>
                        </CardContent>
                    </Card>
                )}
                
                {results.max_profit !== undefined && (
                    <Card className="border-2 border-amber-200 shadow-lg">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="h-5 w-5 text-amber-600" />
                                <span className="text-sm font-semibold text-gray-600">Max Profit</span>
                            </div>
                            <p className="text-4xl font-bold text-amber-600">
                                {results.max_profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Profit Index</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Optimal Price Strategies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-lg border-2 border-green-200">
                    <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
                        <CardTitle className="flex items-center gap-2 text-green-700">
                            <Award className="h-5 w-5" />
                            Revenue Maximization
                        </CardTitle>
                        <CardDescription>Maximizes total revenue</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <p className="text-3xl font-bold text-green-600">
                            ${results.optimal_revenue_price.toLocaleString()}
                        </p>
                        <div className="mt-3 p-2 bg-muted rounded">
                            <p className="text-xs text-gray-600">Revenue Index</p>
                            <p className="text-lg font-bold">
                                {results.max_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {results.optimal_profit_price && (
                    <Card className="shadow-lg border-2 border-purple-200">
                        <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                            <CardTitle className="flex items-center gap-2 text-purple-700">
                                <Award className="h-5 w-5" />
                                Profit Maximization
                            </CardTitle>
                            <CardDescription>Maximizes profit margin</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-3xl font-bold text-purple-600">
                                ${results.optimal_profit_price.toLocaleString()}
                            </p>
                            <div className="mt-3 p-2 bg-muted rounded">
                                <p className="text-xs text-gray-600">Profit Index</p>
                                <p className="text-lg font-bold">
                                    {results.max_profit?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 'N/A'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {results.acceptable_range && (
                    <Card className="shadow-lg border-2 border-blue-200">
                        <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                                <Target className="h-5 w-5" />
                                Acceptable Range
                            </CardTitle>
                            <CardDescription>Price range with good demand</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-2xl font-bold text-blue-600">
                                ${results.acceptable_range[0]} - ${results.acceptable_range[1]}
                            </p>
                            <div className="mt-3 p-2 bg-muted rounded">
                                <p className="text-xs text-gray-600">Price Sensitivity Zone</p>
                                <p className="text-sm font-medium">Balanced acceptance</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* AI Interpretation */}
            {results.interpretation && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-indigo-600" />
                            AI-Generated Strategic Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <Lightbulb className="h-4 w-4 text-indigo-600" />
                            <AlertTitle className="text-indigo-900 text-lg">Strategic Pricing Insights</AlertTitle>
                            <AlertDescription className="text-indigo-700 mt-2">
                                <div 
                                    className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ 
                                        __html: results.interpretation
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\n\n/g, '<br/><br/>')
                                            .replace(/\n/g, '<br/>')
                                    }}
                                />
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* Demand Curve Chart */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-indigo-600" />
                        Demand, Revenue & Profit Curves
                    </CardTitle>
                    <CardDescription>
                        Relationship between price and purchase likelihood
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="price" 
                                tickFormatter={(value) => `$${value}`}
                                label={{ value: 'Price Point', position: 'bottom', offset: -5 }}
                            />
                            <YAxis 
                                yAxisId="left"
                                label={{ value: 'Purchase Likelihood (%)', angle: -90, position: 'insideLeft' }}
                            />
                            <YAxis 
                                yAxisId="right" 
                                orientation="right"
                                label={{ value: 'Revenue / Profit Index', angle: 90, position: 'insideRight' }}
                            />
                            <Tooltip />
                            <Legend />
                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="revenue"
                                fill="#8b5cf6"
                                fillOpacity={0.2}
                                stroke="none"
                                name="Revenue"
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="likelihood_pct"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                name="Purchase Likelihood (%)"
                                dot={{ r: 6 }}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="revenue"
                                stroke="#ef4444"
                                strokeWidth={3}
                                name="Revenue Index"
                                dot={{ r: 6 }}
                            />
                            {chartData.some(d => d.profit !== undefined) && (
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    name="Profit Index"
                                    dot={{ r: 6 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Data Tables */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Demand Curve Table */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Detailed Price Point Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full">
                            <thead>
                                <tr className="bg-muted/50 border-b">
                                    <th className="text-left p-3 font-bold">Price</th>
                                    <th className="text-right p-3 font-bold">Likelihood</th>
                                    <th className="text-right p-3 font-bold">Revenue</th>
                                    {chartData.some(r => r.profit !== undefined) && (
                                        <th className="text-right p-3 font-bold">Profit</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {results.demand_curve.map((row) => (
                                    <tr key={row.price} className="border-b hover:bg-muted/30">
                                        <td className="p-3 font-bold">${row.price.toLocaleString()}</td>
                                        <td className="text-right p-3 font-mono text-blue-600">
                                            {(row.likelihood * 100).toFixed(1)}%
                                        </td>
                                        <td className="text-right p-3 font-mono text-red-600">
                                            {row.revenue.toFixed(2)}
                                        </td>
                                        {row.profit !== undefined && (
                                            <td className="text-right p-3 font-mono text-purple-600">
                                                {row.profit.toFixed(2)}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Elasticity */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-600" />
                            Price Elasticity by Range
                        </CardTitle>
                        <CardDescription>Sensitivity to price changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={elasticityData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="range" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="elasticity">
                                    {elasticityData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                Math.abs(entry.elasticity) > 2
                                                    ? '#ef4444'
                                                    : Math.abs(entry.elasticity) > 1
                                                    ? '#f59e0b'
                                                    : '#10b981'
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        <div className="mt-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/50 border-b">
                                        <th className="text-left p-2 font-bold text-sm">Price Range</th>
                                        <th className="text-right p-2 font-bold text-sm">Elasticity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {elasticityData.map((item, index) => (
                                        <tr key={index} className="border-b hover:bg-muted/30">
                                            <td className="p-2 text-sm">{item.range}</td>
                                            <td className="text-right p-2 font-mono text-sm font-bold">
                                                {item.elasticity.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Final Recommendation */}
            <Alert className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
                <Award className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 text-xl">Recommended Pricing Strategy</AlertTitle>
                <AlertDescription className="text-green-700 mt-3 space-y-2">
                    <p>
                        <strong>Optimal Price Point:</strong> ${results.optimal_revenue_price.toLocaleString()} 
                        for revenue maximization
                        {results.optimal_profit_price && ` or $${results.optimal_profit_price.toLocaleString()} for profit maximization`}
                    </p>
                    {results.acceptable_range && (
                        <p>
                            <strong>Acceptable Range:</strong> ${results.acceptable_range[0]} - ${results.acceptable_range[1]} 
                            maintains good purchase intent
                        </p>
                    )}
                    <p>
                        <strong>Action:</strong> Test pricing within the recommended range and monitor customer response closely
                    </p>
                </AlertDescription>
            </Alert>
        </div>
    );
}
