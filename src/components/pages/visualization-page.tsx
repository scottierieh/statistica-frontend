
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon, BarChart as BarChartIcon, PieChart as PieChartIcon } from 'lucide-react';
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
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getVisualizationDescription } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { Sigma } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';

interface VisualizationPageProps {
  data: DataSet;
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
                <ChartContainer config={config.chartConfig || {}} className="w-full h-[320px]">
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
                        {type === 'bar' && (
                             <BarChart data={data}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey={config.xCol} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey={config.yCol} fill="var(--color-primary)" radius={4} />
                            </BarChart>
                        )}
                        {type === 'density' && (
                            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="value" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-fill)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-fill)" stopOpacity={0.1} /></linearGradient></defs>
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
                            </ScatterChart>
                        )}
                        {type === 'pie' || type === 'donut' ? (
                            <PieChart>
                                <Pie data={data} dataKey={config.valueCol} nameKey={config.nameCol} cx="50%" cy="50%" outerRadius={100} innerRadius={type === 'donut' ? 60 : 0} label={p => `${p[config.nameCol]}: ${(p.percent * 100).toFixed(0)}%`}>
                                     {data.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltipContent />} />
                            </PieChart>
                        ) : null}
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};


export default function VisualizationPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: VisualizationPageProps) {
  const {toast} = useToast();
  const [activeCategory, setActiveCategory] = useState('distribution');
  const [activeChart, setActiveChart] = useState<string | null>(null);

  // State for chart configs
  const [histColumn, setHistColumn] = useState(numericHeaders[0]);
  const [barColumn, setBarColumn] = useState(categoricalHeaders[0]);
  const [densityColumn, setDensityColumn] = useState(numericHeaders[0]);

  const [scatterX, setScatterX] = useState(numericHeaders[0]);
  const [scatterY, setScatterY] = useState(numericHeaders.length > 1 ? numericHeaders[1] : numericHeaders[0]);
  
  const [pieNameCol, setPieNameCol] = useState(categoricalHeaders[0]);
  const [pieValueCol, setPieValueCol] = useState(numericHeaders[0]);


  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const canRun = useMemo(() => data.length > 0 && (numericHeaders.length > 0 || categoricalHeaders.length > 0), [data, numericHeaders, categoricalHeaders]);
  
  useEffect(() => {
    setHistColumn(numericHeaders[0]);
    setBarColumn(categoricalHeaders[0]);
    setDensityColumn(numericHeaders[0]);
    setScatterX(numericHeaders[0]);
    setScatterY(numericHeaders[1] || numericHeaders[0]);
    setPieNameCol(categoricalHeaders[0]);
    setPieValueCol(numericHeaders[0]);
    setAnalysisResult(null);
    setActiveChart(null);
  }, [data, numericHeaders, categoricalHeaders]);

  const handleRunAnalysis = useCallback((chartType: string) => {
    setActiveChart(chartType);
    let result: any = {};
    let aiPromise: Promise<string | null> | null = null;
    
    switch(chartType) {
        case 'histogram':
            if (!histColumn) { toast({ title: "Error", description: "Please select a variable for the histogram."}); return; }
            const histValues = data.map(d => d[histColumn]).filter(v => typeof v === 'number') as number[];
            const min = Math.min(...histValues); const max = Math.max(...histValues);
            const binCount = Math.max(10, Math.floor(Math.sqrt(histValues.length)));
            const binWidth = (max - min) / binCount;
            const bins = Array.from({ length: binCount }, (_, i) => ({ name: `${(min + i * binWidth).toFixed(1)}`, count: 0 }));
            histValues.forEach(v => { let idx = Math.floor((v - min) / binWidth); if(idx >= binCount) idx = binCount -1; if(bins[idx]) bins[idx].count++; });
            aiPromise = getVisualizationDescription({ dataDescription: `Distribution of ${histColumn}`, chartType: 'Histogram', chartTitle: `Histogram of ${histColumn}`, xAxisLabel: histColumn, yAxisLabel: 'Frequency' }).then(r => r.success ? r.description : null);
            result = { data: bins, config: { title: `Distribution of ${histColumn}`, chartConfig: { count: { label: 'Frequency' }} }, aiPromise };
            break;
        case 'bar':
             if (!barColumn) { toast({ title: "Error", description: "Please select a variable for the bar chart."}); return; }
             const barCounts: {[key: string]: number} = {};
             data.forEach(row => { const key = String(row[barColumn]); barCounts[key] = (barCounts[key] || 0) + 1; });
             const barData = Object.entries(barCounts).map(([name, count]) => ({ [barColumn]: name, 'count': count }));
             aiPromise = getVisualizationDescription({ dataDescription: `Counts of ${barColumn}`, chartType: 'Bar Chart', chartTitle: `Frequency of ${barColumn}`, xAxisLabel: barColumn, yAxisLabel: 'Count' }).then(r => r.success ? r.description : null);
             result = { data: barData, config: { title: `Frequency of ${barColumn}`, xCol: barColumn, yCol: 'count', chartConfig: { count: { label: 'Count' }} }, aiPromise };
             break;
        case 'density':
            // Simplified density calculation
            if (!densityColumn) { toast({ title: "Error", description: "Please select a variable for the density plot."}); return; }
            const densityValues = data.map(d => d[densityColumn]).filter(v => typeof v === 'number') as number[];
            const densityMean = densityValues.reduce((a,b) => a+b, 0) / densityValues.length;
            const densityStd = Math.sqrt(densityValues.map(x => Math.pow(x - densityMean, 2)).reduce((a,b) => a+b, 0) / densityValues.length);
            const densityData = Array.from({length: 100}, (_, i) => {
                const x = densityMean - 3 * densityStd + i * (6 * densityStd / 99);
                const y = (1 / (densityStd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - densityMean) / densityStd, 2));
                return { value: x, density: y };
            });
            aiPromise = getVisualizationDescription({ dataDescription: `Density of ${densityColumn}`, chartType: 'Density Plot', chartTitle: `Density Plot of ${densityColumn}`, xAxisLabel: densityColumn, yAxisLabel: 'Density' }).then(r => r.success ? r.description : null);
            result = { data: densityData, config: { title: `Density Plot of ${densityColumn}`, chartConfig: { stroke: { color: "hsl(var(--chart-1))" }, fill: { color: "hsl(var(--chart-1))" }}}, aiPromise};
            break;
        case 'scatter':
            if (!scatterX || !scatterY) { toast({ title: "Error", description: "Please select X and Y variables for the scatter plot."}); return; }
            const scatterData = data.map(d => ({ [scatterX]: d[scatterX], [scatterY]: d[scatterY] })).filter(d => typeof d[scatterX] === 'number' && typeof d[scatterY] === 'number');
            aiPromise = getVisualizationDescription({ dataDescription: `Relationship between ${scatterX} and ${scatterY}`, chartType: 'Scatter Plot', chartTitle: `Scatter Plot of ${scatterY} vs ${scatterX}`, xAxisLabel: scatterX, yAxisLabel: scatterY }).then(r => r.success ? r.description : null);
            result = { data: scatterData, config: { title: `Scatter Plot of ${scatterY} vs ${scatterX}`, xCol: scatterX, yCol: scatterY, chartConfig: { [scatterY]: { label: scatterY }}}, aiPromise };
            break;
        case 'pie':
        case 'donut':
            if (!pieNameCol || !pieValueCol) { toast({ title: "Error", description: "Please select name and value columns."}); return; }
            const pieData = data.map(d => ({ [pieNameCol]: d[pieNameCol], [pieValueCol]: d[pieValueCol] })).filter(d => typeof d[pieValueCol] === 'number');
            aiPromise = getVisualizationDescription({ dataDescription: `Proportions of ${pieValueCol} by ${pieNameCol}`, chartType: `${chartType} chart`, chartTitle: `${chartType} chart of ${pieValueCol} by ${pieNameCol}`, xAxisLabel: pieNameCol, yAxisLabel: pieValueCol }).then(r => r.success ? r.description : null);
            result = { data: pieData, config: { title: `${chartType} Chart of ${pieValueCol} by ${pieNameCol}`, nameCol: pieNameCol, valueCol: pieValueCol, colors: ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]}, aiPromise };
            break;

        default:
            toast({title: "Not Implemented", description: `Chart type '${chartType}' is not yet available.`});
    }
    setAnalysisResult(result);
  }, [data, toast, histColumn, barColumn, densityColumn, scatterX, scatterY, pieNameCol, pieValueCol]);

   if (!canRun) {
      const vizExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('visuals'));
      return (
        <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline">Data Visualization</CardTitle>
                    <CardDescription>
                        To visualize data, you need to upload data with at least one numeric variable. Try one of our example datasets.
                    </CardDescription>
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
                                    <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                        Load this data
                                    </Button>
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
        { id: 'bar', label: 'Bar Chart', icon: BarChartIcon, disabled: categoricalHeaders.length === 0 },
        { id: 'density', label: 'Density Plot', icon: AreaChart, disabled: numericHeaders.length === 0 },
      ],
      relationship: [
        { id: 'scatter', label: 'Scatter Plot', icon: ScatterIcon, disabled: numericHeaders.length < 2 },
      ],
      categorical: [
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
                    {activeChart === 'histogram' && (
                        <div><Label>Variable:</Label><Select value={histColumn} onValueChange={setHistColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    )}
                     {activeChart === 'bar' && (
                        <div><Label>Variable:</Label><Select value={barColumn} onValueChange={setBarColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    )}
                    {activeChart === 'density' && (
                         <div><Label>Variable:</Label><Select value={densityColumn} onValueChange={setDensityColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    )}
                    {activeChart === 'scatter' && (
                        <div className="flex gap-4">
                            <div><Label>X-Axis:</Label><Select value={scatterX} onValueChange={setScatterX}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Y-Axis:</Label><Select value={scatterY} onValueChange={setScatterY}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== scatterX).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    )}
                    {(activeChart === 'pie' || activeChart === 'donut') && (
                         <div className="flex gap-4">
                            <div><Label>Name Column:</Label><Select value={pieNameCol} onValueChange={setPieNameCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Value Column:</Label><Select value={pieValueCol} onValueChange={setPieValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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
