'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import type { Survey, SurveyResponse } from '@/types/survey';
import { 
    Loader2, AlertTriangle, Download, Copy, Check, DollarSign, 
    TrendingUp, Target, BarChart as BarIcon, LineChart as LineIcon
} from 'lucide-react';
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, 
    CartesianGrid, ReferenceLine, Area, AreaChart, ComposedChart, ReferenceArea
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface AnalysisResults {
    pmc: number;
    pme: number;
    opp: number;
    idp: number;
    interpretation: string;
}

interface CurvesData {
    price_range: number[];
    too_cheap: number[];
    cheap: number[];
    expensive: number[];
    too_expensive: number[];
    acceptance: number[];
    not_too_cheap: number[];
    not_too_expensive: number[];
}

interface RevenueData {
    price_range: number[];
    revenue: number[];
    profit: number[];
    demand: number[];
    optimal_revenue_price: number;
    optimal_revenue_value: number;
    optimal_profit_price: number;
    optimal_profit_value: number;
}

interface ElasticityData {
    price_range: number[];
    elasticity: (number | null)[];
}

interface Statistics {
    total_responses: number;
    price_distribution: {
        [key: string]: {
            mean: number;
            median: number;
            std: number;
            min: number;
            max: number;
            q25: number;
            q75: number;
        };
    };
    acceptable_range: {
        min: number;
        max: number;
        width: number;
        optimal_price: number;
        acceptance_at_opp: number;
        max_acceptance_price: number;
        max_acceptance_value: number;
    };
}

interface FullAnalysisResponse {
    results: AnalysisResults;
    curves_data: CurvesData;
    revenue_data: RevenueData;
    elasticity_data: ElasticityData;
    statistics: Statistics;
    error?: string;
}

interface VanWestendorpPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

