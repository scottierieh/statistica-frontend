
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Eye, Heart, Award, ShoppingCart, Target, Users, Zap, Lightbulb, Info, AlertTriangle, Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BrandStages {
    awareness: number;
    consideration: number;
    preference: number;
    usage: number;
}

interface ConversionRates {
    awareness_to_consideration: number;
    consideration_to_preference: number;
    preference_to_usage: number;
    awareness_to_usage: number;
}

interface Results {
    funnel_data: { [brand: string]: BrandStages };
    conversion_rates: { [brand: string]: ConversionRates };
    market_share: { brand: string, [stage_share: string]: number | string }[];
    efficiency: { [brand: string]: { funnel_efficiency: number; drop_off_rate: number } };
    bottlenecks: Array<{ brand: string; bottleneck_stage: string; conversion_rate: number }>;
    drop_off: { [brand: string]: { [stage: string]: { count: number; rate: number } } };
    health_scores: { [brand: string]: { total_score: number; conversion_component: number; consistency_component: number; volume_component: number } };
    insights: {
        top_performer: { brand: string; efficiency: number; description: string };
        market_leader: { awareness: string; usage: string; description: string };
        biggest_opportunity: { brand: string; bottleneck: string; rate: number; description: string };
        conversion_champion: { brand: string; rate: number; description: string };
    };
    interpretation: string;
}

