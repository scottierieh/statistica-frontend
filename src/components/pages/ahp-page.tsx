'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2, TrendingUp, Target, Award, Info } from 'lucide-react';


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
    const showConsistency = consistency && data.length > 2;

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
    const [showSensitivity, setShowSensitivity] = useState(false);
    const [sensitivityData, setSensitivityData] = useState<any[]>([]);
    
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
        if (!results?.final_scores && results?.alternatives_analysis && results?.weights) {
            const alternatives = new Set<string>();
            const scores: { [key: string]: number } = {};
            
            Object.values(results.alternatives_analysis).forEach((criterion: any) => {
                if (criterion.weights) {
                    Object.keys(criterion.weights).forEach(alt => alternatives.add(alt));
                }
            });
            
            alternatives.forEach(alt => scores[alt] = 0);
            
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

    // 새로운 기능 1: 가중치 분포 분석
    const weightDistributionAnalysis = useMemo(() => {
        if (!mainCriteriaData.length) return null;
        
        const weights = mainCriteriaData.map(d => parseFloat(d.weight));
        const max = Math.max(...weights);
        const min = Math.min(...weights);
        const range = max - min;
        const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
        const stdDev = Math.sqrt(weights.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / weights.length);
        
        return {
            max,
            min,
            range,
            average: avg,
            stdDev,
            concentration: range > 30 ? 'High' : range > 15 ? 'Medium' : 'Low'
        };
    }, [mainCriteriaData]);

    // 새로운 기능 2: 대안별 강점/약점 분석
    const alternativeStrengthsWeaknesses = useMemo(() => {
        if (!results?.alternatives_analysis || !finalScoresData.length) return [];
        
        return finalScoresData.map((alt: any) => {
            const strengths: string[] = [];
            const weaknesses: string[] = [];
            
            Object.entries(results.alternatives_analysis).forEach(([criterion, analysis]: [string, any]) => {
                if (analysis.weights && analysis.weights[alt.name]) {
                    const altWeight = analysis.weights[alt.name];
                    const allWeights = Object.values(analysis.weights) as number[];
                    const maxWeight = Math.max(...allWeights);
                    const avgWeight = allWeights.reduce((a: number, b: number) => a + b, 0) / allWeights.length;
                    
                    if (altWeight === maxWeight) {
                        strengths.push(criterion);
                    } else if (altWeight < avgWeight * 0.8) {
                        weaknesses.push(criterion);
                    }
                }
            });
            
            return {
                name: alt.name,
                strengths,
                weaknesses,
                strengthCount: strengths.length,
                weaknessCount: weaknesses.length
            };
        });
    }, [results, finalScoresData]);

    // 새로운 기능 4: 일관성 점수 요약
    const consistencySummary = useMemo(() => {
        const consistencies: any[] = [];
        
        if (results?.consistency) {
            consistencies.push({ name: 'Main Criteria', ...results.consistency });
        }
        
        if (results?.sub_criteria_analysis) {
            Object.entries(results.sub_criteria_analysis).forEach(([name, analysis]: [string, any]) => {
                if (analysis.consistency) {
                    consistencies.push({ name: `Sub: ${name}`, ...analysis.consistency });
                }
            });
        }
        
        if (results?.alternatives_analysis) {
            Object.entries(results.alternatives_analysis).forEach(([name, analysis]: [string, any]) => {
                if (analysis.consistency) {
                    consistencies.push({ name: `Alt: ${name}`, ...analysis.consistency });
                }
            });
        }
        
        const avgCR = consistencies.length > 0 
            ? consistencies.reduce((sum, c) => sum + c.CR, 0) / consistencies.length 
            : 0;
        
        const allConsistent = consistencies.every(c => c.is_consistent);
        
        return {
            consistencies,
            averageCR: avgCR,
            allConsistent,
            count: consistencies.length
        };
    }, [results]);

    // 새로운 기능 6: 점수 갭 분석
    const scoreGapAnalysis = useMemo(() => {
        if (finalScoresData.length < 2) return null;
        
        const gaps: any[] = [];
        for (let i = 0; i < finalScoresData.length - 1; i++) {
            const current = parseFloat(finalScoresData[i].score);
            const next = parseFloat(finalScoresData[i + 1].score);
            const gap = current - next;
            const gapPercent = (gap / current * 100).toFixed(1);
            
            gaps.push({
                between: `${finalScoresData[i].name} - ${finalScoresData[i + 1].name}`,
                gap: gap.toFixed(1),
                gapPercent,
                significance: gap > 10 ? 'Significant' : gap > 5 ? 'Moderate' : 'Small'
            });
        }
        
        return gaps;
    }, [finalScoresData]);

    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    AHP Analysis Results
                </h1>
                <p className="text-gray-600">Analytic Hierarchy Process - Decision Making Analysis</p>
            </div>

            {/* 새로운 기능: 전체 요약 대시보드 */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Card className="shadow-lg border-2 border-blue-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="h-8 w-8 text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900">Best Alternative</h3>
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{finalScoresData[0]?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600 mt-1">Score: {finalScoresData[0]?.score}%</p>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-green-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <h3 className="text-lg font-bold text-gray-900">Consistency</h3>
                        </div>
                        <p className="text-3xl font-bold text-green-600">
                            {consistencySummary.allConsistent ? 'Pass' : 'Fail'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            Avg CR: {(consistencySummary.averageCR * 100).toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-purple-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Target className="h-8 w-8 text-purple-600" />
                            <h3 className="text-lg font-bold text-gray-900">Weight Focus</h3>
                        </div>
                        <p className="text-3xl font-bold text-purple-600">
                            {weightDistributionAnalysis?.concentration || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            Range: {weightDistributionAnalysis?.range.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>
            
            <Card className="mb-6 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardTitle className="text-2xl">Main Criteria</CardTitle>
                    <CardDescription className="text-blue-100">Priority weights for decision factors</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {renderBarChart("Main Criteria Weights", mainCriteriaData, results.consistency)}
                    
                    {/* 새로운 기능: 가중치 분포 통계 */}
                    {weightDistributionAnalysis && (
                        <Card className="mt-6 bg-gray-50">
                            <CardContent className="p-4">
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Weight Distribution Statistics
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Maximum</p>
                                        <p className="text-xl font-bold text-blue-600">{weightDistributionAnalysis.max.toFixed(1)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Minimum</p>
                                        <p className="text-xl font-bold text-blue-600">{weightDistributionAnalysis.min.toFixed(1)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Average</p>
                                        <p className="text-xl font-bold text-blue-600">{weightDistributionAnalysis.average.toFixed(1)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Std. Dev</p>
                                        <p className="text-xl font-bold text-blue-600">{weightDistributionAnalysis.stdDev.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <Alert className="mt-4 bg-blue-50 border-blue-200">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        {weightDistributionAnalysis.concentration === 'High' && 
                                            'High concentration indicates one or few criteria dominate the decision.'}
                                        {weightDistributionAnalysis.concentration === 'Medium' && 
                                            'Medium concentration suggests balanced importance across criteria.'}
                                        {weightDistributionAnalysis.concentration === 'Low' && 
                                            'Low concentration means criteria have similar importance levels.'}
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>

            {/* 새로운 기능: 일관성 요약 카드 */}
            {consistencySummary.count > 0 && (
                <Card className="mb-6 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <CheckCircle className="h-6 w-6" />
                            Consistency Analysis Summary
                        </CardTitle>
                        <CardDescription className="text-teal-100">
                            Overview of all consistency ratios
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            {consistencySummary.consistencies.map((c: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium text-gray-900">{c.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg font-bold ${c.is_consistent ? 'text-green-600' : 'text-red-600'}`}>
                                            {(c.CR * 100).toFixed(1)}%
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${c.is_consistent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {c.is_consistent ? '✓' : '✗'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Alert className={`mt-4 ${consistencySummary.allConsistent ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                            <CheckCircle className={`h-4 w-4 ${consistencySummary.allConsistent ? 'text-green-600' : 'text-yellow-600'}`} />
                            <AlertDescription>
                                {consistencySummary.allConsistent 
                                    ? `All ${consistencySummary.count} comparisons are consistent (CR < 10%). Results are reliable.`
                                    : `Some comparisons have high CR values. Consider reviewing those judgments.`}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

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



            {/* 새로운 기능: 기준별 대안 점수 상세 */}
            {results.alternatives_analysis && Object.keys(results.alternatives_analysis).length > 0 && finalScoresData.length > 0 && (
                <Card className="shadow-lg mb-6">
                    <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                        <CardTitle className="text-2xl">Detailed Scores by Criterion</CardTitle>
                        <CardDescription className="text-cyan-100">
                            How each alternative performs across different criteria
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-3 text-left font-bold text-gray-900 border">Alternative</th>
                                        {Object.keys(results.alternatives_analysis).map((criterion: string) => (
                                            <th key={criterion} className="p-3 text-center font-bold text-gray-900 border">
                                                {criterion}
                                                <div className="text-xs font-normal text-gray-600 mt-1">
                                                    ({((results.weights?.[criterion] || 0) * 100).toFixed(1)}%)
                                                </div>
                                            </th>
                                        ))}
                                        <th className="p-3 text-center font-bold text-blue-900 border bg-blue-50">
                                            Weighted Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finalScoresData.map((alt: any, altIdx: number) => {
                                        // Calculate weighted total for this alternative
                                        let weightedTotal = 0;
                                        Object.entries(results.alternatives_analysis).forEach(([criterion, analysis]: [string, any]) => {
                                            const criterionWeight = results.weights?.[criterion] || 0;
                                            const altScore = analysis.weights?.[alt.name] || 0;
                                            weightedTotal += criterionWeight * altScore;
                                        });

                                        return (
                                            <tr key={altIdx} className={`hover:bg-gray-50 ${altIdx === 0 ? 'bg-yellow-50' : ''}`}>
                                                <td className="p-3 font-semibold text-gray-900 border">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                                            altIdx === 0 ? 'bg-yellow-500' : 
                                                            altIdx === 1 ? 'bg-gray-400' : 
                                                            altIdx === 2 ? 'bg-orange-400' : 'bg-blue-500'
                                                        }`}>
                                                            {altIdx + 1}
                                                        </span>
                                                        {alt.name}
                                                    </div>
                                                </td>
                                                {Object.entries(results.alternatives_analysis).map(([criterion, analysis]: [string, any]) => {
                                                    const score = analysis.weights?.[alt.name] || 0;
                                                    const scorePercent = (score * 100).toFixed(1);
                                                    
                                                    // Find if this is the best score for this criterion
                                                    const allScores = Object.values(analysis.weights || {}) as number[];
                                                    const maxScore = Math.max(...allScores);
                                                    const isBest = score === maxScore;
                                                    
                                                    // Calculate weighted contribution
                                                    const criterionWeight = results.weights?.[criterion] || 0;
                                                    const contribution = (criterionWeight * score * 100).toFixed(1);
                                                    
                                                    return (
                                                        <td key={criterion} className={`p-3 text-center border ${isBest ? 'bg-green-50' : ''}`}>
                                                            <div className={`font-bold ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                                                                {scorePercent}%
                                                            </div>
                                                            <div className="text-xs text-gray-600 mt-1">
                                                                +{contribution}
                                                            </div>
                                                            {isBest && (
                                                                <div className="text-xs text-green-600 font-semibold mt-1">
                                                                    ★ Best
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-3 text-center font-bold text-blue-900 border bg-blue-50">
                                                    {(weightedTotal * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        <Alert className="mt-6 bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                                <strong>How to read:</strong> Each cell shows the alternative's performance score for that criterion. 
                                The small number below shows the weighted contribution to the final score. 
                                Green highlighting indicates the best performer for each criterion.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* 새로운 기능: 강점/약점 분석 */}
            {alternativeStrengthsWeaknesses.length > 0 && (
                <Card className="shadow-lg mb-6">
                    <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                        <CardTitle className="text-2xl">Strengths & Weaknesses Analysis</CardTitle>
                        <CardDescription className="text-amber-100">
                            Identify where each alternative excels or needs improvement
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {alternativeStrengthsWeaknesses.map((alt: any, idx: number) => (
                                <Card key={idx} className="bg-gray-50">
                                    <CardContent className="p-4">
                                        <h4 className="text-lg font-bold text-gray-900 mb-3">{alt.name}</h4>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                    <span className="font-semibold text-green-700">
                                                        Strengths ({alt.strengthCount})
                                                    </span>
                                                </div>
                                                {alt.strengths.length > 0 ? (
                                                    <ul className="space-y-1">
                                                        {alt.strengths.map((s: string, i: number) => (
                                                            <li key={i} className="text-sm text-gray-700 pl-4">
                                                                • {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-gray-500 pl-4">No dominant strengths</p>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                                    <span className="font-semibold text-amber-700">
                                                        Weaknesses ({alt.weaknessCount})
                                                    </span>
                                                </div>
                                                {alt.weaknesses.length > 0 ? (
                                                    <ul className="space-y-1">
                                                        {alt.weaknesses.map((w: string, i: number) => (
                                                            <li key={i} className="text-sm text-gray-700 pl-4">
                                                                • {w}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-gray-500 pl-4">No significant weaknesses</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
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
                        
                        {/* 새로운 기능: 점수 갭 분석 */}
                        {scoreGapAnalysis && scoreGapAnalysis.length > 0 && (
                            <Card className="mt-6 bg-gray-50">
                                <CardContent className="p-4">
                                    <h4 className="font-bold text-gray-900 mb-3">Score Gap Analysis</h4>
                                    <div className="space-y-2">
                                        {scoreGapAnalysis.map((gap: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                                                <span className="text-sm text-gray-700">{gap.between}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-blue-600">{gap.gap}%</span>
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                        gap.significance === 'Significant' ? 'bg-red-100 text-red-800' :
                                                        gap.significance === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                        {gap.significance}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
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

            {/* 새로운 기능: 민감도 분석 - 인터랙티브 가중치 조정 패널 */}
            {mainCriteriaData.length > 0 && finalScoresData.length > 0 && (
                <Card className="shadow-lg mt-6">
                    <CardHeader className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
                        <CardTitle className="text-2xl">Interactive Sensitivity Analysis</CardTitle>
                        <CardDescription className="text-pink-100">
                            Adjust criteria weights and see real-time ranking changes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {!showSensitivity ? (
                            <div className="text-center py-8">
                                <button
                                    onClick={() => {
                                        setShowSensitivity(true);
                                        // Initialize with current weights
                                        const initialData = mainCriteriaData.map(c => ({
                                            name: c.name,
                                            weight: parseFloat(c.weight)
                                        }));
                                        setSensitivityData(initialData);
                                    }}
                                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition font-semibold shadow-lg"
                                >
                                    Open Interactive Panel
                                </button>
                                <p className="text-sm text-gray-600 mt-3">
                                    Adjust criteria weights with sliders and observe real-time changes
                                </p>
                            </div>
                        ) : (
                            <div>
                                <Alert className="mb-6 bg-blue-50 border-blue-200">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        Use the sliders below to adjust criteria weights. The total must equal 100%. 
                                        Rankings will update automatically as you make changes.
                                    </AlertDescription>
                                </Alert>

                                {/* Weight Adjustment Panel */}
                                <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">🎚️ Adjust Criteria Weights</h3>
                                    
                                    <div className="space-y-6">
                                        {sensitivityData.map((criterion: any, idx: number) => (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="font-semibold text-gray-900">
                                                        {criterion.name}
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                            value={criterion.weight.toFixed(1)}
                                                            onChange={(e) => {
                                                                const newWeight = parseFloat(e.target.value) || 0;
                                                                const newData = [...sensitivityData];
                                                                newData[idx].weight = Math.min(100, Math.max(0, newWeight));
                                                                setSensitivityData(newData);
                                                            }}
                                                            className="w-20 px-3 py-1 border-2 border-gray-300 rounded-lg text-center font-bold text-blue-600"
                                                        />
                                                        <span className="text-gray-600 font-semibold">%</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="0.5"
                                                    value={criterion.weight}
                                                    onChange={(e) => {
                                                        const newWeight = parseFloat(e.target.value);
                                                        const newData = [...sensitivityData];
                                                        newData[idx].weight = newWeight;
                                                        setSensitivityData(newData);
                                                    }}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                    style={{
                                                        background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${criterion.weight}%, #e5e7eb ${criterion.weight}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total Weight Display */}
                                    <div className="mt-6 pt-4 border-t-2 border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-gray-900">Total Weight:</span>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-2xl font-bold ${
                                                    Math.abs(sensitivityData.reduce((sum: number, c: any) => sum + c.weight, 0) - 100) < 0.5 
                                                        ? 'text-green-600' 
                                                        : 'text-red-600'
                                                }`}>
                                                    {sensitivityData.reduce((sum: number, c: any) => sum + c.weight, 0).toFixed(1)}%
                                                </span>
                                                {Math.abs(sensitivityData.reduce((sum: number, c: any) => sum + c.weight, 0) - 100) < 0.5 ? (
                                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                                ) : (
                                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 flex gap-3">
                                        <button
                                            onClick={() => {
                                                // Normalize weights to 100%
                                                const total = sensitivityData.reduce((sum: number, c: any) => sum + c.weight, 0);
                                                if (total > 0) {
                                                    const normalized = sensitivityData.map((c: any) => ({
                                                        ...c,
                                                        weight: (c.weight / total) * 100
                                                    }));
                                                    setSensitivityData(normalized);
                                                }
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                                        >
                                            Normalize to 100%
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Reset to original weights
                                                const initialData = mainCriteriaData.map(c => ({
                                                    name: c.name,
                                                    weight: parseFloat(c.weight)
                                                }));
                                                setSensitivityData(initialData);
                                            }}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                                        >
                                            Reset to Original
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Equal distribution
                                                const equalWeight = 100 / sensitivityData.length;
                                                const equalData = sensitivityData.map((c: any) => ({
                                                    ...c,
                                                    weight: equalWeight
                                                }));
                                                setSensitivityData(equalData);
                                            }}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                                        >
                                            Equal Weights
                                        </button>
                                    </div>
                                </div>

                                {/* Recalculated Rankings */}
                                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                                        📊 Updated Rankings
                                        {Math.abs(sensitivityData.reduce((sum: number, c: any) => sum + c.weight, 0) - 100) >= 0.5 && (
                                            <span className="ml-3 text-sm text-red-600">
                                                (Total ≠ 100% - Results may be inaccurate)
                                            </span>
                                        )}
                                    </h3>
                                    
                                    {(() => {
                                        // Recalculate final scores with adjusted weights
                                        const adjustedWeights: any = {};
                                        sensitivityData.forEach((c: any) => {
                                            adjustedWeights[c.name] = c.weight / 100;
                                        });

                                        const recalculatedScores = finalScoresData.map((alt: any) => {
                                            let newScore = 0;
                                            Object.entries(results.alternatives_analysis || {}).forEach(([criterion, analysis]: [string, any]) => {
                                                const criterionWeight = adjustedWeights[criterion] || 0;
                                                const altWeight = analysis.weights?.[alt.name] || 0;
                                                newScore += criterionWeight * altWeight;
                                            });
                                            return {
                                                name: alt.name,
                                                originalScore: parseFloat(alt.score),
                                                newScore: newScore * 100,
                                                change: (newScore * 100) - parseFloat(alt.score)
                                            };
                                        }).sort((a, b) => b.newScore - a.newScore);

                                        return (
                                            <div className="space-y-3">
                                                {recalculatedScores.map((alt: any, idx: number) => {
                                                    // Find original rank
                                                    const originalRank = finalScoresData.findIndex((o: any) => o.name === alt.name) + 1;
                                                    const newRank = idx + 1;
                                                    const rankChange = originalRank - newRank;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`p-4 rounded-lg border-2 transition-all ${
                                                                idx === 0 ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-400' :
                                                                'bg-white border-gray-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                                                                        idx === 0 ? 'bg-yellow-500 text-white' :
                                                                        idx === 1 ? 'bg-gray-400 text-white' :
                                                                        idx === 2 ? 'bg-orange-400 text-white' :
                                                                        'bg-blue-500 text-white'
                                                                    }`}>
                                                                        {newRank}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-gray-900">{alt.name}</h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            {rankChange !== 0 && (
                                                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                                                                    rankChange > 0 ? 'bg-green-100 text-green-700' :
                                                                                    'bg-red-100 text-red-700'
                                                                                }`}>
                                                                                    {rankChange > 0 ? `↑ +${rankChange}` : `↓ ${rankChange}`}
                                                                                </span>
                                                                            )}
                                                                            {rankChange === 0 && (
                                                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                                                                    → Same
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-bold text-blue-600">
                                                                        {alt.newScore.toFixed(1)}%
                                                                    </p>
                                                                    <p className={`text-sm font-semibold ${
                                                                        alt.change > 0 ? 'text-green-600' :
                                                                        alt.change < 0 ? 'text-red-600' :
                                                                        'text-gray-600'
                                                                    }`}>
                                                                        {alt.change > 0 ? '+' : ''}{alt.change.toFixed(1)}%
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
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

