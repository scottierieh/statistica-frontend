'use client';
import React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
    Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, 
    Network, LineChart as LineChartIcon, Activity, HelpCircle, MoveRight, Star, TrendingUp, 
    CheckCircle, Users, AlertTriangle, Download, Copy, Check
} from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { 
    BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line 
} from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import type { Survey, SurveyResponse, Question } from '@/entities/Survey';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface RatingConjointResults {
    partWorths: { attribute: string, level: string, value: number }[];
    importance: { attribute: string, importance: number }[];
    regression: {
        rSquared: number;
        adjustedRSquared: number;
        predictions: number[];
        intercept: number;
        coefficients: {[key: string]: number};
        crossValidationR2?: number;
    };
    targetVariable: string;
    optimalProduct?: {
        config: {[key: string]: string};
        totalUtility: number;
    };
    simulation?: any;
    segmentation?: SegmentationAnalysis;
}

interface SegmentationAnalysis {
    segmentVariable: string;
    resultsBySegment: { [segmentValue: string]: SegmentResult };
}

interface SegmentResult {
    importance: { attribute: string; importance: number }[];
    partWorths: { attribute: string; level: string; value: number }[];
}

interface FullAnalysisResponse {
    results: RatingConjointResults;
    error?: string;
}

interface Scenario {
    name: string;
    [key: string]: string;
}

interface RatingConjointAnalysisPageProps {
    survey: any;
    responses: any[];
}

