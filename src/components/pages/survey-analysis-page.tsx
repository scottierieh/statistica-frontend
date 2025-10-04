

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Customized } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BarChart as BarChartIcon, BrainCircuit, Users, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- Data Processing Functions ---
const processTextResponses = (responses: SurveyResponse[], questionId: string) => {
    return responses.map((r: any) => r.answers[questionId]).filter(Boolean);
};

const processCategoricalResponses = (responses: SurveyResponse[], question: Question) => {
    const counts: { [key: string]: number } = {};
    const questionId = String(question.id);
    let totalResponses = 0;
    
    responses.forEach((response: any) => {
        const answer = response.answers[questionId];
        if (answer) {
             totalResponses++;
            if (Array.isArray(answer)) { // Multiple choice
                answer.forEach(opt => {
                    counts[opt] = (counts[opt] || 0) + 1;
                });
            } else { // Single choice
                counts[String(answer)] = (counts[String(answer)] || 0) + 1;
            }
        }
    });

    return (question.options || []).map(opt => ({
        name: opt,
        count: counts[opt] || 0,
        percentage: totalResponses > 0 ? ((counts[opt] || 0) / totalResponses) * 100 : 0
    }));
};

const processNumericResponses = (responses: SurveyResponse[], questionId: string) => {
    const values = responses.map((r: any) => Number(r.answers[questionId])).filter(v => !isNaN(v));
    if (values.length === 0) return { mean: 0, median: 0, std: 0, count: 0, histogram: [] };
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = [...values].sort((a,b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
    const std = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a,b) => a+b, 0) / (values.length > 1 ? values.length -1 : 1) );

    // Histogram data
    const min = Math.min(...values);
    const max = Math.max(...values);
    const numBins = Math.min(10, Math.ceil(Math.sqrt(values.length)));
    const binWidth = numBins > 0 ? (max - min) / numBins : 1;
    const histogram = Array(numBins).fill(0).map((_,i) => {
        const binStart = min + i * binWidth;
        const binEnd = binStart + binWidth;
        return {
            name: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
            count: values.filter(v => v >= binStart && (i === numBins - 1 ? v <= binEnd : v < binEnd)).length
        }
    })

    return { mean, median, std, count: values.length, histogram };
};

