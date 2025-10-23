
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Smile, Frown, Meh, Percent } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';

interface NpsResult {
    npsScore: number;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: NpsResult;
}

interface NpsPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NpsPage({ data, numericHeaders, onLoadExample }: NpsPageProps) {
    const { toast } = useToast();
    const [scoreColumn, setScoreColumn] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    useEffect(() => {
        const npsCol = numericHeaders.find(h => h.toLowerCase().includes('nps') || h.toLowerCase().includes('rating'));
        setScoreColumn(npsCol || numericHeaders[0]);
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!scoreColumn) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a score column.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const scores = data.map(row => row[scoreColumn]).filter(v => typeof v === 'number' && !isNaN(v));
            if (scores.length === 0) {
                throw new Error("No valid numeric data found in the selected column.");
            }

            const response = await fetch('/api/analysis/nps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scores })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: 'NPS Analysis Complete' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, scoreColumn, toast]);
    
    if (!canRun) {
        const npsExample = exampleDatasets.find(ex => ex.analysisTypes.includes('csat'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Net Promoter Score (NPS)</CardTitle>
                        <CardDescription>To analyze NPS, you need data with a numeric rating column (typically 0-10).</CardDescription>
                    </CardHeader>
                    {npsExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(npsExample)}>
                                <Smile className="mr-2" /> Load CSAT Example Data
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;
    
    const chartData = results ? [
        { name: 'Promoters', count: results.promoters, fill: '#16a34a' }, // green
        { name: 'Passives', count: results.passives, fill: '#facc15' }, // yellow
        { name: 'Detractors', count: results.detractors, fill: '#ef4444' } // red
    ] : [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">NPS Analysis Setup</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-xs">
                        <Label>NPS Score Column (0-10)</Label>
                        <Select value={scoreColumn} onValueChange={setScoreColumn}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAnalysis} disabled={isLoading || !scoreColumn}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Calculating...</> : <><Sigma className="mr-2"/>Calculate NPS</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>NPS Score</CardTitle></CardHeader>
                        <CardContent className="text-center">
                            <p className="text-7xl font-bold text-primary">{results.npsScore.toFixed(1)}</p>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-green-300">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Promoters (9-10)</CardTitle>
                                <Smile className="text-green-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{results.promoters}</div>
                                <p className="text-xs text-muted-foreground">({(results.promoters / results.total * 100).toFixed(1)}%)</p>
                            </CardContent>
                        </Card>
                         <Card className="border-yellow-300">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Passives (7-8)</CardTitle>
                                <Meh className="text-yellow-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{results.passives}</div>
                                 <p className="text-xs text-muted-foreground">({(results.passives / results.total * 100).toFixed(1)}%)</p>
                            </CardContent>
                        </Card>
                         <Card className="border-red-300">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Detractors (0-6)</CardTitle>
                                <Frown className="text-red-500"/>
                            </CardHeader>
                             <CardContent>
                                <div className="text-2xl font-bold">{results.detractors}</div>
                                 <p className="text-xs text-muted-foreground">({(results.detractors / results.total * 100).toFixed(1)}%)</p>
                            </CardContent>
                        </Card>
                    </div>
                     <Card>
                        <CardHeader>
                            <CardTitle>Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="w-full h-64">
                                <ResponsiveContainer>
                                    <BarChart data={chartData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" hide />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="count" layout="vertical" stackId="a" radius={[5,5,5,5]}>
                                             {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Alert>
                        <Percent className="h-4 w-4" />
                        <AlertTitle>Interpretation</AlertTitle>
                        <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </Alert>
                </div>
            )}
        </div>
    )
}
