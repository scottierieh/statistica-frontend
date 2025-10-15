

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Treemap, Cell, LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Scatter, ScatterChart, ReferenceLine, Pie, PieChart, LabelList } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Brain, Users, LineChart as LineChartIcon, PieChart as PieChartIcon, Box, ArrowLeft, CheckCircle, XCircle, Star, ThumbsUp, ThumbsDown, Info, ImageIcon, PlusCircle, Trash2, X, Phone, Mail, Share2, Grid3x3, ChevronDown, Sigma, Loader2, Download, Bot, Settings, FileSearch, MoveRight, HelpCircle, CheckSquare, Target, Sparkles, Smartphone, Tablet, Monitor, FileDown, ClipboardList, BeakerIcon, ShieldAlert, ShieldCheck, TrendingUp, Activity, Palette, Repeat, Link2, Columns, Handshake, Replace, ArrowDownUp } from 'lucide-react';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
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
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import CbcAnalysisPage from '@/components/pages/cbc-analysis-page';
import RatingConjointAnalysisPage from '@/components/pages/rating-conjoint-analysis-page';
import RankingConjointAnalysisPage from '@/components/pages/ranking-conjoint-page';
import IpaPage from '@/components/pages/ipa-page';
import VanWestendorpPage from '@/components/pages/van-westendorp-page';
import TurfPage from '@/components/pages/turf-page';
import AhpPage from '@/components/pages/ahp-page';
import GaborGrangerAnalysisPage from '@/components/pages/gabor-granger-analysis-page';
import SemanticDifferentialPage from '@/components/pages/semantic-differential-page';
import BrandFunnelPage from '@/components/pages/brand-funnel-page';
import ServqualPage from '@/components/pages/servqual-page';
import ServperfPage from '@/components/pages/servperf-page';
import CrosstabSurveyPage from '@/components/pages/crosstab-survey-page';

const Plot = dynamic(() => import('react-plotly.js').then(mod => mod.default), {
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
        outliers: []
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


// --- Improved Color Palette ---
const COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16', // Lime
    '#a855f7', // Purple
];

const GRADIENT_COLORS = {
    primary: 'from-indigo-500 to-purple-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-600',
    danger: 'from-rose-500 to-pink-600',
};

// --- Enhanced Treemap Component ---
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
          strokeOpacity: 0.5,
        }}
        className="transition-opacity hover:opacity-80"
      />
      {width > 80 && height > 40 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={14}
          fontWeight={600}
          dominantBaseline="middle"
        >
          <tspan x={x + width / 2} dy="-0.5em">{name}</tspan>
          <tspan x={x + width / 2} dy="1.2em" fontSize={12}>{percentage?.toFixed(1)}%</tspan>
        </text>
      )}
    </g>
  );
};


