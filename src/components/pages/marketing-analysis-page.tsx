
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { BarChart as BarChartIcon, DollarSign, Eye, Clock } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from 'recharts';
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
    }, [numericHeaders, categoricalHeaders]);

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
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <Label>Revenue Column</Label>
                        <Select value={revenueCol} onValueChange={setRevenueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Source Column</Label>
                        <Select value={sourceCol} onValueChange={setSourceCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Device Column</Label>
                        <Select value={deviceCol} onValueChange={setDeviceCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Page Views Column</Label>
                        <Select value={pageViewsCol} onValueChange={setPageViewsCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Session Duration Column</Label>
                        <Select value={sessionDurationCol} onValueChange={setSessionDurationCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
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

            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Traffic Source</CardTitle>
                    </CardHeader>
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
                    <CardHeader>
                        <CardTitle>Revenue by Device</CardTitle>
                    </CardHeader>
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
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Raw Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>{allHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.slice(0, 5).map((row, i) => (
                                <TableRow key={i}>
                                    {allHeaders.map(h => <TableCell key={`${i}-${h}`}>{String(row[h])}</TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
