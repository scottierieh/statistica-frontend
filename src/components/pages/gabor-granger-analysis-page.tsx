'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse } from '@/types/survey';
import { AlertTriangle, Loader2, DollarSign, TrendingUp, TrendingDown, Target, Download, Copy, Check, Info, Lightbulb } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine, Area, AreaChart } from 'recharts';

interface Results {
    optimal_revenue_price: number;
    max_revenue: number;
    optimal_profit_price: number | null;
    max_profit: number | null;
    cliff_price: number;
    cliff_drop: number;
    acceptable_range: [number, number] | null;
    price_elasticity: Array<{
        price_from: number;
        price_to: number;
        elasticity: number;
        interpretation: string;
    }>;
    confidence_intervals: Array<{
        price: number;
        mean: number;
        ci_lower: number;
        ci_upper: number;
        sample_size: number;
    }>;
    chart_data: Array<{
        price: number;
        likelihood: number;
        revenue: number;
        profit?: number;
    }>;
    recommendations: Array<{
        strategy: string;
        price: number;
        rationale: string;
        priority: number;
    }>;
    interpretation: string;
    total_respondents: number;
    price_range: {
        min: number;
        max: number;
        mean: number;
    };
    price_points_tested: number;
    unit_cost?: number;
}

interface Props {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function GaborGrangerPage({ survey, responses }: Props) {
    const { toast } = useToast();
    const [results, setResults] = useState<Results | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!survey || !responses || responses.length === 0) {
                throw new Error("No survey data or responses");
            }

            const priceQuestion = survey.questions.find(q => 
                q.title.toLowerCase().includes('price') || q.title.toLowerCase().includes('cost')
            );
            const intentQuestion = survey.questions.find(q => 
                q.title.toLowerCase().includes('purchase') || q.title.toLowerCase().includes('buy')
            );

            if (!priceQuestion || !intentQuestion) {
                throw new Error("Missing required questions (price and purchase intent).");
            }

            const data = responses.map(resp => {
                const answers = resp.answers as any;
                return {
                    [priceQuestion.id]: answers[priceQuestion.id],
                    [intentQuestion.id]: answers[intentQuestion.id]
                };
            });

            // Get unit cost if available (from survey metadata or a specific question)
            const unitCost = survey.metadata?.unit_cost || null;

