

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Columns, Bot, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCrosstabInterpretation } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface CrosstabResults {
    contingency_table: { [key: string]: { [key: string]: number } };
    chi_squared: {
        statistic: number;
        p_value: number;
        degrees_of_freedom: number;
    };
    cramers_v: number;
    phi_coefficient: number;
    contingency_coefficient: number;
    row_var: string;
    col_var: string;
    row_levels: string[];
    col_levels: string[];
}

interface FullAnalysisResponse {
    results: CrosstabResults;
    plot: string;
}

const getSignificanceStars = (p: number) => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const AIGeneratedInterpretation = ({ promise }: { promise: Promise<string | null> | null }) => {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promise) {
        setInterpretation(null);
        setLoading(false);
        return;
    };
    let isMounted = true;
    setLoading(true);
    promise.then((desc) => {
        if (isMounted) {
            setInterpretation(desc);
            setLoading(false);
        }
    });
    return () => { isMounted = false; };
  }, [promise]);
  
  const formattedInterpretation = useMemo(() => {
    if (!interpretation) return null;
    // Chain replacements for both bold and italics
    return interpretation
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>');
  }, [interpretation]);


  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!interpretation) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Bot /> AI Interpretation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation || '' }} />
      </CardContent>
    </Card>
  );
};


