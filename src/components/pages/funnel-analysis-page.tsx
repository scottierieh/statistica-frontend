'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sigma, Filter, Trash2, Plus, HelpCircle, TrendingDown, Users, AlertTriangle, CheckCircle, Clock, BookOpen, Settings, FileSearch, FileText } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, FunnelChart, Tooltip, Funnel, LabelList, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface FunnelResult {
    step: string;
    users: number;
    conversion_rate_from_start: number;
    conversion_rate_from_previous: number;
}

interface DropOff {
    from_step: string;
    to_step: string;
    dropped_users: number;
    drop_rate: number;
}

interface TimeAnalysis {
    step: string;
    avg_time_hours: number;
    median_time_hours: number;
}

interface SegmentAnalysis {
    segment: string;
    segment_type: string;
    total_users: number;
    converted_users: number;
    conversion_rate: number;
}

interface Insight {
    type: string;
    message: string;
    severity: string;
}

interface AnalysisResponse {
    results: FunnelResult[];
    drop_offs?: DropOff[];
    time_analysis?: TimeAnalysis[] | null;
    segment_analysis?: SegmentAnalysis[] | null;
    insights?: Insight[];
}

interface FunnelAnalysisPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: any) => void;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void; onLoadExample: (e: any) => void }) => {
    const funnelExample = exampleDatasets.find(ex => ex.id === 'funnel-analysis');

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Filter className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Funnel Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Track user journey through conversion steps and identify drop-off points
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">User Tracking</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Follow individual users through sequential events in your conversion funnel
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingDown className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Drop-off Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify where users abandon the journey and prioritize optimization efforts
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Clock className="w-6 h-6 text-primary mb-2" />
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-lg">Time Insights</CardTitle>
                                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    If timestamp data available, understand how long users take to progress through stages
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            Understanding Funnel Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Funnel analysis helps you visualize and measure user progression through a series of steps 
                            leading to a goal (like purchase or signup). By identifying bottlenecks, you can optimize 
                            each stage to improve overall conversion rates.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Setup Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>User ID:</strong> Unique identifier for each user</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Events:</strong> Actions taken by users (visit, click, purchase)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sequence:</strong> Define steps in order of user journey</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Timestamp:</strong> Optional - enables time-to-convert analysis</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Key Metrics
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Overall Conversion:</strong> % reaching final step</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Step Conversion:</strong> % progressing from each step</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Drop-off Rate:</strong> % abandoning at each stage</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {funnelExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(funnelExample)} size="lg">
                                <Filter className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default function FunnelAnalysisPage({ data, allHeaders, onLoadExample }: FunnelAnalysisPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [userIdCol, setUserIdCol] = useState<string | undefined>();
    const [eventCol, setEventCol] = useState<string | undefined>();
    const [funnelSteps, setFunnelSteps] = useState<string[]>(['visit', 'view_product', 'add_to_cart', 'purchase']);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);
    const eventCategories = useMemo(() => eventCol ? [...new Set(data.map(row => row[eventCol] as string).filter(Boolean))] : [], [data, eventCol]);
    
