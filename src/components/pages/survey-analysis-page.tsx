
      'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BarChart as BarChartIcon, BrainCircuit, Users, LineChart as LineChartIcon, PieChart as PieChartIcon, Box, ArrowLeft, CheckCircle, XCircle, Star, ThumbsUp, ThumbsDown, Info, ImageIcon, PlusCircle, Trash2, X, Phone, Mail, Share2, Grid3x3, ChevronDown, Sigma, Loader2 } from 'lucide-react';
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
import { produce } from 'immer';
import { jStat } from 'jstat';
import dynamic from 'next/dynamic';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useToast } from '@/hooks/use-toast';


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
                                    <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={p => `${p.name} (${p.percentage.toFixed(1)}%)`}>
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
    const { toast } = useToast();

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
             if (result.plot) {
              setBoxPlotImage(result.plot);
            }
        } catch (error: any) {
            toast({variant: 'destructive', title: 'Plot Error', description: error.message});
        } finally {
            setIsPlotLoading(false);
        }
    }, [boxPlotImage, isPlotLoading, data.values, title, toast]);

    useEffect(() => {
        if (chartType === 'boxplot') {
            generateBoxPlot();
        }
    }, [chartType, generateBoxPlot]);
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="col-span-1">
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
                            boxPlotImage ? <Image src={boxPlotImage} alt="Box plot" width={400} height={256} className="object-contain"/> : 
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

const RatingChart = ({ data, title }: { data: { values: number[], count: number }, title: string }) => {
    if (!data || data.values.length === 0) {
        return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p>No data available for this rating question.</p></CardContent></Card>;
    }
    const ratingCounts: {[key: number]: number} = {};
    const scale = Array.from({length: 5}, (_, i) => i + 1); // Assuming 1-5 scale for now
    scale.forEach(s => ratingCounts[s] = 0);
    
    data.values.forEach(value => {
        if (value >= 1 && value <= 5) {
            ratingCounts[Math.round(value)]++;
        }
    });

    const tableData = Object.entries(ratingCounts).map(([rating, count]) => ({
        name: rating,
        count: count,
        percentage: data.count > 0 ? (count / data.count) * 100 : 0
    }));

    const totalResponses = data.count;
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
                                <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
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

const TextResponsesDisplay = ({ data, title }: { data: string[], title: string }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ScrollArea className="h-64 p-4 border rounded-md">
                <ul className="space-y-4">
                    {data.map((text, i) => <li key={i} className="text-sm border-b pb-2">{text}</li>)}
                </ul>
            </ScrollArea>
        </CardContent>
    </Card>
);

const BestWorstChart = ({ data, title }: { data: { name: string, netScore: number, bestPct: number, worstPct: number }[], title: string }) => {
    const [chartType, setChartType] = useState<'net_score' | 'best_vs_worst'>('net_score');

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-full mt-2">
                    <TabsList>
                        <TabsTrigger value="net_score">Net Score</TabsTrigger>
                        <TabsTrigger value="best_vs_worst">Best vs Worst</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartContainer config={{}} className="w-full h-[300px]">
                        <ResponsiveContainer>
                            {chartType === 'net_score' ? (
                                <BarChart data={[...data].sort((a, b) => b.netScore - a.netScore)} layout="vertical" margin={{ left: 100 }}>
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <XAxis type="number" />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`} />} />
                                    <Bar dataKey="netScore" name="Net Score" fill="hsl(var(--primary))" />
                                </BarChart>
                            ) : (
                                <BarChart data={data} margin={{ left: 100 }}>
                                    <YAxis />
                                    <XAxis type="category" dataKey="name" />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`} />} />
                                    <Legend />
                                    <Bar dataKey="bestPct" name="Best %" fill="hsl(var(--chart-2))" />
                                    <Bar dataKey="worstPct" name="Worst %" fill="hsl(var(--chart-5))" />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </ChartContainer>
                    <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Net Score</TableHead></TableRow></TableHeader>
                        <TableBody>{[...data].sort((a, b) => b.netScore - a.netScore).map(item => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.netScore.toFixed(1)}</TableCell></TableRow>))}</TableBody>
                    </Table>
                </div>
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
    const [survey, setSurvey] = useState<any>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (surveyId) {
            try {
                const storedSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
                const currentSurvey = storedSurveys.find((s: any) => s.id === surveyId);
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
        return (survey.questions || []).map((q: Question) => {
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
                    <h1 className="font-headline text-3xl">{survey.title}</h1>
                    <p className="text-muted-foreground">
                        A summary of <Badge variant="secondary">{responses.length} responses</Badge>.
                    </p>
                </div>
            </div>
            
            <Tabs defaultValue="results" className="w-full">
                <TabsList>
                    <TabsTrigger value="results">Result</TabsTrigger>
                    <TabsTrigger value="further_analysis">Further Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="results" className="mt-4">
                    <div className="space-y-6">
                        {analysisData.map((result, index) => {
                            if (!result) return null;
                            switch (result.type) {
                                case 'categorical':
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
                </TabsContent>
                <TabsContent value="further_analysis" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Further Analysis</CardTitle>
                            <CardDescription>This section is under construction. More advanced analysis tools are coming soon!</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <p className="text-muted-foreground">Stay tuned for updates.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


    