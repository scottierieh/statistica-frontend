'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon } from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getVisualizationDescription } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { Sigma } from 'lucide-react';

interface VisualizationPageProps {
  data: DataSet;
  numericHeaders: string[];
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
  
  if (loading) return <Skeleton className="h-12 w-full" />;
  if (!description) return null;

  return <CardDescription>{description}</CardDescription>;
};

const Histogram = ({ data, column, onAnalyze }: { data: DataSet; column: string | undefined, onAnalyze: () => any }) => {
  const {toast} = useToast();
  
  const { bins, aiPromise } = onAnalyze() || {};
  
  const chartConfig = column ? { [column]: { label: "빈도", color: "hsl(var(--chart-1))" } } : {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">분포: {column}</CardTitle>
        <AIGeneratedDescription promise={aiPromise} />
      </CardHeader>
      <CardContent>
        {bins ? (
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={bins}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
                </BarChart>
            </ResponsiveContainer>
        ) : <div className="h-80 w-full flex items-center justify-center text-muted-foreground">분석 실행 버튼을 눌러주세요.</div>}
      </CardContent>
    </Card>
  );
};

const ScatterPlot = ({ data, xCol, yCol, onAnalyze }: { data: DataSet; xCol: string | undefined; yCol: string | undefined, onAnalyze: () => any }) => {
  const { chartData, aiPromise } = onAnalyze() || {};
  const chartConfig = yCol ? { [yCol]: { label: yCol, color: "hsl(var(--chart-1))" } } : {};
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{xCol}와(과) {yCol}의 관계</CardTitle>
        <AIGeneratedDescription promise={aiPromise} />
      </CardHeader>
      <CardContent>
        {chartData ? (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey={xCol} name={xCol} unit="" />
              <YAxis type="number" dataKey={yCol} name={yCol} unit="" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
              <Scatter name={`${yCol} vs ${xCol}`} data={chartData} fill="var(--color-primary)" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : <div className="h-80 w-full flex items-center justify-center text-muted-foreground">분석 실행 버튼을 눌러주세요.</div>}
      </CardContent>
    </Card>
  );
};

const LinePlot = ({ data, xCol, yCol, onAnalyze }: { data: DataSet; xCol: string | undefined; yCol: string | undefined, onAnalyze: () => any }) => {
    const { chartData, aiPromise } = onAnalyze() || {};
    const chartConfig = yCol ? { [yCol]: { label: yCol, color: "hsl(var(--chart-1))" } } : {};
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{xCol}에 따른 {yCol}의 추세</CardTitle>
                 <AIGeneratedDescription promise={aiPromise} />
            </CardHeader>
            <CardContent>
              {chartData ? (
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={xCol} name={xCol} type="number" domain={['dataMin', 'dataMax']} allowDuplicatedCategory={false} />
                        <YAxis dataKey={yCol} name={yCol} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey={yCol} stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
              ): <div className="h-80 w-full flex items-center justify-center text-muted-foreground">분석 실행 버튼을 눌러주세요.</div>}
            </CardContent>
        </Card>
    )
}