export default function RatingConjointAnalysisPage({ survey, responses }: RatingConjointAnalysisPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState<string>('');
    
    // Advanced features state
    const [scenarios, setScenarios] = useState<Scenario[]>([
        { name: 'My Product' }, { name: 'Competitor A' }, { name: 'Competitor B' }
    ]);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [sensitivityAttribute, setSensitivityAttribute] = useState<string | undefined>();
    
    // Export features
    const [copied, setCopied] = useState(false);
    
    const conjointQuestion = useMemo(() => {
        const question = survey.questions?.find((q: any) => q.type === 'rating-conjoint');
        return question;
    }, [survey]);

    const allAttributes = useMemo(() => {
        if (!conjointQuestion || !conjointQuestion.attributes) {
            return {};
        }
        
        const attributesObj: any = {};
        conjointQuestion.attributes.forEach((attr: any) => {
            attributesObj[attr.name] = {
                name: attr.name,
                type: 'categorical',
                levels: attr.levels || [],
                includeInAnalysis: true,
            };
        });
        
        return attributesObj;
    }, [conjointQuestion]);

    const attributeCols = useMemo(() => Object.keys(allAttributes), [allAttributes]);

    const handleAnalysis = useCallback(async (simulationScenarios?: Scenario[]) => {
        try {
            if (!conjointQuestion) {
                const error = 'No rating-based conjoint question found in survey';
                setDebugInfo(error);
                toast({ variant: 'destructive', title: 'Configuration Error', description: error });
                setIsLoading(false);
                return;
            }

            if (!responses || responses.length === 0) {
                const error = 'No responses found for analysis';
                setDebugInfo(error);
                toast({ variant: 'destructive', title: 'Data Error', description: error });
                setIsLoading(false);
                return;
            }

            if (!conjointQuestion.profiles || conjointQuestion.profiles.length === 0) {
                const error = 'No profiles defined in conjoint question';
                setDebugInfo(error);
                toast({ variant: 'destructive', title: 'Configuration Error', description: error });
                setIsLoading(false);
                return;
            }

            const analysisData: any[] = [];

            responses.forEach((resp) => {
                let answerBlock = resp.answers?.[conjointQuestion.id];
                
                if (Array.isArray(resp.answers)) {
                    const answerObj = resp.answers.find((a: any) => a.questionId === conjointQuestion.id);
                    answerBlock = answerObj?.ratings || answerObj?.answer || answerObj;
                }
                
                if (!answerBlock || typeof answerBlock !== 'object') {
                    return;
                }
                
                Object.entries(answerBlock).forEach(([profileKey, rating]) => {
                    const profile = conjointQuestion.profiles?.find((p: any) => 
                        p.id === profileKey || p.id.toString() === profileKey
                    );
                    
                    if (!profile || !profile.attributes) {
                        return;
                    }
                    
                    const ratingValue = Number(rating);
                    if (isNaN(ratingValue)) {
                        return;
                    }
                    
                    analysisData.push({ ...profile.attributes, rating: ratingValue });
                });
            });
            
            if (analysisData.length === 0) {
                const error = 'No valid rating data found';
                setDebugInfo(error);
                toast({ variant: 'destructive', title: 'Data Error', description: error });
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            if (!simulationScenarios) {
                setAnalysisResult(null);
                setSimulationResult(null);
            }

            const attributesForBackend = attributeCols.reduce((acc, attrName) => {
                if (allAttributes[attrName]) {
                    acc[attrName] = { ...allAttributes[attrName], includeInAnalysis: true };
                }
                return acc;
            }, {} as any);

            const requestBody = {
                data: analysisData,
                attributes: attributesForBackend,
                targetVariable: 'rating',
                scenarios: simulationScenarios
            };

            const response = await fetch('/api/analysis/rating-conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Server error: ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorJson.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const result: FullAnalysisResponse = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            if (!result.results) {
                throw new Error('No results returned from analysis');
            }
            
            setDebugInfo('Analysis completed successfully');
            
            if (simulationScenarios) {
                setSimulationResult(result.results.simulation);
                toast({ title: 'Simulation Complete', description: 'Market shares have been predicted.' });
            } else {
                setAnalysisResult(result);
                toast({ title: 'Analysis Complete', description: `Successfully analyzed ${analysisData.length} rating data points.` });
            }

        } catch (e: any) {
            const errorMessage = e.message || 'Unknown error occurred';
            setDebugInfo(`Error: ${errorMessage}`);
            toast({ variant: 'destructive', title: 'Analysis Error', description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [conjointQuestion, responses, toast, attributeCols, allAttributes]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    useEffect(() => {
        if (analysisResult && attributeCols.length > 0) {
            setSensitivityAttribute(attributeCols[0]);

            const initialScenarios = [
                { name: 'My Product' }, 
                { name: 'Competitor A' }, 
                { name: 'Competitor B' }
            ].map((sc, scIndex) => {
                const newSc: Scenario = { ...sc };
                attributeCols.forEach((attrName, i) => {
                    const levels = allAttributes[attrName]?.levels || [];
                    if (levels.length > 0) {
                        newSc[attrName] = levels[(scIndex + i) % levels.length];
                    }
                });
                return newSc;
            });
            setScenarios(initialScenarios);
        }
    }, [analysisResult, attributeCols, allAttributes]);

    // Export to CSV
    const exportToCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let csvContent = "data:text/csv;charset=utf-8,";
        
        csvContent += "Attribute Importance\n";
        csvContent += "Attribute,Importance (%)\n";
        results.importance.forEach(imp => {
            csvContent += `${imp.attribute},${imp.importance}\n`;
        });
        
        csvContent += "\n";
        
        csvContent += "Part-Worth Utilities\n";
        csvContent += "Attribute,Level,Utility\n";
        results.partWorths.forEach(pw => {
            csvContent += `${pw.attribute},${pw.level},${pw.value}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `rating_conjoint_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: 'Export Complete', description: 'Data exported to CSV successfully.' });
    }, [analysisResult, toast]);

    // Copy to clipboard
    const copyToClipboard = useCallback(() => {
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let text = "RATING CONJOINT ANALYSIS RESULTS\n\n";
        
        text += "Attribute Importance:\n";
        results.importance
            .sort((a, b) => b.importance - a.importance)
            .forEach(imp => {
                text += `  ${imp.attribute}: ${imp.importance.toFixed(1)}%\n`;
            });
        
        if (results.optimalProduct) {
            text += "\nOptimal Product Configuration:\n";
            Object.entries(results.optimalProduct.config).forEach(([attr, level]) => {
                text += `  ${attr}: ${level}\n`;
            });
            text += `  Predicted Rating: ${results.optimalProduct.totalUtility.toFixed(2)}\n`;
        }
        
        text += `\nModel Fit:\n`;
        text += `  R²: ${(results.regression.rSquared * 100).toFixed(1)}%\n`;
        text += `  Adjusted R²: ${(results.regression.adjustedRSquared * 100).toFixed(1)}%\n`;
        if (results.regression.crossValidationR2) {
            text += `  Cross-Validation R²: ${(results.regression.crossValidationR2 * 100).toFixed(1)}%\n`;
        }
        
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast({ title: 'Copied!', description: 'Results copied to clipboard.' });
            setTimeout(() => setCopied(false), 2000);
        });
    }, [analysisResult, toast]);

    const runSimulation = () => {
        handleAnalysis(scenarios);
    };

    const handleScenarioChange = (scenarioIndex: number, attrName: string, value: string) => {
        setScenarios(prev => {
            const newScenarios = [...prev];
            newScenarios[scenarioIndex] = { 
                ...newScenarios[scenarioIndex], 
                [attrName]: value 
            };
            return newScenarios;
        });
    };
    
    const sensitivityData = useMemo(() => {
        if (!analysisResult?.results || !sensitivityAttribute) return [];
        
        const otherAttributes = attributeCols.filter(attr => attr !== sensitivityAttribute);
        
        return analysisResult.results.partWorths
            .filter(p => p.attribute === sensitivityAttribute)
            .map(p => {
                let otherUtility = 0;
                otherAttributes.forEach(otherAttr => {
                    const levels = allAttributes[otherAttr]?.levels || [];
                    if (levels.length > 0) {
                        const baseLevelWorth = analysisResult.results.partWorths.find(
                            pw => pw.attribute === otherAttr && pw.level === levels[0]
                        );
                        otherUtility += baseLevelWorth?.value || 0;
                    }
                });
                return {
                    level: p.level,
                    utility: (analysisResult.results.regression.intercept || 0) + p.value + otherUtility,
                };
            });
    }, [analysisResult, sensitivityAttribute, attributeCols, allAttributes]);

    const importanceData = useMemo(() => {
        if (!analysisResult?.results.importance) return [];
        return analysisResult.results.importance
            .map(({ attribute, importance }) => ({ 
                name: attribute, 
                value: importance 
            }))
            .sort((a, b) => b.value - a.value);
    }, [analysisResult]);

    const partWorthsData = useMemo(() => {
        if (!analysisResult?.results.partWorths) return [];
        return analysisResult.results.partWorths;
    }, [analysisResult]);

    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    
    const importanceChartConfig = useMemo(() => {
        if (!analysisResult) return {};
        return importanceData.reduce((acc, item, index) => {
            acc[item.name] = { 
                label: item.name, 
                color: COLORS[index % COLORS.length] 
            };
            return acc;
        }, {} as any);
    }, [analysisResult, importanceData, COLORS]);

    const partWorthChartConfig = { value: { label: "Part-Worth" } };

    if (isLoading && !analysisResult) {
        return (
            <Card className="shadow-lg">
                <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-lg font-medium">Running Rating-based Conjoint Analysis</p>
                    <p className="mt-2 text-sm text-muted-foreground">Estimating part-worth utilities from rating data...</p>
                    {debugInfo && (
                        <Alert className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{debugInfo}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    }
    
    if (!analysisResult?.results) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            No analysis results available. {debugInfo || 'Please check your data and try again.'}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;
    
    return (
        <div className="space-y-6">
            {/* Header with Export Controls */}
            <Card className="shadow-lg border-2 border-primary/20">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <CardTitle className="font-headline text-2xl mb-2">Rating-based Conjoint Analysis</CardTitle>
                            <CardDescription className="text-base">
                                OLS Regression Model - Analyzing {responses?.length || 0} responses across {attributeCols.length} attributes
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
                                <Target className="h-6 w-6 text-blue-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">R-Squared</p>
                                    <div className="text-3xl font-bold text-gray-900">
                                        {(results.regression.rSquared * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Adj. R-Squared</p>
                                    <div className="text-3xl font-bold text-gray-900">
                                        {(results.regression.adjustedRSquared * 100).toFixed(1)}%
                                    </div>
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
                                    <div className="text-3xl font-bold text-gray-900">{attributeCols.length}</div>
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
                                    <p className="text-xs font-semibold text-gray-600 mb-1">Data Points</p>
                                    <div className="text-3xl font-bold text-gray-900">
                                        {results.regression.predictions?.length || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Key Insights Alert */}
            {results.optimalProduct && (
                <Alert className="shadow-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                    <Star className="h-5 w-5 text-indigo-600" />
                    <AlertTitle className="text-indigo-900 text-lg font-semibold">Key Insights</AlertTitle>
                    <AlertDescription className="text-indigo-700 space-y-2 mt-2">
                        <p>
                            • <strong>Model Quality:</strong> R² = {(results.regression.rSquared * 100).toFixed(1)}% - 
                            {results.regression.rSquared > 0.7 ? ' Excellent model fit' : results.regression.rSquared > 0.5 ? ' Good model fit' : ' Moderate model fit'}
                        </p>
                        {results.regression.crossValidationR2 && (
                            <p>
                                • <strong>Cross-Validation R²:</strong> {(results.regression.crossValidationR2 * 100).toFixed(1)}% - Model validation score
                            </p>
                        )}
                        <p>
                            • <strong>Most Important Attribute:</strong> {importanceData[0]?.name} ({importanceData[0]?.value.toFixed(1)}%)
                        </p>
                        <p>
                            • <strong>Optimal Product Rating:</strong> {results.optimalProduct.totalUtility.toFixed(2)}
                        </p>
                    </AlertDescription>
                </Alert>
            )}
            
            {/* 1. Importance Section */}
            <Card className="shadow-lg border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardTitle className='flex items-center gap-2 text-purple-900'>
                        <PieIcon/>Relative Importance of Attributes
                    </CardTitle>
                    <CardDescription className="text-purple-700">
                        Shows which attributes have the most influence on ratings
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Chart View</h3>
                            <ChartContainer config={importanceChartConfig} className="w-full h-[400px]">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie 
                                            data={importanceData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            outerRadius={120} 
                                            label={(entry) => `${entry.name} (${entry.value.toFixed(1)}%)`} 
                                            labelLine={false}
                                        >
                                            {importanceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Table View</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Attribute</TableHead>
                                        <TableHead className="text-right">Importance (%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importanceData.map((item, index) => (
                                        <TableRow key={item.name}>
                                            <TableCell className="font-medium">#{index + 1}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-right font-semibold">{item.value.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* 2. Part-Worths Section */}
            <Card className="shadow-lg border-2 border-orange-200">
                <CardHeader className="bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardTitle className='flex items-center gap-2 text-orange-900'>
                        <BarIcon/>Part-Worth Utilities
                    </CardTitle>
                    <CardDescription className="text-orange-700">
                        Utility values for each attribute level (zero-centered)
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-8">
                        {attributeCols.map(attr => {
                            const attrData = partWorthsData.filter(p => p.attribute === attr).sort((a, b) => b.value - a.value);
                            return (
                                <div key={attr} className="space-y-4">
                                    <h3 className="font-semibold text-xl text-orange-900">{attr}</h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-gray-600">Chart View</h4>
                                            <ChartContainer config={partWorthChartConfig} className="w-full h-[250px]">
                                                <ResponsiveContainer>
                                                    <BarChart data={attrData} layout="vertical" margin={{ left: 100, right: 20, top: 20, bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" />
                                                        <YAxis dataKey="level" type="category" width={90} tick={{ fontSize: 12 }}/>
                                                        <Tooltip content={<ChartTooltipContent />} />
                                                        <Bar dataKey="value" name="Part-Worth" fill="hsl(var(--primary))" barSize={30}/>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-gray-600">Table View</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Rank</TableHead>
                                                        <TableHead>Level</TableHead>
                                                        <TableHead className="text-right">Utility</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {attrData.map((item, index) => (
                                                        <TableRow key={item.level}>
                                                            <TableCell className="font-medium">#{index + 1}</TableCell>
                                                            <TableCell>{item.level}</TableCell>
                                                            <TableCell className="text-right font-semibold">
                                                                {item.value >= 0 ? '+' : ''}{item.value.toFixed(3)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
            
            {/* 3. Optimal Product Section */}
            <Card className="shadow-lg border-2 border-green-200">
                <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
                    <CardTitle className='flex items-center gap-2 text-green-900'>
                        <Star className="h-5 w-5"/>Optimal Product Profile
                    </CardTitle>
                    <CardDescription className="text-green-700">
                        The combination of attributes that yields the highest predicted preference rating
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {results.optimalProduct ? (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Attribute</TableHead>
                                        <TableHead>Best Level</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.optimalProduct.config).map(([attr, level]) => (
                                        <TableRow key={attr}>
                                            <TableCell className="font-medium">{attr}</TableCell>
                                            <TableCell>{level as string}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="mt-6 p-4 bg-primary/10 rounded-lg text-center">
                                <p className="text-lg">
                                    Predicted Rating: <span className="text-2xl font-bold text-primary ml-2">{results.optimalProduct.totalUtility.toFixed(2)}</span>
                                </p>
                            </div>
                        </>
                    ) : (
                        <p className="text-muted-foreground">Could not determine optimal profile.</p>
                    )}
                </CardContent>
            </Card>
            
            {/* 4. Simulation Section */}
            <Card className="shadow-lg border-2 border-teal-200">
                <CardHeader className="bg-gradient-to-br from-teal-50 to-teal-100">
                    <CardTitle className='flex items-center gap-2 text-teal-900'>
                        <Activity className="h-5 w-5"/>Preference Share Simulation
                    </CardTitle>
                    <CardDescription className="text-teal-700">
                        Build product scenarios to predict market preference shares
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                        {scenarios.map((scenario, index) => (
                            <Card key={index}>
                                <CardHeader className="pb-3">
                                    <Input 
                                        value={scenario.name} 
                                        onChange={(e) => handleScenarioChange(index, 'name', e.target.value)} 
                                        className="font-semibold" 
                                        placeholder="Scenario name"
                                    />
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {attributeCols.map((attrName) => {
                                        const levels = allAttributes[attrName]?.levels || [];
                                        return (
                                            <div key={attrName}>
                                                <Label className="text-sm">{attrName}</Label>
                                                <Select 
                                                    value={scenario[attrName]} 
                                                    onValueChange={(v) => handleScenarioChange(index, attrName, v)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select level" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {levels.map((l: string) => (
                                                            <SelectItem key={l} value={l}>{l}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Button onClick={runSimulation} disabled={isLoading} size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin mr-2 h-4 w-4"/>
                                Running Simulation...
                            </>
                        ) : (
                            <>
                                <Activity className="mr-2 h-4 w-4"/>
                                Run Simulation
                            </>
                        )}
                    </Button>
                    {simulationResult && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-4">Simulation Results</h3>
                            <ChartContainer 
                                config={{preferenceShare: {label: 'Preference Share', color: 'hsl(var(--chart-1))'}}} 
                                className="w-full h-[300px]"
                            >
                                <ResponsiveContainer>
                                    <BarChart data={simulationResult}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis unit="%" />
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                        <Bar 
                                            dataKey="preferenceShare" 
                                            name="Preference Share (%)" 
                                            fill="var(--color-preferenceShare)" 
                                            radius={[8, 8, 0, 0]} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {/* 5. Sensitivity Section */}
            <Card className="shadow-lg border-2 border-indigo-200">
                <CardHeader className="bg-gradient-to-br from-indigo-50 to-indigo-100">
                    <CardTitle className='flex items-center gap-2 text-indigo-900'>
                        <LineChartIcon className="h-5 w-5"/>Sensitivity Analysis
                    </CardTitle>
                    <CardDescription className="text-indigo-700">
                        See how the overall utility changes as you vary the levels of a single attribute
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        <div>
                            <Label>Attribute to Analyze</Label>
                            <Select value={sensitivityAttribute} onValueChange={setSensitivityAttribute}>
                                <SelectTrigger className="w-full md:w-[300px]">
                                    <SelectValue placeholder="Select attribute" />
                                </SelectTrigger>
                                <SelectContent>
                                    {attributeCols.map(attr => (
                                        <SelectItem key={attr} value={attr}>{attr}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <ChartContainer 
                            config={{ utility: { label: 'Utility', color: 'hsl(var(--primary))' } }} 
                            className="w-full h-[400px]"
                        >
                            <ResponsiveContainer>
                                <LineChart data={sensitivityData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="level" />
                                    <YAxis />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="utility" 
                                        stroke="hsl(var(--primary))" 
                                        strokeWidth={3} 
                                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }} 
                                        activeDot={{ r: 8 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
            
            {/* 6. Model Fit Section */}
            <Card className="shadow-lg border-2 border-gray-200">
                <CardHeader className="bg-gradient-to-br from-gray-50 to-gray-100">
                    <CardTitle className='flex items-center gap-2 text-gray-900'>
                        <Brain className="h-5 w-5"/>Model Fit Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">R-Squared</p>
                            <p className="text-2xl font-bold">{(results.regression.rSquared * 100).toFixed(1)}%</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Adjusted R-Squared</p>
                            <p className="text-2xl font-bold">{(results.regression.adjustedRSquared * 100).toFixed(1)}%</p>
                        </div>
                        {results.regression.crossValidationR2 && (
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Cross-Validation R²</p>
                                <p className="text-2xl font-bold">{(results.regression.crossValidationR2 * 100).toFixed(1)}%</p>
                            </div>
                        )}
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Intercept</p>
                            <p className="text-2xl font-bold">{results.regression.intercept.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Predictions</p>
                            <p className="text-2xl font-bold">{results.regression.predictions?.length || 0}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