            const response = await fetch('/api/analysis/gabor-granger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    price_col: priceQuestion.id,
                    purchase_intent_col: intentQuestion.id,
                    unit_cost: unitCost
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'API error');
            }

            const apiData = await response.json();
            if (apiData.error) throw new Error(apiData.error);
            setResults(apiData.results);
        } catch (err: any) {
            setError(err.message);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [survey, responses, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const exportToCSV = useCallback(() => {
        if (!results) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Gabor-Granger Analysis Results\\n\\n";
        
        csvContent += "Key Metrics\\n";
        csvContent += "Metric,Value\\n";
        csvContent += `Optimal Revenue Price,$${results.optimal_revenue_price.toFixed(2)}\\n`;
        csvContent += `Max Revenue,$${results.max_revenue.toFixed(2)}\\n`;
        if (results.optimal_profit_price) {
            csvContent += `Optimal Profit Price,$${results.optimal_profit_price.toFixed(2)}\\n`;
            csvContent += `Max Profit,$${results.max_profit?.toFixed(2)}\\n`;
        }
        csvContent += `Demand Cliff Price,$${results.cliff_price.toFixed(2)}\\n`;
        csvContent += `Total Respondents,${results.total_respondents}\\n\\n`;
        
        csvContent += "Demand Curve\\n";
        csvContent += "Price,Likelihood (%),Revenue" + (results.chart_data[0]?.profit !== undefined ? ",Profit" : "") + "\\n";
        results.chart_data.forEach(point => {
            csvContent += `$${point.price.toFixed(2)},${point.likelihood.toFixed(2)},${point.revenue.toFixed(2)}`;
            if (point.profit !== undefined) {
                csvContent += `,${point.profit.toFixed(2)}`;
            }
            csvContent += "\\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `gabor_granger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Success", description: "CSV file downloaded successfully" });
    }, [results, toast]);

    const copyToClipboard = useCallback(() => {
        if (!results) return;
        
        const text = `GABOR-GRANGER ANALYSIS RESULTS

OPTIMAL PRICING:
- Revenue-Optimal Price: $${results.optimal_revenue_price.toFixed(2)}
${results.optimal_profit_price ? `- Profit-Optimal Price: $${results.optimal_profit_price.toFixed(2)}` : ''}
- Demand Cliff: $${results.cliff_price.toFixed(2)}
${results.acceptable_range ? `- Acceptable Range: $${results.acceptable_range[0].toFixed(2)} - $${results.acceptable_range[1].toFixed(2)}` : ''}

SAMPLE INFO:
- Total Respondents: ${results.total_respondents}
- Price Points Tested: ${results.price_points_tested}
- Price Range: $${results.price_range.min.toFixed(2)} - $${results.price_range.max.toFixed(2)}
`;
        
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Results copied to clipboard" });
    }, [results, toast]);

    if (loading) {
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

    if (!results) {
        return (
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Data</AlertTitle>
                <AlertDescription>No analysis results available.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="shadow-lg border-2 border-indigo-200">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-3xl font-bold flex items-center gap-3">
                                <DollarSign className="h-8 w-8 text-indigo-600" />
                                Gabor-Granger Price Analysis
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                Optimal Pricing Strategy • {results.total_respondents} Respondents • {results.price_points_tested} Price Points
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={copyToClipboard}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                <span className="ml-2">Copy</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToCSV}>
                                <Download className="h-4 w-4" />
                                <span className="ml-2">Export CSV</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-2 border-green-200 hover:shadow-xl transition-all duration-300">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                                <Badge variant="default" className="bg-green-600">Revenue</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Optimal Price</p>
                            <p className="text-3xl font-bold text-green-700">${results.optimal_revenue_price.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-1">Max Revenue: ${results.max_revenue.toFixed(2)}</p>
                        </div>
                    </CardContent>
                </Card>

                {results.optimal_profit_price && (
                    <Card className="border-2 border-blue-200 hover:shadow-xl transition-all duration-300">
                        <CardContent className="pt-6">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Target className="h-6 w-6 text-blue-600" />
                                    <Badge className="bg-blue-600">Profit</Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">Optimal Price</p>
                                <p className="text-3xl font-bold text-blue-700">${results.optimal_profit_price.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-1">Max Profit: ${results.max_profit?.toFixed(2)}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-2 border-red-200 hover:shadow-xl transition-all duration-300">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <TrendingDown className="h-6 w-6 text-red-600" />
                                <Badge variant="destructive">Cliff</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Demand Cliff</p>
                            <p className="text-3xl font-bold text-red-700">${results.cliff_price.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-1">Drop: {(results.cliff_drop * 100).toFixed(1)}%</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 hover:shadow-xl transition-all duration-300">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <Info className="h-6 w-6 text-purple-600" />
                                <Badge className="bg-purple-600">Range</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Price Range</p>
                            <p className="text-2xl font-bold text-purple-700">
                                ${results.price_range.min.toFixed(2)} - ${results.price_range.max.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Mean: ${results.price_range.mean.toFixed(2)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Key Insights */}
            <Alert className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <Lightbulb className="h-4 w-4 text-indigo-600" />
                <AlertTitle className="text-indigo-900 text-lg">Strategic Insights</AlertTitle>
                <AlertDescription className="text-indigo-700 mt-2 whitespace-pre-line">
                    {results.interpretation}
                </AlertDescription>
            </Alert>

            {/* Demand Curve Chart */}
            <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-purple-600" />
                        Demand Curve
                    </CardTitle>
                    <CardDescription>Purchase likelihood across different price points</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={results.chart_data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="price" 
                                tickFormatter={(value) => `$${value.toFixed(2)}`}
                                label={{ value: 'Price', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                                label={{ value: 'Purchase Likelihood (%)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                                formatter={(value: any, name: string) => {
                                    if (name === 'likelihood') return `${value.toFixed(2)}%`;
                                    return value.toFixed(2);
                                }}
                                labelFormatter={(label) => `Price: $${label.toFixed(2)}`}
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="likelihood" 
                                stroke="#8b5cf6" 
                                strokeWidth={3}
                                name="Purchase Likelihood (%)"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <ReferenceLine 
                                x={results.optimal_revenue_price} 
                                stroke="#10b981" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                label={{ value: `Revenue Optimal $${results.optimal_revenue_price.toFixed(2)}`, fill: '#10b981', position: 'top' }}
                            />
                            {results.optimal_profit_price && (
                                <ReferenceLine 
                                    x={results.optimal_profit_price} 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    label={{ value: `Profit Optimal $${results.optimal_profit_price.toFixed(2)}`, fill: '#3b82f6', position: 'top' }}
                                />
                            )}
                            <ReferenceLine 
                                x={results.cliff_price} 
                                stroke="#ef4444" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                label={{ value: `Cliff $${results.cliff_price.toFixed(2)}`, fill: '#ef4444', position: 'bottom' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Revenue & Profit Curves */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            Revenue Curve
                        </CardTitle>
                        <CardDescription>Expected revenue at each price point</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={results.chart_data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="price" 
                                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                                />
                                <YAxis />
                                <Tooltip 
                                    formatter={(value: any) => value.toFixed(2)}
                                    labelFormatter={(label) => `Price: $${label.toFixed(2)}`}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#10b981" 
                                    fill="#10b981"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                />
                                <ReferenceLine 
                                    x={results.optimal_revenue_price} 
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    label={{ value: `Max $${results.optimal_revenue_price.toFixed(2)}`, fill: '#10b981' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Profit Chart */}
                {results.chart_data[0]?.profit !== undefined && (
                    <Card className="shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-600" />
                                Profit Curve
                            </CardTitle>
                            <CardDescription>Expected profit at each price point</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={results.chart_data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="price" 
                                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                                    />
                                    <YAxis />
                                    <Tooltip 
                                        formatter={(value: any) => value.toFixed(2)}
                                        labelFormatter={(label) => `Price: $${label.toFixed(2)}`}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="profit" 
                                        stroke="#3b82f6" 
                                        fill="#3b82f6"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                    {results.optimal_profit_price && (
                                        <ReferenceLine 
                                            x={results.optimal_profit_price} 
                                            stroke="#3b82f6" 
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            label={{ value: `Max $${results.optimal_profit_price.toFixed(2)}`, fill: '#3b82f6' }}
                                        />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Price Elasticity */}
            <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-amber-600" />
                        Price Elasticity
                    </CardTitle>
                    <CardDescription>How demand responds to price changes</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Price Range</TableHead>
                                    <TableHead className="text-right">Elasticity</TableHead>
                                    <TableHead>Interpretation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.price_elasticity.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">
                                            ${item.price_from.toFixed(2)} → ${item.price_to.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {item.elasticity.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={item.interpretation === 'Elastic' ? 'destructive' : 'default'}
                                            >
                                                {item.interpretation}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Price Recommendations */}
            <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50">
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-violet-600" />
                        Price Recommendations
                    </CardTitle>
                    <CardDescription>Strategic pricing options ranked by priority</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        {results.recommendations.sort((a, b) => a.priority - b.priority).map((rec, idx) => (
                            <Card key={idx} className="border-2 border-violet-200 bg-violet-50">
                                <CardContent className="pt-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="default" className="bg-violet-600">
                                                    Priority {rec.priority}
                                                </Badge>
                                                <span className="font-bold text-lg">{rec.strategy}</span>
                                            </div>
                                            <p className="text-sm text-gray-700">{rec.rationale}</p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-3xl font-bold text-violet-700">${rec.price.toFixed(2)}</p>
                                            <p className="text-xs text-gray-500">Recommended Price</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Demand Data Table */}
            <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                    <CardTitle>Detailed Demand Data</CardTitle>
                    <CardDescription>Complete data for all tested price points</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Likelihood (%)</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    {results.chart_data[0]?.profit !== undefined && (
                                        <TableHead className="text-right">Profit</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.chart_data.map((point, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">${point.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{point.likelihood.toFixed(2)}%</TableCell>
                                        <TableCell className="text-right">${point.revenue.toFixed(2)}</TableCell>
                                        {point.profit !== undefined && (
                                            <TableCell className="text-right">${point.profit.toFixed(2)}</TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