    useEffect(() => {
        setUserIdCol(allHeaders.find(h => h.toLowerCase().includes('user')));
        setEventCol(allHeaders.find(h => h.toLowerCase().includes('event')));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [allHeaders, canRun]);

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...funnelSteps];
        newSteps[index] = value;
        setFunnelSteps(newSteps);
    };

    const addStep = () => setFunnelSteps([...funnelSteps, '']);
    const removeStep = (index: number) => {
        if (funnelSteps.length > 2) {
            setFunnelSteps(funnelSteps.filter((_, i) => i !== index));
        }
    };

    const handleAnalysis = useCallback(async () => {
        if (!userIdCol || !eventCol || funnelSteps.some(s => !s)) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all columns and define all funnel steps.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/funnel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, user_id_col: userIdCol, event_col: eventCol, funnel_steps: funnelSteps })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }

            const result = await response.json();
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, userIdCol, eventCol, funnelSteps, toast]);

    const results = analysisResult?.results;
    
    const chartData = useMemo(() => {
        if (!results) return [];
        return results.map((r, idx) => ({
            name: r.step,
            value: r.users,
            fill: `hsl(${220 - idx * 20}, 70%, ${60 - idx * 5}%)`
        }));
    }, [results]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const overallConversion = results && results.length > 0 
        ? (results[results.length - 1].conversion_rate_from_start * 100) 
        : 0;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Funnel Analysis Setup</CardTitle>
                            <CardDescription>
                                Configure user journey tracking and define conversion steps
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="user-id-col">User ID Column</Label>
                            <Select value={userIdCol} onValueChange={setUserIdCol}>
                                <SelectTrigger id="user-id-col">
                                    <SelectValue placeholder="Select user identifier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="event-col">Event Column</Label>
                            <Select value={eventCol} onValueChange={setEventCol}>
                                <SelectTrigger id="event-col">
                                    <SelectValue placeholder="Select event column" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div>
                        <Label>Funnel Steps (in sequential order)</Label>
                        <div className="space-y-2 mt-2">
                            {funnelSteps.map((step, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Badge variant="outline" className="w-8 justify-center">{index + 1}</Badge>
                                    <Select value={step} onValueChange={v => handleStepChange(index, v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select event" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {eventCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeStep(index)}
                                        disabled={funnelSteps.length <= 2}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addStep} className="w-full">
                                <Plus className="mr-2 h-4 w-4" /> Add Step
                            </Button>
                        </div>
                    </div>

                    {/* Overview */}
                    {userIdCol && eventCol && funnelSteps.every(s => s) && (
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Analysis Overview
                            </h3>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• Tracking: {userIdCol} through {eventCol}</li>
                                <li>• Funnel steps: {funnelSteps.length} stages</li>
                                <li>• Journey: {funnelSteps.join(' → ')}</li>
                                <li>• Total events in dataset: {data.length.toLocaleString()}</li>
                            </ul>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button 
                        onClick={handleAnalysis} 
                        disabled={isLoading || !userIdCol || !eventCol || funnelSteps.some(s => !s)}
                        size="lg"
                    >
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {results && (
                <div className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Starting Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{results[0].users.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-1">Entered funnel</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-primary">
                                    {results[results.length - 1].users.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Reached final step</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Conversion</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-primary">{overallConversion.toFixed(1)}%</p>
                                <p className="text-xs text-muted-foreground mt-1">End-to-end rate</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Dropped</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-red-600">
                                    {(results[0].users - results[results.length - 1].users).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Users lost</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Insights */}
                    {analysisResult.insights && analysisResult.insights.length > 0 && (
                        <div className="space-y-2">
                            {analysisResult.insights.map((insight, idx) => (
                                <Alert 
                                    key={idx}
                                    variant={insight.severity === 'critical' || insight.severity === 'warning' ? 'destructive' : 'default'}
                                >
                                    {insight.severity === 'critical' ? <AlertTriangle className="h-4 w-4" /> :
                                     insight.severity === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                                     <CheckCircle className="h-4 w-4" />}
                                    <AlertTitle className="capitalize">{insight.type}</AlertTitle>
                                    <AlertDescription>{insight.message}</AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}

                    {/* Funnel Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Funnel Visualization</CardTitle>
                            <CardDescription>User progression through conversion stages</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                config={{
                                    users: { label: 'Users', color: 'hsl(var(--chart-1))' }
                                }}
                                className="h-80"
                            >
                                <ResponsiveContainer>
                                    <FunnelChart>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-background border rounded-lg p-3 shadow-md">
                                                            <p className="font-semibold">{data.name}</p>
                                                            <p className="text-primary font-bold">{data.value.toLocaleString()} users</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Funnel dataKey="value" data={chartData} isAnimationActive>
                                            <LabelList 
                                                position="right" 
                                                fill="#000" 
                                                stroke="none" 
                                                dataKey="name"
                                                style={{ fontSize: '14px', fontWeight: 'bold' }}
                                            />
                                        </Funnel>
                                    </FunnelChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Drop-off Analysis */}
                    {analysisResult.drop_offs && analysisResult.drop_offs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Drop-off Analysis</CardTitle>
                                <CardDescription>Identify where users abandon the funnel</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={{
                                        dropRate: { label: 'Drop Rate', color: 'hsl(var(--destructive))' }
                                    }}
                                    className="h-64"
                                >
                                    <ResponsiveContainer>
                                        <BarChart data={analysisResult.drop_offs}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis 
                                                dataKey="from_step" 
                                                tick={{ fontSize: 12 }}
                                            />
                                            <YAxis 
                                                tickFormatter={(value) => `${value}%`}
                                                label={{ value: 'Drop Rate (%)', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-background border rounded-lg p-3 shadow-md">
                                                                <p className="font-semibold text-sm">{data.from_step} → {data.to_step}</p>
                                                                <p className="text-destructive font-bold">{data.drop_rate.toFixed(1)}% dropped</p>
                                                                <p className="text-sm text-muted-foreground">{data.dropped_users.toLocaleString()} users</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="drop_rate" radius={[8, 8, 0, 0]}>
                                                {analysisResult.drop_offs.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={entry.drop_rate > 50 ? 'hsl(var(--destructive))' : 
                                                              entry.drop_rate > 30 ? 'hsl(var(--warning))' : 
                                                              'hsl(var(--chart-2))'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Detailed Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Metrics</CardTitle>
                            <CardDescription>Step-by-step conversion breakdown</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Step</TableHead>
                                        <TableHead className="text-right">Users</TableHead>
                                        <TableHead className="text-right">Overall Conversion</TableHead>
                                        <TableHead className="text-right">Step Conversion</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((row, idx) => (
                                        <TableRow key={row.step}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{idx + 1}</Badge>
                                                    {row.step}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{row.users.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={row.conversion_rate_from_start > 0.5 ? 'default' : 'secondary'}>
                                                    {(row.conversion_rate_from_start * 100).toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={row.conversion_rate_from_previous > 0.7 ? 'default' : 'destructive'}>
                                                    {(row.conversion_rate_from_previous * 100).toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Time Analysis */}
                    {analysisResult.time_analysis && analysisResult.time_analysis.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Time to Convert</CardTitle>
                                <CardDescription>How long users take to progress through funnel</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analysisResult.time_analysis.map((time, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                            <div>
                                                <p className="font-medium">{time.step}</p>
                                                <p className="text-xs text-muted-foreground">From first step</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold">{time.median_time_hours.toFixed(1)}h</p>
                                                <p className="text-xs text-muted-foreground">Median time</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Segment Analysis */}
                    {analysisResult.segment_analysis && analysisResult.segment_analysis.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Segment Performance</CardTitle>
                                <CardDescription>
                                    Conversion rates by {analysisResult.segment_analysis[0].segment_type}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Segment</TableHead>
                                            <TableHead className="text-right">Total Users</TableHead>
                                            <TableHead className="text-right">Converted</TableHead>
                                            <TableHead className="text-right">Conversion Rate</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisResult.segment_analysis.map((seg, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{seg.segment}</TableCell>
                                                <TableCell className="text-right font-mono">{seg.total_users.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-mono">{seg.converted_users.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                                                        {seg.conversion_rate.toFixed(1)}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
