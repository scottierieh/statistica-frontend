
'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList, CartesianGrid } from 'recharts';
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

    const histogramBins = jStat.histogram(values, 10);
    const histogramData = histogramBins.map((count: number, i: number) => ({
      name: `${histogramBins.x[i].toFixed(1)}-${(histogramBins.x[i] + histogramBins.dx).toFixed(1)}`,
      count,
    }));

    const q1 = sorted[Math.floor(0.25 * sorted.length)];
    const q3 = sorted[Math.floor(0.75 * sorted.length)];
    const boxplot = [{
        name: questionId,
        box: [q1, median, q3],
        whisker: [Math.min(...values), Math.max(...values)],
        outliers: [] // Placeholder for outlier detection
    }];

    return { mean, median, std, count: values.length, histogram: histogramData, boxplot, values };
};

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
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                  <XAxis type="number" dataKey="count" />
                                  <YAxis dataKey="name" type="category" width={100} />
                                  <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} (${(data.find(d=>d.count === value)?.percentage || 0).toFixed(1)}%)`} />} cursor={{fill: 'hsl(var(--muted))'}} />
                                  <Bar dataKey="count" name="Frequency" fill="hsl(var(--primary))" radius={4}>
                                    <LabelList dataKey="count" position="insideRight" style={{ fill: 'hsl(var(--primary-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                                  </Bar>
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
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <ChartContainer config={{}} className="w-full h-64">
                    <ResponsiveContainer>
                        <BarChart data={data.histogram}>
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} />
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" name="Frequency" fill="hsl(var(--primary))">
                                <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg flex flex-col justify-center items-center">
                        <p className="text-sm text-muted-foreground">Mean</p>
                        <p className="text-2xl font-bold">{data.mean.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg flex flex-col justify-center items-center">
                        <p className="text-sm text-muted-foreground">Median</p>
                        <p className="text-2xl font-bold">{data.median.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg flex flex-col justify-center items-center">
                        <p className="text-sm text-muted-foreground">Std. Dev.</p>
                        <p className="text-2xl font-bold">{data.std.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg flex flex-col justify-center items-center">
                        <p className="text-sm text-muted-foreground">Responses</p>
                        <p className="text-2xl font-bold">{data.count}</p>
                    </div>
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

const NPSChart = ({ data, title }: { data: { npsScore: number; promoters: number; passives: number; detractors: number; total: number, interpretation: string }, title: string }) => {
    const GaugeChart = ({ score }: { score: number }) => {
      const getLevel = (s: number) => {
          if (s >= 70) return { level: 'Excellent', color: '#10b981' };
          if (s >= 50) return { level: 'Good', color: '#84cc16' };
          if (s >= 30) return { level: 'Fair', color: '#eab308' };
          if (s >= 0) return { level: 'Needs Improvement', color: '#f97316' };
          return { level: 'Poor', color: '#ef4444' };
      };

      const { level, color } = getLevel(score);
      const gaugeValue = score + 100;
      const gaugeData = [{ value: gaugeValue }, { value: 200 - gaugeValue }];

      return (
        <div className="relative flex flex-col items-center justify-center">
          <PieChart width={300} height={200}>
            <Pie
              data={gaugeData}
              cx={150}
              cy={150}
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={120}
              dataKey="value"
              paddingAngle={0}
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
          
          <div className="absolute top-24 flex flex-col items-center">
            <div className="text-5xl font-bold" style={{ color }}>
              {Math.round(score)}
            </div>
            <div className="text-lg text-gray-600 mt-2">
              {level}
            </div>
          </div>
        </div>
      );
    };

    return (
        <Card>
          <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="flex flex-col items-center justify-center">
                <GaugeChart score={data.npsScore} />
                <div className="w-full px-4 mt-4">
                   <div className="text-sm text-gray-600 space-y-1 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs">{data.interpretation}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Group</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell><Badge className="bg-green-500 hover:bg-green-600">Promoters (9-10)</Badge></TableCell>
                            <TableCell className="text-right font-mono">{data.promoters}</TableCell>
                            <TableCell className="text-right font-mono">{data.total > 0 ? ((data.promoters / data.total) * 100).toFixed(1) : 0}%</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell><Badge className="bg-yellow-500 hover:bg-yellow-600">Passives (7-8)</Badge></TableCell>
                            <TableCell className="text-right font-mono">{data.passives}</TableCell>
                            <TableCell className="text-right font-mono">{data.total > 0 ? ((data.passives / data.total) * 100).toFixed(1) : 0}%</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell><Badge variant="destructive">Detractors (0-6)</Badge></TableCell>
                            <TableCell className="text-right font-mono">{data.detractors}</TableCell>
                            <TableCell className="text-right font-mono">{data.total > 0 ? ((data.detractors / data.total) * 100).toFixed(1) : 0}%</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
              </div>
          </CardContent>
        </Card>
      );
    };

const TextResponsesDisplay = ({ data, title }: { data: string[], title: string }) => {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [excludedWords, setExcludedWords] = useState<string[]>([]);
  const [plotData, setPlotData] = useState<any>(null);

  const performAnalysis = useCallback(async (currentExcludedWords: string[]) => {
    setIsLoading(true);
    try {
      const textToAnalyze = data.join('\n');
      const response = await fetch('/api/analysis/wordcloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze, customStopwords: currentExcludedWords.join(',') }),
      });
      if (!response.ok) throw new Error('Failed to analyze text data');
      const result = await response.json();
      setAnalysisResult(result);
      setPlotData(JSON.parse(result.plots.wordcloud));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [data, toast]);

  useEffect(() => {
    performAnalysis([]);
  }, [data]);
  
  const handleWordDelete = (word: string) => {
    const newExcludedWords = [...excludedWords, word];
    setExcludedWords(newExcludedWords);
    performAnalysis(newExcludedWords);
  };

  if (isLoading) return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><Skeleton className="h-64" /></CardContent></Card>;
  if (!analysisResult) return null;

  return (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
                 <h3 className="font-semibold text-center mb-2">Word Cloud</h3>
                {plotData ? (
                    <Plot
                        data={plotData.data}
                        layout={plotData.layout}
                        useResizeHandler
                        className="w-full h-[300px]"
                    />
                ) : <Skeleton className="h-[300px] w-full" />}
            </div>
            <div>
                <h3 className="font-semibold text-center mb-2">Word Frequency</h3>
                <ScrollArea className="h-[300px] border rounded-md">
                    <Table>
                        <TableHeader><TableRow><TableHead>Word</TableHead><TableHead className="text-right">Frequency</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {Object.entries(analysisResult.frequencies).map(([word, count]) => (
                                <TableRow key={word}>
                                    <TableCell>{word}</TableCell>
                                    <TableCell className="text-right">{count as number}</TableCell>
                                    <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleWordDelete(word)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </CardContent>
    </Card>
  );
};


const BestWorstChart = ({ data, title }: { data: { name: string, netScore: number, bestPct: number, worstPct: number }[], title: string }) => {
    const [chartType, setChartType] = useState<'net_score' | 'best_vs_worst'>('net_score');

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start gap-4">
                   <CardTitle>{title}</CardTitle>
                   <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-auto">
                        <TabsList>
                            <TabsTrigger value="net_score">Net Score</TabsTrigger>
                            <TabsTrigger value="best_vs_worst">Best vs Worst</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
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
                                    <Bar dataKey="netScore" name="Net Score" fill="hsl(var(--primary))">
                                        <LabelList dataKey="netScore" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fontSize: 11 }} />
                                    </Bar>
                                </BarChart>
                            ) : (
                                <BarChart data={data} margin={{ left: 100 }}>
                                    <YAxis />
                                    <XAxis type="category" dataKey="name" />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`} />} />
                                    <Legend />
                                    <Bar dataKey="bestPct" name="Best %" fill="hsl(var(--chart-2))">
                                        <LabelList dataKey="bestPct" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fontSize: 11 }} />
                                    </Bar>
                                    <Bar dataKey="worstPct" name="Worst %" fill="hsl(var(--chart-5))">
                                        <LabelList dataKey="worstPct" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fontSize: 11 }} />
                                    </Bar>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </ChartContainer>
                    
                    {chartType === 'net_score' ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Net Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...data].sort((a, b) => b.netScore - a.netScore).map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right">{item.netScore.toFixed(1)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Best %</TableHead>
                                    <TableHead className="text-right">Worst %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right">{item.bestPct.toFixed(1)}%</TableCell>
                                        <TableCell className="text-right">{item.worstPct.toFixed(1)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const MatrixChart = ({ data, title, rows, columns }: { data: any, title: string, rows: string[], columns: string[] }) => {
    const [chartType, setChartType] = useState<'stacked' | 'grouped'>('stacked');
    const [tableFormat, setTableFormat] = useState('counts');
    const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
    
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

        const getRowTotal = (rowIndex: number) => {
            switch(tableFormat) {
                case 'row_percent':
                    return '100.0%';
                case 'col_percent':
                    return ''; // 열 % 모드에서는 행 합계 숨김
                case 'total_percent':
                    return ((rowTotals[rowIndex] / total) * 100 || 0).toFixed(1) + '%';
                default:
                    return rowTotals[rowIndex];
            }
        };

        const getColTotal = (colIndex: number) => {
            switch(tableFormat) {
                case 'row_percent':
                    return ''; // 행 % 모드에서는 열 합계 숨김
                case 'col_percent':
                    return '100.0%';
                case 'total_percent':
                    return ((colTotals[colIndex] / total) * 100 || 0).toFixed(1) + '%';
                default:
                    return colTotals[colIndex];
            }
        };

        const getGrandTotal = () => {
            switch(tableFormat) {
                case 'row_percent':
                case 'col_percent':
                    return ''; // 행%/열% 모드에서는 전체 합계 숨김
                case 'total_percent':
                    return '100.0%';
                default:
                    return total;
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
                            <TableCell className="text-right font-bold font-mono">{getRowTotal(rowIndex)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                        <TableHead>Total</TableHead>
                         {columns.map((c: string, colIndex: number) => <TableCell key={c} className="text-right font-mono">{getColTotal(colIndex)}</TableCell>)}
                        <TableCell className="text-right font-mono">{getGrandTotal()}</TableCell>
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
                                        <Bar key={col} dataKey={`${col}_pct`} name={col} stackId="a" fill={COLORS[i % COLORS.length]}>
                                            <LabelList dataKey={`${col}_pct`} position="center" formatter={(value: number) => value > 5 ? `${value.toFixed(1)}%` : ''} style={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }} />
                                        </Bar>
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
                                        <Bar key={col} dataKey={`${col}_pct`} name={col} fill={COLORS[i % COLORS.length]}>
                                            <LabelList dataKey={`${col}_pct`} position="top" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fontSize: 11 }} />
                                        </Bar>
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
    const [analysisData, setAnalysisData] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (surveyId) {
                try {
                    const storedSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
                    const currentSurvey = storedSurveys.find((s: any) => s.id === surveyId);
                    setSurvey(currentSurvey || null);

                    const storedResponses = JSON.parse(localStorage.getItem(`${surveyId}_responses`) || '[]');
                    setResponses(storedResponses);

                    if (currentSurvey) {
                      const processed = await processAllData(currentSurvey.questions, storedResponses);
                      setAnalysisData(processed);
                    } else {
                        setError("Survey not found.");
                    }
                } catch (error) {
                    console.error("Failed to load survey data:", error);
                    setError("Failed to load survey.");
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [surveyId]);
    
    const processAllData = async (questions: Question[], responses: SurveyResponse[]) => {
      return Promise.all((questions || []).map(async (q: Question) => {
          const questionId = String(q.id);
          switch(q.type) {
              case 'single':
              case 'dropdown':
              case 'multiple':
                  return { type: 'categorical', title: q.title, data: processCategoricalResponses(responses, q) };
              case 'number':
                  const numericData = processNumericResponses(responses, questionId);
                  return { type: 'numeric', title: q.title, data: numericData, questionId };
              case 'rating':
                  return { type: 'rating', title: q.title, data: processNumericResponses(responses, questionId) };
              case 'nps':
                  const npsScores = responses.map((r: any) => r.answers[questionId]).filter(v => typeof v === 'number');
                  const npsResponse = await fetch('/api/analysis/nps', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ scores: npsScores }),
                  });
                  const npsResult = await npsResponse.json();
                  return { type: 'nps', title: q.title, data: npsResult.results };
              case 'text':
                   return { type: 'text', title: q.title, data: processTextResponses(responses, questionId) };
              case 'best-worst':
                  return { type: 'best-worst', title: q.title, data: processBestWorst(responses, q) };
              case 'matrix':
                  return { type: 'matrix', title: q.title, data: processMatrixResponses(responses, q), rows: q.rows, columns: q.scale || q.columns };
              default:
                  return null;
          }
      }).filter(Boolean));
    };


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

```