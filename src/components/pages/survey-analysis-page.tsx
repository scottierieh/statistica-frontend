
'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Customized } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BarChart as BarChartIcon, BrainCircuit, Users, LineChart as LineChartIcon, PieChart as PieChartIcon, Box, ArrowLeft, CheckCircle, XCircle, Star, ThumbsUp, ThumbsDown, Info, ImageIcon, PlusCircle, Trash2, X } from 'lucide-react';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Progress } from './../ui/progress';
import { jStat } from 'jstat';
import dynamic from 'next/dynamic';


const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px]" />,
});

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

    return (question.options || question.scale || []).map(opt => ({
        name: opt,
        count: counts[opt] || 0,
        percentage: totalResponses > 0 ? ((counts[opt] || 0) / totalResponses) * 100 : 0
    }));
};

const processNumericResponses = (responses: SurveyResponse[], questionId: string) => {
    const values = responses.map((r: any) => Number(r.answers[questionId])).filter(v => !isNaN(v));
    if (values.length === 0) return { mean: 0, median: 0, std: 0, count: 0, histogram: [], boxplot: [], values: [] };
    
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

    const q1 = sorted[Math.floor(0.25 * sorted.length)];
    const q3 = sorted[Math.floor(0.75 * sorted.length)];
    const boxplot = [{
        name: questionId,
        box: [q1, median, q3],
        whisker: [min, max],
        outliers: [] // Placeholder for outlier detection
    }];

    return { mean, median, std, count: values.length, histogram, boxplot, values };
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
    const columns = question.scale || question.columns || [];

    const result: {[row: string]: {[col: string]: number}} = {};
    rows.forEach(row => {
        result[row] = {};
        columns.forEach(col => result[row][col] = 0);
    });

    responses.forEach(response => {
        const answer = (response.answers as any)[questionId];
        if (answer && typeof answer === 'object') {
            Object.entries(answer).forEach(([row, colValue]) => {
                // Find the column label that corresponds to the stored column value (e.g., '1', '2')
                const colIndex = question.columns?.indexOf(colValue as string);
                if (colIndex !== -1 && colIndex !== undefined) {
                    const colLabel = columns[colIndex];
                     if (result[row] && colLabel in result[row]) {
                        result[row][colLabel]++;
                    }
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
            entry[`${col}_pct`] = total > 0 ? ((entry[col] as number / total) * 100) : 0;
        });
        return entry;
    });

    return { heatmapData: result, chartData, rows, columns };
};

// --- Chart Components ---
const CategoricalChart = ({ data, title }: { data: {name: string, count: number, percentage: number}[], title: string }) => {
    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="col-span-1">
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

const NumericChart = ({ data, title, questionId }: { data: { mean: number, median: number, std: number, count: number, histogram: {name: string, count: number}[], values: number[] }, title: string, questionId: string }) => {
    const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram');
    const [boxPlotImage, setBoxPlotImage] = useState<string | null>(null);
    const [isPlotLoading, setIsPlotLoading] = useState(false);

    const generateBoxPlot = useCallback(async () => {
        if (boxPlotImage || isPlotLoading) return;
        setIsPlotLoading(true);
        try {
            const response = await fetch('/api/analysis/visualization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data.values.map(v => ({ [title]: v })),
                    chartType: 'box',
                    config: { x_col: title }
                }),
            });
            if (!response.ok) throw new Error('Failed to generate box plot');
            const result = await response.json();
            setBoxPlotImage(result.plot);
        } catch (error) {
            console.error(error);
        } finally {
            setIsPlotLoading(false);
        }
    }, [boxPlotImage, isPlotLoading, data.values, title]);
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Tabs value={chartType} onValueChange={(v) => {
                     const newType = v as any;
                     setChartType(newType);
                     if (newType === 'boxplot') {
                         generateBoxPlot();
                     }
                 }} className="col-span-1">
                    <TabsList>
                        <TabsTrigger value="histogram"><BarChartIcon className="w-4 h-4 mr-2"/>Histogram</TabsTrigger>
                        <TabsTrigger value="boxplot"><Box className="w-4 h-4 mr-2"/>Box Plot</TabsTrigger>
                    </TabsList>
                    <TabsContent value="histogram">
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
                    </TabsContent>
                     <TabsContent value="boxplot">
                        <div className="w-full h-64 flex items-center justify-center">
                            {isPlotLoading ? <Skeleton className="h-full w-full" /> : 
                            boxPlotImage ? <Image src={`data:image/png;base64,${boxPlotImage}`} alt="Box plot" width={400} height={256} className="object-contain"/> : 
                            <p>Could not load box plot.</p>}
                        </div>
                    </TabsContent>
                </Tabs>
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Mean</p><p className="text-2xl font-bold">{data.mean.toFixed(2)}</p></div>
                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Median</p><p className="text-2xl font-bold">{data.median.toFixed(2)}</p></div>
                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Std. Dev.</p><p className="text-2xl font-bold">{data.std.toFixed(2)}</p></div>
                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Responses</p><p className="text-2xl font-bold">{data.count}</p></div>
                </div>
            </CardContent>
        </Card>
    );
};

