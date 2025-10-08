'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Survey, SurveyResponse, Question } from '@/types/survey';

// --- Data Processing Functions ---
const processCategoricalResponses = (responses: SurveyResponse[], question: Question) => {
    const counts: { [key: string]: number } = {};
    const questionId = String(question.id);
    let totalResponses = 0;
    
    responses.forEach((response: any) => {
        const answer = response.answers[questionId];
        if (answer) {
             totalResponses++;
            if (Array.isArray(answer)) {
                answer.forEach(opt => {
                    counts[opt] = (counts[opt] || 0) + 1;
                });
            } else {
                counts[String(answer)] = (counts[String(answer)] || 0) + 1;
            }
        }
    });

    return (question.options || question.scale || []).map(opt => ({
        name: opt,
        count: counts[opt] || 0,
        percentage: totalResponses > 0 ? ((counts[opt] || 0) / totalResponses) * 100 : 0
    }));
};


// --- Chart Components ---
const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

const CategoricalChart = ({ data, title }: { data: {name: string, count: number, percentage: number}[], title: string }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
             <CardContent>
                <ChartContainer config={{}} className="w-full h-64">
                    <ResponsiveContainer>
                        <RechartsBarChart data={data} layout="vertical" margin={{ left: 120 }}>
                          <XAxis type="number" dataKey="count" />
                          <YAxis dataKey="name" type="category" width={120} />
                          <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} responses`} />} cursor={{fill: 'hsl(var(--muted))'}} />
                          <Bar dataKey="count" name="Frequency" radius={4}>
                            <LabelList dataKey="count" position="right" style={{ fill: 'hsl(var(--foreground))' }} />
                            {data.map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Bar>
                    </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};
  
export default function SurveyAnalysisPage({ survey, responses }: { survey: Survey; responses: SurveyResponse[] }) {
    const [analysisData, setAnalysisData] = useState<any[]>([]);

    const processAllData = useCallback(async (questions: Question[], responses: SurveyResponse[]) => {
      if (!questions || !responses) {
        return [];
      }
      return Promise.all(questions.map(async (q: Question) => {
          const questionId = String(q.id);
          switch(q.type) {
              case 'single':
                  return { type: 'categorical', title: q.title, data: processCategoricalResponses(responses, q) };
              // Other question types will be handled here later
              default:
                  return null;
          }
      }).filter(Boolean));
    }, []);
    
    useEffect(() => {
        const loadData = async () => {
            if (survey && survey.questions) {
              const processed = await processAllData(survey.questions, responses);
              setAnalysisData(processed);
            }
        };
        loadData();
    }, [survey, responses, processAllData]);

    return (
        <div className="space-y-6">
            {analysisData.map((result, index) => {
                if (!result || !result.data) return null;
                return (
                    <div key={index}>
                    {(() => {
                        switch (result.type) {
                            case 'categorical':
                                return <CategoricalChart data={result.data} title={result.title} />;
                            default:
                                return null;
                        }
                    })()}
                    </div>
                );
            })}
        </div>
    );
}
