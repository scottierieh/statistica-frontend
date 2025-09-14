'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

// Type definitions for the Moderation Analysis results
interface RegressionResult {
    coefficients: number[];
    std_errors: number[];
    t_stats: number[];
    p_values: number[];
    r_squared: number;
    adj_r_squared: number;
    f_stat: number;
    f_p_value: number;
    n: number;
    k: number;
    df: number;
}

interface RsquaredChange {
    delta_r2: number;
    f_change: number;
    p_change: number;
}

interface SimpleSlope {
    label: string;
    slope: number;
    std_error: number;
    t_stat: number;
    p_value: number;
}

interface EffectSize {
    f_squared: number;
    interpretation: string;
}

interface JNResult {
    has_significant_regions: boolean;
    significant_range: [number, number] | null;
}

interface ModerationResults {
    step1: RegressionResult;
    step2: RegressionResult;
    r_squared_change: RsquaredChange;
    simple_slopes: SimpleSlope[];
    effect_size: EffectSize;
    jn_summary: JNResult;
}

interface FullAnalysisResponse {
    results: ModerationResults;
    plot: string; // base64 image string
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

interface ModerationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ModerationPage({ data, numericHeaders, onLoadExample }: ModerationPageProps) {
    const { toast } = useToast();
    const [xVar, setXVar] = useState<string | undefined>(numericHeaders[0]);
    const [yVar, setYVar] = useState<string | undefined>(numericHeaders[1]);
    const [mVar, setMVar] = useState<string | undefined>(numericHeaders[2]);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setXVar(numericHeaders[0] || undefined);
        setYVar(numericHeaders[1] || undefined);
        setMVar(numericHeaders[2] || undefined);
        setAnalysisResult(null);
    }, [numericHeaders, data]);
    
    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length >= 3;
    }, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!xVar || !yVar || !mVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select an Independent, Dependent, and Moderator variable.'});
            return;
        }
        if (new Set([xVar, mVar, yVar]).size < 3) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Independent, Dependent, and Moderator variables must be unique.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/moderation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, xVar, yVar, mVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, xVar, yVar, mVar, toast]);
    
    if (!canRun) {
        const moderationExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('moderation'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Moderation Analysis</CardTitle>
                        <CardDescription>
                           To perform moderation analysis, you need data with at least 3 numeric variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {moderationExamples.map((ex) => (
                             <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                        <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                        <CardDescription className="text-xs">{ex.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                        Load this data
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const availableForY = numericHeaders.filter(h => h !== xVar);
    const availableForM = numericHeaders.filter(h => h !== xVar && h !== yVar);
    
    const results = analysisResult?.results;
    const model = results?.step2;
    const interactionPValue = model?.p_values[3];
    const isSignificant = interactionPValue !== undefined && interactionPValue < 0.05;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Moderation Analysis Setup</CardTitle>
                    <CardDescription>Select your Independent (X), Dependent (Y), and Moderator (M) variables. Analysis uses mean-centered variables.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Independent Variable (X)</label>
                            <Select value={xVar} onValueChange={setXVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Dependent Variable (Y)</label>
                            <Select value={yVar} onValueChange={setYVar} disabled={!xVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableForY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Moderator Variable (M)</label>
                            <Select value={mVar} onValueChange={setMVar} disabled={!yVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableForM.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                     <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={!xVar || !yVar || !mVar || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && model && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Moderation Effect Summary</CardTitle>
                             <CardDescription>
                                The interaction effect is {isSignificant ? <Badge>Statistically Significant</Badge> : <Badge variant="secondary">Not Significant</Badge>}.
                                This means the effect of {xVar} on {yVar} {isSignificant ? "depends on the level of" : "does not significantly depend on the level of"} {mVar}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='grid md:grid-cols-2 gap-4'>
                             <Image src={analysisResult.plot} alt="Moderation Plot" width={800} height={600} className="w-full rounded-md border" />
                             <div className="space-y-4">
                                <Card>
                                    <CardHeader className='pb-2'>
                                        <CardTitle className='text-lg'>Model Fit</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                            <dt className="font-medium text-muted-foreground">R²</dt><dd className="font-mono">{model.r_squared.toFixed(4)}</dd>
                                            <dt className="font-medium text-muted-foreground">Adjusted R²</dt><dd className="font-mono">{model.adj_r_squared.toFixed(4)}</dd>
                                            <dt className="font-medium text-muted-foreground">F-statistic</dt><dd className="font-mono">{model.f_stat.toFixed(2)}</dd>
                                            <dt className="font-medium text-muted-foreground">p-value</dt><dd className="font-mono">{model.f_p_value.toFixed(4)}</dd>
                                        </dl>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader className='pb-2'>
                                        <CardTitle className='text-lg'>Interaction Effect (R² Change)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                            <dt className="font-medium text-muted-foreground">ΔR²</dt><dd className="font-mono">{results.r_squared_change.delta_r2.toFixed(4)}</dd>
                                            <dt className="font-medium text-muted-foreground">F-change</dt><dd className="font-mono">{results.r_squared_change.f_change.toFixed(2)}</dd>
                                            <dt className="font-medium text-muted-foreground">p-value</dt><dd className="font-mono">{results.r_squared_change.p_change.toFixed(4)}</dd>
                                        </dl>
                                    </CardContent>
                                </Card>
                             </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Hierarchical Regression Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Coefficient (B)</TableHead>
                                        <TableHead className="text-right">Std. Error</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>(Intercept)</TableCell><TableCell className="text-right font-mono">{model.coefficients[0].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.std_errors[0].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.p_values[0].toFixed(4)} {getSignificanceStars(model.p_values[0])}</TableCell></TableRow>
                                    <TableRow><TableCell>{xVar} (X)</TableCell><TableCell className="text-right font-mono">{model.coefficients[1].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.std_errors[1].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.p_values[1].toFixed(4)} {getSignificanceStars(model.p_values[1])}</TableCell></TableRow>
                                    <TableRow><TableCell>{mVar} (M)</TableCell><TableCell className="text-right font-mono">{model.coefficients[2].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.std_errors[2].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.p_values[2].toFixed(4)} {getSignificanceStars(model.p_values[2])}</TableCell></TableRow>
                                    <TableRow className="font-bold"><TableCell>X * M Interaction</TableCell><TableCell className="text-right font-mono">{model.coefficients[3].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.std_errors[3].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{model.p_values[3].toFixed(4)} {getSignificanceStars(model.p_values[3])}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Simple Slopes Analysis</CardTitle>
                                <CardDescription>The effect of {xVar} on {yVar} at different levels of {mVar}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                     <TableHeader>
                                        <TableRow>
                                            <TableHead>Moderator Level</TableHead>
                                            <TableHead className="text-right">Slope of X</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.simple_slopes.map((ss, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{ss.label}</TableCell>
                                                <TableCell className="text-right font-mono">{ss.slope.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{ss.p_value.toFixed(4)} {getSignificanceStars(ss.p_value)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className='space-y-4'>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Effect Size</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <dt className="font-medium text-muted-foreground">Cohen's f²</dt>
                                        <dd className="font-mono text-right">{results.effect_size.f_squared.toFixed(4)}</dd>
                                        <dt className="font-medium text-muted-foreground">Interpretation</dt>
                                        <dd className="text-right"><Badge variant="secondary">{results.effect_size.interpretation}</Badge></dd>
                                    </dl>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Johnson-Neyman Regions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {results.jn_summary.has_significant_regions ? (
                                        <>
                                            <p className='text-sm font-semibold'>Significant regions found!</p>
                                            <p className='text-sm text-muted-foreground'>The effect of {xVar} is significant when {mVar} is between <span className='font-mono font-semibold'>{results.jn_summary.significant_range?.[0].toFixed(3)}</span> and <span className='font-mono font-semibold'>{results.jn_summary.significant_range?.[1].toFixed(3)}</span>.</p>
                                        </>
                                    ) : (
                                        <p className='text-sm text-muted-foreground'>No significant regions found within the observed range of the moderator.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                </>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}