export default function VisualizationPage({ data, numericHeaders }: VisualizationPageProps) {
  const {toast} = useToast();
  const [histColumn, setHistColumn] = useState(numericHeaders[0]);
  const [scatterX, setScatterX] = useState(numericHeaders[0]);
  const [scatterY, setScatterY] = useState(numericHeaders.length > 1 ? numericHeaders[1] : numericHeaders[0]);
  const [lineX, setLineX] = useState(numericHeaders[0]);
  const [lineY, setLineY] = useState(numericHeaders.length > 1 ? numericHeaders[1] : numericHeaders[0]);
  
  const [activeTab, setActiveTab] = useState('histogram');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const canRun = useMemo(() => {
    return numericHeaders.length > 0;
  }, [numericHeaders]);

  const handleAnalysis = useCallback(() => {
    let result;
    if (activeTab === 'histogram') {
        if (!histColumn) return;
        const values = data.map(d => d[histColumn]).filter(v => typeof v === 'number') as number[];
        if (values.length === 0) {
            setAnalysisResult({bins: []});
            return;
        }
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.max(10, Math.floor(Math.sqrt(values.length)));
        const binWidth = (max - min) / binCount;
        const newBins = Array.from({ length: binCount }, (_, i) => ({
            name: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
            count: 0,
        }));
        values.forEach(value => {
            let binIndex = Math.floor((value - min) / binWidth);
            if (binIndex >= binCount) binIndex = binCount - 1;
            if (newBins[binIndex]) newBins[binIndex].count++;
        });

        const aiPromise = getVisualizationDescription({
            dataDescription: `A dataset with a column '${histColumn}'`,
            chartType: 'Histogram',
            chartTitle: `Distribution of ${histColumn}`,
            xAxisLabel: histColumn,
            yAxisLabel: 'Frequency',
        }).then(res => res.success ? res.description ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));

        result = { bins: newBins, aiPromise };

    } else if (activeTab === 'scatter') {
        if (!scatterX || !scatterY) return;
         const chartData = data.map(d => ({ [scatterX]: d[scatterX], [scatterY]: d[scatterY] })).filter(d => typeof d[scatterX] === 'number' && typeof d[scatterY] === 'number');
         const aiPromise = getVisualizationDescription({
            dataDescription: `A dataset with columns '${scatterX}' and '${scatterY}'`,
            chartType: 'Scatter Plot',
            chartTitle: `Relationship between ${scatterX} and ${scatterY}`,
            xAxisLabel: scatterX,
            yAxisLabel: scatterY,
        }).then(res => res.success ? res.description ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));
        result = { chartData, aiPromise };
    } else if (activeTab === 'line') {
        if (!lineX || !lineY) return;
        const chartData = data.map(d => ({ [lineX]: d[lineX], [lineY]: d[lineY] })).filter(d => typeof d[lineX] === 'number' && typeof d[lineY] === 'number').sort((a,b) => (a[lineX] as number) - (b[lineX] as number));
        const aiPromise = getVisualizationDescription({
            dataDescription: `A dataset with columns '${lineX}' and '${lineY}'`,
            chartType: 'Line Plot',
            chartTitle: `Trend of ${lineY} over ${lineX}`,
            xAxisLabel: lineX,
            yAxisLabel: lineY,
        }).then(res => res.success ? res.description ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));
        result = { chartData, aiPromise };
    }
    setAnalysisResult(result);
  }, [activeTab, data, histColumn, scatterX, scatterY, lineX, lineY, toast]);

  const onTabChange = (tab: string) => {
    setActiveTab(tab);
    setAnalysisResult(null);
  }

  if (!canRun) {
      return (
        <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="font-headline">데이터 시각화</CardTitle>
                    <CardDescription>
                        데이터를 시각화하려면 최소 하나 이상의 숫자형 변수가 포함된 데이터를 업로드해야 합니다.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
      )
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <TabsList>
            <TabsTrigger value="histogram"><AreaChart className="mr-2" />히스토그램</TabsTrigger>
            <TabsTrigger value="scatter" disabled={numericHeaders.length < 2}><ScatterIcon className="mr-2" />산점도</TabsTrigger>
            <TabsTrigger value="line" disabled={numericHeaders.length < 2}><LineChartIcon className="mr-2" />선 그래프</TabsTrigger>
        </TabsList>
         <Button onClick={handleAnalysis}>
            <Sigma className="mr-2"/>
            분석 실행
        </Button>
      </div>
      <TabsContent value="histogram" className="mt-4">
        <div className="flex gap-4 items-center mb-4 p-4 border rounded-lg">
            <label className="font-medium">변수:</label>
            <Select value={histColumn} onValueChange={setHistColumn}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <Histogram data={data} column={histColumn} onAnalyze={() => analysisResult} />
      </TabsContent>
      <TabsContent value="scatter" className="mt-4">
        <div className="flex flex-wrap gap-4 items-center mb-4 p-4 border rounded-lg">
            <label className="font-medium">X축:</label>
            <Select value={scatterX} onValueChange={setScatterX}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <label className="font-medium">Y축:</label>
            <Select value={scatterY} onValueChange={setScatterY}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{numericHeaders.filter(h => h !== scatterX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <ScatterPlot data={data} xCol={scatterX} yCol={scatterY} onAnalyze={() => analysisResult} />
      </TabsContent>
      <TabsContent value="line" className="mt-4">
        <div className="flex flex-wrap gap-4 items-center mb-4 p-4 border rounded-lg">
            <label className="font-medium">X축 (변수):</label>
            <Select value={lineX} onValueChange={setLineX}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <label className="font-medium">Y축 (값):</label>
            <Select value={lineY} onValueChange={setLineY}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{numericHeaders.filter(h => h !== lineX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <LinePlot data={data} xCol={lineX} yCol={lineY} onAnalyze={() => analysisResult} />
      </TabsContent>
    </Tabs>
  );
}
