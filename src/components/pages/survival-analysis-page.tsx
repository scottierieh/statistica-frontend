
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, HeartPulse, CheckCircle, XCircle, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


interface SurvivalTableItem {
    Time: number;
    [key: string]: number;
}

interface LogRankResult {
    test_statistic: number;
    p_value: number;
    is_significant: boolean;
}

interface CoxSummaryRow {
    covariate: string;
    'exp(coef)': number; // Hazard Ratio
    'exp(coef) lower 95%': number;
    'exp(coef) upper 95%': number;
    p: number;
}

interface AftSummaryRow {
    param: string;
    coef: number;
    'exp(coef)': number;
    se_coef: number;
    'coef lower 95%': number;
    'coef upper 95%': number;
    z: number;
    p: number;
}

interface SurvivalResults {
    kaplan_meier: {
        survival_table: SurvivalTableItem[];
        median_survival_time: number;
    };
    kaplan_meier_grouped?: {
        [group: string]: { median_survival: number };
    };
    log_rank_test?: LogRankResult;
    cox_ph?: CoxSummaryRow[];
    cox_concordance?: number;
    aft_weibull?: AftSummaryRow[];
    aft_lognormal?: AftSummaryRow[];
}

interface FullAnalysisResponse {
    results: SurvivalResults;
    plot: string;
}

