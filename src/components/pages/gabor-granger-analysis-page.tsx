
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, AlertTriangle, LineChart, BarChart } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid, Bar, BarChart as RechartsBarChart, Cell, ReferenceLine } from 'recharts';


interface GaborGrangerResults {
    optimal_revenue_price: number;
    optimal_profit_price?: number;
    max_revenue: number;
    max_profit?: number;
    demand_curve: { price: number; likelihood: number; revenue: number; profit?: number }[];
    cliff_price: number;
    acceptable_range: [number, number] | null;
    price_elasticity: { price_from: number, price_to: number, elasticity: number }[];
}

interface FullAnalysisResponse {
    results: GaborGrangerResults;
    error?: string;
}

interface GaborGrangerPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const StatCard = ({ title, value, unit = '$' }: { title: string, value: number | undefined | null, unit?: string }) => (
    <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value !== undefined && value !== null ? `${unit}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'N/A'}</p>
    </div>
);

export default function GaborGrangerAnalysisPage({ survey, responses }: GaborGrangerPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unitCost, setUnitCost] = useState<number | undefined>();

    const handleAnalysis = useCallback(async (cost?: number) => {
        if (!survey || !responses || responses.length === 0) {
            setError("No response data available for this survey.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        if (cost === undefined) {
             setAnalysisResult(null);
        }

        const gaborGrangerQuestions = survey.questions.filter(q => q.type === 'single' && q.title.toLowerCase().includes('if this product was sold for'));

        if (gaborGrangerQuestions.length === 0) {
            setError("No Gabor-Granger style questions found in the survey.");
            setIsLoading(false);
            return;
        }

        const analysisData: { respondent_id: string; price: number; purchase_intent: number }[] = [];
        responses.forEach(resp => {
            gaborGrangerQuestions.forEach(q => {
                const answer = (resp.answers as any)[q.id];
                const priceMatch = q.title.match(/\$?([\d,]+)/);
                if (answer && priceMatch) {
                    analysisData.push({
                        respondent_id: resp.id,
                        price: Number(priceMatch[1].replace(/,/g, '')),
                        purchase_intent: answer === 'Yes, I would buy' ? 1 : 0,
                    });
                }
            });
        });

        if (analysisData.length === 0) {
            setError("Could not extract valid data for Gabor-Granger analysis from responses.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/analysis/gabor-granger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    price_col: 'price',
                    purchase_intent_col: 'purchase_intent',
                    unit_cost: cost
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            if(cost !== undefined) {
                 toast({ title: 'Analysis Updated', description: 'Profit calculations have been added.' });
            } else {
                 toast({ title: 'Analysis Complete', description: 'Gabor-Granger analysis finished.' });
            }

        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);
    
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    const handleUnitCostAnalysis = () => {
        handleAnalysis(unitCost);
    };

    if (isLoading && !analysisResult) {
        return <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p>Running Gabor-Granger analysis...</p></CardContent></Card>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    if (!analysisResult) {
        return <Card><CardContent className="p-6 text-center text-muted-foreground">No analysis results to display.</CardContent></Card>;
    }
    
    const { results } = analysisResult;
    const chartData = results.demand_curve.map(d => ({...d, likelihood_pct: d.likelihood * 100}));
    const elasticityData = results.price_elasticity.map(e => ({...e, range: `${e.price_from}-${e.price_to}`}));


    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Analysis Configuration</CardTitle>
                </CardHeader>
                <CardContent className="flex items-end gap-4">
                     <div className="max-w-xs">
                        <Label htmlFor="unit-cost">Unit Cost (Optional)</Label>
                        <Input 
                            id="unit-cost"
                            type="number"
                            placeholder="Enter cost per unit"
                            value={unitCost === undefined ? '' : unitCost}
                            onChange={e => setUnitCost(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Provide a unit cost to calculate profit-optimal pricing.</p>
                    </div>
                     <Button onClick={handleUnitCostAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Recalculating...</> : <>Recalculate with Cost</>}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Gabor-Granger Analysis Results</CardTitle>
                    <CardDescription>Analysis of price sensitivity and revenue/profit optimization.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <StatCard title="Optimal Price (Revenue)" value={results.optimal_revenue_price} />
                     <StatCard title="Max Revenue Index" value={results.max_revenue} unit="" />
                     <StatCard title="Optimal Price (Profit)" value={results.optimal_profit_price} />
                     {results.max_profit !== undefined && <StatCard title="Max Profit Index" value={results.max_profit} unit="" />}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Demand, Revenue, and Profit Curves</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="w-full h-96">
                      <ResponsiveContainer>
                        <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="price" name="Price" unit="$" />
                          <YAxis yAxisId="left" stroke="#3b82f6" label={{ value: 'Purchase Likelihood (%)', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" stroke="#ef4444" label={{ value: 'Revenue / Profit Index', angle: 90, position: 'insideRight' }} />
                          <Tooltip content={<ChartTooltipContent formatter={(value, name) => `${(value as number).toFixed(name === 'likelihood_pct' ? 1 : 2)}${name === 'likelihood_pct' ? '%' : ''}`} />} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="likelihood_pct" name="Demand Curve" stroke="#3b82f6" strokeWidth={2} />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue Curve" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                          {results.demand_curve.some(d => d.profit !== undefined) && (
                            <Line yAxisId="right" type="monotone" dataKey="profit" name="Profit Curve" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
                          )}
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
            
             <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Demand Curve Data</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Purchase Likelihood</TableHead>
                                    <TableHead className="text-right">Revenue Index</TableHead>
                                    {results.demand_curve.some(r => r.profit !== undefined) && <TableHead className="text-right">Profit Index</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.demand_curve.map((row) => (
                                    <TableRow key={row.price}>
                                        <TableCell>${row.price.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono">{(row.likelihood * 100).toFixed(1)}%</TableCell>
                                        <TableCell className="text-right font-mono">{row.revenue.toFixed(2)}</TableCell>
                                        {row.profit !== undefined && <TableCell className="text-right font-mono">{row.profit.toFixed(2)}</TableCell>}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Price Elasticity by Range</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                         <ChartContainer config={{elasticity: {label: 'Elasticity'}}} className="w-full h-80">
                            <ResponsiveContainer>
                                <RechartsBarChart data={elasticityData} layout="vertical" margin={{ left: 60, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="range" width={80} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <ReferenceLine x={-1} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                                    <Bar dataKey="elasticity" name="Elasticity">
                                        {elasticityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.elasticity < -1 ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
                                        ))}
                                    </Bar>
                                </RechartsBarChart>
                            </ResponsiveContainer>
                         </ChartContainer>
                         <div className="overflow-y-auto h-80">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Price Range</TableHead>
                                        <TableHead className="text-right">Elasticity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {elasticityData.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.range}</TableCell>
                                            <TableCell className="text-right font-mono">{item.elasticity.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
