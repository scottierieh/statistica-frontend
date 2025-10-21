'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
    Loader2, AlertTriangle, Download, Copy, Check, Target, Users, 
    TrendingUp, Package, Star, BarChart as BarIcon, PieChart as PieIcon
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, 
    CartesianGrid, Cell, LineChart, Line, PieChart, Pie
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface TurfResults {
    individual_reach: { Product: string; 'Reach (%)': number; Count: number }[];
    optimal_portfolios: { [key: string]: { products: string[]; combination: string; reach: number; frequency: number; n_products: number } };
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
    error?: string;
}

interface TurfPageProps {
    survey: Survey;
    responses: SurveyResponse[];
    turfQuestion: Question;
}

const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

export default function TurfPage({ survey, responses, turfQuestion }: TurfPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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

    // Export to CSV
    const exportToCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let csvContent = "data:text/csv;charset=utf-8,";
        
        csvContent += "Individual Product Reach\n";
        csvContent += "Product,Reach (%),Count\n";
        results.individual_reach.forEach(item => {
            csvContent += `${item.Product},${item['Reach (%)']},${item.Count}\n`;
        });
        
        csvContent += "\n";
        
        csvContent += "Optimal Portfolios\n";
        csvContent += "Size,Products,Reach (%),Frequency\n";
        Object.entries(results.optimal_portfolios).forEach(([size, portfolio]) => {
            csvContent += `${size},"${portfolio.products.join(', ')}",${portfolio.reach},${portfolio.frequency}\n`;
        });
        
        csvContent += "\n";
        
        csvContent += "Incremental Reach\n";
        csvContent += "Order,Product,Incremental Reach (%),Cumulative Reach (%)\n";
        results.incremental_reach.forEach(item => {
            csvContent += `${item.Order},${item.Product},${item['Incremental Reach (%)']},${item['Cumulative Reach (%)']}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `turf_analysis_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: 'Export Complete', description: 'Data exported to CSV successfully.' });
    }, [analysisResult, toast]);

    // Copy to clipboard
    const copyToClipboard = useCallback(() => {
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let text = "TURF ANALYSIS RESULTS\n\n";
        
        text += "Recommendation:\n";
        text += `  Optimal Portfolio: ${results.recommendation.products.join(', ')}\n`;
        text += `  Size: ${results.recommendation.size} products\n`;
        text += `  Reach: ${results.recommendation.reach.toFixed(1)}%\n\n`;
        
        text += "Top Individual Products:\n";
        results.individual_reach.slice(0, 5).forEach((item, idx) => {
            text += `  ${idx + 1}. ${item.Product}: ${item['Reach (%)'].toFixed(1)}% (${item.Count} respondents)\n`;
        });
        
        text += `\nTotal Respondents: ${results.total_respondents}\n`;
        
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast({ title: 'Copied!', description: 'Results copied to clipboard.' });
            setTimeout(() => setCopied(false), 2000);
        });
    }, [analysisResult, toast]);

    const individualReachData = useMemo(() => {
        if (!analysisResult?.results.individual_reach) return [];
        return analysisResult.results.individual_reach.map(item => ({
            name: cleanCombination(item.Product),
            reach: item['Reach (%)'],
            count: item.Count
        }));
    }, [analysisResult]);

    const incrementalReachData = useMemo(() => {
        if (!analysisResult?.results.incremental_reach) return [];
        return analysisResult.results.incremental_reach.map(item => ({
            product: cleanCombination(item.Product),
            cumulative: item['Cumulative Reach (%)'],
            incremental: item['Incremental Reach (%)']
        }));
    }, [analysisResult]);

    const contributionData = useMemo(() => {
        if (!analysisResult?.results.product_contribution) return [];
        return Object.entries(analysisResult.results.product_contribution)
            .map(([product, data]) => ({
                product: cleanCombination(product),
                importance: data.importance_score,
                appearances: data.appears_in_combinations,
                avgContribution: data.avg_reach_contribution
            }))
            .sort((a, b) => b.importance - a.importance);
    }, [analysisResult]);

    const efficiencyData = useMemo(() => {
        if (!analysisResult?.results.efficiency_metrics) return [];
        return analysisResult.results.efficiency_metrics.map(item => ({
            size: item.portfolio_size,
            reach: item.reach,
            efficiency: item.efficiency
        }));
    }, [analysisResult]);

    const hasSegmentData = useMemo(() => {
        return analysisResult?.results.segment_analysis && 
               Object.keys(analysisResult.results.segment_analysis).length > 0;
    }, [analysisResult]);

    if (isLoading && !analysisResult) {
        return (
            <Card className="shadow-lg">
                <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-lg font-medium">Running TURF Analysis</p>
                    <p className="mt-2 text-sm text-muted-foreground">Calculating optimal product combinations...</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !analysisResult?.results) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {error || 'No analysis results available. Please check your data and try again.'}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;
    const maxReach = results.recommendation.reach;
    const totalProducts = results.individual_reach.length;

    return (
        <div className="space-y-6">
            {/* Header with Export Controls */}
            <Card className="shadow-lg border-2 border-primary/20">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <CardTitle className="font-headline text-2xl mb-2">TURF Analysis</CardTitle>
                            <CardDescription className="text-base">
                                Total Unduplicated Reach and Frequency - Analyzing {results.total_respondents} responses across {totalProducts} products
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

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-blue-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Total Respondents</p>
                                    <div className="text-3xl font-bold text-gray-900">{results.total_respondents}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Package className="h-6 w-6 text-green-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Total Products</p>
                                    <div className="text-3xl font-bold text-gray-900">{totalProducts}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Target className="h-6 w-6 text-purple-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Max Reach</p>
                                    <div className="text-3xl font-bold text-gray-900">{maxReach.toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Star className="h-6 w-6 text-amber-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Optimal Size</p>
                                    <div className="text-3xl font-bold text-gray-900">{results.recommendation.size}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Key Insights Alert */}
            <Alert className="shadow-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                <Star className="h-5 w-5 text-indigo-600" />
                <AlertTitle className="text-indigo-900 text-lg font-semibold">Key Insights</AlertTitle>
                <AlertDescription className="text-indigo-700 space-y-2 mt-2">
                    <p>
                        • <strong>Optimal Portfolio:</strong> {results.recommendation.products.join(', ')} ({results.recommendation.size} products)
                    </p>
                    <p>
                        • <strong>Maximum Reach:</strong> {maxReach.toFixed(1)}% of respondents
                    </p>
                    <p>
                        • <strong>Top Product:</strong> {individualReachData[0]?.name} reaches {individualReachData[0]?.reach.toFixed(1)}% individually
                    </p>
                    <p>
                        • <strong>Efficiency:</strong> {(maxReach / results.recommendation.size).toFixed(1)}% reach per product
                    </p>
                </AlertDescription>
            </Alert>

            {/* 1. Individual Reach Section */}
            <Card className="shadow-lg border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardTitle className='flex items-center gap-2 text-purple-900'>
                        <BarIcon className="h-5 w-5"/>Individual Product Reach
                    </CardTitle>
                    <CardDescription className="text-purple-700">
                        Percentage of respondents who selected each product
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Chart View</h3>
                            <ChartContainer config={{reach: {label: 'Reach', color: 'hsl(var(--primary))'}}} className="w-full h-[400px]">
                                <ResponsiveContainer>
                                    <BarChart data={individualReachData.slice(0, 10)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }}/>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`}/>} />
                                        <Bar dataKey="reach" fill="hsl(var(--primary))" name="Reach %">
                                            {individualReachData.slice(0, 10).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Table View</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Reach (%)</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {individualReachData.slice(0, 10).map((item, index) => (
                                        <TableRow key={item.name}>
                                            <TableCell className="font-medium">#{index + 1}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-right font-semibold">{item.reach.toFixed(1)}%</TableCell>
                                            <TableCell className="text-right">{item.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Optimal Portfolios Section */}
            <Card className="shadow-lg border-2 border-green-200">
                <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
                    <CardTitle className='flex items-center gap-2 text-green-900'>
                        <Star className="h-5 w-5"/>Optimal Portfolios by Size
                    </CardTitle>
                    <CardDescription className="text-green-700">
                        Best product combinations for each portfolio size
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Chart View</h3>
                            <ChartContainer config={{reach: {label: 'Reach', color: 'hsl(var(--chart-2))'}}} className="w-full h-[400px]">
                                <ResponsiveContainer>
                                    <LineChart data={efficiencyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="size" label={{ value: 'Portfolio Size', position: 'insideBottom', offset: -5 }} />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`}/>} />
                                        <Line type="monotone" dataKey="reach" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ fill: 'hsl(var(--chart-2))', r: 6 }} name="Reach %" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Table View</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Products</TableHead>
                                        <TableHead className="text-right">Reach (%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.optimal_portfolios).slice(0, 7).map(([size, portfolio]) => (
                                        <TableRow key={size}>
                                            <TableCell className="font-medium">{size}</TableCell>
                                            <TableCell>{portfolio.products.join(', ')}</TableCell>
                                            <TableCell className="text-right font-semibold">{portfolio.reach.toFixed(1)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Incremental Reach Section */}
            <Card className="shadow-lg border-2 border-orange-200">
                <CardHeader className="bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardTitle className='flex items-center gap-2 text-orange-900'>
                        <TrendingUp className="h-5 w-5"/>Incremental Reach Analysis
                    </CardTitle>
                    <CardDescription className="text-orange-700">
                        Cumulative reach as products are added in order of individual performance
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Chart View</h3>
                            <ChartContainer config={{cumulative: {label: 'Cumulative', color: 'hsl(var(--chart-1))'}, incremental: {label: 'Incremental', color: 'hsl(var(--chart-3))'}}} className="w-full h-[400px]">
                                <ResponsiveContainer>
                                    <BarChart data={incrementalReachData.slice(0, 10)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="product" tick={{ fontSize: 10, angle: -45 }} height={100} />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`}/>} />
                                        <Legend />
                                        <Bar dataKey="incremental" fill="hsl(var(--chart-3))" name="Incremental Reach %" />
                                        <Bar dataKey="cumulative" fill="hsl(var(--chart-1))" name="Cumulative Reach %" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Table View</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Incremental</TableHead>
                                        <TableHead className="text-right">Cumulative</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.incremental_reach.slice(0, 10).map((item) => (
                                        <TableRow key={item.Order}>
                                            <TableCell className="font-medium">#{item.Order}</TableCell>
                                            <TableCell>{cleanCombination(item.Product)}</TableCell>
                                            <TableCell className="text-right">{item['Incremental Reach (%)'].toFixed(1)}%</TableCell>
                                            <TableCell className="text-right font-semibold">{item['Cumulative Reach (%)'].toFixed(1)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Product Contribution Section */}
            {contributionData.length > 0 && (
                <Card className="shadow-lg border-2 border-teal-200">
                    <CardHeader className="bg-gradient-to-br from-teal-50 to-teal-100">
                        <CardTitle className='flex items-center gap-2 text-teal-900'>
                            <PieIcon className="h-5 w-5"/>Product Contribution Analysis
                        </CardTitle>
                        <CardDescription className="text-teal-700">
                            Importance score based on reach and appearance in optimal combinations
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Chart View</h3>
                                <ChartContainer config={{importance: {label: 'Importance', color: 'hsl(var(--chart-4))'}}} className="w-full h-[400px]">
                                    <ResponsiveContainer>
                                        <BarChart data={contributionData.slice(0, 10)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="product" type="category" width={120} tick={{ fontSize: 12 }}/>
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="importance" fill="hsl(var(--chart-4))" name="Importance Score">
                                                {contributionData.slice(0, 10).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Table View</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Importance</TableHead>
                                            <TableHead className="text-right">Appearances</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {contributionData.slice(0, 10).map((item) => (
                                            <TableRow key={item.product}>
                                                <TableCell className="font-medium">{item.product}</TableCell>
                                                <TableCell className="text-right font-semibold">{item.importance.toFixed(1)}</TableCell>
                                                <TableCell className="text-right">{item.appearances}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 5. Efficiency Metrics Section */}
            {efficiencyData.length > 0 && (
                <Card className="shadow-lg border-2 border-indigo-200">
                    <CardHeader className="bg-gradient-to-br from-indigo-50 to-indigo-100">
                        <CardTitle className='flex items-center gap-2 text-indigo-900'>
                            <Target className="h-5 w-5"/>Portfolio Efficiency
                        </CardTitle>
                        <CardDescription className="text-indigo-700">
                            Reach per product (efficiency) for each portfolio size
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ChartContainer config={{efficiency: {label: 'Efficiency', color: 'hsl(var(--chart-5))'}}} className="w-full h-[400px]">
                            <ResponsiveContainer>
                                <LineChart data={efficiencyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="size" label={{ value: 'Portfolio Size', position: 'insideBottom', offset: -5 }} />
                                    <YAxis />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`}/>} />
                                    <Line type="monotone" dataKey="efficiency" stroke="hsl(var(--chart-5))" strokeWidth={3} dot={{ fill: 'hsl(var(--chart-5))', r: 6 }} name="Efficiency (Reach per Product)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            )}

            {/* 6. Segment Analysis Section */}
            {hasSegmentData && (
                <Card className="shadow-lg border-2 border-pink-200">
                    <CardHeader className="bg-gradient-to-br from-pink-50 to-pink-100">
                        <CardTitle className='flex items-center gap-2 text-pink-900'>
                            <Users className="h-5 w-5"/>Demographic Segment Analysis
                        </CardTitle>
                        <CardDescription className="text-pink-700">
                            Optimal product combinations for different customer segments
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {Object.entries(results.segment_analysis).map(([question, segments]) => (
                            <div key={question} className="mb-8">
                                <h3 className="text-lg font-semibold mb-4">{question}</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Segment</TableHead>
                                            <TableHead>Sample Size</TableHead>
                                            <TableHead>Optimal Combination</TableHead>
                                            <TableHead className="text-right">Reach (%)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(segments).map(([segValue, segData]) => (
                                            <TableRow key={segValue}>
                                                <TableCell className="font-medium">{segValue}</TableCell>
                                                <TableCell>n={segData.size}</TableCell>
                                                <TableCell>{segData.optimal_combination.join(', ')}</TableCell>
                                                <TableCell className="text-right font-semibold">{segData.optimal_reach.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

