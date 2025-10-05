
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList, CartesianGrid, Treemap } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BarChart as BarChartIcon, Brain, Users, LineChart as LineChartIcon, PieChart as PieChartIcon, Box, ArrowLeft, CheckCircle, XCircle, Star, ThumbsUp, ThumbsDown, Info, ImageIcon, PlusCircle, Trash2, X, Phone, Mail, Share2, Grid3x3, ChevronDown, Sigma, Loader2, Download, Bot, Settings, FileSearch, MoveRight, HelpCircle, CheckSquare, Target, Sparkles, Smartphone, Tablet, Monitor, FileDown, ClipboardList, BeakerIcon, ShieldAlert, ShieldCheck, Columns } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import type { Question } from '@/entities/Survey';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { produce } from 'immer';
import { jStat } from 'jstat';
import dynamic from 'next/dynamic';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const Plot = dynamic(() => import('react-plotly.js').then(mod => mod.default), { ssr: false });

interface CrosstabResults {
    contingency_table: { [key: string]: { [key: string]: number } };
    chi_squared: {
        statistic: number;
        p_value: number;
        degrees_of_freedom: number;
    };
    cramers_v: number;
    plot: string;
    interpretation: string;
}

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
    if (values.length === 0) return { mean: 0, median: 0, std: 0, count: 0, skewness: 0, histogram: [], boxplot: [], values: [] };
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = [...values].sort((a,b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
    const std = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a,b) => a+b, 0) / (values.length > 1 ? values.length -1 : 1) );
    
    const n = values.length;
    const skewness = n > 2 && std > 0 ? (n / ((n - 1) * (n - 2))) * values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0) : 0;
    
    const histogramData = (() => {
        if (!values || values.length === 0) return [];
        const n = values.length;
        const iqr = jStat.percentile(values, 0.75) - jStat.percentile(values, 0.25);
        let binWidth;
        if (iqr > 0) {
            binWidth = 2 * iqr * Math.pow(n, -1/3); // Freedman-Diaconis rule
        } else {
            const range = Math.max(...values) - Math.min(...values);
            binWidth = range > 0 ? range / 10 : 1;
        }

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const numBins = binWidth > 0 ? Math.min(50, Math.ceil((maxVal - minVal) / binWidth)) : 10;
        
        if (numBins <= 0 || !isFinite(numBins)) {
            return [];
        }
        
        const binEdges = jStat.arange(numBins).map((_, i) => minVal + i * binWidth);
        binEdges.push(minVal + numBins * binWidth);

        const counts = Array(numBins).fill(0);
        values.forEach(val => {
            const binIndex = Math.min(Math.floor((val - minVal) / binWidth), numBins - 1);
            if(binIndex >= 0) counts[binIndex]++;
        });

        return counts.map((count: number, i: number) => ({
            name: `${binEdges[i].toFixed(1)}-${binEdges[i+1]?.toFixed(1)}`,
            count
        }));
    })();

    const q1 = jStat.percentile(sorted, 0.25);
    const q3 = jStat.percentile(sorted, 0.75);
    const boxplot = [{
        name: questionId,
        box: [q1, median, q3],
        whisker: [Math.min(...values), Math.max(...values)],
        outliers: [] // Placeholder for outlier detection
    }];

    return { mean, median, std, count: values.length, skewness, histogram: histogramData, boxplot, values };
};


const processBestWorst = async (responses: SurveyResponse[], question: Question) => {
    const questionId = String(question.id);
    const data = responses.map(r => r.answers[questionId]).filter(Boolean);

    const response = await fetch('/api/analysis/maxdiff', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ data: data, bestCol: 'best', worstCol: 'worst' })
    });
    if (!response.ok) {
        console.error("MaxDiff analysis failed");
        return null;
    }
    const result = await response.json();
    return result.results;
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
                if(result[row] && typeof colValue === 'string' && colValue in result[row]) {
                    result[row][colValue]++;
                }
            });
        }
    });

    const chartData = rows.map(row => {
        const entry: {[key: string]: string | number} = { name: row };
        let total = 0;
        columns.forEach(col => {
            const count = result[row]?.[col] || 0;
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

const processNPS = async (responses: SurveyResponse[], questionId: string) => {
    const npsScores = responses.map((r: any) => r.answers[questionId]).filter(v => typeof v === 'number');
    const response = await fetch('/api/analysis/nps', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ scores: npsScores }),
    });
    if (!response.ok) {
        console.error("NPS analysis failed");
        return null;
    }
    const result = await response.json();
    return result.results;
};


// --- Chart Components ---
const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

const CustomizedTreemapContent = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, rank, name, percentage } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {width > 80 && height > 40 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={14}
          dominantBaseline="middle"
        >
          <tspan x={x + width / 2} dy="-0.5em">{name}</tspan>
          <tspan x={x + width / 2} dy="1.2em">{percentage?.toFixed(1)}%</tspan>
        </text>
      )}
    </g>
  );
};