interface SurvivalAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    allHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SurvivalAnalysisPage({ data, numericHeaders, allHeaders, categoricalHeaders, onLoadExample }: SurvivalAnalysisPageProps) {
    const { toast } = useToast();
    const [durationCol, setDurationCol] = useState<string | undefined>();
    const [eventCol, setEventCol] = useState<string | undefined>();
    const [groupCol, setGroupCol] = useState<string | undefined>();
    const [covariates, setCovariates] = useState<string[]>([]);
    const [modelType, setModelType] = useState('km');

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => {
            const uniqueValues = new Set(data.map(row => row[h]).filter(v => v != null && v !== ''));
            return uniqueValues.size === 2;
        });
    }, [data, allHeaders]);
    
    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length >= 1 && binaryCategoricalHeaders.length >=1
    }, [data, numericHeaders, binaryCategoricalHeaders]);

    useEffect(() => {
        setDurationCol(numericHeaders.find(h => h.toLowerCase().includes('tenure')));
        setEventCol(binaryCategoricalHeaders.find(h => h.toLowerCase().includes('churn')));
        setGroupCol(undefined);
        setCovariates([]);
        setAnalysisResult(null);
    }, [data, numericHeaders, binaryCategoricalHeaders]);

    const availableGroupCols = useMemo(() => {
        return categoricalHeaders.filter(h => h !== eventCol);
    }, [categoricalHeaders, eventCol]);

    const availableCovariates = useMemo(() => {
        const excluded = new Set([durationCol, eventCol, groupCol]);
        return allHeaders.filter(h => !excluded.has(h));
    }, [allHeaders, durationCol, eventCol, groupCol])

    const handleCovariateChange = (header: string, checked: boolean) => {
        setCovariates(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    }

    const handleAnalysis = useCallback(async () => {
        if (!durationCol || !eventCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a duration and an event column.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const filteredCovariates = covariates.filter(c => c !== durationCol && c !== eventCol);

        try {
            const response = await fetch('/api/analysis/survival', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, durationCol, eventCol, groupCol, covariates: filteredCovariates, modelType })
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
    }, [data, durationCol, eventCol, groupCol, covariates, modelType, toast]);

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

    const renderAftTable = (modelName: string, aftResults: AftSummaryRow[] | undefined) => {
        if (!aftResults) return null;
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{modelName} AFT Model</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead className="text-right">exp(coef)</TableHead><TableHead className="text-right">p-value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {aftResults.map(row => (
                                <TableRow key={row.param}>
                                    <TableCell>{row.param}</TableCell>
                                    <TableCell className="font-mono text-right">{row['exp(coef)'] !== undefined ? row['exp(coef)'].toFixed(3) : 'N/A'}</TableCell>
                                    <TableCell className="font-mono text-right">{row.p !== undefined ? (row.p < 0.001 ? '<.001' : row.p.toFixed(3)) : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Survival Analysis Setup</CardTitle>
                    <CardDescription>Select variables for Kaplan-Meier, Cox regression, and AFT models.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label>Duration (Time) Column</Label>
                            <Select value={durationCol} onValueChange={setDurationCol}>
                                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Event Column (0 or 1)</Label>
                            <Select value={eventCol} onValueChange={setEventCol}>
                                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
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
                         <div>
                            <Label>Covariates (for Cox/AFT)</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                                <div className="space-y-1">
                                    {availableCovariates.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox id={`cov-${h}`} checked={covariates.includes(h)} onCheckedChange={(c) => handleCovariateChange(h, c as boolean)} />
                                            <Label htmlFor={`cov-${h}`} className="text-sm font-normal">{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
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
                            <CardTitle className="font-headline">Analysis Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Image src={analysisResult.plot} alt="Survival Analysis Plots" width={1400} height={1000} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>

                     <Tabs defaultValue="km" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="km">Kaplan-Meier</TabsTrigger>
                            <TabsTrigger value="cox" disabled={!results.cox_ph}>Cox PH</TabsTrigger>
                            <TabsTrigger value="aft_weibull" disabled={!results.aft_weibull}>Weibull AFT</TabsTrigger>
                            <TabsTrigger value="aft_lognormal" disabled={!results.aft_lognormal}>Log-Normal AFT</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="km" className="mt-4 space-y-4">
                             <div className="grid md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader><CardTitle>Overall Median Survival</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-4xl font-bold font-mono">
                                            {isFinite(results.kaplan_meier.median_survival_time) ? results.kaplan_meier.median_survival_time.toFixed(1) : 'Not Reached'}
                                        </p>
                                    </CardContent>
                                </Card>
                                {results.log_rank_test && (
                                    <Card>
                                        <CardHeader><CardTitle>Log-Rank Test</CardTitle></CardHeader>
                                        <CardContent>
                                            {results.log_rank_test.is_significant ? (
                                                <div className="flex items-center text-green-600"><CheckCircle className="mr-2"/> Significant</div>
                                            ) : (
                                                <div className="flex items-center text-orange-600"><XCircle className="mr-2"/> Not Significant</div>
                                            )}
                                            <p className="font-mono text-sm mt-2">p = {results.log_rank_test.p_value.toFixed(4)}</p>
                                        </CardContent>
                                    </Card>
                                )}
                                {results.kaplan_meier_grouped && (
                                    <Card>
                                        <CardHeader><CardTitle>Median Survival by Group</CardTitle></CardHeader>
                                        <CardContent>
                                            <dl className="space-y-2 text-sm">
                                                {Object.entries(results.kaplan_meier_grouped).map(([group, res]) => (
                                                    <div key={group} className="flex justify-between">
                                                        <dt>{group}</dt>
                                                        <dd className="font-mono">{isFinite(res.median_survival) ? res.median_survival.toFixed(1) : 'Not Reached'}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="cox" className="mt-4">
                            {results.cox_ph && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cox Proportional Hazards Model</CardTitle>
                                        <CardDescription>Concordance: {results.cox_concordance?.toFixed(3)}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead className="text-right">Hazard Ratio</TableHead><TableHead className="text-right">95% CI</TableHead><TableHead className="text-right">p-value</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {results.cox_ph.map(row => (
                                                    <TableRow key={row.covariate}>
                                                        <TableCell>{row.covariate}</TableCell>
                                                        <TableCell className="font-mono text-right">{row['exp(coef)']?.toFixed(3)}</TableCell>
                                                        <TableCell className="font-mono text-right">[{row['exp(coef) lower 95%']?.toFixed(3)}, {row['exp(coef) upper 95%']?.toFixed(3)}]</TableCell>
                                                        <TableCell className="font-mono text-right">{row.p < 0.001 ? '<.001' : row.p?.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                        <TabsContent value="aft_weibull" className="mt-4">{renderAftTable("Weibull", results.aft_weibull)}</TabsContent>
                        <TabsContent value="aft_lognormal" className="mt-4">{renderAftTable("Log-Normal", results.aft_lognormal)}</TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
