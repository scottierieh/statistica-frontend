
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AHPResultsVisualization = ({ results }: { results: any }) => {
    const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

    const criteriaData = results.criteria_analysis?.weights
        ? Object.entries(results.criteria_analysis.weights).map(([name, weight]: [string, any]) => ({
            name,
            weight: (weight * 100).toFixed(1),
            weightValue: weight
        })).sort((a, b) => b.weightValue - a.weightValue)
        : [];

    const alternativesBycriterion = results.alternative_weights_by_criterion
        ? Object.entries(results.alternative_weights_by_criterion).map(([criterion, data]: [string, any]) => ({
            criterion,
            alternatives: Object.entries(data.weights).map(([name, weight]: [string, any]) => ({
                name,
                weight: (weight * 100).toFixed(1),
                weightValue: weight
            })),
            cr: data.consistency.CR,
            isConsistent: data.consistency.is_consistent
        }))
        : [];

    const finalScoresData = results.final_scores?.map((item: any) => ({
        name: item.name,
        score: (item.score * 100).toFixed(1),
        scoreValue: item.score
    })) || [];

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
        <div className="w-full max-w-7xl mx-auto p-6 bg-slate-50 rounded-xl">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                AHP Analysis Results
            </h1>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Criteria Weights</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            CR: <span className={`font-bold ${results.criteria_analysis.consistency.CR < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                                {(results.criteria_analysis.consistency.CR * 100).toFixed(2)}%
                            </span>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${results.criteria_analysis.consistency.is_consistent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {results.criteria_analysis.consistency.is_consistent ? '✓ Consistent' : '✗ Inconsistent'}
                        </span>
                    </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                    The criteria weights represent the relative importance of each evaluation criterion in the decision-making process.
                    Higher weights indicate more influential criteria in the final decision.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={criteriaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
                        <YAxis label={{ value: 'Weight (%)', angle: -90, position: 'insideLeft', fill: '#4b5563' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="weight" radius={[8, 8, 0, 0]}>
                            {criteriaData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {finalScoresData.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Final Ranking</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        The final scores are calculated by combining the criteria weights with each alternative's performance across all criteria.
                        This represents the overall preference ranking based on the complete AHP analysis.
                    </p>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={finalScoresData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" label={{ value: 'Final Score (%)', position: 'insideBottom', offset: -5, fill: '#4b5563' }} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip />} />
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
                </div>
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

        try {
            setLoading(true);
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

            const getItemsForMatrix = (key: string, criteria: Criterion[], alternatives: string[]) => {
                if (key === 'criteria' || key === 'goal') return criteria;
                if (key.startsWith('alt_')) {
                    const critId = key.substring(4);
                    const crit = findCriterion(critId, criteria);
                    if (crit?.subCriteria && crit.subCriteria.length > 0) {
                        return crit.subCriteria;
                    }
                    return alternatives;
                }
                const subCritMatch = key.match(/^sub_criteria_(.*)$/);
                if (subCritMatch) {
                    const parentId = subCritMatch[1];
                    const parent = findCriterion(parentId, criteria);
                    return parent?.subCriteria || [];
                }
                return [];
            };

            responses.forEach(resp => {
                const answerData = (resp.answers as any)[ahpQuestion.id];
                if (!answerData || typeof answerData !== 'object') return;
                
                Object.entries(answerData).forEach(([matrixKey, matrixValues]: [string, any]) => {
                    const items = getItemsForMatrix(matrixKey, ahpQuestion.criteria || [], ahpQuestion.alternatives || []);
                    if (!items || items.length < 2) return;
                    const itemNames = items.map(i => typeof i === 'string' ? i : i.name);
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
                });
            });

            if (Object.keys(aggregatedMatrices).length === 0) {
                throw new Error("No valid AHP comparison data found in the responses.");
            }
            
            const hierarchy = ahpQuestion.criteria ? [{
                name: ahpQuestion.title || 'Goal',
                nodes: ahpQuestion.criteria.map(c => {
                    const node: any = { name: c.name, id: c.id };
                    if (c.subCriteria && c.subCriteria.length > 0) {
                        node.nodes = c.subCriteria.map(sc => ({ name: sc.name, id: sc.id }));
                    }
                    return node;
                })
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
