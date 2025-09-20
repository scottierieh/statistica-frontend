
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BarChart as BarChartIcon, DollarSign, Eye, Clock, LineChart, ScatterChart as ScatterIcon } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid, Line, ScatterChart, Scatter } from 'recharts';
import { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

interface MarketingAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MarketingAnalysisPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: MarketingAnalysisPageProps) {
    const [isClient, setIsClient] = useState(false);

    // State for column selections
    const [revenueCol, setRevenueCol] = useState<string | undefined>();
    const [sourceCol, setSourceCol] = useState<string | undefined>();
    const [deviceCol, setDeviceCol] = useState<string | undefined>();
    const [pageViewsCol, setPageViewsCol] = useState<string | undefined>();
    const [sessionDurationCol, setSessionDurationCol] = useState<string | undefined>();
    const [dateCol, setDateCol] = useState<string | undefined>();
    const [ageGroupCol, setAgeGroupCol] = useState<string | undefined>();


    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        // Auto-select columns based on common names
        setRevenueCol(numericHeaders.find(h => h.toLowerCase().includes('revenue')) || numericHeaders[0]);
        setSourceCol(categoricalHeaders.find(h => h.toLowerCase().includes('source')) || categoricalHeaders[0]);
        setDeviceCol(categoricalHeaders.find(h => h.toLowerCase().includes('device')) || categoricalHeaders[1]);
        setPageViewsCol(numericHeaders.find(h => h.toLowerCase().includes('page')) || numericHeaders[1]);
        setSessionDurationCol(numericHeaders.find(h => h.toLowerCase().includes('duration')) || numericHeaders[2]);
        setDateCol(allHeaders.find(h => h.toLowerCase().includes('date')) || allHeaders[0]);
        setAgeGroupCol(categoricalHeaders.find(h => h.toLowerCase().includes('age')) || categoricalHeaders[2]);
    }, [numericHeaders, categoricalHeaders, allHeaders]);

    const summaryStats = useMemo(() => {
        if (!data || data.length === 0 || !revenueCol || !pageViewsCol) {
            return { totalRevenue: 0, totalSessions: 0, totalPageViews: 0 };
        }
        const totalRevenue = data.reduce((acc, row) => acc + (Number(row[revenueCol]) || 0), 0);
        const totalSessions = data.length;
        const totalPageViews = data.reduce((acc, row) => acc + (Number(row[pageViewsCol]) || 0), 0);
        return { totalRevenue, totalSessions, totalPageViews };
    }, [data, revenueCol, pageViewsCol]);

    const revenueBySource = useMemo(() => {
        if (!data || data.length === 0 || !sourceCol || !revenueCol) return [];
        const sourceMap = new Map<string, number>();
        data.forEach(row => {
            const source = String(row[sourceCol!]);
            const revenue = Number(row[revenueCol!]) || 0;
            sourceMap.set(source, (sourceMap.get(source) || 0) + revenue);
        });
        return Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [data, sourceCol, revenueCol]);

    const revenueByDevice = useMemo(() => {
        if (!data || data.length === 0 || !deviceCol || !revenueCol) return [];
        const deviceMap = new Map<string, number>();
        data.forEach(row => {
            const device = String(row[deviceCol!]);
            const revenue = Number(row[revenueCol!]) || 0;
            deviceMap.set(device, (deviceMap.get(device) || 0) + revenue);
        });
        return Array.from(deviceMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [data, deviceCol, revenueCol]);

    const revenueOverTime = useMemo(() => {
        if (!data || data.length === 0 || !dateCol || !revenueCol) return [];
        const dateMap = new Map<string, number>();
        data.forEach(row => {
            const date = new Date(String(row[dateCol!])).toLocaleDateString();
            const revenue = Number(row[revenueCol!]) || 0;
            dateMap.set(date, (dateMap.get(date) || 0) + revenue);
        });
        return Array.from(dateMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    }, [data, dateCol, revenueCol]);
    
    const revenueByAge = useMemo(() => {
        if (!data || !ageGroupCol || !revenueCol) return [];
        const ageMap = new Map<string, number>();
        data.forEach(row => {
            const ageGroup = String(row[ageGroupCol!]);
            const revenue = Number(row[revenueCol!]) || 0;
            ageMap.set(ageGroup, (ageMap.get(ageGroup) || 0) + revenue);
        });
        return Array.from(ageMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
    }, [data, ageGroupCol, revenueCol]);

    const pageViewsDistribution = useMemo(() => {
        if (!data || !pageViewsCol) return [];
        const views = data.map(row => Number(row[pageViewsCol!])).filter(v => !isNaN(v));
        const maxViews = Math.max(...views);
        const binSize = Math.ceil(maxViews / 10);
        const bins = Array.from({ length: 10 }, (_, i) => {
            const start = i * binSize;
            const end = start + binSize;
            return {
                name: `${start}-${end}`,
                count: views.filter(v => v >= start && v < end).length
            };
        });
        return bins;
    }, [data, pageViewsCol]);

    const durationVsRevenue = useMemo(() => {
        if (!data || !sessionDurationCol || !revenueCol) return [];
        return data.map(row => ({
            duration: Number(row[sessionDurationCol!]) || 0,
            revenue: Number(row[revenueCol!]) || 0,
        })).filter(d => d.revenue > 0);
    }, [data, sessionDurationCol, revenueCol]);


    if (!isClient) {
        return null; // or a loading skeleton
    }

    if (data.length === 0) {
        const marketingExample = exampleDatasets.find(ex => ex.id === 'marketing-analysis');
        return (
            <div className="flex flex-1 items-center justify-center h-full">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Marketing Analysis Dashboard</CardTitle>
                        <CardDescription>
                            To view the dashboard, please load the sample marketing data.
                        </CardDescription>
                    </CardHeader>
                    {marketingExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(marketingExample)}>
                                <BarChartIcon className="mr-2 h-4 w-4" /> Load Sample Marketing Data
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Dashboard Configuration</CardTitle>
                    <CardDescription>Map your data columns to the dashboard metrics.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><Label>Revenue</Label><Select value={revenueCol} onValueChange={setRevenueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Source</Label><Select value={sourceCol} onValueChange={setSourceCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Device</Label><Select value={deviceCol} onValueChange={setDeviceCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Age Group</Label><Select value={ageGroupCol} onValueChange={setAgeGroupCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Page Views</Label><Select value={pageViewsCol} onValueChange={setPageViewsCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Session Duration</Label><Select value={sessionDurationCol} onValueChange={setSessionDurationCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Date</Label><Select value={dateCol} onValueChange={setDateCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${summaryStats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaryStats.totalSessions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaryStats.totalPageViews.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

             <Card>
                <CardHeader><CardTitle>Revenue Over Time</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={{ value: { label: 'Revenue', color: 'hsl(var(--chart-1))' } }} className="h-[300px] w-full">
                        <ResponsiveContainer>
                            <LineChart data={revenueOverTime}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader><CardTitle>Revenue by Traffic Source</CardTitle></CardHeader>
                    <CardContent>
                         <ChartContainer config={{ value: { label: 'Revenue', color: 'hsl(var(--chart-1))' } }} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={revenueBySource} layout="vertical">
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" dataKey="value" hide />
                                    <YAxis type="category" dataKey="name" width={80} />
                                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Revenue by Device</CardTitle></CardHeader>
                    <CardContent>
                         <ChartContainer config={{ value: { label: 'Revenue', color: 'hsl(var(--chart-2))' } }} className="h-[300px] w-full">
                             <ResponsiveContainer>
                                <BarChart data={revenueByDevice}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Revenue by Age Group</CardTitle></CardHeader>
                    <CardContent>
                         <ChartContainer config={{ value: { label: 'Revenue', color: 'hsl(var(--chart-3))' } }} className="h-[300px] w-full">
                             <ResponsiveContainer>
                                <BarChart data={revenueByAge}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Page Views per Session</CardTitle></CardHeader>
                    <CardContent>
                         <ChartContainer config={{ count: { label: 'Sessions', color: 'hsl(var(--chart-4))' } }} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={pageViewsDistribution}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="count" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card className="md:col-span-2">
                    <CardHeader><CardTitle>Session Duration vs. Revenue</CardTitle></CardHeader>
                    <CardContent>
                         <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(var(--chart-5))' } }} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <ScatterChart>
                                    <CartesianGrid />
                                    <XAxis type="number" dataKey="duration" name="Session Duration (s)" />
                                    <YAxis type="number" dataKey="revenue" name="Revenue ($)" />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                    <Scatter name="Sessions" data={durationVsRevenue} fill="var(--color-revenue)" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
