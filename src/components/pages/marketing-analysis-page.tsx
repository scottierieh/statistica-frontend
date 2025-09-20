
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Sigma, Filter } from 'lucide-react';
import { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { DollarSign, Clock, Eye, BarChart as BarChartIcon } from 'lucide-react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px]" />,
});

interface MarketingAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const ChartCard = ({ title, plotData }: { title: string, plotData: string | null | undefined }) => {
    let layout = {};
    let data = [];
    if (plotData) {
        try {
            const parsed = JSON.parse(plotData);
            layout = parsed.layout;
            data = parsed.data;
        } catch (e) {
            console.error("Failed to parse plot data", e);
            return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p>Error rendering chart.</p></CardContent></Card>
        }
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-base font-headline">{title}</CardTitle></CardHeader>
            <CardContent>
                {plotData ? (
                     <Plot
                        data={data}
                        layout={layout}
                        useResizeHandler={true}
                        className="w-full h-[300px]"
                    />
                ) : (
                    <Skeleton className="h-[300px] w-full" />
                )}
            </CardContent>
        </Card>
    );
};


export default function MarketingAnalysisPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: MarketingAnalysisPageProps) {
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    
    const [columnConfig, setColumnConfig] = useState({
        revenueCol: '', sourceCol: '', mediumCol: '', campaignCol: '', costCol: '', conversionCol: '', deviceCol: '',
        dateCol: '', ageGroupCol: '', ltvCol: '', genderCol: '',
        countryCol: '', membershipCol: '', userIdCol: '', cohortDateCol: '', itemCategoryCol: '',
        itemBrandCol: '', priceCol: '', quantityCol: '', couponUsedCol: ''
    });

    const [plots, setPlots] = useState<Record<string, string | null> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setPlots(null);
        
        const findColumn = (keywords: string[], headers: string[]) => {
            for (const keyword of keywords) {
                const found = headers.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes(keyword));
                if (found) return found;
            }
            return '';
        };

        setColumnConfig({
            revenueCol: findColumn(['revenue', 'purchase'], numericHeaders),
            sourceCol: findColumn(['source'], categoricalHeaders),
            mediumCol: findColumn(['medium'], categoricalHeaders),
            campaignCol: findColumn(['campaign'], categoricalHeaders),
            costCol: findColumn(['cost'], numericHeaders),
            conversionCol: findColumn(['conversion'], allHeaders),
            deviceCol: findColumn(['device'], categoricalHeaders),
            dateCol: findColumn(['date'], allHeaders),
            ageGroupCol: findColumn(['age'], categoricalHeaders),
            ltvCol: findColumn(['ltv'], numericHeaders),
            genderCol: findColumn(['gender'], categoricalHeaders),
            countryCol: findColumn(['country'], categoricalHeaders),
            membershipCol: findColumn(['membership'], categoricalHeaders),
            userIdCol: findColumn(['userid', 'user'], allHeaders),
            cohortDateCol: findColumn(['cohortdate', 'cohort'], allHeaders),
            itemCategoryCol: findColumn(['itemcategory', 'category'], categoricalHeaders),
            itemBrandCol: findColumn(['brand'], categoricalHeaders),
            priceCol: findColumn(['price'], numericHeaders),
            quantityCol: findColumn(['quantity'], numericHeaders),
            couponUsedCol: findColumn(['coupon'], allHeaders),
        })
    }, [numericHeaders, categoricalHeaders, allHeaders, data]);
    
    const handleColumnConfigChange = (key: keyof typeof columnConfig, value: string) => {
        setColumnConfig(prev => ({...prev, [key]: value}));
    };

    const handleGenerateDashboard = useCallback(async () => {
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
        if (!data || data.length === 0 || !columnConfig.revenueCol) {
            return { totalRevenue: 0, totalSessions: 0 };
        }
        const totalRevenue = data.reduce((acc, row) => acc + (Number(row[columnConfig.revenueCol!]) || 0), 0);
        const totalSessions = data.length;
        return { totalRevenue, totalSessions };
    }, [data, columnConfig.revenueCol]);


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
                            <ScrollArea className="h-[400px]">
                            <div className="grid grid-cols-2 gap-4 p-1">
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
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardFooter className='flex justify-end'>
                    <Button onClick={handleGenerateDashboard} disabled={isGenerating}>
                        {isGenerating ? <><Loader2 className="animate-spin mr-2" />Generating...</> : <><Sigma className="mr-2" />Generate Dashboard</>}
                    </Button>
                </CardFooter>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
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
                        <ChartCard title="Attributed Revenue (Last Touch)" plotData={plots.attributionModeling} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="font-headline">2. E-commerce Analysis</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <ChartCard title="Monthly Cohort Retention" plotData={plots.cohortAnalysis} />
                        <ChartCard title="Basket Analysis (Category vs. Brand)" plotData={plots.basketAnalysis} />
                        <ChartCard title="Price Elasticity" plotData={plots.priceElasticity} />
                        <ChartCard title="Coupon Effectiveness" plotData={plots.couponEffectiveness} />
                    </CardContent>
                </Card>
                </>
            )}
        </div>
    );
}

    