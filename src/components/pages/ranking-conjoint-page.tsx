'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, AlertTriangle, PieChart as PieIcon, BarChart as BarIcon, 
    Network, TrendingUp, Sparkles, CheckCircle, Info, Target, 
    TrendingDown, Award, LineChart as LineIcon, BarChart3, Users
} from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { 
    BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, LineChart, Line, RadarChart,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import type { Survey, SurveyResponse } from '@/entities/Survey';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RankingConjointResults {
    part_worths: { [attribute: string]: { [level: string]: number } };
    attribute_importance: { [attribute: string]: number };
    utility_ranges: { [attribute: string]: number };
    coefficients: { [feature: string]: number };
    log_likelihood: number;
    model_fit: {
        pseudo_r2: number;
        aic: number;
        bic: number;
        log_likelihood: number;
        lr_statistic: number;
        n_parameters: number;
        n_observations: number;
    };
    optimal_product: {
        configuration: { [attribute: string]: string };
        total_utility: number;
    };
    top_profiles: Array<{
        profile_id: string;
        configuration: { [attribute: string]: string };
        total_utility: number;
    }>;
    rank_distributions: { [profile_id: string]: { [rank: number]: number } };
    average_ranks: { [profile_id: string]: number };
    sample_info: {
        n_respondents: number;
        n_profiles: number;
        n_attributes: number;
    };
    market_simulation?: {
        products: Array<{ [attribute: string]: string }>;
        market_shares: { [product: string]: number };
    };
    segmentation?: {
        segments: {
            [segmentName: string]: {
                id: number;
                size: number;
                percentage: number;
                respondent_ids: string[];
                part_worths: { [attribute: string]: { [level: string]: number } };
                attribute_importance: { [attribute: string]: number };
                utility_ranges: { [attribute: string]: number };
                optimal_product: {
                    configuration: { [attribute: string]: string };
                    total_utility: number;
                };
                centroid: number[];
            };
        };
        n_segments: number;
        total_respondents: number;
        respondent_segments: { [respondentId: string]: string };
        quality_metrics: {
            silhouette_score: number;
            davies_bouldin_index: number;
            interpretation: {
                silhouette: string;
                davies_bouldin: string;
            };
        };
        comparison: {
            importance_comparison: { [attribute: string]: { [segment: string]: number } };
            distinctive_attributes: Array<{ attribute: string; variance: number }>;
            segment_profiles: {
                [segment: string]: {
                    primary_driver: string;
                    primary_importance: number;
                    size_percentage: number;
                };
            };
        };
    } | null;
}

interface FullAnalysisResponse {
    results: RankingConjointResults;
    error?: string;
}

interface RankingConjointPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
const UTILITY_COLORS = {
    positive: '#28a745',
    neutral: '#ffc107',
    negative: '#dc3545'
};

export default function RankingConjointPage({ survey, responses }: RankingConjointPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const conjointQuestion = useMemo(() => survey.questions.find(q => q.type === 'ranking-conjoint'), [survey]);
    const allAttributes = useMemo(() => {
        if (!conjointQuestion || !conjointQuestion.attributes) return {};
        const attributesObj: any = {};
        conjointQuestion.attributes.forEach(attr => {
            attributesObj[attr.name] = attr.levels;
        });
        return attributesObj;
    }, [conjointQuestion]);

    const handleAnalysis = useCallback(async () => {
        if (!conjointQuestion || !responses || responses.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No ranking conjoint question or responses found for this survey.' });
            setIsLoading(false);
            return;
        }

        const analysisData: any[] = [];
        responses.forEach(resp => {
            const answerBlock = (resp.answers as any)[conjointQuestion.id];
            if (!answerBlock || typeof answerBlock !== 'object') return;
            
            Object.entries(answerBlock).forEach(([taskId, rankedProfileIds]) => {
                if (Array.isArray(rankedProfileIds)) {
                     rankedProfileIds.forEach((profileId, index) => {
                        const profile = conjointQuestion.profiles?.find((p: any) => p.id === profileId);
                        if(profile) {
                            analysisData.push({
                                respondent_id: resp.id,
                                task_id: taskId,
                                profile_id: profile.id,
                                ...profile.attributes,
                                rank: index + 1
                            });
                        }
                    });
                }
            });
        });

        if (analysisData.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No valid rankings found in responses.' });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const attributesForBackend = Object.fromEntries(Object.entries(allAttributes));

        try {
            const response = await fetch('/api/analysis/ranking-conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    attributes: attributesForBackend,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Ranking-based conjoint analysis finished.' });

        } catch (e: any) {
            console.error('Ranking Conjoint error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [conjointQuestion, responses, toast, allAttributes]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const importanceData = useMemo(() => {
        if (!analysisResult?.results.attribute_importance) return [];
        return Object.entries(analysisResult.results.attribute_importance)
            .map(([attribute, importance]) => ({ 
                name: attribute, 
                value: importance,
                fill: COLORS[Object.keys(analysisResult.results.attribute_importance).indexOf(attribute) % COLORS.length]
            }))
            .sort((a,b) => b.value - a.value);
    }, [analysisResult]);

    const partWorthsData = useMemo(() => {
        if (!analysisResult?.results.part_worths) return [];
        return analysisResult.results.part_worths;
    }, [analysisResult]);

    const getUtilityColor = (value: number) => {
        if (value > 0.3) return UTILITY_COLORS.positive;
        if (value < -0.3) return UTILITY_COLORS.negative;
        return UTILITY_COLORS.neutral;
    };

    const formatNumber = (num: number, decimals: number = 2) => {
        return num.toFixed(decimals);
    };
    
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-lg font-medium">Running Exploded Logit Model</p>
                    <p className="mt-2 text-sm text-muted-foreground">Estimating part-worth utilities from ranking data...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!analysisResult?.results) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                    <p className="font-medium">No analysis results to display</p>
                    <p className="text-sm mt-2">This may be due to insufficient data or an error during analysis.</p>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Ranking Conjoint Analysis</CardTitle>
                    <CardDescription>
                        Exploded Logit Model - Estimating part-worth utilities and attribute importance from ranking data
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Info className="h-6 w-6 text-blue-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Respondents</p>
                                    <div className="text-3xl font-bold text-gray-900">{results.sample_info.n_respondents}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Target className="h-6 w-6 text-green-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Profiles</p>
                                    <div className="text-3xl font-bold text-gray-900">{results.sample_info.n_profiles}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <BarIcon className="h-6 w-6 text-purple-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Attributes</p>
                                    <div className="text-3xl font-bold text-gray-900">{results.sample_info.n_attributes}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-amber-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Pseudo R²</p>
                                    <div className="text-3xl font-bold text-gray-900">{formatNumber(results.model_fit.pseudo_r2, 3)}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Key Insights Alert */}
            <Alert className="shadow-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <AlertTitle className="text-indigo-900 text-lg font-semibold">Key Insights</AlertTitle>
                <AlertDescription className="text-indigo-700 space-y-2 mt-2">
                    <p>
                        • <strong>Model Quality:</strong> Pseudo R² = {formatNumber(results.model_fit.pseudo_r2, 3)} - 
                        {results.model_fit.pseudo_r2 > 0.3 ? ' Excellent model fit' : results.model_fit.pseudo_r2 > 0.2 ? ' Good model fit' : ' Moderate model fit'}
                    </p>
                    <p>
                        • <strong>Most Important Attribute:</strong> {importanceData[0]?.name} ({importanceData[0]?.value.toFixed(1)}%)
                    </p>
                    <p>
                        • <strong>Optimal Product Utility:</strong> {formatNumber(results.optimal_product.total_utility)} 
                        {results.market_simulation && ` with ${results.market_simulation.market_shares['Product_1'].toFixed(1)}% predicted market share`}
                    </p>
                </AlertDescription>
            </Alert>

            {/* Overview Section */}
            <div className="space-y-4">
                {/* Attribute Importance */}
                <Card className="shadow-lg border-2 border-purple-200">
                    <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardTitle className="flex items-center gap-2 text-purple-900">
                            <PieIcon className="h-5 w-5" />
                            Attribute Importance Distribution
                        </CardTitle>
                        <CardDescription className="text-purple-700">
                            Relative importance of each attribute in decision-making (based on utility ranges)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Pie Chart */}
                            <div>
                                <ChartContainer config={{}} className="w-full h-[350px]">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie 
                                                data={importanceData} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={120}
                                                label={(entry) => `${entry.name}\n${entry.value.toFixed(1)}%`}
                                            >
                                                {importanceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>

                            {/* Importance Bars */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg mb-4">Importance Ranking</h3>
                                {importanceData.map((item, idx) => (
                                    <div key={idx} className="space-y-2 p-3 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border border-gray-200 hover:border-purple-300 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={idx === 0 ? "default" : "secondary"} className="text-xs">
                                                    #{idx + 1}
                                                </Badge>
                                                <span className="font-semibold text-gray-900">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-purple-600">{item.value.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full transition-all duration-500 rounded-full"
                                                style={{ 
                                                    width: `${item.value}%`,
                                                    backgroundColor: item.fill
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-600">
                                            <span>Utility Range: {formatNumber(results.utility_ranges[item.name])}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Alert className="mt-6 border-2 border-purple-200 bg-purple-50">
                            <Info className="h-4 w-4 text-purple-600" />
                            <AlertTitle className="text-purple-900">Calculation Method</AlertTitle>
                            <AlertDescription className="text-purple-700">
                                Importance = (Attribute Utility Range / Sum of All Ranges) × 100%. 
                                Higher values indicate attributes with greater impact on decision-making.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                {/* Optimal Product Configuration */}
                <Card className="shadow-lg border-2 border-green-200">
                    <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
                        <CardTitle className="flex items-center gap-2 text-green-900">
                            <Target className="h-5 w-5" />
                            Optimal Product Configuration
                        </CardTitle>
                        <CardDescription className="text-green-700">
                            The highest utility combination - this configuration maximizes customer preference
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="rounded-lg border-2 border-green-300 bg-gradient-to-br from-green-50 to-white p-6">
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                {Object.entries(results.optimal_product.configuration).map(([attr, level]) => (
                                    <div key={attr} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-green-200">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="default" className="bg-green-600">{attr}</Badge>
                                                {importanceData.find(i => i.name === attr) && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {importanceData.find(i => i.name === attr)!.value.toFixed(1)}% importance
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="font-bold text-lg text-gray-900">{level}</p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Utility: <span className="font-mono font-semibold text-green-600">
                                                    {formatNumber(results.part_worths[attr][level])}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t-2 border-green-200 bg-green-100 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-green-700 mb-1">Total Utility Score</p>
                                        <p className="text-xs text-green-600">Sum of all attribute utilities</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-4xl font-bold text-green-600">
                                            {formatNumber(results.optimal_product.total_utility)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Alert className="mt-6 border-2 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-900">Recommendation</AlertTitle>
                            <AlertDescription className="text-green-700">
                                This optimal configuration combines the highest utility level for each attribute. 
                                Consider this as your target product specification for maximum market appeal.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                {/* Top Profiles */}
                {results.top_profiles && results.top_profiles.length > 0 && (
                    <Card className="shadow-lg border-2 border-blue-200">
                        <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
                            <CardTitle className="flex items-center gap-2 text-blue-900">
                                <Award className="h-5 w-5" />
                                Top Ranked Profiles
                            </CardTitle>
                            <CardDescription className="text-blue-700">
                                Profiles with highest predicted utilities - most preferred product configurations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-3">
                                    {results.top_profiles.slice(0, 5).map((profile, idx) => {
                                        const medalColors = ['bg-yellow-500', 'bg-gray-400', 'bg-amber-600'];
                                        const medalBg = idx < 3 ? medalColors[idx] : 'bg-blue-500';
                                        
                                        return (
                                            <div key={profile.profile_id} className="flex items-center gap-4 p-4 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white hover:border-blue-400 hover:shadow-md transition-all">
                                                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${medalBg} text-white font-bold shadow-md`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                                                        {Object.entries(profile.configuration).map(([attr, level]) => (
                                                            <div key={attr} className="text-sm">
                                                                <span className="text-gray-500 font-medium">{attr}:</span>
                                                                <br />
                                                                <span className="font-semibold text-gray-900">{level}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                        <Badge variant="outline">Profile ID: {profile.profile_id}</Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right px-4 py-2 bg-blue-100 rounded-lg">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {formatNumber(profile.total_utility)}
                                                    </div>
                                                    <div className="text-xs text-blue-700 font-semibold">Total Utility</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>

                            <Alert className="mt-6 border-2 border-blue-200 bg-blue-50">
                                <Award className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-900">Profile Rankings</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    These profiles represent the actual product configurations tested in your survey. 
                                    Higher utility scores indicate stronger customer preference.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Part-Worth Utilities Section */}
            <Card className="shadow-lg border-2 border-orange-200">
                <CardHeader className="bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardTitle className="flex items-center gap-2 text-orange-900">
                        <BarIcon className="h-5 w-5" />
                        Part-Worth Utilities by Attribute
                    </CardTitle>
                    <CardDescription className="text-orange-700">
                        Estimated utility values for each attribute level (baseline level = 0)
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(partWorthsData).map(([attr, levels]) => (
                            <div key={attr} className="space-y-4 p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border-2 border-orange-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-lg text-gray-900">{attr}</h3>
                                    <Badge variant="default" className="bg-orange-500">
                                        Range: {formatNumber(results.utility_ranges[attr])}
                                    </Badge>
                                </div>
                                
                                <ChartContainer config={{ value: { label: "Part-Worth" } }} className="w-full h-[250px]">
                                    <ResponsiveContainer>
                                        <BarChart 
                                            data={Object.entries(levels).map(([level, value]) => ({
                                                name: level, 
                                                value: value
                                            }))} 
                                            layout="vertical" 
                                            margin={{ left: 100, right: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={90} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar 
                                                dataKey="value" 
                                                name="Part-Worth" 
                                                barSize={30}
                                            >
                                                {Object.values(levels).map((value, index) => (
                                                    <Cell key={index} fill={getUtilityColor(value as number)} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                
                                {/* Utility Table */}
                                <div className="rounded-md border border-orange-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-orange-100">
                                                <TableHead className="font-bold">Level</TableHead>
                                                <TableHead className="text-right font-bold">Utility</TableHead>
                                                <TableHead className="text-right font-bold">Rank</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(levels)
                                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                                .map(([level, value], idx) => (
                                                <TableRow key={level} className={idx === 0 ? 'bg-green-50' : ''}>
                                                    <TableCell className="font-semibold">{level}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span 
                                                            className="font-mono font-bold text-lg"
                                                            style={{ color: getUtilityColor(value as number) }}
                                                        >
                                                            {value > 0 ? '+' : ''}{formatNumber(value as number)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={idx === 0 ? "default" : "outline"}>
                                                            {idx === 0 ? '⭐ Best' : `#${idx + 1}`}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Alert className="mt-6 border-2 border-orange-200 bg-orange-50">
                        <Info className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-900">Understanding Utilities</AlertTitle>
                        <AlertDescription className="text-orange-700">
                            Part-worth utilities represent the preference value for each level. Positive values indicate preference above baseline, 
                            negative values below. The range (max - min) determines attribute importance.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Market Simulation Section */}
            {results.market_simulation && (
                <Card className="shadow-lg border-2 border-teal-200">
                    <CardHeader className="bg-gradient-to-br from-teal-50 to-teal-100">
                        <CardTitle className="flex items-center gap-2 text-teal-900">
                            <TrendingUp className="h-5 w-5" />
                            Predicted Market Shares
                        </CardTitle>
                        <CardDescription className="text-teal-700">
                            Simulated market share based on utility values using Multinomial Logit model
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <ChartContainer config={{}} className="w-full h-[350px]">
                                <ResponsiveContainer>
                                    <BarChart 
                                        data={Object.entries(results.market_simulation.market_shares).map(([product, share]) => ({
                                            name: product,
                                            value: share
                                        }))}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis label={{ value: 'Market Share (%)', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />} />
                                        <Bar dataKey="value" fill="hsl(var(--primary))">
                                            {Object.keys(results.market_simulation.market_shares).map((_, index) => (
                                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>

                            {/* Product Details */}
                            <div className="grid md:grid-cols-3 gap-4">
                                {results.market_simulation.products.map((product, idx) => (
                                    <Card key={idx} className="border-2 border-teal-200 hover:border-teal-400 transition-all hover:shadow-lg">
                                        <CardHeader className="bg-gradient-to-br from-teal-50 to-white">
                                            <CardTitle className="text-base flex items-center justify-between">
                                                <span className="text-gray-900">Product {idx + 1}</span>
                                                <Badge 
                                                    variant="default"
                                                    className="text-lg px-3 py-1"
                                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                >
                                                    {results.market_simulation!.market_shares[`Product_${idx + 1}`].toFixed(1)}%
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="space-y-2">
                                                {Object.entries(product).map(([attr, level]) => (
                                                    <div key={attr} className="flex justify-between items-center text-sm p-2 bg-teal-50 rounded">
                                                        <span className="text-gray-600 font-medium">{attr}:</span>
                                                        <span className="font-semibold text-gray-900">{level}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Alert className="border-2 border-teal-200 bg-teal-50">
                                <Sparkles className="h-4 w-4 text-teal-600" />
                                <AlertTitle className="text-teal-900">Market Share Formula</AlertTitle>
                                <AlertDescription className="text-teal-700">
                                    Share<sub>i</sub> = exp(Utility<sub>i</sub>) / Σ exp(Utility<sub>all</sub>) × 100%. 
                                    This Multinomial Logit model predicts choice probabilities based on relative utilities.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Model Fit Statistics */}
            <Card className="shadow-lg border-2 border-indigo-200">
                <CardHeader className="bg-gradient-to-br from-indigo-50 to-indigo-100">
                    <CardTitle className="flex items-center gap-2 text-indigo-900">
                        <CheckCircle className="h-5 w-5" />
                        Model Fit Statistics
                    </CardTitle>
                    <CardDescription className="text-indigo-700">
                        Statistical measures of model quality and explanatory power
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-lg border-2 border-indigo-200 p-4 bg-gradient-to-br from-indigo-50 to-white">
                            <div className="text-sm text-gray-600 mb-1 font-semibold">Pseudo R²</div>
                            <div className="text-4xl font-bold text-indigo-600">
                                {formatNumber(results.model_fit.pseudo_r2, 4)}
                            </div>
                            <div className="text-xs text-indigo-700 mt-2 font-medium">
                                {results.model_fit.pseudo_r2 > 0.3 ? '✓ Excellent fit' : results.model_fit.pseudo_r2 > 0.2 ? '✓ Good fit' : '⚠ Moderate fit'}
                            </div>
                        </div>

                        <div className="rounded-lg border-2 border-blue-200 p-4 bg-gradient-to-br from-blue-50 to-white">
                            <div className="text-sm text-gray-600 mb-1 font-semibold">Log-Likelihood</div>
                            <div className="text-4xl font-bold text-blue-600">
                                {formatNumber(results.model_fit.log_likelihood)}
                            </div>
                            <div className="text-xs text-blue-700 mt-2 font-medium">
                                Model fit indicator
                            </div>
                        </div>

                        <div className="rounded-lg border-2 border-purple-200 p-4 bg-gradient-to-br from-purple-50 to-white">
                            <div className="text-sm text-gray-600 mb-1 font-semibold">AIC</div>
                            <div className="text-3xl font-bold text-purple-600">
                                {formatNumber(results.model_fit.aic)}
                            </div>
                            <div className="text-xs text-purple-700 mt-2 font-medium">
                                Lower is better
                            </div>
                        </div>

                        <div className="rounded-lg border-2 border-pink-200 p-4 bg-gradient-to-br from-pink-50 to-white">
                            <div className="text-sm text-gray-600 mb-1 font-semibold">BIC</div>
                            <div className="text-3xl font-bold text-pink-600">
                                {formatNumber(results.model_fit.bic)}
                            </div>
                            <div className="text-xs text-pink-700 mt-2 font-medium">
                                Sample size adjusted
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                Model Parameters
                            </h3>
                            <Table>
                                <TableBody>
                                    <TableRow className="border-b-2">
                                        <TableCell className="font-semibold">Parameters</TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            {results.model_fit.n_parameters}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="border-b-2">
                                        <TableCell className="font-semibold">Observations</TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            {results.model_fit.n_observations}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="border-b-2">
                                        <TableCell className="font-semibold">LR Statistic</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-indigo-600">
                                            {formatNumber(results.model_fit.lr_statistic)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <Alert className="border-2 border-indigo-200 bg-indigo-50">
                            <Info className="h-4 w-4 text-indigo-600" />
                            <AlertTitle className="text-indigo-900">Interpretation Guide</AlertTitle>
                            <AlertDescription className="text-indigo-700 space-y-1 text-sm">
                                <p>• <strong>Pseudo R²:</strong> 0.2-0.4 = excellent fit for choice models</p>
                                <p>• <strong>AIC/BIC:</strong> Lower values indicate better model fit</p>
                                <p>• <strong>LR Statistic:</strong> Tests overall model significance</p>
                                <p className="pt-2 border-t border-indigo-300 mt-2">
                                    Current model explains <strong>{(results.model_fit.pseudo_r2 * 100).toFixed(1)}%</strong> of choice variance
                                </p>
                            </AlertDescription>
                        </Alert>
                    </div>
                </CardContent>
            </Card>

            {/* Coefficients Table */}
            <Card className="shadow-lg border-2 border-gray-200">
                <CardHeader className="bg-gradient-to-br from-gray-50 to-gray-100">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                        <Award className="h-5 w-5" />
                        Estimated Coefficients (β)
                    </CardTitle>
                    <CardDescription className="text-gray-700">
                        Raw coefficient estimates from the Exploded Logit regression model
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <ScrollArea className="h-[500px]">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-100 border-b-2">
                                    <TableHead className="font-bold">Rank</TableHead>
                                    <TableHead className="font-bold">Feature</TableHead>
                                    <TableHead className="text-right font-bold">Coefficient (β)</TableHead>
                                    <TableHead className="text-right font-bold">Impact Level</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(results.coefficients)
                                    .sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number))
                                    .map(([feature, coef], idx) => {
                                        const absCoef = Math.abs(coef as number);
                                        const impactLevel = absCoef > 0.5 ? 'Strong' : absCoef > 0.2 ? 'Moderate' : 'Weak';
                                        const impactColor = absCoef > 0.5 ? 'bg-red-600' : absCoef > 0.2 ? 'bg-amber-500' : 'bg-gray-400';
                                        
                                        return (
                                            <TableRow 
                                                key={feature}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <TableCell>
                                                    <Badge variant={idx < 3 ? "default" : "outline"} className={idx < 3 ? 'bg-indigo-600' : ''}>
                                                        #{idx + 1}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold">{feature}</TableCell>
                                                <TableCell className="text-right">
                                                    <span 
                                                        className="font-mono font-bold text-lg"
                                                        style={{ color: getUtilityColor(coef as number) }}
                                                    >
                                                        {coef > 0 ? '+' : ''}{formatNumber(coef as number, 4)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className={impactColor}>
                                                        {impactLevel}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </ScrollArea>

                    <Alert className="mt-6 border-2 border-gray-200 bg-gray-50">
                        <Info className="h-4 w-4 text-gray-600" />
                        <AlertTitle className="text-gray-900">Understanding Coefficients</AlertTitle>
                        <AlertDescription className="text-gray-700">
                            Coefficients represent the log-odds effect of each feature level on choice probability. 
                            Larger absolute values indicate stronger influence on customer decisions.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Detailed Analysis Table */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-indigo-600" />
                        Complete Analysis Summary
                    </CardTitle>
                    <CardDescription>All attributes with utilities, importance, and rankings</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Attribute</TableHead>
                                    <TableHead className="text-right font-bold">Importance %</TableHead>
                                    <TableHead className="text-right font-bold">Utility Range</TableHead>
                                    <TableHead className="font-bold">Best Level</TableHead>
                                    <TableHead className="text-right font-bold">Best Utility</TableHead>
                                    <TableHead className="text-right font-bold">Worst Utility</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importanceData.map((item, idx) => {
                                    const attrLevels = Object.entries(results.part_worths[item.name]);
                                    const bestLevel = attrLevels.reduce((max, curr) => 
                                        curr[1] > max[1] ? curr : max
                                    );
                                    const worstLevel = attrLevels.reduce((min, curr) => 
                                        curr[1] < min[1] ? curr : min
                                    );
                                    
                                    return (
                                        <TableRow 
                                            key={item.name}
                                            className="hover:bg-muted/30 transition-colors"
                                        >
                                            <TableCell className="font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={idx === 0 ? "default" : "outline"}>
                                                        #{idx + 1}
                                                    </Badge>
                                                    {item.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge style={{ backgroundColor: item.fill }} className="font-bold">
                                                    {item.value.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-purple-600">
                                                {formatNumber(results.utility_ranges[item.name])}
                                            </TableCell>
                                            <TableCell className="font-semibold text-green-700">
                                                {bestLevel[0]}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-green-600">
                                                +{formatNumber(bestLevel[1])}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-red-600">
                                                {formatNumber(worstLevel[1])}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Segmentation Analysis */}
            {results.segmentation && (
                <>
                    <Card className="shadow-lg border-2 border-cyan-200">
                        <CardHeader className="bg-gradient-to-br from-cyan-50 to-cyan-100">
                            <CardTitle className="flex items-center gap-2 text-cyan-900">
                                <Users className="h-5 w-5" />
                                Respondent Segmentation Analysis
                            </CardTitle>
                            <CardDescription className="text-cyan-700">
                                K-Means clustering identifies {results.segmentation.n_segments} distinct customer segments based on preference patterns
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {/* Segmentation Quality Metrics */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                <div className="rounded-lg border-2 border-cyan-200 p-4 bg-gradient-to-br from-cyan-50 to-white">
                                    <div className="text-sm text-gray-600 mb-1 font-semibold">Silhouette Score</div>
                                    <div className="text-4xl font-bold text-cyan-600">
                                        {formatNumber(results.segmentation.quality_metrics.silhouette_score, 3)}
                                    </div>
                                    <div className="text-xs text-cyan-700 mt-2 font-medium">
                                        {results.segmentation.quality_metrics.silhouette_score > 0.5 
                                            ? '✓ Good separation' 
                                            : results.segmentation.quality_metrics.silhouette_score > 0.25 
                                            ? '⚠ Moderate separation' 
                                            : '⚠ Weak separation'}
                                    </div>
                                </div>
                                <div className="rounded-lg border-2 border-blue-200 p-4 bg-gradient-to-br from-blue-50 to-white">
                                    <div className="text-sm text-gray-600 mb-1 font-semibold">Davies-Bouldin Index</div>
                                    <div className="text-4xl font-bold text-blue-600">
                                        {formatNumber(results.segmentation.quality_metrics.davies_bouldin_index, 3)}
                                    </div>
                                    <div className="text-xs text-blue-700 mt-2 font-medium">
                                        {results.segmentation.quality_metrics.davies_bouldin_index < 1 
                                            ? '✓ Good clustering' 
                                            : '⚠ Consider different segments'}
                                    </div>
                                </div>
                            </div>

                            {/* Segment Overview Cards */}
                            <h3 className="font-bold text-lg mb-4 text-gray-900">Segment Overview</h3>
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                {Object.entries(results.segmentation.segments).map(([segName, segment], idx) => {
                                    const segmentColors = [
                                        { bg: 'from-rose-50 to-rose-100', border: 'border-rose-300', text: 'text-rose-900', badge: 'bg-rose-500' },
                                        { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', text: 'text-blue-900', badge: 'bg-blue-500' },
                                        { bg: 'from-green-50 to-green-100', border: 'border-green-300', text: 'text-green-900', badge: 'bg-green-500' },
                                        { bg: 'from-purple-50 to-purple-100', border: 'border-purple-300', text: 'text-purple-900', badge: 'bg-purple-500' },
                                    ];
                                    const color = segmentColors[idx % segmentColors.length];
                                    const profile = results.segmentation!.comparison.segment_profiles[segName];
                                    
                                    return (
                                        <Card key={segName} className={`border-2 ${color.border} hover:shadow-lg transition-all`}>
                                            <CardHeader className={`bg-gradient-to-br ${color.bg}`}>
                                                <CardTitle className={`text-base ${color.text} flex items-center justify-between`}>
                                                    <span>{segName}</span>
                                                    <Badge className={color.badge}>
                                                        {segment.percentage.toFixed(1)}%
                                                    </Badge>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Size</div>
                                                        <div className="text-2xl font-bold text-gray-900">{segment.size}</div>
                                                        <div className="text-xs text-gray-600">respondents</div>
                                                    </div>
                                                    <div className="pt-3 border-t">
                                                        <div className="text-xs text-gray-500 mb-1">Primary Driver</div>
                                                        <div className="font-semibold text-gray-900">{profile.primary_driver}</div>
                                                        <Badge variant="outline" className="mt-1">
                                                            {profile.primary_importance.toFixed(1)}% importance
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Distinctive Attributes */}
                            <Alert className="border-2 border-cyan-200 bg-cyan-50">
                                <Info className="h-4 w-4 text-cyan-600" />
                                <AlertTitle className="text-cyan-900">Most Distinctive Attributes</AlertTitle>
                                <AlertDescription className="text-cyan-700">
                                    <div className="space-y-2 mt-2">
                                        {results.segmentation.comparison.distinctive_attributes.slice(0, 3).map((item, idx) => (
                                            <div key={item.attribute} className="flex items-center justify-between">
                                                <span>
                                                    <Badge variant={idx === 0 ? "default" : "outline"} className="mr-2">#{idx + 1}</Badge>
                                                    <strong>{item.attribute}</strong>
                                                </span>
                                                <span className="text-sm font-mono">variance: {item.variance.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs mt-3 pt-3 border-t border-cyan-300">
                                        These attributes show the most variation in importance across segments, 
                                        making them key differentiators for targeting strategies.
                                    </p>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Segment-by-Segment Detail */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(results.segmentation.segments).map(([segName, segment], idx) => {
                            const segmentColors = [
                                { bg: 'from-rose-50 to-rose-100', border: 'border-rose-300', text: 'text-rose-900', chart: '#f43f5e' },
                                { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', text: 'text-blue-900', chart: '#3b82f6' },
                                { bg: 'from-green-50 to-green-100', border: 'border-green-300', text: 'text-green-900', chart: '#10b981' },
                                { bg: 'from-purple-50 to-purple-100', border: 'border-purple-300', text: 'text-purple-900', chart: '#a855f7' },
                            ];
                            const color = segmentColors[idx % segmentColors.length];
                            
                            const segmentImportanceData = Object.entries(segment.attribute_importance)
                                .map(([attr, imp]) => ({
                                    name: attr,
                                    value: imp
                                }))
                                .sort((a, b) => b.value - a.value);
                            
                            return (
                                <Card key={segName} className={`shadow-lg border-2 ${color.border}`}>
                                    <CardHeader className={`bg-gradient-to-br ${color.bg}`}>
                                        <CardTitle className={`${color.text} flex items-center justify-between`}>
                                            {segName}
                                            <Badge variant="secondary">
                                                {segment.size} respondents ({segment.percentage.toFixed(1)}%)
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-gray-700">
                                            Segment-specific preferences and optimal product
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {/* Attribute Importance for Segment */}
                                        <div className="mb-6">
                                            <h4 className="font-semibold text-sm mb-3">Attribute Importance</h4>
                                            <div className="space-y-2">
                                                {segmentImportanceData.map((item, idx) => (
                                                    <div key={item.name} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-medium">{item.name}</span>
                                                            <span className="font-bold" style={{ color: color.chart }}>
                                                                {item.value.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{ 
                                                                    width: `${item.value}%`,
                                                                    backgroundColor: color.chart
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Optimal Product for Segment */}
                                        <div className={`rounded-lg border-2 ${color.border} bg-gradient-to-br ${color.bg} p-4`}>
                                            <h4 className="font-semibold text-sm mb-3">Optimal Product for This Segment</h4>
                                            <div className="space-y-2">
                                                {Object.entries(segment.optimal_product.configuration).map(([attr, level]) => (
                                                    <div key={attr} className="flex justify-between items-center text-sm bg-white rounded px-2 py-1">
                                                        <span className="text-gray-600">{attr}:</span>
                                                        <span className="font-semibold text-gray-900">{level}</span>
                                                    </div>
                                                ))}
                                                <div className="pt-2 mt-2 border-t border-gray-300">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-medium text-gray-600">Total Utility:</span>
                                                        <span className="text-lg font-bold" style={{ color: color.chart }}>
                                                            {formatNumber(segment.optimal_product.total_utility)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Importance Comparison Across Segments */}
                    <Card className="shadow-lg border-2 border-teal-200">
                        <CardHeader className="bg-gradient-to-br from-teal-50 to-teal-100">
                            <CardTitle className="flex items-center gap-2 text-teal-900">
                                <BarChart3 className="h-5 w-5" />
                                Attribute Importance Comparison
                            </CardTitle>
                            <CardDescription className="text-teal-700">
                                How different segments prioritize each attribute
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-teal-100">
                                            <TableHead className="font-bold">Attribute</TableHead>
                                            {Object.keys(results.segmentation.segments).map(segName => (
                                                <TableHead key={segName} className="text-right font-bold">
                                                    {segName}
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-right font-bold">Variance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.segmentation.comparison.importance_comparison).map(([attr, segValues]) => {
                                            const values = Object.values(segValues);
                                            const variance = results.segmentation!.comparison.distinctive_attributes
                                                .find(item => item.attribute === attr)?.variance || 0;
                                            const isDistinctive = variance > 50;
                                            
                                            return (
                                                <TableRow 
                                                    key={attr}
                                                    className={`hover:bg-teal-50 transition-colors ${isDistinctive ? 'bg-teal-50/50' : ''}`}
                                                >
                                                    <TableCell className="font-semibold">
                                                        {attr}
                                                        {isDistinctive && (
                                                            <Badge variant="default" className="ml-2 bg-teal-600 text-xs">
                                                                Distinctive
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    {Object.entries(segValues).map(([segName, value]) => {
                                                        const isMax = value === Math.max(...values);
                                                        return (
                                                            <TableCell key={segName} className="text-right">
                                                                <span className={`font-mono font-semibold ${isMax ? 'text-teal-600 text-lg' : 'text-gray-600'}`}>
                                                                    {value.toFixed(1)}%
                                                                </span>
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="text-right">
                                                        <Badge variant={isDistinctive ? "default" : "outline"}>
                                                            {variance.toFixed(1)}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            <Alert className="mt-6 border-2 border-teal-200 bg-teal-50">
                                <Info className="h-4 w-4 text-teal-600" />
                                <AlertTitle className="text-teal-900">Interpretation Guide</AlertTitle>
                                <AlertDescription className="text-teal-700">
                                    <p className="mb-2">
                                        <strong>Highlighted values</strong> show each segment's top priority attribute.
                                    </p>
                                    <p>
                                        <strong>High variance</strong> indicates attributes where segments differ most, 
                                        making them ideal for differentiated marketing strategies.
                                    </p>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

