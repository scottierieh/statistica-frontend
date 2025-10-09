'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Network, MoveRight } from 'lucide-react';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { Skeleton } from '../ui/skeleton';

const AHPResultsVisualization = ({ analysisResult }: { analysisResult: any }) => {
  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

  const criteriaData = Object.entries(analysisResult.criteria_analysis.weights).map(([name, weight]) => ({
    name,
    weight: ((weight as number) * 100),
    weightValue: weight
  })).sort((a:any, b:any) => b.weightValue - a.weightValue);

  const alternativesByCriterion = analysisResult.alternative_weights_by_criterion 
    ? Object.entries(analysisResult.alternative_weights_by_criterion).map(([criterion, data]: [string, any]) => ({
        criterion,
        alternatives: Object.entries(data.weights).map(([name, weight]) => ({
          name,
          weight: ((weight as number) * 100),
          weightValue: weight
        })),
        cr: data.consistency.CR,
        isConsistent: data.consistency.is_consistent
      }))
    : [];

  const finalScoresData = analysisResult.final_scores?.map((item: any) => ({
    name: item.name,
    score: (item.score * 100),
    scoreValue: item.score
  })) || [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-primary/20 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
          <p className="text-primary font-bold">{parseFloat(payload[0].value).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mx-auto p-6 bg-gradient-to-br from-primary/5 to-blue-50 rounded-xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        AHP Analysis Results
      </h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Criteria Weights</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              CR: <span className={`font-bold ${analysisResult.criteria_analysis.consistency.CR < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                {(analysisResult.criteria_analysis.consistency.CR * 100).toFixed(2)}%
              </span>
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              analysisResult.criteria_analysis.consistency.is_consistent 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {analysisResult.criteria_analysis.consistency.is_consistent ? '✓ Consistent' : '✗ Inconsistent'}
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={criteriaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
            <YAxis label={{ value: 'Weight (%)', angle: -90, position: 'insideLeft', fill: '#4b5563' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="weight" radius={[8, 8, 0, 0]}>
              {criteriaData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {alternativesByCriterion.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Alternative Weights by Criterion</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alternativesByCriterion.map((item, idx) => (
              <div key={idx} className="border-2 border-primary/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{item.criterion}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.isConsistent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    CR: {(item.cr * 100).toFixed(1)}%
                  </span>
                </div>
                
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={item.alternatives} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="weight" fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {finalScoresData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Final Ranking</h2>
          
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={finalScoresData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" label={{ value: 'Final Score (%)', position: 'insideBottom', offset: -5, fill: '#4b5563' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                {finalScoresData.map((_entry, index) => (
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

          <div className="mt-6 flex items-center justify-center">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-8 py-4 rounded-full shadow-lg">
              <span className="text-lg font-bold">🏆 Best Choice: </span>
              <span className="text-2xl font-extrabold">{analysisResult.ranking[0]}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-blue-900 mb-2">📊 Consistency Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-700">
              <span className="font-semibold">Criteria CR:</span>{' '}
              <span className={analysisResult.criteria_analysis.consistency.is_consistent ? 'text-green-600' : 'text-red-600'}>
                {(analysisResult.criteria_analysis.consistency.CR * 100).toFixed(2)}%
              </span>
              {analysisResult.criteria_analysis.consistency.is_consistent ? ' ✓' : ' ✗'}
            </p>
          </div>
          <div>
            <p className="text-gray-700">
              <span className="font-semibold">Note:</span> CR &lt; 10% is acceptable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AhpPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function AhpPage({ survey, responses }: AhpPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const ahpQuestion = survey.questions.find(q => q.type === 'ahp');
            if (!ahpQuestion || !ahpQuestion.criteria) {
                throw new Error("No AHP question with criteria found in this survey.");
            }

            const { criteria, alternatives } = ahpQuestion;
            const hasAlternatives = alternatives && alternatives.length > 0;
            
            const allRespondentMatrices: { [key: string]: number[][][] } = {};
            
            const criteriaNames = criteria.map(c => c.name);
            const initMatrix = (size: number) => Array(size).fill(0).map(() => Array(size).fill(1));

            allRespondentMatrices['goal'] = [];
            if(hasAlternatives) {
                criteriaNames.forEach(name => {
                    const matrixKey = `goal.${name}`;
                    allRespondentMatrices[matrixKey] = [];
                });
            }

            responses.forEach(response => {
                const answer = response.answers[ahpQuestion.id];
                if (!answer) return;

                if (answer['criteria']) {
                    const criteriaMatrix = initMatrix(criteriaNames.length);
                    for (let i = 0; i < criteriaNames.length; i++) {
                        for (let j = i; j < criteriaNames.length; j++) {
                             if (i === j) continue;
                            const pairKey = `${criteriaNames[i]} vs ${criteriaNames[j]}`;
                            const reversePairKey = `${criteriaNames[j]} vs ${criteriaNames[i]}`;
                            let value = answer['criteria'][pairKey] ?? (answer['criteria'][reversePairKey] ? 1 / answer['criteria'][reversePairKey] : 1);
                            if (value < 0) value = 1 / Math.abs(value);
                            criteriaMatrix[i][j] = value;
                            criteriaMatrix[j][i] = 1 / value;
                        }
                    }
                    allRespondentMatrices['goal'].push(criteriaMatrix);
                }

                if (hasAlternatives && alternatives) {
                    criteria.forEach(c => {
                        const crit = criteria.find(cr => cr.name === c.name);
                        if (!crit) return;
                        const matrixKey = `alt_${crit.id}`;
                         if (answer[matrixKey]) {
                            const altMatrix = initMatrix(alternatives.length);
                             for (let i = 0; i < alternatives.length; i++) {
                                for (let j = i; j < alternatives.length; j++) {
                                    if (i === j) continue;
                                    const pairKey = `${alternatives[i]} vs ${alternatives[j]}`;
                                    const reversePairKey = `${alternatives[j]} vs ${alternatives[i]}`;
                                    let value = answer[matrixKey][pairKey] ?? (answer[matrixKey][reversePairKey] ? 1 / answer[matrixKey][reversePairKey] : 1);
                                    if (value < 0) value = 1 / Math.abs(value);
                                    altMatrix[i][j] = value;
                                    altMatrix[j][i] = 1 / value;
                                }
                            }
                            const backendKey = `goal.${c.name}`;
                            if(allRespondentMatrices[backendKey]) {
                                allRespondentMatrices[backendKey].push(altMatrix);
                            }
                        }
                    });
                }
            });

            const payload = {
                goal: survey.title,
                alternatives: hasAlternatives ? alternatives : null,
                hierarchy: [{ id: 'level-0', name: 'Criteria', nodes: criteria.map(c => ({ id: c.id, name: c.name })) }],
                matrices: allRespondentMatrices,
            };

            const apiResponse = await fetch('/api/analysis/ahp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!apiResponse.ok) {
                const errorResult = await apiResponse.json();
                throw new Error(errorResult.error || `HTTP error! status: ${apiResponse.status}`);
            }

            const result = await apiResponse.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result.results);
            
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    if (isLoading || !analysisResult) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running AHP analysis...</p>
                </CardContent>
            </Card>
        );
    }
    
    return <AHPResultsVisualization analysisResult={analysisResult} />;
}
