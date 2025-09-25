
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, CheckCircle, XCircle, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface PathResult {
    coef: number;
    se: number;
    t_stat: number;
    p_value: number;
    r_squared?: number;
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


const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const mediationExample = exampleDatasets.find(d => d.id === 'work-stress');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Mediation Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Explore how a third variable (the mediator) explains the relationship between an independent variable and a dependent variable.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Mediation Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Mediation analysis helps you understand the 'how' and 'why' behind an observed relationship. It tests whether the effect of an independent variable on a dependent variable is transmitted through a third, intermediary variable (the mediator). It's a powerful tool for uncovering causal mechanisms.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {mediationExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(mediationExample)}>
                                <mediationExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{mediationExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{mediationExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Independent Variable (X):</strong> The initial predictor variable.</li>
                                <li><strong>Mediator Variable (M):</strong> The variable that is hypothesized to transmit the effect from X to Y.</li>
                                <li><strong>Dependent Variable (Y):</strong> The final outcome variable.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform regressions for each path in the mediation model.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Indirect Effect (a*b):</strong> This is the key result. It represents the portion of the X-Y relationship that is explained by the mediator (M). A significant bootstrap confidence interval that does not contain zero indicates significant mediation.</li>
                                <li><strong>Direct Effect (c'):</strong> The effect of X on Y after controlling for the mediator. If this is non-significant, it suggests full mediation. If it remains significant, it's partial mediation.</li>
                                 <li><strong>Total Effect (c):</strong> The overall effect of X on Y without considering the mediator.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
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
    const [view, setView] = useState('intro');

    useEffect(() => {
        setXVar(numericHeaders[0] || undefined);
        setMVar(numericHeaders[1] || undefined);
        setYVar(numericHeaders[2] || undefined);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
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
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
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
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Mediation Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
                                {results.mediation_type !== "No Mediation" ? <CheckCircle className='mr-2 h-4 w-4' /> : <XCircle className='mr-2 h-4 w-4' />}
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
