
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface MediationResults {
    baron_kenny: {
        path_c: PathResult;
        path_a: PathResult;
        path_b: PathResult;
        path_c_prime: PathResult;
        indirect_effect: number;
        sobel_test: SobelResult;
    };
    mediation_type: string;
}

interface PathResult {
    coef: number;
    se: number;
    t_stat: number;
    p_value: number;
    r_squared: number;
}

interface SobelResult {
    effect: number;
    se: number;
    z_stat: number;
    p_value: number;
}

interface FullAnalysisResponse {
    results: MediationResults;
    plot: string; // base64 image string
}


const getSignificanceStars = (p: number) => {
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
                     <CardContent>
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

    const availableForM = numericHeaders.filter(h => h !== xVar);
    const availableForY = numericHeaders.filter(h => h !== xVar && h !== mVar);
    
    const bk = analysisResult?.results.baron_kenny;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Mediation Analysis Setup</CardTitle>
                    <CardDescription>Select your Independent (X), Mediator (M), and Dependent (Y) variables.</CardDescription>
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

            {analysisResult && bk && (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Mediation Analysis Summary</CardTitle>
                         <CardDescription>
                            The analysis suggests a <Badge>{analysisResult.results.mediation_type}</Badge> effect.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src={analysisResult.plot} alt="Mediation Plot" width={1200} height={500} className="w-full rounded-md border" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Path Coefficients (Baron & Kenny)</CardTitle>
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
                                <TableRow><TableCell>c</TableCell><TableCell>Total Effect (X → Y)</TableCell><TableCell className="text-right font-mono">{bk.path_c.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c.se.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_c.p_value.toFixed(4)} {getSignificanceStars(bk.path_c.p_value)}</TableCell></TableRow>
                                <TableRow><TableCell>a</TableCell><TableCell>X → M</TableCell><TableCell className="text-right font-mono">{bk.path_a.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_a.se.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_a.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_a.p_value.toFixed(4)} {getSignificanceStars(bk.path_a.p_value)}</TableCell></TableRow>
                                <TableRow><TableCell>b</TableCell><TableCell>M → Y (controlling for X)</TableCell><TableCell className="text-right font-mono">{bk.path_b.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_b.se.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_b.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_b.p_value.toFixed(4)} {getSignificanceStars(bk.path_b.p_value)}</TableCell></TableRow>
                                <TableRow><TableCell>c'</TableCell><TableCell>Direct Effect (X → Y, controlling for M)</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.coef.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.se.toFixed(4)}</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.t_stat.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{bk.path_c_prime.p_value.toFixed(4)} {getSignificanceStars(bk.path_c_prime.p_value)}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Indirect Effect & Sobel Test</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-1"><dt className="font-medium text-muted-foreground">Indirect Effect (a*b)</dt><dd className="text-2xl font-bold font-mono">{bk.indirect_effect.toFixed(4)}</dd></div>
                            <div className="space-y-1"><dt className="font-medium text-muted-foreground">Sobel Test Z-statistic</dt><dd className="text-2xl font-bold font-mono">{bk.sobel_test.z_stat.toFixed(3)}</dd></div>
                            <div className="space-y-1"><dt className="font-medium text-muted-foreground">Standard Error</dt><dd className="text-lg font-mono">{bk.sobel_test.se.toFixed(4)}</dd></div>
                            <div className="space-y-1"><dt className="font-medium text-muted-foreground">p-value</dt><dd className="text-lg font-mono">{bk.sobel_test.p_value.toFixed(4)} {getSignificanceStars(bk.sobel_test.p_value)}</dd></div>
                        </dl>
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