// Custom Tooltip with one decimal
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                <p className="font-semibold">${typeof label === 'number' ? label.toFixed(2) : label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}%
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function VanWestendorpPage({ survey, responses }: VanWestendorpPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    
    const requiredQuestions = useMemo(() => ['too cheap', 'cheap', 'expensive', 'too expensive'], []);
    
    const questionMap = useMemo(() => {
        const mapping: {[key: string]: string} = {};
        if (!survey) return mapping;
        
        requiredQuestions.forEach(q_title => {
            const question = survey.questions.find(q => q.title.toLowerCase().includes(q_title));
            if(question) {
                mapping[q_title] = question.id;
            }
        });
        return mapping;
    }, [survey, requiredQuestions]);

    const canRun = useMemo(() => Object.keys(questionMap).length === requiredQuestions.length, [questionMap, requiredQuestions]);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        if (!canRun) {
            setError("Not all required Van Westendorp questions were found.");
            setIsLoading(false);
            return;
        }

        const analysisData = responses.map(r => {
            const answers = r.answers as any;
            return {
                'Too Cheap': answers[questionMap['too cheap']],
                'Cheap': answers[questionMap['cheap']],
                'Expensive': answers[questionMap['expensive']],
                'Too Expensive': answers[questionMap['too expensive']],
            };
        });
        
        try {
            const response = await fetch('/api/analysis/van-westendorp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: analysisData,
                    too_cheap_col: 'Too Cheap',
                    cheap_col: 'Cheap',
                    expensive_col: 'Expensive',
                    too_expensive_col: 'Too Expensive',
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "Van Westendorp PSM analysis finished successfully." });

        } catch (err: any) {
            setError(err.message);
            toast({ title: "Analysis Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [responses, canRun, questionMap, toast]);
    
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const exportToCSV = useCallback(() => {
        if (!analysisResult) return;
        
        const { results, statistics } = analysisResult;
        let csvContent = "data:text/csv;charset=utf-8,";
        
        csvContent += "Van Westendorp Price Sensitivity Meter Results\\n\\n";
        csvContent += "Price Points\\n";
        csvContent += "Point,Value\\n";
        csvContent += `Optimal Price (OPP),$${results.opp.toFixed(2)}\\n`;
        csvContent += `Indifference Price (IDP),$${results.idp.toFixed(2)}\\n`;
        csvContent += `Marginal Cheapness (PMC),$${results.pmc.toFixed(2)}\\n`;
        csvContent += `Marginal Expensiveness (PME),$${results.pme.toFixed(2)}\\n`;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `psm_analysis_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: 'Export Complete', description: 'Data exported to CSV successfully.' });
    }, [analysisResult, toast]);

    const copyToClipboard = useCallback(() => {
        if (!analysisResult) return;
        
        const { results, statistics } = analysisResult;
        let text = "VAN WESTENDORP PSM ANALYSIS RESULTS\\n\\n";
        text += "KEY PRICE POINTS:\\n";
        text += `  Optimal Price (OPP): $${results.opp.toFixed(2)}\\n`;
        text += `  Indifference Price (IDP): $${results.idp.toFixed(2)}\\n`;
        text += `  Marginal Cheapness (PMC): $${results.pmc.toFixed(2)}\\n`;
        text += `  Marginal Expensiveness (PME): $${results.pme.toFixed(2)}\\n`;
        
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast({ title: 'Copied!', description: 'Results copied to clipboard.' });
            setTimeout(() => setCopied(false), 2000);
        });
    }, [analysisResult, toast]);

    const psmChartData = useMemo(() => {
        if (!analysisResult?.curves_data) return [];
        const { price_range, too_cheap, cheap, expensive, too_expensive } = analysisResult.curves_data;
        return price_range.map((price, idx) => ({
            price: price,
            tooCheap: too_cheap[idx],
            cheap: cheap[idx],
            expensive: expensive[idx],
            tooExpensive: too_expensive[idx]
        }));
    }, [analysisResult]);

    const acceptanceChartData = useMemo(() => {
        if (!analysisResult?.curves_data) return [];
        const { price_range, acceptance, not_too_cheap, not_too_expensive } = analysisResult.curves_data;
        return price_range.map((price, idx) => ({
            price: price,
            acceptance: acceptance[idx],
            notTooCheap: not_too_cheap[idx],
            notTooExpensive: not_too_expensive[idx]
        }));
    }, [analysisResult]);

    const revenueChartData = useMemo(() => {
        if (!analysisResult?.revenue_data) return [];
        const { price_range, revenue, profit, demand } = analysisResult.revenue_data;
        return price_range.map((price, idx) => ({
            price: price,
            revenue: revenue[idx],
            profit: profit[idx],
            demand: demand[idx]
        }));
    }, [analysisResult]);

    const elasticityChartData = useMemo(() => {
        if (!analysisResult?.elasticity_data) return [];
        const { price_range, elasticity } = analysisResult.elasticity_data;
        return price_range.map((price, idx) => ({
            price: Math.round(price),
            elasticity: elasticity[idx] !== null ? Math.round(elasticity[idx]! * 100) / 100 : null
        })).filter(d => d.elasticity !== null);
    }, [analysisResult]);

    // Price range data for table
    const priceRangeTableData = useMemo(() => {
        if (!analysisResult?.curves_data) return [];
        const { price_range, too_cheap, cheap, expensive, too_expensive, acceptance } = analysisResult.curves_data;
        
        // Sample every 10th point to avoid too many rows
        return price_range.filter((_, idx) => idx % 10 === 0).map((price, originalIdx) => {
            const idx = originalIdx * 10;
            return {
                price: price.toFixed(2),
                tooCheap: too_cheap[idx].toFixed(2),
                cheap: cheap[idx].toFixed(2),
                expensive: expensive[idx].toFixed(2),
                tooExpensive: too_expensive[idx].toFixed(2),
                acceptance: acceptance[idx].toFixed(2)
            };
        });
    }, [analysisResult]);

    if (isLoading && !analysisResult) {
        return (
            <Card className="shadow-lg">
                <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-lg font-medium">Running PSM Analysis</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !analysisResult) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || 'No analysis results available.'}</AlertDescription>
            </Alert>
        );
    }

    const { results, statistics } = analysisResult;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="shadow-lg border-2 border-primary/20">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <CardTitle className="font-headline text-2xl mb-2">Van Westendorp Price Sensitivity Meter</CardTitle>
                            <CardDescription className="text-base">
                                Analyzing {statistics.total_responses} responses to determine optimal pricing strategy
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={copyToClipboard}>
                                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                Copy
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToCSV}>
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Target className="h-6 w-6 text-green-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Optimal Price (OPP)</p>
                                    <div className="text-3xl font-bold text-gray-900">${results.opp.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-6 w-6 text-blue-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Acceptable Range</p>
                                    <div className="text-xl font-bold text-gray-900">${statistics.acceptable_range.min.toFixed(2)} - ${statistics.acceptable_range.max.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Max Acceptance</p>
                                    <div className="text-3xl font-bold text-gray-900">{statistics.acceptable_range.max_acceptance_value.toFixed(2)}%</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <BarIcon className="h-6 w-6 text-amber-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Total Responses</p>
                                    <div className="text-3xl font-bold text-gray-900">{statistics.total_responses}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Key Insights */}
            <Alert className="shadow-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                <Target className="h-5 w-5 text-indigo-600" />
                <AlertTitle className="text-indigo-900 text-lg font-semibold">Strategic Pricing Insights</AlertTitle>
                <AlertDescription className="text-indigo-700 space-y-2 mt-2">
                    {results.interpretation.split('\\n\\n').map((paragraph, idx) => (
                        <p key={idx} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                </AlertDescription>
            </Alert>

            {/* Price Points Table */}
            <Card className="shadow-lg border-2 border-teal-200">
                <CardHeader className="bg-gradient-to-br from-teal-50 to-teal-100">
                    <CardTitle className='flex items-center gap-2 text-teal-900'>
                        <DollarSign className="h-5 w-5"/>Key Price Points
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Price Point</TableHead>
                                <TableHead>Abbreviation</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="bg-green-50">
                                <TableCell className="font-semibold">Optimal Price Point</TableCell>
                                <TableCell className="font-mono">OPP</TableCell>
                                <TableCell className="text-right font-bold text-green-700">${results.opp.toFixed(2)}</TableCell>
                                <TableCell className="text-sm">Minimizes "too cheap" and "too expensive" responses</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold">Indifference Price Point</TableCell>
                                <TableCell className="font-mono">IDP</TableCell>
                                <TableCell className="text-right font-bold">${results.idp.toFixed(2)}</TableCell>
                                <TableCell className="text-sm">Equal numbers find it "cheap" vs "expensive"</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold">Point of Marginal Cheapness</TableCell>
                                <TableCell className="font-mono">PMC</TableCell>
                                <TableCell className="text-right font-bold">${results.pmc.toFixed(2)}</TableCell>
                                <TableCell className="text-sm">Lower bound of acceptable price range</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold">Point of Marginal Expensiveness</TableCell>
                                <TableCell className="font-mono">PME</TableCell>
                                <TableCell className="text-right font-bold">${results.pme.toFixed(2)}</TableCell>
                                <TableCell className="text-sm">Upper bound of acceptable price range</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* PSM Chart with Acceptable Range */}
            <Card className="shadow-lg border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardTitle className='flex items-center gap-2 text-purple-900'>
                        <LineIcon className="h-5 w-5"/>Price Sensitivity Meter
                    </CardTitle>
                    <CardDescription className="text-purple-700">
                        Van Westendorp four-curve analysis with key price points and acceptable range highlighted
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <ChartContainer 
                        config={{
                            tooCheap: {label: 'Too Cheap', color: '#2E86AB'},
                            cheap: {label: 'Cheap', color: '#A23B72'},
                            expensive: {label: 'Expensive', color: '#F18F01'},
                            tooExpensive: {label: 'Too Expensive', color: '#C73E1D'}
                        }} 
                        className="w-full h-[500px]"
                    >
                        <ResponsiveContainer>
                            <LineChart data={psmChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="price" 
                                    label={{ value: 'Price ($)', position: 'insideBottom', offset: -5 }}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <YAxis 
                                    label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} 
                                    domain={[0, 100]}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                
                                {/* Acceptable Range Highlight */}
                                <ReferenceArea 
                                    x1={results.pmc} 
                                    x2={results.pme} 
                                    fill="green" 
                                    fillOpacity={0.1}
                                    label={{ value: 'Acceptable Range', position: 'top' }}
                                />
                                
                                {/* Price Point Lines */}
                                <ReferenceLine x={results.pmc} stroke="#2E86AB" strokeDasharray="3 3" label={{ value: `PMC $${results.pmc.toFixed(2)}`, position: 'top' }} />
                                <ReferenceLine x={results.pme} stroke="#C73E1D" strokeDasharray="3 3" label={{ value: `PME $${results.pme.toFixed(2)}`, position: 'top' }} />
                                <ReferenceLine x={results.opp} stroke="green" strokeWidth={3} label={{ value: `OPP $${results.opp.toFixed(2)}`, position: 'top', fill: 'green', fontWeight: 'bold' }} />
                                <ReferenceLine x={results.idp} stroke="purple" strokeDasharray="3 3" label={{ value: `IDP $${results.idp.toFixed(2)}`, position: 'top' }} />
                                
                                {/* Curves */}
                                <Line type="monotone" dataKey="tooCheap" stroke="#2E86AB" strokeWidth={2.5} strokeDasharray="5 5" name="Too Cheap" dot={false} />
                                <Line type="monotone" dataKey="cheap" stroke="#A23B72" strokeWidth={2.5} strokeDasharray="5 5" name="Cheap" dot={false} />
                                <Line type="monotone" dataKey="expensive" stroke="#F18F01" strokeWidth={2.5} name="Expensive" dot={false} />
                                <Line type="monotone" dataKey="tooExpensive" stroke="#C73E1D" strokeWidth={2.5} name="Too Expensive" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Price Range Data Table */}
            <Card className="shadow-lg border-2 border-gray-200">
                <CardHeader className="bg-gradient-to-br from-gray-50 to-gray-100">
                    <CardTitle className='flex items-center gap-2 text-gray-900'>
                        <BarIcon className="h-5 w-5"/>Price Sensitivity Data Table
                    </CardTitle>
                    <CardDescription className="text-gray-700">
                        Detailed percentage breakdown across price points (sampled)
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white">
                                <TableRow>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Too Cheap %</TableHead>
                                    <TableHead className="text-right">Cheap %</TableHead>
                                    <TableHead className="text-right">Expensive %</TableHead>
                                    <TableHead className="text-right">Too Expensive %</TableHead>
                                    <TableHead className="text-right">Acceptance %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {priceRangeTableData.map((row, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="text-right font-semibold">${row.price}</TableCell>
                                        <TableCell className="text-right">{row.tooCheap}%</TableCell>
                                        <TableCell className="text-right">{row.cheap}%</TableCell>
                                        <TableCell className="text-right">{row.expensive}%</TableCell>
                                        <TableCell className="text-right">{row.tooExpensive}%</TableCell>
                                        <TableCell className="text-right font-semibold text-green-700">{row.acceptance}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Acceptance Chart */}
            <Card className="shadow-lg border-2 border-green-200">
                <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
                    <CardTitle className='flex items-center gap-2 text-green-900'>
                        <TrendingUp className="h-5 w-5"/>Price Acceptance Curve
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <ChartContainer 
                        config={{
                            acceptance: {label: 'Acceptable Price Range', color: 'green'}
                        }} 
                        className="w-full h-[400px]"
                    >
                        <ResponsiveContainer>
                            <AreaChart data={acceptanceChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="price" tickFormatter={(value) => `$${value}`} />
                                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine x={statistics.acceptable_range.max_acceptance_price} stroke="darkgreen" strokeWidth={2} label={`Max $${statistics.acceptable_range.max_acceptance_price.toFixed(2)}`} />
                                <Area type="monotone" dataKey="acceptance" stroke="green" strokeWidth={3} fill="green" fillOpacity={0.2} name="Acceptance %" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Revenue & Profit */}
            <Card className="shadow-lg border-2 border-orange-200">
                <CardHeader className="bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardTitle className='flex items-center gap-2 text-orange-900'>
                        <BarIcon className="h-5 w-5"/>Revenue & Profit Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <ChartContainer 
                        config={{
                            revenue: {label: 'Revenue', color: '#3b82f6'},
                            profit: {label: 'Profit', color: '#10b981'}
                        }} 
                        className="w-full h-[400px]"
                    >
                        <ResponsiveContainer>
                            <ComposedChart data={revenueChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="price" tickFormatter={(value) => `$${value}`} />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <ReferenceLine x={analysisResult.revenue_data.optimal_revenue_price} stroke="#3b82f6" strokeDasharray="3 3" label={`Max Revenue $${analysisResult.revenue_data.optimal_revenue_price.toFixed(2)}`} />
                                <ReferenceLine x={analysisResult.revenue_data.optimal_profit_price} stroke="#10b981" strokeDasharray="3 3" label={`Max Profit $${analysisResult.revenue_data.optimal_profit_price.toFixed(2)}`} />
                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.2} name="Revenue" />
                                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.2} name="Profit" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}