const RatingChart = ({ data, title }: { data: { values: number[] }, title: string }) => {
    const ratingCounts = data.values.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {} as {[key: number]: number});

    const tableData = Object.entries(ratingCounts).map(([rating, count]) => ({
        name: rating,
        count: count,
    })).sort((a,b) => Number(a.name) - Number(b.name));

    const totalResponses = data.values.length;
    const weightedSum = data.values.reduce((sum, val) => sum + val, 0);
    const averageRating = totalResponses > 0 ? weightedSum / totalResponses : 0;
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center">
                    <p className="text-5xl font-bold">{averageRating.toFixed(2)}</p>
                    <div className="flex items-center mt-2">
                        {[...Array(5)].map((_, i) => (
                           <Star key={i} className={cn("w-7 h-7 text-yellow-300", averageRating > i && "fill-yellow-400")} />
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Average Rating</p>
                </div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rating</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">%</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((item) => (
                            <TableRow key={item.name}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">{item.count}</TableCell>
                                <TableCell className="text-right">{(item.count / totalResponses * 100).toFixed(1)}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


const NPSChart = ({ data, title }: { data: { npsScore: number, promoters: number, passives: number, detractors: number, total: number }, title: string }) => {
    const NPSGauge = () => {
        const npsScore = data.npsScore;
        
        const getColor = (score: number) => {
            if (score >= 50) return '#10b981'; // Excellent (green-500)
            if (score >= 0) return '#eab308'; // Good (yellow-500)
            return '#ef4444'; // Needs Improvement (red-500)
        };
        
        const getLevel = (score: number) => {
            if (score >= 50) return 'Excellent';
            if (score >= 0) return 'Good';
            return 'Needs Improvement';
        };

        const gaugeData = [
            { value: npsScore + 100 },
            { value: 200 - (npsScore + 100) }
        ];

        const color = getColor(npsScore);
        
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <div className="relative flex flex-col items-center">
                    <PieChart width={250} height={150}>
                    <Pie
                        data={gaugeData}
                        cx={125}
                        cy={150}
                        startAngle={180}
                        endAngle={0}
                        innerRadius={80}
                        outerRadius={120}
                        dataKey="value"
                        stroke="none"
                    >
                        <Cell fill={color} />
                        <Cell fill="#e5e7eb" />
                    </Pie>
                    </PieChart>
                    
                    <div className="absolute top-20 flex flex-col items-center">
                    <div className="text-5xl font-bold" style={{ color }}>
                        {npsScore.toFixed(0)}
                    </div>
                    <div className="text-lg text-gray-600 mt-2">
                        {getLevel(npsScore)}
                    </div>
                    </div>
                </div>
                 <div className="mt-4 flex justify-between w-full max-w-[250px] text-xs text-muted-foreground">
                    <span>Poor</span>
                    <span>Good</span>
                    <span>Excellent</span>
                </div>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NPSGauge />
                <div>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Group</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">%</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>Promoters (9-10)</TableCell>
                                <TableCell className="text-right">{data.promoters}</TableCell>
                                <TableCell className="text-right">{data.total > 0 ? ((data.promoters / data.total) * 100).toFixed(1) : 0}%</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell>Passives (7-8)</TableCell>
                                <TableCell className="text-right">{data.passives}</TableCell>
                                <TableCell className="text-right">{data.total > 0 ? ((data.passives / data.total) * 100).toFixed(1) : 0}%</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell>Detractors (0-6)</TableCell>
                                <TableCell className="text-right">{data.detractors}</TableCell>
                                <TableCell className="text-right">{data.total > 0 ? ((data.detractors / data.total) * 100).toFixed(1) : 0}%</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
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

const BestWorstChart = ({ data, title }: { data: { name: string, netScore: number, bestPct: number, worstPct: number }[], title: string }) => {
    const [chartType, setChartType] = useState<'net_score' | 'best_vs_worst'>('net_score');

    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="net_score">Net Score</TabsTrigger>
                        <TabsTrigger value="best_vs_worst">Best vs Worst</TabsTrigger>
                    </TabsList>
                    <TabsContent value="net_score" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ChartContainer config={{}} className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <BarChart data={[...data].sort((a, b) => b.netScore - a.netScore)} layout="vertical" margin={{ left: 100 }}>
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <XAxis type="number" />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`} />} />
                                    <Bar dataKey="netScore" name="Net Score" fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                        <Table>
                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Net Score</TableHead></TableRow></TableHeader>
                            <TableBody>{[...data].sort((a, b) => b.netScore - a.netScore).map(item => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.netScore.toFixed(1)}</TableCell></TableRow>))}</TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="best_vs_worst" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ChartContainer config={{}} className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <BarChart data={data} margin={{ left: 100 }}>
                                    <YAxis />
                                    <XAxis type="category" dataKey="name" />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`} />} />
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
};

const MatrixChart = ({ data, title, rows, columns }: { data: any, title: string, rows: string[], columns: string[] }) => {
    const [chartType, setChartType] = useState<'stacked' | 'grouped'>('stacked');
    const [tableFormat, setTableFormat] = useState('counts');
    const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']; // red to green
    
    const renderContingencyTable = () => {
        if (!data) return null;

        const { heatmapData, rows, columns } = data;
        
        const total = Object.values(heatmapData).flatMap(Object.values).reduce((sum: number, val: any) => sum + val, 0);
        const rowTotals = rows.map((row: string) => columns.reduce((sum: number, col: string) => sum + (heatmapData[row]?.[col] || 0), 0));
        const colTotals = columns.map((col: string) => rows.reduce((sum: number, row: string) => sum + (heatmapData[row]?.[col] || 0), 0));

        const getCellContent = (row: string, col: string, rowIndex: number, colIndex: number) => {
            const count = heatmapData[row]?.[col] || 0;
            switch(tableFormat) {
                case 'row_percent':
                    return `${((count / rowTotals[rowIndex]) * 100 || 0).toFixed(1)}%`;
                case 'col_percent':
                     return `${((count / colTotals[colIndex]) * 100 || 0).toFixed(1)}%`;
                case 'total_percent':
                     return `${((count / total) * 100 || 0).toFixed(1)}%`;
                default: // counts
                    return count;
            }
        };

        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{title}</TableHead>
                        {columns.map((c: string) => <TableHead key={c} className="text-right">{c}</TableHead>)}
                        <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((r: string, rowIndex: number) => (
                        <TableRow key={r}>
                            <TableHead>{r}</TableHead>
                            {columns.map((c: string, colIndex: number) => <TableCell key={c} className="text-right font-mono">{getCellContent(r, c, rowIndex, colIndex)}</TableCell>)}
                            <TableCell className="text-right font-bold font-mono">{tableFormat === 'counts' ? rowTotals[rowIndex] : '100.0%'}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                        <TableHead>Total</TableHead>
                         {columns.map((c: string, colIndex: number) => <TableCell key={c} className="text-right font-mono">{tableFormat === 'counts' ? colTotals[colIndex] : ''}</TableCell>)}
                        <TableCell className="text-right font-mono">{tableFormat === 'counts' ? total : ''}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );
    }
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="col-span-1">
                    <TabsList>
                        <TabsTrigger value="stacked">Stacked</TabsTrigger>
                        <TabsTrigger value="grouped">Grouped</TabsTrigger>
                    </TabsList>
                    <TabsContent value="stacked">
                        <ChartContainer config={{}} className="w-full h-[400px]">
                            <ResponsiveContainer>
                                <BarChart data={data.chartData} layout="vertical" margin={{ left: 100 }}>
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
                    <TabsContent value="grouped">
                        <ChartContainer config={{}} className="w-full h-[400px]">
                            <ResponsiveContainer>
                                <BarChart data={data.chartData}>
                                    <XAxis dataKey="name" />
                                    <YAxis unit="%"/>
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />} />
                                    <Legend />
                                    {data.columns.map((col: string, i: number) => (
                                        <Bar key={col} dataKey={`${col}_pct`} name={col} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </TabsContent>
                </Tabs>
                <div className="overflow-x-auto">
                    <Tabs value={tableFormat} onValueChange={setTableFormat} className="w-full">
                        <TabsList>
                            <TabsTrigger value="counts">Counts</TabsTrigger>
                            <TabsTrigger value="row_percent">Row %</TabsTrigger>
                            <TabsTrigger value="col_percent">Col %</TabsTrigger>
                            <TabsTrigger value="total_percent">Total %</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {renderContingencyTable()}
                </div>
            </CardContent>
        </Card>
    );
};

export default function SurveyAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                setError("Failed to load survey.");
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
                    return { type: 'numeric', title: q.title, data: processNumericResponses(responses, questionId), questionId };
                case 'rating':
                    return { type: 'rating', title: q.title, data: processNumericResponses(responses, questionId) };
                case 'nps':
                    return { type: 'nps', title: q.title, data: processNPS(responses, questionId) };
                case 'text':
                     return { type: 'text', title: q.title, data: processTextResponses(responses, questionId) };
                case 'best-worst':
                    return { type: 'best-worst', title: q.title, data: processBestWorst(responses, q) };
                case 'matrix':
                    return { type: 'matrix', title: q.title, data: processMatrixResponses(responses, q), rows: q.rows, columns: q.scale || q.columns };
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
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/survey2")}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="font-headline text-3xl">{survey.title} - Analysis Report</h1>
                    <p className="text-muted-foreground">
                        A summary of <Badge variant="secondary">{responses.length} responses</Badge>.
                    </p>
                </div>
            </div>

            {analysisData.map((result, index) => {
                if (!result) return null;
                switch (result.type) {
                    case 'categorical':
                    case 'multiple':
                        return <CategoricalChart key={index} data={result.data} title={result.title} />;
                    case 'numeric':
                        return <NumericChart key={index} data={result.data} title={result.title} questionId={result.questionId} />;
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

```
- src/hooks/use-toast.ts:
```tsx
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

```
- src/lib/stats.ts:
```ts

import Papa from 'papaparse';

export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    console.error("Parsing errors:", result.errors);
    // Optionally throw an error for the first critical error
    const firstError = result.errors[0];
    if (firstError.code !== 'UndetectableDelimiter') {
       throw new Error(`CSV Parsing Error: ${firstError.message} on row ${firstError.row}`);
    }
  }

  if (!result.data || result.data.length === 0) {
    throw new Error("No parsable data rows found in the file.");
  }
  
  const rawHeaders = result.meta.fields || [];
  const data: DataSet = result.data as DataSet;

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    
    // Check if every non-empty value is a number
    const isNumericColumn = values.every(val => typeof val === 'number' && isFinite(val));

    if (isNumericColumn) {
        numericHeaders.push(header);
    } else {
        categoricalHeaders.push(header);
    }
  });

  // Ensure types are correct, PapaParse does a good job but we can enforce it.
  const sanitizedData = data.map(row => {
    const newRow: DataPoint = {};
    rawHeaders.forEach(header => {
      const value = row[header];
      if (numericHeaders.includes(header)) {
        if (typeof value === 'number' && isFinite(value)) {
            newRow[header] = value;
        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
            newRow[header] = parseFloat(value);
        } else {
            newRow[header] = NaN; // Use NaN for non-numeric values in numeric columns
        }
      } else { // Categorical
        newRow[header] = String(value ?? '');
      }
    });
    return newRow;
  });

  return { headers: rawHeaders, data: sanitizedData, numericHeaders, categoricalHeaders };
};

export const unparseData = (
    { headers, data }: { headers: string[]; data: DataSet }
): string => {
    return Papa.unparse(data, {
        columns: headers,
        header: true,
    });
};


const getColumn = (data: DataSet, column: string): (number | string)[] => {
    return data.map(row => row[column]).filter(val => val !== undefined && val !== null && val !== '');
};

const getNumericColumn = (data: DataSet, column: string): number[] => {
    return data.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val)) as number[];
}

const mean = (arr: number[]): number => arr.length === 0 ? NaN : arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[]): number => {
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    if(isNaN(m)) return NaN;
    return mean(arr.map(x => Math.pow(x - m, 2)));
};

const stdDev = (arr: number[]): number => Math.sqrt(variance(arr));

const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    if(sorted[lower] === undefined || sorted[upper] === undefined) return NaN;
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

const mode = (arr: (number|string)[]): (number|string)[] => {
    if (arr.length === 0) return [];
    const counts: {[key: string]: number} = {};
    arr.forEach(val => {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });

    let maxFreq = 0;
    for (const key in counts) {
        if (counts[key] > maxFreq) {
            maxFreq = counts[key];
        }
    }

    if (maxFreq <= 1 && new Set(arr).size === arr.length) return []; // No mode if all unique

    const modes = Object.keys(counts)
        .filter(key => counts[key] === maxFreq)
        .map(key => {
            const num = parseFloat(key);
            return isNaN(num) ? key : num;
        });
    
    return modes;
}

const skewness = (arr: number[]): number => {
    if (arr.length < 3) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    return (n / ((n - 1) * (n - 2))) * arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
};

const kurtosis = (arr: number[]): number => {
    if (arr.length < 4) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
    const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return term1 * term2 - term3; // Excess kurtosis
};

export const findIntersection = (x1: number[], y1: number[], x2: number[], y2: number[]): number | null => {
    for (let i = 0; i < x1.length - 1; i++) {
        for (let j = 0; j < x2.length - 1; j++) {
            const p1 = { x: x1[i], y: y1[i] };
            const p2 = { x: x1[i+1], y: y1[i+1] };
            const p3 = { x: x2[j], y: y2[j] };
            const p4 = { x: x2[j+1], y: y2[j+1] };

            const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
            if (denominator === 0) continue;

            const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
            const ub = -((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                return p1.x + ua * (p2.x - p1.x); // Return intersection X value
            }
        }
    }
    return null;
};


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        const numericColumn = data.every(row => typeof row[header] === 'number');

        if (numericColumn) {
            const columnData = getNumericColumn(data, header);
            if (columnData.length > 0) {
                const p25 = percentile(columnData, 25);
                const p75 = percentile(columnData, 75);
                stats[header] = {
                    mean: mean(columnData),
                    median: median(columnData),
                    stdDev: stdDev(columnData),
                    variance: variance(columnData),
                    min: Math.min(...columnData),
                    max: Math.max(...columnData),
                    range: Math.max(...columnData) - Math.min(...columnData),
                    iqr: p75 - p25,
                    count: columnData.length,
                    mode: mode(columnData),
                    skewness: skewness(columnData),
                    kurtosis: kurtosis(columnData),
                    p25: p25,
                    p75: p75,
                };
            }
        } else {
             const catColumnData = getColumn(data, header);
             if(catColumnData.length > 0) {
                 stats[header] = {
                     count: catColumnData.length,
                     unique: new Set(catColumnData).size,
                     mode: mode(catColumnData),
                 }
             }
        }
    });
    return stats;
};

// Deprecated: Correlation calculation is now handled by the Python backend.
export const calculateCorrelationMatrix = (data: DataSet, headers: string[]) => {
    return [];
};

```
- src/lib/utils.ts:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```
- src/types/survey.ts:
```ts

export interface Survey {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'closed';
  created_date: string;
  startDate?: string;
  endDate?: string;
  questions?: any[]; // Keep questions for saving logic
  description?: string; // Keep for saving logic
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
}

```
