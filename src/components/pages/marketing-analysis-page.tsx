
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BarChart as BarChartIcon, DollarSign, Eye, Clock, LineChart, ScatterChart as ScatterIcon, Loader2, Users, MapPin, Award } from 'lucide-react';
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
        <CardHeader><CardTitle className="text-base font-headline">{title}</CardTitle></CardHeader>
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
    const [ltvCol, setLtvCol] = useState<string | undefined>();
    const [genderCol, setGenderCol] = useState<string | undefined>();
    const [countryCol, setCountryCol] = useState<string | undefined>();
    const [membershipCol, setMembershipCol] = useState<string | undefined>();

    const [plots, setPlots] = useState<Record<string, string | null>>({
        revenueBySource: null,
        revenueByDevice: null,
        revenueOverTime: null,
        revenueByAge: null,
        pageViewsDist: null,
        durationVsRevenue: null,
        rfmAnalysis: null,
        revenueByGender: null,
        revenueByCountry: null,
        revenueByMembership: null,
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
        setLtvCol(numericHeaders.find(h => h.toLowerCase().includes('ltv')) || numericHeaders[3]);
        setGenderCol(categoricalHeaders.find(h => h.toLowerCase().includes('gender')) || categoricalHeaders[3]);
        setCountryCol(categoricalHeaders.find(h => h.toLowerCase().includes('country')) || categoricalHeaders[4]);
        setMembershipCol(categoricalHeaders.find(h => h.toLowerCase().includes('membership')) || categoricalHeaders[5]);
    }, [numericHeaders, categoricalHeaders, allHeaders]);

    const fetchPlot = useCallback(async (chartType: string, config: any) => {
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
    }, [data]);
    
    useEffect(() => {
        if (data.length > 0 && revenueCol && sourceCol) {
            fetchPlot('bar', { x_col: sourceCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, revenueBySource: plot})));
        }
    }, [data, revenueCol, sourceCol, fetchPlot]);

    useEffect(() => {
        if (data.length > 0 && revenueCol && deviceCol) {
            fetchPlot('bar', { x_col: deviceCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, revenueByDevice: plot})));
        }
    }, [data, revenueCol, deviceCol, fetchPlot]);

    useEffect(() => {
        if (data.length > 0 && dateCol && revenueCol) {
            fetchPlot('line', { x_col: dateCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, revenueOverTime: plot})));
        }
    }, [data, dateCol, revenueCol, fetchPlot]);
    
    useEffect(() => {
        if (data.length > 0 && ageGroupCol && revenueCol) {
             fetchPlot('bar', { x_col: ageGroupCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, revenueByAge: plot})));
        }
    }, [data, ageGroupCol, revenueCol, fetchPlot]);

    useEffect(() => {
        if (data.length > 0 && pageViewsCol) {
            fetchPlot('histogram', { x_col: pageViewsCol }).then(plot => setPlots(p => ({...p, pageViewsDist: plot})));
        }
    }, [data, pageViewsCol, fetchPlot]);
    
    useEffect(() => {
        if (data.length > 0 && sessionDurationCol && revenueCol) {
            fetchPlot('scatter', { x_col: sessionDurationCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, durationVsRevenue: plot})));
        }
    }, [data, sessionDurationCol, revenueCol, fetchPlot]);

    useEffect(() => {
        if (data.length > 0 && ltvCol && revenueCol) {
            fetchPlot('scatter', { x_col: ltvCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, rfmAnalysis: plot})));
        }
    }, [data, ltvCol, revenueCol, fetchPlot]);
    
    useEffect(() => {
        if (data.length > 0 && genderCol && revenueCol) {
            fetchPlot('bar', { x_col: genderCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, revenueByGender: plot})));
        }
    }, [data, genderCol, revenueCol, fetchPlot]);
    
    useEffect(() => {
        if (data.length > 0 && countryCol && revenueCol) {
            fetchPlot('bar', { x_col: countryCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, revenueByCountry: plot})));
        }
    }, [data, countryCol, revenueCol, fetchPlot]);
    
    useEffect(() => {
        if (data.length > 0 && membershipCol && revenueCol) {
            fetchPlot('bar', { x_col: membershipCol, y_col: revenueCol }).then(plot => setPlots(p => ({...p, revenueByMembership: plot})));
        }
    }, [data, membershipCol, revenueCol, fetchPlot]);

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
                    <div><Label>User LTV</Label><Select value={ltvCol} onValueChange={setLtvCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Gender</Label><Select value={genderCol} onValueChange={setGenderCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Country</Label><Select value={countryCol} onValueChange={setCountryCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Membership Level</Label><Select value={membershipCol} onValueChange={setMembershipCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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
                <Card>
                    <CardHeader><CardTitle className="font-headline">1. General Performance</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <ChartCard title="Revenue Over Time" plotData={plots.revenueOverTime} />
                        <ChartCard title="Revenue by Traffic Source" plotData={plots.revenueBySource} />
                        <ChartCard title="Revenue by Device" plotData={plots.revenueByDevice} />
                        <ChartCard title="Page Views per Session" plotData={plots.pageViewsDist} />
                        <div className="md:col-span-2">
                            <ChartCard title="Session Duration vs. Revenue" plotData={plots.durationVsRevenue} />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="font-headline">2. Customer Segmentation</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                         <ChartCard title="User LTV vs. Purchase Revenue" plotData={plots.rfmAnalysis} />
                         <ChartCard title="Revenue by Age Group" plotData={plots.revenueByAge} />
                         <ChartCard title="Revenue by Gender" plotData={plots.revenueByGender} />
                         <ChartCard title="Revenue by Country" plotData={plots.revenueByCountry} />
                         <div className="md:col-span-2">
                            <ChartCard title="Revenue by Membership Level" plotData={plots.revenueByMembership} />
                         </div>
                    </CardContent>
                </Card>
                </>
            )}
        </div>
    );
}
