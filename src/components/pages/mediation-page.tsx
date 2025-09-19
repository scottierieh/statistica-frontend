

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, CheckCircle, XCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface PathResult {
    coef: number;
    se: number;
    t_stat: number;
    p_value: number;
    r_squared?: number; // Optional as it might not be on all path results from backend
}

interface SobelResult {
    effect: number;
    se: number;
    z_stat: number;
    p_value: number;
}

interface BootstrapResult {
    mean_effect: number;
    se: number;
    ci_lower: number;
    ci_upper: number;
    n_bootstrap: number;
    significant: boolean;
}

interface MediationResults {
    baron_kenny: {
        path_c: PathResult;
        path_a: PathResult;
        path_b: PathResult;
        path_c_prime: PathResult;
        indirect_effect: number;
        sobel_test: SobelResult;
    };
    bootstrap?: BootstrapResult;
    mediation_type: string;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: MediationResults;
    plot: string; // base64 image string
}


const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};


interface MediationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MediationPage({ data, numericHeaders, onLoadExample }: MediationPageProps) {
    const { toast } = useToast();
    const [xVar, setXVar] = useState<string | undefined>(numericHeaders[0]);
    const [mVar, setMVar] = useState<string | undefined>(numericHeaders[1]);
    const [yVar, setYVar] = useState<string | undefined>(numericHeaders[2]);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setXVar(numericHeaders[0] || undefined);
        setMVar(numericHeaders[1] || undefined);
        setYVar(numericHeaders[2] || undefined);
        setAnalysisResult(null);
    }, [numericHeaders, data]);
    
    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length >= 3;
    }, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!xVar || !mVar || !yVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select an Independent, Mediator, and Dependent variable.'});
            return;
        }
        if (new Set([xVar, mVar, yVar]).size < 3) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Independent, Mediator, and Dependent variables must be unique.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/mediation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, xVar, mVar, yVar })
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
    }, [data, xVar, mVar, yVar, toast]);
    
    if (!canRun) {
        const mediationExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('mediation'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Mediation Analysis</CardTitle>
                        <CardDescription>
                           To perform mediation analysis, you need data with at least 3 numeric variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    {mediationExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mediationExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <Network className="h-6 w-6 text-secondary-foreground" />
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
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    const availableForM = numericHeaders.filter(h => h !== xVar);
    const availableForY = numericHeaders.filter(h => h !== xVar && h !== mVar);
    
    const results = analysisResult?.results;
    const bk = results?.baron_kenny;
    const boot = results?.bootstrap;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Mediation Analysis Setup</CardTitle>
                    <CardDescription>Select your Independent (X), Mediator (M), and Dependent (Y) variables. Analysis uses standardized variables.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Independent Variable (X)</label>
                            <Select value={xVar} onValueChange={setXVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Mediator Variable (M)</label>
                            <Select value={mVar} onValueChange={setMVar} disabled={!xVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableForM.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Dependent Variable (Y)</label>
                            <Select value={yVar} onValueChange={setYVar} disabled={!mVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableForY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                     <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={!xVar || !mVar || !yVar || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && bk && (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent className='grid md:grid-cols-2 gap-4'>
                         <Image src={analysisResult.plot} alt="Mediation Plot" width={1200} height={500} className="w-full rounded-md border" />
                         <div className='space-y-4'>
                            <Alert variant={results.mediation_type !== "No Mediation" ? 'default' : 'destructive'}>
                                {results.mediation_type !== "No Mediation" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                <AlertTitle>Mediation Result</AlertTitle>
                                <AlertDescription>The analysis suggests a <span className="font-bold">{results.mediation_type}</span> effect.</AlertDescription>
                            </Alert>
                             <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-base">Interpretation</CardTitle></CardHeader>
                                <CardContent>
                                    <p className='text-sm text-muted-foreground whitespace-pre-wrap' dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                                </CardContent>
                            </Card>
                         </div>
                    </CardContent>
                </Card>

                <div className='grid lg:grid-cols-2 gap-4'>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Effect Decomposition</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <div className="space-y-1"><dt className="font-medium text-muted-foreground">Total Effect (c)</dt><dd className="text-xl font-bold font-mono">{bk.path_c.coef.toFixed(4)}</dd></div>
                                <div className="space-y-1"><dt className="font-medium text-muted-foreground">Direct Effect (c')</dt><dd className="text-xl font-bold font-mono">{bk.path_c_prime.coef.toFixed(4)}</dd></div>
                                <div className="space-y-1"><dt className="font-medium text-muted-foreground">Indirect Effect (a*b)</dt><dd className="text-xl font-bold font-mono">{bk.indirect_effect.toFixed(4)}</dd></div>
                                <div className="space-y-1"><dt className="font-medium text-muted-foreground">Percent Mediated</dt><dd className="text-xl font-bold font-mono">{Math.abs(bk.indirect_effect / bk.path_c.coef * 100).toFixed(2)}%</dd></div>
                            </dl>
                        </CardContent>
                    </Card>
                    {boot ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Bootstrap Results</CardTitle>
                                <CardDescription>A robust test of the indirect effect using {boot.n_bootstrap} samples.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="space-y-1"><dt className="font-medium text-muted-foreground">Indirect Effect</dt><dd className="text-xl font-bold font-mono">{boot.mean_effect.toFixed(4)}</dd></div>
                                    <div className="space-y-1"><dt className="font-medium text-muted-foreground">Bootstrap SE</dt><dd className="text-xl font-bold font-mono">{boot.se.toFixed(4)}</dd></div>
                                    <div className="col-span-2 space-y-1"><dt className="font-medium text-muted-foreground">95% Confidence Interval</dt><dd className="text-xl font-bold font-mono">[{boot.ci_lower.toFixed(4)}, {boot.ci_upper.toFixed(4)}]</dd></div>
                                </dl>
                                 <div className="mt-4">
                                    {boot.significant ? (
                                        <div className='flex items-center text-green-600'><CheckCircle className='mr-2' /> The confidence interval does not contain zero, indicating a significant indirect effect.</div>
                                    ) : (
                                        <div className='flex items-center text-destructive'><XCircle className='mr-2' /> The confidence interval contains zero, indicating the indirect effect is not significant.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Sobel Test</CardTitle>
                                 <CardDescription>A traditional test of the indirect effect.</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="space-y-1"><dt className="font-medium text-muted-foreground">Indirect Effect (a*b)</dt><dd className="text-xl font-bold font-mono">{bk.sobel_test.effect.toFixed(4)}</dd></div>
                                    <div className="space-y-1"><dt className="font-medium text-muted-foreground">Sobel Z-statistic</dt><dd className="text-xl font-bold font-mono">{bk.sobel_test.z_stat.toFixed(3)}</dd></div>
                                    <div className="space-y-1"><dt className="font-medium text-muted-foreground">Standard Error</dt><dd className="text-lg font-mono">{bk.sobel_test.se.toFixed(4)}</dd></div>
                                    <div className="space-y-1"><dt className="font-medium text-muted-foreground">p-value</dt><dd className="text-lg font-mono">{bk.sobel_test.p_value.toFixed(4)} {getSignificanceStars(bk.sobel_test.p_value)}</dd></div>
                                </dl>
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Path Coefficients Details (Baron & Kenny)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Path</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Coefficient</TableHead>
                                    <TableHead className="text-right">Std. Error</TableHead>
                                    <TableHead className="text-right">t-value</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow><TableCell>c</TableCell><TableCell>Total Effect (X → Y)</TableCell><TableCell className="text-right font-mono">{bk.path_c.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c.se?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_c.p_value.toFixed(4)} {getSignificanceStars(bk.path_c.p_value)}</TableCell></TableRow>
                                <TableRow><TableCell>a</TableCell><TableCell>X → M</TableCell><TableCell className="text-right font-mono">{bk.path_a.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_a.se?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_a.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_a.p_value.toFixed(4)} {getSignificanceStars(bk.path_a.p_value)}</TableCell></TableRow>
                                <TableRow><TableCell>b</TableCell><TableCell>M → Y (controlling for X)</TableCell><TableCell className="text-right font-mono">{bk.path_b.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_b.se?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_b.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_b.p_value.toFixed(4)} {getSignificanceStars(bk.path_b.p_value)}</TableCell></TableRow>
                                <TableRow><TableCell>c'</TableCell><TableCell>Direct Effect (X → Y, controlling for M)</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.se?.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.p_value.toFixed(4)} {getSignificanceStars(bk.path_c_prime.p_value)}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
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

    
