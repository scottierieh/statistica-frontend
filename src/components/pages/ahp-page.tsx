
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';


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

    const topItem = data.length > 0 ? data[0] : null;

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
            
            <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
                        <YAxis 
                        label={{ value: 'Weight (%)', angle: -90, position: 'insideLeft', fill: '#4b5563' }}
                        domain={[0, 100]}
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
             <Alert className="mt-4">
                {consistency?.is_consistent ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle>Interpretation</AlertTitle>
                <AlertDescription>
                    {topItem && `The most important item in this category is '${topItem.name}' with a weight of ${topItem.weight}%. `}
                    {consistency && `The Consistency Ratio (CR) is ${(consistency.CR * 100).toFixed(2)}%. Since this is ${consistency.is_consistent ? 'below 10%' : 'above 10%'}, the pairwise comparisons are considered ${consistency.is_consistent ? 'consistent and reliable' : 'inconsistent'}.`}
                </AlertDescription>
            </Alert>
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
        })).sort((a,b) => b.weightValue - a.weightValue);
    }, [results]);

    const subCriteriaAnalyses = useMemo(() => {
        if (!results?.sub_criteria_analysis) return [];
        return Object.entries(results.sub_criteria_analysis);
    }, [results]);
    
    const finalScoresData = useMemo(() => (results?.final_scores?.map((item: any) => ({
        name: item.name,
        score: (item.score * 100).toFixed(1),
        scoreValue: item.score
    })).sort((a: any, b: any) => b.scoreValue - a.scoreValue) || []), [results]);
    
    const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-slate-50 rounded-xl">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                AHP Analysis Results
            </h1>
            
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Main Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                    {renderBarChart("Main Criteria Weights", mainCriteriaData, results.consistency)}
                </CardContent>
            </Card>

            {subCriteriaAnalyses.length > 0 && subCriteriaAnalyses.map(([parentCriterion, subAnalysis]: [string, any]) => (
                <Card key={parentCriterion} className="mb-6">
                    <CardHeader>
                        <CardTitle>Sub-Criteria for &quot;{parentCriterion}&quot;</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                <Card>
                    <CardHeader>
                        <CardTitle>Alternative Performance by Criterion</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {Object.entries(results.alternatives_analysis).map(([criterion, altAnalysis]: [string, any]) => (
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
                                    {finalScoresData.map((entry: any, index: number) => (
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
                                    {finalScoresData.map((item: any, index: number) => (
                                        <TableRow key={index} className={index === 0 ? 'bg-yellow-50' : ''}>
                                            <TableCell className="font-bold">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right font-mono">{item.score}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {finalScoresData.length > 0 && (
                                 <Alert className="mt-4">
                                    <AlertTitle>Conclusion</AlertTitle>
                                    <AlertDescription>
                                        Based on the analysis, {finalScoresData[0].name} is the best alternative with a score of {finalScoresData[0].score}%.
                                    </AlertDescription>
                                </Alert>
                            )}
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
