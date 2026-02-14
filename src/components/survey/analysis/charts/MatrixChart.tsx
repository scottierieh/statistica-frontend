'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    ResponsiveContainer, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Bar,
    CartesianGrid,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { COLORS, ChartBaseProps } from './constants';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px]" />,
});

interface MatrixData {
  heatmapData: { [key: string]: { [key: string]: number } };
  chartData: any[];
}

interface MatrixChartProps extends ChartBaseProps {
  data: MatrixData;
  rows: any[];
  columns: any[];
}

export default function MatrixChart({ data, title, rows, columns, onDownload }: MatrixChartProps) {
    const [chartType, setChartType] = useState<'stacked' | 'grouped' | 'stacked-vertical' | 'grouped-vertical' | 'heatmap'>('stacked');
    const { heatmapData, chartData } = data;
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            {title}
                            <Badge variant="outline" className="ml-2 font-normal">Matrix</Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Multi-dimensional response analysis
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDownload}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-5 mb-4">
                            <TabsTrigger value="stacked-vertical">Stacked V</TabsTrigger>
                            <TabsTrigger value="grouped-vertical">Grouped V</TabsTrigger>
                                <TabsTrigger value="stacked">Stacked</TabsTrigger>
                                <TabsTrigger value="grouped">Grouped</TabsTrigger>
                                                                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="stacked">
                                <ChartContainer config={{}} className="w-full h-80">
                                    <ResponsiveContainer>
                                        <BarChart data={chartData} layout="horizontal">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                                            <YAxis />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                            {(columns || []).map((col, index) => {
                                                const colLabel = typeof col === 'object' ? col.label : col;
                                                return <Bar key={colLabel} dataKey={colLabel} stackId="a" fill={COLORS[index % COLORS.length]} />;
                                            })}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>
                            
                            <TabsContent value="grouped">
                               <ChartContainer config={{}} className="w-full h-80">
                                    <ResponsiveContainer>
                                        <BarChart data={chartData} layout="horizontal">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                                            <YAxis />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                            {(columns || []).map((col, index) => {
                                                const colLabel = typeof col === 'object' ? col.label : col;
                                                return <Bar key={colLabel} dataKey={colLabel} fill={COLORS[index % COLORS.length]} />;
                                            })}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>
                            
                            <TabsContent value="stacked-vertical">
                                <ChartContainer config={{}} className="w-full h-80">
                                    <ResponsiveContainer>
                                        <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                            {(columns || []).map((col, index) => {
                                                const colLabel = typeof col === 'object' ? col.label : col;
                                                return <Bar key={colLabel} dataKey={colLabel} stackId="a" fill={COLORS[index % COLORS.length]} />;
                                            })}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>
                            
                            <TabsContent value="grouped-vertical">
                                <ChartContainer config={{}} className="w-full h-80">
                                    <ResponsiveContainer>
                                        <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                            {(columns || []).map((col, index) => {
                                                const colLabel = typeof col === 'object' ? col.label : col;
                                                return <Bar key={colLabel} dataKey={colLabel} fill={COLORS[index % COLORS.length]} />;
                                            })}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>
                            
                             <TabsContent value="heatmap">
                                <div className="h-80 flex items-center justify-center">
                                    <Plot
                                        data={[{
                                            z: Object.values(heatmapData).map(row => Object.values(row as object)),
                                            x: Object.keys(Object.values(heatmapData)[0] || {}),
                                            y: Object.keys(heatmapData),
                                            type: 'heatmap',
                                            colorscale: 'Blues',
                                            showscale: true
                                        }]}
                                        layout={{ autosize: true, margin: { t: 20, b: 100, l: 100, r: 40 }, xaxis: { tickangle: -45 }, yaxis: { automargin: true } }}
                                        useResizeHandler
                                        style={{ width: '100%', height: '100%' }}
                                        config={{ displayModeBar: false }}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                     <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3 bg-muted/30">
                            <CardTitle className="text-sm font-medium">Data Table</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-96 overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead className="h-9 min-w-[150px] sticky left-0 bg-background">Row / Column</TableHead>
                                            {columns.map(col => {
                                                const colLabel = typeof col === 'object' ? col.label : col;
                                                return <TableHead key={colLabel} className="text-center h-9 min-w-[80px]">{colLabel}</TableHead>;
                                            })}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(heatmapData).map(([rowName, colData]) => (
                                            <TableRow key={rowName}>
                                                <TableCell className="font-medium sticky left-0 bg-background">{rowName}</TableCell>
                                                {Object.values(colData as object).map((count, i) => (
                                                    <TableCell key={i} className="text-center font-mono">
                                                        {Number(count).toFixed(1)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}

