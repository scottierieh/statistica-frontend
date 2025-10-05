
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Columns, AlertTriangle, HelpCircle, CheckCircle2, MoveRight, FileSearch, Settings, BarChart as BarChartIcon, Users, Handshake } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

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
    interpretation: string;
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const crosstabExample = exampleDatasets.find(d => d.id === 'crosstab');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Columns size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Crosstabulation & Chi-Squared Test</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Analyze the relationship between two categorical variables to determine if they are independent.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Crosstabulation?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Crosstabulation (or cross-tab) creates a contingency table that shows the frequency distribution of variables. It is a foundational tool for understanding the relationship between two or more categorical variables. The accompanying Chi-Squared (χ²) test of independence determines whether this observed relationship is statistically significant or if it could have occurred by chance.
                        </p>
                         {crosstabExample && (
                            <div className="mt-6 flex justify-center">
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(crosstabExample)}>
                                    <Users className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{crosstabExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{crosstabExample.description}</p>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Select Variables:</strong> Choose two categorical variables from your dataset. One will be the 'Row Variable' and the other the 'Column Variable' in the table.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> Click the 'Run Analysis' button. The tool will automatically generate the contingency table, perform the Chi-Squared test, and create a grouped bar chart.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Chi-Squared (χ²) Statistic:</strong> A large value indicates a greater difference between observed and expected frequencies.
                                </li>
                                 <li>
                                    <strong>p-value:</strong> If less than 0.05, it suggests a statistically significant association between the variables (i.e., they are likely not independent).
                                </li>
                                <li>
                                    <strong>Contingency Table:</strong> Examine the counts and percentages (Row %, Column %, Total %) to understand the nature of the relationship. Look for cells where the observed count is much higher or lower than expected.
                                </li>
                                <li>
                                    <strong>Cramer's V:</strong> An effect size measure from 0 to 1. Higher values indicate a stronger association between the variables.
                                </li>
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

interface CrosstabPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CrosstabPage({ data, categoricalHeaders, onLoadExample }: CrosstabPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [rowVar, setRowVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [colVar, setColVar] = useState<string | undefined>(categoricalHeaders[1]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [tableFormat, setTableFormat] = useState('counts');


    useEffect(() => {
        setRowVar(categoricalHeaders[0] || '');
        setColVar(categoricalHeaders[1] || '');
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length >= 2, [data, categoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!rowVar || !colVar || rowVar === colVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select two different categorical variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

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
            
        } catch (e: any) {
            console.error('Crosstab Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, [data, rowVar, colVar, toast]);

    const availableColVars = useMemo(() => categoricalHeaders.filter(h => h !== rowVar), [categoricalHeaders, rowVar]);

    const results = analysisResult?.results;

    const formattedInterpretation = useMemo(() => {
        if (!results?.interpretation) return null;
        return results.interpretation
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/χ²\((.*?)\)\s*=\s*(.*?),/g, '<i>χ</i>²($1) = $2,')
            .replace(/p\s*=\s*(\.\d+)/g, '<i>p</i> = $1')
            .replace(/p\s*<\s*(\.\d+)/g, '<i>p</i> < $1')
            .replace(/z\s*=\s*(-?[\d.]+)/g, '<i>z</i> = $1');
    }, [results]);

     if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (!canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
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

        const getRowTotal = (rowIndex: number) => {
            switch(tableFormat) {
                case 'row_percent':
                    return '100.0%';
                case 'col_percent':
                    return ''; // 열 % 모드에서는 행 합계 숨김
                case 'total_percent':
                    return ((rowTotals[rowIndex] / total) * 100 || 0).toFixed(1) + '%';
                default:
                    return rowTotals[rowIndex];
            }
        };

        const getColTotal = (colIndex: number) => {
            switch(tableFormat) {
                case 'row_percent':
                    return ''; // 행%/열% 모드에서는 열 합계 숨김
                case 'col_percent':
                    return '100.0%';
                case 'total_percent':
                    return ((colTotals[colIndex] / total) * 100 || 0).toFixed(1) + '%';
                default:
                    return colTotals[colIndex];
            }
        };

        const getGrandTotal = () => {
            switch(tableFormat) {
                case 'row_percent':
                case 'col_percent':
                    return ''; // 행%/열% 모드에서는 전체 합계 숨김
                case 'total_percent':
                    return '100.0%';
                default:
                    return total;
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
                            <TableCell className="text-right font-bold font-mono">{getRowTotal(rowIndex)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                        <TableHead>Total</TableHead>
                         {col_levels.map((c, colIndex) => <TableCell key={c} className="text-right font-mono">{getColTotal(colIndex)}</TableCell>)}
                        <TableCell className="text-right font-mono">{getGrandTotal()}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Crosstab Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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

            {results && (
                <div className="space-y-4">
                    <Card>
                         <CardHeader>
                            <CardTitle className="font-headline">Results for: {results.row_var} by {results.col_var}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Alert variant={results.chi_squared.p_value < 0.05 ? 'default' : 'destructive'}>
                                  {results.chi_squared.p_value < 0.05 ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4" />}
                                  <AlertTitle>
                                        {results.chi_squared.p_value < 0.05 ? 'Statistically Significant Association' : 'No Significant Association Found'}
                                    </AlertTitle>
                                    <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formattedInterpretation || '' }}/>
                                </Alert>
                                
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Test</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Chi-Squared (χ²)</TableCell>
                                            <TableCell className="font-mono text-right">{results.chi_squared.statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">{results.chi_squared.p_value < 0.001 ? "<.001" : results.chi_squared.p_value.toFixed(4)} {getSignificanceStars(results.chi_squared.p_value)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Cramer's V</TableCell>
                                            <TableCell className="font-mono text-right">{results.cramers_v.toFixed(3)}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Phi (φ) Coefficient</TableCell>
                                            <TableCell className="font-mono text-right">{results.phi_coefficient.toFixed(3)}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-center">
                                <Image src={analysisResult.plot} alt="Crosstabulation bar chart" width={1000} height={600} className="w-full rounded-md border" />
                            </div>
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
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Columns className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select two categorical variables to generate a crosstabulation.</p>
                </div>
            )}
        </div>
    );
}
