
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, HelpCircle, MoveRight } from 'lucide-react';
import type { Survey, SurveyResponse, Question, Criterion } from '@/types/survey';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AHPResultsVisualization = ({ results }: { results: any }) => {
  const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

  const criteriaData = useMemo(() => (
    results.criteria_analysis?.weights
      ? Object.entries(results.criteria_analysis.weights).map(([name, weight]: [string, any]) => ({
        name,
        weight: (weight * 100).toFixed(1),
        weightValue: weight
      })).sort((a, b) => b.weightValue - a.weightValue)
      : []
  ), [results]);

  const alternativesByCriterion = useMemo(() => (
    results.alternative_weights_by_criterion
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
      : []
  ), [results]);

  const finalScoresData = useMemo(() => (
    results.final_scores?.map((item: any) => ({
      name: item.name,
      score: (item.score * 100).toFixed(1),
      scoreValue: item.score
    })) || []
  ), [results]);

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
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              results.criteria_analysis.consistency.is_consistent
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
              }`}>
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
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Detailed Criteria Weights</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary/10">
                  <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">Rank</th>
                  <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">Criterion</th>
                  <th className="border border-border px-4 py-2 text-right font-semibold text-foreground">Weight</th>
                  <th className="border border-border px-4 py-2 text-right font-semibold text-foreground">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {criteriaData.map((item, index) => (
                  <tr key={index} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-border px-4 py-2 text-center font-semibold text-primary">
                      {index + 1}
                    </td>
                    <td className="border border-border px-4 py-2 font-medium">{item.name}</td>
                    <td className="border border-border px-4 py-2 text-right font-mono">
                      {item.weightValue.toFixed(4)}
                    </td>
                    <td className="border border-border px-4 py-2 text-right">
                      <span className="font-semibold text-primary">{item.weight}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {alternativesByCriterion.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Alternative Weights by Criterion</h2>
          <p className="text-gray-600 text-sm mb-6">
            These charts show how each alternative performs under each specific criterion.
            The weights represent the relative preference for each alternative when evaluated solely on that criterion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alternativesByCriterion.map((item, idx) => (
              <div key={idx} className="border-2 border-primary/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{item.criterion}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${item.isConsistent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
                <div className="mt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1 font-semibold text-gray-600">Alternative</th>
                        <th className="text-right py-1 font-semibold text-gray-600">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.alternatives.map((alt: any, altIdx: number) => (
                        <tr key={altIdx} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-1 text-gray-700">{alt.name}</td>
                          <td className="py-1 text-right font-semibold text-primary">{alt.weight}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  
    useEffect(() => {
      const fetchResults = async () => {
        try {
          setLoading(true);
          
          const ahpQuestion = survey.questions.find(q => q.type === 'ahp');
          if (!ahpQuestion) {
              throw new Error("AHP Question not found in survey definition.");
          }
          
          const aggregatedMatrices: {[key: string]: any[]} = {};
          responses.forEach(resp => {
              const answerData = (resp.answers as any)[ahpQuestion.id];
              if(answerData) {
                   for (const key in answerData) {
                      if(!aggregatedMatrices[key]) aggregatedMatrices[key] = [];
                      const matrix = Object.values(answerData[key]);
                      aggregatedMatrices[key].push(matrix);
                  }
              }
          });
  
          const hierarchy = ahpQuestion.criteria ? [{
              name: ahpQuestion.title || 'Goal',
              nodes: ahpQuestion.criteria.map(c => {
                  const node: any = { name: c.name };
                  if (c.subCriteria && c.subCriteria.length > 0) {
                      node.nodes = c.subCriteria.map(sc => ({ name: sc.name }));
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
          })
          console.error('Error fetching AHP results:', err);
        } finally {
          setLoading(false);
        }
      };
  
      if (survey && responses) {
        fetchResults();
      }
    }, [survey, responses, toast]);
  
    if (loading) {
      return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
            <p className="text-muted-foreground text-lg">Loading AHP analysis results...</p>
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
              onClick={() => window.location.reload()} 
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
            <p className="text-gray-600 text-lg">No results available. Please ensure there are survey responses to analyze.</p>
          </div>
        </div>
      );
    }
  
    return <AHPResultsVisualization results={results} />;
}
