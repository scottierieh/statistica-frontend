'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    CartesianGrid,
    Treemap,
    LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, BarChart as BarChartIcon, PieChart as PieChartIcon, Grid3x3, Target, Users, Activity, Hash, TrendingUp } from 'lucide-react';
import { COLORS, ChartBaseProps } from './constants';

interface CategoricalData {
  name: string;
  count: number;
  percentage: number;
}

interface CategoricalChartProps extends ChartBaseProps {
  data: CategoricalData[];
  type?: 'categorical' | 'likert';
}

export default function CategoricalChart({ data, title, onDownload, type = 'categorical' }: CategoricalChartProps) {
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'treemap'>('bar');
    
    const insights = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const mode = data.reduce((prev, current) => (prev.count > current.count) ? prev : current);
        const totalCount = data.reduce((sum, item) => sum + item.count, 0);
        const distribution = data.filter(d => d.percentage > 20).length;
        
        return {
            mode,
            totalCount,
            distribution,
            topThree: data.slice(0, 3)
        };
    }, [data]);
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            {title}
                            <Badge variant="outline" className="ml-2 font-normal">
                                {type === 'likert' ? 'Likert Scale' : 'Categorical'}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Distribution of weighted responses across categories
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDownload}>
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
                                    Bar Chart
                                </TabsTrigger>
                                <TabsTrigger value="pie" className="flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4"/>
                                    Pie Chart
                                </TabsTrigger>
                                <TabsTrigger value="treemap" className="flex items-center gap-2">
                                    <Grid3x3 className="w-4 h-4"/>
                                    Treemap
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="bar" className="mt-0">
                                <ChartContainer config={{}} className="w-full h-80">
                                 <ResponsiveContainer>
                                    <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                                         <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                         <XAxis type="number" dataKey="count" />
                                         <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                         <Tooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)} (${(data.find(d=>d.count === value)?.percentage || 0).toFixed(1)}%)`} />} />
                                         <Bar dataKey="count" name="Frequency" radius={[0, 8, 8, 0]}>
                                           <LabelList dataKey="count" position="insideRight" formatter={(value: number) => value.toFixed(1)} style={{ fill: 'hsl(var(--primary-foreground))', fontSize: 12, fontWeight: 'bold' }} />
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
                                                label={p => `${p.name}: ${p.percentage.toFixed(1)}%`}
                                                labelLine={{stroke: '#94a3b8', strokeWidth: 1}}
                                            >
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent formatter={(value) => Number(value).toFixed(1)} />} />
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
                                            aspectRatio={4 / 3}
                                            stroke="#fff"
                                            fill="#8884d8"
                                        >
                                            <Tooltip content={<ChartTooltipContent formatter={(value, name) => [Number(value).toFixed(1), name]}/>}/>
                                        </Treemap>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </TabsContent>
                        </Tabs>
                    </div>
                    
                    <div className="xl:col-span-2 space-y-4">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3 bg-muted/30">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Hash className="w-4 h-4" />
                                    Response Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-80 overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead className="h-9 px-3">Category</TableHead>
                                            <TableHead className="text-right h-9 px-3">Count</TableHead>
                                            <TableHead className="text-right h-9 px-3">Percent</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map((item, index) => (
                                            <TableRow key={`${item.name}-${index}`}>
                                                <TableCell className="py-2 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-2 h-2 rounded-full shrink-0" 
                                                            style={{backgroundColor: COLORS[index % COLORS.length]}}
                                                        />
                                                        <span className="text-sm break-all">{item.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-2 px-3">
                                                    <span className="font-mono text-sm">{item.count.toFixed(1)}</span>
                                                </TableCell>
                                                <TableCell className="text-right py-2 px-3">
                                                    <Badge variant="secondary" className="font-mono">
                                                        {item.percentage.toFixed(1)}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3 bg-muted/30">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Key Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 space-y-3">
                                {insights && (
                                    <>
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="mt-0.5">
                                                <Target className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-muted-foreground">Most Frequent</p>
                                                <p className="text-sm font-semibold mt-0.5">
                                                    "{insights.mode.name}" with {insights.mode.count.toFixed(1)} weighted responses ({insights.mode.percentage.toFixed(1)}%)
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="mt-0.5">
                                                <Users className="w-4 h-4 text-green-500" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-muted-foreground">Total Weighted Responses</p>
                                                <p className="text-sm font-semibold mt-0.5">
                                                    {insights.totalCount.toFixed(1)} weighted responses
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="mt-0.5">
                                                <Activity className="w-4 h-4 text-purple-500" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-muted-foreground">Distribution</p>
                                                <p className="text-sm font-semibold mt-0.5">
                                                    {insights.distribution > 1 
                                                        ? `${insights.distribution} options have >20% responses (diverse opinions)`
                                                        : `Responses are concentrated on fewer options`}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}