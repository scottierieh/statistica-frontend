

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Customized, BoxPlot } from 'recharts';
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
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

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
    if (values.length === 0) return { mean: 0, median: 0, std: 0, count: 0, histogram: [], boxplot: [] };
    
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

    return { mean, median, std, count: values.length, histogram, boxplot };
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

const NumericChart = ({ data, title }: { data: { mean: number, median: number, std: number, count: number, histogram: {name: string, count: number}[], boxplot: any[] }, title: string }) => {
    const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram');
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="col-span-1">
                    <TabsList>
                        <TabsTrigger value="histogram"><BarChartIcon className="w-4 h-4 mr-2"/>Histogram</TabsTrigger>
                        <TabsTrigger value="boxplot"><BarChartIcon className="w-4 h-4 mr-2"/>Box Plot</TabsTrigger>
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
                        <ChartContainer config={{}} className="w-full h-64">
                            <ResponsiveContainer>
                                <BarChart data={data.boxplot} layout="vertical">
                                    <YAxis type="category" dataKey="name" hide />
                                    <XAxis type="number" />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="box" name="Box" fill="hsl(var(--primary))" shape={<div />} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
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

const RatingChart = ({ data, title }: { data: { name: string, count: number, percentage: number }[], title: string }) => {
    const totalResponses = data.reduce((sum, item) => sum + item.count, 0);
    const weightedSum = data.reduce((sum, item) => sum + Number(item.name) * item.count, 0);
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
                        {data.map((item) => (
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
                                <YAxis type="category" dataKey="name" width={100} />
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
                    <TabsContent value="grouped">
                        <ChartContainer config={{}} className="w-full h-[400px]">
                            <ResponsiveContainer>
                                <BarChart data={data.chartData}>
                                    <XAxis dataKey="name" />
                                    <YAxis unit="%"/>
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`}/>} />
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

```
- src/types/survey.ts:
```ts

export interface Survey {
  id: string;
  title: string;
  status: 'active' | 'draft' | 'closed';
  created_date: string;
  startDate?: string;
  endDate?: string;
  questions?: any[]; 
  description?: string; 
  name?: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
  answers: {
    [questionId: string]: any;
  }
}

```
- tailwind.config.ts:
```ts
import type {Config} from 'tailwindcss';
const {fontFamily} = require('tailwindcss/defaultTheme');

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        body: ['Inter', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {height: '0'},
          to: {height: 'var(--radix-accordion-content-height)'},
        },
        'accordion-up': {
          from: {height: 'var(--radix-accordion-content-height)'},
          to: {height: '0'},
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

```
- tsconfig.json:
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ],
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```