const CategoricalChart = ({ data, title, onDownload }: { data: {name: string, count: number, percentage: number}[], title: string, onDownload: () => void }) => {
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'treemap'>('bar');
    
    const interpretation = useMemo(() => {
        if (!data || data.length === 0) return null;
        const mode = data.reduce((prev, current) => (prev.count > current.count) ? prev : current);
        return {
            title: "Most Frequent Response",
            text: `The most common response was <strong>'${mode.name}'</strong>, accounting for <strong>${mode.percentage.toFixed(1)}%</strong> of all answers.`,
            variant: "default"
        };
    }, [data]);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onDownload}><Download className="w-4 h-4" /></Button>
                </div>
            </CardHeader>
             <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="col-span-1">
                    <TabsList>
                        <TabsTrigger value="bar"><BarChartIcon className="w-4 h-4 mr-2"/>Bar</TabsTrigger>
                        <TabsTrigger value="pie"><PieChartIcon className="w-4 h-4 mr-2"/>Pie</TabsTrigger>
                        <TabsTrigger value="treemap"><Grid3x3 className="w-4 h-4 mr-2"/>Treemap</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bar" className="mt-4">
                         <ChartContainer config={{}} className="w-full h-64">
                            <ResponsiveContainer>
                                <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                  <XAxis type="number" dataKey="count" />
                                  <YAxis dataKey="name" type="category" width={100} />
                                  <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} (${(data.find(d=>d.count === value)?.percentage || 0).toFixed(1)}%)`} />} cursor={{fill: 'hsl(var(--muted))'}} />
                                  <Bar dataKey="count" name="Frequency" radius={4}>
                                    <LabelList dataKey="count" position="insideRight" style={{ fill: 'hsl(var(--primary-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                                    {data.map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                  </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </TabsContent>
                     <TabsContent value="pie" className="mt-4">
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
                    <TabsContent value="treemap" className="mt-4">
                        <ChartContainer config={{}} className="w-full h-64">
                            <ResponsiveContainer>
                                <Treemap
                                    data={data}
                                    dataKey="count"
                                    nameKey="name"
                                    aspectRatio={16 / 9}
                                    stroke="#fff"
                                    content={<CustomizedTreemapContent />}
                                />
                            </ResponsiveContainer>
                        </ChartContainer>
                    </TabsContent>
                </Tabs>
                <div className="col-span-1 space-y-4">
                     <Table>
                        <TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                        <TableBody>{data.map((item, index) => ( <TableRow key={`${item.name}-${index}`}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.count}</TableCell><TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell></TableRow> ))}</TableBody>
                    </Table>
                    {interpretation && (
                        <Alert variant={interpretation.variant as any}>
                            <Info className="h-4 w-4" />
                            <AlertTitle>{interpretation.title}</AlertTitle>
                            <AlertDescription dangerouslySetInnerHTML={{ __html: interpretation.text }} />
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};



const NumericChart = ({ data, title, onDownload }: { data: { mean: number, median: number, std: number, count: number, skewness: number, histogram: {name: string, count: number}[], values: number[] }, title: string, onDownload: () => void }) => {
    const interpretation = useMemo(() => {
        if (!data || isNaN(data.mean)) return null;
        let skewText = '';
        const skewness = data.skewness;
        if (!isNaN(skewness)) {
          if (Math.abs(skewness) > 1) {
              skewText = `The distribution is <strong>highly ${skewness > 0 ? 'right-skewed' : 'left-skewed'}</strong> (skewness = ${skewness.toFixed(2)}). This suggests the presence of outliers or a non-symmetrical pattern in responses.`;
          } else if (Math.abs(skewness) > 0.5) {
              skewText = `The data is <strong>moderately ${skewness > 0 ? 'right-skewed' : 'left-skewed'}</strong>.`;
          } else {
              skewText = `The data appears to be roughly <strong>symmetrical</strong>.`;
          }
        }
        
        return {
            title: "Distribution Summary",
            text: `The average response is <strong>${data.mean.toFixed(2)}</strong> with a standard deviation of <strong>${data.std.toFixed(2)}</strong>. ${skewText}`,
            variant: Math.abs(skewness) > 1 ? "destructive" : "default"
        };
    }, [data]);
    
    if (!data || !data.histogram) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No data available for this numeric question.</p>
          </CardContent>
        </Card>
      );
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onDownload}><Download className="w-4 h-4" /></Button>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartContainer config={{count: {label: 'Freq.'}}} className="w-full h-64">
                    <ResponsiveContainer>
                        <BarChart data={data.histogram}>
                            <CartesianGrid />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} />
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" name="Frequency" fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                 <div className="space-y-4">
                    <Table>
                        <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            <TableRow><TableCell>Mean</TableCell><TableCell className="text-right">{data.mean.toFixed(3)}</TableCell></TableRow>
                            <TableRow><TableCell>Median</TableCell><TableCell className="text-right">{data.median}</TableCell></TableRow>
                            <TableRow><TableCell>Std. Deviation</TableCell><TableCell className="text-right">{data.std.toFixed(3)}</TableCell></TableRow>
                            <TableRow><TableCell>Total Responses</TableCell><TableCell className="text-right">{data.count}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                    {interpretation && (
                        <Alert variant={interpretation.variant as any}>
                            <Info className="h-4 w-4" />
                            <AlertTitle>{interpretation.title}</AlertTitle>
                            <AlertDescription dangerouslySetInnerHTML={{ __html: interpretation.text }} />
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const RatingChart = ({ data, title, onDownload }: { data: { values: number[], count: number, mean: number, std: number }, title: string, onDownload: () => void }) => {
    if (!data || data.values.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                <CardContent><p>No data available for this rating question.</p></CardContent>
            </Card>
        );
    }
    const ratingCounts: {[key: number]: number} = {};
    const scale = Array.from({length: 5}, (_, i) => i + 1);
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

    const averageRating = data.mean;
    
    const interpretation = useMemo(() => {
        if (!tableData || tableData.length === 0) return null;
        const mode = tableData.reduce((prev, current) => (prev.count > current.count) ? prev : current);
        return {
            title: "Rating Summary",
            text: `The average rating is <strong>${averageRating.toFixed(2)} out of 5</strong>. The most common rating was <strong>${mode.name} stars</strong>, given by <strong>${mode.percentage.toFixed(1)}%</strong> of respondents.`,
            variant: "default"
        };
    }, [tableData, averageRating]);

    return (
        <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                   <CardTitle>{title}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onDownload}><Download className="w-4 h-4" /></Button>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col items-center justify-center">
                    <p className="text-5xl font-bold">{averageRating.toFixed(2)}</p>
                    <div className="flex items-center mt-2">
                        {[...Array(5)].map((_, i) => (
                           <Star key={i} className={cn("w-7 h-7 text-yellow-300", averageRating > i && "fill-yellow-400")} />
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Average Rating</p>
                </div>
                 <div className="space-y-4">
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
                      {interpretation && (
                        <Alert variant={interpretation.variant as any}>
                            <Info className="h-4 w-4" />
                            <AlertTitle>{interpretation.title}</AlertTitle>
                            <AlertDescription dangerouslySetInnerHTML={{ __html: interpretation.text }} />
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


const NPSChart = ({ data, title, onDownload }: { data: { npsScore: number; promoters: number; passives: number; detractors: number; total: number, interpretation: string }, title: string, onDownload: () => void }) => {
    const GaugeChart = ({ score }: { score: number }) => {
      const getLevel = (s: number) => {
          if (s >= 50) return { level: 'Excellent', color: '#10b981' };
          if (s >= 0) return { level: 'Good', color: '#eab308' };
          return { level: 'Needs Improvement', color: '#ef4444' };
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
        
    const formattedInterpretation = data.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>{title}</CardTitle>
                <Button variant="ghost" size="icon" onClick={onDownload}><Download className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
           <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center justify-center">
                    <GaugeChart score={data.npsScore} />
                    <div className="mt-4 space-y-2 text-sm text-gray-700 text-center">
                        <p><strong>NPS Score</strong> is calculated as<br/>(% Promoters - % Detractors).</p>
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
                    <Alert>
                        <AlertTitle>Summary</AlertTitle>
                        <AlertDescription dangerouslySetInnerHTML={{ __html: formattedInterpretation }} />
                    </Alert>
                </div>
            </CardContent>
        </Card>
      );
};


const TextResponsesDisplay = ({ data, title, onDownload }: { data: string[], title: string, onDownload: () => void }) => {
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
  }, [data, performAnalysis]);
  
  const handleWordDelete = (word: string) => {
    const newExcludedWords = [...excludedWords, word];
    setExcludedWords(newExcludedWords);
    performAnalysis(newExcludedWords);
  };

  if (isLoading) return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><Skeleton className="h-64" /></CardContent></Card>;
  if (!analysisResult) return null;

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>{title}</CardTitle>
                <Button variant="ghost" size="icon" onClick={onDownload}><Download className="w-4 h-4" /></Button>
            </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
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


const BestWorstChart = ({ data, title, onDownload }: { data: { scores: any[], interpretation: string }, title: string, onDownload: () => void }) => {
    const [chartType, setChartType] = useState<'net_score' | 'best_vs_worst'>('net_score');

    if (!data || !data.scores) return null;

    const chartData = data.scores.map(item => ({
        name: item.item,
        netScore: item.net_score,
        bestPct: item.best_pct,
        worstPct: item.worst_pct,
    }));
    
    const formattedInterpretation = data.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return (
        <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                   <CardTitle>{title}</CardTitle>
                   <div className="flex items-top gap-2">
                       <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-auto">
                            <TabsList>
                                <TabsTrigger value="net_score">Net Score</TabsTrigger>
                                <TabsTrigger value="best_vs_worst">Best vs Worst</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button variant="ghost" size="icon" onClick={onDownload}><Download className="w-4 h-4" /></Button>
                   </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartContainer config={{}} className="w-full h-[300px]">
                        <ResponsiveContainer>
                            {chartType === 'net_score' ? (
                                <BarChart data={[...chartData].sort((a, b) => b.netScore - a.netScore)} layout="vertical" margin={{ left: 100 }}>
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <XAxis type="number" />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`} />} />
                                    <Bar dataKey="netScore" name="Net Score" fill="hsl(var(--primary))">
                                        <LabelList dataKey="netScore" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fontSize: 11 }} />
                                    </Bar>
                                </BarChart>
                            ) : (
                                <BarChart data={chartData} margin={{ left: 20 }}>
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
                    
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Net Score</TableHead>
                                    <TableHead className="text-right">Best %</TableHead>
                                    <TableHead className="text-right">Worst %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...chartData].sort((a, b) => b.netScore - a.netScore).map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right font-mono">{item.netScore.toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono">{item.bestPct.toFixed(1)}%</TableCell>
                                        <TableCell className="text-right font-mono">{item.worstPct.toFixed(1)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Alert>
                            <AlertTitle className="flex items-center gap-2"><Bot/> Interpretation</AlertTitle>
                            <AlertDescription dangerouslySetInnerHTML={{ __html: formattedInterpretation}} />
                        </Alert>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


const MatrixChart = ({ data, title, rows, columns, onDownload }: { data: any, title: string, rows: string[], columns: string[], onDownload: () => void }) => {
    const [chartType, setChartType] = useState<'stacked' | 'grouped'>('stacked');
    
    const interpretation = useMemo(() => {
        if (!data || !data.heatmapData) return null;

        const numericColumns = columns.map(c => parseFloat(c)).filter(c => !isNaN(c));
        const useNumericScores = numericColumns.length > 0 && numericColumns.length === columns.length;
        
        let detailedBreakdown = "";

        if (useNumericScores) {
            const averageScores = data.rows.map((rowName: string) => {
                const rowData = data.heatmapData[rowName];
                let totalScore = 0;
                let totalCount = 0;
                numericColumns.forEach((score, index) => {
                    const colLabel = columns[index];
                    const count = rowData[colLabel] || 0;
                    totalScore += score * count;
                    totalCount += count;
                });
                return { row: rowName, avgScore: totalCount > 0 ? totalScore / totalCount : 0 };
            }).sort((a,b) => b.avgScore - a.avgScore);

            if (averageScores.length < 2) return { title: "Not enough data for summary.", text: "", variant: "default"};
            const highest = averageScores[0];
            const lowest = averageScores[averageScores.length - 1];
            
            detailedBreakdown = data.rows.map((rowName: string) => {
                const rowData = data.heatmapData[rowName];
                const totalResponses = Object.values(rowData).reduce((acc: number, val: any) => acc + val, 0);
                if (totalResponses === 0) return `For <strong>'${rowName}'</strong>, there were no responses.`;
                
                const distributionData = Object.entries(rowData).map(([col, count]) => ({
                    col,
                    pct: (count as number / totalResponses * 100)
                })).sort((a,b) => b.pct - a.pct);
                
                return `For <strong>'${rowName}'</strong>, the response distribution was: ${distributionData.map(d => `'${d.col}' (${d.pct.toFixed(1)}%)`).join(', ')}.`;

            }).join('<br><br>');

             return {
                title: "Performance Summary",
                text: `<strong>Overall: '${highest.row}'</strong> received the highest average rating (${highest.avgScore.toFixed(2)}), while <strong>'${lowest.row}'</strong> received the lowest (${lowest.avgScore.toFixed(2)}). <br><br><strong>Detailed Breakdown:</strong><br>${detailedBreakdown}`,
                variant: 'default',
            }

        } else {
            detailedBreakdown = data.rows.map((rowName: string) => {
                const rowData = data.heatmapData[rowName];
                const totalResponses = Object.values(rowData).reduce((acc: number, val: any) => acc + val, 0);
                if (totalResponses === 0) return `For <strong>'${rowName}'</strong>, there were no responses.`;
                
                const distributionData = Object.entries(rowData).map(([col, count]) => ({
                    col,
                    count: count as number,
                    pct: totalResponses > 0 ? (count as number / totalResponses * 100) : 0
                })).sort((a,b) => b.count - a.count);
                
                const mostCommon = distributionData[0];

                 return `For <strong>'${rowName}'</strong>, the most common response was <strong>'${mostCommon.col}'</strong> (${mostCommon.pct.toFixed(1)}%).`;
            }).join('<br>');
             return {
                title: "Response Distribution by Item",
                text: detailedBreakdown,
                variant: 'default',
            };
        }
    }, [data, columns]);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                    <div className="flex items-top gap-2">
                       <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-auto">
                            <TabsList>
                                <TabsTrigger value="stacked">Stacked</TabsTrigger>
                                <TabsTrigger value="grouped">Grouped</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button variant="ghost" size="icon" onClick={onDownload}><Download className="w-4 h-4" /></Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartContainer config={{}} className="w-full h-[400px]">
                        <ResponsiveContainer>
                            {chartType === 'stacked' ? (
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
                            ) : (
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
                            )}
                        </ResponsiveContainer>
                    </ChartContainer>
                    <div className="overflow-x-auto">
                        {interpretation && (
                            <Alert variant={interpretation.variant as any}>
                                <Info className="h-4 w-4" />
                                <AlertTitle>{interpretation.title}</AlertTitle>
                                <AlertDescription dangerouslySetInnerHTML={{ __html: interpretation.text }} />
                            </Alert>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


export default function SurveyAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const chartRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<any>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [analysisData, setAnalysisData] = useState<any[]>([]);
    
    // States for "Further Analysis"
    const [crosstabRow, setCrosstabRow] = useState<string | undefined>();
    const [crosstabCol, setCrosstabCol] = useState<string | undefined>();
    const [isCrosstabLoading, setIsCrosstabLoading] = useState(false);
    const [crosstabResult, setCrosstabResult] = useState<CrosstabResults | null>(null);

    const processAllData = useCallback(async (questions: Question[], responses: SurveyResponse[]) => {
      if (!questions || !responses) {
        return [];
      }
      return Promise.all(questions.map(async (q: Question) => {
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
                   const ratingData = processNumericResponses(responses, questionId);
                   return { type: 'rating', title: q.title, data: ratingData };
              case 'nps':
                  const npsData = await processNPS(responses, questionId);
                  return { type: 'nps', title: q.title, data: npsData };
              case 'text':
                   return { type: 'text', title: q.title, data: processTextResponses(responses, questionId) };
              case 'best-worst':
                  const bestWorstData = await processBestWorst(responses, q);
                  return { type: 'best-worst', title: q.title, data: bestWorstData };
              case 'matrix':
                  return { type: 'matrix', title: q.title, data: processMatrixResponses(responses, q), rows: q.rows, columns: q.scale || q.columns };
              default:
                  return null;
          }
      }).filter(Boolean));
    }, []);
    
    useEffect(() => {
        const loadData = async () => {
            if (surveyId) {
                try {
                    const storedSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
                    const currentSurvey = storedSurveys.find((s: any) => s.id === surveyId);
                    setSurvey(currentSurvey || null);

                    const storedResponses = JSON.parse(localStorage.getItem(`${surveyId}_responses`) || '[]');
                    setResponses(storedResponses);

                    if (currentSurvey && currentSurvey.questions) {
                      const processed = await processAllData(currentSurvey.questions, storedResponses);
                      setAnalysisData(processed);
                    } else {
                        setError("Survey not found or has no questions.");
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
    }, [surveyId, processAllData]);
    
    const downloadChartAsPng = useCallback((chartId: string, title: string) => {
        const chartElement = chartRefs.current[chartId];
        if (chartElement) {
            html2canvas(chartElement, { scale: 2 }).then(canvas => {
                const image = canvas.toDataURL("image/png", 1.0);
                const link = document.createElement('a');
                link.download = `${title.replace(/ /g, '_')}.png`;
                link.href = image;
                link.click();
            });
        }
    }, []);

    const handleRunCrosstab = useCallback(async () => {
        if (!crosstabRow || !crosstabCol) {
            toast({ title: 'Error', description: 'Please select both a row and a column variable for crosstabulation.', variant: 'destructive' });
            return;
        }

        setIsCrosstabLoading(true);
        setCrosstabResult(null);

        try {
            const crosstabData = responses.map(r => {
                 const rowQuestion = survey.questions.find((q: Question) => q.title === crosstabRow);
                 const colQuestion = survey.questions.find((q: Question) => q.title === crosstabCol);

                return {
                    [crosstabRow]: (r.answers as any)[rowQuestion.id],
                    [crosstabCol]: (r.answers as any)[colQuestion.id],
                }
            });
            
            const response = await fetch('/api/analysis/crosstab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: crosstabData, rowVar: crosstabRow, colVar: crosstabCol })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setCrosstabResult(result.results);

        } catch (e: any) {
            toast({ title: 'Crosstab Analysis Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsCrosstabLoading(false);
        }
    }, [crosstabRow, crosstabCol, responses, survey, toast]);
    
    const categoricalQuestions = useMemo(() => {
        if (!survey) return [];
        return survey.questions.filter((q: Question) => ['single', 'multiple', 'dropdown'].includes(q.type));
    }, [survey]);

    if (loading) {
        return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
    }

    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
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
                    <TabsTrigger value="results">Results</TabsTrigger>
                    <TabsTrigger value="further_analysis">Further Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="results" className="mt-4">
                    <div className="space-y-6">
                        {analysisData.map((result, index) => {
                            if (!result || !result.data) return null;
                            const chartId = `chart-${index}`;
                            return (
                                <div key={index} ref={el => chartRefs.current[chartId] = el}>
                                {(() => {
                                    switch (result.type) {
                                        case 'categorical':
                                            return <CategoricalChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                        case 'numeric':
                                            return <NumericChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                        case 'rating':
                                            return <RatingChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                        case 'nps':
                                            return <NPSChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                        case 'text':
                                             return <TextResponsesDisplay data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                        case 'best-worst':
                                            return <BestWorstChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                        case 'matrix':
                                            return <MatrixChart data={result.data} title={result.title} rows={result.rows!} columns={result.columns!} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                        default:
                                            return null;
                                    }
                                })()}
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>
                <TabsContent value="further_analysis" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Crosstabulation Analysis</CardTitle>
                             <CardDescription>Analyze the relationship between two categorical survey questions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <Label>Row Variable</Label>
                                    <Select value={crosstabRow} onValueChange={setCrosstabRow}>
                                        <SelectTrigger><SelectValue placeholder="Select Row..."/></SelectTrigger>
                                        <SelectContent>
                                            {categoricalQuestions.map((q: Question) => <SelectItem key={q.id} value={q.title}>{q.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Column Variable</Label>
                                    <Select value={crosstabCol} onValueChange={setCrosstabCol} disabled={!crosstabRow}>
                                        <SelectTrigger><SelectValue placeholder="Select Column..."/></SelectTrigger>
                                        <SelectContent>
                                            {categoricalQuestions.filter((q: Question) => q.title !== crosstabRow).map((q: Question) => <SelectItem key={q.id} value={q.title}>{q.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="self-end">
                                    <Button onClick={handleRunCrosstab} disabled={isCrosstabLoading || !crosstabRow || !crosstabCol}>
                                        {isCrosstabLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sigma className="mr-2 h-4 w-4" />}
                                        Run Crosstab
                                    </Button>
                                </div>
                            </div>
                            {isCrosstabLoading && <Skeleton className="h-64 mt-4"/>}
                            {crosstabResult && (
                                <div className="mt-6">
                                     <h3 className="font-semibold text-lg mb-4">Crosstab Results</h3>
                                      <Image src={`data:image/png;base64,${crosstabResult.plot}`} alt="Crosstabulation Plot" width={800} height={500} className="w-full rounded-md border" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
