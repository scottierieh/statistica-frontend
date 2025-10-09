
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const renderBarChart = (title: string, data: any[], consistency: any) => {
    const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border-2 border-primary/30 rounded-lg shadow-lg">
                    <p className="font-semibold text-foreground">{payload[0].payload.name}</p>
                    <p className="text-primary font-bold">{payload[0].value}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                {consistency && (
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            CR: <span className={`font-bold ${consistency.CR < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                                {(consistency.CR * 100).toFixed(2)}%
                            </span>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${consistency.is_consistent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {consistency.is_consistent ? '✓ Consistent' : '✗ Inconsistent'}
                        </span>
                    </div>
                )}
            </div>
            <p className="text-gray-600 text-sm mb-4">
                The weights represent the relative importance of each item within this category.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
                        <YAxis label={{ value: 'Weight (%)', angle: -90, position: 'insideLeft', fill: '#4b5563' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="weight" radius={[8, 8, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Weight (%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right font-mono">{item.weight}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};


const AHPResultsVisualization = ({ results }: { results: any }) => {
    const mainCriteriaData = useMemo(() => {
        if (!results?.criteria_analysis?.weights) return [];
        
        const mainCriteriaKeys = Object.keys(results.criteria_analysis.weights);

        return mainCriteriaKeys.map(name => ({
            name,
            weight: ((results.criteria_analysis.weights[name] as number) * 100).toFixed(1),
            weightValue: results.criteria_analysis.weights[name] as number
        })).sort((a,b) => b.weightValue - a.weightValue);

    }, [results]);
    
    const finalScoresData = useMemo(() => (results?.final_scores?.map((item: any) => ({
        name: item.name,
        score: (item.score * 100).toFixed(1),
        scoreValue: item.score
    })).sort((a: any, b: any) => b.scoreValue - a.scoreValue) || []), [results]);
    
    const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

    const renderHierarchicalCharts = (data: any) => {
        if (!data) return null;
    
        const subCriteriaAnalyses = data.sub_criteria_analysis ? Object.entries(data.sub_criteria_analysis) : [];
        
        return (
            <div>
                 {mainCriteriaData.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Main Criteria Weights</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {renderBarChart("Main Criteria", mainCriteriaData, results.criteria_analysis.consistency)}
                        </CardContent>
                    </Card>
                )}
                
                {subCriteriaAnalyses.length > 0 && subCriteriaAnalyses.map(([parentCriterion, subAnalysis]: [string, any]) => (
                     <Card key={parentCriterion} className="mb-6">
                        <CardHeader>
                            <CardTitle>Sub-Criteria for &quot;{parentCriterion}&quot;</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderBarChart(
                                `Weights within "${parentCriterion}"`,
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

                 {data.alternatives_analysis && Object.keys(data.alternatives_analysis).length > 0 && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Alternative Performance by Criterion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {Object.entries(data.alternatives_analysis).map(([criterion, altAnalysis]: [string, any]) => (
                                <div key={criterion} className="mt-4">
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
            </div>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-slate-50 rounded-xl">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                AHP Analysis Results
            </h1>
            
            {renderHierarchicalCharts(results)}
            
            {finalScoresData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Final Ranking of Alternatives</CardTitle>
                        <CardDescription>
                            The final scores are calculated by combining all criteria and sub-criteria weights with each alternative's performance across all criteria.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={finalScoresData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis type="number" label={{ value: 'Final Score (%)', position: 'insideBottom', offset: -5, fill: '#4b5563' }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} width={100} />
                                <Tooltip content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-3 border-2 border-primary/30 rounded-lg shadow-lg">
                                                <p className="font-semibold text-foreground">{payload[0].payload.name}</p>
                                                <p className="text-primary font-bold">{payload[0].value}%</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} />
                                <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                                    {finalScoresData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index === 0 ? '#fbbf24' : COLORS[index % COLORS.length]}
                                            stroke={index === 0 ? '#f59e0b' : 'none'}
                                            strokeWidth={index === 0 ? 3 : 0}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Alternative</TableHead>
                                        <TableHead className="text-right">Final Score (%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {finalScoresData.map((item, index) => (
                                        <TableRow key={index} className={index === 0 ? 'bg-yellow-50' : ''}>
                                            <TableCell className="font-bold">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right font-mono">{item.score}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
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
            
            const findCriterion = (id: string, criteriaList: Criterion[]): Criterion | null => {
                for (const crit of criteriaList) {
                    if (crit.id === id) return crit;
                    if (crit.subCriteria) {
                        const found = findCriterion(id, crit.subCriteria);
                        if (found) return found;
                    }
                }
                return null;
            };

            responses.forEach(resp => {
                const answerData = (resp.answers as any)[ahpQuestion.id];
                if (answerData && typeof answerData === 'object') {
                    for (const matrixKey in answerData) {
                        const matrixValues = answerData[matrixKey];
                        let items: { name: string; id: string }[] = [];

                        if (matrixKey === 'goal' || matrixKey === 'criteria') {
                            items = (ahpQuestion.criteria || []).map(c => ({ id: c.id, name: c.name }));
                        } else if (matrixKey.startsWith('sub_criteria_')) {
                            const parentId = matrixKey.replace('sub_criteria_', '');
                            const parentCriterion = findCriterion(parentId, ahpQuestion.criteria || []);
                            if (parentCriterion && parentCriterion.subCriteria) {
                                items = parentCriterion.subCriteria.map(sc => ({ id: sc.id, name: sc.name }));
                            }
                        } else if (matrixKey.startsWith('alt_')) {
                            items = (ahpQuestion.alternatives || []).map(alt => ({ id: alt, name: alt }));
                        }

                        if (!items.length) continue;

                        const itemNames = items.map(i => i.name);
                        const n = itemNames.length;
                        const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1.0));

                        for (let i = 0; i < n; i++) {
                            for (let j = i + 1; j < n; j++) {
                                const pairKey = `${itemNames[i]} vs ${itemNames[j]}`;
                                const reversePairKey = `${itemNames[j]} vs ${itemNames[i]}`;
                                let value = 1.0;

                                if (matrixValues[pairKey] !== undefined) {
                                    value = matrixValues[pairKey];
                                } else if (matrixValues[reversePairKey] !== undefined) {
                                    value = 1 / matrixValues[reversePairKey];
                                }
                                matrix[i][j] = value;
                                matrix[j][i] = 1 / value;
                            }
                        }
                        if (!aggregatedMatrices[matrixKey]) aggregatedMatrices[matrixKey] = [];
                        aggregatedMatrices[matrixKey].push(matrix);
                    }
                }
            });
            
            if (Object.keys(aggregatedMatrices).length === 0) {
                throw new Error("No valid AHP comparison data found in the responses.");
            }
            
            const buildHierarchy = (nodes: Criterion[], parentId: string | null = null): any[] => {
                return nodes.map(node => {
                    const hierarchyNode: any = { id: node.id, name: node.name };
                     if (parentId) {
                        hierarchyNode.parent_id = parentId;
                    }
                    if (node.subCriteria && node.subCriteria.length > 0) {
                        hierarchyNode.nodes = buildHierarchy(node.subCriteria, node.id);
                    }
                    return hierarchyNode;
                });
            };

            const hierarchy = ahpQuestion.criteria ? [{
                name: ahpQuestion.title || 'Goal',
                id: 'goal',
                nodes: buildHierarchy(ahpQuestion.criteria)
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
            <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading AHP analysis results...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Results</h2>
                    <p className="text-red-600">{error}</p>
                    <button 
                        onClick={handleAnalysis} 
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-gray-600 text-lg">No results available. This could be due to insufficient response data.</p>
                </div>
            </div>
        );
    }

    return <AHPResultsVisualization results={results} />;
}
