
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
import { Sigma, Loader2, Users, Repeat } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';

interface AnovaRow {
    Source: string;
    F: number;
    'p-unc': number;
    'p-GG-corr': number;
    'p-HF-corr': number;
    'np2': number;
    'ddof1': number;
    'ddof2': number;
}

interface MauchlyResult {
    statistic: number;
    p_value: number;
    sphericity_assumed: boolean;
}

interface RmAnovaResults {
    anova_table: AnovaRow[];
    mauchly_test: MauchlyResult;
    error?: string;
}

interface FullAnalysisResponse {
    results: RmAnovaResults;
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

interface RmAnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RepeatedMeasuresAnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: RmAnovaPageProps) {
    const { toast } = useToast();
    const [subjectCol, setSubjectCol] = useState<string | undefined>(categoricalHeaders[0]);
    const [withinCols, setWithinCols] = useState<string[]>(numericHeaders.slice(0,3));
    const [betweenCol, setBetweenCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableWithinCols = useMemo(() => numericHeaders.filter(h => h !== subjectCol && h !== betweenCol), [numericHeaders, subjectCol, betweenCol]);
    const availableBetweenCols = useMemo(() => categoricalHeaders.filter(h => h !== subjectCol), [categoricalHeaders, subjectCol]);

    useEffect(() => {
        setSubjectCol(categoricalHeaders[0] || '');
        setWithinCols(numericHeaders.slice(0,3));
        setBetweenCol(undefined);
        setAnalysisResult(null);
    }, [data, numericHeaders, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    const handleWithinColChange = (header: string, checked: boolean) => {
        setWithinCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!subjectCol || withinCols.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a subject ID column and at least two within-subject variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/repeated-measures-anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, subjectCol, withinCols, betweenCol, dependentVar: 'measurement' })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.results?.error) throw new Error(result.results.error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('RM ANOVA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, subjectCol, withinCols, betweenCol, toast]);

    if (!canRun) {
        const rmAnovaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('rm-anova'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Repeated Measures ANOVA</CardTitle>
                        <CardDescription>To perform this analysis, you need data with a subject identifier and multiple numeric measurements taken over time or conditions.</CardDescription>
                    </CardHeader>
                     {rmAnovaExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {rmAnovaExamples.map((ex) => {
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
        );
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">RM ANOVA Setup</CardTitle>
                    <CardDescription>Define the structure of your repeated measures design.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className='mb-2 block'>Within-Subject Variables (Repeated Measures)</Label>
                            <ScrollArea className="h-40 border rounded-md p-4">
                                <div className="space-y-2">
                                    {availableWithinCols.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`within-${h}`} checked={withinCols.includes(h)} onCheckedChange={(c) => handleWithinColChange(h, c as boolean)} />
                                            <Label htmlFor={`within-${h}`}>{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className='space-y-4'>
                            <div>
                                <Label>Subject Identifier</Label>
                                <Select value={subjectCol} onValueChange={setSubjectCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div>
                                <Label>Between-Subjects Factor (Optional)</Label>
                                <Select value={betweenCol} onValueChange={(v) => setBetweenCol(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {availableBetweenCols.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !subjectCol || withinCols.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2" />Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult && (
                <div className="space-y-4">
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader><CardTitle>Interaction Plot</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.plot} alt="Interaction Plot" width={800} height={600} className="w-full rounded-md border" /></CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>ANOVA Table</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">F-value</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">p-GG-corr</TableHead>
                                        <TableHead className="text-right">Partial η²</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_table.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.Source}</TableCell>
                                            <TableCell className="text-right font-mono">{row.F?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row['p-unc']?.toFixed(4)} {getSignificanceStars(row['p-unc'])}</TableCell>
                                            <TableCell className="text-right font-mono">{row['p-GG-corr']?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.np2?.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Test of Sphericity (Mauchly's W)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-4">
                                <div><dt className="text-sm font-medium text-muted-foreground">Statistic</dt><dd className="text-lg font-bold font-mono">{results.mauchly_test.statistic?.toFixed(4)}</dd></div>
                                <div><dt className="text-sm font-medium text-muted-foreground">p-value</dt><dd className="text-lg font-bold font-mono">{results.mauchly_test.p_value?.toFixed(4)}</dd></div>
                            </dl>
                            <p className="text-sm text-muted-foreground mt-4">
                                Sphericity assumption is {results.mauchly_test.sphericity_assumed ? <Badge>Met</Badge> : <Badge variant="destructive">Violated</Badge>}.
                                {results.mauchly_test.sphericity_assumed ? ' Standard p-value can be used.' : ' Use the Greenhouse-Geisser (p-GG-corr) corrected p-value.'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
