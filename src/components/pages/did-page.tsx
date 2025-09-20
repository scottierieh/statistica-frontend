
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitCommit } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';

interface DidResults {
    model_summary_data: {
        caption: string | null;
        data: string[][];
    }[];
    params: { [key: string]: number };
    pvalues: { [key: string]: number };
    rsquared: number;
    rsquared_adj: number;
}

interface FullAnalysisResponse {
    results: DidResults;
}

interface DidPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DidPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DidPageProps) {
    const { toast } = useToast();
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [timeVar, setTimeVar] = useState<string | undefined>();
    const [outcomeVar, setOutcomeVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && categoricalHeaders.length >= 2, [data, numericHeaders, categoricalHeaders]);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, allHeaders]);
    
    useEffect(() => {
        setGroupVar(binaryCategoricalHeaders.find(h => h.toLowerCase().includes('group')));
        setTimeVar(binaryCategoricalHeaders.find(h => h.toLowerCase().includes('time')));
        setOutcomeVar(numericHeaders[0]);
        setAnalysisResult(null);
    }, [data, numericHeaders, binaryCategoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || !timeVar || !outcomeVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select group, time, and outcome variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/did', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    group_var: groupVar, 
                    time_var: timeVar, 
                    outcome_var: outcomeVar 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: 'DiD Analysis Complete', description: 'Regression results are ready.' });

        } catch (e: any) {
            console.error('DiD Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, timeVar, outcomeVar, toast]);

    if (!canRun) {
        const didExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('did'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Difference-in-Differences (DiD)</CardTitle>
                        <CardDescription>
                           To perform DiD, you need data with an outcome variable, a binary time variable (pre/post), and a binary group variable (treatment/control).
                        </CardDescription>
                    </CardHeader>
                     {didExamples.length > 0 && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(didExamples[0])} className="w-full">
                                <GitCommit className="mr-2 h-4 w-4" />
                                Load {didExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">DiD Analysis Setup</CardTitle>
                    <CardDescription>Specify the outcome, group, and time variables for the analysis.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                    <div>
                        <Label>Outcome Variable</Label>
                        <Select value={outcomeVar} onValueChange={setOutcomeVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Group Variable (0/1)</Label>
                        <Select value={groupVar} onValueChange={setGroupVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Time Variable (0/1)</Label>
                        <Select value={timeVar} onValueChange={setTimeVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !groupVar || !timeVar || !outcomeVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Regression Results</CardTitle>
                        <CardDescription>
                            The interaction term represents the DiD effect. A significant coefficient suggests the treatment had a measurable effect.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {results.model_summary_data?.map((table, tableIndex) => (
                            <Table key={tableIndex}>
                                {table.caption && <TableCaption>{table.caption}</TableCaption>}
                                <TableHeader><TableRow>{table.data[0].map((cell, cellIndex) => <TableHead key={cellIndex}>{cell}</TableHead>)}</TableRow></TableHeader>
                                <TableBody>
                                {table.data.slice(1).map((row, rowIndex) => (
                                    <TableRow key={rowIndex}>{row.map((cell, cellIndex) => <TableCell key={cellIndex} className="font-mono">{cell}</TableCell>)}</TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