interface Props {
    survey: Survey;
    responses: SurveyResponse[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const STAGE_ICONS = {
    awareness: Eye,
    consideration: Heart,
    preference: Award,
    usage: Target,
};

const STAGE_COLORS = {
    awareness: '#3b82f6',
    consideration: '#8b5cf6',
    preference: '#ec4899',
    usage: '#10b981',
};

export default function BrandFunnelPage({ survey, responses }: Props) {
    const { toast } = useToast();
    const [results, setResults] = useState<Results | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<string>('all');

    const brands = useMemo(() => (results?.funnel_data ? Object.keys(results.funnel_data) : []), [results]);
    
    const funnelDataForChart = useMemo(() => {
        if (!results?.funnel_data) return [];
        const stages = ['awareness', 'consideration', 'preference', 'usage'];
        return stages.map(stage => {
            const row: any = { stage: stage.charAt(0).toUpperCase() + stage.slice(1) };
            brands.forEach(brand => {
                const safeBrandKey = brand.replace(/\s/g, '_');
                row[safeBrandKey] = results.funnel_data[brand]?.[stage as keyof BrandStages] ?? 0;
            });
            return row;
        });
    }, [results, brands]);
    
    const marketShareData = useMemo(() => {
        if (!results?.market_share) return [];
        return results.market_share;
    }, [results]);

    const currentBrandData = useMemo(() => {
        if (!results || selectedBrand === 'all') return null;
        return {
            funnel: results.funnel_data[selectedBrand],
            conversion: results.conversion_rates[selectedBrand],
            dropOff: results.drop_off[selectedBrand],
            health: results.health_scores[selectedBrand],
        };
    }, [results, selectedBrand]);

    const averageData = useMemo(() => {
        if (!results || brands.length === 0) return null;
        const stages: (keyof BrandStages)[] = ['awareness', 'consideration', 'preference', 'usage'];
        const avgFunnel: BrandStages = { awareness: 0, consideration: 0, preference: 0, usage: 0 };
        
        stages.forEach(stage => {
            avgFunnel[stage] = brands.reduce((sum, brand) => sum + (results.funnel_data[brand]?.[stage] ?? 0), 0) / brands.length;
        });

        return avgFunnel;
    }, [results, brands]);

    const handleAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!survey || !responses || responses.length === 0) {
                throw new Error("No survey data or responses");
            }

            const q_aware = survey.questions.find(q => q.title.toLowerCase().includes('heard of'));
            const q_consider = survey.questions.find(q => q.title.toLowerCase().includes('consider'));
            const q_prefer = survey.questions.find(q => q.title.toLowerCase().includes('prefer'));
            const q_usage = survey.questions.find(q => q.title.toLowerCase().includes('used'));

            if (!q_aware || !q_consider || !q_prefer || !q_usage) {
                throw new Error("Missing required funnel questions (awareness, consideration, preference, usage).");
            }

            const brandList = q_aware.options || [];
            if (brandList.length === 0) throw new Error("No brands found in the awareness question.");

            const counts: { [brand: string]: BrandStages } = {};
            brandList.forEach(brand => {
                counts[brand] = { awareness: 0, consideration: 0, preference: 0, usage: 0 };
            });

            responses.forEach(resp => {
                const ans = resp.answers as any;
                const aware = (ans[q_aware.id] as string[]) || [];
                const consider = (ans[q_consider.id] as string[]) || [];
                const prefer = ans[q_prefer.id] as string;
                const usage = (ans[q_usage.id] as string[]) || [];

                brandList.forEach(brand => {
                    if (aware.includes(brand)) counts[brand].awareness++;
                    if (consider.includes(brand)) counts[brand].consideration++;
                    if (prefer === brand) counts[brand].preference++;
                    if (usage.includes(brand)) counts[brand].usage++;
                });
            });
            
            const response = await fetch('/api/analysis/brand-funnel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brands: brandList, funnel_data: counts, total_respondents: responses.length })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'API error');
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setResults(data.results);
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

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Brand Funnel Analysis...</p>
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

    const displayData = selectedBrand === 'all' ? averageData : currentBrandData?.funnel;
    const isAllBrands = selectedBrand === 'all';

    return (
        <div className="space-y-6">
            {/* Header with Brand Selector */}
            <Card className="shadow-lg border-2 border-indigo-200">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-3xl font-bold flex items-center gap-3">
                                <Target className="h-8 w-8 text-indigo-600" />
                                Brand Funnel Analysis
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                Consumer Journey from Awareness to Usage • {responses.length} Respondents
                            </CardDescription>
                        </div>
                        <div className="w-64">
                            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">All Brands</span>
                                            <span className="text-xs text-gray-500">Industry Average</span>
                                        </div>
                                    </SelectItem>
                                    {brands.map((brand) => (
                                        <SelectItem key={brand} value={brand}>
                                            <span className="font-semibold">{brand}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Key Metrics */}
            {displayData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Object.entries(displayData).map(([stage, value], idx) => {
                        const Icon = STAGE_ICONS[stage as keyof typeof STAGE_ICONS];
                        const color = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
                        const prevValue = idx > 0 ? Object.values(displayData)[idx - 1] : null;
                        
                        return (
                            <Card key={stage} className="border-2 shadow-lg" style={{ borderColor: color + '40' }}>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon className="h-5 w-5" style={{ color }} />
                                        <span className="text-sm font-semibold text-gray-600 capitalize">{stage}</span>
                                    </div>
                                    <p className="text-4xl font-bold" style={{ color }}>{Math.round(value)}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {isAllBrands ? 'Average' : 'Respondents'}
                                    </p>
                                    {prevValue && (
                                        <div className="flex items-center gap-1 mt-2">
                                            <TrendingDown className="h-3 w-3 text-red-600" />
                                            <span className="text-xs text-red-600 font-semibold">
                                                -{Math.round(prevValue - value)} ({((prevValue - value) / (prevValue || 1) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Key Insights Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="border-2 border-blue-200 shadow-lg">
                    <CardHeader className="pb-2 bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Award className="h-4 w-4 text-blue-600" />
                            Top Performer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <p className="text-2xl font-bold text-blue-600">{results.insights?.top_performer?.brand || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Efficiency: {(results.insights?.top_performer?.efficiency ?? 0).toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-green-200 shadow-lg">
                    <CardHeader className="pb-2 bg-gradient-to-br from-green-50 to-green-100">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-600" />
                            Market Leader
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <p className="text-2xl font-bold text-green-600">{results.insights?.market_leader?.usage || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground mt-1">Usage Leader</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 shadow-lg">
                    <CardHeader className="pb-2 bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                            Best Conversion
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <p className="text-2xl font-bold text-purple-600">{results.insights?.conversion_champion?.brand || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Rate: {(results.insights?.conversion_champion?.rate ?? 0).toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-amber-200 shadow-lg">
                    <CardHeader className="pb-2 bg-gradient-to-br from-amber-50 to-amber-100">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                            Biggest Opportunity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <p className="text-2xl font-bold text-amber-600">{results.insights?.biggest_opportunity?.brand || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {results.insights?.biggest_opportunity?.bottleneck || 'N/A'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Overview Section */}
            {displayData && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-indigo-600" />
                            {isAllBrands ? 'Industry Average Funnel' : `${selectedBrand} Funnel`}
                        </CardTitle>
                        <CardDescription>
                            {isAllBrands
                                ? 'Average consumer journey across all brands'
                                : 'Consumer journey through each stage'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Visual Funnel */}
                        <div className="space-y-3 mb-6">
                            {Object.entries(displayData).map(([stage, value], idx) => {
                                const widthPercentage = (value / (displayData.awareness || 1)) * 100;
                                const Icon = STAGE_ICONS[stage as keyof typeof STAGE_ICONS];
                                const color = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
                                const prevValue = idx > 0 ? Object.values(displayData)[idx - 1] : null;

                                return (
                                    <div key={stage}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" style={{ color }} />
                                                <span className="font-semibold text-sm capitalize">{stage}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-mono text-gray-600">{Math.round(value)} people</span>
                                                <span className="text-lg font-bold" style={{ color }}>
                                                    {((value / responses.length) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full rounded-lg flex items-center justify-center text-white font-bold transition-all duration-500"
                                                style={{
                                                    width: `${widthPercentage}%`,
                                                    backgroundColor: color,
                                                }}
                                            >
                                                {widthPercentage.toFixed(1)}%
                                            </div>
                                        </div>
                                        {prevValue && (
                                            <div className="flex items-center gap-2 mt-2 ml-4">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                <span className="text-sm text-red-600">
                                                    Drop-off: {((prevValue - value) / (prevValue || 1) * 100).toFixed(1)}%
                                                    ({Math.round(prevValue - value)} people)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {!isAllBrands && currentBrandData?.conversion && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                    <p className="text-xs text-gray-600 mb-1">Awareness → Consideration</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {(currentBrandData.conversion.awareness_to_consideration ?? 0).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                                    <p className="text-xs text-gray-600 mb-1">Consideration → Preference</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {(currentBrandData.conversion.consideration_to_preference ?? 0).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="p-4 bg-pink-50 rounded-lg border-2 border-pink-200">
                                    <p className="text-xs text-gray-600 mb-1">Preference → Usage</p>
                                    <p className="text-2xl font-bold text-pink-600">
                                        {(currentBrandData.conversion.preference_to_usage ?? 0).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                    <p className="text-xs text-gray-600 mb-1">Overall Conversion</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {(currentBrandData.conversion.awareness_to_usage ?? 0).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Brand Comparison Chart */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Brand Comparison
                    </CardTitle>
                    <CardDescription>Compare all brands across funnel stages</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={funnelDataForChart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="stage" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {brands.map((brand, i) => (
                                <Bar
                                    key={brand}
                                    dataKey={brand.replace(/\s/g, '_')}
                                    name={brand}
                                    fill={COLORS[i % COLORS.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Conversion Rates Table */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-600" />
                        Conversion Rates
                    </CardTitle>
                    <CardDescription>Stage-to-stage conversion performance</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-muted/50 border-b">
                                    <th className="text-left p-3 font-bold">Brand</th>
                                    <th className="text-right p-3 font-bold">Aware→Consider</th>
                                    <th className="text-right p-3 font-bold">Consider→Prefer</th>
                                    <th className="text-right p-3 font-bold">Prefer→Usage</th>
                                    <th className="text-right p-3 font-bold">Overall</th>
                                </tr>
                            </thead>
                            <tbody>
                                {brands.map((brand, idx) => {
                                    const conversionData = results.conversion_rates[brand];
                                    return (
                                        <tr key={brand} className="border-b hover:bg-muted/30">
                                            <td className="p-3 font-semibold flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                />
                                                {brand}
                                            </td>
                                            <td className="text-right p-3">
                                                {(conversionData?.awareness_to_consideration ?? 0).toFixed(1)}%
                                            </td>
                                            <td className="text-right p-3">
                                                {(conversionData?.consideration_to_preference ?? 0).toFixed(1)}%
                                            </td>
                                            <td className="text-right p-3">
                                                {(conversionData?.preference_to_usage ?? 0).toFixed(1)}%
                                            </td>
                                            <td className="text-right p-3">
                                                <Badge variant="default">
                                                    {(conversionData?.awareness_to_usage ?? 0).toFixed(1)}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Data Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Counts Table */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Response Counts</CardTitle>
                        <CardDescription>Number of respondents at each stage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50 border-b">
                                        <th className="text-left p-2 font-bold">Brand</th>
                                        <th className="text-right p-2 font-bold">Aware</th>
                                        <th className="text-right p-2 font-bold">Consider</th>
                                        <th className="text-right p-2 font-bold">Prefer</th>
                                        <th className="text-right p-2 font-bold">Usage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brands.map(brand => (
                                        <tr key={brand} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-semibold">{brand}</td>
                                            <td className="text-right p-2">{results.funnel_data[brand]?.awareness ?? 0}</td>
                                            <td className="text-right p-2">{results.funnel_data[brand]?.consideration ?? 0}</td>
                                            <td className="text-right p-2">{results.funnel_data[brand]?.preference ?? 0}</td>
                                            <td className="text-right p-2">{results.funnel_data[brand]?.usage ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Market Share Table */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Market Share (%)</CardTitle>
                        <CardDescription>Percentage share at each funnel stage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50 border-b">
                                        <th className="text-left p-2 font-bold">Brand</th>
                                        <th className="text-right p-2 font-bold">Aware</th>
                                        <th className="text-right p-2 font-bold">Consider</th>
                                        <th className="text-right p-2 font-bold">Prefer</th>
                                        <th className="text-right p-2 font-bold">Usage</th>
                                    </tr>
                                </thead>
                                <TableBody>
                                    {marketShareData.map(row => (
                                        <tr key={row.brand as string} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-semibold">{row.brand as string}</td>
                                            <td className="text-right p-2">{(row.awareness_share ?? 0).toFixed(1)}%</td>
                                            <td className="text-right p-2">{(row.consideration_share ?? 0).toFixed(1)}%</td>
                                            <td className="text-right p-2">{(row.preference_share ?? 0).toFixed(1)}%</td>
                                            <td className="text-right p-2">{(row.usage_share ?? 0).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </TableBody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Drop-off Table */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Drop-off Analysis</CardTitle>
                        <CardDescription>Lost respondents between stages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50 border-b">
                                        <th className="text-left p-2 font-bold">Brand</th>
                                        <th className="text-right p-2 font-bold">A→C</th>
                                        <th className="text-right p-2 font-bold">C→P</th>
                                        <th className="text-right p-2 font-bold">P→U</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brands.map(brand => {
                                        const dropOffData = results.drop_off[brand] || {};
                                        const dropOffValues = Object.values(dropOffData);
                                        return (
                                            <tr key={brand} className="border-b hover:bg-muted/30">
                                                <td className="p-2 font-semibold">{brand}</td>
                                                {dropOffValues.length > 0 ? (
                                                    dropOffValues.map((val: any, idx) => (
                                                        <td key={idx} className="text-right p-2">
                                                            <div className="font-bold text-red-600 text-xs">{(val?.rate ?? 0).toFixed(1)}%</div>
                                                            <div className="text-xs text-muted-foreground">({val?.count ?? 0})</div>
                                                        </td>
                                                    ))
                                                ) : (
                                                    <>
                                                        <td className="text-right p-2">
                                                            <div className="font-bold text-red-600 text-xs">0.0%</div>
                                                            <div className="text-xs text-muted-foreground">(0)</div>
                                                        </td>
                                                        <td className="text-right p-2">
                                                            <div className="font-bold text-red-600 text-xs">0.0%</div>
                                                            <div className="text-xs text-muted-foreground">(0)</div>
                                                        </td>
                                                        <td className="text-right p-2">
                                                            <div className="font-bold text-red-600 text-xs">0.0%</div>
                                                            <div className="text-xs text-muted-foreground">(0)</div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Health Score Table */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Brand Health Score</CardTitle>
                        <CardDescription>Overall brand performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50 border-b">
                                        <th className="text-left p-2 font-bold">Brand</th>
                                        <th className="text-right p-2 font-bold">Total</th>
                                        <th className="text-right p-2 font-bold">Conv.</th>
                                        <th className="text-right p-2 font-bold">Consist.</th>
                                        <th className="text-right p-2 font-bold">Vol.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brands.map((brand, idx) => {
                                        const health = results.health_scores[brand];
                                        if (!health) return null;
                                        return (
                                            <tr key={brand} className="border-b hover:bg-muted/30">
                                                <td className="p-2 font-semibold">{brand}</td>
                                                <td className="text-right p-2">
                                                    <Badge
                                                        variant={health.total_score > 75 ? 'default' : health.total_score > 50 ? 'secondary' : 'outline'}
                                                        className="text-xs"
                                                    >
                                                        {(health.total_score ?? 0).toFixed(1)}
                                                    </Badge>
                                                </td>
                                                <td className="text-right p-2">{(health.conversion_component ?? 0).toFixed(1)}</td>
                                                <td className="text-right p-2">{(health.consistency_component ?? 0).toFixed(1)}</td>
                                                <td className="text-right p-2">{(health.volume_component ?? 0).toFixed(1)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* AI Insights */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-indigo-600" />
                        AI-Generated Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <Brain className="h-4 w-4 text-indigo-600" />
                        <AlertTitle className="text-indigo-900 text-lg">Strategic Analysis</AlertTitle>
                        <AlertDescription className="text-indigo-700 mt-2">
                            <div
                                className="whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br/>') }}
                            />
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Bottlenecks */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Conversion Bottlenecks
                    </CardTitle>
                    <CardDescription>Weakest stages requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {results.bottlenecks.map((bottleneck, idx) => (
                            <Card
                                key={idx}
                                className={`border-2 ${
                                    (bottleneck.conversion_rate ?? 0) < 50
                                        ? 'border-red-200 bg-red-50'
                                        : (bottleneck.conversion_rate ?? 0) < 70
                                        ? 'border-amber-200 bg-amber-50'
                                        : 'border-blue-200 bg-blue-50'
                                }`}
                            >
                                <CardContent className="pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge
                                                    variant={
                                                        (bottleneck.conversion_rate ?? 0) < 50
                                                            ? 'destructive'
                                                            : (bottleneck.conversion_rate ?? 0) < 70
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    #{idx + 1}
                                                </Badge>
                                                <span className="font-bold text-lg">{bottleneck.brand}</span>
                                            </div>
                                            <p className="text-sm text-gray-700">{bottleneck.bottleneck_stage}</p>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className="text-3xl font-bold"
                                                style={{
                                                    color:
                                                        (bottleneck.conversion_rate ?? 0) < 50
                                                            ? '#ef4444'
                                                            : (bottleneck.conversion_rate ?? 0) < 70
                                                            ? '#f59e0b'
                                                            : '#3b82f6',
                                                }}
                                            >
                                                {(bottleneck.conversion_rate ?? 0).toFixed(1)}%
                                            </p>
                                            <p className="text-xs text-gray-500">Conversion Rate</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Action Items */}
            <Alert className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 text-lg">Recommended Actions</AlertTitle>
                <AlertDescription className="text-green-700 mt-2 space-y-2">
                    <p>
                        <strong>Priority 1:</strong> Focus on {results.insights.biggest_opportunity.brand}'s{' '}
                        {results.insights.biggest_opportunity.bottleneck} stage
                    </p>
                    <p>
                        <strong>Priority 2:</strong> Replicate {results.insights.conversion_champion.brand}'s conversion
                        strategies
                    </p>
                    <p>
                        <strong>Priority 3:</strong> Improve awareness for brands with low top-of-funnel performance
                    </p>
                </AlertDescription>
            </Alert>
        </div>
    );
}
