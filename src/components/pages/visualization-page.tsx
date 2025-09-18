

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon, BarChart as BarChartIcon, PieChart as PieChartIcon, Box, GanttChart, Dot } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ZAxis,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getVisualizationDescription } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';

interface VisualizationPageProps {
  data: DataSet;
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: ExampleDataSet) => void;
}

const AIGeneratedDescription = ({ promise }: { promise: Promise<string | null> | null }) => {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promise) {
        setDescription(null);
        setLoading(false);
        return;
    };
    let isMounted = true;
    setLoading(true);
    promise.then((desc) => {
        if (isMounted) {
            setDescription(desc);
            setLoading(false);
        }
    });
    return () => { isMounted = false; };
  }, [promise]);
  
  if (loading) return <Skeleton className="h-6 w-full" />;
  if (!description) return null;

  return <CardDescription>{description}</CardDescription>;
};

const ChartRenderer = ({ type, data, config, aiPromise }: { type: string, data: any, config: any, aiPromise: Promise<string | null> | null}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{config.title}</CardTitle>
                <AIGeneratedDescription promise={aiPromise} />
            </CardHeader>
            <CardContent>
                <ChartContainer config={config.chartConfig || {}} className="w-full h-[400px]">
                    <ResponsiveContainer>
                        {type === 'histogram' && (
                             <BarChart data={data}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
                            </BarChart>
                        )}
                        {(type === 'bar' || type === 'grouped-bar' || type === 'stacked-bar') && (
                             <BarChart data={data} layout={config.layout || 'horizontal'}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey={config.xCol} type={config.layout === 'vertical' ? 'number' : 'category'} />
                                <YAxis dataKey={config.yCol} type={config.layout === 'vertical' ? 'category' : 'number'} width={config.layout === 'vertical' ? 100 : undefined} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                {config.series.map((s: any, i: number) => <Bar key={s.key} dataKey={s.key} stackId={type === 'stacked-bar' ? 'a' : undefined} fill={config.colors[i % config.colors.length]} radius={[4, 4, 0, 0]} />)}
                            </BarChart>
                        )}
                        {type === 'density' && (
                            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="value" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="density" stroke="var(--color-stroke)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        )}
                        {type === 'scatter' && (
                             <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey={config.xCol} name={config.xCol} unit="" />
                                <YAxis type="number" dataKey={config.yCol} name={config.yCol} unit="" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                <Scatter name={`${config.yCol} vs ${config.xCol}`} data={data} fill="var(--color-primary)" />
                                {config.trendLine && <Line type="linear" dataKey={config.yCol} stroke="hsl(var(--destructive))" dot={false} isAnimationActive={false} />}
                            </ScatterChart>
                        )}
                        {type === 'bubble' && (
                             <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey={config.xCol} name={config.xCol} />
                                <YAxis type="number" dataKey={config.yCol} name={config.yCol} />
                                <ZAxis type="number" dataKey={config.zCol} name={config.zCol} range={[100, 1000]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                <Legend />
                                <Scatter name="Bubbles" data={data} fill="hsl(var(--chart-2))" shape="circle" />
                            </ScatterChart>
                        )}
                         {(type === 'pie' || type === 'donut') && (
                            <PieChart>
                                <Pie 
                                    data={data} 
                                    dataKey={config.valueCol} 
                                    nameKey={config.nameCol} 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={100} 
                                    innerRadius={type === 'donut' ? 60 : 0} 
                                    label={p => `${p[config.nameCol]}: ${(p.percent * 100).toFixed(0)}%`}
                                >
                                    {data.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                            </PieChart>
                        )}
                        {type === 'box' && (
                             <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="range" shape={<BoxPlotShape />} />
                             </BarChart>
                        )}
                        {type === 'violin' && (
                             <ScatterChart
                                width={500}
                                height={300}
                                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                >
                                <CartesianGrid />
                                <XAxis type="category" dataKey="name" name="name" />
                                <YAxis type="number" dataKey="value" name="value" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                <Scatter name="Violin" data={data} shape={<ViolinShape />} />
                            </ScatterChart>
                        )}
                        {type === 'heatmap' && (
                            <div className="w-full h-full flex items-center justify-center">
                                <Image src={`data:image/png;base64,${data}`} alt="Heatmap" width={400} height={400} />
                            </div>
                        )}
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};

const BoxPlotShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload || !payload.stats) return null;
    
    const { q1, q3, min, max, median } = payload.stats;
    
    const range = max - min;
    const bandWidth = range > 0 ? height / range : 0;

    const toY = (value: number) => {
        if (isNaN(value) || bandWidth === 0) return y + height / 2;
        return y + (max - value) * bandWidth;
    }

    return (
        <g>
            <line x1={x + width / 2} y1={toY(max)} x2={x + width / 2} y2={toY(min)} stroke="black" />
            <rect x={x} y={toY(q3)} width={width} height={Math.abs((q3 - q1) * bandWidth)} fill="hsl(var(--primary))" />
            <line x1={x} y1={toY(median)} x2={x + width} y2={toY(median)} stroke="white" strokeWidth={2} />
            <line x1={x + width * 0.25} y1={toY(min)} x2={x + width * 0.75} y2={toY(min)} stroke="black" />
            <line x1={x + width * 0.25} y1={toY(max)} x2={x + width * 0.75} y2={toY(max)} stroke="black" />
        </g>
    )
}

const ViolinShape = (props: any) => {
    const { cx, cy, payload } = props;
    // This is a simplified representation. A real violin plot would require density calculation.
    return <Dot cx={cx} cy={cy} r={5} fill="hsl(var(--primary))" />;
};


export default function VisualizationPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: VisualizationPageProps) {
  const {toast} = useToast();
  const [activeCategory, setActiveCategory] = useState('distribution');
  const [activeChart, setActiveChart] = useState<string | null>(null);

  // State for chart configs
  const [distColumn, setDistColumn] = useState(numericHeaders[0]);
  const [barColumn, setBarColumn] = useState(categoricalHeaders[0]);
  
  const [scatterX, setScatterX] = useState(numericHeaders[0]);
  const [scatterY, setScatterY] = useState(numericHeaders.length > 1 ? numericHeaders[1] : numericHeaders[0]);
  const [scatterTrend, setScatterTrend] = useState(false);

  const [bubbleX, setBubbleX] = useState(numericHeaders[0]);
  const [bubbleY, setBubbleY] = useState(numericHeaders[1]);
  const [bubbleZ, setBubbleZ] = useState(numericHeaders[2]);
  
  const [pieNameCol, setPieNameCol] = useState(categoricalHeaders[0]);
  const [pieValueCol, setPieValueCol] = useState(numericHeaders[0]);
  
  const [groupedBarCategory1, setGroupedBarCategory1] = useState(categoricalHeaders[0]);
  const [groupedBarCategory2, setGroupedBarCategory2] = useState(categoricalHeaders[1]);
  const [groupedBarValue, setGroupedBarValue] = useState(numericHeaders[0]);

  const [heatmapVars, setHeatmapVars] = useState<string[]>(numericHeaders.slice(0, 5));


  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const canRun = useMemo(() => data.length > 0 && (numericHeaders.length > 0 || categoricalHeaders.length > 0), [data, numericHeaders, categoricalHeaders]);
  
  useEffect(() => {
    setDistColumn(numericHeaders[0]);
    setBarColumn(categoricalHeaders[0]);
    setScatterX(numericHeaders[0]);
    setScatterY(numericHeaders[1] || numericHeaders[0]);
    setPieNameCol(categoricalHeaders[0]);
    setPieValueCol(numericHeaders[0]);
    setAnalysisResult(null);
    setActiveChart(null);
  }, [data, numericHeaders, categoricalHeaders]);

  const handleRunAnalysis = useCallback(async (chartType: string) => {
    setActiveChart(chartType);
    let result: any = {};
    let aiPromise: Promise<string | null> | null = null;
    
    try {
        switch(chartType) {
            case 'histogram':
            case 'density':
            case 'box':
            case 'violin':
                if (!distColumn) { toast({ title: "Error", description: "Please select a variable."}); return; }
                const values = data.map(d => d[distColumn]).filter(v => typeof v === 'number') as number[];
                
                if (chartType === 'histogram') {
                    const min = Math.min(...values); const max = Math.max(...values);
                    const binCount = Math.max(10, Math.floor(Math.sqrt(values.length)));
                    const binWidth = (max - min) / binCount;
                    const bins = Array.from({ length: binCount }, (_, i) => ({ name: `${(min + i * binWidth).toFixed(1)}`, count: 0 }));
                    values.forEach(v => { let idx = Math.floor((v - min) / binWidth); if(idx >= binCount) idx = binCount -1; if(bins[idx]) bins[idx].count++; });
                    result = { data: bins, config: { title: `Distribution of ${distColumn}`, chartConfig: { count: { label: 'Frequency' }} }};
                } else if (chartType === 'box') {
                    const sorted = [...values].sort((a,b) => a - b);
                    const q1 = sorted[Math.floor(sorted.length * 0.25)];
                    const median = sorted[Math.floor(sorted.length * 0.5)];
                    const q3 = sorted[Math.floor(sorted.length * 0.75)];
                    const boxData = [{ name: distColumn, range: [sorted[0], sorted[sorted.length-1]], stats: { min: sorted[0], max: sorted[sorted.length - 1], q1, median, q3 } }];
                    result = { data: boxData, config: { title: `Box Plot of ${distColumn}` } };
                }
                // Simplified Violin and Density
                else {
                    const mean = values.reduce((a,b) => a+b, 0) / values.length;
                    const std = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a,b) => a+b, 0) / values.length);
                    const densityData = Array.from({length: 100}, (_, i) => {
                        const x = mean - 3 * std + i * (6 * std / 99);
                        const y = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
                        return { value: x, density: y, name: distColumn };
                    });
                    result = { data: densityData, config: { title: `${chartType === 'density' ? 'Density' : 'Violin'} Plot of ${distColumn}` } };
                }
                break;
            case 'bar':
                if (!barColumn) { toast({ title: "Error", description: "Please select a variable."}); return; }
                const barCounts: {[key: string]: number} = {};
                data.forEach(row => { const key = String(row[barColumn]); barCounts[key] = (barCounts[key] || 0) + 1; });
                const barData = Object.entries(barCounts).map(([name, count]) => ({ [barColumn]: name, 'count': count }));
                result = { data: barData, config: { title: `Frequency of ${barColumn}`, xCol: barColumn, yCol: 'count', chartConfig: { count: { label: 'Count' }}}};
                break;
            case 'scatter':
                if (!scatterX || !scatterY) { toast({ title: "Error", description: "Please select X and Y variables."}); return; }
                const scatterData = data.map(d => ({ [scatterX]: d[scatterX], [scatterY]: d[scatterY] })).filter(d => typeof d[scatterX] === 'number' && typeof d[scatterY] === 'number');
                result = { data: scatterData, config: { title: `Scatter Plot of ${scatterY} vs ${scatterX}`, xCol: scatterX, yCol: scatterY, trendLine: scatterTrend }};
                break;
            case 'bubble':
                if (!bubbleX || !bubbleY || !bubbleZ) { toast({ title: "Error", description: "Please select X, Y, and Z variables."}); return; }
                const bubbleData = data.map(d => ({ [bubbleX]: d[bubbleX], [bubbleY]: d[bubbleY], [bubbleZ]: d[bubbleZ] })).filter(d => typeof d[bubbleX] === 'number' && typeof d[bubbleY] === 'number' && typeof d[bubbleZ] === 'number');
                result = { data: bubbleData, config: { title: `Bubble Chart`, xCol: bubbleX, yCol: bubbleY, zCol: bubbleZ }};
                break;
            case 'pie':
            case 'donut':
                if (!pieNameCol || !pieValueCol) { toast({ title: "Error", description: "Please select name and value columns."}); return; }
                const aggregatedData: {[key: string]: number} = {};
                data.forEach(d => {
                    const name = String(d[pieNameCol]);
                    const value = typeof d[pieValueCol] === 'number' ? d[pieValueCol] as number : 0;
                    aggregatedData[name] = (aggregatedData[name] || 0) + value;
                });
                const pieData = Object.entries(aggregatedData).map(([name, value]) => ({ [pieNameCol]: name, [pieValueCol]: value }));
                const total = pieData.reduce((sum, item) => sum + item[pieValueCol], 0);
                const pieDataWithPercent = pieData.map(item => ({...item, percent: item[pieValueCol] / total}));
                result = { data: pieDataWithPercent, config: { title: `${chartType} Chart of ${pieValueCol} by ${pieNameCol}`, nameCol: pieNameCol, valueCol: pieValueCol, colors: ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]}};
                break;
            case 'grouped-bar':
            case 'stacked-bar':
                if (!groupedBarCategory1 || !groupedBarCategory2 || !groupedBarValue) { toast({ title: "Error", description: "Please select two categories and one value."}); return; }
                const groupedData: {[key:string]: any} = {};
                data.forEach(d => {
                    const key = String(d[groupedBarCategory1]);
                    const subKey = String(d[groupedBarCategory2]);
                    const value = typeof d[groupedBarValue] === 'number' ? d[groupedBarValue] as number : 0;
                    if (!groupedData[key]) groupedData[key] = { [groupedBarCategory1]: key };
                    groupedData[key][subKey] = (groupedData[key][subKey] || 0) + value;
                });
                const seriesNames = Array.from(new Set(data.map(d => String(d[groupedBarCategory2]))));
                result = { data: Object.values(groupedData), config: { title: `Bar Chart`, xCol: groupedBarCategory1, yCol: groupedBarValue, series: seriesNames.map(s=>({key:s})), colors: ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"] } };
                break;
            case 'heatmap':
                 const corrResponse = await fetch('/api/analysis/correlation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data, variables: heatmapVars, method: 'pearson' })
                });
                if (!corrResponse.ok) throw new Error("Failed to calculate correlation matrix for heatmap.");
                const corrResult = await corrResponse.json();
                result = { data: corrResult.heatmap_plot, config: { title: 'Correlation Heatmap'} };
                break;
        }

        if (result && chartType !== 'heatmap') {
            aiPromise = getVisualizationDescription({
                dataDescription: `The data contains columns: ${allHeaders.join(', ')}.`,
                chartType: chartType,
                chartTitle: result.config.title,
                xAxisLabel: result.config.xCol || '',
                yAxisLabel: result.config.yCol || '',
            }).then(res => res.success ? res.description ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));

            result.aiPromise = aiPromise;
        }
    
        setAnalysisResult(result);
    } catch(e: any) {
        toast({ title: "Chart Error", description: e.message });
        setAnalysisResult(null);
    }

  }, [data, toast, distColumn, barColumn, scatterX, scatterY, scatterTrend, bubbleX, bubbleY, bubbleZ, pieNameCol, pieValueCol, groupedBarCategory1, groupedBarCategory2, groupedBarValue, allHeaders, heatmapVars]);

   if (!canRun) {
      const vizExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('visuals'));
      return (
        <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline">Data Visualization</CardTitle>
                    <CardDescription>To visualize data, you need to upload a file. Try one of our example datasets.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vizExamples.map((ex) => {
                            const Icon = ex.icon;
                            return (
                            <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                        <Icon className="h-6 w-6 text-secondary-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                        <CardDescription className="text-xs">{ex.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">Load this data</Button>
                                </CardFooter>
                            </Card>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
      )
  }

  const chartTypes = {
      distribution: [
        { id: 'histogram', label: 'Histogram', icon: BarChartIcon, disabled: numericHeaders.length === 0 },
        { id: 'box', label: 'Box Plot', icon: Box, disabled: numericHeaders.length === 0 },
        { id: 'violin', label: 'Violin Plot', icon: GanttChart, disabled: numericHeaders.length === 0 },
        { id: 'density', label: 'Density Plot', icon: AreaChart, disabled: numericHeaders.length === 0 },
      ],
      relationship: [
        { id: 'scatter', label: 'Scatter Plot', icon: ScatterIcon, disabled: numericHeaders.length < 2 },
        { id: 'bubble', label: 'Bubble Chart', icon: Dot, disabled: numericHeaders.length < 3 },
        { id: 'heatmap', label: 'Heatmap', icon: BarChartIcon, disabled: numericHeaders.length < 2 },
      ],
      categorical: [
        { id: 'bar', label: 'Bar Chart', icon: BarChartIcon, disabled: categoricalHeaders.length === 0 },
        { id: 'grouped-bar', label: 'Grouped Bar', icon: BarChartIcon, disabled: categoricalHeaders.length < 2 || numericHeaders.length < 1 },
        { id: 'stacked-bar', label: 'Stacked Bar', icon: BarChartIcon, disabled: categoricalHeaders.length < 2 || numericHeaders.length < 1 },
        { id: 'pie', label: 'Pie Chart', icon: PieChartIcon, disabled: numericHeaders.length === 0 || categoricalHeaders.length === 0 },
        { id: 'donut', label: 'Donut Chart', icon: PieChartIcon, disabled: numericHeaders.length === 0 || categoricalHeaders.length === 0 },
      ]
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Visualization Builder</CardTitle>
          <CardDescription>Select a chart type and the corresponding variables to generate a visualization.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="relationship">Relationship</TabsTrigger>
              <TabsTrigger value="categorical">Categorical</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 p-4 border rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {chartTypes[activeCategory as keyof typeof chartTypes].map(chart => (
                        <Button key={chart.id} variant={activeChart === chart.id ? "secondary" : "ghost"} onClick={() => handleRunAnalysis(chart.id)} disabled={chart.disabled}>
                            <chart.icon className="mr-2 h-4 w-4"/> {chart.label}
                        </Button>
                    ))}
                </div>
                
                 <div className="mt-4 pt-4 border-t">
                    {(activeChart === 'histogram' || activeChart === 'density' || activeChart === 'box' || activeChart === 'violin') && (
                        <div><Label>Variable:</Label><Select value={distColumn} onValueChange={setDistColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    )}
                     {activeChart === 'bar' && (
                        <div><Label>Variable:</Label><Select value={barColumn} onValueChange={setBarColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    )}
                    {activeChart === 'scatter' && (
                        <div className="flex gap-4 items-center">
                            <div><Label>X-Axis:</Label><Select value={scatterX} onValueChange={setScatterX}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Y-Axis:</Label><Select value={scatterY} onValueChange={setScatterY}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== scatterX).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="flex items-center space-x-2 pt-6"><Checkbox id="trendline" checked={scatterTrend} onCheckedChange={c => setScatterTrend(!!c)}/><Label htmlFor="trendline">Show Trend Line</Label></div>
                        </div>
                    )}
                    {activeChart === 'bubble' && (
                        <div className="flex gap-4">
                            <div><Label>X-Axis:</Label><Select value={bubbleX} onValueChange={setBubbleX}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Y-Axis:</Label><Select value={bubbleY} onValueChange={setBubbleY}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== bubbleX).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Size (Z-Axis):</Label><Select value={bubbleZ} onValueChange={setBubbleZ}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== bubbleX && h !== bubbleY).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    )}
                    {(activeChart === 'pie' || activeChart === 'donut') && (
                         <div className="flex gap-4">
                            <div><Label>Name Column:</Label><Select value={pieNameCol} onValueChange={setPieNameCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Value Column:</Label><Select value={pieValueCol} onValueChange={setPieValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    )}
                    {(activeChart === 'grouped-bar' || activeChart === 'stacked-bar') && (
                         <div className="flex gap-4">
                            <div><Label>Category Axis:</Label><Select value={groupedBarCategory1} onValueChange={setGroupedBarCategory1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Group By:</Label><Select value={groupedBarCategory2} onValueChange={setGroupedBarCategory2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.filter(h=>h !== groupedBarCategory1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Value Column:</Label><Select value={groupedBarValue} onValueChange={setGroupedBarValue}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    )}
                    {activeChart === 'heatmap' && (
                        <div>
                            <Label>Variables for Heatmap:</Label>
                            <ScrollArea className="h-24 border rounded p-2">
                                {numericHeaders.map(h => (
                                    <div key={h}><Checkbox checked={heatmapVars.includes(h)} onCheckedChange={(c) => setHeatmapVars(p => c ? [...p, h] : p.filter(i => i !== h))}/> <Label>{h}</Label></div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
      {activeChart && analysisResult && (
        <ChartRenderer type={activeChart} data={analysisResult.data} config={analysisResult.config} aiPromise={analysisResult.aiPromise} />
      )}

      {!activeChart && (
        <div className="text-center py-10 text-muted-foreground">Please select a chart type to visualize.</div>
      )}
    </div>
  );
}

