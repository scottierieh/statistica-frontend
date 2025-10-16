
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
    ResponsiveContainer, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip, 
    PieChart, 
    Bar,
    Pie, 
    Cell, 
    Legend, 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis, 
    LabelList, 
    CartesianGrid, 
    
    Treemap 
  } from 'recharts';
  import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Brain, Users, LineChart  as LineChartIcon, PieChart as PieChartIcon, Box, ArrowLeft, CheckCircle, BarChart3, XCircle, Star, ThumbsUp, ThumbsDown, Info, ImageIcon, PlusCircle, Trash2, X, Phone, Mail, Share2, Grid3x3, ChevronDown, Sigma, Loader2, Download, Bot, Settings, FileSearch, MoveRight, HelpCircle, CheckSquare, Target, Sparkles, Smartphone, Tablet, Monitor, FileDown, ClipboardList, BeakerIcon, ShieldAlert, ShieldCheck, TrendingUp, BarChart as BarChartIcon, Network, Repeat } from 'lucide-react';
import type { Survey, SurveyResponse, Question } from '@/entities/Survey';
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
import ReliabilityPage from './reliability-page';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import * as XLSX from 'xlsx';

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
    const std = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a,b) => a+b, 0) / (values.length > 1 ? values.length - 1 : 1) );
    
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
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'treemap'>('bar');
    
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
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="bar" className="flex items-center gap-2">
                                    <BarChartIcon className="w-4 h-4"/>
                                    <span className="hidden sm:inline">Bar</span>
                                </TabsTrigger>
                                <TabsTrigger value="pie" className="flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4"/>
                                    <span className="hidden sm:inline">Pie</span>
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
                            <Alert className="border-l-4 border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20">
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
              skewText = `The data appears <strong>well-balanced and symmetrical</strong>.`;
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
                                        <TableCell className="text-right font-mono">{data.mode}</TableCell>
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
                            <Alert className={cn(
                                "border-l-4",
                                interpretation.variant === 'destructive' ? 'border-l-rose-500 bg-rose-50/50' : 
                                interpretation.variant === 'success' ? 'border-l-green-500 bg-green-50/50' : 'border-l-indigo-500 bg-indigo-50/50'
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
                            <Alert className={cn(
                                "border-l-4",
                                interpretation.variant === 'success' ? 'border-l-green-500 bg-green-50/50' :
                                interpretation.variant === 'warning' ? 'border-l-amber-500 bg-amber-50/50' :
                                'border-l-indigo-500 bg-indigo-50/50'
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
    const GaugeChart = ({ score }: { score: number }) => {
      const getLevel = (s: number) => {
        if (s >= 70) return { level: 'Excellent', color: '#10b981', gradient: 'from-emerald-500 to-teal-600' };
        if (s >= 50) return { level: 'Good', color: '#eab308', gradient: 'from-amber-500 to-yellow-600' };
        if (s >= 30) return { level: 'Fair', color: '#f97316', gradient: 'from-orange-500 to-amber-600' };
        return { level: 'Needs Improvement', color: '#ef4444', gradient: 'from-rose-500 to-pink-600' };
      };

      const { level, color, gradient } = getLevel(score);
      const gaugeValue = score + 100;
      const gaugeData = [{ value: gaugeValue }, { value: 200 - gaugeValue }];

      return (
        <div className="relative flex flex-col items-center justify-center">
          <PieChart width={320} height={200}>
            <Pie
              data={gaugeData}
              cx={160}
              cy={160}
              startAngle={180}
              endAngle={0}
              innerRadius={90}
              outerRadius={130}
              dataKey="value"
              paddingAngle={0}
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
          
          <div className="absolute top-28 flex flex-col items-center">
            <div className={cn("text-6xl font-bold bg-gradient-to-r bg-clip-text text-transparent", gradient)}>
              {Math.round(score)}
            </div>
            <div className="text-base text-muted-foreground mt-2 font-medium">
              {level}
            </div>
          </div>
        </div>
      );
    };
        
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
                        <GaugeChart score={data.npsScore} />
                        <div className="mt-6 space-y-2 text-sm text-center max-w-xs">
                            <p className="text-muted-foreground">
                                <strong className="text-foreground">NPS Score</strong> measures customer loyalty
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Calculated as (% Promoters − % Detractors)
                            </p>
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
                        
                        <Alert className="border-l-4 border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20">
                            <div className="flex gap-2">
                                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <AlertTitle className="text-sm font-semibold mb-1">Analysis Summary</AlertTitle>
                                    <AlertDescription 
                                        className="text-sm" 
                                        dangerouslySetInnerHTML={{ __html: formattedInterpretation}} 
                                    />
                                </div>
                            </div>
                        </Alert>
                    </div>
                </div>
            </CardContent>
        </Card>
      );
};


// --- Enhanced Text Responses Display ---
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

  if (isLoading) return (
    <Card className="border-0 shadow-lg">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent><Skeleton className="h-64" /></CardContent>
    </Card>
  );
  
  if (!analysisResult) return null;

  return (
    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                    <p className="text-sm text-muted-foreground">Text analysis and word frequency</p>
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
            <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-lg border bg-card p-4">
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
                    <h3 className="font-semibold text-center mb-3 text-sm">Word Frequency Analysis</h3>
                    <ScrollArea className="h-[300px] border rounded-lg">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold">Word</TableHead>
                                    <TableHead className="text-right font-semibold">Frequency</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(analysisResult.frequencies).map(([word, count]) => (
                                    <TableRow key={word} className="hover:bg-muted/30">
                                        <TableCell className="font-medium">{word}</TableCell>
                                        <TableCell className="text-right font-mono">{count as number}</TableCell>
                                        <TableCell>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 hover:bg-destructive/10" 
                                                onClick={() => handleWordDelete(word)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-destructive"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </div>
        </CardContent>
    </Card>
  );
};


// --- Enhanced Matrix Chart ---
const MatrixChart = ({ data, title, rows, columns, onDownload }: { data: any, title: string, rows: string[], columns: string[], onDownload: () => void }) => {
    const [chartType, setChartType] = useState<'stacked' | 'grouped'>('stacked');
    const [tableFormat, setTableFormat] = useState('counts');
    
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

            if (averageScores.length < 2) return { title: "Not enough data", text: "", variant: "default"};
            const highest = averageScores[0];
            const lowest = averageScores[averageScores.length - 1];
            
            detailedBreakdown = data.rows.map((rowName: string) => {
                const rowData = data.heatmapData[rowName];
                const totalResponses = Object.values(rowData).reduce((acc: number, val: any) => acc + val, 0);
                if (totalResponses === 0) return `<strong>'${rowName}'</strong>: No responses`;
                
                const distributionData = Object.entries(rowData).map(([col, count]) => ({
                    col,
                    pct: (count as number / totalResponses * 100)
                })).sort((a,b) => b.pct - a.pct);
                
                return `<strong>'${rowName}'</strong>: ${distributionData.map(d => `${d.col} (${d.pct.toFixed(1)}%)`).join(', ')}`;

            }).join('<br>');

             return {
                title: "Performance Comparison",
                text: `<strong>Top performer:</strong> '${highest.row}' (avg: ${highest.avgScore.toFixed(2)})<br><strong>Needs attention:</strong> '${lowest.row}' (avg: ${lowest.avgScore.toFixed(2)})<br><br>${detailedBreakdown}`,
                variant: 'default',
            }

        } else {
            detailedBreakdown = data.rows.map((rowName: string) => {
                const rowData = data.heatmapData[rowName];
                const totalResponses = Object.values(rowData).reduce((acc: number, val: any) => acc + val, 0);
                if (totalResponses === 0) return `<strong>'${rowName}'</strong>: No responses`;
                
                const distributionData = Object.entries(rowData).map(([col, count]) => ({
                    col,
                    count: count as number,
                    pct: totalResponses > 0 ? (count as number / totalResponses * 100) : 0
                })).sort((a,b) => b.count - a.count);
                
                const mostCommon = distributionData[0];

                 return `<strong>'${rowName}'</strong>: Most common response was <strong>'${mostCommon.col}'</strong> (${mostCommon.pct.toFixed(1)}%)`;
            }).join('<br>');
            
             return {
                title: "Response Distribution",
                text: detailedBreakdown,
                variant: 'default',
            };
        }
    }, [data, columns]);
    
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
                default:
                    return count;
            }
        };

        const getRowTotal = (rowIndex: number) => {
            switch(tableFormat) {
                case 'row_percent':
                    return '100.0%';
                case 'col_percent':
                    return '';
                case 'total_percent':
                    return ((rowTotals[rowIndex] / total) * 100 || 0).toFixed(1) + '%';
                default:
                    return rowTotals[rowIndex];
            }
        };

        const getColTotal = (colIndex: number) => {
            switch(tableFormat) {
                case 'row_percent':
                    return '';
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
                    return '';
                case 'total_percent':
                    return '100.0%';
                default:
                    return total;
            }
        };

        return (
             <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">{title}</TableHead>
                        {columns.map((c: string) => <TableHead key={c} className="text-right font-semibold">{c}</TableHead>)}
                        <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((r: string, rowIndex: number) => (
                        <TableRow key={r} className="hover:bg-muted/30">
                            <TableHead className="font-medium">{r}</TableHead>
                            {columns.map((c: string, colIndex: number) => 
                                <TableCell key={c} className="text-right font-mono">{getCellContent(r, c, rowIndex, colIndex)}</TableCell>
                            )}
                            <TableCell className="text-right font-bold font-mono">{getRowTotal(rowIndex)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                        <TableHead className="font-semibold">Total</TableHead>
                         {columns.map((c: string, colIndex: number) => 
                             <TableCell key={c} className="text-right font-mono">{getColTotal(colIndex)}</TableCell>
                         )}
                        <TableCell className="text-right font-mono">{getGrandTotal()}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );
    }
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                        <p className="text-sm text-muted-foreground">Matrix question analysis</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-full mb-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="stacked">Stacked View</TabsTrigger>
                                <TabsTrigger value="grouped">Grouped View</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        
                        <ChartContainer config={{}} className="w-full h-[400px]">
                            <ResponsiveContainer>
                                {chartType === 'stacked' ? (
                                    <BarChart data={data.chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" stackId="a" domain={[0, 100]} unit="%"/>
                                        <YAxis 
                                            type="category" 
                                            dataKey="name" 
                                            width={150}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />} />
                                        <Legend />
                                        {data.columns.map((col: string, i: number) => (
                                            <Bar key={col} dataKey={`${col}_pct`} name={col} stackId="a" fill={COLORS[i % COLORS.length]}>
                                                <LabelList 
                                                    dataKey={`${col}_pct`} 
                                                    position="center" 
                                                    formatter={(value: number) => value > 5 ? `${value.toFixed(0)}%` : ''} 
                                                    style={{ fill: '#fff', fontSize: 11, fontWeight: 600 }} 
                                                />
                                            </Bar>
                                        ))}
                                    </BarChart>
                                ) : (
                                    <BarChart data={data.chartData} margin={{ bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
                                        <YAxis unit="%"/>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />} />
                                        <Legend />
                                        {data.columns.map((col: string, i: number) => (
                                            <Bar key={col} dataKey={`${col}_pct`} name={col} fill={COLORS[i % COLORS.length]} radius={[8, 8, 0, 0]}>
                                                <LabelList 
                                                    dataKey={`${col}_pct`} 
                                                    position="top" 
                                                    formatter={(value: number) => `${value.toFixed(0)}%`} 
                                                    style={{ fontSize: 10 }} 
                                                />
                                            </Bar>
                                        ))}
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                    
                    <div className="space-y-4">
                         <Tabs value={tableFormat} onValueChange={setTableFormat} className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="counts" className="text-xs">Counts</TabsTrigger>
                                <TabsTrigger value="row_percent" className="text-xs">Row %</TabsTrigger>
                                <TabsTrigger value="col_percent" className="text-xs">Col %</TabsTrigger>
                                <TabsTrigger value="total_percent" className="text-xs">Total %</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="overflow-x-auto rounded-lg border bg-card">
                            {renderContingencyTable()}
                        </div>
                        
                         {interpretation && (
                            <Alert className="border-l-4 border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20">
                                <div className="flex gap-2">
                                     <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
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


// --- Likert Chart ---
const LikertChart = ({ 
    data, 
    title, 
    onDownload 
}: { 
    data: {name: string, count: number, percentage: number}[], 
    title: string, 
    onDownload: () => void 
}) => {
    // Import required icons
    const { TrendingUp, TrendingDown, Minus } = require('lucide-react');
    
    const transformedData = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const total = data.reduce((sum, item) => sum + item.count, 0);
        
        // Calculate mean (scale from 1 to data.length)
        let weightedSum = 0;
        data.forEach((item, index) => {
            weightedSum += item.count * (index + 1);
        });
        const mean = weightedSum / total;
        
        // Calculate median
        let accumCount = 0;
        let median = 1;
        for (let i = 0; i < data.length; i++) {
            accumCount += data[i].count;
            if (accumCount >= total / 2) {
                median = i + 1;
                break;
            }
        }
        
        // Calculate standard deviation
        let varianceSum = 0;
        data.forEach((item, index) => {
            const value = index + 1;
            varianceSum += item.count * Math.pow(value - mean, 2);
        });
        const stdDev = Math.sqrt(varianceSum / total);
        
        // Calculate positive, neutral, negative percentages
        let neutralIndex = -1;
        if(data.length % 2 !== 0) {
            neutralIndex = Math.floor(data.length / 2);
        }
        
        const negativeCats = neutralIndex !== -1 ? data.slice(0, neutralIndex) : data.slice(0, Math.floor(data.length / 2));
        const positiveCats = neutralIndex !== -1 ? data.slice(neutralIndex + 1) : data.slice(Math.ceil(data.length / 2));
        const neutralCat = neutralIndex !== -1 ? data[neutralIndex] : null;
        
        const negativePercentage = negativeCats.reduce((sum, cat) => sum + cat.percentage, 0);
        const positivePercentage = positiveCats.reduce((sum, cat) => sum + cat.percentage, 0);
        const neutralPercentage = neutralCat ? neutralCat.percentage : 0;
        
        // Find mode (most frequent response)
        const mode = data.reduce((prev, current) => (prev.count > current.count) ? prev : current);
        const modeIndex = data.findIndex(item => item.name === mode.name);
        
        // Calculate scale position (0-100% range)
        const scalePosition = ((mean - 1) / (data.length - 1)) * 100;
        
        // Generate key insights
        let interpretation = {
            title: "Key Insights",
            text: "",
            variant: "default" as const,
            icon: null as any
        };
        
        // Determine overall sentiment and generate insight
        if (mean > (data.length + 1) / 2) {
            // Positive sentiment
            interpretation.text = `Overall <strong>positive sentiment</strong> with a mean score of <strong>${mean.toFixed(2)}</strong> out of ${data.length}. `;
            interpretation.text += `<strong>${positivePercentage.toFixed(1)}%</strong> of respondents gave positive ratings`;
            if (mode.name && modeIndex >= Math.ceil(data.length / 2)) {
                interpretation.text += `, with <strong>'${mode.name}'</strong> being the most common response (<strong>${mode.percentage.toFixed(1)}%</strong>).`;
            } else {
                interpretation.text += `.`;
            }
            interpretation.variant = "success" as const;
            interpretation.icon = <TrendingUp className="h-4 w-4" />;
        } else if (mean < (data.length + 1) / 2) {
            // Negative sentiment
            interpretation.text = `Overall <strong>negative sentiment</strong> with a mean score of <strong>${mean.toFixed(2)}</strong> out of ${data.length}. `;
            interpretation.text += `<strong>${negativePercentage.toFixed(1)}%</strong> of respondents gave negative ratings`;
            if (mode.name && modeIndex < Math.floor(data.length / 2)) {
                interpretation.text += `, with <strong>'${mode.name}'</strong> being the most common response (<strong>${mode.percentage.toFixed(1)}%</strong>).`;
            } else {
                interpretation.text += `.`;
            }
            interpretation.variant = "destructive" as const;
            interpretation.icon = <TrendingDown className="h-4 w-4" />;
        } else {
            // Neutral sentiment
            interpretation.text = `Responses show a <strong>balanced distribution</strong> with a mean score of <strong>${mean.toFixed(2)}</strong> out of ${data.length}. `;
            if (neutralPercentage > 0) {
                interpretation.text += `<strong>${neutralPercentage.toFixed(1)}%</strong> selected the neutral option, `;
            }
            interpretation.text += `while positive and negative responses are nearly equal (<strong>${positivePercentage.toFixed(1)}%</strong> vs <strong>${negativePercentage.toFixed(1)}%</strong>).`;
            interpretation.variant = "secondary" as const;
            interpretation.icon = <Minus className="h-4 w-4" />;
        }
        
        // Add standard deviation insight if significant
        if (stdDev > data.length * 0.3) {
            interpretation.text += ` Note: High variance (SD=${stdDev.toFixed(2)}) indicates <strong>diverse opinions</strong>.`;
        } else if (stdDev < data.length * 0.15) {
            interpretation.text += ` Low variance (SD=${stdDev.toFixed(2)}) shows <strong>strong consensus</strong>.`;
        }
        
        return {
            mean: mean.toFixed(2),
            median,
            stdDev: stdDev.toFixed(2),
            total,
            negativePercentage: negativePercentage.toFixed(1),
            positivePercentage: positivePercentage.toFixed(1),
            neutralPercentage: neutralPercentage.toFixed(1),
            scalePosition,
            dataLength: data.length,
            mode,
            interpretation
        };
    }, [data, title]);
    
    if (!transformedData) return null;
    
    // Generate color gradient (dynamic based on data length)
    const getGradientStops = () => {
        if (data.length === 5) {
            return 'linear-gradient(90deg, #dc2626 0%, #f87171 25%, #a8a29e 50%, #84cc16 75%, #22c55e 100%)';
        } else if (data.length === 7) {
            return 'linear-gradient(90deg, #dc2626 0%, #ef4444 16.67%, #fb923c 33.33%, #a8a29e 50%, #84cc16 66.67%, #22c55e 83.33%, #16a34a 100%)';
        } else {
            // Default 3-point scale
            return 'linear-gradient(90deg, #dc2626 0%, #a8a29e 50%, #22c55e 100%)';
        }
    };

    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                        <CardDescription>Visual Scale with Statistics</CardDescription>
                    </div>
                    <Button
                        onClick={onDownload}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Download
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {/* Key Insights Alert */}
                {transformedData.interpretation && (
                    <Alert className={cn(
                        "mb-6 border-l-4",
                        transformedData.interpretation.variant === 'success' ? 'border-l-green-500 bg-green-50/50' :
                        transformedData.interpretation.variant === 'warning' ? 'border-l-amber-500 bg-amber-50/50' :
                        transformedData.interpretation.variant === 'destructive' ? 'border-l-rose-500 bg-rose-50/50' :
                        'border-l-indigo-500 bg-indigo-50/50'
                    )}>
                        <div className="flex items-start gap-2">
                            {transformedData.interpretation.icon}
                            <div>
                                <AlertTitle className="text-sm font-semibold mb-1">{transformedData.interpretation.title}</AlertTitle>
                                <AlertDescription 
                                    className="text-sm" 
                                    dangerouslySetInnerHTML={{ __html: transformedData.interpretation.text }} 
                                />
                            </div>
                        </div>
                    </Alert>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Side - Visual Scale and Stats */}
                    <div className="space-y-6">
                        {/* Visual Scale */}
                        <div className="space-y-4">
                            <div className="relative pt-10 pb-2">
                                {/* Scale Bar */}
                                <div 
                                    className="h-12 rounded-full shadow-inner relative"
                                    style={{
                                        background: getGradientStops()
                                    }}
                                >
                                    {/* Mean Marker */}
                                    <div 
                                        className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                                        style={{ 
                                            left: `${transformedData.scalePosition}%`,
                                            transform: `translateX(-50%) translateY(-50%)`
                                        }}
                                    >
                                        <div className="relative">
                                            <div className="w-16 h-16 bg-white dark:bg-gray-800 border-4 border-gray-800 dark:border-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg animate-pulse">
                                                {transformedData.mean}
                                            </div>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-white text-white dark:text-gray-800 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                Mean
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Scale Labels */}
                                <div className="flex justify-between mt-3">
                                    {data.map((item, index) => (
                                        <div key={index} className="text-center flex-1">
                                            <div className="font-semibold text-sm">{index + 1}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {item.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sigma className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Mean</span>
                                </div>
                                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {transformedData.mean}
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Median</span>
                                </div>
                                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                    {transformedData.median}.0
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Std Dev</span>
                                </div>
                                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                    {transformedData.stdDev}
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Responses</span>
                                </div>
                                <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                                    {transformedData.total}
                                </div>
                            </div>
                        </div>
                        
                        {/* Response Distribution Summary */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ThumbsDown className="h-4 w-4 text-red-500" />
                                    <span className="text-sm font-medium">Negative</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-red-500">{transformedData.negativePercentage}%</span>
                                    <Progress value={parseFloat(transformedData.negativePercentage)} className="w-20 h-2" />
                                </div>
                            </div>
                            
                            {parseFloat(transformedData.neutralPercentage) > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium">Neutral</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-500">{transformedData.neutralPercentage}%</span>
                                        <Progress value={parseFloat(transformedData.neutralPercentage)} className="w-20 h-2" />
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ThumbsUp className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">Positive</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-green-500">{transformedData.positivePercentage}%</span>
                                    <Progress value={parseFloat(transformedData.positivePercentage)} className="w-20 h-2" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Side - Response Distribution Table */}
                    <div className="rounded-lg border overflow-hidden h-fit">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                    <TableHead className="font-semibold">Response</TableHead>
                                    <TableHead className="text-center font-semibold">Count</TableHead>
                                    <TableHead className="text-center font-semibold">Percentage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item, index) => (
                                    <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-center">{item.count}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={
                                                index < Math.floor(data.length / 2) ? "destructive" :
                                                index > Math.floor(data.length / 2) ? "success" :
                                                "secondary"
                                            }>
                                                {item.percentage.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


// ... rest of the file
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
    const [activeFurtherAnalysis, setActiveFurtherAnalysis] = useState<string | null>(null);

    const numericHeaders = useMemo(() => {
        if (!survey || !survey.questions) return [];
        
        const headers: string[] = [];
        survey.questions.forEach(q => {
            if (['number', 'rating', 'likert', 'nps'].includes(q.type)) {
                headers.push(q.title);
            } else if(q.type === 'matrix') {
                q.rows?.forEach(row => {
                    headers.push(`${q.title} - ${row}`);
                });
            }
        });
        return headers;
    }, [survey]);
    
    const hasFurtherAnalysis = useMemo(() => {
        return numericHeaders.length > 1;
    }, [numericHeaders]);

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
               case 'likert':
                   const likertData = (q.scale || []).map((label: string, index: number) => {
                       const value = index + 1;
                       const count = responses.filter(r => (r.answers as any)[questionId] === value).length;
                       return { name: label, count, percentage: (count / responses.length) * 100 };
                   });
                   return { type: 'likert', title: q.title, question: q, data: likertData };
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
        { key: 'results', label: 'Results', icon: <BarChartIcon className="w-4 h-4" /> },
        ...specialAnalyses.map(a => ({ ...a, icon: <Sparkles className="w-4 h-4" /> })),
    ];
    if (hasFurtherAnalysis) {
        tabs.push({ key: 'further_analysis', label: 'Further Analysis', icon: <BeakerIcon className="w-4 h-4" /> });
    }

    const handleFurtherAnalysisClick = (analysisType: string) => {
        setActiveFurtherAnalysis(analysisType);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex items-start gap-6">
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
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-1.5">
                                            <FileDown className="w-3 h-3"/> Download
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => {}}>Download Excel</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {}}>Download CSV</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {}}>Download PDF</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </p>
                        </div>
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
                                            case 'likert':
                                                return <LikertChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                            case 'nps':
                                                return <NPSChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                            case 'text':
                                                 return <TextResponsesDisplay data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)} />;
                                            case 'best-worst':
                                                // return <BestWorstChart data={result.data} title={result.title} onDownload={() => downloadChartAsPng(chartId, result.title)}/>;
                                                return null;
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
                    
                    {specialAnalyses.map(analysis => (
                        <TabsContent key={analysis.key} value={analysis.key} className="mt-8">
                            {analysis.component}
                        </TabsContent>
                    ))}
                    
                    {hasFurtherAnalysis && (
                        <TabsContent value="further_analysis" className="mt-8">
                            {activeFurtherAnalysis === null ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Card className="group hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer" onClick={() => handleFurtherAnalysisClick('reliability')}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1 flex-1">
                                                    <CardTitle className="text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        Scale Reliability Check
                                                    </CardTitle>
                                                    <p className="text-xs text-muted-foreground">
                                                        Check if rating scale questions measure consistently
                                                    </p>
                                                </div>
                                                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                                                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-3 py-2">
                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                    e.g., Do my 5 satisfaction questions work well together?
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    {/* Additional analysis cards can be added here */}
                                </div>
                            ) : activeFurtherAnalysis === 'reliability' ? (
                                 <Card>
                                    <CardHeader>
                                        <Button variant="ghost" size="sm" onClick={() => setActiveFurtherAnalysis(null)} className="mb-4">
                                            <ArrowLeft className="mr-2 h-4 w-4"/> Back to Analyses
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                       <ReliabilityPage 
                                            survey={survey} 
                                            responses={responses} 
                                            onLoadExample={() => {}}
                                        />
                                    </CardContent>
                                </Card>
                            ) : null}
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}

