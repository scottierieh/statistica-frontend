
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, HelpCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '../ui/label';

interface BayesianResults {
    bf10: number;
    hdi_95: [number, number];
    prob_g1_gt_g2: number;
    prob_g2_gt_g1: number;
    mean_difference: number;
    rope_percentage: number;
    descriptives: { [key: string]: { mean: number; std: number; n: number; }};
    groups: string[];
}

interface FullAnalysisResponse {
    results: BayesianResults;
    plot: string;
}

const getBfInterpretation = (bf10: number) => {
    if (bf10 > 100) return { text: "Extreme evidence for H1", color: "text-green-600" };
    if (bf10 > 30) return { text: "Very strong evidence for H1", color: "text-green-500" };
    if (bf10 > 10) return { text: "Strong evidence for H1", color: "text-green-500" };
    if (bf10 > 3) return { text: "Moderate evidence for H1", color: "text-green-400" };
    if (bf10 > 1) return { text: "Anecdotal evidence for H1", color: "text-yellow-500" };
    if (bf10 < 1/100) return { text: "Extreme evidence for H0", color: "text-blue-600" };
    if (bf10 < 1/30) return { text: "Very strong evidence for H0", color: "text-blue-500" };
    if (bf10 < 1/10) return { text: "Strong evidence for H0", color: "text-blue-500" };
    if (bf10 < 1/3) return { text: "Moderate evidence for H0", color: "text-blue-400" };
    if (bf10 < 1) return { text: "Anecdotal evidence for H0", color: "text-yellow-500" };
    return { text: "No evidence", color: "text-gray-500" };
};

interface BayesianPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function BayesianPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: BayesianPageProps) {
    const { toast } = useToast();
    
    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    const [groupCol, setGroupCol] = useState<string | undefined>(binaryCategoricalHeaders[0]);
    const [valueCol, setValueCol] = useState<string | undefined>(numericHeaders[0]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setGroupCol(binaryCategoricalHeaders[0]);
        setValueCol(numericHeaders[0]);
        setAnalysisResult(null);
    }, [data, numericHeaders, binaryCategoricalHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && (numericHeaders.length > 0 && categoricalHeaders.length > 0), [data, numericHeaders, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!groupCol || !valueCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a group variable (with exactly 2 groups) and a value variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/bayesian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, group_col: groupCol, value_col: valueCol })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
        } catch (e: any) {
            console.error('Bayesian analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupCol, valueCol, toast]);

    if (!canRun) {
        const bayesianExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('bayesian'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Bayesian A/B Test</CardTitle>
                        <CardDescription>To perform this analysis, you need data with a numeric variable and a categorical variable with exactly two groups.</CardDescription>
                    </CardHeader>
                    {bayesianExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {bayesianExamples.map((ex) => {
                                    const Icon = ex.icon;
                                    return (
                                        <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                            <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                    <Icon className="h-6 w-6 text-secondary-foreground" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                                    <CardDescription className="text-xs">{ex.description}</CardDescription>
                                                </div>
                                            </CardHeader>
                                            <CardFooter>
                                                <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                                    Load this data
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;
    const bfInterpretation = results ? getBfInterpretation(results.bf10) : null;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Bayesian T-Test Setup</CardTitle>
                    <CardDescription>Compare two groups to determine the probability that one is better than the other.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="group-var">Group Variable (2 Groups)</Label>
                            <Select value={groupCol} onValueChange={setGroupCol}>
                                <SelectTrigger id="group-var"><SelectValue placeholder="Select a group"/></SelectTrigger>
                                <SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="value-var">Value Variable (Numeric)</Label>
                            <Select value={valueCol} onValueChange={setValueCol}>
                                <SelectTrigger id="value-var"><SelectValue placeholder="Select a value"/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !groupCol || !valueCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/><p className="mt-2 text-muted-foreground">Running Bayesian analysis...</p></CardContent></Card>}
            
            {results && analysisResult?.plot ? (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg">There is a <span className="font-bold">{(results.prob_g1_gt_g2 * 100).toFixed(1)}% probability</span> that the mean of <Badge variant="secondary">{results.groups[0]}</Badge> is greater than the mean of <Badge variant="secondary">{results.groups[1]}</Badge>.</p>
                            {bfInterpretation && <p className={`mt-2 font-semibold ${bfInterpretation.color}`}>The data provides: {bfInterpretation.text}</p>}
                        </CardContent>
                    </Card>
                    
                    <div className="grid lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                             <Card>
                                <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plot} alt="Bayesian Analysis Plots" width={800} height={500} className="w-full rounded-md border" />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-4">
                            <Card>
                                <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
                                <CardContent>
                                    <dl className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center"><dt className="flex items-center gap-1">Bayes Factor (BF₁₀) <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="h-4 w-4 text-muted-foreground"/></TooltipTrigger><TooltipContent><p>Evidence for H1 vs H0. &gt;1 supports H1, &lt;1 supports H0.</p></TooltipContent></Tooltip></TooltipProvider></dt><dd className="font-mono">{results.bf10.toFixed(3)}</dd></div>
                                        <div className="flex justify-between items-center"><dt>Mean Difference</dt><dd className="font-mono">{results.mean_difference.toFixed(3)}</dd></div>
                                        <div className="flex justify-between items-center"><dt>95% Credible Interval</dt><dd className="font-mono">[{results.hdi_95[0].toFixed(2)}, {results.hdi_95[1].toFixed(2)}]</dd></div>
                                        <div className="flex justify-between items-center"><dt>% in ROPE [-0.1, 0.1]</dt><dd className="font-mono">{(results.rope_percentage * 100).toFixed(1)}%</dd></div>
                                    </dl>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Group Descriptives</CardTitle></CardHeader>
                                <CardContent>
                                     <dl className="space-y-3 text-sm">
                                        {results.groups.map(group => (
                                            <div key={group}>
                                                <p className="font-semibold">{group}</p>
                                                <div className="flex justify-between text-muted-foreground"><dt>Mean:</dt><dd className="font-mono">{results.descriptives[group].mean.toFixed(2)}</dd></div>
                                                <div className="flex justify-between text-muted-foreground"><dt>Std Dev:</dt><dd className="font-mono">{results.descriptives[group].std.toFixed(2)}</dd></div>
                                                <div className="flex justify-between text-muted-foreground"><dt>N:</dt><dd className="font-mono">{results.descriptives[group].n}</dd></div>
                                            </div>
                                        ))}
                                     </dl>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        <FlaskConical className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                    </div>
                )
            )}
        </div>
    );
}
