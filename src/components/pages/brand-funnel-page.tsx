
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BrandStages {
    awareness: number;
    consideration: number;
    preference: number;
    usage: number;
}

interface ConversionRates {
    awareness_to_consideration: number;
    consideration_to_preference: number;
    preference_to_usage: number;
    awareness_to_usage: number;
}

interface Results {
    funnel_data: { [brand: string]: BrandStages };
    conversion_rates: { [brand: string]: ConversionRates };
    market_share: { [stage: string]: { [brand: string]: number } };
    efficiency: { [brand: string]: { funnel_efficiency: number; drop_off_rate: number } };
    bottlenecks: Array<{ brand: string; bottleneck_stage: string; conversion_rate: number }>;
    drop_off: { [brand: string]: { [stage: string]: { count: number; rate: number } } };
    health_scores: { [brand: string]: { total_score: number; conversion_component: number; consistency_component: number; volume_component: number } };
    insights: {
        top_performer: { brand: string; efficiency: number; description: string };
        market_leader: { awareness: string; usage: string; description: string };
        biggest_opportunity: { brand: string; bottleneck: string; rate: number; description: string };
        conversion_champion: { brand: string; rate: number; description: string };
    };
}

interface Props {
    survey: Survey;
    responses: SurveyResponse[];
}

