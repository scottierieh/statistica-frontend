'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Smile, Frown, Meh, Percent, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const npsExample = exampleDatasets.find(ex => ex.id === 'csat-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <TrendingUp size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Net Promoter Score (NPS) Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Measure customer loyalty and predict business growth with a single, powerful metric.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use NPS?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            NPS is a widely adopted metric that gauges customer loyalty by asking one simple question: "How likely are you to recommend our company/product/service to a friend or colleague?" on a 0-10 scale. It categorizes customers into Promoters, Passives, and Detractors to provide a clear, actionable score.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {npsExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(npsExample)}>
                                <npsExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{npsExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{npsExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Score Column:</strong> Choose the numeric column containing your 0-10 NPS ratings.</li>
                                <li><strong>Run Analysis:</strong> The tool will automatically calculate the NPS score and segment your respondents.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>NPS Score:</strong> Calculated as (% Promoters - % Detractors). Ranges from -100 to +100. A score above 0 is good, above 50 is excellent.</li>
                                <li><strong>Promoters (9-10):</strong> Your loyal enthusiasts who will keep buying and refer others.</li>
                                <li><strong>Passives (7-8):</strong> Satisfied but unenthusiastic customers who are vulnerable to competitive offerings.</li>
                                 <li><strong>Detractors (0-6):</strong> Unhappy customers who can damage your brand through negative word-of-mouth.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

interface NpsPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NpsPage({ data, numericHeaders, onLoadExample }: NpsPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [scoreColumn, setScoreColumn] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    useEffect(() => {
        const npsCol = numericHeaders.find(h => h.toLowerCase().includes('nps') || h.toLowerCase().includes('rating'));
        setScoreColumn(npsCol || numericHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

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
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
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
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">NPS Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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