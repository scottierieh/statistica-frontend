
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, AlertCircle, Loader2, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';

interface AnovaRow {
    Source: string;
    SS: number;
    df: number;
    MS: number;
    F: number;
    'p-value': number;
    'η²p': number;
}

interface MarginalMeansRow {
    [key: string]: string | number;
    mean: number;
    se: number;
    n: number;
}

interface AssumptionResult {
    test: string;
    statistic: number;
    p_value: number;
    assumption_met: boolean;
}

interface TwoWayAnovaResults {
    anova_table: AnovaRow[];
    marginal_means: {
        factor_a: MarginalMeansRow[];
        factor_b: MarginalMeansRow[];
    };
    assumptions: {
        normality: AssumptionResult;
        homogeneity: AssumptionResult;
    };
}

interface FullAnalysisResponse {
    results: TwoWayAnovaResults;
    plot: string; // base64 image string
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const getEffectSizeInterpretation = (eta_squared_p: number) => {
    if (eta_squared_p >= 0.14) return 'Large';
    if (eta_squared_p >= 0.06) return 'Medium';
    if (eta_squared_p >= 0.01) return 'Small';
    return 'Negligible';
}

interface TwoWayAnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TwoWayAnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: TwoWayAnovaPageProps) {
    const { toast } = useToast();
    const [dependentVar, setDependentVar] = useState(numericHeaders[0]);
    const [factorA, setFactorA] = useState(categoricalHeaders[0]);
    const [factorB, setFactorB] = useState(categoricalHeaders.length > 1 ? categoricalHeaders[1] : undefined);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 2;
    }, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setDependentVar(numericHeaders[0] || '');
        setFactorA(categoricalHeaders[0] || '');
        setFactorB(categoricalHeaders[1] || '');
        setAnalysisResponse(null);
    }, [categoricalHeaders, numericHeaders, data]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorA || !factorB) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a dependent variable and two factor variables.'});
            return;
        };
        if (factorA === factorB) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Factor A and Factor B must be different variables.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResponse(null);
        
        try {
            const response = await fetch('/api/analysis/two-way-anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorA, factorB })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: FullAnalysisResponse = await response.json();
             if ((result as any).error) {
                throw new Error((result as any).error);
            }
            setAnalysisResponse(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'ANOVA Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResponse(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorA, factorB, toast]);

    const availableFactorB = useMemo(() => categoricalHeaders.filter(h => h !== factorA), [categoricalHeaders, factorA]);

    if (!canRun) {
        const anovaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('two-way-anova'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Two-Way Analysis of Variance (ANOVA)</CardTitle>
                        <CardDescription>
                           To perform a Two-Way ANOVA, you need data with at least one numeric and two categorical variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    {anovaExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {anovaExamples.map((ex) => {
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
                                    )
                                })}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    const results = analysisResponse?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Two-Way ANOVA Setup</CardTitle>
                    <CardDescription>
                        Select a dependent variable (numeric) and two factor variables (categorical), then click 'Run Analysis'.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Dependent Variable</label>
                            <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Factor A</label>
                            <Select value={factorA} onValueChange={setFactorA}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Factor B</label>
                            <Select value={factorB} onValueChange={setFactorB} disabled={availableFactorB.length === 0}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableFactorB.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={!dependentVar || !factorA || !factorB || isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && (
                 <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Performing Two-Way ANOVA...</p>
                            <Skeleton className="h-96 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {analysisResponse && results ? (
                <>
                    {analysisResponse.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResponse.plot} alt="Two-Way ANOVA Plots" width={1500} height={1000} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">ANOVA Table</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">SS</TableHead>
                                        <TableHead className="text-right">df</TableHead>
                                        <TableHead className="text-right">MS</TableHead>
                                        <TableHead className="text-right">F</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">η²p</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.Source}</TableCell>
                                            <TableCell className="text-right font-mono">{row.SS?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.df}</TableCell>
                                            <TableCell className="text-right font-mono">{row.MS?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">{row.F?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">{row['p-value'] < 0.001 ? "<.001" : row['p-value']?.toFixed(4) ?? ''} {getSignificanceStars(row['p-value'])}</TableCell>
                                            <TableCell className="text-right font-mono">{row['η²p']?.toFixed(3) ?? ''}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className='text-sm text-muted-foreground'>η²p: Partial Eta-Squared (Effect Size)</p>
                        </CardFooter>
                    </Card>

                    <div className="grid lg:grid-cols-2 gap-4">
                         <Card>
                            <CardHeader><CardTitle className="font-headline">Assumption Checks</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <dt className="text-muted-foreground">Normality of Residuals ({results.assumptions.normality.test})</dt>
                                    <dd>{results.assumptions.normality.assumption_met ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>} <span className='font-mono text-xs'>(p={results.assumptions.normality.p_value.toFixed(3)})</span></dd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <dt className="text-muted-foreground">Homogeneity of Variances ({results.assumptions.homogeneity.test})</dt>
                                    <dd>{results.assumptions.homogeneity.assumption_met ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>} <span className='font-mono text-xs'>(p={results.assumptions.homogeneity.p_value.toFixed(3)})</span></dd>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle className="font-headline">Effect Sizes</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {results.anova_table.slice(0,3).map(row => (
                                    <div className="flex justify-between items-center" key={row.Source}>
                                        <dt className="text-muted-foreground">{row.Source}</dt>
                                        <dd><Badge variant="secondary">{getEffectSizeInterpretation(row['η²p'])}</Badge></dd>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <p>Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}
