'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';


const renderBarChart = (title: string, data: any[], consistency: any) => {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border-2 border-blue-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                    <p className="text-blue-600 font-bold">{payload[0].value}%</p>
                </div>
            );
        }
        return null;
    };

    const topItem = data.length > 0 ? data[0] : null;
    const showConsistency = consistency && data.length > 2; // Only show CR for 3+ items

    return (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                {showConsistency && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                            CR: <span className={`font-bold ${consistency.CR < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                                {(consistency.CR * 100).toFixed(1)}%
                            </span>
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${consistency.is_consistent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {consistency.is_consistent ? '✓ Consistent' : '✗ Inconsistent'}
                        </span>
                    </div>
                )}
                {!showConsistency && data.length === 2 && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        N/A (2 items)
                    </span>
                )}
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: '#374151', fontSize: 12 }} />
                        <YAxis 
                            label={{ value: 'Weight (%)', angle: -90, position: 'insideLeft', fill: '#374151' }}
                            domain={[0, 'auto']}
                            tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="weight" radius={[8, 8, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                
                <div className="space-y-2">
                    <h4 className="font-semibold text-gray-700 mb-3">Ranking</h4>
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                                    {index + 1}
                                </span>
                                <span className="font-medium text-gray-900">{item.name}</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600">{item.weight}%</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {topItem && (
                <Alert className="mt-6 bg-blue-50 border-blue-200">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-gray-900">Analysis Summary</AlertTitle>
                    <AlertDescription className="text-gray-700">
                        The most important factor is <strong>{topItem.name}</strong> with {topItem.weight}% weight.
                        {showConsistency && (
                            <> The Consistency Ratio is {(consistency.CR * 100).toFixed(1)}%, which is {consistency.is_consistent ? 'acceptable (below 10%)' : 'too high (above 10%)'}.</>
                        )}
                        {data.length === 2 && (
                            <> Consistency Ratio is not applicable for pairwise comparisons (always consistent).</>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};


const AHPResultsVisualization = ({ results }: { results: any }) => {
    const mainCriteriaData = useMemo(() => {
        const weights = results?.weights;
        if (!weights) return [];
        return Object.entries(weights).map(([name, weight]) => ({
            name,
            weight: ((weight as number) * 100).toFixed(1),
            weightValue: weight
        })).sort((a,b) => (b.weightValue as number) - (a.weightValue as number));
    }, [results]);

    const subCriteriaAnalyses = useMemo(() => {
        if (!results?.sub_criteria_analysis) return [];
        return Object.entries(results.sub_criteria_analysis);
    }, [results]);
    
    const finalScoresData = useMemo(() => {
        // If final_scores doesn't exist but alternatives_analysis does, calculate it
        if (!results?.final_scores && results?.alternatives_analysis && results?.weights) {
            const alternatives = new Set<string>();
            const scores: { [key: string]: number } = {};
            
            // Get all alternative names
            Object.values(results.alternatives_analysis).forEach((criterion: any) => {
                if (criterion.weights) {
                    Object.keys(criterion.weights).forEach(alt => alternatives.add(alt));
                }
            });
            
            // Initialize scores
            alternatives.forEach(alt => scores[alt] = 0);
            
            // Calculate weighted scores
            Object.entries(results.alternatives_analysis).forEach(([criterionName, criterion]: [string, any]) => {
                const criterionWeight = results.weights[criterionName] || 0;
                
                if (criterion.weights) {
                    Object.entries(criterion.weights).forEach(([altName, altWeight]) => {
                        scores[altName] += criterionWeight * (altWeight as number);
                    });
                }
            });
            
            return Object.entries(scores)
                .map(([name, score]) => ({
                    name,
                    score: (score * 100).toFixed(1),
                    scoreValue: score
                }))
                .sort((a, b) => b.scoreValue - a.scoreValue);
        }
        
        return (results?.final_scores?.map((item: any) => ({
            name: item.name,
            score: (item.score * 100).toFixed(1),
            scoreValue: item.score
        })).sort((a: any, b: any) => b.scoreValue - a.scoreValue) || []);
    }, [results]);

    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    AHP Analysis Results
                </h1>
                <p className="text-gray-600">Analytic Hierarchy Process - Decision Making Analysis</p>
            </div>
            
            <Card className="mb-6 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardTitle className="text-2xl">Main Criteria</CardTitle>
                    <CardDescription className="text-blue-100">Priority weights for decision factors</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {renderBarChart("Main Criteria Weights", mainCriteriaData, results.consistency)}
                </CardContent>
            </Card>

            {subCriteriaAnalyses.length > 0 && subCriteriaAnalyses.map(([parentCriterion, subAnalysis]: [string, any]) => (
                <Card key={parentCriterion} className="mb-6 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardTitle className="text-xl">Sub-Criteria: {parentCriterion}</CardTitle>
                        <CardDescription className="text-green-100">Detailed breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {renderBarChart(
                            `Sub-Criteria Weights for "${parentCriterion}"`,
                            Object.entries(subAnalysis.weights).map(([name, weight]) => ({
                                name,
                                weight: ((weight as number) * 100).toFixed(1),
                                weightValue: weight
                            })).sort((a: any, b: any) => b.weightValue - a.weightValue),
                            subAnalysis.consistency
                        )}
                    </CardContent>
                </Card>
            ))}
            
            {results.alternatives_analysis && Object.keys(results.alternatives_analysis).length > 0 && (
                <Card className="shadow-lg mb-6">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardTitle className="text-2xl">Alternative Performance</CardTitle>
                        <CardDescription className="text-purple-100">Performance by criterion</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {Object.entries(results.alternatives_analysis).map(([criterion, altAnalysis]: [string, any]) => (
                            <div key={criterion} className="mt-4 first:mt-0">
                                {renderBarChart(
                                    `Performance for "${criterion}"`,
                                    Object.entries(altAnalysis.weights).map(([name, weight]) => ({
                                        name,
                                        weight: ((weight as number) * 100).toFixed(1),
                                        weightValue: weight
                                    })).sort((a: any, b: any) => b.weightValue - a.weightValue),
                                    altAnalysis.consistency
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {finalScoresData.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <span className="text-3xl">🏆</span>
                            Final Ranking
                        </CardTitle>
                        <CardDescription className="text-yellow-100">
                            Overall scores combining all criteria
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {finalScoresData.map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className={`p-6 rounded-xl border-2 transition-all ${
                                        index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-md' :
                                        'bg-white border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg' :
                                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md' :
                                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-gray-900">{item.name}</h4>
                                                <p className="text-sm text-gray-600">Rank #{index + 1}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-bold text-blue-600">{item.score}%</p>
                                            <p className="text-sm text-gray-600">Final Score</p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${index === 0 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                                style={{ width: `${(parseFloat(item.score) / parseFloat(finalScoresData[0].score)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {finalScoresData.length > 0 && (
                            <Alert className="mt-6 bg-green-50 border-green-200">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <AlertTitle className="text-gray-900">Recommendation</AlertTitle>
                                <AlertDescription className="text-gray-700">
                                    Based on the comprehensive analysis, <strong>{finalScoresData[0].name}</strong> is the optimal choice with a final score of <strong>{finalScoresData[0].score}%</strong>.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

interface AhpPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function AhpPage({ survey, responses }: AhpPageProps) {
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleAnalysis = useCallback(async () => {
        if (!survey || !responses) {
            setError("Survey data or responses not available.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const ahpQuestion = survey.questions.find((q: Question) => q.type === 'ahp');
            if (!ahpQuestion || !ahpQuestion.criteria) {
                throw new Error("AHP Question or its criteria not found in survey definition.");
            }

            const aggregatedMatrices: { [key: string]: number[][][] } = {};
            
            const buildMatrix = (answerBlock: { [pairKey: string]: number }, itemNames: string[]): number[][] | null => {
                if (!answerBlock || itemNames.length === 0) return null;
                const n = itemNames.length;
                const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1.0));
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        const pairKey = `${itemNames[i]} vs ${itemNames[j]}`;
                        const reversePairKey = `${itemNames[j]} vs ${itemNames[i]}`;
                        let value = 1.0;

                        if (answerBlock[pairKey] !== undefined) {
                            const rawValue = answerBlock[pairKey];
                            value = rawValue > 0 ? rawValue : 1 / Math.abs(rawValue);
                        } else if (answerBlock[reversePairKey] !== undefined) {
                            const rawValue = answerBlock[reversePairKey];
                            value = rawValue > 0 ? 1 / rawValue : Math.abs(rawValue);
                        }
                        
                        if (value === 0) value = 1;

                        matrix[i][j] = value;
                        matrix[j][i] = 1 / value;
                    }
                }
                return matrix;
            };

            const processHierarchyForMatrices = (nodes: Criterion[], matrices: { [key: string]: number[][][] }, respAnswers: any) => {
                const mainCriteriaNames = nodes.map(n => n.name);
                if (mainCriteriaNames.length > 1) {
                    const matrix = buildMatrix(respAnswers['criteria'], mainCriteriaNames);
                    if (matrix) {
                        if (!matrices['criteria']) matrices['criteria'] = [];
                        matrices['criteria'].push(matrix);
                    }
                }
                
                nodes.forEach(node => {
                    if (node.subCriteria && node.subCriteria.length > 1) {
                        const subCriteriaNames = node.subCriteria.map(sc => sc.name);
                        const matrixKey = `sub_criteria_${node.id}`;
                        const matrix = buildMatrix(respAnswers[matrixKey], subCriteriaNames);
                        if (matrix) {
                           if (!matrices[matrixKey]) matrices[matrixKey] = [];
                           matrices[matrixKey].push(matrix);
                        }
                    }
                    
                    const isLeaf = !node.subCriteria || node.subCriteria.length === 0;
                    if (isLeaf && ahpQuestion.alternatives && ahpQuestion.alternatives.length > 1) {
                        const matrixKey = `alt_${node.id}`;
                        const matrix = buildMatrix(respAnswers[matrixKey], ahpQuestion.alternatives);
                         if (matrix) {
                           if (!matrices[matrixKey]) matrices[matrixKey] = [];
                           matrices[matrixKey].push(matrix);
                        }
                    }
                });
            };

            responses.forEach(resp => {
                const answerData = (resp.answers as any)[ahpQuestion.id];
                if (answerData && typeof(answerData) === 'object' && ahpQuestion.criteria) {
                    processHierarchyForMatrices(ahpQuestion.criteria, aggregatedMatrices, answerData);
                }
            });
            
            if (Object.keys(aggregatedMatrices).length === 0) {
                throw new Error("No valid AHP comparison data found in the responses.");
            }
            
            const buildHierarchyForBackend = (nodes: Criterion[], parentId: string | null = null): any[] => {
                return nodes.map(node => {
                    const hierarchyNode: any = { id: node.id, name: node.name };
                     if (parentId) {
                        hierarchyNode.parent_id = parentId;
                    }
                    if (node.subCriteria && node.subCriteria.length > 0) {
                        hierarchyNode.nodes = buildHierarchyForBackend(node.subCriteria, node.id);
                    }
                    return hierarchyNode;
                });
            };

            const hierarchy = ahpQuestion.criteria ? [{
                name: ahpQuestion.title || 'Goal',
                id: 'goal',
                nodes: buildHierarchyForBackend(ahpQuestion.criteria)
            }] : [];

            const requestBody = {
                hierarchy: hierarchy,
                alternatives: ahpQuestion.alternatives,
                matrices: aggregatedMatrices,
                goal: ahpQuestion.title
            };

            const response = await fetch(`/api/analysis/ahp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Failed to fetch AHP results');
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.details || data.error);
            }
            setResults(data.results);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            toast({
                title: "Error fetching AHP results",
                description: err.message,
                variant: "destructive"
            });
            console.error('Error fetching AHP results:', err);
        } finally {
            setLoading(false);
        }
    }, [survey, responses, toast]);
  
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mb-6"></div>
                    <p className="text-gray-700 text-xl font-medium">Analyzing AHP data...</p>
                    <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
                <Card className="bg-red-50 border-2 border-red-300 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-red-800 flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6" />
                            Analysis Error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-700 mb-4">{error}</p>
                        <button 
                            onClick={handleAnalysis} 
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                        >
                            Retry Analysis
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
                <Card className="bg-yellow-50 border-2 border-yellow-300 shadow-lg">
                    <CardContent className="p-12 text-center">
                        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
                        <p className="text-gray-700 text-lg">No results available</p>
                        <p className="text-gray-500 mt-2">Please ensure there is sufficient response data</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <AHPResultsVisualization results={results} />;
}