interface CrosstabPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CrosstabPage({ data, categoricalHeaders, onLoadExample }: CrosstabPageProps) {
    const { toast } = useToast();
    const [rowVar, setRowVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [colVar, setColVar] = useState<string | undefined>(categoricalHeaders[1]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [tableFormat, setTableFormat] = useState('counts');
    const [aiPromise, setAiPromise] = useState<Promise<string|null> | null>(null);

    useEffect(() => {
        setRowVar(categoricalHeaders[0] || '');
        setColVar(categoricalHeaders[1] || '');
        setAnalysisResult(null);
        setAiPromise(null);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length >= 2, [data, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!rowVar || !colVar || rowVar === colVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select two different categorical variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        setAiPromise(null);

        try {
            const response = await fetch('/api/analysis/crosstab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, rowVar, colVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            
            const promise = getCrosstabInterpretation({
                rowVar: result.results.row_var,
                colVar: result.results.col_var,
                chi2: result.results.chi_squared.statistic,
                df: result.results.chi_squared.degrees_of_freedom,
                pValue: result.results.chi_squared.p_value,
                cramersV: result.results.cramers_v,
                contingencyTable: JSON.stringify(result.results.contingency_table),
                phi: result.results.phi_coefficient, // Added for AI context
                contingencyCoeff: result.results.contingency_coefficient, // Added for AI context
            }).then(res => res.success ? res.interpretation ?? null : (toast({variant: 'destructive', title: 'AI Error', description: res.error}), null));
            setAiPromise(promise);


        } catch (e: any) {
            console.error('Crosstab Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, rowVar, colVar, toast]);

    const availableColVars = useMemo(() => categoricalHeaders.filter(h => h !== rowVar), [categoricalHeaders, rowVar]);

    if (!canRun) {
        const crosstabExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('crosstab'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Crosstab Analysis</CardTitle>
                        <CardDescription>
                           To perform a crosstabulation, you need data with at least two categorical variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {crosstabExamples.map((ex) => {
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
                </Card>
            </div>
        );
    }
    
    const renderContingencyTable = () => {
        if (!analysisResult) return null;

        const { results } = analysisResult;
        const { contingency_table, row_levels, col_levels } = results;
        
        const total = Object.values(contingency_table).flatMap(Object.values).reduce((sum, val) => sum + val, 0);
        const rowTotals = row_levels.map(row => col_levels.reduce((sum, col) => sum + (contingency_table[col]?.[row] || 0), 0));
        const colTotals = col_levels.map(col => row_levels.reduce((sum, row) => sum + (contingency_table[col]?.[row] || 0), 0));

        const getCellContent = (row: string, col: string, rowIndex: number, colIndex: number) => {
            const count = contingency_table[col]?.[row] || 0;
            switch(tableFormat) {
                case 'row_percent':
                    return `${((count / rowTotals[rowIndex]) * 100 || 0).toFixed(1)}%`;
                case 'col_percent':
                     return `${((count / colTotals[colIndex]) * 100 || 0).toFixed(1)}%`;
                case 'total_percent':
                     return `${((count / total) * 100 || 0).toFixed(1)}%`;
                default: // counts
                    return count;
            }
        };

        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{rowVar} / {colVar}</TableHead>
                        {col_levels.map(c => <TableHead key={c} className="text-right">{c}</TableHead>)}
                        <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {row_levels.map((r, rowIndex) => (
                        <TableRow key={r}>
                            <TableHead>{r}</TableHead>
                            {col_levels.map((c, colIndex) => <TableCell key={c} className="text-right font-mono">{getCellContent(r, c, rowIndex, colIndex)}</TableCell>)}
                            <TableCell className="text-right font-bold font-mono">{tableFormat === 'counts' ? rowTotals[rowIndex] : '100.0%'}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                        <TableHead>Total</TableHead>
                         {col_levels.map((c, colIndex) => <TableCell key={c} className="text-right font-mono">{tableFormat === 'counts' ? colTotals[colIndex] : '100.0%'}</TableCell>)}
                        <TableCell className="text-right font-mono">{tableFormat === 'counts' ? total : '100.0%'}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Crosstab Analysis Setup</CardTitle>
                    <CardDescription>Select two categorical variables to create a contingency table and run a Chi-squared test.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Row Variable</label>
                            <Select value={rowVar} onValueChange={setRowVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Column Variable</label>
                            <Select value={colVar} onValueChange={setColVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableColVars.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAnalysis} disabled={isLoading || !rowVar || !colVar || rowVar === colVar}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    <AIGeneratedInterpretation promise={aiPromise} />
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Chi-Squared Test & Measures of Association</CardTitle>
                            <CardDescription>Tests whether there is a significant association between {rowVar} and {colVar}.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Chi-Squared (χ²)</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.results.chi_squared.statistic.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>p-value</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.results.chi_squared.p_value < 0.001 ? "<.001" : analysisResult.results.chi_squared.p_value.toFixed(4)} {getSignificanceStars(analysisResult.results.chi_squared.p_value)}</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell>Degrees of Freedom</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.results.chi_squared.degrees_of_freedom}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Phi (φ)</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.results.phi_coefficient.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Contingency Coefficient</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.results.contingency_coefficient.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Cramer's V</TableCell>
                                        <TableCell className="text-right font-mono">{analysisResult.results.cramers_v.toFixed(3)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                            <Alert variant={analysisResult.results.chi_squared.p_value < 0.05 ? 'default' : 'destructive'}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{analysisResult.results.chi_squared.p_value < 0.05 ? "Result is Statistically Significant" : "Result is Not Statistically Significant"}</AlertTitle>
                                <AlertDescription>
                                    {analysisResult.results.chi_squared.p_value < 0.05
                                        ? `There IS a statistically significant association between the variables (p < 0.05).`
                                        : `There is NO statistically significant association between the variables (p >= 0.05).`}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <CardTitle className="font-headline">Contingency Table</CardTitle>
                            <Tabs value={tableFormat} onValueChange={setTableFormat} className="w-full mt-2">
                                <TabsList>
                                    <TabsTrigger value="counts">Counts</TabsTrigger>
                                    <TabsTrigger value="row_percent">Row %</TabsTrigger>
                                    <TabsTrigger value="col_percent">Column %</TabsTrigger>
                                    <TabsTrigger value="total_percent">Total %</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent>{renderContingencyTable()}</CardContent>
                    </Card>
                     {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle className="font-headline">Visualization</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="Crosstabulation bar chart" width={1000} height={600} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Columns className="mx-auto h-12 w-12"/>
                    <p className="mt-2">Select two categorical variables to generate a crosstabulation.</p>
                </div>
            )}
        </div>
    );
}
