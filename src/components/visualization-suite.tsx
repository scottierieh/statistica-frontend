'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, LineChart, ScatterChart as ScatterIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  Line,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getVisualizationDescription } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';

interface VisualizationSuiteProps {
  data: DataSet;
  headers: string[];
}

const AIGeneratedDescription = ({ promise }: { promise: Promise<string | null> }) => {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useMemo(() => {
    setLoading(true);
    promise.then((desc) => {
        setDescription(desc);
        setLoading(false);
    });
  }, [promise]);
  
  if (loading) return <Skeleton className="h-12 w-full" />;
  if (!description) return null;

  return <CardDescription>{description}</CardDescription>;
};

const Histogram = ({ data, column }: { data: DataSet; column: string }) => {
  const {toast} = useToast();
  const values = data.map(d => d[column]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.max(10, Math.floor(Math.sqrt(data.length)));
  const binWidth = (max - min) / binCount;

  const bins = useMemo(() => {
    const newBins = Array.from({ length: binCount }, (_, i) => ({
      name: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
      count: 0,
    }));

    values.forEach(value => {
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex === binCount) binIndex--;
      if (newBins[binIndex]) {
        newBins[binIndex].count++;
      }
    });
    return newBins;
  }, [data, column]);
  
  const aiPromise = useMemo(() => getVisualizationDescription({
      dataDescription: `A dataset with a column '${column}'`,
      chartType: 'Histogram',
      chartTitle: `Distribution of ${column}`,
      xAxisLabel: column,
      yAxisLabel: 'Frequency',
    }).then(res => res.success ? res.description ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null)),
    [column, toast]
  );
  
  const chartConfig = { [column]: { label: "Frequency", color: "hsl(var(--chart-1))" } };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Distribution of {column}</CardTitle>
        <AIGeneratedDescription promise={aiPromise} />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
            <BarChart data={bins}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const ScatterPlot = ({ data, xCol, yCol }: { data: DataSet; xCol: string; yCol: string }) => {
  const {toast} = useToast();
  const chartData = data.map(d => ({ [xCol]: d[xCol], [yCol]: d[yCol] }));
  const chartConfig = { [yCol]: { label: yCol, color: "hsl(var(--chart-1))" } };

  const aiPromise = useMemo(() => getVisualizationDescription({
      dataDescription: `A dataset with columns '${xCol}' and '${yCol}'`,
      chartType: 'Scatter Plot',
      chartTitle: `Relationship between ${xCol} and ${yCol}`,
      xAxisLabel: xCol,
      yAxisLabel: yCol,
    }).then(res => res.success ? res.description ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null)),
    [xCol, yCol, toast]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Relationship between {xCol} and {yCol}</CardTitle>
        <AIGeneratedDescription promise={aiPromise} />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey={xCol} name={xCol} unit="" />
            <YAxis type="number" dataKey={yCol} name={yCol} unit="" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
            <Scatter name={`${yCol} vs ${xCol}`} data={chartData} fill="var(--color-primary)" />
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const LinePlot = ({ data, xCol, yCol }: { data: DataSet; xCol: string; yCol: string }) => {
    const {toast} = useToast();
    const chartData = useMemo(() => data.map(d => ({ [xCol]: d[xCol], [yCol]: d[yCol] })).sort((a,b) => a[xCol] - b[xCol]), [data, xCol, yCol]);
    const chartConfig = { [yCol]: { label: yCol, color: "hsl(var(--chart-1))" } };

    const aiPromise = useMemo(() => getVisualizationDescription({
        dataDescription: `A dataset with columns '${xCol}' and '${yCol}'`,
        chartType: 'Line Plot',
        chartTitle: `Trend of ${yCol} over ${xCol}`,
        xAxisLabel: xCol,
        yAxisLabel: yCol,
      }).then(res => res.success ? res.description ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null)),
      [xCol, yCol, toast]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Trend of {yCol} over {xCol}</CardTitle>
                 <AIGeneratedDescription promise={aiPromise} />
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-80 w-full">
                    <LineChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xCol} name={xCol} type="number" domain={['dataMin', 'dataMax']} allowDuplicatedCategory={false} />
                        <YAxis dataKey={yCol} name={yCol} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey={yCol} stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default function VisualizationSuite({ data, headers }: VisualizationSuiteProps) {
  const [histColumn, setHistColumn] = useState(headers[0]);
  const [scatterX, setScatterX] = useState(headers[0]);
  const [scatterY, setScatterY] = useState(headers[1] || headers[0]);
  const [lineX, setLineX] = useState(headers[0]);
  const [lineY, setLineY] = useState(headers[1] || headers[0]);
  

  return (
    <Tabs defaultValue="histogram" className="w-full">
      <TabsList>
        <TabsTrigger value="histogram"><AreaChart className="mr-2" />Histogram</TabsTrigger>
        <TabsTrigger value="scatter" disabled={headers.length < 2}><ScatterIcon className="mr-2" />Scatter Plot</TabsTrigger>
        <TabsTrigger value="line" disabled={headers.length < 2}><LineChart className="mr-2" />Line Chart</TabsTrigger>
      </TabsList>
      <TabsContent value="histogram" className="mt-4">
        <div className="flex gap-4 items-center mb-4">
            <p>Variable:</p>
            <Select value={histColumn} onValueChange={setHistColumn}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <Histogram data={data} column={histColumn} />
      </TabsContent>
      <TabsContent value="scatter" className="mt-4">
        <div className="flex gap-4 items-center mb-4">
            <p>X-Axis:</p>
            <Select value={scatterX} onValueChange={setScatterX}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <p>Y-Axis:</p>
            <Select value={scatterY} onValueChange={setScatterY}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{headers.filter(h => h !== scatterX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <ScatterPlot data={data} xCol={scatterX} yCol={scatterY} />
      </TabsContent>
      <TabsContent value="line" className="mt-4">
        <div className="flex gap-4 items-center mb-4">
            <p>X-Axis (Variable):</p>
            <Select value={lineX} onValueChange={setLineX}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <p>Y-Axis (Value):</p>
            <Select value={lineY} onValueChange={setLineY}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{headers.filter(h => h !== lineX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <LinePlot data={data} xCol={lineX} yCol={lineY} />
      </TabsContent>
    </Tabs>
  );
}