// --- Enhanced Categorical Chart ---
const CategoricalChart = ({ data, title, onDownload }: { data: {name: string, count: number, percentage: number}[], title: string, onDownload: () => void }) => {
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'donut' | 'treemap'>('bar');
    
    const interpretation = useMemo(() => {
        if (!data || data.length === 0) return null;
        const mode = data.reduce((prev, current) => (prev.count > current.count) ? prev : current);
        const total = data.reduce((sum, item) => sum + item.count, 0);
        return {
            title: "Key Insights",
            text: `The most popular choice is <strong>'${mode.name}'</strong>, selected by <strong>${mode.count}</strong> respondents (<strong>${mode.percentage.toFixed(1)}%</strong> of total responses).`,
            variant: "default",
            icon: <TrendingUp className="h-4 w-4" />
        };
    }, [data]);
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                        <p className="text-sm text-muted-foreground">Response distribution analysis</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onDownload}
                        className="hover:bg-white/50 dark:hover:bg-slate-700/50"
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3">
                        <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-4">
                                <TabsTrigger value="bar" className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4"/>
                                    <span className="hidden sm:inline">Bar</span>
                                </TabsTrigger>
                                <TabsTrigger value="pie" className="flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4"/>
                                    <span className="hidden sm:inline">Pie</span>
                                </TabsTrigger>
                                <TabsTrigger value="donut" className="flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4"/>
                                    <span className="hidden sm:inline">Donut</span>
                                </TabsTrigger>
                                <TabsTrigger value="treemap" className="flex items-center gap-2">
                                    <Grid3x3 className="w-4 h-4"/>
                                    <span className="hidden sm:inline">Treemap</span>
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="bar" className="mt-0">
                                <ChartContainer config={{}} className="w-full h-80">
                                    <ResponsiveContainer>
                                        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                          <XAxis type="number" dataKey="count" />
                                          <YAxis 
                                              dataKey="name" 
                                              type="category" 
                                              width={150}
                                              tick={{ fontSize: 12 }}
                                          />
                                          <Tooltip 
                                              content={<ChartTooltipContent 
                                                  formatter={(value) => `${value} (${(data.find(d=>d.count === value)?.percentage || 0).toFixed(1)}%)`} 
                                              />} 
                                              cursor={{fill: 'hsl(var(--muted))', opacity: 0.1}} 
                                          />
                                          <Bar dataKey="count" name="Frequency" radius={[0, 8, 8, 0]}>
                                            <LabelList 
                                                dataKey="count" 
                                                position="insideRight" 
                                                style={{ fill: 'hsl(var(--primary-foreground))', fontSize: 12, fontWeight: 'bold' }} 
                                            />
                                            {data.map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                          </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>
                            
                            <TabsContent value="pie" className="mt-0">
                                <ChartContainer config={{}} className="w-full h-80">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie 
                                                data={data} 
                                                dataKey="count" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={100}
                                                label={p => `${p.name} (${p.percentage.toFixed(1)}%)`}
                                                labelLine={{stroke: '#94a3b8', strokeWidth: 1}}
                                            >
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>

                             <TabsContent value="donut" className="mt-0">
                                <ChartContainer config={{}} className="w-full h-80">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie 
                                                data={data} 
                                                dataKey="count" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={60}
                                                outerRadius={100}
                                                label={p => `${p.name} (${p.percentage.toFixed(1)}%)`}
                                                labelLine={{stroke: '#94a3b8', strokeWidth: 1}}
                                            >
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>
                            
                            <TabsContent value="treemap" className="mt-0">
                                <ChartContainer config={{}} className="w-full h-80">
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
                    </div>
                    
                    <div className="xl:col-span-2 space-y-4">
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Option</TableHead>
                                        <TableHead className="text-right font-semibold">Count</TableHead>
                                        <TableHead className="text-right font-semibold">%</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((item, index) => (
                                        <TableRow key={`${item.name}-${index}`} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-3 h-3 rounded-full" 
                                                        style={{backgroundColor: COLORS[index % COLORS.length]}}
                                                    />
                                                    {item.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{item.count}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">
                                                {item.percentage.toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {interpretation && (
                            <Alert className={cn("border-l-4", 
                                interpretation.variant === 'destructive' ? "border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20" : 
                                interpretation.variant === 'warning' ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : 
                                "border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                            )}>
                                <div className="flex gap-2">
                                    {interpretation.icon}
                                    <div className="flex-1">
                                        <AlertTitle className="text-sm font-semibold mb-1">{interpretation.title}</AlertTitle>
                                        <AlertDescription 
                                            className="text-sm" 
                                            dangerouslySetInnerHTML={{ __html: interpretation.text }} 
                                        />
                                    </div>
                                </div>
                            </Alert>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


// --- Enhanced Numeric Chart ---
const NumericChart = ({ data, title, onDownload }: { data: { mean: number, median: number, std: number, count: number, skewness: number, histogram: {name: string, count: number}[], values: number[] }, title: string, onDownload: () => void }) => {
    const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
    const interpretation = useMemo(() => {
        if (!data || isNaN(data.mean)) return null;
        let skewText = '';
        let variant = 'default';
        let icon = <BarChart3 className="h-4 w-4" />;
        
        const skewness = data.skewness;
        if (!isNaN(skewness)) {
          if (Math.abs(skewness) > 1) {
              skewText = `The distribution shows <strong>significant ${skewness > 0 ? 'right-skew' : 'left-skew'}</strong> (skewness = ${skewness.toFixed(2)}), indicating outliers or asymmetry.`;
              variant = 'destructive';
              icon = <AlertTriangle className="h-4 w-4" />;
          } else if (Math.abs(skewness) > 0.5) {
              skewText = `The data shows <strong>moderate ${skewness > 0 ? 'right-skew' : 'left-skew'}</strong>.`;
          } else {
              skewText = `The data appears to be roughly <strong>symmetrical</strong>.`;
              icon = <CheckCircle className="h-4 w-4" />;
          }
        }
        
        return {
            title: "Statistical Summary",
            text: `Average: <strong>${data.mean.toFixed(2)}</strong> | Std Dev: <strong>${data.std.toFixed(2)}</strong>. ${skewText}`,
            variant,
            icon
        };
    }, [data]);
    
    if (!data || !data.histogram) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No data available for this numeric question.</p>
          </CardContent>
        </Card>
      );
    }
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
              <div className="flex justify-between items-start">
                   <div className="space-y-1">
                       <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                       <p className="text-sm text-muted-foreground">Distribution and statistical analysis</p>
                   </div>
                   <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={onDownload}
                       className="hover:bg-white/50 dark:hover:bg-slate-700/50"
                   >
                       <Download className="w-4 h-4" />
                   </Button>
                </div>
            </CardHeader>
           <CardContent className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3">
                        <ChartContainer config={{count: {label: 'Freq.'}}} className="w-full h-80">
                            <ResponsiveContainer>
                                <BarChart data={data.histogram}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={80}
                                        fontSize={11}
                                    />
                                    <YAxis />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar 
                                        dataKey="count" 
                                        name="Frequency" 
                                        fill="url(#colorGradient)" 
                                        radius={[8, 8, 0, 0]}
                                    />
                                    <defs>
                                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                    
                    <div className="xl:col-span-2 space-y-4">
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Metric</TableHead>
                                        <TableHead className="text-right font-semibold">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="hover:bg-muted/30">
                                        <TableCell className="font-medium">Mean</TableCell>
                                        <TableCell className="text-right font-mono text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                                            {data.mean.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30">
                                        <TableCell className="font-medium">Median</TableCell>
                                        <TableCell className="text-right font-mono">{data.median.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30">
                                        <TableCell className="font-medium">Mode</TableCell>
                                        <TableCell className="text-right font-mono">{data.mode?.toFixed(3) || 'N/A'}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30">
                                        <TableCell className="font-medium">Std. Deviation</TableCell>
                                        <TableCell className="text-right font-mono">{data.std.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30">
                                        <TableCell className="font-medium">Total Responses</TableCell>
                                        <TableCell className="text-right font-mono font-semibold">{data.count}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        
                        {interpretation && (
                            <Alert className={cn("border-l-4", 
                                interpretation.variant === 'destructive' 
                                    ? "border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20" 
                                    : interpretation.variant === 'warning'
                                    ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                                    : "border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                            )}>
                                <div className="flex gap-2">
                                    {interpretation.icon}
                                    <div className="flex-1">
                                        <AlertTitle className="text-sm font-semibold mb-1">{interpretation.title}</AlertTitle>
                                        <AlertDescription 
                                            className="text-sm" 
                                            dangerouslySetInnerHTML={{ __html: interpretation.text }} 
                                        />
                                    </div>
                                </div>
                            </Alert>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Enhanced Rating Chart ---
const RatingChart = ({ data, title, onDownload }: { data: { values: number[], count: number, mean: number, std: number }, title: string, onDownload: () => void }) => {
    if (!data || data.values.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">No data available for this rating question.</p></CardContent>
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
        let sentiment = '';
        let variant = 'default';
        
        if (averageRating >= 4) {
            sentiment = 'excellent';
            variant = 'success';
        } else if (averageRating >= 3) {
            sentiment = 'good';
            variant = 'default';
        } else {
            sentiment = 'needs improvement';
            variant = 'warning';
        }
        
        return {
            title: "Rating Analysis",
            text: `Average rating of <strong>${averageRating.toFixed(2)}/5.0</strong> indicates <strong>${sentiment}</strong> performance. Most common rating: <strong>${mode.name} stars</strong> (${mode.percentage.toFixed(1)}%).`,
            variant,
            icon: <Star className="h-4 w-4" />
        };
    }, [tableData, averageRating]);

    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
              <div className="flex justify-between items-start">
                   <div className="space-y-1">
                       <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                       <p className="text-sm text-muted-foreground">Star rating distribution</p>
                   </div>
                   <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={onDownload}
                       className="hover:bg-white/50 dark:hover:bg-slate-700/50"
                   >
                       <Download className="w-4 h-4" />
                   </Button>
                </div>
            </CardHeader>
           <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                        <p className="text-7xl font-bold bg-gradient-to-br from-amber-500 to-orange-600 bg-clip-text text-transparent">
                            {averageRating.toFixed(1)}
                        </p>
                        <div className="flex items-center mt-4 gap-1">
                            {[...Array(5)].map((_, i) => (
                               <Star 
                                   key={i} 
                                   className={cn(
                                       "w-8 h-8 transition-all",
                                       averageRating > i 
                                           ? "fill-amber-400 text-amber-400" 
                                           : "text-gray-300"
                                   )} 
                               />
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 font-medium">Average Rating</p>
                        <p className="text-xs text-muted-foreground">Based on {data.count} responses</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Rating</TableHead>
                                        <TableHead className="text-right font-semibold">Count</TableHead>
                                        <TableHead className="text-right font-semibold">Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.reverse().map((item) => (
                                        <TableRow key={item.name} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex">
                                                        {[...Array(parseInt(item.name))].map((_, i) => (
                                                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                                        ))}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{item.count}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Progress value={item.percentage} className="w-20 h-2" />
                                                    <span className="font-mono text-sm w-12">{item.percentage.toFixed(1)}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {interpretation && (
                            <Alert className={cn("border-l-4", 
                                interpretation.variant === 'destructive' 
                                    ? "border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20" 
                                    : interpretation.variant === 'warning'
                                    ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                                    : "border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                            )}>
                                <div className="flex gap-2">
                                    {interpretation.icon}
                                    <div className="flex-1">
                                        <AlertTitle className="text-sm font-semibold mb-1">{interpretation.title}</AlertTitle>
                                        <AlertDescription 
                                            className="text-sm" 
                                            dangerouslySetInnerHTML={{ __html: interpretation.text }} 
                                        />
                                    </div>
                                </div>
                            </Alert>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


// --- Enhanced NPS Chart ---
const NPSChart = ({ data, title, onDownload }: { data: { npsScore: number; promoters: number; passives: number; detractors: number; total: number, interpretation: string }, title: string, onDownload: () => void }) => {
    const gaugeValue = data.npsScore + 100;
    const gaugeData = [{ value: gaugeValue }, { value: 200 - gaugeValue }];
        
    const formattedInterpretation = data.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
              <div className="flex justify-between items-start">
                   <div className="space-y-1">
                       <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                       <p className="text-sm text-muted-foreground">Net Promoter Score analysis</p>
                   </div>
                   <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={onDownload}
                       className="hover:bg-white/50 dark:hover:bg-slate-700/50"
                   >
                       <Download className="w-4 h-4" />
                   </Button>
                </div>
            </CardHeader>
           <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                        <div className="relative w-full max-w-[250px] aspect-square">
                            <PieChart width={250} height={125}>
                                <Pie
                                data={gaugeData}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={80}
                                outerRadius={110}
                                dataKey="value"
                                paddingAngle={0}
                                >
                                <Cell fill={'#6366f1'} />
                                <Cell fill="#e5e7eb" />
                                </Pie>
                            </PieChart>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <div className={cn("text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent", 'from-indigo-500 to-purple-600')}>
                                    {Math.round(data.npsScore)}
                                </div>
                                <div className="text-xs font-semibold text-muted-foreground">NPS</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Segment</TableHead>
                                        <TableHead className="text-right font-semibold">Count</TableHead>
                                        <TableHead className="text-right font-semibold">Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                <span className="font-medium">Promoters</span>
                                                <span className="text-xs text-muted-foreground">(9-10)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">{data.promoters}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600">
                                                {data.total > 0 ? ((data.promoters / data.total) * 100).toFixed(1) : 0}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                                <span className="font-medium">Passives</span>
                                                <span className="text-xs text-muted-foreground">(7-8)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">{data.passives}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className="bg-amber-500 hover:bg-amber-600">
                                                {data.total > 0 ? ((data.passives / data.total) * 100).toFixed(1) : 0}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-rose-500" />
                                                <span className="font-medium">Detractors</span>
                                                <span className="text-xs text-muted-foreground">(0-6)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">{data.detractors}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="destructive">
                                                {data.total > 0 ? ((data.detractors / data.total) * 100).toFixed(1) : 0}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      );
};


// --- Enhanced Best Worst Chart ---
const BestWorstChart = ({ data, title, onDownload }: { data: { scores: any[], interpretation: string }, title: string, onDownload: () => void }) => {
    const chartData = data.scores.map(s => ({
        name: s.item,
        value: s.net_score,
        best: s.best_pct,
        worst: s.worst_pct,
    }));

    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                       <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                       <p className="text-sm text-muted-foreground">Net score preference analysis</p>
                    </div>
                    <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={onDownload}
                       className="hover:bg-white/50 dark:hover:bg-slate-700/50"
                    >
                       <Download className="w-4 h-4" />
                   </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Best %</TableHead>
                                        <TableHead className="text-right">Worst %</TableHead>
                                        <TableHead className="text-right">Net Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.scores.map(item => (
                                        <TableRow key={item.item}>
                                            <TableCell className="font-medium">{item.item}</TableCell>
                                            <TableCell className="text-right font-mono">{item.best_pct.toFixed(1)}%</TableCell>
                                            <TableCell className="text-right font-mono">{item.worst_pct.toFixed(1)}%</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{item.net_score.toFixed(1)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div>
                        <ChartContainer config={{ value: { label: 'Net Score' } }} className="w-full h-80">
                            <ResponsiveContainer>
                                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={90} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" name="Net Score" >
                                        {chartData.map((entry, index) => (
                                            <Cell key={index} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
                 <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Interpretation</h4>
                    <p className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: data.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
            </CardContent>
        </Card>
    )
};


// --- Enhanced Matrix Chart ---
const MatrixChart = ({ data, title, rows, columns, onDownload }: { data: any, title: string, rows: string[], columns: string[], onDownload: () => void }) => {
    // ... same as before
};


const WordCloud = ({ textData, title, onDownload }: { textData: string[], title: string, onDownload: () => void }) => {
    // ... same as before
};

interface SurveyAnalysisPageProps {
  survey: Survey;
  responses: SurveyResponse[];
  specialAnalyses: { key: string; label: string; component: React.ReactNode }[];
}

export default function SurveyAnalysisPage({ survey, responses, specialAnalyses }: SurveyAnalysisPageProps) {
    const router = useRouter();
    const chartRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState<any[]>([]);
    const { toast } = useToast();

    const processAllData = useCallback(async (questions: Question[], responses: SurveyResponse[]) => {
      if (!questions || !responses) {
        return [];
      }
      return Promise.all(questions.map(async (q: Question) => {
          const questionId = String(q.id);
          switch(q.type) {
              case 'single':
              case 'multiple':
              case 'dropdown':
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
            if (survey && survey.questions) {
              const processed = await processAllData(survey.questions, responses);
              setAnalysisData(processed);
            }
            setLoading(false);
        };
        loadData();
    }, [survey, responses, processAllData]);
    
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

    const handleDownload = useCallback((format: 'csv' | 'excel') => {
        if (!responses || responses.length === 0) {
            toast({ title: 'No data to download', variant: 'destructive' });
            return;
        }

        // Flatten the data
        const flattenedData = responses.map(response => {
            const row: Record<string, any> = {
                respondent_id: response.id,
                submitted_at: response.submittedAt,
            };
            survey.questions.forEach(question => {
                const answer = response.answers[question.id];
                if (Array.isArray(answer)) {
                    row[question.title] = answer.join(', ');
                } else if (typeof answer === 'object' && answer !== null) {
                    row[question.title] = JSON.stringify(answer);
                } else {
                    row[question.title] = answer;
                }
            });
            return row;
        });
        
        if (format === 'csv') {
            const csv = Papa.unparse(flattenedData);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${survey.title.replace(/\s+/g, '_')}_responses.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } else { // Excel
            const worksheet = XLSX.utils.json_to_sheet(flattenedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
            XLSX.writeFile(workbook, `${survey.title.replace(/\s+/g, '_')}_responses.xlsx`);
        }

    }, [responses, survey, toast]);

    if (loading) {
        return (
            <div className="space-y-6 p-4 md:p-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!survey) {
        return (
            <Alert variant="destructive" className="m-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Survey not found.</AlertDescription>
            </Alert>
        );
    }
    
    const tabs = [
        { key: 'results', label: 'Results', icon: <BarChart3 className="w-4 h-4" /> },
        ...specialAnalyses.map(a => ({ ...a, icon: <Sparkles className="w-4 h-4" /> })),
        { key: 'further_analysis', label: 'Further Analysis', icon: <BeakerIcon className="w-4 h-4" /> }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex items-start justify-between gap-6">
                     <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => router.push("/dashboard/survey2")}
                        className="mt-1 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 space-y-3">
                        <div>
                            <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                                {survey.title}
                            </h1>
                            <p className="text-muted-foreground mt-2 flex items-center gap-2">
                                Analysis summary based on
                                <Badge variant="secondary" className="font-semibold">
                                    <Users className="w-3 h-3 mr-1" />
                                    {responses.length} responses
                                </Badge>
                            </p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleDownload('csv')}>
                            <FileDown className="w-4 h-4 mr-2" />
                            CSV
                        </Button>
                         <Button variant="outline" onClick={() => handleDownload('excel')}>
                            <FileDown className="w-4 h-4 mr-2" />
                            Excel
                        </Button>
                    </div>
                </div>
                
                {/* Tabs Section */}
                <Tabs defaultValue="results" className="w-full">
                    <TabsList className="inline-flex h-11 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-full overflow-x-auto">
                        {tabs.map(tab => (
                            <TabsTrigger 
                                key={tab.key} 
                                value={tab.key}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
                            >
                                {tab.icon}
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    <TabsContent value="results" className="mt-8">
                        <div className="space-y-8">
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
                                            case 'best-worst':
                                                return <BestWorstChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                            case 'matrix':
                                                return <MatrixChart data={result.data} title={result.title} rows={result.rows!} columns={result.columns!} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                            case 'text':
                                                return <WordCloud textData={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                            default:
                                                return null;
                                        }
                                    })()}
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>
                    
                    {specialAnalyses.map(analysis => (
                        <TabsContent key={analysis.key} value={analysis.key} className="mt-8">
                            {analysis.component}
                        </TabsContent>
                    ))}
                    
                    <TabsContent value="further_analysis" className="mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="text-green-500" />
                                        Reliability Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Assess the internal consistency of your survey scales with Cronbach's Alpha.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" disabled>Coming Soon</Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
