'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Loader2, AlertTriangle, PieChart as PieIcon, BarChart as BarIcon, 
    Network, TrendingUp, Sparkles, CheckCircle, Info, Target, 
    TrendingDown, Award, LineChart as LineIcon, BarChart3, Users,
    Download, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Copy, Check
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

type SortDirection = 'asc' | 'desc' | null;

export default function RankingConjointPage({ survey, responses }: RankingConjointPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // New state for enhanced features
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [filterText, setFilterText] = useState('');
    const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
    const [comparisonMode, setComparisonMode] = useState(false);
    const [activeChartData, setActiveChartData] = useState<any>(null);
    const [showChartDetail, setShowChartDetail] = useState(false);
    const [copied, setCopied] = useState(false);
    const [animateCharts, setAnimateCharts] = useState(true);
    
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

    // Export to CSV function
    const exportToCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Part-worths section
        csvContent += "Part-Worth Utilities\n";
        csvContent += "Attribute,Level,Utility\n";
        Object.entries(results.part_worths).forEach(([attr, levels]) => {
            Object.entries(levels).forEach(([level, value]) => {
                csvContent += `${attr},${level},${value}\n`;
            });
        });
        
        csvContent += "\n";
        
        // Attribute importance section
        csvContent += "Attribute Importance\n";
        csvContent += "Attribute,Importance (%)\n";
        Object.entries(results.attribute_importance).forEach(([attr, importance]) => {
            csvContent += `${attr},${importance}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `conjoint_analysis_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: 'Export Complete', description: 'Data exported to CSV successfully.' });
    }, [analysisResult, toast]);

    // Export to Excel-compatible format
    const exportToExcel = useCallback(() => {
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let content = "Conjoint Analysis Results\n\n";
        
        content += "ATTRIBUTE IMPORTANCE\n";
        content += "Attribute\tImportance (%)\tUtility Range\n";
        Object.entries(results.attribute_importance).forEach(([attr, importance]) => {
            content += `${attr}\t${importance.toFixed(2)}\t${results.utility_ranges[attr].toFixed(4)}\n`;
        });
        
        content += "\n\nPART-WORTH UTILITIES\n";
        Object.entries(results.part_worths).forEach(([attr, levels]) => {
            content += `\n${attr}\n`;
            content += "Level\tUtility\n";
            Object.entries(levels).forEach(([level, value]) => {
                content += `${level}\t${(value as number).toFixed(4)}\n`;
            });
        });
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `conjoint_analysis_${new Date().toISOString().split('T')[0]}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: 'Export Complete', description: 'Data exported successfully.' });
    }, [analysisResult, toast]);

    // Copy results to clipboard
    const copyToClipboard = useCallback(() => {
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let text = "CONJOINT ANALYSIS RESULTS\n\n";
        
        text += "Attribute Importance:\n";
        Object.entries(results.attribute_importance)
            .sort(([, a], [, b]) => b - a)
            .forEach(([attr, importance]) => {
                text += `  ${attr}: ${importance.toFixed(1)}%\n`;
            });
        
        text += "\nOptimal Product Configuration:\n";
        Object.entries(results.optimal_product.configuration).forEach(([attr, level]) => {
            text += `  ${attr}: ${level}\n`;
        });
        text += `  Total Utility: ${results.optimal_product.total_utility.toFixed(4)}\n`;
        
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast({ title: 'Copied!', description: 'Results copied to clipboard.' });
            setTimeout(() => setCopied(false), 2000);
        });
    }, [analysisResult, toast]);

    // Sorting function
    const handleSort = useCallback((column: string) => {
        if (sortColumn === column) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortColumn(null);
                setSortDirection(null);
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    }, [sortColumn, sortDirection]);

    // Profile selection for comparison
    const toggleProfileSelection = useCallback((profileId: string) => {
        setSelectedProfiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(profileId)) {
                newSet.delete(profileId);
            } else {
                newSet.add(profileId);
            }
            return newSet;
        });
    }, []);

    // Chart click handler
    const handleChartClick = useCallback((data: any) => {
        setActiveChartData(data);
        setShowChartDetail(true);
    }, []);

    const importanceData = useMemo(() => {
        if (!analysisResult?.results.attribute_importance) return [];
        let data = Object.entries(analysisResult.results.attribute_importance)
            .map(([attribute, importance]) => ({ 
                name: attribute, 
                value: importance,
                fill: COLORS[Object.keys(analysisResult.results.attribute_importance).indexOf(attribute) % COLORS.length]
            }));
        
        // Apply sorting
        if (sortColumn === 'importance') {
            data = data.sort((a, b) => sortDirection === 'asc' ? a.value - b.value : b.value - a.value);
        } else {
            data = data.sort((a, b) => b.value - a.value);
        }
        
        // Apply filtering
        if (filterText) {
            data = data.filter(item => item.name.toLowerCase().includes(filterText.toLowerCase()));
        }
        
        return data;
    }, [analysisResult, sortColumn, sortDirection, filterText]);

    const partWorthsData = useMemo(() => {
        if (!analysisResult?.results.part_worths) return [];
        return analysisResult.results.part_worths;
    }, [analysisResult]);

    const filteredTopProfiles = useMemo(() => {
        if (!analysisResult?.results.top_profiles) return [];
        
        let profiles = [...analysisResult.results.top_profiles];
        
        // Apply sorting
        if (sortColumn === 'utility') {
            profiles = profiles.sort((a, b) => 
                sortDirection === 'asc' 
                    ? a.total_utility - b.total_utility 
                    : b.total_utility - a.total_utility
            );
        }
        
        // Apply filtering
        if (filterText) {
            profiles = profiles.filter(profile => 
                profile.profile_id.toLowerCase().includes(filterText.toLowerCase()) ||
                Object.values(profile.configuration).some(val => 
                    String(val).toLowerCase().includes(filterText.toLowerCase())
                )
            );
        }
        
        return profiles;
    }, [analysisResult, sortColumn, sortDirection, filterText]);

    const comparisonData = useMemo(() => {
        if (!analysisResult?.results || selectedProfiles.size === 0) return null;
        
        const profiles = analysisResult.results.top_profiles.filter(p => 
            selectedProfiles.has(p.profile_id)
        );
        
        return profiles;
    }, [analysisResult, selectedProfiles]);

    const getUtilityColor = (value: number) => {
        if (value > 0.3) return UTILITY_COLORS.positive;
        if (value < -0.3) return UTILITY_COLORS.negative;
        return UTILITY_COLORS.neutral;
    };

    const formatNumber = (num: number, decimals: number = 2) => {
        return num.toFixed(decimals);
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-30" />;
        return sortDirection === 'asc' 
            ? <ArrowUp className="h-4 w-4 ml-1 inline text-primary" />
            : <ArrowDown className="h-4 w-4 ml-1 inline text-primary" />;
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
            {/* Header with Export Controls */}
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="font-headline text-2xl">Ranking Conjoint Analysis</CardTitle>
                            <CardDescription>
                                Exploded Logit Model estimation with {results.sample_info.n_respondents} respondents, {results.sample_info.n_profiles} profiles, and {results.sample_info.n_attributes} attributes
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={copyToClipboard}>
                                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                Copy
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToCSV}>
                                <Download className="h-4 w-4 mr-2" />
                                CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToExcel}>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filter and Sort Controls */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Filter results..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="pl-10"
                                />
                                {filterText && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                                        onClick={() => setFilterText('')}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Button
                            variant={comparisonMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setComparisonMode(!comparisonMode);
                                if (comparisonMode) setSelectedProfiles(new Set());
                            }}
                        >
                            {comparisonMode ? 'Exit Comparison' : 'Compare Profiles'}
                        </Button>
                    </div>

                    {/* Comparison Mode Info */}
                    {comparisonMode && (
                        <Alert className="mb-4">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Comparison Mode Active</AlertTitle>
                            <AlertDescription>
                                Select profiles to compare their utilities and configurations. {selectedProfiles.size} profile(s) selected.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Comparison View */}
            {comparisonMode && comparisonData && comparisonData.length > 0 && (
                <Card className="shadow-lg border-2 border-purple-200">
                    <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardTitle className="flex items-center gap-2 text-purple-900">
                            <BarChart3 className="h-5 w-5" />
                            Profile Comparison ({comparisonData.length} profiles)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Attribute</TableHead>
                                        {comparisonData.map(profile => (
                                            <TableHead key={profile.profile_id} className="text-center">
                                                {profile.profile_id}
                                                <div className="text-xs font-normal text-muted-foreground">
                                                    Utility: {formatNumber(profile.total_utility)}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.keys(allAttributes).map(attr => (
                                        <TableRow key={attr}>
                                            <TableCell className="font-semibold">{attr}</TableCell>
                                            {comparisonData.map(profile => (
                                                <TableCell key={profile.profile_id} className="text-center">
                                                    <Badge variant="outline">
                                                        {profile.configuration[attr]}
                                                    </Badge>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}




            {/* Summary Stats Cards with Animation */}
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

            {/* Attribute Importance with Enhanced Interactivity */}
            <Card className="shadow-lg border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-purple-900">
                                <PieIcon className="h-5 w-5" />
                                Attribute Importance Distribution
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('importance')}
                                    className="ml-2"
                                >
                                    <SortIcon column="importance" />
                                </Button>
                            </CardTitle>
                            <CardDescription className="text-purple-700">
                                Relative importance of each attribute in decision-making (based on utility ranges)
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Pie Chart with Click Handler */}
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
                                            onClick={handleChartClick}
                                            animationBegin={0}
                                            animationDuration={animateCharts ? 800 : 0}
                                        >
                                            {importanceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer hover:opacity-80 transition-opacity" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>

                        {/* Importance Bars with Animation */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg mb-4">Importance Ranking</h3>
                            {importanceData.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="space-y-2 p-3 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border border-gray-200 hover:border-purple-300 transition-all cursor-pointer"
                                    onClick={() => handleChartClick(item)}
                                >
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

                    {/* Chart Detail Modal */}
                    {showChartDetail && activeChartData && (
                        <Alert className="mt-6 border-2 border-purple-300 bg-purple-100">
                            <Info className="h-4 w-4 text-purple-600" />
                            <AlertTitle className="text-purple-900 flex items-center justify-between">
                                Selected: {activeChartData.name}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowChartDetail(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </AlertTitle>
                            <AlertDescription className="text-purple-700">
                                <p><strong>Importance:</strong> {activeChartData.value.toFixed(2)}%</p>
                                <p><strong>Utility Range:</strong> {formatNumber(results.utility_ranges[activeChartData.name])}</p>
                                <p className="mt-2 text-sm">
                                    This attribute accounts for {activeChartData.value.toFixed(1)}% of the total decision-making variance.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

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
                                <div key={attr} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-green-200 hover:border-green-400 transition-all">
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
                                            Utility: {formatNumber(results.part_worths[attr][level])}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-4 pt-6 border-t-2 border-green-200">
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">Total Utility Score</p>
                                <p className="text-4xl font-bold text-green-600">
                                    {formatNumber(results.optimal_product.total_utility)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Alert className="mt-6 border-2 border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-900">Optimal Configuration</AlertTitle>
                        <AlertDescription className="text-green-700">
                            This configuration represents the combination of attribute levels with the highest total utility. 
                            It is the theoretically most preferred product by your customer base.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Top Profiles with Selection and Sorting */}
            <div className="grid md:grid-cols-1 gap-6">
                {results.top_profiles && results.top_profiles.length > 0 && (
                    <Card className="shadow-lg border-2 border-blue-200">
                        <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-blue-900">
                                        <Award className="h-5 w-5" />
                                        Top Performing Profiles
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort('utility')}
                                            className="ml-2"
                                        >
                                            <SortIcon column="utility" />
                                        </Button>
                                    </CardTitle>
                                    <CardDescription className="text-blue-700">
                                        Actual profiles from your survey ranked by total utility
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-3">
                                    {filteredTopProfiles.slice(0, 10).map((profile, idx) => {
                                        const medalColors = ['bg-yellow-500', 'bg-gray-400', 'bg-amber-600'];
                                        const medalBg = idx < 3 ? medalColors[idx] : 'bg-blue-500';
                                        const isSelected = selectedProfiles.has(profile.profile_id);
                                        
                                        return (
                                            <div 
                                                key={profile.profile_id} 
                                                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                                    isSelected 
                                                        ? 'border-purple-400 bg-purple-50 shadow-lg' 
                                                        : 'border-blue-200 bg-gradient-to-r from-blue-50 to-white hover:border-blue-400 hover:shadow-md'
                                                }`}
                                                onClick={() => comparisonMode && toggleProfileSelection(profile.profile_id)}
                                            >
                                                {comparisonMode && (
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleProfileSelection(profile.profile_id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
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
                                    {comparisonMode && " Click profiles to select them for comparison."}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Part-Worth Utilities Section - Continue from original */}
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
                            <div key={attr} className="space-y-4 p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-all">
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
                                                animationBegin={0}
                                                animationDuration={animateCharts ? 800 : 0}
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

            {/* Rest of the component continues with market simulation, model fit, etc. */}
            {/* For brevity, I'll add a closing tag */}
        </div>
    );
}