const processNPS = (responses: SurveyResponse[], questionId: string) => {
    const values = responses.map((r: any) => Number(r.answers[questionId])).filter(v => !isNaN(v));
    if (values.length === 0) return { npsScore: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
    
    const promoters = values.filter(v => v >= 9).length;
    const passives = values.filter(v => v >= 7 && v <= 8).length;
    const detractors = values.filter(v => v <= 6).length;
    const total = values.length;

    const promoterPct = (promoters / total) * 100;
    const detractorPct = (detractors / total) * 100;

    return {
        npsScore: promoterPct - detractorPct,
        promoters, passives, detractors, total
    }
}

const processBestWorst = (responses: SurveyResponse[], question: Question) => {
    const questionId = String(question.id);
    const items = question.items || [];
    const bestCounts: { [key: string]: number } = {};
    const worstCounts: { [key: string]: number } = {};

    responses.forEach((response: any) => {
        const answer = response.answers[questionId];
        if (answer) {
            if (answer.best) bestCounts[answer.best] = (bestCounts[answer.best] || 0) + 1;
            if (answer.worst) worstCounts[answer.worst] = (worstCounts[answer.worst] || 0) + 1;
        }
    });

    const totalResponses = responses.length;
    return items.map(item => ({
        name: item,
        best: bestCounts[item] || 0,
        worst: worstCounts[item] || 0,
        bestPct: ((bestCounts[item] || 0) / totalResponses) * 100,
        worstPct: ((worstCounts[item] || 0) / totalResponses) * 100,
        netScore: (((bestCounts[item] || 0) - (worstCounts[item] || 0)) / totalResponses) * 100
    }));
};

const processMatrixResponses = (responses: SurveyResponse[], question: Question) => {
    const questionId = String(question.id);
    const rows = question.rows || [];
    const columns = question.columns || [];

    const result: {[row: string]: {[col: string]: number}} = {};
    rows.forEach(row => {
        result[row] = {};
        columns.forEach(col => result[row][col] = 0);
    });

    responses.forEach(response => {
        const answer = (response.answers as any)[questionId];
        if (answer && typeof answer === 'object') {
            Object.entries(answer).forEach(([row, col]) => {
                if (result[row] && col in result[row]) {
                    result[row][col as string]++;
                }
            });
        }
    });

    const chartData = rows.map(row => {
        const entry: {[key: string]: string | number} = { name: row };
        let total = 0;
        columns.forEach(col => {
            const count = result[row][col] || 0;
            entry[col] = count;
            total += count;
        });
        // Calculate percentages
        columns.forEach(col => {
            entry[`${col}_pct`] = total > 0 ? (entry[col] as number / total) * 100 : 0;
        });
        return entry;
    });

    return { heatmapData: result, chartData, rows, columns };
};

// --- Chart Components ---
const CategoricalChart = ({ data, title }: { data: {name: string, count: number, percentage: number}[], title: string }) => {
    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Tabs defaultValue="bar" className="col-span-1">
                    <TabsList>
                        <TabsTrigger value="bar"><BarChartIcon className="w-4 h-4 mr-2"/>Bar</TabsTrigger>
                        <TabsTrigger value="pie"><PieChartIcon className="w-4 h-4 mr-2"/>Pie</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bar">
                         <ChartContainer config={{}} className="w-full h-64">
                            <ResponsiveContainer>
                                <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} (${(data.find(d=>d.count === value)?.percentage || 0).toFixed(1)}%)`} />} />
                                    <Bar dataKey="count" name="Frequency" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </TabsContent>
                     <TabsContent value="pie">
                        <ChartContainer config={{}} className="w-full h-64">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                         {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </TabsContent>
                </Tabs>
                <div className="col-span-1">
                    <Table>
                        <TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.name}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-right">{item.count}</TableCell>
                                    <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

const NumericChart = ({ data, title }: { data: { mean: number, median: number, std: number, count: number, histogram: {name: string, count: number}[] }, title: string }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <ChartContainer config={{}} className="w-full h-64">
                <ResponsiveContainer>
                    <BarChart data={data.histogram}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" name="Frequency" fill="hsl(var(--primary))" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
             <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Mean</p><p className="text-2xl font-bold">{data.mean.toFixed(2)}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Median</p><p className="text-2xl font-bold">{data.median.toFixed(2)}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Std. Dev.</p><p className="text-2xl font-bold">{data.std.toFixed(2)}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Responses</p><p className="text-2xl font-bold">{data.count}</p></div>
            </div>
        </CardContent>
    </Card>
);

const RatingChart = ({ data, title }: { data: {name: string, count: number}[], title: string }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <ChartContainer config={{}} className="w-full h-64">
                <ResponsiveContainer>
                    <BarChart data={data}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" name="Count" fill="hsl(var(--primary))" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            <div>
                 <Table>
                    <TableHeader><TableRow><TableHead>Rating</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {data.map(item => <TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.count}</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
);

const GaugeChart = ({ score }: { score: number }) => {
    const width = 300;
    const height = 200;
    
    const colorData = [
        { value: 40, color: "#e74c3c" }, // Detractors -40%
        { value: 20, color: "#f1c40f" }, // Passives 20%
        { value: 40, color: "#2ecc71" }  // Promoters 40%
    ];

    const normalizedScore = score + 100; // a value between 0 and 200
    
    // Convert score to angle. 0 score is 90 degrees, 200 score is -90 degrees
    const angle = 180 - (normalizedScore / 200) * 180;
    
    const pieProps = {
        startAngle: 180,
        endAngle: 0,
        cx: width / 2,
        cy: height,
    };

    const pieRadius = {
        innerRadius: "65%",
        outerRadius: "90%",
    };

    const Needle = ({ cx, cy, midAngle, outerRadius}: any) => {
        if (cx === undefined || cy === undefined) return null;
        const RADIAN = Math.PI / 180;
        const length = outerRadius * 0.8;
        const x1 = cx;
        const y1 = cy;
        const x2 = cx + length * Math.cos(-angle * RADIAN);
        const y2 = cy + length * Math.sin(-angle * RADIAN);

        return (
            <g>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="2" />
                <circle cx={x1} cy={y1} r={5} fill="black" stroke="none" />
            </g>
        );
    };

    return (
        <div className="relative w-full h-full">
            <PieChart width={width} height={height}>
                <Pie data={colorData} dataKey="value" fill="#eee" {...pieRadius} {...pieProps} isAnimationActive={false}>
                    {colorData.map((entry, index) => <Cell key={`cell-${index}`} fill={colorData[index].color} />)}
                </Pie>
                <Customized component={Needle} />
            </PieChart>
             <div className="absolute bottom-4 w-full text-center">
                <p className="text-3xl font-bold">{score.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">NPS Score</p>
            </div>
        </div>
    );
};

const NPSChart = ({ data, title }: { data: { npsScore: number, promoters: number, passives: number, detractors: number, total: number }, title: string }) => {
    const promoterPct = data.total > 0 ? (data.promoters / data.total) * 100 : 0;
    const passivePct = data.total > 0 ? (data.passives / data.total) * 100 : 0;
    const detractorPct = data.total > 0 ? (data.detractors / data.total) * 100 : 0;

    const chartData = [{ name: 'NPS', promoters: promoterPct, passives: passivePct, detractors: detractorPct }];
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
                    <GaugeChart score={data.npsScore} />
                </div>
                 <ChartContainer config={{}} className="w-full h-64">
                    <ResponsiveContainer>
                         <BarChart data={chartData} layout="vertical" stackOffset="expand">
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis type="category" dataKey="name" hide />
                            <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />} />
                            <Legend layout="vertical" verticalAlign="middle" align="right" />
                            <Bar dataKey="detractors" fill="#e74c3c" stackId="a" name={`Detractors (${detractorPct.toFixed(1)}%)`} />
                            <Bar dataKey="passives" fill="#f1c40f" stackId="a" name={`Passives (${passivePct.toFixed(1)}%)`} />
                            <Bar dataKey="promoters" fill="#2ecc71" stackId="a" name={`Promoters (${promoterPct.toFixed(1)}%)`} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};


const TextResponsesDisplay = ({ data, title }: { data: string[], title: string }) => {
    const wordFrequency = useMemo(() => {
        const words = data.join(' ').toLowerCase().match(/\b(\w+)\b/g) || [];
        const counts: {[key:string]: number} = {};
        words.forEach(word => {
            if (word.length > 3) { // Simple stopword/length filter
                counts[word] = (counts[word] || 0) + 1;
            }
        });
        return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 50);
    }, [data]);
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                <Tabs defaultValue="wordcloud">
                    <TabsList>
                        <TabsTrigger value="wordcloud">Word Cloud</TabsTrigger>
                        <TabsTrigger value="list">Responses</TabsTrigger>
                    </TabsList>
                    <TabsContent value="wordcloud" className="p-2">
                        {wordFrequency.length > 0 ? (
                            <div className="h-64 flex flex-wrap gap-2 items-center justify-center">
                                {wordFrequency.map(([word, freq]) => (
                                    <span key={word} style={{ fontSize: `${Math.min(10 + freq * 3, 50)}px`, opacity: 0.6 + (freq / wordFrequency[0][1] * 0.4)}}>{word}</span>
                                ))}
                            </div>
                        ) : <p>Not enough text data for a word cloud.</p>}
                    </TabsContent>
                    <TabsContent value="list">
                        <ScrollArea className="h-64 border rounded-md p-4 space-y-2">
                            {data.map((text, i) => (
                                <div key={i} className="p-2 border-b">{text}</div>
                            ))}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

const BestWorstChart = ({ data, title }: { data: {name: string, netScore: number, bestPct: number, worstPct: number}[], title: string }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <Tabs defaultValue="net_score">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="net_score">Net Score</TabsTrigger>
                    <TabsTrigger value="best_vs_worst">Best vs Worst</TabsTrigger>
                </TabsList>
                <TabsContent value="net_score" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartContainer config={{}} className="w-full h-[300px]">
                        <ResponsiveContainer>
                            <BarChart data={[...data].sort((a,b) => b.netScore - a.netScore)} layout="vertical" margin={{ left: 100 }}>
                                <YAxis type="category" dataKey="name" />
                                <XAxis type="number" />
                                <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>}/>
                                <Bar dataKey="netScore" name="Net Score" fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                    <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Net Score</TableHead></TableRow></TableHeader>
                        <TableBody>{[...data].sort((a,b) => b.netScore - a.netScore).map(item => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.netScore.toFixed(1)}</TableCell></TableRow>))}</TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="best_vs_worst" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartContainer config={{}} className="w-full h-[300px]">
                        <ResponsiveContainer>
                            <BarChart data={data} margin={{ left: 100 }}>
                                <YAxis />
                                <XAxis type="category" dataKey="name" />
                                <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>}/>
                                <Legend />
                                <Bar dataKey="bestPct" name="Best %" fill="hsl(var(--chart-2))" />
                                <Bar dataKey="worstPct" name="Worst %" fill="hsl(var(--chart-5))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                    <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Best %</TableHead><TableHead className="text-right">Worst %</TableHead></TableRow></TableHeader>
                        <TableBody>{data.map(item => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.bestPct.toFixed(1)}%</TableCell><TableCell className="text-right">{item.worstPct.toFixed(1)}%</TableCell></TableRow>))}</TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
);

const MatrixChart = ({ data, title, rows, columns }: { data: any, title: string, rows: string[], columns: string[] }) => {
    const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']; // red to green
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                 <Tabs defaultValue="stacked_bar">
                    <TabsList>
                        <TabsTrigger value="stacked_bar">Stacked Bar</TabsTrigger>
                        <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                    </TabsList>
                    <TabsContent value="stacked_bar">
                        <ChartContainer config={{}} className="w-full h-[400px]">
                            <ResponsiveContainer>
                                <BarChart data={data.chartData} layout="vertical">
                                    <XAxis type="number" stackId="a" domain={[0, 100]} unit="%"/>
                                    <YAxis type="category" dataKey="name" width={120} />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />} />
                                    <Legend />
                                    {data.columns.map((col: string, i: number) => (
                                        <Bar key={col} dataKey={`${col}_pct`} name={col} stackId="a" fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </TabsContent>
                    <TabsContent value="heatmap">
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>{title}</TableHead>{data.columns.map((c: string) => <TableHead key={c} className="text-center">{c}</TableHead>)}</TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.rows.map((r: string) => (
                                        <TableRow key={r}><TableCell>{r}</TableCell>
                                            {data.columns.map((c: string) => {
                                                const value = data.heatmapData[r]?.[c] || 0;
                                                const total = Object.values(data.heatmapData[r] || {}).reduce((s: any, v: any) => s+v, 0);
                                                const pct = total > 0 ? (value / total) * 100 : 0;
                                                return <TableCell key={c} className="text-center" style={{backgroundColor: `rgba(132, 204, 22, ${pct / 100})`}}>{value}</TableCell>
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                 </Tabs>
            </CardContent>
        </Card>
    );
};

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
                case 'multiple':
                    return { type: 'categorical', title: q.title, data: processCategoricalResponses(responses, q) };
                case 'number':
                    return { type: 'numeric', title: q.title, data: processNumericResponses(responses, questionId) };
                case 'rating':
                    const ratingData = processCategoricalResponses(responses, q);
                    return { type: 'rating', title: q.title, data: ratingData };
                case 'nps':
                    return { type: 'nps', title: q.title, data: processNPS(responses, questionId) };
                case 'text':
                     return { type: 'text', title: q.title, data: processTextResponses(responses, questionId) };
                case 'best-worst':
                    return { type: 'best-worst', title: q.title, data: processBestWorst(responses, q) };
                case 'matrix':
                    return { type: 'matrix', title: q.title, data: processMatrixResponses(responses, q), rows: q.rows, columns: q.columns };
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
                    case 'multiple':
                        return <CategoricalChart key={index} data={result.data} title={result.title} />;
                    case 'numeric':
                        return <NumericChart key={index} data={result.data} title={result.title} />;
                    case 'rating':
                         return <RatingChart key={index} data={result.data} title={result.title} />;
                    case 'nps':
                        return <NPSChart key={index} data={result.data} title={result.title} />;
    
                    case 'text':
                         return <TextResponsesDisplay key={index} data={result.data} title={result.title} />;
                    case 'best-worst':
                        return <BestWorstChart key={index} data={result.data} title={result.title} />;
                    case 'matrix':
                        return <MatrixChart key={index} data={result.data} title={result.title} rows={result.rows!} columns={result.columns!} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}
