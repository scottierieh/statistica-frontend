
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
import { Sigma, Loader2, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';

interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    F: number;
    p_value: number;
    eta_sq_partial: number;
}

interface AssumptionResult {
    met: boolean;
    p_value: number;
    statistic: number;
}

interface AncovaResults {
    anova_table: AnovaRow[];
    assumptions: {
        normality: AssumptionResult;
        homogeneity: AssumptionResult;
    };
}

interface FullAnalysisResponse {
    results: AncovaResults;
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

interface AncovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function AncovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: AncovaPageProps) {
    const { toast } = useToast();
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[0]);
    const [factorVar, setFactorVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [covariateVars, setCovariateVars] = useState<string[]>([numericHeaders[1]]);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        setDependentVar(numericHeaders[0]);
        setFactorVar(categoricalHeaders[0]);
        setCovariateVars([numericHeaders[1]].filter(Boolean));
        setAnalysisResponse(null);
    }, [data, numericHeaders, categoricalHeaders]);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1;
    }, [data, numericHeaders, categoricalHeaders]);

    const handleCovariateChange = (header: string, checked: boolean) => {
        setCovariateVars(prev => 
            checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorVar || covariateVars.length === 0) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a dependent variable, a factor, and at least one covariate.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResponse(null);

        try {
            const response = await fetch('/api/analysis/ancova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorVar, covariateVars })
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
                } catch (e) {
                    throw new Error(`Server returned non-JSON error: ${errorText}`);
                }
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) {
                throw new Error((result as any).error);
            }
            setAnalysisResponse(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'ANCOVA Analysis Error', description: e.message || 'An unexpected error occurred.'})
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorVar, covariateVars, toast]);

    const availableNumeric = useMemo(() => {
        const selected = new Set([dependentVar, factorVar]);
        return numericHeaders.filter(h => !selected.has(h));
    }, [numericHeaders, dependentVar, factorVar]);

    if (!canRun) {
        const ancovaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('ancova'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Analysis of Covariance (ANCOVA)</CardTitle>
                        <CardDescription>
                           To perform ANCOVA, you need data with at least one numeric dependent variable, one categorical factor, and one numeric covariate.
                        </CardDescription>
                    </CardHeader>
                    {ancovaExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ancovaExamples.map((ex) => {
                                    const Icon = ex.icon;
                                    return (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </CardHeader>
                                        <CardFooter>
                                            <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                                <Icon className="mr-2 h-4 w-4" />
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
                    <CardTitle className="font-headline">ANCOVA Setup</CardTitle>
                    <CardDescription>
                        Select your dependent variable, factor (grouping variable), and one or more covariates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Dependent Variable</label>
                            <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Factor</label>
                            <Select value={factorVar} onValueChange={setFactorVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                             <label className="text-sm font-medium mb-1 block">Covariate(s)</label>
                             <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {availableNumeric.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`cov-${h}`} checked={covariateVars.includes(h)} onCheckedChange={(c) => handleCovariateChange(h, c as boolean)} />
                                            <label htmlFor={`cov-${h}`}>{h}</label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={!dependentVar || !factorVar || covariateVars.length === 0 || isLoading}>
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
                            <p className="text-muted-foreground">Performing ANCOVA...</p>
                            <Skeleton className="h-96 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {results && analysisResponse && (
                 <>
                    {analysisResponse.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Interaction Plot</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResponse.plot} alt="ANCOVA Interaction Plot" width={800} height={600} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">ANCOVA Table</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Sum of Sq.</TableHead>
                                        <TableHead className="text-right">df</TableHead>
                                        <TableHead className="text-right">F</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">Partial η²</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.Source}</TableCell>
                                            <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.df}</TableCell>
                                            <TableCell className="text-right font-mono">{row.F?.toFixed(3) ?? ''}</TableCell>
                                            <TableCell className="text-right font-mono">{row.p_value < 0.001 ? "<.001" : row.p_value?.toFixed(4) ?? ''} {getSignificanceStars(row.p_value)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.eta_sq_partial?.toFixed(3) ?? ''}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="font-headline">Assumption Checks</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                             <div className="flex justify-between items-center">
                                <dt className="text-muted-foreground">Normality of Residuals (Shapiro-Wilk)</dt>
                                <dd>{results.assumptions.normality.met ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>} <span className='font-mono text-xs'>(p={results.assumptions.normality.p_value.toFixed(3)})</span></dd>
                            </div>
                            <div className="flex justify-between items-center">
                                <dt className="text-muted-foreground">Homogeneity of Variances (Levene's)</dt>
                                <dd>{results.assumptions.homogeneity.met ? <Badge>Passed</Badge> : <Badge variant="destructive">Failed</Badge>} <span className='font-mono text-xs'>(p={results.assumptions.homogeneity.p_value.toFixed(3)})</span></dd>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

        </div>
    );
}