const COLORS = ['#a67b70', '#b5a888', '#c4956a', '#7a9471', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

export default function BrandFunnelPage({ survey, responses }: Props) {
    const { toast } = useToast();
    const [results, setResults] = useState<Results | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!survey || !responses || responses.length === 0) {
                throw new Error("No survey data or responses");
            }

            const q_aware = survey.questions.find(q => q.title.toLowerCase().includes('heard of'));
            const q_consider = survey.questions.find(q => q.title.toLowerCase().includes('consider'));
            const q_prefer = survey.questions.find(q => q.title.toLowerCase().includes('prefer'));
            const q_usage = survey.questions.find(q => q.title.toLowerCase().includes('used'));

            if (!q_aware || !q_consider || !q_prefer || !q_usage) {
                throw new Error("Missing required funnel questions (awareness, consideration, preference, usage).");
            }

            const brands = q_aware.options || [];
            if (brands.length === 0) throw new Error("No brands found in the awareness question.");

            const counts: { [brand: string]: BrandStages } = {};
            brands.forEach(brand => {
                counts[brand] = { awareness: 0, consideration: 0, preference: 0, usage: 0 };
            });

            responses.forEach(resp => {
                const ans = resp.answers as any;
                const aware = (ans[q_aware.id] as string[]) || [];
                const consider = (ans[q_consider.id] as string[]) || [];
                const prefer = ans[q_prefer.id] as string;
                const usage = (ans[q_usage.id] as string[]) || [];

                brands.forEach(brand => {
                    if (aware.includes(brand)) counts[brand].awareness++;
                    if (consider.includes(brand)) counts[brand].consideration++;
                    if (prefer === brand) counts[brand].preference++;
                    if (usage.includes(brand)) counts[brand].usage++;
                });
            });
            
            const response = await fetch('/api/analysis/brand-funnel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brands, funnel_data: counts, total_respondents: responses.length })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'API error');
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setResults(data.results);
        } catch (err: any) {
            setError(err.message);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [survey, responses, toast]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);

    const chartData = useMemo(() => {
        if (!results?.funnel_data) return [];
        const stages = ['awareness', 'consideration', 'preference', 'usage'];
        const brands = Object.keys(results.funnel_data);
        return stages.map(stage => {
            const row: any = { stage: stage.charAt(0).toUpperCase() + stage.slice(1) };
            brands.forEach(brand => {
                row[brand.replace(/\s/g, '_')] = results.funnel_data[brand][stage as keyof BrandStages];
            });
            return row;
        });
    }, [results]);

    const brands = useMemo(() => results ? Object.keys(results.funnel_data) : [], [results]);

    const marketShareData = useMemo(() => {
        if (!results) return [];
        return brands.map(brand => ({
            brand,
            stages: Object.fromEntries(
                Object.entries(results.market_share).map(([stageKey, brandShares]) => [
                    stageKey, brandShares[brand]
                ])
            )
        }));
    }, [results, brands]);

    if (loading) {
        return <Card><CardContent className="p-8"><Skeleton className="h-96 w-full" /></CardContent></Card>;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!results) {
        return <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>No Data</AlertTitle></Alert>;
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Brand Funnel</CardTitle>
                    <CardDescription>Respondents at each stage</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="w-full h-96">
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="stage" />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                {brands.map((brand, i) => (
                                    <Bar key={brand} dataKey={brand.replace(/\s/g, '_')} name={brand} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-4 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Top Performer</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{results.insights?.top_performer?.brand || 'N/A'}</p><p className="text-sm text-muted-foreground">Efficiency: {(results.insights?.top_performer?.efficiency ?? 0).toFixed(1)}%</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Market Leader (Usage)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{results.insights?.market_leader?.usage || 'N/A'}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Best Conversion</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{results.insights?.conversion_champion?.brand || 'N/A'}</p><p className="text-sm text-muted-foreground">Rate: {(results.insights?.conversion_champion?.rate ?? 0).toFixed(1)}%</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Biggest Opportunity</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{results.insights?.biggest_opportunity?.brand || 'N/A'}</p><p className="text-sm text-muted-foreground">{results.insights?.biggest_opportunity?.bottleneck || 'N/A'}</p></CardContent></Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Detailed Data</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="counts">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="counts">Counts</TabsTrigger>
                            <TabsTrigger value="conversion">Conversion (%)</TabsTrigger>
                            <TabsTrigger value="share">Market Share (%)</TabsTrigger>
                            <TabsTrigger value="dropoff">Drop-off (%)</TabsTrigger>
                        </TabsList>

                        <TabsContent value="counts" className="mt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>Brand</TableHead><TableHead className="text-right">Awareness</TableHead><TableHead className="text-right">Consideration</TableHead><TableHead className="text-right">Preference</TableHead><TableHead className="text-right">Usage</TableHead></TableRow></TableHeader>
                                <TableBody>{brands.map(brand => (<TableRow key={brand}><TableCell className="font-medium">{brand}</TableCell><TableCell className="text-right">{results.funnel_data[brand].awareness}</TableCell><TableCell className="text-right">{results.funnel_data[brand].consideration}</TableCell><TableCell className="text-right">{results.funnel_data[brand].preference}</TableCell><TableCell className="text-right">{results.funnel_data[brand].usage}</TableCell></TableRow>))}</TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="conversion" className="mt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>Brand</TableHead><TableHead className="text-right">Aware→Consider</TableHead><TableHead className="text-right">Consider→Prefer</TableHead><TableHead className="text-right">Prefer→Usage</TableHead><TableHead className="text-right">Overall (Aware→Usage)</TableHead></TableRow></TableHeader>
                                <TableBody>{brands.map(brand => (<TableRow key={brand}><TableCell className="font-medium">{brand}</TableCell><TableCell className="text-right">{(results.conversion_rates[brand]?.awareness_to_consideration ?? 0).toFixed(1)}%</TableCell><TableCell className="text-right">{(results.conversion_rates[brand]?.consideration_to_preference ?? 0).toFixed(1)}%</TableCell><TableCell className="text-right">{(results.conversion_rates[brand]?.preference_to_usage ?? 0).toFixed(1)}%</TableCell><TableCell className="text-right font-semibold">{(results.conversion_rates[brand]?.awareness_to_usage ?? 0).toFixed(1)}%</TableCell></TableRow>))}</TableBody>
                            </Table>
                        </TabsContent>
                        
                        <TabsContent value="share" className="mt-4">
                           <Table>
                               <TableHeader><TableRow><TableHead>Brand</TableHead>{Object.keys(results.market_share || {}).map(stage => (<TableHead key={stage} className="text-right">{stage.replace('_share', '')}</TableHead>))}</TableRow></TableHeader>
                               <TableBody>{marketShareData.map(({ brand, stages }) => (<TableRow key={brand}><TableCell>{brand}</TableCell>{Object.values(stages).map((value, i) => (<TableCell key={i} className="text-right">{(value ?? 0).toFixed(1)}%</TableCell>))}</TableRow>))}</TableBody>
                           </Table>
                       </TabsContent>

                        <TabsContent value="dropoff" className="mt-4">
                           <Table>
                               <TableHeader><TableRow><TableHead>Brand</TableHead><TableHead className="text-right">Aware→Consider</TableHead><TableHead className="text-right">Consider→Prefer</TableHead><TableHead className="text-right">Prefer→Usage</TableHead></TableRow></TableHeader>
                               <TableBody>{brands.map(brand => (<TableRow key={brand}><TableCell className="font-medium">{brand}</TableCell>{Object.values(results.drop_off[brand] || {}).map((val: any, idx) => (<TableCell key={idx} className="text-right"><div>{val.rate.toFixed(1)}%</div><div className="text-xs text-muted-foreground">({val.count} lost)</div></TableCell>))}</TableRow>))}</TableBody>
                           </Table>
                       </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
