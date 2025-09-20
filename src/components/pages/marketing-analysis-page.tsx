
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BarChart as BarChartIcon, DollarSign, Eye, Clock, LineChart, ScatterChart as ScatterIcon, Loader2, Users, MapPin, Award, Sigma, Filter } from 'lucide-react';
import { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface MarketingAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const ChartCard = ({ title, plotData }: { title: string, plotData: string | null | undefined }) => (
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
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    
    const [columnConfig, setColumnConfig] = useState({
        revenueCol: undefined as string | undefined,
        sourceCol: undefined as string | undefined,
        mediumCol: undefined as string | undefined,
        campaignCol: undefined as string | undefined,
        costCol: undefined as string | undefined,
        conversionCol: undefined as string | undefined,
        deviceCol: undefined as string | undefined,
        pageViewsCol: undefined as string | undefined,
        sessionDurationCol: undefined as string | undefined,
        dateCol: undefined as string | undefined,
        ageGroupCol: undefined as string | undefined,
        ltvCol: undefined as string | undefined,
        genderCol: undefined as string | undefined,
        countryCol: undefined as string | undefined,
        membershipCol: undefined as string | undefined,
    });

    const [plots, setPlots] = useState<Record<string, string | null> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Reset and auto-detect columns when data changes
        setPlots(null);
        setColumnConfig({
            revenueCol: numericHeaders.find(h => h.toLowerCase().includes('revenue')) || numericHeaders[0],
            sourceCol: categoricalHeaders.find(h => h.toLowerCase().includes('source')) || categoricalHeaders[0],
            mediumCol: categoricalHeaders.find(h => h.toLowerCase().includes('medium')) || categoricalHeaders[1],
            campaignCol: categoricalHeaders.find(h => h.toLowerCase().includes('campaign')) || categoricalHeaders[2],
            costCol: numericHeaders.find(h => h.toLowerCase().includes('cost')) || numericHeaders[1],
            conversionCol: allHeaders.find(h => h.toLowerCase().includes('conversion')) || allHeaders[2],
            deviceCol: categoricalHeaders.find(h => h.toLowerCase().includes('device')) || categoricalHeaders[3],
            pageViewsCol: numericHeaders.find(h => h.toLowerCase().includes('views')) || numericHeaders[2],
            sessionDurationCol: numericHeaders.find(h => h.toLowerCase().includes('duration')) || numericHeaders[3],
            dateCol: allHeaders.find(h => h.toLowerCase().includes('date')) || allHeaders[1],
            ageGroupCol: categoricalHeaders.find(h => h.toLowerCase().includes('age')) || categoricalHeaders[4],
            ltvCol: numericHeaders.find(h => h.toLowerCase().includes('ltv')) || numericHeaders[4],
            genderCol: categoricalHeaders.find(h => h.toLowerCase().includes('gender')) || categoricalHeaders[5],
            countryCol: categoricalHeaders.find(h => h.toLowerCase().includes('country')) || categoricalHeaders[6],
            membershipCol: categoricalHeaders.find(h => h.toLowerCase().includes('membership')) || categoricalHeaders[7],
        })
    }, [numericHeaders, categoricalHeaders, allHeaders, data]);
    
    const handleColumnConfigChange = (key: keyof typeof columnConfig, value: string) => {
        setColumnConfig(prev => ({...prev, [key]: value}));
    };

    const handleGenerateDashboard = useCallback(async () => {
        const requiredCols = ['revenueCol', 'sourceCol', 'deviceCol', 'pageViewsCol', 'sessionDurationCol', 'dateCol', 'ageGroupCol', 'ltvCol', 'genderCol', 'countryCol', 'membershipCol', 'mediumCol', 'campaignCol', 'costCol', 'conversionCol'];
        for (const key of requiredCols) {
            if (!columnConfig[key as keyof typeof columnConfig]) {
                toast({
                    variant: 'destructive',
                    title: 'Configuration Incomplete',
                    description: `Please select a column for "${key.replace('Col', '')}".`
                });
                return;
            }
        }
        
        setIsGenerating(true);
        setPlots(null);

        try {
             const response = await fetch('/api/analysis/marketing-dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, config: columnConfig })
            });
            if (!response.ok) {
                 const errorResult = await response.json();
                 throw new Error(errorResult.error || 'Failed to generate dashboard');
            }
            const result = await response.json();
            setPlots(result.plots);

        } catch(error: any) {
            toast({
                variant: 'destructive',
                title: 'Dashboard Generation Failed',
                description: error.message
            });
        } finally {
            setIsGenerating(false);
        }

    }, [data, columnConfig, toast]);


    const summaryStats = useMemo(() => {
        if (!data || data.length === 0 || !columnConfig.revenueCol || !columnConfig.pageViewsCol) {
            return { totalRevenue: 0, totalSessions: 0, totalPageViews: 0 };
        }
        const totalRevenue = data.reduce((acc, row) => acc + (Number(row[columnConfig.revenueCol!]) || 0), 0);
        const totalSessions = data.length;
        const totalPageViews = data.reduce((acc, row) => acc + (Number(row[columnConfig.pageViewsCol!]) || 0), 0);
        return { totalRevenue, totalSessions, totalPageViews };
    }, [data, columnConfig.revenueCol, columnConfig.pageViewsCol]);


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
    
    const configEntries = Object.entries(columnConfig);

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Dashboard Configuration</CardTitle>
                        <CardDescription>Map your data columns to the dashboard metrics.</CardDescription>
                    </div>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline"><Filter className="mr-2" /> Configure Columns</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[600px]">
                            <div className="grid grid-cols-2 gap-4">
                                {configEntries.map(([key, value]) => {
                                    const label = key.replace('Col', '').replace(/([A-Z])/g, ' $1').trim();
                                    const options = allHeaders;
                                    return (
                                        <div key={key}>
                                            <Label>{label}</Label>
                                            <Select value={value} onValueChange={(v) => handleColumnConfigChange(key as keyof typeof columnConfig, v)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>{options.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    )
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardFooter className='flex justify-end'>
                    <Button onClick={handleGenerateDashboard} disabled={isGenerating}>
                        {isGenerating ? <><Loader2 className="animate-spin mr-2" />Generating...</> : <><Sigma className="mr-2" />Generate Dashboard</>}
                    </Button>
                </CardFooter>
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

            {plots && !isGenerating && (
                <>
                <Card>
                    <CardHeader><CardTitle className="font-headline">1. Traffic Analysis & ROI</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <ChartCard title="Conversion Rate by Channel" plotData={plots.channelPerformance} />
                        <ChartCard title="Campaign ROI (%)" plotData={plots.campaignRoi} />
                        <ChartCard title="Simplified Conversion Funnel" plotData={plots.funnelAnalysis} />
                        <ChartCard title="Attribution Model Comparison" plotData={plots.attributionModeling} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="font-headline">2. General Performance</CardTitle></CardHeader>
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
                    <CardHeader><CardTitle className="font-headline">3. Customer Segmentation</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                         <ChartCard title="User LTV vs. Purchase Revenue" plotData={plots.ltvVsRevenue} />
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
