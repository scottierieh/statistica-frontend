
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BarChart as BarChartIcon, BrainCircuit, Users } from 'lucide-react';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

// --- Data Processing Functions ---
const processTextResponses = (responses: SurveyResponse[], questionId: string) => {
    return responses.map((r: any) => r.answers[questionId]).filter(Boolean);
};

const processCategoricalResponses = (responses: SurveyResponse[], question: Question) => {
    const counts: { [key: string]: number } = {};
    const questionId = String(question.id);
    
    responses.forEach((response: any) => {
        const answer = response.answers[questionId];
        if (Array.isArray(answer)) { // Multiple choice
            answer.forEach(opt => {
                counts[opt] = (counts[opt] || 0) + 1;
            });
        } else if (answer) { // Single choice
            counts[String(answer)] = (counts[String(answer)] || 0) + 1;
        }
    });

    const total = responses.length;
    return (question.options || []).map(opt => ({
        name: opt,
        count: counts[opt] || 0,
        percentage: total > 0 ? ((counts[opt] || 0) / total) * 100 : 0
    }));
};

const processNumericResponses = (responses: SurveyResponse[], questionId: string) => {
    const values = responses.map((r: any) => Number(r.answers[questionId])).filter(v => !isNaN(v));
    if (values.length === 0) return { mean: 0, median: 0, std: 0, count: 0 };
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = [...values].sort((a,b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
    const std = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a,b) => a+b, 0) / values.length);

    return { mean, median, std, count: values.length };
};


// --- Chart Components ---
const CategoricalChart = ({ data, title }: { data: {name: string, count: number}[], title: string }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ChartContainer config={{}} className="w-full h-64">
                <ResponsiveContainer>
                    <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" name="Frequency" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
    </Card>
);

const NumericChart = ({ data, title }: { data: { mean: number, median: number, std: number, count: number }, title: string }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Mean</p><p className="text-2xl font-bold">{data.mean.toFixed(2)}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Median</p><p className="text-2xl font-bold">{data.median.toFixed(2)}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Std. Dev.</p><p className="text-2xl font-bold">{data.std.toFixed(2)}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Responses</p><p className="text-2xl font-bold">{data.count}</p></div>
            </div>
        </CardContent>
    </Card>
);

const TextResponsesDisplay = ({ data, title }: { data: string[], title: string }) => (
     <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ScrollArea className="h-64 border rounded-md p-4 space-y-2">
                {data.map((text, i) => (
                    <div key={i} className="p-2 border-b">{text}</div>
                ))}
            </ScrollArea>
        </CardContent>
    </Card>
);


export default function SurveyAnalysisPage() {
    const params = useParams();
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (surveyId) {
            try {
                const storedSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
                const currentSurvey = storedSurveys.find((s: Survey) => s.id === surveyId);
                setSurvey(currentSurvey || null);

                const storedResponses = JSON.parse(localStorage.getItem(`${surveyId}_responses`) || '[]');
                setResponses(storedResponses);
            } catch (error) {
                console.error("Failed to load survey data:", error);
            } finally {
                setLoading(false);
            }
        }
    }, [surveyId]);
    
    const analysisData = useMemo(() => {
        if (!survey || !responses) return [];
        return (survey.questions || []).map(q => {
            const questionId = String(q.id);
            switch(q.type) {
                case 'single':
                case 'dropdown':
                    return { type: 'categorical', title: q.title, data: processCategoricalResponses(responses, q) };
                case 'multiple':
                     return { type: 'categorical', title: q.title, data: processCategoricalResponses(responses, q) };
                case 'number':
                case 'rating':
                case 'nps':
                    return { type: 'numeric', title: q.title, data: processNumericResponses(responses, questionId) };
                case 'text':
                    return { type: 'text', title: q.title, data: processTextResponses(responses, questionId) };
                default:
                    return null;
            }
        }).filter(Boolean);
    }, [survey, responses]);


    if (loading) {
        return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
    }

    if (!survey) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Survey not found.</AlertDescription></Alert>;
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-3xl">{survey.title} - Analysis Report</CardTitle>
                    <CardDescription>
                        A summary of <Badge variant="secondary">{responses.length} responses</Badge>.
                    </CardDescription>
                </CardHeader>
            </Card>

            {analysisData.map((result, index) => {
                if (!result) return null;
                switch (result.type) {
                    case 'categorical':
                        return <CategoricalChart key={index} data={result.data} title={result.title} />;
                    case 'numeric':
                        return <NumericChart key={index} data={result.data} title={result.title} />;
                    case 'text':
                         return <TextResponsesDisplay key={index} data={result.data} title={result.title} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}
