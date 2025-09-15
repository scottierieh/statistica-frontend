
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, HeartPulse } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';

interface SurvivalResults {
    survival_table: { Time: number, [key: string]: number }[];
    median_survival_time: number;
    confidence_interval: { [key: string]: number }[];
}

interface FullAnalysisResponse {
    results: SurvivalResults;
    plot: string;
}

interface SurvivalAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SurvivalAnalysisPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: SurvivalAnalysisPageProps) {
    const { toast } = useToast();
    const [durationCol, setDurationCol] = useState<string | undefined>(numericHeaders[0]);
    const [eventCol, setEventCol] = useState<string | undefined>();
    const [groupCol, setGroupCol] = useState<string | undefined>();

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const binaryCategoricalHeaders = useMemo(() => {
        return [...categoricalHeaders, ...numericHeaders.filter(h => new Set(data.map(row => row[h])).size === 2)];
    }, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        const timeCols = numericHeaders.filter(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('tenure') || h.toLowerCase().includes('duration'));
        setDurationCol(timeCols[0] || numericHeaders[0]);

        const eventCols = binaryCategoricalHeaders.filter(h => h.toLowerCase().includes('event') || h.toLowerCase().includes('churn') || h.toLowerCase().includes('status'));
        setEventCol(eventCols[0]);
        
        setGroupCol(undefined);
        setAnalysisResult(null);
    }, [data, numericHeaders, binaryCategoricalHeaders]);
    
    const availableGroupCols = useMemo(() => {
        return categoricalHeaders.filter(h => h !== eventCol);
    }, [categoricalHeaders, eventCol]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && binaryCategoricalHeaders.length >=1, [data, numericHeaders, binaryCategoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!durationCol || !eventCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a duration and an event column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/survival', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, durationCol, eventCol, groupCol })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Survival Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, durationCol, eventCol, groupCol, toast]);

    if (!canRun) {
        const survivalExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('survival'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Survival Analysis</CardTitle>
                        <CardDescription>
                           To perform survival analysis, you need data with a time/duration column and an event/status column. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    {survivalExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {survivalExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <HeartPulse className="h-6 w-6 text-secondary-foreground" />
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
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Survival Analysis Setup</CardTitle>
                    <CardDescription>Select variables for Kaplan-Meier analysis. The event column should have 1 for event observed, 0 for censored.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Duration (Time) Column</Label>
                            <Select value={durationCol} onValueChange={setDurationCol}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Event Column (0 or 1)</Label>
                            <Select value={eventCol} onValueChange={setEventCol}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Group Column (Optional)</Label>
                             <Select value={groupCol} onValueChange={(v) => setGroupCol(v === 'none' ? undefined : v)}>
                                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {availableGroupCols.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!durationCol || !eventCol || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2" />Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full" /></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Kaplan-Meier Survival Curve</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Image src={analysisResult.plot} alt="Kaplan-Meier Plot" width={1000} height={600} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="col-span-2">
                             <CardHeader><CardTitle>Survival Function</CardTitle></CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead className="text-right">Survival Probability</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.survival_table.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{row.Time}</TableCell>
                                                <TableCell className="text-right font-mono">{Object.values(row)[1].toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Median Survival Time</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold font-mono">
                                    {isFinite(results.median_survival_time) ? results.median_survival_time.toFixed(1) : 'Infinity'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    The time at which 50% of subjects are expected to have survived.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
