
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BarChart as BarChartIcon, DollarSign, Eye, Clock, LineChart, ScatterChart as ScatterIcon, Loader2 } from 'lucide-react';
import { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

interface MarketingAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const ChartCard = ({ title, plotData }: { title: string, plotData: string | null }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            {plotData ? (
                <Image src={plotData} alt={title} width={600} height={400} className="w-full h-auto rounded-md border" />
            ) : (
                <Skeleton className="h-[300px] w-full" />
            )}
        </CardContent>
    </Card>
);

export default function MarketingAnalysisPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: MarketingAnalysisPageProps) {
    const [isClient, setIsClient] = useState(false);

    const [revenueCol, setRevenueCol] = useState<string | undefined>();
    const [sourceCol, setSourceCol] = useState<string | undefined>();
    const [deviceCol, setDeviceCol] = useState<string | undefined>();
    const [pageViewsCol, setPageViewsCol] = useState<string | undefined>();
    const [sessionDurationCol, setSessionDurationCol] = useState<string | undefined>();
    const [dateCol, setDateCol] = useState<string | undefined>();
    const [ageGroupCol, setAgeGroupCol] = useState<string | undefined>();

    const [plots, setPlots] = useState<Record<string, string | null>>({
        revenueBySource: null,
        revenueByDevice: null,
        revenueOverTime: null,
        revenueByAge: null,
        pageViewsDist: null,
        durationVsRevenue: null,
    });
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        setRevenueCol(numericHeaders.find(h => h.toLowerCase().includes('revenue')) || numericHeaders[0]);
        setSourceCol(categoricalHeaders.find(h => h.toLowerCase().includes('source')) || categoricalHeaders[0]);
        setDeviceCol(categoricalHeaders.find(h => h.toLowerCase().includes('device')) || categoricalHeaders[1]);
        setPageViewsCol(numericHeaders.find(h => h.toLowerCase().includes('page')) || numericHeaders[1]);
        setSessionDurationCol(numericHeaders.find(h => h.toLowerCase().includes('duration')) || numericHeaders[2]);
        setDateCol(allHeaders.find(h => h.toLowerCase().includes('date')) || allHeaders[0]);
        setAgeGroupCol(categoricalHeaders.find(h => h.toLowerCase().includes('age')) || categoricalHeaders[2]);
    }, [numericHeaders, categoricalHeaders, allHeaders]);

    const fetchPlot = async (chartType: string, config: any) => {
        try {
            const response = await fetch('/api/analysis/visualization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, chartType, config })
            });
            if (!response.ok) return null;
            const result = await response.json();
            return result.plot;
        } catch (error) {
            console.error(`Failed to fetch plot for ${chartType}:`, error);
            return null;
        }
    };
    
    useEffect(() => {
        if (data.length > 0 && revenueCol && sourceCol && deviceCol && pageViewsCol && sessionDurationCol && dateCol && ageGroupCol) {
            setIsGenerating(true);
            const generatePlots = async () => {
                const newPlots: Record<string, string | null> = {};
                newPlots.revenueBySource = await fetchPlot('bar', { x_col: sourceCol, y_col: revenueCol });
                newPlots.revenueByDevice = await fetchPlot('bar', { x_col: deviceCol, y_col: revenueCol });
                newPlots.revenueOverTime = await fetchPlot('line', { x_col: dateCol, y_col: revenueCol });
                newPlots.revenueByAge = await fetchPlot('bar', { x_col: ageGroupCol, y_col: revenueCol });
                newPlots.pageViewsDist = await fetchPlot('histogram', { x_col: pageViewsCol });
                newPlots.durationVsRevenue = await fetchPlot('scatter', { x_col: sessionDurationCol, y_col: revenueCol });
                setPlots(newPlots);
                setIsGenerating(false);
            };
            generatePlots();
        }
    }, [data, revenueCol, sourceCol, deviceCol, pageViewsCol, sessionDurationCol, dateCol, ageGroupCol]);


    const summaryStats = useMemo(() => {
        if (!data || data.length === 0 || !revenueCol || !pageViewsCol) {
            return { totalRevenue: 0, totalSessions: 0, totalPageViews: 0 };
        }
        const totalRevenue = data.reduce((acc, row) => acc + (Number(row[revenueCol]) || 0), 0);
        const totalSessions = data.length;
        const totalPageViews = data.reduce((acc, row) => acc + (Number(row[pageViewsCol]) || 0), 0);
        return { totalRevenue, totalSessions, totalPageViews };
    }, [data, revenueCol, pageViewsCol]);


    if (!isClient) {
        return null;
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
            
            {isGenerating && <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> <p className="text-muted-foreground">Generating dashboard...</p></div>}

            {!isGenerating && (
                <>
                <ChartCard title="Revenue Over Time" plotData={plots.revenueOverTime} />
                <div className="grid gap-4 md:grid-cols-2">
                    <ChartCard title="Revenue by Traffic Source" plotData={plots.revenueBySource} />
                    <ChartCard title="Revenue by Device" plotData={plots.revenueByDevice} />
                    <ChartCard title="Revenue by Age Group" plotData={plots.revenueByAge} />
                    <ChartCard title="Page Views per Session" plotData={plots.pageViewsDist} />
                    <div className="md:col-span-2">
                        <ChartCard title="Session Duration vs. Revenue" plotData={plots.durationVsRevenue} />
                    </div>
                </div>
                </>
            )}
        </div>
    );
}
